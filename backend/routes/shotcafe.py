"""ShotCafe proxy routes — extracted from backend/main.py.

This group avoids CORS by proxying shot.cafe responses through the backend.
No service dependency — just httpx.
"""

import re

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

router = APIRouter(prefix="/api/shotcafe", tags=["shotcafe"])


@router.get("/search")
async def shotcafe_search(
    q: str = Query(..., description="Search query"),
    z: str = Query("nav", description="Search type"),
):
    """Proxy for shot.cafe search API to avoid CORS issues."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://shot.cafe/server.php",
                params={"z": z, "q": q},
                headers={
                    "User-Agent": "VirtualStudio/1.0",
                    "Accept": "application/json",
                },
            )
        if response.status_code == 200:
            try:
                return JSONResponse(content=response.json())
            except Exception:
                return JSONResponse(
                    content={"error": "Invalid JSON response", "text": response.text[:500]}
                )
        return JSONResponse(
            status_code=response.status_code,
            content={"error": f"shot.cafe returned status {response.status_code}"},
        )
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={"error": "Request to shot.cafe timed out"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/movie/{slug}")
async def shotcafe_movie_info(slug: str):
    """Get movie information and frames from shot.cafe."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://shot.cafe/movie/{slug}",
                headers={"User-Agent": "VirtualStudio/1.0"},
            )
        if response.status_code != 200:
            return JSONResponse(
                status_code=response.status_code,
                content={"error": f"Movie not found: {slug}"},
            )

        html = response.text
        image_pattern = r'/images/t/[^"\']*\.(?:png|jpg|jpeg)'
        image_matches = re.findall(image_pattern, html, re.IGNORECASE)

        frames = []
        seen_urls: set[str] = set()
        for img_url in image_matches:
            if img_url in seen_urls:
                continue
            seen_urls.add(img_url)
            full_url = f"https://shot.cafe{img_url}"
            frames.append(
                {
                    "id": f"{slug}-{len(frames) + 1}",
                    "url": full_url,
                    "thumbnailUrl": full_url,
                    "proxyUrl": f"/api/shotcafe/image-proxy?url={full_url}",
                }
            )
            if len(frames) >= 50:
                break

        return JSONResponse(
            content={"slug": slug, "frames": frames, "frameCount": len(frames)}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/image-proxy")
async def shotcafe_image_proxy(url: str = Query(..., description="Image URL to proxy")):
    """Proxy shot.cafe images to avoid CORS issues — returns image bytes."""
    if not url.startswith("https://shot.cafe/"):
        return JSONResponse(status_code=400, content={"error": "Only shot.cafe URLs allowed"})
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers={"User-Agent": "VirtualStudio/1.0"})
        if response.status_code == 200:
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "image/jpeg"),
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Allow-Origin": "*",
                },
            )
        return JSONResponse(
            status_code=response.status_code, content={"error": "Image not found"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

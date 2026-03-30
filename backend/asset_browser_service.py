"""
Asset Browser Service
Proxy layer for 4 external 3D asset APIs:
  • Poly Haven  — https://api.polyhaven.com   (no key)
  • ambientCG   — https://ambientcg.com/api  (no key)
  • Sketchfab   — https://api.sketchfab.com  (SKETCHFAB_API_TOKEN)
  • Poly Pizza  — https://api.poly.pizza      (POLYPIZZA_API_KEY)
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx

# ─── shared async client (re-used across calls) ───────────────────────────────
_CLIENT: Optional[httpx.AsyncClient] = None
TIMEOUT = 12.0  # seconds

POLYHAVEN_UA = "VirtualStudio/1.0 (+https://creatorhub.no)"


def _client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True)
    return _CLIENT


# ─── Normalised result schema ──────────────────────────────────────────────────
def _asset(
    *,
    id: str,
    name: str,
    source: str,
    asset_type: str,       # "model" | "hdri" | "texture"
    thumbnail: str,
    download_url: Optional[str] = None,
    preview_url: Optional[str] = None,
    license: str = "CC0",
    author: str = "",
    tags: List[str] = [],
    poly_count: Optional[int] = None,
    uid: Optional[str] = None,   # Sketchfab UID for deferred download
) -> Dict[str, Any]:
    return {
        "id": id,
        "name": name,
        "source": source,
        "type": asset_type,
        "thumbnail": thumbnail,
        "downloadUrl": download_url,
        "previewUrl": preview_url,
        "license": license,
        "author": author,
        "tags": tags,
        "polyCount": poly_count,
        "uid": uid,
    }


# ─── Poly Haven ───────────────────────────────────────────────────────────────
_PH_TYPE_NORM = {
    "models": "models",
    "model": "models",
    "hdris": "hdris",
    "hdri": "hdris",
    "textures": "textures",
    "texture": "textures",
}

_PH_RES_MODEL = "1k"    # use 1k GLB for quick in-browser loading
_PH_RES_HDRI = "1k"     # 1k HDR for environment
_PH_CDN = "https://dl.polyhaven.org/file/ph-assets"


async def search_polyhaven(
    query: str = "",
    asset_type: str = "models",
    limit: int = 24,
) -> List[Dict[str, Any]]:
    ph_type = _PH_TYPE_NORM.get(asset_type.lower(), "models")
    params: Dict[str, Any] = {"type": ph_type}
    if query:
        params["q"] = query

    r = await _client().get(
        "https://api.polyhaven.com/assets",
        params=params,
        headers={"User-Agent": POLYHAVEN_UA},
    )
    r.raise_for_status()
    data: Dict[str, Any] = r.json()

    results = []
    for slug, info in list(data.items())[:limit]:
        if ph_type == "models":
            # Use backend proxy URL that fetches+rewrites the GLTF with absolute asset URLs
            dl_url = f"/api/assets/polyhaven/gltf/{slug}"
            at = "model"
        elif ph_type == "hdris":        # HDRI → .hdr
            dl_url = f"{_PH_CDN}/HDRIs/hdr/{_PH_RES_HDRI}/{slug}_{_PH_RES_HDRI}.hdr"
            at = "hdri"
        else:                           # texture
            dl_url = None               # textures are zip bundles — show download link only
            at = "texture"

        authors = list(info.get("authors", {}).keys())
        results.append(_asset(
            id=slug,
            name=info.get("name", slug),
            source="polyhaven",
            asset_type=at,
            thumbnail=info.get("thumbnail_url") or f"https://cdn.polyhaven.com/asset_img/thumbs/{slug}.png?width=256&height=256",
            download_url=dl_url,
            license="CC0",
            author=", ".join(authors),
            tags=info.get("tags", []),
            poly_count=info.get("polycount"),
        ))
    return results


# ─── ambientCG ────────────────────────────────────────────────────────────────
async def search_ambientcg(
    query: str = "",
    asset_type: str = "texture",
    limit: int = 24,
) -> List[Dict[str, Any]]:
    ac_type_map = {
        "texture": "Material",
        "material": "Material",
        "hdri": "HDRI",
        "model": "3DModel",
        "models": "3DModel",
    }
    ac_type = ac_type_map.get(asset_type.lower(), "Material")

    params: Dict[str, Any] = {
        "type": ac_type,
        "limit": limit,
        "include": "downloadData",
    }
    if query:
        params["q"] = query

    r = await _client().get(
        "https://ambientcg.com/api/v2/full_json",
        params=params,
    )
    r.raise_for_status()
    data = r.json()
    found = data.get("foundAssets", [])

    results = []
    for item in found:
        asset_id = item.get("assetId", "")
        if not asset_id:
            continue

        # Build a thumbnail URL (ambientCG preview pattern)
        thumb = f"https://ambientcg.com/get?file={asset_id}_PREVIEW.jpg"

        # Try to extract a GLTF or ZIP download URL
        dl_url: Optional[str] = None
        dl_cats = item.get("downloadFiletypeCategories") or {}
        gltf_cat = dl_cats.get("gltf") or {}
        if gltf_cat:
            res_key = next(iter(gltf_cat), None)
            if res_key:
                fmt = gltf_cat[res_key]
                for _fmt_key, fmt_info in fmt.items():
                    dl_url = fmt_info.get("prettyDownloadLink") or fmt_info.get("downloadLink")
                    if dl_url:
                        break

        at_type_raw = item.get("assetType", "Material")
        if "HDRI" in at_type_raw:
            at = "hdri"
        elif "3DModel" in at_type_raw:
            at = "model"
        else:
            at = "texture"

        results.append(_asset(
            id=asset_id,
            name=asset_id,
            source="ambientcg",
            asset_type=at,
            thumbnail=thumb,
            download_url=f"https://ambientcg.com/get?file={asset_id}_1K-JPG.zip" if at == "texture" else dl_url,
            preview_url=f"https://ambientcg.com/view?id={asset_id}",
            license="CC0",
            tags=item.get("tags", []),
        ))
    return results


# ─── Sketchfab ────────────────────────────────────────────────────────────────
def _sketchfab_token() -> Optional[str]:
    return os.environ.get("SKETCHFAB_API_TOKEN")


async def search_sketchfab(
    query: str = "",
    asset_type: str = "models",
    limit: int = 24,
) -> List[Dict[str, Any]]:
    token = _sketchfab_token()
    if not token:
        return []

    params: Dict[str, Any] = {
        "q": query or "furniture",
        "downloadable": "true",
        "count": limit,
        "sort_by": "-likeCount",
    }
    headers = {"Authorization": f"Token {token}"}

    r = await _client().get(
        "https://api.sketchfab.com/v3/models",
        params=params,
        headers=headers,
    )
    r.raise_for_status()
    data = r.json()
    results_raw = data.get("results", [])

    results = []
    for m in results_raw:
        uid = m.get("uid", "")
        name = m.get("name", uid)
        thumb = ""
        thumbs = m.get("thumbnails", {}).get("images", [])
        if thumbs:
            thumb = thumbs[0].get("url", "")
        user = m.get("user", {}).get("displayName", "")
        tags = [t.get("name", "") for t in m.get("tags") or []]
        lic = m.get("license", {})
        lic_label = lic.get("slug", "standard") if lic else "standard"
        results.append(_asset(
            id=uid,
            name=name,
            source="sketchfab",
            asset_type="model",
            thumbnail=thumb,
            download_url=None,      # requires a second API call to get temp URL
            license=lic_label,
            author=user,
            tags=tags,
            poly_count=m.get("faceCount"),
            uid=uid,
        ))
    return results


async def polyhaven_gltf_proxy(slug: str, resolution: str = "1k") -> bytes:
    """
    Fetches the Poly Haven GLTF for `slug` and rewrites all relative URI references
    to absolute Poly Haven CDN URLs using the files API include map.
    Returns the patched GLTF as raw bytes.
    """
    import json as _json

    # 1. Fetch the files API to get the canonical include URL map
    files_r = await _client().get(
        f"https://api.polyhaven.com/files/{slug}",
        headers={"User-Agent": POLYHAVEN_UA},
    )
    files_r.raise_for_status()
    files_data = files_r.json()

    gltf_section = files_data.get("gltf", {}).get(resolution, {})
    main_entry = gltf_section.get("gltf") or {}
    main_url: str = main_entry.get("url", "")
    include_map: Dict[str, Any] = main_entry.get("include", gltf_section.get("include", {}))

    if not main_url:
        raise ValueError(f"No GLTF URL found for slug={slug} resolution={resolution}")

    # 2. Fetch the GLTF JSON
    gltf_r = await _client().get(main_url, headers={"User-Agent": POLYHAVEN_UA})
    gltf_r.raise_for_status()
    gltf_obj = gltf_r.json()

    # 3. Build relative-path → absolute-URL lookup
    rel_to_abs: Dict[str, str] = {}
    for rel_path, info in include_map.items():
        if isinstance(info, dict) and "url" in info:
            rel_to_abs[rel_path] = info["url"]

    # 4. Rewrite buffers (*.bin)
    for buf in gltf_obj.get("buffers", []):
        uri = buf.get("uri", "")
        if uri and not uri.startswith("data:") and not uri.startswith("http"):
            if uri in rel_to_abs:
                buf["uri"] = rel_to_abs[uri]

    # 5. Rewrite images
    for img in gltf_obj.get("images", []):
        uri = img.get("uri", "")
        if uri and not uri.startswith("data:") and not uri.startswith("http"):
            if uri in rel_to_abs:
                img["uri"] = rel_to_abs[uri]

    return _json.dumps(gltf_obj).encode("utf-8")


async def sketchfab_get_download_url(uid: str) -> Optional[str]:
    token = _sketchfab_token()
    if not token or not uid:
        return None
    r = await _client().get(
        f"https://api.sketchfab.com/v3/models/{uid}/download",
        headers={"Authorization": f"Token {token}"},
    )
    if r.status_code != 200:
        return None
    data = r.json()
    gltf = data.get("gltf") or data.get("glb") or {}
    return gltf.get("url")


# ─── Poly Pizza ───────────────────────────────────────────────────────────────
def _polypizza_key() -> Optional[str]:
    return os.environ.get("POLYPIZZA_API_KEY")


async def search_polypizza(
    query: str = "",
    asset_type: str = "models",
    limit: int = 24,
) -> List[Dict[str, Any]]:
    key = _polypizza_key()
    if not key:
        return []

    params: Dict[str, Any] = {
        "q": query or "chair",
        "limit": limit,
    }
    headers = {"X-API-KEY": key}

    r = await _client().get(
        "https://api.poly.pizza/v1/search",
        params=params,
        headers=headers,
    )
    r.raise_for_status()
    data = r.json()
    items = data.get("body", data.get("results", []))

    results = []
    for m in items:
        mid = m.get("ID") or m.get("id") or ""
        name = m.get("Title") or m.get("name") or mid
        thumb = m.get("Thumbnail") or m.get("thumbnail") or ""
        download = m.get("Download") or m.get("downloadUrl") or ""
        author = (m.get("Creator") or {}).get("Username", "") if isinstance(m.get("Creator"), dict) else m.get("creator", "")
        lic = m.get("Licence") or m.get("license") or "CC0"
        tri_count = m.get("TriangleCount") or m.get("triCount")
        results.append(_asset(
            id=str(mid),
            name=str(name),
            source="polypizza",
            asset_type="model",
            thumbnail=str(thumb),
            download_url=str(download) if download else None,
            license=str(lic),
            author=str(author),
            poly_count=tri_count,
        ))
    return results


# ─── Unified search ───────────────────────────────────────────────────────────
async def search_assets(
    source: str,
    query: str = "",
    asset_type: str = "models",
    limit: int = 24,
) -> Dict[str, Any]:
    try:
        if source == "polyhaven":
            results = await search_polyhaven(query, asset_type, limit)
        elif source == "ambientcg":
            results = await search_ambientcg(query, asset_type, limit)
        elif source == "sketchfab":
            results = await search_sketchfab(query, asset_type, limit)
        elif source == "polypizza":
            results = await search_polypizza(query, asset_type, limit)
        else:
            return {"success": False, "error": f"Unknown source: {source}", "results": []}
        return {"success": True, "results": results, "source": source}
    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}", "results": []}
    except Exception as e:
        return {"success": False, "error": str(e)[:300], "results": []}

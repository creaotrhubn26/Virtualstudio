"""Rodin 3D generation API routes — extracted from backend/main.py."""

import json
import traceback
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/rodin", tags=["rodin"])


class RodinGenerateRequest(BaseModel):
    prompt: str
    filename: str
    quality: str = "low"
    category: str = "misc"


class RodinBatchRequest(BaseModel):
    items: List[dict]
    quality: str = "low"


def _rodin_or_503():
    try:
        from rodin_service import rodin_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Rodin service not available: {exc}",
        )
    if rodin_service is None:
        raise HTTPException(status_code=503, detail="Rodin service not initialized")
    return rodin_service


@router.post("/generate")
async def rodin_generate(request: RodinGenerateRequest):
    """Generate a single 3D model from text prompt using Rodin API."""
    svc = _rodin_or_503()
    try:
        gen_result = await svc.generate_from_text(
            prompt=request.prompt, quality=request.quality
        )
        if not gen_result.get("success"):
            error_msg = gen_result.get("error", "Generation failed")
            api_response = gen_result.get("api_response", {})
            print(f"Rodin generation start failed: {error_msg}")
            if api_response:
                print(f"API response: {json.dumps(api_response, indent=2)}")
            raise HTTPException(status_code=500, detail=error_msg)

        subscription_key = gen_result.get("subscription_key")
        if not subscription_key:
            print(f"ERROR: No subscription_key in gen_result: {gen_result}")
            raise HTTPException(
                status_code=500, detail="No subscription_key returned from API"
            )

        return JSONResponse(
            {
                "success": True,
                "subscription_key": subscription_key,
                "task_uuid": gen_result.get("uuid"),
                "filename": request.filename,
                "category": request.category,
                "message": (
                    "Generation started. Use /api/rodin/status/{subscription_key} "
                    "to check progress."
                ),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in rodin_generate: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@router.get("/status/{subscription_key}")
async def get_rodin_status(subscription_key: str):
    """Check the status of a Rodin generation job."""
    svc = _rodin_or_503()
    try:
        return JSONResponse(await svc.check_status(subscription_key))
    except Exception as e:
        print(f"Error checking status: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error checking status: {e}")


@router.post("/download/{task_uuid}")
async def download_rodin_model(task_uuid: str, filename: str = ""):
    """Download a completed Rodin model using task_uuid."""
    svc = _rodin_or_503()
    try:
        if not filename:
            filename = f"model_{task_uuid[:8]}"
        result = await svc.download_result(task_uuid, filename)
        if not result.get("success"):
            raise HTTPException(
                status_code=500, detail=result.get("error", "Download failed")
            )
        return JSONResponse(
            {"success": True, "path": result.get("path"), "filename": result.get("filename")}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading model: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error downloading model: {e}")


@router.post("/batch")
async def rodin_batch_generate(request: RodinBatchRequest):
    """Generate multiple 3D models in batch."""
    svc = _rodin_or_503()
    results = await svc.batch_generate(items=request.items, quality=request.quality)
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    return JSONResponse(
        {
            "success": True,
            "total": len(results),
            "successful": len(successful),
            "failed": len(failed),
            "results": results,
        }
    )


@router.get("/model/{filename}")
async def get_rodin_model(filename: str):
    """Download a generated Rodin model."""
    svc = _rodin_or_503()
    model_path = svc.output_dir / filename
    if not filename.endswith(".glb"):
        model_path = svc.output_dir / f"{filename}.glb"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    return FileResponse(
        path=str(model_path),
        media_type="model/gltf-binary",
        filename=model_path.name,
    )


@router.get("/models")
async def list_rodin_models():
    """List all generated Rodin models."""
    svc = _rodin_or_503()
    models = [
        {
            "filename": f.name,
            "url": f"/api/rodin/model/{f.name}",
            "size": f.stat().st_size,
        }
        for f in svc.output_dir.glob("*.glb")
    ]
    return JSONResponse({"models": models})


@router.post("/test-status")
async def test_rodin_status(request: dict):
    """Test endpoint to check status using subscription_key."""
    try:
        svc = _rodin_or_503()
        subscription_key = request.get("subscription_key", "")
        if not subscription_key:
            return JSONResponse(
                {"success": False, "error": "subscription_key required"}
            )
        return JSONResponse(await svc.check_status(subscription_key))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e), "traceback": traceback.format_exc()}
        )


@router.post("/test-generate")
async def test_rodin_generate(request: dict):
    """Test endpoint to see what the API actually returns."""
    try:
        svc = _rodin_or_503()
        prompt = request.get("prompt", "test prompt")
        quality = request.get("quality", "low")
        result = await svc.generate_from_text(prompt=prompt, quality=quality)
        return JSONResponse(
            {
                "success": True,
                "result": result,
                "uuid": result.get("uuid"),
                "full_response": result.get("full_response"),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e), "traceback": traceback.format_exc()}
        )

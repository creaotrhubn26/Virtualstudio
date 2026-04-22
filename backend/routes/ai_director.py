"""AI Studio Director API routes — extracted from backend/main.py.

Covers:
  GET  /api/ai/director/status
  POST /api/ai/director            (function-calling chat)
  POST /api/ai/director/stream     (SSE streaming chat)
  POST /api/ai/analyze-reference   (GPT-4o vision on a reference photo)
  POST /api/ai/generate-prop-glb   (text -> concept image -> TripoSR GLB)

The AI director service is lazy-imported via _director_or_503. TripoSR is
also lazy-imported for the generate-prop-glb flow.
"""

import base64

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter(prefix="/api/ai", tags=["ai_director"])


def _director_or_503():
    try:
        from ai_director_service import ai_director_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"AI Director service not available: {exc}"
        )
    if ai_director_service is None:
        raise HTTPException(
            status_code=503, detail="AI Director Service not initialized"
        )
    return ai_director_service


def _triposr_or_503():
    try:
        from triposr_service import triposr_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"TripoSR service not available — cannot generate 3D models: {exc}",
        )
    if triposr_service is None:
        raise HTTPException(status_code=503, detail="TripoSR service not initialized")
    if not triposr_service.api_token:
        raise HTTPException(
            status_code=503,
            detail="REPLICATE_API_TOKEN is not set. Add it in your Replit project Secrets.",
        )
    return triposr_service


@router.get("/director/status")
async def ai_director_status():
    """Return the AI Director service status."""
    try:
        svc = _director_or_503()
    except HTTPException:
        return JSONResponse({"enabled": False, "error": "not_initialized"})
    return JSONResponse(svc.get_status())


@router.post("/director")
async def ai_director_chat(request: Request):
    """AI Director function-calling chat endpoint."""
    svc = _director_or_503()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    messages = body.get("messages", [])
    image_data_url = body.get("imageDataUrl")
    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    return JSONResponse(await svc.chat(messages, image_data_url))


@router.post("/director/stream")
async def ai_director_stream(request: Request):
    """SSE streaming version of /api/ai/director."""
    svc = _director_or_503()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    messages = body.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    image_data_url = body.get("imageDataUrl")
    scene_context = body.get("sceneContext")
    canvas_snapshot = body.get("canvasSnapshot")

    return StreamingResponse(
        svc.chat_stream(messages, image_data_url, scene_context, canvas_snapshot),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/analyze-reference")
async def ai_analyze_reference(request: Request):
    """Analyse a reference photo using GPT-4o Vision."""
    svc = _director_or_503()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    image_data_url = body.get("imageDataUrl")
    if not image_data_url:
        raise HTTPException(status_code=400, detail="imageDataUrl is required")

    result = await svc.analyze_reference_image(image_data_url)
    if not result.get("success"):
        raise HTTPException(
            status_code=422, detail=result.get("error", "Analysis failed")
        )
    return JSONResponse(result)


@router.post("/generate-prop-glb")
async def ai_generate_prop_glb(request: Request):
    """AI asset pipeline: text -> gpt-image-1 concept -> TripoSR GLB."""
    director = _director_or_503()
    triposr = _triposr_or_503()

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    description = (body.get("description") or "").strip()
    if not description:
        raise HTTPException(status_code=400, detail="description is required")

    concept_result = await director.generate_prop_concept_image(description)
    if not concept_result.get("success"):
        error = concept_result.get("error", "Image generation failed")
        if concept_result.get("error_code") == "BUDGET_EXCEEDED":
            raise HTTPException(status_code=402, detail=error)
        raise HTTPException(status_code=422, detail=error)

    image_base64 = concept_result["image_base64"]
    image_bytes = base64.b64decode(image_base64)

    triposr_result = await triposr.generate_from_image(
        image_data=image_bytes,
        original_filename="ai_prop_concept.png",
        do_remove_background=True,
        foreground_ratio=0.88,
    )

    job_id = triposr_result.get("job_id")
    if not job_id:
        error_msg = triposr_result.get(
            "error", "TripoSR submission failed — no job ID returned"
        )
        raise HTTPException(status_code=502, detail=error_msg)

    return JSONResponse(
        {
            "success": True,
            "job_id": job_id,
            "optimised_prompt": concept_result.get("optimised_prompt", description),
            "concept_image_base64": image_base64[:100] + "...",
            "triposr": triposr_result,
        }
    )

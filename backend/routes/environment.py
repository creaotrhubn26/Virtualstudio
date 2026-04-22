"""Environment planner + asset retrieval API routes — extracted from backend/main.py.

Four routes that dispatch to two lazily-constructed services:
  - EnvironmentPlannerService (Gemini-backed plan generator)
  - AssetRetrievalService (embedding-based prop search)
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/environment", tags=["environment"])


class EnvironmentPlanRequest(BaseModel):
    prompt: str
    referenceImages: List[str] = []
    roomConstraints: Optional[Dict[str, Any]] = None
    preferFallback: bool = False
    preferredPresetId: Optional[str] = None
    worldModelProvider: str = "none"
    worldModelReference: Optional[Dict[str, Any]] = None


class EnvironmentAssetRetrievalRequest(BaseModel):
    text: str
    placementHint: Optional[str] = None
    contextText: Optional[str] = None
    assetTypes: List[str] = []
    preferredPlacementMode: Optional[str] = None
    preferredRoomTypes: List[str] = []
    surfaceAnchor: Optional[str] = None
    categoryHint: Optional[str] = None
    limit: int = 5
    minScore: float = 0.75


_planner_singleton = None
_retrieval_singleton = None


def _get_or_create_planner():
    global _planner_singleton
    if _planner_singleton is None:
        try:
            from environment_planner_service import EnvironmentPlannerService
        except ImportError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Environment planner service not available: {exc}",
            )
        _planner_singleton = EnvironmentPlannerService()
    return _planner_singleton


def _get_or_create_retrieval():
    global _retrieval_singleton
    if _retrieval_singleton is None:
        try:
            from asset_retrieval_service import AssetRetrievalService
        except ImportError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Asset retrieval service not available: {exc}",
            )
        _retrieval_singleton = AssetRetrievalService()
    return _retrieval_singleton


@router.get("/planner/status")
async def get_environment_planner_status():
    return _get_or_create_planner().get_status()


@router.post("/plan")
async def generate_environment_plan(request: EnvironmentPlanRequest):
    if not request.prompt.strip() and not request.referenceImages:
        raise HTTPException(
            status_code=400, detail="Prompt or reference image is required"
        )

    planner = _get_or_create_planner()
    result = await planner.generate_plan(
        prompt=request.prompt,
        reference_images=request.referenceImages,
        room_constraints=request.roomConstraints,
        prefer_fallback=request.preferFallback,
        preferred_preset_id=request.preferredPresetId,
        world_model_provider=request.worldModelProvider,
        world_model_reference=request.worldModelReference,
    )
    return JSONResponse(result)


@router.get("/retrieve-assets/status")
async def get_environment_asset_retrieval_status():
    return _get_or_create_retrieval().get_status()


@router.post("/retrieve-assets")
async def retrieve_environment_assets(request: EnvironmentAssetRetrievalRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Query text is required")

    retrieval = _get_or_create_retrieval()
    result = retrieval.search(
        text=request.text,
        placement_hint=request.placementHint or "",
        context_text=request.contextText or "",
        asset_types=request.assetTypes or None,
        preferred_placement_mode=request.preferredPlacementMode,
        preferred_room_types=request.preferredRoomTypes or None,
        surface_anchor=request.surfaceAnchor,
        category_hint=request.categoryHint,
        limit=request.limit,
        min_score=request.minScore,
    )
    return JSONResponse(result)

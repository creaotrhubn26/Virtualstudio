"""Wordbank API routes — extracted from backend/main.py.

Same pattern as routes/tutorials.py: lazy service import, 503 on ImportError.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/wordbank", tags=["wordbank"])


def _require_service():
    try:
        import wordbank_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Word bank service not available: {exc}",
        )
    return wordbank_service


@router.get("/health")
async def wordbank_health():
    """Check if word bank database is available."""
    try:
        svc = _require_service()
    except HTTPException:
        return {"available": False, "error": "Word bank service not available"}
    return svc.health_check()


@router.get("/words/{category}")
async def get_wordbank_words(category: str):
    """Get all approved words for a category."""
    return _require_service().get_words_by_category(category)


@router.post("/words")
async def add_wordbank_word(data: dict):
    """Add a word to the word bank."""
    svc = _require_service()
    return svc.add_word(
        word=data.get("word", ""),
        category=data.get("category", ""),
        language=data.get("language", "both"),
        weight=data.get("weight", 0.7),
        user_id=data.get("user_id"),
    )


@router.post("/suggestions")
async def submit_wordbank_suggestion(data: dict):
    """Submit a word suggestion for admin review."""
    svc = _require_service()
    return svc.suggest_word(
        word=data.get("word", ""),
        category=data.get("category", ""),
        language=data.get("language", "both"),
        suggested_weight=data.get("suggested_weight", 0.7),
        reason=data.get("reason"),
        suggested_by=data.get("suggested_by"),
    )


@router.get("/suggestions/pending")
async def get_wordbank_pending_suggestions():
    """Get pending word suggestions for admin review."""
    return _require_service().get_pending_suggestions()


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_wordbank_suggestion(suggestion_id: int, data: dict):
    """Approve a word suggestion."""
    return _require_service().approve_suggestion(suggestion_id, data.get("reviewer_id", ""))


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_wordbank_suggestion(suggestion_id: int, data: dict):
    """Reject a word suggestion."""
    return _require_service().reject_suggestion(suggestion_id, data.get("reviewer_id", ""))


@router.post("/feedback")
async def record_wordbank_feedback(data: dict):
    """Record feedback when user corrects a scene purpose."""
    svc = _require_service()
    return svc.record_feedback(
        scene_text=data.get("scene_text", ""),
        detected_purpose=data.get("detected_purpose", ""),
        correct_purpose=data.get("correct_purpose", ""),
        learned_words=data.get("learned_words", []),
        project_id=data.get("project_id"),
        user_id=data.get("user_id"),
    )


@router.post("/usage")
async def track_wordbank_usage(data: dict):
    """Track word usage."""
    svc = _require_service()
    return svc.track_usage(
        word=data.get("word", ""),
        category=data.get("category", ""),
        project_id=data.get("project_id"),
        user_id=data.get("user_id"),
        scene_context=data.get("scene_context"),
    )


@router.get("/stats")
async def get_wordbank_stats():
    """Get word bank statistics."""
    return _require_service().get_stats()


@router.post("/seed")
async def seed_wordbank_words(data: Optional[dict] = None):
    """Seed database with built-in words."""
    words = data.get("words", []) if data else []
    return _require_service().seed_builtin_words(words)


@router.get("/patterns/misclassification")
async def get_wordbank_misclassification_patterns():
    """Get misclassification patterns for analysis."""
    return _require_service().get_misclassification_patterns()

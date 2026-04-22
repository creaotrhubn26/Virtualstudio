"""
Virtual Studio Backend - SAM 3D Body Avatar Generator
FastAPI service for generating 3D avatars from images using Meta SAM 3D Body
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import os
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime
import base64
import json
from pathlib import Path
from psycopg2.extras import RealDictCursor, Json as PgJson


def load_local_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue

        value = value.strip().strip('"').strip("'")
        os.environ[key] = value


load_local_env_file()

# When STRICT_SERVICES=true (recommended for production), ImportError on any
# declared core service aborts startup instead of silently flipping the
# *_AVAILABLE flag off. In dev it defaults to false so partial checkouts
# still boot, but you get a loud WARN line instead of a quiet "Warning:".
STRICT_SERVICES = os.environ.get("STRICT_SERVICES", "").lower() in {"1", "true", "yes"}


def _import_service(label: str, importer):
    """Run ``importer()`` and return True on success. On ImportError, either
    re-raise (STRICT_SERVICES=true) or log loudly and return False."""
    try:
        importer()
        return True
    except ImportError as exc:
        if STRICT_SERVICES:
            raise RuntimeError(
                f"[startup] STRICT_SERVICES=true and service '{label}' failed "
                f"to import: {exc}"
            ) from exc
        import sys
        print(
            f"[startup] WARN: service '{label}' unavailable — endpoints that "
            f"depend on it will 503. ImportError: {exc}",
            file=sys.stderr,
            flush=True,
        )
        return False


def _import_auth():
    global init_admin_table, generate_password, create_admin_user
    global authenticate_user, get_all_admins, update_admin_user
    global delete_admin_user, get_admin_count
    from auth_service import (
        init_admin_table, generate_password, create_admin_user,
        authenticate_user, get_all_admins, update_admin_user,
        delete_admin_user, get_admin_count,
    )


def _import_tutorials():
    global db_create_tutorial, db_get_all_tutorials, db_get_tutorial
    global db_update_tutorial, db_delete_tutorial, db_set_active_tutorial
    global db_get_active_tutorial, init_tutorials_table
    from tutorials_service import (
        init_tutorials_table,
        create_tutorial as db_create_tutorial,
        get_all_tutorials as db_get_all_tutorials,
        get_tutorial as db_get_tutorial,
        update_tutorial as db_update_tutorial,
        delete_tutorial as db_delete_tutorial,
        set_active_tutorial as db_set_active_tutorial,
        get_active_tutorial as db_get_active_tutorial,
    )


def _import_virtual_studio():
    global init_virtual_studio_tables
    global save_scene, get_scenes, get_scene, delete_scene
    global save_preset, get_presets, delete_preset
    global save_light_group, get_light_groups, delete_light_group
    global save_user_asset, get_user_assets, delete_user_asset
    global save_scene_version, get_scene_versions, delete_scene_version
    global save_note, get_notes, delete_note
    global save_camera_preset, get_camera_presets, delete_camera_preset
    global save_export_template, get_export_templates, delete_export_template
    from virtual_studio_service import (
        init_virtual_studio_tables,
        save_scene, get_scenes, get_scene, delete_scene,
        save_preset, get_presets, delete_preset,
        save_light_group, get_light_groups, delete_light_group,
        save_user_asset, get_user_assets, delete_user_asset,
        save_scene_version, get_scene_versions, delete_scene_version,
        save_note, get_notes, delete_note,
        save_camera_preset, get_camera_presets, delete_camera_preset,
        save_export_template, get_export_templates, delete_export_template,
    )


def _import_user_kv():
    global init_user_kv_tables, db_set_user_kv, db_get_user_kv
    from user_kv_service import (
        init_user_kv_tables,
        set_user_kv as db_set_user_kv,
        get_user_kv as db_get_user_kv,
    )


def _import_branding():
    global init_branding_settings_table, db_get_branding_settings, db_set_branding_settings
    from branding_service import (
        init_branding_settings_table,
        get_branding_settings as db_get_branding_settings,
        set_branding_settings as db_set_branding_settings,
    )


def _import_settings():
    global init_settings_table, db_get_settings, db_set_settings, db_delete_settings, db_list_settings
    from settings_service import (
        init_settings_table,
        get_settings as db_get_settings,
        set_settings as db_set_settings,
        delete_settings as db_delete_settings,
        list_settings as db_list_settings,
    )


def _import_wordbank():
    global wordbank_health_check, get_words_by_category, db_add_word
    global db_suggest_word, db_record_feedback, db_track_usage
    global db_get_wordbank_stats, get_pending_suggestions, approve_suggestion
    global reject_suggestion, seed_builtin_words, get_misclassification_patterns
    from wordbank_service import (
        health_check as wordbank_health_check,
        get_words_by_category,
        add_word as db_add_word,
        suggest_word as db_suggest_word,
        record_feedback as db_record_feedback,
        track_usage as db_track_usage,
        get_stats as db_get_wordbank_stats,
        get_pending_suggestions,
        approve_suggestion,
        reject_suggestion,
        seed_builtin_words,
        get_misclassification_patterns,
    )


def _import_collaboration():
    global collaboration_router
    from collaboration_server import collaboration_router


AUTH_SERVICE_AVAILABLE = _import_service("auth", _import_auth)
TUTORIALS_SERVICE_AVAILABLE = _import_service("tutorials", _import_tutorials)
VIRTUAL_STUDIO_SERVICE_AVAILABLE = _import_service("virtual_studio", _import_virtual_studio)
USER_KV_SERVICE_AVAILABLE = _import_service("user_kv", _import_user_kv)
BRANDING_SERVICE_AVAILABLE = _import_service("branding", _import_branding)
SETTINGS_SERVICE_AVAILABLE = _import_service("settings", _import_settings)
WORDBANK_SERVICE_AVAILABLE = _import_service("wordbank", _import_wordbank)
COLLABORATION_SERVICE_AVAILABLE = _import_service("collaboration", _import_collaboration)

app = FastAPI(
    title="Virtual Studio Avatar API",
    description="Generate 3D avatars from images using Meta SAM 3D Body",
    version="1.0.0"
)

_allowed_origins_env = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5000,http://127.0.0.1:5000,http://localhost:5173,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
if ALLOWED_ORIGINS == ["*"]:
    raise RuntimeError(
        "ALLOWED_ORIGINS='*' is not allowed with credentialed CORS. "
        "Set an explicit comma-separated list of origins."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files from root directory
ROOT_DIR = Path(__file__).parent.parent
PUBLIC_DIR = ROOT_DIR / "public"

# Serve public folder static files (logos, images, etc.)
if PUBLIC_DIR.exists():
    app.mount("/public", StaticFiles(directory=str(PUBLIC_DIR)), name="public")
    
    # Also serve public files from root path (for /creatorhub-virtual-studio-logo.svg etc.)
    @app.get("/creatorhub-virtual-studio-logo.svg")
    async def serve_virtual_studio_logo():
        return FileResponse(PUBLIC_DIR / "creatorhub-virtual-studio-logo.svg", media_type="image/svg+xml")
    
    @app.get("/creatorhub-logo-amber.svg")
    async def serve_logo_amber():
        return FileResponse(PUBLIC_DIR / "creatorhub-logo-amber.svg", media_type="image/svg+xml")
    
    @app.get("/manifest.json")
    async def serve_manifest():
        return FileResponse(PUBLIC_DIR / "manifest.json", media_type="application/json")

# Serve favicon if it exists
FAVICON_PATHS = [
    PUBLIC_DIR / "favicon.ico",
    ROOT_DIR / "favicon.ico",
    Path(__file__).parent / "favicon.ico",
]
@app.get("/favicon.ico")
async def serve_favicon():
    for favicon_path in FAVICON_PATHS:
        if favicon_path.exists():
            return FileResponse(favicon_path, media_type="image/x-icon")
    # Return empty response if no favicon exists
    return Response(status_code=204)

# Helper function to serialize database rows with datetime/Decimal fields
def serialize_row(row: dict) -> dict:
    """Convert a database row to a JSON-serializable dict"""
    from datetime import datetime, date
    from decimal import Decimal
    result = dict(row) if hasattr(row, 'keys') else row
    for key, value in result.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
    return result

UPLOAD_DIR = Path("backend/uploads")
OUTPUT_DIR = Path(__file__).parent / "outputs"
RODIN_MODELS_DIR = Path(__file__).parent / "rodin_models"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RODIN_MODELS_DIR.mkdir(parents=True, exist_ok=True)

sam3d_service = None
face_analysis = None
facexformer = None
flux_service = None
storyboard_service = None
environment_planner_service = None
asset_retrieval_service = None


def get_or_create_environment_planner():
    global environment_planner_service
    if environment_planner_service is None:
        from environment_planner_service import EnvironmentPlannerService
        environment_planner_service = EnvironmentPlannerService()
    return environment_planner_service


def get_or_create_asset_retrieval_service():
    global asset_retrieval_service
    if asset_retrieval_service is None:
        from asset_retrieval_service import AssetRetrievalService
        asset_retrieval_service = AssetRetrievalService()
    return asset_retrieval_service

@app.on_event("startup")
async def startup_event():
    global sam3d_service, face_analysis, facexformer, flux_service, storyboard_service, environment_planner_service
    try:
        from sam3d_service import SAM3DService
        from face_analysis_service import face_analysis_service
        from facexformer_service import facexformer_service
        from flux_service import flux_service as flux_svc
        from storyboard_image_service import storyboard_image_service
        from environment_planner_service import EnvironmentPlannerService
        sam3d_service = SAM3DService()
        face_analysis = face_analysis_service
        facexformer = facexformer_service
        flux_service = flux_svc
        storyboard_service = storyboard_image_service
        environment_planner_service = EnvironmentPlannerService()
        print("SAM 3D Body service initialized")
        print("Face analysis service initialized")
        print(f"FaceXFormer service initialized (enabled: {facexformer.is_enabled()})")
        print(f"FLUX service initialized (enabled: {flux_service.is_enabled()})")
        print(f"Storyboard Image Service initialized (enabled: {storyboard_service.enabled})")
        print(f"Environment Planner Service initialized (enabled: {environment_planner_service.enabled})")
    except Exception as e:
        print(f"Warning: ML services failed to initialize: {e}")
        print("Server will continue with basic functionality only")

    try:
        from ai_director_service import ai_director_service as _ai_director
        globals()["ai_director_service"] = _ai_director
        print(f"AI Director Service initialized (enabled: {_ai_director.enabled})")
    except Exception as e:
        print(f"Warning: AI Director Service failed to initialize: {e}")
    
    # Initialize admin users table
    if AUTH_SERVICE_AVAILABLE:
        try:
            init_admin_table()
            print("Admin users table initialized")
        except Exception as e:
            print(f"Warning: Could not initialize admin table: {e}")
    
    # Initialize tutorials table
    if TUTORIALS_SERVICE_AVAILABLE:
        try:
            init_tutorials_table()
            print("Tutorials table initialized")
        except Exception as e:
            print(f"Warning: Could not initialize tutorials table: {e}")
    
    # Initialize Virtual Studio tables
    if VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        try:
            init_virtual_studio_tables()
            print("Virtual Studio tables initialized")
        except Exception as e:
            print(f"Warning: Could not initialize Virtual Studio tables: {e}")
    
    # Initialize user KV table
    if USER_KV_SERVICE_AVAILABLE:
        try:
            init_user_kv_tables()
            print("User KV table initialized")
        except Exception as e:
            print(f"Warning: Could not initialize user KV table: {e}")

    # Initialize branding settings table
    if BRANDING_SERVICE_AVAILABLE:
        try:
            init_branding_settings_table()
            print("Branding settings table initialized")
        except Exception as e:
            print(f"Warning: Could not initialize branding settings table: {e}")

    # Initialize app settings table
    if SETTINGS_SERVICE_AVAILABLE:
        try:
            init_settings_table()
            print("App settings table initialized")
        except Exception as e:
            print(f"Warning: Could not initialize app settings table: {e}")

# Root / health / ML health / test-r2 — extracted to backend/routes/core.py.

# HTTP client for external API proxying
import httpx

# ============ SHOT.CAFE PROXY ENDPOINTS ============
# ShotCafe proxy routes — extracted to backend/routes/shotcafe.py.

# /api/health and /api/ml/health — extracted to backend/routes/core.py.

# user_kv / branding / settings / analytics routes — extracted. See MAIN_SPLIT_PLAN.md.

# ============ WORD BANK API ============

# Wordbank routes — extracted to backend/routes/wordbank.py. See MAIN_SPLIT_PLAN.md.

# /api/test-r2 — extracted to backend/routes/core.py.

# Avatar generation + face analysis routes — extracted to backend/routes/avatar.py.

# Optional rodin_service import
RODIN_SERVICE_AVAILABLE = False
try:
    from rodin_service import rodin_service
    RODIN_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Rodin service not available: {e}")
    rodin_service = None

from pydantic import BaseModel

# External data routes (Kartverket property analysis)
try:
    from routes.external_data import router as external_data_router
    app.include_router(external_data_router)
    print("External data routes loaded (Kartverket property analysis)")
except ImportError as e:
    print(f"Warning: External data routes not available: {e}")

# Tutorials routes — first group extracted from main.py per the split plan.
try:
    from routes.tutorials import router as tutorials_router
    app.include_router(tutorials_router)
    print("Tutorials routes loaded")
except ImportError as e:
    print(f"Warning: Tutorials routes not available: {e}")

# Wordbank routes
try:
    from routes.wordbank import router as wordbank_router
    app.include_router(wordbank_router)
    print("Wordbank routes loaded")
except ImportError as e:
    print(f"Warning: Wordbank routes not available: {e}")

# User KV routes
try:
    from routes.user_kv import router as user_kv_router
    app.include_router(user_kv_router)
    print("User KV routes loaded")
except ImportError as e:
    print(f"Warning: User KV routes not available: {e}")

# Branding routes
try:
    from routes.branding import router as branding_router
    app.include_router(branding_router)
    print("Branding routes loaded")
except ImportError as e:
    print(f"Warning: Branding routes not available: {e}")

# App settings + analytics routes
try:
    from routes.settings import router as settings_router
    app.include_router(settings_router)
    print("Settings routes loaded")
except ImportError as e:
    print(f"Warning: Settings routes not available: {e}")

# ShotCafe proxy routes
try:
    from routes.shotcafe import router as shotcafe_router
    app.include_router(shotcafe_router)
    print("ShotCafe routes loaded")
except ImportError as e:
    print(f"Warning: ShotCafe routes not available: {e}")

# Core routes: /, /api/health, /api/ml/health, /api/test-r2
try:
    from routes.core import router as core_router
    app.include_router(core_router)
    print("Core routes loaded")
except ImportError as e:
    print(f"Warning: Core routes not available: {e}")

# Studio routes (scenes/presets/light-groups/assets/versions/notes/preferences/
# snapshots/camera-presets/export-templates) — the largest single group
try:
    from routes.studio import router as studio_router
    app.include_router(studio_router)
    print("Studio routes loaded")
except ImportError as e:
    print(f"Warning: Studio routes not available: {e}")

# Rodin 3D generation routes
try:
    from routes.rodin import router as rodin_router
    app.include_router(rodin_router)
    print("Rodin routes loaded")
except ImportError as e:
    print(f"Warning: Rodin routes not available: {e}")

# TripoSR 3D generation routes
try:
    from routes.triposr import router as triposr_router
    app.include_router(triposr_router)
    print("TripoSR routes loaded")
except ImportError as e:
    print(f"Warning: TripoSR routes not available: {e}")

# TRELLIS 3D environment generation routes
try:
    from routes.trellis import router as trellis_router
    app.include_router(trellis_router)
    print("TRELLIS routes loaded")
except ImportError as e:
    print(f"Warning: TRELLIS routes not available: {e}")

# Avatar generation + face analysis routes (generate-avatar, analyze-face,
# facexformer/analyze, generate-avatar-with-analysis, avatar GLB serve/delete)
try:
    from routes.avatar import router as avatar_router
    app.include_router(avatar_router)
    print("Avatar routes loaded")
except ImportError as e:
    print(f"Warning: Avatar routes not available: {e}")

# AI Director routes (GPT-4o chat + streaming + reference analysis + prop GLB)
try:
    from routes.ai_director import router as ai_director_router
    app.include_router(ai_director_router)
    print("AI Director routes loaded")
except ImportError as e:
    print(f"Warning: AI Director routes not available: {e}")

# Asset browser routes (Poly Haven / ambientCG / Sketchfab / Poly Pizza)
try:
    from routes.assets import router as assets_router
    app.include_router(assets_router)
    print("Assets routes loaded")
except ImportError as e:
    print(f"Warning: Assets routes not available: {e}")

# Admin authentication routes (login, admin CRUD)
try:
    from routes.auth import router as auth_router
    app.include_router(auth_router)
    print("Auth routes loaded")
except ImportError as e:
    print(f"Warning: Auth routes not available: {e}")

# Brush presets routes (storyboard drawing tools)
try:
    from routes.brush_presets import router as brush_presets_router
    app.include_router(brush_presets_router)
    print("Brush presets routes loaded")
except ImportError as e:
    print(f"Warning: Brush presets routes not available: {e}")

# Shot planner 2D scenes routes
try:
    from routes.shot_planner import router as shot_planner_router
    app.include_router(shot_planner_router)
    print("Shot planner routes loaded")
except ImportError as e:
    print(f"Warning: Shot planner routes not available: {e}")

# Story logic routes (pre-writing concept/logline/theme validation)
try:
    from routes.story_logic import router as story_logic_router
    app.include_router(story_logic_router)
    print("Story logic routes loaded")
except ImportError as e:
    print(f"Warning: Story logic routes not available: {e}")

# Price administration routes (BRREG company lookup + MET Norway weather)
try:
    from routes.price_admin import router as price_admin_router
    app.include_router(price_admin_router)
    print("Price admin routes loaded")
except ImportError as e:
    print(f"Warning: Price admin routes not available: {e}")

# Consent portal routes (casting consent signing + access codes)
try:
    from routes.consent import router as consent_router
    app.include_router(consent_router)
    print("Consent routes loaded")
except ImportError as e:
    print(f"Warning: Consent routes not available: {e}")

# Split-sheet contracts routes (draft + edit contract documents)
try:
    from routes.contracts import router as contracts_router
    app.include_router(contracts_router)
    print("Contracts routes loaded")
except ImportError as e:
    print(f"Warning: Contracts routes not available: {e}")

# Norwegian laws / legal suggestions routes
try:
    from routes.norwegian_laws import router as norwegian_laws_router
    app.include_router(norwegian_laws_router)
    print("Norwegian laws routes loaded")
except ImportError as e:
    print(f"Warning: Norwegian laws routes not available: {e}")

# Storyboards routes (templates, camera angles/movements, gpt-image-1 generate)
try:
    from routes.storyboards import router as storyboards_router
    app.include_router(storyboards_router)
    print("Storyboards routes loaded")
except ImportError as e:
    print(f"Warning: Storyboards routes not available: {e}")

# Environment planner + asset retrieval routes
try:
    from routes.environment import router as environment_router
    app.include_router(environment_router)
    print("Environment routes loaded")
except ImportError as e:
    print(f"Warning: Environment routes not available: {e}")

# Email assets routes (logo upload/serve)
try:
    from routes.email import router as email_router
    app.include_router(email_router)
    print("Email routes loaded")
except ImportError as e:
    print(f"Warning: Email routes not available: {e}")

# Production planning routes (shooting-days, stripboard, cast, crew,
# call-sheets, live-set-status) — seed-troll demo seeder still inline
try:
    from routes.production import router as production_router
    app.include_router(production_router)
    print("Production routes loaded")
except ImportError as e:
    print(f"Warning: Production routes not available: {e}")

# 3D model file serving (/api/models/{filename})
try:
    from routes.models import router as models_router
    app.include_router(models_router)
    print("Models routes loaded")
except ImportError as e:
    print(f"Warning: Models routes not available: {e}")

# Fiken accounting integration (status + send-invoice)
try:
    from routes.fiken import router as fiken_router
    app.include_router(fiken_router)
    print("Fiken routes loaded")
except ImportError as e:
    print(f"Warning: Fiken routes not available: {e}")

# Split-sheet workflow routes (comments, templates, reports, statistics,
# pro-connections)
try:
    from routes.split_sheets_workflow import router as ss_workflow_router
    app.include_router(ss_workflow_router)
    print("Split-sheets workflow routes loaded")
except ImportError as e:
    print(f"Warning: Split-sheets workflow routes not available: {e}")

# Collaboration routes (WebSocket real-time)
try:
    if COLLABORATION_SERVICE_AVAILABLE:
        app.include_router(collaboration_router)
        print("Collaboration routes loaded (WebSocket real-time)")
except Exception as e:
    print(f"Warning: Collaboration routes not available: {e}")

class RodinGenerateRequest(BaseModel):
    prompt: str
    filename: str
    quality: str = "low"
    category: str = "misc"

class RodinBatchRequest(BaseModel):
    items: List[dict]
    quality: str = "low"


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

# Rodin 3D generation routes — extracted to backend/routes/rodin.py.

# TripoSR 3D generation routes — extracted to backend/routes/triposr.py.

# AI Director routes — extracted to backend/routes/ai_director.py.
# Assets (Poly Haven / Sketchfab / ambientCG) — extracted to backend/routes/assets.py.

# TRELLIS 3D environment generation routes — extracted to backend/routes/trellis.py.

# ============================================================================
# Virtual Studio API Endpoints
# ============================================================================











# ============================================================================
# Manuscript API Endpoints
# ============================================================================

























# ==================== Acts Endpoints ====================











# ============================================================================
# Tutorials API Endpoints
# ============================================================================

# Tutorials routes have been extracted to backend/routes/tutorials.py
# (registered via app.include_router earlier). See backend/MAIN_SPLIT_PLAN.md.


# ============================================================================
# Virtual Studio API Endpoints
# ============================================================================

# Studio routes (31 routes: scenes/presets/light-groups/assets/versions/
# notes/preferences/snapshots/camera-presets/export-templates) extracted
# to backend/routes/studio.py. See MAIN_SPLIT_PLAN.md.

# ============================================================================
# Shot List API Endpoints
# ============================================================================






# Shot-planner 2D scenes routes — extracted to backend/routes/shot_planner.py.

# Shot-planner 2D scenes routes — extracted to backend/routes/shot_planner.py.














# ==================== CONSENT CRUD API ====================







# ==================== CANDIDATE POOL API ====================













# ========== Role Pool API Endpoints ==========







# ========== Audition Pool API Endpoints ==========







# ========== Post-Audition Workflow API Endpoints ==========



# ========== Offers API Endpoints ==========




# ========== Contracts API Endpoints ==========




# ========== Calendar Events API Endpoints ==========


























# ============================================================================
# Equipment/Assets API Endpoints (Utstyr)
# ============================================================================
















# ============ Equipment Templates API ============







# ============ Equipment Categories API ============

# ============ Vendor Links API (foto.no) ============











# ============================================================================
# Production Days API (Normalized Table Support)
# ============================================================================





# ============================================================================
# User Roles API (Sharing/Permissions)
# ============================================================================





# ============================================================================
# Shot Production Details API (Camera, Lighting, Audio, Notes)
# ============================================================================












# Brush presets routes — extracted to backend/routes/brush_presets.py.

# Story logic routes — extracted to backend/routes/story_logic.py.

# ============================================================================
# Storyboard Frames API (Link storyboard frames to script scenes)
# ============================================================================





# ============================================================================
# Script Supervisor Notes API (Take Logs, Continuity)
# ============================================================================





# ============================================================================
# Character Arc Tracking API
# ============================================================================





# ============================================================================
# Story Beat Tracking API
# ============================================================================






# Auth routes — extracted to backend/routes/auth.py.

# Price admin routes — extracted to backend/routes/price_admin.py.

# ============================================================================
# Split Sheet API Endpoints
# ============================================================================

@app.post("/api/split-sheets")
async def create_split_sheet(request: dict):
    """
    Create a new split sheet
    
    Args:
        request: Split sheet data including title, description, contributors, etc.
    
    Returns:
        JSONResponse with success status and created split sheet data
    """
    from datetime import datetime
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor, Json
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        # Generate ID if not provided
        split_sheet_id = request.get('id') or str(uuid.uuid4())
        title = request.get('title', '')
        description = request.get('description')
        project_id = request.get('project_id')
        track_id = request.get('track_id')
        user_id = request.get('user_id')  # Optional, can be extracted from auth token
        contributors = request.get('contributors', [])
        
        # Calculate total percentage - ensure all values are valid numbers
        total_percentage = 0.0
        for c in contributors:
            try:
                pct = float(c.get('percentage', 0)) if c.get('percentage') is not None else 0.0
                total_percentage += max(0.0, min(100.0, pct))
            except (ValueError, TypeError):
                pass
        
        # Determine status based on contributors
        status = 'draft' if total_percentage != 100 else 'pending_signatures'
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Try to create tables if they don't exist
                try:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheets (
                            id VARCHAR(255) PRIMARY KEY,
                            user_id VARCHAR(255),
                            project_id VARCHAR(255),
                            track_id VARCHAR(255),
                            songflow_project_id VARCHAR(255),
                            songflow_track_id VARCHAR(255),
                            title VARCHAR(500) NOT NULL,
                            description TEXT,
                            status VARCHAR(50) DEFAULT 'draft',
                            total_percentage DECIMAL(5,2) DEFAULT 0,
                            metadata JSONB DEFAULT '{}'::jsonb,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            completed_at TIMESTAMP WITH TIME ZONE
                        )
                    """)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheet_contributors (
                            id VARCHAR(255) PRIMARY KEY,
                            split_sheet_id VARCHAR(255) NOT NULL REFERENCES split_sheets(id) ON DELETE CASCADE,
                            name VARCHAR(500) NOT NULL,
                            email VARCHAR(255),
                            role VARCHAR(100) NOT NULL DEFAULT 'collaborator',
                            percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
                            signed_at TIMESTAMP WITH TIME ZONE,
                            signature_data JSONB,
                            invitation_sent_at TIMESTAMP WITH TIME ZONE,
                            invitation_status VARCHAR(50) DEFAULT 'not_sent',
                            user_id VARCHAR(255),
                            order_index INTEGER DEFAULT 0,
                            notes TEXT,
                            custom_fields JSONB DEFAULT '{}'::jsonb,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                except Exception as create_error:
                    # Tables might already exist, continue
                    conn.rollback()
                    pass
                
                # Handle metadata
                metadata = request.get('metadata', {})
                if not isinstance(metadata, dict):
                    metadata = {}
                
                # Insert split sheet
                cur.execute("""
                    INSERT INTO split_sheets (
                        id, user_id, project_id, track_id, title, description,
                        status, total_percentage, metadata, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (split_sheet_id, user_id, project_id, track_id, title, description, status, total_percentage, Json(metadata)))
                
                # Insert contributors - always generate new IDs for new split sheet
                for idx, contributor in enumerate(contributors):
                    # Always generate new ID for contributors when creating new split sheet
                    contributor_id = str(uuid.uuid4())
                    # Ensure custom_fields is a valid JSON object
                    custom_fields = contributor.get('custom_fields', {})
                    if not isinstance(custom_fields, dict):
                        custom_fields = {}
                    
                    # Ensure percentage is a valid number
                    percentage = contributor.get('percentage', 0)
                    try:
                        percentage = float(percentage) if percentage is not None else 0.0
                        # Clamp percentage to valid range
                        percentage = max(0.0, min(100.0, percentage))
                    except (ValueError, TypeError):
                        percentage = 0.0
                    
                    # Log custom_fields for debugging
                    print(f"Creating contributor {contributor_id} with custom_fields: {json.dumps(custom_fields, default=str)}, percentage: {percentage}")
                    
                    cur.execute("""
                        INSERT INTO split_sheet_contributors (
                            id, split_sheet_id, name, email, role, percentage,
                            order_index, user_id, custom_fields, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (
                        contributor_id,
                        split_sheet_id,
                        contributor.get('name', ''),
                        contributor.get('email'),
                        contributor.get('role', 'collaborator'),
                        percentage,
                        contributor.get('order_index', idx),
                        contributor.get('user_id'),
                        Json(custom_fields)
                    ))
                
                conn.commit()
                
                # Fetch the created split sheet with contributors
                cur.execute("""
                    SELECT 
                        id, user_id, project_id, track_id, title, description,
                        status, total_percentage, metadata, created_at, updated_at
                    FROM split_sheets
                    WHERE id = %s
                """, (split_sheet_id,))
                split_sheet_row = cur.fetchone()
                
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, name, email, role, percentage,
                        signed_at, signature_data, invitation_sent_at, invitation_status,
                        user_id, order_index, notes, custom_fields, created_at, updated_at
                    FROM split_sheet_contributors
                    WHERE split_sheet_id = %s
                    ORDER BY order_index
                """, (split_sheet_id,))
                contributor_rows = cur.fetchall()
                
                # Build response
                split_sheet_data = dict(split_sheet_row) if split_sheet_row else {}
                split_sheet_data['contributors'] = [dict(row) for row in contributor_rows]
                split_sheet_data['contributor_count'] = len(contributor_rows)
                split_sheet_data['signed_count'] = sum(1 for c in contributor_rows if c.get('signed_at'))
                
                # Convert Decimal and datetime to JSON-serializable types
                from decimal import Decimal
                from datetime import datetime, date
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                split_sheet_data = convert_for_json(split_sheet_data)
                
                return JSONResponse({
                    "success": True,
                    "data": split_sheet_data
                })
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.put("/api/split-sheets/{split_sheet_id}")
async def update_split_sheet(split_sheet_id: str, request: dict):
    """
    Update an existing split sheet
    
    Args:
        split_sheet_id: ID of the split sheet to update
        request: Updated split sheet data
    
    Returns:
        JSONResponse with success status and updated split sheet data
    """
    from datetime import datetime
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor, Json
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if split sheet exists
                cur.execute("SELECT id FROM split_sheets WHERE id = %s", (split_sheet_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Split sheet not found")
                
                # Update split sheet fields
                update_fields = []
                update_values = []
                
                if 'title' in request:
                    update_fields.append("title = %s")
                    update_values.append(request['title'])
                if 'description' in request:
                    update_fields.append("description = %s")
                    update_values.append(request['description'])
                if 'status' in request:
                    update_fields.append("status = %s")
                    update_values.append(request['status'])
                if 'project_id' in request:
                    update_fields.append("project_id = %s")
                    update_values.append(request['project_id'])
                if 'track_id' in request:
                    update_fields.append("track_id = %s")
                    update_values.append(request['track_id'])
                if 'metadata' in request:
                    metadata = request['metadata']
                    if not isinstance(metadata, dict):
                        metadata = {}
                    update_fields.append("metadata = %s")
                    update_values.append(Json(metadata))
                
                if update_fields:
                    update_fields.append("updated_at = CURRENT_TIMESTAMP")
                    update_values.append(split_sheet_id)
                    cur.execute(f"""
                        UPDATE split_sheets
                        SET {', '.join(update_fields)}
                        WHERE id = %s
                    """, update_values)
                
                # Update contributors if provided
                if 'contributors' in request:
                    # Delete existing contributors
                    cur.execute("DELETE FROM split_sheet_contributors WHERE split_sheet_id = %s", (split_sheet_id,))
                    
                    # Insert updated contributors
                    contributors = request['contributors']
                    for idx, contributor in enumerate(contributors):
                        contributor_id = contributor.get('id') or str(uuid.uuid4())
                        # Ensure custom_fields is a valid JSON object
                        custom_fields = contributor.get('custom_fields', {})
                        if not isinstance(custom_fields, dict):
                            custom_fields = {}
                        
                        # Ensure percentage is a valid number
                        percentage = contributor.get('percentage', 0)
                        try:
                            percentage = float(percentage) if percentage is not None else 0.0
                            # Clamp percentage to valid range
                            percentage = max(0.0, min(100.0, percentage))
                        except (ValueError, TypeError):
                            percentage = 0.0
                        
                        # Log custom_fields for debugging
                        print(f"Updating contributor {contributor_id} with custom_fields: {json.dumps(custom_fields, default=str)}, percentage: {percentage}")
                        
                        cur.execute("""
                            INSERT INTO split_sheet_contributors (
                                id, split_sheet_id, name, email, role, percentage,
                                order_index, user_id, custom_fields, created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """, (
                            contributor_id,
                            split_sheet_id,
                            contributor.get('name', ''),
                            contributor.get('email'),
                            contributor.get('role', 'collaborator'),
                            percentage,
                            contributor.get('order_index', idx),
                            contributor.get('user_id'),
                            Json(custom_fields)
                        ))
                    
                    # Recalculate total percentage
                    cur.execute("""
                        SELECT SUM(percentage) as total
                        FROM split_sheet_contributors
                        WHERE split_sheet_id = %s
                    """, (split_sheet_id,))
                    total_row = cur.fetchone()
                    total_percentage = float(total_row['total']) if total_row and total_row['total'] is not None else 0.0
                    
                    cur.execute("""
                        UPDATE split_sheets
                        SET total_percentage = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (total_percentage, split_sheet_id))
                
                conn.commit()
                
                # Fetch the updated split sheet with contributors
                cur.execute("""
                    SELECT 
                        id, user_id, project_id, track_id, title, description,
                        status, total_percentage, metadata, created_at, updated_at
                    FROM split_sheets
                    WHERE id = %s
                """, (split_sheet_id,))
                split_sheet_row = cur.fetchone()
                
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, name, email, role, percentage,
                        signed_at, signature_data, invitation_sent_at, invitation_status,
                        user_id, order_index, notes, custom_fields, created_at, updated_at
                    FROM split_sheet_contributors
                    WHERE split_sheet_id = %s
                    ORDER BY order_index
                """, (split_sheet_id,))
                contributor_rows = cur.fetchall()
                
                # Build response
                split_sheet_data = dict(split_sheet_row) if split_sheet_row else {}
                split_sheet_data['contributors'] = [dict(row) for row in contributor_rows]
                split_sheet_data['contributor_count'] = len(contributor_rows)
                split_sheet_data['signed_count'] = sum(1 for c in contributor_rows if c.get('signed_at'))
                
                # Convert Decimal and datetime to JSON-serializable types
                from decimal import Decimal
                from datetime import datetime, date
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                split_sheet_data = convert_for_json(split_sheet_data)
                
                return JSONResponse({
                    "success": True,
                    "data": split_sheet_data
                })
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            import traceback
            return JSONResponse({
                "success": False,
                "error": f"Database error: {str(e)}",
                "traceback": traceback.format_exc()
            }, status_code=500)
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.get("/api/split-sheets/{split_sheet_id}")
async def get_split_sheet(split_sheet_id: str):
    """
    Get a split sheet by ID
    
    Args:
        split_sheet_id: ID of the split sheet
    
    Returns:
        JSONResponse with success status and split sheet data
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Fetch split sheet
                cur.execute("""
                    SELECT 
                        id, user_id, project_id, track_id, title, description,
                        status, total_percentage, metadata, created_at, updated_at, completed_at
                    FROM split_sheets
                    WHERE id = %s
                """, (split_sheet_id,))
                split_sheet_row = cur.fetchone()
                
                if not split_sheet_row:
                    raise HTTPException(status_code=404, detail="Split sheet not found")
                
                # Fetch contributors
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, name, email, role, percentage,
                        signed_at, signature_data, invitation_sent_at, invitation_status,
                        user_id, order_index, notes, custom_fields, created_at, updated_at
                    FROM split_sheet_contributors
                    WHERE split_sheet_id = %s
                    ORDER BY order_index
                """, (split_sheet_id,))
                contributor_rows = cur.fetchall()
                
                # Build response - convert Decimal to float for JSON serialization
                from decimal import Decimal
                from datetime import datetime
                
                def convert_for_json(obj):
                    """Convert non-JSON-serializable types"""
                    if isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    elif isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, datetime):
                        return obj.isoformat()
                    return obj
                
                split_sheet_data = convert_for_json(dict(split_sheet_row))
                split_sheet_data['contributors'] = [convert_for_json(dict(row)) for row in contributor_rows]
                split_sheet_data['contributor_count'] = len(contributor_rows)
                split_sheet_data['signed_count'] = sum(1 for c in contributor_rows if c.get('signed_at'))
                
                return JSONResponse({
                    "success": True,
                    "data": split_sheet_data
                })
        except psycopg2.Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.get("/api/split-sheets/portal/access/{access_code}")
async def get_split_sheet_by_access_code(
    access_code: str,
    pin: str = Query(None),
    password: str = Query(None)
):
    """
    Get split sheet by access code for portal view
    
    Args:
        access_code: Access code for the split sheet
        pin: Optional PIN for additional security
        password: Optional password for additional security
    
    Returns:
        JSONResponse with success status, split_sheet_id, and security requirements
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Try to create access codes table if it doesn't exist
                try:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheet_access_codes (
                            id VARCHAR(255) PRIMARY KEY,
                            split_sheet_id VARCHAR(255) NOT NULL REFERENCES split_sheets(id) ON DELETE CASCADE,
                            contributor_id VARCHAR(255) REFERENCES split_sheet_contributors(id) ON DELETE CASCADE,
                            access_code VARCHAR(100) NOT NULL UNIQUE,
                            pin_hash VARCHAR(255),
                            password_hash VARCHAR(255),
                            expires_at TIMESTAMP WITH TIME ZONE,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                except Exception:
                    conn.rollback()
                    pass
                
                # Look up access code
                # First, try to find in access_codes table
                cur.execute("""
                    SELECT 
                        ac.split_sheet_id,
                        ac.contributor_id,
                        ac.pin_hash,
                        ac.password_hash,
                        ac.expires_at,
                        ss.require_pin_for_signature,
                        ss.require_password_for_signature
                    FROM split_sheet_access_codes ac
                    INNER JOIN split_sheets ss ON ac.split_sheet_id = ss.id
                    WHERE ac.access_code = %s
                    AND (ac.expires_at IS NULL OR ac.expires_at > CURRENT_TIMESTAMP)
                """, (access_code.upper(),))
                access_row = cur.fetchone()
                
                # If not found in access_codes table, try to find by contributor ID or email
                # Access code might be the contributor ID or a generated code
                if not access_row:
                    # Try to find contributor by ID (if access code is a contributor ID)
                    cur.execute("""
                        SELECT 
                            sc.split_sheet_id,
                            sc.id as contributor_id,
                            ss.require_pin_for_signature,
                            ss.require_password_for_signature
                        FROM split_sheet_contributors sc
                        INNER JOIN split_sheets ss ON sc.split_sheet_id = ss.id
                        WHERE sc.id = %s OR UPPER(sc.custom_fields->>'access_code') = %s
                    """, (access_code, access_code.upper()))
                    contributor_row = cur.fetchone()
                    
                    if contributor_row:
                        return JSONResponse({
                            "success": True,
                            "data": {
                                "split_sheet_id": contributor_row['split_sheet_id'],
                                "contributor_id": contributor_row['contributor_id'],
                                "require_pin": bool(contributor_row.get('require_pin_for_signature')),
                                "require_password": bool(contributor_row.get('require_password_for_signature'))
                            }
                        })
                    else:
                        return JSONResponse({
                            "success": False,
                            "error": "Invalid access code"
                        }, status_code=404)
                
                # Validate PIN if required
                if access_row.get('pin_hash') and not pin:
                    return JSONResponse({
                        "success": False,
                        "error": "PIN required",
                        "require_pin": True
                    }, status_code=401)
                
                # Validate password if required
                if access_row.get('password_hash') and not password:
                    return JSONResponse({
                        "success": False,
                        "error": "Password required",
                        "require_password": True
                    }, status_code=401)
                
                # TODO: Implement actual PIN/password hashing validation
                # For now, we'll just check if they're provided when required
                
                return JSONResponse({
                    "success": True,
                    "data": {
                        "split_sheet_id": access_row['split_sheet_id'],
                        "contributor_id": access_row.get('contributor_id'),
                        "require_pin": bool(access_row.get('require_pin_for_signature') or access_row.get('pin_hash')),
                        "require_password": bool(access_row.get('require_password_for_signature') or access_row.get('password_hash'))
                    }
                })
        except psycopg2.Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": f"Error accessing split sheet: {str(e)}",
            "traceback": traceback.format_exc()
        }, status_code=500)


# Consent portal routes — extracted to backend/routes/consent.py.



@app.get("/api/split-sheets/contributor/{contributor_id}")
async def get_split_sheets_by_contributor(contributor_id: str, token: str = None, access_code: str = None):
    """
    Get split sheets for a contributor by contributor ID
    
    Args:
        contributor_id: ID of the contributor
        token: Optional access token
        access_code: Optional access code
    
    Returns:
        JSONResponse with success status and list of split sheets
    """
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({
            "success": False,
            "error": "Database service not available"
        }, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Find split sheets for this contributor
            cur.execute("""
                SELECT DISTINCT
                    ss.id, ss.user_id, ss.project_id, ss.track_id, ss.title, ss.description,
                    ss.status, ss.total_percentage, ss.created_at, ss.updated_at, ss.completed_at
                FROM split_sheets ss
                INNER JOIN split_sheet_contributors sc ON ss.id = sc.split_sheet_id
                WHERE sc.id = %s
                ORDER BY ss.created_at DESC
            """, (contributor_id,))
            split_sheet_rows = cur.fetchall()
            
            if not split_sheet_rows:
                return JSONResponse({
                    "success": False,
                    "error": "No split sheets found for this contributor"
                }, status_code=404)
            
            # Build response with contributor-specific data
            split_sheets = []
            for ss_row in split_sheet_rows:
                split_sheet_id = ss_row['id']
                # Get contributor details for this split sheet
                cur.execute("""
                    SELECT id, name, email, role, percentage, signed_at, signature_data
                    FROM split_sheet_contributors
                    WHERE id = %s AND split_sheet_id = %s
                """, (contributor_id, split_sheet_id))
                contributor_row = cur.fetchone()
                
                if contributor_row:
                    split_sheet_data = dict(ss_row)
                    split_sheet_data['percentage'] = float(contributor_row['percentage']) if contributor_row['percentage'] else 0
                    split_sheet_data['role'] = contributor_row['role']
                    split_sheet_data['signed_at'] = contributor_row['signed_at'].isoformat() if contributor_row['signed_at'] else None
                    split_sheet_data['contributor_record_id'] = contributor_row['id']
                    split_sheets.append(split_sheet_data)
            
            return JSONResponse({
                "success": True,
                "data": {
                    "splitSheets": split_sheets
                }
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.get("/api/split-sheets/by-email/{email}")
async def get_split_sheets_by_email(email: str, token: str = None, access_code: str = None):
    """
    Get split sheets for a contributor by email
    
    Args:
        email: Email address of the contributor
        token: Optional access token
        access_code: Optional access code
    
    Returns:
        JSONResponse with success status and list of split sheets
    """
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({
            "success": False,
            "error": "Database service not available"
        }, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Find split sheets for this email
            cur.execute("""
                SELECT DISTINCT
                    ss.id, ss.user_id, ss.project_id, ss.track_id, ss.title, ss.description,
                    ss.status, ss.total_percentage, ss.created_at, ss.updated_at, ss.completed_at,
                    sc.id as contributor_id, sc.percentage, sc.role, sc.signed_at, sc.signature_data
                FROM split_sheets ss
                INNER JOIN split_sheet_contributors sc ON ss.id = sc.split_sheet_id
                WHERE LOWER(sc.email) = LOWER(%s)
                ORDER BY ss.created_at DESC
            """, (email,))
            rows = cur.fetchall()
            
            if not rows:
                return JSONResponse({
                    "success": False,
                    "error": "No split sheets found for this email"
                }, status_code=404)
            
            # Build response
            split_sheets = []
            for row in rows:
                split_sheet_data = {
                    "id": row['id'],
                    "user_id": row['user_id'],
                    "project_id": row['project_id'],
                    "track_id": row['track_id'],
                    "title": row['title'],
                    "description": row['description'],
                    "status": row['status'],
                    "total_percentage": float(row['total_percentage']) if row['total_percentage'] else 0,
                    "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                    "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                    "completed_at": row['completed_at'].isoformat() if row['completed_at'] else None,
                    "percentage": float(row['percentage']) if row['percentage'] else 0,
                    "role": row['role'],
                    "signed_at": row['signed_at'].isoformat() if row['signed_at'] else None,
                    "contributor_record_id": row['contributor_id']
                }
                split_sheets.append(split_sheet_data)
            
            return JSONResponse({
                "success": True,
                "data": {
                    "splitSheets": split_sheets
                }
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ============================================================================
# Split Sheet SongFlow Integration API Endpoints
# ============================================================================

@app.get("/api/split-sheets/by-songflow-track/{songflow_track_id}")
async def get_split_sheet_by_songflow_track(songflow_track_id: str):
    """
    Get split sheet(s) linked to a SongFlow track
    
    Args:
        songflow_track_id: ID of the SongFlow track
    
    Returns:
        JSONResponse with success status and split sheet data (or list of split sheets if multiple)
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Try to create table if it doesn't exist
                try:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheet_songflow_links (
                            id VARCHAR(255) PRIMARY KEY,
                            split_sheet_id VARCHAR(255) NOT NULL,
                            songflow_project_id VARCHAR(255),
                            songflow_track_id VARCHAR(255),
                            link_type VARCHAR(50) NOT NULL,
                            auto_created BOOLEAN DEFAULT FALSE,
                            linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            linked_by VARCHAR(255),
                            metadata JSONB DEFAULT '{}'::jsonb,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                except Exception:
                    conn.rollback()
                    pass
                
                # Find split sheet(s) linked to this track
                cur.execute("""
                    SELECT ss.id, ss.user_id, ss.project_id, ss.track_id, ss.title, ss.description,
                           ss.status, ss.total_percentage, ss.created_at, ss.updated_at, ss.completed_at,
                           ss.songflow_project_id, ss.songflow_track_id
                    FROM split_sheets ss
                    INNER JOIN split_sheet_songflow_links link ON ss.id = link.split_sheet_id
                    WHERE link.songflow_track_id = %s
                    ORDER BY link.created_at DESC
                    LIMIT 1
                """, (songflow_track_id,))
                split_sheet_row = cur.fetchone()
                
                if not split_sheet_row:
                    return JSONResponse({
                        "success": False,
                        "error": "No split sheet found for this SongFlow track"
                    }, status_code=404)
                
                split_sheet_id = split_sheet_row['id']
                
                # Fetch contributors
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, name, email, role, percentage,
                        signed_at, signature_data, invitation_sent_at, invitation_status,
                        user_id, order_index, notes, custom_fields, created_at, updated_at
                    FROM split_sheet_contributors
                    WHERE split_sheet_id = %s
                    ORDER BY order_index
                """, (split_sheet_id,))
                contributor_rows = cur.fetchall()
                
                # Build response
                from decimal import Decimal
                from datetime import datetime, date
                
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                
                split_sheet_data = dict(split_sheet_row)
                split_sheet_data['contributors'] = [convert_for_json(dict(row)) for row in contributor_rows]
                split_sheet_data['contributor_count'] = len(contributor_rows)
                split_sheet_data['signed_count'] = sum(1 for c in contributor_rows if c.get('signed_at'))
                
                return JSONResponse({
                    "success": True,
                    "data": convert_for_json(split_sheet_data)
                })
        except psycopg2.Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.get("/api/split-sheets/{split_sheet_id}/songflow")
async def get_split_sheet_songflow_links(split_sheet_id: str):
    """
    Get all SongFlow links for a split sheet
    
    Args:
        split_sheet_id: ID of the split sheet
    
    Returns:
        JSONResponse with success status and list of SongFlow links
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Try to create table if it doesn't exist
                try:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheet_songflow_links (
                            id VARCHAR(255) PRIMARY KEY,
                            split_sheet_id VARCHAR(255) NOT NULL,
                            songflow_project_id VARCHAR(255),
                            songflow_track_id VARCHAR(255),
                            link_type VARCHAR(50) NOT NULL,
                            auto_created BOOLEAN DEFAULT FALSE,
                            linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            linked_by VARCHAR(255),
                            metadata JSONB DEFAULT '{}'::jsonb,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                except Exception:
                    conn.rollback()
                    pass
                
                # Fetch links
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, songflow_project_id, songflow_track_id,
                        link_type, auto_created, linked_at, linked_by, metadata,
                        created_at, updated_at
                    FROM split_sheet_songflow_links
                    WHERE split_sheet_id = %s
                    ORDER BY created_at DESC
                """, (split_sheet_id,))
                link_rows = cur.fetchall()
                
                # Convert to list of dicts and handle JSON serialization
                from decimal import Decimal
                from datetime import datetime, date
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                
                links = [convert_for_json(dict(row)) for row in link_rows]
                
                return JSONResponse({
                    "success": True,
                    "data": links
                })
        except psycopg2.Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.post("/api/split-sheets/{split_sheet_id}/contributor-sign")
async def sign_split_sheet_contributor(split_sheet_id: str, request: dict):
    """
    Sign a split sheet as a contributor
    
    Args:
        split_sheet_id: ID of the split sheet
        request: Contains contributor_email, signature_data, and agreed_to_terms
    
    Returns:
        JSONResponse with success status and updated contributor data
    """
    from datetime import datetime
    from decimal import Decimal
    try:
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor, Json
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        contributor_id = request.get('contributor_id')
        contributor_email = request.get('contributor_email')
        signature_data = request.get('signature_data')
        agreed_to_terms = request.get('agreed_to_terms', True)
        token = request.get('token')
        send_email_copy = request.get('send_email_copy', False)
        email_for_copy = request.get('email_for_copy')
        download_pdf = request.get('download_pdf', False)
        
        if not contributor_id and not contributor_email:
            raise HTTPException(status_code=400, detail="contributor_id or contributor_email is required")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id FROM split_sheets WHERE id = %s
                """, (split_sheet_id,))
                split_sheet = cur.fetchone()
                
                if not split_sheet:
                    raise HTTPException(status_code=404, detail=f"Split sheet {split_sheet_id} not found")
                
                if contributor_id:
                    cur.execute("""
                        UPDATE split_sheet_contributors
                        SET signed_at = %s,
                            signature_data = %s,
                            agreed_to_terms = %s,
                            updated_at = %s
                        WHERE split_sheet_id = %s AND id = %s
                        RETURNING *
                    """, (
                        datetime.utcnow(),
                        signature_data,
                        agreed_to_terms,
                        datetime.utcnow(),
                        split_sheet_id,
                        contributor_id
                    ))
                else:
                    cur.execute("""
                        UPDATE split_sheet_contributors
                        SET signed_at = %s,
                            signature_data = %s,
                            agreed_to_terms = %s,
                            updated_at = %s
                        WHERE split_sheet_id = %s AND email = %s
                        RETURNING *
                    """, (
                        datetime.utcnow(),
                        signature_data,
                        agreed_to_terms,
                        datetime.utcnow(),
                        split_sheet_id,
                        contributor_email
                    ))
                
                updated_contributor = cur.fetchone()
                
                if not updated_contributor:
                    identifier = contributor_id or contributor_email
                    raise HTTPException(status_code=404, detail=f"Contributor {identifier} not found in split sheet {split_sheet_id}")
                
                conn.commit()
                
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                
                contributor_data = convert_for_json(dict(updated_contributor))
                
                return JSONResponse({
                    "success": True,
                    "message": "Split sheet signed successfully",
                    "data": contributor_data
                })
                
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.post("/api/split-sheets/{split_sheet_id}/link-songflow")
async def link_split_sheet_to_songflow(split_sheet_id: str, request: dict):
    """
    Link a split sheet to a SongFlow track or project
    
    Args:
        split_sheet_id: ID of the split sheet
        request: Contains songflow_track_id and/or songflow_project_id
    
    Returns:
        JSONResponse with success status and created link data
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
            from psycopg2.extras import RealDictCursor, Json
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        songflow_track_id = request.get('songflow_track_id')
        songflow_project_id = request.get('songflow_project_id')
        
        # Validate that at least one ID is provided
        if not songflow_track_id and not songflow_project_id:
            raise HTTPException(status_code=400, detail="Either songflow_track_id or songflow_project_id must be provided")
        
        # Determine link type
        if songflow_track_id and songflow_project_id:
            link_type = 'track'  # Prefer track if both are provided
        elif songflow_track_id:
            link_type = 'track'
        else:
            link_type = 'project'
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Try to create table if it doesn't exist
                try:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS split_sheet_songflow_links (
                            id VARCHAR(255) PRIMARY KEY,
                            split_sheet_id VARCHAR(255) NOT NULL,
                            songflow_project_id VARCHAR(255),
                            songflow_track_id VARCHAR(255),
                            link_type VARCHAR(50) NOT NULL,
                            auto_created BOOLEAN DEFAULT FALSE,
                            linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            linked_by VARCHAR(255),
                            metadata JSONB DEFAULT '{}'::jsonb,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                except Exception:
                    conn.rollback()
                    pass
                
                # Check if split sheet exists
                cur.execute("SELECT id FROM split_sheets WHERE id = %s", (split_sheet_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Split sheet not found")
                
                # Check if link already exists
                if songflow_track_id:
                    cur.execute("""
                        SELECT id FROM split_sheet_songflow_links
                        WHERE split_sheet_id = %s AND songflow_track_id = %s
                    """, (split_sheet_id, songflow_track_id))
                else:
                    cur.execute("""
                        SELECT id FROM split_sheet_songflow_links
                        WHERE split_sheet_id = %s AND songflow_project_id = %s
                    """, (split_sheet_id, songflow_project_id))
                
                existing_link = cur.fetchone()
                if existing_link:
                    raise HTTPException(status_code=409, detail="Link already exists")
                
                # Create new link
                link_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO split_sheet_songflow_links (
                        id, split_sheet_id, songflow_project_id, songflow_track_id,
                        link_type, auto_created, linked_at, metadata,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (
                    link_id,
                    split_sheet_id,
                    songflow_project_id,
                    songflow_track_id,
                    link_type,
                    False,  # Manual link, not auto-created
                    Json(request.get('metadata', {}))
                ))
                
                conn.commit()
                
                # Fetch the created link
                cur.execute("""
                    SELECT 
                        id, split_sheet_id, songflow_project_id, songflow_track_id,
                        link_type, auto_created, linked_at, linked_by, metadata,
                        created_at, updated_at
                    FROM split_sheet_songflow_links
                    WHERE id = %s
                """, (link_id,))
                link_row = cur.fetchone()
                
                # Convert to dict and handle JSON serialization
                from decimal import Decimal
                from datetime import datetime, date
                def convert_for_json(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    elif isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_for_json(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_for_json(item) for item in obj]
                    return obj
                
                link_data = convert_for_json(dict(link_row)) if link_row else {}
                
                return JSONResponse({
                    "success": True,
                    "data": link_data
                })
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


@app.delete("/api/split-sheets/{split_sheet_id}/unlink-songflow")
async def unlink_split_sheet_from_songflow(
    split_sheet_id: str,
    songflow_track_id: str = Query(None, description="SongFlow track ID to unlink"),
    songflow_project_id: str = Query(None, description="SongFlow project ID to unlink")
):
    """
    Unlink a split sheet from a SongFlow track or project
    
    Args:
        split_sheet_id: ID of the split sheet
        songflow_track_id: Optional SongFlow track ID (query parameter)
        songflow_project_id: Optional SongFlow project ID (query parameter)
    
    Returns:
        JSONResponse with success status
    """
    try:
        # Import database connection
        try:
            from tutorials_service import get_db_connection
            import psycopg2
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "Database service not available"
            }, status_code=503)
        
        # Validate that at least one ID is provided
        if not songflow_track_id and not songflow_project_id:
            raise HTTPException(status_code=400, detail="Either songflow_track_id or songflow_project_id must be provided")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                # Build delete query based on provided parameters
                if songflow_track_id and songflow_project_id:
                    cur.execute("""
                        DELETE FROM split_sheet_songflow_links
                        WHERE split_sheet_id = %s AND songflow_track_id = %s AND songflow_project_id = %s
                    """, (split_sheet_id, songflow_track_id, songflow_project_id))
                elif songflow_track_id:
                    cur.execute("""
                        DELETE FROM split_sheet_songflow_links
                        WHERE split_sheet_id = %s AND songflow_track_id = %s
                    """, (split_sheet_id, songflow_track_id))
                else:
                    cur.execute("""
                        DELETE FROM split_sheet_songflow_links
                        WHERE split_sheet_id = %s AND songflow_project_id = %s
                    """, (split_sheet_id, songflow_project_id))
                
                deleted_count = cur.rowcount
                conn.commit()
                
                if deleted_count == 0:
                    raise HTTPException(status_code=404, detail="Link not found")
                
                return JSONResponse({
                    "success": True,
                    "message": "Link removed successfully"
                })
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


# Email / storyboards / environment routes — extracted to backend/routes/
# {email,storyboards,environment}.py.

# /api/models/{filename} route — extracted to backend/routes/models.py.

# ==================== SPLIT SHEET REVENUE API ====================

@app.get("/api/split-sheets/{split_sheet_id}/revenue")
async def get_split_sheet_revenue(split_sheet_id: str):
    """Get revenue history for a split sheet"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Ensure table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS split_sheet_revenue (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'NOK',
                    revenue_source VARCHAR(50) NOT NULL,
                    platform VARCHAR(100),
                    period_start DATE,
                    period_end DATE,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT * FROM split_sheet_revenue
                WHERE split_sheet_id = %s
                ORDER BY period_start DESC, created_at DESC
            """, (split_sheet_id,))
            rows = cur.fetchall()
            
            data = []
            for row in rows:
                item = dict(row)
                for k, v in item.items():
                    if hasattr(v, 'isoformat'):
                        item[k] = v.isoformat()
                data.append(item)
            
            return JSONResponse({"success": True, "data": data})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.post("/api/split-sheets/{split_sheet_id}/revenue")
async def create_split_sheet_revenue(split_sheet_id: str, request: Request):
    """Add revenue entry for a split sheet"""
    import uuid
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    revenue_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO split_sheet_revenue 
                (id, split_sheet_id, amount, currency, revenue_source, platform, period_start, period_end, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                revenue_id,
                split_sheet_id,
                body.get('amount', 0),
                body.get('currency', 'NOK'),
                body.get('revenue_source', 'streaming'),
                body.get('platform'),
                body.get('period_start'),
                body.get('period_end'),
                body.get('description')
            ))
            row = cur.fetchone()
            conn.commit()
            
            # Auto-calculate and create payment records for contributors
            cur.execute("""
                SELECT id, percentage FROM split_sheet_contributors
                WHERE split_sheet_id = %s
            """, (split_sheet_id,))
            contributors = cur.fetchall()
            
            amount = float(body.get('amount', 0))
            for contributor in contributors:
                percentage = float(contributor['percentage'] or 0)
                payment_amount = amount * (percentage / 100)
                payment_id = str(uuid.uuid4())
                
                cur.execute("""
                    INSERT INTO split_sheet_payments
                    (id, split_sheet_id, revenue_id, contributor_id, amount, currency, payment_status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                    ON CONFLICT DO NOTHING
                """, (
                    payment_id,
                    split_sheet_id,
                    revenue_id,
                    contributor['id'],
                    payment_amount,
                    body.get('currency', 'NOK')
                ))
            conn.commit()
            
            result = dict(row) if row else {}
            for k, v in result.items():
                if hasattr(v, 'isoformat'):
                    result[k] = v.isoformat()
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== SPLIT SHEET PAYMENTS API ====================

@app.get("/api/split-sheets/{split_sheet_id}/payments")
async def get_split_sheet_payments(split_sheet_id: str):
    """Get payment history for a split sheet"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Ensure table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS split_sheet_payments (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255) NOT NULL,
                    revenue_id VARCHAR(255),
                    contributor_id VARCHAR(255) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'NOK',
                    payment_status VARCHAR(50) DEFAULT 'pending',
                    payment_date DATE,
                    payment_method VARCHAR(50),
                    payment_reference VARCHAR(255),
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT p.*, c.name as contributor_name, c.email as contributor_email, c.role as contributor_role
                FROM split_sheet_payments p
                LEFT JOIN split_sheet_contributors c ON p.contributor_id = c.id
                WHERE p.split_sheet_id = %s
                ORDER BY p.created_at DESC
            """, (split_sheet_id,))
            rows = cur.fetchall()
            
            data = []
            for row in rows:
                item = dict(row)
                item['contributor'] = {
                    'name': item.pop('contributor_name', None),
                    'email': item.pop('contributor_email', None),
                    'role': item.pop('contributor_role', None)
                }
                for k, v in item.items():
                    if hasattr(v, 'isoformat'):
                        item[k] = v.isoformat()
                data.append(item)
            
            return JSONResponse({"success": True, "data": data})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.put("/api/split-sheets/payments/{payment_id}")
async def update_split_sheet_payment(payment_id: str, request: Request):
    """Update payment status and details"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE split_sheet_payments
                SET payment_status = COALESCE(%s, payment_status),
                    payment_date = COALESCE(%s, payment_date),
                    payment_method = COALESCE(%s, payment_method),
                    payment_reference = COALESCE(%s, payment_reference),
                    notes = COALESCE(%s, notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (
                body.get('payment_status'),
                body.get('payment_date'),
                body.get('payment_method'),
                body.get('payment_reference'),
                body.get('notes'),
                payment_id
            ))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Payment not found"}, status_code=404)
            
            result = dict(row)
            for k, v in result.items():
                if hasattr(v, 'isoformat'):
                    result[k] = v.isoformat()
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== SPLIT SHEET INVOICES API ====================

@app.get("/api/split-sheets/invoices")
async def get_split_sheet_invoices(userId: str = Query(None)):
    """Get invoices for a user"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Ensure table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS split_sheet_invoices (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255),
                    user_id VARCHAR(255),
                    split_sheet_title VARCHAR(500),
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'NOK',
                    status VARCHAR(50) DEFAULT 'draft',
                    recipient_email VARCHAR(255),
                    due_date DATE,
                    paid_at TIMESTAMP WITH TIME ZONE,
                    fiken_invoice_id VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            query = "SELECT * FROM split_sheet_invoices"
            params = []
            if userId:
                query += " WHERE user_id = %s"
                params.append(userId)
            query += " ORDER BY created_at DESC"
            
            cur.execute(query, params)
            rows = cur.fetchall()
            
            invoices = []
            for row in rows:
                item = dict(row)
                # Convert to camelCase for frontend
                invoice = {
                    'id': item['id'],
                    'splitSheetId': item.get('split_sheet_id'),
                    'splitSheetTitle': item.get('split_sheet_title'),
                    'amount': float(item.get('amount', 0)),
                    'currency': item.get('currency', 'NOK'),
                    'status': item.get('status', 'draft'),
                    'recipientEmail': item.get('recipient_email'),
                    'dueDate': item['due_date'].isoformat() if item.get('due_date') else None,
                    'paidAt': item['paid_at'].isoformat() if item.get('paid_at') else None,
                    'fikenInvoiceId': item.get('fiken_invoice_id'),
                    'createdAt': item['created_at'].isoformat() if item.get('created_at') else None
                }
                invoices.append(invoice)
            
            return JSONResponse({"invoices": invoices})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.post("/api/split-sheets/invoices/{invoice_id}/send-email")
async def send_invoice_email(invoice_id: str, request: Request):
    """Send invoice via email"""
    body = await request.json()
    
    # In a real implementation, this would:
    # 1. Fetch invoice details
    # 2. Generate PDF
    # 3. Send email with Resend/SendGrid
    
    # For now, simulate success and update status
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE split_sheet_invoices
                SET status = 'sent',
                    recipient_email = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (body.get('recipientEmail'), invoice_id))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Invoice not found"}, status_code=404)
            
            return JSONResponse({
                "success": True,
                "message": f"Invoice sent to {body.get('recipientEmail')}"
            })
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# Fiken routes (send-fiken + accounting/fiken/status) — extracted to backend/routes/fiken.py.

# Pro-connections routes — extracted to backend/routes/split_sheets_workflow.py.

# Contracts routes — extracted to backend/routes/contracts.py.

# Norwegian laws routes — extracted to backend/routes/norwegian_laws.py.

# split-sheets comments/templates/reports/statistics — extracted to backend/routes/split_sheets_workflow.py.

# ==================== TROLL DEMO COMPREHENSIVE INITIALIZATION ====================

@app.post("/api/demo/troll/initialize-all")
async def initialize_troll_demo_all(request: Request):
    """
    Initialize ALL TROLL demo data comprehensively and return status for each area.
    This endpoint loads data dynamically from the database, nothing is hardcoded in the response.
    """
    import uuid
    import json
    from datetime import datetime
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    project_id = 'troll-project-2026'
    results = {
        "project": {"status": "pending", "count": 0, "items": []},
        "roles": {"status": "pending", "count": 0, "items": []},
        "candidates": {"status": "pending", "count": 0, "items": []},
        "crew": {"status": "pending", "count": 0, "items": []},
        "locations": {"status": "pending", "count": 0, "items": []},
        "production_days": {"status": "pending", "count": 0, "items": []},
        "scenes": {"status": "pending", "count": 0, "items": []},
        "shot_lists": {"status": "pending", "count": 0, "items": []},
        "offers": {"status": "pending", "count": 0, "items": []},
        "contracts": {"status": "pending", "count": 0, "items": []},
        "consents": {"status": "pending", "count": 0, "items": []},
        "split_sheets": {"status": "pending", "count": 0, "items": []},
        "equipment": {"status": "pending", "count": 0, "items": []},
    }
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            
            # 1. Check/Load Project
            cur.execute("SELECT id, name, description FROM casting_projects WHERE id = %s", (project_id,))
            project = cur.fetchone()
            if project:
                results["project"] = {"status": "loaded", "count": 1, "items": [{"id": project["id"], "name": project["name"]}]}
            else:
                results["project"] = {"status": "not_found", "count": 0, "items": []}
            
            # 2. Load Roles
            cur.execute("SELECT id, name, status, description FROM casting_roles WHERE project_id = %s", (project_id,))
            roles = cur.fetchall()
            results["roles"] = {
                "status": "loaded" if roles else "empty",
                "count": len(roles),
                "items": [{"id": r["id"], "name": r["name"], "status": r.get("status", "")} for r in roles[:10]]
            }
            
            # 3. Load Candidates
            cur.execute("SELECT id, name, workflow_status FROM casting_candidates WHERE project_id = %s", (project_id,))
            candidates = cur.fetchall()
            results["candidates"] = {
                "status": "loaded" if candidates else "empty",
                "count": len(candidates),
                "items": [{"id": c["id"], "name": c["name"], "status": c.get("workflow_status", "")} for c in candidates[:10]]
            }
            
            # 4. Load Crew
            cur.execute("SELECT id, name, role, notes FROM casting_crew WHERE project_id = %s", (project_id,))
            crew = cur.fetchall()
            results["crew"] = {
                "status": "loaded" if crew else "empty",
                "count": len(crew),
                "items": [{"id": c["id"], "name": c["name"], "role": c.get("role", "")} for c in crew[:10]]
            }
            
            # 5. Load Locations
            cur.execute("SELECT id, name, type, address FROM casting_locations WHERE project_id = %s", (project_id,))
            locations = cur.fetchall()
            results["locations"] = {
                "status": "loaded" if locations else "empty",
                "count": len(locations),
                "items": [{"id": loc["id"], "name": loc["name"], "type": loc.get("type", "")} for loc in locations[:10]]
            }
            
            # 6. Load Production Days
            cur.execute("SELECT id, date, status, notes FROM casting_production_days WHERE project_id = %s", (project_id,))
            prod_days = cur.fetchall()
            results["production_days"] = {
                "status": "loaded" if prod_days else "empty",
                "count": len(prod_days),
                "items": [{"id": pd["id"], "date": str(pd["date"]) if pd.get("date") else "", "status": pd.get("status", "")} for pd in prod_days[:10]]
            }
            
            # 7. Load Scenes
            cur.execute("SELECT id, scene_number, location_name, int_ext FROM casting_scenes WHERE project_id = %s", (project_id,))
            scenes = cur.fetchall()
            results["scenes"] = {
                "status": "loaded" if scenes else "empty",
                "count": len(scenes),
                "items": [{"id": s["id"], "scene_number": s.get("scene_number", ""), "location": s.get("location_name", "")} for s in scenes[:10]]
            }
            
            # 8. Load Shot Lists
            cur.execute("SELECT id, scene_id, notes FROM casting_shot_lists WHERE project_id = %s", (project_id,))
            shot_lists = cur.fetchall()
            results["shot_lists"] = {
                "status": "loaded" if shot_lists else "empty",
                "count": len(shot_lists),
                "items": [{"id": sl["id"], "scene_id": sl.get("scene_id", "")} for sl in shot_lists[:10]]
            }
            
            # 9. Load Offers
            cur.execute("""
                SELECT o.id, o.status, c.name as candidate_name 
                FROM casting_offers o 
                LEFT JOIN casting_candidates c ON o.candidate_id = c.id 
                WHERE o.project_id = %s
            """, (project_id,))
            offers = cur.fetchall()
            results["offers"] = {
                "status": "loaded" if offers else "empty",
                "count": len(offers),
                "items": [{"id": o["id"], "status": o.get("status", ""), "candidate": o.get("candidate_name", "")} for o in offers[:10]]
            }
            
            # 10. Load Contracts
            cur.execute("""
                SELECT ct.id, ct.status, ct.contract_type, c.name as candidate_name 
                FROM casting_contracts ct 
                LEFT JOIN casting_candidates c ON ct.candidate_id = c.id 
                WHERE ct.project_id = %s
            """, (project_id,))
            contracts = cur.fetchall()
            results["contracts"] = {
                "status": "loaded" if contracts else "empty",
                "count": len(contracts),
                "items": [{"id": ct["id"], "status": ct.get("status", ""), "type": ct.get("contract_type", ""), "candidate": ct.get("candidate_name", "")} for ct in contracts[:10]]
            }
            
            # 11. Load Consents
            cur.execute("""
                SELECT cs.id, cs.type, cs.signed, c.name as candidate_name 
                FROM casting_consents cs 
                LEFT JOIN casting_candidates c ON cs.candidate_id = c.id 
                WHERE cs.project_id = %s
            """, (project_id,))
            consents = cur.fetchall()
            results["consents"] = {
                "status": "loaded" if consents else "empty",
                "count": len(consents),
                "items": [{"id": cs["id"], "type": cs.get("type", ""), "signed": cs.get("signed", False)} for cs in consents[:10]]
            }
            
            # 12. Load Split Sheets
            cur.execute("""
                SELECT ss.id, ss.title, ss.status, 
                       (SELECT COUNT(*) FROM split_sheet_contributors WHERE split_sheet_id = ss.id) as contributor_count
                FROM split_sheets ss 
                WHERE ss.project_id = %s
            """, (project_id,))
            split_sheets = cur.fetchall()
            results["split_sheets"] = {
                "status": "loaded" if split_sheets else "empty",
                "count": len(split_sheets),
                "items": [{"id": ss["id"], "title": ss.get("title", ""), "contributors": ss.get("contributor_count", 0)} for ss in split_sheets[:10]]
            }
            
            # 13. Load Equipment
            cur.execute("SELECT id, name, category FROM casting_equipment WHERE project_id = %s", (project_id,))
            equipment = cur.fetchall()
            results["equipment"] = {
                "status": "loaded" if equipment else "empty",
                "count": len(equipment),
                "items": [{"id": eq["id"], "name": eq["name"], "category": eq.get("category", "")} for eq in equipment[:10]]
            }
            
            # Calculate totals
            total_items = sum(r["count"] for r in results.values())
            loaded_areas = sum(1 for r in results.values() if r["status"] == "loaded")
            
            return JSONResponse({
                "success": True,
                "project_id": project_id,
                "summary": {
                    "total_items": total_items,
                    "loaded_areas": loaded_areas,
                    "total_areas": len(results)
                },
                "areas": results
            })
            
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ==================== TROLL DEMO SPLIT SHEET INITIALIZATION ====================

@app.post("/api/split-sheets/demo/troll")
async def initialize_troll_demo_split_sheet(request: Request):
    """
    Initialize TROLL demo project split sheet with comprehensive film production data.
    This creates a complete split sheet example for the TROLL (2026) Norwegian film.
    """
    import uuid
    import json
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json() if request else {}
    user_id = body.get('user_id', 'demo-user')
    
    # TROLL Film Production Split Sheet Data
    troll_split_sheet = {
        'id': 'troll-split-sheet-2026',
        'user_id': user_id,
        'project_id': 'troll-project-2026',
        'title': 'TROLL - Filmproduksjon Split Sheet',
        'description': 'Fordeling av inntekter og royalties for TROLL (2026) - Norsk eventyrfilm regissert av Roar Uthaug. Inkluderer alle bidragsytere fra produksjon, VFX, lyd og distribusjon.',
        'status': 'pending_signatures',
        'total_percentage': 100.0,
        'contributors': [
            {
                'name': 'Netflix',
                'email': 'rights@netflix.com',
                'role': 'distributor',
                'percentage': 35.0,
                'notes': 'Global streaming distribusjon - alle territorier unntatt Norden'
            },
            {
                'name': 'Nordisk Film Production',
                'email': 'produksjon@nordiskfilm.no',
                'role': 'producer',
                'percentage': 25.0,
                'notes': 'Hovedprodusent - norsk produksjonsselskap'
            },
            {
                'name': 'Motion Blur VFX',
                'email': 'vfx@motionblur.no',
                'role': 'vfx_studio',
                'percentage': 12.0,
                'notes': 'Alle VFX og CGI for trollet og naturscener'
            },
            {
                'name': 'Roar Uthaug',
                'email': 'roar@trollfilm.no',
                'role': 'director',
                'percentage': 8.0,
                'notes': 'Regissør og kreativ leder'
            },
            {
                'name': 'Lydverket AS',
                'email': 'sound@lydverket.no',
                'role': 'sound_design',
                'percentage': 5.0,
                'notes': 'Lyddesign, foley og atmosfære'
            },
            {
                'name': 'Johannes Ringen',
                'email': 'johannes@musikk.no',
                'role': 'composer',
                'percentage': 5.0,
                'notes': 'Original filmmusikk og score'
            },
            {
                'name': 'Oslo Kino Distribusjon',
                'email': 'dist@oslokino.no',
                'role': 'distributor',
                'percentage': 5.0,
                'notes': 'Nordisk kinodistribusjon'
            },
            {
                'name': 'Ine Marie Wilmann',
                'email': 'ine@agent.no',
                'role': 'actor',
                'percentage': 3.0,
                'notes': 'Hovedrolle - Nora Tidemann'
            },
            {
                'name': 'Kim Falck',
                'email': 'kim@trollfilm.no',
                'role': 'actor',
                'percentage': 2.0,
                'notes': 'Rolle - Andreas Isaksen'
            }
        ]
    }
    
    # Revenue data for TROLL demo
    troll_revenue = [
        {
            'amount': 15000000.00,
            'currency': 'NOK',
            'revenue_source': 'streaming',
            'platform': 'Netflix',
            'period_start': '2026-01-01',
            'period_end': '2026-03-31',
            'description': 'Q1 2026 Netflix streaming revenue - global'
        },
        {
            'amount': 8500000.00,
            'currency': 'NOK',
            'revenue_source': 'theatrical',
            'platform': 'Nordisk Kino',
            'period_start': '2026-01-15',
            'period_end': '2026-02-28',
            'description': 'Kinobilletter Norden - premiere og første måned'
        },
        {
            'amount': 2500000.00,
            'currency': 'NOK',
            'revenue_source': 'sync_license',
            'platform': 'Diverse',
            'period_start': '2026-01-01',
            'period_end': '2026-06-30',
            'description': 'Synkroniseringslisenser og merchandise'
        }
    ]
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if TROLL split sheet already exists
            cur.execute("SELECT id FROM split_sheets WHERE id = %s", (troll_split_sheet['id'],))
            existing = cur.fetchone()
            
            if existing:
                # Update existing
                cur.execute("""
                    UPDATE split_sheets SET
                        title = %s,
                        description = %s,
                        status = %s,
                        total_percentage = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (
                    troll_split_sheet['title'],
                    troll_split_sheet['description'],
                    troll_split_sheet['status'],
                    troll_split_sheet['total_percentage'],
                    troll_split_sheet['id']
                ))
                # Delete old contributors
                cur.execute("DELETE FROM split_sheet_contributors WHERE split_sheet_id = %s", (troll_split_sheet['id'],))
            else:
                # Create new split sheet
                cur.execute("""
                    INSERT INTO split_sheets (id, user_id, project_id, title, description, status, total_percentage)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    troll_split_sheet['id'],
                    troll_split_sheet['user_id'],
                    troll_split_sheet['project_id'],
                    troll_split_sheet['title'],
                    troll_split_sheet['description'],
                    troll_split_sheet['status'],
                    troll_split_sheet['total_percentage']
                ))
            
            # Insert contributors
            for idx, contributor in enumerate(troll_split_sheet['contributors']):
                contributor_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO split_sheet_contributors 
                    (id, split_sheet_id, name, email, role, percentage, order_index, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    contributor_id,
                    troll_split_sheet['id'],
                    contributor['name'],
                    contributor['email'],
                    contributor['role'],
                    contributor['percentage'],
                    idx,
                    contributor.get('notes', '')
                ))
            
            # Insert revenue records
            for revenue in troll_revenue:
                revenue_id = str(uuid.uuid4())
                try:
                    cur.execute("""
                        INSERT INTO split_sheet_revenue 
                        (id, split_sheet_id, amount, currency, revenue_source, platform, period_start, period_end, description)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (
                        revenue_id,
                        troll_split_sheet['id'],
                        revenue['amount'],
                        revenue['currency'],
                        revenue['revenue_source'],
                        revenue['platform'],
                        revenue['period_start'],
                        revenue['period_end'],
                        revenue['description']
                    ))
                except:
                    pass  # Skip if table doesn't exist yet
            
            conn.commit()
            
            return JSONResponse({
                "success": True,
                "message": "TROLL demo split sheet initialized successfully",
                "data": {
                    "split_sheet_id": troll_split_sheet['id'],
                    "title": troll_split_sheet['title'],
                    "contributor_count": len(troll_split_sheet['contributors']),
                    "total_percentage": troll_split_sheet['total_percentage'],
                    "revenue_records": len(troll_revenue)
                }
            })
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== TROLL DEMO OFFERS, CONTRACTS & CONSENTS ====================



# ==================== SPLIT SHEET EXPORT API ====================

@app.get("/api/split-sheets/{split_sheet_id}/export/csv")
async def export_split_sheet_csv(split_sheet_id: str):
    """Export split sheet to CSV"""
    import csv
    import io
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get split sheet
            cur.execute("SELECT * FROM split_sheets WHERE id = %s", (split_sheet_id,))
            split_sheet = cur.fetchone()
            
            if not split_sheet:
                return JSONResponse({"success": False, "error": "Split sheet not found"}, status_code=404)
            
            # Get contributors
            cur.execute("""
                SELECT name, email, role, percentage, signed_at
                FROM split_sheet_contributors
                WHERE split_sheet_id = %s
            """, (split_sheet_id,))
            contributors = cur.fetchall()
            
            # Generate CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Header
            writer.writerow(['Split Sheet Export'])
            writer.writerow(['Title', split_sheet.get('title', '')])
            writer.writerow(['Status', split_sheet.get('status', '')])
            writer.writerow([])
            writer.writerow(['Contributors'])
            writer.writerow(['Name', 'Email', 'Role', 'Percentage', 'Signed At'])
            
            for c in contributors:
                writer.writerow([
                    c.get('name', ''),
                    c.get('email', ''),
                    c.get('role', ''),
                    c.get('percentage', ''),
                    c.get('signed_at', '')
                ])
            
            csv_content = output.getvalue()
            
            from fastapi.responses import Response
            return Response(
                content=csv_content,
                media_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename=split_sheet_{split_sheet_id}.csv'
                }
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.get("/api/split-sheets/{split_sheet_id}/export/json")
async def export_split_sheet_json(split_sheet_id: str):
    """Export split sheet to JSON"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get split sheet
            cur.execute("SELECT * FROM split_sheets WHERE id = %s", (split_sheet_id,))
            split_sheet = cur.fetchone()
            
            if not split_sheet:
                return JSONResponse({"success": False, "error": "Split sheet not found"}, status_code=404)
            
            # Get contributors
            cur.execute("SELECT * FROM split_sheet_contributors WHERE split_sheet_id = %s", (split_sheet_id,))
            contributors = cur.fetchall()
            
            # Get revenue
            cur.execute("SELECT * FROM split_sheet_revenue WHERE split_sheet_id = %s", (split_sheet_id,))
            revenue = cur.fetchall()
            
            # Get payments
            cur.execute("SELECT * FROM split_sheet_payments WHERE split_sheet_id = %s", (split_sheet_id,))
            payments = cur.fetchall()
            
            # Build export object
            def serialize_row(row):
                if not row:
                    return None
                result = dict(row)
                for k, v in result.items():
                    if hasattr(v, 'isoformat'):
                        result[k] = v.isoformat()
                return result
            
            export_data = {
                'split_sheet': serialize_row(split_sheet),
                'contributors': [serialize_row(c) for c in contributors],
                'revenue': [serialize_row(r) for r in revenue],
                'payments': [serialize_row(p) for p in payments],
                'exported_at': datetime.now(timezone.utc).isoformat()
            }
            
            return JSONResponse({
                "success": True,
                "data": export_data
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== SPLIT SHEET SECURITY API ====================

@app.get("/api/split-sheets/{split_sheet_id}/security")
async def get_split_sheet_security(split_sheet_id: str):
    """Get security settings for a split sheet"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    require_pin_for_signature,
                    require_password_for_signature
                FROM split_sheets
                WHERE id = %s
            """, (split_sheet_id,))
            row = cur.fetchone()
            
            if not row:
                return JSONResponse({"success": False, "error": "Split sheet not found"}, status_code=404)
            
            return JSONResponse({
                "success": True,
                "data": {
                    "split_sheet_id": row['id'],
                    "require_pin": bool(row.get('require_pin_for_signature')),
                    "require_password": bool(row.get('require_password_for_signature'))
                }
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.put("/api/split-sheets/{split_sheet_id}/security")
async def update_split_sheet_security(split_sheet_id: str, request: Request):
    """Update security settings for a split sheet"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE split_sheets
                SET require_pin_for_signature = COALESCE(%s, require_pin_for_signature),
                    require_password_for_signature = COALESCE(%s, require_password_for_signature),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, require_pin_for_signature, require_password_for_signature
            """, (
                body.get('require_pin'),
                body.get('require_password'),
                split_sheet_id
            ))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Split sheet not found"}, status_code=404)
            
            return JSONResponse({
                "success": True,
                "data": {
                    "split_sheet_id": row['id'],
                    "require_pin": bool(row.get('require_pin_for_signature')),
                    "require_password": bool(row.get('require_password_for_signature'))
                }
            })
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.delete("/api/split-sheets/{split_sheet_id}")
async def delete_split_sheet(split_sheet_id: str):
    """Delete a split sheet and all related data"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Delete related data first (in case no cascade)
            cur.execute("DELETE FROM split_sheet_revenue WHERE split_sheet_id = %s", (split_sheet_id,))
            cur.execute("DELETE FROM split_sheet_payments WHERE split_sheet_id = %s", (split_sheet_id,))
            cur.execute("DELETE FROM split_sheet_comments WHERE split_sheet_id = %s", (split_sheet_id,))
            cur.execute("DELETE FROM split_sheet_contributors WHERE split_sheet_id = %s", (split_sheet_id,))
            cur.execute("DELETE FROM split_sheets WHERE id = %s", (split_sheet_id,))
            conn.commit()
            
            return JSONResponse({"success": True, "message": "Split sheet deleted"})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==============================================
# PRODUCTION WORKFLOW API ENDPOINTS
# ==============================================

from decimal import Decimal

def serialize_db_row(row):
    """Convert database row to JSON-serializable dict"""
    if row is None:
        return None
    item = dict(row)
    for key, value in item.items():
        if isinstance(value, Decimal):
            item[key] = float(value)
        elif hasattr(value, 'isoformat'):
            item[key] = value.isoformat() if value else None
        elif type(value).__name__ in ('date', 'time', 'timedelta'):
            item[key] = str(value) if value else None
        elif isinstance(value, bytes):
            item[key] = value.decode('utf-8') if value else None
    return item

# Production CRUD routes — extracted to backend/routes/production.py. Seed-troll deferred.

# TROLL PRODUCTION DATA SEEDING

@app.post("/api/production/{project_id}/seed-troll")
async def seed_troll_production_data(project_id: str):
    """Seed Troll production workflow data into the database"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
        from datetime import datetime, timedelta
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        now = datetime.now()
        
        # Create shooting days
        shooting_days = [
            {
                "id": f"sd-troll-1-{project_id}",
                "project_id": project_id,
                "day_number": 1,
                "date": (now + timedelta(days=7)).strftime('%Y-%m-%d'),
                "call_time": "06:00",
                "wrap_time": "18:00",
                "location": "Dovre Fjell - Tunnelinngang",
                "location_address": "Dombås, Dovre kommune",
                "notes": "Første skudddag. Ekstra tid til rigging. VFX-referanser kreves.",
                "scenes": ["scene-1", "scene-2"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-2-{project_id}",
                "project_id": project_id,
                "day_number": 2,
                "date": (now + timedelta(days=8)).strftime('%Y-%m-%d'),
                "call_time": "07:00",
                "wrap_time": "19:00",
                "location": "Oslo - Noras leilighet",
                "location_address": "Grünerløkka, Oslo",
                "notes": "Interiør. God lysforhold.",
                "scenes": ["scene-3"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-3-{project_id}",
                "project_id": project_id,
                "day_number": 3,
                "date": (now + timedelta(days=9)).strftime('%Y-%m-%d'),
                "call_time": "07:00",
                "wrap_time": "19:00",
                "location": "Universitetet i Oslo",
                "location_address": "Blindern, Oslo",
                "notes": "Universitetskontor scene.",
                "scenes": ["scene-4"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-4-{project_id}",
                "project_id": project_id,
                "day_number": 4,
                "date": (now + timedelta(days=14)).strftime('%Y-%m-%d'),
                "call_time": "06:00",
                "wrap_time": "20:00",
                "location": "Dovre - Ruiner",
                "location_address": "Lesja, Oppland",
                "notes": "Eksteriør dag. Helikopterscene.",
                "scenes": ["scene-5"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-5-{project_id}",
                "project_id": project_id,
                "day_number": 5,
                "date": (now + timedelta(days=15)).strftime('%Y-%m-%d'),
                "call_time": "18:00",
                "wrap_time": "06:00",
                "location": "Østerdalen - Skog",
                "location_address": "Trysil, Hedmark",
                "notes": "NATTSKUDD. Trollet i skogen. VFX heavy.",
                "scenes": ["scene-6"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-6-{project_id}",
                "project_id": project_id,
                "day_number": 6,
                "date": (now + timedelta(days=21)).strftime('%Y-%m-%d'),
                "call_time": "07:00",
                "wrap_time": "19:00",
                "location": "Forsvaret - Kommandosentral (Studio)",
                "location_address": "Jar, Bærum",
                "notes": "Studioscene. Full kontroll.",
                "scenes": ["scene-7"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-7-{project_id}",
                "project_id": project_id,
                "day_number": 7,
                "date": (now + timedelta(days=22)).strftime('%Y-%m-%d'),
                "call_time": "14:00",
                "wrap_time": "04:00",
                "location": "Oslo Sentrum",
                "location_address": "Karl Johans gate, Oslo",
                "notes": "NATTSKUDD. Evakuering scene. 500 statister.",
                "scenes": ["scene-8"],
                "status": "planned"
            },
            {
                "id": f"sd-troll-8-{project_id}",
                "project_id": project_id,
                "day_number": 8,
                "date": (now + timedelta(days=23)).strftime('%Y-%m-%d'),
                "call_time": "04:00",
                "wrap_time": "10:00",
                "location": "Oslo Sentrum",
                "location_address": "Karl Johans gate / Slottet, Oslo",
                "notes": "SOLOPPGANG. Trollet forsteines. Klimaks.",
                "scenes": ["scene-10"],
                "status": "planned"
            }
        ]
        
        # Create stripboard strips
        stripboard = [
            {"id": f"strip-1-{project_id}", "project_id": project_id, "scene_id": "scene-1", "scene_number": "1", "shooting_day_id": f"sd-troll-1-{project_id}", "day_number": 1, "sort_order": 0, "color": "#1E3A5F", "location": "DOVRE FJELL - TUNNEL", "pages": 3, "cast_ids": ["arbeider1", "arbeider2", "formann"], "status": "scheduled", "estimated_time": 180},
            {"id": f"strip-2-{project_id}", "project_id": project_id, "scene_id": "scene-2", "scene_number": "2", "shooting_day_id": f"sd-troll-1-{project_id}", "day_number": 1, "sort_order": 1, "color": "#1E3A5F", "location": "HULEN - INNE I FJELLET", "pages": 2.5, "cast_ids": ["arbeider1", "arbeider2"], "status": "scheduled", "estimated_time": 120},
            {"id": f"strip-3-{project_id}", "project_id": project_id, "scene_id": "scene-3", "scene_number": "3", "shooting_day_id": f"sd-troll-2-{project_id}", "day_number": 2, "sort_order": 0, "color": "#F5D76E", "location": "NORAS LEILIGHET", "pages": 2, "cast_ids": ["nora"], "status": "scheduled", "estimated_time": 120},
            {"id": f"strip-4-{project_id}", "project_id": project_id, "scene_id": "scene-4", "scene_number": "4", "shooting_day_id": f"sd-troll-3-{project_id}", "day_number": 3, "sort_order": 0, "color": "#F5D76E", "location": "UNIVERSITETET - KONTOR", "pages": 4, "cast_ids": ["nora", "andreas", "general"], "status": "scheduled", "estimated_time": 240},
            {"id": f"strip-5-{project_id}", "project_id": project_id, "scene_id": "scene-5", "scene_number": "5", "shooting_day_id": f"sd-troll-4-{project_id}", "day_number": 4, "sort_order": 0, "color": "#90EE90", "location": "DOVRE - RUINENE", "pages": 3, "cast_ids": ["nora", "andreas", "soldater"], "status": "scheduled", "estimated_time": 180},
            {"id": f"strip-6-{project_id}", "project_id": project_id, "scene_id": "scene-6", "scene_number": "6", "shooting_day_id": f"sd-troll-5-{project_id}", "day_number": 5, "sort_order": 0, "color": "#1E3A5F", "location": "SKOG - ØSTERDALEN", "pages": 3, "cast_ids": ["trollet", "bonde", "bondenskone"], "status": "scheduled", "estimated_time": 180},
            {"id": f"strip-7-{project_id}", "project_id": project_id, "scene_id": "scene-7", "scene_number": "7", "shooting_day_id": f"sd-troll-6-{project_id}", "day_number": 6, "sort_order": 0, "color": "#F5D76E", "location": "KOMMANDOSENTRALEN", "pages": 5, "cast_ids": ["nora", "statsminister", "general", "andreas"], "status": "scheduled", "estimated_time": 300},
            {"id": f"strip-8-{project_id}", "project_id": project_id, "scene_id": "scene-8", "scene_number": "8", "shooting_day_id": f"sd-troll-7-{project_id}", "day_number": 7, "sort_order": 0, "color": "#1E3A5F", "location": "OSLO SENTRUM", "pages": 6, "cast_ids": ["nora", "andreas", "statsminister", "statister"], "status": "scheduled", "estimated_time": 360},
            {"id": f"strip-10-{project_id}", "project_id": project_id, "scene_id": "scene-10", "scene_number": "10", "shooting_day_id": f"sd-troll-8-{project_id}", "day_number": 8, "sort_order": 0, "color": "#FFB347", "location": "KARL JOHANS GATE", "pages": 4, "cast_ids": ["nora", "trollet"], "status": "scheduled", "estimated_time": 240}
        ]
        
        # Create cast members
        cast_members = [
            {"id": f"cast-nora-{project_id}", "project_id": project_id, "name": "Ine Marie Wilmann", "character_name": "Nora Tidemann", "scenes": ["scene-3", "scene-4", "scene-5", "scene-7", "scene-8", "scene-10"], "phone": "+47 900 00 001", "email": "ine.agent@filmtalent.no"},
            {"id": f"cast-andreas-{project_id}", "project_id": project_id, "name": "Kim Falck", "character_name": "Andreas Isaksen", "scenes": ["scene-4", "scene-5", "scene-7", "scene-8"], "phone": "+47 900 00 002", "email": "kim.agent@filmtalent.no"},
            {"id": f"cast-statsminister-{project_id}", "project_id": project_id, "name": "Anneke von der Lippe", "character_name": "Statsminister Berit Moberg", "scenes": ["scene-7", "scene-8"], "phone": "+47 900 00 003", "email": "anneke.agent@filmtalent.no"},
            {"id": f"cast-general-{project_id}", "project_id": project_id, "name": "Fridtjov Såheim", "character_name": "General Lund", "scenes": ["scene-4", "scene-7"], "phone": "+47 900 00 004", "email": "fridtjov.agent@filmtalent.no"},
            {"id": f"cast-arbeider1-{project_id}", "project_id": project_id, "name": "Mads Sjøgård Pettersen", "character_name": "Arbeider 1", "scenes": ["scene-1", "scene-2"], "phone": "+47 900 00 005", "email": "mads.agent@filmtalent.no"},
            {"id": f"cast-arbeider2-{project_id}", "project_id": project_id, "name": "Eric Vorenholt", "character_name": "Arbeider 2", "scenes": ["scene-1", "scene-2"], "phone": "+47 900 00 006", "email": "eric.agent@filmtalent.no"}
        ]
        
        # Create crew members
        crew_members = [
            {"id": f"crew-director-{project_id}", "project_id": project_id, "name": "Roar Uthaug", "role": "Director", "department": "Direction", "phone": "+47 900 10 001", "email": "roar@filmproduction.no"},
            {"id": f"crew-dop-{project_id}", "project_id": project_id, "name": "Jallo Faber", "role": "Director of Photography", "department": "Camera", "phone": "+47 900 10 002", "email": "jallo@filmproduction.no"},
            {"id": f"crew-1stad-{project_id}", "project_id": project_id, "name": "Bendik Stronstad", "role": "1st AD", "department": "Direction", "phone": "+47 900 10 003", "email": "bendik@filmproduction.no"},
            {"id": f"crew-producer-{project_id}", "project_id": project_id, "name": "Espen Horn", "role": "Producer", "department": "Production", "phone": "+47 900 10 004", "email": "espen@motionblur.no"},
            {"id": f"crew-production-designer-{project_id}", "project_id": project_id, "name": "Roger Rosenberg", "role": "Production Designer", "department": "Art", "phone": "+47 900 10 005", "email": "roger@filmproduction.no"},
            {"id": f"crew-vfx-{project_id}", "project_id": project_id, "name": "Christian Manz", "role": "VFX Supervisor", "department": "VFX", "phone": "+47 900 10 006", "email": "christian@vfx.no"},
            {"id": f"crew-sound-{project_id}", "project_id": project_id, "name": "Hugo Ekornes", "role": "Sound Mixer", "department": "Sound", "phone": "+47 900 10 007", "email": "hugo@sound.no"},
            {"id": f"crew-gaffer-{project_id}", "project_id": project_id, "name": "Trond Tønder", "role": "Gaffer", "department": "Lighting", "phone": "+47 900 10 008", "email": "trond@lighting.no"},
            {"id": f"crew-costume-{project_id}", "project_id": project_id, "name": "Karen Fabritius", "role": "Costume Designer", "department": "Costume", "phone": "+47 900 10 009", "email": "karen@costume.no"},
            {"id": f"crew-makeup-{project_id}", "project_id": project_id, "name": "Kjetil Johnsen", "role": "Makeup Department Head", "department": "Makeup", "phone": "+47 900 10 010", "email": "kjetil@makeup.no"}
        ]
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Insert shooting days
            for day in shooting_days:
                cur.execute("""
                    INSERT INTO production_shooting_days (
                        id, project_id, day_number, date, call_time, wrap_time,
                        location, location_address, notes, scenes, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        day_number = EXCLUDED.day_number,
                        date = EXCLUDED.date,
                        call_time = EXCLUDED.call_time,
                        wrap_time = EXCLUDED.wrap_time,
                        location = EXCLUDED.location,
                        location_address = EXCLUDED.location_address,
                        notes = EXCLUDED.notes,
                        scenes = EXCLUDED.scenes,
                        status = EXCLUDED.status,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    day['id'], day['project_id'], day['day_number'], day['date'],
                    day['call_time'], day['wrap_time'], day['location'],
                    day['location_address'], day['notes'], Json(day['scenes']), day['status']
                ))
            
            # Insert stripboard
            for strip in stripboard:
                cur.execute("""
                    INSERT INTO production_stripboard (
                        id, project_id, scene_id, scene_number, shooting_day_id,
                        day_number, sort_order, color, location, pages,
                        cast_ids, status, estimated_time
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        scene_id = EXCLUDED.scene_id,
                        scene_number = EXCLUDED.scene_number,
                        shooting_day_id = EXCLUDED.shooting_day_id,
                        day_number = EXCLUDED.day_number,
                        sort_order = EXCLUDED.sort_order,
                        color = EXCLUDED.color,
                        location = EXCLUDED.location,
                        pages = EXCLUDED.pages,
                        cast_ids = EXCLUDED.cast_ids,
                        status = EXCLUDED.status,
                        estimated_time = EXCLUDED.estimated_time,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    strip['id'], strip['project_id'], strip['scene_id'], strip['scene_number'],
                    strip['shooting_day_id'], strip['day_number'], strip['sort_order'],
                    strip['color'], strip['location'], strip['pages'],
                    Json(strip['cast_ids']), strip['status'], strip['estimated_time']
                ))
            
            # Insert cast
            for cast in cast_members:
                cur.execute("""
                    INSERT INTO production_cast (
                        id, project_id, name, character_name, scenes, phone, email
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        character_name = EXCLUDED.character_name,
                        scenes = EXCLUDED.scenes,
                        phone = EXCLUDED.phone,
                        email = EXCLUDED.email,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    cast['id'], cast['project_id'], cast['name'], cast['character_name'],
                    Json(cast['scenes']), cast['phone'], cast['email']
                ))
            
            # Insert crew
            for crew in crew_members:
                cur.execute("""
                    INSERT INTO production_crew (
                        id, project_id, name, role, department, phone, email
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        role = EXCLUDED.role,
                        department = EXCLUDED.department,
                        phone = EXCLUDED.phone,
                        email = EXCLUDED.email,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    crew['id'], crew['project_id'], crew['name'], crew['role'],
                    crew['department'], crew['phone'], crew['email']
                ))
            
            conn.commit()
        
        return JSONResponse({
            "success": True,
            "message": "Seeded Troll production data",
            "data": {
                "shootingDays": len(shooting_days),
                "stripboardStrips": len(stripboard),
                "castMembers": len(cast_members),
                "crewMembers": len(crew_members)
            }
        })
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ============================================================================
# LEGAL DOCUMENT GENERATION
# ============================================================================

LEGAL_DOCUMENT_TEMPLATES = {
    "split_sheet_agreement": {
        "title_no": "SPLIT SHEET-AVTALE",
        "title_en": "SPLIT SHEET AGREEMENT",
        "sections": ["parties", "work_description", "ownership_splits", "royalty_distribution", "credits"]
    },
    "royalty_agreement": {
        "title_no": "ROYALTY-AVTALE",
        "title_en": "ROYALTY AGREEMENT", 
        "sections": ["parties", "royalty_terms", "payment_schedule", "reporting", "audit_rights"]
    },
    "collaboration_agreement": {
        "title_no": "SAMARBEIDSAVTALE",
        "title_en": "COLLABORATION AGREEMENT",
        "sections": ["parties", "scope_of_work", "responsibilities", "ownership", "revenue_sharing", "term_termination"]
    },
    "custom": {
        "title_no": "AVTALE",
        "title_en": "AGREEMENT",
        "sections": ["parties", "terms"]
    }
}

CLAUSE_TEMPLATES = {
    "dispute_resolution": {
        "no": """
## Tvisteløsning

Enhver tvist som oppstår i forbindelse med denne avtalen skal først søkes løst gjennom forhandlinger 
mellom partene. Dersom partene ikke kommer til enighet innen 30 dager, skal tvisten avgjøres ved 
{arbitration_body} i henhold til gjeldende regler.""",
        "en": """
## Dispute Resolution

Any dispute arising in connection with this agreement shall first be sought resolved through negotiations 
between the parties. If the parties fail to reach an agreement within 30 days, the dispute shall be 
settled by {arbitration_body} in accordance with applicable rules."""
    },
    "termination": {
        "no": """
## Oppsigelse

Denne avtalen kan sies opp av hver av partene med {notice_period} dagers skriftlig varsel. Ved oppsigelse 
skal alle utestående forpliktelser gjøres opp, og partenes rettigheter i henhold til avtalen skal bestå 
for allerede skapte verk.""",
        "en": """
## Termination

This agreement may be terminated by either party with {notice_period} days written notice. Upon termination, 
all outstanding obligations shall be settled, and the parties' rights under the agreement shall continue 
for works already created."""
    },
    "assignment": {
        "no": """
## Overføring av rettigheter

Ingen av partene kan overdra eller overføre sine rettigheter eller forpliktelser etter denne avtalen til 
en tredjepart uten skriftlig samtykke fra den andre parten. Slikt samtykke skal ikke nektes uten 
rimelig grunn.""",
        "en": """
## Assignment of Rights

Neither party may assign or transfer its rights or obligations under this agreement to a third party 
without the written consent of the other party. Such consent shall not be unreasonably withheld."""
    },
    "governing_law": {
        "norway": {
            "no": "Denne avtalen er underlagt norsk rett. Oslo tingrett er avtalt verneting for tvister som ikke løses i minnelighet.",
            "en": "This agreement is governed by Norwegian law. Oslo District Court is the agreed venue for disputes not resolved amicably."
        },
        "sweden": {
            "no": "Denne avtalen er underlagt svensk rett. Stockholms tingsrätt er avtalt verneting.",
            "en": "This agreement is governed by Swedish law. Stockholm District Court is the agreed venue."
        },
        "denmark": {
            "no": "Denne avtalen er underlagt dansk rett. Københavns Byret er avtalt verneting.",
            "en": "This agreement is governed by Danish law. Copenhagen City Court is the agreed venue."
        },
        "uk": {
            "no": "Denne avtalen er underlagt engelsk rett. Engelske domstoler har eksklusiv jurisdiksjon.",
            "en": "This agreement is governed by English law. English courts have exclusive jurisdiction."
        },
        "us": {
            "no": "Denne avtalen er underlagt lovene i staten New York, USA. Føderale og statlige domstoler i New York har eksklusiv jurisdiksjon.",
            "en": "This agreement is governed by the laws of the State of New York, USA. Federal and state courts in New York have exclusive jurisdiction."
        }
    }
}


def generate_legal_document_content(
    split_sheet: dict,
    contributors: list,
    document_type: str,
    include_clauses: dict,
    governing_law: str,
    custom_clauses: str,
    language: str = "no"
) -> str:
    """Generate legal document content from split sheet data"""
    from datetime import datetime
    
    template = LEGAL_DOCUMENT_TEMPLATES.get(document_type, LEGAL_DOCUMENT_TEMPLATES["custom"])
    title = template.get(f"title_{language}", template["title_no"])
    
    # Start document
    content = f"""# {title}

**Dato:** {datetime.now().strftime('%d.%m.%Y')}
**Referanse:** {split_sheet.get('id', 'N/A')[:8]}

---

## 1. Parter

Denne avtalen («Avtalen») inngås mellom følgende parter:

"""
    
    # Add parties (contributors)
    for i, contributor in enumerate(contributors, 1):
        role_display = contributor.get('role', 'Bidragsyter').replace('_', ' ').title()
        content += f"""**Part {i}:**
- Navn: {contributor.get('name', 'Ikke oppgitt')}
- E-post: {contributor.get('email', 'Ikke oppgitt')}
- Rolle: {role_display}
- Andel: {contributor.get('percentage', 0)}%

"""
    
    # Work description
    content += f"""---

## 2. Verket

Denne avtalen gjelder følgende verk:

- **Tittel:** {split_sheet.get('title', 'Ikke oppgitt')}
- **Beskrivelse:** {split_sheet.get('description', 'Ingen beskrivelse')}
- **Status:** {split_sheet.get('status', 'draft')}

---

## 3. Eierandeler og Fordeling

Partene er enige om følgende fordeling av rettigheter og inntekter:

| Part | Rolle | Andel |
|------|-------|-------|
"""
    
    total = 0
    for contributor in contributors:
        pct = contributor.get('percentage', 0)
        total += pct
        content += f"| {contributor.get('name', 'Ukjent')} | {contributor.get('role', 'Bidragsyter').replace('_', ' ').title()} | {pct}% |\n"
    
    content += f"| **Totalt** | | **{total}%** |\n\n"
    
    # Royalty terms for royalty agreement
    if document_type == "royalty_agreement":
        content += """---

## 4. Royalty-vilkår

Royalties skal beregnes og utbetales i henhold til følgende:

- **Beregningsgrunnlag:** Netto inntekter etter fradrag for dokumenterte kostnader
- **Utbetalingsfrekvens:** Kvartalsvis
- **Rapportering:** Detaljert regnskap skal leveres sammen med hver utbetaling
- **Revisjonsrett:** Hver part har rett til å kreve revisjon av regnskapet med 30 dagers varsel

"""
    
    # Collaboration terms
    if document_type == "collaboration_agreement":
        content += """---

## 4. Samarbeidsvilkår

Partene forplikter seg til:

- Å samarbeide i god tro for å fullføre verket
- Å informere hverandre om forhold som kan påvirke prosjektet
- Å respektere avtalte frister og leveranser
- Å kreditere alle bidragsytere i henhold til denne avtalen

"""
    
    # Add optional clauses
    clause_num = 5 if document_type in ["royalty_agreement", "collaboration_agreement"] else 4
    
    if include_clauses.get('dispute_resolution', False):
        clause_content = CLAUSE_TEMPLATES["dispute_resolution"][language]
        clause_content = clause_content.replace("{arbitration_body}", "voldgiftsdomstol" if language == "no" else "arbitration tribunal")
        content += f"\n---\n\n## {clause_num}. " + clause_content.strip().replace("## ", "") + "\n"
        clause_num += 1
    
    if include_clauses.get('termination', False):
        clause_content = CLAUSE_TEMPLATES["termination"][language]
        clause_content = clause_content.replace("{notice_period}", "30")
        content += f"\n---\n\n## {clause_num}. " + clause_content.strip().replace("## ", "") + "\n"
        clause_num += 1
    
    if include_clauses.get('assignment', False):
        clause_content = CLAUSE_TEMPLATES["assignment"][language]
        content += f"\n---\n\n## {clause_num}. " + clause_content.strip().replace("## ", "") + "\n"
        clause_num += 1
    
    if include_clauses.get('governing_law', False):
        law_templates = CLAUSE_TEMPLATES["governing_law"].get(governing_law, CLAUSE_TEMPLATES["governing_law"]["norway"])
        law_clause = law_templates[language]
        content += f"\n---\n\n## {clause_num}. Gjeldende lov\n\n{law_clause}\n"
        clause_num += 1
    
    # Custom clauses
    if custom_clauses and custom_clauses.strip():
        content += f"\n---\n\n## {clause_num}. Tilleggsvilkår\n\n{custom_clauses.strip()}\n"
        clause_num += 1
    
    # Signatures section
    content += f"""
---

## {clause_num}. Signaturer

Ved å signere denne avtalen bekrefter partene at de har lest, forstått og akseptert alle vilkår.

"""
    
    for contributor in contributors:
        content += f"""
**{contributor.get('name', 'Part')}**

Signatur: ____________________________

Dato: ____________________________

"""
    
    # Footer
    content += """
---

*Dette dokumentet er generert automatisk basert på split sheet-data. 
Det anbefales å få dokumentet gjennomgått av en jurist før signering.*
"""
    
    return content


@app.post("/api/split-sheets/{split_sheet_id}/legal-documents/generate")
async def generate_legal_document(split_sheet_id: str, request: Request):
    """Generate a legal document from a split sheet"""
    import uuid
    import json
    from datetime import datetime
    
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    document_type = body.get('document_type', 'split_sheet_agreement')
    include_clauses = body.get('include_clauses', {})
    governing_law = body.get('governing_law', 'norway')
    custom_clauses = body.get('custom_clauses', '')
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Ensure contracts table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS split_sheet_contracts (
                    id VARCHAR(255) PRIMARY KEY,
                    project_id VARCHAR(255),
                    split_sheet_id VARCHAR(255),
                    title VARCHAR(500) NOT NULL,
                    content TEXT,
                    parties JSONB DEFAULT '[]',
                    obligations JSONB DEFAULT '[]',
                    payment_terms JSONB DEFAULT '[]',
                    legal_references JSONB DEFAULT '[]',
                    applied_suggestions JSONB DEFAULT '[]',
                    status VARCHAR(50) DEFAULT 'draft',
                    signature_status VARCHAR(50) DEFAULT 'unsigned',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            # Get split sheet
            cur.execute("SELECT * FROM split_sheets WHERE id = %s", (split_sheet_id,))
            split_sheet = cur.fetchone()
            
            if not split_sheet:
                return JSONResponse({"success": False, "error": "Split sheet not found"}, status_code=404)
            
            split_sheet = dict(split_sheet)
            
            # Get contributors
            cur.execute("""
                SELECT * FROM split_sheet_contributors 
                WHERE split_sheet_id = %s 
                ORDER BY order_index, created_at
            """, (split_sheet_id,))
            contributors = [dict(row) for row in cur.fetchall()]
            
            # Generate document content
            content = generate_legal_document_content(
                split_sheet=split_sheet,
                contributors=contributors,
                document_type=document_type,
                include_clauses=include_clauses,
                governing_law=governing_law,
                custom_clauses=custom_clauses,
                language="no"
            )
            
            # Create contract record
            contract_id = str(uuid.uuid4())
            document_title = LEGAL_DOCUMENT_TEMPLATES.get(document_type, {}).get('title_no', 'Avtale')
            full_title = f"{document_title} - {split_sheet.get('title', 'Untitled')}"
            
            cur.execute("""
                INSERT INTO split_sheet_contracts 
                (id, split_sheet_id, title, content, parties, obligations, payment_terms, legal_references, applied_suggestions, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                contract_id,
                split_sheet_id,
                full_title,
                content,
                json.dumps([{
                    'id': c.get('id'),
                    'name': c.get('name'),
                    'email': c.get('email'),
                    'role': c.get('role')
                } for c in contributors]),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                'draft'
            ))
            contract_row = cur.fetchone()
            conn.commit()
            
            contract = dict(contract_row) if contract_row else {}
            for k, v in contract.items():
                if hasattr(v, 'isoformat'):
                    contract[k] = v.isoformat()
            
            return JSONResponse({
                "success": True,
                "data": {
                    "contract": contract,
                    "documentContent": content,
                    "documentType": document_type,
                    "splitSheet": {
                        "id": split_sheet.get('id'),
                        "title": split_sheet.get('title')
                    },
                    "contributorCount": len(contributors)
                }
            })
            
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": f"Database error: {str(e)}"}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.get("/api/split-sheets/{split_sheet_id}/legal-documents")
async def get_legal_documents(split_sheet_id: str):
    """Get all legal documents (contracts) for a split sheet"""
    import json
    
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM split_sheet_contracts 
                WHERE split_sheet_id = %s 
                ORDER BY created_at DESC
            """, (split_sheet_id,))
            rows = cur.fetchall()
            
            documents = []
            for row in rows:
                doc = dict(row)
                for k, v in doc.items():
                    if hasattr(v, 'isoformat'):
                        doc[k] = v.isoformat()
                documents.append(doc)
            
            return JSONResponse({"success": True, "data": documents})
            
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": f"Database error: {str(e)}"}, status_code=500)
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

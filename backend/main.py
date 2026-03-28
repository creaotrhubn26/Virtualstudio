"""
Virtual Studio Backend
FastAPI service for generating quality-first 3D avatars and studio assets.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
import os
import re
from mimetypes import guess_type
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime
import base64
import io
import json
from pathlib import Path
from psycopg2.extras import RealDictCursor, Json as PgJson
try:
    from utils.generated_asset_storage import (
        delete_stored_asset,
        get_storage_metadata_path,
        get_stored_asset_head,
        read_storage_metadata,
        store_generated_file,
        write_storage_metadata,
    )
except ImportError:
    from backend.utils.generated_asset_storage import (
        delete_stored_asset,
        get_storage_metadata_path,
        get_stored_asset_head,
        read_storage_metadata,
        store_generated_file,
        write_storage_metadata,
    )


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

# Auth service imports
try:
    from auth_service import (
        init_admin_table,
        generate_password,
        create_admin_user,
        authenticate_user,
        get_all_admins,
        update_admin_user,
        delete_admin_user,
        get_admin_count
    )
    AUTH_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.auth_service import (
            init_admin_table,
            generate_password,
            create_admin_user,
            authenticate_user,
            get_all_admins,
            update_admin_user,
            delete_admin_user,
            get_admin_count
        )
        AUTH_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: Auth service not available: {e}")
        AUTH_SERVICE_AVAILABLE = False

# Tutorials service imports
try:
    from tutorials_service import (
        init_tutorials_table,
        create_tutorial as db_create_tutorial,
        get_all_tutorials as db_get_all_tutorials,
        get_tutorial as db_get_tutorial,
        update_tutorial as db_update_tutorial,
        delete_tutorial as db_delete_tutorial,
        set_active_tutorial as db_set_active_tutorial,
        get_active_tutorial as db_get_active_tutorial
    )
    TUTORIALS_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.tutorials_service import (
            init_tutorials_table,
            create_tutorial as db_create_tutorial,
            get_all_tutorials as db_get_all_tutorials,
            get_tutorial as db_get_tutorial,
            update_tutorial as db_update_tutorial,
            delete_tutorial as db_delete_tutorial,
            set_active_tutorial as db_set_active_tutorial,
            get_active_tutorial as db_get_active_tutorial
        )
        TUTORIALS_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: Tutorials service not available: {e}")
        TUTORIALS_SERVICE_AVAILABLE = False

# Virtual Studio service imports
try:
    from virtual_studio_service import (
        init_virtual_studio_tables,
        save_scene, get_scenes, get_scene, delete_scene,
        save_preset, get_presets, delete_preset,
        save_light_group, get_light_groups, delete_light_group,
        save_user_asset, get_user_assets, delete_user_asset,
        save_scene_version, get_scene_versions, delete_scene_version,
        save_note, get_notes, delete_note,
        save_camera_preset, get_camera_presets, delete_camera_preset,
        save_export_template, get_export_templates, delete_export_template
    )
    VIRTUAL_STUDIO_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.virtual_studio_service import (
            init_virtual_studio_tables,
            save_scene, get_scenes, get_scene, delete_scene,
            save_preset, get_presets, delete_preset,
            save_light_group, get_light_groups, delete_light_group,
            save_user_asset, get_user_assets, delete_user_asset,
            save_scene_version, get_scene_versions, delete_scene_version,
            save_note, get_notes, delete_note,
            save_camera_preset, get_camera_presets, delete_camera_preset,
            save_export_template, get_export_templates, delete_export_template
        )
        VIRTUAL_STUDIO_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: Virtual Studio service not available: {e}")
        VIRTUAL_STUDIO_SERVICE_AVAILABLE = False

# User KV service imports
try:
    from user_kv_service import (
        init_user_kv_tables,
        set_user_kv as db_set_user_kv,
        get_user_kv as db_get_user_kv
    )
    USER_KV_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.user_kv_service import (
            init_user_kv_tables,
            set_user_kv as db_set_user_kv,
            get_user_kv as db_get_user_kv
        )
        USER_KV_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: User KV service not available: {e}")
        USER_KV_SERVICE_AVAILABLE = False

# Branding settings service imports
try:
    from branding_service import (
        init_branding_settings_table,
        get_branding_settings as db_get_branding_settings,
        set_branding_settings as db_set_branding_settings
    )
    BRANDING_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.branding_service import (
            init_branding_settings_table,
            get_branding_settings as db_get_branding_settings,
            set_branding_settings as db_set_branding_settings
        )
        BRANDING_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: Branding service not available: {e}")
        BRANDING_SERVICE_AVAILABLE = False

# App settings service imports
try:
    from settings_service import (
        init_settings_table,
        get_settings as db_get_settings,
        set_settings as db_set_settings,
        delete_settings as db_delete_settings,
        list_settings as db_list_settings
    )
    SETTINGS_SERVICE_AVAILABLE = True
except ImportError as e:
    try:
        from backend.settings_service import (
            init_settings_table,
            get_settings as db_get_settings,
            set_settings as db_set_settings,
            delete_settings as db_delete_settings,
            list_settings as db_list_settings
        )
        SETTINGS_SERVICE_AVAILABLE = True
    except ImportError:
        print(f"Warning: Settings service not available: {e}")
        SETTINGS_SERVICE_AVAILABLE = False

# Marketplace registry imports
try:
    from marketplace_registry_service import (
        get_environment_pack_release_dashboard,
        get_environment_pack_quality_report,
        list_environment_pack_products,
        promote_environment_pack_candidate,
        rollback_environment_pack_release,
        record_environment_pack_install,
        upsert_environment_pack_product,
        validate_environment_pack_release,
    )
    MARKETPLACE_REGISTRY_AVAILABLE = True
except ImportError as e:
    try:
        from backend.marketplace_registry_service import (
            get_environment_pack_release_dashboard,
            get_environment_pack_quality_report,
            list_environment_pack_products,
            promote_environment_pack_candidate,
            rollback_environment_pack_release,
            record_environment_pack_install,
            upsert_environment_pack_product,
            validate_environment_pack_release,
        )
        MARKETPLACE_REGISTRY_AVAILABLE = True
    except ImportError:
        print(f"Warning: Marketplace registry service not available: {e}")
        MARKETPLACE_REGISTRY_AVAILABLE = False

# Word Bank service imports
try:
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
        get_misclassification_patterns
    )
    WORDBANK_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Word Bank service not available: {e}")
    WORDBANK_SERVICE_AVAILABLE = False

# Collaboration service imports
try:
    from collaboration_server import collaboration_router
    COLLABORATION_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Collaboration service not available: {e}")
    COLLABORATION_SERVICE_AVAILABLE = False

app = FastAPI(
    title="Virtual Studio Avatar API",
    description="Generate quality-first 3D avatars from images using premium providers with controlled fallback.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files from root directory
ROOT_DIR = Path(__file__).parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
AVATAR_LIBRARY_DIR = Path(__file__).parent / "test_images"


def maybe_proxy_r2_asset(
    metadata: Optional[Dict[str, Any]],
    fallback_media_type: str,
    *,
    filename: Optional[str] = None,
) -> Optional[Response]:
    if not metadata or metadata.get("storage") != "r2":
        return None

    storage_url = str(metadata.get("public_url") or metadata.get("url") or "")
    if storage_url.startswith(("http://", "https://")):
        return RedirectResponse(url=storage_url, status_code=307)

    r2_key = metadata.get("r2_key")
    if not r2_key:
        return None

    try:
        try:
            from utils.r2_client import get_models_bucket_name, get_r2_object
        except ImportError:
            from backend.utils.r2_client import get_models_bucket_name, get_r2_object

        response = get_r2_object(
            str(r2_key),
            bucket=str(metadata.get("bucket") or os.environ.get("R2_GENERATED_ASSET_BUCKET") or get_models_bucket_name()),
        )
        if not response:
            return None

        media_type = (
            response.get("ContentType")
            or metadata.get("content_type")
            or metadata.get("contentType")
            or fallback_media_type
        )
        headers = {"X-Storage-Backend": "r2"}
        if filename:
            headers["Content-Disposition"] = f'inline; filename="{Path(filename).name}"'
        return Response(content=response["Body"].read(), media_type=media_type, headers=headers)
    except Exception as error:
        print(f"[R2Proxy] Failed to proxy {r2_key}: {error}")
        return None


def build_environment_provider_smoke_reference_image() -> str:
    try:
        from PIL import Image, ImageDraw
    except ImportError as exc:
        raise RuntimeError("Pillow is required for provider smoke images") from exc

    image = Image.new("RGB", (640, 360), "#d8d0c3")
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, 639, 126], fill="#c7d6e8")
    draw.polygon([(0, 152), (148, 118), (156, 359), (0, 359)], fill="#8a6f58")
    draw.polygon([(639, 152), (492, 118), (484, 359), (639, 359)], fill="#7c6652")
    draw.polygon([(148, 118), (492, 118), (570, 359), (72, 359)], fill="#b79672")
    draw.rectangle([208, 180, 434, 296], fill="#6e4f34")
    draw.rectangle([42, 126, 136, 336], fill="#556270")
    draw.rectangle([490, 128, 620, 248], fill="#6f7e90")
    draw.rectangle([250, 138, 392, 218], fill="#8c2f24")
    draw.rectangle([284, 202, 354, 338], fill="#2d2d2d")

    image_bytes = io.BytesIO()
    image.save(image_bytes, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(image_bytes.getvalue()).decode('ascii')}"


def build_environment_provider_smoke_plan(
    *,
    prompt: str,
    preferred_room_type: Optional[str],
    layout_analysis: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    aggregate = (
        layout_analysis.get("layoutHints", {}).get("aggregate", {})
        if isinstance(layout_analysis, dict)
        else {}
    )
    room_type = str(aggregate.get("roomType") or preferred_room_type or "storefront")
    estimated_shell = aggregate.get("estimatedShell") if isinstance(aggregate.get("estimatedShell"), dict) else {}
    suggested_camera = aggregate.get("suggestedCamera") if isinstance(aggregate.get("suggestedCamera"), dict) else {}
    suggested_zones = aggregate.get("suggestedZones") if isinstance(aggregate.get("suggestedZones"), dict) else {}
    object_anchors = aggregate.get("objectAnchors") if isinstance(aggregate.get("objectAnchors"), list) else []
    detected_openings = aggregate.get("detectedOpenings") if isinstance(aggregate.get("detectedOpenings"), list) else []

    return {
        "version": "1.0",
        "planId": f"provider-smoke-{uuid.uuid4()}",
        "prompt": prompt,
        "source": "provider_smoke",
        "summary": "Smoke test plan for environment providers",
        "concept": "Provider smoke validation scene",
        "roomShell": {
            "type": room_type,
            "width": float(estimated_shell.get("width", 14.0)),
            "depth": float(estimated_shell.get("depth", 10.0)),
            "height": float(estimated_shell.get("height", 4.6)),
            "openCeiling": bool(estimated_shell.get("openCeiling", False)),
            "notes": [],
            "openings": detected_openings,
            "zones": [
                {"id": "hero_zone", "label": "Hero", "purpose": "hero", "xBias": 0.0, "zBias": 0.0},
                {"id": "front_counter", "label": "Counter", "purpose": "counter", "xBias": 0.15, "zBias": -0.1},
            ],
            "fixtures": [
                {"id": "front_counter_block", "kind": "counter_block", "zoneId": "front_counter"},
            ],
            "niches": [],
            "wallSegments": [],
        },
        "surfaces": [],
        "atmosphere": {"haze": 0.08},
        "ambientSounds": ["restaurant_roomtone"],
        "props": [
            {
                "name": "Hero Pizza",
                "category": "hero",
                "priority": "high",
                "placementHint": "Centered on the prep counter",
            },
            {
                "name": "Menu Board",
                "category": "signage",
                "priority": "medium",
                "placementHint": "Mounted on the back wall",
            },
        ],
        "characters": [
            {
                "role": "baker",
                "actionHint": "Preparing pizza at the counter",
                "behaviorPlan": {
                    "type": "stationed_work",
                    "homeZoneId": "front_counter",
                    "routeZoneIds": ["front_counter", "hero_zone"],
                    "pace": "flow",
                },
                "layoutAnchorKind": object_anchors[0].get("kind") if object_anchors and isinstance(object_anchors[0], dict) else None,
                "layoutAnchorId": object_anchors[0].get("id") if object_anchors and isinstance(object_anchors[0], dict) else None,
            },
        ],
        "branding": {
            "enabled": True,
            "brandName": "Provider Smoke Pizza",
            "palette": ["#8c2f24", "#f4e7d3", "#2d2d2d"],
            "applyToEnvironment": True,
            "applyToWardrobe": True,
            "applyToSignage": True,
            "applicationTargets": ["signage", "wardrobe", "packaging", "interior_details"],
        },
        "lighting": [
            {
                "role": "key",
                "intent": "food",
                "modifier": "softbox",
                "beamAngle": 38,
                "rationale": "Warm appetizing key for the hero pizza.",
            },
            {
                "role": "rim",
                "intent": "food",
                "modifier": "fresnel",
                "beamAngle": 28,
                "gobo": {"goboId": "window"},
                "haze": {"enabled": True, "density": 0.12},
                "rationale": "Window rim to shape steam and crust edge.",
            },
        ],
        "camera": {
            "shotType": str(suggested_camera.get("shotType") or "hero shot"),
            "target": suggested_camera.get("target") or [0.0, 1.4, 0.0],
            "positionHint": suggested_camera.get("positionHint") or [0.0, 1.8, -6.0],
            "fov": 0.68,
            "mood": "appetizing branded commercial",
        },
        "assemblySteps": [],
        "compatibility": {
            "currentStudioShellSupported": True,
            "confidence": 0.85,
            "gaps": [],
            "nextBuildModules": [],
        },
        "layoutGuidance": {
            "summary": str(aggregate.get("summary") or "Smoke layout guidance"),
            "roomType": room_type,
            "visiblePlanes": aggregate.get("visiblePlanes") or ["floor", "backWall"],
            "depthProfile": aggregate.get("depthProfile") or {"quality": "medium"},
            "suggestedZones": suggested_zones,
            "objectAnchors": object_anchors,
            "detectedOpenings": detected_openings,
            "surfacePolygons": aggregate.get("surfacePolygons") or {},
            "visiblePlaneConfidence": aggregate.get("visiblePlaneConfidence") or {},
        },
    }


SYNCED_REPO_FILE_PREFIXES = (
    "attached_assets/",
    "backend/test_images/",
    "backend/outputs/",
    "backend/backend/outputs/",
    "backend/humaniflow/assets/",
    "backend/humaniflow/model_files/",
    "backend/sam3d_repo/assets/",
    "backend/sam3d_repo/notebook/images/",
    "backend/facexformer_repo/docs/static/images/",
    "public/",
)


def resolve_synced_repo_file(relative_path: str) -> Optional[Path]:
    normalized = str(relative_path or "").strip().replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("../") or "/../" in normalized:
        return None

    if not any(
        normalized == prefix.rstrip("/") or normalized.startswith(prefix)
        for prefix in SYNCED_REPO_FILE_PREFIXES
    ):
        return None

    resolved_path = (ROOT_DIR / normalized).resolve()
    root_resolved = ROOT_DIR.resolve()
    if root_resolved not in resolved_path.parents and resolved_path != root_resolved:
        return None

    return resolved_path


def build_repo_file_response(relative_path: str):
    file_path = resolve_synced_repo_file(relative_path)
    if not file_path:
        raise HTTPException(status_code=404, detail="Stored repo asset not found")

    metadata = read_storage_metadata(get_storage_metadata_path(file_path))
    media_type = (
        (metadata or {}).get("content_type")
        or (metadata or {}).get("contentType")
        or guess_type(str(file_path))[0]
        or "application/octet-stream"
    )
    proxy_response = maybe_proxy_r2_asset(
        metadata,
        media_type,
        filename=file_path.name,
    )
    if proxy_response:
        return proxy_response

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Stored repo asset not found")

    return FileResponse(file_path, media_type=media_type, filename=file_path.name)


def build_public_file_response(asset_path: str):
    normalized_asset_path = str(asset_path or "").strip().lstrip("/")
    if not normalized_asset_path:
        raise HTTPException(status_code=404, detail="Public asset not found")
    return build_repo_file_response(f"public/{normalized_asset_path}")


@app.get("/api/avatars/{avatar_key}")
async def serve_avatar_model(avatar_key: str):
    safe_name = Path(avatar_key).name
    avatar_path = AVATAR_LIBRARY_DIR / safe_name
    metadata = read_storage_metadata(get_storage_metadata_path(avatar_path))
    proxy_response = maybe_proxy_r2_asset(metadata, "model/gltf-binary", filename=safe_name)
    if proxy_response:
        return proxy_response
    if not avatar_path.exists() or not avatar_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar model not found")
    return FileResponse(avatar_path, media_type="model/gltf-binary")


@app.get("/models/avatars/{avatar_key}")
async def serve_avatar_model_static(avatar_key: str):
    safe_name = Path(avatar_key).name
    avatar_path = AVATAR_LIBRARY_DIR / safe_name
    metadata = read_storage_metadata(get_storage_metadata_path(avatar_path))
    proxy_response = maybe_proxy_r2_asset(metadata, "model/gltf-binary", filename=safe_name)
    if proxy_response:
        return proxy_response
    if not avatar_path.exists() or not avatar_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar model not found")
    return FileResponse(avatar_path, media_type="model/gltf-binary")


@app.get("/public/{asset_path:path}")
async def serve_public_asset(asset_path: str):
    return build_public_file_response(asset_path)


@app.get("/attached_assets/{asset_path:path}")
async def serve_attached_asset(asset_path: str):
    return build_repo_file_response(f"attached_assets/{asset_path}")


@app.get("/api/storage/repo-file")
async def api_get_repo_file(path: str = Query(...)):
    return build_repo_file_response(path)


if PUBLIC_DIR.exists():
    @app.get("/creatorhub-virtual-studio-logo.svg")
    async def serve_virtual_studio_logo():
        return build_public_file_response("creatorhub-virtual-studio-logo.svg")


    @app.get("/creatorhub-logo-amber.svg")
    async def serve_logo_amber():
        return build_public_file_response("creatorhub-logo-amber.svg")


    @app.get("/manifest.json")
    async def serve_manifest():
        return build_public_file_response("manifest.json")


    @app.get("/sw.js")
    async def serve_service_worker():
        return build_public_file_response("sw.js")


    @app.get("/creatorhub-vs-icon-32.svg")
    async def serve_vs_icon_32():
        return build_public_file_response("creatorhub-vs-icon-32.svg")


    @app.get("/creatorhub-vs-icon-64.svg")
    async def serve_vs_icon_64():
        return build_public_file_response("creatorhub-vs-icon-64.svg")


    @app.get("/creatorhub-vs-header.svg")
    async def serve_vs_header():
        return build_public_file_response("creatorhub-vs-header.svg")

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
STUDIO_STORAGE_DIR = OUTPUT_DIR / "studio_storage"
AVATAR_CONTENT_TYPE = "model/gltf-binary"
STUDIO_THUMBNAIL_INLINE_MAX_CHARS = int(os.environ.get("STUDIO_THUMBNAIL_INLINE_MAX_CHARS", "120000"))
STUDIO_STORAGE_MAX_UPLOAD_BYTES = int(os.environ.get("STUDIO_STORAGE_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RODIN_MODELS_DIR.mkdir(parents=True, exist_ok=True)
STUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

sam3d_service = None
face_analysis = None
facexformer = None
flux_service = None
storyboard_service = None
environment_planner_service = None
asset_retrieval_service = None
environment_layout_service = None
environment_assembly_service = None
environment_validation_service = None
avatar_provider_service = None


def get_avatar_output_path(request_id: str) -> Path:
    return OUTPUT_DIR / f"{request_id}_avatar.glb"


def get_avatar_storage_metadata_path(request_id: str) -> Path:
    return get_storage_metadata_path(get_avatar_output_path(request_id))


def guess_extension_from_content_type(content_type: str, default_extension: str) -> str:
    content_type_map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "application/json": ".json",
        "application/xml": ".xml",
        "text/xml": ".xml",
        "application/yaml": ".yaml",
        "text/yaml": ".yaml",
        "text/plain": ".txt",
    }
    extension = content_type_map.get((content_type or "").split(";", 1)[0].strip().lower())
    if extension:
        return extension
    return default_extension if default_extension.startswith(".") else f".{default_extension}"


def sanitize_storage_filename(name: str, fallback_stem: str, default_extension: str) -> str:
    original = Path(name or "").name
    raw_stem = Path(original).stem if original else fallback_stem
    safe_stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw_stem).strip("._-") or fallback_stem
    raw_extension = Path(original).suffix or default_extension
    safe_extension = re.sub(r"[^a-zA-Z0-9.]+", "", raw_extension).lower() or default_extension
    if not safe_extension.startswith("."):
        safe_extension = f".{safe_extension}"
    return f"{safe_stem}{safe_extension}"


def get_studio_storage_path(asset_id: str) -> Path:
    return STUDIO_STORAGE_DIR / Path(asset_id).name


def extract_studio_storage_asset_id(storage_url: Optional[str]) -> Optional[str]:
    if not isinstance(storage_url, str):
        return None

    marker = "/api/studio/storage/files/"
    if marker not in storage_url:
        return None

    return storage_url.split(marker, 1)[1].split("?", 1)[0].strip() or None


def delete_studio_storage_asset(asset_id: Optional[str]) -> bool:
    if not asset_id:
        return False

    asset_path = get_studio_storage_path(asset_id)
    metadata_path = get_storage_metadata_path(asset_path)
    metadata = read_storage_metadata(metadata_path)
    deleted = delete_stored_asset(metadata, asset_path)
    if metadata_path.exists():
        metadata_path.unlink()
        deleted = True
    return deleted


def parse_data_url_payload(data_url: str) -> tuple[str, bytes]:
    if not isinstance(data_url, str) or not data_url.startswith("data:") or "," not in data_url:
        raise HTTPException(status_code=400, detail="Invalid data URL payload")

    header, encoded = data_url.split(",", 1)
    if ";base64" not in header:
        raise HTTPException(status_code=400, detail="Only base64 data URLs are supported")

    content_type = header[5:].split(";", 1)[0].strip() or "application/octet-stream"
    try:
        payload = base64.b64decode(encoded, validate=True)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {error}") from error

    if len(payload) > STUDIO_STORAGE_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded asset is too large")

    return content_type, payload


def decode_base64_payload(content_base64: str) -> bytes:
    if not isinstance(content_base64, str) or not content_base64.strip():
        raise HTTPException(status_code=400, detail="Missing base64 payload")

    try:
        payload = base64.b64decode(content_base64, validate=True)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {error}") from error

    if len(payload) > STUDIO_STORAGE_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded asset is too large")

    return payload


def store_studio_binary_asset(
    *,
    category: str,
    storage_id: str,
    filename: str,
    content_type: str,
    payload: bytes,
) -> Dict[str, Any]:
    asset_id = Path(filename).name
    local_path = get_studio_storage_path(asset_id)
    local_path.write_bytes(payload)

    metadata = store_generated_file(
        local_path,
        category=category,
        storage_id=storage_id,
        filename=asset_id,
        content_type=content_type,
        fallback_url=f"/api/studio/storage/files/{asset_id}",
    )
    metadata.update({
        "assetId": asset_id,
        "fileName": asset_id,
        "contentType": content_type,
        "sizeBytes": len(payload),
    })
    write_storage_metadata(get_storage_metadata_path(local_path), metadata)
    return metadata


def store_scene_thumbnail_asset(scene_id: str, thumbnail_data_url: str, filename: Optional[str] = None) -> Dict[str, Any]:
    content_type, payload = parse_data_url_payload(thumbnail_data_url)
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Thumbnail must be an image")

    extension = guess_extension_from_content_type(content_type, ".png")
    safe_filename = sanitize_storage_filename(
        filename or f"scene-thumbnail-{scene_id}{extension}",
        fallback_stem=f"scene-thumbnail-{scene_id}",
        default_extension=extension,
    )
    return store_studio_binary_asset(
        category="scene-thumbnails",
        storage_id=scene_id,
        filename=safe_filename,
        content_type=content_type,
        payload=payload,
    )


def store_snapshot_thumbnail_asset(scene_id: str, snapshot_id: str, thumbnail_data_url: str) -> Dict[str, Any]:
    content_type, payload = parse_data_url_payload(thumbnail_data_url)
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Snapshot thumbnail must be an image")

    extension = guess_extension_from_content_type(content_type, ".png")
    safe_filename = sanitize_storage_filename(
        f"scene-snapshot-{snapshot_id}{extension}",
        fallback_stem=f"scene-snapshot-{snapshot_id}",
        default_extension=extension,
    )
    return store_studio_binary_asset(
        category="scene-snapshots",
        storage_id=f"{scene_id}-{snapshot_id}",
        filename=safe_filename,
        content_type=content_type,
        payload=payload,
    )


def maybe_store_snapshot_thumbnail(record: Dict[str, Any], scene_id: str) -> None:
    thumbnail_url = record.get("thumbnailUrl")
    if not isinstance(thumbnail_url, str):
        return

    if not thumbnail_url.startswith("data:image/") or len(thumbnail_url) < STUDIO_THUMBNAIL_INLINE_MAX_CHARS:
        asset_id = extract_studio_storage_asset_id(thumbnail_url)
        if asset_id and not record.get("thumbnailAssetId"):
            record["thumbnailAssetId"] = asset_id
        return

    snapshot_id = str(record.get("id") or uuid.uuid4().hex[:10])
    metadata = store_snapshot_thumbnail_asset(scene_id, snapshot_id, thumbnail_url)
    stored_url = metadata.get("url") or metadata.get("public_url")
    if stored_url:
        record["thumbnailUrl"] = stored_url
    if metadata.get("assetId"):
        record["thumbnailAssetId"] = metadata["assetId"]
    if metadata.get("storage"):
        record["thumbnailStorage"] = metadata["storage"]


def hydrate_snapshot_thumbnail_reference(record: Dict[str, Any]) -> Dict[str, Any]:
    hydrated = dict(record)
    asset_id = hydrated.get("thumbnailAssetId") or extract_studio_storage_asset_id(hydrated.get("thumbnailUrl"))
    if asset_id and not hydrated.get("thumbnailUrl"):
        hydrated["thumbnailUrl"] = f"/api/studio/storage/files/{asset_id}"
    if asset_id and not hydrated.get("thumbnailAssetId"):
        hydrated["thumbnailAssetId"] = asset_id
    return hydrated


def maybe_store_scene_thumbnail_url(scene_payload: Dict[str, Any]) -> Optional[str]:
    scene_data_payload = scene_payload.get("sceneData")
    if not isinstance(scene_data_payload, dict):
        scene_data_payload = scene_payload.get("scene_data")

    existing_thumbnail = scene_payload.get("thumbnail")
    if not isinstance(existing_thumbnail, str) and isinstance(scene_data_payload, dict):
        nested_thumbnail = scene_data_payload.get("thumbnail")
        if isinstance(nested_thumbnail, str):
            existing_thumbnail = nested_thumbnail

    if not isinstance(existing_thumbnail, str):
        return None

    if not existing_thumbnail.startswith("data:image/") or len(existing_thumbnail) < STUDIO_THUMBNAIL_INLINE_MAX_CHARS:
        return existing_thumbnail

    scene_id = str(scene_payload.get("id") or uuid.uuid4().hex)
    metadata = store_scene_thumbnail_asset(scene_id, existing_thumbnail)
    thumbnail_url = metadata.get("url") or metadata.get("public_url")
    if not thumbnail_url:
        return existing_thumbnail

    scene_payload["thumbnail"] = thumbnail_url
    if isinstance(scene_data_payload, dict):
        scene_data_payload["thumbnail"] = thumbnail_url

    return thumbnail_url


def get_or_create_environment_planner():
    global environment_planner_service
    if environment_planner_service is None:
        try:
            from environment_planner_service import EnvironmentPlannerService
        except ImportError:
            from backend.environment_planner_service import EnvironmentPlannerService
        environment_planner_service = EnvironmentPlannerService()
    return environment_planner_service


def get_or_create_asset_retrieval_service():
    global asset_retrieval_service
    if asset_retrieval_service is None:
        try:
            from asset_retrieval_service import AssetRetrievalService
        except ImportError:
            from backend.asset_retrieval_service import AssetRetrievalService
        asset_retrieval_service = AssetRetrievalService()
    return asset_retrieval_service


def get_or_create_environment_layout_service():
    global environment_layout_service
    if environment_layout_service is None:
        try:
            from environment_layout_service import EnvironmentLayoutService
        except ImportError:
            from backend.environment_layout_service import EnvironmentLayoutService
        environment_layout_service = EnvironmentLayoutService()
    return environment_layout_service


def get_or_create_environment_assembly_service():
    global environment_assembly_service
    if environment_assembly_service is None:
        retrieval = get_or_create_asset_retrieval_service()
        try:
            from environment_assembly_service import EnvironmentAssemblyService
        except ImportError:
            from backend.environment_assembly_service import EnvironmentAssemblyService
        environment_assembly_service = EnvironmentAssemblyService(retrieval_service=retrieval)
    return environment_assembly_service


def get_or_create_environment_validation_service():
    global environment_validation_service
    if environment_validation_service is None:
        assembly_service = get_or_create_environment_assembly_service()
        try:
            from environment_validation_service import EnvironmentValidationService
        except ImportError:
            from backend.environment_validation_service import EnvironmentValidationService
        environment_validation_service = EnvironmentValidationService(assembly_service=assembly_service)
    return environment_validation_service


def get_or_create_avatar_provider_service():
    global avatar_provider_service
    if avatar_provider_service is None:
        try:
            from avatar_provider_service import AvatarGenerationRequest, AvatarProviderService
        except ImportError:
            from backend.avatar_provider_service import AvatarGenerationRequest, AvatarProviderService
        avatar_provider_service = {
            "requestClass": AvatarGenerationRequest,
            "service": AvatarProviderService(sam3d_service=sam3d_service),
        }
    elif avatar_provider_service["service"].providers["local"].sam3d_service is None and sam3d_service is not None:
        avatar_provider_service["service"].providers["local"].sam3d_service = sam3d_service
    return avatar_provider_service


def get_or_create_gemini_environment_provider():
    try:
        from gemini_environment_provider import get_or_create_gemini_environment_provider as getter
    except ImportError:
        from backend.gemini_environment_provider import get_or_create_gemini_environment_provider as getter
    return getter()

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

@app.get("/")
async def root():
    return {"status": "ok", "message": "Virtual Studio Avatar API"}

# HTTP client for external API proxying
import httpx

# ============ SHOT.CAFE PROXY ENDPOINTS ============
@app.get("/api/shotcafe/search")
async def shotcafe_search(q: str = Query(..., description="Search query"), z: str = Query("nav", description="Search type: nav, cinematographers, directors, tags, colors, years")):
    """Proxy for shot.cafe search API to avoid CORS issues."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://shot.cafe/server.php",
                params={"z": z, "q": q},
                headers={
                    "User-Agent": "VirtualStudio/1.0",
                    "Accept": "application/json",
                }
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    return JSONResponse(content=data)
                except:
                    # Return as text if not JSON
                    return JSONResponse(content={"error": "Invalid JSON response", "text": response.text[:500]})
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"shot.cafe returned status {response.status_code}"}
                )
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={"error": "Request to shot.cafe timed out"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/shotcafe/movie/{slug}")
async def shotcafe_movie_info(slug: str):
    """Get movie information and frames from shot.cafe."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get movie page to scrape frame count
            response = await client.get(
                f"https://shot.cafe/movie/{slug}",
                headers={"User-Agent": "VirtualStudio/1.0"}
            )
            
            if response.status_code == 200:
                # Parse frame URLs from HTML page
                import re
                html = response.text
                
                # Extract all image URLs from the page
                # shot.cafe uses /images/t/slug-####.png format
                image_pattern = rf'/images/t/[^"\']*\.(?:png|jpg|jpeg)'
                image_matches = re.findall(image_pattern, html, re.IGNORECASE)
                
                # Generate frame URLs with proxy
                frames = []
                seen_urls = set()
                for img_url in image_matches:
                    if img_url not in seen_urls:
                        seen_urls.add(img_url)
                        full_url = f"https://shot.cafe{img_url}"
                        frames.append({
                            "id": f"{slug}-{len(frames) + 1}",
                            "url": full_url,
                            "thumbnailUrl": full_url,
                            # Include proxy URL for frontend
                            "proxyUrl": f"/api/shotcafe/image-proxy?url={full_url}"
                        })
                        if len(frames) >= 50:  # Limit to 50 frames
                            break
                
                return JSONResponse(content={
                    "slug": slug,
                    "frames": frames,
                    "frameCount": len(frames)
                })
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"Movie not found: {slug}"}
                )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/shotcafe/image-proxy")
async def shotcafe_image_proxy(url: str = Query(..., description="Image URL to proxy")):
    """Proxy shot.cafe images to avoid CORS issues - returns image directly."""
    try:
        # Only allow shot.cafe URLs
        if not url.startswith("https://shot.cafe/"):
            return JSONResponse(status_code=400, content={"error": "Only shot.cafe URLs allowed"})
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                headers={"User-Agent": "VirtualStudio/1.0"}
            )
            
            if response.status_code == 200:
                # Return image directly with correct content type
                content_type = response.headers.get("content-type", "image/jpeg")
                return Response(
                    content=response.content,
                    media_type=content_type,
                    headers={
                        "Cache-Control": "public, max-age=86400",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"Image not found"}
                )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ============ END SHOT.CAFE PROXY ============

@app.get("/api/health")
async def health_check():
    response: dict = {"status": "healthy"}
    
    try:
        if sam3d_service:
            response["sam3d"] = {
                "model_loaded": getattr(sam3d_service, 'model_loaded', False),
                "model_loading": getattr(sam3d_service, 'model_loading', False),
                "use_placeholder": getattr(sam3d_service, 'use_placeholder', True),
                "model_files_available": getattr(sam3d_service, 'model_files_available', False)
            }
    except Exception as e:
        response["sam3d"] = {"error": str(e)}
    
    try:
        if facexformer:
            response["facexformer"] = {
                "enabled": facexformer.is_enabled() if hasattr(facexformer, 'is_enabled') else False,
                "model_loaded": facexformer.is_model_loaded() if hasattr(facexformer, 'is_model_loaded') else False,
                "model_loading": getattr(facexformer, 'model_loading', False)
            }
    except Exception as e:
        response["facexformer"] = {"error": str(e)}
    
    try:
        if flux_service:
            response["flux"] = {
                "enabled": flux_service.is_enabled() if hasattr(flux_service, 'is_enabled') else False,
                "model_loaded": flux_service.is_model_loaded() if hasattr(flux_service, 'is_model_loaded') else False,
                "model_loading": getattr(flux_service, 'model_loading', False)
            }
    except Exception as e:
        response["flux"] = {"error": str(e)}
    
    return response

@app.get("/api/ml/health")
async def ml_health_check():
    """ML service health check - alias for /api/health."""
    response: dict = {"status": "healthy", "ml_ready": True}
    
    try:
        if sam3d_service:
            response["sam3d"] = {
                "model_loaded": getattr(sam3d_service, 'model_loaded', False),
                "model_loading": getattr(sam3d_service, 'model_loading', False),
                "use_placeholder": getattr(sam3d_service, 'use_placeholder', True),
                "model_files_available": getattr(sam3d_service, 'model_files_available', False)
            }
        else:
            response["sam3d"] = {"available": False}
    except Exception as e:
        response["sam3d"] = {"error": str(e)}
    
    try:
        if facexformer:
            response["facexformer"] = {
                "enabled": facexformer.is_enabled() if hasattr(facexformer, 'is_enabled') else False,
                "model_loaded": facexformer.is_model_loaded() if hasattr(facexformer, 'is_model_loaded') else False,
                "model_loading": getattr(facexformer, 'model_loading', False)
            }
        else:
            response["facexformer"] = {"available": False}
    except Exception as e:
        response["facexformer"] = {"error": str(e)}
    
    try:
        if flux_service:
            response["flux"] = {
                "enabled": flux_service.is_enabled() if hasattr(flux_service, 'is_enabled') else False,
                "model_loaded": flux_service.is_model_loaded() if hasattr(flux_service, 'is_model_loaded') else False,
                "model_loading": getattr(flux_service, 'model_loading', False)
            }
        else:
            response["flux"] = {"available": False}
    except Exception as e:
        response["flux"] = {"error": str(e)}
    
    return response

@app.post("/api/user/kv")
async def store_user_kv(data: dict):
    """Store user key-value settings."""
    if not USER_KV_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "User KV service not available"}
        )
    try:
        key = data.get("key")
        value = data.get("value")
        user_id = data.get("user_id", "default")
        
        if not key:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing 'key' in request body"}
            )

        db_set_user_kv(user_id, key, value)
        
        return {"success": True, "key": key, "user_id": user_id}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/user/kv/{key}")
async def get_user_kv(key: str, user_id: str = "default"):
    """Get user key-value setting."""
    if not USER_KV_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "User KV service not available"}
        )
    try:
        value = db_get_user_kv(user_id, key)
        return {"key": key, "value": value, "user_id": user_id}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/branding/settings")
async def get_branding_settings():
    """Get branding settings."""
    if not BRANDING_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Branding service not available"}
        )
    try:
        settings = db_get_branding_settings()
        return {"settings": settings}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.put("/api/branding/settings")
async def update_branding_settings(data: dict):
    """Update branding settings."""
    if not BRANDING_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Branding service not available"}
        )
    settings = data.get("settings")
    if settings is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing 'settings' in request body"}
        )
    try:
        updated = db_set_branding_settings(settings)
        return {"settings": updated}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/settings")
async def get_app_settings(user_id: str, namespace: str, project_id: Optional[str] = None):
    """Get app settings by namespace and optional project scope."""
    if not SETTINGS_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Settings service not available"}
        )
    try:
        data = db_get_settings(user_id, namespace, project_id)
        return {"data": data}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/settings/list")
async def list_app_settings(user_id: str, namespace_prefix: str, project_id: Optional[str] = None):
    """List app settings by namespace prefix and optional project scope."""
    if not SETTINGS_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Settings service not available"}
        )
    try:
        entries = db_list_settings(user_id, namespace_prefix, project_id)
        return {"entries": entries}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.put("/api/settings")
async def update_app_settings(data: dict):
    """Upsert app settings."""
    if not SETTINGS_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Settings service not available"}
        )
    user_id = data.get("userId")
    namespace = data.get("namespace")
    payload = data.get("data")
    project_id = data.get("projectId")
    if not user_id or not namespace:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing 'userId' or 'namespace' in request body"}
        )
    if payload is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing 'data' in request body"}
        )
    try:
        updated = db_set_settings(user_id, namespace, payload, project_id)
        return {"data": updated}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.delete("/api/settings")
async def delete_app_settings(user_id: str, namespace: str, project_id: Optional[str] = None):
    """Delete app settings for a namespace."""
    if not SETTINGS_SERVICE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"error": "Settings service not available"}
        )
    try:
        deleted = db_delete_settings(user_id, namespace, project_id)
        return {"success": deleted}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.post("/api/analytics")
async def track_analytics(data: dict):
    """Analytics tracking endpoint (logging stub for development)."""
    event_type = data.get("event", "unknown")
    return {"success": True, "event": event_type, "tracked": True}

# ============ WORD BANK API ============

@app.get("/api/wordbank/health")
async def wordbank_health():
    """Check if word bank database is available"""
    if not WORDBANK_SERVICE_AVAILABLE:
        return {"available": False, "error": "Word bank service not available"}
    return wordbank_health_check()

@app.get("/api/wordbank/words/{category}")
async def get_wordbank_words(category: str):
    """Get all approved words for a category"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return get_words_by_category(category)

@app.post("/api/wordbank/words")
async def add_wordbank_word(data: dict):
    """Add a word to the word bank"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    
    return db_add_word(
        word=data.get("word", ""),
        category=data.get("category", ""),
        language=data.get("language", "both"),
        weight=data.get("weight", 0.7),
        user_id=data.get("user_id")
    )

@app.post("/api/wordbank/suggestions")
async def submit_wordbank_suggestion(data: dict):
    """Submit a word suggestion for admin review"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    
    return db_suggest_word(
        word=data.get("word", ""),
        category=data.get("category", ""),
        language=data.get("language", "both"),
        suggested_weight=data.get("suggested_weight", 0.7),
        reason=data.get("reason"),
        suggested_by=data.get("suggested_by")
    )

@app.get("/api/wordbank/suggestions/pending")
async def get_wordbank_pending_suggestions():
    """Get pending word suggestions for admin review"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return get_pending_suggestions()

@app.post("/api/wordbank/suggestions/{suggestion_id}/approve")
async def approve_wordbank_suggestion(suggestion_id: int, data: dict):
    """Approve a word suggestion"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return approve_suggestion(suggestion_id, data.get("reviewer_id", ""))

@app.post("/api/wordbank/suggestions/{suggestion_id}/reject")
async def reject_wordbank_suggestion(suggestion_id: int, data: dict):
    """Reject a word suggestion"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return reject_suggestion(suggestion_id, data.get("reviewer_id", ""))

@app.post("/api/wordbank/feedback")
async def record_wordbank_feedback(data: dict):
    """Record feedback when user corrects a scene purpose"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    
    return db_record_feedback(
        scene_text=data.get("scene_text", ""),
        detected_purpose=data.get("detected_purpose", ""),
        correct_purpose=data.get("correct_purpose", ""),
        learned_words=data.get("learned_words", []),
        project_id=data.get("project_id"),
        user_id=data.get("user_id")
    )

@app.post("/api/wordbank/usage")
async def track_wordbank_usage(data: dict):
    """Track word usage"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    
    return db_track_usage(
        word=data.get("word", ""),
        category=data.get("category", ""),
        project_id=data.get("project_id"),
        user_id=data.get("user_id"),
        scene_context=data.get("scene_context")
    )

@app.get("/api/wordbank/stats")
async def get_wordbank_stats():
    """Get word bank statistics"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return db_get_wordbank_stats()

@app.post("/api/wordbank/seed")
async def seed_wordbank_words(data: dict = None):
    """Seed database with built-in words"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    
    words = data.get("words", []) if data else []
    return seed_builtin_words(words)

@app.get("/api/wordbank/patterns/misclassification")
async def get_wordbank_misclassification_patterns():
    """Get misclassification patterns for analysis"""
    if not WORDBANK_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word bank service not available")
    return get_misclassification_patterns()

# ============ END WORD BANK API ============

@app.get("/api/test-r2")
async def test_r2_connection():
    """Test R2 connection and list Sam-3D models."""
    import boto3
    from botocore.config import Config
    
    # Try CLOUDFLARE_R2_* first, fallback to R2_* for backward compatibility
    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    access_key = access_key.strip()
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    secret_key = secret_key.strip()
    
    try:
        client = boto3.client(
            's3',
            endpoint_url="https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        
        response = client.list_objects_v2(Bucket="ml-models", Prefix='Sam-3D/', MaxKeys=10)
        objects = [{"key": obj['Key'], "size": obj['Size']} for obj in response.get('Contents', [])]
        
        return {
            "success": True,
            "credentials_configured": bool(access_key and secret_key),
            "objects": objects
        }
    except Exception as e:
        return {
            "success": False,
            "credentials_configured": bool(access_key and secret_key),
            "error": str(e)
        }


@app.get("/api/storage/large-files/status")
async def get_large_file_storage_status(
    min_bytes: Optional[int] = Query(default=None),
    roots: Optional[str] = Query(default=None),
):
    try:
        try:
            from utils.large_asset_sync import DEFAULT_MIN_BYTES, sync_large_assets_to_r2
        except ImportError:
            from backend.utils.large_asset_sync import DEFAULT_MIN_BYTES, sync_large_assets_to_r2

        root_list = [value.strip() for value in (roots or "").split(",") if value.strip()] or None
        summary = sync_large_assets_to_r2(
            dry_run=True,
            min_bytes=min_bytes or DEFAULT_MIN_BYTES,
            roots=root_list,
            write_report=False,
        )
        return JSONResponse(summary)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/storage/sync-large-files")
async def sync_large_files_to_r2(payload: Optional[Dict[str, Any]] = None):
    try:
        try:
            from utils.large_asset_sync import DEFAULT_MIN_BYTES, sync_large_assets_to_r2
        except ImportError:
            from backend.utils.large_asset_sync import DEFAULT_MIN_BYTES, sync_large_assets_to_r2

        request_payload = payload or {}
        raw_roots = request_payload.get("roots")
        root_list = raw_roots if isinstance(raw_roots, list) else None
        summary = sync_large_assets_to_r2(
            dry_run=bool(request_payload.get("dryRun", False)),
            min_bytes=int(request_payload.get("minBytes") or DEFAULT_MIN_BYTES),
            roots=root_list,
            delete_local_after_upload=bool(request_payload.get("deleteLocalAfterUpload", False)),
            write_report=bool(request_payload.get("writeReport", True)),
        )
        return JSONResponse(summary)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/avatar/providers/health")
async def get_avatar_provider_health(
    probe: bool = Query(False, description="When true, perform lightweight live probes against configured avatar providers"),
):
    provider_bundle = get_or_create_avatar_provider_service()
    service = provider_bundle["service"]
    return JSONResponse({
        "success": True,
        "probe": probe,
        "providers": service.get_provider_health(probe=probe).get("providers", {}),
        "recommendations": {
            "hero_talent": service.recommend_provider("hero_talent"),
            "staff_branded": service.recommend_provider("staff_branded"),
            "scan_subject": service.recommend_provider("scan_subject"),
        },
    })


@app.post("/api/avatar/generate")
async def generate_avatar_quality_first(
    file: UploadFile = File(...),
    depth_file: Optional[UploadFile] = File(default=None),
    side_file_1: Optional[UploadFile] = File(default=None),
    side_file_2: Optional[UploadFile] = File(default=None),
    provider: str = Form("auto"),
    character_tier: str = Form("staff_branded"),
    quality_target: str = Form("production"),
    avatar_name: Optional[str] = Form(default=None),
    branding_mode: str = Form("none"),
    body_type: Optional[str] = Form(default=None),
    telephoto: bool = Form(False),
    allow_fallback: bool = Form(False),
):
    """
    Generate a quality-first 3D avatar from an uploaded image.
    Premium providers are preferred and local fallback is blocked by default.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    if depth_file and depth_file.content_type and not depth_file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Depth file must be an image")
    if side_file_1 and side_file_1.content_type and not side_file_1.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Side file 1 must be an image")
    if side_file_2 and side_file_2.content_type and not side_file_2.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Side file 2 must be an image")

    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    output_path = get_avatar_output_path(request_id)
    metadata_path = get_avatar_storage_metadata_path(request_id)
    depth_path: Optional[Path] = None
    side_path_1: Optional[Path] = None
    side_path_2: Optional[Path] = None

    try:
        contents = await file.read()
        with open(input_path, "wb") as input_handle:
            input_handle.write(contents)

        if depth_file is not None:
            depth_filename = depth_file.filename or "depth.png"
            depth_path = UPLOAD_DIR / f"{request_id}_depth_{depth_filename}"
            depth_contents = await depth_file.read()
            with open(depth_path, "wb") as depth_handle:
                depth_handle.write(depth_contents)

        if side_file_1 is not None:
            side_filename_1 = side_file_1.filename or "side-1.jpg"
            side_path_1 = UPLOAD_DIR / f"{request_id}_side1_{side_filename_1}"
            side_contents_1 = await side_file_1.read()
            with open(side_path_1, "wb") as side_handle_1:
                side_handle_1.write(side_contents_1)

        if side_file_2 is not None:
            side_filename_2 = side_file_2.filename or "side-2.jpg"
            side_path_2 = UPLOAD_DIR / f"{request_id}_side2_{side_filename_2}"
            side_contents_2 = await side_file_2.read()
            with open(side_path_2, "wb") as side_handle_2:
                side_handle_2.write(side_contents_2)

        face_result = None
        if face_analysis is not None:
            face_result = face_analysis.analyze_image(str(input_path))

        facexformer_result = None
        if facexformer is not None and facexformer.is_enabled():
            facexformer_result = await facexformer.analyze_face(str(input_path))

        provider_bundle = get_or_create_avatar_provider_service()
        AvatarGenerationRequest = provider_bundle["requestClass"]
        service = provider_bundle["service"]
        request_payload = AvatarGenerationRequest(
            provider=provider,
            character_tier=character_tier,
            quality_target=quality_target,
            avatar_name=avatar_name,
            branding_mode=branding_mode,
            body_type=body_type,
            telephoto=telephoto,
            allow_fallback=allow_fallback,
        )
        extra_input_paths: Dict[str, Path] = {}
        if side_path_1 is not None:
            extra_input_paths["image-side-1"] = side_path_1
        if side_path_2 is not None:
            extra_input_paths["image-side-2"] = side_path_2
        if character_tier == "staff_branded" or provider == "avaturn":
            extra_input_paths["image-frontal"] = input_path

        result = await service.generate_avatar(
            input_path=input_path,
            output_path=output_path,
            request_id=request_id,
            request=request_payload,
            depth_path=depth_path,
            extra_input_paths=extra_input_paths or None,
        )

        if not result.get("success"):
            raise HTTPException(status_code=500, detail="Avatar generation failed")

        storage_metadata = store_generated_file(
            output_path,
            category="avatars",
            storage_id=request_id,
            filename=f"avatar_{request_id}.glb",
            content_type=AVATAR_CONTENT_TYPE,
            fallback_url=f"/api/avatar/{request_id}.glb",
        )
        write_storage_metadata(metadata_path, storage_metadata)

        response_data: Dict[str, Any] = {
            "success": True,
            "request_id": request_id,
            "glb_url": storage_metadata.get("url") or f"/api/avatar/{request_id}.glb",
            "storage": storage_metadata.get("storage", "local"),
            "provider": result.get("provider"),
            "providerName": result.get("providerName"),
            "usedFallback": bool(result.get("usedFallback")),
            "qualityReport": result.get("qualityReport"),
            "metadata": {
                **(result.get("metadata") or {}),
                "storage": storage_metadata.get("storage", "local"),
                "storageUrl": storage_metadata.get("url"),
            },
        }

        if face_result and face_result.get("detected"):
            response_data["face_analysis"] = {
                "gender": face_result.get("gender"),
                "gender_confidence": face_result.get("gender_confidence"),
                "age_range": face_result.get("age_range"),
                "age_confidence": face_result.get("age_confidence"),
                "category": face_result.get("category"),
            }

        if facexformer_result and facexformer_result.get("face_detected"):
            response_data["facexformer"] = {
                "head_pose": facexformer_result.get("head_pose"),
                "face_box": facexformer_result.get("face_box"),
            }

        return JSONResponse(response_data)
    except HTTPException:
        raise
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    finally:
        if input_path.exists():
            os.remove(input_path)
        if depth_path and depth_path.exists():
            os.remove(depth_path)
        if side_path_1 and side_path_1.exists():
            os.remove(side_path_1)
        if side_path_2 and side_path_2.exists():
            os.remove(side_path_2)

@app.post("/api/generate-avatar")
async def generate_avatar(file: UploadFile = File(...)):
    """
    Generate a 3D avatar from an uploaded image.
    Returns a GLB file that can be loaded into Babylon.js.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    output_path = get_avatar_output_path(request_id)
    metadata_path = get_avatar_storage_metadata_path(request_id)
    
    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)
        
        if sam3d_service is None:
            raise HTTPException(status_code=503, detail="SAM 3D service not initialized")
        
        result = await sam3d_service.generate_avatar(str(input_path), str(output_path))
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))

        storage_metadata = store_generated_file(
            output_path,
            category="avatars",
            storage_id=request_id,
            filename=f"avatar_{request_id}.glb",
            content_type=AVATAR_CONTENT_TYPE,
            fallback_url=f"/api/avatar/{request_id}.glb",
        )
        write_storage_metadata(metadata_path, storage_metadata)
        
        return JSONResponse({
            "success": True,
            "request_id": request_id,
            "glb_url": storage_metadata.get("url") or f"/api/avatar/{request_id}.glb",
            "storage": storage_metadata.get("storage", "local"),
            "metadata": {
                **result.get("metadata", {}),
                "storage": storage_metadata.get("storage", "local"),
                "storageUrl": storage_metadata.get("url"),
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)

@app.get("/api/avatar/{request_id}.glb")
async def get_avatar(request_id: str):
    """Download the generated GLB avatar file."""
    output_path = get_avatar_output_path(request_id)
    metadata = read_storage_metadata(get_avatar_storage_metadata_path(request_id))

    proxy_response = maybe_proxy_r2_asset(
        metadata,
        AVATAR_CONTENT_TYPE,
        filename=f"avatar_{request_id}.glb",
    )
    if proxy_response:
        return proxy_response

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return FileResponse(
        path=str(output_path),
        media_type=AVATAR_CONTENT_TYPE,
        filename=f"avatar_{request_id}.glb"
    )

@app.head("/api/avatar/{request_id}.glb")
async def head_avatar(request_id: str):
    """Check if avatar exists (for Babylon.js loader)."""
    output_path = get_avatar_output_path(request_id)
    metadata = read_storage_metadata(get_avatar_storage_metadata_path(request_id))
    head_data = get_stored_asset_head(metadata, output_path)

    if head_data.get("storage") == "unknown" and not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return Response(
        headers={
            "Content-Type": str(head_data.get("content_type") or AVATAR_CONTENT_TYPE),
            "Content-Length": str(head_data.get("content_length") or 0),
            "X-Storage-Backend": str(head_data.get("storage") or "local"),
        }
    )

@app.delete("/api/avatar/{request_id}")
async def delete_avatar(request_id: str):
    """Delete a generated avatar."""
    output_path = get_avatar_output_path(request_id)
    metadata_path = get_avatar_storage_metadata_path(request_id)
    metadata = read_storage_metadata(metadata_path)

    deleted = delete_stored_asset(metadata, output_path)
    if metadata_path.exists():
        metadata_path.unlink()
        deleted = True

    if deleted:
        return {"success": True, "message": "Avatar deleted"}
    
    raise HTTPException(status_code=404, detail="Avatar not found")


@app.post("/api/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    """
    Analyze face in image to detect gender and age.
    Returns detected gender, age range, and category (barn/ungdom/voksen).
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        
        if face_analysis is None:
            raise HTTPException(status_code=503, detail="Face analysis service not initialized")
        
        result = face_analysis.analyze_image_bytes(contents)
        
        if result is None:
            raise HTTPException(status_code=500, detail="Face analysis failed")
        
        return JSONResponse({
            "success": result.get("detected", False),
            "gender": result.get("gender"),
            "gender_confidence": result.get("gender_confidence"),
            "age_range": result.get("age_range"),
            "age_confidence": result.get("age_confidence"),
            "category": result.get("category"),
            "message": result.get("message") or result.get("error")
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/facexformer/analyze")
async def facexformer_analyze(file: UploadFile = File(...)):
    """
    Analyze face using FaceXFormer model.
    Returns facial landmarks, head pose, and attributes.
    Can be disabled via ENABLE_FACEXFORMER=false environment variable.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    if facexformer is None:
        raise HTTPException(status_code=503, detail="FaceXFormer service not initialized")
    
    if not facexformer.is_enabled():
        return JSONResponse({
            "success": False,
            "enabled": False,
            "message": "FaceXFormer is disabled. Set ENABLE_FACEXFORMER=true to enable."
        })
    
    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    
    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)
        
        result = await facexformer.analyze_face(str(input_path))
        
        return JSONResponse({
            "success": result.get("face_detected", False),
            "enabled": True,
            **result
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)


@app.post("/api/generate-avatar-with-analysis")
async def generate_avatar_with_analysis(file: UploadFile = File(...)):
    """
    Generate 3D avatar AND analyze face in one request.
    Returns GLB file URL plus detected gender/age.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    output_path = get_avatar_output_path(request_id)
    metadata_path = get_avatar_storage_metadata_path(request_id)
    
    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)
        
        face_result = None
        if face_analysis is not None:
            face_result = face_analysis.analyze_image(str(input_path))
        
        facexformer_result = None
        if facexformer is not None and facexformer.is_enabled():
            facexformer_result = await facexformer.analyze_face(str(input_path))
        
        if sam3d_service is None:
            raise HTTPException(status_code=503, detail="SAM 3D service not initialized")
        
        result = await sam3d_service.generate_avatar(str(input_path), str(output_path))
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))

        storage_metadata = store_generated_file(
            output_path,
            category="avatars",
            storage_id=request_id,
            filename=f"avatar_{request_id}.glb",
            content_type=AVATAR_CONTENT_TYPE,
            fallback_url=f"/api/avatar/{request_id}.glb",
        )
        write_storage_metadata(metadata_path, storage_metadata)
        
        response_data = {
            "success": True,
            "request_id": request_id,
            "glb_url": storage_metadata.get("url") or f"/api/avatar/{request_id}.glb",
            "storage": storage_metadata.get("storage", "local"),
            "metadata": {
                **result.get("metadata", {}),
                "storage": storage_metadata.get("storage", "local"),
                "storageUrl": storage_metadata.get("url"),
            }
        }
        
        if face_result and face_result.get("detected"):
            response_data["face_analysis"] = {
                "gender": face_result.get("gender"),
                "gender_confidence": face_result.get("gender_confidence"),
                "age_range": face_result.get("age_range"),
                "age_confidence": face_result.get("age_confidence"),
                "category": face_result.get("category")
            }
        
        if facexformer_result and facexformer_result.get("face_detected"):
            response_data["facexformer"] = {
                "head_pose": facexformer_result.get("head_pose"),
                "face_box": facexformer_result.get("face_box")
            }
        
        return JSONResponse(response_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)


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
    layoutProvider: Optional[str] = None
    layoutOptions: Optional[Dict[str, Any]] = None
    brandReference: Optional[Dict[str, Any]] = None


class EnvironmentLayoutRequest(BaseModel):
    referenceImages: List[str]
    prompt: str = ""
    preferredRoomType: Optional[str] = None
    provider: Optional[str] = None
    layoutOptions: Optional[Dict[str, Any]] = None


class EnvironmentBuildShellRequest(BaseModel):
    shell: Optional[Dict[str, Any]] = None
    prompt: str = ""
    layoutHints: Optional[Dict[str, Any]] = None


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


class EnvironmentAssembleRequest(BaseModel):
    plan: Dict[str, Any]


class EnvironmentValidateRequest(BaseModel):
    plan: Dict[str, Any]
    previewImage: Optional[str] = None
    provider: Optional[str] = None
    validationOptions: Optional[Dict[str, Any]] = None


class EnvironmentProviderSmokeRequest(BaseModel):
    prompt: str = "Pizza restaurant storefront with warm branded staff and visible counter"
    preferredRoomType: Optional[str] = "storefront"
    layoutProvider: Optional[str] = "auto"
    validationProvider: Optional[str] = "auto"
    includeLayout: bool = True
    includeValidation: bool = True
    layoutOptions: Optional[Dict[str, Any]] = None


class MarketplaceEnvironmentPackPublishRequest(BaseModel):
    product: Dict[str, Any]
    mode: Optional[str] = "save_copy"
    actor: Optional[Dict[str, Any]] = None


class MarketplaceEnvironmentPackValidateRequest(BaseModel):
    product: Dict[str, Any]
    mode: Optional[str] = "save_copy"


class MarketplaceEnvironmentPackPromoteRequest(BaseModel):
    actor: Optional[Dict[str, Any]] = None


class MarketplaceEnvironmentPackRollbackRequest(BaseModel):
    actor: Optional[Dict[str, Any]] = None
    targetVersion: Optional[str] = None

@app.post("/api/rodin/generate")
async def rodin_generate(request: RodinGenerateRequest):
    """Generate a single 3D model from text prompt using Rodin API."""
    try:
        gen_result = await rodin_service.generate_from_text(
            prompt=request.prompt,
            quality=request.quality
        )
        
        if not gen_result.get("success"):
            error_msg = gen_result.get("error", "Generation failed")
            error_details = gen_result.get("details", "")
            api_response = gen_result.get("api_response", {})
            print(f"Rodin generation start failed: {error_msg}")
            if error_details:
                print(f"Error details: {error_details}")
            if api_response:
                print(f"API response: {json.dumps(api_response, indent=2)}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        subscription_key = gen_result.get("subscription_key")
        task_uuid = gen_result.get("uuid")
        
        if not subscription_key:
            print(f"ERROR: No subscription_key in gen_result: {gen_result}")
            raise HTTPException(status_code=500, detail="No subscription_key returned from API")
        
        return JSONResponse({
            "success": True,
            "subscription_key": subscription_key,
            "task_uuid": task_uuid,
            "filename": request.filename,
            "category": request.category,
            "message": "Generation started. Use /api/rodin/status/{subscription_key} to check progress."
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in rodin_generate: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/api/rodin/status/{subscription_key}")
async def get_rodin_status(subscription_key: str):
    """Check the status of a Rodin generation job using subscription_key."""
    try:
        result = await rodin_service.check_status(subscription_key)
        return JSONResponse(result)
    except Exception as e:
        print(f"Error checking status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")

@app.post("/api/rodin/download/{task_uuid}")
async def download_rodin_model(task_uuid: str, filename: str = ""):
    """Download a completed Rodin model using task_uuid."""
    try:
        if not filename:
            filename = f"model_{task_uuid[:8]}"
        
        result = await rodin_service.download_result(task_uuid, filename)
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Download failed"))
        return JSONResponse({
            "success": True,
            "path": result.get("path"),
            "filename": result.get("filename"),
            "storage": result.get("storage", "local"),
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading model: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error downloading model: {str(e)}")

@app.post("/api/rodin/batch")
async def rodin_batch_generate(request: RodinBatchRequest):
    """Generate multiple 3D models in batch."""
    results = await rodin_service.batch_generate(
        items=request.items,
        quality=request.quality
    )
    
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    
    return JSONResponse({
        "success": True,
        "total": len(results),
        "successful": len(successful),
        "failed": len(failed),
        "results": results
    })

@app.get("/api/rodin/model/{filename}")
async def get_rodin_model(filename: str):
    """Download a generated Rodin model."""
    model_path = rodin_service.output_dir / filename
    
    if not filename.endswith(".glb"):
        model_path = rodin_service.output_dir / f"{filename}.glb"

    metadata = read_storage_metadata(get_storage_metadata_path(model_path))
    if metadata and metadata.get("storage") == "r2" and metadata.get("url"):
        return RedirectResponse(url=str(metadata["url"]), status_code=307)
    
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(
        path=str(model_path),
        media_type="model/gltf-binary",
        filename=model_path.name
    )

@app.get("/api/rodin/models")
async def list_rodin_models():
    """List all generated Rodin models."""
    models_by_filename: Dict[str, Dict[str, Any]] = {}

    for f in rodin_service.output_dir.glob("*.glb"):
        metadata = read_storage_metadata(get_storage_metadata_path(f)) or {}
        models_by_filename[f.name] = {
            "filename": f.name,
            "url": metadata.get("url") or f"/api/rodin/model/{f.name}",
            "size": metadata.get("size_bytes") or f.stat().st_size,
            "storage": metadata.get("storage", "local"),
        }

    for metadata_file in rodin_service.output_dir.glob("*.glb.storage.json"):
        metadata = read_storage_metadata(metadata_file)
        if not metadata:
            continue

        filename = str(metadata.get("filename") or metadata_file.name.replace(".storage.json", ""))
        if filename in models_by_filename:
            continue

        models_by_filename[filename] = {
            "filename": filename,
            "url": metadata.get("url") or f"/api/rodin/model/{filename}",
            "size": metadata.get("size_bytes") or 0,
            "storage": metadata.get("storage", "unknown"),
        }

    models = sorted(models_by_filename.values(), key=lambda item: item["filename"])
    return JSONResponse({"models": models})

@app.post("/api/rodin/test-status")
async def test_rodin_status(request: dict):
    """Test endpoint to check status using subscription_key."""
    try:
        subscription_key = request.get("subscription_key", "")
        if not subscription_key:
            return JSONResponse({"success": False, "error": "subscription_key required"})
        result = await rodin_service.check_status(subscription_key)
        return JSONResponse(result)
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        })

@app.post("/api/rodin/test-generate")
async def test_rodin_generate(request: dict):
    """Test endpoint to see what the API actually returns."""
    try:
        prompt = request.get("prompt", "test prompt")
        quality = request.get("quality", "low")
        
        result = await rodin_service.generate_from_text(
            prompt=prompt,
            quality=quality
        )
        
        return JSONResponse({
            "success": True,
            "result": result,
            "uuid": result.get("uuid"),
            "full_response": result.get("full_response")
        })
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        })


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

@app.get("/api/tutorials")
async def get_tutorials(category: Optional[str] = None):
    """Get all tutorials, optionally filtered by category"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        tutorials = db_get_all_tutorials(category)
        return JSONResponse({"success": True, "tutorials": tutorials})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tutorials/active/{category}")
async def get_active_tutorial(category: str):
    """Get the active tutorial for a category"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        tutorial = db_get_active_tutorial(category)
        if tutorial:
            return JSONResponse({"success": True, "tutorial": tutorial})
        else:
            return JSONResponse({"success": True, "tutorial": None})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tutorials/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    """Get a single tutorial by ID"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        tutorial = db_get_tutorial(tutorial_id)
        if tutorial:
            return JSONResponse({"success": True, "tutorial": tutorial})
        else:
            raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tutorials")
async def create_tutorial(request: Request):
    """Create a new tutorial (admin only)"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        data = await request.json()
        created_by = data.pop('createdBy', None)
        tutorial = db_create_tutorial(data, created_by)
        return JSONResponse({"success": True, "tutorial": tutorial})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tutorials/{tutorial_id}")
async def update_tutorial(tutorial_id: str, request: Request):
    """Update a tutorial (admin only)"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        data = await request.json()
        tutorial = db_update_tutorial(tutorial_id, data)
        if tutorial:
            return JSONResponse({"success": True, "tutorial": tutorial})
        else:
            raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tutorials/{tutorial_id}")
async def delete_tutorial(tutorial_id: str):
    """Delete a tutorial (admin only)"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        success = db_delete_tutorial(tutorial_id)
        if success:
            return JSONResponse({"success": True, "message": "Tutorial deleted"})
        else:
            raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tutorials/{tutorial_id}/activate")
async def activate_tutorial(tutorial_id: str, request: Request):
    """Set a tutorial as active for its category (admin only)"""
    if not TUTORIALS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tutorials service not available")
    
    try:
        data = await request.json()
        category = data.get('category', 'virtual-studio')
        success = db_set_active_tutorial(tutorial_id, category)
        if success:
            return JSONResponse({"success": True, "message": "Tutorial activated"})
        else:
            raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Virtual Studio API Endpoints
# ============================================================================

@app.post("/api/studio/storage/thumbnail")
async def api_store_scene_thumbnail(request: Request):
    try:
        data = await request.json()
        scene_id = str(data.get("sceneId") or data.get("scene_id") or uuid.uuid4().hex)
        thumbnail_data_url = data.get("thumbnailDataUrl") or data.get("thumbnail")
        filename = data.get("filename")
        metadata = store_scene_thumbnail_asset(scene_id, thumbnail_data_url, filename=filename)
        return JSONResponse({
            "success": True,
            "assetId": metadata.get("assetId"),
            "url": metadata.get("url") or metadata.get("public_url"),
            "storage": metadata.get("storage"),
            "contentType": metadata.get("contentType"),
            "sizeBytes": metadata.get("sizeBytes"),
        })
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/studio/scene-exports")
async def api_store_scene_export(request: Request):
    try:
        data = await request.json()
        scene_id = str(data.get("sceneId") or data.get("scene_id") or uuid.uuid4().hex)
        content_base64 = data.get("contentBase64")
        content_type = str(data.get("contentType") or "application/octet-stream")
        format_name = str(data.get("format") or "json").lower()
        extension = guess_extension_from_content_type(content_type, f".{format_name}")
        payload = decode_base64_payload(content_base64)
        filename = sanitize_storage_filename(
            str(data.get("fileName") or f"scene-export-{scene_id}-{uuid.uuid4().hex[:8]}{extension}"),
            fallback_stem=f"scene-export-{scene_id}",
            default_extension=extension,
        )
        metadata = store_studio_binary_asset(
            category="scene-exports",
            storage_id=scene_id,
            filename=filename,
            content_type=content_type,
            payload=payload,
        )
        return JSONResponse({
            "success": True,
            "assetId": metadata.get("assetId"),
            "url": metadata.get("url") or metadata.get("public_url"),
            "storage": metadata.get("storage"),
            "contentType": metadata.get("contentType"),
            "sizeBytes": metadata.get("sizeBytes"),
            "fileName": metadata.get("fileName"),
        })
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/studio/storage/files/{asset_id}")
async def api_get_studio_storage_file(asset_id: str):
    file_path = get_studio_storage_path(asset_id)
    metadata = read_storage_metadata(get_storage_metadata_path(file_path))
    proxy_response = maybe_proxy_r2_asset(
        metadata,
        "application/octet-stream",
        filename=file_path.name,
    )
    if proxy_response:
        return proxy_response

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored asset not found")

    return FileResponse(
        file_path,
        media_type=(metadata or {}).get("content_type") or (metadata or {}).get("contentType") or "application/octet-stream",
        filename=file_path.name,
    )


@app.head("/api/studio/storage/files/{asset_id}")
async def api_head_studio_storage_file(asset_id: str):
    file_path = get_studio_storage_path(asset_id)
    metadata = read_storage_metadata(get_storage_metadata_path(file_path))
    head = get_stored_asset_head(metadata, file_path)
    if head.get("storage") == "unknown":
        raise HTTPException(status_code=404, detail="Stored asset not found")

    headers = {
        "Content-Type": str(head.get("content_type") or "application/octet-stream"),
        "Content-Length": str(head.get("content_length") or 0),
        "X-Storage-Backend": str(head.get("storage") or "unknown"),
    }
    if head.get("url"):
        headers["X-Storage-Url"] = str(head["url"])
    return Response(status_code=200, headers=headers)

@app.get("/api/studio/scenes")
async def api_get_scenes(user_id: Optional[str] = None, is_template: Optional[bool] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        scenes = get_scenes(user_id, is_template)
        return JSONResponse({"success": True, "scenes": scenes})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/scenes/{scene_id}")
async def api_get_scene(scene_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        scene = get_scene(scene_id)
        if scene:
            return JSONResponse({"success": True, "scene": scene})
        raise HTTPException(status_code=404, detail="Scene not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/scenes")
async def api_save_scene(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        maybe_store_scene_thumbnail_url(data)
        user_id = data.pop('userId', None)
        scene = save_scene(data, user_id)
        return JSONResponse({"success": True, "scene": scene})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/scenes/{scene_id}")
async def api_delete_scene(scene_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_scene(scene_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Scene not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/presets")
async def api_get_presets(user_id: Optional[str] = None, type: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        presets = get_presets(user_id, type)
        return JSONResponse({"success": True, "presets": presets})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/presets")
async def api_save_preset(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        preset = save_preset(data, user_id)
        return JSONResponse({"success": True, "preset": preset})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/presets/{preset_id}")
async def api_delete_preset(preset_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_preset(preset_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/light-groups")
async def api_get_light_groups(user_id: Optional[str] = None, scene_id: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        groups = get_light_groups(user_id, scene_id)
        return JSONResponse({"success": True, "lightGroups": groups})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/light-groups")
async def api_save_light_group(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        group = save_light_group(data, user_id)
        return JSONResponse({"success": True, "lightGroup": group})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/light-groups/{group_id}")
async def api_delete_light_group(group_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_light_group(group_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Light group not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/assets")
async def api_get_user_assets(user_id: Optional[str] = None, type: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        assets = get_user_assets(user_id, type)
        return JSONResponse({"success": True, "assets": assets})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/assets")
async def api_save_user_asset(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        asset = save_user_asset(data, user_id)
        return JSONResponse({"success": True, "asset": asset})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/assets/{asset_id}")
async def api_delete_user_asset(asset_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_user_asset(asset_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Asset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/scenes/{scene_id}/versions")
async def api_get_scene_versions(scene_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        versions = get_scene_versions(scene_id)
        return JSONResponse({"success": True, "versions": versions})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/scenes/{scene_id}/versions")
async def api_save_scene_version(scene_id: str, request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        data['sceneId'] = scene_id
        version = save_scene_version(data)
        return JSONResponse({"success": True, "version": version})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/versions/{version_id}")
async def api_delete_scene_version(version_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_scene_version(version_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Version not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/notes")
async def api_get_notes(user_id: Optional[str] = None, project_id: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        notes = get_notes(user_id, project_id)
        return JSONResponse({"success": True, "notes": notes})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/notes")
async def api_save_note(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        note = save_note(data, user_id)
        return JSONResponse({"success": True, "note": note})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/notes/{note_id}")
async def api_delete_note(note_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_note(note_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Note not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notes")
async def api_get_notes_alias(user_id: Optional[str] = None, projectId: Optional[str] = None, sceneId: Optional[str] = None):
    """Alias for studio notes (supports legacy notes service)."""
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        notes = get_notes(user_id, projectId)
        if sceneId:
            notes = [note for note in notes if note.get("scene_id") == sceneId or note.get("sceneId") == sceneId]
        return JSONResponse({"success": True, "notes": notes})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notes")
async def api_save_note_alias(request: Request):
    """Alias for studio notes (supports legacy notes service)."""
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop("userId", None)
        note = save_note(data, user_id)
        return JSONResponse(note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/notes")
async def api_update_note_alias(request: Request):
    """Alias for studio notes updates."""
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop("userId", None)
        note = save_note(data, user_id)
        return JSONResponse(note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/notes/{note_id}")
async def api_delete_note_alias(note_id: str):
    """Alias for studio notes deletion."""
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_note(note_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Note not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/notes/batch")
async def api_save_notes_batch_alias(request: Request):
    """Alias for batch notes save."""
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        notes = data.get("notes", [])
        for note in notes:
            user_id = note.pop("userId", None)
            save_note(note, user_id)
        return JSONResponse({"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/preferences")
async def api_get_studio_preferences(user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    try:
        data = db_get_settings(user_id or "default-user", "studio_preferences") or {"favorites": {}, "recent": {}}
        return JSONResponse(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/studio/preferences/favorites")
async def api_update_studio_favorites(request: Request, user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    try:
        body = await request.json()
        section = body.get("section")
        favorites = body.get("favorites")
        current = db_get_settings(user_id or "default-user", "studio_preferences") or {"favorites": {}, "recent": {}}
        if section is None or favorites is None:
            raise HTTPException(status_code=400, detail="section and favorites required")
        current.setdefault("favorites", {})[section] = favorites
        db_set_settings(user_id or "default-user", "studio_preferences", current)
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/preferences/recent")
async def api_add_studio_recent(request: Request, user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    try:
        body = await request.json()
        section = body.get("section")
        item = body.get("item")
        if section is None or item is None:
            raise HTTPException(status_code=400, detail="section and item required")
        current = db_get_settings(user_id or "default-user", "studio_preferences") or {"favorites": {}, "recent": {}}
        recent = current.setdefault("recent", {}).get(section, [])
        recent = [entry for entry in recent if entry.get("id") != item.get("id")]
        recent = [item] + recent
        current["recent"][section] = recent[:10]
        db_set_settings(user_id or "default-user", "studio_preferences", current)
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/scenes/{scene_id}/snapshots")
async def api_list_snapshots(scene_id: str, user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    try:
        data = db_get_settings(user_id or "default-user", "studio_snapshots", scene_id) or {"snapshots": []}
        snapshots = [hydrate_snapshot_thumbnail_reference(record) for record in data.get("snapshots", [])]
        return JSONResponse({"snapshots": snapshots})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/snapshots")
async def api_create_snapshot(request: Request, user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    try:
        payload = await request.json()
        scene_id = payload.get("sceneId")
        if not scene_id:
            raise HTTPException(status_code=400, detail="sceneId required")
        record = dict(payload)
        if not record.get("id"):
            record["id"] = f"snapshot_{uuid.uuid4().hex[:10]}"
        if not record.get("createdAt"):
            record["createdAt"] = datetime.utcnow().isoformat()
        maybe_store_snapshot_thumbnail(record, scene_id)
        data = db_get_settings(user_id or "default-user", "studio_snapshots", scene_id) or {"snapshots": []}
        existing_records = data.get("snapshots", [])
        replaced_snapshot = next((s for s in existing_records if s.get("id") == record["id"]), None)
        if replaced_snapshot:
            replaced_asset_id = (
                replaced_snapshot.get("thumbnailAssetId")
                or extract_studio_storage_asset_id(replaced_snapshot.get("thumbnailUrl"))
            )
            if replaced_asset_id and replaced_asset_id != record.get("thumbnailAssetId"):
                delete_studio_storage_asset(str(replaced_asset_id))

        snapshots = [hydrate_snapshot_thumbnail_reference(record)] + [
            hydrate_snapshot_thumbnail_reference(s)
            for s in existing_records
            if s.get("id") != record["id"]
        ]
        trimmed_snapshots = snapshots[:10]
        overflow_snapshots = snapshots[10:]
        for overflow_snapshot in overflow_snapshots:
            overflow_asset_id = (
                overflow_snapshot.get("thumbnailAssetId")
                or extract_studio_storage_asset_id(overflow_snapshot.get("thumbnailUrl"))
            )
            delete_studio_storage_asset(str(overflow_asset_id) if overflow_asset_id else None)
        db_set_settings(user_id or "default-user", "studio_snapshots", {"snapshots": trimmed_snapshots}, scene_id)
        return JSONResponse({"snapshot": hydrate_snapshot_thumbnail_reference(record)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/snapshots/{snapshot_id}")
async def api_delete_snapshot(snapshot_id: str, sceneId: Optional[str] = None, user_id: Optional[str] = None):
    if not SETTINGS_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Settings service not available")
    if not sceneId:
        raise HTTPException(status_code=400, detail="sceneId required")
    try:
        data = db_get_settings(user_id or "default-user", "studio_snapshots", sceneId) or {"snapshots": []}
        removed_snapshot = next((s for s in data.get("snapshots", []) if s.get("id") == snapshot_id), None)
        if removed_snapshot:
            removed_asset_id = (
                removed_snapshot.get("thumbnailAssetId")
                or extract_studio_storage_asset_id(removed_snapshot.get("thumbnailUrl"))
            )
            delete_studio_storage_asset(str(removed_asset_id) if removed_asset_id else None)
        snapshots = [s for s in data.get("snapshots", []) if s.get("id") != snapshot_id]
        db_set_settings(user_id or "default-user", "studio_snapshots", {"snapshots": snapshots}, sceneId)
        return JSONResponse({"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/camera-presets")
async def api_get_camera_presets(user_id: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        presets = get_camera_presets(user_id)
        return JSONResponse({"success": True, "cameraPresets": presets})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/camera-presets")
async def api_save_camera_preset(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        preset = save_camera_preset(data, user_id)
        return JSONResponse({"success": True, "cameraPreset": preset})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/camera-presets/{preset_id}")
async def api_delete_camera_preset(preset_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_camera_preset(preset_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Camera preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/studio/export-templates")
async def api_get_export_templates(user_id: Optional[str] = None, type: Optional[str] = None):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        templates = get_export_templates(user_id, type)
        return JSONResponse({"success": True, "exportTemplates": templates})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/studio/export-templates")
async def api_save_export_template(request: Request):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        template = save_export_template(data, user_id)
        return JSONResponse({"success": True, "exportTemplate": template})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/studio/export-templates/{template_id}")
async def api_delete_export_template(template_id: str):
    if not VIRTUAL_STUDIO_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual Studio service not available")
    try:
        success = delete_export_template(template_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Export template not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Shot List API Endpoints
# ============================================================================






# =============================================================================
# Shot Planner 2D Scenes API
# =============================================================================

@app.get("/api/shot-planner/scenes")
async def get_shot_planner_scenes():
    """Get all shot planner 2D scenes from database."""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM shot_planner_scenes 
                ORDER BY updated_at DESC
            """)
            scenes = cur.fetchall()
            
            # Convert to JSON-serializable format
            result = []
            for scene in scenes:
                scene_dict = dict(scene)
                for k, v in scene_dict.items():
                    if hasattr(v, 'isoformat'):
                        scene_dict[k] = v.isoformat()
                result.append(scene_dict)
            
            return JSONResponse({"success": True, "scenes": result})
    except psycopg2.Error as e:
        print(f"Error getting shot planner scenes: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.get("/api/shot-planner/scenes/{scene_id}")
async def get_shot_planner_scene(scene_id: str):
    """Get a specific shot planner 2D scene."""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM shot_planner_scenes WHERE id = %s", (scene_id,))
            scene = cur.fetchone()
            
            if not scene:
                return JSONResponse({"success": False, "error": "Scene not found"}, status_code=404)
            
            # Convert to JSON-serializable format
            scene_dict = dict(scene)
            for k, v in scene_dict.items():
                if hasattr(v, 'isoformat'):
                    scene_dict[k] = v.isoformat()
            
            return JSONResponse({"success": True, "scene": scene_dict})
    except psycopg2.Error as e:
        print(f"Error getting shot planner scene: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/shot-planner/scenes")
async def save_shot_planner_scene(request: Request):
    """Save or update a shot planner 2D scene."""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import Json as PgJson
        from datetime import datetime
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        scene_data = await request.json()
        scene_id = scene_data.get('id')
        
        if not scene_id:
            return JSONResponse({"success": False, "error": "Scene ID required"}, status_code=400)
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Check if scene exists
            cur.execute("SELECT id FROM shot_planner_scenes WHERE id = %s", (scene_id,))
            exists = cur.fetchone() is not None
            
            if exists:
                cur.execute("""
                    UPDATE shot_planner_scenes
                    SET name = %s, location = %s, width = %s, height = %s,
                        pixels_per_meter = %s, show_grid = %s, grid_size = %s,
                        cameras = %s, actors = %s, props = %s, shots = %s,
                        active_shot_id = %s, scene_data = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (
                    scene_data.get('name'),
                    scene_data.get('location'),
                    scene_data.get('width'),
                    scene_data.get('height'),
                    scene_data.get('pixelsPerMeter'),
                    scene_data.get('showGrid', True),
                    scene_data.get('gridSize', 50),
                    PgJson(scene_data.get('cameras', [])),
                    PgJson(scene_data.get('actors', [])),
                    PgJson(scene_data.get('props', [])),
                    PgJson(scene_data.get('shots', [])),
                    scene_data.get('activeShotId'),
                    PgJson(scene_data),
                    scene_id
                ))
            else:
                cur.execute("""
                    INSERT INTO shot_planner_scenes 
                    (id, name, location, width, height, pixels_per_meter, show_grid, grid_size,
                     cameras, actors, props, shots, active_shot_id, scene_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    scene_id,
                    scene_data.get('name'),
                    scene_data.get('location'),
                    scene_data.get('width'),
                    scene_data.get('height'),
                    scene_data.get('pixelsPerMeter'),
                    scene_data.get('showGrid', True),
                    scene_data.get('gridSize', 50),
                    PgJson(scene_data.get('cameras', [])),
                    PgJson(scene_data.get('actors', [])),
                    PgJson(scene_data.get('props', [])),
                    PgJson(scene_data.get('shots', [])),
                    scene_data.get('activeShotId'),
                    PgJson(scene_data)
                ))
            
            conn.commit()
            return JSONResponse({"success": True, "scene": scene_data})
    except psycopg2.Error as e:
        print(f"Error saving shot planner scene: {e}")
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.delete("/api/shot-planner/scenes/{scene_id}")
async def delete_shot_planner_scene(scene_id: str):
    """Delete a shot planner 2D scene."""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM shot_planner_scenes WHERE id = %s", (scene_id,))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        print(f"Error deleting shot planner scene: {e}")
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()




# ============================================================================
# Virtual Studio API Endpoints
# ============================================================================













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












# ============================================================================
# Brush Presets API (For Storyboard Drawing Tools)
# ============================================================================

@app.get("/api/user/brush-presets")
async def api_get_brush_presets():
    """Get all user brush presets"""
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Create table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_brush_presets (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    config JSONB NOT NULL DEFAULT '{}',
                    category VARCHAR(100),
                    is_favorite BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("SELECT * FROM user_brush_presets ORDER BY is_favorite DESC, name")
            presets = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "presets": [serialize_row(p) for p in presets]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/brush-presets/recent")
async def api_get_recent_brushes():
    """Get recently used brush IDs"""
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_brush_recent (
                    id SERIAL PRIMARY KEY,
                    preset_id VARCHAR(255) NOT NULL,
                    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT DISTINCT ON (preset_id) preset_id 
                FROM user_brush_recent 
                ORDER BY preset_id, used_at DESC 
                LIMIT 10
            """)
            recent = [r['preset_id'] for r in cur.fetchall()]
        conn.close()
        return JSONResponse({"success": True, "recentlyUsed": recent})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/brush-presets")
async def api_create_brush_preset(request: Request):
    """Create a new brush preset"""
    try:
        data = await request.json()
        preset_id = data.get('id') or f"brush_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO user_brush_presets (id, name, description, config, category, is_favorite)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                preset_id,
                data.get('name'),
                data.get('description'),
                json.dumps(data.get('config', {})),
                data.get('category'),
                data.get('isFavorite', False)
            ))
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "preset": serialize_row(preset)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/user/brush-presets")
async def api_update_brush_preset(request: Request):
    """Update an existing brush preset"""
    try:
        data = await request.json()
        preset_id = data.get('id')
        if not preset_id:
            raise HTTPException(status_code=400, detail="Preset ID required")
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE user_brush_presets 
                SET name = COALESCE(%s, name),
                    description = COALESCE(%s, description),
                    config = COALESCE(%s, config),
                    category = COALESCE(%s, category),
                    is_favorite = COALESCE(%s, is_favorite),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (
                data.get('name'),
                data.get('description'),
                json.dumps(data.get('config')) if data.get('config') else None,
                data.get('category'),
                data.get('isFavorite'),
                preset_id
            ))
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        if preset:
            return JSONResponse({"success": True, "preset": serialize_row(preset)})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/user/brush-presets/{preset_id}")
async def api_delete_brush_preset(preset_id: str):
    """Delete a brush preset"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_brush_presets WHERE id = %s RETURNING id", (preset_id,))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/user/brush-presets/recent")
async def api_mark_brush_recent(request: Request):
    """Mark a brush as recently used"""
    try:
        data = await request.json()
        preset_id = data.get('presetId')
        if not preset_id:
            raise HTTPException(status_code=400, detail="Preset ID required")
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_brush_recent (preset_id) VALUES (%s)
            """, (preset_id,))
            # Clean up old entries (keep only last 50)
            cur.execute("""
                DELETE FROM user_brush_recent 
                WHERE id NOT IN (
                    SELECT id FROM user_brush_recent ORDER BY used_at DESC LIMIT 50
                )
            """)
            conn.commit()
        conn.close()
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/user/brush-presets/{preset_id}/favorite")
async def api_toggle_brush_favorite(preset_id: str, request: Request):
    """Toggle favorite status of a brush preset"""
    try:
        data = await request.json()
        is_favorite = data.get('isFavorite', False)
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE user_brush_presets 
                SET is_favorite = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (is_favorite, preset_id))
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        if preset:
            return JSONResponse({"success": True, "preset": serialize_row(preset)})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/brush-presets/batch")
async def api_batch_import_brush_presets(request: Request):
    """Batch import brush presets"""
    try:
        data = await request.json()
        presets = data.get('presets', [])
        
        conn = get_db_connection()
        imported = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for preset in presets:
                preset_id = preset.get('id') or f"brush_{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO user_brush_presets (id, name, description, config, category, is_favorite)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        config = EXCLUDED.config,
                        category = EXCLUDED.category,
                        is_favorite = EXCLUDED.is_favorite,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, (
                    preset_id,
                    preset.get('name'),
                    preset.get('description'),
                    json.dumps(preset.get('config', {})),
                    preset.get('category'),
                    preset.get('isFavorite', False)
                ))
                imported.append(serialize_row(cur.fetchone()))
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "imported": len(imported), "presets": imported})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Story Logic API (Pre-writing validation: Concept, Logline, Theme)
# ============================================================================

@app.get("/api/projects/{project_id}/story-logic")
async def api_get_story_logic(project_id: str):
    """Get story logic data for a project (concept, logline, theme)"""
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Create table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS project_story_logic (
                    id VARCHAR(255) PRIMARY KEY,
                    project_id VARCHAR(255) NOT NULL UNIQUE,
                    concept_data JSONB DEFAULT '{}',
                    logline_data JSONB DEFAULT '{}',
                    theme_data JSONB DEFAULT '{}',
                    current_phase INTEGER DEFAULT 1,
                    phase_status JSONB DEFAULT '{"concept":"incomplete","logline":"incomplete","theme":"incomplete"}',
                    is_locked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("SELECT * FROM project_story_logic WHERE project_id = %s", (project_id,))
            record = cur.fetchone()
        conn.close()
        
        if record:
            story_logic = {
                'concept': record.get('concept_data', {}),
                'logline': record.get('logline_data', {}),
                'theme': record.get('theme_data', {}),
                'currentPhase': record.get('current_phase', 1),
                'phaseStatus': record.get('phase_status', {}),
                'isLocked': record.get('is_locked', False),
                'lastSaved': record.get('updated_at').isoformat() if record.get('updated_at') else None,
            }
            return JSONResponse({
                "success": True,
                "storyLogic": story_logic,
                "createdAt": record.get('created_at').isoformat() if record.get('created_at') else None,
                "updatedAt": record.get('updated_at').isoformat() if record.get('updated_at') else None
            })
        return JSONResponse({"success": True, "storyLogic": None})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/story-logic")
async def api_save_story_logic(project_id: str, request: Request):
    """Save story logic data for a project"""
    try:
        import uuid
        data = await request.json()
        story_logic = data.get('storyLogic', {})
        logic_id = f"story_logic_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO project_story_logic 
                (id, project_id, concept_data, logline_data, theme_data, current_phase, phase_status, is_locked)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (project_id) DO UPDATE SET
                    concept_data = EXCLUDED.concept_data,
                    logline_data = EXCLUDED.logline_data,
                    theme_data = EXCLUDED.theme_data,
                    current_phase = EXCLUDED.current_phase,
                    phase_status = EXCLUDED.phase_status,
                    is_locked = EXCLUDED.is_locked,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                logic_id,
                project_id,
                json.dumps(story_logic.get('concept', {})),
                json.dumps(story_logic.get('logline', {})),
                json.dumps(story_logic.get('theme', {})),
                story_logic.get('currentPhase', 1),
                json.dumps(story_logic.get('phaseStatus', {})),
                story_logic.get('isLocked', False)
            ))
            record = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "record": serialize_row(record)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}/story-logic")
async def api_delete_story_logic(project_id: str):
    """Delete story logic data for a project"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM project_story_logic WHERE project_id = %s RETURNING id", (project_id,))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Story logic not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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






# ============================================================================
# Admin Authentication API Endpoints
# ============================================================================

@app.post("/api/auth/login")
async def login(request: Request):
    """Login with email and password"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        data = await request.json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        user = authenticate_user(email, password)
        if user:
            return JSONResponse({
                "success": True,
                "user": user
            })
        else:
            raise HTTPException(status_code=401, detail="Invalid email or password")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/admins")
async def list_admins():
    """List all admin users"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        admins = get_all_admins()
        return JSONResponse({"success": True, "admins": admins})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/admins")
async def create_admin(request: Request):
    """Create a new admin user"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        data = await request.json()
        email = data.get('email', '').strip()
        role = data.get('role', 'admin')
        display_name = data.get('display_name')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Generate password if not provided
        password = data.get('password') or generate_password()
        
        user = create_admin_user(email, password, role, display_name)
        
        # Return the generated password so it can be shared
        return JSONResponse({
            "success": True,
            "user": user,
            "generated_password": password
        })
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/auth/admins/{user_id}")
async def update_admin(user_id: int, request: Request):
    """Update an admin user"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        data = await request.json()
        updated = update_admin_user(user_id, data)
        if updated:
            return JSONResponse({"success": True, "user": updated})
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/auth/admins/{user_id}")
async def remove_admin(user_id: int):
    """Delete an admin user"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        success = delete_admin_user(user_id)
        if success:
            return JSONResponse({"success": True, "message": "User deleted"})
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/admins/{user_id}/reset-password")
async def reset_admin_password(user_id: int):
    """Generate a new password for an admin user"""
    if not AUTH_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service not available")
    
    try:
        new_password = generate_password()
        updated = update_admin_user(user_id, {"password": new_password})
        if updated:
            return JSONResponse({
                "success": True,
                "user": updated,
                "new_password": new_password
            })
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Price Administration API Endpoints
# ============================================================================

@app.get("/api/price-administration/brreg/companies/search")
async def search_brreg_companies(name: str, limit: int = 10):
    """
    Search for companies in BRREG (Brønnøysundregistrene)
    
    Args:
        name: Company name to search for
        limit: Maximum number of results to return (default: 10)
    
    Returns:
        JSONResponse with success status and company data
    """
    from datetime import datetime
    try:
        import httpx
        
        # BRREG API endpoint - Enhetsregisteret API
        # Documentation: https://data.brreg.no/enhetsregisteret/api/dokumentasjon/index.html
        brreg_api_base = "https://data.brreg.no/enhetsregisteret/api/enheter"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # BRREG API uses "navn" parameter for name search and "size" for limit
            response = await client.get(
                brreg_api_base,
                params={"navn": name, "size": min(limit, 100)}  # BRREG API max is typically 100
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Transform BRREG API response to our format
                companies = []
                embedded = data.get("_embedded", {})
                enheter = embedded.get("enheter", [])
                total_results = data.get("page", {}).get("totalElements", 0)
                
                for enhet in enheter:
                    # Extract business address
                    forretningsadresse = enhet.get("forretningsadresse", {})
                    adresse_lines = forretningsadresse.get("adresse", [])
                    adresse_str = ", ".join(adresse_lines) if adresse_lines else ""
                    
                    company = {
                        "organizationNumber": enhet.get("organisasjonsnummer", ""),
                        "name": enhet.get("navn", ""),
                        "organizationForm": enhet.get("organisasjonsform", {}).get("kode", ""),
                        "registrationDate": enhet.get("stiftelsesdato", ""),
                        "businessAddress": {
                            "adresse": adresse_str,
                            "postnummer": forretningsadresse.get("postnummer", ""),
                            "poststed": forretningsadresse.get("poststed", "")
                        },
                        "industry": enhet.get("naeringskode1", {}).get("beskrivelse", ""),
                        "employees": None  # BRREG API doesn't always provide employee count
                    }
                    companies.append(company)
                
                result = {
                    "companies": companies,
                    "total": total_results,
                    "searchTerm": name,
                    "source": "brreg_api",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z"
                }
                
                return JSONResponse({
                    "success": True,
                    "data": result
                })
            else:
                # If BRREG API fails, return error
                return JSONResponse({
                    "success": False,
                    "error": f"BRREG API returned status {response.status_code}",
                    "data": {
                        "companies": [],
                        "total": 0,
                        "searchTerm": name,
                        "source": "fallback",
                        "lastUpdated": datetime.utcnow().isoformat() + "Z"
                    }
                }, status_code=response.status_code)
        
    except httpx.TimeoutException:
        return JSONResponse({
            "success": False,
            "error": "Request to BRREG API timed out",
            "data": {
                "companies": [],
                "total": 0,
                "searchTerm": name,
                "source": "fallback",
                "lastUpdated": datetime.utcnow().isoformat() + "Z"
            }
        }, status_code=504)
    except Exception as e:
        import traceback
        # Return error but still provide fallback structure
        return JSONResponse({
            "success": False,
            "error": str(e),
            "data": {
                "companies": [],
                "total": 0,
                "searchTerm": name,
                "source": "fallback",
                "lastUpdated": datetime.utcnow().isoformat() + "Z"
            }
        }, status_code=500)


@app.get("/api/price-administration/brreg/company/{organization_number}")
async def get_brreg_company(organization_number: str):
    """
    Get company details from BRREG by organization number
    
    Args:
        organization_number: Norwegian organization number (9 digits)
    
    Returns:
        JSONResponse with success status and company data
    """
    from datetime import datetime
    try:
        import httpx
        
        # BRREG API endpoint - Enhetsregisteret API
        brreg_api_base = f"https://data.brreg.no/enhetsregisteret/api/enheter/{organization_number}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(brreg_api_base)
            
            if response.status_code == 200:
                enhet = response.json()
                
                # Extract business address
                forretningsadresse = enhet.get("forretningsadresse", {})
                adresse_lines = forretningsadresse.get("adresse", [])
                adresse_str = ", ".join(adresse_lines) if adresse_lines else ""
                
                # Extract mailing address if available
                postadresse = enhet.get("postadresse", {})
                mailing_address = None
                if postadresse:
                    mailing_adresse_lines = postadresse.get("adresse", [])
                    mailing_adresse_str = ", ".join(mailing_adresse_lines) if mailing_adresse_lines else ""
                    mailing_address = {
                        "adresse": mailing_adresse_str,
                        "postnummer": postadresse.get("postnummer", ""),
                        "poststed": postadresse.get("poststed", "")
                    }
                
                company_data = {
                    "organizationNumber": enhet.get("organisasjonsnummer", organization_number),
                    "name": enhet.get("navn", ""),
                    "organizationForm": enhet.get("organisasjonsform", {}).get("kode", ""),
                    "registrationDate": enhet.get("stiftelsesdato", ""),
                    "businessAddress": {
                        "adresse": adresse_str,
                        "postnummer": forretningsadresse.get("postnummer", ""),
                        "poststed": forretningsadresse.get("poststed", "")
                    },
                    "industry": enhet.get("naeringskode1", {}).get("beskrivelse", ""),
                    "employees": None,  # BRREG API doesn't always provide employee count
                    "website": None,  # Not typically in BRREG API
                    "source": "brreg_api",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z"
                }
                
                if mailing_address:
                    company_data["mailingAddress"] = mailing_address
                
                return JSONResponse({
                    "success": True,
                    "data": company_data
                })
            elif response.status_code == 404:
                return JSONResponse({
                    "success": False,
                    "error": "Company not found",
                    "data": None
                }, status_code=404)
            else:
                return JSONResponse({
                    "success": False,
                    "error": f"BRREG API returned status {response.status_code}",
                    "data": None
                }, status_code=response.status_code)
        
    except httpx.TimeoutException:
        return JSONResponse({
            "success": False,
            "error": "Request to BRREG API timed out",
            "data": None
        }, status_code=504)
    except Exception as e:
        import traceback
        return JSONResponse({
            "success": False,
            "error": str(e),
            "data": None
        }, status_code=500)


@app.get("/api/price-administration/weather/forecast/{location}")
async def get_weather_forecast(
    location: str,
    lat: float = Query(None, description="Latitude in decimal degrees"),
    lon: float = Query(None, description="Longitude in decimal degrees"),
    days: int = Query(5, description="Number of days to forecast (default: 5)")
):
    """
    Get weather forecast using YR (MET Norway) API
    
    Args:
        location: Location name (e.g., 'oslo', 'bergen', 'trondheim')
        lat: Latitude in decimal degrees (optional, overrides location)
        lon: Longitude in decimal degrees (optional, overrides location)
        days: Number of days to forecast (default: 5, max: 10)
    
    Returns:
        JSONResponse with success status and weather forecast data
    """
    from datetime import datetime, timedelta
    try:
        import httpx
        
        # MET Norway Locationforecast 2.0 API
        # Documentation: https://api.met.no/weatherapi/locationforecast/2.0/documentation
        base_url = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
        
        # Extended coordinates for major Norwegian cities and locations
        location_coords = {
            'oslo': (59.9139, 10.7522, 'Oslo'),
            'bergen': (60.3913, 5.3221, 'Bergen'),
            'trondheim': (63.4305, 10.3951, 'Trondheim'),
            'stavanger': (58.9699, 5.7331, 'Stavanger'),
            'tromso': (69.6492, 18.9553, 'Tromsø'),
            'tromsoe': (69.6492, 18.9553, 'Tromsø'),
            'bodoe': (67.2804, 14.4050, 'Bodø'),
            'bodo': (67.2804, 14.4050, 'Bodø'),
            'alesund': (62.4722, 6.1549, 'Ålesund'),
            'aalesund': (62.4722, 6.1549, 'Ålesund'),
            'kristiansand': (58.1467, 7.9956, 'Kristiansand'),
            'drammen': (59.7440, 10.2045, 'Drammen'),
            'fredrikstad': (59.2181, 10.9298, 'Fredrikstad'),
            'skien': (59.2089, 9.6096, 'Skien'),
            'sandnes': (58.8526, 5.7333, 'Sandnes'),
            'sandefjord': (59.1282, 10.2197, 'Sandefjord'),
            'sarpsborg': (59.2836, 11.1096, 'Sarpsborg'),
            'arendal': (58.4614, 8.7725, 'Arendal'),
            'haugesund': (59.4136, 5.2680, 'Haugesund'),
            'tonsberg': (59.2676, 10.4076, 'Tønsberg'),
            'porsgrunn': (59.1405, 9.6561, 'Porsgrunn'),
            'hamar': (60.7945, 11.0680, 'Hamar'),
            'harstad': (68.7986, 16.5416, 'Harstad'),
            'larvik': (59.0533, 10.0353, 'Larvik'),
            'halden': (59.1242, 11.3879, 'Halden'),
            'lillehammer': (61.1151, 10.4662, 'Lillehammer'),
            'moelv': (60.9333, 10.7000, 'Moelv'),
            'mo i rana': (66.3128, 14.1428, 'Mo i Rana'),
            'kristiansund': (63.1110, 7.7280, 'Kristiansund'),
            'kongsberg': (59.6689, 9.6500, 'Kongsberg'),
            'honefoss': (60.1682, 10.2565, 'Hønefoss'),
            'honnefoss': (60.1682, 10.2565, 'Hønefoss'),
        }
        
        location_name = None
        location_lower = location.lower().strip()
        
        # Validate and set coordinates
        if lat is not None and lon is not None:
            # Validate coordinate ranges (rough bounds for Norway)
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                return JSONResponse({
                    "success": False,
                    "error": "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180",
                    "data": None
                }, status_code=400)
            
            # Rough validation for Norwegian coordinates
            if not (57 <= lat <= 72) or not (4 <= lon <= 32):
                return JSONResponse({
                    "success": False,
                    "error": f"Coordinates ({lat}, {lon}) are outside Norwegian territory. Please provide coordinates within Norway (approximately lat: 57-72, lon: 4-32)",
                    "data": None
                }, status_code=400)
            
            latitude = lat
            longitude = lon
            location_name = location  # Use provided location name
        else:
            # Look up location in known cities
            if location_lower in location_coords:
                latitude, longitude, location_name = location_coords[location_lower]
            else:
                # Location not found in known list
                return JSONResponse({
                    "success": False,
                    "error": f"Location '{location}' not recognized. Please provide coordinates (lat/lon) or use a recognized Norwegian city name. Supported cities: Oslo, Bergen, Trondheim, Stavanger, Tromsø, Bodø, Ålesund, Kristiansand, and others.",
                    "data": None,
                    "suggestion": "Provide lat and lon query parameters, or use a recognized city name"
                }, status_code=404)
        
        # Validate days parameter
        forecast_days = min(max(1, days), 10)  # Between 1 and 10 days
        
        # MET Norway API requires User-Agent header
        headers = {
            "User-Agent": "VirtualStudio/1.0 (https://virtualstudio.no; contact@virtualstudio.no)"
        }
        
        params = {
            "lat": latitude,
            "lon": longitude,
        }
        
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            response = await client.get(base_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse MET Norway Locationforecast 2.0 format
                timeseries = data.get("properties", {}).get("timeseries", [])
                
                # Extract forecast data for requested days
                forecast = []
                target_dates = {}
                today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
                
                for day_offset in range(forecast_days):
                    target_date = today + timedelta(days=day_offset)
                    target_dates[target_date.date()] = []
                
                # Group timeseries entries by date (take noon data for each day)
                for entry in timeseries:
                    entry_time = datetime.fromisoformat(entry["time"].replace("Z", "+00:00"))
                    entry_date = entry_time.date()
                    
                    if entry_date in target_dates:
                        # Use entries around noon (12:00) for daily forecast
                        if 11 <= entry_time.hour <= 13:
                            target_dates[entry_date].append({
                                "time": entry_time,
                                "data": entry.get("data", {})
                            })
                
                # Extract daily forecasts
                for day_offset in range(forecast_days):
                    forecast_date = (today + timedelta(days=day_offset)).date()
                    day_entries = target_dates.get(forecast_date, [])
                    
                    if day_entries:
                        # Use the entry closest to noon
                        closest_entry = min(day_entries, key=lambda e: abs(e["time"].hour - 12))
                        instant = closest_entry["data"].get("instant", {}).get("details", {})
                        next_1_hours = closest_entry["data"].get("next_1_hours", {}).get("details", {})
                        
                        # Map MET Norway weather codes to symbol names
                        symbol_code = closest_entry["data"].get("next_1_hours", {}).get("summary", {}).get("symbol_code", "clearsky_day")
                        symbol = "sun"
                        if "cloud" in symbol_code:
                            symbol = "cloud"
                        elif "rain" in symbol_code or "shower" in symbol_code:
                            symbol = "rain"
                        elif "snow" in symbol_code or "sleet" in symbol_code:
                            symbol = "snow"
                        
                        forecast.append({
                            "date": forecast_date.isoformat(),
                            "temperature": round(instant.get("air_temperature", 10), 1),
                            "humidity": round(instant.get("relative_humidity", 60), 1),
                            "windSpeed": round(instant.get("wind_speed", 5), 1),
                            "precipitation": round(next_1_hours.get("precipitation_amount", 0), 1),
                            "symbol": symbol
                        })
                    else:
                        # Fallback if no data for this day
                        forecast.append({
                            "date": forecast_date.isoformat(),
                            "temperature": 10.0,
                            "humidity": 60.0,
                            "windSpeed": 5.0,
                            "precipitation": 0.0,
                            "symbol": "cloud"
                        })
                
                result = {
                    "location": location_name or location,
                    "forecast": forecast,
                    "days": forecast_days,
                    "coordinates": {
                        "lat": latitude,
                        "lon": longitude
                    },
                    "source": "met_no",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z"
                }
                
                return JSONResponse({
                    "success": True,
                    "data": result
                })
            else:
                return JSONResponse({
                    "success": False,
                    "error": f"MET Norway API returned status {response.status_code}",
                    "data": None
                }, status_code=response.status_code)
        
    except httpx.TimeoutException:
        return JSONResponse({
            "success": False,
            "error": "Request to MET Norway API timed out",
            "data": None
        }, status_code=504)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "success": False,
            "error": str(e),
            "data": None
        }, status_code=500)


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


# ==================== CONSENT PORTAL API ====================

@app.get("/api/consent/portal/access")
async def validate_consent_access(
    access_code: str = Query(...),
    pin: str = Query(None),
    password: str = Query(None)
):
    """
    Validate consent portal access code
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
            # Look up consent by access code
            cur.execute("""
                SELECT 
                    c.id, c.candidate_id, c.project_id, c.type, c.title, c.description,
                    c.signed, c.date, c.document, c.notes, c.access_code, c.pin, c.password,
                    c.invitation_status, c.invitation_sent_at, c.signature_data, c.expires_at,
                    c.created_at, c.updated_at,
                    ca.name as candidate_name,
                    cp.name as project_name
                FROM casting_consents c
                LEFT JOIN casting_candidates ca ON c.candidate_id = ca.id
                LEFT JOIN casting_projects cp ON c.project_id = cp.id
                WHERE UPPER(c.access_code) = %s
                AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
            """, (access_code.upper(),))
            consent_row = cur.fetchone()
            
            if not consent_row:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig eller utløpt tilgangskode"
                }, status_code=404)
            
            # Check if PIN is required
            if consent_row.get('pin') and not pin:
                return JSONResponse({
                    "success": False,
                    "error": "PIN required",
                    "requiresPin": True
                }, status_code=401)
            
            # Validate PIN
            if consent_row.get('pin') and pin != consent_row['pin']:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig PIN"
                }, status_code=401)
            
            # Check if password is required  
            if consent_row.get('password') and not password:
                return JSONResponse({
                    "success": False,
                    "error": "Password required",
                    "requiresPassword": True
                }, status_code=401)
            
            # Validate password
            if consent_row.get('password') and password != consent_row['password']:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig passord"
                }, status_code=401)
            
            # Update invitation status to viewed if not already signed
            if not consent_row['signed'] and consent_row.get('invitation_status') != 'viewed':
                cur.execute("""
                    UPDATE casting_consents 
                    SET invitation_status = 'viewed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (consent_row['id'],))
                conn.commit()
            
            # Build response consent object
            consent_data = {
                'id': consent_row['id'],
                'candidateId': consent_row['candidate_id'],
                'projectId': consent_row['project_id'],
                'type': consent_row['type'],
                'title': consent_row['title'],
                'description': consent_row['description'],
                'signed': consent_row['signed'],
                'date': consent_row['date'].isoformat() if consent_row['date'] else None,
                'document': consent_row['document'],
                'notes': consent_row['notes'],
                'signatureData': consent_row['signature_data'],
                'expiresAt': consent_row['expires_at'].isoformat() if consent_row['expires_at'] else None,
                'createdAt': consent_row['created_at'].isoformat() if consent_row['created_at'] else None,
            }
            
            return JSONResponse({
                "success": True,
                "consent": consent_data,
                "candidateName": consent_row['candidate_name'] or 'Ukjent',
                "projectName": consent_row['project_name'] or 'Ukjent prosjekt'
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.post("/api/consent/portal/sign")
async def sign_consent_portal(request: Request):
    """
    Sign a consent via portal
    """
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
        import json
    except ImportError:
        return JSONResponse({
            "success": False,
            "error": "Database service not available"
        }, status_code=503)
    
    body = await request.json()
    access_code = body.get('accessCode', '').upper()
    pin = body.get('pin')
    password = body.get('password')
    signature_data = body.get('signatureData')
    
    if not access_code or not signature_data:
        return JSONResponse({
            "success": False,
            "error": "Tilgangskode og signatur er påkrevd"
        }, status_code=400)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Look up consent by access code
            cur.execute("""
                SELECT id, pin, password, signed
                FROM casting_consents
                WHERE UPPER(access_code) = %s
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """, (access_code,))
            consent_row = cur.fetchone()
            
            if not consent_row:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig eller utløpt tilgangskode"
                }, status_code=404)
            
            # Validate credentials
            if consent_row.get('pin') and pin != consent_row['pin']:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig PIN"
                }, status_code=401)
            
            if consent_row.get('password') and password != consent_row['password']:
                return JSONResponse({
                    "success": False,
                    "error": "Ugyldig passord"
                }, status_code=401)
            
            if consent_row['signed']:
                return JSONResponse({
                    "success": False,
                    "error": "Samtykke er allerede signert"
                }, status_code=400)
            
            # Sign the consent
            cur.execute("""
                UPDATE casting_consents 
                SET signed = TRUE,
                    date = CURRENT_TIMESTAMP,
                    signature_data = %s,
                    invitation_status = 'signed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (json.dumps(signature_data), consent_row['id']))
            conn.commit()
            
            return JSONResponse({
                "success": True,
                "message": "Samtykke signert"
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.post("/api/consent/generate-access-code")
async def generate_consent_access_code(request: Request):
    """
    Generate access code for a consent invitation
    """
    import random
    import string
    
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({
            "success": False,
            "error": "Database service not available"
        }, status_code=503)
    
    body = await request.json()
    consent_id = body.get('consentId')
    pin = body.get('pin')
    password = body.get('password')
    expires_days = body.get('expiresDays', 30)
    
    if not consent_id:
        return JSONResponse({
            "success": False,
            "error": "Consent ID er påkrevd"
        }, status_code=400)
    
    # Generate unique 6-character access code
    access_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Update consent with access code
            cur.execute("""
                UPDATE casting_consents 
                SET access_code = %s,
                    pin = %s,
                    password = %s,
                    expires_at = CURRENT_TIMESTAMP + INTERVAL '%s days',
                    invitation_status = 'sent',
                    invitation_sent_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (access_code, pin, password, expires_days, consent_id))
            
            result = cur.fetchone()
            if not result:
                return JSONResponse({
                    "success": False,
                    "error": "Samtykke ikke funnet"
                }, status_code=404)
            
            conn.commit()
            
            return JSONResponse({
                "success": True,
                "accessCode": access_code,
                "expiresAt": (expires_days)
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


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


# Email logo upload endpoint
@app.post("/api/email/logo-upload")
async def upload_email_logo(file: UploadFile = File(...)):
    """
    Upload a logo image for use in email templates.
    Accepts PNG, JPEG, and WebP files up to 2MB.
    Returns the public URL of the uploaded logo.
    """
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
    ALLOWED_TYPES = {'image/png', 'image/jpeg', 'image/webp', 'image/jpg'}
    
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Ugyldig filtype. Tillatte typer: PNG, JPEG, WebP"
        )
    
    # Read file content
    file_bytes = await file.read()
    
    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Filen er for stor. Maksimal størrelse er 2MB."
        )
    
    # Validate it's actually an image using PIL
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Verify it's a valid image
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Ugyldig bildefil. Vennligst last opp et gyldig bilde."
        )
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    unique_id = str(uuid.uuid4())
    r2_key = f"logos/{unique_id}.{file_ext}"
    
    # Upload to R2
    try:
        from utils.r2_client import upload_to_r2, R2_BUCKET_NAME
        
        # Upload to ml-models bucket (we'll serve via backend proxy or signed URL)
        upload_to_r2(file_bytes, r2_key, file.content_type)
        
        # Return the API endpoint URL for serving the logo
        logo_url = f"/api/email/logo/{unique_id}.{file_ext}"
        
        return JSONResponse({
            "success": True,
            "url": logo_url,
            "key": r2_key,
            "size": len(file_bytes),
            "filename": file.filename
        })
        
    except ValueError as e:
        # R2 credentials not configured
        raise HTTPException(
            status_code=503,
            detail="Opplasting ikke tilgjengelig. Lagringskonfigurasjon mangler."
        )
    except Exception as e:
        print(f"Error uploading logo: {e}")
        raise HTTPException(
            status_code=500,
            detail="Kunne ikke laste opp logo. Prøv igjen senere."
        )


@app.get("/api/storyboards/templates")
async def get_storyboard_templates():
    """Get all available storyboard visual style templates."""
    if not storyboard_service:
        raise HTTPException(status_code=503, detail="Storyboard service not initialized")
    return storyboard_service.get_templates()


@app.get("/api/environment/planner/status")
async def get_environment_planner_status():
    planner = get_or_create_environment_planner()
    return planner.get_status()


@app.get("/api/environment/layout-from-image/status")
async def get_environment_layout_status():
    layout_service = get_or_create_environment_layout_service()
    return layout_service.get_status()


@app.get("/api/environment/providers/health")
async def get_environment_provider_health(
    probe: bool = Query(False, description="When true, perform lightweight live probes against configured provider endpoints"),
):
    layout_service = get_or_create_environment_layout_service()
    validation_service = get_or_create_environment_validation_service()
    planner = get_or_create_environment_planner()

    return JSONResponse({
        "success": True,
        "probe": probe,
        "planner": planner.get_status(),
        "layout": {
            "status": layout_service.get_status(),
            "health": layout_service.get_provider_health(probe=probe),
        },
        "validation": {
            "status": validation_service.get_status(),
            "health": validation_service.get_provider_health(probe=probe),
        },
    })


@app.get("/api/environment/providers/gemini/status")
async def get_gemini_environment_provider_status():
    provider = get_or_create_gemini_environment_provider()
    return JSONResponse({
        "success": True,
        "status": provider.get_status(),
    })


@app.post("/api/environment/providers/layout-gemini")
async def analyze_environment_layout_with_gemini(request: EnvironmentLayoutRequest):
    if not request.referenceImages:
        raise HTTPException(status_code=400, detail="At least one reference image is required")

    provider = get_or_create_gemini_environment_provider()
    if not provider.enabled:
        raise HTTPException(status_code=503, detail="Gemini environment provider is not configured")

    try:
        result = provider.analyze_layout(
            reference_images=request.referenceImages,
            prompt=request.prompt,
            preferred_room_type=request.preferredRoomType,
            segmentation_prompts=(
                request.layoutOptions.get("segmentationPrompts")
                if isinstance(request.layoutOptions, dict) and isinstance(request.layoutOptions.get("segmentationPrompts"), list)
                else []
            ),
            layout_options=request.layoutOptions or {},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini layout provider failed: {exc}") from exc

    return JSONResponse(result)


@app.post("/api/environment/providers/validate-gemini")
async def validate_environment_with_gemini(request: EnvironmentValidateRequest):
    provider = get_or_create_gemini_environment_provider()
    if not provider.enabled:
        raise HTTPException(status_code=503, detail="Gemini environment provider is not configured")

    if not request.previewImage:
        raise HTTPException(status_code=400, detail="previewImage is required")

    try:
        result = provider.validate_environment(
            plan=request.plan,
            preview_image=request.previewImage,
            heuristic_evaluation=None,
            validation_options=request.validationOptions or {},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini validation provider failed: {exc}") from exc

    return JSONResponse(result)


@app.post("/api/environment/providers/smoke")
async def smoke_environment_providers(request: EnvironmentProviderSmokeRequest):
    layout_service = get_or_create_environment_layout_service()
    validation_service = get_or_create_environment_validation_service()
    smoke_image = build_environment_provider_smoke_reference_image()

    layout_result: Optional[Dict[str, Any]] = None
    validation_result: Optional[Dict[str, Any]] = None

    if request.includeLayout:
        layout_result = layout_service.analyze_images(
            reference_images=[smoke_image],
            prompt=request.prompt,
            preferred_room_type=request.preferredRoomType,
            provider=request.layoutProvider,
            layout_options=request.layoutOptions or {},
        )

    if request.includeValidation:
        smoke_plan = build_environment_provider_smoke_plan(
            prompt=request.prompt,
            preferred_room_type=request.preferredRoomType,
            layout_analysis=layout_result,
        )
        validation_result = validation_service.validate(
            smoke_plan,
            preview_image=smoke_image,
            provider=request.validationProvider,
            validation_options={
                "referenceMode": "provider_smoke",
                "source": "synthetic_smoke_image",
                "scenePhase": "provider_smoke",
            },
        )

    return JSONResponse({
        "success": True,
        "sample": {
            "prompt": request.prompt,
            "preferredRoomType": request.preferredRoomType,
            "imageSource": "synthetic_smoke_image",
        },
        "layout": layout_result,
        "validation": validation_result,
    })


@app.get("/api/marketplace/environment-packs")
async def list_marketplace_environment_packs(
    actor_user_id: Optional[str] = Query(None),
    actor_name: Optional[str] = Query(None),
    actor_role: Optional[str] = Query(None),
):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    actor = {
        "userId": actor_user_id,
        "name": actor_name,
        "role": actor_role,
    }

    return JSONResponse({
        "success": True,
        "products": list_environment_pack_products(actor=actor),
    })


@app.get("/api/marketplace/environment-packs/release-dashboard")
async def get_marketplace_environment_pack_release_dashboard(
    actor_user_id: Optional[str] = Query(None),
    actor_name: Optional[str] = Query(None),
    actor_role: Optional[str] = Query(None),
):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    actor = {
        "userId": actor_user_id,
        "name": actor_name,
        "role": actor_role,
    }

    try:
        dashboard = get_environment_pack_release_dashboard(actor=actor)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return JSONResponse({
        "success": True,
        "dashboard": dashboard,
    })


@app.post("/api/marketplace/environment-packs/publish")
async def publish_marketplace_environment_pack(request: MarketplaceEnvironmentPackPublishRequest):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    product_id = str((request.product or {}).get("id") or "").strip()
    if not product_id:
        raise HTTPException(status_code=400, detail="product.id is required")

    try:
        product = upsert_environment_pack_product(
            request.product,
            actor=request.actor,
            publish_mode=str(request.mode or "save_copy"),
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse({
        "success": True,
        "product": product,
    })


@app.post("/api/marketplace/environment-packs/validate-release")
async def validate_marketplace_environment_pack_release(request: MarketplaceEnvironmentPackValidateRequest):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    quality_report = get_environment_pack_quality_report(request.product)

    return JSONResponse({
        "success": True,
        "qualityReport": quality_report,
    })


@app.post("/api/marketplace/environment-packs/{product_id}/promote")
async def promote_marketplace_environment_pack(product_id: str, request: MarketplaceEnvironmentPackPromoteRequest):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    try:
        product = promote_environment_pack_candidate(product_id, actor=request.actor)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse({
        "success": True,
        "product": product,
    })


@app.post("/api/marketplace/environment-packs/{product_id}/rollback")
async def rollback_marketplace_environment_pack(product_id: str, request: MarketplaceEnvironmentPackRollbackRequest):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    try:
        product = rollback_environment_pack_release(
            product_id,
            actor=request.actor,
            target_version=request.targetVersion,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse({
        "success": True,
        "product": product,
    })


@app.post("/api/marketplace/environment-packs/{product_id}/record-install")
async def record_marketplace_environment_pack_install(product_id: str):
    if not MARKETPLACE_REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Marketplace registry service is not available")

    updated_product = record_environment_pack_install(product_id)
    if updated_product is None:
        raise HTTPException(status_code=404, detail="Marketplace environment pack not found")

    return JSONResponse({
        "success": True,
        "product": updated_product,
    })


@app.post("/api/environment/layout-from-image")
async def analyze_environment_layout(request: EnvironmentLayoutRequest):
    if not request.referenceImages:
        raise HTTPException(status_code=400, detail="At least one reference image is required")

    layout_service = get_or_create_environment_layout_service()
    try:
        result = layout_service.analyze_images(
            reference_images=request.referenceImages,
            prompt=request.prompt,
            preferred_room_type=request.preferredRoomType,
            provider=request.provider,
            layout_options=request.layoutOptions,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse(result)


@app.post("/api/environment/build-shell")
async def build_environment_shell(request: EnvironmentBuildShellRequest):
    try:
        try:
            from environment_planner_service import build_room_shell_spec
        except ImportError:
            from backend.environment_planner_service import build_room_shell_spec

        shell = build_room_shell_spec(
            request.shell,
            prompt=request.prompt,
            layout_hints=request.layoutHints,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse({
        "shell": shell,
        "runtimeSupported": True,
        "typeAccessoryHints": list(dict.fromkeys({
            "interior_room": ["baseboard", "crown_molding", "ceiling_coffered", "wall_segment_panel", "wall_segment_pilaster"],
            "warehouse": ["warehouse_beam", "warehouse_column", "ceiling_open_truss", "wall_segment_bay"],
            "storefront": ["storefront_awning", "storefront_header", "display_ledge", "ceiling_canopy", "wall_segment_bay"],
            "abstract_stage": ["cyclorama_curve", "stage_edge"],
            "outdoor_illusion": ["sky_backdrop", "ground_extension"],
            "studio_shell": [],
        }.get(shell["type"], []) + [
            hint
            for hint in [
                {
                    "coffered": "ceiling_coffered",
                    "exposed_beams": "ceiling_exposed_beams",
                    "open_truss": "ceiling_open_truss",
                    "canopy": "ceiling_canopy",
                }.get(str(shell.get("ceilingStyle") or "flat"))
            ]
            if hint
        ] + [
            f"wall_segment_{segment.get('kind')}"
            for segment in (shell.get("wallSegments") or [])
            if isinstance(segment, dict) and segment.get("kind")
        ] + [
            str(fixture.get("kind"))
            for fixture in (shell.get("fixtures") or [])
            if isinstance(fixture, dict) and fixture.get("kind")
        ])),
    })


@app.post("/api/environment/plan")
async def generate_environment_plan(request: EnvironmentPlanRequest):
    if not request.prompt.strip() and not request.referenceImages:
        raise HTTPException(status_code=400, detail="Prompt or reference image is required")

    planner = get_or_create_environment_planner()
    room_constraints = dict(request.roomConstraints or {})
    layout_analysis: Optional[Dict[str, Any]] = None
    layout_provider = request.layoutProvider or room_constraints.get("layoutProvider")
    layout_options = request.layoutOptions if isinstance(request.layoutOptions, dict) else None
    if layout_options:
        room_constraints["layoutOptions"] = layout_options

    if request.referenceImages and not room_constraints.get("layoutHints"):
        layout_service = get_or_create_environment_layout_service()
        try:
            layout_analysis = layout_service.analyze_images(
                reference_images=request.referenceImages,
                prompt=request.prompt,
                preferred_room_type=room_constraints.get("preferredRoomType"),
                provider=str(layout_provider) if layout_provider else None,
                layout_options=layout_options,
            )
            room_constraints["layoutHints"] = layout_analysis.get("layoutHints")
            room_constraints["imageLayoutSummary"] = layout_analysis.get("summary")
        except Exception as exc:
            print(f"Warning: environment layout analysis failed, continuing without it: {exc}")

    result = await planner.generate_plan(
        prompt=request.prompt,
        reference_images=request.referenceImages,
        room_constraints=room_constraints,
        prefer_fallback=request.preferFallback,
        preferred_preset_id=request.preferredPresetId,
        world_model_provider=request.worldModelProvider,
        world_model_reference=request.worldModelReference,
        brand_reference=request.brandReference,
    )

    if layout_analysis:
        result["layoutAnalysis"] = layout_analysis

    return JSONResponse(result)


@app.get("/api/environment/retrieve-assets/status")
async def get_environment_asset_retrieval_status():
    retrieval = get_or_create_asset_retrieval_service()
    return retrieval.get_status()


@app.post("/api/environment/retrieve-assets")
async def retrieve_environment_assets(request: EnvironmentAssetRetrievalRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Query text is required")

    retrieval = get_or_create_asset_retrieval_service()
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


@app.get("/api/environment/assemble/status")
async def get_environment_assembly_status():
    assembly_service = get_or_create_environment_assembly_service()
    return assembly_service.get_status()


@app.post("/api/environment/assemble")
async def assemble_environment_plan(request: EnvironmentAssembleRequest):
    if not isinstance(request.plan, dict) or not request.plan:
        raise HTTPException(status_code=400, detail="A plan payload is required")

    assembly_service = get_or_create_environment_assembly_service()
    try:
        result = assembly_service.assemble(request.plan)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return JSONResponse(result)


@app.get("/api/environment/validate/status")
async def get_environment_validation_status():
    validation_service = get_or_create_environment_validation_service()
    return validation_service.get_status()


@app.post("/api/environment/validate")
async def validate_environment_plan(request: EnvironmentValidateRequest):
    if not isinstance(request.plan, dict) or not request.plan:
        raise HTTPException(status_code=400, detail="A plan payload is required")

    validation_service = get_or_create_environment_validation_service()
    try:
        result = validation_service.validate(
            request.plan,
            preview_image=request.previewImage,
            provider=request.provider,
            validation_options=request.validationOptions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return JSONResponse(result)

@app.get("/api/storyboards/camera-angles")
async def get_camera_angles():
    """Get all available camera angles for storyboard generation."""
    if not storyboard_service:
        raise HTTPException(status_code=503, detail="Storyboard service not initialized")
    return storyboard_service.get_camera_angles()

@app.get("/api/storyboards/camera-movements")
async def get_camera_movements():
    """Get all available camera movements for storyboard generation."""
    if not storyboard_service:
        raise HTTPException(status_code=503, detail="Storyboard service not initialized")
    return storyboard_service.get_camera_movements()

@app.post("/api/storyboards/generate-frame")
async def generate_storyboard_frame(request: dict):
    """
    Generate a storyboard frame using OpenAI gpt-image-1.
    Uses Replit AI Integrations - charges are billed to your Replit credits.
    
    Request body:
    {
        "prompt": "A close-up shot of a character looking worried",
        "template": "cinematic",
        "camera_angle": "close-up",
        "camera_movement": "static",
        "additional_notes": "dramatic lighting",
        "size": "1536x1024",
        "frame_id": "frame-123",
        "storyboard_id": "sb-456",
        "project_id": "proj-789"
    }
    """
    if not storyboard_service or not storyboard_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="Storyboard image service is not configured. Check AI Integrations setup."
        )
    
    prompt = request.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    result = await storyboard_service.generate_image(
        description=prompt,
        template_id=request.get("template", "cinematic"),
        camera_angle=request.get("camera_angle"),
        camera_movement=request.get("camera_movement"),
        additional_notes=request.get("additional_notes"),
        size=request.get("size", "1536x1024")
    )
    
    if not result["success"]:
        error_code = result.get("error_code", "")
        if error_code == "BUDGET_EXCEEDED":
            raise HTTPException(status_code=402, detail=result.get("error"))
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    try:
        from utils.r2_client import upload_to_r2, CASTING_ASSETS_BUCKET
        import uuid
        import base64
        
        frame_id = request.get("frame_id", str(uuid.uuid4()))
        storyboard_id = request.get("storyboard_id", "temp")
        project_id = request.get("project_id", "temp")
        
        r2_key = f"storyboards/{project_id}/{storyboard_id}/frames/{frame_id}/original.png"
        
        image_bytes = base64.b64decode(result["image_base64"])
        
        public_url = upload_to_r2(
            image_bytes,
            r2_key,
            "image/png",
            bucket=CASTING_ASSETS_BUCKET
        )
        
        return JSONResponse({
            "success": True,
            "imageUrl": public_url,
            "imageKey": r2_key,
            "prompt": result["prompt_used"],
            "template": result["template"],
            "model": "gpt-image-1"
        })
    except ValueError as e:
        return JSONResponse({
            "success": True,
            "imageBase64": result["image_base64"],
            "prompt": result["prompt_used"],
            "template": result["template"],
            "model": "gpt-image-1"
        })
    except Exception as e:
        print(f"Error uploading generated image: {e}")
        return JSONResponse({
            "success": True,
            "imageBase64": result["image_base64"],
            "prompt": result["prompt_used"],
            "template": result["template"],
            "model": "gpt-image-1"
        })

@app.get("/api/email/logo/{logo_key:path}")
async def get_email_logo(logo_key: str):
    """
    Serve an uploaded email logo from R2 storage.
    """
    try:
        from utils.r2_client import get_r2_client, R2_BUCKET_NAME
        import io
        
        r2_path = f"logos/{logo_key}"
        client = get_r2_client()
        
        response = client.get_object(Bucket=R2_BUCKET_NAME, Key=r2_path)
        content = response['Body'].read()
        content_type = response.get('ContentType', 'image/png')
        
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Content-Disposition": f"inline; filename={logo_key}"
            }
        )
    except Exception as e:
        print(f"Error serving logo {logo_key}: {e}")
        raise HTTPException(status_code=404, detail="Logo ikke funnet")


# Explicit route to serve 3D model files from rodin_models directory
@app.get("/api/models/{filename:path}")
async def serve_model_file(filename: str):
    """Serve 3D model files (GLB, GLTF, etc.) from rodin_models directory."""
    file_path = RODIN_MODELS_DIR / filename
    metadata = read_storage_metadata(get_storage_metadata_path(file_path))

    if metadata and metadata.get("storage") == "r2" and metadata.get("url"):
        return RedirectResponse(url=str(metadata["url"]), status_code=307)
    
    if not file_path.exists():
        print(f"[Models] File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"Model file not found: {filename}")
    
    # Determine content type based on extension
    content_types = {
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.bin': 'application/octet-stream',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    }
    
    ext = file_path.suffix.lower()
    content_type = content_types.get(ext, 'application/octet-stream')
    
    print(f"[Models] Serving: {filename} ({content_type})")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename
    )


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


@app.post("/api/split-sheets/invoices/{invoice_id}/send-fiken")
async def send_invoice_to_fiken(invoice_id: str, request: Request):
    """Send invoice to Fiken accounting"""
    # In a real implementation, this would integrate with Fiken API
    # For now, simulate success
    return JSONResponse({
        "success": True,
        "message": "Invoice synced to Fiken",
        "fikenInvoiceId": f"fiken-{invoice_id}"
    })


@app.get("/api/accounting/fiken/status")
async def get_fiken_status():
    """Check Fiken integration status"""
    # In a real implementation, check if user has connected Fiken
    return JSONResponse({"hasFiken": False})


# ==================== PRO CONNECTIONS API ====================

@app.get("/api/split-sheets/pro-connections")
async def get_pro_connections(userId: str = Query(None)):
    """Get PRO (TONO/STIM) connections for a user"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_pro_connections (
                    id VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    pro_name VARCHAR(50) NOT NULL,
                    pro_account_id VARCHAR(255),
                    isrc_prefix VARCHAR(50),
                    connection_status VARCHAR(50) DEFAULT 'pending',
                    last_sync_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            query = "SELECT * FROM split_sheet_pro_connections"
            params = []
            if userId:
                query += " WHERE user_id = %s"
                params.append(userId)
            query += " ORDER BY created_at DESC"
            
            cur.execute(query, params)
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


@app.delete("/api/split-sheets/pro-connections/{connection_id}")
async def delete_pro_connection(connection_id: str):
    """Disconnect from a PRO"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM split_sheet_pro_connections WHERE id = %s", (connection_id,))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== SPLIT SHEET CONTRACTS API ====================

@app.get("/api/contracts/{contract_id}")
async def get_contract(contract_id: str):
    """Get a contract by ID"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
        import json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Ensure table exists
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
            
            cur.execute("SELECT * FROM split_sheet_contracts WHERE id = %s", (contract_id,))
            row = cur.fetchone()
            
            if not row:
                return JSONResponse({"success": False, "error": "Contract not found"}, status_code=404)
            
            result = dict(row)
            for k, v in result.items():
                if hasattr(v, 'isoformat'):
                    result[k] = v.isoformat()
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.get("/api/contracts")
async def list_contracts(split_sheet_id: str = Query(None), project_id: str = Query(None)):
    """List contracts with optional filters"""
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
            query = "SELECT * FROM split_sheet_contracts WHERE 1=1"
            params = []
            
            if split_sheet_id:
                query += " AND split_sheet_id = %s"
                params.append(split_sheet_id)
            if project_id:
                query += " AND project_id = %s"
                params.append(project_id)
            
            query += " ORDER BY created_at DESC"
            
            cur.execute(query, params)
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


@app.post("/api/contracts")
async def create_contract(request: Request):
    """Create a new contract"""
    import uuid
    import json
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    contract_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO split_sheet_contracts 
                (id, project_id, split_sheet_id, title, content, parties, obligations, payment_terms, legal_references, applied_suggestions, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                contract_id,
                body.get('project_id'),
                body.get('split_sheet_id'),
                body.get('title', 'Untitled Contract'),
                body.get('content', ''),
                json.dumps(body.get('parties', [])),
                json.dumps(body.get('obligations', [])),
                json.dumps(body.get('payment_terms', [])),
                json.dumps(body.get('legal_references', [])),
                json.dumps(body.get('applied_suggestions', [])),
                body.get('status', 'draft')
            ))
            row = cur.fetchone()
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


@app.put("/api/contracts/{contract_id}")
async def update_contract(contract_id: str, request: Request):
    """Update a contract"""
    import json
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
                UPDATE split_sheet_contracts
                SET title = COALESCE(%s, title),
                    content = COALESCE(%s, content),
                    parties = COALESCE(%s, parties),
                    obligations = COALESCE(%s, obligations),
                    payment_terms = COALESCE(%s, payment_terms),
                    legal_references = COALESCE(%s, legal_references),
                    applied_suggestions = COALESCE(%s, applied_suggestions),
                    status = COALESCE(%s, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (
                body.get('title'),
                body.get('content'),
                json.dumps(body.get('parties')) if body.get('parties') else None,
                json.dumps(body.get('obligations')) if body.get('obligations') else None,
                json.dumps(body.get('payment_terms')) if body.get('payment_terms') else None,
                json.dumps(body.get('legal_references')) if body.get('legal_references') else None,
                json.dumps(body.get('applied_suggestions')) if body.get('applied_suggestions') else None,
                body.get('status'),
                contract_id
            ))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Contract not found"}, status_code=404)
            
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


# ==================== NORWEGIAN LAWS / LEGAL SUGGESTIONS API ====================

@app.get("/api/norwegian-laws/split-sheets/{split_sheet_id}/legal-suggestions")
async def get_legal_suggestions(split_sheet_id: str):
    """Get AI-generated legal suggestions for a split sheet"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_legal_suggestions (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255) NOT NULL,
                    law_id VARCHAR(255),
                    law_name VARCHAR(255),
                    law_code VARCHAR(100),
                    chapter VARCHAR(100),
                    paragraph VARCHAR(100),
                    content TEXT,
                    suggestion_type VARCHAR(50),
                    title VARCHAR(500),
                    description TEXT,
                    explanation TEXT,
                    confidence_score DECIMAL(3,2),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT * FROM split_sheet_legal_suggestions
                WHERE split_sheet_id = %s
                ORDER BY confidence_score DESC, created_at DESC
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


@app.put("/api/norwegian-laws/split-sheets/{split_sheet_id}/legal-suggestions/{suggestion_id}")
async def update_legal_suggestion(split_sheet_id: str, suggestion_id: str, request: Request):
    """Update suggestion status (accept/reject)"""
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
                UPDATE split_sheet_legal_suggestions
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND split_sheet_id = %s
                RETURNING *
            """, (body.get('status', 'pending'), suggestion_id, split_sheet_id))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Suggestion not found"}, status_code=404)
            
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


@app.get("/api/norwegian-laws/split-sheets/{split_sheet_id}/legal-references")
async def get_legal_references(split_sheet_id: str):
    """Get legal references for a split sheet"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_legal_references (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255) NOT NULL,
                    law_id VARCHAR(255) NOT NULL,
                    law_name VARCHAR(255),
                    law_code VARCHAR(100),
                    chapter VARCHAR(100),
                    paragraph VARCHAR(100),
                    content TEXT,
                    category VARCHAR(100),
                    section_type VARCHAR(100),
                    relevance_score DECIMAL(3,2),
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT * FROM split_sheet_legal_references
                WHERE split_sheet_id = %s
                ORDER BY relevance_score DESC, created_at DESC
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


@app.post("/api/norwegian-laws/split-sheets/{split_sheet_id}/legal-references")
async def add_legal_reference(split_sheet_id: str, request: Request):
    """Add a legal reference to a split sheet"""
    import uuid
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    reference_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO split_sheet_legal_references 
                (id, split_sheet_id, law_id, law_name, law_code, chapter, paragraph, content, category, section_type, relevance_score, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                reference_id,
                split_sheet_id,
                body.get('law_id'),
                body.get('law_name'),
                body.get('law_code'),
                body.get('chapter'),
                body.get('paragraph'),
                body.get('content'),
                body.get('category'),
                body.get('section_type'),
                body.get('relevance_score'),
                body.get('notes')
            ))
            row = cur.fetchone()
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


@app.get("/api/norwegian-laws/search")
async def search_norwegian_laws(query: str = Query(...), category: str = Query(None)):
    """Search Norwegian laws database"""
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
                CREATE TABLE IF NOT EXISTS norwegian_laws (
                    id VARCHAR(255) PRIMARY KEY,
                    law_code VARCHAR(100),
                    law_name VARCHAR(255) NOT NULL,
                    chapter VARCHAR(100),
                    paragraph VARCHAR(100),
                    content TEXT,
                    category VARCHAR(100),
                    section_type VARCHAR(100),
                    effective_date DATE,
                    source_url VARCHAR(500),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            sql = """
                SELECT * FROM norwegian_laws
                WHERE (law_name ILIKE %s OR content ILIKE %s OR law_code ILIKE %s)
            """
            params = [f'%{query}%', f'%{query}%', f'%{query}%']
            
            if category:
                sql += " AND category = %s"
                params.append(category)
            
            sql += " ORDER BY law_name, chapter, paragraph LIMIT 50"
            
            cur.execute(sql, params)
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


# ==================== SPLIT SHEET COMMENTS API ====================

@app.get("/api/split-sheets/{split_sheet_id}/comments")
async def get_split_sheet_comments(split_sheet_id: str):
    """Get comments for a split sheet"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_comments (
                    id VARCHAR(255) PRIMARY KEY,
                    split_sheet_id VARCHAR(255) NOT NULL,
                    parent_comment_id VARCHAR(255),
                    user_id VARCHAR(255) NOT NULL,
                    user_name VARCHAR(255) NOT NULL,
                    user_email VARCHAR(255),
                    content TEXT NOT NULL,
                    mentions JSONB DEFAULT '[]',
                    is_resolved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT * FROM split_sheet_comments
                WHERE split_sheet_id = %s
                ORDER BY created_at ASC
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


@app.post("/api/split-sheets/{split_sheet_id}/comments")
async def create_split_sheet_comment(split_sheet_id: str, request: Request):
    """Add a comment to a split sheet"""
    import uuid
    import json
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    comment_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO split_sheet_comments 
                (id, split_sheet_id, parent_comment_id, user_id, user_name, user_email, content, mentions)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                comment_id,
                split_sheet_id,
                body.get('parent_comment_id'),
                body.get('user_id'),
                body.get('user_name', 'Anonymous'),
                body.get('user_email'),
                body.get('content', ''),
                json.dumps(body.get('mentions', []))
            ))
            row = cur.fetchone()
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


@app.put("/api/split-sheets/comments/{comment_id}")
async def update_split_sheet_comment(comment_id: str, request: Request):
    """Update a comment (edit or resolve)"""
    import json
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
                UPDATE split_sheet_comments
                SET content = COALESCE(%s, content),
                    is_resolved = COALESCE(%s, is_resolved),
                    mentions = COALESCE(%s, mentions),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (
                body.get('content'),
                body.get('is_resolved'),
                json.dumps(body.get('mentions')) if body.get('mentions') else None,
                comment_id
            ))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Comment not found"}, status_code=404)
            
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


@app.delete("/api/split-sheets/comments/{comment_id}")
async def delete_split_sheet_comment(comment_id: str):
    """Delete a comment"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM split_sheet_comments WHERE id = %s", (comment_id,))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== SPLIT SHEET TEMPLATES API ====================

@app.get("/api/split-sheets/templates")
async def get_split_sheet_templates(userId: str = Query(None), include_public: bool = Query(True)):
    """Get split sheet templates"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_templates (
                    id VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    is_system_template BOOLEAN DEFAULT FALSE,
                    is_public BOOLEAN DEFAULT FALSE,
                    profession VARCHAR(50),
                    contributors JSONB DEFAULT '[]',
                    usage_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            if userId:
                if include_public:
                    cur.execute("""
                        SELECT * FROM split_sheet_templates
                        WHERE user_id = %s OR is_public = TRUE OR is_system_template = TRUE
                        ORDER BY usage_count DESC, created_at DESC
                    """, (userId,))
                else:
                    cur.execute("""
                        SELECT * FROM split_sheet_templates
                        WHERE user_id = %s
                        ORDER BY usage_count DESC, created_at DESC
                    """, (userId,))
            else:
                cur.execute("""
                    SELECT * FROM split_sheet_templates
                    WHERE is_public = TRUE OR is_system_template = TRUE
                    ORDER BY usage_count DESC, created_at DESC
                """)
            
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


@app.post("/api/split-sheets/templates")
async def create_split_sheet_template(request: Request):
    """Create a new template"""
    import uuid
    import json
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    template_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO split_sheet_templates 
                (id, user_id, name, description, is_public, profession, contributors)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                template_id,
                body.get('user_id'),
                body.get('name', 'Untitled Template'),
                body.get('description'),
                body.get('is_public', False),
                body.get('profession'),
                json.dumps(body.get('contributors', []))
            ))
            row = cur.fetchone()
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


@app.delete("/api/split-sheets/templates/{template_id}")
async def delete_split_sheet_template(template_id: str):
    """Delete a template"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM split_sheet_templates WHERE id = %s", (template_id,))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.post("/api/split-sheets/templates/{template_id}/use")
async def use_split_sheet_template(template_id: str):
    """Track template usage"""
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
                UPDATE split_sheet_templates
                SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (template_id,))
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Template not found"}, status_code=404)
            
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


# ==================== SPLIT SHEET REPORTS API ====================

@app.get("/api/split-sheets/reports")
async def get_split_sheet_reports(userId: str = Query(...)):
    """Get generated reports for a user"""
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
                CREATE TABLE IF NOT EXISTS split_sheet_reports (
                    id VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    period VARCHAR(50),
                    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    download_url VARCHAR(500),
                    status VARCHAR(50) DEFAULT 'generating',
                    report_data JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            
            cur.execute("""
                SELECT * FROM split_sheet_reports
                WHERE user_id = %s
                ORDER BY generated_at DESC
            """, (userId,))
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


@app.post("/api/split-sheets/reports/generate")
async def generate_split_sheet_report(request: Request):
    """Generate a new report"""
    import uuid
    import json
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database service not available"}, status_code=503)
    
    body = await request.json()
    report_id = str(uuid.uuid4())
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # In a real implementation, this would:
            # 1. Queue a background job to generate the report
            # 2. Aggregate data from split sheets, revenue, payments
            # 3. Generate PDF/Excel file
            # 4. Upload to storage and get download URL
            
            cur.execute("""
                INSERT INTO split_sheet_reports 
                (id, user_id, name, type, period, status, report_data)
                VALUES (%s, %s, %s, %s, %s, 'ready', %s)
                RETURNING *
            """, (
                report_id,
                body.get('user_id'),
                body.get('name', 'Report'),
                body.get('type', 'monthly'),
                body.get('period'),
                json.dumps(body.get('report_data', {}))
            ))
            row = cur.fetchone()
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


@app.get("/api/split-sheets/statistics")
async def get_split_sheet_statistics(userId: str = Query(...)):
    """Get aggregated statistics for a user's split sheets"""
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
            # Get split sheet counts
            cur.execute("""
                SELECT 
                    COUNT(*) as total_split_sheets,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'pending_signatures' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts
                FROM split_sheets
                WHERE user_id = %s
            """, (userId,))
            split_sheet_stats = cur.fetchone() or {}
            
            # Get revenue totals
            cur.execute("""
                SELECT 
                    COALESCE(SUM(r.amount), 0) as total_revenue,
                    r.currency
                FROM split_sheet_revenue r
                INNER JOIN split_sheets ss ON r.split_sheet_id = ss.id
                WHERE ss.user_id = %s
                GROUP BY r.currency
            """, (userId,))
            revenue_rows = cur.fetchall()
            
            revenue_by_currency = {}
            for row in revenue_rows:
                revenue_by_currency[row['currency']] = float(row['total_revenue'])
            
            # Get payment totals
            cur.execute("""
                SELECT 
                    COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as total_paid,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
                    p.currency
                FROM split_sheet_payments p
                INNER JOIN split_sheets ss ON p.split_sheet_id = ss.id
                WHERE ss.user_id = %s
                GROUP BY p.currency
            """, (userId,))
            payment_rows = cur.fetchall()
            
            payments_by_currency = {}
            for row in payment_rows:
                payments_by_currency[row['currency']] = {
                    'paid': float(row['total_paid']),
                    'pending': float(row['total_pending'])
                }
            
            return JSONResponse({
                "success": True,
                "data": {
                    "split_sheets": dict(split_sheet_stats) if split_sheet_stats else {},
                    "revenue": revenue_by_currency,
                    "payments": payments_by_currency
                }
            })
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


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

@app.get("/api/production/{project_id}/shooting-days")
async def get_production_shooting_days(project_id: str):
    """Get all shooting days for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_shooting_days
                WHERE project_id = %s
                ORDER BY day_number ASC
            """, (project_id,))
            rows = cur.fetchall()
            
            result = [serialize_db_row(row) for row in rows]
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/shooting-days")
async def create_production_shooting_day(project_id: str, request: Request):
    """Create a new shooting day"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            day_id = body.get('id', f"sd-{uuid.uuid4()}")
            cur.execute("""
                INSERT INTO production_shooting_days (
                    id, project_id, day_number, date, call_time, wrap_time,
                    location, location_address, notes, scenes, status,
                    weather, crew_call_times, cast_call_times, equipment_needed, meals
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    weather = EXCLUDED.weather,
                    crew_call_times = EXCLUDED.crew_call_times,
                    cast_call_times = EXCLUDED.cast_call_times,
                    equipment_needed = EXCLUDED.equipment_needed,
                    meals = EXCLUDED.meals,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                day_id,
                project_id,
                body.get('dayNumber', 1),
                body.get('date'),
                body.get('callTime', '07:00'),
                body.get('wrapTime'),
                body.get('location', 'TBD'),
                body.get('locationAddress'),
                body.get('notes'),
                Json(body.get('scenes', [])),
                body.get('status', 'planned'),
                Json(body.get('weather', {})),
                Json(body.get('crewCallTimes', {})),
                Json(body.get('castCallTimes', {})),
                Json(body.get('equipmentNeeded', [])),
                Json(body.get('meals', []))
            ))
            row = cur.fetchone()
            conn.commit()
            
            result = dict(row)
            if result.get('date'):
                result['date'] = str(result['date'])
            if result.get('call_time'):
                result['call_time'] = str(result['call_time'])
            if result.get('wrap_time'):
                result['wrap_time'] = str(result['wrap_time'])
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.put("/api/production/shooting-days/{day_id}")
async def update_production_shooting_day(day_id: str, request: Request):
    """Update a shooting day"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build dynamic update query
            updates = []
            params = []
            
            field_mapping = {
                'dayNumber': 'day_number',
                'date': 'date',
                'callTime': 'call_time',
                'wrapTime': 'wrap_time',
                'location': 'location',
                'locationAddress': 'location_address',
                'notes': 'notes',
                'status': 'status'
            }
            
            json_fields = ['scenes', 'weather', 'crewCallTimes', 'castCallTimes', 'equipmentNeeded', 'meals']
            json_field_mapping = {
                'scenes': 'scenes',
                'weather': 'weather',
                'crewCallTimes': 'crew_call_times',
                'castCallTimes': 'cast_call_times',
                'equipmentNeeded': 'equipment_needed',
                'meals': 'meals'
            }
            
            for key, col in field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(body[key])
            
            for key, col in json_field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(Json(body[key]))
            
            if not updates:
                return JSONResponse({"success": False, "error": "No fields to update"}, status_code=400)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(day_id)
            
            cur.execute(f"""
                UPDATE production_shooting_days
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING *
            """, params)
            
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Shooting day not found"}, status_code=404)
            
            result = dict(row)
            if result.get('date'):
                result['date'] = str(result['date'])
            if result.get('call_time'):
                result['call_time'] = str(result['call_time'])
            if result.get('wrap_time'):
                result['wrap_time'] = str(result['wrap_time'])
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.delete("/api/production/shooting-days/{day_id}")
async def delete_production_shooting_day(day_id: str):
    """Delete a shooting day"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM production_shooting_days WHERE id = %s", (day_id,))
            conn.commit()
            return JSONResponse({"success": True, "message": "Shooting day deleted"})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# STRIPBOARD ENDPOINTS

@app.get("/api/production/{project_id}/stripboard")
async def get_production_stripboard(project_id: str):
    """Get stripboard strips for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_stripboard
                WHERE project_id = %s
                ORDER BY sort_order ASC
            """, (project_id,))
            rows = cur.fetchall()
            return JSONResponse({"success": True, "data": [serialize_db_row(r) for r in rows]})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/stripboard")
async def create_production_stripboard_strip(project_id: str, request: Request):
    """Create a stripboard strip"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            strip_id = body.get('id', f"strip-{uuid.uuid4()}")
            cur.execute("""
                INSERT INTO production_stripboard (
                    id, project_id, scene_id, scene_number, shooting_day_id,
                    day_number, sort_order, color, location, pages,
                    cast_ids, status, estimated_time, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                strip_id,
                project_id,
                body.get('sceneId'),
                body.get('sceneNumber'),
                body.get('shootingDayId'),
                body.get('dayNumber'),
                body.get('sortOrder', 0),
                body.get('color', '#4A5568'),
                body.get('location'),
                body.get('pages', 0),
                Json(body.get('castIds', [])),
                body.get('status', 'not-scheduled'),
                body.get('estimatedTime', 60),
                body.get('notes')
            ))
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": dict(row)})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.put("/api/production/stripboard/{strip_id}")
async def update_production_stripboard_strip(strip_id: str, request: Request):
    """Update a stripboard strip"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            updates = []
            params = []
            
            field_mapping = {
                'sceneId': 'scene_id',
                'sceneNumber': 'scene_number',
                'shootingDayId': 'shooting_day_id',
                'dayNumber': 'day_number',
                'sortOrder': 'sort_order',
                'color': 'color',
                'location': 'location',
                'pages': 'pages',
                'status': 'status',
                'estimatedTime': 'estimated_time',
                'notes': 'notes'
            }
            
            for key, col in field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(body[key])
            
            if 'castIds' in body:
                updates.append("cast_ids = %s")
                params.append(Json(body['castIds']))
            
            if not updates:
                return JSONResponse({"success": False, "error": "No fields to update"}, status_code=400)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(strip_id)
            
            cur.execute(f"""
                UPDATE production_stripboard
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING *
            """, params)
            
            row = cur.fetchone()
            conn.commit()
            
            if not row:
                return JSONResponse({"success": False, "error": "Strip not found"}, status_code=404)
            
            return JSONResponse({"success": True, "data": dict(row)})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.delete("/api/production/stripboard/{strip_id}")
async def delete_production_stripboard_strip(strip_id: str):
    """Delete a stripboard strip"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM production_stripboard WHERE id = %s", (strip_id,))
            conn.commit()
            return JSONResponse({"success": True, "message": "Strip deleted"})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# PRODUCTION CAST ENDPOINTS

@app.get("/api/production/{project_id}/cast")
async def get_production_cast(project_id: str):
    """Get cast members for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_cast
                WHERE project_id = %s
                ORDER BY character_name ASC
            """, (project_id,))
            rows = cur.fetchall()
            return JSONResponse({"success": True, "data": [serialize_db_row(r) for r in rows]})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/cast")
async def create_production_cast_member(project_id: str, request: Request):
    """Create a cast member"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cast_id = body.get('id', f"cast-{uuid.uuid4()}")
            cur.execute("""
                INSERT INTO production_cast (
                    id, project_id, name, character_name, scenes,
                    phone, email, availability, contract
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    character_name = EXCLUDED.character_name,
                    scenes = EXCLUDED.scenes,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    availability = EXCLUDED.availability,
                    contract = EXCLUDED.contract,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                cast_id,
                project_id,
                body.get('name'),
                body.get('characterName'),
                Json(body.get('scenes', [])),
                body.get('phone'),
                body.get('email'),
                Json(body.get('availability', {})),
                Json(body.get('contract', {}))
            ))
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": dict(row)})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# PRODUCTION CREW ENDPOINTS

@app.get("/api/production/{project_id}/crew")
async def get_production_crew(project_id: str):
    """Get crew members for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_crew
                WHERE project_id = %s
                ORDER BY department, role ASC
            """, (project_id,))
            rows = cur.fetchall()
            return JSONResponse({"success": True, "data": [serialize_db_row(r) for r in rows]})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/crew")
async def create_production_crew_member(project_id: str, request: Request):
    """Create a crew member"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            crew_id = body.get('id', f"crew-{uuid.uuid4()}")
            cur.execute("""
                INSERT INTO production_crew (
                    id, project_id, name, role, department,
                    phone, email, availability, rate, rate_type, union_affiliation, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    department = EXCLUDED.department,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    availability = EXCLUDED.availability,
                    rate = EXCLUDED.rate,
                    rate_type = EXCLUDED.rate_type,
                    union_affiliation = EXCLUDED.union_affiliation,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                crew_id,
                project_id,
                body.get('name'),
                body.get('role'),
                body.get('department'),
                body.get('phone'),
                body.get('email'),
                Json(body.get('availability', {})),
                body.get('rate'),
                body.get('rateType', 'daily'),
                body.get('unionAffiliation'),
                body.get('notes')
            ))
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": dict(row)})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# CALL SHEETS ENDPOINTS

@app.get("/api/production/{project_id}/call-sheets")
async def get_production_call_sheets(project_id: str):
    """Get call sheets for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_call_sheets
                WHERE project_id = %s
                ORDER BY date ASC
            """, (project_id,))
            rows = cur.fetchall()
            
            result = []
            for row in rows:
                item = dict(row)
                if item.get('date'):
                    item['date'] = str(item['date'])
                if item.get('general_call_time'):
                    item['general_call_time'] = str(item['general_call_time'])
                result.append(item)
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/call-sheets")
async def create_production_call_sheet(project_id: str, request: Request):
    """Create a call sheet"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            sheet_id = body.get('id', f"cs-{uuid.uuid4()}")
            cur.execute("""
                INSERT INTO production_call_sheets (
                    id, shooting_day_id, project_id, project_title, production_company,
                    director, producer, date, day_number, total_days, general_call_time,
                    crew_call_times, cast_call_times, scenes, location_address,
                    parking_info, catering_info, meals, weather_forecast,
                    special_instructions, emergency_contacts, department_notes, version, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    shooting_day_id = EXCLUDED.shooting_day_id,
                    project_title = EXCLUDED.project_title,
                    production_company = EXCLUDED.production_company,
                    director = EXCLUDED.director,
                    producer = EXCLUDED.producer,
                    date = EXCLUDED.date,
                    day_number = EXCLUDED.day_number,
                    total_days = EXCLUDED.total_days,
                    general_call_time = EXCLUDED.general_call_time,
                    crew_call_times = EXCLUDED.crew_call_times,
                    cast_call_times = EXCLUDED.cast_call_times,
                    scenes = EXCLUDED.scenes,
                    location_address = EXCLUDED.location_address,
                    parking_info = EXCLUDED.parking_info,
                    catering_info = EXCLUDED.catering_info,
                    meals = EXCLUDED.meals,
                    weather_forecast = EXCLUDED.weather_forecast,
                    special_instructions = EXCLUDED.special_instructions,
                    emergency_contacts = EXCLUDED.emergency_contacts,
                    department_notes = EXCLUDED.department_notes,
                    version = EXCLUDED.version,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                sheet_id,
                body.get('shootingDayId'),
                project_id,
                body.get('projectTitle', 'Untitled'),
                body.get('productionCompany'),
                body.get('director'),
                body.get('producer'),
                body.get('date'),
                body.get('dayNumber', 1),
                body.get('totalDays'),
                body.get('generalCallTime', '07:00'),
                Json(body.get('crewCallTimes', [])),
                Json(body.get('castCallTimes', [])),
                Json(body.get('scenes', [])),
                body.get('locationAddress'),
                body.get('parkingInfo'),
                body.get('cateringInfo'),
                Json(body.get('meals', [])),
                Json(body.get('weatherForecast', {})),
                body.get('specialInstructions'),
                Json(body.get('emergencyContacts', [])),
                Json(body.get('departmentNotes', {})),
                body.get('version', 1),
                body.get('status', 'draft')
            ))
            row = cur.fetchone()
            conn.commit()
            
            result = dict(row)
            if result.get('date'):
                result['date'] = str(result['date'])
            if result.get('general_call_time'):
                result['general_call_time'] = str(result['general_call_time'])
            
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# LIVE SET STATUS ENDPOINTS

@app.get("/api/production/{project_id}/live-set-status")
async def get_production_live_set_status(project_id: str):
    """Get live set status for a project"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM production_live_set_status
                WHERE project_id = %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (project_id,))
            row = cur.fetchone()
            
            if not row:
                return JSONResponse({"success": True, "data": None})
            
            result = dict(row)
            return JSONResponse({"success": True, "data": result})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/production/{project_id}/live-set-status")
async def update_production_live_set_status(project_id: str, request: Request):
    """Update live set status"""
    try:
        from tutorials_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            status_id = body.get('id', f"ls-{project_id}")
            cur.execute("""
                INSERT INTO production_live_set_status (
                    id, project_id, shooting_day_id, current_scene_id, current_shot_id,
                    status, current_setup, total_setups, pages_shot,
                    scenes_completed, scenes_partial, start_time, last_update_time,
                    estimated_wrap, today_takes, notes, last_updated_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    shooting_day_id = EXCLUDED.shooting_day_id,
                    current_scene_id = EXCLUDED.current_scene_id,
                    current_shot_id = EXCLUDED.current_shot_id,
                    status = EXCLUDED.status,
                    current_setup = EXCLUDED.current_setup,
                    total_setups = EXCLUDED.total_setups,
                    pages_shot = EXCLUDED.pages_shot,
                    scenes_completed = EXCLUDED.scenes_completed,
                    scenes_partial = EXCLUDED.scenes_partial,
                    start_time = EXCLUDED.start_time,
                    last_update_time = EXCLUDED.last_update_time,
                    estimated_wrap = EXCLUDED.estimated_wrap,
                    today_takes = EXCLUDED.today_takes,
                    notes = EXCLUDED.notes,
                    last_updated_by = EXCLUDED.last_updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                status_id,
                project_id,
                body.get('shootingDayId'),
                body.get('currentSceneId'),
                body.get('currentShotId'),
                body.get('status', 'standby'),
                body.get('currentSetup', 0),
                body.get('totalSetups', 0),
                body.get('pagesShot', 0),
                Json(body.get('scenesCompleted', [])),
                Json(body.get('scenesPartial', [])),
                body.get('startTime'),
                body.get('lastUpdateTime'),
                body.get('estimatedWrap'),
                Json(body.get('todayTakes', [])),
                body.get('notes'),
                body.get('lastUpdatedBy')
            ))
            row = cur.fetchone()
            conn.commit()
            
            return JSONResponse({"success": True, "data": dict(row)})
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


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

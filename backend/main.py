"""
Virtual Studio Backend - SAM 3D Body Avatar Generator
FastAPI service for generating 3D avatars from images using Meta SAM 3D Body
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import uuid
import base64
import json
from pathlib import Path

# Casting service imports
try:
    from casting_service import (
        get_projects as db_get_projects,
        get_project as db_get_project,
        save_project as db_save_project,
        delete_project as db_delete_project,
        health_check as db_health_check
    )
    CASTING_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Casting service not available: {e}")
    CASTING_SERVICE_AVAILABLE = False

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
    print(f"Warning: Virtual Studio service not available: {e}")
    VIRTUAL_STUDIO_SERVICE_AVAILABLE = False

# Casting Planner service imports
try:
    from casting_favorites_service import (
        init_casting_favorites_tables,
        get_favorites, add_favorite, remove_favorite, set_favorites,
        save_project as save_casting_project, get_projects as get_casting_projects,
        get_project as get_casting_project, delete_project as delete_casting_project,
        save_candidate, get_candidates, delete_candidate,
        save_role, get_roles, delete_role,
        save_crew_member, get_crew, delete_crew_member,
        save_location, get_locations, delete_location,
        save_prop, get_props, delete_prop,
        save_schedule, get_schedules, delete_schedule
    )
    CASTING_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Casting service not available: {e}")
    CASTING_SERVICE_AVAILABLE = False

app = FastAPI(
    title="Virtual Studio Avatar API",
    description="Generate 3D avatars from images using Meta SAM 3D Body",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("backend/uploads")
OUTPUT_DIR = Path(__file__).parent / "outputs"
RODIN_MODELS_DIR = Path(__file__).parent / "rodin_models"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RODIN_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for generated 3D models
app.mount("/api/models", StaticFiles(directory=str(RODIN_MODELS_DIR)), name="rodin_models")

sam3d_service = None
face_analysis = None
facexformer = None
flux_service = None
storyboard_service = None

@app.on_event("startup")
async def startup_event():
    global sam3d_service, face_analysis, facexformer, flux_service, storyboard_service
    from sam3d_service import SAM3DService
    from face_analysis_service import face_analysis_service
    from facexformer_service import facexformer_service
    from flux_service import flux_service as flux_svc
    from storyboard_image_service import storyboard_image_service
    sam3d_service = SAM3DService()
    face_analysis = face_analysis_service
    facexformer = facexformer_service
    flux_service = flux_svc
    storyboard_service = storyboard_image_service
    print("SAM 3D Body service initialized")
    print("Face analysis service initialized")
    print(f"FaceXFormer service initialized (enabled: {facexformer.is_enabled()})")
    print(f"FLUX service initialized (enabled: {flux_service.is_enabled()})")
    print(f"Storyboard Image Service initialized (enabled: {storyboard_service.enabled})")
    
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
    
    # Initialize Casting Planner tables
    if CASTING_SERVICE_AVAILABLE:
        try:
            init_casting_favorites_tables()
            print("Casting Planner tables initialized")
        except Exception as e:
            print(f"Warning: Could not initialize Casting tables: {e}")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Virtual Studio Avatar API"}

from casting_service import (
    get_projects as db_get_projects,
    get_project as db_get_project,
    save_project as db_save_project,
    delete_project as db_delete_project,
    health_check as db_health_check
)

@app.get("/api/health")
async def health_check():
    response: dict = {"status": "healthy"}
    
    if sam3d_service:
        response["sam3d"] = {
            "model_loaded": sam3d_service.model_loaded,
            "model_loading": sam3d_service.model_loading,
            "use_placeholder": sam3d_service.use_placeholder,
            "model_files_available": getattr(sam3d_service, 'model_files_available', False)
        }
    
    if facexformer:
        response["facexformer"] = {
            "enabled": facexformer.is_enabled(),
            "model_loaded": facexformer.is_model_loaded(),
            "model_loading": facexformer.model_loading
        }
    
    if flux_service:
        response["flux"] = {
            "enabled": flux_service.is_enabled(),
            "model_loaded": flux_service.is_model_loaded(),
            "model_loading": flux_service.model_loading
        }
    
    return response

@app.get("/api/ml/health")
async def ml_health_check():
    """ML service health check - alias for /api/health."""
    response: dict = {"status": "healthy", "ml_ready": True}
    
    if sam3d_service:
        response["sam3d"] = {
            "model_loaded": sam3d_service.model_loaded,
            "model_loading": sam3d_service.model_loading,
            "use_placeholder": sam3d_service.use_placeholder,
            "model_files_available": getattr(sam3d_service, 'model_files_available', False)
        }
    
    if facexformer:
        response["facexformer"] = {
            "enabled": facexformer.is_enabled(),
            "model_loaded": facexformer.is_model_loaded(),
            "model_loading": facexformer.model_loading
        }
    
    if flux_service:
        response["flux"] = {
            "enabled": flux_service.is_enabled(),
            "model_loaded": flux_service.is_model_loaded(),
            "model_loading": flux_service.model_loading
        }
    
    return response

# In-memory user settings storage (for development)
user_kv_store: dict = {}

@app.post("/api/user/kv")
async def store_user_kv(data: dict):
    """Store user key-value settings."""
    try:
        key = data.get("key")
        value = data.get("value")
        user_id = data.get("user_id", "default")
        
        if not key:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing 'key' in request body"}
            )
        
        if user_id not in user_kv_store:
            user_kv_store[user_id] = {}
        
        user_kv_store[user_id][key] = value
        
        return {"success": True, "key": key, "user_id": user_id}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/user/kv/{key}")
async def get_user_kv(key: str, user_id: str = "default"):
    """Get user key-value setting."""
    if user_id in user_kv_store and key in user_kv_store[user_id]:
        return {"key": key, "value": user_kv_store[user_id][key], "user_id": user_id}
    return {"key": key, "value": None, "user_id": user_id}

@app.post("/api/analytics")
async def track_analytics(data: dict):
    """Analytics tracking endpoint (logging stub for development)."""
    event_type = data.get("event", "unknown")
    return {"success": True, "event": event_type, "tracked": True}

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
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)
        
        if sam3d_service is None:
            raise HTTPException(status_code=503, detail="SAM 3D service not initialized")
        
        result = await sam3d_service.generate_avatar(str(input_path), str(output_path))
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
        
        return JSONResponse({
            "success": True,
            "request_id": request_id,
            "glb_url": f"/api/avatar/{request_id}.glb",
            "metadata": result.get("metadata", {})
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)

@app.get("/api/avatar/{request_id}.glb")
async def get_avatar(request_id: str):
    """Download the generated GLB avatar file."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return FileResponse(
        path=str(output_path),
        media_type="model/gltf-binary",
        filename=f"avatar_{request_id}.glb"
    )

@app.head("/api/avatar/{request_id}.glb")
async def head_avatar(request_id: str):
    """Check if avatar exists (for Babylon.js loader)."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    from starlette.responses import Response
    return Response(
        headers={
            "Content-Type": "model/gltf-binary",
            "Content-Length": str(output_path.stat().st_size)
        }
    )

@app.delete("/api/avatar/{request_id}")
async def delete_avatar(request_id: str):
    """Delete a generated avatar."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
    if output_path.exists():
        os.remove(output_path)
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
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
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
        
        response_data = {
            "success": True,
            "request_id": request_id,
            "glb_url": f"/api/avatar/{request_id}.glb",
            "metadata": result.get("metadata", {})
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


from rodin_service import rodin_service
from pydantic import BaseModel
from typing import List, Optional

# External data routes (Kartverket property analysis)
try:
    from routes.external_data import router as external_data_router
    app.include_router(external_data_router)
    print("External data routes loaded (Kartverket property analysis)")
except ImportError as e:
    print(f"Warning: External data routes not available: {e}")

class RodinGenerateRequest(BaseModel):
    prompt: str
    filename: str
    quality: str = "low"
    category: str = "misc"

class RodinBatchRequest(BaseModel):
    items: List[dict]
    quality: str = "low"

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
            "filename": result.get("filename")
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
    models = []
    for f in rodin_service.output_dir.glob("*.glb"):
        models.append({
            "filename": f.name,
            "url": f"/api/rodin/model/{f.name}",
            "size": f.stat().st_size
        })
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
# Casting Planner API Endpoints
# ============================================================================

@app.get("/api/casting/health")
async def casting_health_check():
    """Check if casting database is accessible"""
    if not CASTING_SERVICE_AVAILABLE:
        return JSONResponse({"status": "unavailable", "error": "Casting service not available"})
    
    try:
        is_healthy = db_health_check()
        return JSONResponse({
            "status": "healthy" if is_healthy else "unhealthy",
            "database": "connected" if is_healthy else "disconnected"
        })
    except Exception as e:
        return JSONResponse({"status": "unhealthy", "error": str(e)})


@app.get("/api/casting/projects")
async def get_casting_projects():
    """Get all casting projects"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    
    try:
        projects = db_get_projects()
        return JSONResponse(projects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/casting/projects/{project_id}")
async def get_casting_project(project_id: str):
    """Get a single casting project by ID"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    
    try:
        project = db_get_project(project_id)
        if project:
            return JSONResponse(project)
        else:
            raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/casting/projects")
async def create_or_update_casting_project(request: Request):
    """Create or update a casting project"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    
    try:
        # Parse request body
        try:
            project = await request.json()
        except Exception as e:
            print(f"Error parsing JSON body: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in request body: {str(e)}")
        
        # Log incoming request for debugging
        print(f"Received project data: {json.dumps(project, indent=2, default=str)}")
        
        # Validate required fields
        if not isinstance(project, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")
        
        # Generate ID if not provided
        if not project.get('id'):
            import uuid
            project['id'] = str(uuid.uuid4())
        
        # Log crew data specifically
        if 'crew' in project:
            print(f"Crew data in request: {len(project.get('crew', []))} members")
            print(f"Crew members: {json.dumps(project.get('crew', []), indent=2, default=str)}")
        
        # Log the project data for debugging
        print(f"Creating/updating casting project: {project.get('id')}, name: {project.get('name')}")
        
        success = db_save_project(project)
        if success:
            # Wait a moment for database commit to complete
            import time
            time.sleep(0.1)
            
            # Return the saved project - try multiple times if needed
            saved_project = None
            max_retries = 3
            for attempt in range(max_retries):
                saved_project = db_get_project(project['id'])
                if saved_project:
                    break
                if attempt < max_retries - 1:
                    time.sleep(0.2 * (attempt + 1))  # Exponential backoff
            
            if saved_project:
                # Log project data in saved project
                print(f"Project successfully saved and retrieved: id={saved_project.get('id')}, name={saved_project.get('name')}")
                print(f"Project has clientName: {bool(saved_project.get('clientName'))}")
                print(f"Project has clientEmail: {bool(saved_project.get('clientEmail'))}")
                print(f"Project has clientPhone: {bool(saved_project.get('clientPhone'))}")
                print(f"Project has location: {bool(saved_project.get('location'))}")
                print(f"Project has eventDate: {bool(saved_project.get('eventDate'))}")
                
                # Log crew data in saved project
                if 'crew' in saved_project:
                    print(f"Crew data in saved project: {len(saved_project.get('crew', []))} members")
                else:
                    print(f"WARNING: No crew data in saved project!")
                
                # Convert Decimal to float for JSON serialization
                from decimal import Decimal
                def convert_decimals(obj):
                    if isinstance(obj, dict):
                        return {k: convert_decimals(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_decimals(i) for i in obj]
                    elif isinstance(obj, Decimal):
                        return float(obj)
                    return obj
                
                return JSONResponse(convert_decimals(saved_project))
            else:
                error_msg = f"Project saved but could not be retrieved after {max_retries} attempts. Project ID: {project['id']}"
                print(f"ERROR: {error_msg}")
                raise HTTPException(status_code=500, detail=error_msg)
        else:
            error_msg = f"Failed to save project to database. Project ID: {project.get('id', 'unknown')}, Name: {project.get('name', 'unknown')}"
            print(f"ERROR: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Error creating/updating casting project: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_msg)


@app.delete("/api/casting/projects/{project_id}")
async def delete_casting_project(project_id: str):
    """Delete a casting project"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    
    try:
        success = db_delete_project(project_id)
        if success:
            return JSONResponse({"success": True, "message": "Project deleted"})
        else:
            raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        category = data.get('category', 'casting-planner')
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
        user_id = data.pop('userId', None)
        scene = save_scene(data, user_id)
        return JSONResponse({"success": True, "scene": scene})
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
# Casting Planner API Endpoints
# ============================================================================

@app.get("/api/casting/favorites/{project_id}/{favorite_type}")
async def api_get_favorites(project_id: str, favorite_type: str, user_id: Optional[str] = None):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        favorites = get_favorites(project_id, favorite_type, user_id)
        return JSONResponse({"success": True, "favorites": favorites})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/favorites/{project_id}/{favorite_type}")
async def api_set_favorites(project_id: str, favorite_type: str, request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        item_ids = data.get('itemIds', data.get('favorites', []))
        user_id = data.get('userId')
        set_favorites(project_id, favorite_type, item_ids, user_id)
        return JSONResponse({"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/favorites/{project_id}/{favorite_type}/add")
async def api_add_favorite(project_id: str, favorite_type: str, request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        item_id = data.get('itemId')
        user_id = data.get('userId')
        add_favorite(project_id, favorite_type, item_id, user_id)
        return JSONResponse({"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/favorites/{project_id}/{favorite_type}/remove")
async def api_remove_favorite(project_id: str, favorite_type: str, request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        item_id = data.get('itemId')
        user_id = data.get('userId')
        remove_favorite(project_id, favorite_type, item_id, user_id)
        return JSONResponse({"success": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects")
async def api_get_casting_projects(user_id: Optional[str] = None):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        projects = get_casting_projects(user_id)
        return JSONResponse({"success": True, "projects": projects})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}")
async def api_get_casting_project(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        project = get_casting_project(project_id)
        if project:
            return JSONResponse({"success": True, "project": project})
        raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/projects")
async def api_save_casting_project(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        user_id = data.pop('userId', None)
        project = save_casting_project(data, user_id)
        return JSONResponse({"success": True, "project": project})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/projects/{project_id}")
async def api_delete_casting_project(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_casting_project(project_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}/candidates")
async def api_get_candidates(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        candidates = get_candidates(project_id)
        return JSONResponse({"success": True, "candidates": candidates})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/candidates")
async def api_save_candidate(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        candidate = save_candidate(data)
        return JSONResponse({"success": True, "candidate": candidate})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/candidates/{candidate_id}")
async def api_delete_candidate(candidate_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_candidate(candidate_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Candidate not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CONSENT CRUD API ====================

@app.get("/api/casting/projects/{project_id}/candidates/{candidate_id}/consents")
async def api_get_consents(project_id: str, candidate_id: str):
    """Get all consents for a candidate"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, project_id, candidate_id, type, title, description,
                       signed, date, document, notes, access_code, invitation_status,
                       invitation_sent_at, signature_data, expires_at, template_id,
                       created_at, updated_at
                FROM casting_consents
                WHERE project_id = %s AND candidate_id = %s
                ORDER BY created_at DESC
            """, (project_id, candidate_id))
            rows = cur.fetchall()
            
            consents = []
            for row in rows:
                consent = {
                    'id': row['id'],
                    'projectId': row['project_id'],
                    'candidateId': row['candidate_id'],
                    'type': row['type'],
                    'title': row['title'],
                    'description': row['description'],
                    'signed': row['signed'] or row.get('granted', False),
                    'date': row['date'].isoformat() if row['date'] else None,
                    'document': row['document'],
                    'notes': row['notes'],
                    'accessCode': row['access_code'],
                    'invitationStatus': row['invitation_status'],
                    'invitationSentAt': row['invitation_sent_at'].isoformat() if row['invitation_sent_at'] else None,
                    'signatureData': row['signature_data'],
                    'expiresAt': row['expires_at'].isoformat() if row['expires_at'] else None,
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() if row['updated_at'] else None,
                }
                consents.append(consent)
            
            return JSONResponse({"success": True, "consents": consents})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/casting/consents")
async def api_save_consent(request: Request):
    """Create or update a consent (upsert)"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
        import json
        import uuid
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    consent_id = body.get('id')
    project_id = body.get('projectId')
    candidate_id = body.get('candidateId')
    consent_type = body.get('type')
    
    if not project_id or not candidate_id or not consent_type:
        return JSONResponse({"success": False, "error": "Missing required fields"}, status_code=400)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if consent_id:
                cur.execute("SELECT id FROM casting_consents WHERE id = %s", (consent_id,))
                exists = cur.fetchone() is not None
                
                if exists:
                    cur.execute("""
                        UPDATE casting_consents 
                        SET type = %s, title = %s, description = %s, signed = %s,
                            date = %s, document = %s, notes = %s, 
                            signature_data = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING id
                    """, (
                        consent_type,
                        body.get('title'),
                        body.get('description'),
                        body.get('signed', False),
                        body.get('date'),
                        body.get('document'),
                        body.get('notes'),
                        json.dumps(body.get('signatureData')) if body.get('signatureData') else None,
                        consent_id
                    ))
                else:
                    cur.execute("""
                        INSERT INTO casting_consents 
                        (id, project_id, candidate_id, type, title, description, signed, notes, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id
                    """, (
                        consent_id,
                        project_id,
                        candidate_id,
                        consent_type,
                        body.get('title'),
                        body.get('description'),
                        body.get('signed', False),
                        body.get('notes')
                    ))
            else:
                consent_id = f"consent-{uuid.uuid4().hex[:12]}"
                cur.execute("""
                    INSERT INTO casting_consents 
                    (id, project_id, candidate_id, type, title, description, signed, notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                """, (
                    consent_id,
                    project_id,
                    candidate_id,
                    consent_type,
                    body.get('title'),
                    body.get('description'),
                    body.get('signed', False),
                    body.get('notes')
                ))
            
            conn.commit()
            return JSONResponse({"success": True, "consentId": consent_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.delete("/api/casting/consents/{consent_id}")
async def api_delete_consent(consent_id: str):
    """Delete a consent"""
    try:
        from casting_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_consents WHERE id = %s", (consent_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            
            if deleted:
                return JSONResponse({"success": True})
            return JSONResponse({"success": False, "error": "Consent not found"}, status_code=404)
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ==================== CANDIDATE POOL API ====================

@app.get("/api/casting/candidate-pool")
async def api_get_candidate_pool():
    """Get all candidates from the global pool"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, contact_info, photos, videos, model_url, 
                       personality, notes, tags, created_at, updated_at
                FROM casting_candidate_pool
                ORDER BY name ASC
            """)
            rows = cur.fetchall()
            
            candidates = []
            for row in rows:
                candidates.append({
                    'id': row['id'],
                    'name': row['name'],
                    'contactInfo': row['contact_info'] or {},
                    'photos': row['photos'] or [],
                    'videos': row['videos'] or [],
                    'modelUrl': row['model_url'],
                    'personality': row['personality'],
                    'notes': row['notes'],
                    'tags': row['tags'] or [],
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() if row['updated_at'] else None,
                })
            
            return JSONResponse({"success": True, "candidates": candidates})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/casting/candidate-pool")
async def api_save_to_candidate_pool(request: Request):
    """Save a candidate to the global pool"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
        import uuid
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    candidate_id = body.get('id') or f"pool-{uuid.uuid4().hex[:12]}"
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM casting_candidate_pool WHERE id = %s", (candidate_id,))
            exists = cur.fetchone() is not None
            
            if exists:
                cur.execute("""
                    UPDATE casting_candidate_pool 
                    SET name = %s, contact_info = %s, photos = %s, videos = %s,
                        model_url = %s, personality = %s, notes = %s, tags = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (
                    body.get('name'),
                    Json(body.get('contactInfo', {})),
                    Json(body.get('photos', [])),
                    Json(body.get('videos', [])),
                    body.get('modelUrl'),
                    body.get('personality'),
                    body.get('notes'),
                    Json(body.get('tags', [])),
                    candidate_id
                ))
            else:
                cur.execute("""
                    INSERT INTO casting_candidate_pool 
                    (id, name, contact_info, photos, videos, model_url, personality, notes, tags)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    candidate_id,
                    body.get('name'),
                    Json(body.get('contactInfo', {})),
                    Json(body.get('photos', [])),
                    Json(body.get('videos', [])),
                    body.get('modelUrl'),
                    body.get('personality'),
                    body.get('notes'),
                    Json(body.get('tags', []))
                ))
            
            conn.commit()
            return JSONResponse({"success": True, "candidateId": candidate_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.delete("/api/casting/candidate-pool/{candidate_id}")
async def api_delete_from_candidate_pool(candidate_id: str):
    """Delete a candidate from the global pool"""
    try:
        from casting_service import get_db_connection
        import psycopg2
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_candidate_pool WHERE id = %s", (candidate_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            
            if deleted:
                return JSONResponse({"success": True})
            return JSONResponse({"success": False, "error": "Candidate not found"}, status_code=404)
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/casting/candidate-pool/import-to-project")
async def api_import_candidate_to_project(request: Request):
    """Import a candidate from the pool to a specific project"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
        import uuid
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    pool_candidate_id = body.get('poolCandidateId')
    target_project_id = body.get('targetProjectId')
    
    if not pool_candidate_id or not target_project_id:
        return JSONResponse({"success": False, "error": "Missing required fields"}, status_code=400)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_candidate_pool WHERE id = %s", (pool_candidate_id,))
            pool_candidate = cur.fetchone()
            
            if not pool_candidate:
                return JSONResponse({"success": False, "error": "Pool candidate not found"}, status_code=404)
            
            new_id = f"candidate-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO casting_candidates 
                (id, project_id, name, contact_info, photos, videos, model_url, 
                 personality, audition_notes, status, assigned_roles, emergency_contact)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                new_id,
                target_project_id,
                pool_candidate['name'],
                pool_candidate['contact_info'],
                pool_candidate['photos'],
                pool_candidate['videos'],
                pool_candidate['model_url'],
                pool_candidate['personality'],
                pool_candidate['notes'] or '',
                'pending',
                Json([]),
                Json({})
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "candidateId": new_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/casting/candidates/copy-to-project")
async def api_copy_candidate_to_project(request: Request):
    """Copy a candidate from one project to another"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
        import uuid
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    candidate_id = body.get('candidateId')
    target_project_id = body.get('targetProjectId')
    
    if not candidate_id or not target_project_id:
        return JSONResponse({"success": False, "error": "Missing required fields"}, status_code=400)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_candidates WHERE id = %s", (candidate_id,))
            source_candidate = cur.fetchone()
            
            if not source_candidate:
                return JSONResponse({"success": False, "error": "Candidate not found"}, status_code=404)
            
            new_id = f"candidate-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO casting_candidates 
                (id, project_id, name, contact_info, photos, videos, model_url, 
                 personality, audition_notes, status, assigned_roles, emergency_contact)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                new_id,
                target_project_id,
                source_candidate['name'],
                source_candidate['contact_info'],
                source_candidate['photos'],
                source_candidate['videos'],
                source_candidate['model_url'],
                source_candidate['personality'],
                source_candidate['audition_notes'] or '',
                'pending',
                Json([]),
                source_candidate['emergency_contact']
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "candidateId": new_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.post("/api/casting/candidates/save-to-pool")
async def api_save_candidate_to_pool(request: Request):
    """Save a project candidate to the global pool"""
    try:
        from casting_service import get_db_connection
        import psycopg2
        from psycopg2.extras import RealDictCursor, Json
        import uuid
    except ImportError:
        return JSONResponse({"success": False, "error": "Database not available"}, status_code=503)
    
    body = await request.json()
    candidate_id = body.get('candidateId')
    
    if not candidate_id:
        return JSONResponse({"success": False, "error": "Missing candidateId"}, status_code=400)
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_candidates WHERE id = %s", (candidate_id,))
            source_candidate = cur.fetchone()
            
            if not source_candidate:
                return JSONResponse({"success": False, "error": "Candidate not found"}, status_code=404)
            
            pool_id = f"pool-{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO casting_candidate_pool 
                (id, name, contact_info, photos, videos, model_url, personality, notes, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                pool_id,
                source_candidate['name'],
                source_candidate['contact_info'],
                source_candidate['photos'],
                source_candidate['videos'],
                source_candidate['model_url'],
                source_candidate['personality'],
                source_candidate['audition_notes'],
                Json([])
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "poolCandidateId": pool_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ========== Role Pool API Endpoints ==========

@app.get("/api/casting/role-pool")
async def get_role_pool():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, description, role_type, requirements, tags, notes, 
                       created_at, updated_at
                FROM casting_role_pool
                ORDER BY name ASC
            """)
            rows = cur.fetchall()
            roles = []
            for row in rows:
                role = {
                    'id': row['id'],
                    'name': row['name'],
                    'description': row['description'],
                    'roleType': row['role_type'],
                    'requirements': row['requirements'] if row['requirements'] else {},
                    'tags': row['tags'] if row['tags'] else [],
                    'notes': row['notes'],
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() if row['updated_at'] else None,
                }
                roles.append(role)
            return JSONResponse({"success": True, "roles": roles})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/role-pool")
async def save_to_role_pool(request: Request):
    conn = None
    try:
        body = await request.json()
        role_id = body.get('id') or f"pool_role_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM casting_role_pool WHERE id = %s", (role_id,))
            exists = cur.fetchone() is not None
            
            if exists:
                cur.execute("""
                    UPDATE casting_role_pool 
                    SET name = %s, description = %s, role_type = %s, requirements = %s,
                        tags = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (
                    body.get('name'),
                    body.get('description'),
                    body.get('roleType'),
                    Json(body.get('requirements', {})),
                    Json(body.get('tags', [])),
                    body.get('notes'),
                    role_id
                ))
            else:
                cur.execute("""
                    INSERT INTO casting_role_pool 
                    (id, name, description, role_type, requirements, tags, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    role_id,
                    body.get('name'),
                    body.get('description'),
                    body.get('roleType'),
                    Json(body.get('requirements', {})),
                    Json(body.get('tags', [])),
                    body.get('notes')
                ))
            
            conn.commit()
            return JSONResponse({"success": True, "roleId": role_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.delete("/api/casting/role-pool/{role_id}")
async def delete_from_role_pool(role_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_role_pool WHERE id = %s", (role_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            
            if deleted:
                return JSONResponse({"success": True})
            return JSONResponse({"success": False, "error": "Role not found"}, status_code=404)
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/role-pool/import-to-project")
async def import_role_to_project(request: Request):
    conn = None
    try:
        body = await request.json()
        pool_role_id = body.get('poolRoleId')
        target_project_id = body.get('targetProjectId')
        
        if not pool_role_id or not target_project_id:
            return JSONResponse({"success": False, "error": "Missing required fields"}, status_code=400)
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_role_pool WHERE id = %s", (pool_role_id,))
            pool_role = cur.fetchone()
            
            if not pool_role:
                return JSONResponse({"success": False, "error": "Pool role not found"}, status_code=404)
            
            new_role_id = f"role_{uuid.uuid4().hex[:12]}"
            role_data = {
                'roleType': pool_role['role_type'],
                'requirements': pool_role['requirements'] if pool_role['requirements'] else {},
                'tags': pool_role['tags'] if pool_role['tags'] else [],
                'notes': pool_role['notes'],
                'importedFromPool': pool_role_id,
            }
            
            cur.execute("""
                INSERT INTO casting_roles (id, project_id, name, description, role_data)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                new_role_id,
                target_project_id,
                pool_role['name'],
                pool_role['description'],
                Json(role_data)
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "roleId": new_role_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/roles/save-to-pool")
async def save_role_to_pool(request: Request):
    conn = None
    try:
        body = await request.json()
        role_id = body.get('roleId')
        
        if not role_id:
            return JSONResponse({"success": False, "error": "Missing roleId"}, status_code=400)
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_roles WHERE id = %s", (role_id,))
            source_role = cur.fetchone()
            
            if not source_role:
                return JSONResponse({"success": False, "error": "Role not found"}, status_code=404)
            
            pool_id = f"pool_role_{uuid.uuid4().hex[:12]}"
            role_data = source_role['role_data'] if source_role['role_data'] else {}
            
            cur.execute("""
                INSERT INTO casting_role_pool 
                (id, name, description, role_type, requirements, tags, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                pool_id,
                source_role['name'],
                source_role['description'],
                role_data.get('roleType'),
                Json(role_data.get('requirements', {})),
                Json(role_data.get('tags', [])),
                role_data.get('notes')
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "poolRoleId": pool_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ========== Audition Pool API Endpoints ==========

@app.get("/api/casting/audition-pool")
async def get_audition_pool():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, title, description, audition_type, duration_minutes, location,
                       requirements, tags, notes, created_at, updated_at
                FROM casting_audition_pool
                ORDER BY title ASC
            """)
            rows = cur.fetchall()
            auditions = []
            for row in rows:
                audition = {
                    'id': row['id'],
                    'title': row['title'],
                    'description': row['description'],
                    'auditionType': row['audition_type'],
                    'durationMinutes': row['duration_minutes'],
                    'location': row['location'],
                    'requirements': row['requirements'] if row['requirements'] else {},
                    'tags': row['tags'] if row['tags'] else [],
                    'notes': row['notes'],
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() if row['updated_at'] else None,
                }
                auditions.append(audition)
            return JSONResponse({"success": True, "auditions": auditions})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/audition-pool")
async def save_to_audition_pool(request: Request):
    conn = None
    try:
        body = await request.json()
        audition_id = body.get('id') or f"pool_audition_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM casting_audition_pool WHERE id = %s", (audition_id,))
            exists = cur.fetchone() is not None
            
            if exists:
                cur.execute("""
                    UPDATE casting_audition_pool 
                    SET title = %s, description = %s, audition_type = %s, duration_minutes = %s,
                        location = %s, requirements = %s, tags = %s, notes = %s, 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (
                    body.get('title'),
                    body.get('description'),
                    body.get('auditionType'),
                    body.get('durationMinutes', 30),
                    body.get('location'),
                    Json(body.get('requirements', {})),
                    Json(body.get('tags', [])),
                    body.get('notes'),
                    audition_id
                ))
            else:
                cur.execute("""
                    INSERT INTO casting_audition_pool 
                    (id, title, description, audition_type, duration_minutes, location, requirements, tags, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    audition_id,
                    body.get('title'),
                    body.get('description'),
                    body.get('auditionType'),
                    body.get('durationMinutes', 30),
                    body.get('location'),
                    Json(body.get('requirements', {})),
                    Json(body.get('tags', [])),
                    body.get('notes')
                ))
            
            conn.commit()
            return JSONResponse({"success": True, "auditionId": audition_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.delete("/api/casting/audition-pool/{audition_id}")
async def delete_from_audition_pool(audition_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_audition_pool WHERE id = %s", (audition_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            
            if deleted:
                return JSONResponse({"success": True})
            return JSONResponse({"success": False, "error": "Audition not found"}, status_code=404)
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/audition-pool/import-to-project")
async def import_audition_to_project(request: Request):
    conn = None
    try:
        body = await request.json()
        pool_audition_id = body.get('poolAuditionId')
        target_project_id = body.get('targetProjectId')
        
        if not pool_audition_id or not target_project_id:
            return JSONResponse({"success": False, "error": "Missing required fields"}, status_code=400)
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_audition_pool WHERE id = %s", (pool_audition_id,))
            pool_audition = cur.fetchone()
            
            if not pool_audition:
                return JSONResponse({"success": False, "error": "Pool audition not found"}, status_code=404)
            
            new_schedule_id = f"schedule_{uuid.uuid4().hex[:12]}"
            schedule_data = {
                'auditionType': pool_audition['audition_type'],
                'durationMinutes': pool_audition['duration_minutes'],
                'location': pool_audition['location'],
                'requirements': pool_audition['requirements'] if pool_audition['requirements'] else {},
                'tags': pool_audition['tags'] if pool_audition['tags'] else [],
                'notes': pool_audition['notes'],
                'importedFromPool': pool_audition_id,
            }
            
            cur.execute("""
                INSERT INTO casting_schedules (id, project_id, title, schedule_data)
                VALUES (%s, %s, %s, %s)
            """, (
                new_schedule_id,
                target_project_id,
                pool_audition['title'],
                Json(schedule_data)
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "scheduleId": new_schedule_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/schedules/save-to-pool")
async def save_schedule_to_pool(request: Request):
    conn = None
    try:
        body = await request.json()
        schedule_id = body.get('scheduleId')
        
        if not schedule_id:
            return JSONResponse({"success": False, "error": "Missing scheduleId"}, status_code=400)
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM casting_schedules WHERE id = %s", (schedule_id,))
            source_schedule = cur.fetchone()
            
            if not source_schedule:
                return JSONResponse({"success": False, "error": "Schedule not found"}, status_code=404)
            
            pool_id = f"pool_audition_{uuid.uuid4().hex[:12]}"
            schedule_data = source_schedule['schedule_data'] if source_schedule['schedule_data'] else {}
            
            cur.execute("""
                INSERT INTO casting_audition_pool 
                (id, title, description, audition_type, duration_minutes, location, requirements, tags, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                pool_id,
                source_schedule['title'],
                schedule_data.get('description', ''),
                schedule_data.get('auditionType'),
                schedule_data.get('durationMinutes', 30),
                schedule_data.get('location'),
                Json(schedule_data.get('requirements', {})),
                Json(schedule_data.get('tags', [])),
                schedule_data.get('notes')
            ))
            
            conn.commit()
            return JSONResponse({"success": True, "poolAuditionId": pool_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


# ========== Post-Audition Workflow API Endpoints ==========

@app.put("/api/casting/candidates/{candidate_id}/workflow-status")
async def update_candidate_workflow_status(candidate_id: str, request: Request):
    """Update candidate workflow status"""
    conn = None
    try:
        body = await request.json()
        workflow_status = body.get('workflowStatus')
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE casting_candidates 
                SET workflow_status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (workflow_status, candidate_id))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.put("/api/casting/candidates/{candidate_id}/audition-result")
async def update_candidate_audition_result(candidate_id: str, request: Request):
    """Update candidate audition rating and notes"""
    conn = None
    try:
        body = await request.json()
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE casting_candidates 
                SET audition_rating = %s, 
                    audition_notes = %s,
                    audition_date = %s,
                    workflow_status = CASE WHEN workflow_status = 'pending' THEN 'auditioned' ELSE workflow_status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                body.get('rating'),
                body.get('notes'),
                body.get('auditionDate'),
                candidate_id
            ))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

# ========== Offers API Endpoints ==========

@app.get("/api/casting/projects/{project_id}/offers")
async def get_project_offers(project_id: str):
    """Get all offers for a project"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT o.*, c.name as candidate_name, r.name as role_name
                FROM casting_offers o
                LEFT JOIN casting_candidates c ON o.candidate_id = c.id
                LEFT JOIN casting_roles r ON o.role_id = r.id
                WHERE o.project_id = %s
                ORDER BY o.created_at DESC
            """, (project_id,))
            rows = cur.fetchall()
            offers = []
            for row in rows:
                offer = dict(row)
                for key in ['offer_date', 'response_deadline', 'response_date', 'created_at', 'updated_at']:
                    if offer.get(key):
                        offer[key] = offer[key].isoformat()
                offers.append(offer)
            return JSONResponse({"success": True, "offers": offers})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/offers")
async def create_offer(request: Request):
    """Create a new offer"""
    conn = None
    try:
        body = await request.json()
        offer_id = f"offer_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO casting_offers 
                (id, project_id, candidate_id, role_id, response_deadline, compensation, terms, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                offer_id,
                body.get('projectId'),
                body.get('candidateId'),
                body.get('roleId'),
                body.get('responseDeadline'),
                body.get('compensation'),
                body.get('terms'),
                body.get('notes')
            ))
            
            # Update candidate workflow status
            cur.execute("""
                UPDATE casting_candidates 
                SET workflow_status = 'offer_sent', offer_sent_date = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (body.get('candidateId'),))
            
            conn.commit()
            return JSONResponse({"success": True, "offerId": offer_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.put("/api/casting/offers/{offer_id}/respond")
async def respond_to_offer(offer_id: str, request: Request):
    """Record response to offer (accepted/declined)"""
    conn = None
    try:
        body = await request.json()
        status = body.get('status')  # 'accepted' or 'declined'
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE casting_offers 
                SET status = %s, response_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING candidate_id
            """, (status, offer_id))
            result = cur.fetchone()
            
            if result and status == 'accepted':
                cur.execute("""
                    UPDATE casting_candidates 
                    SET workflow_status = 'confirmed', offer_accepted_date = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (result['candidate_id'],))
            elif result and status == 'declined':
                cur.execute("""
                    UPDATE casting_candidates 
                    SET workflow_status = 'declined'
                    WHERE id = %s
                """, (result['candidate_id'],))
            
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

# ========== Contracts API Endpoints ==========

@app.get("/api/casting/projects/{project_id}/contracts")
async def get_project_contracts(project_id: str):
    """Get all contracts for a project"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT ct.*, c.name as candidate_name, r.name as role_name
                FROM casting_contracts ct
                LEFT JOIN casting_candidates c ON ct.candidate_id = c.id
                LEFT JOIN casting_roles r ON ct.role_id = r.id
                WHERE ct.project_id = %s
                ORDER BY ct.created_at DESC
            """, (project_id,))
            rows = cur.fetchall()
            contracts = []
            for row in rows:
                contract = dict(row)
                for key in ['start_date', 'end_date', 'signed_date', 'created_at', 'updated_at']:
                    if contract.get(key):
                        contract[key] = contract[key].isoformat() if hasattr(contract[key], 'isoformat') else str(contract[key])
                contracts.append(contract)
            return JSONResponse({"success": True, "contracts": contracts})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/contracts")
async def create_contract(request: Request):
    """Create a new contract"""
    conn = None
    try:
        body = await request.json()
        contract_id = f"contract_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO casting_contracts 
                (id, project_id, candidate_id, offer_id, role_id, contract_type, 
                 start_date, end_date, compensation, terms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                contract_id,
                body.get('projectId'),
                body.get('candidateId'),
                body.get('offerId'),
                body.get('roleId'),
                body.get('contractType'),
                body.get('startDate'),
                body.get('endDate'),
                body.get('compensation'),
                body.get('terms')
            ))
            
            # Update candidate contract status
            cur.execute("""
                UPDATE casting_candidates 
                SET contract_status = 'pending'
                WHERE id = %s
            """, (body.get('candidateId'),))
            
            conn.commit()
            return JSONResponse({"success": True, "contractId": contract_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.put("/api/casting/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, request: Request):
    """Mark contract as signed"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE casting_contracts 
                SET status = 'signed', signed_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING candidate_id
            """, (contract_id,))
            result = cur.fetchone()
            
            if result:
                cur.execute("""
                    UPDATE casting_candidates 
                    SET contract_status = 'signed', contract_signed_date = CURRENT_TIMESTAMP, workflow_status = 'contracted'
                    WHERE id = %s
                """, (result['candidate_id'],))
            
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

# ========== Calendar Events API Endpoints ==========

@app.get("/api/casting/projects/{project_id}/calendar-events")
async def get_calendar_events(project_id: str):
    """Get all calendar events for a project"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_calendar_events
                WHERE project_id = %s
                ORDER BY start_time ASC
            """, (project_id,))
            rows = cur.fetchall()
            events = []
            for row in rows:
                event = dict(row)
                for key in ['start_time', 'end_time', 'created_at', 'updated_at']:
                    if event.get(key):
                        event[key] = event[key].isoformat()
                events.append(event)
            return JSONResponse({"success": True, "events": events})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.post("/api/casting/calendar-events")
async def create_calendar_event(request: Request):
    """Create a new calendar event"""
    conn = None
    try:
        body = await request.json()
        event_id = f"event_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO casting_calendar_events 
                (id, project_id, title, description, event_type, start_time, end_time, 
                 location_id, all_day, candidate_ids, crew_ids, shot_list_ids, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                event_id,
                body.get('projectId'),
                body.get('title'),
                body.get('description'),
                body.get('eventType', 'general'),
                body.get('startTime'),
                body.get('endTime'),
                body.get('locationId'),
                body.get('allDay', False),
                Json(body.get('candidateIds', [])),
                Json(body.get('crewIds', [])),
                Json(body.get('shotListIds', [])),
                body.get('notes')
            ))
            conn.commit()
            return JSONResponse({"success": True, "eventId": event_id})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.put("/api/casting/calendar-events/{event_id}")
async def update_calendar_event(event_id: str, request: Request):
    """Update a calendar event"""
    conn = None
    try:
        body = await request.json()
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE casting_calendar_events 
                SET title = %s, description = %s, event_type = %s, start_time = %s, end_time = %s,
                    location_id = %s, all_day = %s, candidate_ids = %s, crew_ids = %s, 
                    shot_list_ids = %s, notes = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                body.get('title'),
                body.get('description'),
                body.get('eventType'),
                body.get('startTime'),
                body.get('endTime'),
                body.get('locationId'),
                body.get('allDay', False),
                Json(body.get('candidateIds', [])),
                Json(body.get('crewIds', [])),
                Json(body.get('shotListIds', [])),
                body.get('notes'),
                body.get('status', 'scheduled'),
                event_id
            ))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.delete("/api/casting/calendar-events/{event_id}")
async def delete_calendar_event(event_id: str):
    """Delete a calendar event"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_calendar_events WHERE id = %s", (event_id,))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@app.put("/api/casting/candidates/{candidate_id}/shot-assignments")
async def update_candidate_shot_assignments(candidate_id: str, request: Request):
    """Assign candidate to shots"""
    conn = None
    try:
        body = await request.json()
        
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE casting_candidates 
                SET shot_assignments = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (Json(body.get('shotAssignments', [])), candidate_id))
            conn.commit()
            return JSONResponse({"success": True})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@app.get("/api/casting/projects/{project_id}/roles")
async def api_get_roles(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        roles = get_roles(project_id)
        return JSONResponse({"success": True, "roles": roles})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/roles")
async def api_save_role(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        role = save_role(data)
        return JSONResponse({"success": True, "role": role})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/roles/{role_id}")
async def api_delete_role(role_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_role(role_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Role not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}/crew")
async def api_get_crew(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        crew = get_crew(project_id)
        return JSONResponse({"success": True, "crew": crew})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/crew")
async def api_save_crew(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        crew = save_crew_member(data)
        return JSONResponse({"success": True, "crew": crew})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/crew/{crew_id}")
async def api_delete_crew(crew_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_crew_member(crew_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Crew member not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/crew/{crew_id}/availability")
async def api_get_crew_availability(crew_id: str, start_date: str = None, end_date: str = None):
    """Get availability records for a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM crew_availability WHERE crew_id = %s"
            params = [crew_id]
            if start_date and end_date:
                query += " AND start_date <= %s AND end_date >= %s"
                params.extend([end_date, start_date])
            query += " ORDER BY start_date"
            cur.execute(query, params)
            availability = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "availability": [dict(a) for a in availability]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/crew/{crew_id}/availability")
async def api_save_crew_availability(crew_id: str, request: Request):
    """Save availability record for a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        import uuid
        availability_id = data.get('id') or str(uuid.uuid4())
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO crew_availability (id, crew_id, project_id, start_date, end_date, status, is_recurring, recurrence_pattern, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    status = EXCLUDED.status,
                    is_recurring = EXCLUDED.is_recurring,
                    recurrence_pattern = EXCLUDED.recurrence_pattern,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                availability_id,
                crew_id,
                data.get('project_id'),
                data.get('start_date'),
                data.get('end_date'),
                data.get('status', 'available'),
                data.get('is_recurring', False),
                data.get('recurrence_pattern'),
                data.get('notes')
            ))
            result = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "availability": dict(result)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/crew/{crew_id}/availability/{availability_id}")
async def api_delete_crew_availability(crew_id: str, availability_id: str):
    """Delete an availability record"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM crew_availability WHERE id = %s AND crew_id = %s", (availability_id, crew_id))
            conn.commit()
            deleted = cur.rowcount > 0
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Availability record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/crew/{crew_id}/notifications")
async def api_get_crew_notifications(crew_id: str, status: str = None):
    """Get notifications for a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM crew_notifications WHERE crew_id = %s"
            params = [crew_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            query += " ORDER BY created_at DESC LIMIT 50"
            cur.execute(query, params)
            notifications = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "notifications": [dict(n) for n in notifications]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/crew/{crew_id}/notifications")
async def api_create_crew_notification(crew_id: str, request: Request):
    """Create a notification for a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        import uuid
        import json
        notification_id = str(uuid.uuid4())
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO crew_notifications (id, crew_id, project_id, event_id, notification_type, channel, title, message, payload, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                notification_id,
                crew_id,
                data.get('project_id'),
                data.get('event_id'),
                data.get('notification_type', 'assignment'),
                data.get('channel', 'in_app'),
                data.get('title', 'Ny tildeling'),
                data.get('message'),
                json.dumps(data.get('payload', {})),
                'pending'
            ))
            result = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "notification": dict(result)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/casting/notifications/{notification_id}/read")
async def api_mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE crew_notifications SET status = 'read', read_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *
            """, (notification_id,))
            result = cur.fetchone()
            conn.commit()
        conn.close()
        if result:
            return JSONResponse({"success": True, "notification": dict(result)})
        raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/crew/{crew_id}/conflicts")
async def api_check_crew_conflicts(crew_id: str, start_date: str, end_date: str):
    """Check for scheduling conflicts for a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        import json
        conn = get_db_connection()
        conflicts = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_calendar_events 
                WHERE crew_ids::jsonb @> %s::jsonb
                AND start_time::date <= %s AND (end_time::date >= %s OR end_time IS NULL)
                ORDER BY start_time
            """, (json.dumps([crew_id]), end_date, start_date))
            events = cur.fetchall()
            
            cur.execute("""
                SELECT * FROM crew_availability 
                WHERE crew_id = %s AND status = 'unavailable'
                AND start_date <= %s AND end_date >= %s
            """, (crew_id, end_date, start_date))
            unavailable = cur.fetchall()
        conn.close()
        
        for event in events:
            conflicts.append({
                "type": "event",
                "id": event['id'],
                "title": event['title'],
                "start_time": str(event['start_time']),
                "end_time": str(event['end_time']) if event['end_time'] else None
            })
        
        for block in unavailable:
            conflicts.append({
                "type": "unavailable",
                "id": block['id'],
                "start_date": str(block['start_date']),
                "end_date": str(block['end_date']),
                "notes": block['notes']
            })
        
        return JSONResponse({"success": True, "conflicts": conflicts, "has_conflicts": len(conflicts) > 0})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}/locations")
async def api_get_locations(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        locations = get_locations(project_id)
        return JSONResponse({"success": True, "locations": locations})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/locations")
async def api_save_location(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        location = save_location(data)
        return JSONResponse({"success": True, "location": location})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/locations/{location_id}")
async def api_delete_location(location_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_location(location_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Location not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}/props")
async def api_get_props(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        props = get_props(project_id)
        return JSONResponse({"success": True, "props": props})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/props")
async def api_save_prop(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        prop = save_prop(data)
        return JSONResponse({"success": True, "prop": prop})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/props/{prop_id}")
async def api_delete_prop(prop_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_prop(prop_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Prop not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Equipment/Assets API Endpoints (Utstyr)
# ============================================================================

@app.get("/api/casting/projects/{project_id}/equipment")
async def api_get_equipment(project_id: str):
    """Get all equipment for a project"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT e.*, 
                    COALESCE(
                        (SELECT json_agg(json_build_object('crew_id', a.crew_id, 'role', a.role))
                         FROM casting_equipment_assignments a WHERE a.equipment_id = e.id), '[]'
                    ) as assignees,
                    l.name as location_name
                FROM casting_equipment e
                LEFT JOIN casting_locations l ON e.primary_location_id = l.id
                WHERE e.project_id = %s
                ORDER BY e.name
            """, (project_id,))
            equipment = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "equipment": [dict(e) for e in equipment]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/equipment")
async def api_create_equipment(request: Request):
    """Create new equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        import uuid
        data = await request.json()
        equipment_id = f"equipment_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO casting_equipment 
                (id, project_id, name, description, category, brand, model, serial_number, 
                 quantity, condition, primary_location_id, notes, image_url, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                equipment_id,
                data.get('projectId'),
                data.get('name'),
                data.get('description'),
                data.get('category'),
                data.get('brand'),
                data.get('model'),
                data.get('serialNumber'),
                data.get('quantity', 1),
                data.get('condition', 'good'),
                data.get('primaryLocationId'),
                data.get('notes'),
                data.get('imageUrl'),
                data.get('status', 'available')
            ))
            equipment = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "equipment": dict(equipment)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/casting/equipment/{equipment_id}")
async def api_update_equipment(equipment_id: str, request: Request):
    """Update equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE casting_equipment SET
                    name = COALESCE(%s, name),
                    description = %s,
                    category = %s,
                    brand = %s,
                    model = %s,
                    serial_number = %s,
                    quantity = COALESCE(%s, quantity),
                    condition = COALESCE(%s, condition),
                    primary_location_id = %s,
                    notes = %s,
                    image_url = %s,
                    status = COALESCE(%s, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *
            """, (
                data.get('name'),
                data.get('description'),
                data.get('category'),
                data.get('brand'),
                data.get('model'),
                data.get('serialNumber'),
                data.get('quantity'),
                data.get('condition'),
                data.get('primaryLocationId'),
                data.get('notes'),
                data.get('imageUrl'),
                data.get('status'),
                equipment_id
            ))
            equipment = cur.fetchone()
            conn.commit()
        conn.close()
        if equipment:
            return JSONResponse({"success": True, "equipment": dict(equipment)})
        raise HTTPException(status_code=404, detail="Equipment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/equipment/{equipment_id}")
async def api_delete_equipment(equipment_id: str):
    """Delete equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_equipment_assignments WHERE equipment_id = %s", (equipment_id,))
            cur.execute("DELETE FROM casting_equipment_bookings WHERE equipment_id = %s", (equipment_id,))
            cur.execute("DELETE FROM casting_equipment_availability WHERE equipment_id = %s", (equipment_id,))
            cur.execute("DELETE FROM casting_equipment WHERE id = %s RETURNING id", (equipment_id,))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Equipment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/equipment/{equipment_id}/assign")
async def api_assign_equipment(equipment_id: str, request: Request):
    """Assign crew member to equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        import uuid
        data = await request.json()
        assignment_id = f"equip_assign_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO casting_equipment_assignments (id, equipment_id, crew_id, role, notes)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (equipment_id, crew_id) DO UPDATE SET role = EXCLUDED.role, notes = EXCLUDED.notes
                RETURNING *
            """, (
                assignment_id,
                equipment_id,
                data.get('crewId'),
                data.get('role', 'responsible'),
                data.get('notes')
            ))
            assignment = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "assignment": dict(assignment)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/equipment/{equipment_id}/assign/{crew_id}")
async def api_unassign_equipment(equipment_id: str, crew_id: str):
    """Remove crew member assignment from equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM casting_equipment_assignments 
                WHERE equipment_id = %s AND crew_id = %s RETURNING id
            """, (equipment_id, crew_id))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Assignment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/equipment/{equipment_id}/bookings")
async def api_get_equipment_bookings(equipment_id: str):
    """Get all bookings for equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_equipment_bookings 
                WHERE equipment_id = %s ORDER BY start_date
            """, (equipment_id,))
            bookings = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "bookings": [dict(b) for b in bookings]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/equipment/{equipment_id}/bookings")
async def api_create_equipment_booking(equipment_id: str, request: Request):
    """Create equipment booking"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        import uuid
        data = await request.json()
        booking_id = f"equip_book_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO casting_equipment_bookings 
                (id, equipment_id, event_id, project_id, booked_by, start_date, end_date, 
                 start_time, end_time, quantity, purpose, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                booking_id,
                equipment_id,
                data.get('eventId'),
                data.get('projectId'),
                data.get('bookedBy'),
                data.get('startDate'),
                data.get('endDate'),
                data.get('startTime'),
                data.get('endTime'),
                data.get('quantity', 1),
                data.get('purpose'),
                data.get('status', 'confirmed'),
                data.get('notes')
            ))
            booking = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "booking": dict(booking)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/equipment/bookings/{booking_id}")
async def api_delete_equipment_booking(booking_id: str):
    """Delete equipment booking"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_equipment_bookings WHERE id = %s RETURNING id", (booking_id,))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Booking not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/equipment/{equipment_id}/availability")
async def api_get_equipment_availability(equipment_id: str):
    """Get availability blocks for equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_equipment_availability 
                WHERE equipment_id = %s ORDER BY start_date
            """, (equipment_id,))
            availability = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "availability": [dict(a) for a in availability]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/equipment/{equipment_id}/availability")
async def api_create_equipment_availability(equipment_id: str, request: Request):
    """Create equipment availability block (service, unavailable)"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        import uuid
        data = await request.json()
        availability_id = f"equip_avail_{uuid.uuid4().hex[:12]}"
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO casting_equipment_availability 
                (id, equipment_id, start_date, end_date, status, reason, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                availability_id,
                equipment_id,
                data.get('startDate'),
                data.get('endDate'),
                data.get('status', 'unavailable'),
                data.get('reason'),
                data.get('notes')
            ))
            availability = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "availability": dict(availability)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/equipment/availability/{availability_id}")
async def api_delete_equipment_availability(availability_id: str):
    """Delete equipment availability block"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM casting_equipment_availability WHERE id = %s RETURNING id", (availability_id,))
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Availability block not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/equipment/{equipment_id}/conflicts")
async def api_check_equipment_conflicts(equipment_id: str, start_date: str, end_date: str):
    """Check for booking conflicts for equipment"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        conflicts = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_equipment_bookings 
                WHERE equipment_id = %s AND status != 'cancelled'
                AND start_date <= %s AND end_date >= %s
                ORDER BY start_date
            """, (equipment_id, end_date, start_date))
            bookings = cur.fetchall()
            
            cur.execute("""
                SELECT * FROM casting_equipment_availability 
                WHERE equipment_id = %s AND status IN ('unavailable', 'service')
                AND start_date <= %s AND end_date >= %s
            """, (equipment_id, end_date, start_date))
            unavailable = cur.fetchall()
        conn.close()
        
        for booking in bookings:
            conflicts.append({
                "type": "booking",
                "id": booking['id'],
                "start_date": str(booking['start_date']),
                "end_date": str(booking['end_date']),
                "purpose": booking['purpose'],
                "status": booking['status']
            })
        
        for block in unavailable:
            conflicts.append({
                "type": block['status'],
                "id": block['id'],
                "start_date": str(block['start_date']),
                "end_date": str(block['end_date']),
                "reason": block['reason']
            })
        
        return JSONResponse({
            "success": True, 
            "conflicts": conflicts, 
            "has_conflicts": len(conflicts) > 0
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/locations/{location_id}/equipment")
async def api_get_equipment_at_location(location_id: str):
    """Get all equipment stored at a location"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM casting_equipment 
                WHERE primary_location_id = %s
                ORDER BY name
            """, (location_id,))
            equipment = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "equipment": [dict(e) for e in equipment]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/crew/{crew_id}/equipment")
async def api_get_crew_equipment(crew_id: str):
    """Get all equipment assigned to a crew member"""
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT e.*, a.role as assignment_role
                FROM casting_equipment e
                JOIN casting_equipment_assignments a ON e.id = a.equipment_id
                WHERE a.crew_id = %s
                ORDER BY e.name
            """, (crew_id,))
            equipment = cur.fetchall()
        conn.close()
        return JSONResponse({"success": True, "equipment": [dict(e) for e in equipment]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/casting/projects/{project_id}/schedules")
async def api_get_schedules(project_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        schedules = get_schedules(project_id)
        return JSONResponse({"success": True, "schedules": schedules})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/casting/schedules")
async def api_save_schedule(request: Request):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        data = await request.json()
        schedule = save_schedule(data)
        return JSONResponse({"success": True, "schedule": schedule})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/casting/schedules/{schedule_id}")
async def api_delete_schedule(schedule_id: str):
    if not CASTING_SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Casting service not available")
    try:
        success = delete_schedule(schedule_id)
        if success:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Schedule not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
        from casting_service import get_db_connection
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
        from casting_service import get_db_connection
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
        from casting_service import get_db_connection
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
        from casting_service import get_db_connection
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
        from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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
            from casting_service import get_db_connection
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

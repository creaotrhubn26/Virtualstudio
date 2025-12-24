"""
Virtual Studio Backend - SAM 3D Body Avatar Generator
FastAPI service for generating 3D avatars from images using Meta SAM 3D Body
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
import base64
from pathlib import Path

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
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

sam3d_service = None
face_analysis = None

@app.on_event("startup")
async def startup_event():
    global sam3d_service, face_analysis
    from sam3d_service import SAM3DService
    from face_analysis_service import face_analysis_service
    sam3d_service = SAM3DService()
    face_analysis = face_analysis_service
    print("SAM 3D Body service initialized")
    print("Face analysis service initialized")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Virtual Studio Avatar API"}

@app.get("/api/health")
async def health_check():
    if sam3d_service:
        return {
            "status": "healthy",
            "model_loaded": sam3d_service.model_loaded,
            "model_loading": sam3d_service.model_loading,
            "use_placeholder": sam3d_service.use_placeholder,
            "model_files_available": getattr(sam3d_service, 'model_files_available', False)
        }
    return {"status": "healthy", "model_loaded": False}

@app.get("/api/test-r2")
async def test_r2_connection():
    """Test R2 connection and list Sam-3D models."""
    import boto3
    from botocore.config import Config
    
    access_key = os.environ.get('R2_ACCESS_KEY_ID', '').strip()
    secret_key = os.environ.get('R2_SECRET_ACCESS_KEY', '').strip()
    
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
            "access_key_preview": f"{access_key[:8]}... ({len(access_key)} chars)",
            "objects": objects
        }
    except Exception as e:
        return {
            "success": False,
            "access_key_preview": f"{access_key[:8]}... ({len(access_key)} chars)",
            "error": str(e)
        }

@app.post("/api/generate-avatar")
async def generate_avatar(file: UploadFile = File(...)):
    """
    Generate a 3D avatar from an uploaded image.
    Returns a GLB file that can be loaded into Babylon.js.
    """
    if not file.content_type.startswith("image/"):
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
    if not file.content_type.startswith("image/"):
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


@app.post("/api/generate-avatar-with-analysis")
async def generate_avatar_with_analysis(file: UploadFile = File(...)):
    """
    Generate 3D avatar AND analyze face in one request.
    Returns GLB file URL plus detected gender/age.
    """
    if not file.content_type.startswith("image/"):
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
        
        return JSONResponse(response_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)


from rodin_service import rodin_service
from pydantic import BaseModel
from typing import List, Optional

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
    result = await rodin_service.generate_and_wait(
        prompt=request.prompt,
        filename=request.filename,
        quality=request.quality
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    return JSONResponse({
        "success": True,
        "path": result.get("path"),
        "filename": result.get("filename"),
        "category": request.category
    })

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

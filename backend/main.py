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
OUTPUT_DIR = Path("backend/outputs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

sam3d_service = None

@app.on_event("startup")
async def startup_event():
    global sam3d_service
    from sam3d_service import SAM3DService
    sam3d_service = SAM3DService()
    print("SAM 3D Body service initialized")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Virtual Studio Avatar API"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": sam3d_service.is_model_loaded() if sam3d_service else False
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
            "glb_url": f"/api/avatar/{request_id}",
            "metadata": result.get("metadata", {})
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)

@app.get("/api/avatar/{request_id}")
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

@app.delete("/api/avatar/{request_id}")
async def delete_avatar(request_id: str):
    """Delete a generated avatar."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    
    if output_path.exists():
        os.remove(output_path)
        return {"success": True, "message": "Avatar deleted"}
    
    raise HTTPException(status_code=404, detail="Avatar not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

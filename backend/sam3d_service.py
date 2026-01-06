"""
SAM 3D Body Service
Handles loading the Meta SAM 3D Body model and generating 3D avatars from images.
Supports CPU-only inference mode for Replit compatibility.
Downloads models from Cloudflare R2 if not found locally.
"""

import os
import sys
import asyncio
import boto3
from botocore.config import Config
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image

# Import texture extraction service
from texture_extraction_service import texture_extraction_service
# Import DECA service for face enhancement
from deca_service import deca_service

SAM3D_REPO_PATH = Path(__file__).parent / "sam3d_repo"
if str(SAM3D_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(SAM3D_REPO_PATH))

R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"

MODEL_FILES = {
    "model.ckpt": "Sam-3D/sam-3d-body-dinov3/model.ckpt",
    "mhr_model.pt": "Sam-3D/sam-3d-body-dinov3/assets/mhr_model.pt",
    "model_config.yaml": "Sam-3D/sam-3d-body-dinov3/model_config.yaml",
}

def get_r2_client():
    """Get S3-compatible client for Cloudflare R2."""
    # Try CLOUDFLARE_R2_* first, fallback to R2_* for backward compatibility
    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    access_key = access_key.strip()[:32]
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    secret_key = secret_key.strip()
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

async def download_from_r2(r2_path: str, local_path: Path) -> bool:
    """Download a file from Cloudflare R2 bucket using S3-compatible API."""
    local_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Downloading {r2_path} from R2...")
    try:
        def do_download():
            client = get_r2_client()
            client.download_file(R2_BUCKET_NAME, r2_path, str(local_path))
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, do_download)
        print(f"Downloaded {r2_path} to {local_path}")
        return True
    except Exception as e:
        print(f"Error downloading {r2_path}: {e}")
        return False

class SAM3DService:
    """
    Service for generating 3D body meshes from images using Meta SAM 3D Body.
    Falls back to a placeholder mesh if the full model isn't available.
    Uses lazy loading to avoid blocking server startup.
    """
    
    def __init__(self):
        self.model = None
        self.model_cfg = None
        self.estimator = None
        self.model_loaded = False
        self.model_loading = False
        self.use_placeholder = True
        self.device = None
        self._load_lock = asyncio.Lock()
        # Don't load model at startup - use lazy loading
        self._check_model_availability()
    
    def _check_model_availability(self):
        """Initialize model paths - models will always be downloaded from R2."""
        try:
            import torch
            self.device = torch.device("cpu")
            print(f"PyTorch available. Using device: {self.device}")
            
            self.models_dir = Path(__file__).parent / "models"
            self.model_path = self.models_dir / "sam-3d-body-dinov3" / "model.ckpt"
            self.mhr_path = self.models_dir / "sam-3d-body-dinov3" / "assets" / "mhr_model.pt"
            self.config_path = self.models_dir / "sam-3d-body-dinov3" / "model_config.yaml"
            self.model_files_available = False
            print(f"SAM 3D Body models will be downloaded from Cloudflare R2 on first request")
        except ImportError as e:
            print(f"PyTorch not available: {e}")
            self.model_files_available = False
            self.use_placeholder = True
    
    async def _download_models_from_r2(self):
        """Download model files from Cloudflare R2 if not present locally."""
        if self.model_path.exists() and self.mhr_path.exists() and self.config_path.exists():
            return True
        
        print("Downloading SAM 3D models from Cloudflare R2...")
        
        success = True
        if not self.model_path.exists():
            result = await download_from_r2(MODEL_FILES["model.ckpt"], self.model_path)
            success = success and result
        
        if not self.mhr_path.exists():
            result = await download_from_r2(MODEL_FILES["mhr_model.pt"], self.mhr_path)
            success = success and result
        
        if not self.config_path.exists():
            result = await download_from_r2(MODEL_FILES["model_config.yaml"], self.config_path)
            success = success and result
        
        if success:
            self.model_files_available = True
            print("All SAM 3D models downloaded successfully from R2")
        else:
            print("Some models failed to download from R2")
        
        return success
    
    async def ensure_model_loaded(self):
        """Lazy load the model on first request (thread-safe)."""
        if self.model_loaded:
            return
        
        async with self._load_lock:
            if self.model_loaded:
                return
            
            if not self.model_files_available:
                print("Models not found locally, attempting to download from R2...")
                downloaded = await self._download_models_from_r2()
                if not downloaded:
                    print("Could not download models from R2, using placeholder")
                    self.use_placeholder = True
                    return
            
            self.model_loading = True
            print("Loading SAM 3D Body model on first request...")
            
            try:
                await asyncio.get_event_loop().run_in_executor(None, self._try_load_model)
            except Exception as e:
                print(f"Failed to load model: {e}")
                self.use_placeholder = True
            finally:
                self.model_loading = False
    
    def _initialize(self):
        """Initialize the service and attempt to load the model."""
        try:
            self._try_load_model()
        except Exception as e:
            print(f"Could not load SAM 3D Body model: {e}")
            import traceback
            traceback.print_exc()
            print("Using placeholder mesh generator instead")
            self.use_placeholder = True
    
    def _try_load_model(self):
        """Attempt to load the SAM 3D Body model from local files."""
        try:
            import torch
            self.device = torch.device("cpu")
            print(f"PyTorch loaded. Using device: {self.device}")
            
            if self.model_path.exists() and self.mhr_path.exists() and self.config_path.exists():
                print(f"SAM 3D Body model found at: {self.model_path}")
                print(f"MHR model found at: {self.mhr_path}")
                print(f"Config found at: {self.config_path}")
                
                try:
                    from sam_3d_body import load_sam_3d_body, SAM3DBodyEstimator
                    
                    print("Loading SAM 3D Body model (this may take a minute on CPU)...")
                    self.model, self.model_cfg = load_sam_3d_body(
                        checkpoint_path=str(self.model_path),
                        device="cpu",
                        mhr_path=str(self.mhr_path)
                    )
                    
                    self.estimator = SAM3DBodyEstimator(
                        sam_3d_body_model=self.model,
                        model_cfg=self.model_cfg,
                        human_detector=None,
                        human_segmentor=None,
                        fov_estimator=None,
                    )
                    
                    self.faces = self.estimator.faces
                    self.model_loaded = True
                    self.use_placeholder = False
                    print("SAM 3D Body model loaded successfully!")
                    
                except Exception as e:
                    print(f"Failed to load SAM 3D Body model: {e}")
                    import traceback
                    traceback.print_exc()
                    self.model_loaded = True
                    self.use_placeholder = True
                    print("Model files available but inference failed. Using placeholder.")
            else:
                print(f"SAM 3D Body model not found. Expected at: {self.model_path}")
                self.use_placeholder = True
            
            try:
                import smplx
                print("SMPL-X library available for enhanced body generation.")
                self.smplx_available = True
            except ImportError:
                print("SMPL-X not available. Using basic placeholder mesh.")
                self.smplx_available = False
            
            print("Using CPU inference mode (no CUDA required).")
            
        except ImportError as e:
            print(f"Missing dependencies for SAM 3D Body: {e}")
            self.use_placeholder = True
    
    def is_model_loaded(self) -> bool:
        """Check if the SAM 3D Body model is loaded."""
        return self.model_loaded and not self.use_placeholder
    
    async def generate_avatar(self, input_path: str, output_path: str, with_texture: bool = True) -> Dict[str, Any]:
        """
        Generate a 3D avatar from an image.
        
        Args:
            input_path: Path to the input image
            output_path: Path to save the output GLB file
            with_texture: Whether to generate texture from input image (default: True)
            
        Returns:
            Dictionary with success status and metadata
        """
        try:
            # Lazy load model on first request
            await self.ensure_model_loaded()
            
            if self.use_placeholder:
                return await self._generate_placeholder_avatar(input_path, output_path)
            else:
                return await self._generate_sam3d_avatar(input_path, output_path, with_texture)
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    async def _generate_placeholder_avatar(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """
        Generate a placeholder humanoid mesh.
        This creates a simple T-pose mannequin as a placeholder.
        """
        import trimesh
        
        def create_capsule(height: float, radius: float) -> trimesh.Trimesh:
            """Create a capsule (cylinder with hemisphere caps)."""
            cylinder = trimesh.creation.cylinder(radius=radius, height=height, sections=16)
            top_sphere = trimesh.creation.icosphere(radius=radius, subdivisions=2)
            top_sphere.apply_translation([0, 0, height/2])
            bottom_sphere = trimesh.creation.icosphere(radius=radius, subdivisions=2)
            bottom_sphere.apply_translation([0, 0, -height/2])
            return trimesh.util.concatenate([cylinder, top_sphere, bottom_sphere])
        
        parts = []
        
        torso = create_capsule(height=0.5, radius=0.15)
        torso.apply_translation([0, 0, 0.9])
        parts.append(torso)
        
        head = trimesh.creation.icosphere(radius=0.12, subdivisions=2)
        head.apply_translation([0, 0, 1.35])
        parts.append(head)
        
        left_arm = create_capsule(height=0.5, radius=0.05)
        left_arm.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2, [0, 1, 0]))
        left_arm.apply_translation([-0.4, 0, 1.1])
        parts.append(left_arm)
        
        right_arm = create_capsule(height=0.5, radius=0.05)
        right_arm.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2, [0, 1, 0]))
        right_arm.apply_translation([0.4, 0, 1.1])
        parts.append(right_arm)
        
        left_leg = create_capsule(height=0.6, radius=0.07)
        left_leg.apply_translation([-0.1, 0, 0.35])
        parts.append(left_leg)
        
        right_leg = create_capsule(height=0.6, radius=0.07)
        right_leg.apply_translation([0.1, 0, 0.35])
        parts.append(right_leg)
        
        avatar = trimesh.util.concatenate(parts)
        
        avatar.visual = trimesh.visual.ColorVisuals(
            mesh=avatar,
            face_colors=np.array([[180, 140, 110, 255]] * len(avatar.faces))
        )
        
        avatar.export(output_path, file_type='glb')
        
        return {
            "success": True,
            "metadata": {
                "type": "placeholder",
                "vertices": len(avatar.vertices),
                "faces": len(avatar.faces),
                "height": 1.75,
                "note": "Placeholder mannequin. Full SAM 3D Body inference requires additional setup."
            }
        }
    
    async def _generate_sam3d_avatar(self, input_path: str, output_path: str, with_texture: bool = True) -> Dict[str, Any]:
        """
        Generate avatar using the actual SAM 3D Body model.
        Runs on CPU for Replit compatibility.
        Optionally extracts and applies texture from input image.
        """
        import torch
        import cv2
        import trimesh
        
        def run_inference():
            print(f"Running SAM 3D Body inference on: {input_path}")
            
            img = cv2.imread(input_path)
            if img is None:
                raise ValueError(f"Could not read image: {input_path}")
            
            height, width = img.shape[:2]
            print(f"Image size: {width}x{height}")
            
            with torch.no_grad():
                outputs = self.estimator.process_one_image(
                    input_path,
                    bbox_thr=0.5,
                    use_mask=False,
                )
            
            if not outputs:
                print("No humans detected in image, using full image as bbox")
                bbox = np.array([[0, 0, width, height]])
                outputs = self.estimator.process_one_image(
                    input_path,
                    bboxes=bbox,
                    bbox_thr=0.1,
                    use_mask=False,
                )
            
            if not outputs:
                raise ValueError("Could not detect any humans in the image")
            
            return outputs[0], width, height
        
        loop = asyncio.get_event_loop()
        result, img_width, img_height = await loop.run_in_executor(None, run_inference)
        
        vertices = result["pred_vertices"]
        faces = self.faces
        
        # Extract camera parameters
        cam_t = result.get("pred_cam_t", np.array([0, 0, 0]))
        if isinstance(cam_t, torch.Tensor):
            cam_t = cam_t.cpu().numpy()
        if len(cam_t.shape) > 1:
            cam_t = cam_t[0]  # Take first batch element
        
        focal_length = result.get("focal_length", 1000.0)
        if isinstance(focal_length, torch.Tensor):
            focal_length = focal_length.cpu().numpy()
        if isinstance(focal_length, np.ndarray) and len(focal_length.shape) > 0:
            focal_length = float(focal_length[0])
        else:
            focal_length = float(focal_length)
        
        # Get bbox if available for better projection
        bbox = result.get("bbox", None)
        if bbox is not None and isinstance(bbox, torch.Tensor):
            bbox = bbox.cpu().numpy()
        
        # Create mesh
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Apply texture if requested
        if with_texture:
            try:
                print("Extracting texture from input image...")
                
                # Get face landmarks if available (can be enhanced with FaceXFormer later)
                face_landmarks = None
                
                # Try to enhance face with DECA if available
                deca_enhanced_face = None
                if deca_service.is_enabled():
                    try:
                        import cv2
                        print("Attempting to enhance face with DECA...")
                        # Extract face region data
                        input_img = cv2.imread(input_path)
                        if input_img is not None:
                            face_region_data = deca_service.extract_face_region(
                                input_img,
                                vertices,
                                face_landmarks
                            )
                            # Enhance face texture with DECA
                            deca_enhanced_face = await deca_service.enhance_face_texture(
                                input_path,
                                face_region_data,
                                face_landmarks
                            )
                            if deca_enhanced_face is not None:
                                print("DECA face enhancement applied")
                    except Exception as e:
                        print(f"DECA enhancement failed (continuing without it): {e}")
                
                # Extract texture
                texture_result = texture_extraction_service.extract_texture(
                    input_image_path=input_path,
                    vertices=vertices,
                    faces=faces,
                    cam_t=cam_t,
                    focal_length=focal_length,
                    face_landmarks=face_landmarks,
                    texture_size=2048,
                    bbox=bbox,
                    deca_enhanced_face=deca_enhanced_face
                )
                
                texture_atlas = texture_result["texture_atlas"]
                uv_coords = texture_result["uv_coords"]
                face_uvs = texture_result["face_uvs"]
                
                # Save texture atlas to a file that trimesh can reference
                texture_path = str(Path(output_path).parent / f"{Path(output_path).stem}_texture.png")
                texture_extraction_service.save_texture_atlas(texture_atlas, texture_path)
                
                # Apply texture to mesh using trimesh
                # Load texture image for material
                texture_image = Image.open(texture_path)
                
                # Create PBR material with texture
                material = trimesh.visual.material.PBRMaterial(
                    baseColorTexture=texture_image,
                    metallicFactor=0.0,
                    roughnessFactor=0.8
                )
                
                # Create texture visual with UV coordinates
                # Note: trimesh will handle texture packing when exporting to GLB
                mesh.visual = trimesh.visual.TextureVisuals(
                    uv=uv_coords,
                    material=material
                )
                
                print(f"Texture extracted and applied. Atlas saved to {texture_path}")
                texture_applied = True
            except Exception as e:
                print(f"Texture extraction failed: {e}")
                import traceback
                traceback.print_exc()
                # Fallback to solid color
                mesh.visual = trimesh.visual.ColorVisuals(
                    mesh=mesh,
                    face_colors=np.array([[200, 160, 130, 255]] * len(mesh.faces))
                )
                texture_applied = False
        else:
            mesh.visual = trimesh.visual.ColorVisuals(
                mesh=mesh,
                face_colors=np.array([[200, 160, 130, 255]] * len(mesh.faces))
            )
            texture_applied = False
        
        # Export mesh
        mesh.export(output_path, file_type='glb')
        
        metadata = {
            "type": "sam3d_body",
            "vertices": len(mesh.vertices),
            "faces": len(mesh.faces),
            "shape_params": result.get("shape_params", []).tolist() if hasattr(result.get("shape_params", []), "tolist") else [],
            "focal_length": float(focal_length),
            "cam_t": cam_t.tolist() if isinstance(cam_t, np.ndarray) else list(cam_t),
            "texture_applied": texture_applied,
            "note": "Generated using Meta SAM 3D Body model" + (" with texture" if texture_applied else "")
        }
        
        return {
            "success": True,
            "metadata": metadata
        }

# Global singleton instance
sam3d_service = SAM3DService()

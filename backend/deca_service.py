"""
DECA (Detailed Expression Capture and Animation) Service
Handles loading the DECA model for detailed facial texture and expression generation.
Downloads model from Cloudflare R2 on first request.
Supports CPU inference mode.
"""

import os
import sys
import asyncio
import boto3
from botocore.config import Config
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import cv2

R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"

MODEL_FILES = {
    "deca_model.tar": "deca_model.tar",
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


class DECAService:
    """
    Service for detailed facial texture and expression generation using DECA.
    Focuses on enhancing face region with detailed features including eyes.
    """
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.model_loading = False
        self.enabled = os.environ.get('ENABLE_DECA', 'true').lower() == 'true'
        self.device = None
        self._load_lock = asyncio.Lock()
        self._check_model_availability()
    
    def _check_model_availability(self):
        """Initialize model paths."""
        if not self.enabled:
            print("DECA is disabled via ENABLE_DECA=false")
            return
            
        try:
            import torch
            self.device = torch.device("cpu")
            print(f"DECA: PyTorch available. Using device: {self.device}")
            
            # Add DECA repository to path if it exists
            deca_repo_path = Path(__file__).parent.parent / "DECA"
            if deca_repo_path.exists():
                sys.path.insert(0, str(deca_repo_path))
                self.deca_repo_path = deca_repo_path
                print(f"DECA: Found repository at {deca_repo_path}")
            else:
                self.deca_repo_path = None
                print("DECA: Repository not found, will use simplified mode")
            
            self.models_dir = Path(__file__).parent / "models" / "deca"
            self.model_path = self.models_dir / "deca_model.tar"
            print("DECA model will be downloaded from Cloudflare R2 on first request")
        except ImportError as e:
            print(f"DECA: PyTorch not available: {e}")
    
    async def _download_model_from_r2(self):
        """Download model from R2 if not present locally."""
        if self.model_path.exists():
            return True
        
        print("Downloading DECA model from Cloudflare R2...")
        
        success = await download_from_r2(MODEL_FILES["deca_model.tar"], self.model_path)
        
        if success:
            print("DECA model downloaded successfully from R2")
        else:
            print("Failed to download DECA model from R2")
        
        return success
    
    async def ensure_model_loaded(self):
        """Lazy load the model on first request."""
        if not self.enabled:
            return False
            
        if self.model_loaded:
            return True
        
        async with self._load_lock:
            if self.model_loaded:
                return True
            
            self.model_loading = True
            print("Loading DECA model on first request...")
            
            try:
                if not self.model_path.exists():
                    print("Model not found locally, downloading from R2...")
                    success = await self._download_model_from_r2()
                    if not success:
                        print("Failed to download DECA model")
                        self.model_loading = False
                        return False
                
                await asyncio.get_event_loop().run_in_executor(None, self._load_model)
                return self.model_loaded
            except Exception as e:
                print(f"Failed to load DECA model: {e}")
                import traceback
                traceback.print_exc()
                return False
            finally:
                self.model_loading = False
    
    def _load_model(self):
        """Load the DECA model."""
        try:
            import torch
            
            print("Loading DECA model...")
            
            # Check if model file exists
            if not self.model_path.exists():
                raise FileNotFoundError(f"DECA model not found at {self.model_path}")
            
            # Try to load DECA if repository is available
            if self.deca_repo_path is not None:
                try:
                    # Check for pytorch3d first (required for CPU-only inference)
                    try:
                        import pytorch3d
                        pytorch3d_available = True
                    except ImportError:
                        pytorch3d_available = False
                        print("Warning: pytorch3d not available. DECA will try 'standard' rasterizer.")
                    
                    from decalib.deca import DECA
                    from decalib.utils.config import cfg as deca_cfg
                    from decalib.datasets import datasets
                    from decalib.utils import util
                    
                    # Configure DECA for CPU-only inference
                    deca_cfg.model.use_tex = True  # Use texture extraction
                    deca_cfg.model.extract_tex = True  # Extract texture from input image
                    deca_cfg.device = 'cpu'
                    
                    # Use pytorch3d rasterizer if available (avoids OpenGL requirements)
                    # Otherwise fall back to 'standard' (may require OpenGL)
                    if pytorch3d_available:
                        deca_cfg.rasterizer_type = 'pytorch3d'
                        print("DECA: Using pytorch3d rasterizer (CPU-only, no OpenGL needed)")
                    else:
                        deca_cfg.rasterizer_type = 'standard'
                        print("DECA: Using standard rasterizer (may require OpenGL)")
                        # Set environment to try to avoid OpenGL issues
                        import os
                        os.environ.setdefault('PYOPENGL_PLATFORM', 'osmesa')
                        os.environ.setdefault('DISPLAY', ':0')
                    
                    # Update model path in config
                    deca_cfg.pretrained_modelpath = str(self.model_path)
                    
                    print(f"Initializing DECA with model at {self.model_path}")
                    self.deca = DECA(config=deca_cfg, device=str(self.device))
                    self.deca_cfg = deca_cfg
                    self.deca_utils = util
                    self.datasets = datasets
                    
                    print("DECA model loaded successfully!")
                    self.model_loaded = True
                    return
                    
                except Exception as deca_error:
                    print(f"Failed to load full DECA model: {deca_error}")
                    print("Falling back to simplified mode...")
                    import traceback
                    traceback.print_exc()
            
            # Fallback: Load just the checkpoint to verify it exists
            checkpoint = torch.load(str(self.model_path), map_location=self.device)
            if isinstance(checkpoint, dict) and ('E_flame' in checkpoint or 'state_dict' in checkpoint):
                print("DECA checkpoint verified (using simplified mode)")
                self.model_loaded = True
            else:
                print("Warning: DECA checkpoint structure unexpected")
                self.model_loaded = True  # Still mark as loaded to allow basic operations
            
        except Exception as e:
            print(f"Failed to load DECA: {e}")
            import traceback
            traceback.print_exc()
            self.model_loaded = False
    
    def extract_face_region(
        self,
        image: np.ndarray,
        vertices: np.ndarray,
        face_landmarks: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Extract face region from mesh vertices for detailed processing.
        
        Args:
            image: Input image
            vertices: Full mesh vertices
            face_landmarks: Optional face landmarks for precise face region
            
        Returns:
            Dictionary with face region data
        """
        # Identify face region vertices (typically head region)
        center = np.mean(vertices, axis=0)
        relative_y = vertices[:, 1] - center[1]
        
        # Head is usually in top 20% of body height
        head_threshold = np.percentile(relative_y, 80)
        face_mask = relative_y > head_threshold
        
        face_vertices = vertices[face_mask]
        face_vertex_indices = np.where(face_mask)[0]
        
        # Get bounding box of face region in image space
        if len(face_vertices) > 0:
            # Project to 2D (simplified - would use actual camera params in full implementation)
            face_2d_min = face_vertices.min(axis=0)[:2]
            face_2d_max = face_vertices.max(axis=0)[:2]
        else:
            face_2d_min = np.array([0, 0])
            face_2d_max = np.array([100, 100])
        
        return {
            "face_vertices": face_vertices,
            "face_vertex_indices": face_vertex_indices,
            "face_mask": face_mask,
            "bbox_2d": (face_2d_min, face_2d_max)
        }
    
    async def enhance_face_texture(
        self,
        input_image_path: str,
        face_region_data: Dict[str, Any],
        face_landmarks: Optional[np.ndarray] = None
    ) -> Optional[np.ndarray]:
        """
        Enhance face texture using DECA model.
        
        Args:
            input_image_path: Path to input image
            face_region_data: Face region data from extract_face_region
            face_landmarks: Optional face landmarks
            
        Returns:
            Enhanced face texture (UV texture map) or None if model not available
        """
        if not self.model_loaded:
            loaded = await self.ensure_model_loaded()
            if not loaded:
                return None
        
        try:
            import torch
            
            # Try to use full DECA if available
            if hasattr(self, 'deca') and self.deca is not None:
                try:
                    # Use DECA to extract detailed face texture
                    # Create test data for single image
                    testdata = self.datasets.TestData(
                        input_image_path,
                        iscrop=True,
                        face_detector='fan',  # Use FAN face detector
                        sample_step=1
                    )
                    
                    if len(testdata) == 0:
                        print("DECA: No face detected in image, using fallback")
                        raise ValueError("No face detected")
                    
                    # Process first detected face
                    image_data = testdata[0]
                    images = image_data['image'].to(self.device)[None, ...]
                    
                    with torch.no_grad():
                        # Encode image to FLAME parameters
                        codedict = self.deca.encode(images)
                        
                        # Decode to get detailed texture
                        # Check if we need original image rendering
                        if 'original_image' in image_data and 'tform' in image_data:
                            original_image = image_data['original_image'][None, ...].to(self.device)
                            tform = image_data['tform'][None, ...]
                            tform_inv = torch.inverse(tform).transpose(1, 2).to(self.device)
                            opdict, visdict = self.deca.decode(
                                codedict, 
                                render_orig=True,
                                original_image=original_image,
                                tform=tform_inv
                            )
                        else:
                            opdict, visdict = self.deca.decode(codedict)
                        
                        # Extract UV texture if available
                        if 'uv_texture' in opdict:
                            # Convert tensor to numpy image
                            uv_texture = self.deca_utils.tensor2image(opdict['uv_texture'][0])
                            # Convert RGB to BGR for OpenCV compatibility
                            uv_texture_bgr = cv2.cvtColor(uv_texture, cv2.COLOR_RGB2BGR)
                            print("DECA: Generated detailed UV texture")
                            return uv_texture_bgr
                        elif 'albedo' in opdict:
                            # Use albedo map if UV texture not available
                            albedo = self.deca_utils.tensor2image(opdict['albedo'][0])
                            albedo_bgr = cv2.cvtColor(albedo, cv2.COLOR_RGB2BGR)
                            print("DECA: Generated albedo texture")
                            return albedo_bgr
                        else:
                            print("DECA: No texture found in output, using fallback")
                            raise ValueError("No texture in DECA output")
                            
                except Exception as deca_error:
                    print(f"DECA inference failed: {deca_error}, using fallback")
                    # Continue to fallback below
            
            # Fallback: Use face region crop with enhancement
            image = cv2.imread(input_image_path)
            if image is None:
                return None
            
            bbox_min, bbox_max = face_region_data["bbox_2d"]
            x1, y1 = int(bbox_min[0]), int(bbox_min[1])
            x2, y2 = int(bbox_max[0]), int(bbox_max[1])
            
            # Ensure valid coordinates
            h, w = image.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            if x2 > x1 and y2 > y1:
                face_crop = image[y1:y2, x1:x2]
                # Upscale and enhance face region
                face_enhanced = cv2.resize(face_crop, (512, 512), interpolation=cv2.INTER_LANCZOS4)
                
                # Apply unsharp masking for better detail
                blurred = cv2.GaussianBlur(face_enhanced, (5, 5), 0)
                face_enhanced = cv2.addWeighted(face_enhanced, 1.5, blurred, -0.5, 0)
                face_enhanced = np.clip(face_enhanced, 0, 255).astype(np.uint8)
                
                print("DECA: Using enhanced face crop (fallback mode)")
                return face_enhanced
            
            return None
            
        except Exception as e:
            print(f"DECA face enhancement failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def is_enabled(self) -> bool:
        """Check if DECA is enabled."""
        return self.enabled
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model_loaded


# Global instance
deca_service = DECAService()




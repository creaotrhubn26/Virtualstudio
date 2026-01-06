"""
FaceXFormer Service
Handles loading the FaceXFormer model for facial analysis.
Downloads model from Cloudflare R2 (reassembles split files) on first request.
Supports CPU inference mode.
"""

import os
import sys
import asyncio
import boto3
from botocore.config import Config
from pathlib import Path
from typing import Dict, Any, Optional, List
import numpy as np
import cv2

FACEXFORMER_REPO_PATH = Path(__file__).parent / "facexformer_repo"
if str(FACEXFORMER_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(FACEXFORMER_REPO_PATH))

R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"

MODEL_PARTS_PREFIX = "models/facexformer/best_model.pt.part"
MODEL_PARTS = [
    "models/facexformer/best_model.pt.partaa",
    "models/facexformer/best_model.pt.partab",
    "models/facexformer/best_model.pt.partac",
    "models/facexformer/best_model.pt.partad",
    "models/facexformer/best_model.pt.partae",
    "models/facexformer/best_model.pt.partaf",
    "models/facexformer/best_model.pt.partag",
    "models/facexformer/best_model.pt.partah",
    "models/facexformer/best_model.pt.partai",
    "models/facexformer/best_model.pt.partaj",
    "models/facexformer/best_model.pt.partak",
    "models/facexformer/best_model.pt.partal",
    "models/facexformer/best_model.pt.partam",
    "models/facexformer/best_model.pt.partan",
    "models/facexformer/best_model.pt.partao",
    "models/facexformer/best_model.pt.partap",
    "models/facexformer/best_model.pt.partaq",
    "models/facexformer/best_model.pt.partar",
    "models/facexformer/best_model.pt.partas",
    "models/facexformer/best_model.pt.partat",
    "models/facexformer/best_model.pt.partau",
]

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

async def download_part_from_r2(r2_path: str, local_path: Path) -> bool:
    """Download a single part file from R2."""
    local_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        def do_download():
            client = get_r2_client()
            client.download_file(R2_BUCKET_NAME, r2_path, str(local_path))
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, do_download)
        return True
    except Exception as e:
        print(f"Error downloading {r2_path}: {e}")
        return False

def reassemble_model_parts(parts_dir: Path, output_path: Path) -> bool:
    """Reassemble split model parts into a single file."""
    try:
        with open(output_path, 'wb') as outfile:
            for suffix in ['aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj',
                          'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au']:
                part_path = parts_dir / f"best_model.pt.part{suffix}"
                if part_path.exists():
                    with open(part_path, 'rb') as infile:
                        outfile.write(infile.read())
                else:
                    print(f"Missing part: {part_path}")
                    return False
        return True
    except Exception as e:
        print(f"Error reassembling model: {e}")
        return False


class FaceXFormerService:
    """
    Service for facial analysis using FaceXFormer.
    Extracts landmarks, head pose, and facial attributes.
    """
    
    def __init__(self):
        self.model = None
        self.mtcnn = None
        self.model_loaded = False
        self.model_loading = False
        self.enabled = os.environ.get('ENABLE_FACEXFORMER', 'true').lower() == 'true'
        self.device = None
        self._load_lock = asyncio.Lock()
        self._check_model_availability()
    
    def _check_model_availability(self):
        """Initialize model paths."""
        if not self.enabled:
            print("FaceXFormer is disabled via ENABLE_FACEXFORMER=false")
            return
            
        try:
            import torch
            self.device = torch.device("cpu")
            print(f"FaceXFormer: PyTorch available. Using device: {self.device}")
            
            self.models_dir = Path(__file__).parent / "models" / "facexformer"
            self.parts_dir = self.models_dir / "parts"
            self.model_path = self.models_dir / "best_model.pt"
            print("FaceXFormer model will be downloaded from Cloudflare R2 on first request")
        except ImportError as e:
            print(f"FaceXFormer: PyTorch not available: {e}")
    
    async def _download_and_reassemble_model(self):
        """Download model parts from R2 and reassemble."""
        if self.model_path.exists():
            return True
        
        print("Downloading FaceXFormer model parts from Cloudflare R2...")
        self.parts_dir.mkdir(parents=True, exist_ok=True)
        
        success = True
        for r2_path in MODEL_PARTS:
            part_name = Path(r2_path).name
            local_part = self.parts_dir / part_name
            if not local_part.exists():
                print(f"Downloading {part_name}...")
                result = await download_part_from_r2(r2_path, local_part)
                if not result:
                    success = False
                    break
        
        if success:
            print("Reassembling model from parts...")
            success = reassemble_model_parts(self.parts_dir, self.model_path)
            if success:
                print("FaceXFormer model reassembled successfully!")
                for part in self.parts_dir.glob("*.part*"):
                    part.unlink()
                self.parts_dir.rmdir()
        
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
            print("Loading FaceXFormer model on first request...")
            
            try:
                if not self.model_path.exists():
                    print("Model not found locally, downloading from R2...")
                    success = await self._download_and_reassemble_model()
                    if not success:
                        print("Failed to download FaceXFormer model")
                        self.model_loading = False
                        return False
                
                await asyncio.get_event_loop().run_in_executor(None, self._load_model)
                return self.model_loaded
            except Exception as e:
                print(f"Failed to load FaceXFormer model: {e}")
                import traceback
                traceback.print_exc()
                return False
            finally:
                self.model_loading = False
    
    def _load_model(self):
        """Load the FaceXFormer model."""
        try:
            import torch
            from network import FaceXFormer
            from facenet_pytorch import MTCNN
            
            print("Loading FaceXFormer model...")
            
            self.mtcnn = MTCNN(
                image_size=224,
                keep_all=True,
                device=self.device
            )
            
            self.model = FaceXFormer()
            checkpoint = torch.load(str(self.model_path), map_location=self.device, weights_only=False)
            state_key = 'model_state_dict' if 'model_state_dict' in checkpoint else 'state_dict_backbone'
            self.model.load_state_dict(checkpoint[state_key])
            self.model = self.model.to(self.device)
            self.model.eval()
            
            self.model_loaded = True
            print("FaceXFormer model loaded successfully!")
            
        except Exception as e:
            print(f"Failed to load FaceXFormer: {e}")
            import traceback
            traceback.print_exc()
            self.model_loaded = False
    
    def _preprocess_face(self, image: np.ndarray) -> Optional[tuple]:
        """Detect and preprocess face from image."""
        import torch
        import torchvision
        from torchvision.transforms import InterpolationMode
        from PIL import Image
        
        if len(image.shape) == 2:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
        elif image.shape[2] == 3:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image
        
        boxes, probs = self.mtcnn.detect(image_rgb)
        
        if boxes is None or len(boxes) == 0:
            return None
        
        best_idx = 0
        if len(boxes) > 1:
            areas = [(b[2]-b[0]) * (b[3]-b[1]) for b in boxes]
            best_idx = np.argmax(areas)
        
        box = boxes[best_idx].astype(int)
        x1, y1, x2, y2 = box
        
        h, w = image_rgb.shape[:2]
        margin = 0.5
        width = x2 - x1
        height = y2 - y1
        x1 = max(0, int(x1 - width * margin / 2))
        y1 = max(0, int(y1 - height * margin / 2))
        x2 = min(w, int(x2 + width * margin / 2))
        y2 = min(h, int(y2 + height * margin / 2))
        
        face_crop = image_rgb[y1:y2, x1:x2]
        if face_crop.size == 0:
            return None
        
        pil_face = Image.fromarray(face_crop)
        
        transforms = torchvision.transforms.Compose([
            torchvision.transforms.Resize(size=(224, 224), interpolation=InterpolationMode.BICUBIC),
            torchvision.transforms.ToTensor(),
            torchvision.transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        face_tensor = transforms(pil_face).unsqueeze(0).to(self.device)
        
        return face_tensor, np.array([x1, y1, x2, y2])
    
    def _create_labels_dict(self):
        """Create placeholder labels dict for model forward pass."""
        import torch
        return {
            "segmentation": torch.zeros([224, 224]),
            "lnm_seg": torch.zeros([5, 2]),
            "landmark": torch.zeros([68, 2]),
            "headpose": torch.zeros([3]),
            "attribute": torch.zeros([40]),
            "a_g_e": torch.zeros([3]),
            "visibility": torch.zeros([29])
        }
    
    async def analyze_face(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze face in image and return facial data.
        
        Returns:
            Dict with landmarks, head_pose, attributes, etc.
        """
        if not self.enabled:
            return {"enabled": False, "error": "FaceXFormer is disabled"}
        
        if not self.model_loaded:
            loaded = await self.ensure_model_loaded()
            if not loaded:
                return {"enabled": True, "error": "Failed to load model"}
        
        try:
            import torch
            
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not read image"}
            
            result = self._preprocess_face(image)
            if result is None:
                return {"error": "No face detected in image"}
            
            face_tensor, face_box = result
            
            analysis = {
                "face_detected": True,
                "face_box": face_box.tolist(),
                "note": "Head pose is reliable. Landmarks may need checkpoint-specific calibration."
            }
            
            labels = self._create_labels_dict()
            for k in labels.keys():
                labels[k] = labels[k].unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                try:
                    task_headpose = torch.tensor([2]).to(self.device)
                    landmark_out, headpose_out, attribute_out, visibility_out, age_out, gender_out, race_out, seg_out = self.model(face_tensor, labels, task_headpose)
                    
                    if headpose_out is not None and headpose_out.numel() > 0:
                        pose = headpose_out.cpu().numpy().flatten()
                        if len(pose) >= 3:
                            analysis["head_pose"] = {
                                "pitch": float(pose[0]),
                                "yaw": float(pose[1]),
                                "roll": float(pose[2])
                            }
                except Exception as e:
                    analysis["headpose_error"] = str(e)
                
                try:
                    task_landmarks = torch.tensor([1]).to(self.device)
                    landmark_out, _, _, _, _, _, _, _ = self.model(face_tensor, labels, task_landmarks)
                    
                    if landmark_out is not None and landmark_out.numel() > 0:
                        landmarks_raw = landmark_out.view(-1, 68, 2)[0]
                        landmarks_norm = torch.tanh(landmarks_raw).cpu().numpy()
                        landmarks_224 = ((landmarks_norm + 1) * 224 - 1) / 2
                        
                        x1, y1, x2, y2 = face_box
                        face_w = x2 - x1
                        face_h = y2 - y1
                        landmarks_img = landmarks_224.copy()
                        landmarks_img[:, 0] = landmarks_224[:, 0] / 224.0 * face_w + x1
                        landmarks_img[:, 1] = landmarks_224[:, 1] / 224.0 * face_h + y1
                        
                        analysis["landmarks"] = landmarks_img.tolist()
                        analysis["landmarks_224"] = landmarks_224.tolist()
                except Exception as e:
                    analysis["landmarks_error"] = str(e)
            
            return analysis
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    def is_enabled(self) -> bool:
        """Check if FaceXFormer is enabled."""
        return self.enabled
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model_loaded


facexformer_service = FaceXFormerService()

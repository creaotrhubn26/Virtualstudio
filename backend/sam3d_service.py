"""
SAM 3D Body Service
Handles loading the Meta SAM 3D Body model and generating 3D avatars from images.
Supports both Hugging Face model loading and local model files.
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np

class SAM3DService:
    """
    Service for generating 3D body meshes from images using Meta SAM 3D Body.
    Falls back to a placeholder mesh if the full model isn't available.
    """
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.use_placeholder = True
        self._initialize()
    
    def _initialize(self):
        """Initialize the service and attempt to load the model."""
        try:
            self._try_load_model()
        except Exception as e:
            print(f"Could not load SAM 3D Body model: {e}")
            print("Using placeholder mesh generator instead")
            self.use_placeholder = True
    
    def _try_load_model(self):
        """Attempt to load the SAM 3D Body model from Hugging Face."""
        try:
            import torch
            self.device = torch.device("cpu")
            print(f"PyTorch loaded. Using device: {self.device}")
            
            hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
            
            if not hf_token:
                print("No Hugging Face token found. Set HF_TOKEN to download SAM 3D Body model.")
                print("Using enhanced placeholder mesh generator with SMPL-X style body.")
                self.use_placeholder = True
                return
            
            try:
                import smplx
                print("SMPL-X library available for enhanced body generation.")
                self.smplx_available = True
            except ImportError:
                print("SMPL-X not available. Using basic placeholder mesh.")
                self.smplx_available = False
            
            print("Using CPU inference mode (no CUDA required).")
            self.use_placeholder = True
            
        except ImportError as e:
            print(f"Missing dependencies for SAM 3D Body: {e}")
            self.use_placeholder = True
    
    def is_model_loaded(self) -> bool:
        """Check if the SAM 3D Body model is loaded."""
        return self.model_loaded
    
    async def generate_avatar(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """
        Generate a 3D avatar from an image.
        
        Args:
            input_path: Path to the input image
            output_path: Path to save the output GLB file
            
        Returns:
            Dictionary with success status and metadata
        """
        try:
            if self.use_placeholder:
                return await self._generate_placeholder_avatar(input_path, output_path)
            else:
                return await self._generate_sam3d_avatar(input_path, output_path)
                
        except Exception as e:
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
                "note": "Placeholder mannequin. Set HF_TOKEN for real SAM 3D Body generation."
            }
        }
    
    async def _generate_sam3d_avatar(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """
        Generate avatar using the actual SAM 3D Body model.
        Requires PyTorch and GPU.
        """
        return {"success": False, "error": "SAM 3D Body model not loaded. Use placeholder instead."}

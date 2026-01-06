"""
FLUX Image Generation Service
Handles loading FLUX model and generating storyboard frames from text.
Runs locally using diffusers library.
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
import io

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("FLUX: PyTorch not available")

try:
    from diffusers import FluxPipeline
    DIFFUSERS_AVAILABLE = True
except ImportError:
    DIFFUSERS_AVAILABLE = False
    print("FLUX: diffusers not available")

from PIL import Image

class FLUXService:
    """
    Service for generating storyboard frames using FLUX model locally.
    """
    
    def __init__(self):
        self.pipe = None
        self.model_loaded = False
        self.model_loading = False
        self.enabled = os.environ.get('ENABLE_FLUX', 'true').lower() == 'true'
        self.device = None
        self._load_lock = asyncio.Lock()
        self._check_availability()
    
    def _check_availability(self):
        """Check if PyTorch and diffusers are available."""
        if not self.enabled:
            print("FLUX is disabled via ENABLE_FLUX=false")
            return
        
        if not TORCH_AVAILABLE:
            print("FLUX: PyTorch not available")
            self.enabled = False
            return
            
        if not DIFFUSERS_AVAILABLE:
            print("FLUX: Diffusers not available")
            self.enabled = False
            return
        
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            print("FLUX: CUDA available, using GPU")
        else:
            self.device = torch.device("cpu")
            print("FLUX: Using CPU (generation will be slow)")
        
        print("FLUX: Ready to load model on first request")
    
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
            print("Loading FLUX model on first request...")
            
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._load_model
                )
                return self.model_loaded
            except Exception as e:
                print(f"Failed to load FLUX model: {e}")
                import traceback
                traceback.print_exc()
                return False
            finally:
                self.model_loading = False
    
    def _load_model(self):
        """Load the FLUX model from Hugging Face."""
        try:
            print("Loading FLUX.1-schnell from Hugging Face (this may take several minutes)...")
            
            dtype = torch.float16 if self.device.type == "cuda" else torch.bfloat16
            
            self.pipe = FluxPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-schnell",
                torch_dtype=dtype,
            )
            
            self.pipe = self.pipe.to(self.device)
            
            self.model_loaded = True
            print("FLUX model loaded successfully!")
        except Exception as e:
            print(f"Failed to load FLUX model: {e}")
            raise
    
    async def generate_frame(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 576,
        num_inference_steps: int = 4,
        guidance_scale: float = 0.0,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a storyboard frame from text prompt.
        
        Args:
            prompt: Text description of the frame
            negative_prompt: Not used by FLUX schnell
            width: Image width
            height: Image height
            num_inference_steps: Number of steps (1-4 for schnell)
            guidance_scale: Not used by FLUX schnell
            seed: Random seed for reproducibility
        
        Returns:
            Dict with image data and metadata
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "FLUX is disabled or not available"
            }
        
        if not self.model_loaded:
            loaded = await self.ensure_model_loaded()
            if not loaded:
                return {
                    "success": False,
                    "error": "FLUX model could not be loaded"
                }
        
        try:
            enhanced_prompt = f"{prompt}, storyboard frame, cinematic, professional photography"
            
            print(f"Generating FLUX image locally: {prompt[:50]}...")
            
            generator = None
            if seed is not None:
                generator = torch.Generator(device="cpu").manual_seed(seed)
            
            image = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.pipe(
                    enhanced_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    output_type="pil"
                ).images[0]
            )
            
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=95)
            image_bytes = buffer.getvalue()
            
            return {
                "success": True,
                "image_bytes": image_bytes,
                "width": width,
                "height": height,
                "prompt": prompt,
                "model": "FLUX.1-schnell"
            }
        except Exception as e:
            print(f"Error generating FLUX image: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model_loaded
    
    def is_enabled(self) -> bool:
        """Check if service is enabled."""
        return self.enabled

flux_service = FLUXService()

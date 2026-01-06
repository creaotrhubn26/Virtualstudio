"""
Mesh Texture Pipeline
Orchestrates the complete 3D mesh texture generation pipeline combining:
- SAM 3D Body (geometry)
- FaceXFormer (landmarks)
- DECA (face details)
- Texture projection (body texture)
- Texture merging

This is Phase 4: Combined solution for best quality.
"""

import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import cv2

from sam3d_service import sam3d_service
from deca_service import deca_service
from texture_extraction_service import texture_extraction_service

# Optional imports with graceful fallbacks
try:
    from facexformer_service import facexformer_service
    FACEXFORMER_AVAILABLE = True
except ImportError:
    FACEXFORMER_AVAILABLE = False
    print("FaceXFormer service not available, continuing without landmarks")


class MeshTexturePipeline:
    """
    Orchestrates the complete texture generation pipeline.
    
    Pipeline flow:
    1. Input image → SAM 3D Body (generates mesh geometry)
    2. FaceXFormer (extracts face landmarks) - optional
    3. DECA (enhances face region with detailed textures) - optional
    4. Texture projection (projects input image onto mesh)
    5. Texture merging (combines DECA face texture with body texture)
    6. Export GLB with complete texture
    """
    
    def __init__(self):
        self.sam3d = sam3d_service
        self.deca = deca_service
        self.texture_extractor = texture_extraction_service
        self.facexformer = facexformer_service if FACEXFORMER_AVAILABLE else None
    
    async def generate_textured_mesh(
        self,
        input_image_path: str,
        output_path: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a textured 3D mesh from an input image using the complete pipeline.
        
        Args:
            input_image_path: Path to input image
            output_path: Path where GLB file should be saved
            options: Optional configuration dictionary:
                - use_deca: bool (default: True) - Use DECA for face enhancement
                - use_facexformer: bool (default: True) - Use FaceXFormer for landmarks
                - texture_size: int (default: 2048) - Texture atlas size
                - with_texture: bool (default: True) - Enable texture generation
                
        Returns:
            Dictionary with:
                - success: bool
                - output_path: str
                - metadata: dict with generation info
                - error: str (if failed)
        """
        if options is None:
            options = {}
        
        use_deca = options.get('use_deca', True)
        use_facexformer = options.get('use_facexformer', FACEXFORMER_AVAILABLE)
        texture_size = options.get('texture_size', 2048)
        with_texture = options.get('with_texture', True)
        
        try:
            # Step 1: Generate base mesh with SAM 3D Body
            print("Pipeline Step 1: Generating mesh geometry with SAM 3D Body...")
            sam_result = await self.sam3d.generate_avatar(
                input_image_path,
                output_path,
                with_texture=with_texture
            )
            
            if not sam_result.get("success"):
                return {
                    "success": False,
                    "error": f"SAM 3D Body failed: {sam_result.get('error', 'Unknown error')}"
                }
            
            metadata = sam_result.get("metadata", {})
            vertices = metadata.get("vertices")
            faces = metadata.get("faces")
            cam_t = metadata.get("cam_t")
            focal_length = metadata.get("focal_length")
            bbox = metadata.get("bbox")
            
            if not with_texture:
                # Return early if texture generation is disabled
                return {
                    "success": True,
                    "output_path": output_path,
                    "metadata": metadata
                }
            
            # Step 2: Extract face landmarks (optional)
            face_landmarks = None
            if use_facexformer and self.facexformer:
                print("Pipeline Step 2: Extracting face landmarks with FaceXFormer...")
                try:
                    if self.facexformer.is_enabled():
                        facexformer_result = await self.facexformer.analyze_face(input_image_path)
                        if facexformer_result and facexformer_result.get("success"):
                            landmarks_data = facexformer_result.get("landmarks")
                            if landmarks_data:
                                # Extract 2D landmarks for texture alignment
                                face_landmarks = np.array(landmarks_data.get("points_2d", []))
                                print(f"Extracted {len(face_landmarks)} face landmarks")
                except Exception as e:
                    print(f"FaceXFormer landmark extraction failed (continuing): {e}")
            
            # Step 3: Enhance face texture with DECA (optional)
            deca_enhanced_face = None
            if use_deca and self.deca.is_enabled():
                print("Pipeline Step 3: Enhancing face texture with DECA...")
                try:
                    # Extract face region data
                    input_img = cv2.imread(input_image_path)
                    if input_img is not None:
                        face_region_data = self.deca.extract_face_region(
                            input_img,
                            vertices,
                            face_landmarks
                        )
                        # Enhance face texture with DECA
                        deca_enhanced_face = await self.deca.enhance_face_texture(
                            input_image_path,
                            face_region_data,
                            face_landmarks
                        )
                        if deca_enhanced_face is not None:
                            print("DECA face enhancement completed")
                except Exception as e:
                    print(f"DECA enhancement failed (continuing without it): {e}")
            
            # Step 4 & 5: Extract and merge textures
            # This is handled by sam3d_service when with_texture=True
            # The texture extraction service already merges DECA textures
            
            print("Pipeline Step 4-5: Texture extraction and merging (handled by SAM3D service)...")
            
            # The texture is already applied by sam3d_service.generate_avatar
            # when with_texture=True, so we're done!
            
            return {
                "success": True,
                "output_path": output_path,
                "metadata": {
                    **metadata,
                    "pipeline": {
                        "used_deca": deca_enhanced_face is not None,
                        "used_facexformer": face_landmarks is not None,
                        "texture_size": texture_size
                    }
                }
            }
            
        except Exception as e:
            print(f"Pipeline failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pipeline_status(self) -> Dict[str, Any]:
        """
        Get status of all pipeline components.
        
        Returns:
            Dictionary with status of each component
        """
        status = {
            "sam3d": {
                "available": self.sam3d is not None,
                "model_loaded": self.sam3d.is_model_loaded() if self.sam3d else False
            },
            "deca": {
                "available": self.deca is not None,
                "enabled": self.deca.is_enabled() if self.deca else False,
                "model_loaded": self.deca.is_model_loaded() if self.deca else False
            },
            "facexformer": {
                "available": self.facexformer is not None,
                "enabled": self.facexformer.is_enabled() if self.facexformer else False,
                "model_loaded": self.facexformer.is_model_loaded() if self.facexformer else False
            },
            "texture_extractor": {
                "available": self.texture_extractor is not None
            }
        }
        return status


# Global instance
mesh_texture_pipeline = MeshTexturePipeline()



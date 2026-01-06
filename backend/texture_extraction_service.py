"""
Texture Extraction Service
Projects texture from input image to 3D mesh using camera parameters.
Generates UV maps and texture atlases for realistic appearance.
Supports integration with DECA for enhanced facial details.
"""

import numpy as np
import cv2
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
import trimesh
from PIL import Image


class TextureExtractionService:
    """
    Service for extracting and projecting textures from images onto 3D meshes.
    """
    
    def __init__(self):
        pass
    
    def generate_uv_coordinates(self, vertices: np.ndarray, faces: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate UV coordinates for a mesh using spherical mapping.
        
        Args:
            vertices: (N, 3) array of vertex positions
            faces: (F, 3) array of face indices
            
        Returns:
            uv_coords: (N, 2) array of UV coordinates [0, 1]
            face_uvs: (F, 3) array matching faces but using UV indices (same as faces for now)
        """
        # Convert to centered coordinates
        center = np.mean(vertices, axis=0)
        centered_verts = vertices - center
        
        # Calculate spherical coordinates
        # Normalize to unit sphere
        norms = np.linalg.norm(centered_verts, axis=1, keepdims=True)
        norms = np.where(norms < 1e-6, 1.0, norms)
        normalized = centered_verts / norms
        
        # Convert to spherical coordinates: theta (azimuth) and phi (elevation)
        x, y, z = normalized[:, 0], normalized[:, 1], normalized[:, 2]
        
        # Calculate UV from spherical coordinates
        # U: azimuth (0 to 1) - wraps around horizontally
        u = (np.arctan2(x, z) + np.pi) / (2 * np.pi)
        
        # V: elevation (0 to 1) - from bottom to top
        v = (np.arcsin(np.clip(y, -1, 1)) + np.pi / 2) / np.pi
        
        uv_coords = np.stack([u, v], axis=1).astype(np.float32)
        
        # Face UVs are the same as faces (vertex-based UV mapping)
        face_uvs = faces.copy()
        
        return uv_coords, face_uvs
    
    def project_vertices_to_image(
        self,
        vertices: np.ndarray,
        cam_t: np.ndarray,
        focal_length: float,
        img_width: int,
        img_height: int,
        bbox: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Project 3D vertices to 2D image coordinates using camera parameters.
        
        Args:
            vertices: (N, 3) array of 3D vertices
            cam_t: (3,) camera translation from SAM 3D
            focal_length: Focal length in pixels
            img_width: Image width in pixels
            img_height: Image height in pixels
            bbox: Optional bounding box [x1, y1, x2, y2] for conversion
            
        Returns:
            projected: (N, 2) array of 2D image coordinates
        """
        # SAM 3D uses a specific projection convention
        # The vertices are in camera space, and cam_t is the translation to apply
        # Following SAM 3D's projection logic from the codebase:
        
        # Transform vertices: apply camera translation
        # In SAM 3D, vertices are projected as: (vertices + cam_t) then scaled by focal_length
        translated = vertices + cam_t
        
        # Perspective projection
        # Project to image plane (following SAM 3D convention)
        # The projection multiplies x and y by focal_length and divides by z
        x_2d = (translated[:, 0] * focal_length) / (translated[:, 2] + 1e-6)
        y_2d = (translated[:, 1] * focal_length) / (translated[:, 2] + 1e-6)
        
        # Convert to image coordinates
        # In SAM 3D, the projection assumes center at image center
        img_center_x = img_width / 2.0
        img_center_y = img_height / 2.0
        
        x_img = x_2d + img_center_x
        y_img = y_2d + img_center_y
        
        projected = np.stack([x_img, y_img], axis=1)
        
        return projected
    
    def sample_texture_from_image(
        self,
        image: np.ndarray,
        projected_coords: np.ndarray,
        uv_coords: np.ndarray,
        texture_size: int = 2048
    ) -> np.ndarray:
        """
        Sample texture from image at projected coordinates and create texture atlas.
        
        Args:
            image: (H, W, 3) input image in BGR format
            projected_coords: (N, 2) 2D projected coordinates
            uv_coords: (N, 2) UV coordinates
            texture_size: Size of output texture atlas
            
        Returns:
            texture_atlas: (texture_size, texture_size, 3) RGB texture atlas
        """
        # Convert image to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            img_rgb = image
        
        img_height, img_width = img_rgb.shape[:2]
        
        # Create texture atlas
        texture_atlas = np.zeros((texture_size, texture_size, 3), dtype=np.uint8)
        
        # Sample texture for each vertex
        for i in range(len(projected_coords)):
            x_img, y_img = projected_coords[i]
            u, v = uv_coords[i]
            
            # Clamp image coordinates
            x_img = np.clip(x_img, 0, img_width - 1)
            y_img = np.clip(y_img, 0, img_height - 1)
            
            # Sample color from image (bilinear interpolation)
            x0, y0 = int(x_img), int(y_img)
            x1, y1 = min(x0 + 1, img_width - 1), min(y0 + 1, img_height - 1)
            
            # Get fractional parts
            fx = x_img - x0
            fy = y_img - y0
            
            # Bilinear interpolation
            c00 = img_rgb[y0, x0]
            c10 = img_rgb[y0, x1]
            c01 = img_rgb[y1, x0]
            c11 = img_rgb[y1, x1]
            
            color = (
                c00 * (1 - fx) * (1 - fy) +
                c10 * fx * (1 - fy) +
                c01 * (1 - fx) * fy +
                c11 * fx * fy
            ).astype(np.uint8)
            
            # Map to texture atlas using UV coordinates
            tex_x = int(u * (texture_size - 1))
            tex_y = int((1 - v) * (texture_size - 1))  # Flip V
            
            texture_atlas[tex_y, tex_x] = color
        
        # Smooth the texture atlas using bilateral filter to reduce artifacts
        texture_atlas = cv2.bilateralFilter(texture_atlas, 5, 50, 50)
        
        return texture_atlas
    
    def enhance_face_region(
        self,
        texture_atlas: np.ndarray,
        uv_coords: np.ndarray,
        vertices: np.ndarray,
        face_landmarks: Optional[np.ndarray] = None,
        deca_enhanced_face: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Enhance face region in texture atlas with higher resolution.
        Optionally uses DECA-enhanced face texture.
        
        Args:
            texture_atlas: (H, W, 3) texture atlas
            uv_coords: (N, 2) UV coordinates
            vertices: (N, 3) vertex positions
            face_landmarks: Optional face landmarks for more precise face region detection
            deca_enhanced_face: Optional DECA-enhanced face texture
            
        Returns:
            enhanced_atlas: Enhanced texture atlas
        """
        # Identify face region vertices (typically head region: y > some threshold)
        # Head is usually the top portion of the body mesh
        center = np.mean(vertices, axis=0)
        relative_y = vertices[:, 1] - center[1]
        
        # Assume head is in top 20% of body height
        head_threshold = np.percentile(relative_y, 80)
        face_mask = relative_y > head_threshold
        
        if np.sum(face_mask) == 0:
            return texture_atlas
        
        # Get UV coordinates for face region
        face_uvs = uv_coords[face_mask]
        
        if len(face_uvs) == 0:
            return texture_atlas
        
        # Create a mask for face region in texture space
        texture_size = texture_atlas.shape[0]
        face_mask_texture = np.zeros((texture_size, texture_size), dtype=bool)
        
        for u, v in face_uvs:
            tex_x = int(u * (texture_size - 1))
            tex_y = int((1 - v) * (texture_size - 1))
            # Mark surrounding area (small region)
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    y_idx = np.clip(tex_y + dy, 0, texture_size - 1)
                    x_idx = np.clip(tex_x + dx, 0, texture_size - 1)
                    face_mask_texture[y_idx, x_idx] = True
        
        # Enhance face region
        enhanced_atlas = texture_atlas.copy()
        
        # If DECA-enhanced face is available, blend it into the face region
        if deca_enhanced_face is not None:
            # Resize DECA face to match face region in texture atlas
            face_region_coords = np.where(face_mask_texture)
            if len(face_region_coords[0]) > 0:
                y_min, y_max = face_region_coords[0].min(), face_region_coords[0].max()
                x_min, x_max = face_region_coords[1].min(), face_region_coords[1].max()
                
                face_region_h = y_max - y_min + 1
                face_region_w = x_max - x_min + 1
                
                if face_region_h > 0 and face_region_w > 0:
                    # Resize DECA face to match face region size
                    deca_resized = cv2.resize(
                        deca_enhanced_face,
                        (face_region_w, face_region_h),
                        interpolation=cv2.INTER_LANCZOS4
                    )
                    
                    # Convert BGR to RGB if needed
                    if deca_resized.shape[2] == 3:
                        deca_resized = cv2.cvtColor(deca_resized, cv2.COLOR_BGR2RGB)
                    
                    # Blend DECA-enhanced face into texture atlas
                    # Create a smooth blending mask with feathering at edges
                    face_region_mask = face_mask_texture[y_min:y_max+1, x_min:x_max+1]
                    
                    if face_region_h > 0 and face_region_w > 0 and face_region_mask.shape == deca_resized.shape[:2]:
                        # Create feather mask for smooth blending at edges
                        feather_mask = np.zeros((face_region_h, face_region_w), dtype=np.float32)
                        
                        try:
                            # Create smooth gradient: 1.0 in center, 0.0 at edges using distance transform
                            from scipy.ndimage import distance_transform_edt
                            dist = distance_transform_edt(face_region_mask)
                            max_dist = dist.max()
                            if max_dist > 0:
                                feather_mask = np.clip(dist / max(max_dist * 0.3, 1), 0, 1)
                            else:
                                # Fallback: use mask directly
                                feather_mask = face_region_mask.astype(np.float32)
                        except ImportError:
                            # Fallback if scipy not available: use Gaussian blur for smooth edges
                            mask_float = face_region_mask.astype(np.float32)
                            blurred_mask = cv2.GaussianBlur(mask_float, (11, 11), 3)
                            feather_mask = np.clip(blurred_mask * 1.2, 0, 1)
                        
                        # Blend factor: stronger in center, weaker at edges
                        alpha = 0.85 * feather_mask[..., np.newaxis] + 0.3 * (1 - feather_mask[..., np.newaxis])
                        
                        # Blend DECA texture with original
                        region_original = enhanced_atlas[y_min:y_max+1, x_min:x_max+1].copy()
                        
                        # Apply blending only within mask
                        blend_region = (alpha * deca_resized + (1 - alpha) * region_original).astype(np.uint8)
                        
                        # Only update pixels within the mask
                        mask_3d = face_region_mask[..., np.newaxis]
                        region_original[mask_3d] = blend_region[mask_3d]
                        enhanced_atlas[y_min:y_max+1, x_min:x_max+1] = region_original
        
        # Apply unsharp masking for sharper face details
        blurred = cv2.GaussianBlur(enhanced_atlas, (5, 5), 0)
        enhanced_atlas = cv2.addWeighted(enhanced_atlas, 1.5, blurred, -0.5, 0)
        # Clamp to valid range
        enhanced_atlas = np.clip(enhanced_atlas, 0, 255).astype(np.uint8)
        
        return enhanced_atlas
    
    def extract_texture(
        self,
        input_image_path: str,
        vertices: np.ndarray,
        faces: np.ndarray,
        cam_t: np.ndarray,
        focal_length: float,
        face_landmarks: Optional[np.ndarray] = None,
        texture_size: int = 2048,
        bbox: Optional[np.ndarray] = None,
        deca_enhanced_face: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Extract texture from input image and project it onto mesh.
        
        Args:
            input_image_path: Path to input image
            vertices: (N, 3) mesh vertices
            faces: (F, 3) mesh faces
            cam_t: (3,) camera translation from SAM 3D
            focal_length: Focal length from SAM 3D
            face_landmarks: Optional face landmarks for face enhancement
            texture_size: Size of output texture atlas
            
        Returns:
            Dictionary with texture atlas, UV coordinates, and metadata
        """
        # Load input image
        image = cv2.imread(input_image_path)
        if image is None:
            raise ValueError(f"Could not read image: {input_image_path}")
        
        img_height, img_width = image.shape[:2]
        
        # Generate UV coordinates
        uv_coords, face_uvs = self.generate_uv_coordinates(vertices, faces)
        
        # Project vertices to image space
        projected_coords = self.project_vertices_to_image(
            vertices, cam_t, focal_length, img_width, img_height, bbox
        )
        
        # Sample texture from image
        texture_atlas = self.sample_texture_from_image(
            image, projected_coords, uv_coords, texture_size
        )
        
        # Enhance face region (optionally with DECA)
        texture_atlas = self.enhance_face_region(
            texture_atlas, uv_coords, vertices, face_landmarks, deca_enhanced_face
        )
        
        return {
            "texture_atlas": texture_atlas,
            "uv_coords": uv_coords,
            "face_uvs": face_uvs,
            "texture_size": texture_size,
            "projected_coords": projected_coords
        }
    
    def save_texture_atlas(self, texture_atlas: np.ndarray, output_path: str) -> None:
        """Save texture atlas to file."""
        img = Image.fromarray(texture_atlas)
        img.save(output_path)


# Global instance
texture_extraction_service = TextureExtractionService()


"""
Normal Map Generator
Generates normal maps from albedo textures and height maps using various algorithms.
Supports skin, fabric, and hair texture normal map generation.

Methods:
1. Sobel filter: Fast edge detection for surface detail
2. Height map: Texture-based height analysis
3. Smoothed edges: Blurred edges for realistic surface variation
4. Fabric weave: Pattern-based for woven materials
5. Hair strand: Directional details for hair materials
"""

import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageOps
from typing import Tuple, Optional, Dict, Any
from pathlib import Path
from scipy import ndimage
from scipy.ndimage import sobel, gaussian_filter


class NormalMapGenerator:
    """Generate normal maps from texture images for PBR materials."""
    
    @staticmethod
    def sobel_normal_map(
        image: np.ndarray,
        strength: float = 1.0,
        blur_radius: int = 1
    ) -> np.ndarray:
        """
        Generate normal map using Sobel filter.
        Fast method suitable for most materials.
        
        Args:
            image: Input image (grayscale or RGB converted to grayscale)
            strength: Intensity multiplier for normal map (0.5-2.0)
            blur_radius: Pre-blur to reduce noise
            
        Returns:
            Normal map (H, W, 3) with values in [0, 255]
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply blur to reduce noise
        if blur_radius > 0:
            gray = cv2.GaussianBlur(gray, (blur_radius * 2 + 1, blur_radius * 2 + 1), 0)
        
        # Normalize to float [0, 1]
        gray_float = gray.astype(np.float32) / 255.0
        
        # Apply Sobel filters
        sobelx = sobel(gray_float, axis=1)
        sobely = sobel(gray_float, axis=0)
        
        # Scale by strength
        sobelx = sobelx * strength
        sobely = sobely * strength
        
        # Create normal vector (x, y, z)
        # x = sobel_x, y = sobel_y, z = 1 (pointing up)
        height, width = gray.shape
        normal_map = np.zeros((height, width, 3), dtype=np.float32)
        normal_map[:, :, 0] = sobelx  # Red = X (left-right detail)
        normal_map[:, :, 1] = sobely  # Green = Y (up-down detail)
        normal_map[:, :, 2] = 1.0     # Blue = Z (height/depth)
        
        # Normalize vectors
        magnitude = np.sqrt(
            normal_map[:, :, 0]**2 + 
            normal_map[:, :, 1]**2 + 
            normal_map[:, :, 2]**2
        )
        magnitude[magnitude == 0] = 1  # Prevent division by zero
        
        normal_map[:, :, 0] /= magnitude
        normal_map[:, :, 1] /= magnitude
        normal_map[:, :, 2] /= magnitude
        
        # Convert to 0-255 range (OpenGL convention: [-1,1] maps to [0,255])
        normal_map = (normal_map + 1.0) / 2.0 * 255.0
        
        return normal_map.astype(np.uint8)
    
    @staticmethod
    def height_map_normal(
        image: np.ndarray,
        height_scale: float = 0.5,
        blur_radius: int = 2
    ) -> np.ndarray:
        """
        Generate normal map by treating image as height map.
        Good for images with natural height variation (skin wrinkles, fabric weave).
        
        Args:
            image: Input image (will be converted to grayscale)
            height_scale: Scale factor for height interpretation (0.1-2.0)
            blur_radius: Blur to create smooth height gradients
            
        Returns:
            Normal map (H, W, 3) with values in [0, 255]
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Blur to create smooth height field
        if blur_radius > 0:
            gray = cv2.GaussianBlur(gray, (blur_radius * 2 + 1, blur_radius * 2 + 1), 0)
        
        # Normalize height map [0, 1]
        height_map = gray.astype(np.float32) / 255.0 * height_scale
        
        # Compute gradients (height derivatives)
        gy, gx = np.gradient(height_map)
        
        # Create normal vectors
        height, width = gray.shape
        normal_map = np.zeros((height, width, 3), dtype=np.float32)
        normal_map[:, :, 0] = -gx * 2.0  # X component (inverted for OpenGL)
        normal_map[:, :, 1] = -gy * 2.0  # Y component (inverted for OpenGL)
        normal_map[:, :, 2] = 1.0        # Z component (up)
        
        # Normalize vectors
        magnitude = np.sqrt(
            normal_map[:, :, 0]**2 + 
            normal_map[:, :, 1]**2 + 
            normal_map[:, :, 2]**2
        )
        magnitude[magnitude == 0] = 1
        
        normal_map[:, :, 0] /= magnitude
        normal_map[:, :, 1] /= magnitude
        normal_map[:, :, 2] /= magnitude
        
        # Convert to 0-255 range
        normal_map = (normal_map + 1.0) / 2.0 * 255.0
        
        return normal_map.astype(np.uint8)
    
    @staticmethod
    def fabric_normal_map(
        image: np.ndarray,
        weave_strength: float = 1.2,
        directional: Optional[str] = None
    ) -> np.ndarray:
        """
        Generate normal map optimized for fabric materials.
        Enhances weave patterns and directional detail.
        
        Args:
            image: Input fabric texture
            weave_strength: Strength of weave pattern detection (0.5-2.0)
            directional: 'horizontal', 'vertical', or None for omnidirectional
            
        Returns:
            Normal map with fabric detail
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Enhance contrast to highlight weave
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        
        # Normalize
        gray_float = gray.astype(np.float32) / 255.0
        
        # Apply directional Sobel if specified
        if directional == 'horizontal':
            # Emphasize vertical edges (horizontal weave)
            sobelx = np.zeros_like(gray_float)
            sobely = sobel(gray_float, axis=0) * weave_strength
        elif directional == 'vertical':
            # Emphasize horizontal edges (vertical weave)
            sobelx = sobel(gray_float, axis=1) * weave_strength
            sobely = np.zeros_like(gray_float)
        else:
            # Both directions
            sobelx = sobel(gray_float, axis=1) * weave_strength
            sobely = sobel(gray_float, axis=0) * weave_strength
        
        # Create normal vector
        height, width = gray.shape
        normal_map = np.zeros((height, width, 3), dtype=np.float32)
        normal_map[:, :, 0] = sobelx
        normal_map[:, :, 1] = sobely
        normal_map[:, :, 2] = 1.5  # Boost Z for flatter appearance
        
        # Normalize
        magnitude = np.sqrt(
            normal_map[:, :, 0]**2 + 
            normal_map[:, :, 1]**2 + 
            normal_map[:, :, 2]**2
        )
        magnitude[magnitude == 0] = 1
        normal_map[:, :, 0] /= magnitude
        normal_map[:, :, 1] /= magnitude
        normal_map[:, :, 2] /= magnitude
        
        # Convert to 0-255
        normal_map = (normal_map + 1.0) / 2.0 * 255.0
        
        return normal_map.astype(np.uint8)
    
    @staticmethod
    def skin_normal_map(
        image: np.ndarray,
        pore_strength: float = 0.8,
        wrinkle_strength: float = 1.2,
        blur_radius: int = 1
    ) -> np.ndarray:
        """
        Generate normal map optimized for skin materials.
        Balances pore detail with wrinkle prominence.
        
        Args:
            image: Input skin texture
            pore_strength: Strength of pore detail (0.5-1.5)
            wrinkle_strength: Strength of wrinkle detail (0.5-2.0)
            blur_radius: Pre-blur for noise reduction
            
        Returns:
            Normal map with skin detail
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Light blur to reduce sensor noise
        if blur_radius > 0:
            gray = cv2.GaussianBlur(gray, (blur_radius * 2 + 1, blur_radius * 2 + 1), 0)
        
        gray_float = gray.astype(np.float32) / 255.0
        
        # Create two detail levels: fine pores and larger wrinkles
        # Fine detail (pores) - high frequency
        pore_detail = gray_float.copy()
        pore_detail = cv2.GaussianBlur((gray * 255).astype(np.uint8), (3, 3), 0).astype(np.float32) / 255.0
        pore_delta = gray_float - pore_detail
        
        # Wrinkles - low frequency (larger features)
        wrinkle_detail = cv2.GaussianBlur((gray * 255).astype(np.uint8), (11, 11), 0).astype(np.float32) / 255.0
        wrinkle_delta = gray_float - wrinkle_detail
        
        # Combine both details
        detail = (pore_delta * pore_strength + wrinkle_delta * wrinkle_strength) / 2.0
        
        # Apply Sobel to detail
        sobelx = sobel(detail, axis=1)
        sobely = sobel(detail, axis=0)
        
        # Create normal map
        height, width = gray.shape
        normal_map = np.zeros((height, width, 3), dtype=np.float32)
        normal_map[:, :, 0] = sobelx
        normal_map[:, :, 1] = sobely
        normal_map[:, :, 2] = 1.0
        
        # Normalize
        magnitude = np.sqrt(
            normal_map[:, :, 0]**2 + 
            normal_map[:, :, 1]**2 + 
            normal_map[:, :, 2]**2
        )
        magnitude[magnitude == 0] = 1
        normal_map[:, :, 0] /= magnitude
        normal_map[:, :, 1] /= magnitude
        normal_map[:, :, 2] /= magnitude
        
        # Convert to 0-255
        normal_map = (normal_map + 1.0) / 2.0 * 255.0
        
        return normal_map.astype(np.uint8)
    
    @staticmethod
    def hair_normal_map(
        image: np.ndarray,
        strand_strength: float = 1.5,
        direction: Optional[Tuple[float, float]] = None
    ) -> np.ndarray:
        """
        Generate normal map optimized for hair materials.
        Emphasizes strand direction and volume.
        
        Args:
            image: Input hair texture
            strand_strength: Strength of strand detail (0.8-2.0)
            direction: (dx, dy) tuple for hair direction bias, None for auto-detect
            
        Returns:
            Normal map with hair strand detail
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Blur to emphasis hair structure
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        gray_float = gray.astype(np.float32) / 255.0
        
        # Detect hair direction if not provided
        if direction is None:
            # Use first principal component via Sobel
            sobelx_raw = sobel(gray_float, axis=1)
            sobely_raw = sobel(gray_float, axis=0)
            # Direction bias towards stronger gradient
            magnitude = np.sqrt(sobelx_raw**2 + sobely_raw**2)
            direction = (np.mean(sobelx_raw), np.mean(sobely_raw))
            direction = direction / (np.linalg.norm(direction) + 1e-6)
        
        # Apply directional emphasis
        sobelx = sobel(gray_float, axis=1) * (1.0 + abs(direction[0]) * strand_strength)
        sobely = sobel(gray_float, axis=0) * (1.0 + abs(direction[1]) * strand_strength)
        
        # Create normal map with strong Z component (hair is shiny)
        height, width = gray.shape
        normal_map = np.zeros((height, width, 3), dtype=np.float32)
        normal_map[:, :, 0] = sobelx
        normal_map[:, :, 1] = sobely
        normal_map[:, :, 2] = 1.3  # Higher Z for glossy hair
        
        # Normalize
        magnitude = np.sqrt(
            normal_map[:, :, 0]**2 + 
            normal_map[:, :, 1]**2 + 
            normal_map[:, :, 2]**2
        )
        magnitude[magnitude == 0] = 1
        normal_map[:, :, 0] /= magnitude
        normal_map[:, :, 1] /= magnitude
        normal_map[:, :, 2] /= magnitude
        
        # Convert to 0-255
        normal_map = (normal_map + 1.0) / 2.0 * 255.0
        
        return normal_map.astype(np.uint8)
    
    @staticmethod
    def generate_for_material(
        texture_image: np.ndarray,
        material_type: str = "skin",
        **kwargs
    ) -> np.ndarray:
        """
        Generate normal map optimized for specific material type.
        
        Args:
            texture_image: Input texture (albedo)
            material_type: 'skin', 'fabric', 'hair', 'eyes', or 'generic'
            **kwargs: Material-specific parameters
            
        Returns:
            Normal map optimized for material
        """
        if material_type == "skin":
            return NormalMapGenerator.skin_normal_map(
                texture_image,
                pore_strength=kwargs.get('pore_strength', 0.8),
                wrinkle_strength=kwargs.get('wrinkle_strength', 1.2),
                blur_radius=kwargs.get('blur_radius', 1)
            )
        
        elif material_type == "fabric":
            return NormalMapGenerator.fabric_normal_map(
                texture_image,
                weave_strength=kwargs.get('weave_strength', 1.2),
                directional=kwargs.get('directional', None)
            )
        
        elif material_type == "hair":
            return NormalMapGenerator.hair_normal_map(
                texture_image,
                strand_strength=kwargs.get('strand_strength', 1.5),
                direction=kwargs.get('direction', None)
            )
        
        elif material_type == "eyes":
            # Eyes use smooth normal map (very subtle)
            return NormalMapGenerator.height_map_normal(
                texture_image,
                height_scale=0.1,
                blur_radius=3
            )
        
        else:  # generic
            return NormalMapGenerator.sobel_normal_map(
                texture_image,
                strength=kwargs.get('strength', 1.0),
                blur_radius=kwargs.get('blur_radius', 1)
            )
    
    @staticmethod
    def save_normal_map(
        normal_map: np.ndarray,
        output_path: str,
        file_format: str = "png"
    ) -> bool:
        """
        Save normal map to file.
        
        Args:
            normal_map: Normal map array (H, W, 3) with values [0, 255]
            output_path: Output file path
            file_format: 'png' or 'jpg'
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert BGR to RGB for PNG (PIL expects RGB)
            if file_format.lower() == "png":
                # Normal maps are typically stored as RGB
                normal_rgb = cv2.cvtColor(normal_map, cv2.COLOR_BGR2RGB)
            else:
                normal_rgb = normal_map
            
            # Save using PIL for better control
            img = Image.fromarray(normal_rgb, 'RGB')
            img.save(output_path, quality=95 if file_format.lower() == "jpg" else None)
            
            return True
        except Exception as e:
            print(f"Error saving normal map: {e}")
            return False

# Utility function for easy integration
def generate_normal_map(
    input_image_path: str,
    output_path: str,
    material_type: str = "skin",
    **kwargs
) -> bool:
    """
    Convenience function to generate normal map from image file.
    
    Args:
        input_image_path: Path to input texture image
        output_path: Path to save normal map
        material_type: 'skin', 'fabric', 'hair', 'eyes', or 'generic'
        **kwargs: Material-specific parameters
        
    Returns:
        True if successful
    """
    try:
        # Load image
        image = cv2.imread(input_image_path)
        if image is None:
            print(f"Could not load image: {input_image_path}")
            return False
        
        # Generate normal map
        normal_map = NormalMapGenerator.generate_for_material(
            image,
            material_type=material_type,
            **kwargs
        )
        
        # Save
        return NormalMapGenerator.save_normal_map(normal_map, output_path)
    
    except Exception as e:
        print(f"Error generating normal map: {e}")
        import traceback
        traceback.print_exc()
        return False

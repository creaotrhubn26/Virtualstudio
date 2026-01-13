#!/usr/bin/env python3
"""
Texture Library Generator for Base Avatars

Generates albedo and normal map textures for the 8 base avatars based on their
material definitions. This creates a procedural texture library that can be used
when GLB files don't have embedded textures.

Outputs:
- /public/textures/avatars/skin_light_base.jpg
- /public/textures/avatars/skin_medium_base.jpg
- /public/textures/avatars/skin_aged_base.jpg
- /public/textures/avatars/skin_tanned_base.jpg
- /public/textures/avatars/normal_*.jpg
- /public/textures/avatars/fabric_*.jpg
- And corresponding normal maps

Generated textures are 1K resolution (1024x1024) for optimal VRAM usage.
"""

import numpy as np
import cv2
from pathlib import Path
from typing import Tuple
import sys

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from backend.normal_map_generator import NormalMapGenerator


class TextureLibraryGenerator:
    """Generate procedural textures for avatar materials."""
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    @staticmethod
    def generate_skin_texture(
        base_color: str,
        pore_density: float = 0.3,
        variation: float = 0.15,
        size: int = 1024
    ) -> np.ndarray:
        """
        Generate realistic skin texture with pores and variation.
        
        Args:
            base_color: Hex color code (e.g., '#F5D5B8')
            pore_density: Density of pores (0.0-1.0)
            variation: Color variation (0.0-1.0)
            size: Texture size in pixels
            
        Returns:
            Texture array (size, size, 3) in BGR format
        """
        # Convert color
        r, g, b = TextureLibraryGenerator.hex_to_rgb(base_color)
        base = np.array([b, g, r], dtype=np.float32)  # BGR
        
        # Create perlin-like noise for skin variation
        # Use Fourier noise for realistic variation
        texture = np.zeros((size, size, 3), dtype=np.float32)
        
        # Generate multiple octaves of noise for natural variation
        noise = np.zeros((size, size))
        for octave in range(4):
            scale = 2 ** octave
            freq = size / (16 * scale)
            y_coords = np.linspace(0, freq, size)
            x_coords = np.linspace(0, freq, size)
            xx, yy = np.meshgrid(x_coords, y_coords)
            
            # Sine-based noise (approximation of Perlin)
            octave_noise = np.sin(xx * np.pi) * np.cos(yy * np.pi)
            amplitude = 1.0 / (2 ** octave)
            noise += octave_noise * amplitude
        
        # Normalize noise to [-1, 1]
        noise = (noise - np.min(noise)) / (np.max(noise) - np.min(noise)) * 2 - 1
        
        # Apply color variation
        for c in range(3):
            variation_map = noise * variation * 30
            texture[:, :, c] = base[c] + variation_map
        
        # Add pore details (sparse darker spots)
        if pore_density > 0:
            pore_mask = np.random.rand(size, size) < pore_density * 0.05
            pore_strength = np.random.rand(size, size) * 15
            for c in range(3):
                texture[pore_mask, c] -= pore_strength[pore_mask]
        
        # Clamp to valid range
        texture = np.clip(texture, 0, 255)
        
        return texture.astype(np.uint8)
    
    @staticmethod
    def generate_fabric_texture(
        base_color: str,
        fabric_type: str = "cotton",
        weave_scale: float = 0.5,
        size: int = 1024
    ) -> np.ndarray:
        """
        Generate fabric texture with weave pattern.
        
        Args:
            base_color: Hex color code
            fabric_type: 'cotton', 'wool', 'silk', 'synthetic'
            weave_scale: Pattern scale (0.1-2.0)
            size: Texture size
            
        Returns:
            Texture array (size, size, 3) in BGR format
        """
        r, g, b = TextureLibraryGenerator.hex_to_rgb(base_color)
        base = np.array([b, g, r], dtype=np.float32)
        
        texture = np.zeros((size, size, 3), dtype=np.float32)
        
        # Create weave pattern
        x = np.arange(size) / (size / (16 * weave_scale))
        y = np.arange(size) / (size / (16 * weave_scale))
        xx, yy = np.meshgrid(x, y)
        
        # Alternating pattern for weave
        weave = np.sin(xx) * np.cos(yy)
        weave = (weave + 1) / 2  # Normalize to [0, 1]
        
        # Fabric-specific pattern adjustments
        if fabric_type == "wool":
            # Wool has fuzzy appearance with more variation
            weave = weave + np.random.rand(size, size) * 0.1
        elif fabric_type == "silk":
            # Silk has smooth gradient
            weave = cv2.GaussianBlur((weave * 255).astype(np.uint8), (5, 5), 0) / 255.0
        elif fabric_type == "synthetic":
            # Synthetic has sharp patterns
            weave = (weave > 0.5).astype(np.float32)
        
        # Apply color with weave variation
        weave_variation = weave * 25
        for c in range(3):
            texture[:, :, c] = base[c] + (weave_variation - 12.5)
        
        # Clamp
        texture = np.clip(texture, 0, 255)
        
        return texture.astype(np.uint8)
    
    @staticmethod
    def generate_hair_texture(
        base_color: str,
        strand_direction: Tuple[float, float] = (0.7, 0.3),
        size: int = 1024
    ) -> np.ndarray:
        """
        Generate hair texture with strand direction.
        
        Args:
            base_color: Hex color code
            strand_direction: (dx, dy) direction vector
            size: Texture size
            
        Returns:
            Texture array (size, size, 3) in BGR format
        """
        r, g, b = TextureLibraryGenerator.hex_to_rgb(base_color)
        base = np.array([b, g, r], dtype=np.float32)
        
        texture = np.zeros((size, size, 3), dtype=np.float32)
        
        # Create directional strand pattern
        y_coords = np.arange(size)
        x_coords = np.arange(size)
        yy, xx = np.meshgrid(y_coords, x_coords)
        
        # Project onto strand direction
        dx, dy = strand_direction
        norm = np.sqrt(dx**2 + dy**2)
        dx, dy = dx / norm, dy / norm
        
        projection = (xx * dx + yy * dy) / size
        strands = np.sin(projection * np.pi * 8)
        strands = (strands + 1) / 2  # Normalize
        
        # Add perpendicular variation
        perpendicular = (-xx * dy + yy * dx) / size
        perpendicular_var = np.sin(perpendicular * np.pi * 16)
        strands = strands * 0.7 + (perpendicular_var + 1) / 2 * 0.3
        
        # Apply color with strand variation
        strand_variation = strands * 30 - 15
        for c in range(3):
            texture[:, :, c] = base[c] + strand_variation
        
        # Add some fine detail
        noise = np.random.rand(size, size) * 10
        for c in range(3):
            texture[:, :, c] += noise
        
        texture = np.clip(texture, 0, 255)
        
        return texture.astype(np.uint8)
    
    @staticmethod
    def save_texture_pair(
        albedo: np.ndarray,
        output_dir: Path,
        filename_base: str,
        generate_normal: bool = True,
        material_type: str = "skin"
    ) -> bool:
        """
        Save albedo texture and generate/save normal map.
        
        Args:
            albedo: Albedo texture array
            output_dir: Output directory
            filename_base: Base filename (without extension)
            generate_normal: Whether to generate normal map
            material_type: 'skin', 'fabric', 'hair' for normal map generation
            
        Returns:
            True if successful
        """
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Save albedo
            albedo_path = output_dir / f"{filename_base}_albedo.jpg"
            cv2.imwrite(str(albedo_path), albedo, [cv2.IMWRITE_JPEG_QUALITY, 95])
            print(f"✓ Saved albedo: {albedo_path}")
            
            # Generate and save normal map
            if generate_normal:
                normal_map = NormalMapGenerator.generate_for_material(
                    albedo,
                    material_type=material_type
                )
                normal_path = output_dir / f"{filename_base}_normal.jpg"
                cv2.imwrite(str(normal_path), normal_map, [cv2.IMWRITE_JPEG_QUALITY, 95])
                print(f"✓ Saved normal map: {normal_path}")
            
            return True
        except Exception as e:
            print(f"✗ Error saving textures: {e}")
            return False


def main():
    """Generate texture library for base avatars."""
    
    output_dir = Path("/workspaces/Virtualstudio/public/textures/avatars")
    print("=" * 80)
    print("AVATAR TEXTURE LIBRARY GENERATOR")
    print("=" * 80)
    print(f"\nOutput directory: {output_dir}")
    
    # Define avatar materials from avatarDefinitions
    avatar_materials = {
        # Skin textures
        "skin_light": {
            "color": "#F5D5B8",
            "type": "skin",
            "pore_density": 0.3,
            "variation": 0.12
        },
        "skin_medium": {
            "color": "#E5C4A0",
            "type": "skin",
            "pore_density": 0.35,
            "variation": 0.15
        },
        "skin_tanned": {
            "color": "#F4B3A0",
            "type": "skin",
            "pore_density": 0.4,
            "variation": 0.18
        },
        "skin_aged": {
            "color": "#E8C9A0",
            "type": "skin",
            "pore_density": 0.45,
            "variation": 0.2  # More variation for aged skin
        },
        
        # Fabric textures
        "fabric_cotton_light": {
            "color": "#E8E8E8",
            "type": "fabric",
            "fabric_type": "cotton",
            "weave_scale": 0.6
        },
        "fabric_cotton_dark": {
            "color": "#2C3E50",
            "type": "fabric",
            "fabric_type": "cotton",
            "weave_scale": 0.6
        },
        "fabric_wool_dark": {
            "color": "#3D4A52",
            "type": "fabric",
            "fabric_type": "wool",
            "weave_scale": 0.7
        },
        "fabric_synthetic_bright": {
            "color": "#8B008B",
            "type": "fabric",
            "fabric_type": "synthetic",
            "weave_scale": 0.5
        },
        "fabric_silk_dark": {
            "color": "#1A1A1A",
            "type": "fabric",
            "fabric_type": "silk",
            "weave_scale": 0.4
        },
        
        # Hair textures
        "hair_light_brown": {
            "color": "#8B6914",
            "type": "hair",
            "strand_direction": (0.7, 0.3)
        },
        "hair_dark_brown": {
            "color": "#2C1810",
            "type": "hair",
            "strand_direction": (0.7, 0.3)
        },
        "hair_black": {
            "color": "#1A1A1A",
            "type": "hair",
            "strand_direction": (0.7, 0.3)
        },
        "hair_gray": {
            "color": "#A9A9A9",
            "type": "hair",
            "strand_direction": (0.7, 0.3)
        },
        "hair_blonde": {
            "color": "#C4A962",
            "type": "hair",
            "strand_direction": (0.7, 0.3)
        },
    }
    
    print(f"\nGenerating {len(avatar_materials)} texture pairs...")
    print("-" * 80)
    
    success_count = 0
    
    for name, props in avatar_materials.items():
        print(f"\n📦 {name}")
        
        try:
            # Generate appropriate texture
            if props["type"] == "skin":
                texture = TextureLibraryGenerator.generate_skin_texture(
                    props["color"],
                    pore_density=props.get("pore_density", 0.3),
                    variation=props.get("variation", 0.15)
                )
            
            elif props["type"] == "fabric":
                texture = TextureLibraryGenerator.generate_fabric_texture(
                    props["color"],
                    fabric_type=props.get("fabric_type", "cotton"),
                    weave_scale=props.get("weave_scale", 0.5)
                )
            
            elif props["type"] == "hair":
                texture = TextureLibraryGenerator.generate_hair_texture(
                    props["color"],
                    strand_direction=props.get("strand_direction", (0.7, 0.3))
                )
            
            # Save texture and generate normal map
            if TextureLibraryGenerator.save_texture_pair(
                texture,
                output_dir,
                name,
                generate_normal=True,
                material_type=props["type"]
            ):
                success_count += 1
        
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 80)
    print(f"COMPLETE: {success_count}/{len(avatar_materials)} texture pairs generated")
    print("=" * 80)
    
    print("\nGenerated textures:")
    print(f"  Location: {output_dir}")
    print(f"  Format: JPG (1024x1024)")
    print(f"  Per texture: ~150KB albedo + ~100KB normal = ~250KB per pair")
    print(f"  Total size: ~{len(avatar_materials) * 0.25:.1f} MB")
    
    print("\nNext steps:")
    print("  1. Update avatarDefinitions.ts to reference these texture paths")
    print("  2. Verify textures load in browser (check browser console)")
    print("  3. Adjust material properties (roughness, metallic) if needed")
    print("  4. Consider lazy-loading for distant avatars")


if __name__ == "__main__":
    main()

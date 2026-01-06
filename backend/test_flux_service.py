#!/usr/bin/env python3
"""
Test FLUX service
Usage: python test_flux_service.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_flux_service():
    """Test FLUX service functionality."""
    print("Testing FLUX Service")
    print("=" * 50)
    print()
    
    try:
        from flux_service import flux_service
        
        # Check if enabled
        print(f"FLUX Service Enabled: {flux_service.is_enabled()}")
        print(f"Model Loaded: {flux_service.is_model_loaded()}")
        print()
        
        if not flux_service.is_enabled():
            print("⚠️  FLUX service is disabled")
            print("Set ENABLE_FLUX=true to enable")
            return
        
        # Try to load model
        print("Loading FLUX model (this may take a while on first run)...")
        loaded = await flux_service.ensure_model_loaded()
        
        if not loaded:
            print("❌ Failed to load FLUX model")
            print()
            print("Possible issues:")
            print("1. Model not downloaded from R2")
            print("2. Missing dependencies (diffusers, transformers)")
            print("3. Insufficient GPU/CPU memory")
            return
        
        print("✅ FLUX model loaded successfully!")
        print()
        
        # Test generation
        print("Testing image generation...")
        print("Prompt: 'A close-up shot of a character looking worried, dramatic lighting'")
        print()
        
        result = await flux_service.generate_frame(
            prompt="A close-up shot of a character looking worried, dramatic lighting",
            negative_prompt="blurry, low quality",
            width=1920,
            height=1080,
            num_inference_steps=20,
            guidance_scale=7.5
        )
        
        if result["success"]:
            print("✅ Image generated successfully!")
            print(f"   Size: {result['width']}x{result['height']}")
            print(f"   Image bytes: {len(result['image_bytes'])} bytes")
            print()
            print("Next: Test via API endpoint")
            print("  curl -X POST http://localhost:8000/api/storyboards/generate-frame \\")
            print("    -H 'Content-Type: application/json' \\")
            print("    -d '{\"prompt\": \"A close-up shot\", \"shot_type\": \"Close-up\"}'")
        else:
            print(f"❌ Generation failed: {result.get('error', 'Unknown error')}")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print()
        print("Install missing dependencies:")
        print("  pip install diffusers transformers accelerate")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_flux_service())





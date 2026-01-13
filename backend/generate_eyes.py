#!/usr/bin/env python3
"""
Generate Eye Models using Rodin API

Creates various eye shapes and styles for virtual actors.
Includes different eye shapes, expressions, and styles.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from rodin_service import RodinService

# Output directory
OUTPUT_DIR = Path(__file__).parent / 'rodin_models'
OUTPUT_DIR.mkdir(exist_ok=True)

# Eye definitions
EYES = [
    # Realistic eye shapes
    {
        'id': 'eyes_almond',
        'name': 'Almond Eyes',
        'prompt': 'realistic almond-shaped human eyes, symmetrical pair, detailed iris and pupil, natural eyelashes',
        'category': 'eyes'
    },
    {
        'id': 'eyes_round',
        'name': 'Round Eyes',
        'prompt': 'realistic round human eyes, symmetrical pair, large iris, expressive, detailed pupil and eyelashes',
        'category': 'eyes'
    },
    {
        'id': 'eyes_hooded',
        'name': 'Hooded Eyes',
        'prompt': 'realistic hooded human eyes, symmetrical pair, heavy eyelids, sultry expression, detailed iris',
        'category': 'eyes'
    },
    {
        'id': 'eyes_upturned',
        'name': 'Upturned Eyes',
        'prompt': 'realistic upturned cat-like human eyes, symmetrical pair, outer corners lifted, detailed iris and lashes',
        'category': 'eyes'
    },
    {
        'id': 'eyes_downturned',
        'name': 'Downturned Eyes',
        'prompt': 'realistic downturned human eyes, symmetrical pair, gentle expression, outer corners slightly lower, detailed iris',
        'category': 'eyes'
    },
    {
        'id': 'eyes_wide',
        'name': 'Wide Eyes',
        'prompt': 'realistic wide open human eyes, symmetrical pair, alert expression, large visible iris, detailed eyelashes',
        'category': 'eyes'
    },
    {
        'id': 'eyes_narrow',
        'name': 'Narrow Eyes',
        'prompt': 'realistic narrow human eyes, symmetrical pair, mysterious expression, elegant shape, detailed iris',
        'category': 'eyes'
    },
    {
        'id': 'eyes_deep_set',
        'name': 'Deep-Set Eyes',
        'prompt': 'realistic deep-set human eyes, symmetrical pair, prominent brow bone, intense gaze, detailed iris and pupil',
        'category': 'eyes'
    },
]

async def generate_eyes():
    """Generate all eye models"""
    rodin = RodinService()
    
    print(f"\n{'='*60}")
    print(f"GENERATING EYE MODELS - {len(EYES)} items")
    print(f"{'='*60}\n")
    
    success_count = 0
    failed_items = []
    
    for i, eye in enumerate(EYES, 1):
        print(f"\n[{i}/{len(EYES)}] Generating: {eye['name']}")
        print(f"ID: {eye['id']}")
        
        # Build enhanced prompt
        enhanced_prompt = f"{eye['prompt']}, game asset, low poly, studio equipment, isolated on white background, professional quality, realistic rendering"
        
        print(f"Prompt: {enhanced_prompt[:100]}...")
        
        # Output filename (without .glb extension - rodin service adds it)
        filename = eye['id']
        
        try:
            # Generate model
            result = await rodin.generate_and_wait(
                prompt=enhanced_prompt,
                filename=filename,
                quality='medium',
                max_wait=600
            )
            
            # Check result
            if result.get('success'):
                output_path = OUTPUT_DIR / f"{filename}.glb"
                if os.path.exists(output_path):
                    file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
                    print(f"✅ SUCCESS - {eye['name']}")
                    print(f"   File: {filename}.glb ({file_size:.1f} MB)")
                    success_count += 1
                else:
                    print(f"❌ FAILED - {eye['name']} - File not found at {output_path}")
                    failed_items.append(eye['name'])
            else:
                error_msg = result.get('error', 'Unknown error')
                print(f"❌ FAILED - {eye['name']} - {error_msg}")
                failed_items.append(eye['name'])
                
        except Exception as e:
            print(f"❌ FAILED - {eye['name']} - {str(e)}")
            failed_items.append(eye['name'])
        
        # Rate limiting
        if i < len(EYES):
            print("Waiting 2 seconds...")
            await asyncio.sleep(2)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"✅ Successful: {success_count}/{len(EYES)}")
    print(f"❌ Failed: {len(failed_items)}/{len(EYES)}")
    
    if failed_items:
        print(f"\nFailed items:")
        for item in failed_items:
            print(f"  - {item}")
    
    print(f"\nOutput directory: {OUTPUT_DIR}")
    print(f"Next step: Move files to public/models/facial_features/eyes/")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    asyncio.run(generate_eyes())

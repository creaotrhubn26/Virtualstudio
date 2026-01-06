#!/usr/bin/env python3
"""
Download SDXL model as alternative to FLUX (no authentication required)
Usage: python download_sdxl_model.py [--output-dir ./models/sdxl]
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Download SDXL model from Hugging Face (no auth required)')
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./models/sdxl',
        help='Output directory for downloaded model files'
    )
    parser.add_argument(
        '--model',
        type=str,
        default='sdxl-base',
        choices=['sdxl-base', 'sdxl-turbo'],
        help='Which SDXL model to download (default: sdxl-base)'
    )
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    model_map = {
        'sdxl-base': 'stabilityai/stable-diffusion-xl-base-1.0',
        'sdxl-turbo': 'stabilityai/sdxl-turbo'
    }
    
    model_id = model_map[args.model]
    
    print(f"Downloading {args.model} from Hugging Face...")
    print(f"Model ID: {model_id}")
    print(f"Output directory: {output_dir.absolute()}")
    print("(No authentication required)")
    print()
    
    try:
        from huggingface_hub import snapshot_download
        
        print("Using huggingface_hub to download model...")
        print("This may take a while depending on your internet connection...")
        print()
        
        # Download model files
        snapshot_download(
            repo_id=model_id,
            local_dir=str(output_dir),
            local_dir_use_symlinks=False,
        )
        
        print()
        print(f"✅ Successfully downloaded {args.model} to {output_dir.absolute()}")
        print()
        print("Next steps:")
        print(f"1. Upload to R2: python upload_to_r2.py <file> models/sdxl/<file>")
        print("2. Or modify flux_service.py to use SDXL instead")
        
    except ImportError:
        print("❌ Error: huggingface_hub not installed")
        print()
        print("Install it with:")
        print("  pip install huggingface_hub")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error downloading model: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()





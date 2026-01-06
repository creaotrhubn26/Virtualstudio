#!/usr/bin/env python3
"""
Download FLUX.1-schnell model from Hugging Face
Usage: python download_flux_model.py [--output-dir ./models/flux/FLUX.1-schnell]
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Download FLUX.1-schnell model from Hugging Face')
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./models/flux/FLUX.1-schnell',
        help='Output directory for downloaded model files'
    )
    parser.add_argument(
        '--model',
        type=str,
        default='FLUX.1-schnell',
        choices=['FLUX.1-schnell', 'FLUX.1-dev'],
        help='Which FLUX model to download (default: FLUX.1-schnell)'
    )
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    model_name = args.model
    model_id = f"black-forest-labs/{model_name}"
    
    print(f"Downloading {model_name} from Hugging Face...")
    print(f"Model ID: {model_id}")
    print(f"Output directory: {output_dir.absolute()}")
    print()
    
    try:
        from huggingface_hub import snapshot_download, login
        
        # Check if logged in
        try:
            from huggingface_hub import whoami
            user = whoami()
            print(f"✅ Logged in to Hugging Face as: {user.get('name', 'unknown')}")
        except Exception:
            print("⚠️  Not logged in to Hugging Face")
            print()
            print("FLUX.1-schnell requires authentication.")
            print("Please log in with one of these methods:")
            print()
            print("Option 1: Use access token")
            print("  export HUGGING_FACE_HUB_TOKEN='your_token_here'")
            print("  python download_flux_model.py")
            print()
            print("Option 2: Interactive login")
            print("  huggingface-cli login")
            print("  python download_flux_model.py")
            print()
            print("Get your token from: https://huggingface.co/settings/tokens")
            print()
            
            # Try to use token from environment
            token = os.environ.get('HUGGING_FACE_HUB_TOKEN') or os.environ.get('HF_TOKEN')
            if token:
                print("Using token from environment...")
                login(token=token)
            else:
                print("❌ No token found. Please log in first.")
                sys.exit(1)
        
        print("Using huggingface_hub to download model...")
        print("This may take a while depending on your internet connection...")
        print()
        
        # Download model files
        snapshot_download(
            repo_id=model_id,
            local_dir=str(output_dir),
            local_dir_use_symlinks=False,
            ignore_patterns=["*.md", "*.txt", "*.json"] if model_name == "FLUX.1-dev" else None,
        )
        
        print()
        print(f"✅ Successfully downloaded {model_name} to {output_dir.absolute()}")
        print()
        print("Next steps:")
        print(f"1. Upload to R2: python upload_flux_to_r2.py --model-dir {output_dir}")
        print("2. Or upload manually using: python upload_to_r2.py <file> <r2_path>")
        
    except ImportError:
        print("❌ Error: huggingface_hub not installed")
        print()
        print("Install it with:")
        print("  pip install huggingface_hub")
        print()
        print("Or use manual download:")
        print(f"1. Go to: https://huggingface.co/{model_id}")
        print("2. Download files manually")
        print("3. Extract to:", output_dir.absolute())
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error downloading model: {e}")
        print()
        print("Alternative: Manual download")
        print(f"1. Go to: https://huggingface.co/{model_id}")
        if model_name == "FLUX.1-dev":
            print("2. Request access (may require approval)")
        print("3. Download files and extract to:", output_dir.absolute())
        sys.exit(1)

if __name__ == "__main__":
    main()


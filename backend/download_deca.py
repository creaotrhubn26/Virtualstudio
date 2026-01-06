#!/usr/bin/env python3
"""
Script to download DECA model from official sources.
This will download the model to a temporary location so it can be uploaded to R2.
"""

import os
import sys
import urllib.request
from pathlib import Path
import hashlib

DECA_MODEL_URL = "https://github.com/YadiraF/DECA/releases/download/v1.0/deca_model.tar"
# Alternative: Can be downloaded from Google Drive or other sources

def download_file(url: str, output_path: Path, chunk_size: int = 8192):
    """Download a file with progress."""
    print(f"Downloading {url}...")
    print(f"Output: {output_path}")
    
    try:
        with urllib.request.urlopen(url) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            downloaded = 0
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'wb') as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rProgress: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB)", end='', flush=True)
            
            print(f"\n✓ Download complete: {output_path}")
            print(f"  File size: {output_path.stat().st_size / (1024*1024):.2f} MB")
            return True
    except Exception as e:
        print(f"\n✗ Download failed: {e}")
        return False

def main():
    # Default download location
    download_dir = Path(__file__).parent / "downloads"
    output_path = download_dir / "deca_model.tar"
    
    print("DECA Model Downloader")
    print("=" * 50)
    print(f"URL: {DECA_MODEL_URL}")
    print(f"Output: {output_path}")
    print()
    
    if output_path.exists():
        print(f"File already exists: {output_path}")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != 'y':
            print("Cancelled.")
            return
    
    success = download_file(DECA_MODEL_URL, output_path)
    
    if success:
        print(f"\n✓ Model downloaded successfully!")
        print(f"\nNext step: Upload to R2 using:")
        print(f"  python3 upload_to_r2.py {output_path} models/deca/deca_model.tar")
    else:
        print("\n✗ Download failed. You may need to:")
        print("  1. Download manually from: https://github.com/YadiraF/DECA")
        print("  2. Or use the Google Drive link if available")
        print("  3. Then upload using: python3 upload_to_r2.py <path> models/deca/deca_model.tar")

if __name__ == "__main__":
    main()





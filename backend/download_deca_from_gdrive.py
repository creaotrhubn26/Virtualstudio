#!/usr/bin/env python3
"""
Script to download DECA model from Google Drive.
Based on DECA's fetch_data.sh script.
"""

import os
import sys
import requests
from pathlib import Path

# Google Drive file ID from DECA repository
FILEID = "1rp8kdyLPvErw2dTmqtjISRVvQLj6Yzje"
FILENAME = "deca_model.tar"

def download_file_from_google_drive(file_id: str, destination: Path):
    """Download a file from Google Drive using file ID."""
    import re
    
    def get_confirm_token(response):
        """Extract confirm token from response."""
        # Check cookies first
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                return value
        # Check response content for confirm token
        content = response.text
        if 'confirm=' in content:
            match = re.search(r'confirm=([0-9A-Za-z_]+)', content)
            if match:
                return match.group(1)
        return None

    def save_response_content(response, destination):
        chunk_size = 32768
        total_size = int(response.headers.get('Content-Length', 0))
        downloaded = 0
        
        with open(destination, "wb") as f:
            for chunk in response.iter_content(chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        mb_downloaded = downloaded / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        print(f"\rProgress: {percent:.1f}% ({mb_downloaded:.1f} MB / {mb_total:.1f} MB)", end='', flush=True)
        
        print()  # New line after progress

    session = requests.Session()

    print(f"Downloading DECA model from Google Drive (File ID: {file_id})...")
    print("Note: This file is large (414MB), download may take a while...")
    
    # First request to get confirmation token
    url = "https://docs.google.com/uc?export=download"
    params = {'id': file_id}
    
    response = session.get(url, params=params, stream=True)
    
    # Check if we got HTML (confirmation page) or the actual file
    if 'text/html' in response.headers.get('Content-Type', ''):
        # We need to get the confirm token
        token = get_confirm_token(response)
        
        if not token:
            # Try with 't' as confirm (standard for large files)
            token = 't'
        
        # Also try to extract UUID if present
        content = response.text
        uuid_match = re.search(r'name="uuid" value="([^"]+)"', content)
        uuid = uuid_match.group(1) if uuid_match else None
        
        # Make second request with confirmation
        params['confirm'] = token
        if uuid:
            params['uuid'] = uuid
        
        # Use the direct download URL for large files
        url = "https://drive.usercontent.google.com/download"
        response = session.get(url, params=params, stream=True)
    
    destination.parent.mkdir(parents=True, exist_ok=True)
    save_response_content(response, destination)
    
    # Verify file is not just HTML error page
    if destination.exists():
        file_size = destination.stat().st_size
        if file_size < 1000:  # Less than 1KB is probably an error page
            with open(destination, 'rb') as f:
                content = f.read(100)
                if b'<!DOCTYPE html' in content or b'<html' in content:
                    destination.unlink()
                    print("✗ Download failed: Received HTML page instead of file")
                    return False
        
        return file_size > 0
    
    return False

def main():
    # Default download location
    download_dir = Path(__file__).parent / "downloads"
    output_path = download_dir / FILENAME
    
    print("DECA Model Downloader (Google Drive)")
    print("=" * 50)
    print(f"File ID: {FILEID}")
    print(f"Output: {output_path}")
    print()
    
    if output_path.exists():
        print(f"File already exists: {output_path}")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != 'y':
            print("Cancelled.")
            return
    
    try:
        success = download_file_from_google_drive(FILEID, output_path)
        
        if success:
            file_size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"\n✓ Model downloaded successfully!")
            print(f"  File: {output_path}")
            print(f"  Size: {file_size_mb:.2f} MB")
            print(f"\nNext step: Upload to R2 using:")
            print(f"  cd backend")
            print(f"  python3 upload_to_r2.py {output_path} models/deca/deca_model.tar")
        else:
            print("\n✗ Download failed.")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()


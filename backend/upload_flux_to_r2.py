#!/usr/bin/env python3
"""
Upload FLUX model files to Cloudflare R2
Usage: python upload_flux_to_r2.py [--model-dir ./models/flux/FLUX.1-schnell]
"""

import os
import sys
import argparse
from pathlib import Path

def upload_file_to_r2(local_path: Path, r2_key: str) -> bool:
    """Upload a single file to R2 using multipart upload for large files."""
    try:
        import boto3
        from botocore.config import Config
        from utils.r2_client import get_r2_client, R2_BUCKET_NAME
        
        file_size = local_path.stat().st_size
        file_size_mb = file_size / (1024 * 1024)
        
        print(f"Uploading {local_path.name} ({file_size_mb:.2f} MB)...")
        
        client = get_r2_client()
        
        # Determine content type
        content_type = 'application/octet-stream'
        if local_path.suffix == '.json':
            content_type = 'application/json'
        elif local_path.suffix == '.yaml' or local_path.suffix == '.yml':
            content_type = 'text/yaml'
        elif local_path.suffix == '.txt':
            content_type = 'text/plain'
        
        # For large files (>100MB), use multipart upload
        # For smaller files, use regular upload
        if file_size > 100 * 1024 * 1024:  # 100 MB
            print(f"  Using multipart upload for large file ({file_size_mb:.2f} MB)...")
            
            from boto3.s3.transfer import TransferConfig
            
            config = TransferConfig(
                multipart_threshold=100 * 1024 * 1024,  # 100 MB
                max_concurrency=4,
                multipart_chunksize=50 * 1024 * 1024,  # 50 MB chunks
                use_threads=True
            )
            
            client.upload_file(
                str(local_path),
                R2_BUCKET_NAME,
                r2_key,
                Config=config,
                ExtraArgs={'ContentType': content_type}
            )
        else:
            # Regular upload for smaller files
            client.upload_file(
                str(local_path),
                R2_BUCKET_NAME,
                r2_key,
                ExtraArgs={'ContentType': content_type}
            )
        
        print(f"  ✅ Uploaded: {r2_key}")
        return True
    except Exception as e:
        print(f"  ❌ Failed to upload {local_path.name}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='Upload FLUX model to Cloudflare R2')
    parser.add_argument(
        '--model-dir',
        type=str,
        default='./models/flux/FLUX.1-schnell',
        help='Local directory containing FLUX model files'
    )
    parser.add_argument(
        '--r2-prefix',
        type=str,
        default='models/flux/FLUX.1-schnell',
        help='R2 path prefix (default: models/flux/FLUX.1-schnell)'
    )
    args = parser.parse_args()
    
    model_dir = Path(args.model_dir)
    r2_prefix = args.r2_prefix.rstrip('/')
    
    if not model_dir.exists():
        print(f"❌ Error: Model directory not found: {model_dir.absolute()}")
        print()
        print("First download the model:")
        print("  python download_flux_model.py")
        sys.exit(1)
    
    print(f"Uploading FLUX model from {model_dir.absolute()} to R2...")
    print(f"R2 prefix: {r2_prefix}")
    print()
    
    # Find all files in model directory
    files_to_upload = []
    for file_path in model_dir.rglob('*'):
        if file_path.is_file():
            # Get relative path from model_dir
            rel_path = file_path.relative_to(model_dir)
            r2_key = f"{r2_prefix}/{rel_path.as_posix()}"
            files_to_upload.append((file_path, r2_key))
    
    if not files_to_upload:
        print("❌ No files found in model directory")
        sys.exit(1)
    
    print(f"Found {len(files_to_upload)} files to upload")
    print()
    
    # Upload files
    success_count = 0
    failed_count = 0
    
    for local_path, r2_key in files_to_upload:
        if upload_file_to_r2(local_path, r2_key):
            success_count += 1
        else:
            failed_count += 1
    
    print()
    print(f"✅ Upload complete: {success_count} succeeded, {failed_count} failed")
    
    if success_count > 0:
        print()
        print("Model is now available in R2!")
        print("The FLUX service will automatically download it on first use.")
        print()
        print("Test the service:")
        print("  curl http://localhost:8000/api/health")
        print("  # Check 'flux' status in response")

if __name__ == "__main__":
    main()



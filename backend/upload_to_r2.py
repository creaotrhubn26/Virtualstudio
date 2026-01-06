#!/usr/bin/env python3
"""
Script for uploading model files to Cloudflare R2.
Usage: python upload_to_r2.py <local_file_path> <r2_path>
Example: python upload_to_r2.py deca_model.tar models/deca/deca_model.tar
"""

import os
import sys
import asyncio
import boto3
from botocore.config import Config
from pathlib import Path

# Use same R2 configuration as sam3d_service
R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"

# Note: R2 credentials must be set in environment:
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY

def get_r2_client():
    """Get S3-compatible client for Cloudflare R2."""
    # Use same logic as sam3d_service for consistency
    # Try CLOUDFLARE_R2_* first, fallback to R2_* for backward compatibility
    # Access key must be exactly 32 characters for S3-compatible API
    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    access_key = access_key.strip()[:32]
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    secret_key = secret_key.strip()
    
    if not access_key or not secret_key:
        raise ValueError("CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY (or R2_*) environment variables must be set")
    
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

def upload_to_r2(local_path: str, r2_path: str) -> bool:
    """Upload a file to Cloudflare R2 bucket."""
    local_file = Path(local_path)
    
    if not local_file.exists():
        print(f"Error: Local file not found: {local_path}")
        return False
    
    file_size = local_file.stat().st_size
    print(f"Uploading {local_path} ({file_size / (1024*1024):.2f} MB) to R2: {r2_path}")
    
    try:
        client = get_r2_client()
        
        # For large files (>100MB), use multipart upload
        # For smaller files, use regular upload
        if file_size > 100 * 1024 * 1024:  # 100 MB
            print(f"File is large ({file_size / (1024*1024):.2f} MB), using multipart upload...")
            
            # Use TransferConfig for multipart upload
            from boto3.s3.transfer import TransferConfig
            
            config = TransferConfig(
                multipart_threshold=100 * 1024 * 1024,  # 100 MB
                max_concurrency=4,
                multipart_chunksize=50 * 1024 * 1024,  # 50 MB chunks
                use_threads=True
            )
            
            client.upload_file(
                str(local_file),
                R2_BUCKET_NAME,
                r2_path,
                Config=config
            )
        else:
            # Regular upload for smaller files
            client.upload_file(
                str(local_file),
                R2_BUCKET_NAME,
                r2_path
            )
        
        print(f"✓ Successfully uploaded {local_path} to s3://{R2_BUCKET_NAME}/{r2_path}")
        return True
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python upload_to_r2.py <local_file_path> <r2_path>")
        print("\nExamples:")
        print("  python upload_to_r2.py deca_model.tar models/deca/deca_model.tar")
        print("  python upload_to_r2.py model.ckpt Sam-3D/sam-3d-body-dinov3/model.ckpt")
        sys.exit(1)
    
    local_path = sys.argv[1]
    r2_path = sys.argv[2]
    
    success = upload_to_r2(local_path, r2_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()


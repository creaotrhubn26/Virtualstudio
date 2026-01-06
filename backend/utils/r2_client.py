"""
Centralized R2 Client Utility
Shared R2 client functionality for all ML model services.
Reduces code duplication across SAM3D, DECA, FaceXFormer, and other services.
"""

import os
import boto3
from botocore.config import Config
from pathlib import Path
from typing import Optional

R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"


def get_r2_client():
    """
    Get S3-compatible client for Cloudflare R2.
    
    Uses CLOUDFLARE_R2_* environment variables first, falls back to R2_* for backward compatibility.
    
    Returns:
        boto3 S3 client configured for Cloudflare R2
        
    Raises:
        ValueError: If required credentials are not set
    """
    # Try CLOUDFLARE_R2_* first, fallback to R2_* for backward compatibility
    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    access_key = access_key.strip()
    
    # Access key must be exactly 32 characters for S3-compatible API
    if len(access_key) > 32:
        access_key = access_key[:32]
    
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    secret_key = secret_key.strip()
    
    if not access_key or not secret_key:
        raise ValueError(
            "R2 credentials not set. Please set either:\n"
            "  - CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY\n"
            "  - OR R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (legacy)"
        )
    
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


async def download_from_r2(r2_path: str, local_path: Path) -> bool:
    """
    Download a file from Cloudflare R2 bucket using S3-compatible API.
    
    Args:
        r2_path: Path to file in R2 bucket (e.g., "models/deca/deca_model.tar")
        local_path: Local path where file should be saved
        
    Returns:
        True if download succeeded, False otherwise
    """
    local_path = Path(local_path)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    
    import asyncio
    
    print(f"Downloading {r2_path} from R2...")
    try:
        def do_download():
            client = get_r2_client()
            client.download_file(R2_BUCKET_NAME, r2_path, str(local_path))
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, do_download)
        print(f"Downloaded {r2_path} to {local_path}")
        return True
    except Exception as e:
        print(f"Error downloading {r2_path} from R2: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_file_exists_in_r2(r2_path: str) -> bool:
    """
    Check if a file exists in R2 bucket.
    
    Args:
        r2_path: Path to file in R2 bucket
        
    Returns:
        True if file exists, False otherwise
    """
    try:
        client = get_r2_client()
        client.head_object(Bucket=R2_BUCKET_NAME, Key=r2_path)
        return True
    except Exception:
        return False


def list_r2_files(prefix: str = "", max_keys: int = 100) -> list:
    """
    List files in R2 bucket with given prefix.
    
    Args:
        prefix: Prefix to filter files (e.g., "models/deca/")
        max_keys: Maximum number of files to return
        
    Returns:
        List of file keys (paths) in the bucket
    """
    try:
        client = get_r2_client()
        response = client.list_objects_v2(
            Bucket=R2_BUCKET_NAME,
            Prefix=prefix,
            MaxKeys=max_keys
        )
        return [obj['Key'] for obj in response.get('Contents', [])]
    except Exception as e:
        print(f"Error listing R2 files: {e}")
        return []


# Separate bucket for casting assets (public-read)
CASTING_ASSETS_BUCKET = "casting-assets"
R2_PUBLIC_BASE_URL = os.environ.get('R2_PUBLIC_BASE_URL', 'https://pub-casting.r2.dev')


def upload_to_r2(file_bytes: bytes, r2_key: str, content_type: str = 'image/png', bucket: str = None) -> str:
    """
    Upload a file to Cloudflare R2 bucket.
    
    Args:
        file_bytes: The file content as bytes
        r2_key: Path/key for the file in R2 bucket (e.g., "logos/user123/logo.png")
        content_type: MIME type of the file
        bucket: Optional bucket name (defaults to ml-models, use CASTING_ASSETS_BUCKET for public assets)
        
    Returns:
        The public URL of the uploaded file
        
    Raises:
        Exception: If upload fails
    """
    bucket_name = bucket or R2_BUCKET_NAME
    
    try:
        client = get_r2_client()
        client.put_object(
            Bucket=bucket_name,
            Key=r2_key,
            Body=file_bytes,
            ContentType=content_type
        )
        
        # Return public URL
        if bucket == CASTING_ASSETS_BUCKET:
            return f"{R2_PUBLIC_BASE_URL}/{r2_key}"
        else:
            # For ml-models bucket, return the key (not publicly accessible)
            return r2_key
            
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        raise



"""
Centralized R2 Client Utility
Shared R2 client functionality for all ML model services.
Reduces code duplication across SAM3D, DECA, FaceXFormer, and other services.
"""

import os
import boto3
from botocore.config import Config
from boto3.s3.transfer import TransferConfig
from mimetypes import guess_type
from pathlib import Path
from typing import Optional


def get_r2_account_id() -> str:
    return (
        os.environ.get('CLOUDFLARE_R2_ACCOUNT_ID')
        or os.environ.get('R2_ACCOUNT_ID')
        or 'bbda9f467577de94fefbc4f2954db032'
    ).strip()


def get_r2_endpoint() -> str:
    explicit_endpoint = os.environ.get('CLOUDFLARE_R2_ENDPOINT') or os.environ.get('R2_ENDPOINT')
    if explicit_endpoint and explicit_endpoint.strip():
        return explicit_endpoint.strip().rstrip('/')
    return f"https://{get_r2_account_id()}.r2.cloudflarestorage.com"


def get_models_bucket_name() -> str:
    explicit_bucket = os.environ.get('CLOUDFLARE_R2_MODELS_BUCKET') or os.environ.get('R2_BUCKET_NAME')
    if explicit_bucket and explicit_bucket.strip():
        return explicit_bucket.strip()

    bucket_list = os.environ.get('CLOUDFLARE_R2_MODELS_BUCKETS', '').strip()
    if bucket_list:
        for bucket_name in bucket_list.split(','):
            cleaned = bucket_name.strip()
            if cleaned:
                return cleaned

    return 'ml-models'


R2_ENDPOINT = get_r2_endpoint()
R2_BUCKET_NAME = get_models_bucket_name()


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
        endpoint_url=get_r2_endpoint(),
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
CASTING_ASSETS_BUCKET = os.environ.get('R2_PUBLIC_ASSETS_BUCKET', 'casting-assets')
R2_PUBLIC_BASE_URL = os.environ.get('R2_PUBLIC_BASE_URL', 'https://pub-casting.r2.dev').rstrip('/')


def _parse_bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default

    return raw.strip().lower() not in {'0', 'false', 'no', 'off'}


def get_casting_assets_bucket() -> str:
    return os.environ.get('R2_PUBLIC_ASSETS_BUCKET', CASTING_ASSETS_BUCKET).strip() or 'casting-assets'


def get_public_r2_base_url() -> str:
    return os.environ.get('R2_PUBLIC_BASE_URL', R2_PUBLIC_BASE_URL).rstrip('/')


def build_public_r2_url(r2_key: str, public_base_url: Optional[str] = None) -> str:
    base_url = (public_base_url or get_public_r2_base_url()).rstrip('/')
    return f"{base_url}/{r2_key.lstrip('/')}"


def upload_to_r2(
    file_bytes: bytes,
    r2_key: str,
    content_type: str = 'image/png',
    bucket: str = None,
    public_base_url: Optional[str] = None,
) -> str:
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
        if bucket_name != R2_BUCKET_NAME:
            return build_public_r2_url(r2_key, public_base_url)
        else:
            # For ml-models bucket, return the key (not publicly accessible)
            return r2_key
            
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        raise


def upload_file_to_r2(
    local_path: Path | str,
    r2_key: str,
    content_type: Optional[str] = None,
    bucket: Optional[str] = None,
    public_base_url: Optional[str] = None,
) -> str:
    """
    Upload a local file to Cloudflare R2.

    Uses multipart upload automatically for larger files.
    Returns either a public URL (for non-default/public buckets) or the raw key.
    """
    file_path = Path(local_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    bucket_name = bucket or R2_BUCKET_NAME
    inferred_content_type = content_type or guess_type(str(file_path))[0] or 'application/octet-stream'
    file_size = file_path.stat().st_size

    client = get_r2_client()
    transfer_config = TransferConfig(
        multipart_threshold=25 * 1024 * 1024,
        multipart_chunksize=25 * 1024 * 1024,
        max_concurrency=4,
        use_threads=True,
    )

    extra_args = {'ContentType': inferred_content_type}
    client.upload_file(
        str(file_path),
        bucket_name,
        r2_key,
        ExtraArgs=extra_args,
        Config=transfer_config,
    )

    if bucket_name != R2_BUCKET_NAME:
        return build_public_r2_url(r2_key, public_base_url)

    return r2_key


def head_r2_object(r2_key: str, bucket: Optional[str] = None) -> Optional[dict]:
    """
    Fetch metadata for a single R2 object.
    Returns None if the object cannot be found.
    """
    bucket_name = bucket or R2_BUCKET_NAME
    try:
        client = get_r2_client()
        return client.head_object(Bucket=bucket_name, Key=r2_key)
    except Exception:
        return None


def get_r2_object(r2_key: str, bucket: Optional[str] = None) -> Optional[dict]:
    """
    Fetch a single object from R2.
    Returns None if the object cannot be fetched.
    """
    bucket_name = bucket or R2_BUCKET_NAME
    try:
        client = get_r2_client()
        return client.get_object(Bucket=bucket_name, Key=r2_key)
    except Exception:
        return None


def delete_from_r2(r2_key: str, bucket: Optional[str] = None) -> bool:
    """
    Delete a single object from R2.
    Returns True on success, False otherwise.
    """
    bucket_name = bucket or R2_BUCKET_NAME
    try:
        client = get_r2_client()
        client.delete_object(Bucket=bucket_name, Key=r2_key)
        return True
    except Exception as e:
        print(f"Error deleting {r2_key} from R2: {e}")
        return False


def is_public_r2_storage_enabled() -> bool:
    """
    Public asset storage is considered enabled when credentials exist and the feature flag is on.
    """
    if not _parse_bool_env('R2_LARGE_FILE_STORAGE_ENABLED', True):
        return False

    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    return bool(access_key.strip() and secret_key.strip())

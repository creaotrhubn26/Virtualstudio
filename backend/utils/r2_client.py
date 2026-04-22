"""
Centralized R2 Client Utility
Shared R2 client functionality for all ML model services.
Reduces code duplication across SAM3D, DECA, FaceXFormer, and other services.

Env vars:
  CLOUDFLARE_R2_ACCESS_KEY_ID    (required)
  CLOUDFLARE_R2_SECRET_ACCESS_KEY (required)
  CLOUDFLARE_R2_ACCOUNT_ID        — used to build the endpoint URL. Falls
                                    back to the historical hardcoded
                                    bbda9f4675... account for backwards
                                    compatibility.
  CLOUDFLARE_R2_MODELS_BUCKETS    — comma-separated list of buckets that
                                    hold ML models (e.g. "ml-models,
                                    ml-models2"). The first entry is the
                                    default/primary; lookups fall through
                                    the list when a key is missing from
                                    one bucket.
  R2_PUBLIC_BASE_URL              — base URL for the casting-assets
                                    public bucket.
"""

import os
import asyncio
from pathlib import Path
from typing import List, Optional

import boto3
from botocore.config import Config

# Endpoint — derive from account id when set, fall back to the historical
# hardcoded account for backwards compat with older deployments.
_DEFAULT_R2_ACCOUNT = "bbda9f467577de94fefbc4f2954db032"
_R2_ACCOUNT_ID = (os.environ.get("CLOUDFLARE_R2_ACCOUNT_ID") or _DEFAULT_R2_ACCOUNT).strip()
R2_ENDPOINT = f"https://{_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


def _parse_bucket_list(raw: Optional[str], default_first: str) -> List[str]:
    if not raw:
        return [default_first]
    out = [b.strip() for b in raw.split(",") if b.strip()]
    return out or [default_first]


# Primary ML model bucket list. The first entry is used as the default
# bucket for uploads/downloads when the caller doesn't name one.
R2_MODELS_BUCKETS: List[str] = _parse_bucket_list(
    os.environ.get("CLOUDFLARE_R2_MODELS_BUCKETS"),
    default_first="ml-models",
)
# Kept for backwards compatibility — callers that wrote "R2_BUCKET_NAME"
# hardcoded still work; they just see the primary bucket.
R2_BUCKET_NAME = R2_MODELS_BUCKETS[0]


def get_r2_client():
    """
    Get S3-compatible client for Cloudflare R2.
    Uses CLOUDFLARE_R2_* env vars first, falls back to R2_* for legacy compat.

    Returns:
        boto3 S3 client configured for Cloudflare R2.

    Raises:
        ValueError: If required credentials are not set.
    """
    access_key = (
        os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID")
        or os.environ.get("R2_ACCESS_KEY_ID", "")
    ).strip()
    # Access key must be exactly 32 characters for S3-compatible API
    if len(access_key) > 32:
        access_key = access_key[:32]

    secret_key = (
        os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
        or os.environ.get("R2_SECRET_ACCESS_KEY", "")
    ).strip()

    if not access_key or not secret_key:
        raise ValueError(
            "R2 credentials not set. Please set either:\n"
            "  - CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY\n"
            "  - OR R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (legacy)"
        )

    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


async def download_from_r2(r2_path: str, local_path: Path, bucket: Optional[str] = None) -> bool:
    """
    Download a file from Cloudflare R2 using S3-compatible API.

    If ``bucket`` is None, tries each bucket in R2_MODELS_BUCKETS in order
    until the file is found. This supports the multi-bucket setup.

    Args:
        r2_path: Key in R2 bucket (e.g. "models/deca/deca_model.tar")
        local_path: Local path where file should be saved
        bucket: Optional explicit bucket; defaults to trying all model buckets.

    Returns:
        True if download succeeded from any bucket, False otherwise.
    """
    local_path = Path(local_path)
    local_path.parent.mkdir(parents=True, exist_ok=True)

    buckets_to_try = [bucket] if bucket else list(R2_MODELS_BUCKETS)

    def do_download(client, target_bucket: str) -> bool:
        try:
            client.download_file(target_bucket, r2_path, str(local_path))
            return True
        except Exception as exc:
            # Silent miss when iterating across buckets; final error bubbled up below.
            print(f"[R2] download {r2_path} from {target_bucket} → {exc.__class__.__name__}: {exc}")
            return False

    loop = asyncio.get_event_loop()

    for target_bucket in buckets_to_try:
        if not target_bucket:
            continue
        print(f"Downloading {r2_path} from R2 bucket {target_bucket!r}…")
        try:
            client = await loop.run_in_executor(None, get_r2_client)
            ok = await loop.run_in_executor(None, do_download, client, target_bucket)
            if ok:
                print(f"Downloaded {r2_path} from {target_bucket!r} → {local_path}")
                return True
        except Exception as e:
            print(f"Error downloading {r2_path} from {target_bucket!r}: {e}")
            continue

    return False


def check_file_exists_in_r2(r2_path: str, bucket: Optional[str] = None) -> bool:
    """
    Check if a file exists in R2. If ``bucket`` is None, checks every bucket
    in R2_MODELS_BUCKETS and returns True when any one has it.
    """
    buckets_to_check = [bucket] if bucket else list(R2_MODELS_BUCKETS)
    try:
        client = get_r2_client()
    except Exception:
        return False
    for target_bucket in buckets_to_check:
        if not target_bucket:
            continue
        try:
            client.head_object(Bucket=target_bucket, Key=r2_path)
            return True
        except Exception:
            continue
    return False


def find_bucket_for_key(r2_path: str) -> Optional[str]:
    """Return the first bucket in R2_MODELS_BUCKETS that has ``r2_path``."""
    try:
        client = get_r2_client()
    except Exception:
        return None
    for target_bucket in R2_MODELS_BUCKETS:
        try:
            client.head_object(Bucket=target_bucket, Key=r2_path)
            return target_bucket
        except Exception:
            continue
    return None


def list_r2_files(prefix: str = "", max_keys: int = 100, bucket: Optional[str] = None) -> list:
    """
    List files in R2 with the given prefix.

    Without ``bucket`` this iterates every bucket in R2_MODELS_BUCKETS and
    merges results (each entry prefixed with ``bucket/``) so callers can
    distinguish which bucket an object came from. Pass an explicit bucket
    to keep the legacy single-bucket shape (list of bare keys).
    """
    try:
        client = get_r2_client()
    except Exception as exc:
        print(f"Error listing R2 files: {exc}")
        return []

    if bucket:
        try:
            response = client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=max_keys)
            return [obj["Key"] for obj in response.get("Contents", [])]
        except Exception as exc:
            print(f"Error listing R2 bucket {bucket}: {exc}")
            return []

    merged: list = []
    for target_bucket in R2_MODELS_BUCKETS:
        try:
            response = client.list_objects_v2(
                Bucket=target_bucket, Prefix=prefix, MaxKeys=max_keys
            )
            merged.extend(
                f"{target_bucket}/{obj['Key']}" for obj in response.get("Contents", [])
            )
        except Exception as exc:
            print(f"Error listing R2 bucket {target_bucket}: {exc}")
    return merged


# Separate bucket for casting assets (public-read)
CASTING_ASSETS_BUCKET = "casting-assets"
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL", "https://pub-casting.r2.dev")


def upload_to_r2(
    file_bytes: bytes,
    r2_key: str,
    content_type: str = "image/png",
    bucket: Optional[str] = None,
) -> str:
    """
    Upload a file to Cloudflare R2.

    Args:
        file_bytes: The file content as bytes.
        r2_key: Key for the object in the bucket.
        content_type: MIME type.
        bucket: Optional bucket. Defaults to the primary model bucket
                (R2_MODELS_BUCKETS[0]); pass ``CASTING_ASSETS_BUCKET`` for
                the public-read bucket.

    Returns:
        The public URL of the uploaded file when uploaded to the public
        casting-assets bucket; the key otherwise (ML-model buckets are not
        publicly readable).

    Raises:
        Exception: If upload fails.
    """
    bucket_name = bucket or R2_BUCKET_NAME

    try:
        client = get_r2_client()
        client.put_object(
            Bucket=bucket_name,
            Key=r2_key,
            Body=file_bytes,
            ContentType=content_type,
        )

        if bucket_name == CASTING_ASSETS_BUCKET:
            return f"{R2_PUBLIC_BASE_URL}/{r2_key}"
        # Model buckets are not publicly readable; callers must fetch via backend.
        return r2_key

    except Exception as e:
        print(f"Error uploading to R2: {e}")
        raise

"""
Helpers for storing large generated assets in Cloudflare R2 with local fallback.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from utils.r2_client import (
        CASTING_ASSETS_BUCKET,
        R2_PUBLIC_BASE_URL,
        delete_from_r2,
        get_casting_assets_bucket,
        get_public_r2_base_url,
        head_r2_object,
        is_public_r2_storage_enabled,
        upload_file_to_r2,
    )
except ImportError:
    from .r2_client import (
        CASTING_ASSETS_BUCKET,
        R2_PUBLIC_BASE_URL,
        delete_from_r2,
        get_casting_assets_bucket,
        get_public_r2_base_url,
        head_r2_object,
        is_public_r2_storage_enabled,
        upload_file_to_r2,
    )


def _is_public_http_url(value: Optional[str]) -> bool:
    return isinstance(value, str) and value.startswith(('http://', 'https://'))


def get_generated_asset_bucket() -> str:
    return os.environ.get('R2_GENERATED_ASSET_BUCKET', get_casting_assets_bucket()).strip() or CASTING_ASSETS_BUCKET


def get_generated_asset_public_base_url() -> str:
    return os.environ.get(
        'R2_GENERATED_ASSET_PUBLIC_BASE_URL',
        get_public_r2_base_url(),
    ).rstrip('/')


def get_generated_asset_prefix() -> str:
    return os.environ.get('R2_GENERATED_ASSET_PREFIX', 'generated-assets').strip('/') or 'generated-assets'


def _parse_bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default

    return raw.strip().lower() not in {'0', 'false', 'no', 'off'}


def build_generated_asset_key(category: str, storage_id: str, filename: str) -> str:
    safe_category = category.strip('/').replace(' ', '-')
    safe_storage_id = storage_id.strip('/').replace(' ', '-')
    safe_filename = Path(filename).name
    return f"{get_generated_asset_prefix()}/{safe_category}/{safe_storage_id}/{safe_filename}"


def get_storage_metadata_path(asset_path: Path | str) -> Path:
    file_path = Path(asset_path)
    return file_path.with_name(f"{file_path.name}.storage.json")


def write_storage_metadata(metadata_path: Path | str, metadata: Dict[str, Any]) -> None:
    path = Path(metadata_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')


def read_storage_metadata(metadata_path: Path | str) -> Optional[Dict[str, Any]]:
    path = Path(metadata_path)
    if not path.exists():
        return None

    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def store_generated_file(
    local_path: Path | str,
    category: str,
    storage_id: str,
    filename: Optional[str] = None,
    content_type: str = 'application/octet-stream',
    fallback_url: Optional[str] = None,
    delete_local_after_upload: Optional[bool] = None,
    bucket: Optional[str] = None,
    public_base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Store a generated file in public R2 when available, otherwise keep it locally.
    """
    file_path = Path(local_path)
    final_filename = filename or file_path.name
    size_bytes = file_path.stat().st_size if file_path.exists() else 0
    metadata: Dict[str, Any] = {
        'storage': 'local',
        'filename': final_filename,
        'content_type': content_type,
        'size_bytes': size_bytes,
        'local_path': str(file_path),
        'url': fallback_url,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }

    if not file_path.exists():
        return metadata

    if not is_public_r2_storage_enabled():
        return metadata

    try:
        selected_bucket = bucket or get_generated_asset_bucket()
        selected_public_base_url = public_base_url or get_generated_asset_public_base_url()
        r2_key = build_generated_asset_key(category, storage_id, final_filename)
        public_url = upload_file_to_r2(
            file_path,
            r2_key,
            content_type=content_type,
            bucket=selected_bucket,
            public_base_url=selected_public_base_url,
        )
        resolved_url = public_url if _is_public_http_url(public_url) else (fallback_url or public_url)
        metadata.update({
            'storage': 'r2',
            'bucket': selected_bucket,
            'r2_key': r2_key,
            'public_url': public_url if _is_public_http_url(public_url) else None,
            'url': resolved_url,
        })

        should_delete_local_copy = (
            _parse_bool_env('R2_DELETE_LOCAL_AFTER_UPLOAD', True)
            if delete_local_after_upload is None
            else bool(delete_local_after_upload)
        )
        if should_delete_local_copy:
            try:
                file_path.unlink()
            except FileNotFoundError:
                pass

    except Exception as error:
        metadata['upload_error'] = str(error)

    return metadata


def delete_stored_asset(metadata: Optional[Dict[str, Any]], local_path: Optional[Path | str] = None) -> bool:
    """
    Delete a generated asset regardless of whether it lives locally or in R2.
    """
    deleted_anything = False

    if metadata and metadata.get('storage') == 'r2' and metadata.get('r2_key'):
        deleted_anything = delete_from_r2(
            str(metadata['r2_key']),
            bucket=str(metadata.get('bucket') or get_generated_asset_bucket()),
        ) or deleted_anything

    resolved_local_path = Path(local_path) if local_path else None
    if not resolved_local_path and metadata and metadata.get('local_path'):
        resolved_local_path = Path(str(metadata['local_path']))

    if resolved_local_path and resolved_local_path.exists():
        resolved_local_path.unlink()
        deleted_anything = True

    return deleted_anything


def get_stored_asset_head(metadata: Optional[Dict[str, Any]], local_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """
    Return content-type and size metadata for a stored asset.
    """
    if metadata and metadata.get('storage') == 'r2' and metadata.get('r2_key'):
        r2_head = head_r2_object(
            str(metadata['r2_key']),
            bucket=str(metadata.get('bucket') or get_generated_asset_bucket()),
        )
        if r2_head:
            return {
                'content_type': r2_head.get('ContentType') or metadata.get('content_type') or 'application/octet-stream',
                'content_length': r2_head.get('ContentLength') or metadata.get('size_bytes') or 0,
                'storage': 'r2',
                'url': metadata.get('url') or metadata.get('public_url'),
            }
        return {
            'content_type': metadata.get('content_type') or 'application/octet-stream',
            'content_length': metadata.get('size_bytes') or 0,
            'storage': 'unknown',
            'url': metadata.get('url') or metadata.get('public_url'),
        }

    resolved_local_path = Path(local_path) if local_path else None
    if not resolved_local_path and metadata and metadata.get('local_path'):
        resolved_local_path = Path(str(metadata['local_path']))

    if resolved_local_path and resolved_local_path.exists():
        return {
            'content_type': (metadata or {}).get('content_type') or 'application/octet-stream',
            'content_length': resolved_local_path.stat().st_size,
            'storage': 'local',
            'url': (metadata or {}).get('url'),
        }

    return {
        'content_type': (metadata or {}).get('content_type') or 'application/octet-stream',
        'content_length': (metadata or {}).get('size_bytes') or 0,
        'storage': (metadata or {}).get('storage') or 'unknown',
        'url': (metadata or {}).get('url'),
    }

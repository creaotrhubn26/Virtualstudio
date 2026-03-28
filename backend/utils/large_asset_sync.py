"""
Backfill existing large local assets into Cloudflare R2 while keeping local fallbacks.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass
from mimetypes import guess_type
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence
from urllib.parse import quote

try:
    from utils.generated_asset_storage import (
        get_storage_metadata_path,
        read_storage_metadata,
        store_generated_file,
        write_storage_metadata,
    )
    from utils.r2_client import head_r2_object
except ImportError:
    from .generated_asset_storage import (
        get_storage_metadata_path,
        read_storage_metadata,
        store_generated_file,
        write_storage_metadata,
    )
    from .r2_client import head_r2_object


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MIN_BYTES = int(os.environ.get("R2_LARGE_FILE_SYNC_MIN_BYTES", str(512 * 1024)))
_DEFAULT_SYNC_ROOTS_RAW = os.environ.get(
    "R2_LARGE_FILE_SYNC_ROOTS",
    "backend/test_images,backend/outputs,backend/backend/outputs,backend/humaniflow/assets,"
    "backend/humaniflow/model_files,backend/sam3d_repo/assets,backend/sam3d_repo/notebook/images,"
    "backend/facexformer_repo/docs/static/images,attached_assets,public",
)
DEFAULT_SYNC_ROOTS = tuple(root.strip() for root in _DEFAULT_SYNC_ROOTS_RAW.split(",") if root.strip())
DEFAULT_REPORT_PATH = REPO_ROOT / "backend" / "outputs" / "r2_large_asset_sync_report.json"
_DEFAULT_DELETE_SAFE_CATEGORIES_RAW = os.environ.get(
    "R2_LARGE_FILE_DELETE_SAFE_CATEGORIES",
    "avatar-library,avatars,avatars-backup,studio-storage,attached-assets,public-assets,humaniflow-assets,sam3d-assets,facexformer-assets",
)
DELETE_SAFE_CATEGORIES = frozenset(
    category.strip()
    for category in _DEFAULT_DELETE_SAFE_CATEGORIES_RAW.split(",")
    if category.strip()
)
CONTENT_TYPE_OVERRIDES = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".usdz": "model/vnd.usdz+zip",
}


@dataclass(frozen=True)
class LargeAssetSyncCandidate:
    absolute_path: Path
    relative_path: str
    category: str
    storage_id: str
    filename: str
    content_type: str
    fallback_url: Optional[str]
    size_bytes: int


def _path_to_posix(path: Path) -> str:
    return path.as_posix().lstrip("./")


def _guess_content_type(path: Path) -> str:
    return CONTENT_TYPE_OVERRIDES.get(path.suffix.lower()) or guess_type(str(path))[0] or "application/octet-stream"


def _slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._") or "asset"


def _stable_storage_id(relative_path: str) -> str:
    digest = hashlib.sha1(relative_path.encode("utf-8")).hexdigest()[:10]
    stem = _slugify(Path(relative_path).with_suffix("").as_posix())
    if len(stem) > 72:
        stem = stem[:72].rstrip("-._")
    return f"{stem}-{digest}"


def _candidate_for_file(file_path: Path) -> LargeAssetSyncCandidate:
    relative_path = _path_to_posix(file_path.relative_to(REPO_ROOT))
    filename = file_path.name
    size_bytes = file_path.stat().st_size
    content_type = _guess_content_type(file_path)
    fallback_url: Optional[str] = None

    if relative_path.startswith("backend/test_images/"):
        category = "avatar-library"
        storage_id = _stable_storage_id(relative_path)
        if file_path.suffix.lower() == ".glb":
            fallback_url = f"/models/avatars/{filename}"
    elif relative_path.startswith("backend/outputs/studio_storage/"):
        category = "studio-storage"
        storage_id = filename
        fallback_url = f"/api/studio/storage/files/{filename}"
    elif relative_path.startswith("backend/outputs/") and filename.endswith("_avatar.glb"):
        request_id = filename[: -len("_avatar.glb")]
        category = "avatars"
        storage_id = request_id
        fallback_url = f"/api/avatar/{request_id}.glb"
    elif relative_path.startswith("backend/backend/outputs/") and filename.endswith("_avatar.glb"):
        request_id = filename[: -len("_avatar.glb")]
        category = "avatars-backup"
        storage_id = request_id
        fallback_url = f"/api/avatar/{request_id}.glb"
    elif relative_path.startswith("backend/humaniflow/model_files/"):
        category = "humaniflow-model-files"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/api/storage/repo-file?path={quote(relative_path, safe='/')}"
    elif relative_path.startswith("backend/humaniflow/"):
        category = "humaniflow-assets"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/api/storage/repo-file?path={quote(relative_path, safe='/')}"
    elif relative_path.startswith("backend/sam3d_repo/"):
        category = "sam3d-assets"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/api/storage/repo-file?path={quote(relative_path, safe='/')}"
    elif relative_path.startswith("backend/facexformer_repo/"):
        category = "facexformer-assets"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/api/storage/repo-file?path={quote(relative_path, safe='/')}"
    elif relative_path.startswith("public/"):
        category = "public-assets"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/{relative_path}"
    elif relative_path.startswith("attached_assets/"):
        category = "attached-assets"
        storage_id = _stable_storage_id(relative_path)
        fallback_url = f"/api/storage/repo-file?path={quote(relative_path, safe='/')}"
    else:
        category = "repo-assets"
        storage_id = _stable_storage_id(relative_path)

    return LargeAssetSyncCandidate(
        absolute_path=file_path,
        relative_path=relative_path,
        category=category,
        storage_id=storage_id,
        filename=filename,
        content_type=content_type,
        fallback_url=fallback_url,
        size_bytes=size_bytes,
    )


def _resolve_sync_roots(roots: Optional[Sequence[str]] = None) -> List[Path]:
    resolved_roots: List[Path] = []
    for raw_root in roots or DEFAULT_SYNC_ROOTS:
        root_path = (REPO_ROOT / raw_root).resolve()
        if root_path.exists() and root_path.is_dir():
            resolved_roots.append(root_path)
    return resolved_roots


def iter_large_asset_candidates(
    roots: Optional[Sequence[str]] = None,
    min_bytes: int = DEFAULT_MIN_BYTES,
) -> Iterable[LargeAssetSyncCandidate]:
    seen_paths: set[Path] = set()
    for root_path in _resolve_sync_roots(roots):
        for file_path in sorted(root_path.rglob("*")):
            if not file_path.is_file():
                continue
            if file_path.name.endswith(".storage.json"):
                continue
            if file_path in seen_paths:
                continue
            seen_paths.add(file_path)
            if file_path.stat().st_size < min_bytes:
                continue
            yield _candidate_for_file(file_path)


def _metadata_is_synced(metadata: Optional[Dict[str, Any]]) -> bool:
    if not metadata or metadata.get("storage") != "r2" or not metadata.get("r2_key"):
        return False
    bucket = metadata.get("bucket")
    return bool(
        head_r2_object(
            str(metadata["r2_key"]),
            bucket=str(bucket) if bucket else None,
        )
    )


def can_delete_local_copy(candidate: LargeAssetSyncCandidate) -> bool:
    return candidate.category in DELETE_SAFE_CATEGORIES


def _delete_local_copy(candidate: LargeAssetSyncCandidate) -> bool:
    if not candidate.absolute_path.exists():
        return False

    candidate.absolute_path.unlink()
    return True


def sync_large_asset_candidate(
    candidate: LargeAssetSyncCandidate,
    *,
    dry_run: bool = False,
    delete_local_after_upload: bool = False,
) -> Dict[str, Any]:
    metadata_path = get_storage_metadata_path(candidate.absolute_path)
    existing_metadata = read_storage_metadata(metadata_path)
    delete_eligible = can_delete_local_copy(candidate)
    should_delete_local = bool(delete_local_after_upload and delete_eligible)

    if _metadata_is_synced(existing_metadata):
        local_deleted = _delete_local_copy(candidate) if should_delete_local else False
        return {
            "status": "deleted_local_copy" if local_deleted else "already_synced",
            "metadataPath": str(metadata_path),
            "path": candidate.relative_path,
            "sizeBytes": candidate.size_bytes,
            "storage": "r2",
            "bucket": existing_metadata.get("bucket"),
            "r2Key": existing_metadata.get("r2_key"),
            "deleteEligible": delete_eligible,
            "localDeleted": local_deleted,
        }

    if dry_run:
        return {
            "status": "needs_sync",
            "metadataPath": str(metadata_path),
            "path": candidate.relative_path,
            "sizeBytes": candidate.size_bytes,
            "category": candidate.category,
            "storageId": candidate.storage_id,
            "fallbackUrl": candidate.fallback_url,
            "deleteEligible": delete_eligible,
        }

    metadata = store_generated_file(
        candidate.absolute_path,
        category=candidate.category,
        storage_id=candidate.storage_id,
        filename=candidate.filename,
        content_type=candidate.content_type,
        fallback_url=candidate.fallback_url,
        delete_local_after_upload=should_delete_local,
    )
    write_storage_metadata(metadata_path, metadata)

    local_deleted = should_delete_local and not candidate.absolute_path.exists()
    if metadata.get("storage") == "r2":
        status = "synced_to_r2_deleted_local" if local_deleted else "synced_to_r2"
    else:
        status = "kept_local"
    if metadata.get("upload_error"):
        status = "upload_failed"

    return {
        "status": status,
        "metadataPath": str(metadata_path),
        "path": candidate.relative_path,
        "sizeBytes": candidate.size_bytes,
        "category": candidate.category,
        "storageId": candidate.storage_id,
        "storage": metadata.get("storage"),
        "bucket": metadata.get("bucket"),
        "r2Key": metadata.get("r2_key"),
        "url": metadata.get("url"),
        "uploadError": metadata.get("upload_error"),
        "deleteEligible": delete_eligible,
        "localDeleted": local_deleted,
    }


def sync_large_assets_to_r2(
    *,
    roots: Optional[Sequence[str]] = None,
    min_bytes: int = DEFAULT_MIN_BYTES,
    dry_run: bool = False,
    delete_local_after_upload: bool = False,
    write_report: bool = True,
    report_path: Optional[Path | str] = None,
) -> Dict[str, Any]:
    results = [
        sync_large_asset_candidate(
            candidate,
            dry_run=dry_run,
            delete_local_after_upload=delete_local_after_upload,
        )
        for candidate in iter_large_asset_candidates(roots=roots, min_bytes=min_bytes)
    ]

    summary: Dict[str, Any] = {
        "success": True,
        "dryRun": dry_run,
        "deleteLocalAfterUpload": delete_local_after_upload,
        "minBytes": min_bytes,
        "roots": [_path_to_posix(path.relative_to(REPO_ROOT)) for path in _resolve_sync_roots(roots)],
        "counts": {},
        "totalFiles": len(results),
        "totalBytes": sum(int(result.get("sizeBytes") or 0) for result in results),
        "totalLocalBytesDeleted": sum(
            int(result.get("sizeBytes") or 0)
            for result in results
            if bool(result.get("localDeleted"))
        ),
        "results": results,
    }

    for result in results:
        status = str(result.get("status") or "unknown")
        summary["counts"][status] = int(summary["counts"].get(status) or 0) + 1

    if write_report:
        resolved_report_path = Path(report_path) if report_path else DEFAULT_REPORT_PATH
        resolved_report_path.parent.mkdir(parents=True, exist_ok=True)
        resolved_report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        summary["reportPath"] = str(resolved_report_path)

    return summary


def list_large_asset_candidates(
    *,
    roots: Optional[Sequence[str]] = None,
    min_bytes: int = DEFAULT_MIN_BYTES,
) -> List[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []
    for candidate in iter_large_asset_candidates(roots=roots, min_bytes=min_bytes):
        candidate_data = asdict(candidate)
        candidate_data["absolute_path"] = str(candidate.absolute_path)
        candidate_data["deleteEligible"] = can_delete_local_copy(candidate)
        candidates.append(candidate_data)
    return candidates

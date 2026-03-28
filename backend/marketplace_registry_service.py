"""
Marketplace environment registry service.

Uses app settings when available, with a local JSON fallback for offline/dev usage.
"""

from __future__ import annotations

import json
import os
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

try:
    from settings_service import get_settings as db_get_settings, set_settings as db_set_settings
    SETTINGS_AVAILABLE = True
except ImportError:
    SETTINGS_AVAILABLE = False
    db_get_settings = None  # type: ignore[assignment]
    db_set_settings = None  # type: ignore[assignment]


REGISTRY_USER_ID = os.getenv("MARKETPLACE_ENVIRONMENT_REGISTRY_USER_ID", "marketplace_registry")
REGISTRY_NAMESPACE = os.getenv("MARKETPLACE_ENVIRONMENT_REGISTRY_NAMESPACE", "virtualStudio_marketplaceEnvironmentRegistryV2")
REGISTRY_FILE = Path(
    os.getenv(
        "MARKETPLACE_ENVIRONMENT_REGISTRY_FILE",
        str(Path(__file__).resolve().parent.parent / "tmp" / "marketplace_environment_registry.json"),
    ),
)

ADMIN_ROLES = {"admin", "owner"}
PUBLISH_READY_SCORE = 0.72
BLOCKING_SCORE = 0.55


def _default_registry() -> Dict[str, Any]:
    return {
        "version": "3.0",
        "products": [],
        "history": [],
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_registry(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    base = _default_registry()
    if not isinstance(data, dict):
        return base

    products = data.get("products")
    if not isinstance(products, list):
        products = []
    history = data.get("history")
    if not isinstance(history, list):
        history = []

    return {
        "version": str(data.get("version") or "3.0"),
        "products": [_normalize_product(product) for product in products if isinstance(product, dict)],
        "history": [_normalize_history_entry(entry) for entry in history if isinstance(entry, dict)],
    }


def _normalize_actor(actor: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    source = actor if isinstance(actor, dict) else {}
    user_id = str(source.get("userId") or source.get("id") or "guest").strip() or "guest"
    role = str(source.get("role") or "viewer").strip().lower() or "viewer"
    name = str(source.get("name") or source.get("displayName") or user_id).strip() or user_id
    return {
        "userId": user_id,
        "role": role,
        "name": name,
        "isAdmin": role in ADMIN_ROLES,
    }


def _infer_visibility(product: Dict[str, Any]) -> str:
    metadata = product.get("registryMetadata") if isinstance(product.get("registryMetadata"), dict) else {}
    visibility = str(metadata.get("visibility") or "").strip().lower()
    if visibility in {"shared", "private"}:
        return visibility

    author = product.get("author") if isinstance(product.get("author"), dict) else {}
    author_id = str(author.get("id") or "").strip().lower()
    author_role = str(metadata.get("ownerRole") or author.get("role") or "").strip().lower()
    if author_role in ADMIN_ROLES or author_id in {"marketplace_registry", "virtual-studio-team"}:
        return "shared"
    return "private"


def _normalize_registry_metadata(product: Dict[str, Any]) -> Dict[str, Any]:
    source = product.get("registryMetadata") if isinstance(product.get("registryMetadata"), dict) else {}
    author = product.get("author") if isinstance(product.get("author"), dict) else {}
    visibility = _infer_visibility(product)
    owner_id = str(source.get("ownerId") or author.get("id") or "unknown-user").strip() or "unknown-user"
    owner_name = str(source.get("ownerName") or author.get("name") or owner_id).strip() or owner_id
    owner_role = str(source.get("ownerRole") or author.get("role") or "").strip() or None
    admin_managed = bool(source.get("adminManaged")) if "adminManaged" in source else visibility == "shared"
    return {
        "visibility": visibility,
        "ownerId": owner_id,
        "ownerName": owner_name,
        "ownerRole": owner_role,
        "adminManaged": admin_managed,
        "lineageId": source.get("lineageId"),
        "releaseStatus": source.get("releaseStatus") or ("shared" if visibility == "shared" else "stable"),
        "latestStableVersion": source.get("latestStableVersion"),
        "latestCandidateVersion": source.get("latestCandidateVersion"),
        "sourceProductId": source.get("sourceProductId"),
        "createdAt": source.get("createdAt"),
        "updatedAt": source.get("updatedAt"),
        "updatedById": source.get("updatedById"),
        "updatedByRole": source.get("updatedByRole"),
        "promotedAt": source.get("promotedAt"),
        "promotedById": source.get("promotedById"),
    }


def _normalize_history_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(entry.get("id") or uuid4().hex),
        "action": str(entry.get("action") or "unknown"),
        "lineageId": str(entry.get("lineageId") or "").strip(),
        "productId": str(entry.get("productId") or "").strip() or None,
        "productName": str(entry.get("productName") or "").strip() or None,
        "version": str(entry.get("version") or "").strip() or None,
        "previousVersion": str(entry.get("previousVersion") or "").strip() or None,
        "targetVersion": str(entry.get("targetVersion") or "").strip() or None,
        "releaseStatus": str(entry.get("releaseStatus") or "").strip() or None,
        "timestamp": str(entry.get("timestamp") or _now_iso()),
        "actorId": str(entry.get("actorId") or "").strip() or None,
        "actorName": str(entry.get("actorName") or "").strip() or None,
        "actorRole": str(entry.get("actorRole") or "").strip() or None,
        "summary": str(entry.get("summary") or "").strip() or None,
        "qualityReport": deepcopy(entry.get("qualityReport")) if isinstance(entry.get("qualityReport"), dict) else None,
        "productSnapshot": deepcopy(entry.get("productSnapshot")) if isinstance(entry.get("productSnapshot"), dict) else None,
        "previousStableSnapshot": deepcopy(entry.get("previousStableSnapshot")) if isinstance(entry.get("previousStableSnapshot"), dict) else None,
        "restoredSnapshot": deepcopy(entry.get("restoredSnapshot")) if isinstance(entry.get("restoredSnapshot"), dict) else None,
    }


def _normalize_release_status(product: Dict[str, Any]) -> str:
    metadata = _normalize_registry_metadata(product)
    visibility = str(metadata.get("visibility") or "private").strip().lower()
    release_status = str(metadata.get("releaseStatus") or "").strip().lower()
    if visibility == "private":
        return "stable"
    if release_status in {"candidate", "stable"}:
        return release_status
    return "stable"


def _parse_semver(value: Any) -> List[int]:
    parts = str(value or "0.0.0").split(".")
    normalized: List[int] = []
    for index in range(3):
        try:
            normalized.append(int(parts[index]))
        except Exception:
            normalized.append(0)
    return normalized


def _get_lineage_id(product: Dict[str, Any]) -> str:
    metadata = _normalize_registry_metadata(product)
    lineage_id = str(metadata.get("lineageId") or "").strip()
    if lineage_id:
        return lineage_id
    return str(product.get("id") or "").strip()


def _build_quality_report(product: Dict[str, Any]) -> Dict[str, Any]:
    environment_package = product.get("environmentPackage") if isinstance(product.get("environmentPackage"), dict) else {}
    validation = environment_package.get("validation") if isinstance(environment_package.get("validation"), dict) else {}
    evaluation = environment_package.get("evaluation") if isinstance(environment_package.get("evaluation"), dict) else {}
    assembly_validation = environment_package.get("assemblyValidation") if isinstance(environment_package.get("assemblyValidation"), dict) else {}

    blocking_issues = [str(item) for item in validation.get("blockingIssues", []) if str(item).strip()]
    warnings = [str(item) for item in validation.get("warnings", []) if str(item).strip()]
    checks: List[Dict[str, Any]] = []
    score = validation.get("evaluationScore")
    if score is None:
        score = evaluation.get("overallScore")
    try:
        score_value = float(score) if score is not None else None
    except Exception:
        score_value = None

    has_preview = bool(product.get("thumbnail")) or bool(environment_package.get("previewImage")) or bool(product.get("screenshots"))
    checks.append({
        "id": "preview_assets",
        "label": "Preview og screenshots",
        "status": "passed" if has_preview else "failed",
        "details": None if has_preview else "Miljøpakken mangler preview/thumbnail.",
    })
    if not has_preview:
        blocking_issues.append("Miljøpakken mangler preview eller thumbnail.")

    has_plan = isinstance(environment_package.get("plan"), dict)
    checks.append({
        "id": "environment_plan",
        "label": "Miljøplan i pakken",
        "status": "passed" if has_plan else "failed",
        "details": None if has_plan else "EnvironmentPlan mangler i pakken.",
    })
    if not has_plan:
        blocking_issues.append("EnvironmentPlan mangler i pakken.")

    backend_validated = bool(validation.get("backendValidated")) or bool(assembly_validation.get("backendValidated"))
    checks.append({
        "id": "backend_validation",
        "label": "Backend-validering",
        "status": "passed" if backend_validated else "warning",
        "details": None if backend_validated else "Pakken er ikke backend-validert ennå.",
    })
    if not backend_validated:
        warnings.append("Pakken er ikke backend-validert ennå.")

    differences = assembly_validation.get("differences", [])
    has_differences = isinstance(differences, list) and len(differences) > 0
    checks.append({
        "id": "assembly_consistency",
        "label": "Assembly-konsistens",
        "status": "warning" if has_differences else "passed",
        "details": None if not has_differences else f"Fant {len(differences)} assembly-avvik.",
    })
    if has_differences:
        warnings.append(f"Fant {len(differences)} assembly-avvik.")

    if score_value is None:
        checks.append({
            "id": "evaluation_score",
            "label": "Evalueringsscore",
            "status": "warning",
            "details": "Ingen evalueringsscore ble funnet.",
        })
        warnings.append("Ingen evalueringsscore ble funnet.")
    elif score_value < BLOCKING_SCORE:
        checks.append({
            "id": "evaluation_score",
            "label": "Evalueringsscore",
            "status": "failed",
            "details": f"Score {score_value:.2f} er under minimumskravet.",
        })
        blocking_issues.append(f"Evalueringsscore {score_value:.2f} er under minimumskravet.")
    elif score_value < PUBLISH_READY_SCORE:
        checks.append({
            "id": "evaluation_score",
            "label": "Evalueringsscore",
            "status": "warning",
            "details": f"Score {score_value:.2f} tilsier at pakken bør finjusteres.",
        })
        warnings.append(f"Evalueringsscore {score_value:.2f} tilsier at pakken bør finjusteres.")
    else:
        checks.append({
            "id": "evaluation_score",
            "label": "Evalueringsscore",
            "status": "passed",
            "details": f"Score {score_value:.2f} er over publiseringsgrensen.",
        })

    deduped_blocking = list(dict.fromkeys(blocking_issues))
    deduped_warnings = list(dict.fromkeys(warnings))
    return {
        "ready": len(deduped_blocking) == 0,
        "score": score_value,
        "checkedAt": validation.get("validatedAt") or evaluation.get("validatedAt") or assembly_validation.get("validatedAt"),
        "blockingIssues": deduped_blocking,
        "warnings": deduped_warnings,
        "checks": checks,
    }


def validate_environment_pack_release(product: Dict[str, Any], publish_mode: str = "save_copy") -> Dict[str, Any]:
    report = _build_quality_report(product)
    environment_package = product.get("environmentPackage") if isinstance(product.get("environmentPackage"), dict) else {}
    environment_package["qualityReport"] = deepcopy(report)
    product["environmentPackage"] = environment_package

    visibility = _infer_visibility(product)
    is_shared_publish = publish_mode in {"create_shared", "update_shared"} or visibility == "shared"
    if is_shared_publish and not report.get("ready"):
        raise ValueError("Miljøpakken må bestå kvalitetskravene før den kan publiseres som delt candidate.")
    return report


def get_environment_pack_quality_report(product: Dict[str, Any]) -> Dict[str, Any]:
    return _build_quality_report(product)


def _decorate_release_versions(products: List[Dict[str, Any]], visible_products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    shared_by_lineage: Dict[str, Dict[str, Optional[Dict[str, Any]]]] = {}
    for product in products:
        metadata = _normalize_registry_metadata(product)
        if metadata.get("visibility") != "shared":
            continue
        lineage_id = _get_lineage_id(product)
        entry = shared_by_lineage.setdefault(lineage_id, {"stable": None, "candidate": None})
        release_status = _normalize_release_status(product)
        previous = entry.get(release_status)
        if previous is None or _parse_semver(product.get("version")) >= _parse_semver(previous.get("version")):
            entry[release_status] = product

    decorated: List[Dict[str, Any]] = []
    for product in visible_products:
        next_product = deepcopy(product)
        metadata = _normalize_registry_metadata(next_product)
        if metadata.get("visibility") == "shared":
            lineage_id = _get_lineage_id(next_product)
            lineage_versions = shared_by_lineage.get(lineage_id, {})
            latest_stable = lineage_versions.get("stable")
            latest_candidate = lineage_versions.get("candidate")
            metadata["latestStableVersion"] = latest_stable.get("version") if latest_stable else None
            metadata["latestCandidateVersion"] = latest_candidate.get("version") if latest_candidate else None
            metadata["lineageId"] = lineage_id
            metadata["releaseStatus"] = _normalize_release_status(next_product)
            next_product["registryMetadata"] = metadata
        decorated.append(next_product)
    return decorated


def _decorate_permissions(product: Dict[str, Any], actor: Dict[str, Any]) -> Dict[str, Any]:
    next_product = deepcopy(product)
    metadata = _normalize_registry_metadata(next_product)
    next_product["registryMetadata"] = metadata
    visibility = metadata.get("visibility")
    release_status = _normalize_release_status(next_product)
    can_update = bool(actor.get("isAdmin"))
    can_promote = bool(actor.get("isAdmin") and visibility == "shared" and release_status == "candidate")
    if can_update:
        reason = "Administrator kan oppdatere denne Marketplace-pakken."
    elif visibility == "shared":
        reason = "Kun administrator kan oppdatere delte Marketplace-pakker. Du kan lagre en egen kopi."
    else:
        reason = "Denne kopien kan lagres på nytt som en ny privat kopi."

    next_product["registryPermissions"] = {
        "canUpdate": can_update,
        "canSaveCopy": True,
        "canPublishShared": bool(actor.get("isAdmin")),
        "canPromote": can_promote,
        "reason": reason,
    }
    return next_product


def _normalize_product(product: Dict[str, Any]) -> Dict[str, Any]:
    next_product = deepcopy(product)
    next_product["registryMetadata"] = _normalize_registry_metadata(next_product)
    if isinstance(next_product.get("environmentPackage"), dict):
        environment_package = deepcopy(next_product["environmentPackage"])
        environment_package["qualityReport"] = _build_quality_report(next_product)
        next_product["environmentPackage"] = environment_package
    return next_product


def _summarize_changelog(product: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(product, dict):
        return None
    for candidate in (
        product.get("whatsNew"),
        product.get("description"),
        (product.get("environmentPackage") or {}).get("summary") if isinstance(product.get("environmentPackage"), dict) else None,
    ):
        value = str(candidate or "").strip()
        if value:
            return value
    return None


def _append_history_event(registry: Dict[str, Any], entry: Dict[str, Any]) -> None:
    history = registry.get("history")
    if not isinstance(history, list):
        history = []
    normalized_entry = _normalize_history_entry(entry)
    history.insert(0, normalized_entry)
    registry["history"] = history[:300]


def _build_history_entry(
    *,
    action: str,
    actor: Dict[str, Any],
    product: Dict[str, Any],
    previous_stable_snapshot: Optional[Dict[str, Any]] = None,
    restored_snapshot: Optional[Dict[str, Any]] = None,
    target_version: Optional[str] = None,
) -> Dict[str, Any]:
    metadata = _normalize_registry_metadata(product)
    return _normalize_history_entry({
        "id": uuid4().hex,
        "action": action,
        "lineageId": _get_lineage_id(product),
        "productId": product.get("id"),
        "productName": product.get("name"),
        "version": product.get("version"),
        "previousVersion": previous_stable_snapshot.get("version") if isinstance(previous_stable_snapshot, dict) else None,
        "targetVersion": target_version,
        "releaseStatus": _normalize_release_status(product),
        "timestamp": product.get("lastUpdated") or metadata.get("updatedAt") or _now_iso(),
        "actorId": actor.get("userId"),
        "actorName": actor.get("name"),
        "actorRole": actor.get("role"),
        "summary": _summarize_changelog(product),
        "qualityReport": (product.get("environmentPackage") or {}).get("qualityReport") if isinstance(product.get("environmentPackage"), dict) else None,
        "productSnapshot": deepcopy(product),
        "previousStableSnapshot": deepcopy(previous_stable_snapshot) if isinstance(previous_stable_snapshot, dict) else None,
        "restoredSnapshot": deepcopy(restored_snapshot) if isinstance(restored_snapshot, dict) else None,
    })


def _public_history_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    normalized = _normalize_history_entry(entry)
    return {
        "id": normalized["id"],
        "action": normalized["action"],
        "lineageId": normalized["lineageId"],
        "productId": normalized["productId"],
        "productName": normalized["productName"],
        "version": normalized["version"],
        "previousVersion": normalized["previousVersion"],
        "targetVersion": normalized["targetVersion"],
        "releaseStatus": normalized["releaseStatus"],
        "timestamp": normalized["timestamp"],
        "actorId": normalized["actorId"],
        "actorName": normalized["actorName"],
        "actorRole": normalized["actorRole"],
        "summary": normalized["summary"],
        "qualityReport": deepcopy(normalized["qualityReport"]) if isinstance(normalized.get("qualityReport"), dict) else None,
    }


def _build_release_dashboard_entry(
    lineage_id: str,
    stable_product: Optional[Dict[str, Any]],
    candidate_product: Optional[Dict[str, Any]],
    history_entries: List[Dict[str, Any]],
    actor: Dict[str, Any],
) -> Dict[str, Any]:
    current_product = candidate_product or stable_product or {}
    product_name = str(current_product.get("name") or "").strip()
    if not product_name and isinstance(stable_product, dict):
        product_name = str(stable_product.get("name") or "").strip()
    if not product_name and isinstance(candidate_product, dict):
        product_name = str(candidate_product.get("name") or "").strip()
    if not product_name:
        product_name = lineage_id
    quality_report = None
    if isinstance(current_product.get("environmentPackage"), dict):
        quality_report = deepcopy(current_product["environmentPackage"].get("qualityReport"))

    rollback_versions: List[str] = []
    rollback_target_snapshot: Optional[Dict[str, Any]] = None
    current_stable_version = str((stable_product or {}).get("version") or "").strip() or None
    for entry in history_entries:
        previous_snapshot = entry.get("previousStableSnapshot")
        restored_snapshot = entry.get("restoredSnapshot")
        for snapshot in (previous_snapshot, restored_snapshot):
            if not isinstance(snapshot, dict):
                continue
            version = str(snapshot.get("version") or "").strip()
            if not version or version == current_stable_version or version in rollback_versions:
                continue
            rollback_versions.append(version)
            if rollback_target_snapshot is None:
                rollback_target_snapshot = deepcopy(snapshot)

    return {
        "lineageId": lineage_id,
        "productName": product_name,
        "currentStable": _decorate_permissions(stable_product, actor) if isinstance(stable_product, dict) else None,
        "currentCandidate": _decorate_permissions(candidate_product, actor) if isinstance(candidate_product, dict) else None,
        "rollbackTarget": {
            "version": rollback_target_snapshot.get("version"),
            "thumbnail": rollback_target_snapshot.get("thumbnail"),
            "summary": _summarize_changelog(rollback_target_snapshot),
        } if isinstance(rollback_target_snapshot, dict) else None,
        "qualityReport": quality_report,
        "changelog": _summarize_changelog(current_product),
        "history": [_public_history_entry(entry) for entry in history_entries[:6]],
        "canRollback": bool(actor.get("isAdmin") and stable_product and rollback_versions),
        "rollbackTargetVersions": rollback_versions,
    }


def _load_from_db() -> Optional[Dict[str, Any]]:
    if not SETTINGS_AVAILABLE or db_get_settings is None:
        return None
    try:
        return _normalize_registry(db_get_settings(REGISTRY_USER_ID, REGISTRY_NAMESPACE))
    except Exception:
        return None


def _store_to_db(registry: Dict[str, Any]) -> bool:
    if not SETTINGS_AVAILABLE or db_set_settings is None:
        return False
    try:
        db_set_settings(REGISTRY_USER_ID, REGISTRY_NAMESPACE, _normalize_registry(registry))
        return True
    except Exception:
        return False


def _load_from_file() -> Dict[str, Any]:
    if not REGISTRY_FILE.exists():
        return _default_registry()
    try:
        return _normalize_registry(json.loads(REGISTRY_FILE.read_text(encoding="utf-8")))
    except Exception:
        return _default_registry()


def _store_to_file(registry: Dict[str, Any]) -> None:
    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_FILE.write_text(
        json.dumps(_normalize_registry(registry), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_environment_pack_registry() -> Dict[str, Any]:
    registry = _load_from_db()
    if registry is not None:
        return registry
    return _load_from_file()


def save_environment_pack_registry(registry: Dict[str, Any]) -> Dict[str, Any]:
    normalized = _normalize_registry(registry)
    if not _store_to_db(normalized):
        _store_to_file(normalized)
    return normalized


def list_environment_pack_products(actor: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    registry = load_environment_pack_registry()
    products = registry.get("products") or []
    normalized_actor = _normalize_actor(actor)
    visible_products: List[Dict[str, Any]] = []
    for product in products:
        if not isinstance(product, dict):
            continue
        normalized_product = _normalize_product(product)
        metadata = normalized_product.get("registryMetadata") or {}
        release_status = _normalize_release_status(normalized_product)
        if metadata.get("visibility") == "shared":
            if release_status == "stable" or normalized_actor.get("isAdmin"):
                visible_products.append(_decorate_permissions(normalized_product, normalized_actor))
            continue
        if str(metadata.get("ownerId")) == normalized_actor["userId"]:
            visible_products.append(_decorate_permissions(normalized_product, normalized_actor))
    visible_products = _decorate_release_versions(
        [_normalize_product(product) for product in products if isinstance(product, dict)],
        visible_products,
    )
    return sorted(
        visible_products,
        key=lambda product: str(product.get("lastUpdated") or product.get("releaseDate") or ""),
        reverse=True,
    )


def get_environment_pack_release_dashboard(actor: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    normalized_actor = _normalize_actor(actor)
    if not normalized_actor.get("isAdmin"):
        raise PermissionError("Kun administrator kan se release-dashboardet.")

    registry = load_environment_pack_registry()
    products = [_normalize_product(product) for product in registry.get("products", []) if isinstance(product, dict)]
    history = [_normalize_history_entry(entry) for entry in registry.get("history", []) if isinstance(entry, dict)]

    shared_products = [product for product in products if _normalize_registry_metadata(product).get("visibility") == "shared"]
    by_lineage: Dict[str, Dict[str, Optional[Dict[str, Any]]]] = {}
    for product in shared_products:
      lineage_id = _get_lineage_id(product)
      entry = by_lineage.setdefault(lineage_id, {"stable": None, "candidate": None})
      release_status = _normalize_release_status(product)
      existing = entry.get(release_status)
      if existing is None or _parse_semver(product.get("version")) >= _parse_semver(existing.get("version")):
          entry[release_status] = product

    entries: List[Dict[str, Any]] = []
    for lineage_id, versions in by_lineage.items():
        lineage_history = [entry for entry in history if str(entry.get("lineageId")) == lineage_id]
        entries.append(_build_release_dashboard_entry(
            lineage_id,
            versions.get("stable"),
            versions.get("candidate"),
            lineage_history,
            normalized_actor,
        ))

    entries.sort(
        key=lambda entry: str(
            ((entry.get("currentCandidate") or entry.get("currentStable")) or {}).get("lastUpdated")
            or ((entry.get("currentCandidate") or entry.get("currentStable")) or {}).get("releaseDate")
            or ""
        ),
        reverse=True,
    )

    candidate_entries = [entry for entry in entries if entry.get("currentCandidate")]
    ready_candidates = [
        entry for entry in candidate_entries
        if isinstance(entry.get("qualityReport"), dict) and entry["qualityReport"].get("ready")
    ]

    return {
        "summary": {
            "sharedPackCount": len(entries),
            "candidateCount": len(candidate_entries),
            "stableCount": len(entries) - len(candidate_entries),
            "readyCandidateCount": len(ready_candidates),
            "blockedCandidateCount": len(candidate_entries) - len(ready_candidates),
        },
        "entries": entries,
        "recentHistory": [_public_history_entry(entry) for entry in history[:12]],
    }


def upsert_environment_pack_product(
    product: Dict[str, Any],
    actor: Optional[Dict[str, Any]] = None,
    publish_mode: str = "save_copy",
) -> Dict[str, Any]:
    registry = load_environment_pack_registry()
    products = [_normalize_product(item) for item in registry.get("products", []) if isinstance(item, dict)]
    normalized_actor = _normalize_actor(actor)

    product_id = str(product.get("id") or "").strip()
    if not product_id:
        raise ValueError("Product id is required")

    next_product = deepcopy(product)
    index = next((i for i, item in enumerate(products) if str(item.get("id")) == product_id), -1)
    existing_product = products[index] if index >= 0 else None
    existing_metadata = _normalize_registry_metadata(existing_product) if existing_product else {}
    is_private_owner_update = bool(
        existing_product
        and existing_metadata.get("visibility") == "private"
        and str(existing_metadata.get("ownerId")) == normalized_actor["userId"]
    )

    if index >= 0 and not normalized_actor.get("isAdmin") and not is_private_owner_update:
        raise PermissionError("Kun administrator kan oppdatere eksisterende Marketplace-pakker. Lagre en egen kopi i stedet.")

    requested_visibility = (
        next_product.get("registryMetadata", {}).get("visibility")
        if isinstance(next_product.get("registryMetadata"), dict)
        else None
    )
    if publish_mode in {"create_shared", "update_shared"} or requested_visibility == "shared":
        if not normalized_actor.get("isAdmin"):
            raise PermissionError("Kun administrator kan publisere eller oppdatere delte Marketplace-pakker.")
        visibility = "shared"
    else:
        visibility = "private"

    metadata = _normalize_registry_metadata(existing_product or next_product)
    lineage_id = str(metadata.get("lineageId") or product_id).strip() or product_id
    if visibility == "shared" and publish_mode in {"create_shared", "update_shared"}:
        release_status = "candidate"
        candidate_id = f"{lineage_id}--candidate"
        next_product["id"] = candidate_id
        product_id = candidate_id
        candidate_index = next((i for i, item in enumerate(products) if str(item.get("id")) == candidate_id), -1)
        if candidate_index >= 0:
            index = candidate_index
            existing_product = products[index]
            metadata = _normalize_registry_metadata(existing_product)
    else:
        release_status = "stable"

    metadata["visibility"] = visibility
    metadata["ownerId"] = normalized_actor["userId"]
    metadata["ownerName"] = normalized_actor["name"]
    metadata["ownerRole"] = normalized_actor["role"]
    metadata["adminManaged"] = visibility == "shared"
    metadata["lineageId"] = lineage_id
    metadata["releaseStatus"] = release_status
    metadata["updatedAt"] = next_product.get("lastUpdated") or metadata.get("updatedAt")
    metadata["updatedById"] = normalized_actor["userId"]
    metadata["updatedByRole"] = normalized_actor["role"]
    if not metadata.get("createdAt"):
        metadata["createdAt"] = next_product.get("releaseDate") or next_product.get("lastUpdated")
    if publish_mode == "save_copy" and not metadata.get("sourceProductId") and existing_product is not None:
        metadata["sourceProductId"] = existing_product.get("id")

    next_product["registryMetadata"] = metadata
    validate_environment_pack_release(next_product, publish_mode=publish_mode)
    next_product = _normalize_product(next_product)
    history_action = None
    if visibility == "shared":
        history_action = "update_candidate" if index >= 0 else "publish_candidate"
    if index >= 0:
        products[index] = next_product
    else:
        products.append(next_product)

    registry["products"] = products
    if history_action:
        _append_history_event(
            registry,
            _build_history_entry(
                action=history_action,
                actor=normalized_actor,
                product=next_product,
            ),
        )
    save_environment_pack_registry(registry)
    return _decorate_permissions(next_product, normalized_actor)


def promote_environment_pack_candidate(product_id: str, actor: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    normalized_actor = _normalize_actor(actor)
    if not normalized_actor.get("isAdmin"):
        raise PermissionError("Kun administrator kan promotere candidate-versjoner til stable.")

    registry = load_environment_pack_registry()
    products = [_normalize_product(item) for item in registry.get("products", []) if isinstance(item, dict)]
    candidate_index = next((i for i, item in enumerate(products) if str(item.get("id")) == str(product_id)), -1)
    if candidate_index < 0:
        raise ValueError("Marketplace candidate-pack ble ikke funnet.")

    candidate_product = deepcopy(products[candidate_index])
    candidate_metadata = _normalize_registry_metadata(candidate_product)
    if candidate_metadata.get("visibility") != "shared" or _normalize_release_status(candidate_product) != "candidate":
        raise ValueError("Kun delte candidate-pakker kan promoteres.")

    validate_environment_pack_release(candidate_product, publish_mode="update_shared")
    lineage_id = _get_lineage_id(candidate_product)
    stable_index = next((i for i, item in enumerate(products) if str(item.get("id")) == lineage_id), -1)
    existing_stable = deepcopy(products[stable_index]) if stable_index >= 0 else None

    stable_product = deepcopy(candidate_product)
    stable_product["id"] = lineage_id
    stable_product["source"] = "registry"
    stable_metadata = _normalize_registry_metadata(stable_product)
    stable_metadata["visibility"] = "shared"
    stable_metadata["releaseStatus"] = "stable"
    stable_metadata["lineageId"] = lineage_id
    stable_metadata["latestStableVersion"] = stable_product.get("version")
    stable_metadata["latestCandidateVersion"] = None
    stable_metadata["promotedAt"] = stable_product.get("lastUpdated")
    stable_metadata["promotedById"] = normalized_actor["userId"]
    stable_metadata["updatedById"] = normalized_actor["userId"]
    stable_metadata["updatedByRole"] = normalized_actor["role"]
    stable_metadata["ownerId"] = normalized_actor["userId"]
    stable_metadata["ownerName"] = normalized_actor["name"]
    stable_metadata["ownerRole"] = normalized_actor["role"]
    stable_metadata["adminManaged"] = True
    stable_product["registryMetadata"] = stable_metadata

    if existing_stable:
        for field_name in ("rating", "reviewCount", "downloadCount", "installCount", "isFavorite"):
            if field_name in existing_stable:
                stable_product[field_name] = existing_stable[field_name]
        stable_product["releaseDate"] = existing_stable.get("releaseDate") or stable_product.get("releaseDate")

    stable_product = _normalize_product(stable_product)
    if stable_index >= 0:
        products[stable_index] = stable_product
    else:
        products.append(stable_product)

    del products[candidate_index]
    registry["products"] = products
    _append_history_event(
        registry,
        _build_history_entry(
            action="promote_stable",
            actor=normalized_actor,
            product=stable_product,
            previous_stable_snapshot=existing_stable,
        ),
    )
    save_environment_pack_registry(registry)
    return _decorate_permissions(stable_product, normalized_actor)


def rollback_environment_pack_release(
    lineage_id: str,
    actor: Optional[Dict[str, Any]] = None,
    target_version: Optional[str] = None,
) -> Dict[str, Any]:
    normalized_actor = _normalize_actor(actor)
    if not normalized_actor.get("isAdmin"):
        raise PermissionError("Kun administrator kan rulle tilbake delte stable-versjoner.")

    registry = load_environment_pack_registry()
    products = [_normalize_product(item) for item in registry.get("products", []) if isinstance(item, dict)]
    history = [_normalize_history_entry(entry) for entry in registry.get("history", []) if isinstance(entry, dict)]

    stable_index = next((i for i, item in enumerate(products) if str(item.get("id")) == str(lineage_id)), -1)
    if stable_index < 0:
        raise ValueError("Marketplace stable-pack ble ikke funnet.")

    current_stable = deepcopy(products[stable_index])
    current_metadata = _normalize_registry_metadata(current_stable)
    if current_metadata.get("visibility") != "shared" or _normalize_release_status(current_stable) != "stable":
        raise ValueError("Kun delte stable-pakker kan rulles tilbake.")

    requested_version = str(target_version or "").strip() or None
    restore_snapshot: Optional[Dict[str, Any]] = None
    for entry in history:
        if str(entry.get("lineageId")) != str(lineage_id):
            continue
        candidate_snapshots = [
            entry.get("previousStableSnapshot"),
            entry.get("restoredSnapshot"),
            entry.get("productSnapshot"),
        ]
        for snapshot in candidate_snapshots:
            if not isinstance(snapshot, dict):
                continue
            snapshot_metadata = _normalize_registry_metadata(snapshot)
            snapshot_version = str(snapshot.get("version") or "").strip()
            if snapshot_metadata.get("visibility") != "shared" or _normalize_release_status(snapshot) != "stable":
                continue
            if not snapshot_version or snapshot_version == str(current_stable.get("version") or "").strip():
                continue
            if requested_version and snapshot_version != requested_version:
                continue
            restore_snapshot = deepcopy(snapshot)
            break
        if restore_snapshot is not None:
            break

    if restore_snapshot is None:
        raise ValueError("Fant ingen tidligere stable-versjon å rulle tilbake til.")

    rollback_product = deepcopy(restore_snapshot)
    rollback_product["id"] = str(lineage_id)
    rollback_product["source"] = "registry"
    rollback_metadata = _normalize_registry_metadata(rollback_product)
    rollback_metadata["visibility"] = "shared"
    rollback_metadata["releaseStatus"] = "stable"
    rollback_metadata["lineageId"] = str(lineage_id)
    rollback_metadata["latestStableVersion"] = rollback_product.get("version")
    candidate_product = next(
        (
            item for item in products
            if _get_lineage_id(item) == str(lineage_id) and _normalize_release_status(item) == "candidate"
        ),
        None,
    )
    rollback_metadata["latestCandidateVersion"] = candidate_product.get("version") if isinstance(candidate_product, dict) else None
    rollback_metadata["updatedAt"] = _now_iso()
    rollback_metadata["updatedById"] = normalized_actor["userId"]
    rollback_metadata["updatedByRole"] = normalized_actor["role"]
    rollback_metadata["ownerId"] = normalized_actor["userId"]
    rollback_metadata["ownerName"] = normalized_actor["name"]
    rollback_metadata["ownerRole"] = normalized_actor["role"]
    rollback_metadata["adminManaged"] = True
    rollback_product["lastUpdated"] = rollback_metadata["updatedAt"]
    rollback_product["registryMetadata"] = rollback_metadata

    for field_name in ("rating", "reviewCount", "downloadCount", "installCount", "isFavorite"):
        if field_name in current_stable:
            rollback_product[field_name] = current_stable[field_name]
    rollback_product["releaseDate"] = current_stable.get("releaseDate") or rollback_product.get("releaseDate")

    validate_environment_pack_release(rollback_product, publish_mode="update_shared")
    rollback_product = _normalize_product(rollback_product)
    products[stable_index] = rollback_product
    registry["products"] = products
    _append_history_event(
        registry,
        _build_history_entry(
            action="rollback_stable",
            actor=normalized_actor,
            product=rollback_product,
            previous_stable_snapshot=current_stable,
            restored_snapshot=restore_snapshot,
            target_version=str(restore_snapshot.get("version") or ""),
        ),
    )
    save_environment_pack_registry(registry)
    return _decorate_permissions(rollback_product, normalized_actor)


def record_environment_pack_install(product_id: str) -> Optional[Dict[str, Any]]:
    registry = load_environment_pack_registry()
    products = [deepcopy(item) for item in registry.get("products", []) if isinstance(item, dict)]

    for index, product in enumerate(products):
        if str(product.get("id")) != product_id:
            continue
        install_count = int(product.get("installCount") or 0)
        product["installCount"] = install_count + 1
        products[index] = product
        registry["products"] = products
        save_environment_pack_registry(registry)
        return deepcopy(product)

    return None

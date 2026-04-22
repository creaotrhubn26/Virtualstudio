"""Core routes: root, health, ML health, R2 connectivity test.

Health endpoints probe each ML service module lazily and never fail even if
services are missing — they just report 'unavailable'.
"""

import os
from typing import Any, Dict

import boto3
from botocore.config import Config
from fastapi import APIRouter

router = APIRouter(tags=["core"])


def _probe_service(importer, attrs: dict) -> Dict[str, Any]:
    """Try to import a service and read diagnostic attributes.

    `attrs` maps report-keys to attribute names on the imported module/object.
    Returns {'available': False} if import fails.
    """
    try:
        obj = importer()
    except Exception as exc:
        return {"available": False, "error": str(exc)}
    result: Dict[str, Any] = {"available": True}
    for key, attr in attrs.items():
        try:
            value = getattr(obj, attr, None)
            if callable(value):
                value = value()
            result[key] = value
        except Exception as exc:
            result[key] = f"error: {exc}"
    return result


def _probe_sam3d() -> Dict[str, Any]:
    return _probe_service(
        lambda: __import__("sam3d_service").SAM3DService(),
        {
            "model_loaded": "model_loaded",
            "model_loading": "model_loading",
            "use_placeholder": "use_placeholder",
            "model_files_available": "model_files_available",
        },
    )


def _probe_facexformer() -> Dict[str, Any]:
    return _probe_service(
        lambda: __import__("facexformer_service").facexformer_service,
        {
            "enabled": "is_enabled",
            "model_loaded": "is_model_loaded",
            "model_loading": "model_loading",
        },
    )


def _probe_flux() -> Dict[str, Any]:
    return _probe_service(
        lambda: __import__("flux_service").flux_service,
        {
            "enabled": "is_enabled",
            "model_loaded": "is_model_loaded",
            "model_loading": "model_loading",
        },
    )


@router.get("/")
async def root():
    return {"status": "ok", "message": "Virtual Studio Avatar API"}


@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "sam3d": _probe_sam3d(),
        "facexformer": _probe_facexformer(),
        "flux": _probe_flux(),
    }


@router.get("/api/ml/health")
async def ml_health_check():
    """ML service health check — alias for /api/health with the ml_ready flag."""
    return {
        "status": "healthy",
        "ml_ready": True,
        "sam3d": _probe_sam3d(),
        "facexformer": _probe_facexformer(),
        "flux": _probe_flux(),
    }


@router.get("/api/test-r2")
async def test_r2_connection():
    """Test R2 connection and list Sam-3D models."""
    access_key = (
        os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID")
        or os.environ.get("R2_ACCESS_KEY_ID", "")
    ).strip()
    secret_key = (
        os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
        or os.environ.get("R2_SECRET_ACCESS_KEY", "")
    ).strip()

    credentials_configured = bool(access_key and secret_key)
    try:
        client = boto3.client(
            "s3",
            endpoint_url="https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        response = client.list_objects_v2(Bucket="ml-models", Prefix="Sam-3D/", MaxKeys=10)
        objects = [
            {"key": obj["Key"], "size": obj["Size"]}
            for obj in response.get("Contents", [])
        ]
        return {
            "success": True,
            "credentials_configured": credentials_configured,
            "objects": objects,
        }
    except Exception as e:
        return {
            "success": False,
            "credentials_configured": credentials_configured,
            "error": str(e),
        }

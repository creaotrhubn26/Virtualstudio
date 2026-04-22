"""Email asset routes — extracted from backend/main.py.

Logo upload and serving for email templates, backed by Cloudflare R2.
"""

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

router = APIRouter(prefix="/api/email", tags=["email"])

_MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/jpg"}


@router.post("/logo-upload")
async def upload_email_logo(file: UploadFile = File(...)):
    """Upload a logo for email templates (PNG/JPEG/WebP, max 2MB)."""
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Ugyldig filtype. Tillatte typer: PNG, JPEG, WebP",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Filen er for stor. Maksimal størrelse er 2MB.",
        )

    try:
        import io

        from PIL import Image

        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Ugyldig bildefil. Vennligst last opp et gyldig bilde.",
        )

    file_ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "png"
    unique_id = str(uuid.uuid4())
    r2_key = f"logos/{unique_id}.{file_ext}"

    try:
        from utils.r2_client import upload_to_r2

        upload_to_r2(file_bytes, r2_key, file.content_type)
        return JSONResponse(
            {
                "success": True,
                "url": f"/api/email/logo/{unique_id}.{file_ext}",
                "key": r2_key,
                "size": len(file_bytes),
                "filename": file.filename,
            }
        )
    except ValueError:
        raise HTTPException(
            status_code=503,
            detail="Opplasting ikke tilgjengelig. Lagringskonfigurasjon mangler.",
        )
    except Exception as e:
        print(f"Error uploading logo: {e}")
        raise HTTPException(
            status_code=500,
            detail="Kunne ikke laste opp logo. Prøv igjen senere.",
        )


@router.get("/logo/{logo_key:path}")
async def get_email_logo(logo_key: str):
    """Serve an uploaded email logo from R2."""
    try:
        from utils.r2_client import R2_BUCKET_NAME, get_r2_client

        r2_path = f"logos/{logo_key}"
        client = get_r2_client()
        response = client.get_object(Bucket=R2_BUCKET_NAME, Key=r2_path)
        content = response["Body"].read()
        content_type = response.get("ContentType", "image/png")

        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Content-Disposition": f"inline; filename={logo_key}",
            },
        )
    except Exception as e:
        print(f"Error serving logo {logo_key}: {e}")
        raise HTTPException(status_code=404, detail="Logo ikke funnet")

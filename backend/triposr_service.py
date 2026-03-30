"""
TripoSR 3D Generation Service
Generates high-quality GLB models from images via Replicate API (stability-ai/triposr)
"""

import os
import uuid
import asyncio
import httpx
from pathlib import Path
from typing import Optional, Dict, Any
from io import BytesIO

TRIPOSR_MODEL = "stability-ai/triposr"

class TripoSRService:
    def __init__(self):
        self.api_token = os.environ.get("REPLICATE_API_TOKEN", "")
        self.output_dir = Path(__file__).parent / "triposr_models"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # In-memory job registry: job_id -> job metadata
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def _check_token(self):
        if not self.api_token:
            raise ValueError(
                "REPLICATE_API_TOKEN is not set. "
                "Please add it via the Secrets tab in your Replit project."
            )

    def _headers(self) -> Dict[str, str]:
        self._check_token()
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "Prefer": "wait",
        }

    async def generate_from_image(
        self,
        image_data: bytes,
        original_filename: str,
        do_remove_background: bool = True,
        foreground_ratio: float = 0.85,
    ) -> Dict[str, Any]:
        """
        Submit an image to TripoSR on Replicate and return a job_id for polling.
        """
        self._check_token()

        job_id = str(uuid.uuid4())
        safe_stem = Path(original_filename).stem.replace(" ", "_")[:40]
        output_filename = f"triposr_{safe_stem}_{job_id[:8]}"

        # Upload image as base64 data URI
        import base64
        ext = Path(original_filename).suffix.lower().lstrip(".") or "png"
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/png")
        b64 = base64.b64encode(image_data).decode()
        image_uri = f"data:{mime};base64,{b64}"

        payload = {
            "version": "2599d0309e8107671ce8d2f7d55264186c0c01b22dbd5d58375c65c30c45ae9e",
            "input": {
                "image": image_uri,
                "do_remove_background": do_remove_background,
                "foreground_ratio": foreground_ratio,
            },
        }

        self._jobs[job_id] = {
            "status": "starting",
            "prediction_id": None,
            "output_filename": output_filename,
            "original_filename": original_filename,
            "model_url": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={
                        "Authorization": f"Bearer {self.api_token}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
            err = f"Replicate API timeout — tjenesten svarte ikke innen 30 sekunder ({type(exc).__name__})"
            print(f"[TripoSR] {err}")
            self._jobs[job_id]["status"] = "failed"
            self._jobs[job_id]["error"] = err
            return {"success": False, "error": err}
        except (httpx.ConnectError, httpx.NetworkError, httpx.RequestError) as exc:
            err = f"Replicate API utilgjengelig — nettverksfeil: {type(exc).__name__}"
            print(f"[TripoSR] {err}")
            self._jobs[job_id]["status"] = "failed"
            self._jobs[job_id]["error"] = err
            return {"success": False, "error": err}

        if response.status_code not in (200, 201):
            err = response.text
            try:
                err = response.json().get("detail", err)
            except Exception:
                pass
            self._jobs[job_id]["status"] = "failed"
            self._jobs[job_id]["error"] = f"Replicate API error {response.status_code}: {err}"
            return {"success": False, "error": self._jobs[job_id]["error"]}

        data = response.json()
        prediction_id = data.get("id")
        self._jobs[job_id]["prediction_id"] = prediction_id
        self._jobs[job_id]["status"] = "processing"

        print(f"[TripoSR] Job {job_id} created — Replicate prediction {prediction_id}")
        return {"success": True, "job_id": job_id, "prediction_id": prediction_id}

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """
        Check the status of a TripoSR job. Polls Replicate if still running.
        """
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Job {job_id} not found"}

        if job["status"] in ("succeeded", "failed", "canceled"):
            return {
                "success": True,
                "status": job["status"],
                "model_url": job.get("model_url"),
                "error": job.get("error"),
            }

        prediction_id = job.get("prediction_id")
        if not prediction_id:
            return {"success": True, "status": "starting", "progress": 0}

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers={"Authorization": f"Bearer {self.api_token}"},
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError,
                httpx.NetworkError, httpx.RequestError) as exc:
            print(f"[TripoSR] Status check network error for {job_id}: {type(exc).__name__}")
            return {"success": True, "status": "processing", "progress": 10}

        if response.status_code != 200:
            return {"success": False, "error": f"Status check failed: {response.text}"}

        data = response.json()
        replicate_status = data.get("status", "starting")

        if replicate_status == "succeeded":
            output = data.get("output")
            # TripoSR outputs a single file URL or a list
            glb_url = None
            if isinstance(output, str):
                glb_url = output
            elif isinstance(output, list) and output:
                glb_url = output[0]

            job["status"] = "succeeded"
            job["model_url"] = glb_url
            print(f"[TripoSR] Job {job_id} succeeded. Output URL: {glb_url}")

        elif replicate_status == "failed":
            err = data.get("error", "Generation failed")
            job["status"] = "failed"
            job["error"] = err
            print(f"[TripoSR] Job {job_id} failed: {err}")

        elif replicate_status in ("canceled",):
            job["status"] = "canceled"
        else:
            # Still processing — keep as-is
            pass

        # Map Replicate status → our status labels
        status_map = {
            "starting": "processing",
            "processing": "processing",
            "succeeded": "succeeded",
            "failed": "failed",
            "canceled": "failed",
        }

        return {
            "success": True,
            "status": status_map.get(replicate_status, "processing"),
            "model_url": job.get("model_url"),
            "error": job.get("error"),
        }

    async def download_model(self, job_id: str) -> Dict[str, Any]:
        """
        Download the generated GLB from Replicate and save it locally.
        Returns a local URL path the frontend can access.
        """
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Job {job_id} not found"}

        model_url = job.get("model_url")
        if not model_url:
            # Try refreshing status first
            status = await self.check_status(job_id)
            model_url = status.get("model_url")

        if not model_url:
            return {"success": False, "error": "No model output URL available yet"}

        output_filename = job["output_filename"]
        output_path = self.output_dir / f"{output_filename}.glb"

        # If already downloaded, just return the path
        if output_path.exists():
            return {
                "success": True,
                "path": f"/api/triposr/model/{output_filename}.glb",
                "filename": f"{output_filename}.glb",
            }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.get(model_url)
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError,
                httpx.NetworkError, httpx.RequestError) as exc:
            print(f"[TripoSR] GLB download network error for {job_id}: {type(exc).__name__}")
            return {"success": False, "error": f"Nedlasting feilet — nettverksfeil: {type(exc).__name__}"}

        if response.status_code != 200:
            return {"success": False, "error": f"Failed to download GLB: {response.status_code}"}

        with open(output_path, "wb") as f:
            f.write(response.content)

        print(f"[TripoSR] GLB saved to {output_path}")
        return {
            "success": True,
            "path": f"/api/triposr/model/{output_filename}.glb",
            "filename": f"{output_filename}.glb",
        }

    def list_models(self):
        models = []
        for f in sorted(self.output_dir.glob("*.glb"), key=lambda x: x.stat().st_mtime, reverse=True):
            models.append({
                "filename": f.name,
                "url": f"/api/triposr/model/{f.name}",
                "size_kb": round(f.stat().st_size / 1024, 1),
            })
        return models


triposr_service = TripoSRService()

"""
TRELLIS 3D Environment Generation Service
Converts restaurant/scene images to high-quality GLB files via Replicate API.
Model: firtoz/trellis (A100 80GB, ~2–4 min per generation)
"""

import os
import uuid
import httpx
from pathlib import Path
from typing import Dict, Any, Optional

TRELLIS_VERSION = "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c"
REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions"


class TrellisService:
    def __init__(self):
        self.api_token = os.environ.get("REPLICATE_API_TOKEN", "")
        self.uploads_dir = Path(__file__).parent / "trellis_uploads"
        self.models_dir = Path(__file__).parent / "trellis_models"
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def _check_token(self):
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN er ikke satt.")

    def _auth_headers(self) -> Dict[str, str]:
        self._check_token()
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    def save_upload(self, image_data: bytes, original_filename: str) -> str:
        """Save uploaded image and return the stored filename."""
        ext = Path(original_filename).suffix.lower() or ".png"
        unique_name = f"trellis_upload_{uuid.uuid4().hex[:12]}{ext}"
        upload_path = self.uploads_dir / unique_name
        with open(upload_path, "wb") as f:
            f.write(image_data)
        print(f"[TRELLIS] Upload saved: {upload_path}")
        return unique_name

    async def generate_from_image(
        self,
        image_data: bytes,
        original_filename: str,
        public_base_url: str,
        texture_size: int = 1024,
        mesh_simplify: float = 0.95,
        ss_steps: int = 12,
        slat_steps: int = 12,
    ) -> Dict[str, Any]:
        """
        Save image, submit to TRELLIS on Replicate, return job_id.
        public_base_url: e.g. 'https://myrepl.replit.dev' — used to construct the image URL for Replicate.
        """
        self._check_token()

        upload_filename = self.save_upload(image_data, original_filename)
        image_public_url = f"{public_base_url}/api/trellis/upload/{upload_filename}"

        job_id = str(uuid.uuid4())
        safe_stem = Path(original_filename).stem.replace(" ", "_")[:40]
        output_filename = f"trellis_{safe_stem}_{job_id[:8]}"

        payload = {
            "version": TRELLIS_VERSION,
            "input": {
                "images": [image_public_url],
                "texture_size": texture_size,
                "mesh_simplify": mesh_simplify,
                "generate_model": True,
                "save_gaussian_ply": False,
                "ss_sampling_steps": ss_steps,
                "slat_sampling_steps": slat_steps,
            },
        }

        self._jobs[job_id] = {
            "status": "starting",
            "prediction_id": None,
            "upload_filename": upload_filename,
            "output_filename": output_filename,
            "original_filename": original_filename,
            "image_url": image_public_url,
            "model_url": None,
            "local_path": None,
            "error": None,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                REPLICATE_PREDICTIONS_URL,
                headers=self._auth_headers(),
                json=payload,
            )

            if response.status_code not in (200, 201):
                err = response.text
                try:
                    err = response.json().get("detail", err)
                except Exception:
                    pass
                self._jobs[job_id]["status"] = "failed"
                self._jobs[job_id]["error"] = f"Replicate API feil {response.status_code}: {err}"
                print(f"[TRELLIS] Prediction submission failed: {self._jobs[job_id]['error']}")
                return {"success": False, "error": self._jobs[job_id]["error"]}

            data = response.json()
            prediction_id = data.get("id")
            self._jobs[job_id]["prediction_id"] = prediction_id
            self._jobs[job_id]["status"] = "processing"

            print(f"[TRELLIS] Job {job_id} started — Replicate prediction {prediction_id}")
            return {
                "success": True,
                "job_id": job_id,
                "prediction_id": prediction_id,
                "image_url": image_public_url,
            }

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """Poll Replicate for the job status."""
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Jobb {job_id} ikke funnet"}

        if job["status"] in ("succeeded", "failed", "canceled"):
            return {
                "success": True,
                "status": job["status"],
                "model_url": job.get("model_url"),
                "local_path": job.get("local_path"),
                "error": job.get("error"),
            }

        prediction_id = job.get("prediction_id")
        if not prediction_id:
            return {"success": True, "status": "starting", "progress": 0}

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{REPLICATE_PREDICTIONS_URL}/{prediction_id}",
                headers={"Authorization": f"Bearer {self.api_token}"},
            )

            if response.status_code != 200:
                return {"success": False, "error": f"Statuskontroll feilet: {response.text}"}

            data = response.json()
            replicate_status = data.get("status", "starting")
            logs = data.get("logs", "")
            metrics = data.get("metrics", {})

            if replicate_status == "succeeded":
                output = data.get("output", {})
                glb_url: Optional[str] = None
                if isinstance(output, dict):
                    glb_url = output.get("model_file") or output.get("mesh") or output.get("glb")
                elif isinstance(output, str):
                    glb_url = output
                elif isinstance(output, list) and output:
                    glb_url = output[0]

                job["status"] = "succeeded"
                job["model_url"] = glb_url
                print(f"[TRELLIS] Job {job_id} succeeded. GLB URL: {glb_url}")

            elif replicate_status == "failed":
                err = data.get("error", "Generering feilet")
                job["status"] = "failed"
                job["error"] = err
                print(f"[TRELLIS] Job {job_id} failed: {err}")

            elif replicate_status == "canceled":
                job["status"] = "canceled"

            status_map = {
                "starting": "processing",
                "processing": "processing",
                "succeeded": "succeeded",
                "failed": "failed",
                "canceled": "failed",
            }

            predict_time = metrics.get("predict_time")
            return {
                "success": True,
                "status": status_map.get(replicate_status, "processing"),
                "replicate_status": replicate_status,
                "model_url": job.get("model_url"),
                "local_path": job.get("local_path"),
                "error": job.get("error"),
                "logs": logs[-300:] if logs else "",
                "predict_time": predict_time,
            }

    async def download_model(self, job_id: str) -> Dict[str, Any]:
        """Download the finished GLB from Replicate and save locally."""
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Jobb {job_id} ikke funnet"}

        model_url = job.get("model_url")
        if not model_url:
            status = await self.check_status(job_id)
            model_url = status.get("model_url")

        if not model_url:
            return {"success": False, "error": "Ingen GLB-output tilgjengelig ennå"}

        output_filename = job["output_filename"]
        output_path = self.models_dir / f"{output_filename}.glb"

        if output_path.exists():
            job["local_path"] = f"/api/trellis/model/{output_filename}.glb"
            return {
                "success": True,
                "path": job["local_path"],
                "filename": f"{output_filename}.glb",
            }

        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            response = await client.get(model_url)
            if response.status_code != 200:
                return {"success": False, "error": f"Nedlasting av GLB feilet: {response.status_code}"}
            with open(output_path, "wb") as f:
                f.write(response.content)

        local_url = f"/api/trellis/model/{output_filename}.glb"
        job["local_path"] = local_url
        print(f"[TRELLIS] GLB lagret: {output_path} ({output_path.stat().st_size // 1024} KB)")
        return {
            "success": True,
            "path": local_url,
            "filename": f"{output_filename}.glb",
        }

    def list_models(self):
        return [
            {
                "filename": f.name,
                "url": f"/api/trellis/model/{f.name}",
                "size_kb": round(f.stat().st_size / 1024, 1),
                "mtime": f.stat().st_mtime,
            }
            for f in sorted(self.models_dir.glob("*.glb"), key=lambda x: x.stat().st_mtime, reverse=True)
        ]


trellis_service = TrellisService()

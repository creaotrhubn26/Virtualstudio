"""
Hyper3D Rodin API Service
Generates 3D models from text prompts using Rodin API
"""

import os
import time
import httpx
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List

RODIN_API_BASE = "https://api.hyper3d.com/api"

class RodinService:
    def __init__(self):
        self.api_key = os.environ.get("RODIN_API_KEY", "")
        self.output_dir = Path(__file__).parent / "rodin_models"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}"
        }
    
    async def generate_from_text(
        self,
        prompt: str,
        quality: str = "medium",
        geometry_format: str = "glb",
        material: str = "PBR",
        tier: str = "Regular"
    ) -> Dict[str, Any]:
        """
        Generate a 3D model from text prompt.
        Cost: 0.5 credits per generation
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            data = {
                "prompt": prompt,
                "quality": quality,
                "geometry_file_format": geometry_format,
                "material": material,
                "tier": tier,
                "mesh_mode": "Quad",
                "mesh_simplify": True
            }
            
            response = await client.post(
                f"{RODIN_API_BASE}/v2/rodin",
                headers=self._headers(),
                data=data
            )
            
            if response.status_code != 201:
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}",
                    "details": response.text
                }
            
            result = response.json()
            return {
                "success": True,
                "uuid": result.get("uuid"),
                "jobs": result.get("jobs", {})
            }
    
    async def check_status(self, uuid: str) -> Dict[str, Any]:
        """Check the status of a generation job."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{RODIN_API_BASE}/v2/status",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"uuid": uuid}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            
            result = response.json()
            return {
                "success": True,
                "status": result.get("status"),
                "progress": result.get("progress", 0),
                "jobs": result.get("jobs", [])
            }
    
    async def download_result(self, uuid: str, filename: str) -> Dict[str, Any]:
        """Download the generated 3D model."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{RODIN_API_BASE}/v2/download",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"uuid": uuid}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            
            result = response.json()
            download_items = result.get("list", [])
            
            glb_url = None
            for item in download_items:
                if item.get("name", "").endswith(".glb"):
                    glb_url = item.get("url")
                    break
            
            if not glb_url:
                return {"success": False, "error": "No GLB file found in results"}
            
            model_response = await client.get(glb_url)
            if model_response.status_code != 200:
                return {"success": False, "error": "Failed to download model file"}
            
            output_path = self.output_dir / f"{filename}.glb"
            with open(output_path, "wb") as f:
                f.write(model_response.content)
            
            return {
                "success": True,
                "path": str(output_path),
                "filename": f"{filename}.glb"
            }
    
    async def generate_and_wait(
        self,
        prompt: str,
        filename: str,
        quality: str = "medium",
        max_wait: int = 300
    ) -> Dict[str, Any]:
        """
        Generate a 3D model and wait for completion.
        Returns the downloaded model path.
        """
        gen_result = await self.generate_from_text(prompt, quality=quality)
        
        if not gen_result.get("success"):
            return gen_result
        
        uuid = gen_result.get("uuid")
        if not uuid:
            return {"success": False, "error": "No UUID returned"}
        
        start_time = time.time()
        while time.time() - start_time < max_wait:
            status = await self.check_status(uuid)
            
            if not status.get("success"):
                return status
            
            job_status = status.get("status", "")
            
            if job_status == "Done":
                return await self.download_result(uuid, filename)
            elif job_status == "Failed":
                return {"success": False, "error": "Generation failed"}
            
            await asyncio.sleep(5)
        
        return {"success": False, "error": "Timeout waiting for generation"}
    
    async def batch_generate(
        self,
        items: List[Dict[str, str]],
        quality: str = "low"
    ) -> List[Dict[str, Any]]:
        """
        Generate multiple 3D models in batch.
        Each item should have 'prompt' and 'filename' keys.
        Uses low quality by default to save credits.
        """
        results = []
        
        for item in items:
            prompt = item.get("prompt", "")
            filename = item.get("filename", f"model_{len(results)}")
            category = item.get("category", "misc")
            
            print(f"Generating: {filename} - {prompt[:50]}...")
            
            result = await self.generate_and_wait(
                prompt=prompt,
                filename=filename,
                quality=quality
            )
            
            result["category"] = category
            result["name"] = item.get("name", filename)
            results.append(result)
            
            if result.get("success"):
                print(f"  Success: {result.get('path')}")
            else:
                print(f"  Failed: {result.get('error')}")
        
        return results


rodin_service = RodinService()

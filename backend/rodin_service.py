"""
Hyper3D Rodin API Service
Generates 3D models from text prompts using Rodin API
"""

import os
import time
import httpx
import asyncio
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
try:
    from prompt_enhancer import prompt_enhancer
    print("Prompt enhancer imported successfully")
except ImportError as e:
    print(f"WARNING: Failed to import prompt_enhancer: {e}")
    try:
        # Try relative import
        from .prompt_enhancer import prompt_enhancer
        print("Prompt enhancer imported successfully (relative import)")
    except ImportError as e2:
        print(f"WARNING: Relative import also failed: {e2}")
        # Fallback: create a dummy enhancer that returns prompts unchanged
        class DummyEnhancer:
            def enhance(self, prompt: str) -> str:
                print(f"[DummyEnhancer] No enhancement applied to: '{prompt}'")
                return prompt
        prompt_enhancer = DummyEnhancer()

RODIN_API_BASE = "https://api.hyper3d.com/api"

class RodinService:
    def __init__(self):
        self.api_key = os.environ.get("RODIN_API_KEY", "")
        if not self.api_key:
            print("WARNING: RODIN_API_KEY environment variable not set!")
        self.output_dir = Path(__file__).parent / "rodin_models"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise ValueError("RODIN_API_KEY not configured. Please set the RODIN_API_KEY environment variable.")
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
        # Enhance prompt for better quality
        original_prompt = prompt
        try:
            enhanced_prompt = prompt_enhancer.enhance(prompt)
            
            # Log prompt enhancement for debugging
            if enhanced_prompt != original_prompt:
                print(f"Prompt enhanced:")
                print(f"  Original: {original_prompt}")
                print(f"  Enhanced: {enhanced_prompt}")
            else:
                print(f"Prompt already well-formed: {original_prompt}")
        except Exception as e:
            print(f"WARNING: Prompt enhancement failed: {str(e)}")
            print(f"  Using original prompt: {original_prompt}")
            import traceback
            traceback.print_exc()
            enhanced_prompt = original_prompt
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            data = {
                "prompt": enhanced_prompt,
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
                error_details = response.text
                try:
                    error_json = response.json()
                    error_details = error_json.get("error") or error_json.get("message") or error_details
                except:
                    pass
                
                return {
                    "success": False,
                    "error": f"API error {response.status_code}: {error_details}",
                    "details": error_details
                }
            
            result = response.json()
            print(f"Rodin API response (full): {json.dumps(result, indent=2)}")
            
            # Extract UUID for downloading results later
            uuid = result.get("uuid") or result.get("task_id") or result.get("id") or result.get("task_uuid")
            
            # Extract subscription_key for status checking (this is the correct key!)
            jobs = result.get("jobs", {})
            subscription_key = None
            
            if isinstance(jobs, dict):
                subscription_key = jobs.get("subscription_key")
                # Also extract UUID from jobs if not found at top level
                if not uuid:
                    uuids = jobs.get("uuids", [])
                    if uuids:
                        uuid = uuids[0] if isinstance(uuids, list) else uuids
            
            # Check if there's a data field
            data_field = result.get("data", {})
            if isinstance(data_field, dict):
                uuid = uuid or data_field.get("uuid") or data_field.get("task_id") or data_field.get("id")
                subscription_key = subscription_key or data_field.get("subscription_key")
            
            if not subscription_key:
                error_msg = f"No subscription_key found in API response. Full response: {json.dumps(result, indent=2)}"
                print(f"ERROR: {error_msg}")
                return {
                    "success": False,
                    "error": "No subscription_key returned from API",
                    "details": error_msg,
                    "api_response": result
                }
            
            print(f"Extracted subscription_key: {subscription_key}, UUID: {uuid}")
            return {
                "success": True,
                "uuid": uuid,
                "subscription_key": subscription_key,
                "jobs": jobs,
                "full_response": result
            }
    
    async def check_status(self, subscription_key: str) -> Dict[str, Any]:
        """Check the status of a generation job using subscription_key."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{RODIN_API_BASE}/v2/status",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"subscription_key": subscription_key}
            )
            
            if response.status_code not in [200, 201]:
                error_text = response.text
                try:
                    error_json = response.json()
                    error_text = json.dumps(error_json)
                except:
                    pass
                return {"success": False, "error": f"Status check failed ({response.status_code}): {error_text}"}
            
            result = response.json()
            print(f"Status check response: {json.dumps(result, indent=2)}")
            
            jobs = result.get("jobs", [])
            
            # Determine overall status from jobs
            all_done = True
            any_failed = False
            total_progress = 0
            
            if isinstance(jobs, list) and jobs:
                for job in jobs:
                    job_status = job.get("status", "")
                    if job_status.lower() == "failed":
                        any_failed = True
                    if job_status.lower() != "done":
                        all_done = False
                    total_progress += job.get("progress", 0)
                avg_progress = total_progress / len(jobs)
            else:
                all_done = False
                avg_progress = 0
            
            if any_failed:
                status = "Failed"
            elif all_done:
                status = "Done"
            else:
                status = "Processing"
            
            return {
                "success": True,
                "status": status,
                "progress": avg_progress,
                "jobs": jobs
            }
    
    async def download_result(self, task_uuid: str, filename: str) -> Dict[str, Any]:
        """Download the generated 3D model using task_uuid."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            print(f"Requesting download for task_uuid: {task_uuid}")
            response = await client.post(
                f"{RODIN_API_BASE}/v2/download",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"task_uuid": task_uuid}
            )
            
            print(f"Download API response status: {response.status_code}")
            
            if response.status_code not in [200, 201]:
                error_details = response.text
                try:
                    error_json = response.json()
                    error_details = error_json.get("error") or error_json.get("message") or error_details
                except:
                    pass
                return {"success": False, "error": f"Download failed: {error_details}"}
            
            result = response.json()
            print(f"Download API response: {json.dumps(result, indent=2)}")
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
            
            # Return URL path that frontend can access via static files mount
            url_path = f"/api/models/{filename}.glb"
            
            return {
                "success": True,
                "path": url_path,
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
        subscription_key = gen_result.get("subscription_key")
        
        if not subscription_key:
            return {"success": False, "error": "No subscription_key returned", "details": gen_result}
        
        print(f"Starting status check loop with subscription_key: {subscription_key}, uuid: {uuid}")
        
        # Wait before first status check
        print("Waiting 3 seconds before first status check...")
        await asyncio.sleep(3)
        
        start_time = time.time()
        check_count = 0
        while time.time() - start_time < max_wait:
            check_count += 1
            print(f"Status check #{check_count}")
            
            status = await self.check_status(subscription_key)
            
            if not status.get("success"):
                return status
            
            job_status = status.get("status", "")
            progress = status.get("progress", 0)
            print(f"Job status: {job_status}, progress: {progress}%")
            
            if job_status == "Done":
                print(f"Job completed, downloading result...")
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

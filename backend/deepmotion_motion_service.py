"""
DeepMotion SayMotion service — text prompt → BVH animation via hosted API.

SayMotion is DeepMotion's text-to-3D-animation product. This client drives
its REST API (https://github.com/DeepMotion/SayMotion-REST-API):

    1. GET  {host}/account/v1/auth                  Basic auth → dmsess cookie
    2. POST {host}/job/v1/process/text2motion       {"params": ["prompt=..."]}
                                                    → {"rid": <request id>}
    3. GET  {host}/job/v1/status/{rid}              poll until SUCCESS/FAILURE
    4. GET  {host}/job/v1/download/{rid}            → links[].urls[].files[]
                                                      with per-format URLs
    5. GET  <bvh url>                               → BVH text

Configuration (all three required; the API host is account-specific and
handed out by DeepMotion, hence no default):

    DEEPMOTION_CLIENT_ID=...
    DEEPMOTION_CLIENT_SECRET=...
    DEEPMOTION_API_HOST=https://<your-assigned-host>

Used by text_to_motion_service as the preferred neural tier: the BVH result
is retargeted onto the active rig's joint names by bvh_retarget.bvh_to_tracks,
producing the same clip shape as the procedural generator. Everything here is
synchronous on purpose — the motion routes are sync `def` handlers that
FastAPI already runs in its threadpool.
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

import httpx

POLL_INTERVAL_SEC = 3.0
DEFAULT_TIMEOUT_SEC = 180.0
# Formats we can consume, in preference order. BVH is what bvh_retarget
# parses; the others are only reported back as URLs for the caller.
_PREFERRED_FORMAT = "bvh"


class DeepMotionService:
    def __init__(self) -> None:
        self.client_id = os.environ.get("DEEPMOTION_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("DEEPMOTION_CLIENT_SECRET", "").strip()
        self.host = os.environ.get("DEEPMOTION_API_HOST", "").strip().rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.client_id and self.client_secret and self.host)

    def generate(
        self,
        prompt: str,
        *,
        duration_sec: Optional[float] = None,
        timeout_sec: float = DEFAULT_TIMEOUT_SEC,
        transport: Optional[httpx.BaseTransport] = None,
    ) -> Dict[str, Any]:
        """Generate an animation for `prompt`. Returns
        {success, bvhText, formatUrls, rid, error}. Never raises —
        transport/API failures come back as success=False so the caller's
        procedural fallback engages.

        `transport` is a test seam (httpx.MockTransport in unit tests).
        """
        if not self.enabled:
            return {"success": False, "error": "DeepMotion not configured (DEEPMOTION_CLIENT_ID/SECRET/API_HOST)"}
        prompt = (prompt or "").strip()
        if not prompt:
            return {"success": False, "error": "empty prompt"}

        try:
            with httpx.Client(timeout=30.0, transport=transport) as client:
                # 1. Session cookie. httpx stores set-cookie in client.cookies
                #    automatically and replays it on subsequent requests.
                auth_resp = client.get(
                    f"{self.host}/account/v1/auth",
                    auth=(self.client_id, self.client_secret),
                )
                auth_resp.raise_for_status()

                # 2. Submit the text2motion job.
                params: List[str] = [f"prompt={prompt}", "skipFBX=1"]
                if duration_sec is not None and duration_sec > 0:
                    params.append(f"requestedAnimationDuration={min(30.0, float(duration_sec)):.2f}")
                submit_resp = client.post(
                    f"{self.host}/job/v1/process/text2motion",
                    json={"params": params},
                )
                submit_resp.raise_for_status()
                rid = (submit_resp.json() or {}).get("rid")
                if not rid:
                    return {"success": False, "error": f"no rid in submit response: {submit_resp.text[:200]}"}

                # 3. Poll for completion.
                elapsed = 0.0
                while True:
                    status_resp = client.get(f"{self.host}/job/v1/status/{rid}")
                    status_resp.raise_for_status()
                    records = (status_resp.json() or {}).get("status") or []
                    record = records[0] if records else {}
                    status = record.get("status")
                    if status == "SUCCESS":
                        break
                    if status == "FAILURE":
                        return {
                            "success": False, "rid": rid,
                            "error": f"DeepMotion job failed: {record.get('details')}",
                        }
                    if elapsed >= timeout_sec:
                        return {
                            "success": False, "rid": rid,
                            "error": f"DeepMotion job timed out after {timeout_sec:.0f}s",
                        }
                    time.sleep(POLL_INTERVAL_SEC)
                    elapsed += POLL_INTERVAL_SEC

                # 4. Download links.
                dl_resp = client.get(f"{self.host}/job/v1/download/{rid}")
                dl_resp.raise_for_status()
                format_urls = self._extract_format_urls(dl_resp.json())
                bvh_url = format_urls.get(_PREFERRED_FORMAT)
                if not bvh_url:
                    return {
                        "success": False, "rid": rid,
                        "error": f"no BVH in download response (formats: {sorted(format_urls)})",
                    }

                # 5. Fetch the BVH itself (URL is presigned; no cookie needed,
                #    but reusing the client keeps the test transport in play).
                bvh_resp = client.get(bvh_url)
                bvh_resp.raise_for_status()
                bvh_text = bvh_resp.text
        except httpx.HTTPStatusError as exc:
            return {
                "success": False,
                "error": f"DeepMotion HTTP {exc.response.status_code}: {exc.response.text[:300]}",
            }
        except Exception as exc:  # noqa: BLE001 - all transport errors → fallback
            return {"success": False, "error": f"DeepMotion request failed: {exc}"}

        if "HIERARCHY" not in bvh_text[:2000]:
            return {"success": False, "rid": rid, "error": "downloaded file is not BVH"}

        return {
            "success": True,
            "rid": rid,
            "bvhText": bvh_text,
            "formatUrls": format_urls,
        }

    @staticmethod
    def _extract_format_urls(download_json: Dict[str, Any]) -> Dict[str, str]:
        """Flatten the nested download response into {format: url}.

        Shape per the API docs:
          {"count": N, "links": [{"rid": ..., "urls": [
              {"name": ..., "files": [{"bvh": url}, {"glb": url}, ...]}]}]}
        """
        out: Dict[str, str] = {}
        for link in (download_json or {}).get("links") or []:
            for entry in link.get("urls") or []:
                for file_obj in entry.get("files") or []:
                    if not isinstance(file_obj, dict):
                        continue
                    for fmt, url in file_obj.items():
                        if isinstance(url, str) and url and fmt not in out:
                            out[str(fmt).lower()] = url
        return out


_INSTANCE: Optional[DeepMotionService] = None


def get_deepmotion_service() -> DeepMotionService:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = DeepMotionService()
    return _INSTANCE

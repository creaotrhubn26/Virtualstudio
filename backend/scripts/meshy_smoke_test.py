"""
Meshy smoke test — one real text-to-3D round-trip.

Confirms the MESHY_API_KEY in .env works, the preview endpoint returns a
task id, polling reaches SUCCEEDED, and the GLB downloads to disk. Costs
~1 Meshy credit (~$0.10). Takes 60-180 seconds.

Run from repo root:
    python3 backend/scripts/meshy_smoke_test.py "vintage brass typewriter"
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

# Load .env the same way backend/main.py does (no dotenv package required).
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from meshy_service import get_meshy_service  # noqa: E402


async def main() -> int:
    prompt = sys.argv[1] if len(sys.argv) > 1 else "vintage brass typewriter"
    print(f"→ prompt: {prompt!r}")

    svc = get_meshy_service()
    if not svc.enabled:
        print("✗ MESHY_API_KEY missing — cannot smoke-test")
        return 2

    print(f"→ key prefix: {svc.api_key[:6]}… (length {len(svc.api_key)})")
    started = time.time()

    result = await svc.generate_prop(prompt, timeout_sec=300)

    elapsed = time.time() - started
    print(f"→ elapsed: {elapsed:.1f}s")

    if not result.get("success"):
        print(f"✗ FAILED: {result.get('error')}")
        job = svc.get_job(result.get("job_id", "")) or {}
        print(f"  job state: status={job.get('status')} task_id={job.get('task_id')}")
        return 1

    local = Path(result["local_path"])
    size_kb = local.stat().st_size // 1024
    print(f"✓ SUCCEEDED")
    print(f"  job_id     : {result['job_id']}")
    print(f"  local_path : {local} ({size_kb} KB)")
    print(f"  meshy_url  : {result['model_url'][:80]}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

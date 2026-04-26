"""
Prop resolver smoke test — runs the full orchestrator twice.

First call: cache miss → BlenderKit → R2 upload → public URL.
Second call: R2 HEAD hit → public URL returned without provider work.

Proves the fingerprint cache is doing its job. Uses a BlenderKit-friendly
prompt so it costs zero Meshy credits.

    python3 backend/scripts/prop_resolver_smoke_test.py "wooden crate"
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prop_resolver_service import get_prop_resolver_service  # noqa: E402


async def run_once(label: str, svc, desc: str, force: bool = False) -> None:
    print(f"\n=== {label} ===")
    start = time.time()
    res = await svc.resolve(desc, force_refresh=force)
    took = time.time() - start
    print(f"  wall-time: {took:.2f}s")
    print(f"  success  : {res.success}")
    print(f"  provider : {res.provider}")
    print(f"  cacheHit : {res.cache_hit}")
    if res.glb_url:
        print(f"  glbUrl   : {res.glb_url}")
    if res.size_kb is not None:
        print(f"  size     : {res.size_kb} KB")
    if res.error:
        print(f"  error    : {res.error}")
    if res.attempts:
        print(f"  attempts :")
        for a in res.attempts:
            print(f"    - {a}")


async def main() -> int:
    prompt = sys.argv[1] if len(sys.argv) > 1 else "wooden crate"
    svc = get_prop_resolver_service()
    print("Provider chain:", svc.describe_chain())

    # Pass 1 — likely a cache miss on the first run, so this downloads +
    # uploads to R2. May be a cache hit if the same prompt was resolved
    # before; that's still a valid outcome (proves cache works).
    await run_once("pass 1 (may miss or hit)", svc, prompt)

    # Pass 2 — must be a cache hit if pass 1 succeeded. If pass 2 is
    # anything other than cacheHit=True + provider=cache, the R2 layer
    # isn't wired correctly.
    await run_once("pass 2 (must hit cache)", svc, prompt)

    # Pass 3 — forced refresh bypasses the cache; proves we can still
    # regenerate when operators want a fresh GLB. Skipping by default
    # because BlenderKit's scene-uuid tracking already records pass 1/2.
    if os.environ.get("SMOKE_FORCE_REFRESH") == "1":
        await run_once("pass 3 (force_refresh=True)", svc, prompt, force=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

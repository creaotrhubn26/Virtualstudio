"""
BlenderKit smoke test — search + download one GLB.

Free to run (search costs nothing). Only downloads if a GLB/glTF variant
is found in the top results. Call:

    python3 backend/scripts/blenderkit_smoke_test.py "vintage typewriter"
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
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
from blenderkit_service import get_blenderkit_service  # noqa: E402


async def main() -> int:
    query = sys.argv[1] if len(sys.argv) > 1 else "typewriter"
    print(f"→ query: {query!r}")

    svc = get_blenderkit_service()
    if not svc.enabled:
        print("✗ BLENDERKIT_API_KEY missing")
        return 2

    print(f"→ key length: {len(svc.api_key)}")

    # First, dump raw search results so we can inspect the file formats
    # BlenderKit actually exposes. This is informational — not an error
    # even when no GLB variant exists.
    search = await svc.search_models(query)
    if not search.get("success"):
        print(f"✗ SEARCH FAILED: {search.get('error')}")
        return 1

    print(f"→ search count (total): {search['count']}")
    print(f"→ search results (top {len(search['results'])}):")
    for i, asset in enumerate(search["results"], 1):
        formats = [f.get("fileType") for f in asset.get("files") or []]
        print(
            f"   {i}. {asset.get('name')!r:45} "
            f"free={asset.get('isFree')} canDL={asset.get('canDownload')} "
            f"formats={formats}"
        )

    print("→ attempting download…")
    result = await svc.find_and_download(query)
    if not result.get("success"):
        print(f"✗ DOWNLOAD FAILED: {result.get('error')}")
        if result.get("message"):
            print(f"  {result['message']}")
        return 1

    print("✓ SUCCEEDED")
    print(f"  asset     : {result['asset_name']}")
    print(f"  format    : {result['format']}")
    print(f"  local     : {result['local_path']} ({result['size_kb']} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

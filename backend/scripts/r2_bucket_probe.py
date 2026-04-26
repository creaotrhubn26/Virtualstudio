"""
R2 bucket probe — list what exists on the account, no writes, no cost.

Confirms which buckets are reachable with the current R2 credentials and
what `R2_PUBLIC_BASE_URL` points at, so we pick the right target for the
prop resolver instead of guessing.
"""

from __future__ import annotations

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
from utils.r2_client import (  # noqa: E402
    CASTING_ASSETS_BUCKET,
    R2_PUBLIC_BASE_URL,
    R2_MODELS_BUCKETS,
    get_r2_client,
)


def main() -> int:
    print(f"R2_PUBLIC_BASE_URL     : {R2_PUBLIC_BASE_URL}")
    print(f"CASTING_ASSETS_BUCKET  : {CASTING_ASSETS_BUCKET}")
    print(f"R2_MODELS_BUCKETS      : {R2_MODELS_BUCKETS}")
    print()

    try:
        client = get_r2_client()
    except Exception as exc:
        print(f"✗ R2 client init failed: {exc}")
        return 2

    # Can't list_buckets — IAM likely scoped. Instead, probe each known
    # bucket name individually so we see which are actually reachable with
    # this token.
    candidates = set()
    candidates.add(CASTING_ASSETS_BUCKET)
    for b in R2_MODELS_BUCKETS:
        candidates.add(b)
    # Obvious extras to probe too, in case the conventional name differs
    # from what .env / code assumes.
    for extra in ("vs-props", "virtualstudio", "studio-assets", "props"):
        candidates.add(extra)

    print(f"Probing {len(candidates)} candidate bucket name(s):")
    for name in sorted(candidates):
        status = "?"
        error = ""
        try:
            head = client.list_objects_v2(Bucket=name, MaxKeys=1)
            obj_count = head.get("KeyCount", 0)
            status = f"OK (objects≈{obj_count})"
        except Exception as exc:
            err_str = str(exc)
            if "NoSuchBucket" in err_str:
                status = "MISSING"
            elif "AccessDenied" in err_str:
                status = "forbidden"
            else:
                status = "error"
                error = f" — {type(exc).__name__}: {err_str[:120]}"
        marker = []
        if name == CASTING_ASSETS_BUCKET:
            marker.append("(resolver default)")
        if name in R2_MODELS_BUCKETS:
            marker.append("(models)")
        print(f"  • {name:25} {status} {' '.join(marker)}{error}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

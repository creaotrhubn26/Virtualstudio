"""
Recover-paid-Meshy-GLBs — one-shot rescue script.

Meshy credits were burned generating GLBs that couldn't upload to R2 due
to a non-ASCII S3 metadata bug (fixed). The GLBs still live on disk in
`backend/meshy_models/`. This script uploads each one to R2 under the
*correct* fingerprint for its original prompt, so the next resolver
call is a cache hit instead of a re-billing.

Pass (filename, description) pairs you want to rescue. Run once.
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

from prop_resolver_service import (  # noqa: E402
    GLB_CONTENT_TYPE,
    PROPS_BUCKET,
    fingerprint_description,
    r2_key_for,
)
from utils.r2_client import get_r2_client  # noqa: E402

# (on-disk filename, original full description used by the resolver)
# Descriptions must match EXACTLY what was passed to resolve() or the
# fingerprint won't line up and the next request will re-bill Meshy.
RESCUE_MAP = [
    (
        "meshy_marble_topped_caf_table_scarred_small_ro_8597c8d1.glb",
        "Anna's table — dark-stained oak café table — "
        "Small square dark-stained solid oak café table, worn edges, ",
    ),
    (
        "meshy_anna_seated_figure_female_figure_seated__cc384b7f.glb",
        "Anna (seated figure) — Female figure, seated, head slightly ",
    ),
    (
        "meshy_marble_topped_caf_table_small_round_whit_f1e1bbbe.glb",
        "Marble-topped café table, small round, white marble",
    ),
    (
        "meshy_vintage_brass_typewriter_3a8adfea.glb",
        "vintage brass typewriter",
    ),
]

MODELS_DIR = Path(__file__).resolve().parents[1] / "meshy_models"


def main() -> int:
    client = get_r2_client()
    ok = 0
    for filename, description in RESCUE_MAP:
        path = MODELS_DIR / filename
        if not path.exists():
            print(f"✗ missing {filename}")
            continue
        fp = fingerprint_description(description)
        key = r2_key_for(fp)
        glb = path.read_bytes()
        if glb[:4] != b"glTF":
            print(f"✗ {filename} is not a valid GLB (magic={glb[:4]!r})")
            continue
        try:
            client.put_object(
                Bucket=PROPS_BUCKET,
                Key=key,
                Body=glb,
                ContentType=GLB_CONTENT_TYPE,
                Metadata={
                    "vs-provider": "meshy",
                    "vs-description": description[:128]
                        .encode("ascii", "ignore")
                        .decode("ascii"),
                    "vs-rescued": "1",
                },
            )
        except Exception as exc:
            print(f"✗ upload failed for {filename}: {type(exc).__name__}: {exc}")
            continue
        print(f"✓ {filename} → {key}  ({len(glb) // 1024} KB)")
        ok += 1
    print(f"\n{ok}/{len(RESCUE_MAP)} rescued")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

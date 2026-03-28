#!/usr/bin/env python3
"""
Backfill large local assets into Cloudflare R2 and write sidecar metadata.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def load_local_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync large Virtualstudio assets to Cloudflare R2.")
    parser.add_argument("--dry-run", action="store_true", help="Only audit which files need syncing.")
    parser.add_argument(
        "--min-bytes",
        type=int,
        default=None,
        help="Only sync files at or above this size threshold.",
    )
    parser.add_argument(
        "--roots",
        nargs="*",
        default=None,
        help="Optional relative repo roots to sync. Defaults to the configured asset roots.",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="Skip writing the sync report JSON file.",
    )
    parser.add_argument(
        "--delete-local-after-upload",
        action="store_true",
        help="Delete local copies for safe asset categories after successful R2 sync.",
    )
    return parser


def main() -> int:
    load_local_env_file()

    from utils.large_asset_sync import DEFAULT_MIN_BYTES, sync_large_assets_to_r2

    args = build_parser().parse_args()
    summary = sync_large_assets_to_r2(
        dry_run=bool(args.dry_run),
        min_bytes=args.min_bytes or DEFAULT_MIN_BYTES,
        roots=args.roots,
        delete_local_after_upload=bool(args.delete_local_after_upload),
        write_report=not args.no_report,
    )
    print(json.dumps(summary, indent=2))

    counts = summary.get("counts") or {}
    if counts.get("upload_failed"):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

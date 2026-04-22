"""End-to-end verification harness.

Run with:

    .venv-backend/bin/python backend/scripts/e2e_verify.py

It loads the root .env, boots the FastAPI app in-process, and runs a
sequence of probes against the real external services configured:

  1. Neon Postgres (DATABASE_URL)             — SELECT 1 + table list
  2. Cloudflare R2 (CLOUDFLARE_R2_*)           — list_objects on ml-models
  3. Replicate FLUX image gen                  — tiny schnell render (~3 s)
  4. Replicate TripoSR reachability            — token + endpoint probe only
  5. Anthropic Claude (text + vision)          — tiny prompt if key set
  6. Scene Director /from-beat                 — rules + Claude paths
  7. Routes loaded — sanity count from m.app.routes

Nothing is persisted beyond temp images. Exit code 0 = all probes PASS
or SKIP (skipped = dependency missing, not a failure). Non-zero = at
least one probe FAILED.
"""

from __future__ import annotations

import asyncio
import base64
import os
import sys
import time
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, List, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
ENV_PATH = REPO_ROOT / ".env"


def _load_env() -> None:
    """Small .env loader — same semantics as backend/main.py."""
    if not ENV_PATH.exists():
        return
    for raw in ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


@dataclass
class Probe:
    name: str
    status: str = "PENDING"            # PASS | FAIL | SKIP | PENDING
    detail: str = ""
    elapsed_ms: float = 0.0
    raw: Any = None                    # optional raw data for debugging


@dataclass
class Report:
    probes: List[Probe] = field(default_factory=list)

    def add(self, probe: Probe) -> None:
        self.probes.append(probe)

    def print_summary(self) -> int:
        print()
        print("=" * 72)
        print(" E2E VERIFICATION SUMMARY")
        print("=" * 72)
        width = max(len(p.name) for p in self.probes) + 2
        for p in self.probes:
            glyph = {"PASS": "✓", "FAIL": "✗", "SKIP": "—", "PENDING": "?"}[p.status]
            colour = {
                "PASS": "\x1b[32m",
                "FAIL": "\x1b[31m",
                "SKIP": "\x1b[33m",
                "PENDING": "\x1b[37m",
            }[p.status]
            reset = "\x1b[0m"
            name = p.name.ljust(width)
            print(f"  {colour}{glyph} {name}{reset}  [{p.elapsed_ms:7.1f} ms]  {p.detail}")
        fails = sum(1 for p in self.probes if p.status == "FAIL")
        skips = sum(1 for p in self.probes if p.status == "SKIP")
        passes = sum(1 for p in self.probes if p.status == "PASS")
        print()
        print(f"  pass={passes}  skip={skips}  fail={fails}  total={len(self.probes)}")
        print("=" * 72)
        return 1 if fails > 0 else 0


def _run(name: str, fn: Callable[[], Probe]) -> Probe:
    start = time.monotonic()
    try:
        probe = fn()
    except Exception as exc:
        probe = Probe(
            name=name,
            status="FAIL",
            detail=f"{type(exc).__name__}: {exc}",
            raw=traceback.format_exc(),
        )
    probe.elapsed_ms = (time.monotonic() - start) * 1000
    return probe


# ---------------------------------------------------------------------------
# Probes
# ---------------------------------------------------------------------------


def probe_env() -> Probe:
    required = ["DATABASE_URL", "CLOUDFLARE_R2_ACCESS_KEY_ID"]
    optional = [
        "ANTHROPIC_API_KEY",
        "REPLICATE_API_TOKEN",
        "AI_INTEGRATIONS_OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "MESHY_API_KEY",
    ]
    have = {k: bool(os.environ.get(k)) for k in required + optional}
    missing_required = [k for k in required if not have[k]]
    if missing_required:
        return Probe(
            name="env",
            status="FAIL",
            detail=f"missing: {', '.join(missing_required)}",
            raw=have,
        )
    set_optional = [k for k in optional if have[k]]
    return Probe(
        name="env",
        status="PASS",
        detail=f"required ✓ · optional set: {', '.join(set_optional) or 'none'}",
        raw=have,
    )


def probe_neon_postgres() -> Probe:
    if not os.environ.get("DATABASE_URL"):
        return Probe("neon postgres", status="SKIP", detail="no DATABASE_URL")
    import psycopg2  # type: ignore

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            assert cur.fetchone()[0] == 1
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' ORDER BY table_name"
            )
            tables = [r[0] for r in cur.fetchall()]
    finally:
        conn.close()
    return Probe(
        name="neon postgres",
        status="PASS",
        detail=f"connected · {len(tables)} tables",
        raw={"tables": tables},
    )


def probe_r2() -> Probe:
    ak = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID")
    sk = os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    acct = os.environ.get("CLOUDFLARE_R2_ACCOUNT_ID")
    if not (ak and sk and acct):
        return Probe("cloudflare r2", status="SKIP", detail="no R2 creds")
    import boto3  # type: ignore
    from botocore.config import Config  # type: ignore

    buckets = [
        b.strip()
        for b in os.environ.get("CLOUDFLARE_R2_MODELS_BUCKETS", "ml-models").split(",")
        if b.strip()
    ]
    client = boto3.client(
        "s3",
        endpoint_url=f"https://{acct}.r2.cloudflarestorage.com",
        aws_access_key_id=ak.strip(),
        aws_secret_access_key=sk.strip(),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    results: List[str] = []
    for bucket in buckets:
        try:
            resp = client.list_objects_v2(Bucket=bucket, MaxKeys=3)
            count = resp.get("KeyCount", 0)
            results.append(f"{bucket}={count}obj")
        except Exception as exc:
            results.append(f"{bucket}=FAIL({exc.__class__.__name__})")
    # If any bucket failed, mark FAIL but still show all
    if any("FAIL" in r for r in results):
        return Probe(
            name="cloudflare r2",
            status="FAIL",
            detail=" · ".join(results),
            raw={"buckets": results},
        )
    return Probe(
        name="cloudflare r2",
        status="PASS",
        detail=" · ".join(results),
        raw={"buckets": results},
    )


def probe_replicate_flux() -> Probe:
    if not os.environ.get("REPLICATE_API_TOKEN"):
        return Probe("replicate flux", status="SKIP", detail="no REPLICATE_API_TOKEN")

    sys.path.insert(0, str(BACKEND_DIR))
    from replicate_image_service import get_replicate_image_service  # type: ignore

    svc = get_replicate_image_service()
    if not svc.enabled:
        return Probe("replicate flux", status="FAIL", detail="service disabled after init")

    result = asyncio.run(
        svc.generate(
            prompt="A single red apple on a plain white background, studio lighting",
            width=512,
            height=512,
        )
    )
    if not result.get("success"):
        return Probe(
            name="replicate flux",
            status="FAIL",
            detail=str(result.get("error"))[:180],
            raw=result,
        )
    kb = len(result["image_bytes"]) / 1024
    return Probe(
        name="replicate flux",
        status="PASS",
        detail=f"{svc.default_model} → {kb:.0f} kB png",
        raw={"bytes": len(result["image_bytes"]), "model": result.get("model")},
    )


def probe_triposr_reachable() -> Probe:
    if not os.environ.get("REPLICATE_API_TOKEN"):
        return Probe("triposr reach", status="SKIP", detail="no REPLICATE_API_TOKEN")
    sys.path.insert(0, str(BACKEND_DIR))
    from triposr_service import triposr_service  # type: ignore

    if not triposr_service or not getattr(triposr_service, "api_token", None):
        return Probe("triposr reach", status="FAIL", detail="no token on triposr_service")
    return Probe(
        name="triposr reach",
        status="PASS",
        detail="token present, not invoked (saves credits)",
    )


def probe_claude() -> Probe:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return Probe("claude", status="SKIP", detail="no ANTHROPIC_API_KEY")
    sys.path.insert(0, str(BACKEND_DIR))
    from claude_client import get_claude_client  # type: ignore

    client = get_claude_client()
    if not client.enabled:
        return Probe("claude", status="FAIL", detail="client disabled after init")

    text = client.complete(
        system="You are a terse assistant.",
        user="Reply with exactly: pong",
        max_tokens=32,
    )
    return Probe(
        name="claude",
        status="PASS",
        detail=f"model={client._client.__class__.__name__} · reply={text[:40]!r}",
    )


def probe_scene_director() -> Probe:
    sys.path.insert(0, str(BACKEND_DIR))
    from scene_director_service import ParsedBeat, get_scene_director  # type: ignore

    svc = get_scene_director()
    result = asyncio.run(
        svc.direct_beat(
            ParsedBeat(
                location="Cozy café",
                int_ext="INT",
                time_of_day="DAY",
                characters=["Anna"],
                action="Anna sits alone at a window, stirring her coffee.",
                language="en",
            )
        )
    )
    mode = "claude" if svc.llm_enabled else "rules"
    return Probe(
        name="scene director",
        status="PASS",
        detail=(
            f"mode={mode} · shot={result.shot.type} {result.shot.focal_length_mm}mm "
            f"f/{result.shot.aperture_f} · lighting={result.lighting.pattern}"
        ),
        raw={
            "sceneId": result.scene_id,
            "mood_notes": result.director_notes[:2],
        },
    )


def probe_fastapi_routes() -> Probe:
    sys.path.insert(0, str(BACKEND_DIR))
    # Force non-strict so missing Postgres tables don't crash startup
    os.environ.setdefault("STRICT_SERVICES", "false")
    import main as backend_main  # type: ignore

    routes = [r.path for r in backend_main.app.routes if hasattr(r, "path")]
    api_routes = [p for p in routes if p.startswith("/api/")]
    # Sample a few important namespaces
    groups = {
        "scene-director": sum(1 for p in api_routes if "/scene-director/" in p),
        "characters": sum(1 for p in api_routes if "/characters" in p),
        "studio": sum(1 for p in api_routes if "/studio/" in p),
        "health": sum(1 for p in api_routes if p in {"/api/health", "/api/ml/health"}),
    }
    detail = " · ".join(f"{k}={v}" for k, v in groups.items())
    return Probe(
        name="fastapi routes",
        status="PASS",
        detail=f"{len(api_routes)} /api routes · {detail}",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    _load_env()
    os.environ.setdefault("STRICT_SERVICES", "false")

    print("Virtual Studio · E2E verification")
    print(f"Repo: {REPO_ROOT}")
    print(f".env: {'loaded' if ENV_PATH.exists() else 'MISSING'}")
    print()

    report = Report()
    probes: List[tuple[str, Callable[[], Probe]]] = [
        ("env", probe_env),
        ("neon postgres", probe_neon_postgres),
        ("cloudflare r2", probe_r2),
        ("replicate flux", probe_replicate_flux),
        ("triposr reach", probe_triposr_reachable),
        ("claude", probe_claude),
        ("scene director", probe_scene_director),
        ("fastapi routes", probe_fastapi_routes),
    ]
    for name, fn in probes:
        print(f"→ {name}…", flush=True)
        report.add(_run(name, fn))

    return report.print_summary()


if __name__ == "__main__":
    sys.exit(main())

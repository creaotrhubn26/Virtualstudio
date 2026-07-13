"""
Mesh Cleanup Service — GLB decimation/optimization before caching & serving.

Generated 3D assets (Meshy props, TripoSR meshes, SAM 3D exports) are dense:
100k+ faces and multi-MB payloads for objects that render at a few hundred
pixels. This module shrinks a GLB *in bytes form* so callers can drop it into
their existing pipelines (prop_resolver uploads to R2, casting writes to disk)
without touching provider code.

Two engines, tried in order:

1. `gltf-transform` CLI (node_modules/.bin/gltf-transform, installed as a
   devDependency). Runs weld → simplify → prune with compression explicitly
   DISABLED — plain buffers only, so the browser needs no meshopt/draco
   decoder. Preserves UVs, materials, and skinning attributes, so it's safe
   for textured and rigged content alike.
2. trimesh + fast_simplification quadric decimation (pure Python fallback).
   This path drops UVs/materials on the decimated geometry, so it REFUSES to
   run on textured or skinned GLBs — better to serve a heavy-but-correct
   asset than a light-but-broken one.

If neither engine can safely improve the file, the original bytes come back
unchanged with a `skipped` reason in the stats — callers never need a
try/except to stay safe (clean_glb itself never raises on bad input; it
returns the input with an error note).
"""

from __future__ import annotations

import io
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

GLB_MAGIC = b"glTF"

# Don't bother optimizing small files — the win is negligible and every
# optimization pass is a (small) quality risk. Overridable via env for tests.
MIN_FACES_TO_CLEAN = int(os.environ.get("MESH_CLEANUP_MIN_FACES", "20000"))
MIN_KB_TO_CLEAN = int(os.environ.get("MESH_CLEANUP_MIN_KB", "512"))
# gltf-transform simplify error tolerance (fraction of mesh extent). 0.001 is
# visually lossless for studio props; raise for more aggressive reduction.
SIMPLIFY_ERROR = float(os.environ.get("MESH_CLEANUP_SIMPLIFY_ERROR", "0.001"))
# Fallback decimation target when using trimesh (fraction of faces kept).
TRIMESH_KEEP_RATIO = float(os.environ.get("MESH_CLEANUP_KEEP_RATIO", "0.35"))
CLI_TIMEOUT_SEC = int(os.environ.get("MESH_CLEANUP_CLI_TIMEOUT", "120"))

_REPO_ROOT = Path(__file__).parent.parent


def find_gltf_transform() -> Optional[str]:
    """Locate the repo-local gltf-transform CLI. None when not installed."""
    candidate = _REPO_ROOT / "node_modules" / ".bin" / "gltf-transform"
    if candidate.exists():
        return str(candidate)
    # PATH-installed (e.g. global npm install in a container image).
    found = shutil.which("gltf-transform")
    return found


def analyze_glb(glb_bytes: bytes) -> Dict[str, Any]:
    """Cheap structural stats via pygltflib: face/vertex counts, skinning,
    textures. Returns {"error": ...} instead of raising on malformed input."""
    if not glb_bytes or glb_bytes[:4] != GLB_MAGIC:
        return {"error": "not a GLB (bad magic)", "sizeKb": len(glb_bytes or b"") // 1024}
    try:
        from pygltflib import GLTF2

        gltf = GLTF2.load_from_bytes(glb_bytes)
    except Exception as exc:  # noqa: BLE001 - malformed files are expected input
        return {"error": f"unparseable GLB: {exc}", "sizeKb": len(glb_bytes) // 1024}
    if gltf is None:  # pygltflib returns None (not an exception) on some junk
        return {"error": "unparseable GLB (parser returned nothing)", "sizeKb": len(glb_bytes) // 1024}

    faces = 0
    vertices = 0
    for mesh in gltf.meshes or []:
        for prim in mesh.primitives or []:
            if prim.indices is not None and gltf.accessors:
                faces += (gltf.accessors[prim.indices].count or 0) // 3
            elif prim.attributes and prim.attributes.POSITION is not None:
                faces += (gltf.accessors[prim.attributes.POSITION].count or 0) // 3
            if prim.attributes and prim.attributes.POSITION is not None:
                vertices += gltf.accessors[prim.attributes.POSITION].count or 0

    return {
        "sizeKb": len(glb_bytes) // 1024,
        "meshes": len(gltf.meshes or []),
        "faces": faces,
        "vertices": vertices,
        "hasSkin": bool(gltf.skins),
        "hasTextures": bool(gltf.textures),
        "hasAnimations": bool(gltf.animations),
    }


def _clean_with_gltf_transform(glb_bytes: bytes, simplify_error: float) -> Tuple[Optional[bytes], str]:
    """Run gltf-transform optimize (weld+simplify+prune, no compression).
    Returns (bytes, "") on success, (None, reason) on failure."""
    cli = find_gltf_transform()
    if not cli:
        return None, "gltf-transform CLI not installed"

    with tempfile.TemporaryDirectory(prefix="meshclean_") as tmp:
        src = Path(tmp) / "in.glb"
        dst = Path(tmp) / "out.glb"
        src.write_bytes(glb_bytes)
        cmd = [
            cli, "optimize", str(src), str(dst),
            "--compress", "false",
            "--texture-compress", "false",
            "--simplify", "true",
            "--simplify-error", str(simplify_error),
        ]
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=CLI_TIMEOUT_SEC,
            )
        except subprocess.TimeoutExpired:
            return None, f"gltf-transform timed out after {CLI_TIMEOUT_SEC}s"
        except OSError as exc:
            return None, f"gltf-transform failed to launch: {exc}"
        if proc.returncode != 0 or not dst.exists():
            tail = (proc.stderr or proc.stdout or "").strip()[-300:]
            return None, f"gltf-transform exited {proc.returncode}: {tail}"
        out = dst.read_bytes()

    if out[:4] != GLB_MAGIC:
        return None, "gltf-transform output has bad magic"
    return out, ""


def _clean_with_trimesh(glb_bytes: bytes, keep_ratio: float) -> Tuple[Optional[bytes], str]:
    """Quadric-decimate every geometry in the scene. UV/material-destroying,
    so callers must gate this on hasTextures/hasSkin being False."""
    try:
        import trimesh

        scene = trimesh.load(io.BytesIO(glb_bytes), file_type="glb", force="scene")
    except Exception as exc:  # noqa: BLE001
        return None, f"trimesh could not load GLB: {exc}"

    changed = False
    for name, geom in list(scene.geometry.items()):
        n_faces = len(getattr(geom, "faces", []))
        if n_faces < MIN_FACES_TO_CLEAN:
            continue
        target = max(1000, int(n_faces * keep_ratio))
        try:
            scene.geometry[name] = geom.simplify_quadric_decimation(face_count=target)
            changed = True
        except Exception as exc:  # noqa: BLE001 - keep original geometry on failure
            print(f"[mesh_cleanup] decimation failed for {name}: {exc}")

    if not changed:
        return None, "no geometry above decimation threshold"
    try:
        out = scene.export(file_type="glb")
    except Exception as exc:  # noqa: BLE001
        return None, f"trimesh export failed: {exc}"
    if not out or out[:4] != GLB_MAGIC:
        return None, "trimesh export has bad magic"
    return out, ""


def clean_glb(
    glb_bytes: bytes,
    *,
    simplify_error: float = SIMPLIFY_ERROR,
    keep_ratio: float = TRIMESH_KEEP_RATIO,
    force: bool = False,
) -> Tuple[bytes, Dict[str, Any]]:
    """Optimize a GLB. Never raises and never returns broken bytes: on any
    problem the ORIGINAL bytes come back with stats["skipped"] explaining why.

    `force=True` bypasses the size/face-count thresholds (route param for
    debugging); engine safety gates still apply.
    """
    stats: Dict[str, Any] = {"before": analyze_glb(glb_bytes)}
    before = stats["before"]

    if before.get("error"):
        stats["skipped"] = before["error"]
        return glb_bytes, stats

    if not force and (
        before["faces"] < MIN_FACES_TO_CLEAN and before["sizeKb"] < MIN_KB_TO_CLEAN
    ):
        stats["skipped"] = (
            f"below thresholds ({before['faces']} faces, {before['sizeKb']} kB)"
        )
        return glb_bytes, stats

    cleaned, why_not = _clean_with_gltf_transform(glb_bytes, simplify_error)
    engine = "gltf-transform"
    if cleaned is None:
        stats["gltfTransform"] = why_not
        if before["hasTextures"] or before["hasSkin"]:
            stats["skipped"] = (
                "no safe optimizer: gltf-transform unavailable and the "
                "trimesh fallback would strip textures/skinning"
            )
            return glb_bytes, stats
        cleaned, why_not = _clean_with_trimesh(glb_bytes, keep_ratio)
        engine = "trimesh"
        if cleaned is None:
            stats["skipped"] = why_not
            return glb_bytes, stats

    if len(cleaned) >= len(glb_bytes):
        stats["skipped"] = (
            f"{engine} output not smaller "
            f"({len(cleaned) // 1024} kB >= {len(glb_bytes) // 1024} kB)"
        )
        return glb_bytes, stats

    stats["engine"] = engine
    stats["after"] = analyze_glb(cleaned)
    stats["savedKb"] = (len(glb_bytes) - len(cleaned)) // 1024
    return cleaned, stats


_ENABLED = os.environ.get("MESH_CLEANUP", "on").lower() not in ("off", "0", "false")


def maybe_clean_glb(glb_bytes: bytes) -> Tuple[bytes, Optional[Dict[str, Any]]]:
    """Pipeline hook: no-op passthrough when MESH_CLEANUP=off, otherwise
    threshold-gated clean_glb. Second element is None when nothing happened."""
    if not _ENABLED:
        return glb_bytes, None
    cleaned, stats = clean_glb(glb_bytes)
    if stats.get("skipped"):
        return glb_bytes, None
    return cleaned, stats

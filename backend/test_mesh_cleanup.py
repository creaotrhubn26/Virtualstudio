"""Tests for mesh_cleanup_service — runnable standalone (no pytest needed):

    cd backend && python test_mesh_cleanup.py

Covers: threshold gating, dense-mesh reduction via gltf-transform, the
trimesh fallback, textured/skinned safety refusal, malformed-input safety,
and that output bytes are always a loadable GLB.
"""

from __future__ import annotations

import io
import struct
import sys

import numpy as np
import trimesh

import mesh_cleanup_service as mcs
from mesh_cleanup_service import analyze_glb, clean_glb, find_gltf_transform


def make_glb(subdivisions: int = 5) -> bytes:
    sphere = trimesh.creation.icosphere(subdivisions=subdivisions)
    return trimesh.Scene({"geo": sphere}).export(file_type="glb")


def make_textured_glb() -> bytes:
    """Sphere with a UV-mapped texture so hasTextures=True."""
    from PIL import Image

    sphere = trimesh.creation.icosphere(subdivisions=5)
    # Simple spherical UVs
    v = sphere.vertices
    uv = np.column_stack([
        0.5 + np.arctan2(v[:, 2], v[:, 0]) / (2 * np.pi),
        0.5 + np.arcsin(np.clip(v[:, 1] / np.linalg.norm(v, axis=1), -1, 1)) / np.pi,
    ])
    img = Image.new("RGB", (8, 8), (200, 60, 60))
    sphere.visual = trimesh.visual.TextureVisuals(
        uv=uv, material=trimesh.visual.material.SimpleMaterial(image=img),
    )
    return trimesh.Scene({"geo": sphere}).export(file_type="glb")


def make_skinned_glb() -> bytes:
    """Minimal rigged GLB via the project's own exporter."""
    from mhr_rig_export import export_rigged_glb
    import tempfile
    from pathlib import Path

    sphere = trimesh.creation.icosphere(subdivisions=4)  # ~5k faces
    joints = np.array([[0.0, -0.5, 0.0], [0.0, 0.5, 0.0]], dtype=np.float32)
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "rigged.glb"
        export_rigged_glb(
            np.asarray(sphere.vertices, dtype=np.float32),
            np.asarray(sphere.faces, dtype=np.int64),
            joints,
            str(out),
            parents=np.array([-1, 0], dtype=np.int64),
            joint_names=["root", "spine"],
            idle=False,
            locomotion=False,
        )
        return out.read_bytes()


def faces_of(glb: bytes) -> int:
    scene = trimesh.load(io.BytesIO(glb), file_type="glb", force="scene")
    return sum(len(g.faces) for g in scene.geometry.values())


def main() -> int:
    failures = []

    def check(name: str, cond: bool, detail: str = ""):
        status = "PASS" if cond else "FAIL"
        print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))
        if not cond:
            failures.append(name)

    # --- analyze -----------------------------------------------------------
    dense = make_glb()
    stats = analyze_glb(dense)
    check("analyze: face count", stats["faces"] == 20480, f"got {stats['faces']}")
    check("analyze: no skin/textures", not stats["hasSkin"] and not stats["hasTextures"])
    check("analyze: bad magic handled", "error" in analyze_glb(b"NOPE" + b"\0" * 100))
    check("analyze: empty handled", "error" in analyze_glb(b""))

    # --- threshold gating --------------------------------------------------
    small = make_glb(subdivisions=2)  # 320 faces
    out, s = clean_glb(small)
    check("gating: small file untouched", out == small and "skipped" in s, s.get("skipped", ""))

    # --- main clean path (gltf-transform expected available) ---------------
    cli = find_gltf_transform()
    check("cli: gltf-transform found", cli is not None, str(cli))
    out, s = clean_glb(dense)
    check("clean: output is GLB", out[:4] == b"glTF")
    check("clean: smaller", len(out) < len(dense), f"{len(dense)} -> {len(out)} bytes")
    check("clean: fewer faces", faces_of(out) < 20480, f"faces now {faces_of(out)}")
    check("clean: loadable by trimesh", faces_of(out) > 0)
    check("clean: stats engine set", s.get("engine") in ("gltf-transform", "trimesh"), str(s.get("engine")))

    # --- trimesh fallback (simulate missing CLI) ----------------------------
    orig_find = mcs.find_gltf_transform
    mcs.find_gltf_transform = lambda: None
    try:
        out, s = clean_glb(dense)
        check("fallback: engine is trimesh", s.get("engine") == "trimesh", str(s))
        check("fallback: fewer faces", faces_of(out) < 20480, f"faces now {faces_of(out)}")

        textured = make_textured_glb()
        out, s = clean_glb(textured, force=True)
        check(
            "fallback: refuses textured (no CLI)",
            out == textured and "skipped" in s,
            s.get("skipped", ""),
        )

        skinned = make_skinned_glb()
        out, s = clean_glb(skinned, force=True)
        check(
            "fallback: refuses skinned (no CLI)",
            out == skinned and "skipped" in s,
            s.get("skipped", ""),
        )
    finally:
        mcs.find_gltf_transform = orig_find

    # --- skinned via gltf-transform: must stay rigged ------------------------
    skinned = make_skinned_glb()
    out, s = clean_glb(skinned, force=True)
    if s.get("engine"):  # only assert when the CLI actually ran
        from pygltflib import GLTF2

        gltf = GLTF2.load_from_bytes(out)
        check("skinned: skin survives optimization", bool(gltf.skins), f"skins={gltf.skins}")
    check("skinned: output valid", out[:4] == b"glTF")

    # --- malformed input never raises ----------------------------------------
    out, s = clean_glb(b"glTF" + b"\0" * 50)
    check("garbage GLB: returns input", out == b"glTF" + b"\0" * 50 and "skipped" in s)

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all mesh_cleanup tests passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

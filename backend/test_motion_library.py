"""Tests for motion_library_service — standalone:

    cd backend && python test_motion_library.py

Covers: catalog loading from the real folder (manifest + bare-file
registration), action- and keyword-matching (incl. Norwegian keywords and
word-boundary safety), retargeting + caching, add_clip validation/roundtrip
in an isolated dir, and tier ordering inside text_to_motion_service.
"""

from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

import numpy as np

MHR_TARGET = [
    "pelvis", "spine", "neck", "head",
    "left_shoulder", "left_elbow", "left_wrist",
    "right_shoulder", "right_elbow", "right_wrist",
    "left_hip", "left_knee", "left_ankle",
    "right_hip", "right_knee", "right_ankle",
]

TINY_BVH = """HIERARCHY
ROOT Hips
{
  OFFSET 0 0 0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Head
  {
    OFFSET 0 10 0
    CHANNELS 3 Zrotation Xrotation Yrotation
    End Site
    {
      OFFSET 0 5 0
    }
  }
}
MOTION
Frames: 2
Frame Time: 0.041667
0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 45 0
"""


def main() -> int:
    failures = []

    def check(name, cond, detail=""):
        print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
        if not cond:
            failures.append(name)

    from motion_library_service import MotionLibraryService, get_motion_library_service

    # --- catalog from the real shipped library ------------------------------
    svc = get_motion_library_service()
    clips = svc.clips()
    check("catalog: shipped clips present",
          {"walk", "run", "wave", "sit", "jump", "dance", "talk_gesture"} <= set(clips),
          str(sorted(clips)))
    check("catalog: walk loops", clips["walk"].loop is True)
    check("catalog: wave is one-shot", clips["wave"].loop is False)

    # --- matching -------------------------------------------------------------
    check("match: action walk", svc.match("gå en tur", action="walk").name == "walk")
    check("match: keyword dans (norsk)", svc.match("hun begynner å danse", action=None) is not None
          and svc.match("dans!", action=None).name == "dance")
    check("match: keyword wave", svc.match("vink til kamera", action=None).name == "wave")
    check("match: no false hit on brunch", svc.match("brunch time", action=None) is None,
          str(svc.match("brunch time", action=None)))
    check("match: nothing for nonsense", svc.match("qwertyuiop", action=None) is None)

    # --- retarget + generate ---------------------------------------------------
    clip = svc.generate("walk forward", MHR_TARGET, action="walk")
    check("generate: tier library", clip is not None and clip["tier"] == "library")
    check("generate: real duration", clip["duration"] > 1.0, f"{clip['duration']:.2f}s")
    check("generate: fps 30 (downsampled CMU)", clip["fps"] == 30, str(clip["fps"]))
    check("generate: hips+knees animated",
          "left_hip" in clip["tracks"] and "left_knee" in clip["tracks"],
          str(sorted(clip["tracks"]))[:120])
    check("generate: loop flag carried", clip["loop"] is True)
    frames = len(clip["tracks"]["left_hip"])
    check("generate: motion is not static",
          any(abs(a - b) > 1e-4
              for a, b in zip(clip["tracks"]["left_hip"][0], clip["tracks"]["left_hip"][frames // 2])))

    t0 = time.monotonic()
    svc.generate("walk forward", MHR_TARGET, action="walk")
    check("generate: cached second call fast", (time.monotonic() - t0) < 0.05,
          f"{(time.monotonic() - t0) * 1000:.1f}ms")
    check("generate: unknown prompt → None", svc.generate("qwertyuiop", MHR_TARGET) is None)

    # --- add_clip in isolated dir ----------------------------------------------
    with tempfile.TemporaryDirectory() as tmp:
        iso = MotionLibraryService(library_dir=Path(tmp))
        check("upload: empty library", iso.clips() == {})
        res = iso.add_clip("Head Nod!", TINY_BVH, keywords=["nod slowly"], loop=True)
        check("upload: accepted", res.get("success") is True, str(res))
        check("upload: name sanitized", res["clip"]["name"] == "head_nod")
        check("upload: registered", "head_nod" in iso.clips(refresh=True))
        gen = iso.generate("nod slowly please", ["pelvis", "head"])
        check("upload: generates", gen is not None and gen["tier"] == "library")
        check("upload: head track present", "head" in gen["tracks"], str(gen and sorted(gen["tracks"])))
        bad = iso.add_clip("junk", "this is not bvh")
        check("upload: rejects non-BVH", bad.get("success") is False and "BVH" in bad["error"])
        bad = iso.add_clip("", TINY_BVH)
        check("upload: rejects empty name", bad.get("success") is False)

    # --- tier ordering in text_to_motion_service --------------------------------
    from text_to_motion_service import TextToMotionService

    tts = TextToMotionService()
    check("tier: library wired", tts._library is not None)

    clip = tts.generate("walk", joint_names=MHR_TARGET, parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    check("tier: simple prompt hits library (no deepmotion)", clip["tier"] == "library", clip["tier"])

    clip = tts.generate("total gibberish xyzzy", joint_names=MHR_TARGET,
                        parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    check("tier: nonsense falls to procedural", clip["tier"] == "procedural", clip["tier"])

    # With DeepMotion "enabled" but failing, a nuanced walk prompt should
    # STILL end up with library mocap via the post-neural fallback.
    class FakeDM:
        enabled = True

        def generate(self, prompt, **kw):
            return {"success": False, "error": "simulated outage"}

    tts._deepmotion = FakeDM()
    clip = tts.generate("walk sadly like a very old man", joint_names=MHR_TARGET,
                        parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    check("tier: nuanced prompt falls back to library on DM outage",
          clip["tier"] == "library", clip["tier"])

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all motion_library tests passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

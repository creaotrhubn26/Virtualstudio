"""Tests for bvh_retarget + deepmotion_motion_service — standalone:

    cd backend && python test_deepmotion_motion.py

Covers: BVH parsing (hierarchy, channels, motion data, malformed input),
Euler→quaternion math, source-joint role classification (incl. the
LeftShoulder-vs-LeftArm and LeftHand-vs-LeftHandIndex1 pitfalls), retarget
onto MHR-70 names, the full mocked DeepMotion API flow (auth→submit→poll→
download→fetch), its failure modes, and tier integration in
text_to_motion_service.
"""

from __future__ import annotations

import json
import math
import sys

import httpx
import numpy as np

# A Mixamo-style rig: the naming convention DeepMotion's BVH exports use.
# Two frames: identity rest, then Head pitched 90° about X and LeftArm 90°
# about Z. Root has 6 channels (translation+rotation), everything else 3.
SYNTH_BVH = """HIERARCHY
ROOT Hips
{
  OFFSET 0.0 0.0 0.0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine
  {
    OFFSET 0.0 10.0 0.0
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT Neck
    {
      OFFSET 0.0 10.0 0.0
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT Head
      {
        OFFSET 0.0 5.0 0.0
        CHANNELS 3 Zrotation Xrotation Yrotation
        End Site
        {
          OFFSET 0.0 5.0 0.0
        }
      }
    }
    JOINT LeftShoulder
    {
      OFFSET 2.0 8.0 0.0
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT LeftArm
      {
        OFFSET 5.0 0.0 0.0
        CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT LeftForeArm
        {
          OFFSET 10.0 0.0 0.0
          CHANNELS 3 Zrotation Xrotation Yrotation
          JOINT LeftHand
          {
            OFFSET 8.0 0.0 0.0
            CHANNELS 3 Zrotation Xrotation Yrotation
            JOINT LeftHandIndex1
            {
              OFFSET 3.0 0.0 0.0
              CHANNELS 3 Zrotation Xrotation Yrotation
              End Site
              {
                OFFSET 2.0 0.0 0.0
              }
            }
          }
        }
      }
    }
  }
  JOINT LeftUpLeg
  {
    OFFSET 3.0 -2.0 0.0
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT LeftLeg
    {
      OFFSET 0.0 -15.0 0.0
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT LeftFoot
      {
        OFFSET 0.0 -15.0 0.0
        CHANNELS 3 Zrotation Xrotation Yrotation
        End Site
        {
          OFFSET 0.0 -3.0 0.0
        }
      }
    }
  }
}
MOTION
Frames: 2
Frame Time: 0.033333
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 90 0 0 0 0 90 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
"""

MHR_TARGET = [
    "pelvis", "spine", "neck", "head",
    "left_shoulder", "left_elbow", "left_wrist",
    "left_hip", "left_knee", "left_ankle",
]


def approx(a, b, tol=1e-5):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def make_mock_transport(bvh_body: str, *, fail_status: bool = False, poll_progress_times: int = 1):
    """MockTransport simulating the full SayMotion API."""
    state = {"polls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/account/v1/auth":
            assert request.headers.get("authorization", "").startswith("Basic ")
            return httpx.Response(200, json={"ok": True}, headers={"set-cookie": "dmsess=abc123; Path=/"})
        if path == "/job/v1/process/text2motion":
            body = json.loads(request.content)
            assert any(p.startswith("prompt=") for p in body["params"]), body
            assert "dmsess=abc123" in request.headers.get("cookie", "")
            return httpx.Response(200, json={"rid": "rid-42"})
        if path == "/job/v1/status/rid-42":
            state["polls"] += 1
            if fail_status:
                return httpx.Response(200, json={"count": 1, "status": [
                    {"rid": "rid-42", "status": "FAILURE", "details": {"exc_message": "boom"}}]})
            if state["polls"] <= poll_progress_times:
                return httpx.Response(200, json={"count": 1, "status": [
                    {"rid": "rid-42", "status": "PROGRESS", "details": {"step": 1, "total": 3}}]})
            return httpx.Response(200, json={"count": 1, "status": [
                {"rid": "rid-42", "status": "SUCCESS"}]})
        if path == "/job/v1/download/rid-42":
            return httpx.Response(200, json={"count": 1, "links": [{
                "rid": "rid-42",
                "urls": [{"name": "anim", "files": [
                    {"bvh": "https://cdn.example.com/anim.bvh"},
                    {"glb": "https://cdn.example.com/anim.glb"},
                ]}],
            }]})
        if request.url.host == "cdn.example.com" and path == "/anim.bvh":
            return httpx.Response(200, text=bvh_body)
        return httpx.Response(404, text=f"unexpected: {request.url}")

    return httpx.MockTransport(handler)


def main() -> int:
    failures = []

    def check(name, cond, detail=""):
        print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
        if not cond:
            failures.append(name)

    from bvh_retarget import (
        BvhParseError, bvh_to_tracks, classify_source_joints, parse_bvh,
    )

    # --- parser ------------------------------------------------------------
    data = parse_bvh(SYNTH_BVH)
    check("parse: joint count", len(data.joints) == 12, f"got {len(data.joints)}")
    check("parse: names", data.names[0] == "Hips" and "LeftHandIndex1" in data.names)
    check("parse: root parent", data.joints[0].parent == -1)
    spine_idx = data.names.index("Spine")
    check("parse: hierarchy", data.joints[spine_idx].parent == 0)
    check("parse: channels", data.joints[0].channels[3] == "Zrotation")
    check("parse: frames shape", data.frames.shape == (2, 39), str(data.frames.shape))
    check("parse: fps", data.fps == 30, str(data.fps))
    for bad in ("", "HIERARCHY", "HIERARCHY ROOT x { OFFSET 0 0 0 }", SYNTH_BVH[:400]):
        try:
            parse_bvh(bad)
            check(f"parse: rejects malformed ({bad[:20]!r}...)", False)
        except BvhParseError:
            check(f"parse: rejects malformed ({bad[:20]!r}...)", True)

    # --- source classification ----------------------------------------------
    roles = classify_source_joints(data.names)
    check("classify: pelvis=Hips", data.names[roles["pelvis"]] == "Hips")
    check("classify: shoulder prefers LeftArm over LeftShoulder",
          data.names[roles["left_shoulder"]] == "LeftArm",
          data.names[roles["left_shoulder"]])
    check("classify: wrist prefers LeftHand over LeftHandIndex1",
          data.names[roles["left_wrist"]] == "LeftHand",
          data.names[roles["left_wrist"]])
    check("classify: spine exact over Spine1-style", data.names[roles["spine"]] == "Spine")
    check("classify: ankle", data.names[roles["left_ankle"]] == "LeftFoot")

    # --- retarget ------------------------------------------------------------
    tracks, fps = bvh_to_tracks(SYNTH_BVH, MHR_TARGET)
    check("retarget: fps", fps == 30)
    check("retarget: maps head/shoulder/wrist/ankle",
          all(k in tracks for k in ("head", "left_shoulder", "left_wrist", "left_ankle")),
          str(sorted(tracks)))
    check("retarget: frame count", all(len(v) == 2 for v in tracks.values()))
    check("retarget: rest frame is identity", approx(tracks["head"][0], [0, 0, 0, 1]))
    s = math.sin(math.pi / 4)
    c = math.cos(math.pi / 4)
    check("retarget: head 90° X rotation", approx(tracks["head"][1], [s, 0, 0, c]),
          str(tracks["head"][1]))
    check("retarget: shoulder 90° Z rotation", approx(tracks["left_shoulder"][1], [0, 0, s, c]),
          str(tracks["left_shoulder"][1]))
    check("retarget: unit quaternions",
          all(abs(sum(q * q for q in quat) - 1.0) < 1e-6
              for track in tracks.values() for quat in track))
    empty_tracks, _ = bvh_to_tracks(SYNTH_BVH, ["totally", "unrelated", "bones"])
    check("retarget: unmappable target → empty", empty_tracks == {})

    # --- DeepMotion service (mocked transport) --------------------------------
    import deepmotion_motion_service as dms

    svc = dms.DeepMotionService()
    svc.client_id, svc.client_secret, svc.host = "id", "secret", "https://api.dm.example"
    dms.POLL_INTERVAL_SEC = 0.01  # fast polling in tests

    result = svc.generate("wave enthusiastically", transport=make_mock_transport(SYNTH_BVH))
    check("api: success", result.get("success") is True, str(result.get("error")))
    check("api: bvh returned", "HIERARCHY" in result.get("bvhText", ""))
    check("api: rid", result.get("rid") == "rid-42")
    check("api: format urls", result.get("formatUrls", {}).get("glb", "").endswith(".glb"))

    result = svc.generate("x", transport=make_mock_transport(SYNTH_BVH, fail_status=True))
    check("api: FAILURE handled", result.get("success") is False and "failed" in result["error"], result.get("error"))

    result = svc.generate("x", transport=make_mock_transport("not a bvh at all"))
    check("api: non-BVH rejected", result.get("success") is False and "not BVH" in result["error"], result.get("error"))

    disabled = dms.DeepMotionService()
    disabled.client_id = disabled.client_secret = disabled.host = ""
    check("api: disabled without env", disabled.generate("x").get("success") is False)

    # --- tier integration in text_to_motion_service ---------------------------
    from text_to_motion_service import TextToMotionService

    tts = TextToMotionService()
    tts._deepmotion = svc

    class _Patched(dms.DeepMotionService):
        pass

    ok_transport = make_mock_transport(SYNTH_BVH)
    orig_generate = svc.generate
    svc.generate = lambda prompt, **kw: orig_generate(prompt, transport=ok_transport, **{k: v for k, v in kw.items() if k != "transport"})

    clip = tts.generate("do a big wave", joint_names=MHR_TARGET, parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    check("tier: deepmotion clip", clip.get("tier") == "deepmotion", str(clip.get("tier")))
    check("tier: tracks present", bool(clip.get("tracks")))
    check("tier: duration", abs(clip["duration"] - 1 / 30) < 1e-6, str(clip["duration"]))

    svc.generate = lambda prompt, **kw: {"success": False, "error": "simulated outage"}
    clip = tts.generate("walk forward", joint_names=MHR_TARGET, parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    # With the motion library wired in, a DeepMotion outage on a walk prompt
    # degrades to library mocap (better) — procedural is only the last resort.
    check("tier: falls back below deepmotion on outage",
          clip.get("tier") in ("library", "procedural"), str(clip.get("tier")))
    tts._library = None
    clip = tts.generate("walk forward", joint_names=MHR_TARGET, parents=np.zeros(len(MHR_TARGET), dtype=np.int64))
    check("tier: procedural is last resort (no library)", clip.get("tier") == "procedural", str(clip.get("tier")))

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all deepmotion/bvh tests passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

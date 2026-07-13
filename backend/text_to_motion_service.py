"""
Text-to-motion service — turn a natural-language prompt into an animation clip
for a SAM 3D / MHR-rigged avatar in Virtual Studio.

Output is a runtime-friendly clip: per-joint quaternion tracks keyed by joint
NAME, so the browser can apply it to any rig whose bones share MHR names
(SAM 3D avatars do). The same format is what a neural model would emit after
retargeting, so the frontend bridge is model-agnostic.

Resolver chain (mirrors prop_resolver_service / meshy_service tiers)
-------------------------------------------------------------------
  Tier 0: the motion library — real mocap BVH clips (CMU) matched by
    keyword and retargeted onto the rig. Free and instant, so it goes first
    for SIMPLE prompts ("walk", "dans"); nuanced prompts ("walk sadly like
    an old man") skip ahead to DeepMotion when that's configured, since a
    generic walk cycle would discard the nuance.
  Tier 1a: DeepMotion SayMotion (hosted text-to-motion). Configured via
    DEEPMOTION_CLIENT_ID / DEEPMOTION_CLIENT_SECRET / DEEPMOTION_API_HOST;
    returns BVH which bvh_retarget maps onto the target rig's joint names.
  Tier 1b: a generic neural endpoint (MoMask / MDM / T2M-GPT behind
    TEXT_TO_MOTION_ENDPOINT) that returns SMPL axis-angle poses, retargeted
    via smpl_poses_to_tracks. Requires TEXT_TO_MOTION_NEURAL=1.
  Tier 1c: the motion library again — catches DeepMotion/endpoint outages
    with mocap before degrading further.
  Tier 2: a procedural vocabulary (walk/run/idle/wave/jump/sit/turn/
    nod/shake) selected by keyword. Self-contained, no model, always available.

`generate()` walks the tiers top-down; every failure falls through silently
to the next tier, so a vendor outage degrades quality, never availability.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

import numpy as np

from mhr_rig_export import (
    dialogue_to_gesture,
    load_mhr70_hierarchy,
    make_action_animation,
    make_talking_animation,
    smpl_poses_to_tracks,
    text_to_action,
    tracks_by_joint_name,
)

# One-shot vs looping clips (locomotion/idle loop; gestures play once).
_LOOPING = {"walk", "run", "idle"}

_MHR70_PATH = str(
    Path(__file__).parent / "sam3d_repo" / "sam_3d_body" / "metadata" / "mhr70.py"
)


class TextToMotionService:
    def __init__(self) -> None:
        # Neural tier is opt-in; requires a model/endpoint to be configured.
        self.neural_enabled = os.environ.get("TEXT_TO_MOTION_NEURAL", "").lower() in (
            "1",
            "true",
            "yes",
        )
        # HTTP endpoint of a text-to-motion model that returns SMPL axis-angle
        # poses (e.g. a MoMask / MDM server, or a Replicate proxy). Expected JSON:
        #   { "poses": [[ [x,y,z], ...24 ], ...frames], "fps": 20 }
        self.neural_endpoint = os.environ.get("TEXT_TO_MOTION_ENDPOINT", "").strip()
        # DeepMotion SayMotion — preferred neural tier when configured
        # (enabled purely by its own env vars, no extra flag needed).
        try:
            from deepmotion_motion_service import get_deepmotion_service

            self._deepmotion = get_deepmotion_service()
        except Exception:  # noqa: BLE001 - service module optional
            self._deepmotion = None
        try:
            from motion_library_service import get_motion_library_service

            self._library = get_motion_library_service()
        except Exception:  # noqa: BLE001 - service module optional
            self._library = None
        self._names: Optional[Sequence[str]] = None
        self._parents: Optional[np.ndarray] = None

    def _default_skeleton(self):
        if self._names is None:
            names, parents = load_mhr70_hierarchy(_MHR70_PATH)
            self._names, self._parents = names, parents
        return self._names, self._parents

    def _deepmotion_generate(
        self, prompt: str, joint_names: Sequence[str]
    ) -> Optional[Dict[str, Any]]:
        """Tier 1a: DeepMotion SayMotion → BVH → retargeted quaternion tracks.
        Returns None on any failure so `generate` falls through."""
        if not self._deepmotion or not self._deepmotion.enabled:
            return None
        try:
            result = self._deepmotion.generate(prompt)
            if not result.get("success"):
                print(f"[text_to_motion] DeepMotion tier failed: {result.get('error')}")
                return None

            from bvh_retarget import bvh_to_tracks

            tracks, bvh_fps = bvh_to_tracks(result["bvhText"], joint_names)
            if not tracks:
                print("[text_to_motion] DeepMotion BVH mapped 0 joints onto target rig")
                return None
            frames = len(next(iter(tracks.values())))
            return {
                "prompt": prompt,
                "action": "neural",
                "fps": bvh_fps,
                "duration": max(0.0, (frames - 1) / bvh_fps),
                "loop": False,
                "tracks": tracks,
                "tier": "deepmotion",
            }
        except Exception as e:  # noqa: BLE001 - any failure → next tier
            print(f"[text_to_motion] DeepMotion tier failed, falling back: {e}")
            return None

    def _neural_generate(
        self, prompt: str, joint_names: Sequence[str], fps: int
    ) -> Optional[Dict[str, Any]]:
        """Tier 1: call a text-to-motion model that returns SMPL axis-angle poses
        and retarget them onto the MHR joint names. The model (MoMask/MDM/T2M-GPT)
        runs behind `TEXT_TO_MOTION_ENDPOINT`; this keeps GPU/weights out of the
        API process. Returns None on any failure so `generate` falls back."""
        if not self.neural_endpoint:
            return None
        try:
            import httpx

            resp = httpx.post(
                self.neural_endpoint,
                json={"prompt": prompt, "fps": fps},
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()
            poses = data.get("poses")
            if not poses:
                return None
            out_fps = int(data.get("fps", fps)) or fps
            tracks = smpl_poses_to_tracks(np.asarray(poses, dtype=np.float32), joint_names)
            if not tracks:
                return None
            frames = len(next(iter(tracks.values())))
            return {
                "prompt": prompt,
                "action": "neural",
                "fps": out_fps,
                "duration": max(0.0, (frames - 1) / out_fps),
                "loop": False,
                "tracks": tracks,
                "tier": "neural",
            }
        except Exception as e:  # noqa: BLE001 - any failure → procedural fallback
            print(f"[text_to_motion] neural tier failed, falling back: {e}")
            return None

    def generate(
        self,
        prompt: str,
        joint_names: Optional[Sequence[str]] = None,
        parents: Optional[np.ndarray] = None,
        fps: int = 24,
    ) -> Dict[str, Any]:
        """Return a clip: {prompt, action, fps, duration, loop, tracks}.

        `tracks` maps joint name -> list of [x, y, z, w] quaternions, one per
        frame. `duration = (frames - 1) / fps`.
        """
        if joint_names is None or parents is None:
            joint_names, parents = self._default_skeleton()
        if joint_names is None:
            return {"prompt": prompt, "action": "idle", "fps": fps,
                    "duration": 0.0, "loop": True, "tracks": {}, "error": "no skeleton"}

        action = text_to_action(prompt)

        # Tier 0: mocap library first for simple prompts (or whenever
        # DeepMotion isn't configured) — free, instant, real motion.
        deepmotion_ready = bool(self._deepmotion and self._deepmotion.enabled)
        simple_prompt = len((prompt or "").split()) <= 3
        if self._library and (simple_prompt or not deepmotion_ready):
            library = self._library.generate(prompt, joint_names, action=action)
            if library:
                return library

        deepmotion = self._deepmotion_generate(prompt, joint_names)
        if deepmotion:
            return deepmotion

        if self.neural_enabled:
            neural = self._neural_generate(prompt, joint_names, fps)
            if neural:
                return neural

        # Tier 1c: library as post-neural fallback — mocap beats sine waves
        # even when the prompt was nuanced enough to prefer DeepMotion.
        if self._library:
            library = self._library.generate(prompt, joint_names, action=action)
            if library:
                return library
        anim, times = make_action_animation(action, np.asarray(parents), joint_names, fps=fps)
        tracks = tracks_by_joint_name(anim, joint_names)
        duration = float(times[-1]) if len(times) else 0.0
        return {
            "prompt": prompt,
            "action": action,
            "fps": fps,
            "duration": duration,
            "loop": action in _LOOPING,
            "tracks": tracks,
            "tier": "procedural",
        }


    def generate_dialogue(
        self,
        text: str,
        joint_names: Optional[Sequence[str]] = None,
        parents: Optional[np.ndarray] = None,
        fps: int = 24,
        duration_sec: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Turn a spoken line into a talking-head clip with a co-speech gesture.

        `duration_sec`, when given, pins the clip to that exact length — pass the
        real audio duration once TTS is wired up so head motion matches the actual
        voice line instead of the word-count estimate. Neck 'talking' motion plays
        over the whole line; a detected gesture (wave/nod/shake) is overlaid on its
        own joints. Note: MHR-70 has no facial blendshapes, so this is head/neck +
        gesture, not viseme lipsync (that needs MHR face export)."""
        if joint_names is None or parents is None:
            joint_names, parents = self._default_skeleton()
        if joint_names is None:
            return {"prompt": text, "action": "talk", "fps": fps,
                    "duration": 0.0, "loop": False, "tracks": {}, "error": "no skeleton"}

        if duration_sec is not None:
            duration = float(min(30.0, max(0.3, duration_sec)))
        else:
            words = max(1, len((text or "").split()))
            duration = float(min(8.0, max(1.2, words * 0.38)))
        parents = np.asarray(parents)

        talk_anim, times = make_talking_animation(parents, joint_names, duration=duration, fps=fps)
        tracks = tracks_by_joint_name(talk_anim, joint_names)

        gesture = dialogue_to_gesture(text)
        if gesture:
            g_anim, _ = make_action_animation(gesture, parents, joint_names, fps=fps)
            g_tracks = tracks_by_joint_name(g_anim, joint_names)
            # Overlay gesture joints; pad/trim to the talk-clip frame count.
            n = len(times)
            for name, quats in g_tracks.items():
                q = list(quats)
                if len(q) < n:
                    q = q + [q[-1]] * (n - len(q))
                tracks[name] = q[:n]

        return {
            "prompt": text,
            "action": f"talk+{gesture}" if gesture else "talk",
            "fps": fps,
            "duration": float(times[-1]) if len(times) else 0.0,
            "loop": False,
            "tracks": tracks,
            "gesture": gesture or None,
            "tier": "procedural",
        }


text_to_motion_service = TextToMotionService()

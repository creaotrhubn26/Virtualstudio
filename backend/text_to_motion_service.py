"""
Text-to-motion service — turn a natural-language prompt into an animation clip
for a SAM 3D / MHR-rigged avatar in Virtual Studio.

Output is a runtime-friendly clip: per-joint quaternion tracks keyed by joint
NAME, so the browser can apply it to any rig whose bones share MHR names
(SAM 3D avatars do). The same format is what a neural model would emit after
retargeting, so the frontend bridge is model-agnostic.

Resolver chain (mirrors prop_resolver_service / meshy_service tiers)
-------------------------------------------------------------------
  Tier 1 (future): a neural text-to-motion model — MoMask / MDM / T2M-GPT —
    generates SMPL-X motion from arbitrary text, which we retarget onto the MHR
    skeleton. Needs GPU + weights (or a hosted API), so it lives behind
    `_neural_generate` and is off by default.
  Tier 2 (now): a procedural vocabulary (walk/run/idle/wave/jump/sit/turn/
    nod/shake) selected by keyword. Self-contained, no model, always available.

`generate()` tries the neural tier when enabled and falls back to procedural.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

import numpy as np

from mhr_rig_export import (
    load_mhr70_hierarchy,
    make_action_animation,
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
        self._names: Optional[Sequence[str]] = None
        self._parents: Optional[np.ndarray] = None

    def _default_skeleton(self):
        if self._names is None:
            names, parents = load_mhr70_hierarchy(_MHR70_PATH)
            self._names, self._parents = names, parents
        return self._names, self._parents

    def _neural_generate(
        self, prompt: str, joint_names: Sequence[str], fps: int
    ) -> Optional[Dict[str, Any]]:
        """Tier 1 seam. Plug a MoMask/MDM model (or hosted API) here: generate
        SMPL-X motion from `prompt`, retarget to the MHR joint names, and return
        the same clip dict shape as `generate`. Returns None when unavailable."""
        # Intentionally not implemented in-repo: needs GPU/weights or an API key.
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

        if self.neural_enabled:
            neural = self._neural_generate(prompt, joint_names, fps)
            if neural:
                return neural

        action = text_to_action(prompt)
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


text_to_motion_service = TextToMotionService()

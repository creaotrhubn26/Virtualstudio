"""
BVH → Virtual Studio motion-clip retargeting.

DeepMotion (and most mocap/text-to-motion vendors) deliver animation as BVH:
a joint hierarchy plus per-frame Euler rotations. Virtual Studio's runtime
clip format is per-joint QUATERNION tracks keyed by the TARGET rig's joint
names — the same shape text_to_motion_service produces procedurally and
main.ts's applyMotionClip consumes.

This module bridges the two:

    tracks, fps = bvh_to_tracks(bvh_text, target_joint_names)

Mapping is convention-agnostic: each source joint is classified into a
canonical body role (pelvis, spine, left_elbow, ...) using the shared
ROLE_ALIASES table from mhr_rig_export, then the same table finds the role's
joint in the target skeleton. Joints that don't map (fingers, toes, vendor
extras) are skipped — a partial mapping still animates the major limbs.

This is direct local-rotation retargeting: it assumes source and target rigs
share an upright rest orientation (both T/A-pose, Y-up), which holds for
DeepMotion's rigs and SAM 3D / MHR exports. It does not attempt rest-pose
difference compensation.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from mhr_rig_export import ROLE_ALIASES, _normalize_joint_name, find_joint_by_role

# Source-side alias priority overrides. In ROLE_ALIASES the *target*-side
# order lists "leftshoulder" before "leftarm" (fine for finding a target
# bone), but on the *source* side a Mixamo-style rig has BOTH LeftShoulder
# (clavicle — nearly static) and LeftArm (the actual swinging upper arm).
# Copying the clavicle onto the target's shoulder would freeze the arm, so
# for source classification the upper-arm names must win.
_SOURCE_ALIAS_OVERRIDES: Dict[str, Sequence[str]] = {
    "left_shoulder": ("leftupperarm", "leftarm", "upperarml", "lupperarm", "larm", "leftshoulder", "shoulderl", "lshoulder", "claviclel", "lclavicle"),
    "right_shoulder": ("rightupperarm", "rightarm", "upperarmr", "rupperarm", "rarm", "rightshoulder", "shoulderr", "rshoulder", "clavicler", "rclavicle"),
}


def _source_aliases(role: str) -> Sequence[str]:
    return _SOURCE_ALIAS_OVERRIDES.get(role, ROLE_ALIASES.get(role, ()))


@dataclass
class BvhJoint:
    name: str
    parent: int  # index into BvhData.joints, -1 for root
    offset: Tuple[float, float, float]
    channels: List[str]        # e.g. ["Zrotation", "Xrotation", "Yrotation"]
    channel_start: int         # column offset of this joint's first channel


@dataclass
class BvhData:
    joints: List[BvhJoint]
    frames: np.ndarray         # (n_frames, n_channels) floats
    frame_time: float          # seconds per frame

    @property
    def names(self) -> List[str]:
        return [j.name for j in self.joints]

    @property
    def fps(self) -> int:
        return max(1, int(round(1.0 / self.frame_time))) if self.frame_time > 0 else 30


class BvhParseError(ValueError):
    pass


def parse_bvh(text: str) -> BvhData:
    """Parse a BVH file's text. Raises BvhParseError on malformed input."""
    tokens = re.findall(r"[^\s{}]+|[{}]", text)
    if not tokens:
        raise BvhParseError("empty BVH")
    pos = 0

    def peek() -> Optional[str]:
        return tokens[pos] if pos < len(tokens) else None

    def take(expected: Optional[str] = None) -> str:
        nonlocal pos
        if pos >= len(tokens):
            raise BvhParseError(f"unexpected end of file (wanted {expected or 'token'})")
        tok = tokens[pos]
        pos += 1
        if expected is not None and tok.upper() != expected.upper():
            raise BvhParseError(f"expected {expected!r}, got {tok!r}")
        return tok

    take("HIERARCHY")

    joints: List[BvhJoint] = []
    channel_count = 0

    def parse_joint(parent: int) -> None:
        nonlocal channel_count
        kind = take()  # ROOT or JOINT (validated by caller's peek)
        name = take()
        take("{")
        take("OFFSET")
        offset = (float(take()), float(take()), float(take()))
        chans: List[str] = []
        if peek() and peek().upper() == "CHANNELS":
            take("CHANNELS")
            n = int(take())
            chans = [take() for _ in range(n)]
        joint = BvhJoint(
            name=name, parent=parent, offset=offset,
            channels=chans, channel_start=channel_count,
        )
        channel_count += len(chans)
        joints.append(joint)
        my_index = len(joints) - 1

        while True:
            nxt = peek()
            if nxt is None:
                raise BvhParseError(f"unclosed joint {name!r}")
            up = nxt.upper()
            if up == "JOINT":
                parse_joint(my_index)
            elif up == "END":
                take()  # End
                take()  # Site
                take("{")
                take("OFFSET")
                take(); take(); take()
                take("}")
            elif nxt == "}":
                take("}")
                return
            else:
                raise BvhParseError(f"unexpected token {nxt!r} inside joint {name!r}")

    if not peek() or peek().upper() != "ROOT":
        raise BvhParseError("missing ROOT joint")
    parse_joint(-1)

    take("MOTION")
    take("Frames:")
    n_frames = int(take())
    # "Frame Time:" tokenizes as two tokens
    take("Frame")
    take("Time:")
    frame_time = float(take())

    values = tokens[pos:]
    expected = n_frames * channel_count
    if len(values) < expected:
        raise BvhParseError(
            f"motion data truncated: expected {expected} values, got {len(values)}"
        )
    frames = np.asarray(values[:expected], dtype=np.float64).reshape(
        n_frames, channel_count
    )
    return BvhData(joints=joints, frames=frames, frame_time=frame_time)


# ---- Euler → quaternion ---------------------------------------------------

def _axis_quat(axis: str, degrees: float) -> np.ndarray:
    """Unit quaternion [x, y, z, w] for a rotation about a principal axis."""
    half = math.radians(degrees) / 2.0
    s, c = math.sin(half), math.cos(half)
    if axis == "X":
        return np.array([s, 0.0, 0.0, c])
    if axis == "Y":
        return np.array([0.0, s, 0.0, c])
    if axis == "Z":
        return np.array([0.0, 0.0, s, c])
    raise BvhParseError(f"unknown rotation axis {axis!r}")


def _quat_mul(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Hamilton product, [x, y, z, w] convention."""
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array([
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ])


def joint_rotation_quat(joint: BvhJoint, frame_values: np.ndarray) -> np.ndarray:
    """Local rotation quaternion for one joint in one frame.

    BVH applies rotation channels in the order they're declared, each about
    the joint's local axis — composing left-to-right in declaration order.
    """
    q = np.array([0.0, 0.0, 0.0, 1.0])
    for i, chan in enumerate(joint.channels):
        upper = chan.upper()
        if not upper.endswith("ROTATION"):
            continue
        axis = upper[0]
        q = _quat_mul(q, _axis_quat(axis, float(frame_values[joint.channel_start + i])))
    return q


# ---- role mapping -----------------------------------------------------------

def classify_source_joints(names: Sequence[str]) -> Dict[str, int]:
    """Map canonical role → index of the best-matching SOURCE joint.

    Exact normalized-name matches beat substring matches (so LeftHand wins
    over LeftHandIndex1); among equal match quality, the earlier alias in the
    priority list wins, then the shorter name.
    """
    normalized = [_normalize_joint_name(n) for n in names]
    result: Dict[str, int] = {}
    for role in ROLE_ALIASES:
        best: Optional[Tuple[int, int, int, int]] = None  # sort key
        best_idx: Optional[int] = None
        for alias_rank, alias in enumerate(_source_aliases(role)):
            for idx, norm in enumerate(normalized):
                if alias == norm:
                    quality = 0
                elif alias in norm:
                    quality = 1
                else:
                    continue
                key = (quality, alias_rank, len(norm), idx)
                if best is None or key < best:
                    best = key
                    best_idx = idx
        if best_idx is not None:
            result[role] = best_idx
    return result


def bvh_to_tracks(
    bvh_text: str,
    target_joint_names: Sequence[str],
    *,
    max_frames: int = 1200,
) -> Tuple[Dict[str, List[List[float]]], int]:
    """Convert BVH text into Virtual Studio clip tracks for a target rig.

    Returns ({target_joint_name: [[x, y, z, w] per frame]}, fps). Empty dict
    when no source joint maps onto the target skeleton. `max_frames` guards
    against absurdly long uploads (1200 ≈ 40 s at 30 fps).
    """
    data = parse_bvh(bvh_text)
    frames = data.frames[:max_frames]

    source_by_role = classify_source_joints(data.names)
    mapping: Dict[int, str] = {}  # source joint index -> target joint name
    for role, src_idx in source_by_role.items():
        tgt_idx = find_joint_by_role(target_joint_names, role)
        if tgt_idx is None:
            continue
        # Only animate joints that actually carry rotation channels.
        if not any(c.upper().endswith("ROTATION") for c in data.joints[src_idx].channels):
            continue
        mapping[src_idx] = str(target_joint_names[tgt_idx])

    tracks: Dict[str, List[List[float]]] = {name: [] for name in mapping.values()}
    for frame in frames:
        for src_idx, target_name in mapping.items():
            q = joint_rotation_quat(data.joints[src_idx], frame)
            tracks[target_name].append([float(q[0]), float(q[1]), float(q[2]), float(q[3])])

    return tracks, data.fps

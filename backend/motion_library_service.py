"""
Motion Library — real mocap clips (BVH) matched by keyword, retargeted on
demand onto the active rig.

Sits between DeepMotion (paid, arbitrary text) and the procedural generator
(free, sine-wave quality) in text_to_motion_service's tier chain: when a
prompt clearly asks for something the library has ("walk", "dans", "vink"),
a real motion-capture clip beats both — better quality than procedural,
zero cost and zero latency compared to a hosted model.

Layout
------
backend/motion_library/
    manifest.json        {"clips": {name: {file, actions, keywords, loop}}}
    walk.bvh, run.bvh, … CMU Graphics Lab mocap (free incl. commercial use),
                         downsampled to 30 fps.

Matching is two-stage: the prompt runs through the same `text_to_action`
keyword router the procedural tier uses (so "ta en spasertur" → action
"walk" → the walk clip), then raw manifest keywords act as a fallback for
clips without a procedural action equivalent (e.g. "dance").

Retargeted tracks are cached per (clip, target-skeleton) pair — parsing a
400-frame BVH costs ~10 ms, but the cache makes repeated scene-director
calls free. Drop a new .bvh + manifest entry in the folder (or POST
/api/motion/library/upload) and it's live on the next request.
"""

from __future__ import annotations

import json
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

LIBRARY_DIR = Path(__file__).parent / "motion_library"
MANIFEST_PATH = LIBRARY_DIR / "manifest.json"


@dataclass
class LibraryClip:
    name: str
    file: Path
    actions: List[str]      # text_to_action outputs this clip serves
    keywords: List[str]     # raw prompt substrings (lowercased)
    loop: bool
    source: str = ""


class MotionLibraryService:
    def __init__(self, library_dir: Path = LIBRARY_DIR) -> None:
        self.library_dir = library_dir
        self._lock = threading.Lock()
        self._clips: Optional[Dict[str, LibraryClip]] = None
        # (clip name, joint-names fingerprint) -> (tracks, fps)
        self._track_cache: Dict[Tuple[str, str], Tuple[Dict[str, list], int]] = {}

    # ---- catalog ----------------------------------------------------------

    def _load_clips(self) -> Dict[str, LibraryClip]:
        clips: Dict[str, LibraryClip] = {}
        manifest: Dict[str, Any] = {}
        try:
            manifest = json.loads((self.library_dir / "manifest.json").read_text())
        except FileNotFoundError:
            pass
        except Exception as exc:  # noqa: BLE001 - a broken manifest shouldn't kill motion
            print(f"[motion_library] manifest unreadable, using filenames only: {exc}")

        for name, entry in (manifest.get("clips") or {}).items():
            path = self.library_dir / str(entry.get("file", f"{name}.bvh"))
            if not path.exists():
                print(f"[motion_library] manifest clip {name!r} missing on disk: {path.name}")
                continue
            clips[name] = LibraryClip(
                name=name,
                file=path,
                actions=[str(a).lower() for a in entry.get("actions") or []],
                keywords=[str(k).lower() for k in entry.get("keywords") or []],
                loop=bool(entry.get("loop", False)),
                source=str(entry.get("source", "")),
            )

        # Un-manifested .bvh files register under their stem so a plain
        # file drop works without editing JSON.
        for path in sorted(self.library_dir.glob("*.bvh")):
            stem = path.stem.lower()
            if any(c.file == path for c in clips.values()):
                continue
            clips[stem] = LibraryClip(
                name=stem, file=path, actions=[stem],
                keywords=[stem.replace("_", " ")], loop=False,
            )
        return clips

    def clips(self, *, refresh: bool = False) -> Dict[str, LibraryClip]:
        with self._lock:
            if self._clips is None or refresh:
                self._clips = self._load_clips()
                self._track_cache.clear()
            return dict(self._clips)

    def describe(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": c.name,
                "file": c.file.name,
                "actions": c.actions,
                "keywords": c.keywords,
                "loop": c.loop,
                "source": c.source,
            }
            for c in self.clips().values()
        ]

    # ---- matching ---------------------------------------------------------

    def match(self, prompt: str, action: Optional[str] = None) -> Optional[LibraryClip]:
        """Find the library clip for a prompt. `action` is the output of
        text_to_action (passed in so this module needn't re-run it); raw
        keyword matching against the prompt is the fallback for clips that
        have no procedural-action equivalent."""
        prompt_l = f" {(prompt or '').lower()} "
        clips = self.clips()

        if action:
            for clip in clips.values():
                if action.lower() in clip.actions:
                    return clip

        best: Optional[LibraryClip] = None
        best_len = 0
        for clip in clips.values():
            for kw in clip.keywords:
                # Word-boundary-ish match so "run" doesn't fire on "brunch".
                if re.search(rf"(?<![a-zà-ø]){re.escape(kw)}", prompt_l) and len(kw) > best_len:
                    best, best_len = clip, len(kw)
        return best

    # ---- retargeting ------------------------------------------------------

    def clip_tracks(
        self, clip: LibraryClip, target_joint_names: Sequence[str]
    ) -> Tuple[Dict[str, list], int]:
        """Retargeted quaternion tracks for a clip, cached per skeleton."""
        key = (clip.name, "|".join(map(str, target_joint_names)))
        with self._lock:
            cached = self._track_cache.get(key)
        if cached is not None:
            return cached

        from bvh_retarget import bvh_to_tracks

        tracks, fps = bvh_to_tracks(clip.file.read_text(), target_joint_names)
        with self._lock:
            self._track_cache[key] = (tracks, fps)
        return tracks, fps

    def generate(
        self, prompt: str, target_joint_names: Sequence[str], action: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Full tier entry point: match → retarget → clip dict, or None when
        the library has nothing for this prompt / rig. Never raises."""
        try:
            clip = self.match(prompt, action)
            if clip is None:
                return None
            tracks, fps = self.clip_tracks(clip, target_joint_names)
            if not tracks:
                return None
            frames = len(next(iter(tracks.values())))
            return {
                "prompt": prompt,
                "action": clip.name,
                "fps": fps,
                "duration": max(0.0, (frames - 1) / fps),
                "loop": clip.loop,
                "tracks": tracks,
                "tier": "library",
                "source": clip.source or None,
            }
        except Exception as exc:  # noqa: BLE001 - library failure → next tier
            print(f"[motion_library] failed for {prompt!r}: {exc}")
            return None

    # ---- upload -----------------------------------------------------------

    def add_clip(
        self,
        name: str,
        bvh_text: str,
        *,
        keywords: Optional[List[str]] = None,
        actions: Optional[List[str]] = None,
        loop: bool = False,
        source: str = "upload",
    ) -> Dict[str, Any]:
        """Validate + persist an uploaded BVH and register it in the manifest.
        Returns {success, error?, clip?}."""
        safe = re.sub(r"[^a-z0-9_]", "", (name or "").lower().replace("-", "_").replace(" ", "_"))
        if not safe:
            return {"success": False, "error": "invalid clip name"}

        from bvh_retarget import BvhParseError, parse_bvh

        try:
            data = parse_bvh(bvh_text)
        except BvhParseError as exc:
            return {"success": False, "error": f"not a valid BVH: {exc}"}
        if data.frames.shape[0] < 2:
            return {"success": False, "error": "BVH has fewer than 2 frames"}

        self.library_dir.mkdir(parents=True, exist_ok=True)
        (self.library_dir / f"{safe}.bvh").write_text(bvh_text)

        manifest_path = self.library_dir / "manifest.json"
        try:
            manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        except Exception:  # noqa: BLE001
            manifest = {}
        manifest.setdefault("clips", {})[safe] = {
            "file": f"{safe}.bvh",
            "actions": [a.lower() for a in actions or []],
            "keywords": [k.lower() for k in keywords or [safe.replace("_", " ")]],
            "loop": loop,
            "source": source,
        }
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

        self.clips(refresh=True)
        return {
            "success": True,
            "clip": {"name": safe, "frames": int(data.frames.shape[0]), "fps": data.fps,
                     "joints": len(data.joints)},
        }


_INSTANCE: Optional[MotionLibraryService] = None


def get_motion_library_service() -> MotionLibraryService:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = MotionLibraryService()
    return _INSTANCE

"""
MHR rig export — turn a SAM 3D Body prediction into a *rigged, animatable* GLB.

SAM 3D Body / MHR predicts, per person, a posed mesh (`pred_vertices`) **and**
the underlying skeleton (`pred_joint_coords`). The previous pipeline threw the
skeleton away and exported a static `trimesh`, so avatars could never move.

This module keeps the skeleton: it builds a skinned glTF (joints + inverse-bind
matrices + per-vertex skin weights) and bakes a gentle looping idle animation so
the avatar breathes/sways the moment it lands in Virtual Studio. It only needs
numpy + pygltflib — no torch — so it can be unit-tested without running SAM.

Design notes
------------
* Bind pose = SAM's predicted pose. Joint local rotations are identity, so a
  joint's global bind transform is a pure translation to its world position and
  the inverse-bind matrix is the negated translation. Skinning is exact at rest.
* Skin weights: if MHR's authored weights aren't supplied we auto-skin each
  vertex to its nearest bones (top-k by distance to the parent→joint segment).
  Good enough to animate cleanly; MHR weights can be passed in to override.
* Idle animation rotates a few spine/shoulder/head joints with small sinusoids.
"""

from __future__ import annotations

import struct
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

def load_mhr70_hierarchy(mhr70_path: str):
    """Load the MHR-70 keypoint names + a spanning-tree parent array.

    Returns (names: list[str], parents: np.ndarray) or (None, None) if the file
    can't be read. Rooted at pelvis/hip/spine/neck when present. Only meaningful
    when the predicted joint set has 70 entries in this order.
    """
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("_mhr70", mhr70_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        pi = mod.pose_info
        kinfo = pi["keypoint_info"]
        names = [kinfo[i]["name"] for i in sorted(kinfo)]
        name2id = {n: i for i, n in enumerate(names)}
        links = []
        for sk in pi["skeleton_info"].values():
            a, b = sk["link"]
            if a in name2id and b in name2id:
                links.append((name2id[a], name2id[b]))
        root = 0
        for pref in ("pelvis", "hip", "spine", "neck"):
            hit = next((i for i, n in enumerate(names) if pref in n.lower()), None)
            if hit is not None:
                root = hit
                break
        parents = build_parents_from_links(len(names), links, root=root)
        return names, parents
    except Exception:
        return None, None


# ── skeleton hierarchy ──────────────────────────────────────────────────────


def build_parents_from_links(
    num_joints: int,
    links: Sequence[Tuple[int, int]],
    root: int = 0,
) -> np.ndarray:
    """Derive a strict parent-per-joint tree from an undirected link graph.

    MHR's skeleton_info is a graph (it contains cross-links like hip↔hip), but a
    glTF skeleton needs one parent per joint. We BFS a spanning tree from `root`.
    Joints not reachable through links are attached to the root so nothing is
    orphaned. Returns int array of length num_joints, parent[root] == -1.
    """
    adj: Dict[int, List[int]] = {i: [] for i in range(num_joints)}
    for a, b in links:
        if 0 <= a < num_joints and 0 <= b < num_joints:
            adj[a].append(b)
            adj[b].append(a)

    parents = np.full(num_joints, -1, dtype=np.int32)
    visited = np.zeros(num_joints, dtype=bool)
    queue = [root]
    visited[root] = True
    while queue:
        node = queue.pop(0)
        for nb in adj[node]:
            if not visited[nb]:
                visited[nb] = True
                parents[nb] = node
                queue.append(nb)
    # Orphans (disconnected from root) hang off the root so the tree is complete.
    for j in range(num_joints):
        if j != root and not visited[j]:
            parents[j] = root
    return parents


def build_parents_mst(joint_coords: np.ndarray, root: int = 0) -> np.ndarray:
    """Fallback hierarchy: a minimum spanning tree over joint distances.

    Used when no anatomical link table is available. Produces a connected,
    animatable tree even for an unknown joint set.
    """
    n = len(joint_coords)
    parents = np.full(n, -1, dtype=np.int32)
    in_tree = np.zeros(n, dtype=bool)
    in_tree[root] = True
    # best[j] = (dist to tree, parent-in-tree) for nodes not yet added
    best_dist = np.full(n, np.inf)
    best_par = np.full(n, root, dtype=np.int32)
    d0 = np.linalg.norm(joint_coords - joint_coords[root], axis=1)
    best_dist = d0.copy()
    for _ in range(n - 1):
        best_dist[in_tree] = np.inf
        j = int(np.argmin(best_dist))
        if not np.isfinite(best_dist[j]):
            break
        parents[j] = int(best_par[j])
        in_tree[j] = True
        d = np.linalg.norm(joint_coords - joint_coords[j], axis=1)
        closer = d < best_dist
        best_dist = np.where(closer, d, best_dist)
        best_par = np.where(closer, j, best_par)
    return parents


# ── skinning ────────────────────────────────────────────────────────────────


def _point_segment_distance(p: np.ndarray, a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Distance from each point p (N,3) to segment a-b (3,)."""
    ab = b - a
    denom = float(np.dot(ab, ab))
    if denom < 1e-12:
        return np.linalg.norm(p - a, axis=1)
    t = np.clip(((p - a) @ ab) / denom, 0.0, 1.0)
    proj = a[None, :] + t[:, None] * ab[None, :]
    return np.linalg.norm(p - proj, axis=1)


def auto_skinning_weights(
    vertices: np.ndarray,
    joint_coords: np.ndarray,
    parents: np.ndarray,
    k: int = 4,
) -> Tuple[np.ndarray, np.ndarray]:
    """Per-vertex top-k skin weights from distance to each bone.

    A "bone" is the segment parent→joint; root uses the joint point. Weight is
    inverse distance, then top-k are kept and normalised. Returns (joint_idx
    (V,4) uint, weights (V,4) float32) padded to 4 influences per vertex.
    """
    V = len(vertices)
    J = len(joint_coords)
    dist = np.empty((V, J), dtype=np.float64)
    for j in range(J):
        par = int(parents[j])
        if par < 0:
            dist[:, j] = np.linalg.norm(vertices - joint_coords[j], axis=1)
        else:
            dist[:, j] = _point_segment_distance(vertices, joint_coords[par], joint_coords[j])

    k = min(k, J)
    nearest = np.argpartition(dist, kth=k - 1, axis=1)[:, :k]  # (V,k) unsorted
    w = 1.0 / (np.take_along_axis(dist, nearest, axis=1) + 1e-6)
    w = w / w.sum(axis=1, keepdims=True)

    joints4 = np.zeros((V, 4), dtype=np.uint16)
    weights4 = np.zeros((V, 4), dtype=np.float32)
    joints4[:, :k] = nearest.astype(np.uint16)
    weights4[:, :k] = w.astype(np.float32)
    # renormalise (k may be < 4; padding stays zero-weight)
    s = weights4.sum(axis=1, keepdims=True)
    s[s == 0] = 1.0
    weights4 = weights4 / s
    return joints4, weights4


# ── idle animation ──────────────────────────────────────────────────────────


def _axis_angle_quat(axis: np.ndarray, angle: float) -> np.ndarray:
    axis = axis / (np.linalg.norm(axis) + 1e-12)
    s = np.sin(angle / 2.0)
    return np.array([axis[0] * s, axis[1] * s, axis[2] * s, np.cos(angle / 2.0)], dtype=np.float32)


def make_idle_animation(
    parents: np.ndarray,
    joint_names: Optional[Sequence[str]] = None,
    duration: float = 4.0,
    fps: int = 24,
) -> Dict[int, np.ndarray]:
    """Build a subtle looping idle: small sinusoidal rotations on a few joints.

    Returns {joint_index: quats (T,4)} plus times via the module-level sampler.
    Targets are chosen by name when available (spine/chest/neck/shoulders),
    otherwise a few joints near the vertical centre of the tree.
    """
    T = int(duration * fps) + 1
    t = np.linspace(0.0, duration, T)
    phase = 2.0 * np.pi * t / duration  # one full loop over `duration`

    targets: Dict[int, Tuple[np.ndarray, float, float]] = {}  # jidx -> (axis, amp, phase_off)
    if joint_names:
        lname = [str(n).lower() for n in joint_names]

        def find(substr: str) -> Optional[int]:
            for i, n in enumerate(lname):
                if substr in n:
                    return i
            return None

        for key, axis, amp, off in [
            ("spine", np.array([1, 0, 0.0]), 0.020, 0.0),
            ("chest", np.array([1, 0, 0.0]), 0.020, 0.0),
            ("neck", np.array([1, 0, 0.0]), 0.015, 0.5),
            ("left_shoulder", np.array([0, 0, 1.0]), 0.020, 0.0),
            ("right_shoulder", np.array([0, 0, 1.0]), -0.020, 0.0),
        ]:
            j = find(key)
            if j is not None:
                targets[j] = (axis, amp, off)

    if not targets:
        # No names: nudge the root's first few descendants along X (breathing).
        children = [j for j in range(len(parents)) if parents[j] >= 0][:3]
        for c in children:
            targets[c] = (np.array([1.0, 0, 0]), 0.015, 0.0)

    anim: Dict[int, np.ndarray] = {}
    for j, (axis, amp, off) in targets.items():
        angles = amp * np.sin(phase + off * np.pi)
        quats = np.stack([_axis_angle_quat(axis, float(a)) for a in angles], axis=0)
        anim[j] = quats.astype(np.float32)
    return anim, t.astype(np.float32)


def make_locomotion_animation(
    parents: np.ndarray,
    joint_names: Optional[Sequence[str]] = None,
    run: bool = False,
    fps: int = 24,
):
    """Procedural walk/run cycle: hips/knees/shoulders/elbows swing in
    counter-phase (left leg with right arm). Amplitudes and speed scale up for
    a run. Rotations are about the lateral (X) axis; since every joint node is
    world-aligned in the bind pose (translation-only nodes) this reads as a
    forward/back pitch. Returns ({joint_index: quats (T,4)}, times).

    Requires named joints (left_hip, right_knee, …). Falls back to an empty
    clip when names are unavailable — locomotion needs anatomy to look right.
    """
    duration = 0.7 if run else 1.0  # one full stride loop
    T = int(duration * fps) + 1
    t = np.linspace(0.0, duration, T)
    ph = 2.0 * np.pi * t / duration

    if not joint_names:
        return {}, t.astype(np.float32)
    lname = [str(n).lower() for n in joint_names]

    def find(substr: str) -> Optional[int]:
        return next((i for i, n in enumerate(lname) if substr in n), None)

    X = np.array([1.0, 0.0, 0.0])
    hip_amp = 0.85 if run else 0.50       # leg pitch (rad)
    knee_amp = 1.30 if run else 0.70      # knee flexion (rad, one-sided)
    arm_amp = 0.90 if run else 0.45       # shoulder pitch (rad)
    elbow_amp = 0.50 if run else 0.25

    # (joint substring, driver phase, wave→angle function)
    def swing(offset):        # symmetric fore/aft
        return lambda a: a * np.sin(ph + offset)

    def flex(offset):         # knees/elbows only bend one way (rectified)
        return lambda a: a * np.clip(np.sin(ph + offset), 0.0, None)

    plan = [
        ("left_hip", X, hip_amp, swing(0.0)),
        ("right_hip", X, hip_amp, swing(np.pi)),
        ("left_knee", X, -knee_amp, flex(np.pi * 0.5)),
        ("right_knee", X, -knee_amp, flex(np.pi * 1.5)),
        ("left_shoulder", X, arm_amp, swing(np.pi)),   # opposite to left leg
        ("right_shoulder", X, arm_amp, swing(0.0)),
        ("left_elbow", X, -elbow_amp, flex(np.pi)),
        ("right_elbow", X, -elbow_amp, flex(0.0)),
    ]

    anim: Dict[int, np.ndarray] = {}
    for name, axis, amp, fn in plan:
        j = find(name)
        if j is None:
            continue
        angles = fn(amp)
        anim[j] = np.stack([_axis_angle_quat(axis, float(a)) for a in angles], axis=0).astype(np.float32)

    # Subtle vertical bob on the spine/root for weight shift.
    spine = find("spine") or find("chest")
    if spine is not None:
        bob = (0.06 if run else 0.03) * np.sin(2 * ph)  # twice per stride
        anim.setdefault(spine, np.stack([_axis_angle_quat(X, float(b)) for b in bob], axis=0).astype(np.float32))

    return anim, t.astype(np.float32)


# ── glTF assembly ───────────────────────────────────────────────────────────


def _compute_normals(vertices: np.ndarray, faces: np.ndarray) -> np.ndarray:
    normals = np.zeros_like(vertices, dtype=np.float64)
    tris = vertices[faces]
    fn = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    for i in range(3):
        np.add.at(normals, faces[:, i], fn)
    norm = np.linalg.norm(normals, axis=1, keepdims=True)
    norm[norm == 0] = 1.0
    return (normals / norm).astype(np.float32)


def export_rigged_glb(
    vertices: np.ndarray,
    faces: np.ndarray,
    joint_coords: np.ndarray,
    out_path: str,
    parents: Optional[np.ndarray] = None,
    skin_weights: Optional[np.ndarray] = None,
    skin_joints: Optional[np.ndarray] = None,
    joint_names: Optional[Sequence[str]] = None,
    uv: Optional[np.ndarray] = None,
    texture_path: Optional[str] = None,
    idle: bool = True,
    locomotion: bool = True,
    root: int = 0,
) -> Dict[str, object]:
    """Write a skinned, animated GLB from a SAM 3D Body prediction.

    Parameters mirror what `sam3d_service` has on hand: `vertices`/`faces` from
    the MHR mesh, `joint_coords` from `pred_joint_coords`. `parents` defaults to
    an MST over the joints; pass the MHR hierarchy for anatomically correct
    bones. Returns a small summary dict (counts) for logging/tests.
    """
    import pygltflib
    from pygltflib import GLTF2, Node, Mesh, Primitive, Attributes, Accessor, BufferView, Buffer, Skin, Animation, AnimationSampler, AnimationChannel, AnimationChannelTarget, Scene

    vertices = np.asarray(vertices, dtype=np.float32)
    faces = np.asarray(faces, dtype=np.uint32)
    joint_coords = np.asarray(joint_coords, dtype=np.float32)
    J = len(joint_coords)

    if parents is None:
        parents = build_parents_mst(joint_coords, root=root)
    parents = np.asarray(parents, dtype=np.int32)

    if skin_weights is None or skin_joints is None:
        skin_joints, skin_weights = auto_skinning_weights(vertices, joint_coords, parents)
    skin_joints = np.asarray(skin_joints, dtype=np.uint16)
    skin_weights = np.asarray(skin_weights, dtype=np.float32)

    normals = _compute_normals(vertices, faces)

    # Local joint translations (bind pose): world - parent world.
    local_t = joint_coords.copy()
    for j in range(J):
        p = int(parents[j])
        if p >= 0:
            local_t[j] = joint_coords[j] - joint_coords[p]
    # Inverse bind matrices: identity rotation ⇒ translate(-world). Column-major.
    ibm = np.tile(np.eye(4, dtype=np.float32), (J, 1, 1))
    ibm[:, 3, 0:3] = -joint_coords  # row-3 xyz in column-major layout = translation

    # Animation clips to bake. The studio's rig library matches by name
    # (idle/walk/run), so these names light up idle + locomotion out of the box.
    clips: List[Tuple[str, Dict[int, np.ndarray], np.ndarray]] = []
    if idle:
        a, ts = make_idle_animation(parents, joint_names)
        if a:
            clips.append(("Idle", a, ts))
    if locomotion:
        wa, wts = make_locomotion_animation(parents, joint_names, run=False)
        if wa:
            clips.append(("Walk", wa, wts))
        ra, rts = make_locomotion_animation(parents, joint_names, run=True)
        if ra:
            clips.append(("Run", ra, rts))

    # ---- binary blob (single buffer, tightly packed, 4-byte aligned) ----------
    blob = bytearray()
    views: List[Tuple[int, int, Optional[int]]] = []  # (byteOffset, byteLength, target)

    def add_view(data: bytes, target: Optional[int] = None) -> int:
        while len(blob) % 4 != 0:
            blob.append(0)
        offset = len(blob)
        blob.extend(data)
        views.append((offset, len(data), target))
        return len(views) - 1

    ELEMENT_ARRAY = 34963
    ARRAY = 3434962 if False else 34962  # ARRAY_BUFFER

    idx_view = add_view(faces.astype(np.uint32).tobytes(), ELEMENT_ARRAY)
    pos_view = add_view(vertices.tobytes(), ARRAY)
    nrm_view = add_view(normals.tobytes(), ARRAY)
    jnt_view = add_view(skin_joints.astype(np.uint16).tobytes(), ARRAY)
    wgt_view = add_view(skin_weights.astype(np.float32).tobytes(), ARRAY)
    uv_view = add_view(np.asarray(uv, np.float32).tobytes(), ARRAY) if uv is not None else None
    ibm_view = add_view(ibm.tobytes())

    accessors: List[Accessor] = []

    def add_accessor(view: int, comp_type: int, count: int, acc_type: str,
                     mn=None, mx=None, normalized=False) -> int:
        accessors.append(Accessor(
            bufferView=view, componentType=comp_type, count=count, type=acc_type,
            min=mn, max=mx, normalized=normalized,
        ))
        return len(accessors) - 1

    UNSIGNED_INT, UNSIGNED_SHORT, FLOAT = 5125, 5123, 5126
    acc_idx = add_accessor(idx_view, UNSIGNED_INT, faces.size, "SCALAR")
    acc_pos = add_accessor(pos_view, FLOAT, len(vertices), "VEC3",
                           vertices.min(axis=0).tolist(), vertices.max(axis=0).tolist())
    acc_nrm = add_accessor(nrm_view, FLOAT, len(normals), "VEC3")
    acc_jnt = add_accessor(jnt_view, UNSIGNED_SHORT, len(skin_joints), "VEC4")
    acc_wgt = add_accessor(wgt_view, FLOAT, len(skin_weights), "VEC4")
    acc_uv = add_accessor(uv_view, FLOAT, len(uv), "VEC2") if uv_view is not None else None
    acc_ibm = add_accessor(ibm_view, FLOAT, J, "MAT4")

    # ---- nodes: joints first (0..J-1), then the mesh node ----------------------
    nodes: List[Node] = []
    for j in range(J):
        children = [c for c in range(J) if int(parents[c]) == j]
        nodes.append(Node(
            translation=local_t[j].tolist(),
            children=children or None,
            name=(str(joint_names[j]) if joint_names and j < len(joint_names) else f"joint_{j}"),
        ))
    joint_roots = [j for j in range(J) if int(parents[j]) < 0]

    attributes = Attributes(POSITION=acc_pos, NORMAL=acc_nrm, JOINTS_0=acc_jnt, WEIGHTS_0=acc_wgt)
    if acc_uv is not None:
        attributes.TEXCOORD_0 = acc_uv
    prim = Primitive(attributes=attributes, indices=acc_idx, material=0 if texture_path else None)
    mesh_node = Node(mesh=0, skin=0, name="sam3d_avatar")
    nodes.append(mesh_node)
    mesh_node_idx = len(nodes) - 1

    skin = Skin(joints=list(range(J)), inverseBindMatrices=acc_ibm,
                skeleton=joint_roots[0] if joint_roots else 0)

    # ---- animation (Idle / Walk / Run) ----------------------------------------
    animations: List[Animation] = []
    for clip_name, clip_anim, clip_times in clips:
        time_view = add_view(np.asarray(clip_times, np.float32).tobytes())
        acc_time = add_accessor(time_view, FLOAT, len(clip_times), "SCALAR",
                                [float(clip_times.min())], [float(clip_times.max())])
        samplers: List[AnimationSampler] = []
        channels: List[AnimationChannel] = []
        for jidx, quats in clip_anim.items():
            q_view = add_view(np.asarray(quats, np.float32).tobytes())
            acc_q = add_accessor(q_view, FLOAT, len(quats), "VEC4")
            samplers.append(AnimationSampler(input=acc_time, output=acc_q, interpolation="LINEAR"))
            channels.append(AnimationChannel(
                sampler=len(samplers) - 1,
                target=AnimationChannelTarget(node=int(jidx), path="rotation"),
            ))
        animations.append(Animation(name=clip_name, samplers=samplers, channels=channels))

    # ---- assemble -------------------------------------------------------------
    gltf = GLTF2(
        scenes=[Scene(nodes=joint_roots + [mesh_node_idx])],
        scene=0,
        nodes=nodes,
        meshes=[Mesh(primitives=[prim], name="sam3d_avatar")],
        skins=[skin],
        accessors=accessors,
        bufferViews=[BufferView(buffer=0, byteOffset=o, byteLength=l, target=t)
                     for (o, l, t) in views],
        buffers=[Buffer(byteLength=len(blob))],
        animations=animations or None,
    )

    if texture_path and Path(texture_path).exists():
        from pygltflib import Material, PbrMetallicRoughness, Texture, Image, Sampler, TextureInfo
        img_bytes = Path(texture_path).read_bytes()
        img_view = add_view(img_bytes)
        gltf.bufferViews[-1] = BufferView(buffer=0, byteOffset=views[-1][0], byteLength=views[-1][1])
        gltf.images = [Image(bufferView=img_view, mimeType="image/png")]
        gltf.samplers = [Sampler()]
        gltf.textures = [Texture(source=0, sampler=0)]
        gltf.materials = [Material(
            pbrMetallicRoughness=PbrMetallicRoughness(
                baseColorTexture=TextureInfo(index=0), metallicFactor=0.0, roughnessFactor=0.9),
            name="sam3d_skin")]
        gltf.buffers = [Buffer(byteLength=len(blob))]

    gltf.set_binary_blob(bytes(blob))
    gltf.save_binary(out_path)

    return {
        "vertices": int(len(vertices)),
        "faces": int(len(faces)),
        "joints": int(J),
        "animated": bool(clips),
        "clips": [name for name, _, _ in clips],
        "has_texture": bool(texture_path and Path(texture_path).exists()),
        "output": out_path,
    }

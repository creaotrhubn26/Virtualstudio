"""USD for the device, from the same run that writes the glTF for the browser.

Not a conversion. `build_studio_characters.py` writes its glTF document by hand,
accessor by accessor, and this writes a USD stage the same way, prim by prim, from
the same morphed vertices, the same 53-joint rig and the same fitted garments. One
authoring run, two formats, one set of hashes; nothing passes through a second file
format on the way and there is no conversion step to validate.

Why USD at all, when the reader on the Swift side can already read the glTF: a
USDZ hands RealityKit the skinning and the materials. Building those by hand is
where the iPad edition got stuck — the hair does not draw, because a cutout has to
be told where its opacity comes from and `opacityThreshold` alone does not
establish it. `UsdPreviewSurface` says it in one line, and RealityKit's own loader
obeys it.

The technique is the Campfire Games project's, next door, which has been shipping
eight characters this way; see `docs/campfire-precedent.md`. The bindings come with
Blender, which is already this builder's interpreter:

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python scripts/characters/build_studio_characters.py

What is deliberately *not* in the USD: the pose clips. A skeleton binds one
animation source at a time, and the studio's three poses are fixed stances the app
switches between, so they travel as plain rotations in a JSON file beside the USDZ
and the app writes them to `jointTransforms`. That is how Campfire drives its
characters too, and it keeps the poses in the same shape the Swift side already
reads and tests.
"""

import json

import numpy as np
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Vt


def _matrix(translation):
    return Gf.Matrix4d(1).SetTranslate(Gf.Vec3d(*map(float, translation)))


def _material(stage, name, diffuse, roughness, normal=None, ao=None, alpha=False):
    """One `UsdPreviewSurface`, wired to the files the builder wrote.

    `alpha` is the whole reason this exists rather than a flat colour: hair is an
    alpha cutout, and the two inputs that make it one are `opacity`, *connected to
    the texture's alpha channel*, and `opacityThreshold` as a separate number.
    Setting the threshold without connecting the source leaves every strand tested
    against an opacity it was never given.
    """
    material = UsdShade.Material.Define(stage, "/Character/Materials/" + name)
    shader = UsdShade.Shader.Define(stage, material.GetPath().AppendChild("Surface"))
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(float(roughness))
    shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)

    reader = UsdShade.Shader.Define(stage, material.GetPath().AppendChild("UV"))
    reader.CreateIdAttr("UsdPrimvarReader_float2")
    reader.CreateInput("varname", Sdf.ValueTypeNames.Token).Set("st")

    def sampler(child, path, colour_space):
        texture = UsdShade.Shader.Define(stage, material.GetPath().AppendChild(child))
        texture.CreateIdAttr("UsdUVTexture")
        texture.CreateInput("file", Sdf.ValueTypeNames.Asset).Set(str(path))
        texture.CreateInput("sourceColorSpace", Sdf.ValueTypeNames.Token).Set(colour_space)
        texture.CreateInput("st", Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(), "result")
        # Repeat rather than clamp: a UV seam at the edge of the atlas otherwise
        # smears the border pixel down the whole seam.
        texture.CreateInput("wrapS", Sdf.ValueTypeNames.Token).Set("repeat")
        texture.CreateInput("wrapT", Sdf.ValueTypeNames.Token).Set("repeat")
        return texture

    colour = sampler("Texture", diffuse, "sRGB")
    colour.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
    colour.CreateOutput("a", Sdf.ValueTypeNames.Float)
    shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).ConnectToSource(colour.ConnectableAPI(), "rgb")

    if normal:
        # Normal maps are data, not colour: read raw, and expanded from [0,1] to
        # [-1,1] by the scale and bias the specification asks for.
        map_normal = sampler("Normal", normal, "raw")
        map_normal.CreateInput("scale", Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(2, 2, 2, 1))
        map_normal.CreateInput("bias", Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(-1, -1, -1, 0))
        map_normal.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
        shader.CreateInput("normal", Sdf.ValueTypeNames.Normal3f).ConnectToSource(map_normal.ConnectableAPI(), "rgb")

    if ao:
        map_ao = sampler("Occlusion", ao, "raw")
        map_ao.CreateOutput("r", Sdf.ValueTypeNames.Float)
        shader.CreateInput("occlusion", Sdf.ValueTypeNames.Float).ConnectToSource(map_ao.ConnectableAPI(), "r")

    if alpha:
        shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).ConnectToSource(colour.ConnectableAPI(), "a")
        # The same cutoff the glTF writes as `alphaCutoff`, so both editions clip
        # the same strands.
        shader.CreateInput("opacityThreshold", Sdf.ValueTypeNames.Float).Set(0.45)

    material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    return material


def _mesh(stage, path, surface, skeleton, material, joint_names, keep=None):
    """One skinned mesh, with the same seam splitting the glTF writer does.

    A vertex is split where its UV differs and nowhere else, so the anatomical
    normals stay smooth across a seam instead of creasing along it.
    """
    positions = np.asarray(surface["positions"], dtype=float)
    uvs = surface["uvs"]

    normals = np.zeros_like(positions)
    triangles = []
    for face in surface["faces"]:
        for corner in range(1, len(face) - 1):
            triangle = [face[0], face[corner], face[corner + 1]]
            triangles.append(triangle)
            a, b, c = (point[0] for point in triangle)
            normals[[a, b, c]] += np.cross(positions[b] - positions[a], positions[c] - positions[a])
    normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-10)

    # Normals are summed over every face first and only then are the triangles
    # narrowed to this region, so a region's edge keeps the anatomy's own smooth
    # normal instead of creasing where the split happens to fall.
    if keep is not None:
        triangles = [triangles[index] for index in keep]

    seen, points, point_normals, texcoords, indices, weights = {}, [], [], [], [], []
    joint_indices, joint_weights = [], []
    for triangle in triangles:
        for key in triangle:
            key = tuple(key)
            if key not in seen:
                seen[key] = len(points)
                index, uv = key
                points.append(positions[index])
                point_normals.append(normals[index])
                # USD's texture origin is the bottom left, glTF's is the top left.
                texcoords.append((float(uvs[uv][0]), float(uvs[uv][1])))
                influence = sorted(
                    [(name, weight) for name, weight in surface["bindings"][index] if weight > 0],
                    key=lambda pair: -pair[1],
                )[:4] or [("Root", 1)]
                total = sum(weight for _, weight in influence)
                joint_indices.extend([joint_names.index(name) for name, _ in influence] + [0] * (4 - len(influence)))
                joint_weights.extend([weight / total for _, weight in influence] + [0.0] * (4 - len(influence)))
            indices.append(seen[key])
    weights = joint_weights

    assert np.isfinite(points).all(), path
    assert np.isfinite(weights).all(), path

    mesh = UsdGeom.Mesh.Define(stage, path)
    mesh.CreatePointsAttr().Set(Vt.Vec3fArray.FromNumpy(np.asarray(points, dtype=np.float32)))
    mesh.CreateFaceVertexCountsAttr().Set([3] * (len(indices) // 3))
    mesh.CreateFaceVertexIndicesAttr().Set(indices)
    mesh.CreateSubdivisionSchemeAttr().Set("none")
    mesh.CreateDoubleSidedAttr().Set(bool(surface.get("alpha")))
    mesh.CreateNormalsAttr().Set(Vt.Vec3fArray.FromNumpy(np.asarray(point_normals, dtype=np.float32)))
    mesh.SetNormalsInterpolation("vertex")
    UsdGeom.PrimvarsAPI(mesh).CreatePrimvar(
        "st", Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex
    ).Set(Vt.Vec2fArray.FromNumpy(np.asarray(texcoords, dtype=np.float32)))
    UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)

    binding = UsdSkel.BindingAPI.Apply(mesh.GetPrim())
    binding.CreateSkeletonRel().SetTargets([skeleton.GetPath()])
    binding.CreateGeomBindTransformAttr().Set(Gf.Matrix4d(1))
    binding.CreateJointIndicesPrimvar(False, 4).Set(joint_indices)
    binding.CreateJointWeightsPrimvar(False, 4).Set(weights)
    return len(indices) // 3


def write_usd(path, cache, name, joints, joint_names, parents, surfaces, poses=None, display=None):
    """A USDZ of one figure or one garment, and the poses that go with it.

    `joints` maps a joint name to its world position, `parents` to its parent's
    name or None, and `display` to the name the runtime looks it up by — the rig's
    own keys are the builder's, and the app knows the figure by its Mixamo names. `surfaces` is what to draw, in the same shape the glTF writer is
    handed. `poses` is a mapping from clip name to a rotation per joint — written
    beside the package rather than into it, because a skeleton binds one animation
    source at a time and these are stances to switch between, not an animation.
    """
    cache.mkdir(parents=True, exist_ok=True)
    stage_path = cache / (name + ".usda")
    if stage_path.exists():
        stage_path.unlink()
    stage = Usd.Stage.CreateNew(str(stage_path))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1)

    root = UsdSkel.Root.Define(stage, "/Character")
    stage.SetDefaultPrim(root.GetPrim())

    # A joint's path is its chain from the root, which is how USD names them and
    # how RealityKit hands them back — `jointNames` on the Swift side comes out as
    # full paths, and a lookup by plain name against that finds nothing.
    display = display or {key: key for key in joint_names}
    paths = {}
    for key in joint_names:
        parent = parents.get(key)
        paths[key] = (paths[parent] + "/" + display[key]) if parent else display[key]

    skeleton = UsdSkel.Skeleton.Define(stage, "/Character/Skeleton")
    skeleton.CreateJointsAttr().Set([paths[key] for key in joint_names])
    skeleton.CreateJointNamesAttr().Set([display[key] for key in joint_names])
    # Bind transforms are in model space; rest transforms are each joint relative
    # to its parent. Getting these the same way round is the difference between a
    # figure and a knot.
    skeleton.CreateBindTransformsAttr().Set([_matrix(joints[key]) for key in joint_names])
    skeleton.CreateRestTransformsAttr().Set([
        _matrix(joints[key] - (joints[parents[key]] if parents.get(key) else 0)) for key in joint_names
    ])

    triangles = 0
    regions = []
    for index, surface in enumerate(surfaces):
        material = _material(
            stage, surface["name"].replace("-", "_"),
            surface["diffuse"], surface.get("roughness", 0.8),
            surface.get("normal"), surface.get("ao"), surface.get("alpha", False),
        )
        base = "/Character/" + surface["name"].replace("-", "_")
        # A body is split into the regions its wardrobe covers, so putting clothes
        # on is a matter of switching prims off rather than rebuilding an index
        # buffer. See the note where the regions are written out.
        for part, (covers, keep) in enumerate(surface.get("regions") or [((), None)]):
            path_part = base if keep is None else f"{base}_r{part}"
            triangles += _mesh(stage, path_part, surface, skeleton, material,
                               list(joint_names), keep)
            if keep is not None:
                regions.append({"prim": path_part.rsplit("/", 1)[-1], "covers": list(covers),
                                "triangles": len(keep)})

    binary = cache / (name + ".usdc")
    stage.GetRootLayer().Export(str(binary))
    if path.exists():
        path.unlink()  # the generated target only, never source data
    assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(binary)), str(path)), name

    if poses is not None:
        # Beside the package, in the shape the Swift side already reads: a rotation
        # per joint per clip, in the skeleton's own order, and which garments cover
        # each region of the body.
        #
        # The regions are why a figure can change clothes without a new mesh. Every
        # triangle of the body is labelled with the set of garments that hide it,
        # triangles sharing a label become one prim, and dressing the figure is
        # switching off the prims whose label names something being worn. Eleven
        # prims for a body with six garments, decided here where the coverage is
        # already known rather than in the app.
        path.with_name(name + "-rig.json").write_text(json.dumps({
            "name": name,
            "joints": [display[key] for key in joint_names],
            "poses": {clip: [list(map(float, rotation)) for rotation in rotations]
                      for clip, rotations in poses.items()},
            "regions": regions,
        }, indent=2) + "\n")

    return {"triangles": triangles, "joints": len(joint_names),
            "meshes": sum(1 for prim in stage.Traverse() if prim.IsA(UsdGeom.Mesh)),
            "regions": len(regions)}

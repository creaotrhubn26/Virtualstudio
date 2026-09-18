# What Campfire Games already solved

Research, not a plan. Virtualstudio's documents have cited "the local Campfire
Games project" as a precedent since before this work started, without anybody
reading it. Reading it answers two of the three things the iPad edition is stuck
on, and overturns one decision this session made.

## First: there are two of them

| Path | What it is |
|---|---|
| `~/campfire-games` | 29 lines of Swift, one commit, a hello-world screen. No RealityKit, no assets. |
| `~/Documents/campfire-games` | The project: 96 Swift files, 11 743 lines, 3 Metal shaders, 8 USDZ characters, a 597-line USD builder and a validator. |

`CLAUDE.md` says the character solution "follows the asset-building approach
already used by the local Campfire Games project", and the iPad assessment used to
describe that project as "SwiftUI, RealityKit, offline USDZ assets, anatomical
source geometry and an explicit game-engine skeleton" — true of the second, and
false of the first. Neither document says which. Anyone checking the claim against
the directory in the home folder would have concluded the precedent did not exist,
and earlier in this session a search for it was abandoned for exactly that reason.

## 1. USD is authored directly, and Blender already has the bindings

This session wrote into [`ipad-plan.md`](ipad-plan.md) that there would be **no
USD at all**, because `build_studio_characters.py` has no Blender scene for
`bpy.ops.wm.usd_export` to export. That reasoning was right and the conclusion was
wrong: it assumed the only way to write USD is to export a scene.

Campfire writes it directly:

```python
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Vt

root = UsdSkel.Root.Define(self.stage, "/Character")
self.skeleton = UsdSkel.Skeleton.Define(self.stage, "/Character/Skeleton")
binding = UsdSkel.BindingAPI.Apply(mesh.GetPrim())
binding.CreateJointIndicesPrimvar(False, 4).Set(ji)
binding.CreateJointWeightsPrimvar(False, 4).Set(jw)
...
assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(binary)), str(destination))
```

Prim by prim, attribute by attribute — the same shape as Virtualstudio's builder
writing glTF accessor by accessor. And the interpreter is the same one:

> Run with Blender 5.2's Python (USD bindings)

Verified on this machine, in the interpreter `build_studio_characters.py` already
uses:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python-expr "from pxr import Usd, UsdSkel, UsdShade, UsdUtils; print(Usd.GetVersion())"
# (0, 26, 3)
```

So there was a third path the whole time, in the same interpreter, already in use
next door. It also packages to a real `.usdz` — `UsdUtils.CreateNewUsdzPackage`
writes the zip and its alignment — which is what the deleted export in
`exportService.ts` pretended to do.

## 2. RealityKit's depth texture is inaccessible there too

[`measurements/README.md`](measurements/README.md) finding 4 records that every
attempt to read `PostProcessEffectContext.sourceDepthTexture` discards the rest of
the shader, and guesses it is a simulator limitation. Campfire hit the same wall
and wrote the answer into a shader comment:

```metal
// Compatibility probe only. Not assigned to any gameplay material.
// Camera-space depth is encoded into color to assess a supported secondary
// pass without reading RealityRenderer's inaccessible internal depth texture.
[[visible]] void forestDepthProbe(realitykit::surface_parameters params) {
    float4 view = params.uniforms().world_to_view() * float4(params.geometry().world_position(), 1);
    params.surface().set_emissive_color(half3(clamp(-view.z / 110.0, 0.0, 1.0)));
}
```

The technique is not to read RealityKit's depth. It is to **render the scene a
second time and make your own**: a `CustomMaterial` surface shader writes
camera-space depth into emissive colour, `RealityRenderer.CameraOutput(.singleProjection(colorTexture:))`
renders it into an `r16Float` texture the app owns, and a full-screen fragment
shader composites colour against that.

Two details they paid for and wrote down. The depth target can be half
resolution, and the composite then reconstructs by exact integer ratio —
"never interpolate a near silhouette's depth with distant forest", with no claim
of thin-feature parity. And the depth pass clones every skinned model and copies
`jointTransforms` to the clone each frame, so the depth render is of the figure as
posed rather than as bound.

**This is the answer to Virtualstudio's shadow pass.** A soft shadow needs a world
position per fragment; `params.geometry().world_position()` is one, handed over by
RealityKit, with no depth buffer and no reconstruction from a projection matrix at
all.

## 3. A cutout has to be told where its opacity comes from

Virtualstudio's hair does not draw. Campfire does it twice, and both are
instructive.

In USD, `opacity` is *connected to the texture's alpha channel* and the threshold
is a separate input:

```python
if alpha:
    shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).ConnectToSource(tex.ConnectableAPI(), "a")
    shader.CreateInput("opacityThreshold", Sdf.ValueTypeNames.Float).Set(0.45)
```

And in their own shader, by hand, with the reason stated:

```metal
// CustomMaterial does not apply opacityThreshold automatically.
// Binary coverage keeps surviving depths from being alpha-weighted.
float alpha = opacity * params.material_constants().opacity_scale() * baseAlpha;
coverage = alpha >= config.x ? 1.0h : 0.0h;
if (coverage == 0) discard_fragment();
```

`FigureMesh` sets `opacityThreshold` on a `PhysicallyBasedMaterial` and never
establishes an opacity source RealityKit accepts. Both of Campfire's answers point
the same way: the threshold is not the hard part, the connection is.

## 4. Characters are GPU-skinned, and the joint names are paths

```swift
/// GPU-skinned USD geometry. Cached joint bindings: no hierarchy searches in the frame loop.
if let model = node as? ModelEntity, !model.jointNames.isEmpty {
    bindings.append(.init(model: model, rest: model.jointTransforms,
                          names: model.jointNames.map { String($0.split(separator: "/").last ?? "") }))
}
...
binding.model.jointTransforms = pose
```

Load the USDZ, find the models that have joints, keep the rest transforms, write
`jointTransforms` to pose. No skinning in the app at all — which is what
`StudioAssets` currently does on the processor, deliberately, because there was no
skinned mesh to hand RealityKit.

`jointNames` comes back as **full USD paths**, split on `/` to get the name. A
lookup by plain name against that list finds nothing, silently.

Each USDZ ships with a `<name>-rig.json` beside it carrying vertices, triangles,
mesh count, joint count, joint positions and parents — "small, testable and shared
with the runtime animation solver". The same role Virtualstudio's
`manifest.json` plays, used at runtime rather than only at build time.

## 5. The same tooling shape, independently

XcodeGen with a `project.yml` rather than a checked-in `.xcodeproj`; a build
script and a separate validator that opens the shipped package and asserts it
("Offline USD/package gate. Run with the same Blender Python as the asset
builder"); the validator checks the zip, the skeleton's joint list, the mesh
counts and the textures actually inside the archive against the metadata.

That is the same arrangement this session arrived at for Virtualstudio, which is
mild evidence it is the right one rather than a coincidence of taste.

## What was done about it

Point 1 and point 3 are in, the same afternoon:

- `scripts/characters/usd_export.py` writes a USD stage prim by prim from the same
  morphed vertices, the same 53-joint rig and the same fitted garments the glTF
  writer is handed — one authoring run, two formats, no conversion step. The GLBs
  come out byte-identical, which is the check that it is not a conversion.
- The app loads the USDZ and poses it by writing `jointTransforms`, with the joint
  names split out of their USD paths. **The hair draws and the eyes are eyes.**

The poses travel as a `-poses.json` beside the package rather than inside it,
because a skeleton binds one animation source at a time and the studio's three
stances are things to switch between.

The wardrobe went the same way: the body is split at build time into the regions
its wardrobe covers — eleven prims for six garments — and dressing the figure means
leaving those parts out of the mesh. Not switching entities off: the USD loader
merges every mesh prim into one `ModelEntity` with a part per prim, so the prim's
entity is an empty wrapper.

## What this changes

Nothing is decided here. But three things in the iPad plan rest on premises this
research contradicts, and they should be revisited before more is built on them:

1. **"No USD at all"** was concluded from "there is no Blender scene to export".
   `pxr` in Blender's Python is a third path, already proven next door, and it
   hands RealityKit the skinning and the materials — which is exactly where
   `FigureMesh` is stuck, on both the hair and the eyes.
2. **The shadow pass** should not be trying to read a depth texture. A
   `CustomMaterial` surface shader has a world position per fragment, which is
   more than the post-process was ever going to reconstruct.
3. **`RealityView` may be the wrong host.** Campfire is on `RealityRenderer`,
   which is also where `isToneMappingEnabled` lives — the second finding in
   `measurements/README.md`, still open.

The `StudioAssets` reader is not wasted whichever way this goes: the wardrobe's
covered-triangle ranges have to become mesh parts, and that arithmetic is ported
and checked against the browser either way.

# Virtualstudio anatomical figures

These are real skinned, textured 3D meshes assembled for Virtualstudio using the same data-driven approach as CreatorHub's Campfire Games character pipeline. They are not billboards, capsules, scanned people, or assets from set.a.light 3D.

| Asset | Nominal height | Triangles | Joints | Surfaces |
| --- | --- | --- | --- | --- |
| studio-woman.glb | 1.72 m | 29,928 | 53 | 5 |
| studio-man.glb | 1.82 m | 26,448 | 53 | 5 |

Each file contains anatomical skin, fitted clothes, shoes, separate eyes and alpha-cutout hair. Colour, normal and occlusion maps are embedded in the GLB. Skin influences are normalized to at most four joints per vertex. The rig uses Mixamo-compatible bone names; that naming alone does not guarantee compatibility with every external animation.

The three authored clips are fixed studio poses: `StudioStand`, `StudioPortrait` and `StudioSeated`. No walking animation, facial expressions, cloth simulation or editable body morphs are included. Seated poses require a chair/prop positioned by the operator.

## Sources and rights

The upstream **data assets** are distributed as CC0 by the MakeHuman Community. Attribution is retained for traceability. No MakeHuman or MPFB application code is copied or bundled.

- [MakeHuman licensing](https://static.makehumancommunity.org/about/license.html)
- [Pinned MPFB data tree](https://github.com/makehumancommunity/mpfb2/tree/437dd513888a92399d1d3200d2e80859fae55abc/src/mpfb/data): base topology, shape targets, game-engine skeleton and weights.
- [MakeHuman system asset pack, CC0](https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip): fitted clothes, shoes, hair, eyes and textures.
- Assembly/export code adapts CreatorHub's own Campfire builder. Clothing here uses the CC0 contemporary outfits, rather than Campfire's historical outfits.

`manifest.json` records source revision, archive and source-file hashes, output hashes and mesh statistics. The archive hash is checked before generation. The original MakeHuman design on the woman's shirt is part of the source texture.

## Rebuild and validate

From the repository root, with Blender available (its bundled Python supplies NumPy):

```sh
blender --background --factory-startup --python scripts/characters/build_studio_characters.py
python3 scripts/characters/validate_studio_characters.py
```

On macOS, the Blender executable is usually `/Applications/Blender.app/Contents/MacOS/Blender`. `STUDIO_CHARACTER_CACHE` can select a reusable source-cache directory. The first rebuild downloads the approximately 267 MB source archive; that archive is not needed by the application. Runtime loading only reads the two bundled GLBs (approximately 22 MB each) and does not call an avatar-generation service.

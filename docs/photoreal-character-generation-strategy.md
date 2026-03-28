# Photoreal Character GLB Strategy

## Goal

Reach close-up human quality that is materially closer to a digital human pipeline than to a generic "text-to-3D" avatar.

The target is:

- believable face anatomy
- proper eyes, lashes, mouth, and skin response
- rigged full body
- branded wardrobe support
- exportable GLB/GLTF for Babylon.js / web runtime
- preview renders that can be quality-gated before publish

## Current State In Repo

The current stack is not enough for hero-quality humans:

- [backend/sam3d_service.py](/workspaces/Virtualstudio/backend/sam3d_service.py)
  The fallback path still generates a placeholder mannequin when full inference is unavailable.
- [backend/rodin_service.py](/workspaces/Virtualstudio/backend/rodin_service.py)
  Rodin is useful for props and accessories, but it is not the right final human-generation backbone for close-up talent quality.

## Recommendation

### 1. Primary Hero Character Provider: Didimo

Use Didimo for hero talent and any close-up digital humans.

Why this is the strongest fit for the quality target:

- Official docs describe a selfie-to-digital-human pipeline designed for high-fidelity likeness.
- Official docs expose a glTF package with body + facial rig data.
- Official docs support depth input, which helps likeness quality.
- Official docs describe engine-ready geometry and optimization targets.

Source highlights:

- Didimo says its generation pipeline creates high-quality digital humans from inputs as simple as a selfie:
  https://developer.didimo.co/docs/digital-human-specification
- Didimo documents a glTF package with 70 body joints and 138 facial joints:
  https://developer.didimo.co/docs/mesh
- Didimo documents optional depth-image input to improve likeness:
  https://developer.didimo.co/docs/input-depth

Why it wins:

- Better ceiling for close-up faces than generic GLB generators
- Better facial rig story than our current stack
- Better path to "hero talent" and speaking faces

Tradeoff:

- Heavier integration than a pure one-call web avatar service
- Best if we accept a hero/crowd split rather than using one provider for every character

### 2. Primary Branded Staff / NPC Provider: Avaturn

Use Avaturn for scalable web-first staff characters, branded uniforms, and interactive customization.

Why this is the best direct GLB-native production fit:

- Official docs support programmatic avatar creation from photos.
- Official docs state avatars export as GLB / glTF 2.0.
- Official docs include standard humanoid rig + ARKit blendshapes / visemes.
- Official docs include custom garments, footwear, hair/headwear, and render endpoints.

Source highlights:

- Avaturn positions itself as selfie-based realistic avatars with export anywhere:
  https://avaturn.dev/
- Avaturn API supports programmatic avatar creation:
  https://docs.avaturn.me/docs/integration/api/create-avatar-with-api/
- Avaturn exports avatars in GLB:
  https://docs.avaturn.me/docs/importing/unity/
  https://docs.avaturn.me/docs/importing/glb-to-vrm/
- Avaturn supports custom clothing assets uploaded as GLB:
  https://docs.avaturn.me/docs/ux_customization/assets/clothing/
- Avaturn supports render jobs for avatar thumbnails / proof images:
  https://docs.avaturn.me/docs/integration/api/renders/

Why it wins:

- Fastest path to a Babylon-friendly GLB pipeline
- Strongest fit for branded uniforms and wardrobe variation
- Best direct web/app integration model

Tradeoff:

- Quality ceiling is strong, but still generally below the very best "hero shot digital human" pipelines

### 3. Secondary Scan Option: in3D

Use in3D as an optional scan-driven path when we want fast phone capture and GLB export.

Source highlights:

- in3D describes realistic customizable avatars from a phone camera within a minute:
  https://in3d.io/
- in3D states GLB / FBX / USDZ export:
  https://in3d.io/
  https://developer.in3d.io/

Why it matters:

- Good capture-to-avatar speed
- Useful when users expect "scan me now" onboarding

Tradeoff:

- Less clear hero-shot ceiling than Didimo
- Best treated as an optional scan provider, not the only premium path

## Decision

If the goal is truly the image quality in the reference screenshot, the best solution is:

1. Didimo for hero characters
2. Avaturn for scalable branded staff / NPCs
3. in3D as optional fast-scan path
4. Keep Rodin for props only
5. Stop using the SAM3D placeholder/mannequin path for production-facing humans

## What Not To Use As The Main Human Pipeline

Do not use these as the primary answer for close-up humans:

- generic text-to-3D systems
- prop-first generators
- our current fallback mannequin path

These are fine for props, accessories, rough previews, or internal placeholders, but not for hero human quality.

## Product Architecture For Virtual Studio

### Character Tiers

- `hero_talent`
  Use Didimo
- `staff_branded`
  Use Avaturn
- `customer_background`
  Use Avaturn or in3D depending on capture flow
- `placeholder`
  Use current local fallback only in offline/dev failure cases

### Asset Pipeline

1. Generate or capture character in provider
2. Download GLB or glTF package
3. Normalize:
   - naming
   - scale
   - root transform
   - material packing
   - skeleton sanity
4. Validate:
   - rig present
   - textures present
   - triangle budget
   - eye / lash / mouth meshes present
5. Render preview
6. Score preview
7. Upload GLB + textures + preview to R2
8. Register in character catalog / marketplace

### Wardrobe / Branding

- Branded uniforms should not be fake planes on top of the body for premium characters.
- Premium workflow should use actual garment meshes or provider-supported clothing customization.
- Logo placement should be done as:
  - material decal / patch
  - garment texture variation
  - provider-native clothing asset

## Required Repo Changes

### Phase 1

- Add `avatar provider` abstraction:
  - `didimo`
  - `avaturn`
  - `in3d`
  - `local_fallback`
- Add provider health endpoints
- Add provider-specific env vars
- Add GLB normalization service

### Phase 2

- Add `hero character generation` route backed by Didimo
- Add `staff character generation` route backed by Avaturn
- Add R2-backed storage for character GLBs, textures, thumbnails, and renders
- Add preview render + quality report per generated character

### Phase 3

- Replace cardboard wardrobe overlays for premium characters with:
  - provider-native wardrobe
  - imported garment meshes
  - branded material variants
- Add marketplace publishing for character packs

## Quality Gate

No character should be promoted to shared / stable unless it passes:

- face visible and proportionally correct
- no generated floating eye geometry
- body rig valid
- material set valid
- preview render score above threshold
- close-up screenshot acceptable for at least one portrait framing

## Bottom Line

For the exact quality target:

- Best hero-quality choice: Didimo
- Best GLB-native scalable product choice: Avaturn
- Best optional phone-scan path: in3D

If we try to force Rodin or the current SAM3D path to become that system, we will spend a lot of time and still end up below the target.

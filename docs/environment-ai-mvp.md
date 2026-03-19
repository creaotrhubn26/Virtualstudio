# Environment AI MVP

## Goal

Turn Virtualstudio from a preset browser into a system that can take:

- a text prompt
- one or more reference images

and return a structured `EnvironmentPlan` that the current studio can partly apply today, while making the missing capabilities explicit.

## What Was Added

- `backend/environment_planner_service.py`
  - Gemini-backed planner with local fallback heuristics
  - supports prompt-only and prompt+image planning
- `POST /api/environment/plan`
  - generates an `EnvironmentPlan`
- `GET /api/environment/planner/status`
  - tells the frontend whether live Gemini planning is active
- `src/core/models/environmentPlan.ts`
  - shared frontend model for the planner payload
- `src/services/environmentPlannerService.ts`
  - fetches plan data and applies the shell-compatible parts
- `src/components/AIEnvironmentPlannerDialog.tsx`
  - first UI entry point for prompt/image -> plan -> apply
- `src/main.ts`
  - now handles atmosphere application and a simple camera preset event

## Recommended AI Stack

### 1. Planner core

Use Gemini as the multimodal planner:

- `gemini-2.5-flash`
  - fast enough for interactive planning
  - good default for MVP
- `gemini-2.5-pro`
  - better for deeper scene reasoning and harder room interpretation
  - use for high-value planning or refinement passes

Role:

- prompt or image -> structured `EnvironmentPlan`
- identify shell-compatible parts
- identify missing modules instead of hallucinating full automation

### 2. Image understanding

Add these next:

- `SAM 2`
  - object/region segmentation
  - useful for walls, counters, furniture, windows, doors
- `Depth Anything V2`
  - monocular depth for room layout hints
  - useful for approximate camera distance and floor/wall inference
- optional room reconstruction layer
  - for exact image-to-room matching later

Role:

- reference photo -> approximate room layout + segmentation + scale hints

### 3. Asset intelligence

Build a Promethean-like layer:

- metadata index over local assets
- embeddings for tags, styles, categories, moods
- learned spatial relations
- retrieval first, generation second

Role:

- map plan terms like "pizza counter", "industrial lamp", "neon sign"
- choose existing assets before generating new ones

### 4. 3D generation

Use only for gaps:

- existing `Rodin` integration for single assets
- optionally `Hunyuan3D 2.x` for missing hero props

Role:

- generate only the missing hero objects, not the whole world

### 5. Virtual production / capture roundtrip

Use Lightcraft ideas here:

- USD/USDZ-friendly scene export
- locators for objects and shots
- scan/tracking/lens-calibration aware roundtrip

Role:

- move from "nice environment preview" to shootable virtual production workflow

## What We Can Learn From Others

### Promethean AI

Useful lessons:

- the valuable core is not just prompting
- the real moat is asset intelligence plus spatial composition knowledge
- keep asset metadata local and let AI reason over it

What to copy:

- local asset graph
- trainable composition memory
- retrieval-first scene assembly

### Lightcraft

Useful lessons:

- bridge DCC, scan, shoot and post instead of treating them as separate worlds
- use locators and structured scene data for handoff
- camera and set alignment are as important as pretty generation

What to copy:

- USD-oriented interchange
- shot-aware metadata
- scan and tracking hooks

### Genie 3

Useful lessons:

- world-sketch UX is compelling
- image upload + world remix is a strong frontend metaphor
- real value is fast ideation before exact assembly

What not to do:

- do not make the product depend on opaque frame-generation as the core runtime scene representation

Best use:

- inspiration for the UX layer
- not the authoritative editable scene format

## Data Model

Current MVP contract:

- `EnvironmentPlan`
  - concept
  - summary
  - room shell
  - wall/floor surface assignments
  - atmosphere
  - ambient sounds
  - prop suggestions
  - lighting suggestions
  - camera suggestion
  - compatibility report

This is intentionally explicit so we can:

- apply parts of the plan now
- validate it
- diff it
- store it
- hand it to later build modules

## API Roadmap

Already added:

- `GET /api/environment/planner/status`
- `POST /api/environment/plan`

Recommended next endpoints:

- `POST /api/environment/retrieve-assets`
  - `EnvironmentPlan -> ranked asset matches`
- `POST /api/environment/build-shell`
  - `EnvironmentPlan -> parametric room geometry`
- `POST /api/environment/generate-missing-assets`
  - `missing props -> 3D generation jobs`
- `POST /api/environment/validate`
  - validate collisions, scale, floor contact, prompt fidelity

## Build Order

### Phase 1

- done: prompt/image -> `EnvironmentPlan`
- done: apply shell-compatible surfaces and atmosphere
- done: expose planner status to UI

### Phase 2

- asset retrieval service
- prop placement suggestions mapped to real assets
- light rig application
- persistence of generated plans

### Phase 3

- reference image -> segmentation + depth + layout estimation
- camera placement from reference room
- exact wall/window/door inference

### Phase 4

- parametric room builder
- openings, wall lengths, ceiling types, cove, storefront, corridor
- shell no longer fixed to the current 20x20 room

### Phase 5

- USD/Lightcraft-style roundtrip
- scan/tracking aware workflows
- optional world-sketch provider abstraction for Genie-like experiences

## Current Limitation

This MVP does not yet:

- reconstruct a room exactly from a photo
- generate new geometry automatically
- auto-rig light suggestions into real lights
- auto-place props into the scene

It does give us the missing orchestration layer that the repo previously lacked:

- prompt or image -> explicit plan -> partial scene application -> honest gap report

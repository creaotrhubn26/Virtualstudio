# Virtual Studio - Professional 3D Lighting Simulator

## Overview
Virtual Studio is a professional, web-based 3D lighting simulation application built with Babylon.js. It provides photographers and filmmakers with a realistic environment to plan and visualize studio lighting setups, replicating the experience of desktop software within a web browser. The application aims to be an accessible and powerful tool for virtual photography with ambitions to integrate advanced AI features for avatar generation and storyboard creation, alongside an Academy learning platform and team collaboration tools.

## User Preferences
- Norwegian language for all UI labels
- Dark, professional UI design matching Set.a.Light 3D aesthetic
- Focus on realistic lighting simulation for photographers
- Interactive light placement with gizmos

## System Architecture
The application uses a hybrid architecture combining Vanilla TypeScript with Babylon.js for 3D rendering and core studio logic, and React for the user interface components. Zustand is is used for state management between React and Babylon.js.

**UI/UX Decisions:**
- The interface features a professional 3-panel layout: Equipment (left), Viewport (center), and Properties (right), with a dark theme.
- Responsive design with a 5-tier breakpoint system ensures adaptability across devices, including touch-friendly interactions.
- Accessibility (WCAG 2.2 Level AA+) is a core design principle, incorporating ARIA labels, focus indicators, reduced motion, and high contrast support.
- Modern UI elements like spring-effect animations, gradient backgrounds, and redesigned interactive components enhance the user experience.

**Technical Implementations & Features:**
- **Realistic Lighting System:** Simulates 17 professional lights with accurate specifications.
- **LightingPhysics Engine (src/core/LightingPhysics.ts):** Research-backed physically accurate lighting calculations:
  - **Inverse Square Law:** I = I₀ × (d₀/d)² with proper radiometric/photometric units
  - **Luminous Intensity:** Candela calculation from lumens with solid angle correction for beam angles
  - **EV Calculation:** ISO 2720:1974 compliant exposure value with calibration constant C=250
  - **F-stop Equivalents:** Real photography-style stop calculations (doubling distance = -2 stops)
  - **Light Meter:** Combines multiple sources with proper falloff, returns EV, lux, stops difference
  - **Falloff Visualization:** Distance rings at 1x, 1.4x, 2x, 2.8x, 4x with percentage labels
  - **Lighting Ratio:** Key:fill ratio calculation (1:1 flat to 8:1+ dramatic)
  - **Group Lighting:** Optimal distance calculation for even illumination across rows
  - **Color Temperature:** Kelvin to RGB conversion based on Planckian locus (1000K-40000K)
- **Equipment Panel:** Library of lights, modifiers, stands, backgrounds, and props with filters and search.
- **Viewport:** Displays a 3D studio, camera info, histogram, light indicators, 2D top view, focal length controls, and interactive light placement gizmos. Includes professional helper guide overlays and interactive viewfinder focus points.
- **AutoFocus System (Øye-AF):** Professional autofocus with three modes:
  - **MF (Manuell):** Full manual focus control
  - **AF-S (Enkelt):** Single focus that locks on target
  - **AF-C (Kontinuerlig):** Continuous tracking of subjects
  - Smart geometry-based face detection for models without separate eye meshes
  - Eye priority selection (nearest, left, right)
  - Visual focus frame indicator and smooth focus transitions
  - DOF integration: Focus distance automatically updates depth of field rendering based on camera aperture
- **Focus Peaking:** Real-time visual focus aid using Sobel edge detection:
  - Highlights sharp edges with configurable colors (red, green, blue, yellow, white)
  - Adjustable intensity and threshold settings
  - Depth-aware mode: Only highlights edges in the DOF focus range
  - Integrates with aperture settings - wider apertures show narrower focus zones
- **Physics-Based DOF (PhysicsBasedDOF):** Research-grade depth of field rendering based on optical physics:
  - Accurate Circle of Confusion (CoC) formula: CoC = |A × f × (S - D) / (D × (S - f))|
  - Full-frame sensor simulation (36mm width, 0.03mm CoC limit)
  - Two-pass rendering: CoC calculation pass + gather-based blur with 22-sample Poisson disk
  - Depth-aware weighting prevents background bleeding into foreground
  - Responds to camera aperture, focal length, and focus distance
  - Integrated with AutoFocus system for real-time DOF updates
- **Properties Panel:** Allows selection-specific adjustments for lights (position, rotation, CCT, modifier settings, IES, Gobo, Focus) and cameras (Aperture, Shutter, ISO, ND), along with a light meter.
- **Virtual Actor Panel:** Generates and customizes 3D actors with adjustable parameters, presets, and integration with Meta SAM 3D Body for realistic avatar creation from images.
- **Asset Loading:** Comprehensive system for loading 3D assets (characters, props, modifiers, accessories, HDRI environments) with drag-and-drop.
- **Animation Engine:** Utilizes a `SceneGraphAnimationEngine` for keyframe-based animations, a `SkeletalAnimationService` for IK/FK/blend-shape character animation, and a `CinematicDirectorService` for pre-built cinematic camera sequences (orbit, dolly, crane, dramatic low-angle, pull-back reveal, and scene-specific Hollywood Studio / Napoli Dreams shots) using Babylon.js native `Animation.CreateAndStartAnimation`.
- **Cinematic Director Panel:** `src/components/CinematicDirectorPanel.tsx` — compact panel integrated into the Scener tab showing playable cinematic shots filtered by scene type (hollywood / napoli / all), with progress tracking, category filters, and play/stop controls.
- **Project Management:** Includes project name editing, undo/redo, resolution selection, PDF export, custom preset system, and a "Scener" tab for scenario presets.
- **NotesPanel:** Professional solution for creating, editing, and deleting categorized notes with localStorage persistence.
- **Academy Learning Platform:** A comprehensive learning and course creation platform with components for dashboards, course management, video annotation, and instructor revenue tracking.
- **Team Collaboration Features:** Includes a PWA with offline capabilities, a Kanban-style Team Dashboard, real-time activity logging, and a push notification system.
- **Tutorial & Onboarding System:** Dynamic profession-specific onboarding, an interactive tutorial system with animated mouse pointers and DOM element anchoring, and an admin-only tutorial editor for full CRUD operations.

**System Design Choices:**
- **State Management:** Zustand manages application state and communication between React and Babylon.js.
- **Modularity:** Project structure emphasizes modularity with dedicated services.
- **Event System:** Custom events facilitate communication between the UI and the 3D engine.
- **Backdrop Loading System:** Babylon.js-native backdrop loading with support for seamless paper backdrops and cyclorama environments.
- **AI Model Integration:** Full Meta SAM 3D Body model integration for realistic 3D avatars, including automatic texture extraction. Optional FaceXFormer for facial analysis and DECA for detailed facial texture enhancement.
- **Mesh Texture Pipeline:** Orchestrated pipeline combining SAM 3D Body, FaceXFormer, DECA, and texture extraction for high-quality GLB export.
- **Hyper3D Rodin Integration:** Text-to-3D model generation via Rodin API.
- **Storyboard AI Image Generation:** Generates professional storyboard frames using OpenAI gpt-image-1 via Replit AI Integrations with various visual style templates.

## Database Architecture
PostgreSQL database with comprehensive table structure:

**Virtual Studio Tables (studio_*):**
- `studio_scenes` - Saved 3D studio scenes with lighting setups
- `studio_presets` - Lighting, camera, and other presets
- `studio_light_groups` - Grouped light configurations
- `studio_user_assets` - User-uploaded 3D models, textures, HDRI
- `studio_scene_versions` - Scene version history
- `studio_notes` - Project notes with categories
- `studio_camera_presets` - Camera settings presets
- `studio_export_templates` - PDF/image export templates

**Virtual Studio Tables (casting_*):**
- `casting_favorites` - User favorites per project (candidates, roles, crew, etc.)
- `casting_projects` - Casting projects with metadata
- `casting_candidates` - Casting candidates with role assignments and workflow status
- `casting_roles` - Role definitions for projects
- `casting_crew` - Crew members with departments
- `casting_locations` - Filming locations
- `casting_props` - Props and equipment
- `casting_schedules` - Audition and production schedules
- `casting_offers` - Contract offers with status tracking
- `casting_contracts` - Signed contracts with terms
- `casting_calendar_events` - Production calendar with crew assignments and conflict detection
- `casting_crew_availability` - Crew availability periods (available/unavailable/tentative)
- `casting_crew_notifications` - Notification system for crew members (in_app/email/push)

**Virtual Studio API Endpoints:**
- `/api/studio/scenes` - Scene CRUD operations
- `/api/studio/presets` - Preset management
- `/api/studio/light-groups` - Light group operations
- `/api/studio/assets` - User asset library
- `/api/studio/notes` - Notes management
- `/api/studio/camera-presets` - Camera preset operations
- `/api/studio/export-templates` - Export template management

**Virtual Studio API Endpoints:**
- `/api/casting/projects` - Project CRUD operations
- `/api/casting/favorites/{project_id}/{type}` - Favorites management
- `/api/casting/candidates` - Candidate management
- `/api/casting/roles` - Role management
- `/api/casting/crew` - Crew management
- `/api/casting/locations` - Location management
- `/api/casting/props` - Props management
- `/api/casting/schedules` - Schedule management

**Frontend Services:**
- `src/services/virtualStudioApiService.ts` - Typed API client for Virtual Studio
- `src/services/castingApiService.ts` - Typed API client for Virtual Studio

## Story Scenes — "Napoli Dreams"

A dedicated **Story** category in the Scener panel with four connected story-based scenes for a pizza restaurant brand:

- **Akt 1 – Restauranten** (`story-napoli-akt1-restaurant`): Warm candlelight atmosphere, tungsten practical lights (2700–3200K), 7-light rig including candle simulations. 85mm food photography setup.
- **Akt 2 – Produktfotografering** (`story-napoli-akt2-produktfoto`): Clean professional food studio. Top-down overhead octabox (5600K), 6-light rig, shooting-table backdrop. 100mm macro camera setup.
- **Akt 3 – Chef-videostudio** (`story-napoli-akt3-video`): Branded video studio, bicolor LED three-point rig (4200–5600K + warm background accent). 7-light rig optimized for video. 50mm interview framing.
- **Akt 4 – Utendørs piazza** (`story-napoli-akt4-piazza`): Outdoor Neapolitan city piazza scene. VirtualCity.glb environment (KhronosGroup CC-BY) + Venice Sunset HDRI from Poly Haven (CC0, 2K). Warm golden-hour natural light rig (3800K key, 6500K sky fill). 35mm wide-angle framing. `hdriUrl: '/hdri/venice_sunset_2k.hdr'` triggers `vs-load-hdri` event automatically on load.

Story scenes appear in `src/data/scenarioPresets.ts` under `kategori: 'story'`. The ScenerPanel shows a story arc banner and per-card "AKT X/4" badge when this category is active. Category color: `#ff6d00` (amber-orange).

### Environment + HDRI System for Outdoor Scenes
- `ScenarioPreset.hdriUrl?: string` — optional HDRI path for outdoor scenes
- `storySceneLoaderService.ts` fires `vs-load-hdri` event automatically when `preset.hdriUrl` is set (Phase 0b, after GLB load)
- `HDRIEnvironmentLoader.tsx` handles the `vs-load-hdri` event: downloads/caches .hdr, applies as `scene.environmentTexture`
- HDRI files stored in `public/hdri/` (served at `/hdri/`)

## GLB Generation Pipeline (TripoSR)

A complete image-to-3D pipeline using TripoSR via Replicate API:
- **Service**: `backend/triposr_service.py` — handles image upload, Replicate prediction lifecycle, GLB download and local caching
- **Routes**: `POST /api/triposr/generate`, `GET /api/triposr/status/{job_id}`, `POST /api/triposr/download/{job_id}`, `GET /api/triposr/model/{filename}`, `GET /api/triposr/models`
- **Frontend service**: `src/services/glbGeneratorService.ts` — full pipeline wrapper with progress callbacks
- **Frontend UI**: `src/components/GLBGeneratorDialog.tsx` — drag-and-drop image upload, background removal toggle, polling progress bar, add-to-scene action
- **Entry point**: "Bilde → 3D" button in the Library panel (cyan outlined button next to "Generer 3D")
- **Requires**: `REPLICATE_API_TOKEN` environment secret (set via Secrets tab)
- **Model**: `stability-ai/triposr` on Replicate (~60–120 seconds per generation)
- **Output**: GLB files saved in `backend/triposr_models/`, served via `/api/triposr/model/`

## Story Scenes & Multiview Skeleton

### Schema & Data
- **Schema extensions**: `StoryCharacterManifest` (id, role, avatarType, poseId, position, rotation, height, label) and `StoryPropManifest` (id, propId, position, rotation, scale, label) interfaces added to `ScenarioPreset`.
- **Story presets** (`src/data/scenarioPresets.ts`): All four "Napoli Dreams" presets (Akt 1–4) have full `characters[]` and `props[]` manifests. Akt1 → 3 chars + 8 props (waiter, guest, bakemester, dining table, chairs, pizza, candles, counter). Akt2 → 2 chars + 6 props (baker assistant, food photographer, shooting table, reflectors). Akt3 → 2 chars + 5 props (chef, interviewer, broadcast chair, podium, monitor). Akt4 → 3 chars + outdoor props.

### Prop Rendering
- **Restaurant prop definitions** (`src/core/data/propDefinitions.ts`): `dining-table`, `wooden-chair-restaurant`, `pizza-plate`, `candle-holder`, `chef-counter`, `wine_bottle_red`, `shooting-table-studio`, `broadcast-chair`, `podium-branded` — all with procedural Babylon.js primitive fallbacks when GLB files are not found.
- **`propRenderingService.loadStorySceneProps(manifests, onProgress)`**: Iterates manifest, resolves propDef, positions/rotates/scales each mesh, auto-corrects Y to land the prop's bottom face at the target height.

### StorySceneLoaderService (`src/services/storySceneLoaderService.ts`)
Phase-based async scene loader (Phase 0a clear → 0b environment GLB → 1 lights → 2 props → 3 characters → 4 poses → done):
- Dispatches `ch-clear-story-characters` then `ch-load-story-character` per manifest character
- Waits up to 10 s for `ch-story-rig-ready` events mapping storyRigId → rigId
- Applies PoseLibrary presets deterministically using `setBoneRotation`
- Emits `ch-story-scene-loaded` when complete
- Exposed as `window.__storyLoader.loadById(presetId)` for Playwright E2E testing

### MultiviewSkeletonPanel (`src/panels/MultiviewSkeletonPanel.tsx`)
Full-screen overlay with real Babylon.js multi-camera rendering:
- 4 `ArcRotateCamera` instances registered via `engine.registerView()` (Front α=π, Side α=π/2, 3/4 α=3π/4, Back α=0)
- Babylon.js `SkeletonViewer` activated on the active character's mesh (scoped to that rig)
- SVG overlay with clickable joint handles (16 joints × 4 views) for bone selection
- IK drag handles (diamond markers at wrist/ankle end-effectors) — pointer drag translates to bone position deltas
- Layout modes: 2×2 grid, 1-large + 3-pip, single fullscreen
- Top toolbar: layout switch, skeleton toggle, character selector, reset-pose

### BoneInspectorSidebar (`src/panels/BoneInspectorSidebar.tsx`)
Collapsible right sidebar when a bone is selected:
- 5 bone groups (Hode & rygg, Venstre arm, Høyre arm, Venstre bein, Høyre bein)
- Per-bone XYZ rotation sliders (−π to +π) + position offset sliders for IK chains
- Pose library browser: 6 relevant poses shown per scene type; clicking instantly applies
- IK enable/disable toggle, skeleton overlay toggle, live rig indicator

### ScenerPanel integration
- "Last mal" button on story presets calls `storySceneLoaderService.load()` with phase progress bar (lights → props → characters → done)
- "🎬 Åpne Multiview" button appears on story cards with characters — opens MultiviewSkeletonPanel overlay
- Napoli Dreams story arc banner in ScenerPanel (amber #ff6d00 accent)

## Photorealistic Napoli Characters
Six photorealistic 3D character GLBs generated for the Napoli Dreams story (stored in `public/models/avatars/`):
- `avatar_bakemester.glb` — Italian master baker (white chef coat, toque hat)
- `avatar_waiter.glb` — Restaurant waiter (formal black & white uniform)
- `avatar_customer_woman.glb` — Female restaurant guest (casual elegant)
- `avatar_customer_man.glb` — Male restaurant guest (smart casual)
- `avatar_baker_assistant.glb` — Female bakery assistant (white uniform, hair net)
- `avatar_food_photographer.glb` — Male food photographer (creative casual)

All 6 are registered in `src/core/data/avatarDefinitions.ts` as named avatar types. The Napoli presets use specific types: Akt1 → `waiter` + `customer_woman` + `bakemester`; Akt2 → `baker_assistant` + `food_photographer`; Akt3 → `bakemester` + `customer_woman`.

## Scene Branding (Merkevarebygging)
The Napoli Dreams banner in ScenerPanel includes a collapsible **Merkevarebygging** section:
- Fields: company name, logo URL (PNG/SVG), brand color picker
- On "Bruk i scene": dispatches `ch-apply-scene-branding` event with `{ companyName, logoUrl, brandColor }`
- Handler in `src/main.ts`: creates a `__branding-sign__` plane (DynamicTexture with colored background + company name text), and if a logoUrl is provided, a `__branding-logo__` plane with the logo texture at `StandardMaterial.emissiveColor = white` (unlit, always visible)
- Re-applying replaces existing sign; clearing both fields removes all branding meshes

## Data Library Improvements (March 2026 — Comprehensive Quality Pass)

### Light & Modifier Data
- **lightFixtures.ts**: 30+ fixtures incl. Aputure, Nanlite, Godox, ARRI SkyPanel, Westcott, Profoto — all with Norwegian descriptions
- **LightsBrowser.tsx**: 6 light categories, 11 modifier categories, Westcott + ARRI brands, 12 new modifier entries — all duplicate blocks removed
- **LightPatternLibrary.tsx**: 9→17 patterns with category filter UI chips; includes broad/short/fashion-rim/beauty-dish/editorial-gel/window-light/product-packshot
- **cinematographyPatternsService.ts**: 23→35 patterns including ring-light, product-packshot, detective-noir, documentary-available, interview-corporate, beauty-dish-classic

### Scene & Environment Data
- **ScenePresets.tsx**: +6 new Norwegian presets: Svangerskapsportrett, Nyfødt fotografering, Dans/Ballett, Konseptfotografi, Boudoir, Bord/Makrofotografi
- **environmentPresets.ts**: +10 new presets — Fantasy (throne room, enchanted forest, wizard study, ancient ruins), Nature (golden hour, overcast, desert dunes), Cinematic (Wes Anderson, Tarantino)
- **backdropDefinitions.ts**: 10→28 entries (gel colors, greenscreen, reflectors)
- **floorDefinitions.ts**: Added 18% gray, semi-gloss white, vinyl options
- **wallDefinitions.ts**: Added 11 solid colors + 9 gradients

### Gobo Library
- **goboDefinitions.ts**: 6→20 gobos — added arched window, prison bars, diamond lattice, forest canopy, palm fronds, starburst, honeycomb, industrial grate, heavy breakup, soft clouds, circular vignette, venetian diagonal, cobweb, brick wall

### Equipment & Gear Data
- **EquipmentCatalog.tsx**: +10 items — light meter, color checker, clapperboard, field monitor, 5-in-1 reflector, large diffusion frame, sandbag, flag set, shooting table, V-flat
- **photo-camera-database.ts**: 6→22 cameras — Sony, Canon, Nikon, Fujifilm, Hasselblad, Leica (medium format + APS-C)
- **video-camera-database.ts**: 5→19 cameras — Sony Cinema Line, Canon Cinema EOS, Blackmagic, RED, ARRI, Nikon, Panasonic; with logFormat fields
- **memory-card-database.ts**: 4→17 cards — CFexpress A/B, SD V90/V60/V30, CFast 2.0, CompactFlash; with utility functions

### Sounds & Atmosphere
- **soundDefinitions.ts**: +12 new sounds — studio AC hum, silent room, camera shutter (burst/single), fireplace, cathedral ambience, water stream, morning birds, desert wind, crowd, magical tones

### Rendering Quality (main.ts)
- Floor PBR: `maxSimultaneousLights=8`, `usePhysicalLightFalloff=true`, normalMap bump=0.85, reflectivity clamped to 1.0
- Wall PBR: `maxSimultaneousLights=8`, `usePhysicalLightFalloff=true`, normalMap bump=0.75

## External Dependencies
- **@babylonjs/core, @babylonjs/loaders, @babylonjs/gui**: 3D engine and related components.
- **react, react-dom**: Core libraries for the user interface.
- **@mui/material, @emotion/react**: Material UI components and styling.
- **zustand**: State-management solution.
- **vite**: Development server and build tool.
- **typescript**: Static type checking.
- **torch, torchvision**: PyTorch for ML models (CPU-only support).
- **trimesh**: 3D mesh manipulation and GLB export.
- **opencv-python**: Image processing.
- **numpy, scipy**: Numerical computing.
- **pillow**: Image handling.
- **boto3**: Cloudflare R2 / S3-compatible API access for ML model storage.
- **OpenAI API**: For storyboard AI image generation.
- **Rodin API**: For Hyper3D text-to-3D model generation.
# Virtual Studio - Professional 3D Lighting Simulator

## Overview
A professional web-based virtual photography studio application built with Babylon.js. Designed to simulate studio lighting setups for photographers and filmmakers, with a UI similar to Set.a.Light 3D but accessible directly in the browser.

## Current State
- **Framework**: Babylon.js v8.42+ with WebGL2
- **UI**: Professional 3-panel layout (Equipment | Viewport | Properties)
- **Server**: Vite dev server on port 5000
- **Language**: Norwegian UI labels

## Features

### Equipment Panel (Left)
- Equipment library with brand lights (Godox AD600Pro, Profoto B10, Aputure LS 120d II)
- Modifiers (Softbox, Umbrella, Reflector)
- Category filters (Lights, Modifiers, Stands & Grip, Backgrounds, Props)
- Search functionality
- Scene object list

### Viewport (Center)
- 3D studio environment with ground, walls, and grid
- Camera info overlay (name, exposure settings)
- Histogram display
- Light indicator showing key light info
- 2D Top View with light positions and camera
- Focal length controls (24, 35, 50, 85, 135mm)

### Properties Panel (Right)
- Selection info with light name and type
- Position controls (X, Y, Z)
- Rotation controls
- CCT (Color Temperature) selector
- Modifier settings
- Size, contrast, IES, Gobo, Focus sliders
- Camera settings (Aperture, Shutter, ISO, ND)
- Light meter display (lux and calculated EV)
- Export buttons (PNG, Compare A/B)

### Realistic Lighting System
- 17 professional lights with accurate specifications
- Lux output at 1 meter for LED continuous lights
- Guide numbers and lumen-seconds for strobes
- CRI/TLCI color accuracy ratings
- Beam angle specifications
- Inverse square law light falloff calculation
- Real-time light meter readings at subject position

### Top Bar
- Project name (editable)
- Undo/Redo buttons
- Resolution and camera selection
- Export PDF button

### Virtual Actor Panel
- Collapsible "Virtuell Aktør" section in left sidebar
- Body parameters (age, gender, height, weight, muscle)
- Appearance customization (skin tone, hair style)
- Actor presets library
- Glasses selector
- Generate button to create 3D actor mesh in scene

## Architecture
- **Hybrid design**: Vanilla TypeScript Babylon.js + React components
- **State management**: Zustand store bridges React and Babylon.js
- **Animation engine**: SceneGraphAnimationEngine for keyframe-based animations
- **Scene integration**: virtualActorService provides fallback capsule meshes
- **Future**: Python ML service integration for Anny parametric body model

## Project Structure
```
/
├── src/
│   ├── main.ts                         # Main Babylon.js application with studio logic + asset events
│   ├── styles.css                      # Professional dark theme UI styling
│   ├── App.tsx                         # React root (App, TimelineApp, AssetLibraryApp, CharacterLoaderApp)
│   ├── state/
│   │   └── store.ts                    # Zustand store for state management
│   ├── core/
│   │   ├── animation/
│   │   │   └── SceneGraphAnimationEngine.ts  # Animation engine with easing functions
│   │   ├── data/
│   │   │   └── propDefinitions.ts      # Prop catalog with furniture, backdrops, decorations
│   │   ├── models/
│   │   │   └── scene.ts                # Scene node types and transform utilities
│   │   └── services/
│   │       ├── virtualActorService.ts  # Actor mesh generation service
│   │       ├── propRenderingService.ts # Prop loading and rendering service
│   │       ├── assetLibrary.ts         # Asset library with favorites and usage tracking
│   │       └── logger.ts               # Logging service
│   ├── components/
│   │   ├── ActorMesh.tsx               # Actor parameter controls panel
│   │   └── PropMesh.tsx                # Prop selection and scaling panel
│   ├── panels/
│   │   ├── KeyframeTimeline.tsx        # React keyframe timeline editor
│   │   ├── VirtualActorPanel.tsx       # Actor configuration panel
│   │   ├── CharacterModelLoader.tsx    # Character selection with pose library
│   │   ├── AssetLibraryPanel.tsx       # Asset library with drag & drop
│   │   ├── GlassesSelector.tsx         # Glasses selection component
│   │   └── ActorLibraryPanel.tsx       # Actor presets library
│   └── data/
│       ├── actorPresets.ts             # Predefined actor presets
│       ├── hairStyles.ts               # Hair style configurations
│       └── glassesModels.ts            # Glasses model data
├── public/
│   └── models/                         # 3D model assets (GLB/GLTF)
│       ├── characters/                 # Character models
│       ├── props/                      # Furniture and props
│       ├── modifiers/                  # Light modifiers
│       ├── accessories/                # Accessories
│       └── hdri/                       # HDRI environments
├── index.html        # 3-panel layout structure
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── vite.config.ts    # Vite config (port 5000)
```

## Key Dependencies
- @babylonjs/core - 3D engine
- @babylonjs/loaders - GLB/GLTF model loading
- @babylonjs/gui - GUI components
- react, react-dom - UI components
- @mui/material, @emotion/react - Material UI styling
- zustand - State management
- vite - Dev server and bundler
- typescript - Type checking

## Development
Run `npm run dev` to start the development server on port 5000.

## User Preferences
- Norwegian language for all UI labels
- Dark, professional UI design matching Set.a.Light 3D aesthetic
- Focus on realistic lighting simulation for photographers
- Interactive light placement with gizmos

## Recent Changes
- 2025-12-22: Added "Legg til" buttons to all Studio Library tabs
  - CameraGearPanel: Add buttons for cameras and lenses with touch-friendly sizing
  - HDRIPanel: Add buttons for HDRI environments with responsive sizing
  - Consistent cyan accent color (#00a8ff) across all add buttons
  - Touch-optimized with 36px minimum height on tablet/touch devices
- 2025-12-22: Improved Studio Library button reliability
  - Event delegation with capture phase for immediate click handling
  - Debouncing to prevent rapid double-click issues
  - Early initialization before React/Babylon.js loads
- 2025-12-22: Enhanced Studio Library panel visual appearance
  - Spring-effect opening animation with cubic-bezier timing and opacity fade
  - Premium gradient background with rounded top corners and enhanced shadows
  - Redesigned resize handle with centered pill shape and glow on hover
  - Modernized tab bar with gradient, rounded tabs, and cyan active indicator
  - Improved content area with subtle gradients and better sidebar categories
  - Search input with focus states and rounded corners
  - Consistent cyan accent color system throughout panel
- 2025-12-22: Comprehensive responsive design improvements for Studio Library
  - Added CSS responsive tokens (--sidebar-left-width, --sidebar-right-width, --bottom-panel-height, --card-min-width)
  - 5-tier breakpoint system: Extra large (1440px+), Large (1280-1439px), Medium (1024-1279px), Tablet (768-1023px), Mobile (<768px)
  - Adaptive CSS Grid layout with auto-fill and minmax for card grids
  - Sidebars auto-collapse on tablet and mobile views
  - Bottom panel height adapts per breakpoint (45vh tablet, 50vh mobile portrait, 60vh mobile)
  - Updated LightsBrowser and AssetLibraryPanel with tiered useMediaQuery hooks
  - Mobile-optimized single-column card layout with horizontal card display
  - Touch-optimized controls with 44px+ minimum touch targets
- 2025-12-22: Touch-friendly Studio Library improvements for PC and iPad
  - Added "Legg til" buttons on all asset cards as alternative to double-click
  - Increased touch targets to 44px minimum for all interactive elements
  - Responsive breakpoints using useMediaQuery for tablet mode (768-1024px or pointer: coarse)
  - Scrollable tabs with proper overflow handling and scrollbar styling
  - Bottom panel resize handle with touch and mouse drag support
  - Fullscreen button for maximizing Studio Library panel
  - Close button with proper state management for reopening
  - Larger cards, fonts, and spacing on tablet/touch devices
  - ARIA labels and accessibility improvements (aria-expanded, aria-pressed)
- 2025-12-22: Moved light modifiers to LightsBrowser as separate category
  - Added 25 professional modifiers: softbox, octabox, stripbox, umbrella, beauty dish, reflector, grid, snoot, barn doors, diffuser
  - Brands: Profoto, Godox, Aputure, Westcott, Photoflex, Broncolor, Mola
  - Modifier specs: size, shape, stop loss, mount type (OCF, Bowens, Broncolor)
  - Tab-based UI: "Lyskilder" and "Lysformere" tabs in LIGHTS panel
  - Norwegian labels for modifier types
  - Event system: 'ch-add-modifier' for Babylon.js integration
- 2025-12-22: Added realistic camera and lens specifications
  - Camera specs: sensor size, base ISO, dynamic range (EV), color depth, flash sync speed, IBIS rating, burst fps
  - Lens specs: min aperture, min focus distance, weight, filter size
  - 6 camera bodies: Sony A7 IV, Canon R5, Nikon Z8, Fujifilm X-H2S, Hasselblad X2D 100C, Phase One IQ4
  - 15 lenses: Prime, Zoom, Macro, Tele, Probe types from Sony, Canon, Nikon, Sigma, Zeiss, Laowa
  - Cards now display DR, ISO range, sync speed, IBIS for cameras
  - Cards now display aperture range, weight, min focus distance, filter size for lenses
- 2025-12-22: Implemented realistic lighting specifications and light meter
  - Added technical specs for 17 lights: lux@1m, guide number, CRI/TLCI, beam angle, lumens
  - Created addLightWithSpecs() for accurate light intensity based on real specs
  - Inverse square law calculation for light falloff (lux = lux1m / distance^2)
  - Real-time light meter display showing lux at subject position
  - Calculated EV based on incident light
  - Light cards show CRI, guide number, lux output, beam angle
  - Thumbnail images for all lighting equipment brands
- 2025-12-22: Integrated LightsBrowser, CameraGearPanel, and HDRIPanel into Studio Library
  - LightsBrowser: 17 professional lights (Godox, Profoto, Aputure), search/filter, favorites
  - CameraGearPanel: Exposure controls (aperture, ISO, shutter speed), lens presets, EV readout
  - HDRIPanel: 6 environment presets with category filtering, intensity/rotation controls
  - Tab switching now includes TIMELINE, MODELS, LIGHTS, CAMERA GEAR, EQUIPMENT, ASSETS, HDRI
  - All panels use Zustand store and CustomEvent system for Babylon.js communication
- 2025-12-22: Integrated asset panels into Studio Library bottom panel
  - MODELS tab now uses React CharacterModelLoader with pose library
  - Added ASSETS tab with React AssetLibraryPanel component
  - Mounted both components from App.tsx with AssetLibraryApp and CharacterLoaderApp
- 2025-12-22: Implemented comprehensive 3D asset loading system
  - Created AssetLibraryPanel with drag & drop and manual placement
  - CharacterModelLoader with 6 character types and pose library
  - Asset event system (ch-add-asset, ch-load-character, ch-apply-pose)
  - propRenderingService for Babylon.js mesh loading
  - assetLibraryService with favorites and usage tracking
  - Model folder structure (characters, props, modifiers, accessories, hdri)
- 2025-12-22: Integrated React KeyframeTimeline component
  - Created SceneGraphAnimationEngine with easing functions
  - Multi-track timeline with keyframe editing
  - Drag & drop keyframe support
  - Zoom/scroll navigation
  - Playback controls
  - Track enable/disable
  - Keyframe edit dialog with easing selection
- 2025-12-22: Implemented per-axis keyframe controls
  - Independent X, Y, Z keyframe buttons
  - Flexible axis grouping selection
  - Camera centering on object reset
- 2025-12-22: Implemented WCAG 2.2 Level AA+ accessibility compliance
  - Skip link for keyboard navigation
  - Proper ARIA labels, roles, and states throughout
  - Focus indicators with :focus-visible
  - Reduced motion support (@prefers-reduced-motion)
  - High contrast mode support (@prefers-contrast: more)
  - Windows High Contrast mode support (@forced-colors: active)
  - Minimum 24x24px touch targets
  - Semantic HTML structure with proper headings
  - Screen reader compatible tree view for hierarchy
  - Visually hidden labels for form elements
- 2025-12-22: Replaced emojis with professional SVG studio icons
- 2025-12-22: Enhanced Scene Hierarchy with thumbnails and improved UI
- 2025-12-22: Integrated Virtual Actor Panel with React/MUI
  - Added React mounting in main.ts alongside Babylon.js
  - Created VirtualActorPanel with body parameters and appearance controls
  - Implemented Zustand store for state management
  - Added virtualActorService for actor mesh generation
  - Connected actor generation to 3D scene
- 2024-12-22: Complete UI redesign to match Set.a.Light 3D style
- Implemented 3-panel professional layout
- Added equipment library with brand names
- Added 2D top view visualization
- Added camera controls (aperture, shutter, ISO, ND)
- Added light properties panel with CCT, modifier, IES controls
- Added focal length controls
- Added histogram display

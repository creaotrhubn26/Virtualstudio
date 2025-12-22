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
- Export buttons (PNG, Compare A/B)

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
│   ├── main.ts                         # Main Babylon.js application with studio logic
│   ├── styles.css                      # Professional dark theme UI styling
│   ├── App.tsx                         # React root component (App + TimelineApp)
│   ├── state/
│   │   └── store.ts                    # Zustand store for state management
│   ├── core/
│   │   ├── animation/
│   │   │   └── SceneGraphAnimationEngine.ts  # Animation engine with easing functions
│   │   └── services/
│   │       ├── virtualActorService.ts  # Actor mesh generation service
│   │       └── logger.ts               # Logging service
│   ├── panels/
│   │   ├── KeyframeTimeline.tsx        # React keyframe timeline editor
│   │   ├── VirtualActorPanel.tsx       # Actor configuration panel
│   │   ├── GlassesSelector.tsx         # Glasses selection component
│   │   └── ActorLibraryPanel.tsx       # Actor presets library
│   └── data/
│       ├── actorPresets.ts             # Predefined actor presets
│       ├── hairStyles.ts               # Hair style configurations
│       └── glassesModels.ts            # Glasses model data
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

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

## Project Structure
```
/
├── src/
│   ├── main.ts       # Main Babylon.js application with studio logic
│   └── styles.css    # Professional dark theme UI styling
├── index.html        # 3-panel layout structure
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── vite.config.ts    # Vite config (port 5000)
```

## Key Dependencies
- @babylonjs/core - 3D engine
- @babylonjs/loaders - GLB/GLTF model loading
- @babylonjs/gui - GUI components
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
- 2024-12-22: Complete UI redesign to match Set.a.Light 3D style
- Implemented 3-panel professional layout
- Added equipment library with brand names
- Added 2D top view visualization
- Added camera controls (aperture, shutter, ISO, ND)
- Added light properties panel with CCT, modifier, IES controls
- Added focal length controls
- Added histogram display

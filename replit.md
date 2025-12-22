# Virtual Studio - 3D Lighting Simulator

## Overview
A web-based virtual photography studio application built with Babylon.js. Designed to simulate studio lighting setups for photographers and filmmakers, similar to Set.a.Light 3D but accessible directly in the browser.

## Current State
- **Framework**: Babylon.js v8.42+ with WebGL2
- **UI**: Custom HTML/CSS sidebar panel
- **Server**: Vite dev server on port 5000

## Features
- 3D studio environment with ground and grid
- Multiple light types: Spotlight, Point Light, Area Light (Softbox)
- Interactive light placement and selection
- Light controls: intensity, color adjustment
- GLB/GLTF 3D model import
- Camera FOV adjustment
- Screenshot export
- Background color customization
- Grid visibility toggle

## Project Structure
```
/
├── src/
│   ├── main.ts       # Main Babylon.js application
│   └── styles.css    # UI styling
├── index.html        # Entry point
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── vite.config.ts    # Vite config
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
- Norwegian language for UI labels
- Dark, modern UI design
- Focus on realistic lighting simulation

## Recent Changes
- 2024-12-22: Initial project setup with Babylon.js
- Created basic studio environment
- Implemented light system (spotlight, point, area)
- Added GLB model import functionality
- Built control panel UI

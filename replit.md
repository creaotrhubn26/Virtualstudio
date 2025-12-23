# Virtual Studio - Professional 3D Lighting Simulator

## Overview
Virtual Studio is a professional, web-based 3D lighting simulation application built with Babylon.js. Its primary purpose is to provide photographers and filmmakers with a realistic environment to plan and visualize studio lighting setups. The application aims to replicate the user experience of desktop software like Set.a.Light 3D, but directly within a web browser, offering an accessible and powerful tool for virtual photography.

## User Preferences
- Norwegian language for all UI labels
- Dark, professional UI design matching Set.a.Light 3D aesthetic
- Focus on realistic lighting simulation for photographers
- Interactive light placement with gizmos

## System Architecture
The application employs a hybrid architecture, combining Vanilla TypeScript with Babylon.js for 3D rendering and core studio logic, and React for the user interface components. State management between React and Babylon.js is handled efficiently using Zustand.

**UI/UX Decisions:**
- The interface features a professional 3-panel layout: Equipment (left), Viewport (center), and Properties (right).
- A dark theme is applied throughout the UI, with a focus on professional aesthetics similar to Set.a.Light 3D.
- Responsive design principles are applied using a 5-tier breakpoint system to ensure adaptability across various devices, including touch-friendly interactions for tablets and mobile.
- Accessibility (WCAG 2.2 Level AA+) is a core design principle, incorporating ARIA labels, focus indicators, reduced motion, and high contrast support.
- Modern UI elements such as spring-effect animations, gradient backgrounds, and redesigned interactive components (e.g., resize handles, tab bars) enhance the user experience.

**Technical Implementations & Features:**
- **Realistic Lighting System:** Incorporates 17 professional lights with accurate specifications (lux@1m, guide number, CRI/TLCI, beam angle). It uses the inverse square law for light falloff calculations and provides real-time lux and EV readings via a light meter.
- **Equipment Panel:** Features an extensive library of lights (Godox, Profoto, Aputure), modifiers (softboxes, umbrellas), stands, backgrounds, and props, with category filters and search.
- **Viewport:** Displays a 3D studio environment, camera information, histogram, light indicators, and a 2D top view. It includes focal length controls and interactive light placement gizmos.
- **Properties Panel:** Allows selection-specific adjustments for lights (position, rotation, CCT, modifier settings, IES, Gobo, Focus) and cameras (Aperture, Shutter, ISO, ND), along with a light meter.
- **Virtual Actor Panel:** A collapsible section allowing users to generate and customize 3D actors with adjustable body parameters (age, gender, height, weight, muscle), appearance (skin tone, hair style), and presets.
- **Asset Loading:** A comprehensive system for loading 3D assets (characters, props, modifiers, accessories, HDRI environments) with drag-and-drop functionality and a dedicated asset library.
- **Animation Engine:** Utilizes a `SceneGraphAnimationEngine` for keyframe-based animations, supporting multi-track editing, easing functions, and playback controls.
- **Project Management:** Top bar includes project name editing, undo/redo, resolution selection, and PDF export.

**System Design Choices:**
- **State Management:** Zustand is used to manage application state and facilitate communication between React components and the Babylon.js scene.
- **Modularity:** The project structure emphasizes modularity with dedicated services for virtual actors, prop rendering, asset management, and logging.
- **Event System:** Custom events are used for communication between the UI (React) and the 3D engine (Babylon.js) to trigger actions like adding equipment or applying poses.
- **Future Integration:** Designed to integrate with a Python ML service for advanced parametric body models.

## External Dependencies
- **@babylonjs/core**: The primary 3D engine for rendering and scene management.
- **@babylonjs/loaders**: Used for loading various 3D model formats, including GLB/GLTF.
- **@babylonjs/gui**: Provides GUI components for Babylon.js.
- **react, react-dom**: Core libraries for building the user interface.
- **@mui/material, @emotion/react**: Material UI components and styling for a professional aesthetic.
- **zustand**: A small, fast, and scalable state-management solution.
- **vite**: Used as the development server and build tool.
- **typescript**: Provides static type checking for improved code quality and maintainability.

## Recent Changes
- 2025-12-23: Implemented professional NotesPanel solution
  - Popup panel accessible via "Notater" button in bottom bar
  - 5 categories: Generelt, Lys, Kamera, Modell, Oppsett (color-coded)
  - Full CRUD operations: create, edit, delete notes
  - localStorage persistence for notes
  - Touch-friendly 48px buttons and controls
  - Norwegian labels throughout
- 2025-12-23: Updated HDRI panel to touch-friendly design
  - 56px category filter buttons with icons
  - Inline search field for HDRI environments
  - Larger card buttons and hover effects
- 2025-12-23: Added 6 professional helper guide overlays to viewfinder
  - Color Temperature (Fargetemperatur) - Shows Kelvin scale 1800K-10000K with reference points
  - Exposure Zones (Eksponeringssoner) - Ansel Adams zone system with EV values
  - Height References (Høydereferanser) - Subject and camera height markers in cm
  - Glasses Reflection (Brillerefleksjoner) - Tips for avoiding eyeglass reflections
  - Class Photo (Klassefoto) - Row alignment and spacing guides for group photos
  - Safety Zones (Sikkerhetssoner) - Equipment clearance zones and cable routing
  - Helper guide button cycles through all 7 states (none + 6 guides)
  - All Norwegian text uses proper diacritics (å, ø, æ)
- 2025-12-23: Made viewfinder focus points interactive and draggable
  - Focus points can be moved anywhere in the viewport
  - Focus distance calculated via Babylon.js ray picking
  - Real-time focus distance display (in meters) at bottom center
  - Focus store (Zustand) manages mode, active point, and positions
  - FocusController handles drag events with pointer capture
  - Four focus modes: single, zone, wide, tracking
  - Safe area overlays (action safe, title safe) toggle
  - Third-grid overlay for composition
  - Camera/lens integration for DOF updates
- 2025-12-23: Implemented professional viewfinder overlay HUD
  - 3x3 focus point grid (zone mode) with center point activation
  - Center crosshair for precise framing
  - VIDEO/16:9 mode indicator at top center
  - Viewfinder controls: focus mode, safe area, grid toggle
  - Static HTML/CSS implementation for reliable Babylon.js integration
- 2025-12-23: Added unique thumbnail images for all 17 lights in LightsBrowser
  - Godox AD200 Pro (pocket flash), AD400 Pro (battery strobe), AD600 Pro (monolight)
  - Profoto B10 (compact cylindrical), B10 Plus (larger), D2 1000 (studio monolight)
  - Aputure LS 120d II (compact), 300d II (two-piece), 600d Pro (cinema), 60x (focusable spotlight)
  - Nanlite Forza 60 (compact), 300 II (system), 500 II (system)
  - Elinchrom ELC Pro HD 500, 1000 (studio strobes)
  - Broncolor Siros 400 S, 800 S (premium studio strobes)
  - All images based on manufacturer specifications and product research
- 2025-12-23: Added thumbnail images to all cameras and lenses in CameraGearPanel
  - 19 cameras (8 foto + 11 cine) now have unique product images
  - 15 lenses now have unique product images
  - All images stored in public/images/gear/
- 2025-12-22: Verified and updated all camera and lens specifications
  - All 11 cine cameras with accurate specs (sensor size, dynamic range, ISO, fps, codec)
  - All 15 lenses with verified specs (weight, filter size, min focus distance, optical elements)
  - Added Canon C80 (6K Full Frame BSI) and Canon C50 (7K Full Frame BSI)
- 2025-12-22: Added Foto/Cine category filter to Kamera tab in CameraGearPanel
  - Filter chips: Alle, Foto, Cine with icons
  - 8 foto cameras (Sony A7 IV, A1, Canon R5, Nikon Z8, Fujifilm X-H2S, Hasselblad X2D, Phase One IQ4, Leica SL3)
  - 11 cine cameras (ARRI ALEXA 35, ALEXA Mini LF, RED V-RAPTOR, KOMODO, Blackmagic URSA 12K, Sony VENICE 2, FX6, Canon C70, C80, C50, Panasonic S1H)
  - Cine cameras show recording resolution, max fps, and codec info
- 2025-12-22: Split CameraGearPanel into two internal tabs (Kamera and Linser)
  - Tab-based navigation with MUI Tabs component
  - Lens type filtering (Alle, Prime, Zoom, Makro, Tele, Probe)
- 2025-12-22: Converted Equipment tab to React component (EquipmentPanel.tsx)
  - 17 equipment items with category filtering
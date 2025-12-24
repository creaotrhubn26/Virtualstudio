# Virtual Studio - Professional 3D Lighting Simulator

## Overview
Virtual Studio is a professional, web-based 3D lighting simulation application built with Babylon.js. It provides photographers and filmmakers with a realistic environment to plan and visualize studio lighting setups, replicating the experience of desktop software within a web browser. The application aims to be an accessible and powerful tool for virtual photography.

## User Preferences
- Norwegian language for all UI labels
- Dark, professional UI design matching Set.a.Light 3D aesthetic
- Focus on realistic lighting simulation for photographers
- Interactive light placement with gizmos

## System Architecture
The application uses a hybrid architecture combining Vanilla TypeScript with Babylon.js for 3D rendering and core studio logic, and React for the user interface components. Zustand is used for state management between React and Babylon.js.

**UI/UX Decisions:**
- The interface features a professional 3-panel layout: Equipment (left), Viewport (center), and Properties (right), with a dark theme.
- Responsive design with a 5-tier breakpoint system ensures adaptability across devices, including touch-friendly interactions.
- Accessibility (WCAG 2.2 Level AA+) is a core design principle, incorporating ARIA labels, focus indicators, reduced motion, and high contrast support.
- Modern UI elements like spring-effect animations, gradient backgrounds, and redesigned interactive components enhance the user experience.

**Technical Implementations & Features:**
- **Realistic Lighting System:** Simulates 17 professional lights with accurate specifications and inverse square law for light falloff, providing real-time lux and EV readings.
- **Equipment Panel:** An extensive library of lights, modifiers, stands, backgrounds, and props with category filters and search.
- **Viewport:** Displays a 3D studio, camera information, histogram, light indicators, 2D top view, focal length controls, and interactive light placement gizmos. Includes professional helper guide overlays (e.g., Color Temperature, Exposure Zones, Height References, Safety Zones). Viewfinder focus points are interactive and draggable, with various focus modes and overlays (safe areas, grid).
- **Properties Panel:** Allows selection-specific adjustments for lights (position, rotation, CCT, modifier settings, IES, Gobo, Focus) and cameras (Aperture, Shutter, ISO, ND), along with a light meter.
- **Virtual Actor Panel:** Collapsible section for generating and customizing 3D actors with adjustable body parameters, appearance, presets, and automatic gender/age detection for avatar generation. Integrated with Meta SAM 3D Body for realistic 3D avatar creation from images (CPU-only).
- **Asset Loading:** Comprehensive system for loading 3D assets (characters, props, modifiers, accessories, HDRI environments) with drag-and-drop and a dedicated library.
- **Animation Engine:** Utilizes a `SceneGraphAnimationEngine` for keyframe-based animations.
- **Project Management:** Top bar includes project name editing, undo/redo, resolution selection, and PDF export. Features a custom preset system for Foto/Video setups and a "Scener" tab for scenario presets (e.g., Hollywood lighting patterns).
- **NotesPanel:** A professional solution for creating, editing, and deleting categorized notes, with localStorage persistence.
- **Touch-Friendly Controls:** Implemented for camera controls, HDRI panel, and various UI elements for enhanced tablet/mobile usability.

**System Design Choices:**
- **State Management:** Zustand manages application state and communication between React and Babylon.js.
- **Modularity:** Project structure emphasizes modularity with dedicated services.
- **Event System:** Custom events facilitate communication between the UI and the 3D engine.
- **SAM 3D Body Integration:** Full Meta SAM 3D Body model integration for generating realistic 3D avatars, running on CPU.

## External Dependencies
- **@babylonjs/core**: 3D engine for rendering.
- **@babylonjs/loaders**: For loading 3D model formats.
- **@babylonjs/gui**: GUI components for Babylon.js.
- **react, react-dom**: Core libraries for the user interface.
- **@mui/material, @emotion/react**: Material UI components and styling.
- **zustand**: State-management solution.
- **vite**: Development server and build tool.
- **typescript**: Static type checking.
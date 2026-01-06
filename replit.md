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
- **Realistic Lighting System:** Simulates 17 professional lights with accurate specifications and inverse square law.
- **Equipment Panel:** Library of lights, modifiers, stands, backgrounds, and props with filters and search.
- **Viewport:** Displays a 3D studio, camera info, histogram, light indicators, 2D top view, focal length controls, and interactive light placement gizmos. Includes professional helper guide overlays and interactive viewfinder focus points.
- **Properties Panel:** Allows selection-specific adjustments for lights (position, rotation, CCT, modifier settings, IES, Gobo, Focus) and cameras (Aperture, Shutter, ISO, ND), along with a light meter.
- **Virtual Actor Panel:** Generates and customizes 3D actors with adjustable parameters, presets, and integration with Meta SAM 3D Body for realistic avatar creation from images.
- **Asset Loading:** Comprehensive system for loading 3D assets (characters, props, modifiers, accessories, HDRI environments) with drag-and-drop.
- **Animation Engine:** Utilizes a `SceneGraphAnimationEngine` for keyframe-based animations.
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

**API Endpoints:**
- `/api/studio/scenes` - Scene CRUD operations
- `/api/studio/presets` - Preset management
- `/api/studio/light-groups` - Light group operations
- `/api/studio/assets` - User asset library
- `/api/studio/notes` - Notes management
- `/api/studio/camera-presets` - Camera preset operations
- `/api/studio/export-templates` - Export template management

**Frontend Services:**
- `src/services/virtualStudioApiService.ts` - Typed API client for all Virtual Studio database operations

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
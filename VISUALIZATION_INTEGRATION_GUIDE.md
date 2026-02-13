# Integrating Visualization Features with Existing Mock Data

## Overview

Your existing "troll mock" data in `create_shot_planner_mock_data.py` can be easily enhanced with the new visualization features. Here's how to wire them together.

## Current Mock Data Structure

Your mock scenes already have:
- ✅ Cameras with position, rotation, focal length
- ✅ Actors positioned in the scene
- ✅ Props with dimensions
- ✅ Grid settings

## What's Now Available (NEW)

The visualization implementation adds these capabilities:

### 1. Camera Frustum Visualization
Shows the FOV cone for each camera based on focal length.

### 2. Motion Paths
Visualize camera movement (dolly, truck, arc shots).

### 3. 180° Safety Line
Show the 180-degree rule line for the active camera.

### 4. Depth of Field
Visualize focus distance and bokeh zones.

### 5. Measurement Lines
Add distance measurements between objects.

### 6. Director/Technical Notes
Annotate shots with notes.

## How to Use With Your Mock Data

### Option 1: Update Mock Data Script (Recommended)

Add visualization properties to your existing mock scenes in `create_shot_planner_mock_data.py`:

```python
MOCK_SCENES = [
    {
        "id": "scene-safehouse-interior",
        "name": "Scene 12: The Safehouse",
        "location": "Abandoned warehouse - Interior",
        
        # ADD THESE NEW PROPERTIES:
        "showFrustums": True,          # Enable camera frustum cones
        "showMotionPaths": False,       # Disable motion paths by default
        "showMeasurements": False,      # Disable measurements by default
        "show180Line": True,            # Enable 180° safety line
        
        # ... existing properties ...
        "width": 20,
        "height": 15,
        
        "cameras": [
            {
                "id": "cam-1",
                "name": "Wide establishing",
                "x": 10,
                "y": 2,
                "rotation": 90,
                "focalLength": 24,
                
                # ADD THESE NEW CAMERA PROPERTIES:
                "focusDistance": 8.0,      # 8 meters from camera
                "depthOfField": 3.0,       # 3 meters DoF range
                "bladeCount": 8,            # Aperture blades (for bokeh)
                "motionPath": [],           # Empty = static camera
                
                # ... existing properties ...
            },
            {
                "id": "cam-2",
                "name": "Dolly push to hero",
                "x": 8,
                "y": 8,
                "rotation": 45,
                "focalLength": 85,
                
                # CAMERA WITH MOTION PATH:
                "focusDistance": 2.0,
                "depthOfField": 0.5,        # Shallow DoF for close-up
                "bladeCount": 9,
                "motionPath": [
                    {"x": 8, "y": 8},       # Start position
                    {"x": 9, "y": 8.5},     # Keyframe 1
                    {"x": 9.5, "y": 9}      # End position
                ],
                
                # ... existing properties ...
            }
        ],
        
        "shots": [
            {
                "id": "shot-1",
                "name": "Opening wide",
                "cameraId": "cam-1",
                
                # ADD THESE NEW SHOT PROPERTIES:
                "directorNotes": "Reveal the space slowly - emphasize tension",
                "technicalNotes": "Soft key from stage right, practical lamps visible",
                "measurementLines": [
                    {
                        "id": "measure-1",
                        "start": {"x": 10, "y": 8},   # From Hero
                        "end": {"x": 14, "y": 8.5},   # To Villain
                        "label": "4.5m"
                    }
                ],
                
                # ... existing properties ...
            }
        ]
    }
]
```

### Option 2: Enable in UI (No Code Changes)

You can use your existing mock data without changes! Just toggle features in the UI:

1. **Load your existing scene** from the dropdown
2. **Open the GuidesPanel** in the right sidebar (below Camera Settings)
3. **Toggle visualizations** as needed:
   - ✅ Camera Frustums → See FOV cones immediately
   - ✅ 180° Safety Line → Shows crossing line
   - ✅ Motion Paths → (if you add motionPath data later)
   - ✅ Measurements → (if you add measurement lines)

4. **Adjust focus sliders** for any camera:
   - Focus Distance: 0.5m - 50m
   - Depth of Field: 0.1m - 10m

All changes auto-save to the database!

## Example: Enhanced Safehouse Scene

Here's your "Scene 12: The Safehouse" with all visualization features:

```python
{
    "id": "scene-safehouse-interior",
    "name": "Scene 12: The Safehouse",
    "description": "INT. SAFEHOUSE - NIGHT",
    "location": "Abandoned warehouse - Interior",
    
    # Scene-level visualization toggles
    "showFrustums": True,
    "showMotionPaths": True,
    "showMeasurements": True,
    "show180Line": True,
    
    # Spatial settings
    "width": 20,
    "height": 15,
    "pixelsPerMeter": 40,
    "showGrid": True,
    "gridSize": 1,
    
    "cameras": [
        {
            "id": "cam-1",
            "name": "Wide establishing",
            "x": 10,
            "y": 2,
            "rotation": 90,
            "focalLength": 24,
            "sensorSize": "Full Frame",
            "aspectRatio": "2.39:1",
            "color": "#4CAF50",
            
            # NEW: Camera depth visualization
            "focusDistance": 8.0,
            "depthOfField": 4.0,
            "bladeCount": 8,
            "motionPath": []  # Static shot
        },
        {
            "id": "cam-2",
            "name": "Dolly to hero close-up",
            "x": 8,
            "y": 8,
            "rotation": 45,
            "focalLength": 85,
            "sensorSize": "Full Frame",
            "aspectRatio": "2.39:1",
            "color": "#2196F3",
            
            # NEW: Dolly push with shallow DoF
            "focusDistance": 2.0,
            "depthOfField": 0.5,
            "bladeCount": 9,
            "motionPath": [
                {"x": 8, "y": 8},
                {"x": 9, "y": 8.5},
                {"x": 9.5, "y": 9}
            ]
        },
        {
            "id": "cam-3",
            "name": "Over shoulder on villain",
            "x": 12,
            "y": 9,
            "rotation": 225,
            "focalLength": 50,
            "sensorSize": "Full Frame",
            "aspectRatio": "1.85:1",
            "color": "#FF9800",
            
            # NEW: Medium DoF for context
            "focusDistance": 3.5,
            "depthOfField": 2.0,
            "bladeCount": 8,
            "motionPath": []
        }
    ],
    
    "actors": [
        {
            "id": "actor-1",
            "name": "Hero (John)",
            "x": 10,
            "y": 8,
            "rotation": 90,
            "color": "#E91E63"
        },
        {
            "id": "actor-2",
            "name": "Villain (Marcus)",
            "x": 14,
            "y": 8.5,
            "rotation": 270,
            "color": "#9C27B0"
        },
        {
            "id": "actor-3",
            "name": "Sidekick (Sarah)",
            "x": 9,
            "y": 6,
            "rotation": 45,
            "color": "#00BCD4"
        }
    ],
    
    "props": [
        {
            "id": "prop-1",
            "name": "Table",
            "x": 11,
            "y": 8,
            "width": 2,
            "height": 1,
            "rotation": 0,
            "color": "#795548"
        },
        {
            "id": "prop-2",
            "name": "Chair 1",
            "x": 10,
            "y": 7,
            "width": 0.5,
            "height": 0.5,
            "rotation": 0,
            "color": "#607D8B"
        }
    ],
    
    "shots": [
        {
            "id": "shot-1",
            "name": "Opening wide - reveal space",
            "cameraId": "cam-1",
            
            # NEW: Shot-level annotations
            "directorNotes": "Hold for 4 seconds - let audience absorb the tension. Hero enters frame right.",
            "technicalNotes": "Soft key from stage right. Practical desk lamp at 40%. Haze for atmosphere.",
            
            # NEW: Measurement guides
            "measurementLines": [
                {
                    "id": "measure-hero-villain",
                    "start": {"x": 10, "y": 8},
                    "end": {"x": 14, "y": 8.5},
                    "label": "4.5m - safe social distance"
                },
                {
                    "id": "measure-cam-hero",
                    "start": {"x": 10, "y": 2},
                    "end": {"x": 10, "y": 8},
                    "label": "6m focal distance"
                }
            ]
        },
        {
            "id": "shot-2",
            "name": "Dolly push to hero CU",
            "cameraId": "cam-2",
            
            "directorNotes": "Slow push during dialogue - 8 seconds. Stop on single tear.",
            "technicalNotes": "85mm at T2.8 for shallow DoF. Eye light from fill.",
            
            "measurementLines": [
                {
                    "id": "measure-dolly-distance",
                    "start": {"x": 8, "y": 8},
                    "end": {"x": 9.5, "y": 9},
                    "label": "1.8m dolly travel"
                }
            ]
        },
        {
            "id": "shot-3",
            "name": "OTS - Villain reaction",
            "cameraId": "cam-3",
            
            "directorNotes": "Hold on villain - watch for micro-expressions",
            "technicalNotes": "50mm at T4 - keep hero shoulder in focus too",
            
            "measurementLines": []
        }
    ]
}
```

## Quick Start: Enhance Your Existing Scenes

### Step 1: Add Default Visualization Flags

At the top of `create_shot_planner_mock_data.py`, add this helper:

```python
def add_visualization_defaults(scene):
    """Add visualization feature defaults to scene"""
    scene.setdefault('showFrustums', False)
    scene.setdefault('showMotionPaths', False)
    scene.setdefault('showMeasurements', False)
    scene.setdefault('show180Line', False)
    
    for camera in scene.get('cameras', []):
        camera.setdefault('focusDistance', 5.0)
        camera.setdefault('depthOfField', 2.0)
        camera.setdefault('bladeCount', 8)
        camera.setdefault('motionPath', [])
    
    for shot in scene.get('shots', []):
        shot.setdefault('directorNotes', '')
        shot.setdefault('technicalNotes', '')
        shot.setdefault('measurementLines', [])
    
    return scene

# Then apply to all scenes:
MOCK_SCENES = [add_visualization_defaults(scene) for scene in MOCK_SCENES]
```

### Step 2: Re-run Mock Data Script

```bash
cd /workspaces/Virtualstudio
python backend/create_shot_planner_mock_data.py
```

### Step 3: Test in UI

1. Open the shot planner
2. Load "Scene 12: The Safehouse"
3. Open GuidesPanel (right sidebar)
4. Toggle "Camera Frustums" → See FOV cones appear!
5. Toggle "180° Safety Line" → See crossing line
6. Select Cam-2 and adjust Focus Distance slider → See DoF visualization

## What You'll See

### With Frustums Enabled
- Green semi-transparent FOV cones from each camera
- Cone width matches focal length (24mm = wide, 85mm = narrow)
- Shows exactly what's in frame

### With 180° Line Enabled
- Red line perpendicular to active camera
- Helps maintain screen direction
- Prevents axis crossing

### With Motion Paths (when added)
- Blue line showing camera movement
- Circles at keyframes
- Arrow showing direction

### With Measurements (when added)
- Yellow lines between points
- Distance labels
- Helpful for blocking scenes

### With DoF (when camera has focusDistance)
- Magenta focus plane
- Purple blur zones (near/far)
- Visual depth guide

## Advanced: Pre-populate Motion Paths

For your chase scene, you could add:

```python
{
    "id": "scene-car-chase",
    "name": "Scene 23: Highway Chase",
    
    "showMotionPaths": True,  # Enable motion path viz
    
    "cameras": [
        {
            "id": "cam-chase-tracking",
            "name": "Tracking shot following car",
            "focalLength": 35,
            
            # Camera follows car path
            "motionPath": [
                {"x": 5, "y": 6},    # Start behind car
                {"x": 10, "y": 6},   # Mid-chase
                {"x": 15, "y": 6},   # Approaching roadblock
                {"x": 20, "y": 7},   # Swerve right
                {"x": 25, "y": 7}    # Clear roadblock
            ]
        }
    ]
}
```

## Database Schema

Your existing database table should already support these features. If you need to add columns:

```sql
-- Optional: Add visualization settings column
ALTER TABLE shot_planner_scenes 
ADD COLUMN IF NOT EXISTS visualization_settings JSONB DEFAULT '{
    "showFrustums": false,
    "showMotionPaths": false,
    "showMeasurements": false,
    "show180Line": false
}'::jsonb;
```

But the JSONB `scene_data` column likely already handles everything!

## Summary

**Using existing mock data without changes:**
- ✅ Load any existing scene
- ✅ Toggle visualizations in GuidesPanel
- ✅ All features work immediately

**Enhancing mock data with pre-configured visualizations:**
- Add `showFrustums`, `showMotionPaths`, etc. to scene objects
- Add `focusDistance`, `depthOfField`, `motionPath` to cameras
- Add `directorNotes`, `technicalNotes`, `measurementLines` to shots
- Re-run mock data script

**Best approach:**
1. Start with existing mock data (no changes needed)
2. Test features by toggling in UI
3. Once you like a configuration, update the Python script
4. Re-run to persist those defaults

The visualization features are **additive** - they enhance your existing data without breaking anything!

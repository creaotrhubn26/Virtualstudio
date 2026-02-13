#!/usr/bin/env python3
"""
Example: Enhanced mock data with visualization features
Shows how to add visualization properties to your existing scenes
"""

# Add this helper function at the top of your create_shot_planner_mock_data.py:

def enhance_scene_with_visualizations(scene):
    """
    Add visualization feature properties to existing scene data
    This is ADDITIVE - won't break existing scenes
    """
    
    # Scene-level visualization toggles (defaults to off)
    scene.setdefault('showFrustums', False)
    scene.setdefault('showMotionPaths', False)
    scene.setdefault('showMeasurements', False)
    scene.setdefault('show180Line', False)
    
    # Enhance cameras with focus/motion properties
    for camera in scene.get('cameras', []):
        camera.setdefault('focusDistance', 5.0)  # 5 meters default
        camera.setdefault('depthOfField', 2.0)   # 2 meters DoF
        camera.setdefault('bladeCount', 8)        # 8-blade aperture
        camera.setdefault('motionPath', [])       # Empty = static
    
    # Enhance shots with notes and measurements
    for shot in scene.get('shots', []):
        shot.setdefault('directorNotes', '')
        shot.setdefault('technicalNotes', '')
        shot.setdefault('measurementLines', [])
    
    return scene


# Example: Enhanced Safehouse scene
ENHANCED_SAFEHOUSE = {
    "id": "scene-safehouse-interior",
    "name": "Scene 12: The Safehouse",
    "location": "Abandoned warehouse - Interior",
    
    # NEW: Enable visualizations
    "showFrustums": True,        # Show camera FOV cones
    "showMotionPaths": True,     # Show camera movement
    "show180Line": True,         # Show 180° safety line
    "showMeasurements": True,    # Show distance measurements
    
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
            
            # NEW: Focus properties for DoF visualization
            "focusDistance": 8.0,   # Focus 8m from camera (on the table)
            "depthOfField": 4.0,    # 4m DoF range
            "bladeCount": 8,         # 8-blade iris
            "motionPath": []         # Static shot
        },
        {
            "id": "cam-2",
            "name": "Dolly push to hero",
            "x": 8,
            "y": 8,
            "rotation": 45,
            "focalLength": 85,
            "sensorSize": "Full Frame",
            "aspectRatio": "2.39:1",
            "color": "#2196F3",
            
            # NEW: Dolly shot with motion path
            "focusDistance": 2.0,    # Close focus
            "depthOfField": 0.5,     # Very shallow DoF for CU
            "bladeCount": 9,          # 9-blade for smooth bokeh
            "motionPath": [           # Dolly path
                {"x": 8, "y": 8},     # Start
                {"x": 9, "y": 8.5},   # Mid
                {"x": 9.5, "y": 9}    # End (close to hero)
            ]
        },
        {
            "id": "cam-3",
            "name": "Over shoulder",
            "x": 12,
            "y": 9,
            "rotation": 225,
            "focalLength": 50,
            "sensorSize": "Full Frame",
            "aspectRatio": "1.85:1",
            "color": "#FF9800",
            
            # NEW: Medium DoF for OTS
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
        },
        {
            "id": "prop-3",
            "name": "Chair 2",
            "x": 13,
            "y": 7.5,
            "width": 0.5,
            "height": 0.5,
            "rotation": 180,
            "color": "#607D8B"
        },
        {
            "id": "prop-4",
            "name": "Weapon cache",
            "x": 16,
            "y": 3,
            "width": 1.5,
            "height": 1,
            "rotation": 0,
            "color": "#FF5722"
        }
    ],
    
    "shots": [
        {
            "id": "shot-1",
            "name": "Opening wide",
            "cameraId": "cam-1",
            
            # NEW: Director and technical notes
            "directorNotes": "Hold for 4 seconds - establish the space and tension. Hero enters frame right looking concerned.",
            "technicalNotes": "Soft key from stage right at 40%. Practical desk lamp visible at 30%. Light haze for atmosphere.",
            
            # NEW: Measurement guides
            "measurementLines": [
                {
                    "id": "measure-1",
                    "start": {"x": 10, "y": 8},    # Hero position
                    "end": {"x": 14, "y": 8.5},    # Villain position
                    "label": "4.5m"                 # Distance label
                },
                {
                    "id": "measure-2",
                    "start": {"x": 10, "y": 2},    # Camera position
                    "end": {"x": 10, "y": 8},      # Hero position
                    "label": "6m focal distance"
                }
            ]
        },
        {
            "id": "shot-2",
            "name": "Dolly to hero CU",
            "cameraId": "cam-2",
            
            "directorNotes": "Slow 8-second push during his dialogue. Stop when single tear forms. Hold CU for reaction.",
            "technicalNotes": "85mm at T2.8 for shallow DoF. Small eye light from fill bounce. Focus pull to follow dolly.",
            
            "measurementLines": [
                {
                    "id": "measure-dolly",
                    "start": {"x": 8, "y": 8},
                    "end": {"x": 9.5, "y": 9},
                    "label": "1.8m dolly travel"
                }
            ]
        },
        {
            "id": "shot-3",
            "name": "OTS on villain",
            "cameraId": "cam-3",
            
            "directorNotes": "Hold static - watch for villain's micro-expressions. He knows hero is lying.",
            "technicalNotes": "50mm at T4 - keep hero shoulder sharp too. Backlight on villain for separation.",
            
            "measurementLines": []
        }
    ]
}


# Example: Chase scene with tracking camera motion
ENHANCED_CHASE = {
    "id": "scene-car-chase",
    "name": "Scene 23: Highway Chase",
    "location": "Highway - Exterior Day",
    
    "showFrustums": True,
    "showMotionPaths": True,      # Show camera tracking path
    "show180Line": False,
    "showMeasurements": False,
    
    "width": 40,
    "height": 12,
    "pixelsPerMeter": 30,
    "showGrid": True,
    "gridSize": 2,
    
    "cameras": [
        {
            "id": "cam-chase-1",
            "name": "Drone overhead",
            "x": 20,
            "y": 2,
            "rotation": 90,
            "focalLength": 18,
            "sensorSize": "Super 35",
            "aspectRatio": "2.39:1",
            "color": "#4CAF50",
            
            "focusDistance": 15.0,
            "depthOfField": 8.0,
            "bladeCount": 6,
            "motionPath": []  # Drone hovers
        },
        {
            "id": "cam-chase-2",
            "name": "Tracking vehicle",
            "x": 5,
            "y": 6,
            "rotation": 90,
            "focalLength": 35,
            "sensorSize": "Full Frame",
            "aspectRatio": "2.39:1",
            "color": "#2196F3",
            
            "focusDistance": 4.0,
            "depthOfField": 3.0,
            "bladeCount": 8,
            
            # Tracking shot following hero car
            "motionPath": [
                {"x": 5, "y": 6},
                {"x": 10, "y": 6},
                {"x": 15, "y": 6},
                {"x": 20, "y": 7},    # Swerve during near-miss
                {"x": 25, "y": 7},
                {"x": 30, "y": 6}     # Back to center lane
            ]
        }
    ],
    
    "actors": [
        {
            "id": "actor-driver",
            "name": "Driver",
            "x": 8,
            "y": 6,
            "rotation": 90,
            "color": "#E91E63"
        }
    ],
    
    "props": [
        {
            "id": "prop-hero-car",
            "name": "Hero car",
            "x": 8,
            "y": 6,
            "width": 4,
            "height": 1.8,
            "rotation": 0,
            "color": "#2196F3"
        },
        {
            "id": "prop-pursuit-1",
            "name": "Pursuit vehicle 1",
            "x": 3,
            "y": 7,
            "width": 4,
            "height": 1.8,
            "rotation": 0,
            "color": "#FF5722"
        }
    ],
    
    "shots": [
        {
            "id": "shot-chase-1",
            "name": "Overhead establishing",
            "cameraId": "cam-chase-1",
            
            "directorNotes": "Drone reveal - show full highway layout and pursuit vehicles",
            "technicalNotes": "Drone at 50m altitude. Slow descent during shot. ND filter for daylight exposure.",
            
            "measurementLines": [
                {
                    "id": "measure-pursuit-gap",
                    "start": {"x": 3, "y": 7},
                    "end": {"x": 8, "y": 6},
                    "label": "5.8m gap"
                }
            ]
        },
        {
            "id": "shot-chase-2",
            "name": "Tracking hero car",
            "cameraId": "cam-chase-2",
            
            "directorNotes": "Follow car through chicane - keep driver visible in profile",
            "technicalNotes": "Tracking vehicle at 25m distance. 35mm at T5.6 for speed retention. Gyro-stabilized mount.",
            
            "measurementLines": []
        }
    ]
}


if __name__ == "__main__":
    print("Enhanced mock data examples created!")
    print("\nTo use:")
    print("1. Copy the enhance_scene_with_visualizations() function to your mock data script")
    print("2. Apply it to existing scenes: MOCK_SCENES = [enhance_scene_with_visualizations(s) for s in MOCK_SCENES]")
    print("3. Or manually add visualization properties as shown in the examples")
    print("\nFeatures added:")
    print("  - Camera frustum visualization (FOV cones)")
    print("  - Motion path visualization (camera movement)")
    print("  - 180-degree safety line")
    print("  - Depth of field visualization")
    print("  - Measurement lines")
    print("  - Director and technical notes")

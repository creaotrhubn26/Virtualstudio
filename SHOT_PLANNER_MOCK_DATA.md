# Shot Planner Mock Data

Mock scenes created for testing the 2D shot planner integration.

## Created Scenes

### 1. Scene 12: The Safehouse
**Location:** Abandoned warehouse - Interior  
**Dimensions:** 20m × 15m  
**Setup:**
- 3 cameras (Wide establishing, Close-up on hero, Over shoulder)
- 3 actors (Hero John, Villain Marcus, Sidekick Sarah)
- 4 props (Table, 2 Chairs, Weapon cache)
- **Use case:** Tense confrontation scene with multiple coverage angles

### 2. Scene 23: Highway Chase
**Location:** Highway - Exterior Day  
**Dimensions:** 40m × 12m  
**Setup:**
- 3 cameras (Drone overhead, Car mount, Pursuit angle)
- 1 actor (Driver)
- 4 props (Hero car, 2 Pursuit vehicles, Roadblock)
- **Use case:** High-speed action sequence with vehicle blocking

### 3. Scene 8: Bar Confrontation
**Location:** Dive Bar - Interior Night  
**Dimensions:** 18m × 12m  
**Setup:**
- 4 cameras (Wide 2-shot, 2 Singles, Steadicam follow)
- 5 actors (Detective, Informant, Bartender, 2 Background patrons)
- 5 props (Bar counter, Table, Pool table, Jukebox, Booth seating)
- **Use case:** Dialogue-heavy scene with background action

### 4. Scene 45: Rooftop Finale
**Location:** Downtown Rooftop - Exterior Night  
**Dimensions:** 25m × 20m  
**Setup:**
- 4 cameras (Crane up reveal, Hero close-up, Villain POV, Helicopter aerial)
- 4 actors (Hero, Main Villain, 2 Team members)
- 5 props (2 HVAC units, Helicopter pad, Access door, Water tower)
- **Use case:** Climactic action sequence with aerial coverage

### 5. Scene 17: Corporate Office Heist
**Location:** Executive Office - Interior Night  
**Dimensions:** 16m × 14m  
**Setup:**
- 3 cameras (Security cam POV, Team leader medium, Safe close-up)
- 4 actors (Team Leader, Safe Cracker, Tech Specialist, Lookout)
- 5 props (Executive desk, Wall safe, Computer terminal, Conference table, Bookshelf)
- **Use case:** Multi-character heist scene with security POV

## Usage

### Load Mock Data
```bash
python backend/create_shot_planner_mock_data.py
```

### Access via API
```bash
# Get all scenes
curl http://localhost:8000/api/shot-planner/scenes

# Get specific scene
curl http://localhost:8000/api/shot-planner/scenes/scene-safehouse-interior
```

### In the UI
1. Open Casting Planner
2. Click "Shot planner" button
3. Scenes will automatically load from database
4. Select a scene from the dropdown to start planning shots

## Features Demonstrated

- **Multiple camera setups** with different focal lengths and aspect ratios
- **Actor positioning** with rotation and color coding
- **Prop placement** with realistic dimensions (furniture, vehicles, set pieces)
- **Various scene types** (interior/exterior, day/night, action/dialogue)
- **Different scale scenes** from tight interiors to large outdoor spaces
- **Grid visualization** for accurate spatial planning
- **Professional naming** following industry conventions

## Scene IDs
- `scene-safehouse-interior`
- `scene-car-chase`
- `scene-bar-confrontation`
- `scene-rooftop-final`
- `scene-office-heist`

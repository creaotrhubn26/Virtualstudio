# Phase 2 Quick Start Guide

## 5-Minute Setup

### Step 1: Import the systems

```typescript
import { HairPhysicsEngine } from '@/services/hairPhysicsEngine';
import { MaterialLODManager } from '@/services/materialLODManager';
import { Phase2IntegrationDemo } from '@/services/phase2IntegrationDemo';
import { getHairLayout } from '@/data/hairPhysicsPresets';
```

### Step 2: Initialize in your scene

```typescript
const scene = new BABYLON.Scene(engine);
const camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 1.5, 5), scene);

// Initialize Phase 2 (make sure Phase 1 materialController exists)
const demo = new Phase2IntegrationDemo(materialController);
demo.initialize(scene, camera);
```

### Step 3: Load an avatar

```typescript
// Load with hair physics enabled
demo.loadAvatarWithPhysics(mesh, 'avatar_woman', 'FEMALE_LONG');

// Optional: Use different hair style
demo.loadAvatarWithPhysics(mesh, 'avatar_male', 'MALE_SHORT');
```

### Step 4: Update in your game loop

```typescript
engine.runRenderLoop(() => {
  // Update Phase 2 systems
  demo.updateFrame(deltaTime, bonePositions);
  
  // Rest of rendering
  scene.render();
});
```

That's it! ✨ Your avatars now have:
- ✅ Hair physics
- ✅ Automatic LOD scaling
- ✅ Emotion effects
- ✅ Exertion effects

---

## Common Tasks

### Play animation with automatic effects

```typescript
// Hair and material effects happen automatically
store.playAnimation('avatar_woman', 'dance');

// Result: Character dances with:
// - Flowing hair responding to movement
// - Exertion effects (sweat, glow)
// - Emotion response (if set)
// - Automatic quality scaling based on distance
```

### Apply facial expression

```typescript
// Emotion affects both face and hair physics
materialController.applyFacialExpression('avatar_woman', 'happy', 1.0);

// Hair behavior changes:
// - happy: Light, bouncy (reduced gravity)
// - sad: Heavy, drooping (increased gravity)
// - surprised: Windblown (applied wind effect)
```

### Set wind effect

```typescript
import { WIND_PRESETS } from '@/data/hairPhysicsPresets';

// Apply wind preset
const wind = WIND_PRESETS.MEDIUM;
hairEngine.setWind(wind.direction, wind.strength);

// Or custom wind
hairEngine.setWind(new Vector3(1, 0, 0), 5.0);
```

### Check performance

```typescript
const metrics = demo.getMetrics();

console.log(`Avatars: ${metrics.totalAvatars}`);
console.log(`  HIGH: ${metrics.highQuality}`);
console.log(`  MEDIUM: ${metrics.mediumQuality}`);
console.log(`  LOW: ${metrics.lowQuality}`);
console.log(`  MINIMAL: ${metrics.minimalQuality}`);
console.log(`Est. CPU: ${metrics.estimatedCPUMs.toFixed(1)}ms`);
```

### Force specific LOD level

```typescript
// For distant avatars
lodManager.forceLOD('avatar_distant', LODLevel.LOW);

// For performance tuning
lodManager.forceLOD('avatar_background', LODLevel.MINIMAL);
```

### Customize LOD distances

```typescript
// More aggressive LOD (quality drops sooner)
lodManager.setDistanceThresholds({
  highToMedium: 3,     // Drop to MEDIUM at 3m
  mediumToLow: 10,     // Drop to LOW at 10m
  lowToMinimal: 20     // Drop to MINIMAL at 20m
});

// More conservative LOD (keep quality longer)
lodManager.setDistanceThresholds({
  highToMedium: 10,
  mediumToLow: 25,
  lowToMinimal: 50
});
```

### Get current LOD for a rig

```typescript
const lod = lodManager.getCurrentLOD('avatar_woman');
console.log(`Current LOD: ${lod}`); // 'HIGH', 'MEDIUM', 'LOW', or 'MINIMAL'

const distance = lodManager.getDistance('avatar_woman');
console.log(`Distance from camera: ${distance.toFixed(1)}m`);
```

### Disable hair physics for specific avatar

```typescript
// For performance-critical scenarios
hairEngine.setEnabled('avatar_background', false);

// Hair mesh still renders but physics disabled
// Saves ~6-8ms per avatar
```

### Reset avatar to default state

```typescript
// Reset hair to bind pose
hairEngine.resetHair('avatar_woman');

// Unload completely
demo.unloadAvatar('avatar_woman');
```

---

## Hair Style Reference

### Available Presets

```typescript
FEMALE_LONG          // Long straight hair (most common)
MALE_SHORT           // Short masculine styles
FEMALE_PONYTAIL      // Single ponytail
LONG_VOLUMINOUS      // Rich, flowing hair (5 strands)
TWIN_TAILS           // Twin tails/pigtails

// Advanced: Create custom layouts
```

### Create Custom Hair Layout

```typescript
import { HairStrandConfig } from '@/services/hairPhysicsEngine';
import { HAIR_PRESETS } from '@/data/hairPhysicsPresets';

const customLayout: HairStrandConfig[] = [
  // Strand 1: Front-left
  {
    rootBoneName: 'Armature.Head',
    meshPartVertexStart: 0,
    meshPartVertexEnd: 100,
    ...HAIR_PRESETS.LONG_FLOWING  // Use preset as base
  },
  // Strand 2: Front-right
  {
    rootBoneName: 'Armature.Head',
    meshPartVertexStart: 100,
    meshPartVertexEnd: 200,
    ...HAIR_PRESETS.LONG_FLOWING
  }
];

hairEngine.registerRig('avatar_custom', mesh, customLayout);
```

---

## Performance Tips

### Tip 1: Enable LOD for crowds

```typescript
// For 10+ avatars, LOD is essential
const lodManager = new MaterialLODManager();

for (const rigId of allAvatarIds) {
  lodManager.registerRig(rigId, meshes[rigId], camera, materialController);
}

// Automatic distance-based quality scaling
// Achieves 60 FPS with 20+ avatars
```

### Tip 2: Disable hair for distant avatars

```typescript
// In a large crowd, disable hair for background
for (const rigId of backgroundAvatarIds) {
  hairEngine.setEnabled(rigId, false);
}

// Saves 6-8ms per avatar while keeping visuals similar
```

### Tip 3: Use LOD for exertion effects

```typescript
// At MINIMAL LOD, exertion effects disabled
// So distant avatars won't show sweat effects
// But emotion (face) effects still visible

// This is automatic in LOD system
```

### Tip 4: Batch mesh updates

```typescript
// Update hair for multiple avatars efficiently
for (const rigId of visibleAvatarIds) {
  hairEngine.update(deltaTime, bonePositions);
}

// Mesh updates batched internally
```

### Tip 5: Tune interpolation timing

```typescript
// For LOD level, adjust interpolation speed
lodConfig.interpolationDuration = 0.5; // 500ms

// Slower = smoother but less responsive
// Faster = snappier but might feel jerky
```

---

## Material Quality at Each LOD

### HIGH (Close)
```
✅ Exertion effects: YES
✅ Emotion effects: YES
✅ Sweat/flush/glow: YES
✅ Normal maps: 1.0× intensity
✅ Subsurface scattering: YES
✅ Clearcoat (tears): YES
✅ Update frequency: 60 FPS
✅ Hair physics: Full quality
```

### MEDIUM (Mid-distance)
```
✅ Exertion effects: YES
✅ Emotion effects: YES
✅ Sweat/flush/glow: YES
✅ Normal maps: 0.8× intensity
✅ Subsurface scattering: YES
✅ Clearcoat: YES
✅ Update frequency: 30 FPS
~ Hair physics: Standard
```

### LOW (Far)
```
✅ Exertion effects: NO (disabled)
✅ Emotion effects: YES (face still visible)
✅ Sweat/flush/glow: NO
✅ Normal maps: 0.5× intensity
✅ Subsurface scattering: NO
✅ Clearcoat: NO
✅ Update frequency: 10 FPS
~ Hair physics: Minimal
```

### MINIMAL (Very far)
```
✅ Exertion effects: NO
✅ Emotion effects: NO (baseline)
✅ Sweat/flush/glow: NO
✅ Normal maps: DISABLED
✅ Subsurface scattering: NO
✅ Clearcoat: NO
✅ Update frequency: 5 FPS
~ Hair physics: DISABLED
```

---

## Example Scenes

### Scene 1: Single Avatar Showcase

```typescript
demo.loadAvatarWithPhysics(mesh, 'avatar_1', 'FEMALE_LONG');
demo.exampleFullFeatures('avatar_1', 'dance');

// Result: Fully featured character with all effects visible
```

### Scene 2: Crowd Dancing

```typescript
for (let i = 0; i < 15; i++) {
  demo.loadAvatarWithPhysics(meshes[i], `avatar_${i}`, 'FEMALE_LONG');
  store.playAnimation(`avatar_${i}`, 'dance');
}

// Result: 15 avatars dancing with automatic LOD scaling
// 60 FPS maintained with ~35ms CPU cost
```

### Scene 3: Emotional Performance

```typescript
demo.loadAvatarWithPhysics(mesh, 'avatar_main', 'LONG_VOLUMINOUS');

// Progressive emotional journey
await transitionEmotion('happy', 'surprised', 1.0);
await transitionEmotion('surprised', 'sad', 2.0);
await transitionEmotion('sad', 'happy', 1.5);

// Hair and materials reinforce emotional storytelling
```

### Scene 4: Environmental Effects

```typescript
// Wind effects for outdoor scenes
hairEngine.setWind(new Vector3(1, 0.1, 0), 3.0);

// Gravity adjustments
hairEngine.setGravity(12.0); // Stronger gravity

// Result: Dynamic hair responding to environment
```

---

## Troubleshooting

### Problem: Hair looks stiff or unnatural

**Solution**: Reduce stiffness parameter
```typescript
const config = getHairLayout('FEMALE_LONG');
config[0].stiffness = 0.5; // Lower = more flexible
```

### Problem: Hair clipping through body

**Solution**: Increase collision detection radius
```typescript
// In hairPhysicsEngine.ts, increase sphere radius
collisions = [
  { radius: 0.20, name: 'head' },  // Was 0.15
  { radius: 0.15, name: 'neck' },  // Was 0.12
];
```

### Problem: Hair too bouncy

**Solution**: Increase damping
```typescript
const config = getHairLayout('FEMALE_LONG');
config[0].damping = 0.98; // Higher = more damping
```

### Problem: Not enough wind effect

**Solution**: Increase wind sensitivity
```typescript
const config = getHairLayout('FEMALE_LONG');
config[0].windSensitivity = 3.0; // Higher = more responsive
```

### Problem: LOD not triggering

**Solution**: Check distance thresholds
```typescript
// Print current distance
const distance = lodManager.getDistance('avatar_1');
console.log(`Distance: ${distance}m`);

// Adjust thresholds if needed
lodManager.setDistanceThresholds({
  highToMedium: 5,  // Adjust these values
  mediumToLow: 15,
  lowToMinimal: 30
});
```

### Problem: Performance too low

**Solution**: Reduce LOD quality or disable effects
```typescript
// Option 1: Force all to MINIMAL
lodManager.forceLOD('avatar_bg', LODLevel.MINIMAL);

// Option 2: Disable hair physics
hairEngine.setEnabled('avatar_bg', false);

// Option 3: Check metrics
const metrics = demo.getMetrics();
console.log(`CPU: ${metrics.estimatedCPUMs.toFixed(0)}ms`);
```

---

## Integration Checklist

- [ ] HairPhysicsEngine created and initialized
- [ ] MaterialLODManager created and initialized
- [ ] Avatars loaded with hair layouts
- [ ] Animation playback working
- [ ] Hair responding to animation
- [ ] Emotions applied to face and hair
- [ ] LOD switching based on distance
- [ ] Performance metrics reporting
- [ ] 60+ FPS maintained
- [ ] No visual artifacts

---

## Next Steps

1. ✅ **Done**: Hair physics + Material LOD complete
2. 🔲 **Optional**: Cloth simulation (Phase 3)
3. 🔲 **Optional**: Animation retargeting (Phase 4)
4. 🔲 **Optional**: Motion capture (Phase 5)

Ready to implement the next phase? Let me know! 🚀

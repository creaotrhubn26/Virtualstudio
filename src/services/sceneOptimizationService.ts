import { SceneComposition } from '../core/models/sceneComposer';

export interface OptimizationResult {
  optimized: SceneComposition;
  changes: string[];
  performanceGain: number; // Estimated percentage
}

export const sceneOptimizationService = {
  /**
   * Optimize a scene for better performance
   */
  optimizeScene(scene: SceneComposition): OptimizationResult {
    const optimized: SceneComposition = JSON.parse(JSON.stringify(scene));
    const changes: string[] = [];

    // Remove duplicate cameras
    const uniqueCameras = new Map<string, typeof scene.cameras[0]>();
    scene.cameras.forEach(cam => {
      const key = `${cam.alpha.toFixed(2)}-${cam.beta.toFixed(2)}-${cam.radius.toFixed(2)}`;
      if (!uniqueCameras.has(key)) {
        uniqueCameras.set(key, cam);
      }
    });
    if (uniqueCameras.size < scene.cameras.length) {
      optimized.cameras = Array.from(uniqueCameras.values());
      changes.push(`Fjernet ${scene.cameras.length - uniqueCameras.size} dupliserte kameraer`);
    }

    // Optimize lights - remove very dim lights
    const minIntensity = 0.1;
    const originalLightCount = optimized.lights.length;
    optimized.lights = optimized.lights.filter(light => light.intensity >= minIntensity);
    if (optimized.lights.length < originalLightCount) {
      changes.push(`Fjernet ${originalLightCount - optimized.lights.length} svake lys`);
    }

    // Optimize actors - remove invisible actors
    const originalActorCount = optimized.actors.length;
    optimized.actors = optimized.actors.filter(actor => actor.visible !== false);
    if (optimized.actors.length < originalActorCount) {
      changes.push(`Fjernet ${originalActorCount - optimized.actors.length} usynlige aktører`);
    }

    // Optimize props - remove invisible props
    const originalPropCount = optimized.props.length;
    optimized.props = optimized.props.filter(prop => prop.visible !== false);
    if (optimized.props.length < originalPropCount) {
      changes.push(`Fjernet ${originalPropCount - optimized.props.length} usynlige props`);
    }

    // Optimize environment - remove duplicate walls/floors
    if (scene.environment) {
      const env = scene.environment;
      const originalWallCount = env.walls?.length || 0;
      const originalFloorCount = env.floors?.length || 0;
      
      // Remove duplicate walls (same position and assetId)
      if (env.walls && env.walls.length > 0) {
        const uniqueWalls = new Map<string, typeof env.walls[0]>();
        env.walls.forEach(wall => {
          const key = `${wall.assetId}-${wall.position.join(',')}`;
          if (!uniqueWalls.has(key)) {
            uniqueWalls.set(key, wall);
          }
        });
        if (uniqueWalls.size < originalWallCount) {
          optimized.environment = optimized.environment || { walls: [], floors: [] };
          optimized.environment.walls = Array.from(uniqueWalls.values());
          changes.push(`Fjernet ${originalWallCount - uniqueWalls.size} dupliserte vegger`);
        }
      }
      
      // Remove duplicate floors (same assetId)
      if (env.floors && env.floors.length > 0) {
        const uniqueFloors = new Map<string, typeof env.floors[0]>();
        env.floors.forEach(floor => {
          if (!uniqueFloors.has(floor.assetId)) {
            uniqueFloors.set(floor.assetId, floor);
          }
        });
        if (uniqueFloors.size < originalFloorCount) {
          optimized.environment = optimized.environment || { walls: [], floors: [] };
          optimized.environment.floors = Array.from(uniqueFloors.values());
          changes.push(`Fjernet ${originalFloorCount - uniqueFloors.size} dupliserte gulv`);
        }
      }
    }

    // Calculate estimated performance gain
    const envElements = scene.environment 
      ? (scene.environment.walls?.length || 0) + (scene.environment.floors?.length || 0)
      : 0;
    const optimizedEnvElements = optimized.environment
      ? (optimized.environment.walls?.length || 0) + (optimized.environment.floors?.length || 0)
      : 0;
    
    const totalElements = scene.cameras.length + scene.lights.length + scene.actors.length + scene.props.length + envElements;
    const optimizedElements = optimized.cameras.length + optimized.lights.length + optimized.actors.length + optimized.props.length + optimizedEnvElements;
    const performanceGain = totalElements > 0
      ? ((totalElements - optimizedElements) / totalElements) * 100
      : 0;

    return {
      optimized,
      changes,
      performanceGain: Math.round(performanceGain),
    };
  },

  /**
   * Get scene complexity score
   */
  getComplexityScore(scene: SceneComposition): number {
    let score = 0;
    score += scene.cameras.length * 1;
    score += scene.lights.length * 2;
    score += scene.actors.length * 3;
    score += scene.props.length * 1;
    score += (scene.layers?.length || 0) * 0.5;
    score += (scene.timeline?.keyframes.length || 0) * 0.1;
    
    // Add environment complexity
    if (scene.environment) {
      score += (scene.environment.walls?.length || 0) * 0.5;
      score += (scene.environment.floors?.length || 0) * 0.3;
      if (scene.environment.atmosphere) {
        score += 1; // Atmosphere adds complexity
      }
    }
    
    return Math.round(score);
  },
};


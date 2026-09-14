import { SceneComposition } from '../core/models/sceneComposer';

export const sceneCompressionService = {
  /**
   * Compress scene data (simplified - in production would use actual compression)
   */
  compress(scene: SceneComposition): string {
    // Compact JSON must retain asset URLs, transforms, poses and environment state.
    return JSON.stringify({ format: 'virtualstudio.scene', version: 2, scene });
  },

  /**
   * Decompress scene data
   */
  decompress(compressed: string): SceneComposition {
    const data = JSON.parse(compressed);
    if (data.format === 'virtualstudio.scene') {
      if (data.version !== 2 || !data.scene || !Array.isArray(data.scene.actors) || !Array.isArray(data.scene.lights)) {
        throw new Error('Unsupported or invalid studio scene document');
      }
      return data.scene as SceneComposition;
    }
    // Read legacy compact scene documents. Their omitted fields cannot be reconstructed.
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      cameras: data.cameras.map((cam: any) => ({
        id: cam.id,
        alpha: cam.a,
        beta: cam.b,
        radius: cam.r,
        target: cam.t,
        fov: cam.f,
      })),
      lights: data.lights.map((light: any) => ({
        id: light.id,
        name: light.n,
        type: light.t,
        position: light.p,
        rotation: light.r,
        intensity: light.i,
        cct: light.c,
        visible: true,
      })),
      actors: data.actors,
      props: data.props,
      cameraSettings: data.settings,
      layers: data.layers || [],
      tags: data.tags || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      environment: data.environment ? {
        room: data.environment.room,
        walls: data.environment.w?.map((w: any) => ({
          id: w.i,
          assetId: w.a,
          position: w.p,
          rotation: w.r,
          scale: w.s,
        })) || [],
        floors: data.environment.f?.map((f: any) => ({
          id: f.i,
          assetId: f.a,
          position: f.p,
        })) || [],
        atmosphere: data.environment.a ? {
          fogEnabled: data.environment.a.fe,
          fogDensity: data.environment.a.fd,
          fogColor: data.environment.a.fc,
          clearColor: data.environment.a.cc,
          ambientColor: data.environment.a.ac,
          ambientIntensity: data.environment.a.ai,
        } : undefined,
      } : undefined,
    };
  },

  /**
   * Get compression ratio
   */
  getCompressionRatio(original: SceneComposition, compressed: string): number {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = compressed.length;
    return originalSize > 0 ? (compressedSize / originalSize) * 100 : 0;
  },
};


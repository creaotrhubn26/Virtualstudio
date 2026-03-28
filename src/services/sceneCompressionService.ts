import { SceneComposition } from '../core/models/sceneComposer';

export const sceneCompressionService = {
  /**
   * Compress scene data (simplified - in production would use actual compression)
   */
  compress(scene: SceneComposition): string {
    // Remove unnecessary data for compression
    const compressed = {
      id: scene.id,
      name: scene.name,
      description: scene.description,
      cameras: scene.cameras.map(cam => ({
        id: cam.id,
        a: cam.alpha,
        b: cam.beta,
        r: cam.radius,
        t: cam.target,
        f: cam.fov,
      })),
      lights: scene.lights.map(light => ({
        id: light.id,
        n: light.name,
        t: light.type,
        p: light.position,
        r: light.rotation,
        i: light.intensity,
        c: light.cct,
      })),
      actors: scene.actors.map(actor => ({
        id: actor.id,
        t: actor.type,
      })),
      props: scene.props.map(prop => ({
        id: prop.id,
        t: prop.type,
      })),
      settings: scene.cameraSettings,
      layers: scene.layers,
      tags: scene.tags,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
      environment: scene.environment ? {
        w: scene.environment.walls?.map(w => ({
          i: w.id,
          a: w.assetId,
          p: w.position,
          r: w.rotation,
          s: w.scale,
        })) || [],
        f: scene.environment.floors?.map(f => ({
          i: f.id,
          a: f.assetId,
          p: f.position,
        })) || [],
        a: scene.environment.atmosphere ? {
          fe: scene.environment.atmosphere.fogEnabled,
          fd: scene.environment.atmosphere.fogDensity,
          fc: scene.environment.atmosphere.fogColor,
          cc: scene.environment.atmosphere.clearColor,
          ac: scene.environment.atmosphere.ambientColor,
          ai: scene.environment.atmosphere.ambientIntensity,
        } : undefined,
      } : undefined,
      environmentAssemblyValidation: scene.environmentAssemblyValidation ? {
        bv: scene.environmentAssemblyValidation.backendValidated,
        d: scene.environmentAssemblyValidation.differences,
        lnc: scene.environmentAssemblyValidation.localNodeCount,
        lrc: scene.environmentAssemblyValidation.localRelationshipCount,
        lrpc: scene.environmentAssemblyValidation.localRuntimePropCount,
        lra: scene.environmentAssemblyValidation.localRuntimeAssetIds,
        bnc: scene.environmentAssemblyValidation.backendNodeCount,
        brc: scene.environmentAssemblyValidation.backendRelationshipCount,
        brpc: scene.environmentAssemblyValidation.backendRuntimePropCount,
        bra: scene.environmentAssemblyValidation.backendRuntimeAssetIds,
        bst: scene.environmentAssemblyValidation.backendShellType,
        va: scene.environmentAssemblyValidation.validatedAt,
      } : undefined,
    };

    return JSON.stringify(compressed);
  },

  /**
   * Decompress scene data
   */
  decompress(compressed: string): SceneComposition {
    const data = JSON.parse(compressed);
    
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
      environmentAssemblyValidation: data.environmentAssemblyValidation ? {
        backendValidated: Boolean(data.environmentAssemblyValidation.bv),
        differences: data.environmentAssemblyValidation.d || [],
        localNodeCount: data.environmentAssemblyValidation.lnc || 0,
        localRelationshipCount: data.environmentAssemblyValidation.lrc || 0,
        localRuntimePropCount: data.environmentAssemblyValidation.lrpc || 0,
        localRuntimeAssetIds: data.environmentAssemblyValidation.lra || [],
        backendNodeCount: data.environmentAssemblyValidation.bnc,
        backendRelationshipCount: data.environmentAssemblyValidation.brc,
        backendRuntimePropCount: data.environmentAssemblyValidation.brpc,
        backendRuntimeAssetIds: data.environmentAssemblyValidation.bra || [],
        backendShellType: data.environmentAssemblyValidation.bst,
        validatedAt: data.environmentAssemblyValidation.va,
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

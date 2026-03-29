import '@babylonjs/core';
import type {
  Engine,
  Scene,
  ArcRotateCamera,
  AbstractMesh,
  Skeleton,
  Vector3,
  SkeletonViewer,
} from '@babylonjs/core';

// ── Typed window.virtualStudio singleton ───────────────────────────────────
// engine is private on VirtualStudio — use scene.getEngine() instead.
// applyScenarioPreset is a public method used by StorySceneLoaderService.
export interface VirtualStudioPublicProps {
  /** Babylon Scene (public) — use scene.getEngine() to access the engine */
  readonly scene: Scene;
  /** Apply a full scenario preset (lights, backdrop, props) to the active scene */
  applyScenarioPreset(preset: Record<string, unknown>): void;
}

declare global {
  interface Window {
    __storySkeletonViewers?: SkeletonViewer[];
  }
}

declare module '@babylonjs/core' {
  interface Mesh {
    castShadows?: boolean;
  }
  
  interface AbstractMesh {
    castShadows?: boolean;
  }
  
  interface PBRMaterial {
    normalTexture?: BaseTexture | null;
    roughnessTexture?: BaseTexture | null;
    useRefraction?: boolean;
    refractionIntensity?: number;
  }
  
  interface Skeleton {
    getBones?(): Bone[];
  }
}

interface CanvasRenderingContext2D {
  roundRect?(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]): void;
}

interface ICanvasRenderingContext {
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  roundRect?(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]): void;
}

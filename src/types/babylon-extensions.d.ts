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
// engine and scene are accessed at runtime — typed via VirtualStudioPublicProps.
// Do NOT reference the private-member VirtualStudio class type here.
export interface VirtualStudioPublicProps {
  /** Babylon Engine (runtime-accessible, even though private in class definition) */
  readonly engine: Engine;
  /** Babylon Scene */
  readonly scene: Scene;
}

declare global {
  interface Window {
    virtualStudio?: VirtualStudioPublicProps & Record<string, unknown>;
    BABYLON?: typeof import('@babylonjs/core') & {
      SkeletonViewer: {
        new (
          skeleton: Skeleton,
          mesh: AbstractMesh,
          scene: Scene,
          autoUpdateBonesMatrices?: boolean,
          renderingGroupId?: number,
          options?: Record<string, unknown>,
        ): SkeletonViewer;
        DISPLAY_LINES: number;
      };
    };
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

import '@babylonjs/core';

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

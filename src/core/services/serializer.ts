export interface SerializedScene {
  version: string;
  timestamp: string;
  name: string;
  nodes: unknown[];
  lights: unknown[];
  cameras: unknown[];
  materials: unknown[];
  animations: unknown[];
  metadata: Record<string, unknown>;
}

class SerializerService {
  private readonly VERSION = '1.0.0';

  serialize(scene: unknown): SerializedScene {
    return {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      name: 'VirtualStudioScene',
      nodes: (scene as { nodes?: unknown[] })?.nodes ?? [],
      lights: (scene as { lights?: unknown[] })?.lights ?? [],
      cameras: (scene as { cameras?: unknown[] })?.cameras ?? [],
      materials: (scene as { materials?: unknown[] })?.materials ?? [],
      animations: (scene as { animations?: unknown[] })?.animations ?? [],
      metadata: {},
    };
  }

  deserialize(data: SerializedScene): unknown {
    if (data.version !== this.VERSION) {
      console.warn(`[Serializer] Version mismatch: ${data.version} vs ${this.VERSION}`);
    }
    return data;
  }

  toJSON(scene: unknown): string {
    return JSON.stringify(this.serialize(scene), null, 2);
  }

  fromJSON(json: string): unknown {
    const data = JSON.parse(json) as SerializedScene;
    return this.deserialize(data);
  }

  async saveToFile(scene: unknown, filename = 'scene.vss'): Promise<void> {
    const json = this.toJSON(scene);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async loadFromFile(file: File): Promise<unknown> {
    const text = await file.text();
    return this.fromJSON(text);
  }
}

export const serializer = new SerializerService();
export default serializer;

export function saveLocal(scene: unknown, filename = 'scene.vss'): void {
  serializer.saveToFile(scene, filename);
}

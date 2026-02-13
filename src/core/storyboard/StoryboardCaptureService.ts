import { StoryboardFrame } from '../../state/storyboardStore';

type SceneSnapshot = StoryboardFrame['sceneSnapshot'];

export const storyboardCaptureService = {
  initialize: (_renderer?: unknown, _scene?: unknown, _camera?: unknown) => {
    return undefined;
  },
  async captureFrame(): Promise<{ imageUrl: string; thumbnailUrl?: string; sceneSnapshot: SceneSnapshot }>
  {
    const sceneSnapshot: SceneSnapshot = {
      camera: {
        position: [0, 1.6, 3],
        rotation: [0, 0, 0],
        focalLength: 50,
        aperture: 2.8,
      },
      lights: [],
    };
    return {
      imageUrl: '',
      thumbnailUrl: '',
      sceneSnapshot,
    };
  },
  loadSceneSnapshot: (_snapshot?: SceneSnapshot) => {
    return undefined;
  },
};

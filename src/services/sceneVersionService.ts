import { SceneComposition, SceneVersion } from '../core/models/sceneComposer';

const VERSION_STORAGE_KEY = 'virtualStudio_sceneVersions';
const MAX_VERSIONS_PER_SCENE = 50;

export const sceneVersionService = {
  /**
   * Save a version of a scene
   */
  saveVersion(scene: SceneComposition, changes?: string): SceneVersion {
    const versions = this.getVersions(scene.id);
    const versionNumber = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;

    const version: SceneVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sceneId: scene.id,
      version: versionNumber,
      createdAt: new Date().toISOString(),
      changes,
      thumbnail: scene.thumbnail,
      data: {
        cameras: scene.cameras,
        lights: scene.lights,
        actors: scene.actors,
        props: scene.props,
        cameraSettings: scene.cameraSettings,
        layers: scene.layers,
        timeline: scene.timeline,
      },
    };

    versions.push(version);

    // Keep only last MAX_VERSIONS_PER_SCENE versions
    if (versions.length > MAX_VERSIONS_PER_SCENE) {
      versions.shift();
    }

    this.saveVersions(scene.id, versions);
    return version;
  },

  /**
   * Get all versions for a scene
   */
  getVersions(sceneId: string): SceneVersion[] {
    try {
      const stored = localStorage.getItem(VERSION_STORAGE_KEY);
      const allVersions: Record<string, SceneVersion[]> = stored ? JSON.parse(stored) : {};
      return allVersions[sceneId] || [];
    } catch {
      return [];
    }
  },

  /**
   * Get a specific version
   */
  getVersion(sceneId: string, versionNumber: number): SceneVersion | null {
    const versions = this.getVersions(sceneId);
    return versions.find(v => v.version === versionNumber) || null;
  },

  /**
   * Restore scene to a specific version
   */
  restoreToVersion(scene: SceneComposition, versionNumber: number): SceneComposition | null {
    const version = this.getVersion(scene.id, versionNumber);
    if (!version || !version.data) return null;

    const restored: SceneComposition = {
      ...scene,
      ...version.data,
      updatedAt: new Date().toISOString(),
    };

    return restored;
  },

  /**
   * Delete a version
   */
  deleteVersion(sceneId: string, versionId: string): void {
    const versions = this.getVersions(sceneId);
    const filtered = versions.filter(v => v.id !== versionId);
    this.saveVersions(sceneId, filtered);
  },

  /**
   * Save versions for a scene
   */
  saveVersions(sceneId: string, versions: SceneVersion[]): void {
    try {
      const stored = localStorage.getItem(VERSION_STORAGE_KEY);
      const allVersions: Record<string, SceneVersion[]> = stored ? JSON.parse(stored) : {};
      allVersions[sceneId] = versions;
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(allVersions));
    } catch (error) {
      console.error('Error saving versions:', error);
    }
  },
};


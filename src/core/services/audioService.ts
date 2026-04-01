/**
 * Audio Service for Virtual Studio
 * Manages sound playback using Babylon.js Audio Engine
 */

import * as BABYLON from '@babylonjs/core';
import { SoundDefinition, SOUND_LIBRARY, SoundCategory } from '../../data/soundDefinitions';

export interface SoundInstance {
  id: string;
  definitionId: string;
  sound: BABYLON.Sound;
  volume: number;
  isPlaying: boolean;
  is3D: boolean;
  position?: BABYLON.Vector3;
}

export interface CategoryVolumes {
  environment: number;
  atmosphere: number;
  production: number;
  practical: number;
  ambience: number;
  music: number;
  ui: number;
}

class AudioService {
  private scene: BABYLON.Scene | null = null;
  private activeSounds: Map<string, SoundInstance> = new Map();
  private masterVolume = 1.0;
  private categoryVolumes: CategoryVolumes = {
    environment: 1.0,
    atmosphere: 1.0,
    production: 1.0,
    practical: 1.0,
    ambience: 1.0,
    music: 0.5,
    ui: 0.8,
  };
  private muted = false;
  private audioEnabled = true;

  /**
   * Initialize the audio service with a Babylon.js scene
   */
  setScene(scene: BABYLON.Scene): void {
    this.scene = scene;
    console.log('[AudioService] Scene set, audio ready');
  }

  /**
   * Play a sound by its definition ID
   */
  playSound(
    definitionId: string,
    options?: {
      position?: [number, number, number];
      volume?: number;
      loop?: boolean;
    }
  ): string | null {
    if (!this.scene || !this.audioEnabled || this.muted) {
      return null;
    }

    const definition = SOUND_LIBRARY.find((s) => s.id === definitionId);
    if (!definition) {
      console.warn(`[AudioService] Sound definition not found: ${definitionId}`);
      return null;
    }

    const instanceId = `${definitionId}-${Date.now()}`;
    const categoryVol = this.categoryVolumes[definition.category];
    const baseVolume = options?.volume ?? definition.defaultVolume;
    const finalVolume = baseVolume * categoryVol * this.masterVolume;

    const soundOptions: BABYLON.ISoundOptions = {
      volume: finalVolume,
      loop: options?.loop ?? definition.loop,
      autoplay: true,
      spatialSound: definition.spatial,
    };

    if (definition.spatial && options?.position) {
      soundOptions.maxDistance = 50;
      soundOptions.refDistance = 1;
      soundOptions.rolloffFactor = 1;
    }

    try {
      const sound = new BABYLON.Sound(
        instanceId,
        definition.url,
        this.scene,
        () => {
          // Sound loaded callback
          if (!definition.loop) {
            sound.onEndedObservable.addOnce(() => {
              this.stopSound(instanceId);
            });
          }
        },
        {
          ...soundOptions,
          skipCodecCheck: true,
        }
      );

      // Handle load errors gracefully (Babylon.js Sound uses a callback-based approach)
      (sound as BABYLON.Sound & { onError?: (msg: string) => void }).onError = (message: string) => {
        console.warn(`[AudioService] Failed to load audio file: ${definition.url}`, message);
        this.activeSounds.delete(instanceId);
        window.dispatchEvent(new CustomEvent('audio-load-error', {
          detail: { soundId: definitionId, url: definition.url, error: message }
        }));
      };

      if (definition.spatial && options?.position) {
        sound.setPosition(new BABYLON.Vector3(...options.position));
      }

      const instance: SoundInstance = {
        id: instanceId,
        definitionId,
        sound,
        volume: baseVolume,
        isPlaying: true,
        is3D: definition.spatial,
        position: options?.position ? new BABYLON.Vector3(...options.position) : undefined,
      };

      this.activeSounds.set(instanceId, instance);
      console.log(`[AudioService] Playing sound: ${definition.name}`);

      return instanceId;
    } catch (error) {
      console.error(`[AudioService] Failed to play sound: ${definitionId}`, error);
      return null;
    }
  }

  /**
   * Stop a specific sound instance
   */
  stopSound(instanceId: string): void {
    const instance = this.activeSounds.get(instanceId);
    if (instance) {
      instance.sound.stop();
      instance.sound.dispose();
      this.activeSounds.delete(instanceId);
      console.log(`[AudioService] Stopped sound: ${instanceId}`);
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(): void {
    this.activeSounds.forEach((instance, id) => {
      instance.sound.stop();
      instance.sound.dispose();
      console.log(`[AudioService] Stopped sound: ${id}`);
    });
    this.activeSounds.clear();
  }

  /**
   * Pause a specific sound
   */
  pauseSound(instanceId: string): void {
    const instance = this.activeSounds.get(instanceId);
    if (instance && instance.isPlaying) {
      instance.sound.pause();
      instance.isPlaying = false;
    }
  }

  /**
   * Resume a paused sound
   */
  resumeSound(instanceId: string): void {
    const instance = this.activeSounds.get(instanceId);
    if (instance && !instance.isPlaying) {
      instance.sound.play();
      instance.isPlaying = true;
    }
  }

  /**
   * Set volume for a specific sound instance
   */
  setSoundVolume(instanceId: string, volume: number): void {
    const instance = this.activeSounds.get(instanceId);
    if (instance) {
      instance.volume = Math.max(0, Math.min(1, volume));
      const definition = SOUND_LIBRARY.find((s) => s.id === instance.definitionId);
      const categoryVol = definition ? this.categoryVolumes[definition.category] : 1;
      instance.sound.setVolume(instance.volume * categoryVol * this.masterVolume);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set category volume
   */
  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Get category volume
   */
  getCategoryVolume(category: SoundCategory): number {
    return this.categoryVolumes[category];
  }

  /**
   * Update volumes for all active sounds
   */
  private updateAllVolumes(): void {
    this.activeSounds.forEach((instance) => {
      const definition = SOUND_LIBRARY.find((s) => s.id === instance.definitionId);
      if (definition) {
        const categoryVol = this.categoryVolumes[definition.category];
        const finalVolume = this.muted ? 0 : instance.volume * categoryVol * this.masterVolume;
        instance.sound.setVolume(finalVolume);
      }
    });
  }

  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateAllVolumes();
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.updateAllVolumes();
    return this.muted;
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    if (!enabled) {
      this.stopAllSounds();
    }
  }

  /**
   * Update 3D sound position
   */
  updateSoundPosition(instanceId: string, position: [number, number, number]): void {
    const instance = this.activeSounds.get(instanceId);
    if (instance && instance.is3D) {
      const pos = new BABYLON.Vector3(...position);
      instance.sound.setPosition(pos);
      instance.position = pos;
    }
  }

  /**
   * Get all active sound instances
   */
  getActiveSounds(): SoundInstance[] {
    return Array.from(this.activeSounds.values());
  }

  /**
   * Get sound definition by ID
   */
  getSoundDefinition(definitionId: string): SoundDefinition | undefined {
    return SOUND_LIBRARY.find((s) => s.id === definitionId);
  }

  /**
   * Check if a sound is currently playing
   */
  isPlaying(instanceId: string): boolean {
    const instance = this.activeSounds.get(instanceId);
    return instance?.isPlaying ?? false;
  }

  /**
   * Stop all sounds in a category
   */
  stopCategory(category: SoundCategory): void {
    this.activeSounds.forEach((instance, id) => {
      const def = SOUND_LIBRARY.find((s) => s.id === instance.definitionId);
      if (def?.category === category) {
        this.stopSound(id);
      }
    });
  }

  /**
   * Dispose all sounds and cleanup
   */
  dispose(): void {
    this.stopAllSounds();
    this.scene = null;
    console.log('[AudioService] Disposed');
  }
}

export const audioService = new AudioService();


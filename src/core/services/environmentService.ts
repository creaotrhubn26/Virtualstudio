/**
 * Environment Service - Manages studio environment (walls, floors, lighting presets)
 * Integrates with VirtualStudio via events
 */

import type { EnvironmentPlanRoomShell } from '../models/environmentPlan';
import { WallMaterial, getWallById, WALL_MATERIALS } from '../../data/wallDefinitions';
import { FloorMaterial, getFloorById, FLOOR_MATERIALS } from '../../data/floorDefinitions';
import { EnvironmentPreset, getEnvironmentById, ENVIRONMENT_PRESETS } from '../../data/environmentPresets';
import { getPresetById } from '../../data/scenarioPresets';
import { audioService } from './audioService';
import { undoRedoService } from './undoRedoService';
import settingsService, { getCurrentUserId } from '../../services/settingsService';

export interface EnvironmentState {
  roomShell: EnvironmentPlanRoomShell;
  walls: {
    backWall: { materialId: string; visible: boolean };
    leftWall: { materialId: string; visible: boolean };
    rightWall: { materialId: string; visible: boolean };
    rearWall: { materialId: string; visible: boolean };
  };
  floor: {
    materialId: string;
    visible: boolean;
    gridVisible: boolean;
  };
  activePresetId?: string;
  ambientSounds: string[];
}

class EnvironmentService {
  private state: EnvironmentState = {
    roomShell: {
      type: 'studio_shell',
      width: 20,
      depth: 20,
      height: 8,
      openCeiling: true,
      ceilingStyle: 'flat',
      openings: [],
      zones: [],
      fixtures: [],
      niches: [],
      wallSegments: [],
      notes: ['Default virtual studio shell'],
    },
    walls: {
      backWall: { materialId: 'gray-medium', visible: false },
      leftWall: { materialId: 'gray-dark', visible: true },
      rightWall: { materialId: 'gray-dark', visible: true },
      rearWall: { materialId: 'gray-dark', visible: true },
    },
    floor: {
      materialId: 'gray-dark',
      visible: true,
      gridVisible: true,
    },
    ambientSounds: [],
  };

  private listeners: Set<(state: EnvironmentState) => void> = new Set();
  private customPresets: EnvironmentPreset[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).environmentService = this;
    }
    void this.hydrateCustomPresets();
  }

  private async hydrateCustomPresets(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      const remote = await settingsService.getSetting<EnvironmentPreset[]>('virtualStudio_customEnvironments', { userId });
      if (remote) {
        this.customPresets = remote;
      }
    } catch {
      // Ignore hydration errors
    }
  }

  // Subscribe to state changes
  subscribe(listener: (state: EnvironmentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): EnvironmentState {
    return JSON.parse(JSON.stringify(this.state));
  }

  syncRoomShellState(shell: Partial<EnvironmentPlanRoomShell>): EnvironmentPlanRoomShell {
    this.state.roomShell = this.normalizeRoomShell(shell);
    this.notify();
    return this.state.roomShell;
  }

  private normalizeRoomShell(shell: Partial<EnvironmentPlanRoomShell>): EnvironmentPlanRoomShell {
    const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
      }
      return Math.min(max, Math.max(min, value));
    };

    return {
      type: shell.type ?? this.state.roomShell.type,
      width: clamp(shell.width, 4, 60, this.state.roomShell.width),
      depth: clamp(shell.depth, 4, 60, this.state.roomShell.depth),
      height: clamp(shell.height, 2.5, 20, this.state.roomShell.height),
      openCeiling: shell.openCeiling ?? this.state.roomShell.openCeiling,
      ceilingStyle: typeof shell.ceilingStyle === 'string' ? shell.ceilingStyle : this.state.roomShell.ceilingStyle,
      openings: Array.isArray(shell.openings)
        ? shell.openings.map((opening) => ({
          ...opening,
          widthRatio: clamp((opening as any)?.widthRatio, 0.08, 0.95, 0.24),
          heightRatio: clamp((opening as any)?.heightRatio, 0.12, 0.95, 0.5),
          sillHeight: clamp(
            (opening as any)?.sillHeight,
            0,
            4,
            ['window', 'service_window', 'pass_through'].includes(String((opening as any)?.kind || ''))
              ? 1.1
              : 0,
          ),
        }))
        : (Array.isArray(this.state.roomShell.openings) ? [...this.state.roomShell.openings] : []),
      zones: Array.isArray(shell.zones)
        ? shell.zones.map((zone) => ({
          ...zone,
          xBias: clamp((zone as any)?.xBias, -1, 1, 0),
          zBias: clamp((zone as any)?.zBias, -1, 1, 0),
          widthRatio: clamp((zone as any)?.widthRatio, 0.08, 1, 0.24),
          depthRatio: clamp((zone as any)?.depthRatio, 0.08, 1, 0.24),
        }))
        : (Array.isArray(this.state.roomShell.zones) ? [...this.state.roomShell.zones] : []),
      fixtures: Array.isArray(shell.fixtures)
        ? shell.fixtures.map((fixture) => ({
          ...fixture,
          xBias: clamp((fixture as any)?.xBias, -1, 1, 0),
          zBias: clamp((fixture as any)?.zBias, -1, 1, 0),
          widthRatio: clamp((fixture as any)?.widthRatio, 0.08, 1, 0.24),
          depthRatio: clamp((fixture as any)?.depthRatio, 0.08, 1, 0.16),
          height: clamp((fixture as any)?.height, 0.2, 4.5, 1.0),
        }))
        : (Array.isArray(this.state.roomShell.fixtures) ? [...this.state.roomShell.fixtures] : []),
      niches: Array.isArray(shell.niches)
        ? shell.niches.map((niche) => ({
          ...niche,
          widthRatio: clamp((niche as any)?.widthRatio, 0.08, 0.9, 0.22),
          heightRatio: clamp((niche as any)?.heightRatio, 0.12, 0.8, 0.32),
          sillHeight: clamp((niche as any)?.sillHeight, 0, 4, 0.4),
          depth: clamp((niche as any)?.depth, 0.08, 1.2, 0.24),
        }))
        : (Array.isArray(this.state.roomShell.niches) ? [...this.state.roomShell.niches] : []),
      wallSegments: Array.isArray(shell.wallSegments)
        ? shell.wallSegments.map((segment) => ({
          ...segment,
          widthRatio: clamp((segment as any)?.widthRatio, 0.08, 0.9, 0.2),
          heightRatio: clamp((segment as any)?.heightRatio, 0.12, 0.9, 0.42),
          sillHeight: clamp((segment as any)?.sillHeight, 0, 4, 0.18),
          depth: clamp((segment as any)?.depth, 0.03, 0.8, 0.12),
        }))
        : (Array.isArray(this.state.roomShell.wallSegments) ? [...this.state.roomShell.wallSegments] : []),
      notes: Array.isArray(shell.notes) ? [...shell.notes] : this.state.roomShell.notes,
    };
  }

  /**
   * Initialize default materials for walls and floor
   * Should be called when VirtualStudio starts
   */
  initializeDefaults(): void {
    // Apply default wall materials
    Object.entries(this.state.walls).forEach(([wallId, config]) => {
      this.setWallMaterial(wallId, config.materialId);
      this.toggleWall(wallId, config.visible);
    });

    // Apply default floor material
    this.setFloorMaterial(this.state.floor.materialId);
    this.toggleFloor(this.state.floor.visible);
    this.toggleGrid(this.state.floor.gridVisible);
  }

  applyRoomShell(shell: Partial<EnvironmentPlanRoomShell>): void {
    this.state.roomShell = this.normalizeRoomShell(shell);

    window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
      detail: {
        shell: this.state.roomShell,
      },
    }));

    this.notify();
  }

  // Wall methods
  setWallMaterial(wallId: string, materialId: string): void {
    const material = getWallById(materialId);
    if (!material) return;

    const wallKey = wallId as keyof typeof this.state.walls;
    if (this.state.walls[wallKey]) {
      const oldMaterialId = this.state.walls[wallKey].materialId;
      this.state.walls[wallKey].materialId = materialId;
      
      // Register undo/redo action
      const actionId = `set-wall-material-${wallId}-${Date.now()}`;
      undoRedoService.registerAction({
        id: actionId,
        type: 'UPDATE_PROPERTY',
        description: `Endret vegg-materiale: ${wallId}`,
        timestamp: Date.now(),
        data: { wallId, oldMaterialId, newMaterialId: materialId },
        undo: () => {
          // Directly restore without registering new action
          const oldMaterial = getWallById(oldMaterialId);
          if (oldMaterial) {
            this.state.walls[wallKey].materialId = oldMaterialId;
            window.dispatchEvent(new CustomEvent('ch-set-wall-material', {
              detail: { wallId, material: oldMaterial }
            }));
            this.notify();
          }
        },
        redo: () => {
          // Directly restore without registering new action
          const newMaterial = getWallById(materialId);
          if (newMaterial) {
            this.state.walls[wallKey].materialId = materialId;
            window.dispatchEvent(new CustomEvent('ch-set-wall-material', {
              detail: { wallId, material: newMaterial }
            }));
            this.notify();
          }
        },
      });
      
      // Dispatch event to VirtualStudio with full material data
      window.dispatchEvent(new CustomEvent('ch-set-wall-material', {
        detail: { wallId, material }
      }));

      this.notify();
    }
  }

  setAllWallsMaterial(materialId: string): void {
    ['backWall', 'leftWall', 'rightWall', 'rearWall'].forEach(wallId => {
      this.setWallMaterial(wallId, materialId);
    });
  }

  toggleWall(wallId: string, visible?: boolean): void {
    const wallKey = wallId as keyof typeof this.state.walls;
    if (this.state.walls[wallKey]) {
      const oldVisible = this.state.walls[wallKey].visible;
      const newVisible = visible !== undefined ? visible : !oldVisible;
      this.state.walls[wallKey].visible = newVisible;
      
      // Register undo/redo action (before changing state)
      undoRedoService.registerAction({
        id: `toggle-wall-${wallId}-${Date.now()}`,
        type: 'UPDATE_PROPERTY',
        description: `${newVisible ? 'Viste' : 'Skjulte'} vegg: ${wallId}`,
        timestamp: Date.now(),
        data: { wallId, oldVisible, newVisible },
        undo: () => {
          this.state.walls[wallKey].visible = oldVisible;
          window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
            detail: { wallId, visible: oldVisible }
          }));
          this.notify();
        },
        redo: () => {
          this.state.walls[wallKey].visible = newVisible;
          window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
            detail: { wallId, visible: newVisible }
          }));
          this.notify();
        },
      });
      
      window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
        detail: { wallId, visible: newVisible }
      }));
      
      this.notify();
    }
  }

  toggleAllWalls(visible?: boolean): void {
    const newVisible = visible !== undefined ? visible : !this.state.walls.backWall.visible;
    Object.keys(this.state.walls).forEach(wallId => {
      this.state.walls[wallId as keyof typeof this.state.walls].visible = newVisible;
    });
    
    window.dispatchEvent(new CustomEvent('ch-toggle-walls', { detail: { visible: newVisible } }));
    this.notify();
  }

  // Floor methods
  setFloorMaterial(materialId: string): void {
    const material = getFloorById(materialId);
    if (!material) return;

    const oldMaterialId = this.state.floor.materialId;
    this.state.floor.materialId = materialId;
    
    // Register undo/redo action
    undoRedoService.registerAction({
      id: `set-floor-material-${Date.now()}`,
      type: 'UPDATE_PROPERTY',
      description: 'Endret gulv-materiale',
      timestamp: Date.now(),
      data: { oldMaterialId, newMaterialId: materialId },
      undo: () => {
        // Directly restore without registering new action
        const oldMaterial = getFloorById(oldMaterialId);
        if (oldMaterial) {
          this.state.floor.materialId = oldMaterialId;
          window.dispatchEvent(new CustomEvent('ch-set-floor-material', {
            detail: { material: oldMaterial }
          }));
          this.notify();
        }
      },
      redo: () => {
        // Directly restore without registering new action
        const newMaterial = getFloorById(materialId);
        if (newMaterial) {
          this.state.floor.materialId = materialId;
          window.dispatchEvent(new CustomEvent('ch-set-floor-material', {
            detail: { material: newMaterial }
          }));
          this.notify();
        }
      },
    });
    
    // Dispatch event to VirtualStudio with full material data
    window.dispatchEvent(new CustomEvent('ch-set-floor-material', {
      detail: { material }
    }));

    this.notify();
  }

  toggleFloor(visible?: boolean): void {
    const newVisible = visible !== undefined ? visible : !this.state.floor.visible;
    this.state.floor.visible = newVisible;
    
    window.dispatchEvent(new CustomEvent('ch-toggle-floor', { detail: { visible: newVisible } }));
    this.notify();
  }

  toggleGrid(visible?: boolean): void {
    const newVisible = visible !== undefined ? visible : !this.state.floor.gridVisible;
    this.state.floor.gridVisible = newVisible;
    
    window.dispatchEvent(new CustomEvent('ch-toggle-grid', { detail: { visible: newVisible } }));
    this.notify();
  }

  // Environment preset methods
  applyPreset(presetId: string): void {
    const preset = getEnvironmentById(presetId);
    if (!preset) return;

    const oldState = JSON.parse(JSON.stringify(this.state));
    const oldPresetId = this.state.activePresetId;
    
    // Register undo/redo action BEFORE applying
    undoRedoService.registerAction({
      id: `apply-preset-${presetId}-${Date.now()}`,
      type: 'LOAD_PRESET',
      description: `Anvendte miljø-preset: ${preset.nameNo || preset.name}`,
      timestamp: Date.now(),
      data: { presetId, oldPresetId, oldState },
      undo: () => {
        // Restore old state directly
        this.state = JSON.parse(JSON.stringify(oldState));
        // Re-apply old preset if it existed
        if (oldPresetId) {
          const oldPreset = getEnvironmentById(oldPresetId);
          if (oldPreset) {
            Object.entries(oldPreset.walls).forEach(([wallId, config]) => {
              const wallKey = wallId as keyof typeof this.state.walls;
              this.state.walls[wallKey].materialId = config.materialId;
              this.state.walls[wallKey].visible = config.visible;
              window.dispatchEvent(new CustomEvent('ch-set-wall-color', {
                detail: { color: getWallById(config.materialId)?.color || '#808080', wallId }
              }));
              window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
                detail: { wallId, visible: config.visible }
              }));
            });
            this.state.floor.materialId = oldPreset.floor.materialId;
            this.state.floor.visible = oldPreset.floor.visible;
            this.state.floor.gridVisible = oldPreset.floor.gridVisible ?? true;
            window.dispatchEvent(new CustomEvent('ch-set-floor-color', {
              detail: { color: getFloorById(oldPreset.floor.materialId)?.color || '#404040' }
            }));
            window.dispatchEvent(new CustomEvent('ch-toggle-floor', {
              detail: { visible: oldPreset.floor.visible }
            }));
            window.dispatchEvent(new CustomEvent('ch-toggle-grid', {
              detail: { visible: oldPreset.floor.gridVisible ?? true }
            }));
          }
        } else {
          // Restore walls and floor from old state directly
          Object.entries(oldState.walls).forEach(([wallId, config]) => {
            const wallKey = wallId as keyof typeof this.state.walls;
            const wallConfig = config as { materialId: string; visible: boolean };
            this.state.walls[wallKey] = { ...wallConfig };
            window.dispatchEvent(new CustomEvent('ch-set-wall-color', {
              detail: { color: getWallById(wallConfig.materialId)?.color || '#808080', wallId }
            }));
            window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
              detail: { wallId, visible: wallConfig.visible }
            }));
          });
          this.state.floor = { ...oldState.floor };
          window.dispatchEvent(new CustomEvent('ch-set-floor-color', {
            detail: { color: getFloorById(oldState.floor.materialId)?.color || '#404040' }
          }));
          window.dispatchEvent(new CustomEvent('ch-toggle-floor', {
            detail: { visible: oldState.floor.visible }
          }));
          window.dispatchEvent(new CustomEvent('ch-toggle-grid', {
            detail: { visible: oldState.floor.gridVisible }
          }));
        }
        this.notify();
      },
      redo: () => {
        // Re-apply preset directly
        this.state.activePresetId = presetId;
        Object.entries(preset.walls).forEach(([wallId, config]) => {
          const wallKey = wallId as keyof typeof this.state.walls;
          this.state.walls[wallKey].materialId = config.materialId;
          this.state.walls[wallKey].visible = config.visible;
          window.dispatchEvent(new CustomEvent('ch-set-wall-color', {
            detail: { color: getWallById(config.materialId)?.color || '#808080', wallId }
          }));
          window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
            detail: { wallId, visible: config.visible }
          }));
        });
        this.state.floor.materialId = preset.floor.materialId;
        this.state.floor.visible = preset.floor.visible;
        this.state.floor.gridVisible = preset.floor.gridVisible ?? true;
        window.dispatchEvent(new CustomEvent('ch-set-floor-color', {
          detail: { color: getFloorById(preset.floor.materialId)?.color || '#404040' }
        }));
        window.dispatchEvent(new CustomEvent('ch-toggle-floor', {
          detail: { visible: preset.floor.visible }
        }));
        window.dispatchEvent(new CustomEvent('ch-toggle-grid', {
          detail: { visible: preset.floor.gridVisible ?? true }
        }));
        this.notify();
      },
    });
    
    this.state.activePresetId = presetId;

    // Apply walls
    Object.entries(preset.walls).forEach(([wallId, config]) => {
      this.setWallMaterial(wallId, config.materialId);
      this.toggleWall(wallId, config.visible);
    });

    // Apply floor
    this.setFloorMaterial(preset.floor.materialId);
    this.toggleFloor(preset.floor.visible);
    if (preset.floor.gridVisible !== undefined) {
      this.toggleGrid(preset.floor.gridVisible);
    }

    // Track analytics
    if ((window as any).sceneAnalyticsService) {
      (window as any).sceneAnalyticsService.trackEnvironmentUsage('current', 'preset');
    }
    
    // Apply lighting preset if specified
    if (preset.lightingPreset) {
      const lightingPreset = getPresetById(preset.lightingPreset);
      if (lightingPreset) {
        window.dispatchEvent(new CustomEvent('applyScenarioPreset', {
          detail: lightingPreset
        }));
      }
    }

    // Apply suggested lights
    if (preset.suggestedLights) {
      window.dispatchEvent(new CustomEvent('ch-apply-suggested-lights', {
        detail: { lights: preset.suggestedLights }
      }));
    }

    // Apply camera preset
    if (preset.cameraPreset) {
      window.dispatchEvent(new CustomEvent('ch-set-camera-preset', {
        detail: preset.cameraPreset
      }));
    }

    // Stop current ambient sounds and play new ones
    this.stopAllAmbientSounds();
    if (preset.ambientSounds && preset.ambientSounds.length > 0) {
      this.state.ambientSounds = preset.ambientSounds;
      preset.ambientSounds.forEach(soundId => {
        audioService.playSound(soundId, { loop: true });
      });
    }

    this.notify();

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('ch-environment-changed', {
      detail: { presetId, preset }
    }));
  }

  stopAllAmbientSounds(): void {
    // Stop all active sounds that match our ambient sound IDs
    const activeSounds = audioService.getActiveSounds();
    activeSounds.forEach(instance => {
      if (this.state.ambientSounds.includes(instance.definitionId)) {
        audioService.stopSound(instance.id);
      }
    });
    this.state.ambientSounds = [];
  }

  setAmbientSounds(soundIds: string[]): void {
    this.stopAllAmbientSounds();

    soundIds.forEach(soundId => {
      audioService.playSound(soundId, { loop: true });
    });

    this.state.ambientSounds = [...soundIds];
    this.notify();
  }

  /**
   * Apply atmosphere settings directly (fog, ambient, clear color)
   */
  applyAtmosphere(settings: {
    fogEnabled?: boolean;
    fogDensity?: number;
    fogColor?: string;
    clearColor?: string;
    ambientColor?: string;
    ambientIntensity?: number;
  }): void {
    // Track analytics
    if ((window as any).sceneAnalyticsService) {
      (window as any).sceneAnalyticsService.trackEnvironmentUsage('current', 'atmosphere');
    }
    
    // Dispatch event to VirtualStudio to apply atmosphere
    window.dispatchEvent(new CustomEvent('ch-apply-atmosphere', {
      detail: settings
    }));

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('ch-atmosphere-changed', {
      detail: settings
    }));

    this.notify();
  }

  /**
   * Clear all environment elements (walls, floors, atmosphere)
   */
  clearEnvironment(): void {
    const oldState = JSON.parse(JSON.stringify(this.state));
    
    // Register undo/redo action BEFORE clearing
    undoRedoService.registerAction({
      id: `clear-environment-${Date.now()}`,
      type: 'CLEAR_SCENE',
      description: 'Tømte miljø',
      timestamp: Date.now(),
      data: { oldState },
      undo: () => {
        // Restore old state directly
        this.state = JSON.parse(JSON.stringify(oldState));
        if (oldState.roomShell) {
          this.applyRoomShell(oldState.roomShell);
        }
        // Restore walls and floor
        Object.entries(oldState.walls).forEach(([wallId, config]) => {
          const wallKey = wallId as keyof typeof this.state.walls;
          const wallConfig = config as { materialId: string; visible: boolean };
          this.state.walls[wallKey] = { ...wallConfig };
          window.dispatchEvent(new CustomEvent('ch-set-wall-color', {
            detail: { color: getWallById(wallConfig.materialId)?.color || '#808080', wallId }
          }));
          window.dispatchEvent(new CustomEvent('ch-toggle-wall', {
            detail: { wallId, visible: wallConfig.visible }
          }));
        });
        this.state.floor = { ...oldState.floor };
        window.dispatchEvent(new CustomEvent('ch-set-floor-color', {
          detail: { color: getFloorById(oldState.floor.materialId)?.color || '#404040' }
        }));
        window.dispatchEvent(new CustomEvent('ch-toggle-floor', {
          detail: { visible: oldState.floor.visible }
        }));
        window.dispatchEvent(new CustomEvent('ch-toggle-grid', {
          detail: { visible: oldState.floor.gridVisible }
        }));
        // Restore ambient sounds
        if (oldState.ambientSounds) {
          oldState.ambientSounds.forEach((soundId: string) => {
            audioService.playSound(soundId, { loop: true });
          });
          this.state.ambientSounds = [...oldState.ambientSounds];
        }
        this.notify();
      },
      redo: () => {
        // Clear again directly
        this.stopAllAmbientSounds();
        window.dispatchEvent(new CustomEvent('ch-clear-environment'));
        this.state.activePresetId = undefined;
        this.state.ambientSounds = [];
        this.notify();
      },
    });
    
    // Stop all ambient sounds
    this.stopAllAmbientSounds();

    // Dispatch event to VirtualStudio to clear environment
    window.dispatchEvent(new CustomEvent('ch-clear-environment'));

    // Reset state
    this.state.activePresetId = undefined;
    this.state.ambientSounds = [];

    this.notify();
  }

  // Get available presets
  getPresets(): EnvironmentPreset[] {
    return ENVIRONMENT_PRESETS;
  }

  getWallMaterials(): WallMaterial[] {
    return WALL_MATERIALS;
  }

  getFloorMaterials(): FloorMaterial[] {
    return FLOOR_MATERIALS;
  }

  // Save current state as custom preset
  saveAsCustomPreset(name: string): EnvironmentPreset {
    const customPreset: EnvironmentPreset = {
      id: `custom-${Date.now()}`,
      name,
      nameNo: name,
      category: 'studio',
      description: 'Custom environment preset',
      descriptionNo: 'Tilpasset miljøpreset',
      walls: { ...this.state.walls },
      floor: { ...this.state.floor },
      ambientSounds: [...this.state.ambientSounds],
      moodTags: [],
      tags: ['custom'],
    };

    // Save to settings cache
    const customPresets = this.getCustomPresets();
    customPresets.push(customPreset);
    this.customPresets = customPresets;
    void settingsService.setSetting('virtualStudio_customEnvironments', customPresets, { userId: getCurrentUserId() });

    return customPreset;
  }

  getCustomPresets(): EnvironmentPreset[] {
    return this.customPresets;
  }

  deleteCustomPreset(presetId: string): void {
    const customPresets = this.getCustomPresets().filter(p => p.id !== presetId);
    this.customPresets = customPresets;
    void settingsService.setSetting('virtualStudio_customEnvironments', customPresets, { userId: getCurrentUserId() });
  }

  // Export/Import
  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importState(json: string): void {
    try {
      const imported = JSON.parse(json) as EnvironmentState;

      if (imported.roomShell) {
        this.applyRoomShell(imported.roomShell);
      }

      // Apply imported state
      Object.entries(imported.walls).forEach(([wallId, config]) => {
        this.setWallMaterial(wallId, config.materialId);
        this.toggleWall(wallId, config.visible);
      });

      this.setFloorMaterial(imported.floor.materialId);
      this.toggleFloor(imported.floor.visible);
      this.toggleGrid(imported.floor.gridVisible);

      if (imported.ambientSounds) {
        this.stopAllAmbientSounds();
        imported.ambientSounds.forEach(soundId => {
          audioService.playSound(soundId, { loop: true });
        });
        this.state.ambientSounds = imported.ambientSounds;
      }

      this.notify();
    } catch (error) {
      console.error('Failed to import environment state:', error);
    }
  }
}

// Singleton export
export const environmentService = new EnvironmentService();

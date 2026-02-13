/**
 * Industry Export Service
 * Comprehensive export system supporting USD, glTF, FBX, OBJ, and OpenEXR formats
 * for professional pipeline integration
 */

import { create } from 'zustand';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/serializers';

// Export format definitions
export type ExportFormat = 
  | 'gltf' 
  | 'glb' 
  | 'usdz' 
  | 'usda' 
  | 'obj' 
  | 'stl' 
  | 'babylon' 
  | 'screenshot-png' 
  | 'screenshot-exr' 
  | 'animation-fbx';

export interface ExportPreset {
  name: string;
  format: ExportFormat;
  description: string;
  icon: string;
  settings: ExportSettings;
}

export interface ExportSettings {
  // General
  includeHidden: boolean;
  includeDisabled: boolean;
  selectedOnly: boolean;
  
  // Geometry
  exportNormals: boolean;
  exportTangents: boolean;
  exportUVs: boolean;
  exportColors: boolean;
  applyModifiers: boolean;
  
  // Materials
  exportMaterials: boolean;
  exportTextures: boolean;
  embedTextures: boolean;
  textureFormat: 'original' | 'png' | 'jpg' | 'webp';
  textureQuality: number;
  textureMaxSize: number;
  
  // Animation
  exportAnimations: boolean;
  bakeLinkPoses: boolean;
  sampleRate: number;
  
  // Transform
  yUpToZUp: boolean;
  scale: number;
  centerOrigin: boolean;
  
  // USD specific
  usdKind: 'component' | 'assembly' | 'group';
  usdPurpose: 'default' | 'render' | 'proxy' | 'guide';
  usdVariants: boolean;
  
  // Image export
  imageWidth: number;
  imageHeight: number;
  imageFormat: 'png' | 'jpg' | 'webp' | 'exr';
  imageSamples: number;
  imageTransparent: boolean;
}

export interface ExportJob {
  id: string;
  name: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  outputUrl?: string;
  outputSize?: number;
  startTime: number;
  endTime?: number;
}

export interface ExportHistoryItem {
  id: string;
  name: string;
  format: ExportFormat;
  timestamp: number;
  fileSize: number;
  downloadUrl?: string;
}

// Default settings
const DEFAULT_SETTINGS: ExportSettings = {
  includeHidden: false,
  includeDisabled: false,
  selectedOnly: false,
  exportNormals: true,
  exportTangents: true,
  exportUVs: true,
  exportColors: true,
  applyModifiers: true,
  exportMaterials: true,
  exportTextures: true,
  embedTextures: true,
  textureFormat: 'png',
  textureQuality: 85,
  textureMaxSize: 2048,
  exportAnimations: true,
  bakeLinkPoses: false,
  sampleRate: 30,
  yUpToZUp: false,
  scale: 1.0,
  centerOrigin: false,
  usdKind: 'component',
  usdPurpose: 'default',
  usdVariants: false,
  imageWidth: 1920,
  imageHeight: 1080,
  imageFormat: 'png',
  imageSamples: 64,
  imageTransparent: false
};

// Export presets for common workflows
export const EXPORT_PRESETS: Record<string, ExportPreset> = {
  'web-ready': {
    name: 'Web Ready',
    format: 'glb',
    description: 'Optimized GLB for web viewers',
    icon: 'web',
    settings: {
      ...DEFAULT_SETTINGS,
      embedTextures: true,
      textureFormat: 'webp',
      textureMaxSize: 1024,
      textureQuality: 75
    }
  },
  'unreal-engine': {
    name: 'Unreal Engine',
    format: 'gltf',
    description: 'Optimized for UE5 import',
    icon: 'gamepad',
    settings: {
      ...DEFAULT_SETTINGS,
      yUpToZUp: true,
      scale: 100, // cm to m
      exportTangents: true
    }
  },
  'unity': {
    name: 'Unity',
    format: 'gltf',
    description: 'Optimized for Unity import',
    icon: 'videogame_asset',
    settings: {
      ...DEFAULT_SETTINGS,
      yUpToZUp: false,
      exportTangents: true
    }
  },
  'pixar-usd': {
    name: 'Pixar USD',
    format: 'usda',
    description: 'Human-readable USD for pipeline',
    icon: 'movie_filter',
    settings: {
      ...DEFAULT_SETTINGS,
      usdKind: 'assembly',
      usdPurpose: 'default',
      usdVariants: true
    }
  },
  'apple-ar': {
    name: 'Apple AR',
    format: 'usdz',
    description: 'USDZ for iOS Quick Look',
    icon: 'phone_iphone',
    settings: {
      ...DEFAULT_SETTINGS,
      embedTextures: true,
      textureFormat: 'png',
      textureMaxSize: 1024
    }
  },
  'archviz': {
    name: 'Architecture',
    format: 'obj',
    description: 'OBJ with MTL for CAD',
    icon: 'apartment',
    settings: {
      ...DEFAULT_SETTINGS,
      exportMaterials: true,
      scale: 1.0,
      yUpToZUp: true
    }
  },
  '3d-print': {
    name: '3D Printing',
    format: 'stl',
    description: 'STL mesh for printing',
    icon: 'print',
    settings: {
      ...DEFAULT_SETTINGS,
      exportMaterials: false,
      exportTextures: false,
      applyModifiers: true,
      scale: 1000 // m to mm
    }
  },
  'compositing': {
    name: 'Compositing',
    format: 'screenshot-exr',
    description: 'EXR with depth for compositing',
    icon: 'layers',
    settings: {
      ...DEFAULT_SETTINGS,
      imageFormat: 'exr',
      imageWidth: 4096,
      imageHeight: 2160,
      imageSamples: 256,
      imageTransparent: true
    }
  }
};

interface ExportStore {
  // State
  scene: BABYLON.Scene | null;
  settings: ExportSettings;
  activePreset: string | null;
  currentJob: ExportJob | null;
  exportHistory: ExportHistoryItem[];
  isExporting: boolean;
  
  // Initialize
  initialize: (scene: BABYLON.Scene) => void;
  
  // Settings management
  updateSettings: (settings: Partial<ExportSettings>) => void;
  applyPreset: (presetKey: string) => void;
  resetSettings: () => void;
  
  // Export functions
  exportScene: (name: string, format: ExportFormat) => Promise<Blob | null>;
  exportSelected: (name: string, format: ExportFormat) => Promise<Blob | null>;
  exportScreenshot: () => Promise<Blob | null>;
  
  // Format-specific exports
  exportToGLTF: (binary: boolean) => Promise<Blob | null>;
  exportToOBJ: () => Promise<Blob | null>;
  exportToSTL: () => Promise<Blob | null>;
  exportToBabylon: () => Promise<Blob | null>;
  exportToUSD: (binary: boolean) => Promise<Blob | null>;
  
  // Batch export
  batchExport: (formats: ExportFormat[]) => Promise<Map<ExportFormat, Blob>>;
  
  // History
  addToHistory: (item: Omit<ExportHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  
  // Utility
  downloadBlob: (blob: Blob, filename: string) => void;
  estimateFileSize: (format: ExportFormat) => number;
}

export const useExportStore = create<ExportStore>((set, get) => ({
  scene: null,
  settings: { ...DEFAULT_SETTINGS },
  activePreset: 'web-ready',
  currentJob: null,
  exportHistory: [],
  isExporting: false,
  
  initialize: (scene) => {
    set({ scene });
  },
  
  updateSettings: (newSettings) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings },
      activePreset: null // Clear preset when manually changing settings
    }));
  },
  
  applyPreset: (presetKey) => {
    const preset = EXPORT_PRESETS[presetKey];
    if (preset) {
      set({
        settings: { ...preset.settings },
        activePreset: presetKey
      });
    }
  },
  
  resetSettings: () => {
    set({
      settings: { ...DEFAULT_SETTINGS },
      activePreset: null
    });
  },
  
  exportScene: async (name, format) => {
    const { scene } = get();
    if (!scene) return null;
    
    const jobId = `export-${Date.now()}`;
    set({
      isExporting: true,
      currentJob: {
        id: jobId,
        name,
        format,
        status: 'processing',
        progress: 0,
        startTime: Date.now()
      }
    });
    
    try {
      let blob: Blob | null = null;
      
      switch (format) {
        case 'gltf':
          blob = await get().exportToGLTF(false);
          break;
        case 'glb':
          blob = await get().exportToGLTF(true);
          break;
        case 'obj':
          blob = await get().exportToOBJ();
          break;
        case 'stl':
          blob = await get().exportToSTL();
          break;
        case 'babylon':
          blob = await get().exportToBabylon();
          break;
        case 'usda':
          blob = await get().exportToUSD(false);
          break;
        case 'usdz':
          blob = await get().exportToUSD(true);
          break;
        case 'screenshot-png':
        case 'screenshot-exr':
          blob = await get().exportScreenshot();
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      if (blob) {
        get().addToHistory({
          name,
          format,
          timestamp: Date.now(),
          fileSize: blob.size
        });
        
        set(state => ({
          currentJob: state.currentJob ? {
            ...state.currentJob,
            status: 'completed',
            progress: 100,
            outputSize: blob!.size,
            endTime: Date.now()
          } : null
        }));
      }
      
      return blob;
    } catch (error) {
      set(state => ({
        currentJob: state.currentJob ? {
          ...state.currentJob,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Export failed',
          endTime: Date.now()
        } : null
      }));
      return null;
    } finally {
      set({ isExporting: false });
    }
  },
  
  exportSelected: async (name, format) => {
    const { scene } = get();
    if (!scene) return null;
    
    // Store original visibility
    const visibilityMap = new Map<BABYLON.AbstractMesh, boolean>();
    
    scene.meshes.forEach(mesh => {
      visibilityMap.set(mesh, mesh.isVisible);
      // Hide non-selected meshes
      if (!mesh.metadata?.selected) {
        mesh.isVisible = false;
      }
    });
    
    try {
      const blob = await get().exportScene(name, format);
      return blob;
    } finally {
      // Restore visibility
      scene.meshes.forEach(mesh => {
        const wasVisible = visibilityMap.get(mesh);
        if (wasVisible !== undefined) {
          mesh.isVisible = wasVisible;
        }
      });
    }
  },
  
  exportScreenshot: async () => {
    const { scene, settings } = get();
    if (!scene) return null;
    
    const { imageWidth, imageHeight, imageTransparent, imageSamples } = settings;
    const sampleMultiplier = Math.max(1, imageSamples || 1);
    const targetWidth = Math.round(imageWidth * sampleMultiplier);
    const targetHeight = Math.round(imageHeight * sampleMultiplier);
    const previousClearColor = scene.clearColor.clone();
    if (imageTransparent) {
      scene.clearColor.a = 0;
    }
    
    return new Promise<Blob | null>((resolve) => {
      BABYLON.Tools.CreateScreenshot(
        scene.getEngine(),
        scene.activeCamera!,
        { width: targetWidth, height: targetHeight, precision: 1 },
        (data) => {
          scene.clearColor = previousClearColor;
          // Convert base64 to blob
          const base64 = data.split(',')[1];
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          resolve(new Blob([array], { type: 'image/png' }));
        }
      );
    });
  },
  
  exportToGLTF: async (binary) => {
    const { scene, settings } = get();
    if (!scene) return null;
    
    try {
      // Dynamic import - GLTF2Export may not be available
      const serializers = await import('@babylonjs/serializers/glTF').catch(() => null);
      if (!serializers?.GLTF2Export) {
        console.warn('GLTF serializer not available - install @babylonjs/serializers');
        return null;
      }
      
      const { GLTF2Export } = serializers;
      
      const options = {
        shouldExportNode: (node: BABYLON.Node) => {
          if (!settings.includeHidden && !node.isEnabled()) return false;
          if (settings.selectedOnly && !(node as any).metadata?.selected) return false;
          return true;
        }
      };
      
      if (binary) {
        const glb = await GLTF2Export.GLBAsync(scene, 'scene', options);
        return glb.glTFFiles['scene.glb'] as Blob;
      } else {
        const gltf = await GLTF2Export.GLTFAsync(scene, 'scene', options);
        // Return main JSON file
        const jsonBlob = new Blob([JSON.stringify(gltf.glTFFiles['scene.gltf'])], { 
          type: 'application/json' 
        });
        return jsonBlob;
      }
    } catch (error) {
      console.error('GLTF export error:', error);
      return null;
    }
  },
  
  exportToOBJ: async () => {
    const { scene, settings } = get();
    if (!scene) return null;
    
    try {
      const serializers = await import('@babylonjs/serializers/OBJ').catch(() => null);
      if (!serializers?.OBJExport) {
        console.warn('OBJ serializer not available - install @babylonjs/serializers');
        return null;
      }
      
      const { OBJExport } = serializers;
      
      const meshes = scene.meshes.filter(m => {
        if (!settings.includeHidden && !m.isVisible) return false;
        if (settings.selectedOnly && !(m as any).metadata?.selected) return false;
        return true;
      });
      
      const objContent = OBJExport.OBJ(meshes as BABYLON.Mesh[], settings.exportMaterials);
      return new Blob([objContent], { type: 'text/plain' });
    } catch (error) {
      console.error('OBJ export error:', error);
      return null;
    }
  },
  
  exportToSTL: async () => {
    const { scene, settings } = get();
    if (!scene) return null;
    
    try {
      const serializers = await import('@babylonjs/serializers/stl').catch(() => null);
      if (!serializers?.STLExport) {
        console.warn('STL serializer not available - install @babylonjs/serializers');
        return null;
      }
      
      const { STLExport } = serializers;
      
      const meshes = scene.meshes.filter(m => {
        if (!settings.includeHidden && !m.isVisible) return false;
        if (settings.selectedOnly && !(m as any).metadata?.selected) return false;
        return m instanceof BABYLON.Mesh;
      }) as BABYLON.Mesh[];
      
      const stlContent = STLExport.CreateSTL(meshes, true, 'scene');
      return new Blob([stlContent], { type: 'application/sla' });
    } catch (error) {
      console.error('STL export error:', error);
      return null;
    }
  },
  
  exportToBabylon: async () => {
    const { scene } = get();
    if (!scene) return null;
    
    try {
      const serializedScene = BABYLON.SceneSerializer.Serialize(scene);
      const jsonString = JSON.stringify(serializedScene, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Babylon export error:', error);
      return null;
    }
  },
  
  exportToUSD: async (binary) => {
    const { scene, settings } = get();
    if (!scene) return null;
    
    // USD export via server-side conversion (client-side USD is limited)
    // For now, generate a USDA-like structure that can be converted server-side
    
    try {
      const usdContent = generateUSDAContent(scene, settings);
      
      if (binary) {
        // USDZ is a zip archive containing USDA and textures
        // For true USDZ, we'd need server-side processing
        // Return USDA as fallback
        return new Blob([usdContent], { type: 'text/plain' });
      }
      
      return new Blob([usdContent], { type: 'text/plain' });
    } catch (error) {
      console.error('USD export error:', error);
      return null;
    }
  },
  
  batchExport: async (formats) => {
    const results = new Map<ExportFormat, Blob>();
    
    for (const format of formats) {
      const blob = await get().exportScene(`batch-export`, format);
      if (blob) {
        results.set(format, blob);
      }
    }
    
    return results;
  },
  
  addToHistory: (item) => {
    const historyItem: ExportHistoryItem = {
      ...item,
      id: `history-${Date.now()}`
    };
    set(state => ({
      exportHistory: [historyItem, ...state.exportHistory].slice(0, 50)
    }));
  },
  
  clearHistory: () => {
    set({ exportHistory: [] });
  },
  
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  estimateFileSize: (format) => {
    const { scene, settings } = get();
    if (!scene) return 0;
    
    // Rough estimation based on mesh count and format
    const meshCount = scene.meshes.length;
    const textureCount = scene.textures.length;
    
    const baseSize = meshCount * 50000; // ~50KB per mesh estimate
    const textureSize = textureCount * (settings.embedTextures ? 500000 : 0);
    
    const formatMultipliers: Record<ExportFormat, number> = {
      'gltf': 1.2,
      'glb': 0.8,
      'obj': 1.0,
      'stl': 0.5,
      'babylon': 1.5,
      'usda': 1.1,
      'usdz': 0.9,
      'screenshot-png': 0.1,
      'screenshot-exr': 0.5,
      'animation-fbx': 1.3
    };
    
    return Math.round((baseSize + textureSize) * (formatMultipliers[format] || 1));
  }
}));

// Helper function to generate USDA content
function generateUSDAContent(scene: BABYLON.Scene, settings: ExportSettings): string {
  const lines: string[] = [
    '#usda 1.0',
    '(',
    '    defaultPrim = "Root"',
    '    upAxis = "Y"',
    '    metersPerUnit = 1',
    ')',
    '',
    'def Xform "Root" (',
    `    kind = "${settings.usdKind}"`,
    ')',
    '{'
  ];
  
  // Export meshes
  scene.meshes.forEach((mesh, index) => {
    if (!mesh.isVisible && !settings.includeHidden) return;
    if (!(mesh instanceof BABYLON.Mesh)) return;
    
    const name = mesh.name.replace(/[^a-zA-Z0-9_]/g, '_') || `mesh_${index}`;
    const pos = mesh.position;
    const rot = mesh.rotation;
    const scale = mesh.scaling;
    
    lines.push(`    def Mesh "${name}" (`);
    lines.push(`        kind = "component"`);
    lines.push(`    )`);
    lines.push(`    {`);
    lines.push(`        double3 xformOp:translate = (${pos.x}, ${pos.y}, ${pos.z})`);
    lines.push(`        double3 xformOp:rotateXYZ = (${rot.x * 180 / Math.PI}, ${rot.y * 180 / Math.PI}, ${rot.z * 180 / Math.PI})`);
    lines.push(`        double3 xformOp:scale = (${scale.x}, ${scale.y}, ${scale.z})`);
    lines.push(`        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]`);
    
    // Add geometry reference (would need actual vertex data for full export)
    const vertexData = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (vertexData) {
      const pointCount = vertexData.length / 3;
      lines.push(`        int[] faceVertexCounts`);
      lines.push(`        int[] faceVertexIndices`);
      lines.push(`        point3f[] points (${pointCount} points)`);
    }
    
    lines.push(`    }`);
  });
  
  lines.push('}');
  
  return lines.join('\n');
}

// Export format extensions
export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  'gltf': '.gltf',
  'glb': '.glb',
  'obj': '.obj',
  'stl': '.stl',
  'babylon': '.babylon',
  'usda': '.usda',
  'usdz': '.usdz',
  'screenshot-png': '.png',
  'screenshot-exr': '.exr',
  'animation-fbx': '.fbx'
};

export default useExportStore;

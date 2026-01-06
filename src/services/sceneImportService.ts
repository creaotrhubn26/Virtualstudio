import { SceneComposition } from '../core/models/sceneComposer';

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  scene?: SceneComposition;
}

export const sceneImportService = {
  /**
   * Validate imported scene
   */
  validateImport(data: any): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!data.id || typeof data.id !== 'string') {
      errors.push('Mangler eller ugyldig scene ID');
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Mangler eller ugyldig scene-navn');
    }

    if (!data.createdAt || typeof data.createdAt !== 'string') {
      warnings.push('Mangler opprettelsesdato - vil bli satt til nå');
    }

    if (!data.updatedAt || typeof data.updatedAt !== 'string') {
      warnings.push('Mangler oppdateringsdato - vil bli satt til nå');
    }

    // Check structure
    if (data.cameras && !Array.isArray(data.cameras)) {
      errors.push('Kameraer må være en array');
    }

    if (data.lights && !Array.isArray(data.lights)) {
      errors.push('Lys må være en array');
    }

    if (data.actors && !Array.isArray(data.actors)) {
      errors.push('Aktører må være en array');
    }

    if (data.props && !Array.isArray(data.props)) {
      errors.push('Props må være en array');
    }

    // Check environment structure
    if (data.environment) {
      if (data.environment.walls && !Array.isArray(data.environment.walls)) {
        errors.push('Miljø-vegger må være en array');
      }
      if (data.environment.floors && !Array.isArray(data.environment.floors)) {
        errors.push('Miljø-gulv må være en array');
      }
      if (data.environment.atmosphere) {
        if (typeof data.environment.atmosphere.fogEnabled !== 'boolean' && data.environment.atmosphere.fogEnabled !== undefined) {
          warnings.push('Ugyldig fogEnabled-verdi');
        }
        if (typeof data.environment.atmosphere.fogDensity !== 'number' && data.environment.atmosphere.fogDensity !== undefined) {
          warnings.push('Ugyldig fogDensity-verdi');
        }
      }
    }

    // Check camera settings
    if (data.cameraSettings) {
      if (typeof data.cameraSettings.aperture !== 'number') {
        warnings.push('Ugyldig blender-verdi');
      }
      if (typeof data.cameraSettings.iso !== 'number') {
        warnings.push('Ugyldig ISO-verdi');
      }
    }

    const valid = errors.length === 0;

    if (valid) {
      // Create scene object
      const scene: SceneComposition = {
        id: data.id || `imported-${Date.now()}`,
        name: data.name || 'Importert Scene',
        description: data.description,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        cameras: data.cameras || [],
        lights: data.lights || [],
        actors: data.actors || [],
        props: data.props || [],
        cameraSettings: data.cameraSettings || {
          aperture: 2.8,
          shutter: '1/125',
          iso: 100,
          focalLength: 35,
          nd: 0,
        },
        layers: data.layers || [],
        timeline: data.timeline,
        thumbnail: data.thumbnail,
        tags: data.tags || [],
      };

      return { valid: true, errors, warnings, scene };
    }

    return { valid: false, errors, warnings };
  },

  /**
   * Import scene from JSON
   */
  importFromJSON(json: string): ImportValidationResult {
    try {
      const data = JSON.parse(json);
      return this.validateImport(data);
    } catch (error) {
      return {
        valid: false,
        errors: ['Ugyldig JSON-format'],
        warnings: [],
      };
    }
  },

  /**
   * Import scene from XML (simplified)
   */
  importFromXML(xml: string): ImportValidationResult {
    try {
      // Simple XML parsing (in production would use proper XML parser)
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      const data: any = {
        id: doc.querySelector('id')?.textContent || `imported-${Date.now()}`,
        name: doc.querySelector('name')?.textContent || 'Importert Scene',
        description: doc.querySelector('description')?.textContent,
        createdAt: doc.querySelector('createdAt')?.textContent || new Date().toISOString(),
        updatedAt: doc.querySelector('updatedAt')?.textContent || new Date().toISOString(),
        cameras: [],
        lights: [],
        actors: [],
        props: [],
      };

      // Parse cameras
      doc.querySelectorAll('camera').forEach(cam => {
        data.cameras.push({
          id: cam.getAttribute('id') || '',
          alpha: parseFloat(cam.querySelector('alpha')?.textContent || '0'),
          beta: parseFloat(cam.querySelector('beta')?.textContent || '0'),
          radius: parseFloat(cam.querySelector('radius')?.textContent || '0'),
          fov: parseFloat(cam.querySelector('fov')?.textContent || '0'),
        });
      });

      // Parse lights
      doc.querySelectorAll('light').forEach(light => {
        data.lights.push({
          id: light.getAttribute('id') || '',
          name: light.querySelector('name')?.textContent || '',
          intensity: parseFloat(light.querySelector('intensity')?.textContent || '0'),
          cct: parseFloat(light.querySelector('cct')?.textContent || '5500'),
        });
      });

      return this.validateImport(data);
    } catch (error) {
      return {
        valid: false,
        errors: ['Ugyldig XML-format'],
        warnings: [],
      };
    }
  },

  /**
   * Import scene from YAML (simplified - would need proper YAML parser)
   */
  importFromYAML(yaml: string): ImportValidationResult {
    // For now, return error - would need a YAML parser library
    return {
      valid: false,
      errors: ['YAML-import krever YAML-parser bibliotek'],
      warnings: [],
    };
  },

  /**
   * Get preview of imported scene
   */
  getPreview(scene: SceneComposition): {
    name: string;
    description?: string;
    cameraCount: number;
    lightCount: number;
    actorCount: number;
    propCount: number;
    hasTimeline: boolean;
    hasThumbnail: boolean;
  } {
    return {
      name: scene.name,
      description: scene.description,
      cameraCount: scene.cameras.length,
      lightCount: scene.lights.length,
      actorCount: scene.actors.length,
      propCount: scene.props.length,
      hasTimeline: !!scene.timeline,
      hasThumbnail: !!scene.thumbnail,
    };
  },
};


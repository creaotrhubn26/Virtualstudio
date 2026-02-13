import { SceneComposition } from '../core/models/sceneComposer';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: 'camera' | 'light' | 'composition' | 'performance' | 'general' | 'environment';
  elementId?: string;
}

export const sceneValidationService = {
  /**
   * Validate a scene and return issues
   */
  validateScene(scene: SceneComposition): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for empty scene
    if (scene.cameras.length === 0 && scene.lights.length === 0 && scene.actors.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Scenen er tom - ingen kameraer, lys eller objekter',
        category: 'general',
      });
    }

    // Check camera presets
    if (scene.cameras.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Ingen kamera-presets lagret',
        category: 'camera',
      });
    }

    // Check for cameras with same position
    const cameraPositions = new Map<string, number>();
    scene.cameras.forEach(cam => {
      const key = `${cam.alpha.toFixed(2)}-${cam.beta.toFixed(2)}-${cam.radius.toFixed(2)}`;
      cameraPositions.set(key, (cameraPositions.get(key) || 0) + 1);
    });
    cameraPositions.forEach((count, pos) => {
      if (count > 1) {
        issues.push({
          severity: 'info',
          message: `${count} kameraer har samme posisjon (${pos})`,
          category: 'camera',
        });
      }
    });

    // Check lights
    if (scene.lights.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Ingen lys i scenen',
        category: 'light',
      });
    }

    // Check for overlapping lights
    scene.lights.forEach((light1, i) => {
      scene.lights.slice(i + 1).forEach(light2 => {
        const dist = Math.sqrt(
          Math.pow(light1.position[0] - light2.position[0], 2) +
          Math.pow(light1.position[1] - light2.position[1], 2) +
          Math.pow(light1.position[2] - light2.position[2], 2)
        );
        if (dist < 0.5) {
          issues.push({
            severity: 'warning',
            message: `Lys "${light1.name}" og "${light2.name}" er veldig nærme hverandre`,
            category: 'light',
            elementId: light1.id,
          });
        }
      });
    });

    // Check composition rules
    if (scene.actors.length > 10) {
      issues.push({
        severity: 'warning',
        message: 'Mange aktører i scenen - kan påvirke ytelse',
        category: 'performance',
      });
    }

    if (scene.lights.length > 20) {
      issues.push({
        severity: 'warning',
        message: 'Mange lys i scenen - kan påvirke ytelse',
        category: 'performance',
      });
    }

    // Check camera settings
    if (scene.cameraSettings.aperture < 1.2 || scene.cameraSettings.aperture > 22) {
      issues.push({
        severity: 'info',
        message: `Uvanlig blender-verdi: f/${scene.cameraSettings.aperture}`,
        category: 'camera',
      });
    }

    if (scene.cameraSettings.iso > 6400) {
      issues.push({
        severity: 'warning',
        message: `Høy ISO-verdi: ${scene.cameraSettings.iso} - kan gi støy`,
        category: 'camera',
      });
    }

    // Check environment
    if (scene.environment) {
      const env = scene.environment;
      
      // Check for many walls/floors (performance)
      const totalEnvElements = (env.walls?.length || 0) + (env.floors?.length || 0);
      if (totalEnvElements > 20) {
        issues.push({
          severity: 'warning',
          message: `Mange miljø-elementer (${totalEnvElements}) - kan påvirke ytelse`,
          category: 'performance',
        });
      }
      
      // Check atmosphere settings
      if (env.atmosphere) {
        if (env.atmosphere.fogDensity > 0.1) {
          issues.push({
            severity: 'info',
            message: `Høy tåke-tetthet (${env.atmosphere.fogDensity.toFixed(2)}) - kan påvirke synlighet`,
            category: 'environment',
          });
        }
        
        if (env.atmosphere.ambientIntensity > 1.5) {
          issues.push({
            severity: 'warning',
            message: `Høy ambient-intensitet (${env.atmosphere.ambientIntensity.toFixed(2)}) - kan overeksponere scenen`,
            category: 'environment',
          });
        }
      }
      
      // Check for walls/floors without materials
      env.walls?.forEach(wall => {
        if (!wall.assetId || wall.assetId === 'unknown') {
          issues.push({
            severity: 'warning',
            message: `Vegg "${wall.id}" mangler material-ID`,
            category: 'environment',
            elementId: wall.id,
          });
        }
      });
      
      env.floors?.forEach(floor => {
        if (!floor.assetId || floor.assetId === 'unknown') {
          issues.push({
            severity: 'warning',
            message: `Gulv "${floor.id}" mangler material-ID`,
            category: 'environment',
            elementId: floor.id,
          });
        }
      });
    }

    return issues;
  },

  /**
   * Get validation summary
   */
  getValidationSummary(issues: ValidationIssue[]): {
    errors: number;
    warnings: number;
    info: number;
  } {
    return {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    };
  },
};


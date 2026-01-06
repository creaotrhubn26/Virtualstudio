import { SceneComposition } from '../core/models/sceneComposer';

export interface SceneAnalysis {
  composition: {
    ruleOfThirds: number; // 0-1 score
    leadingLines: boolean;
    symmetry: number; // 0-1 score
    balance: number; // 0-1 score
  };
  lighting: {
    totalIntensity: number;
    averageCCT: number;
    contrast: number; // 0-1 score
    distribution: 'even' | 'focused' | 'uneven';
  };
  camera: {
    averageFov: number;
    depthOfField: number; // Estimated
    coverage: number; // 0-1 score
  };
  recommendations: string[];
}

export const sceneAnalysisService = {
  /**
   * Analyze scene composition, lighting, and camera
   */
  analyzeScene(scene: SceneComposition): SceneAnalysis {
    const analysis: SceneAnalysis = {
      composition: {
        ruleOfThirds: 0.5,
        leadingLines: false,
        symmetry: 0.5,
        balance: 0.5,
      },
      lighting: {
        totalIntensity: 0,
        averageCCT: 5500,
        contrast: 0.5,
        distribution: 'even',
      },
      camera: {
        averageFov: 0,
        depthOfField: 0,
        coverage: 0.5,
      },
      recommendations: [],
    };

    // Lighting analysis
    if (scene.lights.length > 0) {
      let totalIntensity = 0;
      let totalCCT = 0;
      scene.lights.forEach(light => {
        totalIntensity += light.intensity;
        totalCCT += light.cct;
      });
      analysis.lighting.totalIntensity = totalIntensity;
      analysis.lighting.averageCCT = totalCCT / scene.lights.length;

      // Determine distribution
      if (scene.lights.length === 1) {
        analysis.lighting.distribution = 'focused';
      } else if (scene.lights.length <= 3) {
        analysis.lighting.distribution = 'focused';
      } else {
        analysis.lighting.distribution = scene.lights.length > 10 ? 'uneven' : 'even';
      }
    }

    // Camera analysis
    if (scene.cameras.length > 0) {
      let totalFov = 0;
      scene.cameras.forEach(cam => {
        totalFov += cam.fov;
      });
      analysis.camera.averageFov = totalFov / scene.cameras.length;
      analysis.camera.coverage = Math.min(1, scene.cameras.length / 5);
    }

    // Composition analysis (simplified)
    const objectCount = scene.actors.length + scene.props.length;
    if (objectCount > 0) {
      // Rule of thirds approximation
      analysis.composition.ruleOfThirds = Math.min(1, objectCount / 3);
    }

    // Generate recommendations
    if (scene.lights.length === 0) {
      analysis.recommendations.push('Legg til lys for bedre belysning');
    }
    if (scene.cameras.length === 0) {
      analysis.recommendations.push('Lagre kamera-presets for raskere arbeidsflyt');
    }
    if (scene.lights.length > 10) {
      analysis.recommendations.push('Vurder å redusere antall lys for bedre ytelse');
    }
    if (analysis.lighting.averageCCT < 3000) {
      analysis.recommendations.push('Varmt lys - vurder å balansere med kaldere lys');
    }
    if (analysis.lighting.averageCCT > 7000) {
      analysis.recommendations.push('Kaldt lys - vurder å balansere med varmere lys');
    }

    return analysis;
  },
};


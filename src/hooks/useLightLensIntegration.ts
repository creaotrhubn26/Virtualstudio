import { useState, useCallback } from 'react';

export interface LightLensIntegrationData {
  optimalAperture: number;
  recommendedISO: number;
  shutterSpeedLimit: number;
  exposureValue: number;
  flashSyncSpeed: number;
  depthOfFieldPreview: {
    near: number;
    far: number;
    total: number;
    hyperfocal: number;
  };
  lensFlareProbability: number;
  bokehQuality: number;
}

export interface LightLensParams {
  focalLength: number;
  aperture: number;
  iso: number;
  lightIntensity: number;
  lightDistance: number;
  flashEnabled: boolean;
}

function calculateDOF(focalLength: number, aperture: number, distance: number) {
  const coc = 0.029;
  const hyperfocal = (focalLength * focalLength) / (aperture * coc);
  const near = (hyperfocal * distance) / (hyperfocal + distance);
  const far = distance < hyperfocal ? (hyperfocal * distance) / (hyperfocal - distance) : Infinity;
  return { near, far: Math.min(far, 100), total: Math.min(far, 100) - near, hyperfocal };
}

export interface LightLensSceneAnalysis {
  warnings: Record<string, string[]>;
  flashSyncIssues: string[];
  focusIssues: string[];
  recommendations: string[];
  validateFlashSync: () => boolean;
  validateFocusDistance: () => boolean;
  totalEV: number;
  contrastRatio: number;
  recommendedSettings: {
    aperture: number;
    shutter: number;
    iso: number;
  };
}

export interface LightLensCamera {
  id?: string;
  aperture: number;
  iso: number;
  focalLength: number;
  mount?: string;
  shutter?: number;
  ev?: number;
  applyRecommendedSettings: (settings: Partial<LightLensParams>) => void;
  brand?: string;
  model?: string;
  name?: string;
  attachedLens?: { brand: string; model: string } | null;
}

export interface LightLensLightItem {
  id: string;
  power: number;
  type: string;
  name: string;
  distance: number;
  modifier?: string;
  modifierLoss?: number;
  recommendedFStop: number;
}

export interface LightLensLights {
  count: number;
  length: number;
  totalPower: number;
  getModifierLoss: (modifierType: string) => number;
  map: <T>(fn: (light: LightLensLightItem, index: number) => T) => T[];
}

export function useLightLensIntegration(params: Partial<LightLensParams> = {}) {
  const [integration, setIntegration] = useState<LightLensIntegrationData | null>(null);

  const calculate = useCallback((newParams: Partial<LightLensParams> = {}) => {
    const p = { focalLength: 50, aperture: 2.8, iso: 100, lightIntensity: 1, lightDistance: 2, flashEnabled: false, ...params, ...newParams };
    const dof = calculateDOF(p.focalLength, p.aperture, p.lightDistance);
    const ev = Math.log2((p.aperture * p.aperture) / (1 / 125)) - Math.log2(p.iso / 100);

    const result: LightLensIntegrationData = {
      optimalAperture: p.aperture,
      recommendedISO: p.iso,
      shutterSpeedLimit: p.flashEnabled ? 1 / 250 : 1 / 60,
      exposureValue: ev,
      flashSyncSpeed: 1 / 250,
      depthOfFieldPreview: dof,
      lensFlareProbability: p.lightIntensity > 0.8 && p.aperture > 5.6 ? 0.7 : 0.1,
      bokehQuality: p.aperture < 2.8 ? 0.9 : p.aperture < 4 ? 0.7 : 0.4,
    };
    setIntegration(result);
    return result;
  }, [params]);

  const currentParams = { focalLength: 50, aperture: 2.8, iso: 100, lightIntensity: 1, lightDistance: 2, flashEnabled: false, ...params };

  const ev = Math.log2((currentParams.aperture * currentParams.aperture) / (1 / 125)) - Math.log2(currentParams.iso / 100);

  const validateFlashSync = () => !currentParams.flashEnabled || currentParams.focalLength <= 200;
  const validateFocusDistance = () => currentParams.lightDistance > 0.5;
  const applyRecommendedSettings = (_settings: Partial<LightLensParams>) => {};
  const getModifierLoss = (modifierType: string) => {
    const losses: Record<string, number> = { softbox: 1.0, umbrella: 0.7, beauty_dish: 0.5, grid: 1.5, snoot: 2.0, none: 0 };
    return losses[modifierType] ?? 0;
  };

  const sceneAnalysis: LightLensSceneAnalysis = {
    warnings: {},
    flashSyncIssues: [],
    focusIssues: [],
    recommendations: ['Bruk f/8 for skarpere bilder', 'ISO 100 gir minst støy'],
    validateFlashSync,
    validateFocusDistance,
    totalEV: ev,
    contrastRatio: 5,
    recommendedSettings: {
      aperture: currentParams.aperture,
      shutter: currentParams.flashEnabled ? 1 / 250 : 1 / 60,
      iso: currentParams.iso,
    },
  };

  const camera: LightLensCamera = {
    id: 'camera-1',
    aperture: currentParams.aperture,
    iso: currentParams.iso,
    focalLength: currentParams.focalLength,
    mount: 'E',
    shutter: currentParams.flashEnabled ? 1 / 250 : 1 / 60,
    ev,
    applyRecommendedSettings,
    brand: undefined,
    model: undefined,
    name: undefined,
    attachedLens: null,
  };

  const lights: LightLensLights = {
    count: 1,
    length: 1,
    totalPower: currentParams.lightIntensity * 1000,
    getModifierLoss,
    map: <T>(fn: (light: LightLensLightItem, index: number) => T) =>
      [{ id: 'light-1', power: currentParams.lightIntensity * 1000, type: 'flash', name: 'Key Light', distance: currentParams.lightDistance, modifier: undefined, modifierLoss: undefined, recommendedFStop: parseFloat(currentParams.aperture?.toString() ?? '5.6') }].map(fn),
  };

  const attachLens = (_lensId: string) => {};
  const detachLens = () => {};

  return { integration, calculate, sceneAnalysis, camera, lights, validateFlashSync, validateFocusDistance, applyRecommendedSettings, getModifierLoss, attachLens, detachLens };
}

export default useLightLensIntegration;

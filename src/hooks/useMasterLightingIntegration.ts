import { useState, useCallback } from 'react';

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'light-placement' | 'intensity' | 'color-temp' | 'modifier';
  confidence: number;
  pattern?: { id: string; name: string; difficulty?: string };
  aiScore?: number;
  reasoning?: string;
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    requirements: string[];
    contrastRatio: number | string;
    recommendedSettings: { aperture: number; shutter: number; iso: number };
  };
}

export interface HdriExposureData {
  brightness: number;
  evContribution: number;
  dominantColorTemp: number;
  recommendedAdjustment: {
    exposureCompensation: number;
    whiteBalance: number;
    mixWarning?: string;
  };
}

export interface HistogramFeedback {
  highlights: number;
  midtones: number;
  shadows: number;
  isClipping: boolean;
  suggestion?: string;
  clipping: {
    shadows: boolean;
    highlights: boolean;
  };
  underexposed: number;
  overexposed: number;
  suggestedAdjustment: {
    direction: 'brighter' | 'darker' | 'optimal';
    stops: number;
    method: string;
  };
}

export interface PatternCostResult {
  total: number;
  daily: number;
  patternId: string;
  rentalDays: number;
  missingEquipmentCost: number;
  rentalCost: number;
  ownedEquipmentValue: number;
  breakdown: { item: string; cost: number; owned: boolean; rentalPrice?: number }[];
}

export interface LightingPreset {
  id: string;
  name: string;
  state: Partial<MasterLightingState>;
  createdAt: string;
  lights?: unknown[];
  exposureData?: { ev: number; contrastRatio: number | string };
  patternName?: string;
}

export interface MasterLightingState {
  keyLightId: string | null;
  fillLightId: string | null;
  hairLightId: string | null;
  backgroundLightId: string | null;
  rimLightId: string | null;
  totalLuxAtSubject: number;
  colorTemperatureBalance: number;
  contrastRatio: number;
  dynamicRange: number;
  isCalibrated: boolean;
  recommendations: string[];
  aiRecommendations: AIRecommendation[];
  isLoadingAI: boolean;
  isLoading: boolean;
  hdriExposure: HdriExposureData;
  currentHDRI: string | null;
  cameraExposures: Array<{
    cameraId: string;
    cameraName: string;
    currentSettings: { aperture: number; shutter: number; iso: number; ev: number };
    recommendedSettings?: { aperture: number; shutter: number; iso: number };
    warnings?: string[];
    syncStatus?: 'synced' | 'out-of-sync' | 'pending';
    evDifference?: number;
  }>;
  syncMode: 'front-curtain' | 'rear-curtain' | 'hss';
  savedPresets: LightingPreset[];
  histogramFeedback: HistogramFeedback | null;
}

export interface LightingIntegrationActions {
  setKeyLight: (id: string | null) => void;
  setFillLight: (id: string | null) => void;
  setHairLight: (id: string | null) => void;
  setBackgroundLight: (id: string | null) => void;
  setRimLight: (id: string | null) => void;
  calibrate: () => Promise<void>;
  autoBalance: () => void;
  reset: () => void;
  getAIRecommendations: (mood?: string, subject?: string, opts?: { skillLevel?: string }) => Promise<void>;
  setHDRI: (hdriUrl: string | null) => void;
  setHDRIExposure: (exposure: number) => void;
  calculatePatternCost: (patternId?: string, rentalDays?: number) => PatternCostResult;
  saveCurrentAsPreset: (name: string) => void;
  loadPreset: (preset: LightingPreset | string) => void;
  deletePreset: (presetId: string) => void;
  setSyncMode: (mode: 'front-curtain' | 'rear-curtain' | 'hss') => void;
  applyCameraSync: (cameraId: string) => void;
  syncAllCameras: () => void;
  applyHistogramSuggestion: () => void;
}

const DEFAULT_HDRI_EXPOSURE: HdriExposureData = {
  brightness: 0.8,
  evContribution: 0,
  dominantColorTemp: 5500,
  recommendedAdjustment: { exposureCompensation: 0, whiteBalance: 5500 },
};

const DEFAULT_STATE: MasterLightingState = {
  keyLightId: null,
  fillLightId: null,
  hairLightId: null,
  backgroundLightId: null,
  rimLightId: null,
  totalLuxAtSubject: 0,
  colorTemperatureBalance: 5500,
  contrastRatio: 1.0,
  dynamicRange: 12,
  isCalibrated: false,
  recommendations: [],
  aiRecommendations: [],
  isLoadingAI: false,
  isLoading: false,
  hdriExposure: DEFAULT_HDRI_EXPOSURE,
  currentHDRI: null,
  cameraExposures: [],
  syncMode: 'front-curtain',
  savedPresets: [],
  histogramFeedback: null,
};

export function useMasterLightingIntegration(): MasterLightingState & LightingIntegrationActions {
  const [state, setState] = useState<MasterLightingState>(DEFAULT_STATE);

  const setKeyLight = useCallback((id: string | null) => setState((s) => ({ ...s, keyLightId: id })), []);
  const setFillLight = useCallback((id: string | null) => setState((s) => ({ ...s, fillLightId: id })), []);
  const setHairLight = useCallback((id: string | null) => setState((s) => ({ ...s, hairLightId: id })), []);
  const setBackgroundLight = useCallback((id: string | null) => setState((s) => ({ ...s, backgroundLightId: id })), []);
  const setRimLight = useCallback((id: string | null) => setState((s) => ({ ...s, rimLightId: id })), []);

  const calibrate = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 500));
    setState((s) => ({
      ...s,
      isLoading: false,
      isCalibrated: true,
      totalLuxAtSubject: 2000,
      colorTemperatureBalance: 5500,
      contrastRatio: 3.5,
      recommendations: ['Optimaliser fyllysets intensitet for å redusere harde skygger'],
    }));
  }, []);

  const autoBalance = useCallback(() => {
    setState((s) => ({
      ...s,
      contrastRatio: 3.0,
      colorTemperatureBalance: 5500,
      recommendations: ['Automatisk balansering fullført'],
    }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const getAIRecommendations = useCallback(async (_mood?: string, _subject?: string, _opts?: { skillLevel?: string }) => {
    setState((s) => ({ ...s, isLoadingAI: true, isLoading: true }));
    await new Promise((r) => setTimeout(r, 1000));
    const recs: AIRecommendation[] = [
      {
        id: '1', title: 'Juster nøkkellys', description: 'Øk intensiteten med 20%', type: 'intensity', confidence: 0.85,
        pattern: { id: 'rembrandt', name: 'Rembrandt', difficulty: 'Intermediate' }, aiScore: 0.87, reasoning: 'Basert på motivets hudtone',
        analysis: { strengths: ['God grunnbelysning'], weaknesses: ['Intensiteten kan økes'], suggestions: ['Juster til EV 12'], requirements: ['Nøkkellys', 'Fyllys'], contrastRatio: '3:1', recommendedSettings: { aperture: 5.6, shutter: 125, iso: 100 } },
      },
      {
        id: '2', title: 'Legg til rimbelysning', description: 'En kantlyseffekt vil forbedre dybden', type: 'light-placement', confidence: 0.72,
        pattern: { id: 'beauty', name: 'Beauty', difficulty: 'Advanced' }, aiScore: 0.72, reasoning: 'Rimbelysning skaper separasjon',
        analysis: { strengths: ['God bakgrunnsbelysning'], weaknesses: ['Mangler kantlys'], suggestions: ['Plasser rimlyse bak motivet'], requirements: ['Nøkkellys', 'Fyllys', 'Rimbelysning'], contrastRatio: '4:1', recommendedSettings: { aperture: 4.0, shutter: 125, iso: 100 } },
      },
    ];
    setState((s) => ({ ...s, isLoadingAI: false, isLoading: false, aiRecommendations: recs }));
  }, []);

  const setHDRI = useCallback((hdriUrl: string | null) => setState((s) => ({ ...s, currentHDRI: hdriUrl })), []);

  const setHDRIExposure = useCallback((exposure: number) => {
    setState((s) => ({
      ...s,
      hdriExposure: {
        brightness: Math.min(1, Math.max(0, exposure)),
        evContribution: Math.log2(exposure > 0 ? exposure : 1),
        dominantColorTemp: s.hdriExposure.dominantColorTemp,
        recommendedAdjustment: {
          exposureCompensation: exposure > 1 ? -(exposure - 1) : (1 - exposure),
          whiteBalance: s.hdriExposure.recommendedAdjustment.whiteBalance,
        },
      },
    }));
  }, []);

  const calculatePatternCost = useCallback((patternId: string = '', rentalDays: number = 1): PatternCostResult => {
    const baseCost = patternId ? 1200 : 800;
    const total = baseCost * rentalDays;
    return {
      total,
      daily: baseCost,
      patternId,
      rentalDays,
      missingEquipmentCost: total * 0.3,
      rentalCost: total * 0.7,
      ownedEquipmentValue: total * 0.5,
      breakdown: [
        { item: 'Nøkkellys', cost: baseCost * 0.4 * rentalDays, owned: true },
        { item: 'Fyllys', cost: baseCost * 0.3 * rentalDays, owned: false, rentalPrice: baseCost * 0.3 },
        { item: 'Bakgrunnslys', cost: baseCost * 0.3 * rentalDays, owned: false, rentalPrice: baseCost * 0.3 },
      ],
    };
  }, []);

  const saveCurrentAsPreset = useCallback((name: string) => {
    setState((s) => {
      const preset: LightingPreset = {
        id: `preset-${Date.now()}`,
        name,
        state: {
          keyLightId: s.keyLightId,
          fillLightId: s.fillLightId,
          hairLightId: s.hairLightId,
          contrastRatio: s.contrastRatio,
          colorTemperatureBalance: s.colorTemperatureBalance,
        },
        createdAt: new Date().toISOString(),
      };
      return { ...s, savedPresets: [...s.savedPresets, preset] };
    });
  }, []);

  const loadPreset = useCallback((preset: LightingPreset | string) => {
    setState((s) => {
      const presetId = typeof preset === 'string' ? preset : preset.id;
      const found = typeof preset === 'string'
        ? s.savedPresets.find((p) => p.id === presetId)
        : preset;
      if (!found) return s;
      return { ...s, ...found.state };
    });
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    setState((s) => ({ ...s, savedPresets: s.savedPresets.filter((p) => p.id !== presetId) }));
  }, []);

  const setSyncMode = useCallback((mode: 'front-curtain' | 'rear-curtain' | 'hss') => {
    setState((s) => ({ ...s, syncMode: mode }));
  }, []);

  const applyCameraSync = useCallback((_cameraId: string) => {
    setState((s) => ({ ...s, isCalibrated: true }));
  }, []);

  const syncAllCameras = useCallback(() => {
    setState((s) => ({ ...s, isCalibrated: true }));
  }, []);

  const applyHistogramSuggestion = useCallback(() => {
    setState((s) => ({
      ...s,
      histogramFeedback: s.histogramFeedback
        ? { ...s.histogramFeedback, isClipping: false, suggestion: undefined }
        : null,
    }));
  }, []);

  return {
    ...state,
    setKeyLight,
    setFillLight,
    setHairLight,
    setBackgroundLight,
    setRimLight,
    calibrate,
    autoBalance,
    reset,
    getAIRecommendations,
    setHDRI,
    setHDRIExposure,
    calculatePatternCost,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    setSyncMode,
    applyCameraSync,
    syncAllCameras,
    applyHistogramSuggestion,
  };
}

export default useMasterLightingIntegration;

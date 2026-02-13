import * as THREE from 'three';

export interface ASCCDLParams {
  slope: THREE.Vector3;
  offset: THREE.Vector3;
  power: THREE.Vector3;
  saturation: number;
}

export interface ASCCDLPreset {
  id: string;
  name: string;
  description: string;
  usedIn?: string[];
  params: ASCCDLParams;
}

interface ExportMetadata {
  id: string;
  description?: string;
}

const makeParams = (slope: [number, number, number], offset: [number, number, number], power: [number, number, number], saturation: number): ASCCDLParams => ({
  slope: new THREE.Vector3(...slope),
  offset: new THREE.Vector3(...offset),
  power: new THREE.Vector3(...power),
  saturation,
});

const cloneParams = (params: ASCCDLParams): ASCCDLParams => ({
  slope: params.slope.clone(),
  offset: params.offset.clone(),
  power: params.power.clone(),
  saturation: params.saturation,
});

const PRESETS: ASCCDLPreset[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'No additional grade applied.',
    params: makeParams([1, 1, 1], [0, 0, 0], [1, 1, 1], 1),
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Subtle warmth with softer contrast.',
    usedIn: ['Golden hour', 'Portraits'],
    params: makeParams([1.08, 1.02, 0.95], [0.02, 0.01, -0.01], [0.95, 0.98, 1.05], 1.05),
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Cooler shadows with crisp highlights.',
    usedIn: ['Night exteriors', 'Sci-fi'],
    params: makeParams([0.95, 1.0, 1.08], [-0.01, 0.0, 0.02], [1.05, 1.0, 0.95], 0.98),
  },
  {
    id: 'punchy',
    name: 'Punchy',
    description: 'Higher contrast and saturation for bold looks.',
    usedIn: ['Action', 'Commercials'],
    params: makeParams([1.15, 1.15, 1.15], [0.0, 0.0, 0.0], [0.9, 0.9, 0.9], 1.2),
  },
];

const formatVec = (vec: THREE.Vector3): string => {
  return `${vec.x.toFixed(6)} ${vec.y.toFixed(6)} ${vec.z.toFixed(6)}`;
};

const parseVec = (value: string): THREE.Vector3 | null => {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) {
    return null;
  }
  return new THREE.Vector3(parts[0], parts[1], parts[2]);
};

export const ascCDLService = {
  DEFAULT_PARAMS: makeParams([1, 1, 1], [0, 0, 0], [1, 1, 1], 1),
  getPresets(): ASCCDLPreset[] {
    return PRESETS.map(preset => ({
      ...preset,
      params: cloneParams(preset.params),
    }));
  },
  getPresetById(id: string): ASCCDLPreset | undefined {
    const preset = PRESETS.find(p => p.id === id);
    if (!preset) return undefined;
    return {
      ...preset,
      params: cloneParams(preset.params),
    };
  },
  exportToXML(params: ASCCDLParams, metadata: ExportMetadata): string {
    const description = metadata.description ? `<ColorDecisionDescription>${metadata.description}</ColorDecisionDescription>` : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<ColorDecisionList>
  <ColorDecision>
    ${description}
    <ColorCorrection id="${metadata.id}">
      <SOPNode>
        <Slope>${formatVec(params.slope)}</Slope>
        <Offset>${formatVec(params.offset)}</Offset>
        <Power>${formatVec(params.power)}</Power>
      </SOPNode>
      <SatNode>
        <Saturation>${params.saturation.toFixed(6)}</Saturation>
      </SatNode>
    </ColorCorrection>
  </ColorDecision>
</ColorDecisionList>`;
  },
  exportToJSON(params: ASCCDLParams, metadata: ExportMetadata): string {
    return JSON.stringify({
      id: metadata.id,
      description: metadata.description,
      slope: [params.slope.x, params.slope.y, params.slope.z],
      offset: [params.offset.x, params.offset.y, params.offset.z],
      power: [params.power.x, params.power.y, params.power.z],
      saturation: params.saturation,
    }, null, 2);
  },
  importFromXML(xml: string): { params: ASCCDLParams } | null {
    const slopeMatch = xml.match(/<Slope>([\s\S]*?)<\/Slope>/i);
    const offsetMatch = xml.match(/<Offset>([\s\S]*?)<\/Offset>/i);
    const powerMatch = xml.match(/<Power>([\s\S]*?)<\/Power>/i);
    const satMatch = xml.match(/<Saturation>([\s\S]*?)<\/Saturation>/i);

    if (!slopeMatch || !offsetMatch || !powerMatch || !satMatch) return null;

    const slope = parseVec(slopeMatch[1]);
    const offset = parseVec(offsetMatch[1]);
    const power = parseVec(powerMatch[1]);
    const saturation = Number(satMatch[1]);

    if (!slope || !offset || !power || Number.isNaN(saturation)) return null;

    return {
      params: {
        slope,
        offset,
        power,
        saturation,
      },
    };
  },
  importFromJSON(json: string): { params: ASCCDLParams } | null {
    try {
      const data = JSON.parse(json) as {
        slope?: [number, number, number];
        offset?: [number, number, number];
        power?: [number, number, number];
        saturation?: number;
      };

      if (!data.slope || !data.offset || !data.power || typeof data.saturation !== 'number') {
        return null;
      }

      return {
        params: makeParams(data.slope, data.offset, data.power, data.saturation),
      };
    } catch {
      return null;
    }
  },
};

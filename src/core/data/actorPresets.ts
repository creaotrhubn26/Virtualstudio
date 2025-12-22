export interface ActorPreset {
  id: string;
  name: string;
  category: 'portrait' | 'fashion' | 'commercial' | 'fitness' | 'child' | 'elder';
  description: string;
  parameters: {
    age: number;
    gender: number;
    height: number;
    weight: number;
    muscle: number;
  };
}

export const SKIN_TONES = {
  fair: '#FFE0BD',
  light: '#FFCD94',
  medium: '#EAC086',
  olive: '#C68642',
  tan: '#8D5524',
  brown: '#5C4033',
  dark: '#3C2415',
  ebony: '#241206'
} as const;

const ACTOR_PRESETS: ActorPreset[] = [
  {
    id: 'portrait-female-young',
    name: 'Ung Kvinne (Portrett)',
    category: 'portrait',
    description: 'Ideell for portrettfotografering med mykt lys',
    parameters: { age: 25, gender: 0, height: 0.5, weight: 0.4, muscle: 0.3 }
  },
  {
    id: 'portrait-male-young',
    name: 'Ung Mann (Portrett)',
    category: 'portrait',
    description: 'Klassisk portrettmodell for studiofotografering',
    parameters: { age: 28, gender: 1, height: 0.6, weight: 0.5, muscle: 0.5 }
  },
  {
    id: 'portrait-neutral',
    name: 'Nøytral Modell',
    category: 'portrait',
    description: 'Allsidig modell for ulike belysningssituasjoner',
    parameters: { age: 30, gender: 0.5, height: 0.5, weight: 0.5, muscle: 0.4 }
  },
  {
    id: 'fashion-female',
    name: 'Motemodell Kvinne',
    category: 'fashion',
    description: 'Slank, høy modell for mote- og reklamefotografering',
    parameters: { age: 22, gender: 0, height: 0.8, weight: 0.3, muscle: 0.3 }
  },
  {
    id: 'fashion-male',
    name: 'Motemodell Mann',
    category: 'fashion',
    description: 'Atletisk modell for herremote',
    parameters: { age: 26, gender: 1, height: 0.75, weight: 0.45, muscle: 0.6 }
  },
  {
    id: 'commercial-family',
    name: 'Familie (Voksen)',
    category: 'commercial',
    description: 'Gjennomsnittlig voksen for reklamefoto',
    parameters: { age: 35, gender: 0.5, height: 0.5, weight: 0.55, muscle: 0.4 }
  },
  {
    id: 'commercial-business',
    name: 'Forretningsmann',
    category: 'commercial',
    description: 'Profesjonell modell for bedriftsfotografering',
    parameters: { age: 42, gender: 1, height: 0.55, weight: 0.5, muscle: 0.4 }
  },
  {
    id: 'fitness-male',
    name: 'Fitnessmodell Mann',
    category: 'fitness',
    description: 'Muskuløs modell for fitness og sport',
    parameters: { age: 28, gender: 1, height: 0.65, weight: 0.6, muscle: 0.9 }
  },
  {
    id: 'fitness-female',
    name: 'Fitnessmodell Kvinne',
    category: 'fitness',
    description: 'Atletisk kvinnelig modell',
    parameters: { age: 26, gender: 0, height: 0.6, weight: 0.45, muscle: 0.7 }
  },
  {
    id: 'child-toddler',
    name: 'Småbarn',
    category: 'child',
    description: 'Barn 2-4 år',
    parameters: { age: 3, gender: 0.5, height: 0.2, weight: 0.3, muscle: 0.2 }
  },
  {
    id: 'child-school',
    name: 'Skolebarn',
    category: 'child',
    description: 'Barn 8-12 år',
    parameters: { age: 10, gender: 0.5, height: 0.4, weight: 0.35, muscle: 0.3 }
  },
  {
    id: 'elder-female',
    name: 'Eldre Kvinne',
    category: 'elder',
    description: 'Eldre kvinnelig modell for portrett',
    parameters: { age: 70, gender: 0, height: 0.45, weight: 0.5, muscle: 0.25 }
  },
  {
    id: 'elder-male',
    name: 'Eldre Mann',
    category: 'elder',
    description: 'Eldre mannlig modell for portrett',
    parameters: { age: 72, gender: 1, height: 0.5, weight: 0.55, muscle: 0.3 }
  }
];

export const getPresetsByCategory = (category: ActorPreset['category']): ActorPreset[] => {
  return ACTOR_PRESETS.filter(preset => preset.category === category);
};

export const getPresetById = (id: string): ActorPreset | undefined => {
  return ACTOR_PRESETS.find(preset => preset.id === id);
};

export const getAllPresets = (): ActorPreset[] => ACTOR_PRESETS;

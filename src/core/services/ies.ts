export interface IESProfile {
  id: string;
  name: string;
  label: string;
  manufacturer: string;
  lumens: number;
  cct: number;
  cri: number;
  filename: string;
  url: string;
  category: 'spot' | 'flood' | 'downlight' | 'uplight' | 'wallwash' | 'linear' | 'area';
  beamAngle: number;
  fieldAngle: number;
  description?: string;
  thumbnail?: string;
}

export const IES_PROFILES: IESProfile[] = [
  {
    id: 'spot-narrow',
    name: 'spot-narrow',
    label: 'Smal Spot',
    manufacturer: 'Generic',
    lumens: 1000,
    cct: 3000,
    cri: 90,
    filename: 'spot-narrow.ies',
    url: '/ies/spot-narrow.ies',
    category: 'spot',
    beamAngle: 10,
    fieldAngle: 20,
    description: 'Smal spotlight profil',
  },
  {
    id: 'flood-wide',
    name: 'flood-wide',
    label: 'Bred Flombelysning',
    manufacturer: 'Generic',
    lumens: 5000,
    cct: 4000,
    cri: 85,
    filename: 'flood-wide.ies',
    url: '/ies/flood-wide.ies',
    category: 'flood',
    beamAngle: 90,
    fieldAngle: 120,
    description: 'Bred flombelysning profil',
  },
  {
    id: 'downlight-standard',
    name: 'downlight-standard',
    label: 'Standard Nedlys',
    manufacturer: 'Generic',
    lumens: 800,
    cct: 3500,
    cri: 92,
    filename: 'downlight.ies',
    url: '/ies/downlight.ies',
    category: 'downlight',
    beamAngle: 30,
    fieldAngle: 60,
  },
];

export async function parseIES(_text: string): Promise<{ lumens: number; data: number[][] }> {
  return { lumens: 1000, data: [] };
}

class IESService {
  getProfiles(): IESProfile[] {
    return IES_PROFILES;
  }

  getById(id: string): IESProfile | undefined {
    return IES_PROFILES.find((p) => p.id === id);
  }

  getByCategory(category: IESProfile['category']): IESProfile[] {
    return IES_PROFILES.filter((p) => p.category === category);
  }

  async loadIES(profile: IESProfile): Promise<{ lumens: number; data: number[][] } | null> {
    try {
      const response = await fetch(profile.url);
      if (!response.ok) return null;
      const text = await response.text();
      return parseIES(text);
    } catch {
      console.warn(`[IESService] Failed to load IES: ${profile.url}`);
      return null;
    }
  }
}

export const iesService = new IESService();
export default iesService;

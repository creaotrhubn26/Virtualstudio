export interface HDRIEnvironment {
  id: string;
  name: string;
  label: string;
  url: string;
  thumbnailUrl?: string;
  intensity: number;
  rotation: number;
  category: 'studio' | 'outdoor' | 'indoor' | 'abstract' | 'nature';
  tags: string[];
  description?: string;
  cct?: number;
}

export const HDRI_ENVIRONMENTS: HDRIEnvironment[] = [
  { id: 'studio-neutral', name: 'studio-neutral', label: 'Nøytralt Studio', url: '/hdri/studio-neutral.hdr', intensity: 1.0, rotation: 0, category: 'studio', tags: ['studio', 'nøytral'] },
  { id: 'studio-warm', name: 'studio-warm', label: 'Varmt Studio', url: '/hdri/studio-warm.hdr', intensity: 0.9, rotation: 0, category: 'studio', tags: ['studio', 'varm'], cct: 3200 },
  { id: 'outdoor-overcast', name: 'outdoor-overcast', label: 'Overskyet Utendørs', url: '/hdri/overcast.hdr', intensity: 1.2, rotation: 90, category: 'outdoor', tags: ['utendørs', 'overskyet'] },
  { id: 'indoor-office', name: 'indoor-office', label: 'Kontorinnendørs', url: '/hdri/office.hdr', intensity: 0.8, rotation: 0, category: 'indoor', tags: ['innendørs', 'kontor'] },
  { id: 'sunset-golden', name: 'sunset-golden', label: 'Gyldne Solnedgang', url: '/hdri/sunset.hdr', intensity: 1.5, rotation: 180, category: 'outdoor', tags: ['solnedgang', 'gylden', 'utendørs'], cct: 2700 },
];

class HDRIEnvironmentService {
  getAll(): HDRIEnvironment[] {
    return HDRI_ENVIRONMENTS;
  }

  getById(id: string): HDRIEnvironment | undefined {
    return HDRI_ENVIRONMENTS.find((e) => e.id === id);
  }

  getByCategory(category: HDRIEnvironment['category']): HDRIEnvironment[] {
    return HDRI_ENVIRONMENTS.filter((e) => e.category === category);
  }

  search(query: string): HDRIEnvironment[] {
    const q = query.toLowerCase();
    return HDRI_ENVIRONMENTS.filter(
      (e) => e.name.includes(q) || e.label.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)),
    );
  }
}

export const hdriEnvironmentService = new HDRIEnvironmentService();
export default hdriEnvironmentService;

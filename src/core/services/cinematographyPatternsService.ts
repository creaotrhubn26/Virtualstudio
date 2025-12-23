export interface LightSetup {
  type: 'key' | 'fill' | 'rim' | 'back' | 'hair' | 'kicker' | 'accent' | 'background' | 'practical';
  position: { x: number; y: number; z: number };
  intensity: number;
  colorTemp: number;
  modifier?: string;
}

export interface CinematographyPattern {
  id: string;
  name: string;
  category: 'portrait' | 'dramatic' | 'commercial' | 'film-noir' | 'beauty' | 'interview' | 'product';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  mood: string;
  keyToFillRatio: string;
  lights: LightSetup[];
  usedIn: string[];
  reference: string;
}

const patterns: CinematographyPattern[] = [
  {
    id: 'rembrandt',
    name: 'Rembrandt Lighting',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Klassisk portrettlys med trekantformet lys på kinnet. Oppkalt etter maleren Rembrandt.',
    mood: 'dramatic',
    keyToFillRatio: '4',
    lights: [
      { type: 'key', position: { x: -2, y: 2, z: 1 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 25, colorTemp: 5600, modifier: 'reflector' }
    ],
    usedIn: ['The Godfather', 'Girl with a Pearl Earring'],
    reference: 'Light Science & Magic, Ch. 9'
  },
  {
    id: 'butterfly',
    name: 'Butterfly / Paramount',
    category: 'beauty',
    difficulty: 'beginner',
    description: 'Lys rett forfra og ovenfra skaper sommerfuglformet skygge under nesen. Glamorøst Hollywood-look.',
    mood: 'high-key',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: 0, y: 2.5, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'beauty dish' },
      { type: 'fill', position: { x: 0, y: 0.5, z: 2 }, intensity: 50, colorTemp: 5600, modifier: 'reflector' }
    ],
    usedIn: ['Marlene Dietrich films', 'Vogue covers'],
    reference: 'Hollywood Lighting, Paramount era'
  },
  {
    id: 'split',
    name: 'Split Lighting',
    category: 'dramatic',
    difficulty: 'beginner',
    description: 'Halvparten av ansiktet i lys, halvparten i skygge. Mystisk og dramatisk effekt.',
    mood: 'mysterious',
    keyToFillRatio: '8',
    lights: [
      { type: 'key', position: { x: -3, y: 1.5, z: 0 }, intensity: 100, colorTemp: 5600, modifier: 'barn doors' }
    ],
    usedIn: ['The Dark Knight', 'Breaking Bad'],
    reference: 'Cinematography Theory and Practice'
  },
  {
    id: 'loop',
    name: 'Loop Lighting',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Skaper en liten skygge fra nesen som peker ned mot munnviken. Universelt flatterende.',
    mood: 'natural',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: -1.5, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: 1.5, y: 1.5, z: 1.5 }, intensity: 33, colorTemp: 5600 }
    ],
    usedIn: ['Corporate headshots', 'Magazine portraits'],
    reference: 'Portrait Photography Guide'
  },
  {
    id: 'broad',
    name: 'Broad Lighting',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Lyser opp den siden av ansiktet som vender mot kamera. Gjør ansiktet bredere.',
    mood: 'open',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: 2, y: 2, z: 1 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: -1, y: 1, z: 2 }, intensity: 33, colorTemp: 5600 }
    ],
    usedIn: ['Character portraits', 'Environmental portraits'],
    reference: 'Light Science & Magic'
  },
  {
    id: 'short',
    name: 'Short Lighting',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Lyser opp den siden av ansiktet som er vendt bort fra kamera. Slankende effekt.',
    mood: 'sculpted',
    keyToFillRatio: '4',
    lights: [
      { type: 'key', position: { x: -2, y: 2, z: -0.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: 1, y: 1, z: 2 }, intensity: 25, colorTemp: 5600 }
    ],
    usedIn: ['Fashion portraits', 'Fine art photography'],
    reference: 'Dramatic Portraits Guide'
  },
  {
    id: 'clamshell',
    name: 'Clamshell Lighting',
    category: 'beauty',
    difficulty: 'intermediate',
    description: 'To lys over og under motivet som en muslingskall. Minimale skygger, perfekt hud.',
    mood: 'bright',
    keyToFillRatio: '1.5',
    lights: [
      { type: 'key', position: { x: 0, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'beauty dish' },
      { type: 'fill', position: { x: 0, y: 0.3, z: 1.5 }, intensity: 70, colorTemp: 5600, modifier: 'reflector' }
    ],
    usedIn: ['Beauty campaigns', 'Cosmetics advertising'],
    reference: 'Beauty Photography Masterclass'
  },
  {
    id: 'three-point',
    name: 'Three-Point Lighting',
    category: 'interview',
    difficulty: 'beginner',
    description: 'Klassisk setup med key, fill og baklyslys. Standarden for film og video.',
    mood: 'balanced',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: -2, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 50, colorTemp: 5600 },
      { type: 'back', position: { x: 0, y: 2.5, z: -2 }, intensity: 70, colorTemp: 5600 }
    ],
    usedIn: ['Interviews', 'Corporate videos', 'News broadcasts'],
    reference: 'Film Lighting 101'
  },
  {
    id: 'high-key',
    name: 'High Key Lighting',
    category: 'commercial',
    difficulty: 'intermediate',
    description: 'Lyst, jevnt lys med minimale skygger. Optimistisk og rent uttrykk.',
    mood: 'bright',
    keyToFillRatio: '1',
    lights: [
      { type: 'key', position: { x: 0, y: 2, z: 2 }, intensity: 100, colorTemp: 5600, modifier: 'large softbox' },
      { type: 'fill', position: { x: -2, y: 1.5, z: 1 }, intensity: 80, colorTemp: 5600 },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 80, colorTemp: 5600 },
      { type: 'background', position: { x: 0, y: 2, z: -3 }, intensity: 100, colorTemp: 5600 }
    ],
    usedIn: ['Product photography', 'Medical imaging', 'Comedy films'],
    reference: 'Commercial Photography Techniques'
  },
  {
    id: 'low-key',
    name: 'Low Key Lighting',
    category: 'film-noir',
    difficulty: 'intermediate',
    description: 'Mørk, kontraststerk belysning med store skyggeområder. Dramatisk noir-stil.',
    mood: 'dark',
    keyToFillRatio: '8',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2, z: 0 }, intensity: 100, colorTemp: 5600, modifier: 'grid' }
    ],
    usedIn: ['Film noir', 'Thriller films', 'Sin City'],
    reference: 'Film Noir Cinematography'
  },
  {
    id: 'chiaroscuro',
    name: 'Chiaroscuro',
    category: 'dramatic',
    difficulty: 'advanced',
    description: 'Sterk kontrast mellom lys og mørke, inspirert av renessansemaleri.',
    mood: 'painterly',
    keyToFillRatio: '6',
    lights: [
      { type: 'key', position: { x: -2, y: 2.5, z: 0.5 }, intensity: 100, colorTemp: 3200, modifier: 'fresnel' }
    ],
    usedIn: ['Barry Lyndon', 'Caravaggio paintings'],
    reference: 'Renaissance Lighting Techniques'
  },
  {
    id: 'silhouette',
    name: 'Silhouette',
    category: 'dramatic',
    difficulty: 'beginner',
    description: 'Motivet i silhuett mot opplyst bakgrunn. Mystisk og grafisk effekt.',
    mood: 'mysterious',
    keyToFillRatio: '0',
    lights: [
      { type: 'background', position: { x: 0, y: 1.5, z: -3 }, intensity: 100, colorTemp: 5600, modifier: 'large softbox' }
    ],
    usedIn: ['Music videos', 'Title sequences', 'Dramatic reveals'],
    reference: 'Creative Lighting Techniques'
  },
  {
    id: 'rim-light',
    name: 'Rim Light / Edge Light',
    category: 'dramatic',
    difficulty: 'intermediate',
    description: 'Lysende kant rundt motivet som skiller det fra bakgrunnen.',
    mood: 'ethereal',
    keyToFillRatio: '4',
    lights: [
      { type: 'rim', position: { x: -2, y: 2, z: -1.5 }, intensity: 100, colorTemp: 5600 },
      { type: 'rim', position: { x: 2, y: 2, z: -1.5 }, intensity: 100, colorTemp: 5600 },
      { type: 'fill', position: { x: 0, y: 1, z: 2 }, intensity: 30, colorTemp: 5600 }
    ],
    usedIn: ['Music performances', 'Sports photography', 'Dramatic portraits'],
    reference: 'Backlight Mastery'
  },
  {
    id: 'horror',
    name: 'Horror / Under Lighting',
    category: 'dramatic',
    difficulty: 'beginner',
    description: 'Lys fra under ansiktet skaper unaturlige skygger. Skremmende effekt.',
    mood: 'scary',
    keyToFillRatio: '5',
    lights: [
      { type: 'key', position: { x: 0, y: -0.5, z: 1 }, intensity: 100, colorTemp: 5600 }
    ],
    usedIn: ['Horror films', 'Halloween promotions'],
    reference: 'Horror Film Lighting'
  },
  {
    id: 'motivated',
    name: 'Motivated Lighting',
    category: 'film-noir',
    difficulty: 'advanced',
    description: 'Lyset ser ut til å komme fra en synlig kilde i scenen (vindu, lampe, etc).',
    mood: 'realistic',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: -3, y: 2, z: 0 }, intensity: 100, colorTemp: 4000, modifier: 'window frame' },
      { type: 'practical', position: { x: 1, y: 1, z: 1 }, intensity: 30, colorTemp: 2700 }
    ],
    usedIn: ['Blade Runner', 'Natural light films'],
    reference: 'Practical Lighting for Film'
  },
  {
    id: 'cross-light',
    name: 'Cross Lighting',
    category: 'dramatic',
    difficulty: 'intermediate',
    description: 'To lys fra motsatte sider skaper dynamisk tekstur og dybde.',
    mood: 'dynamic',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2, z: 0 }, intensity: 100, colorTemp: 5600 },
      { type: 'key', position: { x: 2.5, y: 2, z: 0 }, intensity: 80, colorTemp: 5600 }
    ],
    usedIn: ['Action films', 'Sports coverage'],
    reference: 'Dynamic Lighting Setups'
  },
  {
    id: 'beauty-ring',
    name: 'Ring Light Beauty',
    category: 'beauty',
    difficulty: 'beginner',
    description: 'Ringblits rundt kameralinsen gir jevnt lys og karakteristisk catchlight.',
    mood: 'clean',
    keyToFillRatio: '1',
    lights: [
      { type: 'key', position: { x: 0, y: 1.5, z: 2 }, intensity: 100, colorTemp: 5600, modifier: 'ring light' }
    ],
    usedIn: ['Fashion photography', 'Social media portraits'],
    reference: 'Ring Light Techniques'
  },
  {
    id: 'spotlight',
    name: 'Spotlight / Pool of Light',
    category: 'dramatic',
    difficulty: 'intermediate',
    description: 'Fokusert lys som isolerer motivet i mørket. Teatralsk effekt.',
    mood: 'theatrical',
    keyToFillRatio: '10',
    lights: [
      { type: 'key', position: { x: 0, y: 3, z: 0 }, intensity: 100, colorTemp: 5600, modifier: 'snoot' }
    ],
    usedIn: ['Stage performances', 'Dramatic reveals', 'Musical films'],
    reference: 'Theatrical Lighting'
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour Simulation',
    category: 'commercial',
    difficulty: 'advanced',
    description: 'Etterligner det varme sollyset i gyllen time. Romantisk og flatterende.',
    mood: 'warm',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: -3, y: 1.5, z: -1 }, intensity: 100, colorTemp: 3200, modifier: 'CTO gel' },
      { type: 'fill', position: { x: 2, y: 1, z: 1 }, intensity: 30, colorTemp: 5600 }
    ],
    usedIn: ['Romantic films', 'Perfume commercials'],
    reference: 'Natural Light Simulation'
  },
  {
    id: 'negative-fill',
    name: 'Negative Fill',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Bruker svart materiale for å absorbere lys og øke kontrasten.',
    mood: 'sculpted',
    keyToFillRatio: '5',
    lights: [
      { type: 'key', position: { x: -1.5, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' }
    ],
    usedIn: ['Dramatic portraits', 'Character studies'],
    reference: 'Subtractive Lighting'
  },
  {
    id: 'product-hero',
    name: 'Product Hero Shot',
    category: 'product',
    difficulty: 'advanced',
    description: 'Multi-lys oppsett for å fremheve produktets form og overflate.',
    mood: 'commercial',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: -1, y: 2, z: 1 }, intensity: 100, colorTemp: 5600, modifier: 'strip softbox' },
      { type: 'accent', position: { x: 1, y: 2, z: 0.5 }, intensity: 60, colorTemp: 5600, modifier: 'strip softbox' },
      { type: 'back', position: { x: 0, y: 1.5, z: -2 }, intensity: 80, colorTemp: 5600 },
      { type: 'background', position: { x: 0, y: 2, z: -3 }, intensity: 70, colorTemp: 5600 }
    ],
    usedIn: ['Product advertising', 'E-commerce'],
    reference: 'Product Photography Pro'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk / Neon',
    category: 'dramatic',
    difficulty: 'expert',
    description: 'Fargerikt neonlys med høy kontrast. Futuristisk sci-fi estetikk.',
    mood: 'futuristic',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: -2, y: 1.5, z: 1 }, intensity: 100, colorTemp: 4000, modifier: 'magenta gel' },
      { type: 'rim', position: { x: 2, y: 2, z: -1 }, intensity: 80, colorTemp: 6500, modifier: 'cyan gel' },
      { type: 'accent', position: { x: 0, y: 0.5, z: 2 }, intensity: 40, colorTemp: 3200, modifier: 'purple gel' }
    ],
    usedIn: ['Blade Runner 2049', 'Cyberpunk 2077', 'Music videos'],
    reference: 'Neon Noir Cinematography'
  }
];

class CinematographyPatternsService {
  getAllPatterns(): CinematographyPattern[] {
    return patterns;
  }

  getPatternById(id: string): CinematographyPattern | undefined {
    return patterns.find(p => p.id === id);
  }

  getPatternsByCategory(category: string): CinematographyPattern[] {
    return patterns.filter(p => p.category === category);
  }

  getPatternsByDifficulty(difficulty: string): CinematographyPattern[] {
    return patterns.filter(p => p.difficulty === difficulty);
  }
}

export const cinematographyPatternsService = new CinematographyPatternsService();

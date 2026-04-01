export interface LightSetup {
  type: 'key' | 'fill' | 'rim' | 'back' | 'hair' | 'kicker' | 'accent' | 'background' | 'practical' | 'ambient' | 'negative-fill';
  position: { x: number; y: number; z: number };
  intensity: number;
  colorTemp: number;
  modifier?: string;
}

export interface CinematographyPattern {
  id: string;
  name: string;
  category: 'portrait' | 'dramatic' | 'commercial' | 'film-noir' | 'beauty' | 'interview' | 'product' | 'narrative' | 'natural' | 'cinematic' | 'editorial' | 'creative';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  mood: string;
  keyToFillRatio: string;
  lights: LightSetup[];
  usedIn: string[];
  reference: string;
  thumbnail?: string;
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
    reference: 'Light Science & Magic, Ch. 9',
    thumbnail: '/pattern-thumbnails/rembrandt_lighting_pattern_diagram.png'
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
    reference: 'Hollywood Lighting, Paramount era',
    thumbnail: '/pattern-thumbnails/butterfly_lighting_pattern_diagram.png'
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
    reference: 'Cinematography Theory and Practice',
    thumbnail: '/pattern-thumbnails/split_lighting_pattern_diagram.png'
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
    reference: 'Portrait Photography Guide',
    thumbnail: '/pattern-thumbnails/loop_lighting_pattern_diagram.png'
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
    reference: 'Light Science & Magic',
    thumbnail: '/pattern-thumbnails/broad_lighting_pattern_diagram.png'
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
    reference: 'Dramatic Portraits Guide',
    thumbnail: '/pattern-thumbnails/short_lighting_pattern_diagram.png'
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
    reference: 'Beauty Photography Masterclass',
    thumbnail: '/pattern-thumbnails/clamshell_lighting_pattern_diagram.png'
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
    reference: 'Film Lighting 101',
    thumbnail: '/pattern-thumbnails/three-point_lighting_diagram.png'
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
    reference: 'Commercial Photography Techniques',
    thumbnail: '/pattern-thumbnails/high-key_lighting_diagram.png'
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
    reference: 'Film Noir Cinematography',
    thumbnail: '/pattern-thumbnails/film_noir_lighting_diagram.png'
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
    reference: 'Backlight Mastery',
    thumbnail: '/pattern-thumbnails/rim_lighting_pattern_diagram.png'
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
  },
  {
    id: 'short-lighting',
    name: 'Kort Belysning',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Lys treffer den smaleste (bortvendte) siden av ansiktet. Slankende og tredimensjonalt.',
    mood: 'sculpted',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: 2.5, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: -1.5, y: 1.5, z: 1 }, intensity: 33, colorTemp: 5600 }
    ],
    usedIn: ['Portrait photography', 'Editorial fashion'],
    reference: 'Portrait Lighting: Craft and Technique, Ch. 5'
  },
  {
    id: 'broad-lighting',
    name: 'Bred Belysning',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Lys treffer den bredeste (nærmeste) siden av ansiktet. Runder og myker ansiktsformen.',
    mood: 'open',
    keyToFillRatio: '2.5',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'softbox' },
      { type: 'fill', position: { x: 1.5, y: 1.5, z: 1 }, intensity: 40, colorTemp: 5600 }
    ],
    usedIn: ['Corporate headshots', 'Family portraits'],
    reference: 'Portrait Lighting: Craft and Technique, Ch. 4'
  },
  {
    id: 'window-natural',
    name: 'Vinduslys (Naturlig)',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Etterligner mykt nordvendt vindusslys. Naturlig og flatterende for de fleste motiver.',
    mood: 'natural',
    keyToFillRatio: '4',
    lights: [
      { type: 'key', position: { x: -3, y: 1.6, z: 0 }, intensity: 80, colorTemp: 5500, modifier: 'large softbox' }
    ],
    usedIn: ['Documentary portraits', 'Editorial lifestyle', 'Nordisk portrettfotografi'],
    reference: 'Available Light Photography'
  },
  {
    id: 'interview-corporate',
    name: 'Intervju Corporate',
    category: 'interview',
    difficulty: 'beginner',
    description: 'Tre-lys oppsett for profesjonelt TV-intervju og corporate video.',
    mood: 'professional',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: -2, y: 2.5, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'octabox' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 50, colorTemp: 5600, modifier: 'softbox' },
      { type: 'hair', position: { x: 0, y: 3, z: -2 }, intensity: 60, colorTemp: 5600 }
    ],
    usedIn: ['TV interviews', 'Corporate videos', 'Talking heads'],
    reference: 'Broadcast Lighting Techniques'
  },
  {
    id: 'beauty-dish-shot',
    name: 'Beauty Dish Classic',
    category: 'beauty',
    difficulty: 'intermediate',
    description: 'Høyt plassert beauty dish med honeycomb grid gir skarpe, men myke skygger.',
    mood: 'glamorous',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: 0, y: 2.5, z: 1.5 }, intensity: 100, colorTemp: 5600, modifier: 'beauty dish' },
      { type: 'fill', position: { x: 0, y: 0.5, z: 2 }, intensity: 33, colorTemp: 5600, modifier: 'reflector' },
      { type: 'hair', position: { x: 0, y: 3, z: -1.5 }, intensity: 50, colorTemp: 5600 }
    ],
    usedIn: ['Fashion beauty', 'Cosmetics advertising', 'Magazine covers'],
    reference: 'Beauty Photography Lighting'
  },
  {
    id: 'fashion-gel',
    name: 'Fashion Gel Editorial',
    category: 'commercial',
    difficulty: 'expert',
    description: 'Tonede gels for kreativ mote-estetikk med høy fargemetting.',
    mood: 'vibrant',
    keyToFillRatio: '2',
    lights: [
      { type: 'key', position: { x: -2, y: 2, z: 1 }, intensity: 100, colorTemp: 5600, modifier: 'magenta gel' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 50, colorTemp: 5600, modifier: 'cyan gel' },
      { type: 'background', position: { x: 0, y: 2, z: -3 }, intensity: 70, colorTemp: 5600, modifier: 'cobalt gel' }
    ],
    usedIn: ['Fashion Week shoots', 'Music video', 'Editorial campaigns'],
    reference: 'Color Gel Techniques in Fashion Photography'
  },
  {
    id: 'ring-light-portrait',
    name: 'Ringlys Portrett',
    category: 'beauty',
    difficulty: 'beginner',
    description: 'Ringlys foran motivet gir det karakteristiske runde reflekset i øynene og jevnt, flatfyllende lys.',
    mood: 'glamorous',
    keyToFillRatio: '1',
    lights: [
      { type: 'key', position: { x: 0, y: 1.6, z: 2 }, intensity: 120, colorTemp: 5500, modifier: 'ring light' }
    ],
    usedIn: ['Beauty YouTube', 'Makeup tutorials', 'Social media portraits', 'TikTok / Instagram'],
    reference: 'Ring Light Technique Guide'
  },
  {
    id: 'product-packshot',
    name: 'Produktfoto Packshot',
    category: 'product',
    difficulty: 'intermediate',
    description: 'Hvit infinity bakgrunn med jevnt overeksponert lys – standard for e-handel og katalog.',
    mood: 'clean',
    keyToFillRatio: '1',
    lights: [
      { type: 'key', position: { x: 0, y: 3, z: 1 }, intensity: 120, colorTemp: 5500, modifier: 'softbox large' },
      { type: 'fill', position: { x: -2, y: 1.5, z: 1 }, intensity: 100, colorTemp: 5500, modifier: 'softbox' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 1 }, intensity: 100, colorTemp: 5500, modifier: 'softbox' },
      { type: 'background', position: { x: 0, y: 1, z: -3 }, intensity: 120, colorTemp: 5500 }
    ],
    usedIn: ['E-commerce', 'Catalog photography', 'Amazon listings', 'Product launch'],
    reference: 'E-Commerce Lighting Guide'
  },
  {
    id: 'detective-noir',
    name: 'Detektivens Kontor (Noir)',
    category: 'film-noir',
    difficulty: 'expert',
    description: 'Ekstrem venetiansk persienne-projeksjon med 90% skygge – mørk, intens, klassisk noir.',
    mood: 'dark',
    keyToFillRatio: '8',
    lights: [
      { type: 'key', position: { x: -3, y: 2.5, z: 0 }, intensity: 150, colorTemp: 3200, modifier: 'venetian blinds gobo' },
      { type: 'rim', position: { x: 3, y: 2, z: -2 }, intensity: 40, colorTemp: 3000 }
    ],
    usedIn: ['Film noir', 'Crime thrillers', 'Neo-noir', 'Dark editorial'],
    reference: 'Gordon Willis Cinematography Techniques'
  },
  {
    id: 'documentary-available',
    name: 'Dokumentar Tilgjengelig Lys',
    category: 'interview',
    difficulty: 'beginner',
    description: 'Minimal manipulasjon av tilgjengelig lys – praktisk og miljøbasert. Beholder stemning og autentisitet.',
    mood: 'natural',
    keyToFillRatio: '3',
    lights: [
      { type: 'key', position: { x: -3, y: 2, z: 0 }, intensity: 60, colorTemp: 5600, modifier: 'bare or diffused window' }
    ],
    usedIn: ['Documentary film', 'News reporting', 'Lifestyle photography', 'Social documentary'],
    reference: 'Documentary Cinematography Handbook'
  },
  {
    id: 'practical-only',
    name: 'Kun Praktiske Lys',
    category: 'narrative',
    difficulty: 'intermediate',
    description: 'Kun praktiske lamper i scenen — gulvlampe, bordlampe, pendellampe. Høy kontrast og autentisk interiørstemning.',
    mood: 'intimate',
    keyToFillRatio: '6:1',
    lights: [
      { type: 'key', position: { x: 1.8, y: 0.9, z: 0.5 }, intensity: 50, colorTemp: 2700, modifier: 'practical floor lamp' },
      { type: 'fill', position: { x: 0, y: 2.2, z: 0.5 }, intensity: 20, colorTemp: 2400, modifier: 'pendant warm' }
    ],
    usedIn: ['Crime drama', 'Intimate scenes', 'Restaurant interiors', 'Period drama'],
    reference: 'Practical Lighting for Film (Birns & Sawyer)'
  },
  {
    id: 'window-backlighting',
    name: 'Vindus Bakbelysning',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Naturlig dagslys fra store vinduer bak motivet. Silhuettering og kontur-lys kombinert med front-fill.',
    mood: 'cinematic',
    keyToFillRatio: '4:1',
    lights: [
      { type: 'key', position: { x: 0, y: 1.5, z: -3 }, intensity: 120, colorTemp: 5600, modifier: 'window / large frame diffuser' },
      { type: 'fill', position: { x: -2, y: 1.8, z: 1.5 }, intensity: 30, colorTemp: 5600, modifier: 'reflector or LED panel' }
    ],
    usedIn: ['Lifestyle photography', 'Fashion editorial', 'Urban portrait', 'Environmental portrait'],
    reference: 'Strobist Method — On-Location Natural Light'
  },
  {
    id: 'penthouse-night',
    name: 'Penthouse Natt',
    category: 'interview',
    difficulty: 'advanced',
    description: 'Urban nattintervju i penthouse-omgivelser. Bylysglo fra vinduer kombinert med soft LED key-lys og warm practical.',
    mood: 'premium',
    keyToFillRatio: '3:1',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2.2, z: 1.5 }, intensity: 80, colorTemp: 4200, modifier: 'LED softbox 60x60' },
      { type: 'fill', position: { x: 2.5, y: 1.8, z: 1.5 }, intensity: 25, colorTemp: 4200, modifier: 'LED panel 30x30' },
      { type: 'practical', position: { x: 1.8, y: 0.9, z: 0.5 }, intensity: 40, colorTemp: 2700, modifier: 'floor lamp' },
      { type: 'ambient', position: { x: 0, y: 1.5, z: -3 }, intensity: 15, colorTemp: 3800, modifier: 'city glow through window' }
    ],
    usedIn: ['Corporate interview', 'TV documentary', 'Premium brand film', 'Luxury lifestyle'],
    reference: 'On-Location Premium Lighting (Vistek)'
  },
  {
    id: 'candle-firelight',
    name: 'Stearinlys og Båleffekt',
    category: 'narrative',
    difficulty: 'advanced',
    description: 'Meget lavt lavt nøkkellys simulerer stearinlys og bålflammer. Kald bak-rim kombineres med varm, flimrende glød foran.',
    mood: 'dramatic',
    keyToFillRatio: '8:1',
    lights: [
      { type: 'key', position: { x: 0, y: 0.6, z: 1 }, intensity: 25, colorTemp: 1900, modifier: 'candle simulation (flicker on)' },
      { type: 'rim', position: { x: 0, y: 2.5, z: -1.5 }, intensity: 20, colorTemp: 4500, modifier: 'bare or grid spot' }
    ],
    usedIn: ['Period drama', 'Horror film', 'Fantasy', 'Game previsualization', 'Intimate dinner scene'],
    reference: 'Kubrick — Barry Lyndon (natural light)'
  },
  {
    id: 'sunset-through-window',
    name: 'Solnedgang Gjennom Vindu',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Gyllen time-lys som strømmer gjennom vinduer. Varm oransje side-nøkkel, blå/kjøl skygge-side. Naturlig og romantisk.',
    mood: 'golden',
    keyToFillRatio: '4:1',
    lights: [
      { type: 'key', position: { x: -3, y: 2, z: 0 }, intensity: 90, colorTemp: 3200, modifier: 'golden hour window emitter or HMI orange gel' },
      { type: 'fill', position: { x: 3, y: 1.5, z: 0.5 }, intensity: 20, colorTemp: 6500, modifier: 'sky fill / blue bounce' }
    ],
    usedIn: ['Fashion editorial', 'Wedding photography', 'Lifestyle', 'Romantic film scenes'],
    reference: 'Golden Hour Photography — Bryan Peterson'
  },
  {
    id: 'split-tone-dual-gel',
    name: 'Split Tone — Dual Gel',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'To kontrasterende farger fra begge sider — typisk orange/blå eller grønn/magenta. Sterk visuell effekt for musikkvideo og editorial.',
    mood: 'dramatic',
    keyToFillRatio: '1:1',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2.0, z: 1.0 }, intensity: 80, colorTemp: 5600, modifier: 'CTO gel + octabox' },
      { type: 'fill', position: { x: 2.5, y: 2.0, z: 1.0 }, intensity: 75, colorTemp: 5600, modifier: 'CTB gel + octabox' }
    ],
    usedIn: ['Music video', 'Fashion editorial', 'Cyberpunk aesthetic', 'Social media'],
    reference: 'Wong Kar-Wai — In the Mood for Love'
  },
  {
    id: 'broad-lighting',
    name: 'Bred Belysning (Broad Lighting)',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Nøkkellys belyst den brede siden av ansiktet mot kameraet. Gjør ansiktet bredere og mer fremtredende. Vanlig for maskuline portretter.',
    mood: 'neutral',
    keyToFillRatio: '3:1',
    lights: [
      { type: 'key', position: { x: -1.5, y: 2.0, z: 1.5 }, intensity: 75, colorTemp: 5500, modifier: 'large softbox' },
      { type: 'fill', position: { x: 2.5, y: 1.5, z: 1.0 }, intensity: 25, colorTemp: 5500, modifier: 'reflector' }
    ],
    usedIn: ['Masculine portraits', 'Corporate', 'Headshots', 'Character study'],
    reference: 'Joe Edelman — Portrait Photography'
  },
  {
    id: 'short-lighting',
    name: 'Kort Belysning (Short Lighting)',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Nøkkellys belyser den korte (skyggesiden) av ansiktet. Gir mer kontur og slanker ansiktet. Tidløs og flatterende.',
    mood: 'neutral',
    keyToFillRatio: '3:1',
    lights: [
      { type: 'key', position: { x: 2.5, y: 2.0, z: 1.5 }, intensity: 75, colorTemp: 5500, modifier: 'softbox 60x90' },
      { type: 'fill', position: { x: -2.5, y: 1.5, z: 1.0 }, intensity: 25, colorTemp: 5500, modifier: 'reflector' }
    ],
    usedIn: ['Portrait', 'Headshot', 'Commercial', 'Event photography'],
    reference: 'Zack Arias — One Light Workshop'
  },
  {
    id: 'clamshell-beauty',
    name: 'Clamshell (Skjønnhetslys)',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Refleksjonsform med to lys: stor oktaboks over og reflektor-fill under. Gir bløte og flatterende øyehalv-månene under øynene.',
    mood: 'glamour',
    keyToFillRatio: '2:1',
    lights: [
      { type: 'key', position: { x: 0, y: 2.5, z: 1.5 }, intensity: 90, colorTemp: 5600, modifier: 'large octabox 120cm' },
      { type: 'fill', position: { x: 0, y: 0.5, z: 1.5 }, intensity: 45, colorTemp: 5600, modifier: 'white reflector / bounce card' }
    ],
    usedIn: ['Beauty photography', 'Glamour', 'Fashion editorial', 'Cosmetics'],
    reference: 'Peter Hurley — The Headshot'
  },
  {
    id: 'hard-neon-portrait',
    name: 'Hard Neon Portrett',
    category: 'narrative',
    difficulty: 'intermediate',
    description: 'Hard, uhyggelig neonlys uten softboks. Inspirert av Drive og Blade Runner. Sterke farger, minimal diffusjon.',
    mood: 'dramatic',
    keyToFillRatio: '6:1',
    lights: [
      { type: 'key', position: { x: -2.0, y: 2.0, z: 1.0 }, intensity: 85, colorTemp: 5600, modifier: 'RGB tube bare or snoot' },
      { type: 'rim', position: { x: 2.0, y: 2.5, z: -0.5 }, intensity: 60, colorTemp: 5600, modifier: 'RGB tube bare — opposite color' }
    ],
    usedIn: ['Cyberpunk', 'Noir', 'Music video', 'Action film'],
    reference: 'Blade Runner 2049 — Roger Deakins'
  },
  {
    id: 'available-light-window',
    name: 'Available Light — Vindus Portrett',
    category: 'natural',
    difficulty: 'beginner',
    description: 'Rent vinduslys med minimal påvirkning. Klassisk "natural light photographer" oppsett med eventuell bounce card.',
    mood: 'natural',
    keyToFillRatio: '5:1',
    lights: [
      { type: 'key', position: { x: -3, y: 1.8, z: 0 }, intensity: 100, colorTemp: 6200, modifier: 'window (available daylight)' },
      { type: 'fill', position: { x: 2, y: 1.5, z: 0.5 }, intensity: 20, colorTemp: 6000, modifier: 'white foam core bounce' }
    ],
    usedIn: ['Lifestyle', 'Natural light portrait', 'Documentary', 'Newborn'],
    reference: 'Annie Leibovitz — Natural Light'
  },
  {
    id: 'top-down-overhead',
    name: 'Overhead Flat (Top-Down)',
    category: 'product',
    difficulty: 'beginner',
    description: 'Lys rett ovenfra for flat lay og mat-fotografi. Jevn skyggefri overflate.',
    mood: 'clean',
    keyToFillRatio: '1:1',
    lights: [
      { type: 'key', position: { x: 0, y: 3.5, z: 0 }, intensity: 100, colorTemp: 5500, modifier: 'large softbox or LED panel overhead' },
      { type: 'fill', position: { x: -2, y: 1.5, z: 0.5 }, intensity: 40, colorTemp: 5500, modifier: 'foam core bounce' }
    ],
    usedIn: ['Food photography', 'Product', 'Flat lay', 'Cosmetics'],
    reference: 'Standard Tabletop / Food Photography'
  },
  {
    id: 'contre-jour',
    name: 'Contre-Jour (Silhouette / Bakgrunnslys)',
    category: 'cinematic',
    difficulty: 'intermediate',
    description: 'Lyset er plassert bak motivet, mot kameraet. Skaper silhuett eller rim-glow. Brukes for drama, mysterium og romantikk.',
    mood: 'dramatic',
    keyToFillRatio: '0:1',
    lights: [
      { type: 'back', position: { x: 0, y: 2.0, z: -3 }, intensity: 120, colorTemp: 5600, modifier: 'HMI, window, or large LED panel' },
      { type: 'fill', position: { x: 0, y: 1.5, z: 2 }, intensity: 10, colorTemp: 5600, modifier: 'subtle reflector fill' }
    ],
    usedIn: ['Drama', 'Wedding', 'Romantic film', 'Thriller', 'Music video'],
    reference: 'Terrence Malick — Days of Heaven'
  },
  {
    id: 'motivated-practical-diegetic',
    name: 'Motivated / Praktisk Lys (Diegetisk)',
    category: 'narrative',
    difficulty: 'advanced',
    description: 'Alle lys er "motiverte" av synlige lyskilder i scenen (lamper, skjermer, vindu). Svært realistisk og filmisk.',
    mood: 'natural',
    keyToFillRatio: '4:1',
    lights: [
      { type: 'key', position: { x: 1.5, y: 1.8, z: 0.5 }, intensity: 70, colorTemp: 2800, modifier: 'table lamp / floor lamp simulation' },
      { type: 'fill', position: { x: -2, y: 1.5, z: 0 }, intensity: 18, colorTemp: 5500, modifier: 'window or screen bounce' },
      { type: 'rim', position: { x: 0, y: 2, z: -2 }, intensity: 25, colorTemp: 3800, modifier: 'motivated background source' }
    ],
    usedIn: ['Narrative film', 'TV drama', 'Realistic documentary', 'On-location'],
    reference: 'Roger Deakins — No Country for Old Men'
  },

  // ── Extended Pattern Library ───────────────────────────────────────────────
  {
    id: 'beauty-ring-light',
    name: 'Beauty Ring Light (Frontal Annular)',
    category: 'beauty',
    difficulty: 'beginner',
    description: 'Kamera-aksel ringblits gir karakteristisk donut-catchlight og skyggefritt frontlys. Standard for beauty og beauty bloggers.',
    mood: 'clean',
    keyToFillRatio: '1:1',
    lights: [
      { type: 'key', position: { x: 0, y: 1.7, z: -1.5 }, intensity: 100, colorTemp: 5600, modifier: 'ring flash / ring light (on camera axis)' }
    ],
    usedIn: ['Beauty editorial', 'Instagram', 'YouTube', 'Cosmetics'],
    reference: 'Classic beauty ring — Patrick Demarchelier, Irving Penn'
  },
  {
    id: 'high-fashion-edge',
    name: 'High Fashion — Edge Sidelight',
    category: 'editorial',
    difficulty: 'advanced',
    description: 'Ekstremt sidelys fra nesten 90° for maksimal kantdefinisjon og skulpturell effekt. Svart negfyll på motstående side.',
    mood: 'dramatic',
    keyToFillRatio: '8:1',
    lights: [
      { type: 'key', position: { x: -3.0, y: 2.0, z: 0 }, intensity: 100, colorTemp: 5500, modifier: 'stripbox 60x20 or hard reflector' },
      { type: 'negative-fill', position: { x: 3.0, y: 2.0, z: 0 }, intensity: 0, colorTemp: 5500, modifier: 'black foam core (negative fill)' }
    ],
    usedIn: ['Haute couture', 'Vogue editorial', 'Fine art', 'Avant-garde'],
    reference: 'Nick Knight — Vogue UK / Helmut Newton'
  },
  {
    id: 'foundation-beauty',
    name: 'Foundation / Skincare Beauty',
    category: 'beauty',
    difficulty: 'intermediate',
    description: 'Weich, jevnt lys fra litt over kameraet for perfekt hudgjengivelse og minimal skygge. Standard for foundation og moisturizer reklame.',
    mood: 'soft',
    keyToFillRatio: '3:2',
    lights: [
      { type: 'key', position: { x: 0, y: 2.2, z: -1.2 }, intensity: 100, colorTemp: 5500, modifier: 'large octabox 120cm or overhead softbox' },
      { type: 'fill', position: { x: 1.8, y: 1.5, z: -0.8 }, intensity: 65, colorTemp: 5500, modifier: 'reflector or small softbox' },
      { type: 'hair', position: { x: 0, y: 2.8, z: 0.8 }, intensity: 40, colorTemp: 6000, modifier: 'stripbox with grid' }
    ],
    usedIn: ['Beauty ads', 'Skincare', 'Cosmetics campaigns', 'Magazine'],
    reference: 'Standard beauty triangle / Mario Testino beauty shoots'
  },
  {
    id: 'color-gel-creative',
    name: 'Creative Gel — Dual Color Split',
    category: 'creative',
    difficulty: 'intermediate',
    description: 'To gel-lys i kontrastfarger (typisk blå og oransje) splitter ansiktet og skaper dramatisk estetikk.',
    mood: 'dramatic',
    keyToFillRatio: '2:1',
    lights: [
      { type: 'key', position: { x: -1.8, y: 2.0, z: -0.5 }, intensity: 100, colorTemp: 3200, modifier: 'gridded spot with CTO gel (warm orange)' },
      { type: 'rim', position: { x: 2.0, y: 2.0, z: 0.5 }, intensity: 75, colorTemp: 5600, modifier: 'stripbox with CTB gel (cool blue)' }
    ],
    usedIn: ['Music video', 'Fashion editorial', 'Album cover', 'Social media'],
    reference: 'Brandon Woelfel — neon gel split aesthetics'
  },
  {
    id: 'industrial-harsh',
    name: 'Industriell — Hardt Lys',
    category: 'portrait',
    difficulty: 'intermediate',
    description: 'Ubevegelig hardt lys fra siden som avslører tekstur og porer. Brukt i gritty portrett og arbeiderklasse-estetikk.',
    mood: 'harsh',
    keyToFillRatio: '6:1',
    lights: [
      { type: 'key', position: { x: -2.0, y: 2.5, z: -0.5 }, intensity: 100, colorTemp: 5500, modifier: 'bare bulb or open reflector (no modifier)' },
      { type: 'fill', position: { x: 2.0, y: 1.5, z: 0 }, intensity: 18, colorTemp: 5500, modifier: 'foam core bounce (minimal fill)' }
    ],
    usedIn: ['Documentary', 'Industrial portrait', 'Gritty editorial', 'Working class'],
    reference: 'Dorothea Lange — Great Depression portraits'
  },
  {
    id: 'window-light-natural',
    name: 'Vinduslys — Naturlig Mykhet',
    category: 'portrait',
    difficulty: 'beginner',
    description: 'Simulert naturlig vinduslys fra siden. Soft gradient skygge, lunt og naturlig — det mest tidløse portrettlyset.',
    mood: 'natural',
    keyToFillRatio: '4:1',
    lights: [
      { type: 'key', position: { x: -2.5, y: 2.0, z: 0 }, intensity: 100, colorTemp: 5500, modifier: 'large softbox 100x150cm or octabox 120cm' },
      { type: 'fill', position: { x: 2.5, y: 1.8, z: 0 }, intensity: 25, colorTemp: 5500, modifier: 'white reflector card or foam core' }
    ],
    usedIn: ['Portrait', 'Lifestyle', 'Wedding', 'Family photography'],
    reference: 'Studio window light — Karsh, Leibovitz intimate portraits'
  },
  {
    id: 'product-360-turntable',
    name: 'Produktfoto 360° — Turntable Oppsett',
    category: 'commercial',
    difficulty: 'intermediate',
    description: 'To stripbokser på hver side pluss underbelysning gir jevnt lys fra alle vinkler — perfekt for 360° produktrotasjon.',
    mood: 'clean',
    keyToFillRatio: '2:1',
    lights: [
      { type: 'key', position: { x: -2.0, y: 1.5, z: 0 }, intensity: 100, colorTemp: 5600, modifier: 'stripbox 30x120cm' },
      { type: 'fill', position: { x: 2.0, y: 1.5, z: 0 }, intensity: 70, colorTemp: 5600, modifier: 'stripbox 30x120cm' },
      { type: 'background', position: { x: 0, y: 0.5, z: -0.5 }, intensity: 80, colorTemp: 5600, modifier: 'bottom light / light table' }
    ],
    usedIn: ['E-commerce', '360° product spin', 'Luxury goods', 'Amazon listing'],
    reference: 'Standard e-commerce / Amazon studio setup'
  },
  {
    id: 'glamour-high-key-color',
    name: 'Glamour High-Key med Farge',
    category: 'beauty',
    difficulty: 'intermediate',
    description: 'Klassisk glamour high-key med pastelfarget bakgrunn og hvitt overlys. Pop-estetikk, VSCO og editorial mote.',
    mood: 'soft',
    keyToFillRatio: '2:1',
    lights: [
      { type: 'key', position: { x: 0, y: 2.5, z: -1.5 }, intensity: 100, colorTemp: 5500, modifier: 'large parabolic 133cm overhead' },
      { type: 'fill', position: { x: -1.5, y: 1.5, z: -0.8 }, intensity: 55, colorTemp: 5500, modifier: 'octabox 90cm' },
      { type: 'fill', position: { x: 1.5, y: 1.5, z: -0.8 }, intensity: 45, colorTemp: 5500, modifier: 'octabox 90cm' },
      { type: 'background', position: { x: 0, y: 1.5, z: 4.0 }, intensity: 120, colorTemp: 5500, modifier: 'background light with gel' }
    ],
    usedIn: ['Pop editorial', 'Fashion week', 'Album artwork', 'Beauty campaigns'],
    reference: 'David LaChapelle — vivid color editorial'
  },
  {
    id: 'outdoor-sync-daylight',
    name: 'Utendørs Fill-Sync (Balanced Daylight)',
    category: 'commercial',
    difficulty: 'intermediate',
    description: 'Balanserer strobelys mot naturlig dagslys. HSS-blits brukes som nøkkelfyll for å unngå undersiden av hetter og briller i sol.',
    mood: 'natural',
    keyToFillRatio: '1:1',
    lights: [
      { type: 'key', position: { x: -1.5, y: 2.0, z: -1.0 }, intensity: 80, colorTemp: 5500, modifier: 'octabox or shoot-through umbrella (HSS strobe)' },
      { type: 'ambient', position: { x: 3, y: 5, z: -3 }, intensity: 100, colorTemp: 5600, modifier: 'natural sunlight (simulated)' }
    ],
    usedIn: ['Outdoor portrait', 'Lifestyle', 'Fashion on location', 'Sports'],
    reference: 'Joe McNally — HSS fill flash technique'
  },
  {
    id: 'environmental-narrative',
    name: 'Miljøscene — Narrativt Portrett',
    category: 'narrative',
    difficulty: 'advanced',
    description: 'Motivert fra scene-elementer. Praktisk lampe motiverer varmt nøkkellys, vindu motiverer kjølig fyldlys. Svært filmisk.',
    mood: 'natural',
    keyToFillRatio: '3:1',
    lights: [
      { type: 'key', position: { x: 1.2, y: 1.6, z: 0.3 }, intensity: 80, colorTemp: 2700, modifier: 'small LED (lamp simulation) with CTO' },
      { type: 'fill', position: { x: -2.5, y: 2.0, z: 0 }, intensity: 27, colorTemp: 5500, modifier: 'large softbox (window simulation)' },
      { type: 'practical', position: { x: 1.5, y: 1.4, z: 0.5 }, intensity: 40, colorTemp: 2400, modifier: 'visible lamp (practical in frame)' }
    ],
    usedIn: ['Film', 'TV series', 'Commercial', 'Editorial with environment'],
    reference: 'Barry Lyndon (Kubrick) — practical candle and firelight'
  },
  {
    id: 'fashion-ttv-tunnel',
    name: 'Fashion Tunnel / Through-the-Viewfinder',
    category: 'editorial',
    difficulty: 'advanced',
    description: 'Kamera i tunnel av lys med frembelysning av bakgrunn og sidelys på motivet. Dybde, kontrast og mystikk.',
    mood: 'dramatic',
    keyToFillRatio: '5:1',
    lights: [
      { type: 'key', position: { x: -2.0, y: 2.2, z: -1.0 }, intensity: 100, colorTemp: 5500, modifier: 'beauty dish silver' },
      { type: 'background', position: { x: 0, y: 2.0, z: 5.0 }, intensity: 200, colorTemp: 5500, modifier: 'bare strobe at backdrop' },
      { type: 'rim', position: { x: 2.2, y: 2.0, z: 0.5 }, intensity: 60, colorTemp: 5500, modifier: 'gridded spot (rim)' }
    ],
    usedIn: ['Fashion editorial', 'Advertising', 'High-fashion lookbook'],
    reference: 'Annie Leibovitz — layered environment shoots'
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

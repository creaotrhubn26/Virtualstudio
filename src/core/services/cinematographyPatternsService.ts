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

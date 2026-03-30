/**
 * Gobo Definitions - Pattern definitions and texture generators for gobos
 */

export type GoboPattern = 'window' | 'blinds' | 'leaves' | 'breakup' | 'dots' | 'lines' | 'custom';

export interface GoboDefinition {
  id: string;
  name: string;
  nameNo: string;
  pattern: GoboPattern;
  category: 'architectural' | 'nature' | 'abstract' | 'custom';
  description: string;
  descriptionNo: string;
  defaultSize: number; // in meters
  defaultRotation: number; // in degrees
  tags: string[];
  moodTags?: string[];
}

export interface GoboOptions {
  pattern: GoboPattern;
  size: number;
  rotation: number; // degrees
  intensity: number; // 0-1
  customTextureUrl?: string; // for custom patterns
}

export const GOBO_PATTERNS: GoboDefinition[] = [
  {
    id: 'window',
    name: 'Window Pattern',
    nameNo: 'Vindusmønster',
    pattern: 'window',
    category: 'architectural',
    description: 'Classic window frame pattern with cross bars',
    descriptionNo: 'Klassisk vindusramme med tverrstenger',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['window', 'frame', 'architectural', 'classic'],
    moodTags: ['dramatic', 'cinematic'],
  },
  {
    id: 'blinds',
    name: 'Venetian Blinds',
    nameNo: 'Persienner',
    pattern: 'blinds',
    category: 'architectural',
    description: 'Horizontal venetian blind slats',
    descriptionNo: 'Horisontale persienner',
    defaultSize: 1.2,
    defaultRotation: 0,
    tags: ['blinds', 'slats', 'architectural', 'film noir'],
    moodTags: ['dramatic', 'noir', 'mysterious'],
  },
  {
    id: 'leaves',
    name: 'Leaves',
    nameNo: 'Løv',
    pattern: 'leaves',
    category: 'nature',
    description: 'Natural leaf pattern',
    descriptionNo: 'Naturlig løvmønster',
    defaultSize: 1.5,
    defaultRotation: 0,
    tags: ['nature', 'leaves', 'organic', 'natural'],
    moodTags: ['natural', 'organic', 'calm'],
  },
  {
    id: 'breakup',
    name: 'Breakup Pattern',
    nameNo: 'Bruddmønster',
    pattern: 'breakup',
    category: 'abstract',
    description: 'Abstract breakup pattern for texture',
    descriptionNo: 'Abstrakt bruddmønster for tekstur',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['abstract', 'texture', 'breakup', 'pattern'],
    moodTags: ['dramatic', 'textured'],
  },
  {
    id: 'dots',
    name: 'Dots',
    nameNo: 'Prikker',
    pattern: 'dots',
    category: 'abstract',
    description: 'Regular dot pattern',
    descriptionNo: 'Regelmessig prikkmønster',
    defaultSize: 0.8,
    defaultRotation: 0,
    tags: ['dots', 'pattern', 'regular', 'abstract'],
    moodTags: ['playful', 'modern'],
  },
  {
    id: 'lines',
    name: 'Lines',
    nameNo: 'Linjer',
    pattern: 'lines',
    category: 'abstract',
    description: 'Parallel line pattern',
    descriptionNo: 'Parallelt linjemønster',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['lines', 'pattern', 'geometric', 'abstract'],
    moodTags: ['modern', 'geometric'],
  },
  {
    id: 'arched_window',
    name: 'Arched Window',
    nameNo: 'Buevindus',
    pattern: 'window',
    category: 'architectural',
    description: 'Classic arched church/mansion window pattern',
    descriptionNo: 'Klassisk buevindus fra kirke eller herregård',
    defaultSize: 1.1,
    defaultRotation: 0,
    tags: ['window', 'arch', 'church', 'historic', 'architectural'],
    moodTags: ['dramatic', 'elegant', 'cinematic'],
  },
  {
    id: 'prison_bars',
    name: 'Prison Bars',
    nameNo: 'Fengselsgitter',
    pattern: 'lines',
    category: 'architectural',
    description: 'Vertical bars pattern — film noir, tension',
    descriptionNo: 'Vertikale stenger – film noir og spenning',
    defaultSize: 1.2,
    defaultRotation: 90,
    tags: ['bars', 'prison', 'film noir', 'tension', 'vertical'],
    moodTags: ['noir', 'tense', 'dramatic'],
  },
  {
    id: 'diamond_lattice',
    name: 'Diamond Lattice',
    nameNo: 'Rutenett / Diamantmønster',
    pattern: 'lines',
    category: 'architectural',
    description: 'Diamond lattice window pattern',
    descriptionNo: 'Diamantformet rutenettmønster',
    defaultSize: 0.9,
    defaultRotation: 45,
    tags: ['lattice', 'diamond', 'geometric', 'architectural'],
    moodTags: ['elegant', 'detailed'],
  },
  {
    id: 'forest_canopy',
    name: 'Forest Canopy',
    nameNo: 'Skogtaket',
    pattern: 'leaves',
    category: 'nature',
    description: 'Dappled light through a forest canopy',
    descriptionNo: 'Flekkete lys gjennom skogtaket',
    defaultSize: 2.0,
    defaultRotation: 0,
    tags: ['forest', 'nature', 'canopy', 'dappled', 'organic'],
    moodTags: ['natural', 'organic', 'serene', 'calm'],
  },
  {
    id: 'palm_fronds',
    name: 'Palm Fronds',
    nameNo: 'Palmekvist',
    pattern: 'leaves',
    category: 'nature',
    description: 'Tropical palm leaf silhouettes',
    descriptionNo: 'Tropiske palmeblader som silhuett',
    defaultSize: 1.8,
    defaultRotation: 15,
    tags: ['palm', 'tropical', 'nature', 'leaves', 'exotic'],
    moodTags: ['tropical', 'exotic', 'warm'],
  },
  {
    id: 'starburst',
    name: 'Starburst',
    nameNo: 'Stjernesmell',
    pattern: 'dots',
    category: 'abstract',
    description: 'Radial starburst pattern with light rays',
    descriptionNo: 'Radielt stjernemønster med lysstråler',
    defaultSize: 1.4,
    defaultRotation: 0,
    tags: ['star', 'burst', 'radial', 'rays', 'abstract'],
    moodTags: ['energetic', 'dramatic', 'fashion'],
  },
  {
    id: 'honeycomb',
    name: 'Honeycomb',
    nameNo: 'Bikakemønster',
    pattern: 'dots',
    category: 'abstract',
    description: 'Hexagonal honeycomb pattern',
    descriptionNo: 'Heksagonalt bikakemønster',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['honeycomb', 'hexagon', 'geometric', 'abstract'],
    moodTags: ['modern', 'structured', 'editorial'],
  },
  {
    id: 'industrial_grate',
    name: 'Industrial Grate',
    nameNo: 'Industrielt rist',
    pattern: 'dots',
    category: 'architectural',
    description: 'Industrial grid/grate pattern',
    descriptionNo: 'Industrielt rist og nettmønster',
    defaultSize: 1.1,
    defaultRotation: 0,
    tags: ['industrial', 'grate', 'grid', 'architectural', 'urban'],
    moodTags: ['industrial', 'urban', 'gritty'],
  },
  {
    id: 'random_breakup_heavy',
    name: 'Heavy Breakup',
    nameNo: 'Tungt bruddmønster',
    pattern: 'breakup',
    category: 'abstract',
    description: 'Dense breakup pattern for maximum texture on subject',
    descriptionNo: 'Tett bruddmønster for maksimal tekstur på motivet',
    defaultSize: 1.5,
    defaultRotation: 0,
    tags: ['breakup', 'texture', 'dense', 'abstract', 'sculpting'],
    moodTags: ['textured', 'moody', 'dramatic'],
  },
  {
    id: 'cloud_soft',
    name: 'Soft Clouds',
    nameNo: 'Myke skyer',
    pattern: 'breakup',
    category: 'nature',
    description: 'Soft cloud/shadow pattern like overcast sky',
    descriptionNo: 'Mykt skye-mønster som overskyet himmel',
    defaultSize: 2.5,
    defaultRotation: 0,
    tags: ['clouds', 'sky', 'soft', 'natural', 'outdoor'],
    moodTags: ['soft', 'natural', 'calm'],
  },
  {
    id: 'circular_vignette',
    name: 'Circular Vignette',
    nameNo: 'Sirkulær vignet',
    pattern: 'dots',
    category: 'abstract',
    description: 'Circular center spotlight with soft edges — iris look',
    descriptionNo: 'Sirkkulær spotlight i midten med myke kanter',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['vignette', 'circular', 'iris', 'spotlight', 'abstract'],
    moodTags: ['theatrical', 'dramatic', 'focus'],
  },
  {
    id: 'venetian_diagonal',
    name: 'Diagonal Blinds',
    nameNo: 'Diagonale persienner',
    pattern: 'blinds',
    category: 'architectural',
    description: 'Venetian blinds rotated 45° — creates diagonal light stripes',
    descriptionNo: 'Persienner rotert 45° – skaper diagonale lysstriper',
    defaultSize: 1.3,
    defaultRotation: 45,
    tags: ['blinds', 'diagonal', 'slats', 'architectural', 'noir'],
    moodTags: ['dramatic', 'noir', 'mysterious'],
  },
  {
    id: 'cobweb',
    name: 'Cobweb / Spiderweb',
    nameNo: 'Spindelvev',
    pattern: 'lines',
    category: 'nature',
    description: 'Radial spiderweb pattern for Halloween and horror',
    descriptionNo: 'Radielt spindelvevsmønster for Halloween og horror',
    defaultSize: 1.5,
    defaultRotation: 0,
    tags: ['spiderweb', 'cobweb', 'halloween', 'horror', 'radial'],
    moodTags: ['eerie', 'horror', 'spooky'],
  },
  {
    id: 'brick_wall',
    name: 'Brick Wall',
    nameNo: 'Teglsteinmur',
    pattern: 'lines',
    category: 'architectural',
    description: 'Horizontal brick/mortar wall projection',
    descriptionNo: 'Horisontal teglsteinmur projeksjon',
    defaultSize: 1.2,
    defaultRotation: 0,
    tags: ['brick', 'wall', 'architectural', 'urban', 'texture'],
    moodTags: ['urban', 'gritty', 'textured'],
  },
  {
    id: 'curtain_sheers',
    name: 'Curtain Sheers',
    nameNo: 'Gardinslør',
    pattern: 'lines',
    category: 'architectural',
    description: 'Soft flowing curtain/sheer pattern — romantic, breezy light diffusion',
    descriptionNo: 'Myke gardiner/sløreffekt — romantisk, lett diffust lys',
    defaultSize: 1.4,
    defaultRotation: 0,
    tags: ['curtain', 'sheer', 'flowing', 'romantic', 'soft'],
    moodTags: ['romantic', 'soft', 'elegant'],
  },
  {
    id: 'tree_branches',
    name: 'Tree Branches',
    nameNo: 'Tregreiner',
    pattern: 'leaves',
    category: 'nature',
    description: 'Bare tree branch silhouettes — dramatic winter or night scenes',
    descriptionNo: 'Bare tregreiner i silhuett — dramatisk vinter- eller nattscene',
    defaultSize: 2.0,
    defaultRotation: 0,
    tags: ['tree', 'branches', 'silhouette', 'nature', 'dramatic', 'bare'],
    moodTags: ['dramatic', 'mysterious', 'atmospheric'],
  },
  {
    id: 'gothic_arch_window',
    name: 'Gothic Arch Window',
    nameNo: 'Gotisk Buevindus',
    pattern: 'window',
    category: 'architectural',
    description: 'Tall gothic cathedral arch window — church, manor, or dramatic interior',
    descriptionNo: 'Høyt gotisk katetralbuevindus — kirke, herregård eller dramatisk interiør',
    defaultSize: 1.3,
    defaultRotation: 0,
    tags: ['gothic', 'arch', 'cathedral', 'church', 'window', 'dramatic'],
    moodTags: ['dramatic', 'mysterious', 'elegant', 'horror'],
  },
  {
    id: 'bamboo_stalks',
    name: 'Bamboo Stalks',
    nameNo: 'Bambusstilker',
    pattern: 'lines',
    category: 'nature',
    description: 'Vertical bamboo stalk pattern — zen, Asian-inspired, minimalist',
    descriptionNo: 'Vertikale bambusstilker — zen, asiatisk-inspirert, minimalistisk',
    defaultSize: 1.6,
    defaultRotation: 90,
    tags: ['bamboo', 'vertical', 'asian', 'zen', 'nature', 'minimalist'],
    moodTags: ['zen', 'calm', 'natural', 'minimalist'],
  },
  {
    id: 'chain_fence',
    name: 'Chain Link Fence',
    nameNo: 'Kjettinggjerde',
    pattern: 'lines',
    category: 'architectural',
    description: 'Industrial chain-link fence diamond pattern — gritty urban scenes',
    descriptionNo: 'Industrielt kjettinggjerde diamantmønster — rå urbane scener',
    defaultSize: 1.2,
    defaultRotation: 45,
    tags: ['chainlink', 'fence', 'industrial', 'urban', 'diamond', 'gritty'],
    moodTags: ['urban', 'gritty', 'industrial', 'noir'],
  },
  {
    id: 'venetian_wide',
    name: 'Wide Venetian Blinds',
    nameNo: 'Brede Persienner',
    pattern: 'blinds',
    category: 'architectural',
    description: 'Wide-slat venetian blinds — fewer, bolder stripes for strong graphic effect',
    descriptionNo: 'Bred persienne med færre, tydeligere striper for sterk grafisk effekt',
    defaultSize: 1.5,
    defaultRotation: 0,
    tags: ['blinds', 'wide', 'graphic', 'bold', 'architectural'],
    moodTags: ['graphic', 'bold', 'dramatic', 'noir'],
  },
  {
    id: 'concentric_rings',
    name: 'Concentric Rings',
    nameNo: 'Konsentriske Ringer',
    pattern: 'dots',
    category: 'abstract',
    description: 'Concentric circle ring pattern — zen target / ripple effect',
    descriptionNo: 'Konsentriske ringmønster — zen-sirkel eller rippleeffekt',
    defaultSize: 1.2,
    defaultRotation: 0,
    tags: ['concentric', 'rings', 'circles', 'zen', 'abstract'],
    moodTags: ['zen', 'abstract', 'modern', 'artistic'],
  },
  {
    id: 'crosshatch_grid',
    name: 'Crosshatch Grid',
    nameNo: 'Skravert Rutenett',
    pattern: 'lines',
    category: 'abstract',
    description: 'Fine crosshatch grid pattern — blueprint or technical aesthetic',
    descriptionNo: 'Fint skravert rutenettmønster — teknisk eller blueprint-estetikk',
    defaultSize: 0.8,
    defaultRotation: 0,
    tags: ['crosshatch', 'grid', 'technical', 'blueprint', 'abstract'],
    moodTags: ['technical', 'modern', 'editorial'],
  },

  // ── New Patterns ──────────────────────────────────────────────────────────
  {
    id: 'hexagonal_mesh',
    name: 'Hexagonal Mesh',
    nameNo: 'Sekskantet Nett',
    pattern: 'dots',
    category: 'abstract',
    description: 'Honeycomb hexagonal pattern — industrial, sci-fi and structural',
    descriptionNo: 'Bikube sekskantet mønster — industrielt, sci-fi og strukturelt',
    defaultSize: 0.9,
    defaultRotation: 0,
    tags: ['hexagon', 'honeycomb', 'industrial', 'sci-fi', 'abstract'],
    moodTags: ['industrial', 'futuristic', 'technical'],
  },
  {
    id: 'starburst',
    name: 'Starburst / Sun Rays',
    nameNo: 'Strålemønster',
    pattern: 'custom',
    category: 'abstract',
    description: 'Radiating sun ray lines — sunrise, glory, explosive energy',
    descriptionNo: 'Radielle solstråler — soloppgang, herlighet, eksplosiv energi',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['star', 'sun', 'rays', 'dramatic', 'burst', 'energy'],
    moodTags: ['dramatic', 'energetic', 'warm', 'spiritual'],
  },
  {
    id: 'prison_bars',
    name: 'Prison Bars',
    nameNo: 'Fengselsgitter',
    pattern: 'lines',
    category: 'cinematic',
    description: 'Heavy vertical bars — captive, noir, drama, thriller',
    descriptionNo: 'Tunge vertikale stenger — fangenskap, noir, drama, thriller',
    defaultSize: 0.8,
    defaultRotation: 0,
    tags: ['bars', 'prison', 'noir', 'drama', 'thriller', 'cinematic'],
    moodTags: ['dark', 'dramatic', 'noir', 'cinematic'],
  },
  {
    id: 'polka_dots',
    name: 'Polka Dots',
    nameNo: 'Prikker (Polka)',
    pattern: 'dots',
    category: 'abstract',
    description: 'Uniform circular dots — playful, pop-art, retro fashion',
    descriptionNo: 'Jevne sirkelprikker — lekent, pop-art, retro mote',
    defaultSize: 0.6,
    defaultRotation: 0,
    tags: ['dots', 'circles', 'polka', 'pop-art', 'retro', 'fashion'],
    moodTags: ['playful', 'retro', 'pop', 'cheerful'],
  },
  {
    id: 'diamond_grid',
    name: 'Diamond Grid',
    nameNo: 'Diamantrutenett',
    pattern: 'lines',
    category: 'abstract',
    description: '45° rotated square grid — dynamic diamond pattern for editorial',
    descriptionNo: '45° rotert firkantrutenett — dynamisk diamantmønster for editorial',
    defaultSize: 0.7,
    defaultRotation: 45,
    tags: ['diamond', 'grid', 'pattern', 'editorial', 'dynamic'],
    moodTags: ['modern', 'dynamic', 'editorial'],
  },
  {
    id: 'leaf_scatter',
    name: 'Scattered Leaves',
    nameNo: 'Løvspredning',
    pattern: 'leaves',
    category: 'nature',
    description: 'Organic scattered leaf shapes — autumnal, nature, ethereal',
    descriptionNo: 'Organisk løvspredning — høst, natur, eterisk',
    defaultSize: 0.9,
    defaultRotation: 0,
    tags: ['leaves', 'nature', 'organic', 'autumnal', 'scatter'],
    moodTags: ['natural', 'peaceful', 'organic', 'dreamy'],
  },
  {
    id: 'cathedral_window',
    name: 'Cathedral Window Frame',
    nameNo: 'Katedral Vindusramme',
    pattern: 'window',
    category: 'architectural',
    description: 'Full cathedral window frame with tracery — sacred, atmospheric, mystical',
    descriptionNo: 'Full katedralvindusramme med motiver — hellig, atmosfærisk, mystisk',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['cathedral', 'window', 'arch', 'sacred', 'mystical', 'church'],
    moodTags: ['sacred', 'mystical', 'dramatic', 'atmospheric'],
  },
  {
    id: 'film_strip',
    name: 'Film Strip',
    nameNo: 'Filmremse',
    pattern: 'lines',
    category: 'cinematic',
    description: 'Horizontal bands mimicking film strip perforations — cinematic meta',
    descriptionNo: 'Horisontale striper som filmperforer — kinematisk meta-estetikk',
    defaultSize: 0.8,
    defaultRotation: 0,
    tags: ['film', 'cinema', 'retro', 'meta', 'horizontal', 'bands'],
    moodTags: ['cinematic', 'retro', 'creative', 'meta'],
  },
  {
    id: 'arabic_arch',
    name: 'Arabic Arch / Moorish',
    nameNo: 'Arabisk Bue / Maurisk',
    pattern: 'window',
    category: 'architectural',
    description: 'Ornate Moorish pointed arch — Middle-Eastern, Mediterranean, exotic',
    descriptionNo: 'Ornamentert maurisk spissbuemønster — Midtøsten, middelhavsbasert, eksotisk',
    defaultSize: 1.0,
    defaultRotation: 0,
    tags: ['arabic', 'arch', 'moorish', 'mediterranean', 'exotic', 'ornate'],
    moodTags: ['exotic', 'warm', 'mysterious', 'cultural'],
  },
  {
    id: 'wave_ripple',
    name: 'Wave Ripple',
    nameNo: 'Bølge Ripple',
    pattern: 'custom',
    category: 'abstract',
    description: 'Horizontal flowing wave ripples — water, calm, movement',
    descriptionNo: 'Horisontale bølger — vann, ro, bevegelse',
    defaultSize: 0.9,
    defaultRotation: 0,
    tags: ['waves', 'water', 'ripple', 'flowing', 'abstract', 'calm'],
    moodTags: ['calm', 'flowing', 'natural', 'peaceful'],
  },
  {
    id: 'industrial_grate',
    name: 'Industrial Grate',
    nameNo: 'Industriell Rist',
    pattern: 'lines',
    category: 'industrial',
    description: 'Metal floor grate — industrial, noir, urban, gritty aesthetic',
    descriptionNo: 'Metallrister — industriell, noir, urban, råe estetikk',
    defaultSize: 0.7,
    defaultRotation: 0,
    tags: ['grate', 'industrial', 'metal', 'urban', 'noir', 'gritty'],
    moodTags: ['dark', 'industrial', 'urban', 'gritty', 'cinematic'],
  },
];

/**
 * Generate gobo pattern texture from canvas
 */
export function generateGoboTexture(
  pattern: GoboPattern,
  size: number = 512,
  scene?: BABYLON.Scene
): BABYLON.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear with black (transparent areas)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Draw pattern in white (light areas)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size / 256);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  switch (pattern) {
    case 'window':
      // Window frame with cross bars
      const frameWidth = size * 0.15;
      const barWidth = size * 0.02;
      
      // Outer frame
      ctx.fillRect(centerX - radius, centerY - radius, frameWidth, radius * 2);
      ctx.fillRect(centerX + radius - frameWidth, centerY - radius, frameWidth, radius * 2);
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, frameWidth);
      ctx.fillRect(centerX - radius, centerY + radius - frameWidth, radius * 2, frameWidth);
      
      // Cross bars
      ctx.fillRect(centerX - radius, centerY - barWidth / 2, radius * 2, barWidth);
      ctx.fillRect(centerX - barWidth / 2, centerY - radius, barWidth, radius * 2);
      break;

    case 'blinds':
      // Horizontal venetian blind slats
      const slatCount = 8;
      const slatHeight = (radius * 2) / slatCount;
      const slatGap = slatHeight * 0.3;
      
      for (let i = 0; i < slatCount; i++) {
        const y = centerY - radius + i * slatHeight;
        ctx.fillRect(centerX - radius, y, radius * 2, slatHeight - slatGap);
      }
      break;

    case 'leaves':
      // Organic leaf pattern
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius * 0.6;
        const y = centerY + Math.sin(angle) * radius * 0.6;
        const leafSize = radius * 0.3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, leafSize, leafSize * 1.5, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'breakup':
      // Abstract breakup pattern
      for (let i = 0; i < 20; i++) {
        const x = centerX + (Math.random() - 0.5) * radius * 1.5;
        const y = centerY + (Math.random() - 0.5) * radius * 1.5;
        const w = radius * (0.1 + Math.random() * 0.3);
        const h = radius * (0.1 + Math.random() * 0.3);
        
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, Math.random() * Math.PI * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'dots':
      // Regular dot pattern
      const dotSpacing = size / 8;
      const dotSize = dotSpacing * 0.3;
      
      for (let x = dotSpacing; x < size; x += dotSpacing) {
        for (let y = dotSpacing; y < size; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'lines':
      // Parallel lines
      const lineSpacing = size / 12;
      const lineWidth = lineSpacing * 0.2;
      
      for (let y = lineSpacing; y < size; y += lineSpacing) {
        ctx.fillRect(0, y - lineWidth / 2, size, lineWidth);
      }
      break;

    case 'custom':
      // Custom pattern - will be loaded from URL
      break;
  }

  // Create texture from canvas
  if (scene) {
    return new BABYLON.Texture('', scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE, () => {
      return canvas;
    });
  } else {
    // Return a placeholder texture
    const texture = new BABYLON.Texture('', null as any);
    (texture as any)._canvas = canvas;
    return texture;
  }
}

/**
 * Get gobo definition by ID
 */
export function getGoboById(id: string): GoboDefinition | undefined {
  return GOBO_PATTERNS.find(g => g.id === id);
}

/**
 * Get gobos by pattern type
 */
export function getGobosByPattern(pattern: GoboPattern): GoboDefinition[] {
  return GOBO_PATTERNS.filter(g => g.pattern === pattern);
}

/**
 * Get gobos by category
 */
export function getGobosByCategory(category: GoboDefinition['category']): GoboDefinition[] {
  return GOBO_PATTERNS.filter(g => g.category === category);
}






















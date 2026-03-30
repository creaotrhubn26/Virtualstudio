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






















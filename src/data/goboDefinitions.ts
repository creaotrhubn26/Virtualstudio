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






















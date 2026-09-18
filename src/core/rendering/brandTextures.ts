/**
 * Drawing a brand onto the surfaces of a place.
 *
 * Every sign, board and poster in a location is a texture written at runtime
 * from the brand, so putting a name over the door costs no asset pipeline, no
 * font file and no licence: the text is drawn into a canvas with the system
 * face. A logo image is optional and replaces the initials on the disc when
 * one is supplied.
 *
 * The signs are emissive where a real one would be lit, so the brand colour
 * reaches the rest of the scene as light rather than only as paint.
 */

import { Color3, DynamicTexture, PBRMaterial, Scene, Texture } from '@babylonjs/core';
import { brandInitials, readableOn, type StudioBrand } from '../../services/studioBranding';

/** A canvas face that exists everywhere, so nothing has to be downloaded. */
const FACE = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** The largest size at or below `start` at which the text fits `maxWidth`. */
function fittedFont(
  context: { font: string; measureText: (text: string) => { width: number } },
  text: string,
  maxWidth: number,
  start: number,
  weight = '700',
): number {
  let size = start;
  do {
    context.font = `${weight} ${size}px ${FACE}`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > 8);
  return size;
}

function surface(scene: Scene, name: string, width: number, height: number): DynamicTexture {
  const texture = new DynamicTexture(`brand_${name}`, { width, height }, scene, true);
  texture.hasAlpha = false;
  return texture;
}

/** Paint a logo file over the mark once it has loaded, leaving the initials until then. */
function overlayLogo(texture: DynamicTexture, url: string, x: number, y: number, size: number): void {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    // Cover the initials completely: a logo half on top of letters is worse
    // than either on its own.
    context.drawImage(image, x, y, size, size);
    texture.update();
  };
  // A logo that cannot be fetched simply never arrives; the initials stand.
  image.onerror = () => undefined;
  image.src = url;
}

/**
 * The band over the door: the name, with what the place sells under it.
 *
 * This is the one everybody reads from across the street, so the name takes
 * whatever size fits and the tagline sits under it in the brand colour.
 */
export function signTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'sign', 1024, 256);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.surface;
  context.fillRect(0, 0, 1024, 256);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const name = brand.name.toUpperCase();
  const size = fittedFont(context, name, 940, 118);
  context.font = `700 ${size}px ${FACE}`;
  context.fillStyle = readableOn(brand.surface);
  // Wide letter spacing is what makes a shop sign read as a shop sign.
  context.letterSpacing = `${Math.round(size * 0.08)}px`;
  context.fillText(name, 512, 104);

  const tagline = brand.tagline.toUpperCase();
  const small = fittedFont(context, tagline, 900, 40, '600');
  context.font = `600 ${small}px ${FACE}`;
  context.letterSpacing = `${Math.round(small * 0.14)}px`;
  context.fillStyle = brand.accent;
  context.fillText(tagline, 512, 190);

  texture.update();
  return texture;
}

/**
 * The round mark: a ring with the name inside, or an uploaded logo.
 *
 * Two lines of the name fit inside the ring; a longer one falls back to the
 * initials, because a mark nobody can read is not a mark.
 */
export function logoTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'logo', 512, 512);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.surface;
  context.fillRect(0, 0, 512, 512);

  const ink = readableOn(brand.surface);
  context.strokeStyle = ink;
  context.lineWidth = 12;
  context.beginPath();
  context.arc(256, 256, 226, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 4;
  context.beginPath();
  context.arc(256, 256, 204, 0, Math.PI * 2);
  context.stroke();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = ink;

  const words = brand.name.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = words.length >= 2 ? [words[0], words.slice(1).join(' ')] : words;
  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b), '');
  const size = fittedFont(context, longest, 330, 96);

  if (size < 34) {
    // Too long to read at this size: the initials say it better.
    context.font = `700 150px ${FACE}`;
    context.fillText(brandInitials(brand.name), 256, 256);
  } else {
    context.font = `700 ${size}px ${FACE}`;
    context.letterSpacing = '2px';
    lines.forEach((line, index) => {
      const offset = (index - (lines.length - 1) / 2) * (size * 1.12);
      context.fillText(line, 256, 256 + offset);
    });
  }

  // A rule in the brand colour, the way a real mark dates itself.
  context.fillStyle = brand.accent;
  context.fillRect(196, 400, 120, 8);

  texture.update();
  if (brand.logoUrl) overlayLogo(texture, brand.logoUrl, 76, 76, 360);
  return texture;
}

/**
 * The board on the pavement: the mark, then the slogan, last line in colour.
 *
 * The slogan is written a line at a time, exactly as typed, so a photographer
 * decides where it breaks rather than a wrapping algorithm.
 */
export function boardTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'board', 512, 1024);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.surface;
  context.fillRect(0, 0, 512, 1024);

  const ink = readableOn(brand.surface);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.strokeStyle = ink;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(256, 210, 140, 0, Math.PI * 2);
  context.stroke();
  const mark = brand.name.toUpperCase();
  const markSize = fittedFont(context, mark, 220, 52);
  context.font = `700 ${markSize}px ${FACE}`;
  context.fillStyle = ink;
  context.fillText(mark, 256, 210);

  const lines = brand.slogan.toUpperCase().split('\n').map(line => line.trim()).filter(Boolean);
  const widest = lines.reduce((a, b) => (a.length >= b.length ? a : b), '');
  const size = fittedFont(context, widest, 400, 96);
  context.font = `700 ${size}px ${FACE}`;
  lines.forEach((line, index) => {
    // The last line carries the brand colour: it is the line people repeat.
    context.fillStyle = index === lines.length - 1 ? brand.accent : ink;
    context.fillText(line, 256, 470 + index * size * 1.25);
  });

  context.fillStyle = brand.accent;
  context.fillRect(196, 940, 120, 10);

  texture.update();
  if (brand.logoUrl) overlayLogo(texture, brand.logoUrl, 116, 70, 280);
  return texture;
}

/** The poster in the window: the brand colour, loudly, with the name on it. */
export function posterTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'poster', 512, 768);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.accent;
  context.fillRect(0, 0, 512, 768);
  const ink = readableOn(brand.accent);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = ink;
  const name = brand.name.toUpperCase();
  const size = fittedFont(context, name, 440, 84);
  context.font = `700 ${size}px ${FACE}`;
  context.letterSpacing = '3px';
  context.fillText(name, 256, 150);

  const tagline = brand.tagline.toUpperCase();
  const small = fittedFont(context, tagline, 430, 36, '600');
  context.font = `600 ${small}px ${FACE}`;
  context.fillText(tagline, 256, 640);

  context.strokeStyle = ink;
  context.lineWidth = 6;
  context.strokeRect(34, 34, 444, 700);

  texture.update();
  if (brand.logoUrl) overlayLogo(texture, brand.logoUrl, 116, 260, 280);
  return texture;
}

/**
 * The front of an apron: the mark, big, on the brand's own dark ground.
 *
 * Workwear is where a brand is worn rather than displayed, so this is the
 * plainest of the four — the mark, a rule, and nothing else competing with it.
 */
export function apronTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'apron', 512, 768);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.surface;
  context.fillRect(0, 0, 512, 768);
  const ink = readableOn(brand.surface);

  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // A ring and the name, sized to sit on a chest rather than fill a wall.
  context.strokeStyle = ink;
  context.lineWidth = 7;
  context.beginPath();
  context.arc(256, 300, 122, 0, Math.PI * 2);
  context.stroke();

  const words = brand.name.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = words.length >= 2 ? [words[0], words.slice(1).join(' ')] : words;
  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b), '');
  const size = fittedFont(context, longest, 180, 52);
  context.fillStyle = ink;
  if (size < 22) {
    context.font = `700 76px ${FACE}`;
    context.fillText(brandInitials(brand.name), 256, 300);
  } else {
    context.font = `700 ${size}px ${FACE}`;
    lines.forEach((line, index) => {
      context.fillText(line, 256, 300 + (index - (lines.length - 1) / 2) * size * 1.15);
    });
  }

  context.fillStyle = brand.accent;
  context.fillRect(206, 452, 100, 7);

  // A waist tie, drawn rather than modelled: at this size nobody can tell.
  context.fillStyle = ink;
  context.globalAlpha = 0.18;
  context.fillRect(0, 520, 512, 26);
  context.globalAlpha = 1;

  texture.update();
  if (brand.logoUrl) overlayLogo(texture, brand.logoUrl, 136, 180, 240);
  return texture;
}

/** A cap front: the mark, small, the way a cap carries one. */
export function capTexture(scene: Scene, brand: StudioBrand): DynamicTexture {
  const texture = surface(scene, 'cap', 512, 256);
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = brand.surface;
  context.fillRect(0, 0, 512, 256);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = readableOn(brand.surface);
  const name = brand.name.toUpperCase();
  const size = fittedFont(context, name, 380, 64);
  context.font = `700 ${size}px ${FACE}`;
  context.letterSpacing = '2px';
  context.fillText(name, 256, 112);

  context.fillStyle = brand.accent;
  context.fillRect(206, 168, 100, 6);

  texture.update();
  if (brand.logoUrl) overlayLogo(texture, brand.logoUrl, 196, 20, 120);
  return texture;
}

/**
 * A material for a surface that is lit from within, like every shop sign.
 *
 * `glow` decides how much of it reaches the scene: the band over the door is
 * a real source in a night street, the poster behind glass is not.
 */
export function brandMaterial(
  scene: Scene, name: string, texture: Texture, brand: StudioBrand, glow: number,
): PBRMaterial {
  const material = new PBRMaterial(`studioRoom_brand_${name}`, scene);
  material.albedoTexture = texture;
  material.roughness = 0.44;
  material.metallic = 0;
  material.maxSimultaneousLights = 8;
  if (glow > 0) {
    material.emissiveTexture = texture;
    // The brand colour tints what the sign throws, so a red mark lights the
    // pavement red.
    material.emissiveColor = Color3.FromHexString(brand.accent).scale(0.35).add(new Color3(glow, glow, glow));
  }
  return material;
}

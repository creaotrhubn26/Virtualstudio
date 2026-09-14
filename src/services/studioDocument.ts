import { z } from 'zod';
import type { SceneComposition } from '../core/models/sceneComposer';

const finite = z.number().finite();
const vector = z.tuple([finite, finite, finite]);
const transform = z.object({ position: vector, rotation: vector, scale: vector });
const node = z.object({ id: z.string(), name: z.string(), type: z.string(), transform,
  visible: z.boolean(), locked: z.boolean(), userData: z.record(z.string(), z.unknown()).optional() }).passthrough();
const schema = z.object({
  id: z.string(), name: z.string(), createdAt: z.string(), updatedAt: z.string(),
  cameras: z.array(z.object({ id: z.string(), alpha: finite, beta: finite, radius: finite.positive(),
    target: z.object({ x: finite, y: finite, z: finite }), fov: finite.positive().lt(Math.PI) }).passthrough()).min(1),
  lights: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), position: vector, rotation: vector,
    scale: vector, intensity: finite.nonnegative(), cct: finite.positive(), visible: z.boolean(), modifier: z.string() }).passthrough()),
  actors: z.array(node), props: z.array(node), layers: z.array(z.unknown()),
  cameraSettings: z.object({ aperture: finite.positive(), iso: finite.positive(), focalLength: finite.positive(),
    shutter: z.string().regex(/^(?:\d+(?:\.\d+)?|\d+\/\d+)$/), nd: finite }).passthrough(),
  environment: z.object({
    walls: z.array(z.unknown()), floors: z.array(z.unknown()),
    room: z.object({ type: z.enum(['none', 'industrial']), furnishings: z.boolean(), practicals: z.boolean() }).optional(),
  }).passthrough().optional(),
}).passthrough();

/** Validate a local document before the current scene is cleared. */
export function parseStudioDocument(value: unknown): SceneComposition {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error('Filen er ikke et gyldig studiooppsett');
  const scene = parsed.data as unknown as SceneComposition;
  // Reject zero-denominator shutter values before touching the current scene.
  const shutter = scene.cameraSettings.shutter.split('/').map(Number);
  if (!(shutter[0] > 0) || (shutter.length > 1 && !(shutter[1] > 0))) throw new Error('Ugyldig lukkertid i oppsettet');
  return scene;
}

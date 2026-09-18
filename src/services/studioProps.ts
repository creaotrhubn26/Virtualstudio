/**
 * Anything in the scene the photographer can take hold of.
 *
 * The studio builds a great deal of geometry the user cannot touch: room
 * furniture, the pose-derived portrait chair, stands. Each of those was a
 * special case, and a scenario that needs a hospital bed or an air ambulance
 * would have been one more. A prop is the one general answer: a named thing
 * with a transform that can be selected, moved and saved, whatever its
 * geometry came from.
 *
 * Two things can become a prop:
 *
 * - **An imported model.** A GLB the studio loads on demand. The document
 *   stores where it came from, so opening it anywhere reproduces it.
 * - **Geometry the studio built.** A chair, a sofa, a stand. The document
 *   stores which mesh was claimed, not its geometry; the studio rebuilds the
 *   scene and the prop reclaims it by name. This is the ownership boundary
 *   that lets a derived object become editable without being duplicated on
 *   load: until it is claimed the studio owns it, and after it is claimed the
 *   document owns its transform.
 */

export interface PropTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export type PropSource =
  /** A model file, loaded on demand. */
  | { kind: 'model'; url: string }
  /**
   * Geometry the studio built, claimed by its stable key.
   *
   * The key is `metadata.studioObjectKey`, not the Babylon name: the portrait
   * chair is named after the character's unique id, which differs every
   * session, so a claim on the name would never find it again.
   */
  | { kind: 'scene'; mesh: string };

export interface StudioProp {
  id: string;
  name: string;
  source: PropSource;
  transform: PropTransform;
  visible: boolean;
  locked: boolean;
}

export const IDENTITY_TRANSFORM: PropTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

function isTriple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n));
}

function triple(value: unknown, fallback: [number, number, number]): [number, number, number] {
  return isTriple(value) ? [value[0], value[1], value[2]] : [...fallback];
}

/**
 * Read one prop out of a document.
 *
 * A document can be hand-edited or come from an older build, so anything that
 * does not describe a placeable thing is rejected rather than half-applied:
 * a prop with no source has no geometry to show, and a prop with a broken
 * transform would put it somewhere the photographer cannot find it.
 */
export function parseProp(raw: unknown): StudioProp | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || !value.id) return null;

  const source = value.source as Record<string, unknown> | undefined;
  let parsedSource: PropSource;
  if (source?.kind === 'model' && typeof source.url === 'string' && source.url) {
    parsedSource = { kind: 'model', url: source.url };
  } else if (source?.kind === 'scene' && typeof source.mesh === 'string' && source.mesh) {
    parsedSource = { kind: 'scene', mesh: source.mesh };
  } else {
    return null;
  }

  const transform = (value.transform ?? {}) as Record<string, unknown>;
  const scale = triple(transform.scale, IDENTITY_TRANSFORM.scale);
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name ? value.name : value.id,
    source: parsedSource,
    transform: {
      position: triple(transform.position, IDENTITY_TRANSFORM.position),
      rotation: triple(transform.rotation, IDENTITY_TRANSFORM.rotation),
      // A zero scale would make the prop invisible and impossible to grab back.
      scale: scale.every(n => n !== 0) ? scale : [...IDENTITY_TRANSFORM.scale],
    },
    visible: value.visible !== false,
    locked: value.locked === true,
  };
}

/** Read a document's prop list, dropping entries that describe nothing. */
export function parseProps(raw: unknown): StudioProp[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const props: StudioProp[] = [];
  for (const entry of raw) {
    const prop = parseProp(entry);
    // Two props claiming one id would fight over the same object on every
    // later edit, so the first one named wins.
    if (!prop || seen.has(prop.id)) continue;
    seen.add(prop.id);
    props.push(prop);
  }
  return props;
}

/** A stable id for a newly created prop. */
export function propId(source: PropSource, existing: Iterable<string>): string {
  const base = source.kind === 'scene'
    ? source.mesh
    : (source.url.split('/').pop() ?? 'prop').replace(/\.[a-z0-9]+$/i, '');
  const cleaned = base.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').toLowerCase();
  // A name made only of separators is no name at all.
  const slug = /[a-z0-9]/.test(cleaned) ? cleaned : 'prop';
  const taken = new Set(existing);
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n++) {
    const candidate = `${slug}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Whether a prop still describes something this scene can show.
 *
 * A scene-built prop is only meaningful while the studio still builds the mesh
 * it claimed: swapping the industrial room for an empty one takes its furniture
 * with it, and a claim on a sofa that no longer exists must not resurrect one.
 */
export function propIsResolvable(prop: StudioProp, sceneMeshNames: Iterable<string>): boolean {
  if (prop.source.kind === 'model') return true;
  const names = sceneMeshNames instanceof Set ? sceneMeshNames : new Set(sceneMeshNames);
  return names.has(prop.source.mesh);
}

/** Split a document's props into the ones this scene can place and the rest. */
export function resolveProps(
  props: StudioProp[],
  sceneMeshNames: Iterable<string>,
): { placeable: StudioProp[]; unresolved: StudioProp[] } {
  const names = new Set(sceneMeshNames);
  const placeable: StudioProp[] = [];
  const unresolved: StudioProp[] = [];
  for (const prop of props) {
    (propIsResolvable(prop, names) ? placeable : unresolved).push(prop);
  }
  return { placeable, unresolved };
}

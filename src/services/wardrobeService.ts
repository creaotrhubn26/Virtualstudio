import type { AbstractMesh, Mesh, Scene, Skeleton, TransformNode } from '@babylonjs/core';

/**
 * Clothes a figure can be dressed in, rather than clothes it was born wearing.
 *
 * The bodies used to ship with their one outfit baked in, with the body faces
 * underneath deleted so skin could not show through. That made a figure able to
 * play exactly one part. Each garment is now its own file carrying the list of
 * body triangles it covers, so any garment fits any body of that shape and the
 * same person can turn up in a work suit or an evening suit.
 */

export interface WardrobeGarment {
  id: string;
  /** Body shape this garment was fitted to, e.g. `studio-woman`. */
  body: string;
  slot: 'outfit' | 'shoes';
  file: string;
  /** Body triangles this garment covers, as sorted `[start, end)` ranges. */
  hidesBodyTriangles: [number, number][];
  /** Triangles in the body it was built against; a guard against a stale file. */
  bodyTriangles: number;
}

export interface WardrobeCatalogue {
  garments: WardrobeGarment[];
  /** What each body wears when nothing has been chosen. */
  defaults: Record<string, string[]>;
}

/** Where the offline builder writes the wardrobe. */
export const WARDROBE_MANIFEST = '/models/avatars/studio/wardrobe.json';

/** A body model URL such as `.../studio-woman.glb` names the shape it is. */
export function bodyIdFromModelUrl(modelUrl: string): string | null {
  const match = /\/(studio-[a-z0-9-]+)\.glb(\?.*)?$/i.exec(modelUrl);
  return match ? match[1] : null;
}

/** The CC0 pack names garments by sex and number; show a photographer a part. */
const GARMENT_LABELS: Record<string, string> = {
  casualsuit: 'Hverdagsantrekk',
  elegantsuit: 'Selskapsantrekk',
  sportsuit: 'Treningsantrekk',
  worksuit: 'Arbeidsantrekk',
  shoes: 'Sko',
};

export function garmentLabel(id: string): string {
  const match = /^(?:female_|male_)?([a-z]+?)(\d*)$/.exec(id);
  const base = match ? GARMENT_LABELS[match[1]] : undefined;
  const number = match?.[2];
  return base ? (number ? `${base} ${Number(number)}` : base) : id;
}

export function garmentsForBody(catalogue: WardrobeCatalogue, body: string): WardrobeGarment[] {
  return catalogue.garments.filter(garment => garment.body === body);
}

export function defaultWardrobeFor(catalogue: WardrobeCatalogue, body: string): string[] {
  return catalogue.defaults[body] ?? [];
}

/**
 * Resolve a requested set of garment ids to one garment per slot.
 *
 * Two outfits at once would intersect, so the last one named wins; anything the
 * catalogue does not carry is dropped rather than failing the whole change.
 */
export function resolveWardrobe(
  catalogue: WardrobeCatalogue,
  body: string,
  requested: string[],
): WardrobeGarment[] {
  const available = new Map(garmentsForBody(catalogue, body).map(garment => [garment.id, garment]));
  const bySlot = new Map<string, WardrobeGarment>();
  for (const id of requested) {
    const garment = available.get(id);
    if (garment) bySlot.set(garment.slot, garment);
  }
  return [...bySlot.values()];
}

/**
 * The index buffer for a body wearing `garments`.
 *
 * Triangles covered by a garment are dropped rather than drawn underneath it,
 * which is what stops skin showing through a sleeve. Ranges index the body's
 * triangle list in the order the builder wrote it.
 */
export function bodyIndicesWearing(
  fullIndices: ArrayLike<number>,
  garments: Pick<WardrobeGarment, 'hidesBodyTriangles'>[],
): number[] {
  const triangleCount = Math.floor(fullIndices.length / 3);
  const hidden = new Uint8Array(triangleCount);
  for (const garment of garments) {
    for (const [start, end] of garment.hidesBodyTriangles) {
      const from = Math.max(0, Math.min(triangleCount, start));
      const to = Math.max(from, Math.min(triangleCount, end));
      hidden.fill(1, from, to);
    }
  }
  const kept: number[] = [];
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    if (hidden[triangle]) continue;
    const i = triangle * 3;
    kept.push(fullIndices[i], fullIndices[i + 1], fullIndices[i + 2]);
  }
  return kept;
}

interface WornGarment {
  id: string;
  mesh: AbstractMesh;
}

interface DressedFigure {
  /** Untouched body index buffer, so removing a garment puts the skin back. */
  fullBodyIndices: number[];
  worn: WornGarment[];
}

const figures = new WeakMap<TransformNode, DressedFigure>();

let cataloguePromise: Promise<WardrobeCatalogue> | null = null;

export async function loadWardrobeCatalogue(
  fetchImpl: typeof fetch = fetch,
  url: string = WARDROBE_MANIFEST,
): Promise<WardrobeCatalogue> {
  if (!cataloguePromise) {
    cataloguePromise = fetchImpl(url)
      .then(response => {
        if (!response.ok) throw new Error(`Wardrobe manifest ${response.status}`);
        return response.json() as Promise<WardrobeCatalogue>;
      })
      .catch(error => {
        cataloguePromise = null;
        throw error;
      });
  }
  return cataloguePromise;
}

/** Forget the cached catalogue; for tests and for a rebuilt asset set. */
export function resetWardrobeCatalogue(): void {
  cataloguePromise = null;
}

export interface DressOptions {
  scene: Scene;
  /** The wrapper the figure's imported hierarchy hangs from. */
  characterRoot: TransformNode;
  /** The glTF root the body meshes sit under, which garments join. */
  bodyRoot: TransformNode;
  /** The body's `Skin` mesh, whose triangles garments cover. */
  skin: Mesh;
  /** The body's skeleton; a garment is skinned to it, not to its own copy. */
  skeleton: Skeleton;
  garments: WardrobeGarment[];
  /**
   * Where to load a garment from, split the way the loader wants it.
   *
   * `root` is what relative texture URIs inside the file resolve against, so
   * it has to be the directory the shared textures sit in, not the garment's
   * own directory.
   */
  resolveUrl: (garment: WardrobeGarment) => { root: string; file: string };
  importMesh: (root: string, file: string) => Promise<{
    meshes: AbstractMesh[];
    skeletons: Skeleton[];
    transformNodes: TransformNode[];
  }>;
}

/**
 * Put `garments` on a figure and take off whatever it was wearing.
 *
 * A garment is imported with a skeleton of its own, which is discarded: it is
 * skinned to the body's skeleton instead, so it follows every pose and every
 * joint edit without being animated separately. The duplicate joints must go —
 * they carry the same names as the body's, and the pose editor looks its joints
 * up by name.
 */
export async function dressFigure(options: DressOptions): Promise<string[]> {
  const { characterRoot, skin, garments } = options;

  let figure = figures.get(characterRoot);
  if (!figure) {
    figure = { fullBodyIndices: Array.from(skin.getIndices() ?? []), worn: [] };
    figures.set(characterRoot, figure);
  }

  const wanted = new Map(garments.map(garment => [garment.id, garment]));
  for (const worn of [...figure.worn]) {
    if (wanted.has(worn.id)) continue;
    worn.mesh.dispose(false, true);
    figure.worn.splice(figure.worn.indexOf(worn), 1);
  }

  for (const garment of garments) {
    if (figure.worn.some(worn => worn.id === garment.id)) continue;
    const { root, file } = options.resolveUrl(garment);
    const imported = await options.importMesh(root, file);
    const mesh = imported.meshes.find(candidate => candidate.getTotalVertices() > 0);
    if (!mesh) {
      imported.meshes.forEach(node => node.dispose());
      continue;
    }

    mesh.parent = options.bodyRoot;
    mesh.position.setAll(0);
    mesh.rotationQuaternion = null;
    mesh.rotation.setAll(0);
    mesh.scaling.setAll(1);
    mesh.skeleton = options.skeleton;
    mesh.metadata = { ...(mesh.metadata ?? {}), studioGarment: garment.id, studioGarmentSlot: garment.slot };
    mesh.alwaysSelectAsActiveMesh = true;

    // The garment's own copy of the rig, and the glTF root it hung from, are
    // now redundant. Leaving them would put a second `mixamorigHead` in the
    // hierarchy for the pose editor to find.
    imported.skeletons.forEach(extra => extra.dispose());
    imported.meshes.filter(node => node !== mesh).forEach(node => node.dispose());
    imported.transformNodes.forEach(node => { if (!node.isDisposed()) node.dispose(); });

    figure.worn.push({ id: garment.id, mesh });
  }

  if (figure.fullBodyIndices.length > 0) {
    skin.setIndices(bodyIndicesWearing(figure.fullBodyIndices, garments));
  }
  return figure.worn.map(worn => worn.id);
}

/** What a figure currently has on. */
export function wornGarments(characterRoot: TransformNode): string[] {
  return figures.get(characterRoot)?.worn.map(worn => worn.id) ?? [];
}

/** Drop a figure's wardrobe bookkeeping when the figure itself goes. */
export function forgetFigure(characterRoot: TransformNode): void {
  figures.delete(characterRoot);
}

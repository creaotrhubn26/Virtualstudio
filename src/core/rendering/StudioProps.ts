import {
  AbstractMesh,
  GizmoManager,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import {
  IDENTITY_TRANSFORM,
  PropSource,
  PropTransform,
  StudioProp,
  propId,
  resolveProps,
} from '../../services/studioProps';

/**
 * Everything on set that the photographer can take hold of.
 *
 * Two kinds of thing become a prop, and the difference is only where the
 * geometry came from:
 *
 * - geometry the studio built, claimed by its stable `studioObjectKey`;
 * - a model file, imported on demand.
 *
 * After that they behave identically — selected, moved, hidden, saved — which
 * is the point. A hospital bed, an air ambulance and the portrait chair are not
 * three features.
 */

/** Any studio-built object that wants to be claimable carries this. */
export const STUDIO_OBJECT_KEY = 'studioObjectKey';

interface PlacedProp {
  prop: StudioProp;
  node: TransformNode;
  /** Undoes whatever the studio was doing to this object before it was claimed. */
  release?: () => void;
}

export interface StudioPropsOptions {
  scene: Scene;
  gizmos: GizmoManager;
  /** Loads a model and returns the node everything hangs from. */
  importModel: (url: string) => Promise<TransformNode | null>;
  /** Called whenever the set of props, or the selection, changes. */
  onChanged?: (props: StudioProp[], selectedId: string | null) => void;
}

export class StudioProps {
  private placed = new Map<string, PlacedProp>();
  private selectedId: string | null = null;
  private pointerObserver: Observer<PointerInfo> | null = null;

  constructor(private readonly options: StudioPropsOptions) {
    this.pointerObserver = options.scene.onPointerObservable.add(info => {
      if (info.type !== PointerEventTypes.POINTERPICK) return;
      const id = ownerOf(info.pickInfo?.pickedMesh ?? null);
      if (id && this.placed.has(id)) this.select(id);
    });
  }

  get props(): StudioProp[] {
    return [...this.placed.values()].map(placed => ({ ...placed.prop, transform: read(placed.node) }));
  }

  get selected(): string | null {
    return this.selectedId;
  }

  /**
   * Every studio-built object currently on set that could be claimed.
   *
   * Read from the scene each time rather than kept in a list, so anything the
   * studio learns to build later is offered without being registered here.
   */
  claimable(): { key: string; name: string; claimed: boolean }[] {
    const claimedKeys = new Set(
      [...this.placed.values()]
        .filter(placed => placed.prop.source.kind === 'scene')
        .map(placed => (placed.prop.source as { mesh: string }).mesh),
    );
    const found = new Map<string, string>();
    for (const node of [...this.options.scene.transformNodes, ...this.options.scene.meshes]) {
      const key = node.metadata?.[STUDIO_OBJECT_KEY] as string | undefined;
      if (key && !found.has(key)) found.set(key, node.name);
    }
    return [...found].map(([key, name]) => ({ key, name, claimed: claimedKeys.has(key) }));
  }

  /** Take ownership of something the studio built. */
  claim(key: string, name?: string, release?: () => void): StudioProp | null {
    const node = this.findByKey(key);
    if (!node) return null;
    const source: PropSource = { kind: 'scene', mesh: key };
    const prop: StudioProp = {
      id: propId(source, this.placed.keys()),
      name: name ?? node.name,
      source,
      transform: read(node),
      visible: node.isEnabled(),
      locked: false,
    };
    // The studio may still be driving this object — the chair follows the
    // figure — and must stop before the document owns where it stands.
    release?.();
    this.place(prop, node, release);
    return prop;
  }

  /** Bring a model onto the set. */
  async add(url: string, name?: string, position?: Vector3): Promise<StudioProp | null> {
    const node = await this.options.importModel(url);
    if (!node) return null;
    const source: PropSource = { kind: 'model', url };
    if (position) node.position.copyFrom(position);
    const prop: StudioProp = {
      id: propId(source, this.placed.keys()),
      name: name ?? node.name,
      source,
      transform: read(node),
      visible: true,
      locked: false,
    };
    this.place(prop, node);
    return prop;
  }

  select(id: string | null): void {
    this.selectedId = id;
    const placed = id ? this.placed.get(id) : undefined;
    // A locked prop can be selected to read it, but not dragged.
    this.options.gizmos.attachToNode(placed && !placed.prop.locked ? placed.node : null);
    this.changed();
  }

  setVisible(id: string, visible: boolean): void {
    const placed = this.placed.get(id);
    if (!placed) return;
    placed.prop.visible = visible;
    placed.node.setEnabled(visible);
    this.changed();
  }

  setLocked(id: string, locked: boolean): void {
    const placed = this.placed.get(id);
    if (!placed) return;
    placed.prop.locked = locked;
    if (locked && this.selectedId === id) this.options.gizmos.attachToNode(null);
    this.changed();
  }

  /** Give a claimed object back to the studio, or take an imported one away. */
  remove(id: string): void {
    const placed = this.placed.get(id);
    if (!placed) return;
    // Only geometry this controller brought in is destroyed. A claimed chair
    // belongs to the studio; releasing it just ends the photographer's hold.
    if (placed.prop.source.kind === 'model') placed.node.dispose(false, true);
    else clearOwner(placed.node);
    this.placed.delete(id);
    if (this.selectedId === id) this.select(null);
    else this.changed();
  }

  /**
   * Put a document's props back on set.
   *
   * Claims that no longer describe anything are reported rather than silently
   * dropped: a scene built without the industrial room has no sofa to hand
   * back, and the photographer should be told rather than left wondering.
   */
  async restore(
    props: StudioProp[],
    releaseFor?: (key: string) => (() => void) | undefined,
  ): Promise<{ placed: StudioProp[]; missing: StudioProp[] }> {
    this.clear();
    const keys = this.claimable().map(entry => entry.key);
    const { placeable, unresolved } = resolveProps(props, keys);
    const done: StudioProp[] = [];
    for (const prop of placeable) {
      const node = prop.source.kind === 'scene'
        ? this.findByKey(prop.source.mesh)
        : await this.options.importModel(prop.source.url);
      if (!node) continue;
      const release = prop.source.kind === 'scene' ? releaseFor?.(prop.source.mesh) : undefined;
      release?.();
      write(node, prop.transform);
      node.setEnabled(prop.visible);
      this.place({ ...prop }, node, release);
      done.push(prop);
    }
    return { placed: done, missing: unresolved };
  }

  /** Drop every hold without destroying what the studio owns. */
  clear(): void {
    for (const id of [...this.placed.keys()]) this.remove(id);
    this.selectedId = null;
  }

  dispose(): void {
    this.clear();
    if (this.pointerObserver) this.options.scene.onPointerObservable.remove(this.pointerObserver);
    this.pointerObserver = null;
  }

  private place(prop: StudioProp, node: TransformNode, release?: () => void): void {
    node.metadata = { ...(node.metadata ?? {}), studioPropId: prop.id };
    for (const mesh of meshesOf(node)) {
      mesh.metadata = { ...(mesh.metadata ?? {}), studioPropId: prop.id };
      mesh.isPickable = true;
    }
    this.placed.set(prop.id, { prop, node, release });
    this.changed();
  }

  private findByKey(key: string): TransformNode | null {
    const nodes: TransformNode[] = [...this.options.scene.transformNodes, ...this.options.scene.meshes];
    return nodes.find(node => node.metadata?.[STUDIO_OBJECT_KEY] === key) ?? null;
  }

  private changed(): void {
    this.options.onChanged?.(this.props, this.selectedId);
  }
}

function meshesOf(node: TransformNode): AbstractMesh[] {
  const own = node instanceof AbstractMesh ? [node] : [];
  return [...own, ...node.getChildMeshes()];
}

function clearOwner(node: TransformNode): void {
  for (const target of [node, ...meshesOf(node)]) {
    if (target.metadata?.studioPropId) {
      const { studioPropId: _dropped, ...rest } = target.metadata as Record<string, unknown>;
      target.metadata = rest;
    }
  }
}

/** Which prop, if any, a picked mesh belongs to. */
function ownerOf(mesh: AbstractMesh | null): string | null {
  for (let node: TransformNode | null = mesh; node; node = node.parent as TransformNode | null) {
    const id = node.metadata?.studioPropId as string | undefined;
    if (id) return id;
  }
  return null;
}

function read(node: TransformNode): PropTransform {
  // A node dragged by a rotation gizmo carries a quaternion, which has to be
  // turned back into the angles the document stores.
  const rotation = node.rotationQuaternion ? node.rotationQuaternion.toEulerAngles() : node.rotation;
  return {
    position: node.position.asArray() as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z],
    scale: node.scaling.asArray() as [number, number, number],
  };
}

function write(node: TransformNode, transform: PropTransform = IDENTITY_TRANSFORM): void {
  node.position.fromArray(transform.position);
  node.rotationQuaternion = null;
  node.rotation.fromArray(transform.rotation);
  node.scaling.fromArray(transform.scale);
  node.computeWorldMatrix(true);
}

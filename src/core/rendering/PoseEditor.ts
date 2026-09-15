import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Observer,
  PositionGizmo,
  PointerEventTypes,
  PointerInfo,
  Quaternion,
  RotationGizmo,
  Scene,
  StandardMaterial,
  TransformNode,
  UtilityLayerRenderer,
  Vector3,
} from '@babylonjs/core';
import { DEG, EDITABLE_JOINTS, EditableJoint, LIMB_CHAINS, LimbChain, Vec3 as RigVec3, clampJointQuaternion,
  eulerFromQuat, freeAxes, jointById, quatFromAxisAngle, quatFromEuler, unitVector } from './poseRig';
import { Vec3, solveTwoBoneIk } from './limbIk';

/**
 * The bone's direction in its joint's own frame, taken from the child's rest
 * position. A leaf joint such as the head has no child, so it falls back to the
 * local up axis.
 */
function boneAxisOf(node: TransformNode): RigVec3 {
  const child = node.getChildTransformNodes(true)[0];
  if (!child) return { x: 0, y: 1, z: 0 };
  return unitVector({ x: child.position.x, y: child.position.y, z: child.position.z });
}

/** Same helper layer the rest of the studio uses: editor only, never in the shot. */
const HELPER_LAYER = 0x10000000;
const HANDLE_DIAMETER = 0.05;
/** Hands and feet get a box, so a limb target is never mistaken for a joint. */
const REACH_HANDLE_SIZE = 0.06;
/** Enough passes for a clamped limb to settle; more buys nothing measurable. */
const SOLVE_PASSES = 3;

interface LimbHandle {
  chain: LimbChain;
  rootNode: TransformNode;
  midNode: TransformNode;
  endNode: TransformNode;
  mesh: Mesh;
}

interface JointHandle {
  joint: EditableJoint;
  node: TransformNode;
  mesh: Mesh;
  /**
   * Direction of the bone in this joint's own frame, from the child's rest
   * position. A ball joint's cone is measured from it.
   */
  boneAxis: RigVec3;
  /** Last rotation reported to the caller, so a drag re-grounds as it happens. */
  lastReported: Quaternion;
}

/**
 * Click a joint, drag a rotation ring, within what that joint can do.
 *
 * The three bundled clips stay the reset states: this edits the rotations the
 * clip left on the skeleton, and `reset` is simply re-applying the clip. Poses
 * are paused animation groups, so nothing overwrites an edited joint until the
 * photographer picks a pose again.
 */
export class PoseEditor {
  private readonly handles: JointHandle[] = [];
  private readonly limbs: LimbHandle[] = [];
  private readonly gizmoLayer: UtilityLayerRenderer;
  private readonly gizmo: RotationGizmo;
  private readonly reachGizmo: PositionGizmo;
  private readonly reachMaterial: StandardMaterial;
  private reach: LimbHandle | null = null;
  private readonly restMaterial: StandardMaterial;
  private readonly activeMaterial: StandardMaterial;
  private renderObserver: Observer<Scene> | null = null;
  private pointerObserver: Observer<PointerInfo> | null = null;
  private selected: JointHandle | null = null;
  private enabled = false;

  constructor(
    private readonly scene: Scene,
    characterRoot: TransformNode,
    /** Identifies the figure these handles belong to, so a model swap rebuilds. */
    readonly characterId: number,
    /** Called after a joint moves, so the caller can re-ground the figure. */
    private readonly onJointChanged: (jointId: string) => void = () => {},
  ) {
    this.restMaterial = this.handleMaterial('poseHandleRest', new Color3(0.11, 0.71, 0.85));
    this.activeMaterial = this.handleMaterial('poseHandleActive', new Color3(1, 0.78, 0.25));
    this.reachMaterial = this.handleMaterial('poseReachHandle', new Color3(0.45, 0.89, 0.42));

    const nodes = new Map(
      [characterRoot, ...characterRoot.getChildTransformNodes()].map(node => [node.name, node]),
    );
    for (const joint of EDITABLE_JOINTS) {
      const node = nodes.get(joint.node);
      if (!node) continue;
      const mesh = MeshBuilder.CreateSphere(`poseHandle_${joint.id}`, { diameter: HANDLE_DIAMETER }, scene);
      mesh.material = this.restMaterial;
      mesh.layerMask = HELPER_LAYER;
      mesh.metadata = { studioHelper: true, poseJointId: joint.id };
      mesh.isPickable = true;
      mesh.setEnabled(false);
      this.handles.push({
        joint, node, mesh,
        boneAxis: boneAxisOf(node),
        lastReported: (node.rotationQuaternion ?? Quaternion.Identity()).clone(),
      });
    }

    // Limbs a photographer can place by the hand or foot instead of joint by joint.
    const jointNode = (id: string) => nodes.get(EDITABLE_JOINTS.find(j => j.id === id)?.node ?? '');
    for (const chain of LIMB_CHAINS) {
      const rootNode = jointNode(chain.rootJoint);
      const midNode = jointNode(chain.midJoint);
      const endNode = nodes.get(chain.endNode);
      if (!rootNode || !midNode || !endNode) continue;
      const mesh = MeshBuilder.CreateBox(`poseReach_${chain.id}`, { size: REACH_HANDLE_SIZE }, scene);
      mesh.material = this.reachMaterial;
      mesh.layerMask = HELPER_LAYER;
      mesh.metadata = { studioHelper: true, poseLimbId: chain.id };
      mesh.isPickable = true;
      mesh.setEnabled(false);
      this.limbs.push({ chain, rootNode, midNode, endNode, mesh });
    }

    this.gizmoLayer = new UtilityLayerRenderer(scene);
    this.gizmo = new RotationGizmo(this.gizmoLayer);
    this.gizmo.updateGizmoRotationToMatchAttachedMesh = true; // rings follow the joint's own axes
    // A joint is a few centimetres of body, not a whole prop: at the default
    // size the rings span the torso and bury the figure being posed.
    this.gizmo.scaleRatio = 0.28;
    this.gizmo.attachedNode = null;

    // Dragging the hand or foot box solves the limb behind it.
    this.reachGizmo = new PositionGizmo(this.gizmoLayer);
    this.reachGizmo.scaleRatio = 0.4;
    this.reachGizmo.attachedMesh = null;
    this.reachGizmo.onDragObservable.add(() => this.solveReach());
    this.reachGizmo.onDragEndObservable.add(() => this.solveReach());
  }

  /** Number of rig joints this character actually exposes. */
  get jointCount(): number {
    return this.handles.length;
  }

  get selectedJointId(): string | null {
    return this.selected?.joint.id ?? null;
  }

  /** Limb chains this character actually exposes. */
  get limbCount(): number {
    return this.limbs.length;
  }

  get reachingLimbId(): string | null {
    return this.reach?.chain.id ?? null;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.handles.forEach(handle => handle.mesh.setEnabled(enabled));
    this.limbs.forEach(limb => limb.mesh.setEnabled(enabled));

    if (enabled) {
      this.renderObserver = this.scene.onBeforeRenderObservable.add(() => this.followSkeleton());
      this.pointerObserver = this.scene.onPointerObservable.add(info => {
        if (info.type !== PointerEventTypes.POINTERPICK) return;
        const picked = info.pickInfo?.pickedMesh?.metadata;
        const jointId = picked?.poseJointId as string | undefined;
        if (jointId) this.select(jointId);
        const limbId = picked?.poseLimbId as string | undefined;
        if (limbId) this.reachFor(limbId);
      });
      this.followSkeleton();
    } else {
      this.select(null);
      this.reachFor(null);
      if (this.renderObserver) this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      if (this.pointerObserver) this.scene.onPointerObservable.remove(this.pointerObserver);
      this.renderObserver = null;
      this.pointerObserver = null;
    }
  }

  /**
   * Pick up a hand or a foot, so dragging it solves the limb behind it.
   *
   * Selecting a limb releases any joint selection: a photographer is either
   * placing an end or turning a joint, never both at once.
   */
  reachFor(limbId: string | null): void {
    this.reach = limbId ? this.limbs.find(limb => limb.chain.id === limbId) ?? null : null;
    this.reachGizmo.attachedMesh = this.reach?.mesh ?? null;
    if (this.reach) this.select(null);
  }

  select(jointId: string | null): void {
    if (jointId) this.reachFor(null);
    if (this.selected) this.selected.mesh.material = this.restMaterial;
    this.selected = jointId ? this.handles.find(handle => handle.joint.id === jointId) ?? null : null;

    if (!this.selected) {
      this.gizmo.attachedNode = null;
      return;
    }

    this.selected.mesh.material = this.activeMaterial;
    const axes = freeAxes(this.selected.joint);
    this.gizmo.xGizmo.isEnabled = axes.includes('x');
    this.gizmo.yGizmo.isEnabled = axes.includes('y');
    this.gizmo.zGizmo.isEnabled = axes.includes('z');
    this.gizmo.attachedNode = this.selected.node;
  }

  /**
   * Set a joint directly, in radians, clamped to its range.
   *
   * Used by scene documents and by tests; the gizmo path goes through the same
   * clamp on every frame of a drag.
   */
  setJointRotation(jointId: string, rotation: { x: number; y: number; z: number }): boolean {
    const handle = this.handles.find(h => h.joint.id === jointId);
    if (!handle) return false;
    const clamped = clampJointQuaternion(jointId, quatFromEuler(rotation), handle.boneAxis);
    handle.node.rotationQuaternion = new Quaternion(clamped.x, clamped.y, clamped.z, clamped.w);
    handle.lastReported.copyFrom(handle.node.rotationQuaternion);
    this.onJointChanged(jointId);
    return true;
  }

  /**
   * Place a hand or foot at a world position, solving the limb behind it.
   *
   * The drag path runs the same solve; this is what documents and tests use.
   */
  reachTo(limbId: string, target: Vec3): boolean {
    const limb = this.limbs.find(candidate => candidate.chain.id === limbId);
    if (!limb) return false;
    const previous = this.reach;
    this.reach = limb;
    limb.mesh.position.copyFromFloats(target.x, target.y, target.z);
    limb.mesh.computeWorldMatrix(true);
    this.solveReach();
    this.reach = previous;
    return true;
  }

  /** Every joint that has been moved off the clip's rotation, in radians. */
  getJointRotations(): Record<string, { x: number; y: number; z: number }> {
    const out: Record<string, { x: number; y: number; z: number }> = {};
    for (const handle of this.handles) {
      const quaternion = handle.node.rotationQuaternion;
      if (!quaternion) continue;
      out[handle.joint.id] = eulerFromQuat(quaternion);
    }
    return out;
  }

  dispose(): void {
    this.setEnabled(false);
    this.gizmo.dispose();
    this.reachGizmo.dispose();
    this.gizmoLayer.dispose();
    this.handles.forEach(handle => handle.mesh.dispose());
    this.limbs.forEach(limb => limb.mesh.dispose());
    this.handles.length = 0;
    this.limbs.length = 0;
    this.restMaterial.dispose();
    this.activeMaterial.dispose();
    this.reachMaterial.dispose();
  }

  /**
   * Keep the handles on the joints, and the joints inside their limits.
   *
   * Clamping here rather than on a drag-end event means a gizmo can never carry
   * a joint past its range even mid-drag, so the figure is never briefly broken.
   */
  private followSkeleton(): void {
    for (const handle of this.handles) {
      handle.mesh.position.copyFrom(handle.node.absolutePosition);
    }
    // Limb targets sit on the hand or foot they actually reached, so a target
    // the body cannot meet visibly stops rather than drifting off the figure.
    for (const limb of this.limbs) {
      if (limb === this.reach && this.reachGizmo.isDragging) continue;
      limb.mesh.position.copyFrom(limb.endNode.absolutePosition);
    }
    const handle = this.selected;
    if (!handle) return;

    const quaternion = handle.node.rotationQuaternion;
    if (!quaternion) return;

    const clamped = clampJointQuaternion(handle.joint.id, quaternion, handle.boneAxis);
    if (Math.abs(Quaternion.Dot(new Quaternion(clamped.x, clamped.y, clamped.z, clamped.w), quaternion)) < 1 - 1e-9) {
      handle.node.rotationQuaternion = new Quaternion(clamped.x, clamped.y, clamped.z, clamped.w);
    }

    // Report any movement, clamped or not: an in-range drag still lifts a foot
    // off the floor, and the caller is what puts it back.
    const current = handle.node.rotationQuaternion!;
    if (Quaternion.Dot(current, handle.lastReported) < 1 - 1e-9) {
      handle.lastReported.copyFrom(current);
      this.onJointChanged(handle.joint.id);
    }
  }

  /**
   * Solve the limb whose end is being dragged.
   *
   * Two aims: swing the upper segment so the elbow lands where the solve put
   * it, then swing the lower one so the hand follows. Both joints are clamped
   * afterwards, so the body's limits win over the target — an out-of-reach
   * hand simply stops, which is also what happens on set.
   */
  private solveReach(): void {
    const limb = this.reach;
    if (!limb) return;

    const refresh = () => {
      limb.rootNode.computeWorldMatrix(true);
      limb.midNode.computeWorldMatrix(true);
      limb.endNode.computeWorldMatrix(true);
    };
    const at = (node: TransformNode): Vec3 => {
      const p = node.absolutePosition;
      return { x: p.x, y: p.y, z: p.z };
    };

    const target = limb.mesh.absolutePosition;
    const goal = { x: target.x, y: target.y, z: target.z };

    // Solving once puts the hand on the target only if no limit bites. When
    // one does, the limb has moved and a second solve from there gets closer;
    // a few passes converge, and the joint's range still wins in the end.
    for (let pass = 0; pass < SOLVE_PASSES; pass++) {
      refresh();
      const solution = solveTwoBoneIk(
        { root: at(limb.rootNode), mid: at(limb.midNode), end: at(limb.endNode) },
        goal,
      );

      // Fold the hinge until the end sits the right distance from the root.
      //
      // The angle cannot be derived from the interior angle: this rig's hinge
      // axis is not perpendicular to the limb, so a degree at the elbow is
      // worth about two thirds of a degree of bend, and an analytic angle left
      // the hand four centimetres short. Searching against the rig needs no
      // such assumption.
      const root = at(limb.rootNode);
      const wanted = Math.hypot(
        solution.end.x - root.x, solution.end.y - root.y, solution.end.z - root.z,
      );
      this.foldHinge(limb, wanted, refresh);
      refresh();

      // With the hinge set, the hand sits at the right distance from the
      // shoulder, so one rigid swing of the whole limb puts it on the target.
      this.aimSegment(limb.rootNode, limb.endNode.absolutePosition, solution.end);
      this.clampNode(limb.chain.rootJoint, limb.rootNode);
    }
    refresh();

    this.onJointChanged(limb.chain.rootJoint);
  }

  /**
   * Close the hinge until the limb spans `wanted`.
   *
   * Distance from root to end falls as the hinge folds, so a bisection on the
   * joint's own range converges quickly and needs no model of how the rig's
   * axes are laid out. Twenty passes take it well below a millimetre.
   */
  private foldHinge(limb: LimbHandle, wanted: number, refresh: () => void): void {
    const limits = jointById(limb.chain.midJoint)?.limits;
    if (!limits || limits.kind !== 'hinge') return;

    const span = (angle: number): number => {
      const q = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, angle);
      limb.midNode.rotationQuaternion = new Quaternion(q.x, q.y, q.z, q.w);
      refresh();
      return limb.endNode.absolutePosition.subtract(limb.rootNode.absolutePosition).length();
    };

    // Straight is the longest the limb gets; the far end of its range the shortest.
    const open = 0;
    const folded = limb.chain.bendSign < 0 ? limits.min * DEG : limits.max * DEG;
    if (wanted >= span(open)) return;
    if (wanted <= span(folded)) return;

    let lo = open;
    let hi = folded;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (span(mid) > wanted) lo = mid; else hi = mid;
    }
    span((lo + hi) / 2);
  }

  /**
   * Rotate `node` so its child swings from where it is to where it should be.
   *
   * The work happens in the parent's space rather than through world
   * rotations. The glTF loader parents the figure under a mirrored root to
   * convert handedness, and a world matrix with a negative scale has no
   * well-defined rotation to decompose — reading one back sent arms off in
   * their own direction entirely. Transforming two points is exact either way.
   */
  private aimSegment(node: TransformNode, childWorld: Vector3, desired: Vec3): void {
    const parent = node.parent as TransformNode | null;
    const intoParent = parent ? Matrix.Invert(parent.getWorldMatrix()) : Matrix.Identity();
    const pivot = node.position;
    const from = Vector3.TransformCoordinates(childWorld, intoParent).subtract(pivot);
    const to = Vector3.TransformCoordinates(
      new Vector3(desired.x, desired.y, desired.z), intoParent,
    ).subtract(pivot);
    if (from.lengthSquared() < 1e-12 || to.lengthSquared() < 1e-12) return;

    const delta = new Quaternion();
    Quaternion.FromUnitVectorsToRef(from.normalize(), to.normalize(), delta);
    node.rotationQuaternion = delta.multiply(node.rotationQuaternion ?? Quaternion.Identity());
  }

  /** Pull a node's local rotation back inside its joint's range. */
  private clampNode(jointId: string, node: TransformNode): void {
    const quaternion = node.rotationQuaternion;
    if (!quaternion) return;
    const clamped = clampJointQuaternion(jointId, quaternion, boneAxisOf(node));
    node.rotationQuaternion = new Quaternion(clamped.x, clamped.y, clamped.z, clamped.w);
  }

  private handleMaterial(name: string, colour: Color3): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.emissiveColor = colour;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    return material;
  }
}

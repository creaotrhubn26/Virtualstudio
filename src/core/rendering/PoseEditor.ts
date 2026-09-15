import {
  Color3,
  Mesh,
  MeshBuilder,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Quaternion,
  RotationGizmo,
  Scene,
  StandardMaterial,
  TransformNode,
  UtilityLayerRenderer,
} from '@babylonjs/core';
import { EDITABLE_JOINTS, EditableJoint, clampJointRotation, freeAxes } from './poseRig';

/** Same helper layer the rest of the studio uses: editor only, never in the shot. */
const HELPER_LAYER = 0x10000000;
const HANDLE_DIAMETER = 0.05;

interface JointHandle {
  joint: EditableJoint;
  node: TransformNode;
  mesh: Mesh;
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
  private readonly gizmoLayer: UtilityLayerRenderer;
  private readonly gizmo: RotationGizmo;
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
        lastReported: (node.rotationQuaternion ?? Quaternion.Identity()).clone(),
      });
    }

    this.gizmoLayer = new UtilityLayerRenderer(scene);
    this.gizmo = new RotationGizmo(this.gizmoLayer);
    this.gizmo.updateGizmoRotationToMatchAttachedMesh = true; // rings follow the joint's own axes
    // A joint is a few centimetres of body, not a whole prop: at the default
    // size the rings span the torso and bury the figure being posed.
    this.gizmo.scaleRatio = 0.28;
    this.gizmo.attachedNode = null;
  }

  /** Number of rig joints this character actually exposes. */
  get jointCount(): number {
    return this.handles.length;
  }

  get selectedJointId(): string | null {
    return this.selected?.joint.id ?? null;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.handles.forEach(handle => handle.mesh.setEnabled(enabled));

    if (enabled) {
      this.renderObserver = this.scene.onBeforeRenderObservable.add(() => this.followSkeleton());
      this.pointerObserver = this.scene.onPointerObservable.add(info => {
        if (info.type !== PointerEventTypes.POINTERPICK) return;
        const jointId = info.pickInfo?.pickedMesh?.metadata?.poseJointId as string | undefined;
        if (jointId) this.select(jointId);
      });
      this.followSkeleton();
    } else {
      this.select(null);
      if (this.renderObserver) this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      if (this.pointerObserver) this.scene.onPointerObservable.remove(this.pointerObserver);
      this.renderObserver = null;
      this.pointerObserver = null;
    }
  }

  select(jointId: string | null): void {
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
    const clamped = clampJointRotation(jointId, rotation);
    handle.node.rotationQuaternion = Quaternion.FromEulerAngles(clamped.x, clamped.y, clamped.z);
    handle.lastReported.copyFrom(handle.node.rotationQuaternion);
    this.onJointChanged(jointId);
    return true;
  }

  /** Every joint that has been moved off the clip's rotation, in radians. */
  getJointRotations(): Record<string, { x: number; y: number; z: number }> {
    const out: Record<string, { x: number; y: number; z: number }> = {};
    for (const handle of this.handles) {
      const quaternion = handle.node.rotationQuaternion;
      if (!quaternion) continue;
      const euler = quaternion.toEulerAngles();
      out[handle.joint.id] = { x: euler.x, y: euler.y, z: euler.z };
    }
    return out;
  }

  dispose(): void {
    this.setEnabled(false);
    this.gizmo.dispose();
    this.gizmoLayer.dispose();
    this.handles.forEach(handle => handle.mesh.dispose());
    this.handles.length = 0;
    this.restMaterial.dispose();
    this.activeMaterial.dispose();
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
    const handle = this.selected;
    if (!handle) return;

    const quaternion = handle.node.rotationQuaternion;
    if (!quaternion) return;

    const euler = quaternion.toEulerAngles();
    const clamped = clampJointRotation(handle.joint.id, euler);
    if (
      Math.abs(clamped.x - euler.x) > 1e-6 ||
      Math.abs(clamped.y - euler.y) > 1e-6 ||
      Math.abs(clamped.z - euler.z) > 1e-6
    ) {
      handle.node.rotationQuaternion = Quaternion.FromEulerAngles(clamped.x, clamped.y, clamped.z);
    }

    // Report any movement, clamped or not: an in-range drag still lifts a foot
    // off the floor, and the caller is what puts it back.
    const current = handle.node.rotationQuaternion!;
    if (Quaternion.Dot(current, handle.lastReported) < 1 - 1e-9) {
      handle.lastReported.copyFrom(current);
      this.onJointChanged(handle.joint.id);
    }
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

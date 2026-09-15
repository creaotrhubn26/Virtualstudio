import {
  AbstractMesh, Color3, Matrix, Mesh, MeshBuilder, Observer, PBRMaterial,
  Scene, ShadowGenerator, TransformNode, Vector3,
} from '@babylonjs/core';

/** Adjustable portrait chair fitted to the posed body, with feet grounded first. */
export class StudioSeat {
  readonly root: TransformNode;
  private seat: TransformNode;
  private stem: Mesh;
  private materials: PBRMaterial[] = [];
  private contactLocal: Vector3;
  private observer: Observer<Scene> | null;
  private disposed = false;

  constructor(private scene: Scene, private character: AbstractMesh, private shadows: () => ShadowGenerator[]) {
    this.root = new TransformNode(`studioPortraitChair_${character.uniqueId}`, scene);
    // A stable key, unlike the node's name, so a photographer who takes
    // ownership of the chair can be given it back when the scene reopens.
    this.root.metadata = { studioSeat: true, characterId: character.uniqueId, studioObjectKey: 'portraitChair' };
    this.seat = new TransformNode('studioPortraitChair_seat', scene);
    this.seat.parent = this.root;
    const leather = this.material('leather', '#80482f', .53, 0);
    const trim = this.material('seams', '#b27953', .65, 0);
    const chrome = this.material('chrome', '#b6b9bc', .24, .95);
    const rubber = this.material('rubber', '#24262a', .85, 0);
    const attach = (mesh: Mesh, material: PBRMaterial, parent = this.seat): Mesh => {
      mesh.parent = parent; mesh.material = material;
      mesh.receiveShadows = true; mesh.isPickable = false;
      mesh.metadata = { studioSeat: true, characterId: character.uniqueId };
      return mesh;
    };
    // Flat contact surface, rounded leather edges and an upholstered curved back.
    const cushion = attach(MeshBuilder.CreateLathe('studioPortraitChair_cushion', {
      shape: [new Vector3(0, -.055, 0), new Vector3(.23, -.055, 0),
        new Vector3(.258, -.035, 0), new Vector3(.263, -.013, 0),
        new Vector3(.25, 0, 0), new Vector3(0, 0, 0)], tessellation: 48,
      sideOrientation: Mesh.DOUBLESIDE,
    }, scene), leather);
    cushion.scaling.z = .94;
    const backPath = (radius: number, upper: boolean) => Array.from({ length: 37 }, (_, i) => {
      const a = (i / 36 - .5) * 2.6;
      return new Vector3(Math.sin(a) * radius, upper ? .28 + Math.cos(a) * .055 : .025,
        Math.cos(a) * radius + .018);
    });
    attach(MeshBuilder.CreateRibbon('studioPortraitChair_back', {
      pathArray: [backPath(.282, false), backPath(.282, true), backPath(.25, true), backPath(.25, false)],
      closeArray: true, sideOrientation: Mesh.DOUBLESIDE,
    }, scene), leather);
    attach(MeshBuilder.CreateTube('studioPortraitChair_backSeam', {
      path: backPath(.266, true), radius: .003, tessellation: 6,
    }, scene), trim);
    for (const x of [-.19, .19]) attach(MeshBuilder.CreateTube('studioPortraitChair_backSupport', {
      path: [new Vector3(x, -.055, .14), new Vector3(x, .12, .24)], radius: .012, tessellation: 10,
    }, scene), chrome);
    const base = attach(MeshBuilder.CreateCylinder('studioPortraitChair_base', {
      diameterTop: .49, diameterBottom: .54, height: .035, tessellation: 48,
    }, scene), chrome, this.root);
    base.position.y = .035;
    const pad = attach(MeshBuilder.CreateCylinder('studioPortraitChair_floorPad', {
      diameter: .51, height: .012, tessellation: 40,
    }, scene), rubber, this.root);
    pad.position.y = .015;
    this.stem = attach(MeshBuilder.CreateCylinder('studioPortraitChair_pedestal', {
      diameter: .065, height: 1, tessellation: 24,
    }, scene), chrome, this.root);
    const collar = attach(MeshBuilder.CreateCylinder('studioPortraitChair_collar', {
      diameter: .092, height: .16, tessellation: 24,
    }, scene), rubber, this.root);
    collar.position.y = .14;
    const footrest = attach(MeshBuilder.CreateTorus('studioPortraitChair_footRing', {
      diameter: .37, thickness: .02, tessellation: 40,
    }, scene), chrome, this.root);
    footrest.position.y = .18;
    const lever = attach(MeshBuilder.CreateTube('studioPortraitChair_heightLever', {
      path: [new Vector3(.03, -.09, 0), new Vector3(.27, -.09, -.06)], radius: .012, tessellation: 10,
    }, scene), rubber);
    lever.metadata.control = 'height';

    character.computeWorldMatrix(true);
    const contact = this.findContact();
    this.contactLocal = Vector3.TransformCoordinates(contact, Matrix.Invert(character.getWorldMatrix()));
    this.followCharacter();
    for (const generator of shadows()) for (const mesh of this.root.getChildMeshes()) generator.addShadowCaster(mesh, false);
    this.observer = scene.onBeforeRenderObservable.add(() => this.followCharacter());
    character.onDisposeObservable.addOnce(() => this.dispose());
  }

  private material(name: string, colour: string, roughness: number, metallic: number): PBRMaterial {
    const material = new PBRMaterial(`studioPortraitChair_${name}`, this.scene);
    material.albedoColor = Color3.FromHexString(colour);
    material.roughness = roughness; material.metallic = metallic; material.maxSimultaneousLights = 8;
    this.materials.push(material);
    return material;
  }

  /** Evaluate the skinned pelvis once per pose, including the fitted trousers. */
  private findContact(): Vector3 {
    const hips = this.character.getChildTransformNodes().find(node => node.name === 'mixamorigHips');
    hips?.computeWorldMatrix(true);
    const hip = hips?.getAbsolutePosition() || this.character.getAbsolutePosition().add(new Vector3(0, .7, 0));
    const front = Vector3.TransformNormal(Vector3.Forward(), this.character.getWorldMatrix()).normalize();
    front.y = 0; front.normalize();
    const side = new Vector3(front.z, 0, -front.x);
    const candidates: Vector3[] = [];
    for (const mesh of this.character.getChildMeshes()) {
      if (!mesh.skeleton || /Eyes|Hair|shoes/i.test(mesh.name)) continue;
      mesh.computeWorldMatrix(true);
      const positions = mesh.getPositionData(true, true);
      if (!positions) continue;
      for (let i = 0; i < positions.length; i += 3) {
        const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, i), mesh.getWorldMatrix());
        const delta = p.subtract(hip), forward = Vector3.Dot(delta, front);
        if (Math.abs(Vector3.Dot(delta, side)) < .2 && forward > -.23 && forward < .025 &&
            delta.y > -.24 && delta.y < .015) candidates.push(p);
      }
    }
    if (!candidates.length) return hip.add(new Vector3(0, -.13, 0));
    const bottom = Math.min(...candidates.map(p => p.y));
    const contactPatch = candidates.filter(p => p.y <= bottom + .015);
    const centre = contactPatch.reduce((sum, p) => sum.addInPlace(p), Vector3.Zero()).scaleInPlace(1 / contactPatch.length);
    centre.y = bottom;
    return centre;
  }

  private followCharacter(): void {
    if (this.disposed || this.character.isDisposed()) return;
    const world = this.character.computeWorldMatrix(true);
    const contact = Vector3.TransformCoordinates(this.contactLocal, world);
    const front = Vector3.TransformNormal(Vector3.Forward(), world).normalize();
    this.root.position.set(contact.x + front.x * .055, 0, contact.z + front.z * .055);
    this.root.rotation.y = Math.atan2(front.x, front.z) - Math.PI;
    this.seat.position.y = contact.y;
    this.stem.scaling.y = Math.max(.1, contact.y - .11);
    this.stem.position.y = .05 + this.stem.scaling.y / 2;
    this.root.metadata.contact = contact.asArray();
    this.root.metadata.seatTopY = this.seat.position.y;
  }

  /**
   * Stop following the character, leaving the chair where it stands.
   *
   * Called when the chair becomes an editable prop: from then on the document
   * owns its transform, and the seat controller must not move it back under
   * the figure on the next frame.
   */
  release(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.observer = null;
    this.root.metadata = { ...this.root.metadata, released: true };
  }

  get isReleased(): boolean {
    return this.observer === null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.onBeforeRenderObservable.remove(this.observer);
    for (const generator of this.shadows()) for (const mesh of this.root.getChildMeshes()) generator.removeShadowCaster(mesh, false);
    this.root.dispose();
    this.materials.forEach(material => material.dispose());
  }
}

import {
  AbstractMesh, Color3, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator,
  SpotLight, Texture, TransformNode, Vector3, VertexData, Light,
} from '@babylonjs/core';

export interface StudioRoomOptions {
  type: 'none' | 'industrial';
  furnishings: boolean;
  practicals: boolean;
}
export const STUDIO_ROOF_LAYER = 0x08000000;
export const DEFAULT_STUDIO_ROOM: StudioRoomOptions = { type: 'industrial', furnishings: true, practicals: true };

/** A measured, modular interior. All visible surfaces are geometry, not a background image. */
export class StudioRoom {
  private root: TransformNode | null = null;
  private furniture: TransformNode | null = null;
  private roof: TransformNode | null = null;
  private materials: PBRMaterial[] = [];
  private practicals: SpotLight[] = [];
  private options: StudioRoomOptions = { type: 'none', furnishings: true, practicals: true };

  constructor(private scene: Scene, private shadows: () => ShadowGenerator[]) {}

  apply(options: StudioRoomOptions): void {
    if (options.type === 'none') this.clear();
    else if (!this.root) this.build();
    this.options = { ...options };
    this.furniture?.setEnabled(options.furnishings);
    this.practicals.forEach(light => light.setEnabled(options.type !== 'none' && options.practicals));
    if (options.type === 'industrial') {
      for (const id of ['backWall', 'rearWall', 'leftWall', 'rightWall']) {
        const wall = this.scene.getMeshByName(id);
        if (wall) wall.isVisible = false;
      }
      this.scene.meshes.filter(m => /^logo.*Wall$/i.test(m.name)).forEach(m => m.isVisible = false);
    }
  }

  getState(): StudioRoomOptions { return { ...this.options }; }

  private material(name: string, colour: string, roughness = .65, metallic = 0, texture?: string): PBRMaterial {
    const m = new PBRMaterial(`studioRoom_${name}`, this.scene);
    m.albedoColor = Color3.FromHexString(colour); m.roughness = roughness; m.metallic = metallic;
    m.maxSimultaneousLights = 8;
    if (texture) {
      const map = new Texture(texture, this.scene);
      map.uScale = 3; map.vScale = 2;
      m.albedoTexture = map;
    }
    this.materials.push(m);
    return m;
  }

  private attach(mesh: Mesh, material: PBRMaterial, parent = this.root!): Mesh {
    mesh.material = material; mesh.parent = parent; mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { studioRoom: true, roomFurnishing: parent === this.furniture };
    return mesh;
  }

  private box(name: string, size: number[], position: number[], mat: PBRMaterial, parent = this.root!): Mesh {
    const m = MeshBuilder.CreateBox(`studioRoom_${name}`, { width: size[0], height: size[1], depth: size[2] }, this.scene);
    m.position.set(position[0], position[1], position[2]);
    return this.attach(m, mat, parent);
  }

  /** Rounded rectangular upholstery, with actual bevel geometry and smooth corner normals. */
  private cushion(name: string, size: number[], position: number[], mat: PBRMaterial): Mesh {
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    const r = Math.min(...size) * .24, steps = 8;
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      const u = (axis + 1) % 3, v = (axis + 2) % 3, start = positions.length / 3;
      for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
        const p = [0, 0, 0]; p[axis] = sign * size[axis] / 2;
        p[u] = (i / steps - .5) * size[u]; p[v] = (j / steps - .5) * size[v];
        const inner = p.map((x, a) => Math.max(-size[a] / 2 + r, Math.min(size[a] / 2 - r, x)));
        const n = new Vector3(p[0] - inner[0], p[1] - inner[1], p[2] - inner[2]).normalize();
        positions.push(inner[0] + n.x * r, inner[1] + n.y * r, inner[2] + n.z * r);
        normals.push(n.x, n.y, n.z); uvs.push(i / steps, j / steps);
        if (i < steps && j < steps) {
          const a = start + j * (steps + 1) + i, b = a + 1, c = a + steps + 1, d = c + 1;
          indices.push(...(sign > 0 ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
        }
      }
    }
    const mesh = new Mesh(`studioRoom_${name}`, this.scene), data = new VertexData();
    data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
    data.applyToMesh(mesh);
    mesh.position.set(position[0], position[1], position[2]);
    return this.attach(mesh, mat, this.furniture!);
  }

  private rod(name: string, a: number[], b: number[], radius: number, mat: PBRMaterial, parent = this.root!): Mesh {
    return this.attach(MeshBuilder.CreateTube(`studioRoom_${name}`, {
      path: [Vector3.FromArray(a), Vector3.FromArray(b)], radius, tessellation: 10, cap: Mesh.CAP_ALL,
    }, this.scene), mat, parent);
  }

  private build(): void {
    this.root = new TransformNode('studioRoom_industrial', this.scene);
    this.furniture = new TransformNode('studioRoom_furnishings', this.scene);
    this.furniture.parent = this.root;
    this.roof = new TransformNode('studioRoom_roof', this.scene);
    this.roof.parent = this.root;
    const steel = this.material('steel', '#303237', .42, .75);
    const dark = this.material('rubber', '#202225', .88);
    const concrete = this.material('concrete', '#878078', .93, 0, '/textures/walls/concrete.png');
    const plaster = this.material('plaster', '#b0a69a', .94, 0, '/textures/walls/plaster.png');
    const wood = this.material('oak', '#856045', .65, 0, '/textures/walls/wood_panels.png');
    const leather = this.material('cognacLeather', '#8f4e2d', .48);
    const chrome = this.material('chrome', '#bfc2c4', .2, 1);
    const warm = this.material('lamp', '#ffead0', .3);
    warm.emissiveColor = new Color3(1, .66, .3);
    const glass = this.material('mirror', '#aab6b9', .13, .96);

    // Interior-facing walls allow an unobstructed cutaway view from outside the room.
    const back = this.attach(MeshBuilder.CreatePlane('studioRoom_backWall', { width: 16, height: 5.4 }, this.scene), concrete);
    back.position.set(0, 2.7, 7.5);
    for (const side of [-1, 1]) {
      const wall = this.attach(MeshBuilder.CreatePlane(`studioRoom_sideWall_${side}`, { width: 17, height: 5.4 }, this.scene), concrete);
      wall.position.set(side * 8, 2.7, -1); wall.rotation.y = side * Math.PI / 2;
      this.box('skirting', [.05, .14, 17], [side * 7.97, .07, -1], steel);
      for (const z of [-7, -2, 3, 7.2]) {
        this.box('column', [.28, 5.4, .3], [side * 7.85, 2.7, z], steel);
      }
    }
    // I beams, roof rails and hanging fixture bodies.
    for (const z of [-7, -2, 3, 7.2]) {
      this.box('beamWeb', [16, .34, .07], [0, 5.12, z], steel, this.roof);
      for (const y of [4.95, 5.3]) this.box('beamFlange', [16, .045, .28], [0, y, z], steel, this.roof);
    }
    for (const x of [-6, 0, 6]) {
      this.box('lightingRail', [.06, .08, 15.5], [x, 4.78, -.2], steel, this.roof);
      for (const z of [-4, .5, 5]) {
        this.rod('fixtureDrop', [x, 4.8, z], [x, 4.5, z], .025, steel, this.roof);
        const can = this.attach(MeshBuilder.CreateCylinder('studioRoom_ceilingLamp', { diameter: .2, height: .28, tessellation: 20 }, this.scene), dark, this.roof);
        can.position.set(x, 4.35, z);
        const bulb = this.attach(MeshBuilder.CreateDisc('studioRoom_ceilingLens', { radius: .085, tessellation: 20, sideOrientation: Mesh.DOUBLESIDE }, this.scene), warm, this.roof);
        bulb.position.set(x, 4.2, z); bulb.rotation.x = Math.PI / 2;
      }
    }
    // Timber dressing wall with real slats and a framed dressing mirror.
    this.box('dressingWall', [3.2, 3, .1], [6, 1.5, 7.35], dark);
    for (let i = 0; i < 28; i++) this.box('oakSlat', [.06, 3, .07], [4.45 + i * .115, 1.5, 7.25], wood);
    this.box('mirrorFrame', [1.25, 1.65, .12], [5.6, 1.72, 6.9], wood, this.furniture);
    this.box('mirrorSurface', [1.07, 1.45, .015], [5.6, 1.72, 6.827], glass, this.furniture);
    for (const x of [5.06, 6.14]) for (let i = 0; i < 6; i++) {
      const bulb = this.attach(MeshBuilder.CreateSphere('studioRoom_vanityBulb', { diameter: .085, segments: 10 }, this.scene), warm, this.furniture);
      bulb.position.set(x, 1.09 + i * .25, 6.74);
    }
    this.box('dressingTable', [2, .1, .75], [5.7, .81, 6.3], wood, this.furniture);
    for (const x of [4.83, 6.57]) for (const z of [6.05, 6.55]) this.rod('tableLeg', [x, .03, z], [x, .76, z], .025, steel, this.furniture);
    // Sofa with separately shaped cushions and backrests.
    this.cushion('sofaBase', [2.8, .24, 1], [-6.2, .35, 2.6], leather);
    for (let i = 0; i < 3; i++) {
      this.cushion('seatCushion', [.84, .17, .82], [-7.08 + i * .88, .55, 2.46], leather);
      const backrest = this.cushion('backCushion', [.84, .68, .2], [-7.08 + i * .88, .87, 2.96], leather);
      backrest.rotation.x = -.12;
    }
    for (const x of [-7.6, -4.8]) this.cushion('sofaArm', [.22, .58, 1.05], [x, .67, 2.6], leather);
    for (const x of [-7.35, -5.05]) for (const z of [2.23, 2.98]) this.rod('sofaLeg', [x, .02, z], [x, .27, z], .045, steel, this.furniture);
    const table = this.attach(MeshBuilder.CreateCylinder('studioRoom_coffeeTable', { diameter: 1.12, height: .06, tessellation: 40 }, this.scene), wood, this.furniture);
    table.position.set(-6.1, .38, .8);
    for (const a of [0, 2.1, 4.2]) this.rod('coffeeLeg', [-6.1 + Math.cos(a) * .37, .02, .8 + Math.sin(a) * .37], [-6.1 + Math.cos(a) * .37, .35, .8 + Math.sin(a) * .37], .02, steel, this.furniture);
    this.box('book', [.35, .035, .24], [-6.1, .44, .8], plaster, this.furniture);
    // Dressing stool, clothes rail and several draped garments.
    this.cushion('stoolSeat', [.55, .1, .5], [5.6, .5, 5.5], leather);
    this.rod('stoolStem', [5.6, .04, 5.5], [5.6, .47, 5.5], .04, chrome, this.furniture);
    for (const x of [6.5, 7.6]) this.rod('rackUpright', [x, .08, 3.6], [x, 1.95, 3.6], .026, chrome, this.furniture);
    this.rod('clothesRail', [6.5, 1.95, 3.6], [7.6, 1.95, 3.6], .026, chrome, this.furniture);
    for (let i = 0; i < 5; i++) {
      const x = 6.66 + i * .19;
      this.rod('hanger', [x - .17, 1.66, 3.6], [x, 1.87, 3.6], .012, wood, this.furniture);
      this.rod('hanger', [x, 1.87, 3.6], [x + .17, 1.66, 3.6], .012, wood, this.furniture);
      const cloth = this.cushion('garment', [.12, .9, .48], [x, 1.2, 3.6], i % 2 ? dark : leather);
      cloth.rotation.y = .25;
    }
    // Equipment cart and coiled floor cables clear of the model's standing area.
    for (const y of [.22, .75]) this.box('cartShelf', [1.05, .055, .62], [3.8, y, -3.7], steel, this.furniture);
    for (const x of [3.31, 4.29]) for (const z of [-3.96, -3.44]) {
      this.rod('cartUpright', [x, .13, z], [x, .95, z], .025, steel, this.furniture);
      const wheel = this.attach(MeshBuilder.CreateCylinder('studioRoom_cartWheel', { diameter: .13, height: .07, tessellation: 14 }, this.scene), dark, this.furniture);
      wheel.position.set(x, .065, z); wheel.rotation.z = Math.PI / 2;
    }
    this.cushion('equipmentCase', [.62, .22, .43], [3.8, .9, -3.7], dark);
    for (let i = 0; i < 3; i++) {
      const cable = Array.from({ length: 50 }, (_, j) => {
        const t = j / 49;
        return new Vector3(-3.5 + i * .12 + Math.sin(t * 5) * .8, .012, -2 - t * 5);
      });
      this.attach(MeshBuilder.CreateTube('studioRoom_cable', { path: cable, radius: .008, tessellation: 6 }, this.scene), dark, this.furniture);
    }
    // Plant leaves have curved surfaces, stems and genuine silhouettes from every angle.
    const green = this.material('leaves', '#344e2b', .72); green.backFaceCulling = false;
    const pot = this.attach(MeshBuilder.CreateCylinder('studioRoom_planter', { diameterTop: .5, diameterBottom: .35, height: .55, tessellation: 32 }, this.scene), plaster, this.furniture);
    pot.position.set(-6.4, .275, 4.7);
    for (let i = 0; i < 17; i++) {
      const angle = i * 2.4, height = .95 + (i % 5) * .19;
      const tip = new Vector3(-6.4 + Math.cos(angle) * .72, height, 4.7 + Math.sin(angle) * .72);
      this.rod('plantStem', [-6.4, .52, 4.7], tip.asArray(), .011, green, this.furniture);
      const sides = [-1, 1].map(sign => Array.from({ length: 9 }, (_, j) => {
        const t = j / 8, width = Math.sin(t * Math.PI) * .15 * sign;
        return new Vector3(tip.x + Math.cos(angle) * t * .5 - Math.sin(angle) * width,
          tip.y + Math.sin(t * Math.PI) * .12 - t * .25, tip.z + Math.sin(angle) * t * .5 + Math.cos(angle) * width);
      }));
      this.attach(MeshBuilder.CreateRibbon('studioRoom_leaf', { pathArray: sides, sideOrientation: Mesh.DOUBLESIDE }, this.scene), green, this.furniture);
    }
    // Two warm practical lights, independent of the photographic lighting controls.
    for (const x of [-6, 6]) {
      const light = new SpotLight(`studioRoom_practical_${x}`, new Vector3(x, 4.3, 4.8), new Vector3(0, -1, .4).normalize(), Math.PI / 2, 1.5, this.scene);
      light.diffuse = new Color3(1, .76, .5); light.specular = light.diffuse.clone();
      light.intensity = 85; light.falloffType = Light.FALLOFF_PHYSICAL;
      this.practicals.push(light);
    }
    // Batch static parts with the same material to keep the room affordable on mobile GPUs.
    for (const parent of [this.root, this.furniture, this.roof]) {
      const direct = parent.getChildMeshes(true).filter(m => m instanceof Mesh) as Mesh[];
      for (const material of this.materials) {
        const parts = direct.filter(m => m.material === material);
        if (parts.length < 2) continue;
        parts.forEach(m => m.computeWorldMatrix(true));
        const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
        if (merged) { merged.name = `studioRoom_${parent === this.furniture ? 'furniture' : 'shell'}_${material.name}`; this.attach(merged, material, parent); }
      }
    }
    this.roof.getChildMeshes().forEach(mesh => mesh.layerMask = STUDIO_ROOF_LAYER);
    const meshes = this.root.getChildMeshes();
    this.shadows().forEach(generator => meshes.forEach(mesh => generator.addShadowCaster(mesh, false)));
  }

  clear(): void {
    if (!this.root) return;
    const meshes = this.root.getChildMeshes();
    this.shadows().forEach(generator => meshes.forEach(mesh => generator.removeShadowCaster(mesh, false)));
    this.practicals.forEach(light => light.dispose()); this.practicals = [];
    this.root.dispose(false, false); this.root = this.furniture = this.roof = null;
    this.materials.forEach(material => material.dispose(true, true)); this.materials = [];
  }
}

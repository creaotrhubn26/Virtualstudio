import {
  AbstractMesh, Color3, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator,
  SpotLight, Texture, TransformNode, Vector3, VertexData, Light,
} from '@babylonjs/core';
import { boardTexture, brandMaterial, logoTexture, posterTexture, signTexture } from './brandTextures';
import { DEFAULT_BRAND, normaliseBrand, sameBrand, type StudioBrand } from '../../services/studioBranding';

/**
 * The places the studio can build.
 *
 * Every one is geometry in metres, built from the same primitives as the
 * industrial studio — no background images, so the taking camera can stand
 * anywhere in the room and the light falls on real surfaces.
 */
export type StudioRoomType = 'none' | 'industrial' | 'kitchen' | 'hospital' | 'pizzeria';

export interface StudioRoomOptions {
  type: StudioRoomType;
  furnishings: boolean;
  practicals: boolean;
  /** Whose place it is. Drawn onto the signs, and lighting the room from them. */
  brand?: StudioBrand;
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
  private brand: StudioBrand = DEFAULT_BRAND;

  constructor(private scene: Scene, private shadows: () => ShadowGenerator[]) {}

  apply(options: StudioRoomOptions): void {
    // A different place is a different room, so the old one goes rather than
    // standing inside the new one. A new name over the door means new signs,
    // which are painted at build time, so that is a rebuild too.
    const brand = normaliseBrand(options.brand ?? this.brand);
    if (options.type === 'none' || options.type !== this.options.type || !sameBrand(brand, this.brand)) {
      this.clear();
    }
    this.brand = brand;
    if (options.type !== 'none' && !this.root) this.build(options.type);
    this.options = { ...options, brand };
    this.furniture?.setEnabled(options.furnishings);
    this.practicals.forEach(light => light.setEnabled(options.type !== 'none' && options.practicals));
    if (options.type !== 'none') {
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

  private attach(mesh: Mesh, material: PBRMaterial, parent: TransformNode | null = null): Mesh {
    const under = parent ?? this.root!;
    mesh.material = material; mesh.parent = under; mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { studioRoom: true, roomFurnishing: under === this.furniture };
    return mesh;
  }

  private box(name: string, size: number[], position: number[], mat: PBRMaterial, parent: TransformNode | null = null): Mesh {
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

  private rod(name: string, a: number[], b: number[], radius: number, mat: PBRMaterial, parent: TransformNode | null = null): Mesh {
    return this.attach(MeshBuilder.CreateTube(`studioRoom_${name}`, {
      path: [Vector3.FromArray(a), Vector3.FromArray(b)], radius, tessellation: 10, cap: Mesh.CAP_ALL,
    }, this.scene), mat, parent);
  }

  /**
   * Walls and a ceiling, interior-facing.
   *
   * The planes face inwards so the editor can look into the room from outside
   * without the far wall in the way, and the ceiling goes on the roof node so
   * it cuts away for a high viewpoint like the studio's does.
   */
  private shell(width: number, depth: number, height: number, wall: PBRMaterial, ceiling: PBRMaterial): void {
    const back = this.attach(MeshBuilder.CreatePlane('studioRoom_backWallPlane', { width, height }, this.scene), wall);
    back.position.set(0, height / 2, depth / 2);
    const front = this.attach(MeshBuilder.CreatePlane('studioRoom_frontWallPlane', { width, height }, this.scene), wall);
    front.position.set(0, height / 2, -depth / 2); front.rotation.y = Math.PI;
    for (const side of [-1, 1]) {
      const plane = this.attach(MeshBuilder.CreatePlane(`studioRoom_sidePlane_${side}`, { width: depth, height }, this.scene), wall);
      plane.position.set(side * width / 2, height / 2, 0); plane.rotation.y = side * Math.PI / 2;
    }
    const lid = this.attach(MeshBuilder.CreatePlane('studioRoom_ceilingPlane', { width, height: depth }, this.scene), ceiling, this.roof!);
    lid.position.set(0, height, 0); lid.rotation.x = -Math.PI / 2;
  }

  private build(type: Exclude<StudioRoomType, 'none'>): void {
    this.root = new TransformNode(`studioRoom_${type}`, this.scene);
    this.furniture = new TransformNode('studioRoom_furnishings', this.scene);
    this.furniture.parent = this.root;
    this.roof = new TransformNode('studioRoom_roof', this.scene);
    this.roof.parent = this.root;
    if (type === 'kitchen') this.buildKitchen();
    else if (type === 'hospital') this.buildHospital();
    else if (type === 'pizzeria') this.buildPizzeria();
    else this.buildIndustrial();
    this.finishRoom();
  }

  private buildIndustrial(): void {
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
  }

  /**
   * A domestic kitchen, 5.4 by 4.6 metres.
   *
   * Built for the case it was asked for: a cooking or health-training video
   * shot across the table, with a counter run behind, daylight from the left
   * and a pendant over the table. The subject stands at the origin, so the
   * camera has three metres to back into and the counter reads behind the
   * shoulder at a normal working height of 0.9 m.
   */
  private buildKitchen(): void {
    const roof = this.roof!, furniture = this.furniture!;
    const plaster = this.material('kitchenWall', '#d9d3c8', .94, 0, '/textures/walls/plaster.png');
    const ceiling = this.material('kitchenCeiling', '#f0ece6', .95);
    const cabinet = this.material('cabinet', '#3f5348', .58);
    const worktop = this.material('worktop', '#9a9389', .38, .05);
    const wood = this.material('kitchenOak', '#9c7449', .62, 0, '/textures/walls/wood_panels.png');
    const steel = this.material('kitchenSteel', '#b9bec2', .28, .9);
    const dark = this.material('kitchenDark', '#232629', .8);
    const daylight = this.material('windowGlass', '#e8f1ff', .1);
    daylight.emissiveColor = new Color3(.78, .85, 1);
    const warm = this.material('kitchenLamp', '#fff0d6', .3);
    warm.emissiveColor = new Color3(1, .72, .38);

    this.shell(5.4, 4.6, 2.5, plaster, ceiling);
    this.box('kitchenSkirting', [5.4, .09, .03], [0, .045, 2.27], wood);

    // Counter run along the back wall, with a splashback and wall units over it.
    this.box('counterBody', [4.4, .86, .6], [-.3, .43, 1.98], cabinet);
    this.box('counterTop', [4.5, .04, .64], [-.3, .88, 1.96], worktop);
    this.box('splashback', [4.4, .5, .02], [-.3, 1.15, 2.27], worktop);
    for (let i = 0; i < 5; i++) {
      // A groove between the doors, so the run does not read as one slab.
      this.box('counterGap', [.02, .8, .01], [-2.4 + i * .88, .46, 1.675], dark);
    }
    this.box('wallUnit', [3.4, .72, .34], [-.8, 1.9, 2.1], cabinet);
    for (const x of [-2.3, -1.45, -.6, .25]) this.box('wallUnitGap', [.015, .66, .01], [x, 1.9, 1.925], dark);
    this.box('extractorHood', [.9, .4, .5], [1.35, 2.05, 2.03], steel);
    this.rod('hoodPipe', [1.35, 2.25, 2.2], [1.35, 2.5, 2.2], .08, steel);

    // Sink, tap and hob: what makes it read as a kitchen rather than a counter.
    this.box('sinkBasin', [.72, .16, .44], [-1.6, .82, 1.96], steel);
    this.rod('tapColumn', [-1.6, .9, 2.18], [-1.6, 1.22, 2.18], .018, steel);
    this.rod('tapSpout', [-1.6, 1.22, 2.18], [-1.6, 1.18, 1.95], .016, steel);
    this.box('hob', [.62, .015, .52], [1.35, .905, 1.96], dark);
    for (const [hx, hz] of [[1.2, 1.84], [1.5, 1.84], [1.2, 2.08], [1.5, 2.08]]) {
      const ring = this.attach(MeshBuilder.CreateTorus('studioRoom_hobRing',
        { diameter: .17, thickness: .012, tessellation: 20 }, this.scene), steel);
      ring.position.set(hx, .915, hz);
    }
    const fridge = this.box('fridge', [.7, 1.85, .68], [2.35, .925, 1.94], steel);
    fridge.metadata = { ...fridge.metadata, studioObjectKey: 'kitchenFridge' };
    this.box('fridgeSeam', [.68, .015, .01], [2.35, 1.15, 1.6], dark);

    // Window on the left wall: a real opening, so the daylight look has
    // something in shot to have come from.
    this.box('windowFrame', [.08, 1.3, 1.7], [-2.66, 1.45, .2], wood);
    const pane = this.attach(MeshBuilder.CreatePlane('studioRoom_windowPane',
      { width: 1.6, height: 1.2 }, this.scene), daylight);
    pane.position.set(-2.64, 1.45, .2); pane.rotation.y = -Math.PI / 2;
    this.box('windowSill', [.16, .04, 1.72], [-2.6, .82, .2], wood);

    // The table the shot is built around, with four chairs.
    this.box('tableTop', [1.7, .06, .9], [0, .74, -.7], wood, furniture);
    for (const tx of [-.76, .76]) for (const tz of [-1.09, -.31]) {
      this.rod('tableLegKitchen', [tx, .02, tz], [tx, .71, tz], .035, wood, furniture);
    }
    for (const [cx, cz, turn] of [[-.55, -1.5, 0], [.55, -1.5, 0], [-.55, .1, Math.PI], [.55, .1, Math.PI]]) {
      const seat = this.box('chairSeat', [.44, .05, .44], [cx, .45, cz], wood, furniture);
      const back = this.box('chairBack', [.44, .46, .04], [cx, .69, cz + (turn ? -.2 : .2)], wood, furniture);
      back.rotation.x = turn ? -.06 : .06;
      seat.rotation.y = turn;
      for (const lx of [cx - .18, cx + .18]) for (const lz of [cz - .18, cz + .18]) {
        this.rod('chairLeg', [lx, .02, lz], [lx, .43, lz], .018, wood, furniture);
      }
    }
    this.box('breadBoard', [.34, .02, .24], [-.35, .78, -.62], wood, furniture);
    const bowl = this.attach(MeshBuilder.CreateSphere('studioRoom_fruitBowl',
      { diameter: .26, segments: 14, slice: .5 }, this.scene), worktop, furniture);
    bowl.position.set(.45, .77, -.7); bowl.rotation.x = Math.PI;

    // Pendant over the table and a warm ceiling fitting, both practical.
    this.rod('pendantCord', [0, 2.5, -.7], [0, 1.95, -.7], .008, dark, roof);
    const shade = this.attach(MeshBuilder.CreateCylinder('studioRoom_pendantShade',
      { diameterTop: .12, diameterBottom: .34, height: .22, tessellation: 24 }, this.scene), dark, roof);
    shade.position.set(0, 1.84, -.7);
    const glow = this.attach(MeshBuilder.CreateDisc('studioRoom_pendantLens',
      { radius: .16, tessellation: 20, sideOrientation: Mesh.DOUBLESIDE }, this.scene), warm, roof);
    glow.position.set(0, 1.73, -.7); glow.rotation.x = Math.PI / 2;

    const pendant = new SpotLight('studioRoom_practical_pendant',
      new Vector3(0, 1.72, -.7), new Vector3(0, -1, 0), Math.PI / 1.6, 1.4, this.scene);
    pendant.diffuse = new Color3(1, .78, .54); pendant.specular = pendant.diffuse.clone();
    pendant.intensity = 14; pendant.falloffType = Light.FALLOFF_PHYSICAL;
    this.practicals.push(pendant);
    const under = new SpotLight('studioRoom_practical_undercabinet',
      new Vector3(-.3, 1.5, 2.05), new Vector3(0, -1, -.35).normalize(), Math.PI / 1.8, 1.2, this.scene);
    under.diffuse = new Color3(1, .9, .78); under.specular = under.diffuse.clone();
    under.intensity = 6; under.falloffType = Light.FALLOFF_PHYSICAL;
    this.practicals.push(under);
  }

  /**
   * A single treatment room, 5 by 5 metres.
   *
   * The room a health-training video is actually shot in: a bed with rails on
   * wheels, an overbed table, a drip stand, a monitor and a curtain rail. Pale
   * and hard-surfaced, because that is what the light bounces off.
   */
  private buildHospital(): void {
    const roof = this.roof!, furniture = this.furniture!;
    const wall = this.material('wardWall', '#dfe4e2', .92, 0, '/textures/walls/plaster.png');
    const ceiling = this.material('wardCeiling', '#f2f5f4', .94);
    const vinyl = this.material('wardDado', '#8fa6ad', .7);
    const steel = this.material('wardSteel', '#c3c8cb', .3, .85);
    const linen = this.material('wardLinen', '#f4f6f7', .85);
    const blanket = this.material('wardBlanket', '#7fa7b8', .88);
    const curtain = this.material('wardCurtain', '#9fb9a8', .9);
    curtain.backFaceCulling = false;
    const dark = this.material('wardDark', '#2a2f33', .75);
    const tube = this.material('wardTube', '#f6fbff', .3);
    tube.emissiveColor = new Color3(.85, .93, 1);

    this.shell(5, 5, 2.7, wall, ceiling);
    // A wipe-clean dado rail at hand height, the detail that dates a ward.
    for (const side of [-1, 1]) this.box('wardDadoSide', [.02, .12, 5], [side * 2.49, .95, 0], vinyl);
    this.box('wardDadoBack', [5, .12, .02], [0, .95, 2.49], vinyl);

    // The bed, at working height with the rails up.
    this.box('bedFrame', [.95, .18, 2.05], [-.1, .56, .55], steel, furniture);
    this.cushion('mattress', [.92, .16, 2], [-.1, .73, .55], linen);
    this.cushion('pillow', [.56, .12, .34], [-.1, .84, 1.35], linen);
    this.cushion('bedBlanket', [.94, .06, 1.15], [-.1, .82, .15], blanket);
    for (const x of [-.58, .38]) {
      this.rod('bedRail', [x, .92, -.05], [x, .92, .85], .018, steel, furniture);
      for (const z of [-.05, .4, .85]) this.rod('bedRailPost', [x, .74, z], [x, .92, z], .014, steel, furniture);
    }
    this.box('bedHead', [.95, .55, .05], [-.1, .82, 1.6], linen, furniture);
    this.box('bedFoot', [.95, .4, .05], [-.1, .75, -.5], linen, furniture);
    for (const wx of [-.5, .3]) for (const wz of [-.4, 1.5]) {
      const castor = this.attach(MeshBuilder.CreateCylinder('studioRoom_bedCastor',
        { diameter: .12, height: .05, tessellation: 14 }, this.scene), dark, furniture);
      castor.position.set(wx, .06, wz); castor.rotation.z = Math.PI / 2;
      this.rod('bedLeg', [wx, .12, wz], [wx, .48, wz], .025, steel, furniture);
    }

    // Overbed table, drip stand and monitor: what the hands in shot reach for.
    this.box('overbedTop', [.8, .04, .42], [.75, .95, .5], linen, furniture);
    this.rod('overbedStem', [.95, .06, .5], [.95, .93, .5], .022, steel, furniture);
    this.box('overbedFoot', [.5, .04, .3], [.95, .04, .5], steel, furniture);
    this.rod('dripPole', [-1.15, .06, 1.35], [-1.15, 1.95, 1.35], .016, steel, furniture);
    this.rod('dripArm', [-1.15, 1.9, 1.35], [-.95, 1.9, 1.35], .012, steel, furniture);
    const bag = this.cushion('dripBag', [.14, .26, .06], [-.95, 1.72, 1.35], linen);
    bag.rotation.z = .04;
    for (const a of [0, 2.1, 4.2]) {
      this.rod('dripFoot', [-1.15, .05, 1.35],
        [-1.15 + Math.cos(a) * .3, .05, 1.35 + Math.sin(a) * .3], .012, steel, furniture);
    }
    this.box('monitorArm', [.06, .06, .5], [1.1, 1.75, 1.95], steel, furniture);
    const screen = this.box('monitorScreen', [.42, .3, .05], [1.1, 1.75, 1.68], dark, furniture);
    screen.rotation.y = -.35;

    // Curtain rail and a drawn curtain, the ward's own way of framing a shot.
    this.rod('curtainRail', [-2.3, 2.45, -.6], [.9, 2.45, -.6], .014, steel, roof);
    for (let i = 0; i < 26; i++) {
      const x = -2.25 + i * .12;
      const fold = this.box('curtainFold', [.12, 2, .06], [x, 1.4, -.6 + Math.sin(i * 1.1) * .06], curtain);
      fold.rotation.y = Math.sin(i * 1.1) * .18;
    }

    // Basin by the door, and the tube lighting that makes ward light flat.
    this.box('wardBasin', [.5, .18, .38], [2.1, .85, -1.6], linen);
    this.rod('wardTap', [2.1, .94, -1.42], [2.1, 1.16, -1.42], .014, steel);
    this.box('wardDispenser', [.12, .22, .08], [2.1, 1.45, -1.78], linen);
    for (const z of [-1.2, .8]) {
      this.box('wardTubeHousing', [1.5, .09, .22], [0, 2.66, z], linen, roof);
      const lens = this.attach(MeshBuilder.CreatePlane('studioRoom_wardTubeLens',
        { width: 1.4, height: .16 }, this.scene), tube, roof);
      lens.position.set(0, 2.6, z); lens.rotation.x = Math.PI / 2;
      const light = new SpotLight(`studioRoom_practical_ward_${z}`,
        new Vector3(0, 2.58, z), new Vector3(0, -1, 0), Math.PI / 1.5, 1.1, this.scene);
      light.diffuse = new Color3(.92, .96, 1); light.specular = light.diffuse.clone();
      light.intensity = 26; light.falloffType = Light.FALLOFF_PHYSICAL;
      this.practicals.push(light);
    }
  }

  /**
   * A pizzeria, 7 by 6 metres, with a wood-fired oven that is actually alight.
   *
   * The oven is the point: it is the brightest thing in the room, it is warm,
   * it is low, and it is in shot. Everything else — the marble pass, the
   * tables under their pendants, the bottle shelf — is arranged so a camera at
   * the front of the room sees the fire behind whoever is standing at the
   * origin.
   */
  private buildPizzeria(): void {
    const roof = this.roof!, furniture = this.furniture!;
    const brick = this.material('pizzeriaBrick', '#7a4a3a', .88, 0, '/textures/walls/concrete.png');
    const plaster = this.material('pizzeriaPlaster', '#cbb79c', .93, 0, '/textures/walls/plaster.png');
    const ceiling = this.material('pizzeriaCeiling', '#2b2420', .9);
    const wood = this.material('pizzeriaWood', '#6d4526', .66, 0, '/textures/walls/wood_panels.png');
    const marble = this.material('pizzeriaMarble', '#d8d4cb', .26, .06);
    const steel = this.material('pizzeriaSteel', '#adb2b6', .3, .88);
    const dark = this.material('pizzeriaDark', '#1d1a18', .8);
    const fire = this.material('ovenFire', '#ff9236', .4);
    fire.emissiveColor = new Color3(1, .42, .1);
    const bulb = this.material('pizzeriaBulb', '#ffe2b0', .3);
    bulb.emissiveColor = new Color3(1, .68, .34);

    this.shell(7, 6, 3, plaster, ceiling);
    // The back wall is brick, because that is the wall the oven is built into.
    const backBrick = this.attach(MeshBuilder.CreatePlane('studioRoom_pizzeriaBrickWall',
      { width: 7, height: 3 }, this.scene), brick);
    backBrick.position.set(0, 1.5, 2.96);

    // The oven: a brick dome on a plinth, with a live mouth and a flue.
    const plinth = this.box('ovenPlinth', [2, 1, 1.5], [2.1, .5, 2.1], brick);
    plinth.metadata = { ...plinth.metadata, studioObjectKey: 'pizzeriaOven' };
    const dome = this.attach(MeshBuilder.CreateSphere('studioRoom_ovenDome',
      { diameter: 1.9, segments: 22, slice: .5 }, this.scene), brick);
    dome.position.set(2.1, 1, 2.1); dome.scaling.z = .82;
    this.box('ovenArch', [1.1, .62, .18], [2.1, 1.28, 1.36], dark);
    const mouth = this.attach(MeshBuilder.CreatePlane('studioRoom_ovenMouth',
      { width: .82, height: .46 }, this.scene), fire);
    mouth.position.set(2.1, 1.26, 1.26); mouth.rotation.y = Math.PI;
    // Embers on the oven floor, visible through the mouth.
    const embers = this.attach(MeshBuilder.CreatePlane('studioRoom_ovenEmbers',
      { width: .8, height: .7, sideOrientation: Mesh.DOUBLESIDE }, this.scene), fire);
    embers.position.set(2.1, 1.02, 1.75); embers.rotation.x = -Math.PI / 2;
    this.rod('ovenFlue', [2.1, 1.9, 2.1], [2.1, 3, 2.1], .12, dark, roof);
    for (let i = 0; i < 3; i++) {
      this.rod('ovenLogEdge', [1.35, .04 + i * .16, -.1], [1.35, .04 + i * .16, .4], .07, wood, furniture);
    }

    // The pass: marble top, wooden front, peels hung on the wall beside it.
    this.box('passBody', [3, .95, .7], [-1.8, .475, 2.3], wood);
    this.box('passTop', [3.1, .06, .78], [-1.8, .98, 2.28], marble);
    this.box('passRail', [3, .04, .3], [-1.8, 1.32, 2.05], steel);
    for (let i = 0; i < 3; i++) {
      const x = -3 + i * .28;
      this.rod('peelHandle', [x, 1.55, 2.9], [x, 2.35, 2.9], .018, wood);
      this.box('peelBlade', [.26, .3, .015], [x, 1.42, 2.9], steel);
    }
    this.box('chalkboard', [1.5, .9, .05], [.2, 2.15, 2.92], dark);
    // Bottles on a shelf above the pass: small, but it reads as a restaurant.
    this.box('bottleShelf', [2.4, .05, .26], [-1.8, 1.75, 2.85], wood);
    for (let i = 0; i < 9; i++) {
      const bottle = this.attach(MeshBuilder.CreateCylinder('studioRoom_bottle',
        { diameterTop: .05, diameterBottom: .09, height: .3, tessellation: 12 }, this.scene), i % 3 ? dark : wood);
      bottle.position.set(-2.85 + i * .26, 1.93, 2.85);
    }

    // Tables, under their own pendants, at the front where the camera is.
    for (const [tx, tz] of [[-1.9, -1.5], [1.6, -1.9], [-.3, .4]]) {
      const top = this.attach(MeshBuilder.CreateCylinder('studioRoom_pizzeriaTable',
        { diameter: .92, height: .06, tessellation: 32 }, this.scene), marble, furniture);
      top.position.set(tx, .74, tz);
      this.rod('pizzeriaTableStem', [tx, .04, tz], [tx, .72, tz], .045, steel, furniture);
      const foot = this.attach(MeshBuilder.CreateCylinder('studioRoom_pizzeriaTableFoot',
        { diameter: .5, height: .04, tessellation: 24 }, this.scene), steel, furniture);
      foot.position.set(tx, .02, tz);

      for (const turn of [0, Math.PI]) {
        const cz = tz + (turn ? .72 : -.72);
        const seat = this.box('pizzeriaSeat', [.42, .05, .42], [tx, .46, cz], wood, furniture);
        seat.rotation.y = turn;
        const back = this.box('pizzeriaBack', [.42, .44, .04], [tx, .68, cz + (turn ? .19 : -.19)], wood, furniture);
        back.rotation.x = turn ? .07 : -.07;
        for (const lx of [tx - .17, tx + .17]) for (const lz of [cz - .17, cz + .17]) {
          this.rod('pizzeriaChairLeg', [lx, .02, lz], [lx, .44, lz], .016, wood, furniture);
        }
      }

      // A candle on every table, and the pendant over it.
      const candle = this.attach(MeshBuilder.CreateCylinder('studioRoom_candle',
        { diameter: .06, height: .12, tessellation: 12 }, this.scene), marble, furniture);
      candle.position.set(tx + .2, .83, tz);
      const flame = this.attach(MeshBuilder.CreateSphere('studioRoom_candleFlame',
        { diameter: .045, segments: 8 }, this.scene), fire, furniture);
      flame.position.set(tx + .2, .91, tz);

      this.rod('pizzeriaCord', [tx, 3, tz], [tx, 1.98, tz], .007, dark, roof);
      const shade = this.attach(MeshBuilder.CreateCylinder('studioRoom_pizzeriaShade',
        { diameterTop: .08, diameterBottom: .28, height: .2, tessellation: 20 }, this.scene), dark, roof);
      shade.position.set(tx, 1.88, tz);
      const lens = this.attach(MeshBuilder.CreateDisc('studioRoom_pizzeriaLens',
        { radius: .13, tessellation: 18, sideOrientation: Mesh.DOUBLESIDE }, this.scene), bulb, roof);
      lens.position.set(tx, 1.78, tz); lens.rotation.x = Math.PI / 2;

      const pendant = new SpotLight(`studioRoom_practical_pizzeria_${tx}_${tz}`,
        new Vector3(tx, 1.77, tz), new Vector3(0, -1, 0), Math.PI / 1.7, 1.5, this.scene);
      pendant.diffuse = new Color3(1, .74, .46); pendant.specular = pendant.diffuse.clone();
      pendant.intensity = 9; pendant.falloffType = Light.FALLOFF_PHYSICAL;
      this.practicals.push(pendant);
    }

    this.brandPizzeria();

    // The fire itself, throwing light forward out of the mouth. Low, warm and
    // directional, the way an oven actually lights a room.
    const oven = new SpotLight('studioRoom_practical_oven',
      new Vector3(2.1, 1.24, 1.3), new Vector3(-.35, -.12, -1).normalize(), Math.PI / 1.9, 1.6, this.scene);
    oven.diffuse = new Color3(1, .48, .18); oven.specular = oven.diffuse.clone();
    oven.intensity = 40; oven.falloffType = Light.FALLOFF_PHYSICAL;
    this.practicals.push(oven);
  }

  /**
   * The name over the pass, the mark on the wall, the poster and the board.
   *
   * These are the surfaces that make the room somebody's rather than a
   * pizzeria in general. The band and the board are lit from within like the
   * real ones, so the brand colour reaches the room as light: a red mark puts
   * red on the face of whoever stands under it, which is the whole reason the
   * place is geometry and not a photograph.
   */
  private brandPizzeria(): void {
    const furniture = this.furniture!;
    const brand = this.brand;
    const dark = this.material('brandCasing', '#141210', .72);

    const signMaterial = brandMaterial(this.scene, 'sign', signTexture(this.scene, brand), brand, .55);
    const logoMaterial = brandMaterial(this.scene, 'logo', logoTexture(this.scene, brand), brand, .5);
    const boardMaterial = brandMaterial(this.scene, 'board', boardTexture(this.scene, brand), brand, .38);
    const posterMaterial = brandMaterial(this.scene, 'poster', posterTexture(this.scene, brand), brand, .08);
    // Dispose with the room: these carry a dynamic texture each.
    this.materials.push(signMaterial, logoMaterial, boardMaterial, posterMaterial);

    // The band over the pass, in its own casing so it reads as a lit box.
    this.box('signCasing', [3.4, .72, .12], [-1.8, 2.35, 2.9], dark);
    const band = this.attach(MeshBuilder.CreatePlane('studioRoom_brandSign',
      { width: 3.2, height: .56 }, this.scene), signMaterial);
    band.position.set(-1.8, 2.35, 2.83);

    // The round mark, on the brick beside the oven.
    const markPlate = this.attach(MeshBuilder.CreateCylinder('studioRoom_brandMarkPlate',
      { diameter: .96, height: .07, tessellation: 40 }, this.scene), dark);
    markPlate.position.set(.75, 2.25, 2.9); markPlate.rotation.x = Math.PI / 2;
    const mark = this.attach(MeshBuilder.CreatePlane('studioRoom_brandLogo',
      { width: .88, height: .88 }, this.scene), logoMaterial);
    mark.position.set(.75, 2.25, 2.84);

    // The poster, framed, on the left wall where a menu hangs.
    this.box('posterFrame', [.06, 1.08, .78], [-3.46, 1.6, -.4], dark);
    const poster = this.attach(MeshBuilder.CreatePlane('studioRoom_brandPoster',
      { width: .7, height: 1 }, this.scene), posterMaterial);
    poster.position.set(-3.43, 1.6, -.4); poster.rotation.y = -Math.PI / 2;

    // The board by the door, the one that stands on the pavement.
    this.box('boardBody', [.66, 1.36, .14], [-2.9, .68, -2.2], dark, furniture);
    this.box('boardFoot', [.8, .08, .38], [-2.9, .04, -2.2], dark, furniture);
    const board = this.attach(MeshBuilder.CreatePlane('studioRoom_brandBoard',
      { width: .56, height: 1.16 }, this.scene), boardMaterial, furniture);
    board.position.set(-2.9, .74, -2.28); board.rotation.y = Math.PI;

    // What the sign throws back into the room. Weak, wide and the brand's own
    // colour: a sign is a source, just a modest one.
    const glow = new SpotLight('studioRoom_practical_sign',
      new Vector3(-1.8, 2.3, 2.7), new Vector3(0, -.35, -1).normalize(), Math.PI / 1.5, 1.1, this.scene);
    glow.diffuse = Color3.FromHexString(brand.accent).scale(.6).add(new Color3(.4, .32, .26));
    glow.specular = glow.diffuse.clone();
    glow.intensity = 5; glow.falloffType = Light.FALLOFF_PHYSICAL;
    this.practicals.push(glow);
  }

  /** Batching, roof layer and shadow casting, whichever place was built. */
  private finishRoom(): void {
    // Batch static parts with the same material to keep the room affordable on mobile GPUs.
    for (const parent of [this.root!, this.furniture!, this.roof!]) {
      const direct = parent.getChildMeshes(true).filter(m => m instanceof Mesh) as Mesh[];
      for (const material of this.materials) {
        const parts = direct.filter(m => m.material === material);
        if (parts.length < 2) continue;
        parts.forEach(m => m.computeWorldMatrix(true));
        const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
        if (merged) { merged.name = `studioRoom_${parent === this.furniture ? 'furniture' : 'shell'}_${material.name}`; this.attach(merged, material, parent); }
      }
    }
    this.roof!.getChildMeshes().forEach(mesh => mesh.layerMask = STUDIO_ROOF_LAYER);
    const meshes = this.root!.getChildMeshes();
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

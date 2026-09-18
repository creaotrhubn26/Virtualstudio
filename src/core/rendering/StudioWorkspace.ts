import { sceneCompressionService } from '../../services/sceneCompressionService';
import { parseStudioDocument } from '../../services/studioDocument';
import type { SceneComposition } from '../models/sceneComposer';
import { STUDIO_ROOF_LAYER } from './StudioRoom';
import { environmentService } from '../services/environmentService';
import {
  ArcRotateCamera, Camera, Constants, DefaultRenderingPipeline, FreeCamera,
  ImageProcessingPostProcess, Mesh, MeshBuilder, RenderTargetTexture, Scene, Texture, Vector3, Color3,
} from '@babylonjs/core';
import './studioWorkspace.css';

export type StudioView = 'studio' | 'camera' | 'top' | 'front' | 'side';
const viewNames: Record<StudioView, string> = {
  studio: 'Studio', camera: 'Kamera', top: 'Ovenfra', front: 'Forfra', side: 'Fra siden',
};
const HELPER_LAYER = 0x10000000;

/** Navigation never changes the taking camera unless the operator explicitly matches it. */
export class StudioWorkspace {
  readonly navigationCamera: ArcRotateCamera;
  private view: StudioView = 'studio';
  private orbit = { alpha: -Math.PI / 2 - 0.08, beta: 1.44, radius: 11, target: new Vector3(0, 1.4, 1) };
  private toolbar: HTMLElement;
  private preview: HTMLElement;
  private previewCanvas: HTMLCanvasElement;
  private modelPanel: HTMLElement;
  private sequencePanel!: HTMLElement;
  private environmentPanel: HTMLElement;
  private unsubscribeEnvironment: () => void;
  private previewCamera: FreeCamera;
  private previewTarget: RenderTargetTexture;
  private cameraMarker: Mesh;
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private lastPreview = 0;
  private reading = false;
  private disposed = false;
  private observer: ReturnType<Scene['onBeforeRenderObservable']['add']>;

  constructor(
    private scene: Scene,
    private shot: ArcRotateCamera,
    private canvas: HTMLCanvasElement,
    private pipeline: DefaultRenderingPipeline | null,
    private getSettings: () => { focalLength: number; aperture: number; iso: number; shutter: string },
    private characterControls: {
      load: (model: 'woman' | 'man') => Promise<void>;
      pose: (pose: 'StudioStand' | 'StudioPortrait' | 'StudioSeated') => boolean;
      frame: (portrait: boolean) => void;
      stand: () => boolean;
      seated: () => boolean;
      editPose: (enabled: boolean) => boolean;
      wardrobe: () => { id: string; label: string; slot: string }[];
      moves: () => { id: string; label: string; hint: string; kind: string }[];
      addMove: (move: string, options: { duration: number }) => { id: string } | null;
      sequence: () => { id: string; name: string; start: number; enabled: boolean }[];
      setCueEnabled: (id: string, enabled: boolean) => boolean;
      setCueStart: (id: string, start: number) => boolean;
      removeCue: (id: string) => boolean;
      locations: () => { id: string; label: string; hint: string }[];
      brand: () => { name: string; tagline: string; slogan: string; accent: string; surface: string };
      setBrand: (brand: Partial<{ name: string; tagline: string; slogan: string; accent: string; surface: string }>)
        => { name: string; tagline: string; slogan: string; accent: string; surface: string };
      applyLocation: (id: string) => Promise<boolean>;
      currentLocation: () => string | null;
      marks: () => { id: string; label: string; hint: string }[];
      rigVisible: () => boolean;
      showRig: (visible: boolean) => void;
      standOn: (id: string) => boolean;
      staff: () => Promise<number>;
      looks: () => { id: string; label: string; hint: string; group: string }[];
      applyLook: (id: string) => Promise<boolean>;
      currentLook: () => string | null;
      wearing: () => string[];
      wear: (items: string[]) => Promise<string[]>;
    },
    private documents: { save: () => SceneComposition; load: (scene: SceneComposition) => Promise<void> },
  ) {
    const container = canvas.parentElement!;
    container.classList.add('studio-workspace');
    container.parentElement?.classList.add('studio-workspace-layout');
    this.navigationCamera = new ArcRotateCamera('studioNavigation', this.orbit.alpha, this.orbit.beta, this.orbit.radius, this.orbit.target.clone(), scene, false);
    this.navigationCamera.minZ = 0.05;
    this.navigationCamera.maxZ = 300;
    this.navigationCamera.lowerRadiusLimit = 1;
    this.navigationCamera.upperRadiusLimit = 60;
    this.navigationCamera.upperBetaLimit = Math.PI / 2 - 0.015;
    this.navigationCamera.wheelDeltaPercentage = 0.025;
    this.navigationCamera.panningSensibility = 120;
    this.navigationCamera.angularSensibilityX = 700;
    this.navigationCamera.angularSensibilityY = 700;
    this.navigationCamera.layerMask |= HELPER_LAYER;
    pipeline?.addCamera(this.navigationCamera);

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'studio-view-toolbar';
    this.toolbar.setAttribute('role', 'toolbar');
    this.toolbar.setAttribute('aria-label', 'Scenevisning');
    this.toolbar.innerHTML = `<div class="studio-view-tabs">${Object.entries(viewNames).map(([id, name]) =>
      `<button type="button" data-studio-view="${id}" aria-pressed="false">${name}</button>`).join('')}</div>
      <div class="studio-view-actions">
        <button type="button" data-studio-action="fit" title="Vis hele studiooppsettet">Tilpass scene</button>
        <button type="button" data-studio-action="match" title="Flytt opptakskameraet til denne vinkelen">Bruk som kameravinkel</button>
        <button type="button" data-studio-action="grid" aria-pressed="false">Rutenett · 1 m</button>
        <button type="button" data-studio-action="map" aria-pressed="false">2D-plan</button>
        <button type="button" data-studio-action="director">AI-regissør</button>
      </div>`;
    container.prepend(this.toolbar);

    // The preview and the moves panel share the right-hand edge. Stacking them
    // in one rail is what keeps the preview from sitting on top of the buttons.
    const rail = document.createElement('div');
    rail.className = 'studio-right-rail';
    container.append(rail);

    this.preview = document.createElement('section');
    this.preview.className = 'studio-camera-preview';
    this.preview.setAttribute('aria-label', 'Kameraforhåndsvisning');
    this.preview.innerHTML = `<div class="studio-preview-header"><span><i></i> Opptakskamera</span>
      <button type="button" title="Vis opptakskamera i hovedvinduet" aria-label="Åpne kameravisning">↗</button></div>
      <canvas width="384" height="216" aria-label="Lys og utsnitt fra opptakskameraet"></canvas>
      <div class="studio-preview-settings"></div><p>Lys og utsnitt · 16:9</p>`;
    rail.append(this.preview);
    this.previewCanvas = this.preview.querySelector('canvas')!;
    this.preview.querySelector('button')!.addEventListener('click', () => this.setView('camera'), { signal: this.abort.signal });

    this.modelPanel = document.createElement('section');
    this.modelPanel.className = 'studio-model-panel';
    this.modelPanel.setAttribute('aria-label', 'Studiomodell');
    this.modelPanel.innerHTML = `<div class="studio-model-heading">MODELL PÅ SETTET</div>
      <label for="studioModelSelect">3D-modell</label>
      <select id="studioModelSelect"><option value="woman">Kvinne · 1,72 m</option><option value="man">Mann · 1,82 m</option></select>
      <label for="studioPoseSelect">Posering</label>
      <select id="studioPoseSelect"><option value="StudioStand">Avslappet stående</option><option value="StudioPortrait">Portrett · dreid hode</option><option value="StudioSeated">Sitt på portrettstol</option></select>
      <div class="studio-model-framing"><button type="button" data-frame="portrait">Portrett</button><button type="button" data-frame="full">Hel figur</button></div>
      <button type="button" class="studio-stand-toggle" data-stand>Sett deg</button>
      <label for="studioOutfitSelect">Antrekk</label>
      <select id="studioOutfitSelect"></select>
      <label for="studioShoesSelect">Sko</label>
      <select id="studioShoesSelect"></select>
      <label class="studio-pose-edit"><input type="checkbox" id="studioPoseEdit"> Juster ledd</label>
      <p role="status" class="studio-model-status">Anatomisk modell · hud, hår og klær</p>`;
    container.append(this.modelPanel);
    this.buildSequencePanel(rail);
    const modelSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioModelSelect')!;
    const poseSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioPoseSelect')!;
    const poseEdit = this.modelPanel.querySelector<HTMLInputElement>('#studioPoseEdit')!;
    const outfitSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioOutfitSelect')!;
    const shoesSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioShoesSelect')!;

    /** Show the garments this body can wear, with what it has on selected. */
    const refreshWardrobe = () => {
      const garments = this.characterControls.wardrobe();
      const worn = new Set(this.characterControls.wearing());
      for (const [select, slot] of [[outfitSelect, 'outfit'], [shoesSelect, 'shoes']] as const) {
        const options = garments.filter(garment => garment.slot === slot);
        select.replaceChildren(...options.map(garment => {
          const option = document.createElement('option');
          option.value = garment.id;
          option.textContent = garment.label;
          option.selected = worn.has(garment.id);
          return option;
        }));
        // A body with nothing cut for it has no choice to offer.
        select.disabled = options.length === 0;
      }
    };

    const wear = async () => {
      outfitSelect.disabled = shoesSelect.disabled = true;
      status.textContent = 'Skifter antrekk …';
      try {
        await this.characterControls.wear([outfitSelect.value, shoesSelect.value].filter(Boolean));
        status.textContent = 'Antrekket er skiftet';
      } catch {
        status.textContent = 'Antrekket kunne ikke skiftes.';
      } finally {
        refreshWardrobe();
      }
    };
    outfitSelect.addEventListener('change', () => { void wear(); }, { signal: this.abort.signal });
    shoesSelect.addEventListener('change', () => { void wear(); }, { signal: this.abort.signal });
    window.addEventListener('ch-character-wardrobe', () => refreshWardrobe(), { signal: this.abort.signal });
    const status = this.modelPanel.querySelector<HTMLElement>('[role="status"]')!;
    modelSelect.addEventListener('change', async () => {
      modelSelect.disabled = poseSelect.disabled = true;
      status.textContent = 'Laster 3D-modell …';
      try {
        await this.characterControls.load(modelSelect.value as 'woman' | 'man');
        poseSelect.value = 'StudioStand';
        status.textContent = 'Modellen er klar for lyssetting';
      } catch { status.textContent = 'Modellen kunne ikke lastes. Prøv igjen.'; }
      finally { modelSelect.disabled = poseSelect.disabled = false; }
    }, { signal: this.abort.signal });
    poseSelect.addEventListener('change', () => {
      const applied = this.characterControls.pose(poseSelect.value as 'StudioStand' | 'StudioPortrait' | 'StudioSeated');
      status.textContent = applied ? (poseSelect.value === 'StudioSeated' ? 'Figuren sitter på portrettstolen' : 'Poseringen er oppdatert') : 'Velg en studiomodell for disse poseringene';
    }, { signal: this.abort.signal });
    poseEdit.addEventListener('change', () => {
      const active = this.characterControls.editPose(poseEdit.checked);
      if (!active) poseEdit.checked = false;
      status.textContent = active
        ? 'Klikk et ledd på figuren og dra ringen. Poseringene over nullstiller.'
        : 'Velg en studiomodell for å justere ledd';
    }, { signal: this.abort.signal });
    window.addEventListener('ch-character-loaded', event => {
      const url = (event as CustomEvent<{ modelUrl: string }>).detail.modelUrl;
      if (url.endsWith('/studio-woman.glb')) modelSelect.value = 'woman';
      if (url.endsWith('/studio-man.glb')) modelSelect.value = 'man';
      // A new figure carries no handles, so the toggle must not claim otherwise.
      poseEdit.checked = false;
      refreshWardrobe();
    }, { signal: this.abort.signal });
    window.addEventListener('ch-character-pose-applied', event => {
      const pose = (event as CustomEvent<{ poseId: string }>).detail.poseId;
      if (['StudioStand', 'StudioPortrait', 'StudioSeated'].includes(pose)) poseSelect.value = pose;
    }, { signal: this.abort.signal });
    // Standing up is an action, not a setting: while the figure is on a chair
    // it is the only move there is, and walking is refused until it is taken.
    const standToggle = this.modelPanel.querySelector<HTMLButtonElement>('[data-stand]')!;
    const showStance = () => {
      const seated = this.characterControls.seated();
      standToggle.textContent = seated ? 'Reis deg' : 'Sett deg';
      standToggle.title = seated
        ? 'Figuren reiser seg fra stolen og kan gå igjen'
        : 'Figuren setter seg på portrettstolen';
    };
    standToggle.addEventListener('click', () => {
      this.characterControls.stand();
      showStance();
    }, { signal: this.abort.signal });
    window.addEventListener('ch-character-pose-applied', showStance, { signal: this.abort.signal });
    window.addEventListener('ch-character-seated-blocked', event => {
      const message = (event as CustomEvent<{ message: string }>).detail?.message;
      const status = this.modelPanel.querySelector<HTMLElement>('.studio-model-status');
      if (status && message) status.textContent = message;
      showStance();
    }, { signal: this.abort.signal });
    showStance();

    this.modelPanel.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach(button => {
      button.addEventListener('click', () => {
        this.characterControls.frame(button.dataset.frame === 'portrait');
        this.setView('camera');
      }, { signal: this.abort.signal });
    });

    // The environment panel belongs to the right-hand rail too. Everything on
    // that edge is one column, so nothing there can land on top of anything
    // else however tall the contents grow.
    this.environmentPanel = document.createElement('section');
    this.environmentPanel.className = 'studio-model-panel studio-environment-panel';
    this.environmentPanel.setAttribute('aria-label', 'Omgivelser');
    this.environmentPanel.innerHTML = `<div class="studio-model-heading">OMGIVELSER</div>
      <label for="studioRoomSelect">Studiorom</label>
      <select id="studioRoomSelect"></select>
      <label class="studio-room-toggle"><input type="checkbox" id="studioFurnishings"> Møbler og innredning</label>
      <label class="studio-room-toggle"><input type="checkbox" id="studioPracticals"> Romlys</label>
      <div class="studio-model-framing"><button type="button" data-document="save">Lagre oppsett</button><button type="button" data-document="open">Åpne oppsett</button></div>
      <input type="file" accept=".json,application/json" data-studio-document hidden>
      <p role="status" class="studio-document-status">Oppsett kan lagres lokalt</p>`;
    rail.prepend(this.environmentPanel);
    const fileInput = this.environmentPanel.querySelector<HTMLInputElement>('[data-studio-document]')!;
    const documentStatus = this.environmentPanel.querySelector<HTMLElement>('.studio-document-status')!;
    this.environmentPanel.querySelector('[data-document="save"]')!.addEventListener('click', () => {
      const blob = new Blob([sceneCompressionService.compress(this.documents.save())], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'virtualstudio-oppsett.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      documentStatus.textContent = 'Oppsettet er lastet ned';
    }, { signal: this.abort.signal });
    this.environmentPanel.querySelector('[data-document="open"]')!.addEventListener('click', () => fileInput.click(), { signal: this.abort.signal });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]; if (!file) return;
      const buttons = this.environmentPanel.querySelectorAll<HTMLButtonElement>('[data-document]');
      buttons.forEach(button => button.disabled = true);
      documentStatus.textContent = 'Åpner studiooppsettet …';
      try {
        if (file.size > 10_000_000) throw new Error('Oppsettsfilen er for stor');
        const document = parseStudioDocument(sceneCompressionService.decompress(await file.text()));
        await this.documents.load(document);
        documentStatus.textContent = 'Oppsettet er åpnet';
      } catch (error) { documentStatus.textContent = error instanceof Error ? error.message : 'Kunne ikke åpne oppsettet'; }
      finally { fileInput.value = ''; buttons.forEach(button => button.disabled = false); }
    }, { signal: this.abort.signal });
    const roomSelect = this.environmentPanel.querySelector<HTMLSelectElement>('#studioRoomSelect')!;
    // The same places as the buttons, so the two never drift apart.
    roomSelect.replaceChildren(...this.characterControls.locations().map(location => {
      const option = document.createElement('option');
      option.value = location.id;
      option.textContent = location.label;
      option.title = location.hint;
      return option;
    }));
    const furnishings = this.environmentPanel.querySelector<HTMLInputElement>('#studioFurnishings')!;
    const practicals = this.environmentPanel.querySelector<HTMLInputElement>('#studioPracticals')!;
    roomSelect.addEventListener('change', () => {
      void this.characterControls.applyLocation(roomSelect.value);
    }, { signal: this.abort.signal });
    window.addEventListener('ch-location-changed', event => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id) roomSelect.value = id;
    }, { signal: this.abort.signal });
    furnishings.addEventListener('change', () => environmentService.setStudioRoom({ furnishings: furnishings.checked }), { signal: this.abort.signal });
    practicals.addEventListener('change', () => environmentService.setStudioRoom({ practicals: practicals.checked }), { signal: this.abort.signal });
    const syncRoom = () => {
      const room = environmentService.getState().room;
      // The list names places; the service stores the geometry behind them.
      // Writing the geometry type straight into the select left it on no
      // option at all — 'industrial' is not a place, 'Studio' is — and it ran
      // after everything else, so it silently undid every other writer.
      const place = this.characterControls.currentLocation();
      if (place) roomSelect.value = place;
      furnishings.checked = room?.furnishings ?? true; practicals.checked = room?.practicals ?? true;
      furnishings.disabled = practicals.disabled = (room?.type ?? 'none') === 'none';
    };
    this.unsubscribeEnvironment = environmentService.subscribe(syncRoom);
    syncRoom();

    this.previewCamera = new FreeCamera('studioPreviewCamera', shot.position.clone(), scene, false);
    this.previewCamera.minZ = shot.minZ;
    this.previewCamera.maxZ = shot.maxZ;
    this.previewTarget = new RenderTargetTexture('studioLivePreview', { width: 384, height: 216 }, scene, false);
    this.previewTarget.activeCamera = this.previewCamera;
    this.previewTarget.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    this.previewTarget.ignoreCameraViewport = true;
    this.previewTarget.renderListPredicate = mesh => mesh.isEnabled() && mesh.isVisible &&
      !mesh.metadata?.studioHelper && !/gizmo|Helper|eyeMarker|focusMarker|beamVisualization/i.test(mesh.name);
    this.previewTarget.addPostProcess(new ImageProcessingPostProcess('studioPreviewToneMap', 1, null,
      Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false, Constants.TEXTURETYPE_UNSIGNED_BYTE,
      scene.imageProcessingConfiguration));
    this.previewTarget.onAfterUnbindObservable.add(() => { void this.drawPreview(); });

    this.cameraMarker = MeshBuilder.CreateBox('studioTakingCamera', { width: 0.34, height: 0.24, depth: 0.24 }, scene);
    this.cameraMarker.layerMask = HELPER_LAYER;
    this.cameraMarker.metadata = { studioHelper: true };
    this.cameraMarker.isPickable = false;
    this.cameraMarker.enableEdgesRendering();
    this.cameraMarker.edgesColor.set(0.18, 0.91, 1, 1);
    const lens = MeshBuilder.CreateCylinder('studioTakingLens', { diameter: 0.17, height: 0.24 }, scene);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.19;
    lens.parent = this.cameraMarker;
    lens.layerMask = HELPER_LAYER;
    lens.metadata = { studioHelper: true };
    lens.isPickable = false;

    /*
     * The photographer, and the tripod under the camera.
     *
     * The shot was a floating eye: nothing showed that a person stands behind
     * it, taking up room. In a five-metre kitchen that person is a real
     * constraint — they need space behind the camera, and a light cannot go
     * where they are. Drawing them makes the constraint visible, and it is the
     * reason the rig keeps a wide berth of the lens axis.
     *
     * Helper layer, like the camera marker: seen while working, never in shot.
     */
    const helper = (mesh: Mesh) => {
      mesh.layerMask = HELPER_LAYER;
      mesh.metadata = { studioHelper: true };
      mesh.isPickable = false;
      mesh.parent = this.cameraMarker;
      return mesh;
    };
    for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      const leg = helper(MeshBuilder.CreateCylinder(`studioTripodLeg_${angle.toFixed(2)}`,
        { diameter: 0.035, height: 1.05 }, scene));
      leg.position.set(Math.cos(angle) * 0.17, -0.62, Math.sin(angle) * 0.17);
      leg.rotation.x = Math.sin(angle) * 0.3;
      leg.rotation.z = -Math.cos(angle) * 0.3;
    }
    // Head and shoulders a step behind the camera, at the height of somebody
    // standing at the eyepiece.
    const head = helper(MeshBuilder.CreateSphere('studioPhotographerHead', { diameter: 0.21, segments: 12 }, scene));
    head.position.set(0, 0.28, -0.46);
    const shoulders = helper(MeshBuilder.CreateCylinder('studioPhotographerBody',
      { diameterTop: 0.3, diameterBottom: 0.38, height: 0.62 }, scene));
    shoulders.position.set(0, -0.14, -0.5);
    for (const side of [-1, 1]) {
      const arm = helper(MeshBuilder.CreateCylinder(`studioPhotographerArm_${side}`,
        { diameter: 0.075, height: 0.44 }, scene));
      arm.position.set(side * 0.16, -0.05, -0.28);
      arm.rotation.x = 0.7;
    }
    this.cameraMarker.getChildMeshes().forEach(child => child.enableEdgesRendering());

    this.toolbar.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.studioAction === 'map') {
        const open = container.parentElement?.classList.toggle('studio-map-open');
        button.setAttribute('aria-pressed', String(!!open));
        window.dispatchEvent(new Event('resize'));
      }
      if (button.dataset.studioView) this.setView(button.dataset.studioView as StudioView);
      if (button.dataset.studioAction === 'fit') this.fitScene();
      if (button.dataset.studioAction === 'match') this.matchShot();
      if (button.dataset.studioAction === 'director') window.dispatchEvent(new Event('toggle-scene-director'));
      if (button.dataset.studioAction === 'grid') {
        const grid = scene.getMeshByName('grid');
        if (grid) grid.isVisible = !grid.isVisible;
        button.setAttribute('aria-pressed', String(grid?.isVisible ?? false));
      }
    }, { signal: this.abort.signal });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.observer = scene.onBeforeRenderObservable.add(() => this.update());
    scene.onDisposeObservable.addOnce(() => this.dispose());
    this.setView('studio');
  }

  getView(): StudioView { return this.view; }

  setView(view: StudioView): void {
    if (this.view === 'studio') {
      const c = this.navigationCamera;
      this.orbit = { alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target.clone() };
    }
    this.shot.detachControl();
    this.navigationCamera.detachControl();
    this.view = view;
    const c = this.navigationCamera;
    c.inertialAlphaOffset = c.inertialBetaOffset = c.inertialRadiusOffset = 0;
    c.inertialPanningX = c.inertialPanningY = 0;
    c.lowerAlphaLimit = c.upperAlphaLimit = null;
    c.lowerBetaLimit = 0.01;
    c.upperBetaLimit = Math.PI / 2 - 0.015;
    c.mode = view === 'studio' ? Camera.PERSPECTIVE_CAMERA : Camera.ORTHOGRAPHIC_CAMERA;
    if (view === 'studio') {
      c.alpha = this.orbit.alpha; c.beta = this.orbit.beta; c.radius = this.orbit.radius;
      c.setTarget(this.orbit.target.clone());
    } else if (view !== 'camera') {
      c.setTarget(new Vector3(0, view === 'top' ? 0 : 1.5, 1));
      c.alpha = view === 'side' ? 0 : -Math.PI / 2;
      c.beta = view === 'top' ? 0.01 : Math.PI / 2;
      c.radius = 16;
      c.lowerAlphaLimit = c.upperAlphaLimit = c.alpha;
      c.lowerBetaLimit = c.upperBetaLimit = c.beta;
    }
    const active = view === 'camera' ? this.shot : c;
    this.scene.activeCamera = active;
    this.scene.cameraToUseForPointers = active;
    active.attachControl(this.canvas, true);
    this.canvas.parentElement!.dataset.studioView = view;
    this.toolbar.querySelectorAll<HTMLButtonElement>('[data-studio-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.studioView === view));
    });
    this.toolbar.querySelector<HTMLButtonElement>('[data-studio-action="match"]')!.disabled = view !== 'studio';
    this.preview.hidden = view === 'camera';
    const index = this.scene.customRenderTargets.indexOf(this.previewTarget);
    if (view === 'camera' && index !== -1) this.scene.customRenderTargets.splice(index, 1);
    else if (view !== 'camera' && index === -1) this.scene.customRenderTargets.push(this.previewTarget);
    this.resize();
    window.dispatchEvent(new CustomEvent('vs-studio-view-changed', { detail: { view } }));
  }

  fitScene(): void {
    this.orbit = { alpha: -Math.PI / 2 - 0.08, beta: 1.44, radius: 11, target: new Vector3(0, 1.4, 1) };
    // Prevent setView from replacing the fit with the current orbit.
    this.view = 'front';
    this.setView('studio');
  }

  matchShot(): void {
    if (this.view !== 'studio') return;
    this.shot.setTarget(this.navigationCamera.target.clone());
    this.shot.setPosition(this.navigationCamera.position.clone());
    this.setView('camera');
  }

  private resize(updateEngine = true): void {
    const container = this.canvas.parentElement!;
    const shotWidth = Math.min(container.clientWidth, container.clientHeight * 16 / 9);
    container.style.setProperty('--studio-shot-width', `${shotWidth}px`);
    container.style.setProperty('--studio-shot-height', `${shotWidth * 9 / 16}px`);
    if (updateEngine) this.scene.getEngine().resize();
    const c = this.navigationCamera;
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const halfHeight = c.radius * 0.45;
    c.orthoTop = halfHeight; c.orthoBottom = -halfHeight;
    c.orthoLeft = -halfHeight * aspect; c.orthoRight = halfHeight * aspect;
  }

  private update(): void {
    // Cut away roof geometry only in an elevated editor view; taking-camera renders retain it.
    if (this.navigationCamera.position.y > 4.6) this.navigationCamera.layerMask &= ~STUDIO_ROOF_LAYER;
    else this.navigationCamera.layerMask |= STUDIO_ROOF_LAYER;
    const grid = this.scene.getMeshByName('grid');
    if (grid) grid.layerMask = HELPER_LAYER;
    this.cameraMarker.position.copyFrom(this.shot.position);
    this.cameraMarker.lookAt(this.shot.target);
    if (this.navigationCamera.mode === Camera.ORTHOGRAPHIC_CAMERA) this.resize(false);
    if (this.view === 'camera' || document.hidden || this.reading || performance.now() - this.lastPreview < 160) return;
    this.lastPreview = performance.now();
    this.previewCamera.position.copyFrom(this.shot.position);
    this.previewCamera.setTarget(this.shot.target);
    this.previewCamera.fov = this.shot.fov;
    this.previewTarget.resetRefreshCounter();
    const s = this.getSettings();
    this.preview.querySelector('.studio-preview-settings')!.textContent = `${s.focalLength} mm · f/${s.aperture} · ${s.shutter}s · ISO ${s.iso}`;
  }

  private async drawPreview(): Promise<void> {
    if (this.reading || this.disposed || this.view === 'camera') return;
    this.reading = true;
    try {
      const pixels = await this.previewTarget.readPixels();
      if (!pixels || this.disposed) return;
      const ctx = this.previewCanvas.getContext('2d');
      if (!ctx) return;
      const data = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      const frame = ctx.createImageData(384, 216);
      for (let row = 0; row < 216; row++) {
        frame.data.set(data.subarray((215 - row) * 384 * 4, (216 - row) * 384 * 4), row * 384 * 4);
      }
      ctx.putImageData(frame, 0, 0);
    } catch {
      // Context loss is transient; the engine rebuilds the render target on restoration.
    } finally { this.reading = false; }
  }

  /**
   * The moves panel: name what should happen, and when.
   *
   * Nobody should have to write keyframes to push the camera in or make a bulb
   * fail. Each button is a move in the words a crew already uses, with a plain
   * explanation for anyone who does not know the word, and each one adds a
   * beat to the sequence that can be moved, muted or removed afterwards. The
   * detailed timeline edits the very same thing.
   */
  private buildSequencePanel(container: HTMLElement): void {
    this.sequencePanel = document.createElement('section');
    this.sequencePanel.className = 'studio-sequence-panel';
    this.sequencePanel.setAttribute('aria-label', 'Bevegelser og sekvens');
    this.sequencePanel.innerHTML = `
      <div class="studio-sequence-heading">STED</div>
      <div class="studio-move-buttons studio-location-buttons"></div>
      <p class="studio-location-status" role="status">Studio</p>
      <div class="studio-mark-group" hidden>
        <span>Hvor skal folk stå?</span>
        <div class="studio-move-buttons studio-mark-buttons"></div>
        <button type="button" class="studio-staff-button" data-staff>Bemann stedet</button>
        <label class="studio-room-toggle studio-rig-toggle"><input type="checkbox" data-rig checked> Vis lysriggen</label>
      </div>
      <details class="studio-move-group studio-brand-group"><summary>Merke</summary>
        <div class="studio-brand-fields">
          <label for="studioBrandName">Navn på stedet</label>
          <input type="text" id="studioBrandName" maxlength="28" autocomplete="off">
          <label for="studioBrandTagline">Undertekst</label>
          <input type="text" id="studioBrandTagline" maxlength="48" autocomplete="off">
          <label for="studioBrandSlogan">Tekst på skiltet ute</label>
          <textarea id="studioBrandSlogan" rows="3" maxlength="60"></textarea>
          <div class="studio-brand-colours">
            <label for="studioBrandAccent">Farge</label>
            <input type="color" id="studioBrandAccent">
            <label for="studioBrandSurface">Bunn</label>
            <input type="color" id="studioBrandSurface">
          </div>
          <p class="studio-brand-status" role="status">Vises på skilt og plakater i pizzeriaen.</p>
        </div>
      </details>
      <div class="studio-sequence-heading">LYSSETTING</div>
      <div class="studio-look-groups"></div>
      <p class="studio-look-status" role="status">Studio · portrett</p>
      <div class="studio-sequence-heading">BEVEGELSE</div>
      <label for="studioMoveLength">Lengde</label>
      <input type="range" id="studioMoveLength" min="0.5" max="10" step="0.5" value="3">
      <p class="studio-move-length" role="status">3,0 sekunder</p>
      <details class="studio-move-group" data-kind="camera" open><summary>Kamera</summary><div class="studio-move-buttons"></div></details>
      <details class="studio-move-group" data-kind="light"><summary>Lys</summary><div class="studio-move-buttons"></div></details>
      <div class="studio-sequence-heading">SEKVENS</div>
      <ol class="studio-sequence-list"></ol>
      <p class="studio-sequence-empty">Ingen bevegelser ennå. Velg en over.</p>`;
    container.append(this.sequencePanel);

    const length = this.sequencePanel.querySelector<HTMLInputElement>('#studioMoveLength')!;
    const lengthLabel = this.sequencePanel.querySelector<HTMLElement>('.studio-move-length')!;
    const list = this.sequencePanel.querySelector<HTMLOListElement>('.studio-sequence-list')!;
    const empty = this.sequencePanel.querySelector<HTMLElement>('.studio-sequence-empty')!;

    length.addEventListener('input', () => {
      lengthLabel.textContent = `${Number(length.value).toFixed(1).replace('.', ',')} sekunder`;
    }, { signal: this.abort.signal });

    this.buildLocationButtons();
    this.buildBrandFields();
    this.buildLookButtons();

    for (const move of this.characterControls.moves()) {
      const group = this.sequencePanel.querySelector<HTMLElement>(
        `.studio-move-group[data-kind="${move.kind}"] .studio-move-buttons`);
      if (!group) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.move = move.id;
      button.textContent = move.label;
      // The word is the crew's; the explanation is for everyone else.
      button.title = move.hint;
      button.addEventListener('click', () => {
        const added = this.characterControls.addMove(move.id, { duration: Number(length.value) });
        // A light move needs a fixture; there may be none on set yet.
        if (!added) empty.textContent = 'Velg en lyskilde først for å bevege lyset.';
        this.renderSequence();
      }, { signal: this.abort.signal });
      group.append(button);
    }

    list.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-cue]');
      if (!button) return;
      const id = button.dataset.cue!;
      if (button.dataset.action === 'remove') this.characterControls.removeCue(id);
      else this.characterControls.setCueEnabled(id, button.dataset.enabled !== 'true');
    }, { signal: this.abort.signal });

    list.addEventListener('change', event => {
      const input = event.target as HTMLInputElement;
      if (input.dataset.cueStart) this.characterControls.setCueStart(input.dataset.cueStart, Number(input.value));
    }, { signal: this.abort.signal });

    window.addEventListener('ch-sequence-changed', () => this.renderSequence(), { signal: this.abort.signal });
    this.renderSequence();
  }

  /**
   * Where the scene is: one button per place.
   *
   * A place brings its own room and the lighting that belongs to it, so the
   * first question anyone has to answer is answered with one press. There are
   * only a handful, so they stand open rather than behind a summary.
   */
  private buildLocationButtons(): void {
    const group = this.sequencePanel.querySelector<HTMLElement>('.studio-location-buttons')!;
    const status = this.sequencePanel.querySelector<HTMLElement>('.studio-location-status')!;
    const locations = this.characterControls.locations();

    for (const location of locations) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.location = location.id;
      button.textContent = location.label;
      button.title = location.hint;
      group.append(button);
    }

    // The room is built before its lighting, and the room's own notification
    // would otherwise overwrite "working" with the finished name while the
    // fixtures are still going up — a panel claiming to be done, and a test
    // reading the claim.
    let settingScene = false;
    const showCurrent = () => {
      const current = this.characterControls.currentLocation();
      for (const button of group.querySelectorAll<HTMLButtonElement>('button[data-location]')) {
        button.setAttribute('aria-pressed', String(button.dataset.location === current));
      }
      if (settingScene) return;
      const here = locations.find(location => location.id === current);
      status.textContent = here ? here.label : 'Egne omgivelser';
    };

    group.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-location]');
      if (!button || button.disabled) return;
      const location = locations.find(candidate => candidate.id === button.dataset.location);
      if (!location) return;

      // Building a room and relighting it takes a moment, and silence in that
      // moment reads as a dead button.
      const all = [...group.querySelectorAll<HTMLButtonElement>('button[data-location]')];
      for (const other of all) other.disabled = true;
      settingScene = true;
      status.textContent = `Setter scenen · ${location.label} …`;

      const settle = (message: string) => {
        for (const other of all) other.disabled = false;
        settingScene = false;
        showCurrent();
        if (message) status.textContent = message;
      };
      void this.characterControls.applyLocation(location.id)
        .then(applied => settle(applied ? '' : 'Fikk ikke satt stedet. Prøv et annet.'))
        .catch(error => {
          console.error('[StudioWorkspace] location failed', error);
          settle('Fikk ikke satt stedet. Prøv et annet.');
        });
    }, { signal: this.abort.signal });

    // Where a person stands is a property of the place, so the marks are
    // rebuilt whenever the place changes.
    const markGroup = this.sequencePanel.querySelector<HTMLElement>('.studio-mark-group')!;
    const markButtons = this.sequencePanel.querySelector<HTMLElement>('.studio-mark-buttons')!;
    const staffButton = this.sequencePanel.querySelector<HTMLButtonElement>('[data-staff]')!;

    const showMarks = () => {
      const marks = this.characterControls.marks();
      markGroup.hidden = marks.length === 0;
      markButtons.replaceChildren(...marks.map(mark => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.mark = mark.id;
        button.textContent = mark.label;
        button.title = mark.hint;
        return button;
      }));
      staffButton.textContent = marks.length > 0 ? `Bemann stedet · ${marks.length}` : 'Bemann stedet';
      staffButton.title = 'Setter en person på hvert sted i rommet';
    };

    markButtons.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-mark]');
      if (!button) return;
      const applied = this.characterControls.standOn(button.dataset.mark!);
      for (const other of markButtons.querySelectorAll<HTMLButtonElement>('button[data-mark]')) {
        other.setAttribute('aria-pressed', String(applied && other === button));
      }
    }, { signal: this.abort.signal });

    staffButton.addEventListener('click', () => {
      // Loading several figures takes a while, and a silent button reads dead.
      staffButton.disabled = true;
      const said = staffButton.textContent;
      staffButton.textContent = 'Henter folk …';
      void this.characterControls.staff()
        .then(placed => { staffButton.textContent = placed > 0 ? `${placed} personer på plass` : 'Ingen steder å stå her'; })
        .catch(error => {
          console.error('[StudioWorkspace] staffing failed', error);
          staffButton.textContent = 'Fikk ikke hentet folk';
        })
        .finally(() => {
          staffButton.disabled = false;
          setTimeout(() => { if (staffButton.textContent !== said) showMarks(); }, 4000);
        });
    }, { signal: this.abort.signal });

    // The stands are right for judging light and wrong for judging the
    // picture, so the photographer decides which question they are asking.
    const rigToggle = this.sequencePanel.querySelector<HTMLInputElement>('[data-rig]')!;
    rigToggle.checked = this.characterControls.rigVisible();
    rigToggle.addEventListener('change', () => {
      this.characterControls.showRig(rigToggle.checked);
    }, { signal: this.abort.signal });

    window.addEventListener('ch-location-changed', () => { showCurrent(); showMarks(); }, { signal: this.abort.signal });
    showMarks();
    window.addEventListener('ch-location-changed', () => showCurrent(), { signal: this.abort.signal });
    // The first room is built from the environment service, not from a button,
    // so the panel has to hear that too or it opens claiming an empty stage.
    window.addEventListener('vs-environment-changed', () => showCurrent(), { signal: this.abort.signal });
    showCurrent();
  }

  /**
   * Whose place it is.
   *
   * One text field and a colour, and the name is over the door — the fastest
   * demonstration this tool has. The signs are painted when the room is built,
   * so an edit commits when it is finished rather than on every keystroke: a
   * rebuild per letter would be unusable.
   */
  private buildBrandFields(): void {
    const panel = this.sequencePanel;
    const name = panel.querySelector<HTMLInputElement>('#studioBrandName')!;
    const tagline = panel.querySelector<HTMLInputElement>('#studioBrandTagline')!;
    const slogan = panel.querySelector<HTMLTextAreaElement>('#studioBrandSlogan')!;
    const accent = panel.querySelector<HTMLInputElement>('#studioBrandAccent')!;
    const surfaceColour = panel.querySelector<HTMLInputElement>('#studioBrandSurface')!;
    const status = panel.querySelector<HTMLElement>('.studio-brand-status')!;

    const show = () => {
      const brand = this.characterControls.brand();
      name.value = brand.name;
      tagline.value = brand.tagline;
      slogan.value = brand.slogan;
      accent.value = brand.accent;
      surfaceColour.value = brand.surface;
    };

    const commit = () => {
      status.textContent = 'Setter opp skiltene …';
      const brand = this.characterControls.setBrand({
        name: name.value,
        tagline: tagline.value,
        slogan: slogan.value,
        accent: accent.value,
        surface: surfaceColour.value,
      });
      // Show what was actually kept, so a name too long for a sign does not
      // quietly disagree with what is on the wall.
      show();
      status.textContent = `${brand.name} står på skiltet.`;
    };

    for (const field of [name, tagline, slogan, accent, surfaceColour]) {
      field.addEventListener('change', commit, { signal: this.abort.signal });
    }
    window.addEventListener('ch-brand-changed', show, { signal: this.abort.signal });
    show();
  }

  /**
   * The lighting looks: one button per place, not per fixture.
   *
   * Someone filming in a kitchen asks for a kitchen, not for a key at 45
   * degrees. Each button lights the whole scene the way that place is lit, and
   * leaves ordinary fixtures behind that the light panel can still edit. The
   * groups keep eleven buttons readable: rooms, outdoors, mood, studio.
   */
  private buildLookButtons(): void {
    const groups = this.sequencePanel.querySelector<HTMLElement>('.studio-look-groups')!;
    const titles: Record<string, string> = {
      rom: 'Innendørs', ute: 'Ute', stemning: 'Stemning', studio: 'Studio',
    };
    const looks = this.characterControls.looks();

    for (const group of ['rom', 'ute', 'stemning', 'studio']) {
      const inGroup = looks.filter(look => look.group === group);
      if (inGroup.length === 0) continue;

      const section = document.createElement('details');
      section.className = 'studio-move-group';
      section.dataset.lookGroup = group;
      // Open where the scene already is, closed everywhere else: eleven places
      // at once is a list to read, one summary each is a question to answer.
      section.open = inGroup.some(look => look.id === this.characterControls.currentLook());
      const heading = document.createElement('summary');
      heading.textContent = titles[group] ?? group;
      const buttons = document.createElement('div');
      buttons.className = 'studio-move-buttons';

      for (const look of inGroup) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.look = look.id;
        button.textContent = look.label;
        button.title = look.hint;
        button.setAttribute('aria-pressed', String(look.id === this.characterControls.currentLook()));
        buttons.append(button);
      }
      section.append(heading, buttons);
      groups.append(section);
    }

    const status = this.sequencePanel.querySelector<HTMLElement>('.studio-look-status')!;

    // The look can be set from here, or by choosing a place, or come back from
    // a document. Reading it off the scene rather than off the last click is
    // what keeps the panel honest about which of those happened.
    let settingLook = false;
    const showCurrentLook = () => {
      const current = this.characterControls.currentLook();
      for (const button of groups.querySelectorAll<HTMLButtonElement>('button[data-look]')) {
        const active = button.dataset.look === current;
        button.setAttribute('aria-pressed', String(active));
        // Open the group holding the look that is on, so it is visible rather
        // than merely true.
        if (active) button.closest('details')?.setAttribute('open', '');
      }
      if (settingLook) return;
      const here = looks.find(look => look.id === current);
      status.textContent = here ? here.label : 'Lys fra dokumentet';
    };

    groups.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-look]');
      if (!button || button.disabled) return;
      const look = looks.find(candidate => candidate.id === button.dataset.look);
      if (!look) return;

      // Rebuilding a rig takes a moment, and silence in that moment reads as a
      // dead button, so the panel says what it is doing before it does it.
      const all = [...groups.querySelectorAll<HTMLButtonElement>('button[data-look]')];
      for (const other of all) other.disabled = true;
      settingLook = true;
      status.textContent = `Setter lys · ${look.label} …`;

      const settle = (applied: boolean, message: string) => {
        for (const other of all) other.disabled = false;
        settingLook = false;
        showCurrentLook();
        if (!applied) status.textContent = message;
      };
      // A rig that fails halfway must not leave every button dead and the
      // panel saying it is still working.
      void this.characterControls.applyLook(look.id)
        .then(applied => settle(applied, applied ? look.label : 'Fikk ikke satt lyset. Prøv et annet.'))
        .catch(error => {
          console.error('[StudioWorkspace] look failed', error);
          settle(false, 'Fikk ikke satt lyset. Prøv et annet.');
        });
    }, { signal: this.abort.signal });

    // A place brings its own lighting, and an opened document brings fixtures
    // that belong to no look at all. Both reach the panel the same way.
    window.addEventListener('ch-look-changed', () => showCurrentLook(), { signal: this.abort.signal });
    showCurrentLook();
  }

  /**
   * Show the sequence as an ordered list: what happens, and when.
   *
   * Replacing the list blurs whatever was focused inside it, and a blurred
   * number input fires `change`, which asks for another render — in the middle
   * of the first one. Rendering once and remembering that another was asked
   * for is what keeps the list from being edited while it is being built.
   */
  private renderSequence(): void {
    if (this.renderingSequence) {
      this.sequenceDirty = true;
      return;
    }
    this.renderingSequence = true;
    try {
      this.renderSequenceOnce();
    } finally {
      this.renderingSequence = false;
    }
    if (this.sequenceDirty) {
      this.sequenceDirty = false;
      this.renderSequence();
    }
  }

  private renderingSequence = false;
  private sequenceDirty = false;

  private renderSequenceOnce(): void {
    const list = this.sequencePanel.querySelector<HTMLOListElement>('.studio-sequence-list')!;
    const empty = this.sequencePanel.querySelector<HTMLElement>('.studio-sequence-empty')!;
    const cues = this.characterControls.sequence();

    list.replaceChildren(...cues.map(cue => {
      const item = document.createElement('li');
      item.dataset.cue = cue.id;
      if (!cue.enabled) item.classList.add('muted');

      const name = document.createElement('span');
      name.className = 'studio-cue-name';
      name.textContent = cue.name;

      const start = document.createElement('input');
      start.type = 'number';
      start.min = '0';
      start.step = '0.5';
      start.value = String(cue.start);
      start.dataset.cueStart = cue.id;
      start.setAttribute('aria-label', `Starter etter, sekunder, ${cue.name}`);

      const mute = document.createElement('button');
      mute.type = 'button';
      mute.dataset.cue = cue.id;
      mute.dataset.enabled = String(cue.enabled);
      mute.textContent = cue.enabled ? 'På' : 'Av';
      mute.title = cue.enabled ? 'Slå av denne bevegelsen' : 'Slå på igjen';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.cue = cue.id;
      remove.dataset.action = 'remove';
      remove.textContent = 'Fjern';

      item.append(name, start, mute, remove);
      return item;
    }));

    empty.hidden = cues.length > 0;
    if (cues.length === 0) empty.textContent = 'Ingen bevegelser ennå. Velg en over.';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.unsubscribeEnvironment();
    this.environmentPanel.remove();
    this.resizeObserver.disconnect();
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.pipeline?.removeCamera(this.navigationCamera);
    const index = this.scene.customRenderTargets.indexOf(this.previewTarget);
    if (index !== -1) this.scene.customRenderTargets.splice(index, 1);
    this.sequencePanel?.remove();
    this.previewTarget.dispose(); this.previewCamera.dispose(); this.cameraMarker.dispose();
    this.navigationCamera.dispose();
    this.canvas.parentElement?.classList.remove('studio-workspace');
    this.canvas.parentElement?.parentElement?.classList.remove('studio-workspace-layout', 'studio-map-open');
    this.toolbar.remove(); this.preview.remove(); this.modelPanel.remove();
    this.scene.activeCamera = this.shot;
    this.scene.cameraToUseForPointers = this.shot;
  }
}

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

    this.preview = document.createElement('section');
    this.preview.className = 'studio-camera-preview';
    this.preview.setAttribute('aria-label', 'Kameraforhåndsvisning');
    this.preview.innerHTML = `<div class="studio-preview-header"><span><i></i> Opptakskamera</span>
      <button type="button" title="Vis opptakskamera i hovedvinduet" aria-label="Åpne kameravisning">↗</button></div>
      <canvas width="384" height="216" aria-label="Lys og utsnitt fra opptakskameraet"></canvas>
      <div class="studio-preview-settings"></div><p>Lys og utsnitt · 16:9</p>`;
    container.append(this.preview);
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
      <p role="status" class="studio-model-status">Anatomisk modell · hud, hår og klær</p>`;
    container.append(this.modelPanel);
    const modelSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioModelSelect')!;
    const poseSelect = this.modelPanel.querySelector<HTMLSelectElement>('#studioPoseSelect')!;
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
    window.addEventListener('ch-character-loaded', event => {
      const url = (event as CustomEvent<{ modelUrl: string }>).detail.modelUrl;
      if (url.endsWith('/studio-woman.glb')) modelSelect.value = 'woman';
      if (url.endsWith('/studio-man.glb')) modelSelect.value = 'man';
    }, { signal: this.abort.signal });
    window.addEventListener('ch-character-pose-applied', event => {
      const pose = (event as CustomEvent<{ poseId: string }>).detail.poseId;
      if (['StudioStand', 'StudioPortrait', 'StudioSeated'].includes(pose)) poseSelect.value = pose;
    }, { signal: this.abort.signal });
    this.modelPanel.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach(button => {
      button.addEventListener('click', () => {
        this.characterControls.frame(button.dataset.frame === 'portrait');
        this.setView('camera');
      }, { signal: this.abort.signal });
    });

    this.environmentPanel = document.createElement('section');
    this.environmentPanel.className = 'studio-model-panel studio-environment-panel';
    this.environmentPanel.setAttribute('aria-label', 'Omgivelser');
    this.environmentPanel.innerHTML = `<div class="studio-model-heading">OMGIVELSER</div>
      <label for="studioRoomSelect">Studiorom</label>
      <select id="studioRoomSelect"><option value="industrial">Industristudio · 16 × 17 m</option><option value="none">Åpent opptaksområde</option></select>
      <label class="studio-room-toggle"><input type="checkbox" id="studioFurnishings"> Møbler og innredning</label>
      <label class="studio-room-toggle"><input type="checkbox" id="studioPracticals"> Romlys</label>
      <div class="studio-model-framing"><button type="button" data-document="save">Lagre oppsett</button><button type="button" data-document="open">Åpne oppsett</button></div>
      <input type="file" accept=".json,application/json" data-studio-document hidden>
      <p role="status" class="studio-document-status">Oppsett kan lagres lokalt</p>`;
    container.append(this.environmentPanel);
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
    const furnishings = this.environmentPanel.querySelector<HTMLInputElement>('#studioFurnishings')!;
    const practicals = this.environmentPanel.querySelector<HTMLInputElement>('#studioPracticals')!;
    roomSelect.addEventListener('change', () => environmentService.setStudioRoom({ type: roomSelect.value as 'industrial' | 'none' }), { signal: this.abort.signal });
    furnishings.addEventListener('change', () => environmentService.setStudioRoom({ furnishings: furnishings.checked }), { signal: this.abort.signal });
    practicals.addEventListener('change', () => environmentService.setStudioRoom({ practicals: practicals.checked }), { signal: this.abort.signal });
    const syncRoom = () => {
      const room = environmentService.getState().room;
      roomSelect.value = room?.type || 'none';
      furnishings.checked = room?.furnishings ?? true; practicals.checked = room?.practicals ?? true;
      furnishings.disabled = practicals.disabled = roomSelect.value === 'none';
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
    this.previewTarget.dispose(); this.previewCamera.dispose(); this.cameraMarker.dispose();
    this.navigationCamera.dispose();
    this.canvas.parentElement?.classList.remove('studio-workspace');
    this.canvas.parentElement?.parentElement?.classList.remove('studio-workspace-layout', 'studio-map-open');
    this.toolbar.remove(); this.preview.remove(); this.modelPanel.remove();
    this.scene.activeCamera = this.shot;
    this.scene.cameraToUseForPointers = this.shot;
  }
}

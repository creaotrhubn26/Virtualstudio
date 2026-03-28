/**
 * Utility functions for PanelCreator
 */

import { PanelConfig } from '../types';
import { CREATORHUB_FUNCTIONS } from '../constants';

/**
 * Generates a unique panel ID from a name
 */
export const generatePanelId = (name: string): string => {
  return `customPanel_${name.toLowerCase().replace(/\s+/g, '_')}`;
};

/**
 * Generates HTML content for a CreatorHub function
 */
export const generateFunctionContent = (functionId: string): string => {
  const templates: Record<string, string> = {
    help: `
      <div class="custom-panel-content">
        <h2>Hjelp & Dokumentasjon</h2>
        <p>Dette panelet gir deg tilgang til hjelp og dokumentasjon for CreatorHub Virtual Studio.</p>
        <div class="help-section">
          <h3>Hurtigstart</h3>
          <ul>
            <li>Bruk resize handle øverst for å justere størrelse</li>
            <li>Klikk på resize handle for å maksimere/minimere</li>
            <li>Bruk fullscreen-knappen for fullskjermvisning</li>
          </ul>
        </div>
      </div>
    `,
    notes: `
      <div class="custom-panel-content">
        <h2>Notater</h2>
        <textarea id="notesTextarea" style="width: 100%; min-height: 300px; padding: 12px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-family: inherit;" placeholder="Skriv notater her..."></textarea>
        <button onclick="saveNotes()" style="margin-top: 12px; padding: 8px 16px; background: #00d4ff; color: #000; border: none; border-radius: 4px; cursor: pointer;">Lagre notater</button>
        <script>
          function saveNotes() {
            const textarea = document.getElementById('notesTextarea');
            if (textarea) {
              const userId = (window.__currentUserId || 'default-user');
              fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  namespace: 'virtualStudio_panelNotes',
                  data: textarea.value
                })
              }).then(() => showSuccess('Notater lagret!'));
            }
          }
          window.addEventListener('DOMContentLoaded', () => {
            const textarea = document.getElementById('notesTextarea');
            if (textarea) {
              const userId = (window.__currentUserId || 'default-user');
              fetch('/api/settings?user_id=' + encodeURIComponent(userId) + '&namespace=virtualStudio_panelNotes')
                .then(r => r.json())
                .then(data => {
                  if (data && typeof data.data === 'string') textarea.value = data.data;
                });
            }
          });
        </script>
      </div>
    `,
    scenes: `
      <div class="custom-panel-content">
        <h2>Scener</h2>
        <div style="margin-bottom: 16px;">
          <button id="loadSceneBtn" onclick="loadSceneBrowser()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;">Last inn Scene Browser</button>
          <button id="createSceneBtn" onclick="createNewScene()" style="padding: 10px 20px; background: rgba(88, 166, 255, 0.2); color: #58a6ff; border: 1px solid #58a6ff; border-radius: 6px; cursor: pointer; font-weight: 500;">Opprett ny scene</button>
        </div>
        <div id="sceneList" style="display: grid; gap: 12px;">
          <p style="color: rgba(255,255,255,0.6);">Ingen scener lastet. Klikk "Last inn Scene Browser" for å se tilgjengelige scener.</p>
        </div>
        <script>
          function loadSceneBrowser() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'scener' }
            }));
            if (typeof showInfo === 'function') showInfo('Scene Browser vil åpnes i hovedvinduet');
          }
          function createNewScene() {
            window.dispatchEvent(new CustomEvent('ch-open-scene-composer', {
              detail: { tab: 'scenes' }
            }));
          }
          window.addEventListener('scene-loaded', (e) => {
            const sceneList = document.getElementById('sceneList');
            if (sceneList) {
              sceneList.innerHTML = '<p style="color: rgba(255,255,255,0.9);">Scene lastet: ' + (e.detail?.name || 'Ukjent') + '</p>';
            }
          });
        </script>
      </div>
    `,
    assets: `
      <div class="custom-panel-content">
        <h2>Assets</h2>
        <div style="margin-bottom: 16px;">
          <input type="text" id="assetSearch" placeholder="Søk etter assets..." style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 12px;" />
          <button onclick="loadAssetLibrary()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Åpne Asset Library</button>
        </div>
        <div id="assetGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
          <p style="color: rgba(255,255,255,0.6); grid-column: 1/-1;">Ingen assets lastet. Klikk "Åpne Asset Library" for å se tilgjengelige assets.</p>
        </div>
        <script>
          function loadAssetLibrary() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'assets' }
            }));
          }
          document.getElementById('assetSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('#assetGrid > div[data-asset-name]');
            items.forEach(item => {
              const name = item.getAttribute('data-asset-name')?.toLowerCase() || '';
              item.style.display = name.includes(query) ? 'block' : 'none';
            });
          });
        </script>
      </div>
    `,
    timeline: `
      <div class="custom-panel-content">
        <h2>Tidslinje</h2>
        <div style="margin-bottom: 16px;">
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button onclick="playTimeline()" style="padding: 8px 16px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer;">▶ Spill av</button>
            <button onclick="pauseTimeline()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">⏸ Pause</button>
            <button onclick="stopTimeline()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">⏹ Stopp</button>
          </div>
          <input type="range" id="timelineSlider" min="0" max="100" value="0" style="width: 100%;" oninput="seekTimeline(this.value)" />
          <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-top: 4px;">
            <span id="timelineCurrent">00:00</span>
            <span id="timelineDuration">00:00</span>
          </div>
        </div>
        <div id="timelineTracks" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; min-height: 200px;">
          <p style="color: rgba(255,255,255,0.6);">Ingen spor i tidslinjen. Legg til animasjoner eller hendelser her.</p>
        </div>
        <script>
          function playTimeline() {
            const event = new CustomEvent('timeline-play');
            window.dispatchEvent(event);
          }
          function pauseTimeline() {
            const event = new CustomEvent('timeline-pause');
            window.dispatchEvent(event);
          }
          function stopTimeline() {
            const event = new CustomEvent('timeline-stop');
            window.dispatchEvent(event);
          }
          function seekTimeline(value) {
            const event = new CustomEvent('timeline-seek', { detail: { position: parseInt(value) } });
            window.dispatchEvent(event);
          }
        </script>
      </div>
    `,
    lights: `
      <div class="custom-panel-content">
        <h2>Lys</h2>
        <div style="margin-bottom: 16px;">
          <button onclick="openLightBrowser()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;">Åpne Light Browser</button>
          <button onclick="openLightControl()" style="padding: 10px 20px; background: rgba(88, 166, 255, 0.2); color: #58a6ff; border: 1px solid #58a6ff; border-radius: 6px; cursor: pointer; font-weight: 500;">Lys-kontroller</button>
        </div>
        <div id="lightList" style="display: grid; gap: 12px;">
          <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>Key Light</strong>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" checked onchange="toggleLight('key', this.checked)" />
                <span>Aktiver</span>
              </label>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">Intensitet</label>
                <input type="range" min="0" max="100" value="75" oninput="adjustLightIntensity('key', this.value)" />
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">CCT</label>
                <input type="range" min="2000" max="10000" value="5600" oninput="adjustLightCCT('key', this.value)" />
              </div>
            </div>
          </div>
        </div>
        <script>
          function openLightBrowser() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'lights' }
            }));
          }
          function openLightControl() {
            window.dispatchEvent(new CustomEvent('vs-open-camera-controls-tab', {
              detail: { tab: 'light' }
            }));
          }
          function toggleLight(lightId, enabled) {
            const event = new CustomEvent('light-toggle', { detail: { id: lightId, enabled } });
            window.dispatchEvent(event);
          }
          function adjustLightIntensity(lightId, value) {
            const event = new CustomEvent('light-intensity', { detail: { id: lightId, intensity: value } });
            window.dispatchEvent(event);
          }
          function adjustLightCCT(lightId, value) {
            const event = new CustomEvent('light-cct', { detail: { id: lightId, cct: value } });
            window.dispatchEvent(event);
          }
        </script>
      </div>
    `,
    camera: `
      <div class="custom-panel-content">
        <h2>Kamera</h2>
        <div style="margin-bottom: 16px;">
          <button onclick="openCameraGear()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;">Kamera-utstyr</button>
          <button onclick="openCameraControl()" style="padding: 10px 20px; background: rgba(88, 166, 255, 0.2); color: #58a6ff; border: 1px solid #58a6ff; border-radius: 6px; cursor: pointer; font-weight: 500;">Kamera-kontroller</button>
        </div>
        <div style="display: grid; gap: 12px;">
          <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
            <h3 style="margin: 0 0 12px 0; font-size: 1rem;">Kamera-innstillinger</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">Blender (f-stop)</label>
                <select id="cameraFStop" onchange="updateCameraSetting('fstop', this.value)" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;">
                  <option value="1.4">f/1.4</option>
                  <option value="2.0">f/2.0</option>
                  <option value="2.8">f/2.8</option>
                  <option value="4.0" selected>f/4.0</option>
                  <option value="5.6">f/5.6</option>
                  <option value="8.0">f/8.0</option>
                  <option value="11">f/11</option>
                  <option value="16">f/16</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">ISO</label>
                <input type="number" id="cameraISO" value="400" min="100" max="3200" step="100" onchange="updateCameraSetting('iso', this.value)" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">Shutter Speed</label>
                <select id="cameraShutter" onchange="updateCameraSetting('shutter', this.value)" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;">
                  <option value="1/30">1/30</option>
                  <option value="1/60">1/60</option>
                  <option value="1/125" selected>1/125</option>
                  <option value="1/250">1/250</option>
                  <option value="1/500">1/500</option>
                  <option value="1/1000">1/1000</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; margin-bottom: 4px;">Focal Length</label>
                <input type="number" id="cameraFocal" value="50" min="10" max="200" step="5" onchange="updateCameraSetting('focal', this.value)" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;" />
              </div>
            </div>
          </div>
        </div>
        <script>
          function openCameraGear() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'camera' }
            }));
          }
          function openCameraControl() {
            window.dispatchEvent(new CustomEvent('vs-open-camera-controls-tab', {
              detail: { tab: 'camera' }
            }));
          }
          function updateCameraSetting(setting, value) {
            const event = new CustomEvent('camera-setting-change', { detail: { setting, value } });
            window.dispatchEvent(event);
          }
        </script>
      </div>
    `,
    characters: `
      <div class="custom-panel-content">
        <h2>Karakterer</h2>
        <div style="margin-bottom: 16px;">
          <input type="text" id="characterSearch" placeholder="Søk etter karakterer..." style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 12px;" />
          <button onclick="loadCharacterLibrary()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Åpne Character Library</button>
        </div>
        <div id="characterGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
          <p style="color: rgba(255,255,255,0.6); grid-column: 1/-1;">Ingen karakterer lastet. Klikk "Åpne Character Library" for å se tilgjengelige karakterer.</p>
        </div>
        <script>
          function loadCharacterLibrary() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'models' }
            }));
          }
          document.getElementById('characterSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('#characterGrid > div[data-character-name]');
            items.forEach(item => {
              const name = item.getAttribute('data-character-name')?.toLowerCase() || '';
              item.style.display = name.includes(query) ? 'block' : 'none';
            });
          });
        </script>
      </div>
    `,
    equipment: `
      <div class="custom-panel-content">
        <h2>Utstyr</h2>
        <div style="margin-bottom: 16px;">
          <button onclick="loadEquipmentLibrary()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;">Åpne Equipment Library</button>
          <button onclick="addEquipment()" style="padding: 10px 20px; background: rgba(88, 166, 255, 0.2); color: #58a6ff; border: 1px solid #58a6ff; border-radius: 6px; cursor: pointer; font-weight: 500;">Legg til utstyr</button>
        </div>
        <div id="equipmentList" style="display: grid; gap: 12px;">
          <p style="color: rgba(255,255,255,0.6);">Ingen utstyr lastet. Klikk "Åpne Equipment Library" for å se tilgjengelige utstyr.</p>
        </div>
        <script>
          function loadEquipmentLibrary() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'equipment' }
            }));
          }
          function addEquipment() {
            const event = new CustomEvent('add-equipment');
            window.dispatchEvent(event);
          }
          window.addEventListener('equipment-loaded', (e) => {
            const equipmentList = document.getElementById('equipmentList');
            if (equipmentList) {
              const item = document.createElement('div');
              item.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);';
              item.innerHTML = '<strong>' + (e.detail?.name || 'Ukjent utstyr') + '</strong><br/><span style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">' + (e.detail?.type || '') + '</span>';
              equipmentList.insertBefore(item, equipmentList.firstChild);
            }
          });
        </script>
      </div>
    `,
    hdri: `
      <div class="custom-panel-content">
        <h2>HDRI</h2>
        <div style="margin-bottom: 16px;">
          <input type="text" id="hdriSearch" placeholder="Søk etter HDRI..." style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 12px;" />
          <button onclick="loadHDRILibrary()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Åpne HDRI Library</button>
        </div>
        <div id="hdriGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
          <p style="color: rgba(255,255,255,0.6); grid-column: 1/-1;">Ingen HDRI lastet. Klikk "Åpne HDRI Library" for å se tilgjengelige HDRI-miljøer.</p>
        </div>
        <script>
          function loadHDRILibrary() {
            window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
              detail: { tab: 'hdri' }
            }));
          }
          document.getElementById('hdriSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('#hdriGrid > div[data-hdri-name]');
            items.forEach(item => {
              const name = item.getAttribute('data-hdri-name')?.toLowerCase() || '';
              item.style.display = name.includes(query) ? 'block' : 'none';
            });
          });
          window.addEventListener('hdri-loaded', (e) => {
            const hdriGrid = document.getElementById('hdriGrid');
            if (hdriGrid && hdriGrid.querySelector('p')) {
              hdriGrid.innerHTML = '';
            }
            const item = document.createElement('div');
            item.setAttribute('data-hdri-name', e.detail?.name || '');
            item.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;';
            item.innerHTML = '<strong>' + (e.detail?.name || 'HDRI') + '</strong><br/><span style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">' + (e.detail?.type || '') + '</span>';
            item.onclick = () => {
              const event = new CustomEvent('apply-hdri', { detail: { id: e.detail?.id } });
              window.dispatchEvent(event);
            };
            if (hdriGrid) hdriGrid.appendChild(item);
          });
        </script>
      </div>
    `,
  };
  return templates[functionId] || '<div class="custom-panel-content"><p>Ukjent funksjon. Vennligst velg en gyldig funksjon.</p></div>';
};

/**
 * Generates HTML content for a marketplace service
 */
export const generateServiceContent = (serviceId: string): string => {
  const templates: Record<string, string> = {
    'virtual-studio': `
      <div class="custom-panel-content">
        <h2>Virtual Studio</h2>
        <p>Planlegg casting og rollebesetning for ditt prosjekt.</p>
        <p><em>Denne tjenesten integreres med Virtual Studio systemet.</em></p>
      </div>
    `,
    marketplace: `
      <div class="custom-panel-content">
        <h2>Marketplace</h2>
        <p>Utforsk markedsplassen for assets og tjenester.</p>
        <p><em>Denne tjenesten integreres med Marketplace systemet.</em></p>
      </div>
    `,
    'ai-assistant': `
      <div class="custom-panel-content">
        <h2>AI Assistant</h2>
        <p>Få hjelp fra AI-assistenten for scene-oppsett og mer.</p>
        <p><em>Denne tjenesten integreres med AI Assistant systemet.</em></p>
      </div>
    `,
    analytics: `
      <div class="custom-panel-content">
        <h2>Analytics Dashboard</h2>
        <div style="margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div style="padding: 16px; background: rgba(0,212,255,0.1); border-radius: 8px; border: 1px solid rgba(0,212,255,0.2);">
              <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Prosjekter</div>
              <div style="font-size: 1.5rem; font-weight: 600;" id="statProjects">0</div>
            </div>
            <div style="padding: 16px; background: rgba(88,166,255,0.1); border-radius: 8px; border: 1px solid rgba(88,166,255,0.2);">
              <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Scener</div>
              <div style="font-size: 1.5rem; font-weight: 600;" id="statScenes">0</div>
            </div>
            <div style="padding: 16px; background: rgba(139,92,246,0.1); border-radius: 8px; border: 1px solid rgba(139,92,246,0.2);">
              <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Assets</div>
              <div style="font-size: 1.5rem; font-weight: 600;" id="statAssets">0</div>
            </div>
          </div>
          <button onclick="refreshAnalytics()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Oppdater statistikk</button>
        </div>
        <div id="analyticsChart" style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; min-height: 200px; border: 1px solid rgba(255,255,255,0.1);">
          <p style="color: rgba(255,255,255,0.6); text-align: center;">Last inn statistikk for å se diagrammer</p>
        </div>
        <script>
          function refreshAnalytics() {
            const event = new CustomEvent('refresh-analytics');
            window.dispatchEvent(event);
            if (typeof showInfo === 'function') showInfo('Oppdaterer statistikk...');
          }
          window.addEventListener('analytics-data', (e) => {
            const data = e.detail || {};
            const projects = document.getElementById('statProjects');
            const scenes = document.getElementById('statScenes');
            const assets = document.getElementById('statAssets');
            if (projects) projects.textContent = data.projects || 0;
            if (scenes) scenes.textContent = data.scenes || 0;
            if (assets) assets.textContent = data.assets || 0;
          });
        </script>
      </div>
    `,
    collaboration: `
      <div class="custom-panel-content">
        <h2>Team Collaboration</h2>
        <div style="margin-bottom: 16px;">
          <div style="margin-bottom: 12px;">
            <input type="text" id="teamMemberSearch" placeholder="Søk etter teammedlemmer..." style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;" />
          </div>
          <button onclick="inviteTeamMember()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 8px;">Inviter teammedlem</button>
          <button onclick="createProject()" style="padding: 10px 20px; background: rgba(88, 166, 255, 0.2); color: #58a6ff; border: 1px solid #58a6ff; border-radius: 6px; cursor: pointer; font-weight: 500;">Opprett prosjekt</button>
        </div>
        <div id="teamList" style="display: grid; gap: 12px; margin-bottom: 16px;">
          <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Ditt team</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: rgba(255,255,255,0.6);">Ingen teammedlemmer ennå</p>
              </div>
              <button onclick="inviteTeamMember()" style="padding: 6px 12px; background: rgba(0,212,255,0.2); color: #00d4ff; border: 1px solid #00d4ff; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">+ Inviter</button>
            </div>
          </div>
        </div>
        <div id="collaborationFeed" style="max-height: 300px; overflow-y: auto;">
          <h3 style="margin: 0 0 12px 0; font-size: 1rem;">Aktivitetsfeed</h3>
          <p style="color: rgba(255,255,255,0.6);">Ingen aktivitet ennå</p>
        </div>
        <script>
          function inviteTeamMember() {
            const event = new CustomEvent('invite-team-member');
            window.dispatchEvent(event);
          }
          function createProject() {
            const event = new CustomEvent('create-collaboration-project');
            window.dispatchEvent(event);
          }
        </script>
      </div>
    `,
    export: `
      <div class="custom-panel-content">
        <h2>Export Manager</h2>
        <div style="margin-bottom: 16px;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-size: 0.875rem;">Eksportformat</label>
            <select id="exportFormat" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">
              <option value="image">Bilde (PNG/JPG)</option>
              <option value="video">Video (MP4)</option>
              <option value="glb">3D Model (GLB)</option>
              <option value="json">Data (JSON)</option>
            </select>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-size: 0.875rem;">Oppløsning</label>
            <select id="exportResolution" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="3840x2160" selected>3840x2160 (4K)</option>
              <option value="7680x4320">7680x4320 (8K)</option>
              <option value="custom">Tilpasset</option>
            </select>
          </div>
          <button onclick="startExport()" style="width: 100%; padding: 12px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-bottom: 12px;">Start eksport</button>
          <div id="exportProgress" style="display: none; padding: 12px; background: rgba(0,212,255,0.1); border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Eksporterer...</span>
              <span id="exportPercent">0%</span>
            </div>
            <div style="height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
              <div id="exportBar" style="height: 100%; background: #00d4ff; width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
        </div>
        <div id="exportHistory" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 1rem;">Eksporthistorikk</h3>
          <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem;">Ingen eksporter ennå</p>
        </div>
        <script>
          function startExport() {
            const format = document.getElementById('exportFormat')?.value || 'image';
            const resolution = document.getElementById('exportResolution')?.value || '3840x2160';
            const progressDiv = document.getElementById('exportProgress');
            const progressBar = document.getElementById('exportBar');
            const progressPercent = document.getElementById('exportPercent');
            
            if (progressDiv) progressDiv.style.display = 'block';
            
            const event = new CustomEvent('start-export', { detail: { format, resolution } });
            window.dispatchEvent(event);
            
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
              progress += Math.random() * 15;
              if (progress > 100) progress = 100;
              if (progressBar) progressBar.style.width = progress + '%';
              if (progressPercent) progressPercent.textContent = Math.round(progress) + '%';
              if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                  if (progressDiv) progressDiv.style.display = 'none';
                  if (typeof showSuccess === 'function') showSuccess('Eksport fullført!');
                }, 500);
              }
            }, 200);
          }
        </script>
      </div>
    `,
  };
  return templates[serviceId] || '<div class="custom-panel-content"><p>Ukjent tjeneste. Vennligst velg en gyldig tjeneste.</p></div>';
};

/**
 * Creates default form data
 */
export const createDefaultFormData = () => ({
  name: '',
  title: '',
  description: '',
  enabled: true,
  position: 'bottom' as const,
  defaultHeight: 400,
  content: '',
  type: 'function' as const,
  functionId: '',
  serviceId: '',
});

/**
 * Creates a panel config from form data
 */
export const createPanelConfigFromForm = (
  formData: ReturnType<typeof createDefaultFormData>,
  editingPanel: PanelConfig | null
): PanelConfig => {
  const panelId = editingPanel?.id || generatePanelId(formData.name);
  const storageKey = editingPanel?.storageKey || `customPanel_${panelId}`;

  return {
    id: panelId,
    name: formData.name,
    title: formData.title,
    description: formData.description,
    enabled: formData.enabled ?? true,
    position: formData.position,
    defaultHeight: formData.defaultHeight || 400,
    content: formData.content || '',
    storageKey,
    type: formData.type,
    functionId: formData.functionId,
    serviceId: formData.serviceId,
    category: formData.category,
    tags: formData.tags,
    version: formData.version,
    author: formData.author,
    marketplaceCategory: formData.marketplaceCategory,
    publishedToMarketplace: formData.publishedToMarketplace,
    marketplaceId: formData.marketplaceId,
  };
};

/**
 * Exports a panel to a JSON file
 */
export const exportPanel = (panel: PanelConfig): void => {
  try {
    const dataStr = JSON.stringify(panel, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${panel.name || 'panel'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

/**
 * Exports all panels to a JSON file
 */
export const exportAllPanels = (panels: PanelConfig[]): void => {
  try {
    const dataStr = JSON.stringify(panels, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-panels-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

/**
 * Imports a panel from a JSON file
 */
export const importPanel = (file: File): Promise<PanelConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        
        // Validate imported data
        if (!imported.id || !imported.name || !imported.title) {
          reject(new Error('Ugyldig panel-fil. Mangler påkrevde felt.'));
          return;
        }

        resolve(imported as PanelConfig);
      } catch (error) {
        reject(new Error('Kunne ikke importere panel. Sjekk at filen er gyldig JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Kunne ikke lese filen.'));
    reader.readAsText(file);
  });
};

/**
 * Filters panels based on search query and filters
 */
export const filterPanels = (
  panels: PanelConfig[],
  searchQuery: string,
  filterType: 'all' | 'function' | 'service',
  filterStatus: 'all' | 'enabled' | 'disabled',
  filterPosition: string,
  filterCategory?: string,
  filterTags?: string[]
): PanelConfig[] => {
  return panels.filter(panel => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        panel.name?.toLowerCase().includes(query) ||
        panel.title?.toLowerCase().includes(query) ||
        panel.description?.toLowerCase().includes(query) ||
        panel.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        panel.category?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && panel.type !== filterType) {
      return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'enabled' && !panel.enabled) return false;
      if (filterStatus === 'disabled' && panel.enabled) return false;
    }

    // Position filter
    if (filterPosition !== 'all' && panel.position !== filterPosition) {
      return false;
    }

    // Category filter
    if (filterCategory && filterCategory !== 'all' && panel.category !== filterCategory) {
      return false;
    }

    // Tags filter
    if (filterTags && filterTags.length > 0) {
      const panelTags = panel.tags || [];
      const hasMatchingTag = filterTags.some(filterTag => 
        panelTags.some(tag => tag.toLowerCase() === filterTag.toLowerCase())
      );
      if (!hasMatchingTag) return false;
    }

    return true;
  });
};

/**
 * Toggles a panel's visibility in the DOM
 */
/**
 * Format/prettify HTML content
 */
export const formatHTML = (html: string): string => {
  if (!html || html.trim() === '') return html;
  
  let formatted = html.trim();
  let indent = 0;
  const indentSize = 2;
  const tab = ' '.repeat(indentSize);
  
  // Add newlines after tags
  formatted = formatted
    .replace(/>/g, '>\n')
    .replace(/</g, '\n<')
    .replace(/\n\s*\n/g, '\n'); // Remove empty lines
  
  const lines = formatted.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    
    // Decrease indent for closing tags
    if (trimmed.match(/^<\/[^>]+>/)) {
      indent = Math.max(0, indent - 1);
    }
    
    // Add line with proper indent
    result.push(tab.repeat(indent) + trimmed);
    
    // Increase indent for opening tags (but not self-closing)
    if (trimmed.match(/^<[^/][^>]*>/) && !trimmed.match(/\/>$/)) {
      indent += 1;
    }
  }
  
  return result.join('\n').trim();
};

export const togglePanelVisibility = (panel: PanelConfig): boolean => {
  const panelElement = document.getElementById(panel.id);
  if (!panelElement) {
    return false;
  }

  const isOpen = panelElement.classList.contains('open');
  
  if (isOpen) {
    panelElement.style.display = 'none';
    panelElement.classList.remove('open');
  } else {
    // Close other panels
    const allPanels = document.querySelectorAll('.actor-bottom-panel');
    allPanels.forEach(p => {
      if (p.id !== panel.id && p.classList.contains('open')) {
        (p as HTMLElement).style.display = 'none';
        p.classList.remove('open');
      }
    });

    panelElement.style.display = 'flex';
    panelElement.classList.add('open');
    
    // Check if any panel was at max height
    const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
    const setMaxHeight = (window as any).setPanelToMaxHeight;
    if (checkMaxHeight && setMaxHeight && checkMaxHeight(panel.id)) {
      setMaxHeight(panel.id, `${panel.storageKey}Height`);
    }
  }
  
  return !isOpen;
};

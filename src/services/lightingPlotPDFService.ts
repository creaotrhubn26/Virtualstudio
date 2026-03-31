/**
 * Lighting Plot PDF Service
 * Generates a printable floor-plan lighting plot from the current scene state.
 * Output: SVG-based top-down floor plan ready for print / PDF via browser dialog.
 */

export interface PlotLight {
  id: string;
  name: string;
  type: string;
  x: number;        // Babylon world X (meters)
  z: number;        // Babylon world Z (meters, used as Y on floor plan)
  y: number;        // Height above floor in meters
  cct: number;      // Colour temperature K
  intensity: number;
  modifier: string;
  enabled: boolean;
  beamAngle?: number;
}

export interface PlotCharacter {
  id: string;
  name: string;
  x: number;
  z: number;
}

export interface PlotProp {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface LightingPlotData {
  sceneName: string;
  lights: PlotLight[];
  characters: PlotCharacter[];
  props: PlotProp[];
  studioWidth: number;   // metres
  studioDepth: number;   // metres
  exportedAt: string;
}

const LIGHT_COLORS: Record<string, string> = {
  spot: '#e8a235',
  strobe: '#e84040',
  fresnel: '#35b4e8',
  area: '#8b5cf6',
  kinoflo: '#44c97e',
  led: '#44c97e',
  hmi: '#e8e835',
  tungsten: '#e87035',
  key: '#e8a235',
  fill: '#35b4e8',
  rim: '#e835c8',
  background: '#888',
};

function getLightColor(type: string): string {
  const lower = type.toLowerCase();
  for (const key of Object.keys(LIGHT_COLORS)) {
    if (lower.includes(key)) return LIGHT_COLORS[key];
  }
  return '#e8a235';
}

function cctToHue(cct: number): string {
  if (cct <= 2700) return '#ffb347';
  if (cct <= 3200) return '#ffd090';
  if (cct <= 4000) return '#ffe8c0';
  if (cct <= 5000) return '#fff5e8';
  if (cct <= 5600) return '#ffffff';
  if (cct <= 6500) return '#e8f4ff';
  return '#c8e0ff';
}

function worldToPlot(worldX: number, worldZ: number, studioW: number, studioD: number, svgW: number, svgH: number, margin: number): [number, number] {
  const plotW = svgW - 2 * margin;
  const plotH = svgH - 2 * margin;
  const px = margin + ((worldX + studioW / 2) / studioW) * plotW;
  const py = margin + ((worldZ + studioD / 2) / studioD) * plotH;
  return [px, py];
}

export function generateLightingPlotSVG(data: LightingPlotData): string {
  const svgW = 1200;
  const svgH = 900;
  const margin = 80;
  const { studioWidth, studioDepth } = data;
  const activeLights = data.lights.filter(l => l.enabled !== false);

  let svgParts: string[] = [];

  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);

  svgParts.push(`<style>
    text { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .title { font-size: 18px; font-weight: bold; fill: #111; }
    .subtitle { font-size: 12px; fill: #555; }
    .light-label { font-size: 9px; fill: #111; }
    .light-sub { font-size: 8px; fill: #444; }
    .grid-line { stroke: #ccc; stroke-width: 0.5; stroke-dasharray: 4,4; }
    .studio-border { stroke: #333; stroke-width: 2; fill: none; }
    .character-marker { fill: #2c6e49; stroke: #1a4e35; stroke-width: 1; }
    .prop-marker { fill: #b5c8e2; stroke: #557; stroke-width: 1; }
    .dim-arrow { stroke: #888; stroke-width: 1; fill: #888; }
    .compass { fill: #e84040; }
  </style>`);

  // White background
  svgParts.push(`<rect width="${svgW}" height="${svgH}" fill="white"/>`);

  // Header
  svgParts.push(`<text x="40" y="35" class="title">Lysplan — ${data.sceneName || 'Studio Scene'}</text>`);
  svgParts.push(`<text x="40" y="54" class="subtitle">Eksportert: ${data.exportedAt} · Studio: ${studioWidth}m × ${studioDepth}m · ${activeLights.length} lyskilder</text>`);

  const plotX = margin;
  const plotY = margin + 30;
  const plotW = svgW - 2 * margin - 160;
  const plotH = svgH - 2 * margin - 80;

  // Grid (1m squares)
  const cols = studioWidth;
  const rows = studioDepth;
  for (let c = 0; c <= cols; c++) {
    const x = plotX + (c / cols) * plotW;
    svgParts.push(`<line x1="${x}" y1="${plotY}" x2="${x}" y2="${plotY + plotH}" class="grid-line"/>`);
    if (c < cols) {
      svgParts.push(`<text x="${x + (plotW / cols) / 2}" y="${plotY + plotH + 14}" text-anchor="middle" style="font-size:8px;fill:#999">${c - Math.floor(cols / 2)}m</text>`);
    }
  }
  for (let r = 0; r <= rows; r++) {
    const y = plotY + (r / rows) * plotH;
    svgParts.push(`<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" class="grid-line"/>`);
    if (r < rows) {
      svgParts.push(`<text x="${plotX - 6}" y="${y + (plotH / rows) / 2 + 4}" text-anchor="end" style="font-size:8px;fill:#999">${r - Math.floor(rows / 2)}m</text>`);
    }
  }

  // Studio border
  svgParts.push(`<rect x="${plotX}" y="${plotY}" width="${plotW}" height="${plotH}" class="studio-border"/>`);

  // Camera (viewer's position — origin looking into scene)
  const [camX, camY] = [plotX + plotW / 2, plotY + plotH - 14];
  svgParts.push(`<polygon points="${camX},${camY - 14} ${camX - 10},${camY + 6} ${camX + 10},${camY + 6}" fill="#1a6ef5" opacity="0.85"/>`);
  svgParts.push(`<text x="${camX}" y="${camY + 18}" text-anchor="middle" style="font-size:8px;fill:#1a6ef5;font-weight:bold">KAMERA</text>`);

  // Backdrop line at the back (Z = -studioDepth/2 → top of plot)
  svgParts.push(`<line x1="${plotX + 8}" y1="${plotY + 8}" x2="${plotX + plotW - 8}" y2="${plotY + 8}" stroke="#555" stroke-width="4" stroke-linecap="round"/>`);
  svgParts.push(`<text x="${plotX + plotW / 2}" y="${plotY + 20}" text-anchor="middle" style="font-size:8px;fill:#555">BAKVEGG / BAKGRUNN</text>`);

  // Characters
  for (const ch of data.characters) {
    const [cx, cy] = worldToPlot(ch.x, ch.z, studioWidth, studioDepth, plotW, plotH, 0);
    const px = plotX + cx;
    const py = plotY + cy;
    svgParts.push(`<circle cx="${px}" cy="${py}" r="10" class="character-marker" opacity="0.75"/>`);
    svgParts.push(`<text x="${px}" y="${py + 18}" text-anchor="middle" style="font-size:8px;fill:#2c6e49">${ch.name}</text>`);
  }

  // Props
  for (const prop of data.props) {
    const [px, py] = worldToPlot(prop.x, prop.z, studioWidth, studioDepth, plotW, plotH, 0);
    const rw = Math.max(16, (prop.w / studioWidth) * plotW);
    const rd = Math.max(12, (prop.d / studioDepth) * plotH);
    svgParts.push(`<rect x="${plotX + px - rw / 2}" y="${plotY + py - rd / 2}" width="${rw}" height="${rd}" class="prop-marker" rx="2" opacity="0.6"/>`);
    svgParts.push(`<text x="${plotX + px}" y="${plotY + py + 4}" text-anchor="middle" style="font-size:7px;fill:#333">${prop.name}</text>`);
  }

  // Lights
  for (const light of activeLights) {
    const [lx, ly] = worldToPlot(light.x, light.z, studioWidth, studioDepth, plotW, plotH, 0);
    const px = plotX + lx;
    const py = plotY + ly;
    const col = getLightColor(light.type);
    const r = 16;

    // Beam cone (approximate)
    const beamHalfAngle = ((light.beamAngle || 45) / 2) * (Math.PI / 180);
    const coneLength = Math.min(60, plotH * 0.25);
    const coneHalfW = Math.tan(beamHalfAngle) * coneLength;
    svgParts.push(`<polygon points="${px},${py} ${px - coneHalfW},${py + coneLength} ${px + coneHalfW},${py + coneLength}" fill="${col}" opacity="0.12"/>`);

    // Circle body
    svgParts.push(`<circle cx="${px}" cy="${py}" r="${r}" fill="${col}" opacity="0.9" stroke="#333" stroke-width="1.5"/>`);

    // CCT inner disc
    svgParts.push(`<circle cx="${px}" cy="${py}" r="${r * 0.55}" fill="${cctToHue(light.cct)}" opacity="0.9"/>`);

    // Modifier ring (dashed = modified)
    if (light.modifier && light.modifier !== 'none') {
      svgParts.push(`<circle cx="${px}" cy="${py}" r="${r + 4}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.7"/>`);
    }

    // Height badge
    const hStr = light.y.toFixed(1) + 'm';
    svgParts.push(`<rect x="${px + r - 2}" y="${py - r - 12}" width="${hStr.length * 5 + 4}" height="10" fill="white" stroke="#ccc" stroke-width="0.5" rx="2"/>`);
    svgParts.push(`<text x="${px + r}" y="${py - r - 3}" style="font-size:7px;fill:#555">↑${hStr}</text>`);

    // Label
    const labelY = py + r + 12;
    svgParts.push(`<text x="${px}" y="${labelY}" text-anchor="middle" class="light-label" font-weight="bold">${light.name}</text>`);
    svgParts.push(`<text x="${px}" y="${labelY + 10}" text-anchor="middle" class="light-sub">${light.cct}K · ${light.intensity.toFixed(0)}%</text>`);
    if (light.modifier && light.modifier !== 'none') {
      svgParts.push(`<text x="${px}" y="${labelY + 20}" text-anchor="middle" class="light-sub">[${light.modifier}]</text>`);
    }
  }

  // Legend (right side panel)
  const legendX = svgW - 145;
  const legendY = plotY + 10;
  svgParts.push(`<rect x="${legendX - 8}" y="${legendY - 8}" width="138" height="${Math.max(200, activeLights.length * 22 + 80)}" fill="#f8f8f8" stroke="#ddd" stroke-width="1" rx="4"/>`);
  svgParts.push(`<text x="${legendX}" y="${legendY + 8}" style="font-size:10px;font-weight:bold;fill:#333">Lyskilder</text>`);

  for (let i = 0; i < activeLights.length; i++) {
    const l = activeLights[i];
    const ry = legendY + 28 + i * 22;
    const lc = getLightColor(l.type);
    svgParts.push(`<circle cx="${legendX + 6}" cy="${ry}" r="6" fill="${lc}" stroke="#333" stroke-width="1"/>`);
    svgParts.push(`<text x="${legendX + 16}" y="${ry + 4}" style="font-size:8px;fill:#333;font-weight:bold">${l.name}</text>`);
    svgParts.push(`<text x="${legendX + 16}" y="${ry + 14}" style="font-size:7px;fill:#666">${l.cct}K · ${l.intensity.toFixed(0)}% · ${l.y.toFixed(1)}m</text>`);
  }

  // Compass
  const cx2 = plotX + plotW - 30;
  const cy2 = plotY + 30;
  svgParts.push(`<text x="${cx2}" y="${cy2 - 16}" text-anchor="middle" style="font-size:9px;fill:#e84040;font-weight:bold">N</text>`);
  svgParts.push(`<line x1="${cx2}" y1="${cy2 - 12}" x2="${cx2}" y2="${cy2 + 12}" stroke="#e84040" stroke-width="1.5"/>`);
  svgParts.push(`<polygon points="${cx2},${cy2 - 12} ${cx2 - 5},${cy2} ${cx2 + 5},${cy2}" fill="#e84040"/>`);

  // Footer
  svgParts.push(`<text x="40" y="${svgH - 16}" style="font-size:9px;fill:#aaa">Virtual Studio · Lysplan · Konfidensielt</text>`);
  svgParts.push(`<text x="${svgW - 40}" y="${svgH - 16}" text-anchor="end" style="font-size:9px;fill:#aaa">${data.exportedAt}</text>`);

  svgParts.push(`</svg>`);
  return svgParts.join('\n');
}

export function downloadLightingPlotSVG(data: LightingPlotData): void {
  const svg = generateLightingPlotSVG(data);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lysplan-${(data.sceneName || 'studio').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printLightingPlot(data: LightingPlotData): void {
  const svg = generateLightingPlotSVG(data);
  const win = window.open('', '_blank', 'width=1280,height=960');
  if (!win) {
    console.warn('[LightingPlot] Popup blocked — falling back to SVG download');
    downloadLightingPlotSVG(data);
    return;
  }
  win.document.write(`<!DOCTYPE html><html lang="no"><head>
    <meta charset="UTF-8">
    <title>Lysplan — ${data.sceneName || 'Studio'}</title>
    <style>
      @page { size: A3 landscape; margin: 10mm; }
      body { margin: 0; padding: 0; background: white; }
      svg { width: 100%; height: auto; display: block; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>${svg}
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}

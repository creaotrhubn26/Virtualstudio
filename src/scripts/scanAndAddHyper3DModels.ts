/**
 * Scan and add Hyper3D models to the user library.
 * Fetches generated Rodin models from backend and stores missing models as user assets.
 */

import { getUserAssets, saveUserAsset } from '@/core/services/userLibrary';

interface RodinModelEntry {
  filename: string;
  url: string;
  size?: number;
}

interface ScanResults {
  added: number;
  skipped: number;
  failed: number;
  notFound: number;
}

const createModelThumbDataUrl = (label: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const gradient = ctx.createLinearGradient(0, 0, 320, 180);
  gradient.addColorStop(0, '#1e1b4b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 320, 180);

  ctx.strokeStyle = 'rgba(148,163,184,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 280, 140);

  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.moveTo(160, 52);
  ctx.lineTo(220, 86);
  ctx.lineTo(220, 134);
  ctx.lineTo(160, 168);
  ctx.lineTo(100, 134);
  ctx.lineTo(100, 86);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hyper3D Model', 160, 30);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(label.slice(0, 24), 160, 172);

  return canvas.toDataURL('image/png');
};

const normalizeTitleFromFilename = (filename: string): string => {
  const noExt = filename.replace(/\.[^/.]+$/, '');
  return noExt
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeModelPath = (url: string, filename: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `/api/rodin/model/${encodeURIComponent(filename)}`;
};

export async function scanAndAddAllModels(): Promise<ScanResults> {
  const results: ScanResults = {
    added: 0,
    skipped: 0,
    failed: 0,
    notFound: 0,
  };

  let models: RodinModelEntry[] = [];

  try {
    const response = await fetch('/api/rodin/models', { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Rodin model scan failed: ${response.status}`);
    }

    const payload = (await response.json()) as { models?: RodinModelEntry[] };
    models = Array.isArray(payload.models) ? payload.models : [];
  } catch (error) {
    throw new Error(
      `Unable to fetch Rodin model list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (models.length === 0) {
    results.notFound = 1;
    return results;
  }

  const existing = await getUserAssets('model');
  const existingModelUrls = new Set(
    existing
      .map((asset) => asset.data?.modelUrl)
      .filter((url): url is string => typeof url === 'string' && url.length > 0),
  );

  for (const model of models) {
    const modelUrl = normalizeModelPath(model.url, model.filename);
    if (existingModelUrls.has(modelUrl)) {
      results.skipped += 1;
      continue;
    }

    try {
      const title = normalizeTitleFromFilename(model.filename) || 'Hyper3D model';

      await saveUserAsset({
        type: 'model',
        title,
        thumbDataUrl: createModelThumbDataUrl(title),
        data: {
          modelUrl,
          category: 'hyper3d',
          metadata: {
            source: 'rodin',
            filename: model.filename,
            size: model.size,
            importedAt: new Date().toISOString(),
          },
        },
      });

      existingModelUrls.add(modelUrl);
      results.added += 1;
    } catch (error) {
      console.error(`Failed adding model ${model.filename}:`, error);
      results.failed += 1;
    }
  }

  return results;
}

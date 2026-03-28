import type { MarketplaceReleaseDashboardEntry } from '../core/models/marketplace';

export type MarketplaceReleaseAuditAction = 'review' | 'promote' | 'rollback';

export interface MarketplaceReleaseAuditChange {
  id: string;
  label: string;
  before: string;
  after: string;
}

export interface MarketplaceReleaseAuditResult {
  title: string;
  actionLabel: string;
  summary: string;
  targetVersion: string | null;
  changelog: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  changes: MarketplaceReleaseAuditChange[];
  previews: {
    before: {
      label: string;
      version: string | null;
      image: string | null;
      caption: string;
    };
    after: {
      label: string;
      version: string | null;
      image: string | null;
      caption: string;
    };
  };
  heatmap: {
    image: string | null;
    caption: string;
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPreviewPlaceholder(label: string, caption: string, accentHex: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="100%" stop-color="${accentHex}" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect x="64" y="64" width="1152" height="592" rx="32" fill="rgba(15,23,42,0.72)" stroke="rgba(255,255,255,0.14)" stroke-width="2" />
      <text x="110" y="184" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="28" opacity="0.72">Marketplace Release Audit</text>
      <text x="110" y="292" fill="#ffffff" font-family="Arial, sans-serif" font-size="64" font-weight="700">${label}</text>
      <text x="110" y="360" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="28">${caption}</text>
      <text x="110" y="590" fill="#93c5fd" font-family="Arial, sans-serif" font-size="24">Ingen lagret preview tilgjengelig</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolvePreviewImage(
  image: string | null | undefined,
  label: string,
  caption: string,
  accentHex: string,
): string {
  if (typeof image === 'string' && image.trim().length > 0) {
    return image;
  }
  return buildPreviewPlaceholder(label, caption, accentHex);
}

function buildHeatmapDiffImage(
  beforeImage: string | null,
  afterImage: string | null,
  beforeLabel: string,
  afterLabel: string,
): string | null {
  if (!beforeImage || !afterImage) {
    return null;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="heatmapBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="100%" stop-color="#450a0a" />
        </linearGradient>
        <linearGradient id="heatmapLegend" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1d4ed8" />
          <stop offset="38%" stop-color="#facc15" />
          <stop offset="68%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#heatmapBg)" />
      <image href="${escapeXml(beforeImage)}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" opacity="0.34" />
      <image href="${escapeXml(afterImage)}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" opacity="0.9" style="mix-blend-mode:difference; filter:saturate(3) contrast(2.2) brightness(1.15);" />
      <rect width="1280" height="720" fill="url(#heatmapLegend)" opacity="0.26" style="mix-blend-mode:screen;" />
      <rect x="54" y="54" width="1172" height="612" rx="30" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
      <rect x="86" y="88" width="292" height="112" rx="22" fill="rgba(2,6,23,0.72)" />
      <text x="118" y="138" fill="#f8fafc" font-family="Arial, sans-serif" font-size="26" font-weight="700">Heatmap-diff</text>
      <text x="118" y="176" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="20">${escapeXml(beforeLabel)} → ${escapeXml(afterLabel)}</text>
      <rect x="898" y="604" width="268" height="20" rx="10" fill="url(#heatmapLegend)" />
      <text x="898" y="594" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="18">Lav endring</text>
      <text x="1092" y="594" fill="#fee2e2" font-family="Arial, sans-serif" font-size="18">Høy endring</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function readSourceSnapshot(entry: MarketplaceReleaseDashboardEntry, source: 'stable' | 'candidate') {
  const product = source === 'stable' ? entry.currentStable : entry.currentCandidate;
  return product?.environmentPackage?.sourceSnapshot || null;
}

function readQualityScore(entry: MarketplaceReleaseDashboardEntry, source: 'stable' | 'candidate'): number | null {
  const product = source === 'stable' ? entry.currentStable : entry.currentCandidate;
  const rawScore = product?.environmentPackage?.qualityReport?.score ?? entry.qualityReport?.score;
  return typeof rawScore === 'number' ? rawScore : null;
}

function buildChange(id: string, label: string, before: unknown, after: unknown): MarketplaceReleaseAuditChange | null {
  const normalizedBefore = String(before ?? 'ukjent');
  const normalizedAfter = String(after ?? 'ukjent');
  if (normalizedBefore === normalizedAfter) {
    return null;
  }
  return {
    id,
    label,
    before: normalizedBefore,
    after: normalizedAfter,
  };
}

export function buildMarketplaceReleaseAudit(
  entry: MarketplaceReleaseDashboardEntry,
  action: MarketplaceReleaseAuditAction,
  targetVersion?: string | null,
): MarketplaceReleaseAuditResult {
  const stable = entry.currentStable;
  const candidate = entry.currentCandidate;
  const rollbackTarget = entry.rollbackTarget;
  const stableSnapshot = readSourceSnapshot(entry, 'stable');
  const candidateSnapshot = readSourceSnapshot(entry, 'candidate');
  const changelog = entry.changelog || candidate?.whatsNew || stable?.whatsNew || candidate?.description || stable?.description || 'Ingen changelog registrert ennå.';

  const scoreBefore = readQualityScore(entry, action === 'rollback' ? 'candidate' : 'stable');
  const scoreAfter = readQualityScore(entry, action === 'rollback' ? 'stable' : 'candidate');

  const changes = [
    buildChange('version', 'Versjon', stable?.version || 'ingen stable', action === 'rollback' ? (targetVersion || entry.rollbackTargetVersions[0] || stable?.version || 'ukjent') : (candidate?.version || stable?.version || 'ukjent')),
    buildChange('roomShellType', 'Room shell', stableSnapshot?.roomShellType, candidateSnapshot?.roomShellType),
    buildChange('propCount', 'Props', stableSnapshot?.propCount, candidateSnapshot?.propCount),
    buildChange('actorCount', 'Karakterer', stableSnapshot?.actorCount, candidateSnapshot?.actorCount),
    buildChange('lightCount', 'Lys', stableSnapshot?.lightCount, candidateSnapshot?.lightCount),
    buildChange('familyId', 'Scenefamilie', stable?.environmentPackage?.familyId, candidate?.environmentPackage?.familyId),
  ].filter((change): change is MarketplaceReleaseAuditChange => Boolean(change));

  const beforePreview = {
    label: action === 'review' ? 'Stable' : 'Nåværende stable',
    version: stable?.version || null,
    caption: stable?.description || stable?.environmentPackage?.summary || (
      action === 'review'
        ? 'Gjeldende stable-versjon.'
        : 'Stable-versjonen som er publisert i dag.'
    ),
    image: resolvePreviewImage(
      stable?.thumbnail || stable?.environmentPackage?.previewImage || null,
      action === 'review' ? 'Stable' : 'Nåværende stable',
      stable?.description || stable?.environmentPackage?.summary || (
        action === 'review'
          ? 'Gjeldende stable-versjon.'
          : 'Stable-versjonen som er publisert i dag.'
      ),
      '#1d4ed8',
    ),
  };
  const candidatePreview = {
    label: action === 'review' ? 'Candidate' : 'Ny candidate',
    version: candidate?.version || null,
    caption: candidate?.whatsNew || candidate?.description || candidate?.environmentPackage?.summary || (
      action === 'review'
        ? 'Foreslått candidate-versjon.'
        : 'Candidate-versjonen som er klar for promote.'
    ),
    image: resolvePreviewImage(
      candidate?.thumbnail || candidate?.environmentPackage?.previewImage || null,
      action === 'review' ? 'Candidate' : 'Ny candidate',
      candidate?.whatsNew || candidate?.description || candidate?.environmentPackage?.summary || (
        action === 'review'
          ? 'Foreslått candidate-versjon.'
          : 'Candidate-versjonen som er klar for promote.'
      ),
      '#059669',
    ),
  };

  if (action === 'rollback') {
    const rollbackPreview = {
      label: 'Rollback-mål',
      version: targetVersion || rollbackTarget?.version || entry.rollbackTargetVersions[0] || null,
      caption: rollbackTarget?.summary || 'Tidligere stable-versjon som gjenopprettes.',
      image: resolvePreviewImage(
        rollbackTarget?.thumbnail || null,
        'Rollback-mål',
        rollbackTarget?.summary || 'Tidligere stable-versjon som gjenopprettes.',
        '#7c3aed',
      ),
    };
    return {
      title: `Rollback ${entry.productName}`,
      actionLabel: 'Bekreft rollback',
      summary: `Ruller tilbake ${entry.productName} fra stable ${stable?.version || 'ukjent'} til ${targetVersion || entry.rollbackTargetVersions[0] || 'forrige stable'}.`,
      targetVersion: targetVersion || entry.rollbackTargetVersions[0] || null,
      changelog,
      scoreBefore,
      scoreAfter,
      changes,
      previews: {
        before: {
          ...beforePreview,
          caption: stable?.description || stable?.environmentPackage?.summary || 'Dagens publiserte stable-versjon.',
        },
        after: rollbackPreview,
      },
      heatmap: {
        image: buildHeatmapDiffImage(beforePreview.image, rollbackPreview.image, beforePreview.label, rollbackPreview.label),
        caption: 'Heatmap fremhever hvor rollback-målet skiller seg visuelt fra dagens stable-versjon.',
      },
    };
  }

  if (action === 'promote') {
    return {
      title: `Promoter ${entry.productName}`,
      actionLabel: 'Promoter til stable',
      summary: `Publiser candidate ${candidate?.version || 'ukjent'} som ny stable-versjon for ${entry.productName}.`,
      targetVersion: candidate?.version || null,
      changelog,
      scoreBefore,
      scoreAfter,
      changes,
      previews: {
        before: beforePreview,
        after: candidatePreview,
      },
      heatmap: {
        image: buildHeatmapDiffImage(beforePreview.image, candidatePreview.image, beforePreview.label, candidatePreview.label),
        caption: 'Heatmap fremhever endringer mellom dagens stable og candidate-versjonen som foreslås promotert.',
      },
    };
  }

  return {
    title: `Release audit for ${entry.productName}`,
    actionLabel: 'Lukk',
    summary: `Sammenligner dagens stable- og candidate-versjon for ${entry.productName}.`,
    targetVersion: candidate?.version || stable?.version || null,
    changelog,
    scoreBefore: readQualityScore(entry, 'stable'),
    scoreAfter: readQualityScore(entry, 'candidate'),
    changes,
    previews: {
      before: beforePreview,
      after: candidatePreview,
    },
    heatmap: {
      image: buildHeatmapDiffImage(beforePreview.image, candidatePreview.image, beforePreview.label, candidatePreview.label),
      caption: 'Heatmap fremhever hvor candidate-avvikene er størst sammenlignet med stable-versjonen.',
    },
  };
}

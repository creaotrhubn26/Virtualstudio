import type { EnvironmentPlan, EnvironmentPlanEvaluationSummary, EnvironmentPlanLightingCue } from '../core/models/environmentPlan';

export interface EnvironmentPlanInsightPresentation {
  familyId: string;
  familyLabel: string;
  summary: string;
  validationModeLabel?: string;
  shellSummary?: string;
  lightingDetails: string[];
}

type SceneFamilyDescriptor = {
  id: string;
  label: string;
};

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function buildIntentText(plan: EnvironmentPlan): string {
  return [
    plan.prompt,
    plan.summary,
    plan.concept,
    plan.camera?.shotType,
    plan.camera?.mood,
    plan.roomShell?.type,
    ...plan.lighting.map((cue) => cue.intent || cue.purpose || cue.role),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferFamily(plan: EnvironmentPlan): SceneFamilyDescriptor {
  const text = buildIntentText(plan);
  const lightingIntents = plan.lighting.map((cue) => normalizeText(cue.intent));
  const hasLightingIntent = (value: string) => lightingIntents.includes(value);

  if (includesAny(text, ['photo studio', 'photography studio', 'seamless', 'cyclorama', 'editorial studio']) || hasLightingIntent('soft_daylight')) {
    return { id: 'photo_studio', label: 'Foto-studio' };
  }
  if (includesAny(text, ['film studio', 'soundstage', 'stage build', 'cinema set', 'backlot'])) {
    return { id: 'film_studio', label: 'Filmstudio' };
  }
  if (includesAny(text, ['beauty', 'editorial', 'cosmetic', 'fashion']) || hasLightingIntent('beauty')) {
    return { id: 'beauty', label: 'Beauty/editorial' };
  }
  if (includesAny(text, ['noir', 'detective', 'venetian', 'low-key']) || hasLightingIntent('noir')) {
    return { id: 'noir', label: 'Noir' };
  }
  if (includesAny(text, ['luxury retail', 'showroom', 'boutique', 'premium retail']) || hasLightingIntent('luxury_retail')) {
    return { id: 'luxury_retail', label: 'Luxury retail' };
  }
  if (includesAny(text, ['warehouse', 'industrial', 'factory', 'garage']) || hasLightingIntent('warehouse')) {
    return { id: 'warehouse', label: 'Warehouse' };
  }
  if (includesAny(text, ['office', 'corporate', 'meeting room', 'interview', 'presentation']) || hasLightingIntent('office')) {
    return { id: 'office', label: 'Kontor/corporate' };
  }
  if (includesAny(text, ['nightclub', 'club', 'dancefloor', 'dj', 'strobe']) || hasLightingIntent('nightclub')) {
    return { id: 'nightclub', label: 'Nightclub' };
  }
  if (includesAny(text, ['pizza', 'restaurant', 'trattoria', 'food']) || hasLightingIntent('food')) {
    return { id: 'food', label: 'Food/restaurant' };
  }
  return { id: 'unknown', label: 'Generisk scene' };
}

function formatValidationMode(evaluation: EnvironmentPlanEvaluationSummary | null | undefined): string | undefined {
  const rawMode = normalizeText(String(evaluation?.providerMetadata?.validationMode || ''));
  if (!rawMode) {
    if (evaluation?.usedVisionModel) {
      return 'Vision/VLM-validering';
    }
    if (evaluation?.previewUsed) {
      return 'Preview-validering';
    }
    return undefined;
  }

  if (rawMode === 'structural_blockout') {
    return 'Strukturell blockout-validering';
  }
  if (includesAny(rawMode, ['vision', 'vlm'])) {
    return 'Vision/VLM-validering';
  }
  if (includesAny(rawMode, ['preview'])) {
    return 'Preview-validering';
  }
  return rawMode.replace(/_/g, ' ');
}

function summarizeShell(plan: EnvironmentPlan): string | undefined {
  const shell = plan.roomShell;
  if (!shell) {
    return undefined;
  }

  const parts = [
    `${shell.type} ${shell.width}x${shell.depth}x${shell.height}m`,
    shell.openCeiling ? 'åpent tak' : null,
    shell.ceilingStyle && shell.ceilingStyle !== 'flat' ? shell.ceilingStyle.replace(/_/g, ' ') : null,
    Array.isArray(shell.openings) && shell.openings.length > 0 ? `${shell.openings.length} åpninger` : null,
    Array.isArray(shell.zones) && shell.zones.length > 0 ? `${shell.zones.length} soner` : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

function formatLightingCue(cue: EnvironmentPlanLightingCue): string {
  const segments = [
    cue.modifier || null,
    cue.beamAngle ? `${Math.round(cue.beamAngle)}°` : null,
    cue.gobo?.goboId ? `gobo ${cue.gobo.goboId}` : null,
    cue.haze?.enabled ? `haze ${cue.haze.density ? cue.haze.density.toFixed(3) : 'på'}` : null,
  ].filter(Boolean);
  const rationale = cue.rationale || cue.gobo?.rationale || cue.haze?.rationale || cue.purpose;
  return `${cue.role}: ${segments.join(' · ') || 'ingen ekstra shaping'}${rationale ? ` — ${rationale}` : ''}`;
}

export function getEnvironmentPlanInsightPresentation(
  plan: EnvironmentPlan | null | undefined,
  evaluation?: EnvironmentPlanEvaluationSummary | null,
): EnvironmentPlanInsightPresentation | null {
  if (!plan) {
    return null;
  }

  const family = inferFamily(plan);
  const validationModeLabel = formatValidationMode(evaluation ?? null);
  const shellSummary = summarizeShell(plan);
  const lightingDetails = plan.lighting
    .slice(0, 3)
    .map(formatLightingCue);

  const summaryParts = [
    `AI leser dette som ${family.label.toLowerCase()}.`,
    plan.camera?.shotType ? `Kamera: ${plan.camera.shotType}.` : null,
    shellSummary ? `Rom: ${shellSummary}.` : null,
  ].filter(Boolean);

  return {
    familyId: family.id,
    familyLabel: family.label,
    summary: summaryParts.join(' '),
    validationModeLabel,
    shellSummary,
    lightingDetails,
  };
}

import type {
  SceneComposition,
  SceneEnvironmentAssemblyValidation,
} from '../core/models/sceneComposer';

export interface SceneAssemblyValidationPresentation {
  severity: 'success' | 'warning' | 'info';
  label: string;
  summary: string;
  details: string[];
}

export type SceneAssemblyValidationFilter = 'all' | 'validated' | 'differences' | 'local';

export function getSceneAssemblyValidationSortRank(
  scene: Pick<SceneComposition, 'environmentAssemblyValidation'>,
): number {
  const validation = scene.environmentAssemblyValidation;
  if (!validation) {
    return 1;
  }
  if (validation.backendValidated && validation.differences.length > 0) {
    return 0;
  }
  if (!validation.backendValidated) {
    return 1;
  }
  return 2;
}

export function getSceneAssemblyValidationPresentation(
  validation: SceneEnvironmentAssemblyValidation | null | undefined,
): SceneAssemblyValidationPresentation | null {
  if (!validation) {
    return null;
  }

  if (validation.backendValidated && validation.differences.length === 0) {
    return {
      severity: 'success',
      label: 'Backend validert',
      summary: 'Scenegraphen matcher backend-assemblyen.',
      details: [
        `${validation.backendRuntimePropCount ?? validation.localRuntimePropCount} props kontrollert`,
        `${validation.backendRelationshipCount ?? validation.localRelationshipCount} relasjoner kontrollert`,
      ],
    };
  }

  if (validation.backendValidated) {
    return {
      severity: 'warning',
      label: `Assembly-avvik (${validation.differences.length})`,
      summary: 'Backend fant avvik mellom lokal og server-side assembly.',
      details: validation.differences,
    };
  }

  return {
    severity: 'info',
    label: 'Lokal assembly',
    summary: 'Scenen ble lagret uten backend-validering.',
    details: [
      'Backend-validering var ikke tilgjengelig da scenen ble bygget.',
    ],
  };
}

export function getSceneAssemblyExportWarning(
  scene: Pick<SceneComposition, 'name' | 'environmentAssemblyValidation'>,
): string | null {
  const validation = scene.environmentAssemblyValidation;
  if (!validation) {
    return null;
  }

  if (validation.backendValidated && validation.differences.length === 0) {
    return null;
  }

  if (validation.backendValidated && validation.differences.length > 0) {
    return [
      `Scenen "${scene.name}" har ${validation.differences.length} assembly-avvik.`,
      'Eksporten vil inkludere denne statusen.',
      'Vil du eksportere likevel?',
    ].join('\n');
  }

  return [
    `Scenen "${scene.name}" ble aldri backend-validert.`,
    'Eksporten vil markeres som lokal assembly.',
    'Vil du eksportere likevel?',
  ].join('\n');
}

export function matchesSceneAssemblyValidationFilter(
  scene: Pick<SceneComposition, 'environmentAssemblyValidation'>,
  filter: SceneAssemblyValidationFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  const validation = scene.environmentAssemblyValidation;
  if (!validation) {
    return filter === 'local';
  }

  if (filter === 'validated') {
    return validation.backendValidated && validation.differences.length === 0;
  }

  if (filter === 'differences') {
    return validation.backendValidated && validation.differences.length > 0;
  }

  return !validation.backendValidated;
}

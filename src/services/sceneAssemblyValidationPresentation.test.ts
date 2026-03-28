import { describe, expect, it } from 'vitest';
import {
  getSceneAssemblyExportWarning,
  getSceneAssemblyValidationSortRank,
  getSceneAssemblyValidationPresentation,
  matchesSceneAssemblyValidationFilter,
} from './sceneAssemblyValidationPresentation';

describe('sceneAssemblyValidationPresentation', () => {
  it('returns a success presentation for clean backend validation', () => {
    const presentation = getSceneAssemblyValidationPresentation({
      backendValidated: true,
      differences: [],
      localNodeCount: 6,
      localRelationshipCount: 8,
      localRuntimePropCount: 3,
      localRuntimeAssetIds: ['pizza_hero_display'],
      backendRuntimePropCount: 3,
      backendRelationshipCount: 8,
    });

    expect(presentation?.severity).toBe('success');
    expect(presentation?.label).toBe('Backend validert');
  });

  it('returns a warning presentation and export warning when there are assembly differences', () => {
    const validation = {
      backendValidated: true,
      differences: ['Assembly-avvik: frontend bygget 2 props, backend bygget 1'],
      localNodeCount: 6,
      localRelationshipCount: 8,
      localRuntimePropCount: 2,
      localRuntimeAssetIds: ['pizza_hero_display'],
    };

    const presentation = getSceneAssemblyValidationPresentation(validation);
    const warning = getSceneAssemblyExportWarning({
      name: 'Pizza Scene',
      environmentAssemblyValidation: validation,
    });

    expect(presentation?.severity).toBe('warning');
    expect(presentation?.label).toContain('Assembly-avvik');
    expect(warning).toContain('Pizza Scene');
    expect(warning).toContain('eksportere likevel');
  });

  it('returns an info presentation and export warning for local-only assembly', () => {
    const validation = {
      backendValidated: false,
      differences: [],
      localNodeCount: 4,
      localRelationshipCount: 5,
      localRuntimePropCount: 2,
      localRuntimeAssetIds: ['pizza_hero_display'],
    };

    const presentation = getSceneAssemblyValidationPresentation(validation);
    const warning = getSceneAssemblyExportWarning({
      name: 'Local Scene',
      environmentAssemblyValidation: validation,
    });

    expect(presentation?.severity).toBe('info');
    expect(presentation?.label).toBe('Lokal assembly');
    expect(warning).toContain('aldri backend-validert');
  });

  it('matches validation filters consistently', () => {
    const validated = {
      environmentAssemblyValidation: {
        backendValidated: true,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    };
    const withDifferences = {
      environmentAssemblyValidation: {
        backendValidated: true,
        differences: ['Mismatch'],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    };
    const localOnly = {
      environmentAssemblyValidation: {
        backendValidated: false,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    };

    expect(matchesSceneAssemblyValidationFilter(validated, 'validated')).toBe(true);
    expect(matchesSceneAssemblyValidationFilter(validated, 'differences')).toBe(false);
    expect(matchesSceneAssemblyValidationFilter(withDifferences, 'differences')).toBe(true);
    expect(matchesSceneAssemblyValidationFilter(localOnly, 'local')).toBe(true);
    expect(matchesSceneAssemblyValidationFilter({ environmentAssemblyValidation: undefined }, 'local')).toBe(true);
  });

  it('ranks scenes so differences come first, then local, then validated', () => {
    expect(getSceneAssemblyValidationSortRank({
      environmentAssemblyValidation: {
        backendValidated: true,
        differences: ['Mismatch'],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    })).toBe(0);

    expect(getSceneAssemblyValidationSortRank({
      environmentAssemblyValidation: {
        backendValidated: false,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    })).toBe(1);

    expect(getSceneAssemblyValidationSortRank({
      environmentAssemblyValidation: {
        backendValidated: true,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      },
    })).toBe(2);
  });
});

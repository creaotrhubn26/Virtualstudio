import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.fn();

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

describe('environmentAssemblyService', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    delete (window as Window & {
      __virtualStudioEnvironmentAssemblyMock?: unknown;
      __virtualStudioEnvironmentAssemblyRequests?: unknown[];
    }).__virtualStudioEnvironmentAssemblyMock;
    delete (window as Window & {
      __virtualStudioEnvironmentAssemblyMock?: unknown;
      __virtualStudioEnvironmentAssemblyRequests?: unknown[];
    }).__virtualStudioEnvironmentAssemblyRequests;
  });

  it('posts a plan to the backend assemble route', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      provider: 'local_scenegraph',
      shell: { type: 'storefront', width: 14, depth: 10, height: 4.6, openCeiling: false, notes: [], openings: [], zones: [] },
      assembly: { planId: 'plan-1', nodes: [], relationships: [], autoAddedAssetIds: [] },
      runtimeProps: [],
    });

    const { environmentAssemblyService } = await import('./environmentAssemblyService');
    const plan = { planId: 'plan-1', prompt: 'pizza restaurant' };
    await environmentAssemblyService.assemble(plan);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/environment/assemble', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  });

  it('uses a window mock for deterministic tests', async () => {
    (window as Window & {
      __virtualStudioEnvironmentAssemblyMock?: unknown;
      __virtualStudioEnvironmentAssemblyRequests?: unknown[];
    }).__virtualStudioEnvironmentAssemblyMock = (plan: Record<string, unknown>) => ({
      success: true,
      provider: 'mock',
      shell: { type: 'storefront', width: 14, depth: 10, height: 4.6, openCeiling: false, notes: [], openings: [], zones: [] },
      assembly: { planId: String(plan.planId || 'mock'), nodes: [], relationships: [], autoAddedAssetIds: ['counter_pizza_prep'] },
      runtimeProps: [],
    });

    const { environmentAssemblyService } = await import('./environmentAssemblyService');
    const response = await environmentAssemblyService.assemble({ planId: 'plan-2', prompt: 'pizza restaurant' });

    expect(response.provider).toBe('mock');
    expect(response.assembly.autoAddedAssetIds).toEqual(['counter_pizza_prep']);
    expect(
      (window as Window & {
        __virtualStudioEnvironmentAssemblyRequests?: unknown[];
      }).__virtualStudioEnvironmentAssemblyRequests,
    ).toEqual([
      { planId: 'plan-2', prompt: 'pizza restaurant' },
    ]);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

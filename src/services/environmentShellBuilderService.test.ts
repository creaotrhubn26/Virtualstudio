import { afterEach, describe, expect, it, vi } from 'vitest';
import { environmentShellBuilderService } from './environmentShellBuilderService';

describe('environmentShellBuilderService', () => {
  afterEach(() => {
    delete (window as any).__virtualStudioEnvironmentShellBuilderMock;
    delete (window as any).__virtualStudioEnvironmentShellBuilderRequests;
    vi.restoreAllMocks();
  });

  it('uses window mock when provided', async () => {
    (window as any).__virtualStudioEnvironmentShellBuilderMock = {
      shell: {
        type: 'storefront',
        width: 18,
        depth: 12,
        height: 6,
        openCeiling: false,
        ceilingStyle: 'canopy',
        openings: [],
        zones: [],
        fixtures: [
          {
            id: 'front_counter_block',
            kind: 'counter_block',
            zoneId: 'front_counter',
            widthRatio: 0.32,
            depthRatio: 0.14,
            height: 1.08,
          },
        ],
        niches: [
          {
            id: 'window_alcove',
            wallTarget: 'rightWall',
            kind: 'display',
            widthRatio: 0.18,
            heightRatio: 0.34,
            xAlign: 'center',
            sillHeight: 0.85,
            depth: 0.24,
          },
        ],
        wallSegments: [
          {
            id: 'front_bay_segment',
            wallTarget: 'rearWall',
            kind: 'bay',
            widthRatio: 0.22,
            heightRatio: 0.52,
            xAlign: 'center',
            sillHeight: 0.18,
            depth: 0.08,
          },
        ],
        notes: ['mocked'],
      },
      runtimeSupported: true,
      typeAccessoryHints: ['storefront_awning'],
    };

    const result = await environmentShellBuilderService.buildShell({
      prompt: 'storefront shell',
      shell: { type: 'storefront' },
    });

    expect(result.shell.type).toBe('storefront');
    expect(result.typeAccessoryHints).toContain('storefront_awning');
    expect(result.shell.ceilingStyle).toBe('canopy');
    expect(result.shell.fixtures?.[0]?.kind).toBe('counter_block');
    expect(result.shell.niches?.[0]?.kind).toBe('display');
    expect(result.shell.wallSegments?.[0]?.kind).toBe('bay');
    expect((window as any).__virtualStudioEnvironmentShellBuilderRequests).toHaveLength(1);
  });

  it('falls back to local normalization when the backend route is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await environmentShellBuilderService.buildShell({
      prompt: 'warehouse scene',
      shell: {
        type: 'warehouse',
        width: 22,
        depth: 18,
        height: 8,
        openCeiling: false,
      },
    });

    expect(result.shell.type).toBe('warehouse');
    expect(result.shell.width).toBe(22);
    expect(result.runtimeSupported).toBe(true);
    expect(result.typeAccessoryHints).toEqual(
      expect.arrayContaining(['warehouse_beam', 'warehouse_column', 'ceiling_open_truss']),
    );
  });

  it('falls back to local normalization when the backend returns an invalid payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response));

    const result = await environmentShellBuilderService.buildShell({
      shell: {
        type: 'storefront',
        width: 18,
        depth: 12,
        height: 6,
      },
    });

    expect(result.shell.type).toBe('storefront');
    expect(result.typeAccessoryHints).toContain('storefront_awning');
    expect(result.typeAccessoryHints).toContain('ceiling_canopy');
  });
});

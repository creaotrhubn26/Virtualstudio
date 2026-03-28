import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('environmentPreviewCaptureService', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as any).__virtualStudioEnvironmentPreviewMock;
    delete (window as any).virtualStudio;
    document.body.innerHTML = '';
  });

  it('uses the browser preview mock when available', async () => {
    (window as any).__virtualStudioEnvironmentPreviewMock = 'data:image/jpeg;base64,mock-preview';

    const { environmentPreviewCaptureService } = await import('./environmentPreviewCaptureService');
    const result = await environmentPreviewCaptureService.capturePreview();

    expect(result).toBe('data:image/jpeg;base64,mock-preview');
  });

  it('delegates to the runtime preview helper when exposed by virtualStudio', async () => {
    const captureMock = vi.fn(async () => 'data:image/jpeg;base64,runtime-preview');
    (window as any).virtualStudio = {
      captureEnvironmentValidationPreview: captureMock,
    };

    const { environmentPreviewCaptureService } = await import('./environmentPreviewCaptureService');
    const result = await environmentPreviewCaptureService.capturePreview({ maxWidth: 640 });

    expect(captureMock).toHaveBeenCalledWith({ maxWidth: 640 });
    expect(result).toBe('data:image/jpeg;base64,runtime-preview');
  });

  it('reuses a cached runtime preview when the scene version and options match', async () => {
    const captureMock = vi.fn(async () => 'data:image/jpeg;base64,cached-preview');
    (window as any).virtualStudio = {
      captureEnvironmentValidationPreview: captureMock,
    };
    (window as any).__virtualStudioDiagnostics = {
      environment: {
        updatedAt: '2026-03-27T00:00:00.000Z',
      },
    };

    const { environmentPreviewCaptureService } = await import('./environmentPreviewCaptureService');
    const first = await environmentPreviewCaptureService.capturePreview({ maxWidth: 640, cacheTtlMs: 1000 });
    const second = await environmentPreviewCaptureService.capturePreview({ maxWidth: 640, cacheTtlMs: 1000 });

    expect(first).toBe('data:image/jpeg;base64,cached-preview');
    expect(second).toBe('data:image/jpeg;base64,cached-preview');
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('busts the preview cache when the scene version changes', async () => {
    const captureMock = vi
      .fn()
      .mockResolvedValueOnce('data:image/jpeg;base64,first-preview')
      .mockResolvedValueOnce('data:image/jpeg;base64,second-preview');
    (window as any).virtualStudio = {
      captureEnvironmentValidationPreview: captureMock,
    };
    (window as any).__virtualStudioDiagnostics = {
      environment: {
        updatedAt: '2026-03-27T00:00:00.000Z',
      },
    };

    const { environmentPreviewCaptureService } = await import('./environmentPreviewCaptureService');
    const first = await environmentPreviewCaptureService.capturePreview({ maxWidth: 640, cacheTtlMs: 1000 });
    (window as any).__virtualStudioDiagnostics.environment.updatedAt = '2026-03-27T00:00:01.000Z';
    const second = await environmentPreviewCaptureService.capturePreview({ maxWidth: 640, cacheTtlMs: 1000 });

    expect(first).toBe('data:image/jpeg;base64,first-preview');
    expect(second).toBe('data:image/jpeg;base64,second-preview');
    expect(captureMock).toHaveBeenCalledTimes(2);
  });
});

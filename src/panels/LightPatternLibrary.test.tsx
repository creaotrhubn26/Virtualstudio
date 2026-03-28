// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import { LightPatternLibrary } from './LightPatternLibrary';
import type { EnvironmentPlanInsightPresentation } from '@/services/environmentPlanInsightPresentation';

describe('LightPatternLibrary', () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockRejectedValue(new Error('offline'));
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  afterEach(() => {
    delete (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights;
  });

  it('surfaces AI family recommendations and tags matching patterns', async () => {
    const onApplyPattern = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights = {
      familyId: 'noir',
      familyLabel: 'Noir',
      summary: 'AI leser dette som noir.',
      lightingDetails: ['key: grid · 24° · gobo blinds — Venetian slats carve the face.'],
    };

    await act(async () => {
      render(
        <LightPatternLibrary
          open
          onClose={onClose}
          onApplyPattern={onApplyPattern}
        />,
      );
    });

    await waitFor(() => {
      const banner = screen.getByTestId('light-pattern-ai-banner');
      expect(banner.textContent || '').toContain('AI-retning: Noir');
      expect(banner.textContent || '').toContain('Prioriterer: Low-Key · Split Lighting · Motivated');
    });

    const lowKeyCard = screen.getByTestId('light-pattern-card-low-key');
    expect(within(lowKeyCard).getByText(/AI-match/i)).toBeTruthy();

    const rembrandtCard = screen.getByTestId('light-pattern-card-rembrandt');
    expect(within(rembrandtCard).queryByText(/AI-match/i)).toBeNull();

    await act(async () => {
      screen.getByTestId('light-pattern-ai-apply').click();
    });

    await waitFor(() => {
      expect(onApplyPattern).toHaveBeenCalledTimes(1);
      expect(onApplyPattern.mock.calls[0][0]?.id).toBe('low-key');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('preselects the preferred pattern when opened from another workspace action', async () => {
    const onApplyPattern = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    await act(async () => {
      render(
        <LightPatternLibrary
          open
          onClose={onClose}
          onApplyPattern={onApplyPattern}
          preferredPatternId="low-key"
        />,
      );
    });

    await waitFor(() => {
      const lowKeyCard = screen.getByTestId('light-pattern-card-low-key');
      expect(within(lowKeyCard).getByText(/Forhåndsvalgt/i)).toBeTruthy();
      expect(lowKeyCard).toHaveAttribute('data-preferred-pattern', 'true');
    });

    const rembrandtCard = screen.getByTestId('light-pattern-card-rembrandt');
    expect(within(rembrandtCard).queryByText(/Forhåndsvalgt/i)).toBeNull();
    expect(rembrandtCard).toHaveAttribute('data-preferred-pattern', 'false');
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('can open directly into the preferred pattern details view', async () => {
    const onApplyPattern = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    await act(async () => {
      render(
        <LightPatternLibrary
          open
          onClose={onClose}
          onApplyPattern={onApplyPattern}
          preferredPatternId="low-key"
          openPreferredPatternDetails
        />,
      );
    });

    await waitFor(() => {
      const detailsDialog = screen.getByRole('dialog', { name: 'Low-Key' });
      expect(within(detailsDialog).getByText('When to Use')).toBeTruthy();
      expect(within(detailsDialog).getByText('Setup Instructions')).toBeTruthy();
    });
  });
});

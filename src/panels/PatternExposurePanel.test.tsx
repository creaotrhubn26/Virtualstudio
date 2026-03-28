// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAllPatternsMock,
  analyzePatternWithEquipmentMock,
  suggestEquipmentForPatternsMock,
  useUserEquipmentInventoryMock,
  useNodesMock,
  updateNodeMock,
  addNodeMock,
} = vi.hoisted(() => ({
  getAllPatternsMock: vi.fn(),
  analyzePatternWithEquipmentMock: vi.fn(),
  suggestEquipmentForPatternsMock: vi.fn(),
  useUserEquipmentInventoryMock: vi.fn(),
  useNodesMock: vi.fn(),
  updateNodeMock: vi.fn(),
  addNodeMock: vi.fn(),
}));

vi.mock('@/hooks/useUserEquipmentInventory', () => ({
  useUserEquipmentInventory: useUserEquipmentInventoryMock,
}));

vi.mock('@/core/services/cinematographyPatternsService', () => ({
  cinematographyPatternsService: {
    getAllPatterns: getAllPatternsMock,
  },
}));

vi.mock('@/core/services/patternExposureIntegration', () => ({
  patternExposureIntegration: {
    analyzePatternWithEquipment: analyzePatternWithEquipmentMock,
    suggestEquipmentForPatterns: suggestEquipmentForPatternsMock,
  },
}));

vi.mock('@/state/selectors', () => ({
  useNodes: useNodesMock,
  useActions: () => ({
    updateNode: updateNodeMock,
    addNode: addNodeMock,
  }),
}));

import { PatternExposurePanel } from './PatternExposurePanel';
import type { EnvironmentPlanInsightPresentation } from '@/services/environmentPlanInsightPresentation';

describe('PatternExposurePanel', () => {
  beforeEach(() => {
    getAllPatternsMock.mockReset();
    analyzePatternWithEquipmentMock.mockReset();
    suggestEquipmentForPatternsMock.mockReset();
    useUserEquipmentInventoryMock.mockReset();
    useNodesMock.mockReset();
    updateNodeMock.mockReset();
    addNodeMock.mockReset();

    const patterns = [
      {
        id: 'three-point',
        name: 'Three-Point Lighting',
        category: 'interview',
        difficulty: 'beginner',
        description: 'Balanced interview lighting.',
        mood: 'balanced',
        keyToFillRatio: '2',
        lights: [],
        usedIn: [],
        reference: 'Film Lighting 101',
        thumbnail: '/attached_assets/generated_images/three-point_lighting_diagram.png',
      },
      {
        id: 'low-key',
        name: 'Low Key Lighting',
        category: 'film-noir',
        difficulty: 'intermediate',
        description: 'Dark noir lighting.',
        mood: 'dark',
        keyToFillRatio: '8',
        lights: [],
        usedIn: [],
        reference: 'Film Noir',
        thumbnail: '/attached_assets/generated_images/film_noir_lighting_diagram.png',
      },
      {
        id: 'high-key',
        name: 'High Key Lighting',
        category: 'commercial',
        difficulty: 'beginner',
        description: 'Bright commercial lighting.',
        mood: 'bright',
        keyToFillRatio: '1',
        lights: [],
        usedIn: [],
        reference: 'Commercial lighting',
        thumbnail: '/attached_assets/generated_images/high-key_lighting_diagram.png',
      },
    ];

    getAllPatternsMock.mockReturnValue(patterns);
    analyzePatternWithEquipmentMock.mockImplementation((pattern: { id: string }) => ({
      pattern: patterns.find((entry) => entry.id === pattern.id),
      feasibilityScore: pattern.id === 'three-point' ? 0.92 : pattern.id === 'high-key' ? 0.78 : 0.55,
      recommendedSettings: {
        aperture: 8,
        shutter: 1 / 125,
        iso: 100,
      },
      warnings: [],
      tips: [],
      requirements: [],
      equipmentMatches: [],
      missingEquipment: [],
      contrastRatio: '2:1',
      dynamicRangeRequired: 8,
      totalWattageNeeded: 300,
      keyLightPower: 160,
      fillLightPower: 80,
      rimLightPower: 60,
    }));
    suggestEquipmentForPatternsMock.mockReturnValue([]);
    useUserEquipmentInventoryMock.mockReturnValue({
      userInventory: { lights: [], modifiers: [] },
      isLoading: false,
    });
    useNodesMock.mockReturnValue([]);
  });

  afterEach(() => {
    delete (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights;
  });

  it('shows AI family recommendations and tags matching exposure patterns', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights = {
      familyId: 'office',
      familyLabel: 'Kontor/corporate',
      summary: 'AI leser dette som kontor/corporate.',
      lightingDetails: ['key: softbox · 48° — Clean corporate key for interviews.'],
    };

    render(<PatternExposurePanel />);

    await waitFor(() => {
      const banner = screen.getByTestId('pattern-exposure-ai-banner');
      expect(banner.textContent || '').toContain('AI-retning: Kontor/corporate');
      expect(banner.textContent || '').toContain('Prioriterer: Three-Point Lighting · Loop · High Key Lighting');
    });

    const threePointCard = screen.getByTestId('pattern-exposure-card-three-point');
    expect(within(threePointCard).getByText(/AI-match/i)).toBeTruthy();

    const highKeyCard = screen.getByTestId('pattern-exposure-card-high-key');
    expect(within(highKeyCard).getByText(/AI-match/i)).toBeTruthy();

    await act(async () => {
      screen.getByTestId('pattern-exposure-ai-apply').click();
    });

    expect(dispatchSpy.mock.calls.some(([event]) => (
      event instanceof CustomEvent
      && event.type === 'ch-apply-lighting-pattern'
      && event.detail?.patternId === 'three-point'
    ))).toBe(true);

    dispatchSpy.mockRestore();
  });

  it('can open the recommended pattern directly in the pattern library details view', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights = {
      familyId: 'office',
      familyLabel: 'Kontor/corporate',
      summary: 'AI leser dette som kontor/corporate.',
      lightingDetails: ['key: softbox · 48° — Clean corporate key for interviews.'],
    };

    render(<PatternExposurePanel />);

    await waitFor(() => {
      expect(screen.getByTestId('pattern-exposure-ai-details')).toBeTruthy();
    });

    await act(async () => {
      screen.getByTestId('pattern-exposure-ai-details').click();
    });

    expect(dispatchSpy.mock.calls.some(([event]) => (
      event instanceof CustomEvent
      && event.type === 'openLightPatternLibrary'
      && event.detail?.preferredPatternId === 'three-point'
      && event.detail?.openPreferredPatternDetails === true
    ))).toBe(true);

    dispatchSpy.mockRestore();
  });
});

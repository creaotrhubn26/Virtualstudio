// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});
import { LightsBrowser } from './LightsBrowser';
import { useAppStore } from '../state/store';
import { useCameraLightingSyncStore, type CameraLightingSyncSnapshot } from '../state/cameraLightingSyncStore';
import type { EnvironmentPlanInsightPresentation } from '../services/environmentPlanInsightPresentation';

describe('LightsBrowser', () => {
  afterEach(() => {
    act(() => {
      useAppStore.setState({
        scene: [],
        selectedNodeId: null,
      });
      useCameraLightingSyncStore.getState().reset();
    });
    delete (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights;
  });

  it('shows AI family and falls back to plan insight lighting details for the selected light', async () => {
    const insight: EnvironmentPlanInsightPresentation = {
      familyId: 'warehouse',
      familyLabel: 'Warehouse',
      summary: 'AI leser dette som warehouse.',
      lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
    };
    const snapshot: CameraLightingSyncSnapshot = {
      reason: 'test',
      updatedAt: new Date().toISOString(),
      camera: {
        position: [0, 1.6, 5],
        target: [0, 1.5, 0],
        fov: 0.8,
        focalLength: 35,
        aperture: 2.8,
        shutter: '1/125',
        iso: 100,
        nd: 0,
        whiteBalance: 5600,
        autoRig: true,
        planId: 'plan-warehouse',
        shotType: 'medium shot',
        mood: 'industrial',
        lastSource: 'test',
      },
      lighting: {
        autoRigPlanId: 'plan-warehouse',
        selectedLightId: 'light-rim-1',
        lastSource: 'test',
        lights: [
          {
            id: 'light-rim-1',
            name: 'Warehouse Rim',
            type: 'spot',
            enabled: true,
            intensity: 1.1,
            cct: 4300,
            role: 'rim',
            purpose: 'Warehouse rim accent',
            intent: 'warehouse',
            modifier: 'softbox',
            beamAngle: 60,
            rationale: null,
            hazeEnabled: true,
            hazeDensity: 0.018,
            behaviorType: null,
            environmentAutoRig: true,
            position: [2.2, 3.1, -1.6],
            target: [0, 1.2, 0],
            goboId: null,
            goboPattern: null,
            goboRotation: null,
            goboSize: null,
            goboIntensity: null,
            goboProjectionApplied: null,
          },
        ],
      },
      selection: {
        selectedCameraBodyId: null,
        selectedLensId: null,
        selectedLightId: 'light-rim-1',
        lastSource: 'test',
      },
    };

    (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights = insight;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<LightsBrowser />);
    act(() => {
      useCameraLightingSyncStore.getState().publishRuntimeSnapshot(snapshot);
    });

    try {
      await waitFor(() => {
        expect(screen.getByText(/AI-retning:\s*Warehouse/i)).toBeTruthy();
        expect(screen.getByText(/Lysvalg:\s*rim: fresnel · 24° · gobo breakup/i)).toBeTruthy();
        expect(screen.getByText(/valgt:\s*Warehouse Rim/i)).toBeTruthy();
        expect(screen.getByText(/Modifier:\s*softbox/i)).toBeTruthy();
        expect(screen.getByText(/Beam:\s*60°/i)).toBeTruthy();
        expect(screen.getByText(/Haze:\s*0.018/i)).toBeTruthy();
        expect(screen.getByText(/Gobo:\s*Bruddmønster/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bruk AI modifier/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bruk AI beam/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bruk AI haze/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bruk anbefalt gobo/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bruk AI-pattern/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Se AI-patterndetaljer/i })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /Bruk AI-pattern/i }));
      fireEvent.click(screen.getByRole('button', { name: /Bruk AI modifier/i }));
      fireEvent.click(screen.getByRole('button', { name: /Bruk AI beam/i }));
      fireEvent.click(screen.getByRole('button', { name: /Bruk AI haze/i }));
      fireEvent.click(screen.getByRole('button', { name: /Bruk anbefalt gobo/i }));
      fireEvent.click(screen.getByRole('button', { name: /Se AI-patterndetaljer/i }));

      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'applyLightPattern'
        && event.detail?.id === 'low-key'
      ))).toBe(true);
      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'ch-set-light-modifier'
        && event.detail?.lightId === 'light-rim-1'
        && event.detail?.modifier === 'fresnel'
      ))).toBe(true);
      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'ch-set-light-beam-angle'
        && event.detail?.lightId === 'light-rim-1'
        && event.detail?.beamAngle === 24
      ))).toBe(true);
      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'ch-apply-atmosphere'
        && event.detail?.fogEnabled === true
        && event.detail?.fogDensity === 0.018
      ))).toBe(true);
      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'ch-attach-gobo'
        && event.detail?.lightId === 'light-rim-1'
        && event.detail?.goboId === 'breakup'
      ))).toBe(true);
      expect(dispatchSpy.mock.calls.some(([event]) => (
        event instanceof CustomEvent
        && event.type === 'openLightPatternLibrary'
        && event.detail?.preferredPatternId === 'low-key'
        && event.detail?.openPreferredPatternDetails === true
      ))).toBe(true);
    } finally {
      dispatchSpy.mockRestore();
    }
  });
});

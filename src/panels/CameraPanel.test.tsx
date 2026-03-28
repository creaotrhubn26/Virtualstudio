// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CameraPanel } from './CameraPanel';
import { useAppStore, type SceneNode } from '../state/store';

function makeCameraNode(id: string, name: string, aperture: number, focalLength: number): SceneNode {
  return {
    id,
    type: 'camera',
    name,
    visible: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    camera: {
      aperture,
      iso: 100,
      shutter: 1 / 125,
      focalLength,
      sensor: [36, 24],
    },
    userData: {
      focusDistance: 3,
    },
  };
}

describe('CameraPanel', () => {
  afterEach(() => {
    useAppStore.setState({
      scene: [],
      selectedNodeId: null,
    });
  });

  it('tracks runtime camera changes and shows the matching camera settings', async () => {
    useAppStore.setState({
      scene: [
        makeCameraNode('camera-a', 'Camera A', 2.8, 35),
        makeCameraNode('camera-b', 'Camera B', 5.6, 85),
      ],
      selectedNodeId: null,
    });

    await act(async () => {
      render(<CameraPanel />);
    });

    expect(screen.getByText('Aperture: f/2.8')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('active-camera-changed', {
        detail: { activeCameraId: 'camera-b' },
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Aperture: f/5.6')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Lens' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Focal Length: 85mm')).toBeTruthy();
    });
  });
});

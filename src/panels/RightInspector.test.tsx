// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RightInspector from './RightInspector';
import { useAppStore, type SceneNode } from '../state/store';

function makeSceneNode(id: string, name: string): SceneNode {
  return {
    id,
    type: 'model',
    name,
    visible: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  };
}

describe('RightInspector', () => {
  afterEach(() => {
    useAppStore.setState({
      scene: [],
      selectedNodeId: null,
    });
  });

  it('follows runtime scene selection snapshots', async () => {
    useAppStore.setState({
      scene: [
        makeSceneNode('node-a', 'First Prop'),
        makeSceneNode('node-b', 'Second Prop'),
      ],
      selectedNodeId: 'node-a',
    });

    await act(async () => {
      render(<RightInspector />);
    });

    expect(screen.getByText('First Prop')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('vs-scene-selection-sync', {
        detail: {
          selection: {
            selectedNodeId: 'node-b',
            selectedActorId: null,
          },
        },
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Second Prop')).toBeTruthy();
    });
  });
});

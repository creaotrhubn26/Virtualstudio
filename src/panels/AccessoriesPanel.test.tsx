// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AccessoriesPanel } from './AccessoriesPanel';
import { useAppStore, type SceneNode } from '../state/store';

function makeCharacterNode(id: string, name: string): SceneNode {
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
    userData: {
      characterId: id,
      characterCatalogId: 'worker_baker',
      actorRole: 'baker',
      wardrobeStyle: 'baker',
      logoPlacement: 'apron_chest',
      outfitColors: ['#c0392b', '#f4e7d3'],
      appearance: {
        skinTone: '#c58c62',
        hairColor: '#2f241f',
        hairStyle: 'covered',
        facialHair: 'stubble',
        ageGroup: 'adult',
        genderPresentation: 'male',
      },
      environmentGenerated: true,
      characterVisualKind: 'catalog-glb',
    },
  };
}

describe('AccessoriesPanel', () => {
  afterEach(() => {
    useAppStore.setState({
      scene: [],
      selectedNodeId: null,
    });
  });

  it('follows selected AI character and dispatches character updates', async () => {
    useAppStore.setState({
      scene: [makeCharacterNode('character-1', 'Bakemester')],
      selectedNodeId: null,
    });

    const receivedEvents: Array<Record<string, unknown>> = [];
    const handleUpdate = (event: Event) => {
      receivedEvents.push((event as CustomEvent).detail as Record<string, unknown>);
    };
    window.addEventListener('ch-update-character', handleUpdate as EventListener);

    await act(async () => {
      render(<AccessoriesPanel />);
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('vs-scene-selection-sync', {
        detail: {
          selection: {
            selectedNodeId: 'character-1',
            selectedActorId: 'character-1',
          },
        },
      }));
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Bakemester')).toBeTruthy();
    });
    expect(screen.getByTestId('character-visual-kind-chip').textContent).toContain('Menneske-GLB');

    fireEvent.change(screen.getByLabelText('Hudtone'), {
      target: { value: '#4a2c1a' },
    });
    fireEvent.change(screen.getByLabelText('Action hint'), {
      target: { value: 'Greeting customers by the counter' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Oppdater karakter' }));
    });

    await waitFor(() => {
      expect(receivedEvents).toHaveLength(1);
    });

    expect(receivedEvents[0]).toMatchObject({
      nodeId: 'character-1',
      role: 'baker',
      characterCatalogId: 'worker_baker',
      wardrobeStyle: 'baker',
      logoPlacement: 'apron_chest',
      actionHint: 'Greeting customers by the counter',
      appearance: expect.objectContaining({
        skinTone: '#4a2c1a',
        hairStyle: 'covered',
        facialHair: 'stubble',
      }),
    });

    window.removeEventListener('ch-update-character', handleUpdate as EventListener);
  });
});

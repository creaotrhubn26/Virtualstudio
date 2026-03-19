import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assetBrainService } from '../core/services/assetBrain';
import type { SceneNode } from '../state/store';
import { useAppStore } from '../state/store';
import { environmentLearningService } from './environmentLearningService';

function createEnvironmentNode(
  id: string,
  assetId: string,
  position: [number, number, number],
  extraUserData: Record<string, unknown> = {},
): SceneNode {
  return {
    id,
    type: 'model',
    name: assetId,
    visible: true,
    transform: {
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    userData: {
      assetId,
      environmentGenerated: true,
      ...extraUserData,
    },
  };
}

describe('environmentLearningService', () => {
  beforeEach(() => {
    assetBrainService.resetLearnedSignals();
    environmentLearningService.resetForTests();
    useAppStore.setState({ scene: [], selectedNodeId: null });
    (window as any).__virtualStudioLastEnvironmentLearningContext = {
      planId: 'learning-test-plan',
      prompt: 'Warm editorial environment',
      roomTypes: ['editorial'],
      styles: ['warm'],
      source: 'prompt',
    };
  });

  afterEach(() => {
    environmentLearningService.resetForTests();
    useAppStore.setState({ scene: [], selectedNodeId: null });
    delete (window as any).__virtualStudioLastEnvironmentLearningContext;
  });

  it('learns co-occurrence when the user repositions generated props together', () => {
    useAppStore.setState({
      scene: [
        createEnvironmentNode('node-chair', 'chair_posing', [0, 0, 0]),
        createEnvironmentNode('node-plant', 'plant_potted', [0.9, 0, 0.4]),
      ],
    });

    environmentLearningService.start();

    useAppStore.getState().updateNode('node-chair', {
      transform: {
        position: [1.1, 0, 0.55],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    });
    window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
      detail: { nodeId: 'node-chair' },
    }));

    const related = assetBrainService.getRelatedAssets({
      assetId: 'chair_posing',
      assetTypes: ['prop'],
      relationTypes: ['co_occurs_with'],
      preferredRoomTypes: ['editorial'],
      limit: 3,
    });

    expect(related[0]?.entry.id).toBe('plant_potted');
  });

  it('downranks a generated asset after the user removes it from the scene', () => {
    (window as any).__virtualStudioLastEnvironmentLearningContext = {
      planId: 'learning-test-plan',
      prompt: 'Warm pizzeria interior',
      roomTypes: ['restaurant'],
      styles: ['warm'],
      source: 'prompt',
    };

    useAppStore.setState({
      scene: [
        createEnvironmentNode('node-table', 'table_rustic', [0, 0, 0]),
        createEnvironmentNode('node-pizza', 'pizza_hero_display', [0, 0.82, 0], {
          surfaceAnchorId: 'node-table',
        }),
        createEnvironmentNode('node-counter', 'counter_pizza_prep', [1.8, 0, 0.2]),
      ],
    });

    environmentLearningService.start();
    useAppStore.getState().removeNode('node-table');

    const related = assetBrainService.getRelatedAssets({
      assetId: 'pizza_hero_display',
      assetTypes: ['prop'],
      relationTypes: ['supported_by'],
      preferredRoomTypes: ['restaurant'],
      limit: 3,
    });

    expect(related[0]?.entry.id).toBe('counter_pizza_prep');
  });
});

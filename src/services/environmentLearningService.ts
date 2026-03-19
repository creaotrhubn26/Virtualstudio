import type { AssetBrainFeedbackSignal, AssetBrainUsageSignal } from '../core/models/assetBrain';
import { assetBrainService } from '../core/services/assetBrain';
import type { SceneNode } from '../state/store';
import { useAppStore } from '../state/store';

interface EnvironmentLearningContext {
  planId?: string;
  prompt?: string;
  roomTypes?: string[];
  styles?: string[];
  source?: string;
}

type LearningWindow = Window & {
  __virtualStudioLastEnvironmentLearningContext?: EnvironmentLearningContext;
};

interface TrackedEnvironmentNode {
  id: string;
  assetId: string;
  position: [number, number, number];
  surfaceAnchorId?: string;
}

function distanceBetween(
  left: [number, number, number],
  right: [number, number, number],
): number {
  const deltaX = left[0] - right[0];
  const deltaY = left[1] - right[1];
  const deltaZ = left[2] - right[2];
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
}

function normalizeTrackedNode(node: SceneNode): TrackedEnvironmentNode | null {
  if (node.type !== 'model') {
    return null;
  }

  const userData = (node.userData || {}) as Record<string, unknown>;
  if (!userData.environmentGenerated) {
    return null;
  }

  const assetId = typeof userData.assetId === 'string'
    ? userData.assetId
    : typeof userData.propId === 'string'
      ? userData.propId
      : null;
  if (!assetId) {
    return null;
  }

  return {
    id: node.id,
    assetId,
    position: node.transform.position,
    surfaceAnchorId: typeof userData.surfaceAnchorId === 'string'
      ? userData.surfaceAnchorId
      : undefined,
  };
}

function getLearningWindow(): LearningWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window as LearningWindow;
}

class EnvironmentLearningService {
  private started = false;
  private previousNodesById = new Map<string, TrackedEnvironmentNode>();
  private unsubscribeStore: (() => void) | null = null;
  private lastMoveSignalAtByNodeId = new Map<string, number>();
  private lastMoveSignalPositionByNodeId = new Map<string, [number, number, number]>();
  private removedNodeIdsPendingStoreSync = new Set<string>();
  private readonly handleSceneNodeUpdated = (event: Event) => {
    this.handleNodeUpdated(event as CustomEvent<{ nodeId?: string }>);
  };
  private readonly handlePropRemoved = (event: Event) => {
    this.handlePropRemovedEvent(event as CustomEvent<{ propId?: string }>);
  };

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    this.refreshSnapshot();
    this.unsubscribeStore = useAppStore.subscribe(() => {
      this.handleStoreChanged();
    });
    window.addEventListener('ch-scene-node-updated', this.handleSceneNodeUpdated as EventListener);
    window.addEventListener('vs-prop-removed', this.handlePropRemoved as EventListener);
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') {
      return;
    }

    this.started = false;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    window.removeEventListener('ch-scene-node-updated', this.handleSceneNodeUpdated as EventListener);
    window.removeEventListener('vs-prop-removed', this.handlePropRemoved as EventListener);
    this.previousNodesById.clear();
    this.lastMoveSignalAtByNodeId.clear();
    this.lastMoveSignalPositionByNodeId.clear();
    this.removedNodeIdsPendingStoreSync.clear();
  }

  resetForTests(): void {
    this.stop();
  }

  private handleStoreChanged(): void {
    const nextNodesById = this.getTrackedNodesById();
    const mergedSnapshot = new Map<string, TrackedEnvironmentNode>();

    this.previousNodesById.forEach((previousNode, nodeId) => {
      if (nextNodesById.has(nodeId)) {
        mergedSnapshot.set(nodeId, previousNode);
      } else if (this.removedNodeIdsPendingStoreSync.has(nodeId)) {
        this.removedNodeIdsPendingStoreSync.delete(nodeId);
      } else {
        this.recordRejection(previousNode, 'store_remove');
      }
    });

    nextNodesById.forEach((nextNode, nodeId) => {
      if (!mergedSnapshot.has(nodeId)) {
        mergedSnapshot.set(nodeId, nextNode);
      }
    });

    this.previousNodesById = mergedSnapshot;
  }

  private handlePropRemovedEvent(event: CustomEvent<{ propId?: string }>): void {
    const nodeId = event.detail?.propId;
    if (!nodeId) {
      return;
    }

    const previousNode = this.previousNodesById.get(nodeId);
    if (!previousNode) {
      return;
    }

    this.removedNodeIdsPendingStoreSync.add(nodeId);
    this.recordRejection(previousNode, 'manual_remove');
  }

  private handleNodeUpdated(event: CustomEvent<{ nodeId?: string }>): void {
    const nodeId = event.detail?.nodeId;
    if (!nodeId) {
      return;
    }

    const currentNode = this.getTrackedNodesById().get(nodeId);
    const previousNode = this.previousNodesById.get(nodeId);
    if (!currentNode || !previousNode) {
      this.previousNodesById = this.getTrackedNodesById();
      return;
    }

    const movedDistance = distanceBetween(previousNode.position, currentNode.position);
    const lastSignalAt = this.lastMoveSignalAtByNodeId.get(nodeId) || 0;
    const lastSignalPosition = this.lastMoveSignalPositionByNodeId.get(nodeId) || previousNode.position;
    const movedSinceLastSignal = distanceBetween(lastSignalPosition, currentNode.position);
    const now = Date.now();

    if (movedDistance < 0.22 || movedSinceLastSignal < 0.5 || now - lastSignalAt < 700) {
      this.previousNodesById = this.getTrackedNodesById();
      return;
    }

    const context = this.getLearningContext();
    const relatedAssetIds = this.collectRelatedAssetIds(currentNode, this.getTrackedNodesById());
    const usageSignal: AssetBrainUsageSignal = {
      assetIds: relatedAssetIds,
      roomTypes: context.roomTypes,
      styles: context.styles,
      prompt: context.prompt,
      planId: context.planId,
      source: 'manual_move',
    };

    assetBrainService.recordUsage(usageSignal);
    this.lastMoveSignalAtByNodeId.set(nodeId, now);
    this.lastMoveSignalPositionByNodeId.set(nodeId, currentNode.position);
    this.previousNodesById = this.getTrackedNodesById();
  }

  private getTrackedNodesById(): Map<string, TrackedEnvironmentNode> {
    const tracked = new Map<string, TrackedEnvironmentNode>();
    useAppStore.getState().scene
      .map((node) => normalizeTrackedNode(node))
      .filter((node): node is TrackedEnvironmentNode => Boolean(node))
      .forEach((node) => {
        tracked.set(node.id, node);
      });
    return tracked;
  }

  private refreshSnapshot(): void {
    this.previousNodesById = this.getTrackedNodesById();
  }

  private getLearningContext(): EnvironmentLearningContext {
    return getLearningWindow()?.__virtualStudioLastEnvironmentLearningContext || {};
  }

  private collectRelatedAssetIds(
    node: TrackedEnvironmentNode,
    trackedNodesById: Map<string, TrackedEnvironmentNode>,
  ): string[] {
    const assetIds = new Set<string>([node.assetId]);

    if (node.surfaceAnchorId) {
      const anchorNode = trackedNodesById.get(node.surfaceAnchorId);
      if (anchorNode) {
        assetIds.add(anchorNode.assetId);
      }
    }

    trackedNodesById.forEach((candidate) => {
      if (candidate.id === node.id) {
        return;
      }

      if (distanceBetween(candidate.position, node.position) <= 1.8) {
        assetIds.add(candidate.assetId);
      }
    });

    return Array.from(assetIds);
  }

  private recordRejection(node: TrackedEnvironmentNode, source: string): void {
    const context = this.getLearningContext();
    const feedbackSignal: AssetBrainFeedbackSignal = {
      assetId: node.assetId,
      roomTypes: context.roomTypes,
      styles: context.styles,
      prompt: context.prompt,
      planId: context.planId,
      source,
      reason: 'User removed an environment-generated prop after assembly.',
    };

    assetBrainService.recordRejection(feedbackSignal);
    this.lastMoveSignalAtByNodeId.delete(node.id);
    this.lastMoveSignalPositionByNodeId.delete(node.id);
  }
}

export const environmentLearningService = new EnvironmentLearningService();

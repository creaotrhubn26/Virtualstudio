export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneNode {
  id: string;
  name: string;
  type: 'actor' | 'prop' | 'light' | 'camera' | 'backdrop' | 'group';
  transform: Transform;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
  children: string[];
  userData?: Record<string, unknown>;
}

export interface SceneGraph {
  nodes: Map<string, SceneNode>;
  rootNodes: string[];
  selectedNodeId: string | null;
}

export function createDefaultTransform(): Transform {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
}

export function createSceneNode(
  id: string,
  name: string,
  type: SceneNode['type'],
  options?: Partial<SceneNode>
): SceneNode {
  return {
    id,
    name,
    type,
    transform: createDefaultTransform(),
    visible: true,
    locked: false,
    parentId: null,
    children: [],
    ...options,
  };
}

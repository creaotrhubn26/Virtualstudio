import { useAppStore } from './store';

export const useNodes = () => useAppStore((state) => state.scene);

export const useScene = () => {
  const scene = useAppStore((state) => state.scene);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  return {
    nodes: scene,
    selection: selectedNodeId ? [selectedNodeId] : [],
  };
};

export const useActions = () => {
  const addNode = useAppStore((state) => state.addNode);
  const removeNode = useAppStore((state) => state.removeNode);
  const updateNode = useAppStore((state) => state.updateNode);
  const selectNode = useAppStore((state) => state.selectNode);
  const getNode = useAppStore((state) => state.getNode);
  const clearScene = useAppStore((state) => state.clearScene);

  return {
    addNode,
    removeNode,
    updateNode,
    selectNode,
    getNode,
    clearScene,
  };
};

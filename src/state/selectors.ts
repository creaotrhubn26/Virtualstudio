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
    addMeasurementBetween: (_nodeA: string, _nodeB: string) => { return; },
    removeMeasurement: (_id: string) => { return; },
    toggleMeasureMode: () => { return; },
    toggleLightCones: () => { return; },
    toggleLightContribution: (_id: string) => { return; },
    setHDRIEnvironment: (_id: string) => { return; },
    setHDRIIntensity: (_v: number) => { return; },
    setHDRIRotation: (_v: number) => { return; },
    toggleFalseColor: () => { return; },
    toggleHeatmap: () => { return; },
    setFalseColorOpacity: (_v: number) => { return; },
    setHeatmapOpacity: (_v: number) => { return; },
    toggleHDRIVisible: () => { return; },
    deleteNode: (id: string) => removeNode(id),
  };
};

export const useMeasurements = () => [] as Array<{ id: string; nodeA: string; nodeB: string; distance: number; name?: string; label?: string; a?: [number, number, number]; b?: [number, number, number]; color?: string }>;
export const useMeasureMode = () => false;
export const useShowLightCones = () => true;

export const useFalseColorEnabled = () => false;
export const useHeatmapEnabled = () => false;
export const useFalseColorOpacity = () => 0.8;
export const useHeatmapOpacity = () => 0.8;
export const useHDRIEnvironmentId = () => null as string | null;
export const useHDRIIntensity = () => 1.0;
export const useHDRIRotation = () => 0;
export const useHDRIVisible = () => true;

export const useStudioGuideSettings = () => ({
  enabled: false,
  gridVisible: true,
  safeZoneVisible: true,
  rulersVisible: false,
  snapToGrid: false,
  gridSize: 0.5,
});

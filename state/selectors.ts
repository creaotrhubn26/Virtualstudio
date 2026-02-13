/**
 * State selectors – re-exports store hooks for use by panels
 */
import { useAppStore } from '../src/state/store';

export const useNodes = () => useAppStore((state) => state.scene);

export const useActions = () => {
  const updateNode = useAppStore((state) => state.updateNode);
  return { updateNode };
};

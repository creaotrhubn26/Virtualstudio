import { useState, useCallback } from 'react';

export interface SelectionState {
  selectedIds: string[];
  lastSelectedId: string | null;
  selectionMode: 'single' | 'multi' | 'range';
}

class SelectionService {
  private state: SelectionState = {
    selectedIds: [],
    lastSelectedId: null,
    selectionMode: 'single',
  };

  private listeners: Array<(state: SelectionState) => void> = [];

  getState(): SelectionState {
    return { ...this.state };
  }

  select(id: string): void {
    this.state = { ...this.state, selectedIds: [id], lastSelectedId: id };
    this.notify();
  }

  multiSelect(id: string): void {
    const isSelected = this.state.selectedIds.includes(id);
    const selectedIds = isSelected
      ? this.state.selectedIds.filter((s) => s !== id)
      : [...this.state.selectedIds, id];
    this.state = { ...this.state, selectedIds, lastSelectedId: id };
    this.notify();
  }

  deselect(id: string): void {
    this.state = {
      ...this.state,
      selectedIds: this.state.selectedIds.filter((s) => s !== id),
    };
    this.notify();
  }

  clearSelection(): void {
    this.state = { ...this.state, selectedIds: [], lastSelectedId: null };
    this.notify();
  }

  isSelected(id: string): boolean {
    return this.state.selectedIds.includes(id);
  }

  subscribe(listener: (state: SelectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state));
  }
}

export const selectionService = new SelectionService();

export function useSelection(_context?: string) {
  const [state, setState] = useState<SelectionState>(() => selectionService.getState());

  const select = useCallback((id: string) => selectionService.select(id), []);
  const deselect = useCallback((id: string) => selectionService.deselect(id), []);
  const multiSelect = useCallback((id: string) => selectionService.multiSelect(id), []);
  const clearSelection = useCallback(() => selectionService.clearSelection(), []);
  const isSelected = useCallback((id: string) => selectionService.isSelected(id), []);

  useState(() => {
    const unsubscribe = selectionService.subscribe(setState);
    return unsubscribe;
  });

  return {
    ...state,
    select,
    deselect,
    multiSelect,
    clearSelection,
    isSelected,
  };
}

export default selectionService;

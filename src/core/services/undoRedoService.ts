/**
 * Undo/Redo Service - Manages action history for undo/redo functionality
 */

export interface Action {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  data: any;
  undo: () => void;
  redo: () => void;
}

export interface UndoRedoState {
  undoStack: Action[];
  redoStack: Action[];
  canUndo: boolean;
  canRedo: boolean;
  lastAction: Action | null;
}

class UndoRedoService {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxStackSize: number = 50;
  private listeners: Set<(state: UndoRedoState) => void> = new Set();

  /**
   * Register an action for undo/redo
   */
  registerAction(action: Action): void {
    // Clear redo stack when new action is registered
    this.redoStack = [];

    // Add to undo stack
    this.undoStack.push(action);

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.notify();
  }

  /**
   * Undo last action
   */
  undo(): Action | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    const action = this.undoStack.pop()!;
    action.undo();
    this.redoStack.push(action);

    this.notify();
    return action;
  }

  /**
   * Redo last undone action
   */
  redo(): Action | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const action = this.redoStack.pop()!;
    action.redo();
    this.undoStack.push(action);

    this.notify();
    return action;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: UndoRedoState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): UndoRedoState {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      lastAction: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null,
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

export const undoRedoService = new UndoRedoService();






















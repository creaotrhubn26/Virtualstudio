export interface UndoRedoState {
  id: string;
  timestamp: number;
  data: any;
}

export class UndoRedoManager {
  private undoStack: UndoRedoState[] = [];
  private redoStack: UndoRedoState[] = [];
  private maxStackSize: number = 50;
  private currentState: UndoRedoState | null = null;

  /**
   * Save current state
   */
  saveState(id: string, data: any): void {
    // Clear redo stack when new state is saved
    this.redoStack = [];

    // Add current state to undo stack
    if (this.currentState) {
      this.undoStack.push(this.currentState);
      
      // Limit stack size
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
    }

    // Set new current state
    this.currentState = {
      id,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // Deep clone
    };
  }

  /**
   * Undo last action
   */
  undo(): UndoRedoState | null {
    if (this.undoStack.length === 0 || !this.currentState) {
      return null;
    }

    // Move current state to redo stack
    this.redoStack.push(this.currentState);

    // Get previous state from undo stack
    const previousState = this.undoStack.pop()!;
    this.currentState = previousState;

    return previousState;
  }

  /**
   * Redo last undone action
   */
  redo(): UndoRedoState | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack
    if (this.currentState) {
      this.undoStack.push(this.currentState);
    }

    // Get next state from redo stack
    const nextState = this.redoStack.pop()!;
    this.currentState = nextState;

    return nextState;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all stacks
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentState = null;
  }

  /**
   * Get current state
   */
  getCurrentState(): UndoRedoState | null {
    return this.currentState;
  }

  /**
   * Get undo stack size
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}

export const undoRedoManager = new UndoRedoManager();


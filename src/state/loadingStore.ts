/**
 * Loading Store - Global loading state management
 * 
 * Manages loading states for scene initialization, asset loading, and other async operations.
 */

import { create } from 'zustand';

export type LoadingStage = 
  | 'idle'
  | 'initializing'      // Scene is being initialized
  | 'loading-scene'     // Loading saved scene
  | 'loading-model'     // Loading 3D model
  | 'loading-hdri'      // Loading HDRI environment
  | 'loading-assets'    // Loading multiple assets
  | 'processing'        // General processing
  | 'saving'            // Saving scene/data
  | 'exporting';        // Exporting content

export interface LoadingTask {
  id: string;
  label: string;
  progress: number;     // 0-100
  stage: LoadingStage;
  startTime: number;
  estimatedDuration?: number;
}

interface LoadingState {
  // Global loading state
  isLoading: boolean;
  currentStage: LoadingStage;
  message: string;
  progress: number;           // 0-100, -1 for indeterminate
  subMessage?: string;
  
  // Multiple tasks support
  tasks: LoadingTask[];
  
  // Scene initialization specific
  sceneInitialized: boolean;
  sceneInitProgress: number;
  
  // Actions
  startLoading: (stage: LoadingStage, message: string, progress?: number) => void;
  updateProgress: (progress: number, subMessage?: string) => void;
  setMessage: (message: string, subMessage?: string) => void;
  stopLoading: () => void;
  
  // Task-based loading
  addTask: (id: string, label: string, stage?: LoadingStage) => void;
  updateTask: (id: string, progress: number) => void;
  removeTask: (id: string) => void;
  
  // Scene initialization
  setSceneInitialized: (initialized: boolean) => void;
  updateSceneInitProgress: (progress: number) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  currentStage: 'idle',
  message: '',
  progress: -1,
  subMessage: undefined,
  tasks: [],
  sceneInitialized: false,
  sceneInitProgress: 0,

  startLoading: (stage, message, progress = -1) => set({
    isLoading: true,
    currentStage: stage,
    message,
    progress,
    subMessage: undefined,
  }),

  updateProgress: (progress, subMessage) => set((state) => ({
    progress,
    subMessage: subMessage ?? state.subMessage,
  })),

  setMessage: (message, subMessage) => set({
    message,
    subMessage,
  }),

  stopLoading: () => set({
    isLoading: false,
    currentStage: 'idle',
    message: '',
    progress: -1,
    subMessage: undefined,
  }),

  addTask: (id, label, stage = 'processing') => set((state) => ({
    isLoading: true,
    tasks: [...state.tasks, {
      id,
      label,
      progress: 0,
      stage,
      startTime: Date.now(),
    }],
  })),

  updateTask: (id, progress) => set((state) => ({
    tasks: state.tasks.map(task =>
      task.id === id ? { ...task, progress } : task
    ),
  })),

  removeTask: (id) => set((state) => {
    const newTasks = state.tasks.filter(task => task.id !== id);
    return {
      tasks: newTasks,
      isLoading: newTasks.length > 0 || state.currentStage !== 'idle',
    };
  }),

  setSceneInitialized: (initialized) => set({ sceneInitialized: initialized }),

  updateSceneInitProgress: (progress) => set({ sceneInitProgress: progress }),
}));

// Helper functions for common loading operations
export const withLoading = async <T>(
  stage: LoadingStage,
  message: string,
  operation: () => Promise<T>
): Promise<T> => {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading(stage, message);
  try {
    return await operation();
  } finally {
    stopLoading();
  }
};


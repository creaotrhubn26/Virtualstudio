import { useState, useCallback, useRef, useEffect } from 'react';
import settingsService, { getCurrentUserId } from '../services/settingsService';

interface AutoSaveConfig {
  enableAutoSave?: boolean;
  debounceDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  conflictResolution?: 'client' | 'server';
  enableConflictDetection?: boolean;
  enableVersioning?: boolean;
  maxVersions?: number;
  enableCompression?: boolean;
  enableEncryption?: boolean;
}

interface UseAutoSaveOptions {
  config?: AutoSaveConfig;
  onDataSaved?: (data: any) => void;
  onError?: (error: any) => void;
  onConflictDetected?: (conflict: any) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const {
    config = {
      enableAutoSave: true,
      debounceDelay: 2000,
      maxRetries: 3,
      retryDelay: 1000,
      conflictResolution: 'client',
      enableConflictDetection: true,
      enableVersioning: true,
      maxVersions: 10,
    },
    onDataSaved,
    onError,
    onConflictDetected,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [lastSave, setLastSave] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const cacheRef = useRef<Map<string, any>>(new Map());

  const save = useCallback(
    async (key: string, data: any) => {
      if (!config.enableAutoSave || isPaused) {
        setPendingChanges(true);
        return;
      }

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce save
      debounceTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        setPendingChanges(false);
        setHasError(false);
        setError(null);

        try {
          // Save to settings
          const saveData = {
            ...data,
            _savedAt: Date.now(),
            _version: config.enableVersioning ? saveCount + 1 : undefined,
          };

          await settingsService.setSetting(`autosave_${key}`, saveData, { userId: getCurrentUserId() });
          cacheRef.current.set(key, saveData);
          setLastSave(Date.now());
          setSaveCount((prev) => prev + 1);
          setPendingChanges(false);
          retryCountRef.current = 0;

          onDataSaved?.(saveData);
        } catch (err: any) {
          setHasError(true);
          setError(err.message || 'Save failed');
          setErrorCount((prev) => prev + 1);
          retryCountRef.current += 1;

          if (retryCountRef.current < (config.maxRetries || 3)) {
            setTimeout(() => save(key, data), config.retryDelay);
          } else {
            onError?.(err);
          }
        } finally {
          setIsSaving(false);
        }
      }, config.debounceDelay || 2000);
    },
    [config, isPaused, saveCount, onDataSaved, onError]
  );

  const forceSave = useCallback(async (key?: string, data?: any) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (key && data) {
      await save(key, data);
    }
  }, [save]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    if (pendingChanges) {
      setPendingChanges(false);
    }
  }, [pendingChanges]);

  const restoreFromBackup = useCallback((key: string) => {
    try {
      const cached = cacheRef.current.get(key);
      if (cached) return cached;
    } catch (err) {
      console.error('Failed to restore backup:', err);
    }
    return null;
  }, []);

  return {
    isEnabled: config.enableAutoSave ?? true,
    isSaving,
    pendingChanges,
    lastSave,
    hasError,
    error,
    isPaused,
    saveCount,
    errorCount,
    conflictCount,
    save,
    forceSave,
    pause,
    resume,
    restoreFromBackup,
  };
};






















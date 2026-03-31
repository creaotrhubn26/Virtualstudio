import { useState, useCallback, useRef, useEffect } from 'react';
import { sceneAnimationService, type AnimationState, type AnimationClipConfig, ANIMATION_PRESETS } from '../core/services/sceneAnimationService';

export interface PerObjectAnimationState {
  currentTime: number;
  duration: number;
  loop: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  activeClipId: string | null;
}

export interface SceneAnimationControls {
  state: AnimationState;
  presets: AnimationClipConfig[];
  states: Map<string, PerObjectAnimationState>;
  play: (objectIdOrClipId?: string) => void;
  pause: (objectId?: string) => void;
  stop: (objectId?: string) => void;
  seek: (time: number) => void;
  applyPreset: (presetId: string, targetId?: string) => { play: () => void };
  setTime: (objectId: string, time: number) => void;
  setGlobalTime: (time: number) => void;
  registerObject: (objectId: string, duration?: number) => void;
  unregisterObject: (objectId: string) => void;
  setGlobalSpeed: (speed: number) => void;
  globalSpeed: number;
  isAnyPlaying: boolean;
  pauseAll: () => void;
  playAll: () => void;
  stopAll: () => void;
}

export function useSceneAnimation(): SceneAnimationControls {
  const [state, setState] = useState<AnimationState>(() => sceneAnimationService.getState());
  const [globalSpeed, setGlobalSpeedState] = useState(1);
  const [, forceUpdate] = useState(0);
  const statesRef = useRef<Map<string, PerObjectAnimationState>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const tick = (time: number) => {
      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;
      sceneAnimationService.update(delta);
      const s = sceneAnimationService.getState();
      setState(s);
      if (s.isPlaying) {
        statesRef.current.forEach((perObj, id) => {
          if (perObj.isPlaying) {
            const newTime = Math.min(perObj.currentTime + delta, perObj.duration);
            statesRef.current.set(id, { ...perObj, currentTime: newTime, isPlaying: newTime < perObj.duration });
          }
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const play = useCallback((objectIdOrClipId?: string) => {
    if (objectIdOrClipId && statesRef.current.has(objectIdOrClipId)) {
      const s = statesRef.current.get(objectIdOrClipId)!;
      statesRef.current.set(objectIdOrClipId, { ...s, isPlaying: true });
      forceUpdate((n) => n + 1);
    } else {
      sceneAnimationService.play(objectIdOrClipId);
      setState(sceneAnimationService.getState());
    }
  }, []);

  const pause = useCallback((objectId?: string) => {
    if (objectId && statesRef.current.has(objectId)) {
      const s = statesRef.current.get(objectId)!;
      statesRef.current.set(objectId, { ...s, isPlaying: false });
      forceUpdate((n) => n + 1);
    } else {
      sceneAnimationService.pause();
      setState(sceneAnimationService.getState());
    }
  }, []);

  const stop = useCallback((objectId?: string) => {
    if (objectId && statesRef.current.has(objectId)) {
      const s = statesRef.current.get(objectId)!;
      statesRef.current.set(objectId, { ...s, isPlaying: false, currentTime: 0 });
      forceUpdate((n) => n + 1);
    } else {
      sceneAnimationService.stop();
      setState(sceneAnimationService.getState());
    }
  }, []);

  const seek = useCallback((time: number) => {
    sceneAnimationService.seek(time);
    setState(sceneAnimationService.getState());
  }, []);

  const applyPreset = useCallback((presetId: string, _targetId?: string): { play: () => void } => {
    sceneAnimationService.applyPreset(presetId);
    setState(sceneAnimationService.getState());
    return {
      play: () => {
        sceneAnimationService.play(presetId);
        setState(sceneAnimationService.getState());
      },
    };
  }, []);

  const setTime = useCallback((objectId: string, time: number) => {
    const s = statesRef.current.get(objectId);
    if (s) {
      statesRef.current.set(objectId, { ...s, currentTime: Math.max(0, Math.min(time, s.duration)) });
      forceUpdate((n) => n + 1);
    }
  }, []);

  const setGlobalTime = useCallback((time: number) => {
    sceneAnimationService.seek(time);
    setState(sceneAnimationService.getState());
    statesRef.current.forEach((s, id) => {
      statesRef.current.set(id, { ...s, currentTime: Math.max(0, Math.min(time, s.duration)) });
    });
    forceUpdate((n) => n + 1);
  }, []);

  const registerObject = useCallback((objectId: string, duration = 1.0) => {
    statesRef.current.set(objectId, { currentTime: 0, duration, loop: false, isPlaying: false, isPaused: false, activeClipId: null });
    forceUpdate((n) => n + 1);
  }, []);

  const unregisterObject = useCallback((objectId: string) => {
    statesRef.current.delete(objectId);
    forceUpdate((n) => n + 1);
  }, []);

  const setGlobalSpeed = useCallback((speed: number) => {
    setGlobalSpeedState(speed);
  }, []);

  const pauseAll = useCallback(() => {
    statesRef.current.forEach((s, id) => {
      statesRef.current.set(id, { ...s, isPlaying: false, isPaused: true });
    });
    sceneAnimationService.pause();
    setState(sceneAnimationService.getState());
    forceUpdate((n) => n + 1);
  }, []);

  const playAll = useCallback(() => {
    statesRef.current.forEach((s, id) => {
      statesRef.current.set(id, { ...s, isPlaying: true, isPaused: false });
    });
    sceneAnimationService.play();
    setState(sceneAnimationService.getState());
    forceUpdate((n) => n + 1);
  }, []);

  const stopAll = useCallback(() => {
    statesRef.current.forEach((s, id) => {
      statesRef.current.set(id, { ...s, isPlaying: false, isPaused: false, currentTime: 0 });
    });
    sceneAnimationService.stop();
    setState(sceneAnimationService.getState());
    forceUpdate((n) => n + 1);
  }, []);

  const isAnyPlaying = Array.from(statesRef.current.values()).some((s) => s.isPlaying) || state.isPlaying;

  return {
    state,
    presets: ANIMATION_PRESETS,
    states: statesRef.current,
    play,
    pause,
    stop,
    seek,
    applyPreset,
    setTime,
    setGlobalTime,
    registerObject,
    unregisterObject,
    setGlobalSpeed,
    globalSpeed,
    isAnyPlaying,
    pauseAll,
    playAll,
    stopAll,
  };
}

export default useSceneAnimation;

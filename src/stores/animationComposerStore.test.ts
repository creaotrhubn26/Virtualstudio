import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationComposerStore } from './animationComposerStore';

describe('AnimationComposerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAnimationComposerStore.setState({
      sequences: [],
      activeSequence: null,
      selectedLayerId: null,
      currentTime: 0,
      isPlaying: false,
      isLooping: true,
      playbackSpeed: 1,
      zoom: 1,
      showBehaviorPanel: true,
      showTrackingPanel: true,
      availableTargets: [],
    });
  });

  describe('Sequences', () => {
    it('should create a new sequence', () => {
      const { createSequence } = useAnimationComposerStore.getState();
      createSequence('Test Sequence');
      
      const state = useAnimationComposerStore.getState();
      expect(state.sequences).toHaveLength(1);
      expect(state.sequences[0].name).toBe('Test Sequence');
      expect(state.activeSequence).not.toBeNull();
      expect(state.activeSequence?.name).toBe('Test Sequence');
    });

    it('should set active sequence', () => {
      const { createSequence, setActiveSequence } = useAnimationComposerStore.getState();
      createSequence('Sequence 1');
      createSequence('Sequence 2');
      
      const sequences = useAnimationComposerStore.getState().sequences;
      setActiveSequence(sequences[0].id);
      
      expect(useAnimationComposerStore.getState().activeSequence?.name).toBe('Sequence 1');
    });

    it('should update sequence', () => {
      const { createSequence, updateSequence } = useAnimationComposerStore.getState();
      createSequence('Original');
      
      const seqId = useAnimationComposerStore.getState().sequences[0].id;
      updateSequence(seqId, { name: 'Updated', duration: 20 });
      
      const state = useAnimationComposerStore.getState();
      expect(state.sequences[0].name).toBe('Updated');
      expect(state.sequences[0].duration).toBe(20);
    });

    it('should delete sequence', () => {
      const { createSequence, deleteSequence } = useAnimationComposerStore.getState();
      createSequence('To Delete');
      
      const seqId = useAnimationComposerStore.getState().sequences[0].id;
      deleteSequence(seqId);
      
      expect(useAnimationComposerStore.getState().sequences).toHaveLength(0);
      expect(useAnimationComposerStore.getState().activeSequence).toBeNull();
    });
  });

  describe('Layers', () => {
    beforeEach(() => {
      useAnimationComposerStore.getState().createSequence('Test');
    });

    it('should add a layer', () => {
      const { addLayer } = useAnimationComposerStore.getState();
      addLayer({
        name: 'Key Light',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
      
      const state = useAnimationComposerStore.getState();
      expect(state.activeSequence?.layers).toHaveLength(1);
      expect(state.activeSequence?.layers[0].name).toBe('Key Light');
      expect(state.selectedLayerId).toBe(state.activeSequence?.layers[0].id);
    });

    it('should remove a layer', () => {
      const { addLayer, removeLayer } = useAnimationComposerStore.getState();
      addLayer({
        name: 'Layer 1',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
      
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;
      removeLayer(layerId);
      
      expect(useAnimationComposerStore.getState().activeSequence?.layers).toHaveLength(0);
    });

    it('should update layer properties', () => {
      const { addLayer, updateLayer } = useAnimationComposerStore.getState();
      addLayer({
        name: 'Layer',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
      
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;
      updateLayer(layerId, { enabled: false, solo: true });
      
      const layer = useAnimationComposerStore.getState().activeSequence?.layers[0];
      expect(layer?.enabled).toBe(false);
      expect(layer?.solo).toBe(true);
    });

    it('should duplicate a layer', () => {
      const { addLayer, duplicateLayer } = useAnimationComposerStore.getState();
      addLayer({
        name: 'Original Layer',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
      
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;
      duplicateLayer(layerId);
      
      const layers = useAnimationComposerStore.getState().activeSequence?.layers;
      expect(layers).toHaveLength(2);
      expect(layers?.[1].name).toBe('Original Layer (kopi)');
    });
  });

  describe('Keyframes', () => {
    beforeEach(() => {
      const store = useAnimationComposerStore.getState();
      store.createSequence('Test');
      store.addLayer({
        name: 'Layer',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
    });

    it('should add a keyframe', () => {
      const { addKeyframe } = useAnimationComposerStore.getState();
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;

      addKeyframe(layerId, {
        time: 2.5,
        value: { x: 1, y: 2, z: 3 },
        easing: 'easeInOut',
      });

      const keyframes = useAnimationComposerStore.getState().activeSequence?.layers[0].keyframes;
      expect(keyframes).toHaveLength(1);
      expect(keyframes?.[0].time).toBe(2.5);
    });

    it('should remove a keyframe', () => {
      const { addKeyframe, removeKeyframe } = useAnimationComposerStore.getState();
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;

      addKeyframe(layerId, { time: 1, easing: 'linear' });
      const kfId = useAnimationComposerStore.getState().activeSequence?.layers[0].keyframes[0].id!;

      removeKeyframe(layerId, kfId);
      expect(useAnimationComposerStore.getState().activeSequence?.layers[0].keyframes).toHaveLength(0);
    });
  });

  describe('Behaviors', () => {
    beforeEach(() => {
      const store = useAnimationComposerStore.getState();
      store.createSequence('Test');
      store.addLayer({
        name: 'Layer',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
    });

    it('should add a behavior', () => {
      const { addBehavior } = useAnimationComposerStore.getState();
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;

      addBehavior(layerId, {
        type: 'orbit',
        enabled: true,
        speed: 1,
        radius: 2,
        loop: true,
      });

      const behaviors = useAnimationComposerStore.getState().activeSequence?.layers[0].behaviors;
      expect(behaviors).toHaveLength(1);
      expect(behaviors?.[0].type).toBe('orbit');
    });

    it('should update a behavior', () => {
      const { addBehavior, updateBehavior } = useAnimationComposerStore.getState();
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;

      addBehavior(layerId, { type: 'pendulum', enabled: true, speed: 1, loop: true });
      const behaviorId = useAnimationComposerStore.getState().activeSequence?.layers[0].behaviors[0].id!;

      updateBehavior(layerId, behaviorId, { speed: 2, amplitude: 5 });

      const behavior = useAnimationComposerStore.getState().activeSequence?.layers[0].behaviors[0];
      expect(behavior?.speed).toBe(2);
      expect(behavior?.amplitude).toBe(5);
    });
  });

  describe('Playback Controls', () => {
    it('should play and pause', () => {
      const { play, pause } = useAnimationComposerStore.getState();

      play();
      expect(useAnimationComposerStore.getState().isPlaying).toBe(true);

      pause();
      expect(useAnimationComposerStore.getState().isPlaying).toBe(false);
    });

    it('should stop and reset time', () => {
      const { play, setCurrentTime, stop } = useAnimationComposerStore.getState();

      play();
      setCurrentTime(5);
      stop();

      const state = useAnimationComposerStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
    });

    it('should toggle loop', () => {
      const { toggleLoop } = useAnimationComposerStore.getState();

      expect(useAnimationComposerStore.getState().isLooping).toBe(true);
      toggleLoop();
      expect(useAnimationComposerStore.getState().isLooping).toBe(false);
    });

    it('should set playback speed', () => {
      const { setPlaybackSpeed } = useAnimationComposerStore.getState();

      setPlaybackSpeed(2);
      expect(useAnimationComposerStore.getState().playbackSpeed).toBe(2);
    });
  });

  describe('Tracking', () => {
    beforeEach(() => {
      const store = useAnimationComposerStore.getState();
      store.createSequence('Test');
      store.addLayer({
        name: 'Layer',
        targetId: 'light-1',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#ff6b00',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
    });

    it('should set tracking config', () => {
      const { setTracking } = useAnimationComposerStore.getState();
      const layerId = useAnimationComposerStore.getState().activeSequence?.layers[0].id!;

      setTracking(layerId, {
        mode: 'lookAt',
        targetId: 'actor-1',
        targetType: 'actor',
        smoothing: 0.1,
      });

      const tracking = useAnimationComposerStore.getState().activeSequence?.layers[0].tracking;
      expect(tracking?.mode).toBe('lookAt');
      expect(tracking?.targetId).toBe('actor-1');
    });
  });

  describe('Targets', () => {
    it('should set available targets', () => {
      const { setAvailableTargets } = useAnimationComposerStore.getState();

      setAvailableTargets([
        { id: 'light-1', name: 'Key Light', type: 'light' },
        { id: 'actor-1', name: 'Model', type: 'actor' },
      ]);

      const targets = useAnimationComposerStore.getState().availableTargets;
      expect(targets).toHaveLength(2);
      expect(targets[0].name).toBe('Key Light');
    });
  });
});


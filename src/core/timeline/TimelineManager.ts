import { TimelineData, Keyframe } from '../models/sceneComposer';
import * as BABYLON from '@babylonjs/core';

export class TimelineManager {
  private timeline: TimelineData;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private animationFrameId: number | null = null;
  private onUpdateCallback?: (time: number) => void;
  private onCompleteCallback?: () => void;

  constructor(timeline?: TimelineData) {
    this.timeline = timeline || {
      duration: 60,
      keyframes: []
    };
  }

  /**
   * Set the timeline data
   */
  public setTimeline(timeline: TimelineData): void {
    this.timeline = timeline;
    if (this.currentTime > timeline.duration) {
      this.currentTime = timeline.duration;
    }
  }

  /**
   * Get the timeline data
   */
  public getTimeline(): TimelineData {
    return this.timeline;
  }

  /**
   * Add a keyframe
   */
  public addKeyframe(keyframe: Keyframe): void {
    this.timeline.keyframes.push(keyframe);
    this.timeline.keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Remove a keyframe
   */
  public removeKeyframe(time: number, targetId: string, type: Keyframe['type']): void {
    this.timeline.keyframes = this.timeline.keyframes.filter(
      kf => !(kf.time === time && kf.targetId === targetId && kf.type === type)
    );
  }

  /**
   * Get keyframes for a specific target
   */
  public getKeyframesForTarget(targetId: string, type?: Keyframe['type']): Keyframe[] {
    return this.timeline.keyframes.filter(
      kf => kf.targetId === targetId && (type === undefined || kf.type === type)
    );
  }

  /**
   * Get keyframes at a specific time
   */
  public getKeyframesAtTime(time: number): Keyframe[] {
    return this.timeline.keyframes.filter(kf => Math.abs(kf.time - time) < 0.01);
  }

  /**
   * Interpolate between two keyframes
   */
  private interpolateKeyframes(kf1: Keyframe, kf2: Keyframe, time: number): Record<string, any> {
    const t = (time - kf1.time) / (kf2.time - kf1.time);
    
    // Linear interpolation for numeric values
    const result: Record<string, any> = {};
    
    Object.keys(kf1.properties).forEach(key => {
      const val1 = kf1.properties[key];
      const val2 = kf2.properties[key];
      
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        result[key] = val1 + (val2 - val1) * t;
      } else if (Array.isArray(val1) && Array.isArray(val2) && val1.length === val2.length) {
        result[key] = val1.map((v, i) => {
          if (typeof v === 'number' && typeof val2[i] === 'number') {
            return v + (val2[i] - v) * t;
          }
          return val2[i];
        });
      } else {
        // Use the value from the closest keyframe
        result[key] = t < 0.5 ? val1 : val2;
      }
    });
    
    return result;
  }

  /**
   * Get interpolated properties for a target at a specific time
   */
  public getInterpolatedProperties(targetId: string, type: Keyframe['type'], time: number): Record<string, any> | null {
    const keyframes = this.getKeyframesForTarget(targetId, type).sort((a, b) => a.time - b.time);
    
    if (keyframes.length === 0) return null;
    
    // Find the two keyframes to interpolate between
    let before: Keyframe | null = null;
    let after: Keyframe | null = null;
    
    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i].time <= time) {
        before = keyframes[i];
      }
      if (keyframes[i].time >= time && !after) {
        after = keyframes[i];
        break;
      }
    }
    
    // If exact match, return that keyframe's properties
    if (before && Math.abs(before.time - time) < 0.01) {
      return { ...before.properties };
    }
    
    // If before first keyframe, return first keyframe
    if (!before && after) {
      return { ...after.properties };
    }
    
    // If after last keyframe, return last keyframe
    if (before && !after) {
      return { ...before.properties };
    }
    
    // Interpolate between before and after
    if (before && after) {
      return this.interpolateKeyframes(before, after, time);
    }
    
    return null;
  }

  /**
   * Set update callback
   */
  public onUpdate(callback: (time: number) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * Set complete callback
   */
  public onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  /**
   * Play the timeline
   */
  public play(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    const startTime = performance.now();
    const startTimelineTime = this.currentTime;
    
    const update = () => {
      if (!this.isPlaying) return;
      
      const elapsed = (performance.now() - startTime) / 1000;
      this.currentTime = startTimelineTime + elapsed;
      
      if (this.currentTime >= this.timeline.duration) {
        this.currentTime = this.timeline.duration;
        this.pause();
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }
      
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentTime);
      }
      
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    update();
  }

  /**
   * Pause the timeline
   */
  public pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop the timeline and reset to start
   */
  public stop(): void {
    this.pause();
    this.currentTime = 0;
  }

  /**
   * Seek to a specific time
   */
  public seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.timeline.duration));
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.currentTime);
    }
  }

  /**
   * Get current time
   */
  public getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Check if playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.pause();
    this.onUpdateCallback = undefined;
    this.onCompleteCallback = undefined;
  }
}


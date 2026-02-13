import { useRef, useEffect } from 'react';

interface RenderMetrics {
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  lastRenderTime: number;
}

/**
 * Hook to track component render performance
 * Useful for identifying performance bottlenecks
 */
export const useRenderMetrics = (componentName: string): RenderMetrics => {
  const metricsRef = useRef({
    renderCount: 0,
    totalRenderTime: 0,
    lastRenderStart: performance.now(),
  });

  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    metricsRef.current.renderCount++;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.lastRenderStart = endTime;

    if (metricsRef.current.renderCount % 10 === 0) {
      const avgTime = metricsRef.current.totalRenderTime / metricsRef.current.renderCount;
      if (avgTime > 16) { // More than 1 frame at 60fps
        console.warn(
          `⚠️ ${componentName} slow renders: avg=${avgTime.toFixed(2)}ms, renders=${metricsRef.current.renderCount}`
        );
      }
    }
  });

  return {
    renderCount: metricsRef.current.renderCount,
    totalRenderTime: metricsRef.current.totalRenderTime,
    avgRenderTime: metricsRef.current.totalRenderTime / Math.max(1, metricsRef.current.renderCount),
    lastRenderTime: performance.now() - metricsRef.current.lastRenderStart,
  };
};

import React, { useEffect, useRef } from 'react';

export interface Stage3DConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  antialias?: boolean;
  shadows?: boolean;
  showGrid?: boolean;
  showGizmos?: boolean;
}

export interface Stage3DProps {
  config?: Stage3DConfig;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (canvas: HTMLCanvasElement) => void;
  onError?: (error: Error) => void;
}

export function Stage3D({ config = {}, className, style, onReady, onError }: Stage3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      const bg = config.backgroundColor ?? '#0D1117';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (config.showGrid) {
        ctx.strokeStyle = '#30363D';
        ctx.lineWidth = 0.5;
        const step = 40;
        for (let x = 0; x < canvas.width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      onReady?.(canvas);
    } catch (error) {
      console.warn('[Stage3D] Error initializing canvas:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [config, onReady, onError]);

  return (
    <canvas
      ref={canvasRef}
      width={config.width ?? 800}
      height={config.height ?? 600}
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
}

export default Stage3D;

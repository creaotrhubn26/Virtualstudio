import React from 'react';
import { type LensEffectConfig } from '../../core/rendering/LensEffectsRenderer';

interface LensEffectsPreviewProps {
  config?: LensEffectConfig;
  onConfigChange?: (config: Partial<LensEffectConfig>) => void;
}

const SliderRow = ({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
    <span style={{ color: '#8B949E', fontSize: 11, width: 160, flexShrink: 0 }}>{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ flex: 1, accentColor: '#0A84FF' }}
    />
    <span style={{ color: '#E6EDF3', fontSize: 11, width: 36, textAlign: 'right' }}>
      {value.toFixed(2)}
    </span>
  </div>
);

export function LensEffectsPreview({ config, onConfigChange }: LensEffectsPreviewProps) {
  const effectConfig: LensEffectConfig = config ?? {
    enabled: false,
    chromaticAberration: 0.002,
    vignette: 0.3,
    distortion: 0.01,
    flareIntensity: 0.5,
    flareThreshold: 0.8,
    bloomIntensity: 0.5,
    bloomRadius: 0.5,
    glareIntensity: 0.3,
    ghostingIntensity: 0.2,
  };

  const set = (key: keyof LensEffectConfig, value: number | boolean) =>
    onConfigChange?.({ [key]: value });

  return (
    <div
      style={{
        background: '#161B22',
        border: '1px solid #30363D',
        borderRadius: 8,
        padding: 16,
        color: '#E6EDF3',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8B949E' }}>LINSEEFFEKTER</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={effectConfig.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            style={{ accentColor: '#0A84FF' }}
          />
          Aktivert
        </label>
      </div>

      {effectConfig.enabled && (
        <>
          <SliderRow label="Kromatisk Aberrasjon" value={effectConfig.chromaticAberration} onChange={(v) => set('chromaticAberration', v)} max={0.02} step={0.0001} />
          <SliderRow label="Vignett" value={effectConfig.vignette} onChange={(v) => set('vignette', v)} />
          <SliderRow label="Forvrengning" value={effectConfig.distortion} onChange={(v) => set('distortion', v)} max={0.1} step={0.001} />
          <SliderRow label="Bluss-intensitet" value={effectConfig.flareIntensity} onChange={(v) => set('flareIntensity', v)} />
          <SliderRow label="Bluss-terskel" value={effectConfig.flareThreshold} onChange={(v) => set('flareThreshold', v)} />
          <SliderRow label="Glødeintensitet" value={effectConfig.bloomIntensity} onChange={(v) => set('bloomIntensity', v)} />
          <SliderRow label="Gløderadius" value={effectConfig.bloomRadius} onChange={(v) => set('bloomRadius', v)} />
          <SliderRow label="Glansintensitet" value={effectConfig.glareIntensity} onChange={(v) => set('glareIntensity', v)} />
          <SliderRow label="Gjenferdintensitet" value={effectConfig.ghostingIntensity} onChange={(v) => set('ghostingIntensity', v)} />
        </>
      )}
    </div>
  );
}

export default LensEffectsPreview;

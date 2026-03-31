import React, { useState } from 'react';

export type ExportFormat = 'jpeg' | 'png' | 'tiff' | 'webp' | 'heic' | 'raw';
export type ExportResolution = '1x' | '2x' | '3x' | 'custom';
export type ExportColorSpace = 'srgb' | 'adobergb' | 'displayp3' | 'prophoto';

export interface ExportSettings {
  format: ExportFormat;
  resolution: ExportResolution;
  width?: number;
  height?: number;
  quality: number;
  colorSpace: ExportColorSpace;
  includeMetadata: boolean;
  applyLUT: boolean;
  lutPath?: string;
}

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  defaultSettings?: Partial<ExportSettings>;
}

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'jpeg',
  resolution: '1x',
  quality: 92,
  colorSpace: 'srgb',
  includeMetadata: true,
  applyLUT: false,
};

export function ExportDialog({ open, onClose, onExport, defaultSettings = {} }: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({ ...DEFAULT_SETTINGS, ...defaultSettings });

  if (!open) return null;

  const set = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#161B22', border: '1px solid #30363D', borderRadius: 12,
          padding: 24, width: 440, color: '#E6EDF3', fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Eksporter</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#8B949E', display: 'block', marginBottom: 6 }}>Format</label>
            <select
              value={settings.format}
              onChange={(e) => set('format', e.target.value as ExportFormat)}
              style={{ width: '100%', background: '#0D1117', border: '1px solid #30363D', borderRadius: 6, padding: '6px 10px', color: '#E6EDF3', fontSize: 13 }}
            >
              {(['jpeg', 'png', 'tiff', 'webp'] as ExportFormat[]).map((fmt) => (
                <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#8B949E', display: 'block', marginBottom: 6 }}>
              Kvalitet: {settings.quality}%
            </label>
            <input
              type="range" min={50} max={100} step={1} value={settings.quality}
              onChange={(e) => set('quality', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#0A84FF' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#8B949E', display: 'block', marginBottom: 6 }}>Fargerom</label>
            <select
              value={settings.colorSpace}
              onChange={(e) => set('colorSpace', e.target.value as ExportColorSpace)}
              style={{ width: '100%', background: '#0D1117', border: '1px solid #30363D', borderRadius: 6, padding: '6px 10px', color: '#E6EDF3', fontSize: 13 }}
            >
              <option value="srgb">sRGB</option>
              <option value="adobergb">Adobe RGB</option>
              <option value="displayp3">Display P3</option>
              <option value="prophoto">ProPhoto RGB</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={settings.includeMetadata} onChange={(e) => set('includeMetadata', e.target.checked)} style={{ accentColor: '#0A84FF' }} />
            Inkluder metadata (EXIF)
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #30363D', borderRadius: 6, padding: '6px 16px', color: '#8B949E', cursor: 'pointer', fontSize: 13 }}>
            Avbryt
          </button>
          <button onClick={() => onExport(settings)} style={{ background: '#0A84FF', border: 'none', borderRadius: 6, padding: '6px 16px', color: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Eksporter
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;

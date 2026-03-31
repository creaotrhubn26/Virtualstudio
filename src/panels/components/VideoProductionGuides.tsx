import React from 'react';

export type AspectRatioType = '16:9' | '4:3' | '2.39:1' | '1:1' | '9:16' | '2.35:1' | '1.85:1' | '2:1';

export interface SafeZone {
  id: string;
  label: string;
  percentage: number;
  color: string;
  description: string;
}

export interface FrameGuide {
  id: string;
  label: string;
  type: 'safe-action' | 'safe-title' | 'letterbox' | 'pillarbox' | 'center-cross' | 'grid';
  enabled: boolean;
  color?: string;
  opacity?: number;
}

export const ASPECT_RATIO_CONFIGS: Record<AspectRatioType, { width: number; height: number; label: string; description: string }> = {
  '16:9': { width: 16, height: 9, label: '16:9 HD/4K', description: 'Standard HDTV og digitalt kino' },
  '4:3': { width: 4, height: 3, label: '4:3 Standard', description: 'Tradisjonelt TV-format' },
  '2.39:1': { width: 239, height: 100, label: '2.39:1 Anamorfisk', description: 'Widescreen kinomatisk format' },
  '1:1': { width: 1, height: 1, label: '1:1 Kvadratisk', description: 'Instagram og sosiale medier' },
  '9:16': { width: 9, height: 16, label: '9:16 Vertikal', description: 'Mobil og Stories-format' },
  '2.35:1': { width: 235, height: 100, label: '2.35:1 Cinemascope', description: 'Klassisk kinoformat' },
  '1.85:1': { width: 185, height: 100, label: '1.85:1 Flat', description: 'Moderne kinostandard' },
  '2:1': { width: 2, height: 1, label: '2:1 Univisium', description: 'Netflix og streaming' },
};

export const DEFAULT_FRAME_GUIDES: FrameGuide[] = [
  { id: 'safe-action', label: 'Handlingssikker sone', type: 'safe-action', enabled: true, color: '#FFFF00', opacity: 0.7 },
  { id: 'safe-title', label: 'Tittelsikker sone', type: 'safe-title', enabled: true, color: '#00FFFF', opacity: 0.7 },
  { id: 'center-cross', label: 'Senterkors', type: 'center-cross', enabled: false, color: '#FF0000', opacity: 0.8 },
  { id: 'grid', label: 'Tredjeparts-rutenett', type: 'grid', enabled: false, color: '#FFFFFF', opacity: 0.3 },
];

interface VideoProductionGuidesProps {
  aspectRatio?: AspectRatioType;
  guides?: FrameGuide[];
  onAspectRatioChange?: (ratio: AspectRatioType) => void;
  onGuideChange?: (guideId: string, enabled: boolean) => void;
}

export function VideoProductionGuides({
  aspectRatio = '16:9',
  guides = DEFAULT_FRAME_GUIDES,
  onAspectRatioChange,
  onGuideChange,
}: VideoProductionGuidesProps) {
  const config = ASPECT_RATIO_CONFIGS[aspectRatio];

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
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#8B949E' }}>
        VIDEOPRODUKSJONSGUIDER
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#8B949E', marginBottom: 6 }}>Bildeformat</div>
        <select
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange?.(e.target.value as AspectRatioType)}
          style={{
            width: '100%',
            background: '#0D1117',
            border: '1px solid #30363D',
            borderRadius: 6,
            padding: '6px 10px',
            color: '#E6EDF3',
            fontSize: 12,
            outline: 'none',
          }}
        >
          {(Object.keys(ASPECT_RATIO_CONFIGS) as AspectRatioType[]).map((ratio) => (
            <option key={ratio} value={ratio}>
              {ASPECT_RATIO_CONFIGS[ratio].label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: '#8B949E', marginTop: 4 }}>{config.description}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#8B949E', marginBottom: 8 }}>Rammelinjer</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {guides.map((guide) => (
            <label
              key={guide.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={guide.enabled}
                onChange={(e) => onGuideChange?.(guide.id, e.target.checked)}
                style={{ accentColor: guide.color ?? '#0A84FF' }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: guide.color ?? '#0A84FF',
                  flexShrink: 0,
                }}
              />
              {guide.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VideoProductionGuides;

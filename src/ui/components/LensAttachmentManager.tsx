import React, { useState } from 'react';
import { getLensesByMount, type LensSpec, type MountType } from '../../core/data/LensSpecifications';

interface LensAttachmentManagerProps {
  selectedLensId?: string;
  mountType?: MountType;
  onLensSelect?: (lens: LensSpec) => void;
  onLensDetach?: () => void;
}

export function LensAttachmentManager({
  selectedLensId,
  mountType = 'RF',
  onLensSelect,
  onLensDetach,
}: LensAttachmentManagerProps) {
  const [search, setSearch] = useState('');
  const lenses = getLensesByMount(mountType).filter(
    (l) =>
      search === '' ||
      l.brand.toLowerCase().includes(search.toLowerCase()) ||
      l.model.toLowerCase().includes(search.toLowerCase()),
  );

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
        OBJEKTIVADMINISTRASJON
      </div>

      {selectedLensId && (
        <div
          style={{
            background: '#0D1117',
            border: '1px solid #0A84FF',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <span>Tilkoblet: {selectedLensId}</span>
          {onLensDetach && (
            <button
              onClick={onLensDetach}
              style={{ background: 'transparent', border: 'none', color: '#F85149', cursor: 'pointer', fontSize: 11 }}
            >
              Koble fra
            </button>
          )}
        </div>
      )}

      <input
        type="text"
        placeholder="Søk objektiver..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          background: '#0D1117',
          border: '1px solid #30363D',
          borderRadius: 6,
          padding: '6px 10px',
          color: '#E6EDF3',
          fontSize: 12,
          marginBottom: 10,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {lenses.map((lens) => (
          <div
            key={lens.id}
            onClick={() => onLensSelect?.(lens)}
            style={{
              background: selectedLensId === lens.id ? '#0A84FF22' : '#0D1117',
              border: `1px solid ${selectedLensId === lens.id ? '#0A84FF' : '#30363D'}`,
              borderRadius: 6,
              padding: '8px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 500, color: '#E6EDF3' }}>{lens.brand} {lens.model}</div>
            <div style={{ color: '#8B949E', fontSize: 11, marginTop: 2 }}>
              {Array.isArray(lens.focalLength) ? `${lens.focalLength[0]}-${lens.focalLength[1]}mm` : `${lens.focalLength}mm`} · f/{lens.maxAperture}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LensAttachmentManager;

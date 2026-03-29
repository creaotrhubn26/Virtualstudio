import React, { useEffect, useState, useCallback } from 'react';
import { StoryCharacterManifest } from '../data/scenarioPresets';

interface StorySceneLoadedDetail {
  preset: {
    navn: string;
    characters?: StoryCharacterManifest[];
  };
}

interface StoryCharacterSelectedDetail {
  rigId: string | null;
  modelId?: string;
}

export const StoryCharacterHUD: React.FC = () => {
  const [characters, setCharacters] = useState<StoryCharacterManifest[]>([]);
  const [sceneName, setSceneName] = useState<string>('');
  const [selectedRigId, setSelectedRigId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onSceneLoaded = (e: Event) => {
      const detail = (e as CustomEvent<StorySceneLoadedDetail>).detail;
      const chars = detail?.preset?.characters ?? [];
      setCharacters(chars);
      setSceneName(detail?.preset?.navn ?? '');
      setVisible(chars.length > 0);
      setSelectedRigId(null);
    };

    const onCharSelected = (e: Event) => {
      const detail = (e as CustomEvent<StoryCharacterSelectedDetail>).detail;
      setSelectedRigId(detail?.rigId ?? null);
    };

    const onSceneCleared = () => {
      setCharacters([]);
      setSceneName('');
      setSelectedRigId(null);
      setVisible(false);
    };

    window.addEventListener('ch-story-scene-loaded', onSceneLoaded);
    window.addEventListener('ch-story-character-selected', onCharSelected);
    window.addEventListener('ch-clear-story-characters', onSceneCleared);

    return () => {
      window.removeEventListener('ch-story-scene-loaded', onSceneLoaded);
      window.removeEventListener('ch-story-character-selected', onCharSelected);
      window.removeEventListener('ch-clear-story-characters', onSceneCleared);
    };
  }, []);

  const selectCharacter = useCallback((rigId: string) => {
    window.dispatchEvent(new CustomEvent('ch-select-story-character', { detail: { rigId } }));
  }, []);

  const deselect = useCallback(() => {
    window.dispatchEvent(new CustomEvent('ch-select-story-character', { detail: { rigId: null } }));
  }, []);

  if (!visible || characters.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 60,
        userSelect: 'none',
      }}
    >
      {selectedRigId && (
        <div
          style={{
            background: 'rgba(0, 212, 255, 0.15)',
            border: '1px solid rgba(0, 212, 255, 0.4)',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 11,
            color: '#00d4ff',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          WASD: beveg karakter &nbsp;|&nbsp; Tab: bytt karakter
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'rgba(10, 14, 20, 0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '6px 8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {characters.map((char) => {
          const isSelected = selectedRigId === char.id;
          return (
            <button
              key={char.id}
              onClick={() => (isSelected ? deselect() : selectCharacter(char.id))}
              title={isSelected ? `Klikk for å fjerne kontroll over ${char.label}` : `Klikk for å styre ${char.label} med WASD`}
              style={{
                background: isSelected
                  ? 'rgba(0, 212, 255, 0.25)'
                  : 'rgba(255,255,255,0.04)',
                border: isSelected
                  ? '1.5px solid rgba(0, 212, 255, 0.7)'
                  : '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 7,
                color: isSelected ? '#00d4ff' : '#c8cdd5',
                cursor: 'pointer',
                padding: '5px 11px',
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.15s',
                minWidth: 70,
              }}
            >
              <span style={{ fontSize: 16 }}>🧍</span>
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {char.label}
              </span>
              {isSelected && (
                <span style={{ fontSize: 9, opacity: 0.75, fontFamily: 'monospace' }}>
                  AKTIV
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

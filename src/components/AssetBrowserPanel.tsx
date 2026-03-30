/**
 * Asset Browser Panel
 *
 * Live search and import from 4 external 3D asset APIs:
 *   • Poly Haven  — CC0 models, HDRIs, textures (no key needed)
 *   • ambientCG   — CC0 PBR materials (no key needed)
 *   • Sketchfab   — 1M+ models (needs SKETCHFAB_API_TOKEN env secret)
 *   • Poly Pizza  — low-poly models (needs POLYPIZZA_API_KEY env secret)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Tab,
  Tabs,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Stack,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  OpenWith as MoveIcon,
  Landscape as HdriIcon,
  Texture as TextureIcon,
  ViewInAr as ModelIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

interface AssetResult {
  id: string;
  name: string;
  source: 'polyhaven' | 'ambientcg' | 'sketchfab' | 'polypizza';
  type: 'model' | 'hdri' | 'texture';
  thumbnail: string;
  downloadUrl: string | null;
  previewUrl: string | null;
  license: string;
  author: string;
  tags: string[];
  polyCount: number | null;
  uid: string | null;
}

interface AssetBrowserPanelProps {
  onClose: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const SOURCES = [
  {
    key: 'polyhaven',
    label: 'Poly Haven',
    color: '#f6a623',
    types: ['models', 'hdris', 'textures'],
    desc: 'CC0 • Gratis uten kreditt',
    hasKey: true,
  },
  {
    key: 'ambientcg',
    label: 'ambientCG',
    color: '#88aaff',
    types: ['textures'],
    desc: 'CC0 • PBR-materialer',
    hasKey: true,
  },
  {
    key: 'sketchfab',
    label: 'Sketchfab',
    color: '#1caad9',
    types: ['models'],
    desc: 'Trenger SKETCHFAB_API_TOKEN',
    hasKey: false,
  },
  {
    key: 'polypizza',
    label: 'Poly Pizza',
    color: '#ff7043',
    types: ['models'],
    desc: 'Trenger POLYPIZZA_API_KEY',
    hasKey: false,
  },
] as const;

const TYPE_OPTIONS = [
  { key: 'models', label: 'Modeller', icon: <ModelIcon sx={{ fontSize: 14 }} /> },
  { key: 'hdris', label: 'HDRIs', icon: <HdriIcon sx={{ fontSize: 14 }} /> },
  { key: 'textures', label: 'Teksturer', icon: <TextureIcon sx={{ fontSize: 14 }} /> },
];

const LICENSE_COLOR: Record<string, string> = {
  CC0: '#4caf50',
  'cc0': '#4caf50',
  'CC-BY': '#8bc34a',
  'standard': '#9e9e9e',
};

function LicenseBadge({ license }: { license: string }) {
  const color = LICENSE_COLOR[license] ?? '#9e9e9e';
  return (
    <Box sx={{
      px: 0.6, py: 0.1, borderRadius: 0.5,
      bgcolor: `${color}22`, border: `1px solid ${color}55`,
      fontSize: 9, color, fontWeight: 700, letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}>
      {license.toUpperCase()}
    </Box>
  );
}

function AssetCard({
  asset,
  onAddToScene,
  isAdding,
}: {
  asset: AssetResult;
  onAddToScene: (asset: AssetResult) => void;
  isAdding: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const src = SOURCES.find(s => s.key === asset.source);

  return (
    <Box sx={{
      bgcolor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 1.5,
      overflow: 'hidden',
      transition: 'border-color 0.15s, transform 0.15s',
      '&:hover': {
        borderColor: 'rgba(0,212,255,0.35)',
        transform: 'translateY(-1px)',
        '& .asset-actions': { opacity: 1 },
      },
      cursor: 'pointer',
      position: 'relative',
    }}>
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', pb: '66%', bgcolor: 'rgba(0,0,0,0.3)' }}>
        {!imgError && asset.thumbnail ? (
          <Box
            component="img"
            src={asset.thumbnail}
            onError={() => setImgError(true)}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {asset.type === 'hdri' ? (
              <HdriIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }} />
            ) : asset.type === 'texture' ? (
              <TextureIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }} />
            ) : (
              <ModelIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }} />
            )}
          </Box>
        )}

        {/* Type badge */}
        <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
          <Chip
            label={asset.type.toUpperCase()}
            size="small"
            sx={{
              height: 16, fontSize: 9, fontWeight: 700,
              bgcolor: asset.type === 'hdri' ? 'rgba(255,140,0,0.85)' : asset.type === 'texture' ? 'rgba(100,100,255,0.85)' : 'rgba(0,180,100,0.85)',
              color: '#fff',
            }}
          />
        </Box>

        {/* Source badge */}
        {src && (
          <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: src.color }} />
          </Box>
        )}

        {/* Hover actions */}
        <Box className="asset-actions" sx={{
          position: 'absolute', inset: 0,
          bgcolor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          opacity: 0, transition: 'opacity 0.15s',
        }}>
          <Tooltip title={
            asset.type === 'hdri' ? 'Bruk som miljø' :
            asset.type === 'texture' ? 'Last ned' :
            'Legg til i scenen'
          } placement="top">
            <IconButton
              onClick={() => onAddToScene(asset)}
              disabled={isAdding}
              sx={{
                bgcolor: '#00d4ff', color: '#000', width: 36, height: 36,
                '&:hover': { bgcolor: '#00b8e6' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)' },
              }}
            >
              {isAdding ? (
                <CircularProgress size={16} sx={{ color: '#000' }} />
              ) : asset.type === 'hdri' ? (
                <HdriIcon sx={{ fontSize: 18 }} />
              ) : asset.type === 'texture' ? (
                <DownloadIcon sx={{ fontSize: 18 }} />
              ) : (
                <AddIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
          {asset.previewUrl && (
            <Tooltip title="Åpne kilde" placement="top">
              <IconButton
                component="a"
                href={asset.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', width: 32, height: 32 }}
              >
                <InfoIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ px: 1, pt: 0.5, pb: 0.75 }}>
        <Typography variant="caption" sx={{
          color: '#fff', fontSize: 11, fontWeight: 600,
          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {asset.name}
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.3 }}>
          <LicenseBadge license={asset.license} />
          {asset.polyCount != null && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>
              {asset.polyCount.toLocaleString()} poly
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export function AssetBrowserPanel({ onClose, isFullscreen = false, onToggleFullscreen }: AssetBrowserPanelProps) {
  const [sourceTab, setSourceTab] = useState(0);
  const [typeFilter, setTypeFilter] = useState('models');
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<AssetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSource = SOURCES[sourceTab];

  // Validate which sources have keys configured
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`/api/assets/search?source=sketchfab&q=chair&type=models&limit=1`);
        const d = await r.json();
        setKeyStatus(prev => ({ ...prev, sketchfab: d.results?.length > 0 || d.success }));
      } catch {
        setKeyStatus(prev => ({ ...prev, sketchfab: false }));
      }
      try {
        const r = await fetch(`/api/assets/search?source=polypizza&q=chair&type=models&limit=1`);
        const d = await r.json();
        setKeyStatus(prev => ({ ...prev, polypizza: d.results?.length > 0 || d.success }));
      } catch {
        setKeyStatus(prev => ({ ...prev, polypizza: false }));
      }
    };
    void check();
  }, []);

  const doSearch = useCallback(async (src: string, q: string, t: string) => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const params = new URLSearchParams({
        source: src,
        q: q,
        type: t,
        limit: '24',
      });
      const r = await fetch(`/api/assets/search?${params}`);
      const d = await r.json();
      if (!d.success) {
        setError(d.error || 'Søket feilet');
      } else {
        setResults(d.results || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nettverksfeil');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search when source/type changes
  useEffect(() => {
    const src = SOURCES[sourceTab]?.key;
    if (!src) return;
    void doSearch(src, query, typeFilter);
  }, [sourceTab, typeFilter, query, doSearch]);

  const handleInputChange = (v: string) => {
    setInputValue(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setQuery(v);
    }, 500);
  };

  const handleTabChange = (_: React.SyntheticEvent, newVal: number) => {
    setSourceTab(newVal);
    // Auto-set type to first available for this source
    const firstType = SOURCES[newVal]?.types[0] ?? 'models';
    if (!SOURCES[newVal]?.types.includes(typeFilter as never)) {
      setTypeFilter(firstType);
    }
  };

  const handleAddToScene = useCallback(async (asset: AssetResult) => {
    setAddingId(asset.id);
    try {
      if (asset.type === 'hdri') {
        if (!asset.downloadUrl) throw new Error('Ingen nedlastingslenke');
        window.dispatchEvent(new CustomEvent('vs-load-environment-hdri', {
          detail: { url: asset.downloadUrl, name: asset.name },
        }));
      } else if (asset.type === 'texture') {
        // Open download link for textures
        if (asset.downloadUrl || asset.previewUrl) {
          window.open(asset.downloadUrl || asset.previewUrl || '', '_blank', 'noopener');
        }
      } else {
        // Model — load as prop
        let glbUrl = asset.downloadUrl;

        // Sketchfab: fetch a temporary download URL from backend
        if (asset.source === 'sketchfab' && asset.uid && !glbUrl) {
          const r = await fetch(`/api/assets/sketchfab/download/${asset.uid}`);
          const d = await r.json();
          glbUrl = d.url ?? null;
        }

        if (!glbUrl) throw new Error('Ingen nedlastingslenke');

        window.dispatchEvent(new CustomEvent('vs-load-external-glb', {
          detail: { url: glbUrl, name: asset.name },
        }));
      }
    } catch (e) {
      console.warn('[AssetBrowser] Add to scene failed:', e);
    } finally {
      setTimeout(() => setAddingId(null), 800);
    }
  }, []);

  const availableTypes = TYPE_OPTIONS.filter(t =>
    currentSource.types.includes(t.key as never)
  );

  const needsKey = (currentSource.key === 'sketchfab' || currentSource.key === 'polypizza')
    && keyStatus[currentSource.key] === false;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0a0e1a', color: '#fff', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 1.5, py: 1,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <ModelIcon sx={{ color: '#00d4ff', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, fontSize: 13, flex: 1 }}>
          Asset Browser
        </Typography>
        {onToggleFullscreen && (
          <Tooltip title={isFullscreen ? 'Normalstørrelse' : 'Fullskjerm'}>
            <IconButton onClick={onToggleFullscreen} size="small" sx={{ color: 'rgba(255,255,255,0.5)', p: 0.4 }}>
              {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 15 }} /> : <FullscreenIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Lukk">
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.5)', p: 0.4 }}>
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Source tabs */}
      <Tabs
        value={sourceTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          flexShrink: 0,
          minHeight: 36,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'none', minWidth: 0 },
          '& .Mui-selected': { color: '#fff' },
          '& .MuiTabs-indicator': { bgcolor: '#00d4ff', height: 2 },
        }}
      >
        {SOURCES.map((s, i) => (
          <Tab
            key={s.key}
            label={
              <Stack direction="row" alignItems="center" spacing={0.4}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                <span>{s.label}</span>
              </Stack>
            }
            value={i}
          />
        ))}
      </Tabs>

      {/* Source info bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 1.5, py: 0.5,
        bgcolor: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, flex: 1 }}>
          {currentSource.desc}
        </Typography>
        {availableTypes.map(t => (
          <Chip
            key={t.key}
            icon={t.icon}
            label={t.label}
            size="small"
            onClick={() => setTypeFilter(t.key)}
            sx={{
              height: 20, fontSize: 10, cursor: 'pointer',
              bgcolor: typeFilter === t.key ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: typeFilter === t.key ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: typeFilter === t.key ? '#00d4ff' : 'rgba(255,255,255,0.5)',
              '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
              '&:hover': { bgcolor: 'rgba(0,212,255,0.1)' },
            }}
          />
        ))}
      </Box>

      {/* Search bar */}
      <Box sx={{ px: 1.5, py: 0.75, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Søk i ${currentSource.label}…`}
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }} /></InputAdornment>,
            endAdornment: inputValue ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setInputValue(''); setQuery(''); }} sx={{ p: 0.2, color: 'rgba(255,255,255,0.4)' }}>
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.35)' },
              '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
          }}
        />
      </Box>

      {/* Needs key warning */}
      {needsKey && (
        <Alert
          severity="warning"
          sx={{ mx: 1.5, mt: 1, py: 0.5, fontSize: 11, bgcolor: 'rgba(255,160,0,0.1)', color: '#ffcc44', border: '1px solid rgba(255,160,0,0.2)' }}
        >
          Legg til <strong>{currentSource.key === 'sketchfab' ? 'SKETCHFAB_API_TOKEN' : 'POLYPIZZA_API_KEY'}</strong> som miljøhemmeligat for å aktivere dette kilden.
        </Alert>
      )}

      {/* Results grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, gap: 1.5 }}>
            <CircularProgress size={28} sx={{ color: '#00d4ff' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              Henter fra {currentSource.label}…
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ fontSize: 12, bgcolor: 'rgba(255,0,0,0.08)', color: '#ff8080', border: '1px solid rgba(255,0,0,0.2)' }}>
            {error}
          </Alert>
        )}

        {!loading && !error && results.length === 0 && (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <ModelIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              Ingen resultater
            </Typography>
          </Box>
        )}

        {!loading && results.length > 0 && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isFullscreen
              ? 'repeat(auto-fill, minmax(160px, 1fr))'
              : 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 1,
          }}>
            {results.map(asset => (
              <AssetCard
                key={`${asset.source}-${asset.id}`}
                asset={asset}
                onAddToScene={handleAddToScene}
                isAdding={addingId === asset.id}
              />
            ))}
          </Box>
        )}

        {!loading && results.length > 0 && (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
            {results.length} resultater · {currentSource.label}
          </Typography>
        )}
      </Box>

      {/* Footer attribution */}
      <Box sx={{
        px: 1.5, py: 0.75,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0,
      }}>
        {[
          { label: 'Poly Haven', url: 'https://polyhaven.com', color: '#f6a623' },
          { label: 'ambientCG', url: 'https://ambientcg.com', color: '#88aaff' },
          { label: 'Sketchfab', url: 'https://sketchfab.com', color: '#1caad9' },
          { label: 'Poly Pizza', url: 'https://poly.pizza', color: '#ff7043' },
        ].map(s => (
          <Box
            key={s.label}
            component="a"
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: 9, color: s.color, opacity: 0.6, textDecoration: 'none', '&:hover': { opacity: 1 } }}
          >
            {s.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

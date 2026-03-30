/**
 * GelPickerPanel — Profesjonell fargefilter/gel-velger
 * Viser alle geler fra gelDefinitions organisert i kategorier med søk,
 * forhåndsvisning og applikasjon til valgt lys via vs-apply-gel hendelse.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from '@mui/material';
import {
  Search,
  FilterVintage,
  WbSunny,
  AcUnit,
  Blur,
  AutoAwesome,
  Close,
  CheckCircle,
  Palette,
} from '@mui/icons-material';
import {
  GEL_LIBRARY,
  GelDefinition,
  GelCategory,
  getGelsByCategory,
} from '../data/gelDefinitions';

// ─── Category metadata ────────────────────────────────────────────────────────

interface CategoryMeta {
  key: GelCategory | 'all';
  labelNo: string;
  icon: React.ReactNode;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'all',       labelNo: 'Alle',      icon: <Palette fontSize="small" />,        description: 'Alle tilgjengelige geler' },
  { key: 'color',     labelNo: 'Farge',     icon: <FilterVintage fontSize="small" />,  description: 'Fargestyrte geler for kreative effekter' },
  { key: 'cto',       labelNo: 'CTO Varm',  icon: <WbSunny fontSize="small" />,        description: 'Color Temperature Orange — gjør lyset varmere' },
  { key: 'ctb',       labelNo: 'CTB Kjøl',  icon: <AcUnit fontSize="small" />,         description: 'Color Temperature Blue — gjør lyset kjøligere' },
  { key: 'diffusion', labelNo: 'Diffusjon', icon: <Blur fontSize="small" />,           description: 'Myker opp og sprer lyset' },
  { key: 'special',   labelNo: 'Spesial',   icon: <AutoAwesome fontSize="small" />,    description: 'Spesialeffekter og unike looks' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
}

// ─── Gel Swatch ───────────────────────────────────────────────────────────────

interface GelSwatchProps {
  gel: GelDefinition;
  isSelected: boolean;
  isApplied: boolean;
  onSelect: (gel: GelDefinition) => void;
}

function GelSwatch({ gel, isSelected, isApplied, onSelect }: GelSwatchProps) {
  const fg = contrastColor(gel.hex);

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight={600}>{gel.nameNo}</Typography>
          <Typography variant="caption" color="text.secondary">{gel.filterNumber} · {gel.brand}</Typography>
          <Typography variant="caption" display="block" mt={0.5}>{gel.descriptionNo}</Typography>
          {gel.stopLoss !== undefined && (
            <Typography variant="caption" display="block">Lystap: {gel.stopLoss} f-stopp</Typography>
          )}
          {gel.cctShift !== undefined && (
            <Typography variant="caption" display="block">CCT: {gel.cctShift > 0 ? '+' : ''}{gel.cctShift} K</Typography>
          )}
        </Box>
      }
      placement="top"
      arrow
    >
      <Box
        onClick={() => onSelect(gel)}
        sx={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: 1.5,
          backgroundColor: gel.hex,
          cursor: 'pointer',
          border: isSelected
            ? `2px solid #fff`
            : `2px solid ${isApplied ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isSelected
            ? `0 0 0 2px rgba(156,39,176,0.8), 0 4px 12px rgba(0,0,0,0.4)`
            : `0 2px 6px rgba(0,0,0,0.3)`,
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          overflow: 'hidden',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: `0 4px 16px rgba(0,0,0,0.5)`,
            zIndex: 1,
          },
        }}
      >
        {isApplied && (
          <CheckCircle
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              fontSize: 14,
              color: fg,
              opacity: 0.9,
            }}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '0.55rem',
            color: fg,
            lineHeight: 1.2,
            px: 0.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {gel.filterNumber}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function GelPickerPanel() {
  const [activeCategory, setActiveCategory] = useState<GelCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGel, setSelectedGel] = useState<GelDefinition | null>(null);
  const [appliedGels, setAppliedGels] = useState<Map<string, string>>(new Map()); // lightId → gelId
  const [blendMode, setBlendMode] = useState<'replace' | 'multiply'>('replace');

  // ── Filtered gel list ───────────────────────────────────────────────────────
  const filteredGels = useMemo(() => {
    let pool = activeCategory === 'all' ? GEL_LIBRARY : getGelsByCategory(activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(
        g =>
          g.nameNo.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          g.filterNumber.includes(q) ||
          g.brand.toLowerCase().includes(q) ||
          g.tags.some(t => t.includes(q)),
      );
    }
    return pool;
  }, [activeCategory, searchQuery]);

  // ── Apply gel ───────────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!selectedGel) return;

    window.dispatchEvent(
      new CustomEvent('vs-apply-gel', {
        detail: {
          hex: selectedGel.hex,
          gelId: selectedGel.id,
          gelName: selectedGel.nameNo,
          blendMode,
        },
      }),
    );

    const next = new Map(appliedGels);
    next.set('all', selectedGel.id);
    setAppliedGels(next);
  }, [selectedGel, blendMode, appliedGels]);

  // ── Remove gel ──────────────────────────────────────────────────────────────
  const handleRemove = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vs-remove-gel', { detail: {} }));
    setAppliedGels(new Map());
    setSelectedGel(null);
  }, []);

  // ── Handle select ───────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (gel: GelDefinition) => {
      setSelectedGel(prev => (prev?.id === gel.id ? null : gel));
    },
    [],
  );

  const currentAppliedGelId = appliedGels.get('all') ?? null;
  const currentAppliedGel = currentAppliedGelId
    ? GEL_LIBRARY.find(g => g.id === currentAppliedGelId)
    : null;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        color: '#e8e8f0',
        userSelect: 'none',
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, letterSpacing: '0.05em', color: '#b39ddb', mb: 0.5 }}
        >
          FARGEFILTER / GEL
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {GEL_LIBRARY.length} profesjonelle geler fra Rosco &amp; Lee
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ── Current gel indicator ── */}
      {currentAppliedGel && (
        <Box
          sx={{
            mx: 2,
            mt: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(156,39,176,0.12)',
            border: '1px solid rgba(156,39,176,0.3)',
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 0.75,
              bgcolor: currentAppliedGel.hex,
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" display="block" fontWeight={600} noWrap>
              {currentAppliedGel.nameNo}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
              {currentAppliedGel.filterNumber} · {currentAppliedGel.brand}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleRemove}
            sx={{ color: 'rgba(255,255,255,0.5)', p: 0.3 }}
            title="Fjern gel"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* ── Search ── */}
      <Box sx={{ px: 2, pt: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Søk gel, filter, farge…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'rgba(255,255,255,0.04)',
              borderRadius: 1.5,
              fontSize: '0.78rem',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.08)',
            },
          }}
        />
      </Box>

      {/* ── Category tabs ── */}
      <Tabs
        value={activeCategory}
        onChange={(_, v) => setActiveCategory(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          px: 1,
          '& .MuiTab-root': {
            minHeight: 36,
            py: 0.5,
            px: 1,
            fontSize: '0.68rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.45)',
            '&.Mui-selected': { color: '#b39ddb' },
            minWidth: 'unset',
          },
          '& .MuiTabs-indicator': { backgroundColor: '#b39ddb', height: 2 },
        }}
      >
        {CATEGORIES.map(cat => (
          <Tab
            key={cat.key}
            value={cat.key}
            label={cat.labelNo}
            icon={cat.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ── Gel grid ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
        }}
      >
        {filteredGels.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 4 }}
          >
            Ingen geler matcher søket
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {filteredGels.map(gel => (
              <GelSwatch
                key={gel.id}
                gel={gel}
                isSelected={selectedGel?.id === gel.id}
                isApplied={currentAppliedGelId === gel.id}
                onSelect={handleSelect}
              />
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ── Selected gel details ── */}
      {selectedGel && (
        <Box
          sx={{
            mx: 2,
            my: 1,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: selectedGel.hex,
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {selectedGel.nameNo}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {selectedGel.filterNumber} · {selectedGel.brand}
              {selectedGel.stopLoss !== undefined && ` · ${selectedGel.stopLoss} f-stopp tap`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3 }} display="block">
              {selectedGel.descriptionNo}
            </Typography>
            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {selectedGel.tags.slice(0, 4).map(t => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: 'rgba(156,39,176,0.2)',
                    color: '#ce93d8',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Blend mode + apply ── */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ToggleButtonGroup
          value={blendMode}
          exclusive
          onChange={(_, v) => v && setBlendMode(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontSize: '0.65rem',
              px: 1,
              py: 0.4,
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.1)',
              textTransform: 'none',
              '&.Mui-selected': {
                bgcolor: 'rgba(156,39,176,0.25)',
                color: '#ce93d8',
                borderColor: 'rgba(156,39,176,0.4)',
              },
            },
          }}
        >
          <ToggleButton value="replace">Erstatt</ToggleButton>
          <ToggleButton value="multiply">Multipliser</ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          size="small"
          disabled={!selectedGel}
          onClick={handleApply}
          sx={{
            flex: 1,
            fontSize: '0.75rem',
            fontWeight: 700,
            bgcolor: selectedGel ? selectedGel.hex : 'rgba(156,39,176,0.3)',
            color: selectedGel ? contrastColor(selectedGel.hex) : 'rgba(255,255,255,0.5)',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: selectedGel ? selectedGel.hex : undefined,
              opacity: 0.85,
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              bgcolor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.25)',
            },
          }}
        >
          {selectedGel ? `Bruk ${selectedGel.nameNo}` : 'Velg en gel'}
        </Button>
      </Box>
    </Box>
  );
}

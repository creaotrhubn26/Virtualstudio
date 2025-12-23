import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  InputBase,
  Divider,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlaceIcon from '@mui/icons-material/Place';
import AddIcon from '@mui/icons-material/Add';
import { assetLibraryService, type AssetLibraryItem } from '../core/services/assetLibrary';
import { logger } from '../core/services/logger';

const log = logger.module('AssetLibraryPanel');

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Alle', icon: '📦' },
  { key: 'accessory', label: 'Tilbehør', icon: '🔧' },
  { key: 'prop', label: 'Rekvisitter', icon: '🎭' },
  { key: 'furniture', label: 'Møbler', icon: '🪑' },
];

const CATEGORY_ICONS: Record<string, string> = {
  accessory: '🔧',
  prop: '🎭',
  furniture: '🪑',
};

interface AssetCardProps {
  asset: AssetLibraryItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPlaceManually?: (asset: AssetLibraryItem) => void;
  isTablet?: boolean;
}

function AssetCard({ asset, isFavorite, onToggleFavorite, onPlaceManually, isTablet = false }: AssetCardProps) {
  const handleAddToScene = () => {
    const event = new CustomEvent('ch-add-asset', {
      detail: {
        asset: {
          id: asset.id,
          title: asset.name,
          type: 'model',
          thumbUrl: asset.thumbnail_url || '/library/generic.png',
          data: {
            modelUrl: asset.model_url,
            metadata: asset.metadata,
          },
        },
      },
    });
    window.dispatchEvent(event);
    assetLibraryService.trackUsage(asset.id);
  };

  const handleDoubleClick = () => {
    if (!isTablet) {
      handleAddToScene();
    }
  };

  const handlePlaceManually = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlaceManually) {
      onPlaceManually(asset);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        asset: {
          id: asset.id,
          title: asset.name,
          type: 'model',
          thumbUrl: asset.thumbnail_url,
          data: { modelUrl: asset.model_url, metadata: asset.metadata },
        },
      })
    );
  };

  return (
    <Box
      onDoubleClick={handleDoubleClick}
      draggable={!isTablet}
      onDragStart={handleDragStart}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        border: '1px solid #333',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#252525',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          borderColor: '#8b5cf6',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2a2a2a',
          fontSize: 40,
        }}
      >
        {CATEGORY_ICONS[asset.category] || '📦'}
      </Box>

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(asset.id);
        }}
        aria-label={isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.5)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          minWidth: 44,
          minHeight: 44,
          padding: 1,
        }}
      >
        {isFavorite ? (
          <StarIcon sx={{ fontSize: 20, color: '#FCD34D' }} />
        ) : (
          <StarBorderIcon sx={{ fontSize: 20, color: '#888' }} />
        )}
      </IconButton>

      <Box sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography
          variant="body2"
          sx={{
            display: 'block',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            mb: 1,
          }}
        >
          {asset.name}
        </Typography>

        <Button
          size="medium"
          variant="contained"
          fullWidth
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => { e.stopPropagation(); handleAddToScene(); }}
          aria-label={`Legg til ${asset.name}`}
          sx={{
            minHeight: 44,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: '8px',
            bgcolor: '#8b5cf6',
            color: '#fff',
            textTransform: 'none',
            '&:hover': { bgcolor: '#7c3aed' },
          }}
        >
          Legg til
        </Button>

        {onPlaceManually && (
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<PlaceIcon sx={{ fontSize: 14 }} />}
            onClick={handlePlaceManually}
            aria-label={`Plasser ${asset.name} manuelt`}
            sx={{
              mt: 1,
              minHeight: 36,
              fontSize: 11,
              fontWeight: 500,
              borderRadius: '6px',
              borderColor: '#F59E0B',
              color: '#F59E0B',
              textTransform: 'none',
              '&:hover': { 
                bgcolor: '#F59E0B22',
                borderColor: '#F59E0B',
              },
            }}
          >
            Plasser
          </Button>
        )}
      </Box>
    </Box>
  );
}

interface ManualPlacementDialogProps {
  open: boolean;
  asset: AssetLibraryItem | null;
  onClose: () => void;
  onPlace: (position: [number, number, number]) => void;
}

function ManualPlacementDialog({ open, asset, onClose, onPlace }: ManualPlacementDialogProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(1.5);
  const [z, setZ] = useState(0);

  const handlePlace = () => {
    onPlace([x, y, z]);
    onClose();
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Plasser {asset.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Juster posisjonen der du vil plassere denne ressursen i 3D-scenen.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" gutterBottom>
            X Posisjon (Venstre - Høyre): {x.toFixed(2)}m
          </Typography>
          <Slider
            value={x}
            onChange={(_, v) => setX(v as number)}
            min={-5}
            max={5}
            step={0.1}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" gutterBottom>
            Y Posisjon (Ned - Opp): {y.toFixed(2)}m
          </Typography>
          <Slider
            value={y}
            onChange={(_, v) => setY(v as number)}
            min={0}
            max={5}
            step={0.1}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" gutterBottom>
            Z Posisjon (Bak - Foran): {z.toFixed(2)}m
          </Typography>
          <Slider
            value={z}
            onChange={(_, v) => setZ(v as number)}
            min={-5}
            max={5}
            step={0.1}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button onClick={handlePlace} variant="contained" color="primary">
          Plasser Ressurs
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AssetLibraryPanel() {
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<AssetLibraryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetLibraryItem | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const categoryToLoad = category === 'all' ? undefined : category;
      const data = await assetLibraryService.getAssets({
        category: categoryToLoad,
        search: search || undefined,
        limit: 100,
      });
      const filteredData = data.filter(a => 
        a.category !== 'light' && a.category !== 'light_shaper'
      );
      setAssets(filteredData);
    } catch (error) {
      log.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    assetLibraryService.getFavorites().then(setFavorites);
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleToggleFavorite = async (assetId: string) => {
    await assetLibraryService.toggleFavorite(assetId);
    const newFavorites = await assetLibraryService.getFavorites();
    setFavorites(newFavorites);
  };

  const handlePlaceManually = (asset: AssetLibraryItem) => {
    setSelectedAsset(asset);
    setPlacementDialogOpen(true);
  };

  const handlePlaceAsset = (position: [number, number, number]) => {
    if (!selectedAsset) return;

    const event = new CustomEvent('ch-add-asset-at', {
      detail: {
        asset: {
          id: selectedAsset.id,
          title: selectedAsset.name,
          type: 'model',
          thumbUrl: selectedAsset.thumbnail_url || '/library/generic.png',
          data: {
            modelUrl: selectedAsset.model_url,
            metadata: selectedAsset.metadata,
          },
        },
        position,
      },
    });
    window.dispatchEvent(event);
    assetLibraryService.trackUsage(selectedAsset.id);
  };

  const buttonStyle = {
    minHeight: 56,
    minWidth: 100,
    fontSize: 15,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '10px',
    borderWidth: 2,
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    '&:active': {
      transform: 'scale(0.97)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#fff', fontSize: 16 }}>
        Ressursbibliotek
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        {CATEGORIES.map(cat => (
          <Button
            key={cat.key}
            variant={category === cat.key ? 'contained' : 'outlined'}
            onClick={() => setCategory(cat.key)}
            startIcon={<span style={{ fontSize: 18 }}>{cat.icon}</span>}
            sx={{
              ...buttonStyle,
              bgcolor: category === cat.key ? '#8b5cf6' : 'transparent',
              borderColor: category === cat.key ? '#8b5cf6' : '#444',
              color: category === cat.key ? '#fff' : '#aaa',
              boxShadow: category === cat.key ? '0 4px 12px rgba(139, 92, 246, 0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: category === cat.key ? '#7c3aed' : '#333',
                borderColor: category === cat.key ? '#7c3aed' : '#555',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              },
            }}
          >
            {cat.label}
          </Button>
        ))}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: '#2a2a2a', 
          borderRadius: '10px', 
          px: 2, 
          py: 0.5,
          minHeight: 56,
          border: '2px solid #444',
          flex: 1,
          minWidth: 140,
          maxWidth: 220,
        }}>
          <SearchIcon sx={{ color: '#888', fontSize: 22, mr: 1 }} />
          <InputBase
            placeholder="Søk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              color: '#fff',
              fontSize: 15,
              fontWeight: 500,
              flex: 1,
              '& input::placeholder': { color: '#666', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#333' }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ color: '#8b5cf6' }} />
        </Box>
      ) : assets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: '#888' }}>
          <Typography variant="body2" sx={{ color: '#aaa' }}>Ingen ressurser funnet</Typography>
          <Typography variant="caption" sx={{ color: '#666' }}>Prøv et annet søk eller kategori</Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1.5,
          pb: 2,
        }}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isFavorite={favorites.includes(asset.id)}
              onToggleFavorite={handleToggleFavorite}
              onPlaceManually={handlePlaceManually}
              isTablet={isTouchDevice}
            />
          ))}
        </Box>
      )}

      {!loading && assets.length > 0 && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, textAlign: 'center', color: '#666' }}
        >
          {assets.length} ressurser
        </Typography>
      )}

      <ManualPlacementDialog
        open={placementDialogOpen}
        asset={selectedAsset}
        onClose={() => setPlacementDialogOpen(false)}
        onPlace={handlePlaceAsset}
      />
    </Box>
  );
}

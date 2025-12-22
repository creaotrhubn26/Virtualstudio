import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlaceIcon from '@mui/icons-material/Place';
import { assetLibraryService, type AssetLibraryItem } from '../core/services/assetLibrary';
import { logger } from '../core/services/logger';

const log = logger.module('AssetLibraryPanel');

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  light: { label: 'Lys', icon: '💡' },
  light_shaper: { label: 'Lysformere', icon: '📦' },
  accessory: { label: 'Tilbehor', icon: '🔧' },
  prop: { label: 'Rekvisitter', icon: '🎭' },
  furniture: { label: 'Mobler', icon: '🪑' },
};

interface AssetCardProps {
  asset: AssetLibraryItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPlaceManually?: (asset: AssetLibraryItem) => void;
}

function AssetCard({ asset, isFavorite, onToggleFavorite, onPlaceManually }: AssetCardProps) {
  const handleDoubleClick = () => {
    const event = new CustomEvent('ch-add-asset', {
      detail: {
        asset: {
          id: asset.id,
          title: asset.name,
          type: asset.category === 'light' ? 'light' : 'model',
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
          type: asset.category === 'light' ? 'light' : 'model',
          thumbUrl: asset.thumbnail_url,
          data: { modelUrl: asset.model_url, metadata: asset.metadata },
        },
      })
    );
  };

  return (
    <Box
      onDoubleClick={handleDoubleClick}
      draggable
      onDragStart={handleDragStart}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        border: '1px solid #333',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#1a1a1a',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 2,
          borderColor: '#3b82f6',
        },
        transition: 'all 0.2s',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2a2a2a',
          fontSize: 32,
        }}
      >
        {CATEGORIES[asset.category]?.icon || '📦'}
      </Box>

      {asset.is_system && (
        <Chip
          label="System"
          size="small"
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            bgcolor: '#3B82F6',
            color: '#fff',
            fontSize: 9,
            height: 18,
          }}
        />
      )}

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(asset.id);
        }}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.5)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          padding: 0.5,
        }}
      >
        {isFavorite ? (
          <StarIcon sx={{ fontSize: 16, color: '#FCD34D' }} />
        ) : (
          <StarBorderIcon sx={{ fontSize: 16, color: '#888' }} />
        )}
      </IconButton>

      <Box sx={{ p: 1 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 11,
            color: '#fff',
          }}
        >
          {asset.name}
        </Typography>

        {onPlaceManually && (
          <Button
            size="small"
            startIcon={<PlaceIcon sx={{ fontSize: 12 }} />}
            onClick={handlePlaceManually}
            sx={{
              mt: 0.5,
              fontSize: 9,
              py: 0.25,
              width: '100%',
              bgcolor: '#F59E0B',
              color: '#fff',
              '&:hover': { bgcolor: '#D97706' },
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
            X Posisjon (Venstre - Hoyre): {x.toFixed(2)}m
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
  const [category, setCategory] = useState<string>('light');
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<AssetLibraryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetLibraryItem | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetLibraryService.getAssets({
        category,
        search: search || undefined,
        limit: 100,
      });
      setAssets(data);
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
          type: selectedAsset.category === 'light' ? 'light' : 'model',
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

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#fff' }}>
        Ressursbibliotek
      </Typography>

      <Tabs
        value={category}
        onChange={(_, v) => setCategory(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, minHeight: 36 }}
      >
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
          <Tab
            key={key}
            value={key}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{icon}</span>
                <span style={{ fontSize: 11 }}>{label}</span>
              </Box>
            }
            sx={{ minHeight: 36, py: 0.5 }}
          />
        ))}
      </Tabs>

      <TextField
        size="small"
        placeholder="Sok etter ressurser..."
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : assets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography variant="body2">Ingen ressurser funnet</Typography>
          <Typography variant="caption">Prov et annet sok eller kategori</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isFavorite={favorites.includes(asset.id)}
              onToggleFavorite={handleToggleFavorite}
              onPlaceManually={handlePlaceManually}
            />
          ))}
        </Box>
      )}

      {!loading && assets.length > 0 && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'text.secondary' }}
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

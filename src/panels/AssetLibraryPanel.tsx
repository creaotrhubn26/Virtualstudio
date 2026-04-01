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
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlaceIcon from '@mui/icons-material/Place';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import { assetLibraryService, type AssetLibraryItem } from '../core/services/assetLibrary';
import { environmentService } from '../core/services/environmentService';
import { logger } from '../core/services/logger';
import { ASSET_CATEGORY_ICONS, getAssetCategoryIcon, type IconDefinition } from '../core/config/iconDefinitions';

const log = logger.module('AssetLibraryPanel');

const CATEGORIES: { key: string; label: string; icon: IconDefinition }[] = [
  { key: 'all', label: 'Alle', icon: ASSET_CATEGORY_ICONS.all },
  { key: 'accessory', label: 'Tilbehør', icon: ASSET_CATEGORY_ICONS.accessory },
  { key: 'prop', label: 'Rekvisitter', icon: ASSET_CATEGORY_ICONS.prop },
  { key: 'furniture', label: 'Møbler', icon: ASSET_CATEGORY_ICONS.furniture },
  { key: 'modern_studio', label: 'Moderne Studio', icon: ASSET_CATEGORY_ICONS.modern_studio },
  { key: 'wall', label: 'Vegger', icon: ASSET_CATEGORY_ICONS.wall },
  { key: 'floor', label: 'Gulv', icon: ASSET_CATEGORY_ICONS.floor },
];

const CATEGORY_ICONS: Record<string, IconDefinition> = {
  accessory: ASSET_CATEGORY_ICONS.accessory,
  prop: ASSET_CATEGORY_ICONS.prop,
  furniture: ASSET_CATEGORY_ICONS.furniture,
  modern_studio: ASSET_CATEGORY_ICONS.modern_studio,
  wall: ASSET_CATEGORY_ICONS.wall,
  floor: ASSET_CATEGORY_ICONS.floor,
  all: ASSET_CATEGORY_ICONS.all,
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
    // Handle wall and floor assets specially
    if (asset.category === 'wall') {
      // Extract material ID from asset ID (format: "wall-{materialId}")
      const materialId = asset.id.replace(/^wall-/, '');
      const wallId = String(asset.metadata?.wallId ?? 'backWall');
      
      // Use environmentService to set wall material
      environmentService.setWallMaterial(wallId, materialId);
    } else if (asset.category === 'floor') {
      // Extract material ID from asset ID (format: "floor-{materialId}")
      const materialId = asset.id.replace(/^floor-/, '');
      
      // Use environmentService to set floor material
      environmentService.setFloorMaterial(materialId);
    } else {
      // Regular assets
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
    }
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
          borderColor: '#3498db',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: isTablet ? 140 : 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: getAssetCategoryIcon(asset.category).backgroundColor,
          backgroundImage: `url("${getAssetCategoryIcon(asset.category).svg}")`,
          backgroundSize: isTablet ? '80px 80px' : '60px 60px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />

      <IconButton
        size={isTablet ? 'medium' : 'small'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(asset.id);
        }}
        aria-label={isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
        sx={{
          position: 'absolute',
          top: isTablet ? 8 : 4,
          right: isTablet ? 8 : 4,
          bgcolor: 'rgba(0,0,0,0.7)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
          minWidth: isTablet ? 52 : 44,
          minHeight: isTablet ? 52 : 44,
          padding: isTablet ? 1.5 : 1,
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.9)'
          }
        }}
      >
        {isFavorite ? (
          <StarIcon sx={{ fontSize: isTablet ? 24 : 20, color: '#FCD34D' }} />
        ) : (
          <StarBorderIcon sx={{ fontSize: isTablet ? 24 : 20, color: '#888' }} />
        )}
      </IconButton>

      <Box sx={{ p: isTablet ? 2 : 1.5, '&:last-child': { pb: isTablet ? 2 : 1.5 } }}>
        <Typography
          variant="body2"
          sx={{
            display: 'block',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: isTablet ? '1rem' : 12,
            fontWeight: 600,
            color: '#fff',
            mb: isTablet ? 1.5 : 1,
            lineHeight: 1.4,
          }}
        >
          {asset.name}
        </Typography>

        <Button
          size={isTablet ? 'large' : 'medium'}
          variant="contained"
          fullWidth
          startIcon={<AddIcon sx={{ fontSize: isTablet ? 20 : 16 }} />}
          onClick={(e) => { e.stopPropagation(); handleAddToScene(); }}
          aria-label={`Legg til ${asset.name}`}
          sx={{
            minHeight: isTablet ? 52 : 44,
            fontSize: isTablet ? '1rem' : 12,
            fontWeight: 600,
            borderRadius: '10px',
            bgcolor: '#3498db',
            color: '#fff',
            textTransform: 'none',
            transition: 'all 0.2s ease',
            '&:hover': { 
              bgcolor: '#2980b9',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(52,152,219,0.4)'
            },
            '&:active': {
              transform: 'scale(0.97)'
            },
            '@media (hover: none) and (pointer: coarse)': {
              '&:active': {
                transform: 'scale(0.95)',
                bgcolor: '#2980b9'
              }
            }
          }}
        >
          Legg til
        </Button>

        {onPlaceManually && (
          <Button
            size={isTablet ? 'medium' : 'small'}
            variant="outlined"
            fullWidth
            startIcon={<PlaceIcon sx={{ fontSize: isTablet ? 18 : 14 }} />}
            onClick={handlePlaceManually}
            aria-label={`Plasser ${asset.name} manuelt`}
            sx={{
              mt: isTablet ? 1.5 : 1,
              minHeight: isTablet ? 48 : 36,
              fontSize: isTablet ? '0.9375rem' : 11,
              fontWeight: 500,
              borderRadius: '8px',
              borderColor: '#F59E0B',
              borderWidth: 2,
              color: '#F59E0B',
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&:hover': { 
                bgcolor: '#F59E0B22',
                borderColor: '#F59E0B',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'scale(0.97)'
              },
              '@media (hover: none) and (pointer: coarse)': {
                '&:active': {
                  transform: 'scale(0.95)',
                  bgcolor: '#F59E0B33'
                }
              }
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
  const theme = useTheme();
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPadFriendly = isTablet || isTouchDevice;

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
      let filteredData = data.filter(a => 
        a.category !== 'light' && a.category !== 'light_shaper'
      );
      
      // Filtrer på kategori hvis ikke 'all'
      if (category !== 'all') {
        filteredData = filteredData.filter(a => a.category === category);
      }
      
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

    // Handle wall and floor assets specially
    if (selectedAsset.category === 'wall') {
      // Extract material ID from asset ID (format: "wall-{materialId}")
      const materialId = selectedAsset.id.replace(/^wall-/, '');
      const wallId = String(selectedAsset.metadata?.wallId ?? 'backWall');
      
      // Use environmentService to set wall material
      environmentService.setWallMaterial(wallId, materialId);
    } else if (selectedAsset.category === 'floor') {
      // Extract material ID from asset ID (format: "floor-{materialId}")
      const materialId = selectedAsset.id.replace(/^floor-/, '');
      
      // Use environmentService to set floor material
      environmentService.setFloorMaterial(materialId);
    } else {
      // Regular assets
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
    }
    
    assetLibraryService.trackUsage(selectedAsset.id);
  };

  const buttonStyle = {
    minHeight: isIPadFriendly ? 56 : 48,
    minWidth: isIPadFriendly ? 120 : 100,
    fontSize: isIPadFriendly ? '1rem' : 15,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '12px',
    borderWidth: 2,
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    padding: isIPadFriendly ? '14px 20px' : '12px 16px',
    '&:active': {
      transform: 'scale(0.97)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    '@media (hover: none) and (pointer: coarse)': {
      '&:active': {
        transform: 'scale(0.95)',
      }
    }
  };

  const padding = isIPadFriendly ? 3 : 2;
  const spacing = isIPadFriendly ? 2 : 1.5;
  const headerIconSize = isIPadFriendly ? 52 : 42;
  const headerFontSize = isIPadFriendly ? '1.5rem' : 20;
  const subHeaderFontSize = isIPadFriendly ? '0.9375rem' : 12;
  const searchHeight = isIPadFriendly ? 56 : 48;
  const searchFontSize = isIPadFriendly ? '1rem' : 15;
  const gridMinWidth = isIPadFriendly ? 180 : 140;
  const gridGap = isIPadFriendly ? 2 : 1.5;

  return (
    <Box sx={{ p: padding, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing,
        background: 'linear-gradient(135deg, rgba(52,152,219,0.15) 0%, rgba(41,128,185,0.15) 100%)',
        borderRadius: '16px',
        px: isIPadFriendly ? 3 : 2.5,
        py: isIPadFriendly ? 2 : 1.5,
        mb: spacing,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: headerIconSize,
          height: headerIconSize,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
          boxShadow: '0 4px 12px rgba(52,152,219,0.4)',
        }}>
          <FolderIcon sx={{ fontSize: isIPadFriendly ? 28 : 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ 
            fontWeight: 800, 
            fontSize: headerFontSize,
            background: 'linear-gradient(90deg, #85c1e9 0%, #5dade2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
            lineHeight: 1.3,
          }}>
            Eiendeler
          </Typography>
          <Typography sx={{ 
            fontSize: subHeaderFontSize, 
            color: '#888',
            fontWeight: 500,
            lineHeight: 1.4,
          }}>
            3D-modeller og tilbehør
          </Typography>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: spacing, 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        mb: spacing 
      }}>
        {CATEGORIES.map(cat => (
          <Button
            key={cat.key}
            variant={category === cat.key ? 'contained' : 'outlined'}
            onClick={() => setCategory(cat.key)}
            startIcon={
              <Box
                sx={{
                  width: isIPadFriendly ? 22 : 18,
                  height: isIPadFriendly ? 22 : 18,
                  backgroundColor: cat.icon.backgroundColor,
                  backgroundImage: `url("${cat.icon.svg}")`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  borderRadius: '4px',
                }}
              />
            }
            sx={{
              ...buttonStyle,
              bgcolor: category === cat.key ? '#3498db' : 'transparent',
              borderColor: category === cat.key ? '#3498db' : '#444',
              color: category === cat.key ? '#fff' : '#aaa',
              boxShadow: category === cat.key ? '0 4px 12px rgba(52,152,219,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: category === cat.key ? '#2980b9' : '#333',
                borderColor: category === cat.key ? '#2980b9' : '#555',
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
          borderRadius: '12px', 
          px: isIPadFriendly ? 2.5 : 2, 
          py: isIPadFriendly ? 1 : 0.5,
          minHeight: searchHeight,
          border: '2px solid #444',
          flex: 1,
          minWidth: isIPadFriendly ? 180 : 140,
          maxWidth: isIPadFriendly ? 280 : 220,
        }}>
          <SearchIcon sx={{ color: '#888', fontSize: isIPadFriendly ? 26 : 22, mr: 1.5 }} />
          <InputBase
            placeholder="Søk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              color: '#fff',
              fontSize: searchFontSize,
              fontWeight: 500,
              flex: 1,
              '& input': {
                padding: isIPadFriendly ? '12px 8px' : '8px 4px',
              },
              '& input::placeholder': { 
                color: '#666', 
                opacity: 1,
                fontSize: searchFontSize,
              },
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#333' }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ color: '#3498db' }} />
        </Box>
      ) : assets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: '#888' }}>
          <Typography variant="body2" sx={{ color: '#aaa' }}>Ingen ressurser funnet</Typography>
          <Typography variant="caption" sx={{ color: '#666' }}>Prøv et annet søk eller kategori</Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile 
            ? 'repeat(auto-fill, minmax(140px, 1fr))' 
            : isTablet 
              ? 'repeat(auto-fill, minmax(180px, 1fr))'
              : 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: gridGap,
          pb: spacing,
        }}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isFavorite={favorites.includes(asset.id)}
              onToggleFavorite={handleToggleFavorite}
              onPlaceManually={handlePlaceManually}
              isTablet={isIPadFriendly}
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

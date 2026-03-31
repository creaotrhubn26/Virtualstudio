import * as React from 'react';
import {
  Box,
  Stack,
  TextField,
  InputAdornment,
  Typography,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import {
  listMergedLibrary,
  searchMergedLibrary,
  type AssetType,
  type LibraryAsset,
} from '@/core/services/library';
import { getUserAssets, saveUserAsset } from '@/core/services/userLibrary';
import Rodin3DGeneratorDialog from '@/components/Rodin3DGeneratorDialog';
import { GLBGeneratorDialog } from '@/components/GLBGeneratorDialog';
import { scanAndAddAllModels } from '@/scripts/scanAndAddHyper3DModels';

function useLibrary(type: AssetType) {
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<LibraryAsset[]>([]);
  const refresh = React.useCallback(async () => {
    const query = q.trim();
    const [systemAssets, userAssets] = await Promise.all([
      query ? searchMergedLibrary(type, query) : listMergedLibrary(type),
      getUserAssets(type),
    ]);

    const normalizedQuery = query.toLowerCase();
    const filteredUserAssets = normalizedQuery
      ? userAssets.filter((asset) =>
          asset.title.toLowerCase().includes(normalizedQuery) ||
          asset.id.toLowerCase().includes(normalizedQuery),
        )
      : userAssets;

    setItems([...filteredUserAssets, ...systemAssets]);
  }, [type, q]);
  React.useEffect(() => {
    refresh();
  }, [refresh]);
  return { q, setQ, items, refresh };
}

function Card({ a, isTablet = false }: { a: LibraryAsset; isTablet?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const isUser = a.id.startsWith('user_,');
  const onMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const onDoubleClick = () => {
    const ev = new CustomEvent('ch-add-asset', { detail: { asset: a } });
    window.dispatchEvent(ev as any);
  };
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ asset: a }));
  };
  
  // iPad-friendly sizes
  const cardHeight = isTablet ? 180 : 120;
  const menuButtonSize = isTablet ? 44 : 20;
  const menuButtonFontSize = isTablet ? 20 : 12;
  const titleFontSize = isTablet ? '1rem' : 12;
  const typeFontSize = isTablet ? '0.875rem' : 10;
  const padding = isTablet ? 1.5 : 1;
  
  return (
    <Box
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={onDragStart}
      sx={{
        cursor: 'pointer',
        border: '2px solid #2a2a2a',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#2a2a2a',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        '&:hover': {
          borderColor: '#6a6a6a',
          bgcolor: '#3a3a3a',
          transform: isTablet ? 'translateY(-2px) scale(1.01)' : 'translateY(-3px) scale(1.02)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
          zIndex: 1
        },
        '&:active': {
          transform: 'translateY(0) scale(0.99)',
          boxShadow: '0 3px 8px rgba(0,0,0,0.4)'
        },
        // Better touch feedback for iPad
        '@media (hover: none) and (pointer: coarse)': {
          '&:active': {
            transform: 'scale(0.97)',
            bgcolor: '#4a4a4a',
          }
        }
      }}
    >
      <img
        src={a.thumbUrl || '/library/generic.png'}
        alt={a.title}
        style={{ width: '100%', height: cardHeight, objectFit: 'cover', display: 'block' }}
      />
      {isUser ? (
        <Box
          onClick={onMenu}
          sx={{
            position: 'absolute',
            right: isTablet ? 8 : 6,
            top: isTablet ? 8 : 6,
            width: menuButtonSize,
            height: menuButtonSize,
            minWidth: menuButtonSize,
            minHeight: menuButtonSize,
            borderRadius: '50%',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: menuButtonFontSize,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.9)',
              transform: 'scale(1.1)'
            },
            '&:active': {
              transform: 'scale(0.95)',
              bgcolor: 'rgba(0,0,0,1)'
            }
          }}
        >
          ⋯
        </Box>
      ) : null}
      {open && isUser ? (
        <Box
          sx={{
            position: 'absolute',
            right: isTablet ? 8 : 6,
            top: isTablet ? 56 : 30,
            bgcolor: '#fff',
            border: '2px solid #e2e8f0',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
        >
          <Box
            component="button"
            onClick={() => {
              const title = prompt('Rename asset', a.title) || a.title;
              window.dispatchEvent(
                new CustomEvent('ch-user-asset-rename', { detail: { id: a.id, title } }) as any,
              );
              setOpen(false);
            }}
            sx={{
              display: 'block',
              padding: isTablet ? 2 : 1.5,
              minHeight: isTablet ? 52 : 40,
              width: isTablet ? 160 : 120,
              background: '#fff',
              border: 0,
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: isTablet ? '1rem' : '0.875rem',
              fontWeight: 500,
              transition: 'background 0.2s ease',
              '&:hover': {
                background: '#f5f5f5'
              },
              '&:active': {
                background: '#e5e5e5'
              }
            }}
          >
            Rename
          </Box>
          <Box
            component="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('ch-user-asset-delete', { detail: { id: a.id } }) as any,
              );
              setOpen(false);
            }}
            sx={{
              display: 'block',
              padding: isTablet ? 2 : 1.5,
              minHeight: isTablet ? 52 : 40,
              width: isTablet ? 160 : 120,
              background: '#fff',
              border: 0,
              textAlign: 'left',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: isTablet ? '1rem' : '0.875rem',
              fontWeight: 500,
              transition: 'background 0.2s ease',
              '&:hover': {
                background: '#fee2e2'
              },
              '&:active': {
                background: '#fecaca'
              }
            }}
          >
            Delete
          </Box>
        </Box>
      ) : null}
      <Box sx={{ p: padding, bgcolor: '#2a2a2a' }}>
        <Typography fontWeight={600} variant="body2" sx={{ color: '#ffffff', fontSize: titleFontSize, lineHeight: 1.4 }}>
          {a.title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#888888', fontSize: typeFontSize, lineHeight: 1.5 }}>
          {a.type}
        </Typography>
      </Box>
    </Box>
  );
}

export default function LibraryPanel() {
  const theme = useTheme();
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTouch = useMediaQuery('(pointer: coarse)');
  
  // Use tablet/mobile detection for iPad-friendly sizing
  const isIPadFriendly = isTablet || isTouch;
  
  const [tab, setTab] = React.useState<AssetType>('model');
  const { q, setQ, items, refresh } = useLibrary(tab);
  const [scanning, setScanning] = React.useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [glbDialogOpen, setGlbDialogOpen] = React.useState(false);
  
  // Responsive values for iPad
  const buttonHeight = isIPadFriendly ? 52 : 32;
  const buttonFontSize = isIPadFriendly ? '1rem' : 11;
  const tabHeight = isIPadFriendly ? 56 : 48;
  const tabFontSize = isIPadFriendly ? '1rem' : 12;
  const inputHeight = isIPadFriendly ? 52 : 40;
  const inputFontSize = isIPadFriendly ? '1rem' : 14;
  const padding = isIPadFriendly ? 2 : 1;
  const spacing = isIPadFriendly ? 2 : 1;
  const gridColumns = isMobile ? 2 : (isTablet ? 3 : 2);

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const title = f.name.replace(/\.[^/.]+$/, '');
      await saveUserAsset({
        type: tab,
        title,
        thumbDataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      await refresh();
    };
    reader.readAsDataURL(f);
  };

  const scanForHyper3DModels = async () => {
    setScanning(true);
    try {
      const results = await scanAndAddAllModels();
      console.log('Scan results:', results);
      alert(`Scan complete!\nAdded: ${results.added}\nSkipped: ${results.skipped}\nFailed: ${results.failed}\nNot found: ${results.notFound}`);
      await refresh();
    } catch (error) {
      console.error('Failed to scan for Hyper3D models:', error);
      alert(`Failed to scan for Hyper3D models: ${error instanceof Error ? error.message : String(error)}\n\nCheck console for details.`);
    } finally {
      setScanning(false);
    }
  };

  const handleModelGenerated = async (modelUrl: string, modelName: string, category?: string) => {
    await saveUserAsset({
      type: 'model',
      title: modelName,
      data: { 
        modelUrl: modelUrl,
        category: category || 'misc',
      },
    });
    await refresh();
  };

  const handleGlbGenerated = async (modelUrl: string, modelName: string) => {
    await saveUserAsset({
      type: 'model',
      title: modelName,
      data: { modelUrl, category: 'generated' },
    });
    await refresh();
  };

  const headerIconSize = isIPadFriendly ? 52 : 42;
  const headerFontSize = isIPadFriendly ? '1.5rem' : 20;
  const subHeaderFontSize = isIPadFriendly ? '0.9375rem' : 12;

  return (
    <Box sx={{ p: padding, bgcolor: '#1a1a1a', minHeight: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(124,58,237,0.15) 100%)',
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
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
          position: 'relative',
        }}>
          <AccessibilityNewIcon sx={{ fontSize: isIPadFriendly ? 28 : 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ 
            fontWeight: 800, 
            fontSize: headerFontSize,
            background: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
            lineHeight: 1.3,
          }}>
            Modeller
          </Typography>
          <Typography sx={{ 
            fontSize: subHeaderFontSize, 
            color: '#888',
            fontWeight: 500,
            lineHeight: 1.4,
          }}>
            3D-modeller og ressurser
          </Typography>
        </Box>
      </Box>

      <Stack 
        direction={isMobile ? 'column' : 'row'} 
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'} 
        spacing={isMobile ? 1.5 : 0}
        sx={{ mb: spacing }}
      >
        <Stack 
          direction={isMobile ? 'column' : 'row'} 
          spacing={spacing}
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Tooltip title="Generer ny 3D-modell med AI">
            <Button
              size={isIPadFriendly ? 'medium' : 'small'}
              variant="contained"
              startIcon={<ViewInArIcon fontSize={isIPadFriendly ? 'medium' : 'small'} />}
              onClick={() => setGenerateDialogOpen(true)}
              sx={{
                textTransform: 'none',
                fontSize: buttonFontSize,
                minHeight: buttonHeight,
                bgcolor: '#8b5cf6',
                color: '#ffffff',
                px: isIPadFriendly ? 3 : 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#7c3aed',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(139,92,246,0.4)'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                '@media (hover: none) and (pointer: coarse)': {
                  '&:active': {
                    transform: 'scale(0.95)',
                    bgcolor: '#6d28d9'
                  }
                }
              }}
            >
              Generer 3D
            </Button>
          </Tooltip>
          <Tooltip title="Generer GLB fra bilde (TripoSR)">
            <Button
              size={isIPadFriendly ? 'medium' : 'small'}
              variant="outlined"
              startIcon={<ViewInArIcon fontSize={isIPadFriendly ? 'medium' : 'small'} />}
              onClick={() => setGlbDialogOpen(true)}
              sx={{
                textTransform: 'none',
                fontSize: buttonFontSize,
                minHeight: buttonHeight,
                borderColor: '#06b6d4',
                color: '#06b6d4',
                px: isIPadFriendly ? 3 : 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#0891b2',
                  color: '#0891b2',
                  bgcolor: 'rgba(6,182,212,0.08)',
                },
              }}
            >
              Bilde → 3D
            </Button>
          </Tooltip>
          <Tooltip title="Scan and add Hyper3D models to library">
            <Button
              size={isIPadFriendly ? 'medium' : 'small'}
              variant="outlined"
              startIcon={<AutoAwesomeIcon fontSize={isIPadFriendly ? 'medium' : 'small'} />}
              onClick={scanForHyper3DModels}
              disabled={scanning}
              sx={{
                textTransform: 'none',
                fontSize: buttonFontSize,
                minHeight: buttonHeight,
                borderColor: '#3a3a3a',
                borderWidth: 2,
                color: '#ffffff',
                px: isIPadFriendly ? 3 : 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#5a5a5a',
                  bgcolor: '#2a2a2a',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                '&:disabled': {
                  opacity: 0.5
                },
                '@media (hover: none) and (pointer: coarse)': {
                  '&:active': {
                    transform: 'scale(0.95)',
                    bgcolor: '#333333'
                  }
                }
              }}
            >
              {scanning ? 'Scanning...' : 'Add Hyper3D'}
            </Button>
          </Tooltip>
          <input
            ref={fileRef}
            onChange={upload}
            type="file"
            accept="image/*,.glb,.gltf"
            style={{ display: 'none' }}
          />
          <Button
            size={isIPadFriendly ? 'medium' : 'small'}
            variant="outlined"
            onClick={() => fileRef.current?.click()}
            sx={{
              textTransform: 'none',
              fontSize: buttonFontSize,
              minHeight: buttonHeight,
              borderColor: '#3a3a3a',
              borderWidth: 2,
              color: '#ffffff',
              bgcolor: '#2a2a2a',
              px: isIPadFriendly ? 3 : 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#5a5a5a',
                bgcolor: '#333333',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              },
              '&:active': {
                transform: 'translateY(0) scale(0.98)'
              },
              '@media (hover: none) and (pointer: coarse)': {
                '&:active': {
                  transform: 'scale(0.95)',
                  bgcolor: '#3a3a3a'
                }
              }
            }}
          >
            Upload
          </Button>
        </Stack>
      </Stack>
      <TextField
        size={isIPadFriendly ? 'medium' : 'small'}
        placeholder={`Search ${tab}s…`}
        fullWidth
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize={isIPadFriendly ? 'medium' : 'small'} sx={{ color: '#888888' }} />
            </InputAdornment>
          )}}
        sx={{ 
          mb: spacing,
          '& .MuiInputBase-root': {
            bgcolor: '#2a2a2a',
            color: '#ffffff',
            minHeight: inputHeight,
            fontSize: inputFontSize,
            '& fieldset': { 
              borderColor: '#3a3a3a',
              borderWidth: 2
            },
            '&:hover fieldset': { borderColor: '#4a4a4a' },
            '&.Mui-focused fieldset': { 
              borderColor: '#ffffff',
              borderWidth: 2
            }
          },
          '& input': { 
            color: '#ffffff',
            fontSize: inputFontSize,
            padding: isIPadFriendly ? '14px 16px' : '10px 14px'
          },
          '& input::placeholder': { 
            color: '#666666',
            fontSize: inputFontSize
          }
        }}
      />
      <Grid container spacing={spacing}>
        {items.map((a) => (
          <Grid size={12 / gridColumns} key={a.id}>
            <Card a={a} isTablet={isIPadFriendly} />
          </Grid>
        ))}
      </Grid>

      <Rodin3DGeneratorDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onGenerated={handleModelGenerated}
      />
      <GLBGeneratorDialog
        open={glbDialogOpen}
        onClose={() => setGlbDialogOpen(false)}
        onGenerated={handleGlbGenerated}
      />
    </Box>
  );
}

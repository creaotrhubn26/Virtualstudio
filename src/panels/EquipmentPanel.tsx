import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  InputBase,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';

interface Equipment {
  id: string;
  name: string;
  category: 'background' | 'diffuser' | 'blocker' | 'other';
  size?: string;
  thumbnail: string;
}

const EQUIPMENT_ITEMS: Equipment[] = [
  { id: 'background', name: 'Bakgrunn', category: 'background', thumbnail: '/images/gear/equipment_backdrop.png' },
  { id: 'cove', name: 'Syklorama', category: 'background', thumbnail: '/images/gear/equipment_cove.png' },
  { id: 'shooting-table', name: 'Fotograferingsbord', category: 'other', thumbnail: '/images/gear/equipment_shooting_table.png' },
  { id: 'diffuser-panel', name: 'Diffuserpanel', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png' },
  { id: 'diffuser-scrim-120', name: 'Diffuser Scrim', size: '120 x 120 cm', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png' },
  { id: 'diffuser-scrim-180', name: 'Diffuser Scrim', size: '180 x 180 cm', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png' },
  { id: 'diffuser-scrim-240', name: 'Diffuser Scrim', size: '240 x 240 cm', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png' },
  { id: 'diffuser-scrim-360', name: 'Diffuser Scrim', size: '360 x 360 cm', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png' },
  { id: 'light-blocker', name: 'Lysblokkerer', category: 'blocker', thumbnail: '/images/gear/equipment_light_blocker.png' },
  { id: 'v-flat', name: 'V-Flat', size: '200 x 100 cm', category: 'other', thumbnail: '/images/gear/equipment_vflat.png' },
];

type CategoryFilter = 'all' | 'background' | 'diffuser' | 'blocker' | 'other';

interface CategoryInfo {
  key: CategoryFilter;
  label: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'background', label: 'Bakgrunn' },
  { key: 'diffuser', label: 'Diffuser' },
  { key: 'blocker', label: 'Blokkere' },
  { key: 'other', label: 'Annet' },
];

export function EquipmentPanel() {
  const theme = useTheme();
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPadFriendly = isTablet || isTouchDevice;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filteredEquipment = useMemo(() => {
    return EQUIPMENT_ITEMS.filter(item => {
      const matchesSearch = search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.size && item.size.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const handleAdd = (item: Equipment) => {
    window.dispatchEvent(new CustomEvent('ch-add-equipment', { 
      detail: { id: item.id, name: item.name, size: item.size } 
    }));
  };

  const buttonStyle = {
    minHeight: isIPadFriendly ? 56 : 48,
    minWidth: isIPadFriendly ? 120 : 110,
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
        background: 'linear-gradient(135deg, rgba(26,188,156,0.15) 0%, rgba(22,160,133,0.15) 100%)',
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
          background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
          boxShadow: '0 4px 12px rgba(26,188,156,0.4)',
        }}>
          <TuneIcon sx={{ fontSize: isIPadFriendly ? 28 : 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ 
            fontWeight: 800, 
            fontSize: headerFontSize,
            background: 'linear-gradient(90deg, #76d7c4 0%, #48c9b0 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
            lineHeight: 1.3,
          }}>
            Studio-utstyr
          </Typography>
          <Typography sx={{ 
            fontSize: subHeaderFontSize, 
            color: '#888',
            fontWeight: 500,
            lineHeight: 1.4,
          }}>
            Bakgrunner, diffusere og reflektorer
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
            sx={{
              ...buttonStyle,
              bgcolor: category === cat.key ? '#10b981' : 'transparent',
              borderColor: category === cat.key ? '#10b981' : '#444',
              color: category === cat.key ? '#fff' : '#aaa',
              boxShadow: category === cat.key ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: category === cat.key ? '#059669' : '#333',
                borderColor: category === cat.key ? '#059669' : '#555',
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

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile 
          ? 'repeat(auto-fill, minmax(140px, 1fr))' 
          : isTablet 
            ? 'repeat(auto-fill, minmax(180px, 1fr))'
            : 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: gridGap,
      }}>
        {filteredEquipment.map(item => (
          <Card
            key={item.id}
            sx={{
              bgcolor: '#252525',
              border: '1px solid #333',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                borderColor: '#10b981',
              },
            }}
          >
            <Box
              sx={{
                height: 90,
                bgcolor: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img 
                src={item.thumbnail} 
                alt={item.name}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                }}
              />
            </Box>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#fff', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  textAlign: 'center',
                  lineHeight: 1.3,
                  mb: 0.5,
                }}
              >
                {item.name}
              </Typography>
              {item.size && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#888', 
                    fontSize: 10, 
                    display: 'block',
                    textAlign: 'center',
                    mb: 1,
                  }}
                >
                  {item.size}
                </Typography>
              )}
              <Button
                size="medium"
                variant="contained"
                fullWidth
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleAdd(item)}
                aria-label={`Legg til ${item.name}${item.size ? ' ' + item.size : ''}`}
                sx={{
                  mt: 0.5,
                  minHeight: 44,
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: '#10b981',
                  borderRadius: '8px',
                  '&:hover': { bgcolor: '#059669' },
                  textTransform: 'none',
                }}
              >
                Legg til
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export default EquipmentPanel;

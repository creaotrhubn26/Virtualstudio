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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

interface Equipment {
  id: string;
  name: string;
  category: 'background' | 'diffuser' | 'reflector' | 'blocker' | 'other';
  size?: string;
  gradient: string;
}

const EQUIPMENT_ITEMS: Equipment[] = [
  { id: 'background', name: 'Bakgrunn', category: 'background', gradient: 'linear-gradient(135deg, #888 0%, #aaa 100%)' },
  { id: 'cove', name: 'Syklorama', category: 'background', gradient: 'linear-gradient(135deg, #ccc 0%, #fff 100%)' },
  { id: 'shooting-table', name: 'Fotograferingsbord', category: 'other', gradient: 'linear-gradient(135deg, #bbb 0%, #eee 100%)' },
  { id: 'diffuser-panel', name: 'Diffuserpanel', category: 'diffuser', gradient: 'linear-gradient(135deg, #ddd 0%, #fff 100%)' },
  { id: 'diffuser-scrim-120', name: 'Diffuser Scrim', size: '120 x 120 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #ccc 0%, #eee 100%)' },
  { id: 'diffuser-scrim-180', name: 'Diffuser Scrim', size: '180 x 180 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #ccc 0%, #eee 100%)' },
  { id: 'diffuser-scrim-240', name: 'Diffuser Scrim', size: '240 x 240 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #555 0%, #888 100%)' },
  { id: 'diffuser-scrim-360', name: 'Diffuser Scrim', size: '360 x 360 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #333 0%, #555 100%)' },
  { id: 'light-blocker', name: 'Lysblokkerer', category: 'blocker', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' },
  { id: 'reflector', name: 'Reflektor', category: 'reflector', gradient: 'linear-gradient(135deg, #ddd 0%, #fff 100%)' },
  { id: 'reflector-90x60', name: 'Reflektor', size: '90 x 60 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-125x90', name: 'Reflektor', size: '125 x 90 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-190x130', name: 'Reflektor', size: '190 x 130 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-245x180', name: 'Reflektor', size: '245 x 180 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-round', name: 'Rund reflektor', size: 'Ø 56 cm', category: 'reflector', gradient: 'radial-gradient(circle, #e6c84a 0%, #c9a227 100%)' },
  { id: 'styrofoam-reflector', name: 'Isopor-reflektor', size: '110 x 70 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #f5f5f5 0%, #fff 100%)' },
  { id: 'v-flat', name: 'V-Flat', size: '200 x 100 cm', category: 'other', gradient: 'linear-gradient(135deg, #eee 0%, #fff 100%)' },
];

type CategoryFilter = 'all' | 'background' | 'diffuser' | 'reflector' | 'blocker' | 'other';

interface CategoryInfo {
  key: CategoryFilter;
  label: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'background', label: 'Bakgrunn' },
  { key: 'diffuser', label: 'Diffuser' },
  { key: 'reflector', label: 'Reflektor' },
  { key: 'blocker', label: 'Blokkere' },
  { key: 'other', label: 'Annet' },
];

export function EquipmentPanel() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

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
    minHeight: 56,
    minWidth: 110,
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
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
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

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 1.5,
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
                background: item.gradient,
              }}
            />
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

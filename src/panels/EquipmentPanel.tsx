import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
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
  { id: 'background', name: 'Background', category: 'background', gradient: 'linear-gradient(135deg, #888 0%, #aaa 100%)' },
  { id: 'cove', name: 'Cove', category: 'background', gradient: 'linear-gradient(135deg, #ccc 0%, #fff 100%)' },
  { id: 'shooting-table', name: 'Shooting Table', category: 'other', gradient: 'linear-gradient(135deg, #bbb 0%, #eee 100%)' },
  { id: 'diffuser-panel', name: 'Diffuser Panel', category: 'diffuser', gradient: 'linear-gradient(135deg, #ddd 0%, #fff 100%)' },
  { id: 'diffuser-scrim-120', name: 'Diffuser Scrim', size: '120 x 120 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #ccc 0%, #eee 100%)' },
  { id: 'diffuser-scrim-180', name: 'Diffuser Scrim', size: '180 x 180 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #ccc 0%, #eee 100%)' },
  { id: 'diffuser-scrim-240', name: 'Diffuser Scrim', size: '240 x 240 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #555 0%, #888 100%)' },
  { id: 'diffuser-scrim-360', name: 'Diffuser Scrim', size: '360 x 360 cm', category: 'diffuser', gradient: 'linear-gradient(135deg, #333 0%, #555 100%)' },
  { id: 'light-blocker', name: 'Light Blocker', category: 'blocker', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' },
  { id: 'reflector', name: 'Reflector', category: 'reflector', gradient: 'linear-gradient(135deg, #ddd 0%, #fff 100%)' },
  { id: 'reflector-90x60', name: 'Reflector', size: '90 x 60 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-125x90', name: 'Reflector', size: '125 x 90 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-190x130', name: 'Reflector', size: '190 x 130 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-245x180', name: 'Reflector', size: '245 x 180 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #c9a227 0%, #e6c84a 100%)' },
  { id: 'reflector-round', name: 'Reflector round', size: 'Ø 56 cm', category: 'reflector', gradient: 'radial-gradient(circle, #e6c84a 0%, #c9a227 100%)' },
  { id: 'styrofoam-reflector', name: 'Styrofoam Reflector', size: '110 x 70 cm', category: 'reflector', gradient: 'linear-gradient(135deg, #f5f5f5 0%, #fff 100%)' },
  { id: 'v-flat', name: 'V-Flat', size: '200 x 100 cm', category: 'other', gradient: 'linear-gradient(135deg, #eee 0%, #fff 100%)' },
];

type CategoryFilter = 'all' | 'background' | 'diffuser' | 'reflector' | 'blocker' | 'other';

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'background', label: 'Bakgrunn' },
  { id: 'diffuser', label: 'Diffuser' },
  { id: 'reflector', label: 'Reflektor' },
  { id: 'blocker', label: 'Blocker' },
  { id: 'other', label: 'Annet' },
];

export function EquipmentPanel() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const isTablet = useMediaQuery('(max-width: 1024px), (pointer: coarse)');

  const filteredEquipment = EQUIPMENT_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.size && item.size.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = (item: Equipment) => {
    window.dispatchEvent(new CustomEvent('ch-add-equipment', { 
      detail: { id: item.id, name: item.name, size: item.size } 
    }));
    console.log('Equipment added:', item.id);
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Søk utstyr..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#666' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#252525',
            '& fieldset': { borderColor: '#333' },
          },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.id}
            label={cat.label}
            size="small"
            onClick={() => setCategory(cat.id)}
            sx={{
              bgcolor: category === cat.id ? '#00a8ff' : '#333',
              color: category === cat.id ? '#fff' : '#aaa',
              fontSize: 11,
              '&:hover': { bgcolor: category === cat.id ? '#00a8ff' : '#444' },
            }}
          />
        ))}
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isTablet ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 1.5,
      }}>
        {filteredEquipment.map(item => (
          <Box
            key={item.id}
            sx={{
              bgcolor: '#252525',
              borderRadius: 1,
              overflow: 'hidden',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              },
            }}
          >
            <Box
              sx={{
                height: isTablet ? 80 : 70,
                background: item.gradient,
              }}
            />
            <Box sx={{ p: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#fff', 
                  fontSize: 11, 
                  fontWeight: 500, 
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {item.name}
                {item.size && (
                  <>
                    <br />
                    <Typography component="span" sx={{ fontSize: 10, color: '#888' }}>
                      {item.size}
                    </Typography>
                  </>
                )}
              </Typography>
              <Button
                size="small"
                variant="contained"
                fullWidth
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleAdd(item)}
                aria-label={`Legg til ${item.name}${item.size ? ' ' + item.size : ''}`}
                sx={{
                  mt: 1,
                  minHeight: isTablet ? 36 : 28,
                  fontSize: 10,
                  bgcolor: '#00a8ff',
                  '&:hover': { bgcolor: '#0090dd' },
                  textTransform: 'none',
                }}
              >
                Legg til
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default EquipmentPanel;

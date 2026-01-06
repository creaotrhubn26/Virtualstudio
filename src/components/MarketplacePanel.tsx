import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Star as StarIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { MarketplaceProduct, MarketplaceFilters } from '../core/models/marketplace';
import { marketplaceService } from '../services/marketplaceService';
import { MarketplaceProductCard } from './MarketplaceProductCard';
import { MarketplaceProductDetail } from './MarketplaceProductDetail';

interface MarketplacePanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function MarketplacePanel({ onClose, isFullscreen = false, onToggleFullscreen }: MarketplacePanelProps) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    category: 'all',
    price: 'all',
    sortBy: 'popularity',
  });
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [filters, searchQuery]);

  const loadProducts = () => {
    let result: MarketplaceProduct[];
    
    if (searchQuery.trim()) {
      result = marketplaceService.searchProducts(searchQuery);
    } else {
      result = marketplaceService.getProducts(filters);
    }
    
    setProducts(result);
  };

  const categories = marketplaceService.getCategories();
  const installedCount = products.filter(p => p.isInstalled).length;
  const updateCount = products.filter(p => p.hasUpdate).length;

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilters({ ...filters, category: category === 'all' ? 'all' : category as any });
  };

  const handleProductClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const handleInstall = async (id: string) => {
    const success = await marketplaceService.installProduct(id);
    if (success) {
      loadProducts();
      alert('Produkt installert!');
    } else {
      alert('Kunne ikke installere produkt');
    }
  };

  const handleUninstall = async (id: string) => {
    if (window.confirm('Er du sikker på at du vil avinstallere dette produktet?')) {
      const success = await marketplaceService.uninstallProduct(id);
      if (success) {
        loadProducts();
        alert('Produkt avinstallert');
      } else {
        alert('Kunne ikke avinstallere produkt');
      }
    }
  };

  const handleUpdate = async (id: string) => {
    const success = await marketplaceService.updateProduct(id);
    if (success) {
      loadProducts();
      alert('Produkt oppdatert!');
    } else {
      alert('Kunne ikke oppdatere produkt');
    }
  };

  const handleToggleFavorite = (id: string) => {
    marketplaceService.toggleFavorite(id);
    loadProducts();
  };

  const handleProductUpdated = (updatedProduct: MarketplaceProduct) => {
    loadProducts();
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      
      {/* Search bar - always visible */}
      {!isFullscreen && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            bgcolor: '#1c2128',
          }}
        >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, maxWidth: 600, mx: 3 }}>
            <TextField
            placeholder="Søk produkter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.05)',
                fontSize: '16px',
                minHeight: '48px',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#00d4ff' },
              },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${installedCount} installert`}
            size="small"
            sx={{
              bgcolor: 'rgba(16,185,129,0.2)',
              color: '#10b981',
              fontSize: '12px',
            }}
          />
          {updateCount > 0 && (
            <Chip
              label={`${updateCount} oppdateringer`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,184,0,0.2)',
                color: '#ffb800',
                fontSize: '12px',
              }}
            />
          )}
          <IconButton
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              minWidth: '48px',
              minHeight: '48px',
              touchAction: 'manipulation',
            }}
          >
            {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
          </IconButton>
        </Box>
      </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#1c2128' }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, value) => handleCategoryChange(value)}
          sx={{
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'none',
              fontSize: '16px',
              minHeight: '56px',
              padding: '12px 16px',
              touchAction: 'manipulation',
              '&.Mui-selected': {
                color: '#00d4ff',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#00d4ff',
              height: '3px',
            },
          }}
        >
          {categories.map((cat) => (
            <Tab
              key={cat.id}
              value={cat.id}
              label={`${cat.name} (${cat.count})`}
            />
          ))}
        </Tabs>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Box
          sx={{
            p: 2,
            bgcolor: '#1c2128',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Pris</InputLabel>
            <Select
              value={filters.price || 'all'}
              onChange={(e) => setFilters({ ...filters, price: e.target.value as any })}
              label="Pris"
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="free">Gratis</MenuItem>
              <MenuItem value="paid">Betalt</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Sorter</InputLabel>
            <Select
              value={filters.sortBy || 'popularity'}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              label="Sorter"
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <MenuItem value="popularity">Popularitet</MenuItem>
              <MenuItem value="newest">Nyeste</MenuItem>
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="price">Pris</MenuItem>
              <MenuItem value="name">Navn</MenuItem>
            </Select>
          </FormControl>

          <Button
            size="small"
            onClick={() => setShowFilters(false)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Skjul filtre
          </Button>
        </Box>
      )}

      {!showFilters && (
        <Box sx={{ p: 1, bgcolor: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            size="small"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(true)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Vis filtre
          </Button>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: 0 }}>
        {products.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <SearchIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ingen produkter funnet
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {searchQuery ? 'Prøv et annet søkeord' : 'Ingen produkter i denne kategorien'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid
                item
                xs={12}
                sm={viewMode === 'grid' ? 12 : 12}
                md={viewMode === 'grid' ? 6 : 12}
                lg={viewMode === 'grid' ? 6 : 12}
                xl={viewMode === 'grid' ? 4 : 12}
                key={product.id}
              >
                <MarketplaceProductCard
                  product={product}
                  onProductClick={handleProductClick}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  onUpdate={handleUpdate}
                  onToggleFavorite={handleToggleFavorite}
                  onProductUpdated={handleProductUpdated}
                  viewMode={viewMode}
                  onEditStart={() => {
                    // Close product detail dialog when edit dialog opens from card
                    if (detailOpen) {
                      setDetailOpen(false);
                      setSelectedProduct(null);
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <MarketplaceProductDetail
          open={detailOpen}
          product={selectedProduct}
          onClose={() => {
            setDetailOpen(false);
            setSelectedProduct(null);
          }}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onUpdate={handleUpdate}
          onToggleFavorite={handleToggleFavorite}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </Box>
  );
}


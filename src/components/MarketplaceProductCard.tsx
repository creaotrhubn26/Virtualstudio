import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Download as DownloadIcon,
  Update as UpdateIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { MarketplaceProduct } from '../core/models/marketplace';
import { marketplaceService } from '../services/marketplaceService';

interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  onProductClick: (product: MarketplaceProduct) => void;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onUpdate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onProductUpdated?: (product: MarketplaceProduct) => void;
  viewMode?: 'grid' | 'list';
  onEditStart?: () => void; // Callback when edit dialog opens
}

export function MarketplaceProductCard({
  product,
  onProductClick,
  onInstall,
  onUninstall,
  onUpdate,
  onToggleFavorite,
  onProductUpdated,
  viewMode = 'grid',
  onEditStart,
}: MarketplaceProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
  });

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Notify parent FIRST to close product detail dialog if open
    if (onEditStart) {
      onEditStart();
    }
    // Small delay to ensure product detail dialog closes before opening edit dialog
    setTimeout(() => {
      setIsEditing(true);
    }, 100);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedProduct = { ...product, ...editData, lastUpdated: new Date().toISOString() };
    const success = marketplaceService.updateProductInfo(updatedProduct);
    if (success && onProductUpdated) {
      onProductUpdated(updatedProduct);
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
    });
    setIsEditing(false);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.hasUpdate) {
      onUpdate(product.id);
    } else if (product.isInstalled) {
      onUninstall(product.id);
    } else {
      onInstall(product.id);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i} sx={{ fontSize: 20, color: '#ffb800' }} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIcon key={i} sx={{ fontSize: 20, color: '#ffb800', opacity: 0.5 }} />);
      } else {
        stars.push(<StarBorderIcon key={i} sx={{ fontSize: 20, color: 'rgba(255,255,255,0.87)' }} />);
      }
    }
    return stars;
  };

  const getActionButton = () => {
    if (product.hasUpdate) {
      return (
        <Button
          size="small"
          variant="contained"
          startIcon={<UpdateIcon />}
          onClick={handleActionClick}
          sx={{
            bgcolor: '#ffb800',
            color: '#000',
            fontSize: '14px',
            minHeight: '44px',
            padding: '8px 16px',
            touchAction: 'manipulation',
            '&:hover': { bgcolor: '#ffa000' },
          }}
        >
          Oppdater
        </Button>
      );
    }
    if (product.isInstalled) {
      return (
        <Button
          size="small"
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={handleActionClick}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: '14px',
            minHeight: '44px',
            padding: '8px 16px',
            touchAction: 'manipulation',
            '&:hover': { borderColor: '#ff4444', bgcolor: 'rgba(255,68,68,0.1)' },
          }}
        >
          Avinstaller
        </Button>
      );
    }
    return (
      <Button
        size="small"
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={handleActionClick}
          sx={{
            bgcolor: '#00d4ff',
            color: '#000',
            fontSize: '14px',
            minHeight: '44px',
            padding: '8px 16px',
            touchAction: 'manipulation',
            '&:hover': { bgcolor: '#00b8e6' },
          }}
      >
        {product.price === 0 ? 'Installer' : `Kjøp ${product.price} ${product.currency || 'NOK'}`}
      </Button>
    );
  };

  if (viewMode === 'list') {
    return (
      <Card
        sx={{
          display: 'flex',
          mb: 2,
          bgcolor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: '#00d4ff',
            transform: 'translateX(4px)',
          },
        }}
        onClick={() => onProductClick(product)}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            sx={{ width: 200, height: 120, objectFit: 'cover' }}
            image={product.thumbnail}
            alt={product.name}
          />
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 10 }}>
            <Tooltip title="Rediger">
              <IconButton
                size="small"
                onClick={handleEdit}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: '#00d4ff',
                  minWidth: '40px',
                  minHeight: '40px',
                  '&:hover': { bgcolor: 'rgba(0,212,255,0.3)' },
                  '&:focus-visible': {
                    outline: '2px solid #00d4ff',
                    outlineOffset: '2px',
                  },
                }}
                aria-label="Rediger produkt"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={product.isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.id);
                }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: product.isFavorite ? '#ffb800' : 'rgba(255,255,255,0.7)',
                  minWidth: '40px',
                  minHeight: '40px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                aria-label={product.isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
              >
                {product.isFavorite ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                {product.toolConfig?.icon && (
                  <Box
                    component="img"
                    src={product.toolConfig.icon}
                    alt={`${product.name} ikon`}
                    sx={{
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#fff', flex: 1, lineHeight: 1.3 }}>
                  {product.name}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1.5, fontSize: '15px', lineHeight: 1.5 }}>
                {product.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={product.category}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0,212,255,0.25)',
                    color: '#00d4ff',
                    fontSize: '12px',
                    fontWeight: 600,
                    height: '26px',
                    border: '1px solid rgba(0,212,255,0.3)',
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {renderStars(product.rating)}
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', ml: 0.5, fontSize: '13px', fontWeight: 500 }}>
                    ({product.reviewCount})
                  </Typography>
                </Box>
                {product.isInstalled && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />}
                    label="Installert"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16,185,129,0.25)',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: 600,
                      height: '26px',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500 }}>
                av {product.author.name}
              </Typography>
              {getActionButton()}
            </Box>
          </CardContent>
        </Box>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
        sx={{
          bgcolor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          '&:hover': {
            borderColor: '#00d4ff',
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 16px rgba(0,212,255,0.2)',
          },
          '&:active': {
            transform: 'translateY(-2px)',
          },
        }}
      onClick={(e) => {
        // Only trigger product click if not clicking on action buttons
        const target = e.target as HTMLElement;
        if (!target.closest('.product-actions')) {
          onProductClick(product);
        }
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <CardMedia
          component="img"
          height="380"
          image={product.thumbnail}
          alt={product.name}
          sx={{ objectFit: 'cover', display: 'block', width: '100%' }}
        />
        {/* Action buttons overlay */}
        <Box 
          className="product-actions"
          onClick={(e) => e.stopPropagation()}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            display: 'flex', 
            gap: 0.5, 
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <Tooltip title="Rediger">
            <IconButton
              size="small"
              onClick={handleEdit}
              sx={{
                bgcolor: 'rgba(0,0,0,0.85)',
                color: '#00d4ff',
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                border: '1px solid rgba(0,212,255,0.3)',
                '&:hover': { 
                  bgcolor: 'rgba(0,212,255,0.7)',
                  color: '#000',
                  transform: 'scale(1.05)',
                  borderColor: '#00d4ff',
                },
                '&:focus-visible': {
                  outline: '3px solid #00d4ff',
                  outlineOffset: '2px',
                },
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
              aria-label="Rediger produkt"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={product.isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product.id);
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.85)',
                color: product.isFavorite ? '#ffb800' : 'rgba(255,255,255,0.7)',
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': { 
                  bgcolor: 'rgba(0,0,0,0.9)',
                  borderColor: product.isFavorite ? '#ffb800' : 'rgba(255,255,255,0.4)',
                },
              }}
              aria-label={product.isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
            >
              {product.isFavorite ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        {product.isInstalled && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />}
            label="Installert"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(16,185,129,0.95)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              height: '28px',
              border: '1px solid rgba(16,185,129,0.5)',
            }}
          />
        )}
        {product.hasUpdate && (
          <Chip
            label="Oppdatering"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: '#ffb800',
              color: '#000',
              fontSize: '13px',
              fontWeight: 700,
              height: '28px',
              border: '1px solid rgba(255,184,0,0.5)',
            }}
          />
        )}
      </Box>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Chip
            label={product.category}
            size="small"
            sx={{
              bgcolor: 'rgba(0,212,255,0.25)',
              color: '#00d4ff',
              fontSize: '12px',
              fontWeight: 600,
              height: '24px',
              border: '1px solid rgba(0,212,255,0.3)',
            }}
          />
          {product.price === 0 && (
            <Chip
              label="Gratis"
              size="small"
              sx={{
                bgcolor: 'rgba(16,185,129,0.25)',
                color: '#10b981',
                fontSize: '12px',
                fontWeight: 600,
                height: '24px',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {product.toolConfig?.icon && (
            <Box
              component="img"
              src={product.toolConfig.icon}
              alt={`${product.name} ikon`}
              sx={{
                width: 24,
                height: 24,
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            {product.name}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            mb: 1.5,
            fontSize: '14px',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          {renderStars(product.rating)}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', ml: 0.5, fontSize: '13px', fontWeight: 500 }}>
            {product.rating} ({product.reviewCount})
          </Typography>
        </Box>
        <Box sx={{ mt: 'auto', pt: 1 }}>
          {getActionButton()}
        </Box>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog
        open={isEditing}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        container={() => document.body}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            zIndex: 100000,
          },
        }}
        sx={{
          zIndex: 100000,
          '& .MuiBackdrop-root': {
            zIndex: 99998,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#fff', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <Typography variant="h6" component="span">
            Rediger produkt
          </Typography>
          <IconButton
            onClick={handleCancel}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.87)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
            aria-label="Lukk"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Navn"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
              }}
            />
            <TextField
              label="Beskrivelse"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Pris"
                type="number"
                value={editData.price}
                onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
                }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Kategori</InputLabel>
                <Select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  label="Kategori"
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.87)' },
                  }}
                >
                  <MenuItem value="feature">Funksjon</MenuItem>
                  <MenuItem value="asset">Eiendel</MenuItem>
                  <MenuItem value="plugin">Plugin</MenuItem>
                  <MenuItem value="template">Mal</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            startIcon={<SaveIcon />}
            variant="contained"
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}


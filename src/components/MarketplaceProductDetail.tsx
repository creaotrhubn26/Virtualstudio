import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent,
  type KeyboardEvent,
  type ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Rating,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Download as DownloadIcon,
  Update as UpdateIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  } from '@mui/icons-material';
import { MarketplaceProduct } from '../core/models/marketplace';
import { marketplaceService } from '../services/marketplaceService';
import { FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useToast } from './ToastStack';

interface MarketplaceProductDetailProps {
  open: boolean;
  product: MarketplaceProduct;
  onClose: () => void;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onUpdate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onProductUpdated?: (product: MarketplaceProduct) => void;
}

export function MarketplaceProductDetail({
  open,
  product,
  onClose,
  onInstall,
  onUninstall,
  onUpdate,
  onToggleFavorite,
  onProductUpdated,
}: MarketplaceProductDetailProps) {
  const [tabValue, setTabValue] = useState(0);
  const [reviews, setReviews] = useState(() => {
    try {
      return product?.id ? marketplaceService.getReviews(product.id) : [];
    } catch (error) {
      console.error('Error loading reviews:', error);
      return [];
    }
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState(() => {
    try {
      return {
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || 0,
        category: product?.category || '',
        currency: product?.currency || 'NOK',
        version: product?.version || '',
        author: product?.author ? { ...product.author } : { name: '', email: '' },
        tags: product?.tags ? [...product.tags] : [],
        features: product?.features ? [...product.features] : [],
        requirements: product?.requirements ? { ...product.requirements } : { minVersion: '', dependencies: [] },
        releaseDate: product?.releaseDate || '',
        license: product?.license || '',
        whatsNew: product?.whatsNew || '',
        thumbnail: product?.thumbnail || '',
        screenshots: product?.screenshots ? [...product.screenshots] : [],
      };
    } catch (error) {
      console.error('Error initializing editData:', error);
      return {
        name: '',
        description: '',
        price: 0,
        category: '',
        currency: 'NOK',
        version: '',
        author: { name: '', email: '' },
        tags: [],
        features: [],
        requirements: { minVersion: '', dependencies: [] },
        releaseDate: '',
        license: '',
        whatsNew: '',
        thumbnail: '',
        screenshots: [],
      };
    }
  });

  // Reset edit data when product changes
  useEffect(() => {
    try {
      if (!product) return;
      setEditData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category: product.category || '',
        currency: product.currency || 'NOK',
        version: product.version || '',
        author: product.author ? { ...product.author } : { name: '', email: '' },
        tags: product.tags ? [...product.tags] : [],
        features: product.features ? [...product.features] : [],
        requirements: product.requirements ? { ...product.requirements } : { minVersion: '', dependencies: [] },
        releaseDate: product.releaseDate || '',
        license: product.license || '',
        whatsNew: product.whatsNew || '',
        thumbnail: product.thumbnail || '',
        screenshots: product.screenshots ? [...product.screenshots] : [],
      });
      setIsEditing(false);
      // Reload reviews when product changes
      if (product.id) {
        try {
          setReviews(marketplaceService.getReviews(product.id));
        } catch (error) {
          console.error('Error loading reviews:', error);
          setReviews([]);
        }
      }
    } catch (error) {
      console.error('Error resetting edit data:', error);
    }
  }, [product?.id]);

  // Reload reviews when dialog opens
  useEffect(() => {
    if (open) {
      setReviews(marketplaceService.getReviews(product.id));
    }
  }, [open, product.id]);

  // Focus trap for keyboard navigation (WCAG 2.1.2)
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    // Focus first element when dialog opens
    setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableRef.current) {
            e.preventDefault();
            lastFocusableRef.current?.focus();
          }
        } else {
          if (document.activeElement === lastFocusableRef.current) {
            e.preventDefault();
            firstFocusableRef.current?.focus();
          }
        }
      } else if (e.key === 'Escape' && !isEditing) {
        onClose();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isEditing, onClose]);

  const handleEdit = useCallback((e?: MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsEditing(true);
  }, []);

  const handleSave = () => {
    const updatedProduct = { ...product, ...editData, lastUpdated: new Date().toISOString() };
    const success = marketplaceService.updateProductInfo(updatedProduct);
    if (success && onProductUpdated) {
      onProductUpdated(updatedProduct);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      currency: product.currency || 'NOK',
      version: product.version,
      author: { ...product.author },
      tags: [...product.tags],
      features: [...product.features],
      requirements: product.requirements ? { ...product.requirements } : { minVersion: '', dependencies: [] },
      releaseDate: product.releaseDate,
      license: product.license,
      whatsNew: product.whatsNew || '',
      thumbnail: product.thumbnail,
      screenshots: [...product.screenshots],
    });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !editData.tags.includes(trimmedTag)) {
      setEditData({
        ...editData,
        tags: [...editData.tags, trimmedTag],
      });
      setTagInput('');
    }
  };

  const handleTagInputKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (index: number) => {
    setEditData({
      ...editData,
      tags: editData.tags.filter((_, i) => i !== index),
    });
  };

  const handleAddFeature = () => {
    const newFeature = prompt('Legg til funksjon:');
    if (newFeature && newFeature.trim()) {
      setEditData({
        ...editData,
        features: [...editData.features, newFeature.trim()],
      });
    }
  };

  const handleRemoveFeature = (index: number) => {
    setEditData({
      ...editData,
      features: editData.features.filter((_, i) => i !== index),
    });
  };

  const handleAddDependency = () => {
    const newDep = prompt('Legg til avhengighet:');
    if (newDep && newDep.trim()) {
      setEditData({
        ...editData,
        requirements: {
          ...editData.requirements,
          dependencies: [...(editData.requirements.dependencies || []), newDep.trim()],
        },
      });
    }
  };

  const handleRemoveDependency = (index: number) => {
    setEditData({
      ...editData,
      requirements: {
        ...editData.requirements,
        dependencies: editData.requirements.dependencies?.filter((_, i) => i !== index) || [],
      },
    });
  };

  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.showError('Vennligst velg en bildefil');
        return;
      }
      try {
        const dataURL = await convertFileToDataURL(file);
        setEditData({
          ...editData,
          thumbnail: dataURL,
        });
      } catch (error) {
        console.error('Error converting file to data URL:', error);
        toast.showError('Kunne ikke laste opp bildet');
      }
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleScreenshotUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        const dataURLs = await Promise.all(
          Array.from(files).map(async (file) => {
            if (!file.type.startsWith('image/')) {
              throw new Error(`${file.name} er ikke en bildefil`);
            }
            return await convertFileToDataURL(file);
          })
        );
        setEditData({
          ...editData,
          screenshots: [...editData.screenshots, ...dataURLs],
        });
      } catch (error) {
        console.error('Error converting files to data URLs:', error);
        toast.showError(error instanceof Error ? error.message : 'Kunne ikke laste opp bildene');
      }
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAddScreenshot = () => {
    const newScreenshot = prompt('Legg til screenshot URL (eller bruk fil-opplasting):');
    if (newScreenshot && newScreenshot.trim()) {
      setEditData({
        ...editData,
        screenshots: [...editData.screenshots, newScreenshot.trim()],
      });
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setEditData({
      ...editData,
      screenshots: editData.screenshots.filter((_, i) => i !== index),
    });
  };

  const handleAction = () => {
    if (product.hasUpdate) {
      onUpdate(product.id);
    } else if (product.isInstalled) {
      onUninstall(product.id);
    } else {
      onInstall(product.id);
    }
  };

  const handleSubmitReview = () => {
    if (reviewComment.trim() && reviewRating > 0) {
      const newReview = marketplaceService.addReview(product.id, {
        userId: 'current-user',
        userName: 'Du',
        rating: reviewRating,
        comment: reviewComment.trim(),
        helpfulCount: 0,
      });
      
      // Update reviews list
      setReviews(marketplaceService.getReviews(product.id));
      
      // Update product rating if callback is provided
      if (onProductUpdated) {
        const updatedProduct = {
          ...product,
          rating: marketplaceService.getReviews(product.id).reduce((sum, r) => sum + r.rating, 0) / marketplaceService.getReviews(product.id).length,
          reviewCount: marketplaceService.getReviews(product.id).length,
        };
        onProductUpdated(updatedProduct);
      }
      
      // Reset form
      setReviewComment('');
      setReviewRating(5);
      
      // Scroll to top of reviews section
      setTimeout(() => {
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={false}
      container={() => document.body}
      ref={dialogRef}
      PaperProps={{
        sx: {
          bgcolor: '#0f1419',
          color: '#ffffff',
          maxHeight: '95vh',
          borderRadius: { xs: 0, sm: 2 },
          zIndex: 100000,
          width: { xs: '100%', sm: '90%', md: '85%', lg: '80%' },
          maxWidth: { xs: '100%', sm: '800px', md: '900px', lg: '1000px' },
          '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
            maxHeight: '98vh',
            borderRadius: 0,
            width: '95%',
            maxWidth: '95%',
          },
        },
      }}
      sx={{
        zIndex: 100000,
        '& .MuiBackdrop-root': {
          zIndex: 99998,
          bgcolor: 'rgba(0,0,0,0.8)',
        },
        // Hide any default close button that MUI might add
        '& .MuiDialogTitle-root button:not([aria-label="Lukk dialog"]):not([aria-label="Avbryt redigering"]):not([aria-label="Lagre endringer"]):not([aria-label="Rediger produkt"]):not([aria-label*="favoritter"])': {
          display: 'none',
        },
      }}
      aria-labelledby="product-dialog-title"
      aria-describedby="product-dialog-description"
      aria-modal="true"
      role="dialog"
    >
      <DialogTitle
        id="product-dialog-title"
        sx={{
          p: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {isEditing ? (
            <TextField
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              fullWidth
              label="Produktnavn"
              aria-label="Produktnavn"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  fontSize: { xs: '18px', sm: '20px' },
                  minHeight: { xs: '56px', sm: '48px' },
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.87)',
                  fontSize: { xs: '16px', sm: '14px' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flex: 1 }}>
              {product.toolConfig?.icon && (
                <Box
                  component="img"
                  src={product.toolConfig.icon}
                  alt={`${product.name} ikon`}
                  sx={{
                    width: { xs: 40, sm: 36, md: 40 },
                    height: { xs: 40, sm: 36, md: 40 },
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="h4"
                id="product-dialog-title-text"
                sx={{
                  color: '#ffffff',
                  fontSize: { xs: '24px', sm: '28px', md: '32px' },
                  fontWeight: 700,
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                }}
              >
                {product.name}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center', flexShrink: 0 }}>
            {isEditing ? (
              <>
                <IconButton
                  onClick={handleSave}
                  aria-label="Lagre endringer"
                  sx={{
                    color: '#00d4ff',
                    minWidth: { xs: '56px', sm: '48px' },
                    minHeight: { xs: '56px', sm: '48px' },
                    fontSize: { xs: '28px', sm: '24px' },
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.15)' },
                    '&:focus-visible': { outline: '3px solid #00d4ff', outlineOffset: '2px' },
                  }}
                >
                  <SaveIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  onClick={handleCancel}
                  aria-label="Avbryt redigering"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: { xs: '56px', sm: '48px' },
                    minHeight: { xs: '56px', sm: '48px' },
                    fontSize: { xs: '28px', sm: '24px' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&:focus-visible': { outline: '3px solid #00d4ff', outlineOffset: '2px' },
                  }}
                >
                  <CancelIcon fontSize="inherit" />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  onClick={handleEdit}
                  aria-label="Rediger produkt"
                  aria-describedby="edit-product-description"
                  sx={{
                    color: '#00d4ff',
                    minWidth: { xs: '56px', sm: '48px', md: '44px' },
                    minHeight: { xs: '56px', sm: '48px', md: '44px' },
                    width: { xs: '56px', sm: '48px', md: '44px' },
                    height: { xs: '56px', sm: '48px', md: '44px' },
                    fontSize: { xs: '28px', sm: '24px', md: '22px' },
                    touchAction: 'manipulation',
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.15)' },
                    '&:focus-visible': { 
                      outline: '3px solid #00d4ff', 
                      outlineOffset: '2px',
                      bgcolor: 'rgba(0,212,255,0.2)',
                    },
                    '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                      minWidth: '56px',
                      minHeight: '56px',
                      width: '56px',
                      height: '56px',
                      fontSize: '28px',
                    },
                  }}
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
                <span id="edit-product-description" className="sr-only">
                  Åpner redigeringsmodus for produktet
                </span>
                <IconButton
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={product.isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
                  aria-pressed={product.isFavorite}
                  sx={{
                    color: product.isFavorite ? '#ffb800' : 'rgba(255,255,255,0.8)',
                    minWidth: { xs: '56px', sm: '48px', md: '44px' },
                    minHeight: { xs: '56px', sm: '48px', md: '44px' },
                    width: { xs: '56px', sm: '48px', md: '44px' },
                    height: { xs: '56px', sm: '48px', md: '44px' },
                    fontSize: { xs: '28px', sm: '24px', md: '22px' },
                    touchAction: 'manipulation',
                    '&:hover': { bgcolor: 'rgba(255,184,0,0.15)' },
                    '&:focus-visible': { 
                      outline: '3px solid #00d4ff', 
                      outlineOffset: '2px',
                      bgcolor: product.isFavorite ? 'rgba(255,184,0,0.2)' : 'rgba(255,255,255,0.1)',
                    },
                    '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                      minWidth: '56px',
                      minHeight: '56px',
                      width: '56px',
                      height: '56px',
                      fontSize: '28px',
                    },
                  }}
                >
                  {product.isFavorite ? <StarIcon fontSize="inherit" /> : <StarBorderIcon fontSize="inherit" />}
                </IconButton>
              </>
            )}
            <IconButton
              onClick={onClose}
              aria-label="Lukk dialog"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                minWidth: { xs: '56px', sm: '48px', md: '44px' },
                minHeight: { xs: '56px', sm: '48px', md: '44px' },
                width: { xs: '56px', sm: '48px', md: '44px' },
                height: { xs: '56px', sm: '48px', md: '44px' },
                fontSize: { xs: '28px', sm: '24px', md: '22px' },
                touchAction: 'manipulation',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                '&:focus-visible': { 
                  outline: '3px solid #00d4ff', 
                  outlineOffset: '2px',
                  bgcolor: 'rgba(255,255,255,0.15)',
                },
                '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                  minWidth: '56px',
                  minHeight: '56px',
                  width: '56px',
                  height: '56px',
                  fontSize: '28px',
                },
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        id="product-dialog-description"
        sx={{
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: { xs: '12px', sm: '10px' },
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 3, sm: 4 } }}>
          {/* Image Gallery Section */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              component="img"
              src={isEditing ? editData.thumbnail : product.thumbnail}
              alt={`Thumbnail for ${isEditing ? editData.name : product.name}`}
              sx={{
                width: '100%',
                borderRadius: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            
            {/* Screenshots Gallery */}
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontSize: { xs: '18px', sm: '20px' },
                fontWeight: 600,
                mb: { xs: 1.5, sm: 2 },
                mt: { xs: 2, sm: 0 },
              }}
            >
              Bilder
            </Typography>
            
            {(isEditing ? editData.screenshots : product.screenshots).length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(2, 1fr)' },
                  gap: { xs: 1.5, sm: 2 },
                  mb: { xs: 2, sm: 3 },
                }}
              >
                {(isEditing ? editData.screenshots : product.screenshots).map((screenshot, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'relative',
                      aspectRatio: '16/9',
                      borderRadius: { xs: 1.5, sm: 2 },
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.1)',
                      '&:hover': { borderColor: '#00d4ff' },
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Box
                      component="img"
                      src={screenshot}
                      alt={`Screenshot ${i + 1} av ${isEditing ? editData.name : product.name}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                    />
                    {isEditing && (
                      <IconButton
                        onClick={() => handleRemoveScreenshot(i)}
                        aria-label={`Fjern screenshot ${i + 1}`}
                        sx={{
                          position: 'absolute',
                          top: { xs: 4, sm: 8 },
                          right: { xs: 4, sm: 8 },
                          bgcolor: 'rgba(255,68,68,0.95)',
                          color: '#fff',
                          minWidth: { xs: '44px', sm: '40px' },
                          minHeight: { xs: '44px', sm: '40px' },
                          fontSize: { xs: '20px', sm: '18px' },
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          '&:hover': { bgcolor: '#cc0000' },
                          '&:focus-visible': { outline: '3px solid #ff4444', outlineOffset: '2px' },
                        }}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: { xs: 2, sm: 3 },
                  p: { xs: 3, sm: 4 },
                  textAlign: 'center',
                  mb: { xs: 2, sm: 3 },
                  bgcolor: 'rgba(255,255,255,0.02)',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.87)',
                    fontSize: { xs: '14px', sm: '16px' },
                    mb: { xs: 1.5, sm: 2 },
                  }}
                >
                  Ingen bilder lagt til ennå
                </Typography>
              </Box>
            )}
            
            {isEditing && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  style={{ display: 'none' }}
                  aria-label="Last opp screenshots"
                />
                <Button
                  variant="outlined"
                  onClick={() => screenshotInputRef.current?.click()}
                  aria-label="Last opp screenshots"
                  startIcon={<DownloadIcon />}
                  fullWidth
                  sx={{
                    color: '#00d4ff',
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    py: { xs: 1.5, sm: 1.25 },
                    fontSize: { xs: '16px', sm: '14px' },
                    fontWeight: 600,
                    minHeight: { xs: '56px', sm: '48px' },
                    touchAction: 'manipulation',
                    '&:hover': {
                      borderColor: '#00b8e6',
                      bgcolor: 'rgba(0,212,255,0.1)',
                      borderWidth: 2,
                    },
                    '&:focus-visible': {
                      outline: '3px solid #00d4ff',
                      outlineOffset: '2px',
                    },
                    '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                      minHeight: '56px',
                      fontSize: '16px',
                    },
                  }}
                >
                  Last opp bilder
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleAddScreenshot}
                  aria-label="Legg til screenshot URL"
                  fullWidth
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderWidth: 2,
                    py: { xs: 1.5, sm: 1.25 },
                    fontSize: { xs: '16px', sm: '14px' },
                    fontWeight: 500,
                    minHeight: { xs: '56px', sm: '48px' },
                    touchAction: 'manipulation',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderWidth: 2,
                    },
                    '&:focus-visible': {
                      outline: '3px solid #00d4ff',
                      outlineOffset: '2px',
                    },
                    '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                      minHeight: '56px',
                      fontSize: '16px',
                    },
                  }}
                >
                  Eller legg til URL
                </Button>
              </Box>
            )}
          </Box>

          {/* Product Info Section */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 1, sm: 1.5 },
                  mb: { xs: 2.5, sm: 3 },
                  flexWrap: 'wrap',
                }}
              >
                {isEditing ? (
                  <>
                    <FormControl
                      sx={{
                        minWidth: { xs: '140px', sm: '160px' },
                        flex: { xs: '1 1 140px', sm: '0 0 auto' },
                      }}
                    >
                      <InputLabel
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: { xs: '16px', sm: '14px' },
                          '&.Mui-focused': { color: '#00d4ff' },
                        }}
                      >
                        Kategori
                      </InputLabel>
                      <Select
                        value={editData.category}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        label="Kategori"
                        aria-label="Velg kategori"
                        sx={{
                          color: '#ffffff',
                          minHeight: { xs: '56px', sm: '48px' },
                          fontSize: { xs: '16px', sm: '14px' },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.3)',
                            borderWidth: 2,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#00d4ff',
                            borderWidth: 2,
                          },
                          '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.8)', fontSize: { xs: '28px', sm: '24px' } },
                        }}
                      >
                        <MenuItem value="feature" sx={{ fontSize: { xs: '16px', sm: '14px' }, py: { xs: 1.5, sm: 1 } }}>
                          Funksjon
                        </MenuItem>
                        <MenuItem value="asset" sx={{ fontSize: { xs: '16px', sm: '14px' }, py: { xs: 1.5, sm: 1 } }}>
                          Eiendel
                        </MenuItem>
                        <MenuItem value="plugin" sx={{ fontSize: { xs: '16px', sm: '14px' }, py: { xs: 1.5, sm: 1 } }}>
                          Plugin
                        </MenuItem>
                        <MenuItem value="template" sx={{ fontSize: { xs: '16px', sm: '14px' }, py: { xs: 1.5, sm: 1 } }}>
                          Mal
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Pris"
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })}
                      aria-label="Pris"
                      sx={{
                        width: { xs: '140px', sm: '160px' },
                        flex: { xs: '1 1 140px', sm: '0 0 auto' },
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          minHeight: { xs: '56px', sm: '48px' },
                          fontSize: { xs: '16px', sm: '14px' },
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                          '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: { xs: '16px', sm: '14px' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Chip
                      label={product.category}
                      sx={{
                        bgcolor: 'rgba(0,212,255,0.25)',
                        color: '#00d4ff',
                        fontSize: { xs: '15px', sm: '13px' },
                        fontWeight: 600,
                        height: { xs: '40px', sm: '32px' },
                        px: { xs: 2, sm: 1.5 },
                        border: '1px solid rgba(0,212,255,0.3)',
                      }}
                    />
                    {product.price === 0 ? (
                      <Chip
                        label="Gratis"
                        sx={{
                          bgcolor: 'rgba(16,185,129,0.25)',
                          color: '#10b981',
                          fontSize: { xs: '15px', sm: '13px' },
                          fontWeight: 600,
                          height: { xs: '40px', sm: '32px' },
                          px: { xs: 2, sm: 1.5 },
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      />
                    ) : (
                      <Chip
                        label={`${product.price} ${product.currency || 'NOK'}`}
                        sx={{
                          bgcolor: 'rgba(255,184,0,0.25)',
                          color: '#ffb800',
                          fontSize: { xs: '15px', sm: '13px' },
                          fontWeight: 600,
                          height: { xs: '40px', sm: '32px' },
                          px: { xs: 2, sm: 1.5 },
                          border: '1px solid rgba(255,184,0,0.3)',
                        }}
                      />
                    )}
                    {/* Display tags in view mode */}
                    {product.tags && product.tags.length > 0 && product.tags.map((tag, i) => (
                      <Chip
                        key={`tag-${i}`}
                        label={tag}
                        sx={{
                          bgcolor: 'rgba(0,212,255,0.2)',
                          color: '#00d4ff',
                          fontSize: { xs: '15px', sm: '13px' },
                          fontWeight: 500,
                          height: { xs: '40px', sm: '32px' },
                          px: { xs: 2, sm: 1.5 },
                          border: '1px solid rgba(0,212,255,0.3)',
                        }}
                        aria-label={`Tag: ${tag}`}
                      />
                    ))}
                    {product.isInstalled && (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: { xs: 20, sm: 18 }, color: '#10b981' }} />}
                        label="Installert"
                        sx={{
                          bgcolor: 'rgba(16,185,129,0.25)',
                          color: '#10b981',
                          fontSize: { xs: '15px', sm: '13px' },
                          fontWeight: 600,
                          height: { xs: '40px', sm: '32px' },
                          px: { xs: 2, sm: 1.5 },
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      />
                    )}
                    {product.hasUpdate && (
                      <Chip
                        label="Oppdatering tilgjengelig"
                        sx={{
                          bgcolor: '#ffb800',
                          color: '#000',
                          fontSize: { xs: '15px', sm: '13px' },
                          fontWeight: 700,
                          height: { xs: '40px', sm: '32px' },
                          px: { xs: 2, sm: 1.5 },
                        }}
                      />
                    )}
                  </>
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1.5, sm: 1 },
                  mb: { xs: 3, sm: 2.5 },
                  flexWrap: 'wrap',
                }}
              >
                <Rating
                  value={product.rating}
                  readOnly
                  precision={0.5}
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': { color: '#ffb800' },
                    '& .MuiRating-iconEmpty': { color: 'rgba(255,255,255,0.6)' },
                    fontSize: { xs: '32px', sm: '28px' },
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    color: '#ffffff',
                    fontSize: { xs: '16px', sm: '15px' },
                    fontWeight: 500,
                  }}
                >
                  {product.rating} ({product.reviewCount} anmeldelser)
                </Typography>
              </Box>

              {isEditing ? (
                <TextField
                  label="Beskrivelse"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={6}
                  aria-label="Beskrivelse"
                  sx={{
                    mb: { xs: 3, sm: 2.5 },
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      fontSize: { xs: '16px', sm: '15px' },
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: { xs: '16px', sm: '14px' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#00d4ff' },
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    color: '#ffffff',
                    mb: { xs: 3, sm: 2.5 },
                    fontSize: { xs: '17px', sm: '16px' },
                    lineHeight: 1.7,
                    letterSpacing: '0.01em',
                  }}
                >
                  {product.description}
                </Typography>
              )}

              {/* Hva er nytt? Section */}
              {(isEditing ? editData.whatsNew : product.whatsNew) && (
                <Box
                  sx={{
                    mb: { xs: 3, sm: 2.5 },
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: 'rgba(0,212,255,0.1)',
                    borderRadius: { xs: 2, sm: 2.5 },
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#00d4ff',
                      fontSize: { xs: '18px', sm: '16px' },
                      fontWeight: 700,
                      mb: { xs: 1.5, sm: 1 },
                    }}
                  >
                    Hva er nytt?
                  </Typography>
                  {isEditing ? (
                    <TextField
                      value={editData.whatsNew}
                      onChange={(e) => setEditData({ ...editData, whatsNew: e.target.value })}
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Beskriv hva som er nytt i denne versjonen..."
                      aria-label="Hva er nytt"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          fontSize: { xs: '16px', sm: '15px' },
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '& fieldset': { borderColor: 'rgba(0,212,255,0.3)', borderWidth: 2 },
                          '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.5)' },
                          '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: 'rgba(255,255,255,0.87)',
                          opacity: 1,
                        },
                      }}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#ffffff',
                        fontSize: { xs: '16px', sm: '15px' },
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {product.whatsNew}
                    </Typography>
                  )}
                </Box>
              )}
              
              {isEditing && !editData.whatsNew && (
                <Box sx={{ mb: { xs: 3, sm: 2.5 } }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: '#00d4ff',
                      fontSize: { xs: '16px', sm: '14px' },
                      fontWeight: 600,
                      mb: { xs: 1.5, sm: 1 },
                    }}
                  >
                    Hva er nytt?
                  </Typography>
                  <TextField
                    value={editData.whatsNew || ''}
                    onChange={(e) => setEditData({ ...editData, whatsNew: e.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Beskriv hva som er nytt i denne versjonen..."
                    aria-label="Hva er nytt"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        fontSize: { xs: '16px', sm: '15px' },
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: { xs: '16px', sm: '14px' },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255,255,255,0.87)',
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
              )}

              <Box sx={{ mb: { xs: 3, sm: 2.5 } }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#00d4ff',
                    fontSize: { xs: '16px', sm: '14px' },
                    fontWeight: 600,
                    mb: { xs: 1.5, sm: 1 },
                  }}
                >
                  Forfatter
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.author.name}
                    onChange={(e) => setEditData({ ...editData, author: { ...editData.author, name: e.target.value } })}
                    fullWidth
                    aria-label="Forfatter"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        minHeight: { xs: '56px', sm: '48px' },
                        fontSize: { xs: '16px', sm: '15px' },
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                      },
                    }}
                  />
                ) : (
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#ffffff',
                      fontSize: { xs: '17px', sm: '16px' },
                      fontWeight: 500,
                    }}
                  >
                    {product.author.name}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: { xs: 3, sm: 2.5 } }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#00d4ff',
                    fontSize: { xs: '16px', sm: '14px' },
                    fontWeight: 600,
                    mb: { xs: 1.5, sm: 1 },
                  }}
                >
                  Versjon
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.version}
                    onChange={(e) => setEditData({ ...editData, version: e.target.value })}
                    fullWidth
                    aria-label="Versjon"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        minHeight: { xs: '56px', sm: '48px' },
                        fontSize: { xs: '16px', sm: '15px' },
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 2 },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
                      },
                    }}
                  />
                ) : (
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#ffffff',
                      fontSize: { xs: '17px', sm: '16px' },
                      fontWeight: 500,
                    }}
                  >
                    {product.version}
                    {product.isInstalled && product.installedVersion && (
                      <span style={{ opacity: 0.7 }}> (Installert: {product.installedVersion})</span>
                    )}
                  </Typography>
                )}
              </Box>

              {isEditing && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>
                      Valuta
                    </Typography>
                    <TextField
                      value={editData.currency}
                      onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>
                      Lisens
                    </Typography>
                    <TextField
                      value={editData.license}
                      onChange={(e) => setEditData({ ...editData, license: e.target.value })}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>
                      Utgivelsesdato
                    </Typography>
                    <TextField
                      type="date"
                      value={editData.releaseDate}
                      onChange={(e) => setEditData({ ...editData, releaseDate: e.target.value })}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1.5, fontSize: { xs: '16px', sm: '14px' } }}>
                      Thumbnail
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        style={{ display: 'none' }}
                        aria-label="Last opp thumbnail bilde"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => thumbnailInputRef.current?.click()}
                        aria-label="Last opp thumbnail bilde"
                        startIcon={<DownloadIcon />}
                        sx={{
                          color: '#00d4ff',
                          borderColor: '#00d4ff',
                          borderWidth: 2,
                          minHeight: { xs: '48px', sm: '44px', md: '40px' },
                          fontSize: { xs: '16px', sm: '14px' },
                          px: { xs: 2, sm: 1.5 },
                          py: { xs: 1.5, sm: 1 },
                          touchAction: 'manipulation',
                          flex: { xs: '1 1 auto', sm: '0 0 auto' },
                          '&:hover': {
                            borderColor: '#00b8e6',
                            bgcolor: 'rgba(0,212,255,0.1)',
                            borderWidth: 2,
                          },
                          '&:focus-visible': {
                            outline: '3px solid #00d4ff',
                            outlineOffset: '2px',
                          },
                          '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                            minHeight: '48px',
                            fontSize: '16px',
                            px: 2,
                            py: 1.5,
                          },
                        }}
                      >
                        Last opp bilde
                      </Button>
                      <TextField
                        value={editData.thumbnail}
                        onChange={(e) => setEditData({ ...editData, thumbnail: e.target.value })}
                        placeholder="Eller skriv inn URL"
                        fullWidth
                        size="small"
                        aria-label="Thumbnail URL"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            minHeight: { xs: '48px', sm: '44px', md: '40px' },
                            fontSize: { xs: '16px', sm: '15px' },
                            '& fieldset': {
                              borderColor: 'rgba(255,255,255,0.3)',
                              borderWidth: 2,
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255,255,255,0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#00d4ff',
                              borderWidth: 2,
                            },
                          },
                          '& .MuiInputBase-input::placeholder': {
                            color: 'rgba(255,255,255,0.87)',
                            opacity: 1,
                          },
                          '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                            '& .MuiOutlinedInput-root': {
                              minHeight: '48px',
                              fontSize: '16px',
                            },
                          },
                        }}
                      />
                    </Box>
                    {editData.thumbnail && (
                      <Box
                        sx={{
                          mt: 1.5,
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '2px solid rgba(255,255,255,0.1)',
                          maxWidth: '300px',
                        }}
                      >
                        <Box
                          component="img"
                          src={editData.thumbnail}
                          alt="Thumbnail forhåndsvisning"
                          sx={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ color: '#00d4ff', fontSize: { xs: '16px', sm: '14px' } }}>
                        Tags
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      {editData.tags.length > 0 ? (
                        editData.tags.map((tag, i) => (
                          <Chip
                            key={`${tag}-${i}`}
                            label={tag}
                            size="small"
                            onDelete={() => handleRemoveTag(i)}
                            aria-label={`Fjern tag ${tag}`}
                            sx={{
                              bgcolor: 'rgba(0,212,255,0.2)',
                              color: '#00d4ff',
                              height: { xs: '40px', sm: '36px', md: '32px' },
                              fontSize: { xs: '15px', sm: '14px', md: '13px' },
                              '& .MuiChip-deleteIcon': { 
                                color: '#ff4444',
                                fontSize: { xs: '20px', sm: '18px', md: '16px' },
                                width: { xs: '24px', sm: '22px', md: '20px' },
                                height: { xs: '24px', sm: '22px', md: '20px' },
                              },
                              '& .MuiChip-label': {
                                px: { xs: 2, sm: 1.5, md: 1 },
                              },
                              '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                                height: '40px',
                                fontSize: '15px',
                                '& .MuiChip-deleteIcon': {
                                  fontSize: '20px',
                                  width: '24px',
                                  height: '24px',
                                },
                                '& .MuiChip-label': {
                                  px: 2,
                                },
                              },
                            }}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', fontSize: { xs: '14px', sm: '13px' } }}>
                          Ingen tags lagt til
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        size="small"
                        placeholder="Skriv tag og trykk Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagInputKeyPress}
                        fullWidth
                        aria-label="Legg til tag"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            minHeight: { xs: '48px', sm: '44px', md: '40px' },
                            fontSize: { xs: '16px', sm: '15px' },
                            '& fieldset': { 
                              borderColor: 'rgba(255,255,255,0.3)',
                              borderWidth: 2,
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255,255,255,0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#00d4ff',
                              borderWidth: 2,
                            },
                          },
                          '& .MuiInputBase-input::placeholder': {
                            color: 'rgba(255,255,255,0.87)',
                            opacity: 1,
                          },
                          '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                            '& .MuiOutlinedInput-root': {
                              minHeight: '48px',
                              fontSize: '16px',
                            },
                          },
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim() || editData.tags.includes(tagInput.trim())}
                        aria-label="Legg til tag"
                        sx={{
                          color: '#00d4ff',
                          borderColor: '#00d4ff',
                          borderWidth: 2,
                          minHeight: { xs: '48px', sm: '44px', md: '40px' },
                          minWidth: { xs: '100px', sm: '90px', md: '80px' },
                          fontSize: { xs: '16px', sm: '14px' },
                          px: { xs: 2, sm: 1.5 },
                          py: { xs: 1.5, sm: 1 },
                          touchAction: 'manipulation',
                          '&:hover': { 
                            borderColor: '#00b8e6', 
                            bgcolor: 'rgba(0,212,255,0.1)',
                            borderWidth: 2,
                          },
                          '&:disabled': {
                            borderColor: 'rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.6)',
                          },
                          '&:focus-visible': {
                            outline: '3px solid #00d4ff',
                            outlineOffset: '2px',
                          },
                          '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                            minHeight: '48px',
                            minWidth: '100px',
                            fontSize: '16px',
                            px: 2,
                            py: 1.5,
                          },
                        }}
                      >
                        Legg til
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Tabs
          value={tabValue}
          onChange={(_, value) => setTabValue(value)}
          aria-label="Produktdetaljer tabs"
          sx={{
            mb: { xs: 3, sm: 2.5 },
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.87)',
              fontSize: { xs: '16px', sm: '14px' },
              fontWeight: 600,
              minHeight: { xs: '56px', sm: '48px' },
              textTransform: 'none',
              px: { xs: 2, sm: 1.5 },
              '&.Mui-selected': {
                color: '#00d4ff',
              },
              '&:focus-visible': {
                outline: '3px solid #00d4ff',
                outlineOffset: '2px',
                bgcolor: 'rgba(0,212,255,0.1)',
              },
              touchAction: 'manipulation',
              '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                minHeight: '64px',
                fontSize: '18px',
                px: 3,
                py: 2,
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#00d4ff',
              height: { xs: 4, sm: 3, md: 3 },
            },
          }}
        >
          <Tab 
            label="Funksjoner" 
            aria-controls="tabpanel-0" 
            id="tab-0"
            aria-selected={tabValue === 0}
            role="tab"
          />
          <Tab 
            label="Anmeldelser" 
            aria-controls="tabpanel-1" 
            id="tab-1"
            aria-selected={tabValue === 1}
            role="tab"
          />
          <Tab 
            label="Systemkrav" 
            aria-controls="tabpanel-2" 
            id="tab-2"
            aria-selected={tabValue === 2}
            role="tab"
          />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: '#00d4ff' }}>
                Funksjoner
              </Typography>
              {isEditing && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddFeature}
                  aria-label="Legg til funksjon"
                  sx={{
                    color: '#00d4ff',
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    minHeight: { xs: '48px', sm: '44px', md: '40px' },
                    minWidth: { xs: '120px', sm: '100px', md: '80px' },
                    fontSize: { xs: '16px', sm: '14px' },
                    px: { xs: 2, sm: 1.5 },
                    py: { xs: 1.5, sm: 1 },
                    touchAction: 'manipulation',
                    '&:hover': { 
                      borderColor: '#00b8e6', 
                      bgcolor: 'rgba(0,212,255,0.1)',
                      borderWidth: 2,
                    },
                    '&:focus-visible': {
                      outline: '3px solid #00d4ff',
                      outlineOffset: '2px',
                    },
                    '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                      minHeight: '48px',
                      minWidth: '120px',
                      fontSize: '16px',
                      px: 2,
                      py: 1.5,
                    },
                  }}
                >
                  Legg til
                </Button>
              )}
            </Box>
            <List>
              {(isEditing ? editData.features : product.features).map((feature, i) => (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={feature}
                    primaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.9)', fontSize: '14px' } }}
                  />
                  {isEditing && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFeature(i)}
                      sx={{ color: '#ff4444' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {tabValue === 1 && (
          <Box id="reviews-section">
            <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 2 }}>
              Anmeldelser ({reviews.length})
            </Typography>

            {reviews.length === 0 ? (
              <Box
                sx={{
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  mb: 3,
                  bgcolor: 'rgba(255,255,255,0.02)',
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
                  Ingen anmeldelser ennå
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', fontSize: { xs: '14px', sm: '13px' } }}>
                  Vær den første til å anmelde dette produktet!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mb: 3 }}>
                {/* Sort and filter options */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.87)', 
                      alignSelf: 'center',
                      fontSize: { xs: '14px', sm: '13px' },
                    }}
                  >
                    Sortert etter: Nyeste først
                  </Typography>
                </Box>
                
                <List sx={{ 
                  '& .MuiListItem-root': {
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                  },
                }}>
                  {[...reviews]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((review) => (
                    <ListItem 
                      key={review.id} 
                      sx={{ 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        py: { xs: 2.5, sm: 2 },
                        px: { xs: 2, sm: 1.5 },
                        bgcolor: 'rgba(255,255,255,0.02)',
                        borderRadius: 2,
                        mb: 2,
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.05)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5, width: '100%' }}>
                        <Avatar 
                          sx={{ 
                            width: { xs: 48, sm: 40 }, 
                            height: { xs: 48, sm: 40 }, 
                            bgcolor: '#00d4ff',
                            fontSize: { xs: '20px', sm: '18px' },
                            fontWeight: 700,
                          }}
                        >
                          {review.userName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#fff', 
                                fontWeight: 600,
                                fontSize: { xs: '16px', sm: '15px' },
                              }}
                            >
                              {review.userName}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'rgba(255,255,255,0.87)',
                                fontSize: { xs: '13px', sm: '12px' },
                              }}
                            >
                              {new Date(review.createdAt).toLocaleDateString('no-NO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                          </Box>
                          <Rating 
                            value={review.rating} 
                            readOnly 
                            size="small"
                            sx={{
                              '& .MuiRating-iconFilled': { 
                                color: '#ffb800',
                              },
                              '& .MuiRating-iconEmpty': { 
                                color: 'rgba(255,255,255,0.6)',
                              },
                              '& .MuiRating-icon': {
                                fontSize: { xs: '20px', sm: '18px' },
                              },
                            }}
                            aria-label={`${review.rating} av 5 stjerner`}
                          />
                        </Box>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.9)', 
                          mb: 1.5,
                          fontSize: { xs: '16px', sm: '15px' },
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {review.comment}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.87)',
                            minWidth: { xs: '40px', sm: '36px' },
                            minHeight: { xs: '40px', sm: '36px' },
                            '&:hover': { 
                              color: '#00d4ff',
                              bgcolor: 'rgba(0,212,255,0.1)',
                            },
                            touchAction: 'manipulation',
                          }}
                          aria-label="Nyttig anmeldelse"
                        >
                          <ThumbUpIcon fontSize="small" />
                        </IconButton>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.87)',
                            fontSize: { xs: '13px', sm: '12px' },
                          }}
                        >
                          {review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'personer'} fant dette nyttig
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 2 }}>
              Skriv anmeldelse
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    mb: 1.5,
                    fontSize: { xs: '16px', sm: '14px' },
                  }}
                >
                  Din vurdering
                </Typography>
                <Rating
                  value={reviewRating}
                  onChange={(_, value) => {
                    if (value !== null) {
                      setReviewRating(value);
                    }
                  }}
                  size="large"
                  sx={{
                    mb: 2,
                    '& .MuiRating-iconFilled': { 
                      color: '#ffb800',
                    },
                    '& .MuiRating-iconEmpty': { 
                      color: 'rgba(255,255,255,0.6)',
                    },
                    '& .MuiRating-icon': {
                      fontSize: { xs: '40px', sm: '36px', md: '32px' },
                      '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                        fontSize: '40px',
                      },
                    },
                    '& .MuiRating-icon:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                  aria-label="Vurder produkt"
                />
                {reviewRating > 0 && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.87)', 
                      mt: 0.5,
                      fontSize: { xs: '15px', sm: '14px' },
                    }}
                  >
                    {reviewRating === 1 && 'Dårlig'}
                    {reviewRating === 2 && 'Ganske dårlig'}
                    {reviewRating === 3 && 'Ok'}
                    {reviewRating === 4 && 'Bra'}
                    {reviewRating === 5 && 'Utmerket'}
                  </Typography>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Skriv din anmeldelse her..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                label="Din anmeldelse"
                aria-label="Skriv anmeldelse"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    fontSize: { xs: '16px', sm: '15px' },
                    minHeight: { xs: '120px', sm: '100px' },
                    '& fieldset': { 
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00d4ff',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.87)',
                    fontSize: { xs: '16px', sm: '14px' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#00d4ff',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.87)',
                    opacity: 1,
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleSubmitReview}
                disabled={!reviewComment.trim() || reviewRating === 0}
                aria-label="Send inn anmeldelse"
                fullWidth
                sx={{
                  bgcolor: '#00d4ff',
                  color: '#000',
                  fontSize: { xs: '18px', sm: '16px' },
                  fontWeight: 700,
                  minHeight: { xs: '56px', sm: '48px' },
                  py: { xs: 1.5, sm: 1.25 },
                  borderRadius: { xs: 3, sm: 2 },
                  textTransform: 'none',
                  touchAction: 'manipulation',
                  '&:hover': { 
                    bgcolor: '#00b8e6',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,212,255,0.4)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': { 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'not-allowed',
                  },
                  '&:focus-visible': {
                    outline: '3px solid #00d4ff',
                    outlineOffset: '2px',
                  },
                  '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
                    minHeight: '56px',
                    fontSize: '18px',
                    py: 1.5,
                  },
                }}
              >
                Legg til anmeldelse
              </Button>
            </Box>
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            {isEditing ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>
                    Minimum versjon
                  </Typography>
                  <TextField
                    value={editData.requirements.minVersion || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      requirements: { ...editData.requirements, minVersion: e.target.value },
                    })}
                    fullWidth
                    size="small"
                    placeholder="f.eks. 1.0.0"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff' }}>
                      Avhengigheter
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddDependency}
                      sx={{
                        color: '#00d4ff',
                        borderColor: '#00d4ff',
                        '&:hover': { borderColor: '#00b8e6', bgcolor: 'rgba(0,212,255,0.1)' },
                      }}
                    >
                      Legg til
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {(editData.requirements.dependencies || []).map((dep, i) => (
                      <Chip
                        key={i}
                        label={dep}
                        size="small"
                        onDelete={() => handleRemoveDependency(i)}
                        sx={{
                          bgcolor: 'rgba(0,212,255,0.2)',
                          color: '#00d4ff',
                          '& .MuiChip-deleteIcon': { color: '#ff4444' },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            ) : (
              <>
                {product.requirements ? (
                  <>
                    {product.requirements.minVersion && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 0.5 }}>
                          Minimum versjon
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                          {product.requirements.minVersion}
                        </Typography>
                      </Box>
                    )}
                    {product.requirements.dependencies && product.requirements.dependencies.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 0.5 }}>
                          Avhengigheter
                        </Typography>
                        {product.requirements.dependencies.map((dep, i) => (
                          <Chip
                            key={i}
                            label={dep}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              bgcolor: 'rgba(0,212,255,0.2)',
                              color: '#00d4ff',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                    Ingen spesielle systemkrav
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 3 },
          borderTop: '1px solid rgba(255,255,255,0.1)',
          gap: { xs: 1.5, sm: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          aria-label="Lukk dialog"
          fullWidth={false}
          sx={{
            color: 'rgba(255,255,255,0.9)',
            borderColor: 'rgba(255,255,255,0.3)',
            borderWidth: 2,
            fontSize: { xs: '16px', sm: '14px' },
            fontWeight: 600,
            minHeight: { xs: '56px', sm: '48px' },
            py: { xs: 1.5, sm: 1.25 },
            px: { xs: 3, sm: 2 },
            borderRadius: { xs: 3, sm: 2 },
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.5)',
              borderWidth: 2,
            },
            '&:focus-visible': {
              outline: '3px solid #00d4ff',
              outlineOffset: '2px',
            },
            '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
              minHeight: '56px',
              fontSize: '16px',
            },
          }}
        >
          Lukk
        </Button>
        <Button
          variant="contained"
          startIcon={
            product.hasUpdate ? (
              <UpdateIcon sx={{ fontSize: { xs: '24px', sm: '20px' } }} />
            ) : product.isInstalled ? (
              <DeleteIcon sx={{ fontSize: { xs: '24px', sm: '20px' } }} />
            ) : (
              <DownloadIcon sx={{ fontSize: { xs: '24px', sm: '20px' } }} />
            )
          }
          onClick={handleAction}
          aria-label={
            product.hasUpdate
              ? 'Oppdater produkt'
              : product.isInstalled
              ? 'Avinstaller produkt'
              : product.price === 0
              ? 'Installer produkt'
              : `Kjøp produkt for ${product.price} ${product.currency || 'NOK'}`
          }
          fullWidth={false}
          sx={{
            bgcolor: product.hasUpdate
              ? '#ffb800'
              : product.isInstalled
              ? '#ff4444'
              : '#00d4ff',
            color: '#000',
            fontSize: { xs: '18px', sm: '16px' },
            fontWeight: 700,
            minHeight: { xs: '64px', sm: '56px' },
            py: { xs: 2, sm: 1.5 },
            px: { xs: 3, sm: 2.5 },
            borderRadius: { xs: 3, sm: 2 },
            textTransform: 'none',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            '&:hover': {
              bgcolor: product.hasUpdate
                ? '#ffa000'
                : product.isInstalled
                ? '#cc0000'
                : '#00b8e6',
              boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:focus-visible': {
              outline: '3px solid #00d4ff',
              outlineOffset: '3px',
            },
            transition: 'all 0.2s ease',
            '@media (min-width: 768px) and (max-width: 1024px), (pointer: coarse)': {
              minHeight: '64px',
              fontSize: '18px',
              py: 2,
              px: 3,
            },
          }}
        >
          {product.hasUpdate
            ? 'Oppdater'
            : product.isInstalled
            ? 'Avinstaller'
            : product.price === 0
            ? 'Installer'
            : `Kjøp ${product.price} ${product.currency || 'NOK'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


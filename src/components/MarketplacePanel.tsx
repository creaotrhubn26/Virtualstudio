import {
  useState,
  useEffect } from 'react';
import Grid from '@mui/material/GridLegacy';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  IconButton,
  Tabs,
  Tab,
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
import {
  MarketplaceProduct,
  MarketplaceFilters,
  MarketplaceReleaseDashboardEntry,
  MarketplaceReleaseHistoryEntry,
} from '../core/models/marketplace';
import { marketplaceService } from '../services/marketplaceService';
import { marketplaceEnvironmentService } from '../services/marketplaceEnvironmentService';
import { getMarketplaceActor } from '../services/marketplaceActorService';
import {
  buildMarketplaceReleaseAudit,
  type MarketplaceReleaseAuditAction,
} from '../services/marketplaceReleaseAuditService';
import { MarketplaceProductCard } from './MarketplaceProductCard';
import { MarketplaceProductDetail } from './MarketplaceProductDetail';
interface MarketplacePanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function MarketplacePanel({ onClose, isFullscreen = false, onToggleFullscreen }: MarketplacePanelProps) {
  const [actor, setActor] = useState(() => getMarketplaceActor());
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
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [releaseFilter, setReleaseFilter] = useState<'all' | 'candidate' | 'ready' | 'blocked' | 'stable'>('all');
  const [releaseActionBusyId, setReleaseActionBusyId] = useState<string | null>(null);
  const [releaseFeedback, setReleaseFeedback] = useState<{
    severity: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [releaseDashboardEntries, setReleaseDashboardEntries] = useState<MarketplaceReleaseDashboardEntry[]>([]);
  const [releaseHistory, setReleaseHistory] = useState<MarketplaceReleaseHistoryEntry[]>([]);
  const [releaseDashboardError, setReleaseDashboardError] = useState<string | null>(null);
  const [releaseAuditState, setReleaseAuditState] = useState<{
    action: MarketplaceReleaseAuditAction;
    entry: MarketplaceReleaseDashboardEntry;
    targetVersion?: string | null;
  } | null>(null);
  const [releasePreviewMode, setReleasePreviewMode] = useState<'side_by_side' | 'diff' | 'blink' | 'heatmap'>('side_by_side');
  const [releaseBlinkFrame, setReleaseBlinkFrame] = useState<'before' | 'after'>('before');
  const releaseAudit = releaseAuditState
    ? buildMarketplaceReleaseAudit(releaseAuditState.entry, releaseAuditState.action, releaseAuditState.targetVersion)
    : null;

  async function loadReleaseDashboard() {
    if (!actor.isAdmin) {
      setReleaseDashboardEntries([]);
      setReleaseHistory([]);
      setReleaseDashboardError(null);
      return;
    }

    try {
      const dashboard = await marketplaceService.getReleaseDashboard();
      setReleaseDashboardEntries(dashboard.entries || []);
      setReleaseHistory(dashboard.recentHistory || []);
      setReleaseDashboardError(null);
    } catch (error) {
      setReleaseDashboardEntries([]);
      setReleaseHistory([]);
      setReleaseDashboardError(error instanceof Error ? error.message : 'Kunne ikke laste release-dashboardet.');
    }
  }

  useEffect(() => {
    loadProducts();
  }, [filters, searchQuery, ownershipFilter, releaseFilter, actor.userId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleMarketplaceProductsUpdated = () => {
      loadProducts();
      void loadReleaseDashboard();
    };
    window.addEventListener('vs-marketplace-products-updated', handleMarketplaceProductsUpdated);
    return () => {
      window.removeEventListener('vs-marketplace-products-updated', handleMarketplaceProductsUpdated);
    };
  }, [filters, searchQuery, ownershipFilter, releaseFilter, actor.userId, actor.isAdmin]);

  useEffect(() => {
    void marketplaceService.refreshRemoteProducts().then(() => {
      loadProducts();
      void loadReleaseDashboard();
    });
  }, []);

  useEffect(() => {
    void loadReleaseDashboard();
  }, [actor.isAdmin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleAuthSessionUpdated = () => {
      setActor(getMarketplaceActor());
    };
    window.addEventListener('auth-session-updated', handleAuthSessionUpdated);
    return () => {
      window.removeEventListener('auth-session-updated', handleAuthSessionUpdated);
    };
  }, []);

  useEffect(() => {
    if (
      !releaseAuditState
      || releasePreviewMode !== 'blink'
      || !releaseAudit?.previews.before.image
      || !releaseAudit?.previews.after.image
    ) {
      setReleaseBlinkFrame('before');
      return undefined;
    }

    setReleaseBlinkFrame('before');
    const intervalId = window.setInterval(() => {
      setReleaseBlinkFrame((current) => current === 'before' ? 'after' : 'before');
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [releaseAuditState, releasePreviewMode, releaseAudit?.previews.before.image, releaseAudit?.previews.after.image]);

  const loadProducts = () => {
    let result: MarketplaceProduct[];
    
    if (searchQuery.trim()) {
      result = marketplaceService.searchProducts(searchQuery);
    } else {
      result = marketplaceService.getProducts(filters);
    }

    if (ownershipFilter === 'mine') {
      result = result.filter((product) => product.registryMetadata?.ownerId === actor.userId);
    } else if (ownershipFilter === 'shared') {
      result = result.filter((product) => product.registryMetadata?.visibility === 'shared');
    }

    if (releaseFilter === 'candidate') {
      result = result.filter((product) => (product.registryMetadata?.releaseStatus || 'stable') === 'candidate');
    } else if (releaseFilter === 'ready') {
      result = result.filter((product) => (
        (product.registryMetadata?.releaseStatus || 'stable') === 'candidate'
        && product.environmentPackage?.qualityReport?.ready
      ));
    } else if (releaseFilter === 'blocked') {
      result = result.filter((product) => (
        (product.registryMetadata?.releaseStatus || 'stable') === 'candidate'
        && !product.environmentPackage?.qualityReport?.ready
      ));
    } else if (releaseFilter === 'stable') {
      result = result.filter((product) => (product.registryMetadata?.releaseStatus || 'stable') === 'stable');
    }
    
    setProducts(result);
  };

  const categories = marketplaceService.getCategories();
  const releaseSummary = marketplaceService.getReleaseQueueSummary();
  const releaseQueue = actor.isAdmin ? marketplaceService.getReleaseCandidateProducts().slice(0, 6) : [];
  const installedCount = products.filter(p => p.isInstalled).length;
  const updateProducts = products.filter(p => p.hasUpdate);
  const updateCount = updateProducts.length;
  const myPacksCount = marketplaceService.getAllProducts().filter((product) => product.registryMetadata?.ownerId === actor.userId).length;
  const sharedPacksCount = marketplaceService.getAllProducts().filter(
    (product) => product.registryMetadata?.visibility === 'shared',
  ).length;
  const updateSummary = updateProducts
    .slice(0, 3)
    .map((product) => {
      const latestStableVersion = product.registryMetadata?.latestStableVersion || product.version;
      return `${product.name} ${product.installedVersion || 'ukjent'} -> ${latestStableVersion}`;
    })
    .join(' • ');

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

  const handleShowUpdates = () => {
    setFilters((current) => ({
      ...current,
      installationStatus: 'has-update',
    }));
    setShowFilters(true);
  };

  const handleUpdateAll = async () => {
    const result = await marketplaceService.updateAllProducts(updateProducts.map((product) => product.id));
    loadProducts();
    if (result.updated > 0 && result.failed.length === 0) {
      alert(`${result.updated} pack${result.updated === 1 ? '' : 's'} oppdatert til siste stable-versjon.`);
      return;
    }
    if (result.updated > 0) {
      alert(`${result.updated} pack oppdatert, men ${result.failed.length} feilet.`);
      return;
    }
    alert('Kunne ikke oppdatere pakkene.');
  };

  const handleReleaseFilter = (nextFilter: 'all' | 'candidate' | 'ready' | 'blocked' | 'stable') => {
    setOwnershipFilter('shared');
    setReleaseFilter(nextFilter);
  };

  const handleApplyEnvironment = async (id: string) => {
    const result = await marketplaceEnvironmentService.applyInstalledPackageByProductId(id);
    if (result) {
      alert('Miljøpakken ble brukt i studioet.');
    } else {
      alert('Miljøpakken er ikke installert ennå.');
    }
  };

  const handleProductUpdated = (updatedProduct: MarketplaceProduct) => {
    loadProducts();
  };

  const openReleaseAudit = (
    entry: MarketplaceReleaseDashboardEntry,
    action: MarketplaceReleaseAuditAction,
    targetVersion?: string | null,
  ) => {
    setReleasePreviewMode('side_by_side');
    setReleaseBlinkFrame('before');
    setReleaseAuditState({ entry, action, targetVersion });
  };

  const closeReleaseAudit = () => {
    setReleaseAuditState(null);
    setReleasePreviewMode('side_by_side');
    setReleaseBlinkFrame('before');
  };

  const handlePromoteCandidate = async (product: MarketplaceProduct) => {
    if (!product.registryPermissions?.canPromote) {
      setReleaseFeedback({
        severity: 'info',
        message: 'Denne pakken kan ikke promoteres fra køen akkurat nå.',
      });
      return;
    }

    setReleaseActionBusyId(product.id);
    try {
      await marketplaceService.promoteEnvironmentPack(product.id);
      if (releaseFilter === 'ready') {
        setReleaseFilter('all');
      }
      setReleaseFeedback({
        severity: 'success',
        message: `"${product.name}" ble promotert til stable.`,
      });
      loadProducts();
      await loadReleaseDashboard();
    } catch (error) {
      setReleaseFeedback({
        severity: 'error',
        message: error instanceof Error ? error.message : 'Kunne ikke promotere kandidatpakken.',
      });
    } finally {
      setReleaseActionBusyId(null);
    }
  };

  const handleRollbackRelease = async (entry: MarketplaceReleaseDashboardEntry, targetVersion?: string | null) => {
    if (!entry.canRollback) {
      setReleaseFeedback({
        severity: 'info',
        message: 'Denne pakken har ingen tilgjengelig rollback-versjon akkurat nå.',
      });
      return;
    }

    setReleaseActionBusyId(entry.lineageId);
    try {
      await marketplaceService.rollbackEnvironmentPack(entry.lineageId, targetVersion || entry.rollbackTargetVersions[0] || null);
      setReleaseFeedback({
        severity: 'success',
        message: `"${entry.productName}" ble rullet tilbake til ${targetVersion || entry.rollbackTargetVersions[0] || 'forrige stable-versjon'}.`,
      });
      loadProducts();
      await loadReleaseDashboard();
    } catch (error) {
      setReleaseFeedback({
        severity: 'error',
        message: error instanceof Error ? error.message : 'Kunne ikke rulle tilbake miljøpakken.',
      });
    } finally {
      setReleaseActionBusyId(null);
    }
  };

  const handleConfirmReleaseAudit = async () => {
    if (!releaseAuditState) {
      return;
    }

    const { action, entry, targetVersion } = releaseAuditState;
    if (action === 'promote' && entry.currentCandidate) {
      await handlePromoteCandidate(entry.currentCandidate);
    } else if (action === 'rollback') {
      await handleRollbackRelease(entry, targetVersion);
    }
    closeReleaseAudit();
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
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 1, sm: 2 },
            p: { xs: 1.5, sm: 2, md: 2, lg: 2.5, xl: 3 },
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            bgcolor: '#1c2128',
          }}
        >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 }, 
          flex: 1, 
          maxWidth: { xs: '100%', sm: 400, md: 500, lg: 600, xl: 700 }, 
          mx: { xs: 0, sm: 2, md: 3 },
          order: { xs: 2, sm: 1 },
          width: { xs: '100%', sm: 'auto' },
        }}>
            <TextField
            placeholder="Søk produkter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.87)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.05)',
                fontSize: { xs: '14px', sm: '15px', md: '16px', lg: '16px', xl: '17px' },
                minHeight: { xs: '44px', sm: '46px', md: '48px', lg: '52px', xl: '56px' },
                borderRadius: { xs: '8px', md: '10px', xl: '12px' },
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#00d4ff' },
              },
            }}
          />
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 1 },
          order: { xs: 1, sm: 2 },
          ml: { xs: 'auto', sm: 0 },
        }}>
          <Chip
            label={`${installedCount} installert`}
            size="small"
            sx={{
              bgcolor: 'rgba(16,185,129,0.2)',
              color: '#10b981',
              fontSize: { xs: '10px', sm: '11px', md: '12px', xl: '13px' },
              height: { xs: '28px', sm: '30px', md: '32px' },
              display: { xs: 'none', sm: 'flex' },
            }}
          />
          {updateCount > 0 && (
            <Chip
              label={`${updateCount} oppdateringer`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,184,0,0.2)',
                color: '#ffb800',
                fontSize: { xs: '10px', sm: '11px', md: '12px', xl: '13px' },
                height: { xs: '28px', sm: '30px', md: '32px' },
                display: { xs: 'none', md: 'flex' },
              }}
            />
          )}
          <Chip
            label={`Mine packs ${myPacksCount}`}
            size="small"
            onClick={() => setOwnershipFilter((current) => current === 'mine' ? 'all' : 'mine')}
            sx={{
              bgcolor: ownershipFilter === 'mine' ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.08)',
              color: '#93c5fd',
              fontSize: { xs: '10px', sm: '11px', md: '12px', xl: '13px' },
              height: { xs: '28px', sm: '30px', md: '32px' },
              display: { xs: 'none', md: 'flex' },
              cursor: 'pointer',
            }}
          />
          <Chip
            label={`Delte ${sharedPacksCount}`}
            size="small"
            onClick={() => setOwnershipFilter((current) => current === 'shared' ? 'all' : 'shared')}
            sx={{
              bgcolor: ownershipFilter === 'shared' ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.08)',
              color: '#fcd34d',
              fontSize: { xs: '10px', sm: '11px', md: '12px', xl: '13px' },
              height: { xs: '28px', sm: '30px', md: '32px' },
              display: { xs: 'none', md: 'flex' },
              cursor: 'pointer',
            }}
          />
          <IconButton
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            sx={{ 
              color: 'rgba(255,255,255,0.87)',
              minWidth: { xs: '44px', sm: '46px', md: '48px', xl: '52px' },
              minHeight: { xs: '44px', sm: '46px', md: '48px', xl: '52px' },
              touchAction: 'manipulation',
            }}
          >
            {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
          </IconButton>
        </Box>
      </Box>
      )}

      {/* Tabs */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        bgcolor: '#1c2128',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, value) => handleCategoryChange(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: { xs: '48px', sm: '52px', md: '56px', xl: '64px' },
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.87)',
              textTransform: 'none',
              fontSize: { xs: '12px', sm: '13px', md: '14px', lg: '15px', xl: '16px' },
              minHeight: { xs: '44px', sm: '48px', md: '52px', lg: '56px', xl: '64px' },
              minWidth: { xs: '80px', sm: 'auto' },
              padding: { xs: '8px 12px', sm: '10px 14px', md: '12px 16px', xl: '14px 20px' },
              touchAction: 'manipulation',
              '&.Mui-selected': {
                color: '#00d4ff',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#00d4ff',
              height: { xs: '2px', md: '3px' },
            },
            '& .MuiTabs-scrollButtons': {
              color: 'rgba(255,255,255,0.87)',
              '&.Mui-disabled': { opacity: 0.3 },
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
            <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Pris</InputLabel>
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
            <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Sorter</InputLabel>
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
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            Skjul filtre
          </Button>
        </Box>
      )}

      {!showFilters && (
        <Box sx={{ p: 1, bgcolor: '#1c2128', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(true)}
              sx={{ color: 'rgba(255,255,255,0.87)' }}
            >
              Vis filtre
            </Button>
            <Chip
              label="Alle packs"
              size="small"
              onClick={() => setOwnershipFilter('all')}
              sx={{ bgcolor: ownershipFilter === 'all' ? '#374151' : '#1f2937', color: '#e5e7eb', cursor: 'pointer' }}
            />
            <Chip
              label="Mine packs"
              size="small"
              onClick={() => setOwnershipFilter('mine')}
              sx={{ bgcolor: ownershipFilter === 'mine' ? '#1d4ed8' : '#1f2937', color: '#dbeafe', cursor: 'pointer' }}
            />
            <Chip
              label="Delte packs"
              size="small"
              onClick={() => setOwnershipFilter('shared')}
              sx={{ bgcolor: ownershipFilter === 'shared' ? '#b45309' : '#1f2937', color: '#fef3c7', cursor: 'pointer' }}
            />
            {actor.isAdmin && (
              <>
                <Chip
                  label={`Candidates ${releaseSummary.candidateCount}`}
                  size="small"
                  data-testid="marketplace-chip-candidates"
                  onClick={() => handleReleaseFilter(releaseFilter === 'candidate' ? 'all' : 'candidate')}
                  sx={{ bgcolor: releaseFilter === 'candidate' ? '#b45309' : '#1f2937', color: '#fde68a', cursor: 'pointer' }}
                />
                <Chip
                  label={`Stable ${releaseSummary.stableCount}`}
                  size="small"
                  data-testid="marketplace-chip-stable"
                  onClick={() => handleReleaseFilter(releaseFilter === 'stable' ? 'all' : 'stable')}
                  sx={{ bgcolor: releaseFilter === 'stable' ? '#047857' : '#1f2937', color: '#bbf7d0', cursor: 'pointer' }}
                />
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: { xs: 1.5, sm: 2, md: 2, lg: 2.5, xl: 3 }, 
        minHeight: 0 
      }}>
        {releaseFeedback && (
          <Alert
            severity={releaseFeedback.severity}
            onClose={() => setReleaseFeedback(null)}
            sx={{ mb: 2 }}
          >
            {releaseFeedback.message}
          </Alert>
        )}
        {actor.isAdmin && releaseSummary.candidateCount > 0 && (
          <Alert
            severity={releaseSummary.blockedCandidateCount > 0 ? 'warning' : 'info'}
            data-testid="marketplace-release-queue"
            sx={{
              mb: 2,
              bgcolor: 'rgba(245,158,11,0.08)',
              color: '#fef3c7',
              border: '1px solid rgba(245,158,11,0.24)',
              '& .MuiAlert-icon': {
                color: '#fbbf24',
              },
            }}
            action={(
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant={releaseFilter === 'candidate' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-filter-candidate"
                  onClick={() => handleReleaseFilter(releaseFilter === 'candidate' ? 'all' : 'candidate')}
                  sx={{
                    borderColor: 'rgba(251,191,36,0.45)',
                    color: releaseFilter === 'candidate' ? '#111827' : '#fde68a',
                    bgcolor: releaseFilter === 'candidate' ? '#fbbf24' : 'transparent',
                  }}
                >
                  Kandidater
                </Button>
                <Button
                  size="small"
                  variant={releaseFilter === 'ready' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-filter-ready"
                  onClick={() => handleReleaseFilter(releaseFilter === 'ready' ? 'all' : 'ready')}
                  sx={{
                    borderColor: 'rgba(16,185,129,0.45)',
                    color: releaseFilter === 'ready' ? '#052e16' : '#bbf7d0',
                    bgcolor: releaseFilter === 'ready' ? '#34d399' : 'transparent',
                  }}
                >
                  Klare
                </Button>
                <Button
                  size="small"
                  variant={releaseFilter === 'blocked' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-filter-blocked"
                  onClick={() => handleReleaseFilter(releaseFilter === 'blocked' ? 'all' : 'blocked')}
                  sx={{
                    borderColor: 'rgba(248,113,113,0.45)',
                    color: releaseFilter === 'blocked' ? '#111827' : '#fecaca',
                    bgcolor: releaseFilter === 'blocked' ? '#f87171' : 'transparent',
                  }}
                >
                  Blokkert
                </Button>
              </Box>
            )}
          >
            <AlertTitle>Admin release-kø</AlertTitle>
            {releaseSummary.candidateCount} candidate-pack{releaseSummary.candidateCount === 1 ? '' : 's'} venter på vurdering.
            {` ${releaseSummary.readyCandidateCount} klare, ${releaseSummary.blockedCandidateCount} blokkerte, ${releaseSummary.warningCandidateCount} med advarsler.`}
          </Alert>
        )}
        {actor.isAdmin && releaseQueue.length > 0 && (
          <Box
            data-testid="marketplace-release-queue-list"
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(17,24,39,0.88)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                Candidate review
              </Typography>
              <Chip
                label={`${releaseSummary.candidateCount} i kø`}
                size="small"
                sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: '#fbbf24' }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {releaseQueue.map((product) => {
                const qualityReport = product.environmentPackage?.qualityReport ?? null;
                const isReady = Boolean(qualityReport?.ready);
                const warningCount = qualityReport?.warnings?.length || 0;
                const blockingCount = qualityReport?.blockingIssues?.length || 0;
                const queueEntry = releaseDashboardEntries.find((entry) => entry.lineageId === (product.registryMetadata?.lineageId || product.id.replace(/--candidate$/, '')));
                return (
                  <Box
                    key={product.id}
                    data-testid={`marketplace-release-row-${product.id}`}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0, flex: 1 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={`v${product.version}`}
                          sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}
                        />
                        <Chip
                          size="small"
                          label={isReady ? 'Klar' : 'Krever arbeid'}
                          sx={{
                            bgcolor: isReady ? 'rgba(16,185,129,0.18)' : 'rgba(248,113,113,0.16)',
                            color: isReady ? '#6ee7b7' : '#fecaca',
                          }}
                        />
                        {typeof qualityReport?.score === 'number' && (
                          <Chip
                            size="small"
                            label={`Score ${qualityReport.score.toFixed(2)}`}
                            sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#fde68a' }}
                          />
                        )}
                        {warningCount > 0 && (
                          <Chip
                            size="small"
                            label={`${warningCount} advarsel${warningCount === 1 ? '' : 'er'}`}
                            sx={{ bgcolor: 'rgba(250,204,21,0.14)', color: '#fde68a' }}
                          />
                        )}
                        {blockingCount > 0 && (
                          <Chip
                            size="small"
                            label={`${blockingCount} blokkering${blockingCount === 1 ? '' : 'er'}`}
                            sx={{ bgcolor: 'rgba(248,113,113,0.14)', color: '#fecaca' }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        data-testid={`marketplace-release-open-${product.id}`}
                        onClick={() => handleProductClick(product)}
                        sx={{ borderColor: 'rgba(255,255,255,0.24)', color: '#e5e7eb' }}
                      >
                        Åpne
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        data-testid={`marketplace-release-promote-${product.id}`}
                        disabled={!product.registryPermissions?.canPromote || !isReady || releaseActionBusyId === product.id}
                        onClick={() => {
                          if (queueEntry) {
                            openReleaseAudit(queueEntry, 'promote');
                            return;
                          }
                          handlePromoteCandidate(product);
                        }}
                        sx={{
                          bgcolor: '#10b981',
                          color: '#052e16',
                          '&:hover': { bgcolor: '#059669' },
                          '&.Mui-disabled': {
                            bgcolor: 'rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.4)',
                          },
                        }}
                      >
                        {releaseActionBusyId === product.id ? 'Promoterer...' : 'Promoter til stable'}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        {actor.isAdmin && releaseDashboardError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {releaseDashboardError}
          </Alert>
        )}
        {actor.isAdmin && releaseDashboardEntries.length > 0 && (
          <Box
            data-testid="marketplace-release-dashboard"
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(15,23,42,0.94)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>
              Release dashboard
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {releaseDashboardEntries.slice(0, 6).map((entry) => {
                const qualityReport = entry.qualityReport;
                const currentStable = entry.currentStable;
                const currentCandidate = entry.currentCandidate;
                const targetProduct = currentCandidate || currentStable;
                const changelog = entry.changelog || currentCandidate?.whatsNew || currentStable?.whatsNew || 'Ingen changelog registrert ennå.';
                return (
                  <Box
                    key={entry.lineageId}
                    data-testid={`marketplace-release-dashboard-entry-${entry.lineageId}`}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                        {entry.productName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                        {currentStable && (
                          <Chip
                            size="small"
                            label={`Stable ${currentStable.version}`}
                            sx={{ bgcolor: 'rgba(16,185,129,0.18)', color: '#bbf7d0' }}
                          />
                        )}
                        {currentCandidate && (
                          <Chip
                            size="small"
                            label={`Candidate ${currentCandidate.version}`}
                            sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: '#fde68a' }}
                          />
                        )}
                        {typeof qualityReport?.score === 'number' && (
                          <Chip
                            size="small"
                            label={`Score ${qualityReport.score.toFixed(2)}`}
                            sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Typography sx={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.92rem', mb: 1 }}>
                      {changelog}
                    </Typography>

                    {qualityReport && qualityReport.checks.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.25 }}>
                        {qualityReport.checks.map((check) => (
                          <Box
                            key={`${entry.lineageId}-${check.id}`}
                            sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}
                          >
                            <Chip
                              size="small"
                              label={check.status === 'passed' ? 'OK' : check.status === 'warning' ? 'Advarsel' : 'Feil'}
                              sx={{
                                bgcolor: check.status === 'passed'
                                  ? 'rgba(16,185,129,0.16)'
                                  : check.status === 'warning'
                                    ? 'rgba(245,158,11,0.16)'
                                    : 'rgba(248,113,113,0.16)',
                                color: check.status === 'passed'
                                  ? '#6ee7b7'
                                  : check.status === 'warning'
                                    ? '#fde68a'
                                    : '#fecaca',
                              }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ color: '#fff', fontSize: '0.88rem' }}>
                                {check.label}
                              </Typography>
                              {check.details && (
                                <Typography sx={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.8rem' }}>
                                  {check.details}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {entry.history.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.25 }}>
                        <Typography sx={{ color: '#e5e7eb', fontSize: '0.82rem', fontWeight: 600 }}>
                          Historikk
                        </Typography>
                        {entry.history.slice(0, 4).map((historyItem) => (
                          <Typography
                            key={historyItem.id}
                            sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}
                          >
                            {historyItem.action} • v{historyItem.version || 'ukjent'}
                            {historyItem.previousVersion ? ` • fra ${historyItem.previousVersion}` : ''}
                            {historyItem.actorName ? ` • ${historyItem.actorName}` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {targetProduct && (
                        <Button
                          size="small"
                          variant="outlined"
                          data-testid={`marketplace-release-dashboard-open-${entry.lineageId}`}
                          onClick={() => handleProductClick(targetProduct)}
                          sx={{ borderColor: 'rgba(255,255,255,0.24)', color: '#e5e7eb' }}
                        >
                          Åpne
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        data-testid={`marketplace-release-dashboard-audit-${entry.lineageId}`}
                        onClick={() => openReleaseAudit(entry, 'review')}
                        sx={{ borderColor: 'rgba(96,165,250,0.35)', color: '#bfdbfe' }}
                      >
                        Se audit
                      </Button>
                      {currentCandidate && (
                        <Button
                          size="small"
                          variant="contained"
                          data-testid={`marketplace-release-dashboard-promote-${entry.lineageId}`}
                          disabled={!currentCandidate.registryPermissions?.canPromote || !qualityReport?.ready || releaseActionBusyId === currentCandidate.id}
                          onClick={() => openReleaseAudit(entry, 'promote')}
                          sx={{
                            bgcolor: '#10b981',
                            color: '#052e16',
                            '&:hover': { bgcolor: '#059669' },
                            '&.Mui-disabled': {
                              bgcolor: 'rgba(255,255,255,0.12)',
                              color: 'rgba(255,255,255,0.4)',
                            },
                          }}
                        >
                          {releaseActionBusyId === currentCandidate.id ? 'Promoterer...' : 'Promoter'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        data-testid={`marketplace-release-dashboard-rollback-${entry.lineageId}`}
                        disabled={!entry.canRollback || releaseActionBusyId === entry.lineageId}
                        onClick={() => openReleaseAudit(entry, 'rollback', entry.rollbackTargetVersions[0] || null)}
                        sx={{
                          borderColor: 'rgba(248,113,113,0.35)',
                          color: '#fecaca',
                          '&.Mui-disabled': {
                            borderColor: 'rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.4)',
                          },
                        }}
                      >
                        {releaseActionBusyId === entry.lineageId ? 'Ruller tilbake...' : `Rollback${entry.rollbackTargetVersions[0] ? ` til ${entry.rollbackTargetVersions[0]}` : ''}`}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {releaseHistory.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                  Siste release-aktivitet
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {releaseHistory.slice(0, 6).map((historyItem) => (
                    <Typography
                      key={historyItem.id}
                      sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}
                    >
                      {historyItem.productName || historyItem.lineageId} • {historyItem.action} • v{historyItem.version || 'ukjent'}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        {updateCount > 0 && (
          <Alert
            severity="info"
            data-testid="marketplace-update-banner"
            sx={{
              mb: 2,
              bgcolor: 'rgba(0,212,255,0.08)',
              color: '#e0f2fe',
              border: '1px solid rgba(0,212,255,0.18)',
              '& .MuiAlert-icon': {
                color: '#38bdf8',
              },
            }}
            action={(
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  data-testid="marketplace-show-updates"
                  onClick={handleShowUpdates}
                  sx={{ borderColor: 'rgba(56,189,248,0.45)', color: '#bae6fd' }}
                >
                  Vis oppdateringer
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  data-testid="marketplace-update-all"
                  onClick={handleUpdateAll}
                  sx={{ bgcolor: '#f59e0b', color: '#111827', '&:hover': { bgcolor: '#d97706' } }}
                >
                  Last ned siste versjon
                </Button>
              </Box>
            )}
          >
            <AlertTitle>Nye stable-oppdateringer tilgjengelig</AlertTitle>
            {updateCount} installerte pack{updateCount === 1 ? '' : 's'} har en nyere stable-versjon klar i Marketplace.
            {updateSummary ? ` ${updateSummary}` : ''}
          </Alert>
        )}
        {products.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: { xs: 4, sm: 6, md: 8 },
              color: 'rgba(255,255,255,0.87)',
            }}
          >
            <SearchIcon sx={{ fontSize: { xs: 48, sm: 56, md: 64 }, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: '16px', sm: '18px', md: '20px' } }}>
              Ingen produkter funnet
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, fontSize: { xs: '13px', sm: '14px' } }}>
              {searchQuery ? 'Prøv et annet søkeord' : 'Ingen produkter i denne kategorien'}
              {ownershipFilter === 'mine' ? ' blant dine egne packs' : ownershipFilter === 'shared' ? ' blant delte packs' : ''}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2, lg: 2.5, xl: 3 }}>
            {products.map((product) => (
              <Grid
                item
                xs={12}
                sm={viewMode === 'grid' ? 6 : 12}
                md={viewMode === 'grid' ? 6 : 12}
                lg={viewMode === 'grid' ? 4 : 12}
                xl={viewMode === 'grid' ? 3 : 12}
                key={product.id}
              >
                <MarketplaceProductCard
                  product={product}
                  onProductClick={handleProductClick}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  onUpdate={handleUpdate}
                  onApplyEnvironment={handleApplyEnvironment}
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
          onApplyEnvironment={handleApplyEnvironment}
          onToggleFavorite={handleToggleFavorite}
          onProductUpdated={handleProductUpdated}
        />
      )}

      {releaseAuditState && releaseAudit && (
        <Dialog
          open
          onClose={closeReleaseAudit}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#111827',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {releaseAudit.title}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography data-testid="marketplace-release-audit-summary" sx={{ color: 'rgba(255,255,255,0.86)', mb: 2 }}>
              {releaseAudit.summary}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {releaseAudit.targetVersion && (
                <Chip
                  size="small"
                  label={`Målversjon ${releaseAudit.targetVersion}`}
                  sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }}
                />
              )}
              {typeof releaseAudit.scoreBefore === 'number' && (
                <Chip
                  size="small"
                  label={`Før ${releaseAudit.scoreBefore.toFixed(2)}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#e5e7eb' }}
                />
              )}
              {typeof releaseAudit.scoreAfter === 'number' && (
                <Chip
                  size="small"
                  label={`Etter ${releaseAudit.scoreAfter.toFixed(2)}`}
                  sx={{ bgcolor: 'rgba(16,185,129,0.18)', color: '#bbf7d0' }}
                />
              )}
            </Box>

            <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.75 }}>
              Changelog
            </Typography>
            <Typography data-testid="marketplace-release-audit-changelog" sx={{ color: 'rgba(255,255,255,0.78)', mb: 2 }}>
              {releaseAudit.changelog}
            </Typography>

            <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.75 }}>
              Før / etter
            </Typography>
            {releaseAudit.previews.before.image && releaseAudit.previews.after.image && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  mb: 1.25,
                  position: 'relative',
                  zIndex: 2,
                  pointerEvents: 'auto',
                }}
              >
                <Button
                  size="small"
                  variant={releasePreviewMode === 'side_by_side' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-audit-mode-side-by-side"
                  onClick={() => setReleasePreviewMode('side_by_side')}
                  sx={{
                    bgcolor: releasePreviewMode === 'side_by_side' ? '#2563eb' : 'transparent',
                    color: releasePreviewMode === 'side_by_side' ? '#eff6ff' : '#bfdbfe',
                    borderColor: 'rgba(96,165,250,0.35)',
                  }}
                >
                  Side ved side
                </Button>
                <Button
                  size="small"
                  variant={releasePreviewMode === 'diff' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-audit-mode-diff"
                  onClick={() => setReleasePreviewMode('diff')}
                  sx={{
                    bgcolor: releasePreviewMode === 'diff' ? '#7c3aed' : 'transparent',
                    color: releasePreviewMode === 'diff' ? '#f5f3ff' : '#ddd6fe',
                    borderColor: 'rgba(167,139,250,0.35)',
                  }}
                >
                  Diff
                </Button>
                <Button
                  size="small"
                  variant={releasePreviewMode === 'blink' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-audit-mode-blink"
                  onClick={() => setReleasePreviewMode('blink')}
                  sx={{
                    bgcolor: releasePreviewMode === 'blink' ? '#059669' : 'transparent',
                    color: releasePreviewMode === 'blink' ? '#ecfdf5' : '#bbf7d0',
                    borderColor: 'rgba(52,211,153,0.35)',
                  }}
                >
                  Blink
                </Button>
                <Button
                  size="small"
                  variant={releasePreviewMode === 'heatmap' ? 'contained' : 'outlined'}
                  data-testid="marketplace-release-audit-mode-heatmap"
                  onClick={() => setReleasePreviewMode('heatmap')}
                  sx={{
                    bgcolor: releasePreviewMode === 'heatmap' ? '#dc2626' : 'transparent',
                    color: releasePreviewMode === 'heatmap' ? '#fef2f2' : '#fecaca',
                    borderColor: 'rgba(248,113,113,0.4)',
                  }}
                >
                  Heatmap
                </Button>
              </Box>
            )}
            {releasePreviewMode === 'side_by_side' || !releaseAudit.previews.before.image || !releaseAudit.previews.after.image ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                  mb: 2,
                }}
              >
                {[releaseAudit.previews.before, releaseAudit.previews.after].map((preview, index) => (
                  <Box
                    key={`${preview.label}-${preview.version || index}`}
                    data-testid={index === 0 ? 'marketplace-release-audit-preview-before' : 'marketplace-release-audit-preview-after'}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                        {preview.label}
                      </Typography>
                      {preview.version && (
                        <Chip
                          size="small"
                          label={`v${preview.version}`}
                          sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }}
                        />
                      )}
                    </Box>
                    {preview.image ? (
                      <Box
                        component="img"
                        src={preview.image}
                        alt={`${preview.label} preview`}
                        sx={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid rgba(255,255,255,0.08)',
                          mb: 1,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: 1,
                          border: '1px dashed rgba(255,255,255,0.16)',
                          bgcolor: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '0.85rem',
                          mb: 1,
                        }}
                      >
                        Ingen preview tilgjengelig
                      </Box>
                    )}
                    <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
                      {preview.caption}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : releasePreviewMode === 'heatmap' && releaseAudit.heatmap.image ? (
              <Box
                data-testid="marketplace-release-audit-heatmap-surface"
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid rgba(248,113,113,0.28)',
                  bgcolor: '#020617',
                  mb: 2,
                }}
              >
                <Box
                  component="img"
                  src={releaseAudit.heatmap.image}
                  alt="Release audit heatmap preview"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box sx={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label="Heatmap-diff"
                    sx={{ bgcolor: 'rgba(220,38,38,0.82)', color: '#fff1f2' }}
                  />
                  <Chip
                    size="small"
                    label={releaseAudit.previews.before.label}
                    sx={{ bgcolor: 'rgba(15,23,42,0.78)', color: '#dbeafe' }}
                  />
                  <Chip
                    size="small"
                    label={releaseAudit.previews.after.label}
                    sx={{ bgcolor: 'rgba(15,23,42,0.78)', color: '#fecaca' }}
                  />
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'rgba(2,6,23,0.68)',
                    color: 'rgba(255,255,255,0.84)',
                    fontSize: '0.82rem',
                  }}
                >
                  {releaseAudit.heatmap.caption}
                </Box>
              </Box>
            ) : (
              <Box
                data-testid="marketplace-release-audit-compare-surface"
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  bgcolor: '#020617',
                  mb: 2,
                }}
              >
                <Box
                  component="img"
                  src={releaseAudit.previews.before.image || undefined}
                  alt={`${releaseAudit.previews.before.label} compare preview`}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  component="img"
                  src={releaseAudit.previews.after.image || undefined}
                  alt={`${releaseAudit.previews.after.label} compare preview`}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: releasePreviewMode === 'blink'
                      ? (releaseBlinkFrame === 'after' ? 1 : 0)
                      : 1,
                    mixBlendMode: releasePreviewMode === 'diff' ? 'difference' : 'normal',
                    transition: 'opacity 0.25s ease',
                  }}
                />
                <Box sx={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={releaseAudit.previews.before.label}
                    sx={{ bgcolor: 'rgba(15,23,42,0.78)', color: '#e5e7eb' }}
                  />
                  <Chip
                    size="small"
                    label={releaseAudit.previews.after.label}
                    sx={{ bgcolor: 'rgba(15,23,42,0.78)', color: '#bfdbfe' }}
                  />
                  {releasePreviewMode === 'blink' && (
                    <Chip
                      size="small"
                      data-testid="marketplace-release-audit-blink-indicator"
                      label={`Nå viser ${releaseBlinkFrame === 'before' ? releaseAudit.previews.before.label : releaseAudit.previews.after.label}`}
                      sx={{ bgcolor: 'rgba(5,150,105,0.85)', color: '#ecfdf5' }}
                    />
                  )}
                  {releasePreviewMode === 'diff' && (
                    <Chip
                      size="small"
                      label="Diff-visning"
                      sx={{ bgcolor: 'rgba(124,58,237,0.82)', color: '#f5f3ff' }}
                    />
                  )}
                </Box>
              </Box>
            )}

            <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.75 }}>
              Endringer
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {releaseAudit.changes.length > 0 ? releaseAudit.changes.map((change) => (
                <Box
                  key={change.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '160px 1fr 1fr' },
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontSize: '0.82rem', fontWeight: 600 }}>
                    {change.label}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                    {change.before}
                  </Typography>
                  <Typography sx={{ color: '#bfdbfe', fontSize: '0.82rem' }}>
                    {change.after}
                  </Typography>
                </Box>
              )) : (
                <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.85rem' }}>
                  Ingen strukturelle endringer ble funnet i audit-sammenligningen.
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', px: 3, py: 2 }}>
            <Button onClick={() => setReleaseAuditState(null)} sx={{ color: '#e5e7eb' }}>
              {releaseAuditState.action === 'review' ? 'Lukk' : 'Avbryt'}
            </Button>
            {releaseAuditState.action !== 'review' && (
              <Button
                variant="contained"
                data-testid="marketplace-release-audit-confirm"
                onClick={handleConfirmReleaseAudit}
                sx={{
                  bgcolor: releaseAuditState.action === 'rollback' ? '#ef4444' : '#10b981',
                  color: releaseAuditState.action === 'rollback' ? '#fff' : '#052e16',
                  '&:hover': {
                    bgcolor: releaseAuditState.action === 'rollback' ? '#dc2626' : '#059669',
                  },
                }}
              >
                {releaseAudit.actionLabel}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

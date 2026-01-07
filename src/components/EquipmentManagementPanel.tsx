import React, { useState, useMemo, useEffect, useId } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Grid,
  Tooltip,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  useTheme,
  useMediaQuery,
  Grow,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewModule as GridViewIcon,
  ViewList as TableViewIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Image as ImageIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { 
  Equipment, 
  equipmentApi, 
  equipmentBookingsApi, 
  equipmentAvailabilityApi, 
  EquipmentBooking,
  EquipmentAvailability,
  crewApi,
  locationsApi,
  CastingCrew,
  CastingLocation,
} from '../services/castingApiService';
import { useToast } from './ToastStack';

const TOUCH_TARGET_SIZE = 44;

const focusVisibleStyles = {
  '&:focus-visible': {
    outline: '3px solid #ff9800',
    outlineOffset: 2,
  },
};

type SortField = 'name' | 'category' | 'status' | 'condition' | 'quantity';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'table';

const STATUS_LABELS: Record<string, string> = {
  available: 'Tilgjengelig',
  in_use: 'I bruk',
  maintenance: 'Service',
  retired: 'Utfaset',
};

const STATUS_COLORS: Record<string, string> = {
  available: '#4caf50',
  in_use: '#2196f3',
  maintenance: '#ff9800',
  retired: '#9e9e9e',
};

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Utmerket',
  good: 'Bra',
  fair: 'Akseptabel',
  poor: 'Dårlig',
  needs_repair: 'Trenger reparasjon',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#4caf50',
  good: '#8bc34a',
  fair: '#ff9800',
  poor: '#f44336',
  needs_repair: '#d32f2f',
};

const CATEGORY_OPTIONS = [
  'Kamera',
  'Lys',
  'Lyd',
  'Stativ',
  'Optikk',
  'Strøm',
  'Transport',
  'Sikkerhet',
  'Annet',
];

interface EquipmentManagementPanelProps {
  projectId: string;
  onUpdate?: () => void;
}

export function EquipmentManagementPanel({ projectId, onUpdate }: EquipmentManagementPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const containerPadding = isMobile ? 2 : isTablet ? 3 : 4;

  const { showSuccess, showError } = useToast();

  const baseId = useId();
  const dialogTitleId = `${baseId}-dialog-title`;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    quantity: 1,
    condition: 'good' as Equipment['condition'],
    primaryLocationId: '',
    notes: '',
    imageUrl: '',
    status: 'available' as Equipment['status'],
  });

  const [crewMembers, setCrewMembers] = useState<CastingCrew[]>([]);
  const [locations, setLocations] = useState<CastingLocation[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEquipmentForAssign, setSelectedEquipmentForAssign] = useState<Equipment | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState('');

  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);
  const [selectedEquipmentBookings, setSelectedEquipmentBookings] = useState<Equipment | null>(null);
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [availability, setAvailability] = useState<EquipmentAvailability[]>([]);

  useEffect(() => {
    loadEquipment();
    loadCrewAndLocations();
  }, [projectId]);

  const loadEquipment = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await equipmentApi.getAll(projectId);
      setEquipment(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading equipment:', error);
      showError('Kunne ikke laste utstyr');
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewAndLocations = async () => {
    try {
      const [crewData, locationData] = await Promise.all([
        crewApi.getAll(projectId),
        locationsApi.getAll(projectId),
      ]);
      setCrewMembers(Array.isArray(crewData) ? crewData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
    } catch (error) {
      console.error('Error loading crew/locations:', error);
    }
  };

  const handleOpenDialog = (eq?: Equipment) => {
    if (eq) {
      setEditingEquipment(eq);
      setFormData({
        name: eq.name || '',
        description: eq.description || '',
        category: eq.category || '',
        brand: eq.brand || '',
        model: eq.model || '',
        serialNumber: eq.serial_number || '',
        quantity: eq.quantity || 1,
        condition: eq.condition || 'good',
        primaryLocationId: eq.primary_location_id || '',
        notes: eq.notes || '',
        imageUrl: eq.image_url || '',
        status: eq.status || 'available',
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        brand: '',
        model: '',
        serialNumber: '',
        quantity: 1,
        condition: 'good',
        primaryLocationId: '',
        notes: '',
        imageUrl: '',
        status: 'available',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Navn er påkrevd');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      brand: formData.brand,
      model: formData.model,
      serial_number: formData.serialNumber,
      quantity: formData.quantity,
      condition: formData.condition,
      primary_location_id: formData.primaryLocationId || undefined,
      notes: formData.notes,
      image_url: formData.imageUrl,
      status: formData.status,
      project_id: projectId,
    };

    try {
      if (editingEquipment) {
        await equipmentApi.update(editingEquipment.id, payload);
        showSuccess('Utstyr oppdatert');
      } else {
        await equipmentApi.create(payload);
        showSuccess('Utstyr opprettet');
      }
      setDialogOpen(false);
      loadEquipment();
      onUpdate?.();
    } catch (error) {
      console.error('Error saving equipment:', error);
      showError('Kunne ikke lagre utstyr');
    }
  };

  const handleDelete = async (eq: Equipment) => {
    if (!confirm(`Er du sikker på at du vil slette "${eq.name}"?`)) return;
    
    try {
      await equipmentApi.delete(eq.id);
      showSuccess('Utstyr slettet');
      loadEquipment();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      showError('Kunne ikke slette utstyr');
    }
  };

  const handleOpenAssign = (eq: Equipment) => {
    setSelectedEquipmentForAssign(eq);
    setSelectedCrewId('');
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedEquipmentForAssign || !selectedCrewId) return;
    
    try {
      await equipmentApi.assign(selectedEquipmentForAssign.id, selectedCrewId, 'responsible');
      showSuccess('Utstyrsansvarlig tilordnet');
      setAssignDialogOpen(false);
      loadEquipment();
    } catch (error) {
      console.error('Error assigning equipment:', error);
      showError('Kunne ikke tilordne ansvarlig');
    }
  };

  const handleUnassign = async (equipmentId: string, crewId: string) => {
    try {
      await equipmentApi.unassign(equipmentId, crewId);
      showSuccess('Tilordning fjernet');
      loadEquipment();
    } catch (error) {
      console.error('Error unassigning equipment:', error);
      showError('Kunne ikke fjerne tilordning');
    }
  };

  const handleOpenBookings = async (eq: Equipment) => {
    setSelectedEquipmentBookings(eq);
    setBookingsDialogOpen(true);
    try {
      const [bookingsData, availabilityData] = await Promise.all([
        equipmentBookingsApi.getAll(eq.id),
        equipmentAvailabilityApi.getAll(eq.id),
      ]);
      setBookings(bookingsData);
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const filteredEquipment = useMemo(() => {
    let filtered = [...equipment];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eq =>
        eq.name?.toLowerCase().includes(query) ||
        eq.description?.toLowerCase().includes(query) ||
        eq.brand?.toLowerCase().includes(query) ||
        eq.model?.toLowerCase().includes(query) ||
        eq.serial_number?.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(eq => eq.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(eq => eq.status === statusFilter);
    }
    
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [equipment, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  const categories = useMemo(() => {
    const cats = new Set(equipment.map(eq => eq.category).filter(Boolean));
    return Array.from(cats);
  }, [equipment]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getCrewName = (crewId: string) => {
    const crew = crewMembers.find(c => c.id === crewId);
    return crew?.name || 'Ukjent';
  };

  const getLocationName = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    return loc?.name || '';
  };

  return (
    <Box sx={{ p: containerPadding }}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', 
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BuildIcon sx={{ color: '#ff9800', fontSize: isDesktop ? 32 : 28 }} />
          <Typography variant="h5" sx={{ 
            fontWeight: 700, 
            color: '#fff',
            fontSize: isDesktop ? '1.5rem' : isTablet ? '1.25rem' : '1.1rem',
          }}>
            Utstyrskatalog ({filteredEquipment.length})
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <IconButton
            onClick={loadEquipment}
            sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            onClick={() => setFilterOpen(!filterOpen)}
            sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            <FilterIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            {viewMode === 'grid' ? <TableViewIcon /> : <GridViewIcon />}
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              bgcolor: '#ff9800',
              color: '#000',
              fontWeight: 600,
              minHeight: TOUCH_TARGET_SIZE,
              '&:hover': { bgcolor: '#f57c00' },
              ...focusVisibleStyles,
            }}
          >
            Nytt utstyr
          </Button>
        </Box>
      </Box>

      <Collapse in={filterOpen}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          mb: 3,
          p: 2,
          bgcolor: 'rgba(255,255,255,0.05)',
          borderRadius: 2,
        }}>
          <TextField
            placeholder="Søk utstyr..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.05)',
                color: '#fff',
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Kategori</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Kategori"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="all">Alle</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="all">Alle</MenuItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Collapse>

      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filteredEquipment.map((eq) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
              <Card sx={{
                bgcolor: '#1c2128',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#ff9800',
                  transform: 'translateY(-2px)',
                },
              }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#fff',
                      fontSize: isDesktop ? '1.1rem' : '1rem',
                    }}>
                      {eq.name}
                    </Typography>
                    <Chip
                      label={STATUS_LABELS[eq.status] || eq.status}
                      size="small"
                      sx={{
                        bgcolor: STATUS_COLORS[eq.status] || '#666',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                  
                  {eq.brand && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>
                      {eq.brand} {eq.model}
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    {eq.category && (
                      <Chip label={eq.category} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem' }} />
                    )}
                    <Chip
                      label={CONDITION_LABELS[eq.condition] || eq.condition}
                      size="small"
                      sx={{
                        bgcolor: CONDITION_COLORS[eq.condition] || '#666',
                        color: '#fff',
                        fontSize: '0.7rem',
                      }}
                    />
                  </Stack>
                  
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                    Antall: {eq.quantity}
                  </Typography>
                  
                  {eq.location_name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {eq.location_name}
                      </Typography>
                    </Box>
                  )}
                  
                  {eq.assignees && eq.assignees.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Ansvarlig:
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {eq.assignees.map((a, idx) => (
                          <Chip
                            key={idx}
                            label={getCrewName(a.crew_id)}
                            size="small"
                            icon={<PersonIcon sx={{ fontSize: 14 }} />}
                            onDelete={() => handleUnassign(eq.id, a.crew_id)}
                            sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: '#2196f3', fontSize: '0.7rem' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: 1, 
                  p: 1, 
                  borderTop: '1px solid rgba(255,255,255,0.1)' 
                }}>
                  <Tooltip title="Bookinger">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenBookings(eq)}
                      sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                    >
                      <ScheduleIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Tilordne ansvarlig">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenAssign(eq)}
                      sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                    >
                      <PersonIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rediger">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(eq)}
                      sx={{ ...focusVisibleStyles, minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Slett">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(eq)}
                      sx={{ ...focusVisibleStyles, color: '#f44336', minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: '#1c2128', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleSort('name')}
                    sx={{ color: '#fff', '&.Mui-active': { color: '#ff9800' } }}
                  >
                    Navn
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'category'}
                    direction={sortField === 'category' ? sortDirection : 'asc'}
                    onClick={() => handleSort('category')}
                    sx={{ color: '#fff', '&.Mui-active': { color: '#ff9800' } }}
                  >
                    Kategori
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Merke/Modell</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleSort('status')}
                    sx={{ color: '#fff', '&.Mui-active': { color: '#ff9800' } }}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Tilstand</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }} align="center">Antall</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Lokasjon</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }} align="right">Handlinger</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEquipment.map((eq) => (
                <TableRow key={eq.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell sx={{ color: '#fff' }}>{eq.name}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{eq.category || '-'}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {eq.brand} {eq.model}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[eq.status] || eq.status}
                      size="small"
                      sx={{ bgcolor: STATUS_COLORS[eq.status], color: '#fff', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={CONDITION_LABELS[eq.condition] || eq.condition}
                      size="small"
                      sx={{ bgcolor: CONDITION_COLORS[eq.condition], color: '#fff' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#fff' }}>{eq.quantity}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{eq.location_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenBookings(eq)} sx={focusVisibleStyles}>
                      <ScheduleIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenAssign(eq)} sx={focusVisibleStyles}>
                      <PersonIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenDialog(eq)} sx={focusVisibleStyles}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(eq)} sx={{ ...focusVisibleStyles, color: '#f44336' }}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredEquipment.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'rgba(255,255,255,0.5)' }}>
          <BuildIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">Ingen utstyr funnet</Typography>
          <Typography variant="body2">Legg til utstyr for å komme i gang</Typography>
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Grow}
        PaperProps={{ sx: { bgcolor: '#1c2128', color: '#fff', borderRadius: 2 } }}
      >
        <DialogTitle id={dialogTitleId} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BuildIcon sx={{ color: '#ff9800' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingEquipment ? 'Rediger utstyr' : 'Nytt utstyr'}
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} sx={focusVisibleStyles}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Navn *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Kategori</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Kategori"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Merke"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modell"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Serienummer"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Antall"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Equipment['status'] })}
                  label="Status"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Tilstand</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as Equipment['condition'] })}
                  label="Tilstand"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Lagerlokasjon</InputLabel>
                <Select
                  value={formData.primaryLocationId}
                  onChange={(e) => setFormData({ ...formData, primaryLocationId: e.target.value })}
                  label="Lagerlokasjon"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
                >
                  <MenuItem value="">Ingen</MenuItem>
                  {locations.map(loc => (
                    <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beskrivelse"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notater"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bilde-URL"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ImageIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            startIcon={<CancelIcon />}
            sx={{ color: 'rgba(255,255,255,0.6)', minHeight: TOUCH_TARGET_SIZE, ...focusVisibleStyles }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: '#ff9800',
              color: '#000',
              fontWeight: 600,
              minHeight: TOUCH_TARGET_SIZE,
              '&:hover': { bgcolor: '#f57c00' },
              ...focusVisibleStyles,
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Grow}
        PaperProps={{ sx: { bgcolor: '#1c2128', color: '#fff', borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon sx={{ color: '#2196f3' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Tilordne utstyrsansvarlig
            </Typography>
          </Box>
          <IconButton onClick={() => setAssignDialogOpen(false)} sx={focusVisibleStyles}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            Velg teammedlem som skal være ansvarlig for: <strong>{selectedEquipmentForAssign?.name}</strong>
          </Typography>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Velg teammedlem</InputLabel>
            <Select
              value={selectedCrewId}
              onChange={(e) => setSelectedCrewId(e.target.value)}
              label="Velg teammedlem"
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
            >
              {crewMembers.map(crew => (
                <MenuItem key={crew.id} value={crew.id}>
                  {crew.name} - {crew.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button
            onClick={() => setAssignDialogOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.6)', minHeight: TOUCH_TARGET_SIZE }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            disabled={!selectedCrewId}
            sx={{
              bgcolor: '#2196f3',
              color: '#fff',
              fontWeight: 600,
              minHeight: TOUCH_TARGET_SIZE,
              '&:hover': { bgcolor: '#1976d2' },
            }}
          >
            Tilordne
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bookingsDialogOpen}
        onClose={() => setBookingsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Grow}
        PaperProps={{ sx: { bgcolor: '#1c2128', color: '#fff', borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScheduleIcon sx={{ color: '#4caf50' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bookinger - {selectedEquipmentBookings?.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setBookingsDialogOpen(false)} sx={focusVisibleStyles}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {bookings.length === 0 && availability.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.5)' }}>
              <CheckCircleIcon sx={{ fontSize: 48, mb: 2, color: '#4caf50' }} />
              <Typography>Ingen aktive bookinger eller blokkeringer</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {bookings.map(booking => (
                <Box key={booking.id} sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(33, 150, 243, 0.1)', 
                  borderRadius: 1,
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {booking.purpose || 'Booking'}
                    </Typography>
                    <Chip
                      label={booking.status}
                      size="small"
                      sx={{ 
                        bgcolor: booking.status === 'confirmed' ? '#4caf50' : '#ff9800',
                        color: '#fff',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                    {booking.start_date} - {booking.end_date}
                  </Typography>
                </Box>
              ))}
              {availability.map(avail => (
                <Box key={avail.id} sx={{ 
                  p: 2, 
                  bgcolor: avail.status === 'service' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)', 
                  borderRadius: 1,
                  border: `1px solid ${avail.status === 'service' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {avail.status === 'service' ? (
                        <WarningIcon sx={{ color: '#ff9800' }} />
                      ) : (
                        <BlockIcon sx={{ color: '#f44336' }} />
                      )}
                      <Typography sx={{ fontWeight: 600 }}>
                        {avail.status === 'service' ? 'Service' : 'Utilgjengelig'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                    {avail.start_date} - {avail.end_date}
                  </Typography>
                  {avail.reason && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      Grunn: {avail.reason}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button
            onClick={() => setBookingsDialogOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.6)', minHeight: TOUCH_TARGET_SIZE }}
          >
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EquipmentManagementPanel;

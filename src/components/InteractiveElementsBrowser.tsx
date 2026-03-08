/**
 * Interactive Elements Browser
 * UI for placing and managing interactive 3D elements
 */

import {
  useState,
  useEffect,
  type FC,
  type ReactElement,
  type ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DoorFrontIcon from '@mui/icons-material/DoorFront';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SignpostIcon from '@mui/icons-material/Signpost';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import {
  interactiveElementsService,
  INTERACTIVE_ELEMENTS,
  InteractiveElementType,
  InteractiveElementConfig,
} from '../services/InteractiveElementsService';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%', overflow: 'auto' }}>
      {value === index && children}
    </div>
  );
}

const ElementCard: FC<{
  element: InteractiveElementConfig;
  onPlace: () => void;
}> = ({ element, onPlace }) => {
  const getIcon = () => {
    switch (element.type) {
      case 'door':
        return <DoorFrontIcon />;
      case 'light-switch':
        return <LightbulbIcon />;
      case 'neon-sign':
        return <SignpostIcon />;
      case 'ventilation-fan':
        return <AcUnitIcon />;
      default:
        return <AddIcon />;
    }
  };

  return (
    <Card
      sx={{
        bgcolor: '#1e1e1e',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: '#252525' },
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getIcon()}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
            {element.nameNo}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          {element.type}
        </Typography>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={onPlace}
          sx={{
            borderColor: '#00d4ff',
            color: '#00d4ff',
            '&:hover': { borderColor: '#00a8cc', bgcolor: 'rgba(0, 212, 255, 0.1)' },
          }}
        >
          Plasser
        </Button>
      </CardContent>
    </Card>
  );
};

export const InteractiveElementsBrowser: FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<InteractiveElementType | 'all'>('all');
  const [activeElements, setActiveElements] = useState<Map<string, any>>(new Map());
  const [positionDialog, setPositionDialog] = useState<{
    open: boolean;
    element?: InteractiveElementConfig;
  }>({ open: false });
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    // Initialize service
    const scene = (window as any).virtualStudio?.scene;
    if (scene) {
      interactiveElementsService.initialize(scene);
    }

    // Listen for element events
    const handleElementPlaced = (event: Event) => {
      const customEvent = event as CustomEvent;
      setActiveElements(new Map(interactiveElementsService.getActiveElements()));
    };

    const handleElementRemoved = (event: Event) => {
      setActiveElements(new Map(interactiveElementsService.getActiveElements()));
    };

    window.addEventListener('ie-element-placed', handleElementPlaced);
    window.addEventListener('ie-element-removed', handleElementRemoved);

    return () => {
      window.removeEventListener('ie-element-placed', handleElementPlaced);
      window.removeEventListener('ie-element-removed', handleElementRemoved);
    };
  }, []);

  const categories: { value: InteractiveElementType | 'all'; label: string; icon: ReactElement }[] = [
    { value: 'all', label: 'Alle', icon: <AddIcon /> },
    { value: 'door', label: 'Dører', icon: <DoorFrontIcon /> },
    { value: 'light-switch', label: 'Brytere', icon: <LightbulbIcon /> },
    { value: 'neon-sign', label: 'Neonskilt', icon: <SignpostIcon /> },
    { value: 'ventilation-fan', label: 'Vifter', icon: <AcUnitIcon /> },
    { value: 'flickering-light', label: 'Flimrende lys', icon: <LightbulbIcon /> },
  ];

  const filteredElements = INTERACTIVE_ELEMENTS.filter(e => {
    const matchesType = selectedType === 'all' || e.type === selectedType;
    const matchesSearch = !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.nameNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handlePlaceElement = (element: InteractiveElementConfig) => {
    setPositionDialog({ open: true, element });
    setPosition([0, 0, 0]);
  };

  const handleConfirmPlacement = () => {
    if (positionDialog.element) {
      interactiveElementsService.placeElement(
        positionDialog.element.id,
        position,
        undefined,
        positionDialog.element.options
      );
      setPositionDialog({ open: false });
    }
  };

  const handleRemoveElement = (instanceId: string) => {
    interactiveElementsService.removeElement(instanceId);
  };

  const handleInteract = (instanceId: string) => {
    interactiveElementsService.interactWithElement(instanceId);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#141414', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DoorFrontIcon sx={{ color: '#00d4ff' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Interaktive elementer</Typography>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Søk elementer..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1e1e1e',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            },
          }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', minHeight: 40 }}
      >
        <Tab label="Plasser" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab label={`Aktive (${activeElements.size})`} sx={{ minHeight: 40, fontSize: 12 }} />
      </Tabs>

      {/* Category Chips */}
      <Box sx={{ p: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <Chip
            key={cat.value}
            icon={cat.icon}
            label={cat.label}
            size="small"
            onClick={() => setSelectedType(cat.value)}
            sx={{
              bgcolor: selectedType === cat.value ? '#00d4ff' : '#252525',
              color: selectedType === cat.value ? '#000' : '#fff',
              '&:hover': { bgcolor: selectedType === cat.value ? '#00a8cc' : '#303030' },
            }}
          />
        ))}
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={1}>
            {filteredElements.map(element => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={element.id}>
                <ElementCard element={element} onPlace={() => handlePlaceElement(element)} />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {activeElements.size === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
              <Typography>Ingen aktive elementer</Typography>
              <Typography variant="caption">Plasser elementer fra "Plasser"-fanen</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Array.from(activeElements.entries()).map(([instanceId, mesh]) => (
                <Card key={instanceId} sx={{ bgcolor: '#1e1e1e' }}>
                  <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                        {mesh.metadata?.interactiveType || 'Element'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {instanceId}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleInteract(instanceId)}
                      sx={{ borderColor: '#00d4ff', color: '#00d4ff' }}
                    >
                      Bruk
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveElement(instanceId)}
                      sx={{ color: '#ff4444' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>
      </Box>

      {/* Position Dialog */}
      <Dialog
        open={positionDialog.open}
        onClose={() => setPositionDialog({ open: false })}
        PaperProps={{ sx: { bgcolor: '#1e1e1e', color: '#fff', minWidth: 400 } }}
      >
        <DialogTitle>Plasser {positionDialog.element?.nameNo}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="caption" gutterBottom>X-posisjon</Typography>
            <Slider
              value={position[0]}
              onChange={(_, v) => setPosition([v as number, position[1], position[2]])}
              min={-10}
              max={10}
              step={0.5}
              valueLabelDisplay="auto"
              sx={{ color: '#00d4ff' }}
            />
            <Typography variant="caption" gutterBottom sx={{ mt: 2, display: 'block' }}>Y-posisjon</Typography>
            <Slider
              value={position[1]}
              onChange={(_, v) => setPosition([position[0], v as number, position[2]])}
              min={0}
              max={5}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{ color: '#00d4ff' }}
            />
            <Typography variant="caption" gutterBottom sx={{ mt: 2, display: 'block' }}>Z-posisjon</Typography>
            <Slider
              value={position[2]}
              onChange={(_, v) => setPosition([position[0], position[1], v as number])}
              min={-10}
              max={10}
              step={0.5}
              valueLabelDisplay="auto"
              sx={{ color: '#00d4ff' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPositionDialog({ open: false })} sx={{ color: '#888' }}>
            Avbryt
          </Button>
          <Button onClick={handleConfirmPlacement} variant="contained" sx={{ bgcolor: '#00d4ff', color: '#000' }}>
            Plasser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteractiveElementsBrowser;

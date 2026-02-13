import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import View3DIcon from '@mui/icons-material/ViewInAr';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ErrorIcon from '@mui/icons-material/Error';
import { listMergedLibrary, type LibraryAsset } from '@/core/services/library';
import { getUserAssets } from '@/core/services/userLibrary';

interface Rodin3DGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (modelUrl: string, modelName: string, category?: string) => void;
}

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Rask (Lav)', description: '~30 sek', credits: '0.5' },
  { value: 'medium', label: 'Balansert (Medium)', description: '~60 sek', credits: '0.5' },
  { value: 'high', label: 'Detaljert (Høy)', description: '~90 sek', credits: '0.5' },
];

interface PromptSuggestion {
  prompt: string;
  category: string;
  label: string;
}

const PROMPT_SUGGESTIONS_BY_CATEGORY: Record<string, PromptSuggestion[]> = {
  light: [
    {
      prompt: 'Professional photography softbox, Profoto ProGlobe 120cm octagonal, 120cm diameter, 30cm depth, white diffusion fabric interior, black outer shell, aluminum frame with 8 ribs, Profoto mount, studio lighting modifier, exact dimensions 120x120x30cm, isolated on white background',
      category: 'light',
      label: 'Profoto ProGlobe 120cm',
    },
    {
      prompt: 'Professional photography softbox, Profoto OCF Softbox 2x3 feet, 60cm width, 90cm height, 25cm depth, white diffusion fabric, black outer shell, aluminum frame, Profoto mount, studio lighting equipment, exact dimensions 60x90x25cm, isolated on white background',
      category: 'light',
      label: 'Profoto Softbox 60x90cm',
    },
    {
      prompt: 'Professional photography softbox, Godox SZ120, 120cm square, 30cm depth, white diffusion fabric, black outer shell, aluminum frame, Bowens mount, studio lighting modifier, exact dimensions 120x120x30cm, isolated on white background',
      category: 'light',
      label: 'Godox SZ120 Softbox',
    },
    {
      prompt: 'Professional photography beauty dish, Profoto Beauty Dish White 65cm, 65cm diameter, 15cm depth, white matte interior, white outer shell, circular parabolic reflector, Profoto mount, studio portrait lighting, exact dimensions 65cm diameter x 15cm depth, isolated on white background',
      category: 'light',
      label: 'Profoto Beauty Dish 65cm',
    },
    {
      prompt: 'Professional photography beauty dish, Broncolor Para 88, 88cm diameter, 20cm depth, silver interior, white outer shell, Broncolor mount, studio lighting modifier, exact dimensions 88cm diameter x 20cm depth, isolated on white background',
      category: 'light',
      label: 'Broncolor Para 88',
    },
    {
      prompt: 'Professional photography stripbox, Profoto Stripbox 1x6 feet, 30cm width, 180cm height, 20cm depth, long narrow rectangular shape, black fabric exterior, white diffusion, studio rim light modifier, exact dimensions 30x180x20cm, isolated on white background',
      category: 'light',
      label: 'Profoto Stripbox 30x180cm',
    },
    {
      prompt: 'Professional photography octabox, Godox SZ60, 60cm diameter, 25cm depth, octagonal softbox, white diffusion fabric, black metal frame, Bowens mount, studio lighting modifier, exact dimensions 60cm diameter x 25cm depth, isolated on white background',
      category: 'light',
      label: 'Godox Octabox 60cm',
    },
    {
      prompt: 'Professional photography ring light, Profoto RingFlash RFi 2, 60cm outer diameter, 15cm inner diameter, 8cm depth, circular LED ring light, adjustable brightness, camera mount center, beauty lighting, exact dimensions 60cm outer x 15cm inner x 8cm depth, isolated on white background',
      category: 'light',
      label: 'Profoto RingFlash',
    },
    {
      prompt: 'Professional film lighting, Arri L7.5 LED Fresnel, 7.5cm lens diameter, 25cm housing length, 15cm width, adjustable focus lens, barn doors attached, black metal housing, professional film lighting equipment, exact dimensions 25x15x15cm, isolated on white background',
      category: 'light',
      label: 'Arri Fresnel L7.5',
    },
    {
      prompt: 'Professional photography umbrella, Profoto Umbrella Deep White M, 107cm diameter when open, 60cm closed length, white translucent fabric, shoot-through diffuser, metal ribs, studio lighting equipment, exact dimensions 107cm diameter, isolated on white background',
      category: 'light',
      label: 'Profoto Paraply 107cm',
    },
  ],
  stativ: [
    {
      prompt: 'Professional studio equipment stand, Matthews C-stand with turtle base, 200cm maximum height, 100cm base width, chrome steel construction, turtle base legs 60cm each, grip arm 60cm, gobo head knuckle, studio equipment stand, exact dimensions 200cm height x 100cm base, isolated on white background',
      category: 'stativ',
      label: 'Matthews C-Stand',
    },
    {
      prompt: 'Professional studio grip equipment, Avenger C-stand with boom arm, 200cm maximum height, 100cm base, 120cm extendable boom arm, 5kg counterweight, black steel, studio grip equipment, exact dimensions 200cm height x 120cm boom, isolated on white background',
      category: 'stativ',
      label: 'C-Stand m/Boom Arm',
    },
    {
      prompt: 'Professional photography light stand, Manfrotto 1005BAC, 300cm maximum height, 60cm minimum height, black aluminum, air cushioned, 3-section tripod base, foldable legs 60cm spread, studio equipment, exact dimensions 60-300cm adjustable height, isolated on white background',
      category: 'stativ',
      label: 'Manfrotto Lysstativ',
    },
    {
      prompt: 'Professional photography light stand, Godox ST-100, 200cm maximum height, 60cm minimum, portable tripod base, lightweight aluminum, foldable legs 50cm spread, black finish, studio equipment, exact dimensions 60-200cm adjustable, isolated on white background',
      category: 'stativ',
      label: 'Godox Lite Lysstativ',
    },
    {
      prompt: 'Professional studio overhead lighting mount, Avenger boom arm, 120cm extendable cantilever arm, 5kg counterweight, black metal construction, studio grip equipment, exact dimensions 120cm arm length, isolated on white background',
      category: 'stativ',
      label: 'Avenger Boom Arm',
    },
    {
      prompt: 'Professional studio equipment stand, Manfrotto 420B combi stand, 300cm maximum height, 3-section design, black aluminum, air cushioned, studio equipment stand, exact dimensions 60-300cm adjustable, isolated on white background',
      category: 'stativ',
      label: 'Manfrotto Combi Stand',
    },
  ],
  modifier: [
    {
      prompt: 'Professional photography reflector, Neewer 5-in-1 reflector disc, 110cm diameter, silver gold white black translucent surfaces, circular collapsible design, metal frame with 4 segments, studio lighting tool, exact dimensions 110cm diameter, isolated on white background',
      category: 'modifier',
      label: 'Reflektor 5-i-1 110cm',
    },
    {
      prompt: 'Professional photography reflector, Lastolite TriFlip 120cm, 120cm square, silver surface, aluminum frame, foldable design, studio fill light equipment, exact dimensions 120x120cm, isolated on white background',
      category: 'modifier',
      label: 'Lastolite Reflektor 120cm',
    },
    {
      prompt: 'Professional photography diffusion panel, Westcott Scrim Jim, 120cm width, 180cm height, white translucent fabric, rectangular aluminum frame, freestanding stand, studio soft light modifier, exact dimensions 120x180cm, isolated on white background',
      category: 'modifier',
      label: 'Westcott Diffusjonspanel',
    },
    {
      prompt: 'Professional studio grip equipment, Matthews flag blocker, 60cm width, 90cm height, black fabric on metal frame, light control tool, studio grip equipment, rectangular shape, exact dimensions 60x90cm, isolated on white background',
      category: 'modifier',
      label: 'Matthews Flag 60x90cm',
    },
    {
      prompt: 'Professional photography bounce flag, foamcore bounce flag, 120cm width, 180cm height, white foam board, freestanding stand, studio fill light tool, exact dimensions 120x180cm, isolated on white background',
      category: 'modifier',
      label: 'Bounce Flag 120x180cm',
    },
    {
      prompt: 'Professional photography light modifier, Profoto snoot, 15cm diameter opening, 30cm length, conical metal tube, focused spotlight beam, Profoto mount, black metal, studio lighting accessory, exact dimensions 15cm diameter x 30cm length, isolated on white background',
      category: 'modifier',
      label: 'Profoto Snoot',
    },
    {
      prompt: 'Professional photography light modifier, Profoto barn doors, four metal flaps 20cm each, adjustable light control, Profoto mount, studio lighting accessory, black metal construction, exact dimensions 20cm flap length, isolated on white background',
      category: 'modifier',
      label: 'Profoto Barn Doors',
    },
    {
      prompt: 'Professional photography light modifier, Profoto honeycomb grid 20 degree, 30cm diameter, hexagonal pattern, light control modifier, Profoto mount, studio lighting accessory, exact dimensions 30cm diameter, isolated on white background',
      category: 'modifier',
      label: 'Profoto Grid 20°',
    },
  ],
  furniture: [
    {
      prompt: 'Professional studio furniture, Matthews posing stool, 40cm round seat diameter, 50-80cm adjustable height, chrome base 50cm diameter, studio furniture, modern design, black cushion 5cm thick, exact dimensions 40cm seat x 50-80cm height, isolated on white background',
      category: 'furniture',
      label: 'Poseringskrakk 40cm',
    },
    {
      prompt: 'Professional studio furniture, director chair for photography studio, 40cm seat width, 40cm seat depth, 100cm back height, black canvas seat, wooden frame, foldable, professional set furniture, exact dimensions 40x40cm seat x 100cm height, isolated on white background',
      category: 'furniture',
      label: 'Regissørstol',
    },
    {
      prompt: 'Professional studio grip equipment, Matthews apple box set, full apple 20x30x40cm, half apple 20x30x20cm, quarter apple 20x30x10cm, wooden boxes, studio grip equipment, posing props, natural wood finish, exact dimensions as specified, isolated on white background',
      category: 'furniture',
      label: 'Apple Box Set',
    },
    {
      prompt: 'Professional photography furniture, side table, 60cm width, 40cm depth, 70cm height, white surface, minimalist design, product photography prop, metal legs 2cm diameter, studio furniture, exact dimensions 60x40x70cm, isolated on white background',
      category: 'furniture',
      label: 'Sidebord 60x40cm',
    },
    {
      prompt: 'Professional photography prop, posing cube, 30cm cube, white acrylic box, studio prop, product display stand, minimalist design, studio furniture, exact dimensions 30x30x30cm, isolated on white background',
      category: 'furniture',
      label: 'Poseringskube 30cm',
    },
    {
      prompt: 'Professional photography furniture, seamless photography table, 120cm width, 80cm depth, 75cm height, white seamless surface, metal frame, product photography furniture, exact dimensions 120x80x75cm, isolated on white background',
      category: 'furniture',
      label: 'Seamless Bord',
    },
  ],
  prop: [
    {
      prompt: 'Professional photography equipment, Canon EOS R5 camera on Manfrotto tripod, 15cm camera body width, 10cm height, 70-200mm telephoto lens 20cm length, carbon fiber tripod 150cm height, photography equipment, exact dimensions camera 15x10cm, lens 20cm, isolated on white background',
      category: 'prop',
      label: 'Canon EOS R5 på Stativ',
    },
    {
      prompt: 'Professional film equipment, SmallHD 702 monitor, 17cm width, 10cm height, 3cm depth, video reference display, adjustable mount, professional film equipment, black frame, studio equipment, exact dimensions 17x10x3cm, isolated on white background',
      category: 'prop',
      label: 'SmallHD Monitor',
    },
    {
      prompt: 'Professional studio electrical equipment, photography cable drum, 30cm diameter, 15cm width, orange power cable, professional studio electrical equipment, portable design, studio equipment, exact dimensions 30cm diameter x 15cm width, isolated on white background',
      category: 'prop',
      label: 'Kabeltrommel 30cm',
    },
    {
      prompt: 'Professional video equipment, Sony FX6 cinema camera, 15cm width, 12cm height, 25cm length with lens, black camera body, professional video equipment, studio equipment, exact dimensions 15x12x25cm, isolated on white background',
      category: 'prop',
      label: 'Sony FX6 Kamera',
    },
  ],
  bakgrunn: [
    {
      prompt: 'Professional photography studio background system, Savage seamless paper backdrop, 270cm width roll, white seamless paper, aluminum crossbar 270cm, photography studio background system, metal stand 200cm height, exact dimensions 270cm width roll, isolated on white background',
      category: 'bakgrunn',
      label: 'Papirrulle Hvit 270cm',
    },
    {
      prompt: 'Professional photography studio background system, Savage seamless paper backdrop, 270cm width roll, gray seamless background, studio photography equipment, metal stand 200cm height, exact dimensions 270cm width, isolated on white background',
      category: 'bakgrunn',
      label: 'Papirrulle Grå 270cm',
    },
    {
      prompt: 'Professional studio bounce reflector, Matthews V-flat, two hinged white foam boards, 120cm width, 240cm height each panel, studio bounce reflector, freestanding, exact dimensions 120x240cm per panel, isolated on white background',
      category: 'bakgrunn',
      label: 'V-Flat Hvit 120x240cm',
    },
    {
      prompt: 'Professional studio light control, Matthews V-flat black, two hinged black panels, 120cm width, 240cm height each, negative fill, studio light control, freestanding, exact dimensions 120x240cm per panel, isolated on white background',
      category: 'bakgrunn',
      label: 'V-Flat Svart 120x240cm',
    },
    {
      prompt: 'Professional photography backdrop, Lastolite collapsible background, 180cm width, 240cm height, white fabric, studio photography backdrop, foldable design, studio equipment, exact dimensions 180x240cm, isolated on white background',
      category: 'bakgrunn',
      label: 'Lastolite Bakgrunn',
    },
  ],
};

const CATEGORY_OPTIONS = [
  { value: 'furniture', label: 'Møbler', icon: '🪑' },
  { value: 'light', label: 'Lysutstyr', icon: '💡' },
  { value: 'modifier', label: 'Modifikatorer', icon: '🔧' },
  { value: 'prop', label: 'Props', icon: '📦' },
  { value: 'stativ', label: 'Stativ/Oppheng', icon: '📐' },
  { value: 'bakgrunn', label: 'Bakgrunn', icon: '🖼️' },
  { value: 'misc', label: 'Diverse', icon: '📎' },
];

const CATEGORY_LABELS: Record<string, string> = {
  furniture: 'Møbler',
  light: 'Lysutstyr',
  modifier: 'Modifikatorer',
  prop: 'Props',
  stativ: 'Stativ/Oppheng',
  bakgrunn: 'Bakgrunn',
  misc: 'Diverse',
  mobler: 'Møbler',
  lysutstyr: 'Lysutstyr',
  modifikator: 'Modifikatorer',
  props: 'Props',
};

export default function Rodin3DGeneratorDialog({
  open,
  onClose,
  onGenerated,
}: Rodin3DGeneratorDialogProps) {
  const theme = useTheme();
  // Detect orientation and screen size
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [prompt, setPrompt] = React.useState('');
  const [quality, setQuality] = React.useState('medium');
  const [category, setCategory] = React.useState('misc');
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [existingModels, setExistingModels] = React.useState<LibraryAsset[]>([]);
  const [modelsByCategory, setModelsByCategory] = React.useState<Record<string, LibraryAsset[]>>({});
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);

  // Responsive values based on orientation
  const dialogMaxWidth = isLandscape ? 'lg' : 'md';
  const dialogPadding = isLandscape ? 3 : 2.5;
  const contentPadding = isLandscape ? 3 : 2.5;
  const spacingValue = isLandscape ? 2.5 : 2;
  const scrollMaxHeight = isLandscape ? 300 : 250;
  // WCAG 2.2+ compliant font sizes (minimum 16px/1rem for body text)
  const fontSizeTitle = isLandscape ? '1.5rem' : '1.4rem'; // 24px / 22.4px
  const fontSizeBody = isLandscape ? '1.125rem' : '1.0625rem'; // 18px / 17px (above 16px minimum)
  const fontSizeSmall = isLandscape ? '1rem' : '1rem'; // 16px minimum (WCAG requirement)
  const inputHeight = isLandscape ? 64 : 60;
  const buttonHeight = isLandscape ? 56 : 52;

  // Load existing models when dialog opens
  React.useEffect(() => {
    if (open) {
      loadExistingModels();
    }
  }, [open]);

  const loadExistingModels = async () => {
    try {
      // Get both system and user props
      const systemProps = await listMergedLibrary('prop');
      const userProps = await getUserAssets('prop');
      const allProps = [...systemProps, ...userProps];

      setExistingModels(allProps);

      // Group by category
      const grouped: Record<string, LibraryAsset[]> = {};
      allProps.forEach((asset) => {
        const cat = asset.data?.category || 'misc';
        const normalizedCat = normalizeCategory(cat);
        if (!grouped[normalizedCat]) {
          grouped[normalizedCat] = [];
        }
        grouped[normalizedCat].push(asset);
      });

      setModelsByCategory(grouped);
      
      // Auto-expand category if it has items
      const categoriesWithItems = Object.keys(grouped).filter(cat => grouped[cat].length > 0);
      setExpandedCategories(categoriesWithItems);
    } catch (err) {
      console.error('Failed to load existing models:', err);
    }
  };

  const normalizeCategory = (cat: string): string => {
    const mapping: Record<string, string> = {
      mobler: 'furniture',
      lysutstyr: 'light',
      modifikator: 'modifier',
      modifikatorer: 'modifier',
      props: 'prop',
    };
    return mapping[cat.toLowerCase()] || cat.toLowerCase() || 'misc';
  };

  const getCategoryLabel = (cat: string): string => {
    return CATEGORY_LABELS[cat] || CATEGORY_LABELS[normalizeCategory(cat)] || cat;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setProgress(0);
    setError(null);
    setStatusMessage('Starter generering...');

    try {
      const filename = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 30);

      setStatusMessage('Sender til Hyper3D Rodin...');

      const response = await fetch('/api/rodin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          filename: filename,
          quality: quality,
          category: category,
        }),
      });

      const startResult = await response.json();

      if (!startResult.success || !startResult.subscription_key) {
        setError(startResult.error || 'Kunne ikke starte generering');
        setLoading(false);
        return;
      }

      const subscriptionKey = startResult.subscription_key;
      const taskUuid = startResult.task_uuid;
      setProgress(10);
      setStatusMessage('Genererer 3D-modell...');

      // Poll for status
      const maxAttempts = 60;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await fetch(`/api/rodin/status/${subscriptionKey}`);
        const statusResult = await statusResponse.json();
        
        if (!statusResult.success) {
          setError(statusResult.error || 'Status check failed');
          setLoading(false);
          return;
        }
        
        const jobStatus = statusResult.status || '';
        const jobProgress = statusResult.progress || 0;
        
        setProgress(Math.min(10 + (jobProgress * 0.8), 90));
        setStatusMessage(`Genererer... (${Math.round(jobProgress)}%)`);
        
        if (jobStatus === 'Done') {
          // Download the model
          setStatusMessage('Laster ned modell...');
          setProgress(95);
          
          const downloadResponse = await fetch(`/api/rodin/download/${taskUuid}?filename=${encodeURIComponent(filename)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          const downloadResult = await downloadResponse.json();

          if (!downloadResult.success) {
            setError(downloadResult.error || 'Download failed');
            setLoading(false);
            return;
          }
          
        setProgress(100);
        setStatusMessage('Modell generert!');

        setTimeout(() => {
            onGenerated(downloadResult.path, prompt, category);
          handleClose();
        }, 500);
          return;
        } else if (jobStatus === 'Failed') {
          setError('Generering feilet på serveren');
          setLoading(false);
          return;
        }
      }
      
      setError('Timeout: Generering tok for lang tid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nettverksfeil');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (event: { target: { value: unknown } }) => {
    setCategory(event.target.value as string);
  };

  const handleAccordionChange = (category: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategories((prev) =>
      isExpanded ? [...prev, category] : prev.filter((c) => c !== category)
    );
  };

  const handleClose = () => {
    if (loading) return;
    setPrompt('');
    setQuality('medium');
    setCategory('misc');
    setProgress(0);
    setStatusMessage('');
    setError(null);
    setExistingModels([]);
    setModelsByCategory({});
    setExpandedCategories([]);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string, suggestionCategory?: string) => {
    setPrompt(suggestion);
    if (suggestionCategory) {
      setCategory(suggestionCategory);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={dialogMaxWidth}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isLandscape ? '90vh' : '95vh',
          height: isLandscape ? '90vh' : '95vh',
          m: isMobile ? 0 : 2,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
        },
        '& .MuiDialog-paper': {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isLandscape ? '90vh' : '95vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: dialogPadding, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <View3DIcon sx={{ color: '#8b5cf6', fontSize: isLandscape ? 36 : 32, filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5))' }} />
          <Typography variant="h5" sx={{ fontSize: fontSizeTitle, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Generer 3D-modell
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          p: contentPadding, 
          bgcolor: 'rgba(0,0,0,0.2)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0, pr: 0.5 }}>
        <Stack spacing={spacingValue} sx={{ mt: 1 }}>
          <TextField
            label="Beskriv objektet du vil lage"
            placeholder="F.eks: Moderne studiolampe med metallstativ"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            fullWidth
            multiline
            rows={isLandscape ? 3 : 4}
            disabled={loading}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: 'rgba(0,0,0,0.3)',
                color: '#ffffff',
                borderRadius: 3,
                fontSize: fontSizeBody,
                minHeight: inputHeight,
                '& fieldset': {
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(139,92,246,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#8b5cf6',
                  borderWidth: 3, // WCAG: thicker focus indicator
                  boxShadow: '0 0 0 2px rgba(139,92,246,0.3)', // WCAG: additional focus indicator
                },
                '&:focus-visible': {
                  outline: '3px solid #8b5cf6',
                  outlineOffset: '2px',
                },
              },
              '& .MuiInputLabel-root': { 
                color: '#e0e0e0', // WCAG: improved contrast (was 0.7)
                fontSize: fontSizeSmall,
                fontWeight: 500,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#8b5cf6',
              },
              '& .MuiOutlinedInput-input': {
                py: isLandscape ? 2 : 2.5,
                px: 2,
                fontSize: fontSizeBody,
                lineHeight: 1.7,
              },
            }}
          />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 22, color: '#8b5cf6' }} />
              <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.1rem' }}>
                Forslag (trykk for å bruke):
            </Typography>
            </Box>
            <Box sx={{ 
              maxHeight: scrollMaxHeight, 
              overflowY: 'auto', 
              pr: 1.5,
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 4 },
              '&::-webkit-scrollbar-thumb': { 
                bgcolor: 'rgba(139,92,246,0.4)', 
                borderRadius: 4,
                '&:hover': { bgcolor: 'rgba(139,92,246,0.6)' }
              }
            }}>
              {Object.entries(PROMPT_SUGGESTIONS_BY_CATEGORY).map(([catKey, suggestions]) => (
                <Accordion
                  key={catKey}
                  defaultExpanded={catKey === 'light'}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    mb: 1.5,
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      margin: '0 0 12px 0',
                      bgcolor: 'rgba(139,92,246,0.1)',
                      borderColor: 'rgba(139,92,246,0.3)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.87)', fontSize: 28, transition: 'transform 0.2s' }} />}
                    sx={{
                      minHeight: 64,
                      px: 3,
                      py: 1.5,
                      '& .MuiAccordionSummary-content': {
                        margin: '12px 0',
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& .MuiAccordionSummary-expandIconWrapper': {
                          transform: 'scale(1.1)',
                        },
                      },
                      '&.Mui-expanded': {
                        '& .MuiAccordionSummary-expandIconWrapper': {
                          transform: 'rotate(180deg)',
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#ffffff', 
                          fontWeight: 600, 
                          fontSize: '1.05rem',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <span style={{ fontSize: '1.3rem', marginRight: 8 }}>
                          {CATEGORY_OPTIONS.find(opt => opt.value === catKey)?.icon}
                        </span>
                        {getCategoryLabel(catKey)}
                      </Typography>
                      <Chip
                        label={suggestions.length}
                        size="medium"
                        sx={{
                          bgcolor: 'rgba(139,92,246,0.3)',
                          color: '#a78bfa',
                          fontSize: '1rem', // WCAG: minimum 16px
                          fontWeight: 600,
                          height: 28,
                          minWidth: 36,
                          border: '1px solid rgba(139,92,246,0.4)',
                        }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 2, pb: 2.5, px: 2 }}>
                    <Stack spacing={1.5}>
                      {suggestions.map((suggestion, idx) => (
                        <Box
                          key={idx}
                          onClick={() => {
                            if (!loading) {
                              setPrompt(suggestion.prompt);
                              setCategory(suggestion.category);
                            }
                          }}
                          sx={{
                            width: '100%',
                            minHeight: 64,
                            py: 2,
                            px: 3,
                            bgcolor: 'rgba(0,0,0,0.4)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 4,
                              bgcolor: 'transparent',
                              transition: 'all 0.2s',
                            },
                    '&:hover': {
                              bgcolor: 'rgba(139,92,246,0.2)',
                              borderColor: '#8b5cf6',
                              transform: 'translateX(4px)',
                              boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
                              '&::before': {
                                bgcolor: '#8b5cf6',
                              },
                              '& .suggestion-icon': {
                                transform: 'scale(1.1)',
                                color: '#a78bfa',
                              },
                              '& .suggestion-text': {
                                color: '#ffffff',
                                fontWeight: 600,
                              },
                            },
                            '&:active': {
                              transform: 'translateX(2px) scale(0.98)',
                              boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
                            },
                            ...(loading && {
                              opacity: 0.5,
                              pointerEvents: 'none',
                            }),
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <AutoAwesomeIcon 
                              className="suggestion-icon"
                              sx={{ 
                                fontSize: 24, 
                                color: 'rgba(139,92,246,0.6)',
                                transition: 'all 0.2s',
                              }} 
                            />
                            <Typography 
                              className="suggestion-text"
                              sx={{ 
                                color: '#e0e0e0',
                                fontSize: '1.05rem',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                transition: 'all 0.2s',
                              }}
                            >
                              {suggestion.label}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'rgba(139,92,246,0.4)',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: '#8b5cf6',
                                transform: 'scale(1.2)',
                    },
                  }}
                />
                        </Box>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>

          <Stack direction={isLandscape ? 'row' : 'column'} spacing={2}>
          <FormControl fullWidth disabled={loading}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.87)', fontSize: fontSizeSmall, fontWeight: 500 }}>Kvalitet</InputLabel>
            <Select
              value={quality}
              label="Kvalitet"
              onChange={(e) => setQuality(e.target.value)}
              sx={{
                  bgcolor: 'rgba(0,0,0,0.3)',
                color: '#ffffff',
                  borderRadius: 3,
                  minHeight: inputHeight,
                  '& .MuiOutlinedInput-notchedOutline': { 
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 2,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(139,92,246,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#8b5cf6',
                    borderWidth: 3, // WCAG: thicker focus indicator
                    boxShadow: '0 0 0 2px rgba(139,92,246,0.3)', // WCAG: additional focus indicator
                  },
                  '&:focus-visible': {
                    outline: '3px solid #8b5cf6',
                    outlineOffset: '2px',
                  },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.87)', fontSize: isLandscape ? 36 : 32 },
                  '& .MuiSelect-select': {
                    py: isLandscape ? 1.5 : 2,
                    px: 2,
                    fontSize: fontSizeBody,
                  },
              }}
            >
              {QUALITY_OPTIONS.map((opt) => (
                  <MenuItem 
                    key={opt.value} 
                    value={opt.value}
                    sx={{
                      minHeight: isLandscape ? 52 : 56,
                      py: isLandscape ? 1.5 : 2,
                      fontSize: fontSizeBody,
                      fontWeight: 500,
                      '&:hover': {
                        bgcolor: 'rgba(139,92,246,0.15)',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(139,92,246,0.25)',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: 'rgba(139,92,246,0.3)',
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>{opt.label}</span>
                        <Typography variant="body2" sx={{ color: '#d0d0d0', ml: 2, fontSize: '1rem', lineHeight: 1.6 }}>
                      {opt.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

            <FormControl fullWidth disabled={loading}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.87)', fontSize: fontSizeSmall, fontWeight: 500 }}>Kategori</InputLabel>
              <Select
                value={category}
                label="Kategori"
                onChange={handleCategoryChange}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.3)',
                  color: '#ffffff',
                  borderRadius: 3,
                  minHeight: inputHeight,
                  '& .MuiOutlinedInput-notchedOutline': { 
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 2,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(139,92,246,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#8b5cf6',
                    borderWidth: 3, // WCAG: thicker focus indicator
                    boxShadow: '0 0 0 2px rgba(139,92,246,0.3)', // WCAG: additional focus indicator
                  },
                  '&:focus-visible': {
                    outline: '3px solid #8b5cf6',
                    outlineOffset: '2px',
                  },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.87)', fontSize: isLandscape ? 36 : 32 },
                  '& .MuiSelect-select': {
                    py: isLandscape ? 1.5 : 2,
                    px: 2,
                    fontSize: fontSizeBody,
                  },
                }}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <MenuItem 
                    key={opt.value} 
                    value={opt.value}
                    sx={{
                      minHeight: isLandscape ? 52 : 56,
                      py: isLandscape ? 1.5 : 2,
                      fontSize: fontSizeBody,
                      fontWeight: 500,
                      '&:hover': {
                        bgcolor: 'rgba(139,92,246,0.15)',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(139,92,246,0.25)',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: 'rgba(139,92,246,0.3)',
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: '1.4rem' }}>{opt.icon}</span>
                      <span style={{ fontWeight: 500 }}>{opt.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Divider sx={{ my: 1, borderColor: '#3a3a3a' }} />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AddCircleOutlineIcon sx={{ fontSize: isLandscape ? 26 : 22, color: '#8b5cf6', filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }} />
              <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.1rem' }}>
                Ny modell som genereres:
              </Typography>
            </Box>
            <Box
              sx={{
                p: isLandscape ? 3 : 2.5,
                bgcolor: 'rgba(139,92,246,0.1)',
                borderRadius: 3,
                border: '2px solid rgba(139,92,246,0.3)',
                boxShadow: '0 4px 12px rgba(139,92,246,0.15)',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'rgba(139,92,246,0.5)',
                  boxShadow: '0 6px 16px rgba(139,92,246,0.25)',
                },
              }}
            >
              <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 500, mb: 1.5, fontSize: fontSizeBody, lineHeight: 1.6 }}>
                {prompt || '(Ingen beskrivelse enda)'}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2, mb: 1.5 }}>
                <Chip
                  label={CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label || category}
                  size="medium"
                  sx={{
                    bgcolor: 'rgba(139,92,246,0.25)',
                    color: '#e0e0e0',
                    fontSize: fontSizeSmall,
                    fontWeight: 500,
                    height: 36,
                    px: 1.5,
                  }}
                />
                <Chip
                  label={QUALITY_OPTIONS.find((opt) => opt.value === quality)?.label || quality}
                  size="medium"
                  sx={{
                    bgcolor: 'rgba(139,92,246,0.25)',
                    color: '#e0e0e0',
                    fontSize: fontSizeSmall,
                    fontWeight: 500,
                    height: 36,
                    px: 1.5,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mt: 1.5, display: 'block', fontSize: fontSizeSmall }}>
                Vil bli lagt til i: <strong style={{ color: '#a78bfa' }}>{getCategoryLabel(category)}</strong>
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1, borderColor: '#3a3a3a' }} />

          <Box>
            <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 2.5, fontWeight: 600, fontSize: '1.1rem' }}>
              Eksisterende modeller i Studio Library:
            </Typography>
            <Box sx={{ 
              maxHeight: scrollMaxHeight, 
              overflowY: 'auto', 
              pr: 1.5,
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 4 },
              '&::-webkit-scrollbar-thumb': { 
                bgcolor: 'rgba(139,92,246,0.4)', 
                borderRadius: 4,
                '&:hover': { bgcolor: 'rgba(139,92,246,0.6)' }
              }
            }}>
              {Object.keys(modelsByCategory).length === 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', fontStyle: 'italic', p: 3, display: 'block', fontSize: fontSizeSmall, textAlign: 'center' }}>
                  Ingen modeller i biblioteket enda
                </Typography>
              ) : (
                Object.entries(modelsByCategory)
                  .sort(([a], [b]) => {
                    // Sort by count (descending), then alphabetically
                    const countA = modelsByCategory[a].length;
                    const countB = modelsByCategory[b].length;
                    if (countA !== countB) return countB - countA;
                    return getCategoryLabel(a).localeCompare(getCategoryLabel(b));
                  })
                  .map(([cat, models]) => (
                    <Accordion
                      key={cat}
                      expanded={expandedCategories.includes(cat)}
                      onChange={handleAccordionChange(cat)}
                      sx={{
                        bgcolor: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        mb: 1,
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': {
                          margin: '0 0 8px 0',
                          bgcolor: 'rgba(139,92,246,0.1)',
                          borderColor: 'rgba(139,92,246,0.3)',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.87)', fontSize: 24 }} />}
                        sx={{
                          minHeight: 56,
                          px: 2,
                          py: 1,
                          '& .MuiAccordionSummary-content': {
                            margin: '12px 0',
                          },
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
                            {getCategoryLabel(cat)}
                          </Typography>
                          <Chip
                            label={models.length}
                            size="small"
                            sx={{
                              bgcolor: '#3a3a3a',
                              color: '#cccccc',
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                        <List dense sx={{ p: 0 }}>
                          {models.map((model) => (
                            <ListItem
                              key={model.id}
                              sx={{
                                py: 0.5,
                                px: 1,
                                borderRadius: 0.5,
                                '&:hover': {
                                  bgcolor: '#3a3a3a',
                                },
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="caption" sx={{ color: '#ffffff', fontSize: 11 }}>
                                    {model.title}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" sx={{ color: '#666666', fontSize: 9 }}>
                                    {model.id.startsWith('user_,') ? 'Egen modell' : 'System'}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))
              )}
            </Box>
          </Box>

          {loading && (
            <Box sx={{ mt: 3, p: 2.5, bgcolor: 'rgba(139,92,246,0.1)', borderRadius: 2, border: '1px solid rgba(139,92,246,0.2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500, fontSize: '1rem', lineHeight: 1.6 }}>
                  {statusMessage || 'Genererer...'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a78bfa', fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 }}>
                  {Math.round(progress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: 'rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#8b5cf6',
                    borderRadius: 5,
                    backgroundImage: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
                    boxShadow: '0 0 10px rgba(139,92,246,0.5)',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                }}
              />
            </Box>
          )}

          {error && (
            <Alert 
              severity="error" 
              icon={<ErrorIcon sx={{ fontSize: 24 }} />}
              sx={{ 
                bgcolor: 'rgba(211,47,47,0.15)', 
                color: '#ff6b6b',
                border: '1px solid rgba(211,47,47,0.3)',
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: '#ff6b6b',
                },
                '& .MuiAlert-message': {
                  fontSize: '1rem', // WCAG: minimum 16px
                  fontWeight: 500,
                },
              }}
            >
              {error}
            </Alert>
          )}
        </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: dialogPadding, pt: 2, gap: 2, bgcolor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)', flexDirection: isLandscape ? 'row' : 'column', '& > *': { width: isLandscape ? 'auto' : '100%' } }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          sx={{ 
            minHeight: buttonHeight, 
            minWidth: isLandscape ? 140 : 120,
            px: isLandscape ? 4 : 3,
            fontSize: fontSizeSmall,
            fontWeight: 500,
            borderRadius: 2,
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.4)',
              bgcolor: 'rgba(255,255,255,0.05)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s',
          }}
        >
          Avbryt
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: isLandscape ? 22 : 20 }} />}
          sx={{
            minHeight: buttonHeight,
            minWidth: isLandscape ? 200 : 160,
            px: isLandscape ? 5 : 4,
            fontSize: fontSizeSmall,
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: '#8b5cf6',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            '&:hover': { 
              bgcolor: '#7c3aed',
              boxShadow: '0 6px 16px rgba(139,92,246,0.4)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:disabled': { 
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              boxShadow: 'none',
            },
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Genererer...' : 'Generer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

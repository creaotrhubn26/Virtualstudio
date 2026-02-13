/**
 * 3D Generator Panel
 * 
 * Generate 3D avatars from images using Meta SAM 3D Body, or generate 3D models from text using Hyper3D Rodin.
 * The generated GLB meshes can be loaded directly into the Babylon.js scene.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  LinearProgress,
  Alert,
  Stack,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
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
import {
  Close,
  CloudUpload,
  Person,
  CheckCircle,
  Error as ErrorIcon,
  Save,
  ViewInAr,
  AutoAwesome,
  ExpandMore,
  AddCircleOutline as AddCircleOutlineIcon,
} from '@mui/icons-material';
import { listMergedLibrary, type LibraryAsset } from '@/core/services/library';
import { getUserAssets, saveUserAsset } from '@/core/services/userLibrary';
import { ModelPreview } from '@/components/ModelPreview';

interface AvatarGeneratorPanelProps {
  open: boolean;
  onClose: () => void;
  onAvatarGenerated: (glbUrl: string, metadata: any) => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type GeneratorTab = 'avatar' | 'model';

const AVATAR_CATEGORIES = [
  { id: 'voksen', label: 'Voksen' },
  { id: 'ungdom', label: 'Ungdom' },
  { id: 'barn', label: 'Barn' },
  { id: 'eldre', label: 'Eldre' },
  { id: 'atlet', label: 'Atlet' },
  { id: 'modell', label: 'Modell' },
  { id: 'annet', label: 'Annet' },
];

// Rodin 3D Generator constants
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

export const AvatarGeneratorPanel: React.FC<AvatarGeneratorPanelProps> = ({
  open,
  onClose,
  onAvatarGenerated,
}) => {
  const theme = useTheme();
  // Detect orientation and screen size
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Tab state
  const [activeTab, setActiveTab] = useState<GeneratorTab>('avatar');

  React.useEffect(() => {
    console.log('AvatarGeneratorPanel: open prop changed to', open);
  }, [open]);

  // Avatar generation state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [avatarName, setAvatarName] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState<string>('voksen');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [faceAnalysis, setFaceAnalysis] = useState<{
    gender?: string;
    gender_confidence?: number;
    age_range?: string;
    age_confidence?: number;
    category?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rodin 3D model generation state
  const [modelPrompt, setModelPrompt] = useState('');
  const [modelQuality, setModelQuality] = useState('medium');
  const [modelCategory, setModelCategory] = useState('misc');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatusMessage, setModelStatusMessage] = useState('');
  const [modelError, setModelError] = useState<string | null>(null);
  const [existingModels, setExistingModels] = useState<LibraryAsset[]>([]);
  const [modelsByCategory, setModelsByCategory] = useState<Record<string, LibraryAsset[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Vennligst velg en bildefil');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('idle');
      setErrorMessage(null);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('idle');
      setErrorMessage(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(10);
    setErrorMessage(null);
    setFaceAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setStatus('processing');
      setProgress(30);

      const response = await fetch('/api/generate-avatar-with-analysis', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Generering feilet');
      }

      const result = await response.json();
      setProgress(100);
      setStatus('success');
      setGeneratedMetadata(result.metadata);
      setGeneratedUrl(result.glb_url);

      if (result.face_analysis) {
        setFaceAnalysis(result.face_analysis);
        if (result.face_analysis.category) {
          setAvatarCategory(result.face_analysis.category);
        }
        const genderLabel = result.face_analysis.gender === 'Mann' ? 'Mann' : 'Kvinne';
        const categoryLabel = result.face_analysis.category === 'barn' ? 'Barn' : 
                             result.face_analysis.category === 'ungdom' ? 'Ungdom' : 'Voksen';
        if (!avatarName) {
          setAvatarName(`${genderLabel} (${categoryLabel})`);
        }
      } else if (!avatarName) {
        setAvatarName(`Avatar ${new Date().toLocaleDateString('nb-NO')}`);
      }

    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'En feil oppstod under generering');
    }
  };

  const handleAddToScene = () => {
    if (generatedUrl) {
      onAvatarGenerated(generatedUrl, {
        ...generatedMetadata,
        name: avatarName,
        category: avatarCategory,
      });
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setGeneratedMetadata(null);
    setGeneratedUrl(null);
    setAvatarName('');
    setFaceAnalysis(null);
    setGeneratedModelUrl(null); // Clear model preview too
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Rodin 3D model generation functions
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

  const loadExistingModels = async () => {
    try {
      const systemProps = await listMergedLibrary('prop');
      const userProps = await getUserAssets('prop');
      const allProps = [...systemProps, ...userProps];

      setExistingModels(allProps);

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
      const categoriesWithItems = Object.keys(grouped).filter(cat => grouped[cat].length > 0);
      setExpandedCategories(categoriesWithItems);
    } catch (err) {
      console.error('Failed to load existing models:', err);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'model') {
      loadExistingModels();
    }
  }, [open, activeTab]);

  const handleModelGenerate = async () => {
    if (!modelPrompt.trim()) return;

    setModelLoading(true);
    setModelProgress(0);
    setModelError(null);
    setModelStatusMessage('Starter generering...');

    try {
      const filename = modelPrompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 30);

      setModelStatusMessage('Starter generering med Hyper3D Rodin...');

      // Step 1: Start generation and get UUID
      const startResponse = await fetch('/api/rodin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: modelPrompt,
          filename: filename,
          quality: modelQuality,
          category: modelCategory,
        }),
      });

      if (!startResponse.ok) {
        let errorMessage = 'Generering feilet';
        try {
          const errorData = await startResponse.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${startResponse.status}: ${startResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const startResult = await startResponse.json();

      if (!startResult.success || !startResult.subscription_key) {
        throw new Error(startResult.error || 'Kunne ikke starte generering');
      }

      const subscriptionKey = startResult.subscription_key;
      const taskUuid = startResult.task_uuid;
      setModelStatusMessage('Genererer... (sjekker status)');
      setModelProgress(10);

      // Step 2: Poll status until complete
      const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
      let attempts = 0;
      let lastStatus = '';

      const pollStatus = async (): Promise<void> => {
        while (attempts < maxAttempts) {
          attempts++;
          
          // Wait before first check
          if (attempts === 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          try {
            const statusResponse = await fetch(`/api/rodin/status/${subscriptionKey}`);
            
            if (!statusResponse.ok) {
              const errorData = await statusResponse.json().catch(() => ({}));
              const error = errorData.error || statusResponse.statusText;
              throw new Error(`Status check failed: ${error}`);
            }

            const statusResult = await statusResponse.json();

            if (!statusResult.success) {
              throw new Error(statusResult.error || 'Status check failed');
            }

            const jobStatus = statusResult.status || statusResult.state || '';
            const progress = statusResult.progress || 0;

            if (jobStatus !== lastStatus) {
              lastStatus = jobStatus;
              console.log(`Job status: ${jobStatus}, progress: ${progress}%`);
            }

            setModelProgress(Math.min(10 + (progress * 0.8), 90));
            setModelStatusMessage(`Status: ${jobStatus || 'Processing'}... (${progress}%)`);

            if (jobStatus === 'Done' || jobStatus === 'done') {
              // Step 3: Download the model using task_uuid
              setModelStatusMessage('Laster ned modell...');
              setModelProgress(95);

              const downloadResponse = await fetch(`/api/rodin/download/${taskUuid}?filename=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });

              if (!downloadResponse.ok) {
                const errorData = await downloadResponse.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.error || 'Download failed');
              }

              const downloadResult = await downloadResponse.json();

              if (!downloadResult.success) {
                throw new Error(downloadResult.error || 'Download failed');
              }

              setModelProgress(100);
              setModelStatusMessage('Modell generert!');

              // Set preview URL
              setGeneratedModelUrl(downloadResult.path);

              // Save to user library
              await saveUserAsset({
                type: 'prop',
                title: modelPrompt,
                data: {
                  modelUrl: downloadResult.path,
                  category: modelCategory,
                },
              });

              // Reload existing models
              await loadExistingModels();

              // Don't reset preview URL - keep it visible
              // Reset form after a delay (but keep preview)
              setTimeout(() => {
                setModelProgress(0);
                setModelStatusMessage('');
                setModelLoading(false);
              }, 2000);

              return;
            } else if (jobStatus === 'Failed' || jobStatus === 'failed') {
              throw new Error('Generering feilet på serveren');
            }
          } catch (err) {
            throw err;
          }
        }

        throw new Error('Timeout: Generering tok for lang tid');
      };

      await pollStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nettverksfeil';
      setModelError(errorMessage);
      setModelLoading(false);
      setModelStatusMessage('');
      console.error('Model generation error:', err);
    }
  };

  const handleAccordionChange = (category: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategories((prev) =>
      isExpanded ? [...prev, category] : prev.filter((c) => c !== category)
    );
  };

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
  const tabHeight = isLandscape ? 60 : 56;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={dialogMaxWidth}
      fullWidth
      fullScreen={isMobile}
      container={() => document.body}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
          borderRadius: isMobile ? 0 : 3,
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: isLandscape ? '90vh' : '95vh',
          height: isLandscape ? '90vh' : '95vh',
          m: isMobile ? 0 : 2,
          display: 'flex',
          flexDirection: 'column',
        }
      }}
      sx={{
        '& .MuiDialog-container': {
          zIndex: 1300,
        },
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
      <DialogTitle sx={{ p: dialogPadding, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {activeTab === 'avatar' ? (
              <Person sx={{ color: '#00d4ff', fontSize: isLandscape ? 36 : 32, filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.5))' }} />
            ) : (
              <ViewInAr sx={{ color: '#8b5cf6', fontSize: isLandscape ? 36 : 32, filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5))' }} />
            )}
            <Typography variant="h5" sx={{ fontSize: fontSizeTitle, fontWeight: 600, letterSpacing: '-0.02em' }}>
              3D Generator
            </Typography>
            {activeTab === 'avatar' && (
              <Chip 
                label="SAM 3D" 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(0,212,255,0.15)', 
                  color: '#00d4ff',
                  border: '1px solid rgba(0,212,255,0.3)',
                  fontWeight: 500,
                  fontSize: '1rem', // WCAG: minimum 16px
                  height: 24,
                }} 
              />
            )}
            {activeTab === 'model' && (
              <Chip 
                label="Rodin" 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(139,92,246,0.15)', 
                  color: '#a78bfa',
                  border: '1px solid rgba(139,92,246,0.3)',
                  fontWeight: 500,
                  fontSize: '1rem', // WCAG: minimum 16px
                  height: 24,
                }} 
              />
            )}
          </Box>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              minWidth: 44, 
              minHeight: 44,
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <Close sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => {
            setActiveTab(v);
            setModelError(null);
            setErrorMessage(null);
          }}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'rgba(255,255,255,0.1)',
            '& .MuiTab-root': {
              minHeight: tabHeight,
              textTransform: 'none',
              fontSize: fontSizeSmall,
              fontWeight: 500,
              px: isLandscape ? 4 : 3,
              py: 1.5,
              gap: 1,
              '&.Mui-selected': {
                color: activeTab === 'avatar' ? '#00d4ff' : '#8b5cf6',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: activeTab === 'avatar' ? '#00d4ff' : '#8b5cf6',
            },
          }}
        >
          <Tab 
            label="Avatar (SAM 3D)" 
            value="avatar"
            icon={<Person sx={{ fontSize: 22 }} />}
            iconPosition="start"
          />
          <Tab 
            label="3D Modell (Rodin)" 
            value="model"
            icon={<ViewInAr sx={{ fontSize: 22 }} />}
            iconPosition="start"
          />
        </Tabs>
      </DialogTitle>

      <DialogContent 
        dividers 
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
        {activeTab === 'avatar' ? (
          <Stack spacing={spacingValue}>
            <Alert 
              severity="info" 
              icon={<Person sx={{ fontSize: isLandscape ? 32 : 28 }} />}
              sx={{
                bgcolor: 'rgba(0,212,255,0.1)',
                border: '2px solid rgba(0,212,255,0.2)',
                borderRadius: 3,
                p: isLandscape ? 3 : 2.5,
                '& .MuiAlert-icon': {
                  color: '#00d4ff',
                  fontSize: isLandscape ? 32 : 28,
                  alignSelf: 'flex-start',
                  mt: 0.5,
                },
                '& .MuiAlert-message': {
                  fontSize: fontSizeBody,
                  lineHeight: 1.7,
                  pt: 0.5,
                },
              }}
            >
              <Typography variant="body1" sx={{ fontSize: fontSizeBody, lineHeight: 1.7, fontWeight: 400 }}>
              Last opp et bilde av en person for å generere en 3D-avatar.
              Avataren kan brukes som modell i lysoppsettet ditt.
            </Typography>
          </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 500, mb: 0.5 }}>
              Tidligere genererte avatarer:
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                onAvatarGenerated('/api/avatar/fda04469-af36-46ec-a5c1-7ae7257ca77d.glb', { name: 'Mimi', category: 'voksen' });
                onClose();
              }}
                sx={{ 
                  minHeight: 56,
                  minWidth: 140,
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 2,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  py: 1.5,
                  '&:hover': {
                    borderColor: 'rgba(0,212,255,0.6)',
                    bgcolor: 'rgba(0,212,255,0.1)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s',
                }}
            >
              Last Mimi
            </Button>
          </Box>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          <Box
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              border: '2px dashed',
              borderColor: previewUrl ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                borderRadius: 3,
                p: 5,
              textAlign: 'center',
              cursor: 'pointer',
                bgcolor: 'rgba(0,0,0,0.3)',
                backgroundImage: previewUrl 
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(139,92,246,0.05) 100%)'
                  : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: previewUrl ? 'rgba(0,212,255,0.03)' : 'transparent',
                  transition: 'all 0.3s',
                },
              '&:hover': {
                borderColor: '#00d4ff',
                  bgcolor: 'rgba(0,212,255,0.08)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,212,255,0.15)',
                  '&::before': {
                bgcolor: 'rgba(0,212,255,0.05)',
                  },
                },
                '&:active': {
                  transform: 'translateY(0)',
              },
            }}
          >
            {previewUrl ? (
              <Box sx={{ position: 'relative', width: '100%', maxHeight: 300 }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 280,
                    objectFit: 'contain',
                    borderRadius: 8,
                  }}
                />
              </Box>
            ) : (
              <>
                  <CloudUpload sx={{ fontSize: 80, color: 'rgba(0,212,255,0.6)', mb: 3, filter: 'drop-shadow(0 4px 12px rgba(0,212,255,0.3))' }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1.5, fontSize: '1.375rem', lineHeight: 1.5 }}>
                    Trykk eller dra et bilde hit
                </Typography>
                  <Typography variant="body1" sx={{ color: '#e0e0e0', fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.7 }}>
                    JPG, PNG, WebP - maks 10MB
                </Typography>
              </>
            )}
          </Box>

            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                Forhåndsvisning:
              </Typography>
              <Box sx={{ width: '100%', position: 'relative' }}>
                <ModelPreview 
                  modelUrl={status === 'success' ? generatedUrl : null}
                  height={isLandscape ? 500 : 450}
                  showWaiting={status === 'uploading' || status === 'processing' || status === 'idle'}
                  waitingMessage={
                    status === 'uploading' ? 'Laster opp bilde...' :
                    status === 'processing' ? 'Genererer 3D-avatar...' :
                    status === 'idle' ? 'Last opp et bilde for å generere avatar' :
                    'Venter på generering...'
                  }
                  onError={(err) => {
                    console.error('Preview error:', err);
                  }}
                />
              </Box>
            </Box>

          {status !== 'idle' && status !== 'error' && (
              <Box sx={{ p: 2.5, bgcolor: 'rgba(0,212,255,0.1)', borderRadius: 2, border: '1px solid rgba(0,212,255,0.2)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500, fontSize: '1rem' }}>
                  {status === 'uploading' && 'Laster opp bilde...'}
                  {status === 'processing' && 'Genererer 3D-avatar...'}
                  {status === 'success' && 'Avatar generert!'}
                </Typography>
                  <Typography variant="body2" sx={{ color: '#00d4ff', fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 }}>
                  {progress}%
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
                    bgcolor: status === 'success' ? '#4caf50' : '#00d4ff',
                      borderRadius: 5,
                      backgroundImage: status === 'success' 
                        ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'
                        : 'linear-gradient(90deg, #00d4ff 0%, #00b8e6 50%, #0099cc 100%)',
                      boxShadow: status === 'success' 
                        ? '0 0 10px rgba(76,175,80,0.5)'
                        : '0 0 10px rgba(0,212,255,0.5)',
                      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                }}
              />
            </Box>
          )}

          {status === 'success' && generatedMetadata && (
              <Alert severity="success" icon={<CheckCircle />}>
                <Typography variant="body2" sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
                  Avatar generert! {generatedMetadata.type === 'placeholder' 
                    ? 'Placeholder-mannequin opprettet.' 
                    : `${generatedMetadata.vertices} vertices, ${generatedMetadata.faces} faces.`}
                </Typography>
              </Alert>
            )}

              {faceAnalysis && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(0,212,255,0.1)', 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,212,255,0.3)' 
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#00d4ff' }}>
                    Automatisk gjenkjenning
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`Kjønn: ${faceAnalysis.gender}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                    <Chip 
                      label={`Alder: ${faceAnalysis.age_range} år`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                    <Chip 
                      label={`Kategori: ${faceAnalysis.category === 'barn' ? 'Barn' : 
                             faceAnalysis.category === 'ungdom' ? 'Ungdom' : 'Voksen'}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                  </Box>
                    <Typography variant="body2" sx={{ color: '#d0d0d0', mt: 1, display: 'block', fontSize: '1rem', lineHeight: 1.6 }}>
                    Konfidens: kjønn {Math.round((faceAnalysis.gender_confidence || 0) * 100)}%, 
                    alder {Math.round((faceAnalysis.age_confidence || 0) * 100)}%
                  </Typography>
                </Box>
              )}
              
            {status === 'success' && generatedMetadata && (
              <>
              <TextField
                fullWidth
                label="Navn på avatar"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="F.eks. Kunde A, Modell 1"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                      bgcolor: 'rgba(0,0,0,0.3)',
                      minHeight: inputHeight,
                      borderRadius: 3,
                      '& fieldset': {
                        borderWidth: 2,
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(0,212,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00d4ff',
                        borderWidth: 3, // WCAG: thicker focus indicator
                        boxShadow: '0 0 0 2px rgba(0,212,255,0.3)', // WCAG: additional focus indicator
                      },
                      '&:focus-visible': {
                        outline: '3px solid #00d4ff',
                        outlineOffset: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: fontSizeSmall,
                      fontWeight: 500,
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#00d4ff',
                  },
                  '& .MuiInputBase-input': {
                      fontSize: fontSizeBody,
                      py: isLandscape ? 1.5 : 2,
                      px: 2,
                  }
                }}
              />
              
              <FormControl fullWidth>
                  <InputLabel sx={{ fontSize: fontSizeSmall, fontWeight: 500 }}>Kategori</InputLabel>
                <Select
                  value={avatarCategory}
                  label="Kategori"
                  onChange={(e) => setAvatarCategory(e.target.value)}
                  sx={{ 
                      bgcolor: 'rgba(0,0,0,0.3)',
                      minHeight: inputHeight,
                      borderRadius: 3,
                      '& fieldset': {
                        borderWidth: 2,
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(0,212,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00d4ff',
                        borderWidth: 3, // WCAG: thicker focus indicator
                        boxShadow: '0 0 0 2px rgba(0,212,255,0.3)', // WCAG: additional focus indicator
                      },
                      '&:focus-visible': {
                        outline: '3px solid #00d4ff',
                        outlineOffset: '2px',
                      },
                    '& .MuiSelect-select': {
                        py: isLandscape ? 1.5 : 2,
                        px: 2,
                        fontSize: fontSizeBody,
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: isLandscape ? 36 : 32,
                      },
                  }}
                >
                  {AVATAR_CATEGORIES.map((cat) => (
                    <MenuItem 
                      key={cat.id} 
                      value={cat.id}
                        sx={{ 
                          minHeight: isLandscape ? 52 : 56, 
                          fontSize: fontSizeBody,
                          py: isLandscape ? 1.5 : 2,
                          fontWeight: 500,
                          '&:hover': {
                            bgcolor: 'rgba(0,212,255,0.15)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(0,212,255,0.25)',
                            fontWeight: 600,
                            '&:hover': {
                              bgcolor: 'rgba(0,212,255,0.3)',
                            },
                          },
                        }}
                    >
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {errorMessage && (
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
                {errorMessage}
            </Alert>
          )}
        </Stack>
        ) : (
          <Stack spacing={spacingValue} sx={{ mt: 1 }}>
            <TextField
              label="Beskriv objektet du vil lage"
              placeholder="F.eks: Moderne studiolampe med metallstativ"
              value={modelPrompt}
              onChange={(e) => setModelPrompt(e.target.value)}
              fullWidth
              multiline
              rows={isLandscape ? 3 : 4}
              disabled={modelLoading}
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
                    borderWidth: 2.5,
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
                <AutoAwesome sx={{ fontSize: 22, color: '#8b5cf6' }} />
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.1rem' }}>
                  Forslag (trykk for å bruke):
                </Typography>
              </Box>
              <Box sx={{ 
                maxHeight: 400, 
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
                      expandIcon={<ExpandMore sx={{ color: 'rgba(255,255,255,0.87)', fontSize: 28, transition: 'transform 0.2s' }} />}
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
                              if (!modelLoading) {
                                setModelPrompt(suggestion.prompt);
                                setModelCategory(suggestion.category);
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
                              cursor: modelLoading ? 'not-allowed' : 'pointer',
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
                              ...(modelLoading && {
                                opacity: 0.5,
                                pointerEvents: 'none',
                              }),
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                              <AutoAwesome 
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
              <FormControl fullWidth disabled={modelLoading}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.87)', fontSize: fontSizeSmall, fontWeight: 500 }}>Kvalitet</InputLabel>
                <Select
                  value={modelQuality}
                  label="Kvalitet"
                  onChange={(e) => setModelQuality(e.target.value)}
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
                    '&:focus-visible': {
                      outline: '3px solid #8b5cf6',
                      outlineOffset: '2px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8b5cf6',
                      borderWidth: 3,
                      boxShadow: '0 0 0 2px rgba(139,92,246,0.3)',
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

              <FormControl fullWidth disabled={modelLoading}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.87)', fontSize: fontSizeSmall, fontWeight: 500 }}>Kategori</InputLabel>
                <Select
                  value={modelCategory}
                  label="Kategori"
                  onChange={(e) => setModelCategory(e.target.value)}
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
                    '&:focus-visible': {
                      outline: '3px solid #8b5cf6',
                      outlineOffset: '2px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8b5cf6',
                      borderWidth: 3,
                      boxShadow: '0 0 0 2px rgba(139,92,246,0.3)',
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

            <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }} />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AddCircleOutlineIcon sx={{ fontSize: 26, color: '#8b5cf6', filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }} />
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.1rem' }}>
                  Ny modell som genereres:
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 3,
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
                <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 500, mb: 1.5, fontSize: '1.05rem', lineHeight: 1.6 }}>
                  {modelPrompt || '(Ingen beskrivelse enda)'}
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2, mb: 1.5 }}>
                  <Chip
                    label={CATEGORY_OPTIONS.find((opt) => opt.value === modelCategory)?.label || modelCategory}
                    size="medium"
                    sx={{
                      bgcolor: 'rgba(139,92,246,0.25)',
                      color: '#e0e0e0',
                      fontSize: '1rem', // WCAG: minimum 16px
                      fontWeight: 500,
                      height: 36,
                      px: 1.5,
                    }}
                  />
                  <Chip
                    label={QUALITY_OPTIONS.find((opt) => opt.value === modelQuality)?.label || modelQuality}
                    size="medium"
                    sx={{
                      bgcolor: 'rgba(139,92,246,0.25)',
                      color: '#e0e0e0',
                      fontSize: '1rem', // WCAG: minimum 16px
                      fontWeight: 500,
                      height: 36,
                      px: 1.5,
                    }}
                  />
                </Stack>
                  <Typography variant="body2" sx={{ color: '#e0e0e0', mt: 1.5, display: 'block', fontSize: '1rem', lineHeight: 1.6 }}>
                  Vil bli lagt til i: <strong style={{ color: '#a78bfa' }}>{getCategoryLabel(modelCategory)}</strong>
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }} />

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
                  <Typography variant="body2" sx={{ color: '#d0d0d0', fontStyle: 'italic', p: 3, display: 'block', fontSize: '1rem', textAlign: 'center', lineHeight: 1.6 }}>
                    Ingen modeller i biblioteket enda
                  </Typography>
                ) : (
                  Object.entries(modelsByCategory)
                    .sort(([a], [b]) => {
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
                          expandIcon={<ExpandMore sx={{ color: 'rgba(255,255,255,0.87)', fontSize: 28, transition: 'transform 0.2s' }} />}
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
                            <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.05rem' }}>
                              {getCategoryLabel(cat)}
                            </Typography>
                            <Chip
                              label={models.length}
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
                        <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 2 }}>
                          <List sx={{ p: 0 }}>
                            {models.map((model) => (
                              <ListItem
                                key={model.id}
                                sx={{
                                  py: 1.5,
                                  px: 2,
                                  borderRadius: 2,
                                  mb: 1,
                                  minHeight: 56,
                                  bgcolor: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    bgcolor: 'rgba(139,92,246,0.15)',
                                    borderColor: 'rgba(139,92,246,0.3)',
                                    transform: 'translateX(4px)',
                                  },
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500, mb: 0.5 }}>
                                      {model.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="body2" sx={{ color: '#d0d0d0', fontSize: '1rem', lineHeight: 1.6 }}>
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

            <Box>
              <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                Forhåndsvisning:
              </Typography>
              <ModelPreview
                modelUrl={generatedModelUrl || null}
                height={isLandscape ? 500 : 450}
                showWaiting={modelLoading || !generatedModelUrl}
                waitingMessage={
                  modelLoading ? (modelStatusMessage || 'Genererer 3D-modell...') :
                  !generatedModelUrl ? 'Skriv inn en beskrivelse og klikk "Generer modell"' :
                  'Venter på generering...'
                }
                onError={(err) => {
                  console.error('Preview error:', err);
                }}
              />
            </Box>

            {modelLoading && (
              <Box sx={{ mt: 3, p: 2.5, bgcolor: 'rgba(139,92,246,0.1)', borderRadius: 2, border: '1px solid rgba(139,92,246,0.2)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500, fontSize: '1rem' }}>
                    {modelStatusMessage || 'Genererer...'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a78bfa', fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 }}>
                    {Math.round(modelProgress)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={modelProgress}
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

            {modelError && (
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
                {modelError}
              </Alert>
            )}
          </Stack>
        )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: dialogPadding, pt: 2, gap: 2, bgcolor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)', flexDirection: isLandscape ? 'row' : 'column', '& > *': { width: isLandscape ? 'auto' : '100%' } }}>
        {activeTab === 'avatar' ? (
          status === 'success' ? (
          <>
            <Button 
              onClick={handleReset} 
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
              Ny Avatar
            </Button>
            <Button
              onClick={handleAddToScene}
              variant="contained"
              color="primary"
                startIcon={<Save sx={{ fontSize: isLandscape ? 22 : 20 }} />}
              disabled={!avatarName.trim()}
              sx={{ 
                  minHeight: buttonHeight, 
                  minWidth: isLandscape ? 180 : 160,
                  px: isLandscape ? 5 : 4,
                  fontSize: fontSizeSmall,
                  fontWeight: 600,
                  borderRadius: 2,
                  bgcolor: '#00d4ff',
                  boxShadow: '0 4px 12px rgba(0,212,255,0.3)',
                  '&:hover': { 
                    bgcolor: '#00b8e6',
                    boxShadow: '0 6px 16px rgba(0,212,255,0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                  },
                  transition: 'all 0.2s',
              }}
            >
              Legg til i scene
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={onClose} 
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
              onClick={handleGenerate}
              variant="contained"
              color="primary"
              disabled={!selectedFile || status === 'uploading' || status === 'processing'}
                startIcon={<Person sx={{ fontSize: isLandscape ? 22 : 20 }} />}
              sx={{ 
                  minHeight: buttonHeight, 
                  minWidth: isLandscape ? 200 : 180,
                  px: isLandscape ? 5 : 4,
                  fontSize: fontSizeSmall,
                  fontWeight: 600,
                  borderRadius: 2,
                  bgcolor: '#00d4ff',
                  boxShadow: '0 4px 12px rgba(0,212,255,0.3)',
                  '&:hover': { 
                    bgcolor: '#00b8e6',
                    boxShadow: '0 6px 16px rgba(0,212,255,0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                  },
                  transition: 'all 0.2s',
              }}
            >
              Generer Avatar
              </Button>
            </>
          )
        ) : (
          <>
            <Button 
              onClick={onClose} 
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
              onClick={handleModelGenerate}
              variant="contained"
              disabled={modelLoading || !modelPrompt.trim()}
              startIcon={<AutoAwesome sx={{ fontSize: isLandscape ? 22 : 20 }} />}
              sx={{
                minHeight: buttonHeight,
                minWidth: isLandscape ? 200 : 180,
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
              {modelLoading ? 'Genererer...' : 'Generer Modell'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AvatarGeneratorPanel;
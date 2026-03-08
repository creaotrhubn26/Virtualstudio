import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  InputBase,
  IconButton,
  useMediaQuery,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Switch,
  Slider,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  Search as SearchIcon,
  PlayArrow,
  Speed,
  CameraAlt,
  Lightbulb,
  Animation,
  Movie,
  Timer,
  Close,
  ZoomIn,
  ZoomOut,
  Autorenew,
  ArrowUpward,
  SwapHoriz,
  CenterFocusStrong,
  LightMode,
  FlashOn,
  Gradient,
  Flare,
  Bolt,
  BlurOn,
  AutoAwesome,
  Add,
  PlaylistPlay,
  Layers,
  Queue,
  Warning,
  Check,
  Settings,
  Videocam,
  Edit,
} from '@mui/icons-material';

interface AnimationPreset {
  id: string;
  name: string;
  category: 'kamera' | 'lys' | 'overgang' | 'effekt' | 'fokus';
  duration: number;
  description: string;
  tags: string[];
  easing: string;
  keyframes: number;
  previewIcon: string;
  // DOF-specific properties for fokus category
  dofSettings?: {
    apertureStart?: number;
    apertureEnd?: number;
    focusDistanceStart?: number;
    focusDistanceEnd?: number;
    useAutoFocus?: boolean;
    focusTargetType?: 'foreground' | 'background' | 'subject' | 'custom';
  };
}

interface ComboItem {
  preset: AnimationPreset;
  order: number;
  customDuration: number;
  speedMultiplier: number;
}

const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'dolly_in',
    name: 'Dolly Inn',
    category: 'kamera',
    duration: 3,
    description: 'Klassisk kamerabevegelse inn mot motiv',
    tags: ['kamera', 'bevegelse', 'dramatisk'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'zoom_in',
  },
  {
    id: 'dolly_out',
    name: 'Dolly Ut',
    category: 'kamera',
    duration: 3,
    description: 'Kamera trekker seg tilbake fra motiv',
    tags: ['kamera', 'bevegelse', 'avslutning'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'zoom_out',
  },
  {
    id: 'orbit_360',
    name: 'Orbit 360°',
    category: 'kamera',
    duration: 8,
    description: 'Kamera roterer rundt motiv i full sirkel',
    tags: ['kamera', 'rotasjon', 'produkt'],
    easing: 'linear',
    keyframes: 4,
    previewIcon: 'rotate',
  },
  {
    id: 'crane_up',
    name: 'Crane Opp',
    category: 'kamera',
    duration: 4,
    description: 'Vertikal kamerabevegelse oppover',
    tags: ['kamera', 'vertikal', 'reveal'],
    easing: 'easeOut',
    keyframes: 2,
    previewIcon: 'up',
  },
  {
    id: 'slow_pan',
    name: 'Langsom Panorering',
    category: 'kamera',
    duration: 6,
    description: 'Sakte horisontal panorering',
    tags: ['kamera', 'panorering', 'etablering'],
    easing: 'linear',
    keyframes: 2,
    previewIcon: 'pan',
  },
  {
    id: 'focus_pull',
    name: 'Focus Pull',
    category: 'kamera',
    duration: 2,
    description: 'Gradvis endring av fokuspunkt',
    tags: ['kamera', 'fokus', 'cinematisk'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'focus',
  },
  {
    id: 'light_fade_in',
    name: 'Lys Fade Inn',
    category: 'lys',
    duration: 2,
    description: 'Gradvis økning av lysintensitet',
    tags: ['lys', 'fade', 'intro'],
    easing: 'easeIn',
    keyframes: 2,
    previewIcon: 'fade_in',
  },
  {
    id: 'light_fade_out',
    name: 'Lys Fade Ut',
    category: 'lys',
    duration: 2,
    description: 'Gradvis reduksjon av lysintensitet',
    tags: ['lys', 'fade', 'outro'],
    easing: 'easeOut',
    keyframes: 2,
    previewIcon: 'fade_out',
  },
  {
    id: 'color_shift',
    name: 'Fargeskift',
    category: 'lys',
    duration: 4,
    description: 'Gradvis endring av fargetemperatur',
    tags: ['lys', 'farge', 'stemning'],
    easing: 'easeInOut',
    keyframes: 3,
    previewIcon: 'color',
  },
  {
    id: 'dramatic_reveal',
    name: 'Dramatisk Reveal',
    category: 'lys',
    duration: 3,
    description: 'Lys bygges opp dramatisk',
    tags: ['lys', 'dramatisk', 'reveal'],
    easing: 'easeIn',
    keyframes: 4,
    previewIcon: 'reveal',
  },
  // Lys bevegelse animasjoner
  {
    id: 'light_orbit',
    name: 'Lys Orbit',
    category: 'lys',
    duration: 6,
    description: 'Lys roterer rundt motivet i en sirkel',
    tags: ['lys', 'bevegelse', 'orbit', 'rotasjon'],
    easing: 'linear',
    keyframes: 8,
    previewIcon: 'rotate',
  },
  {
    id: 'light_sweep_lr',
    name: 'Lys Sveip H-V',
    category: 'lys',
    duration: 4,
    description: 'Lys beveger seg fra høyre til venstre',
    tags: ['lys', 'bevegelse', 'sveip', 'lateral'],
    easing: 'easeInOut',
    keyframes: 3,
    previewIcon: 'pan',
  },
  {
    id: 'light_sweep_rl',
    name: 'Lys Sveip V-H',
    category: 'lys',
    duration: 4,
    description: 'Lys beveger seg fra venstre til høyre',
    tags: ['lys', 'bevegelse', 'sveip', 'lateral'],
    easing: 'easeInOut',
    keyframes: 3,
    previewIcon: 'pan',
  },
  {
    id: 'light_rise',
    name: 'Lys Stigning',
    category: 'lys',
    duration: 3,
    description: 'Lys beveger seg oppover',
    tags: ['lys', 'bevegelse', 'vertikal', 'dramatisk'],
    easing: 'easeOut',
    keyframes: 2,
    previewIcon: 'tilt',
  },
  {
    id: 'light_drop',
    name: 'Lys Fall',
    category: 'lys',
    duration: 3,
    description: 'Lys beveger seg nedover',
    tags: ['lys', 'bevegelse', 'vertikal', 'dramatisk'],
    easing: 'easeIn',
    keyframes: 2,
    previewIcon: 'tilt',
  },
  {
    id: 'light_approach',
    name: 'Lys Nærmer Seg',
    category: 'lys',
    duration: 4,
    description: 'Lys beveger seg nærmere motivet',
    tags: ['lys', 'bevegelse', 'dolly', 'intensivering'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'zoom_in',
  },
  {
    id: 'light_retreat',
    name: 'Lys Trekker Seg',
    category: 'lys',
    duration: 4,
    description: 'Lys beveger seg bort fra motivet',
    tags: ['lys', 'bevegelse', 'dolly', 'avslutning'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'zoom_out',
  },
  {
    id: 'light_pendulum',
    name: 'Pendel Lys',
    category: 'lys',
    duration: 5,
    description: 'Lys svinger fra side til side som en pendel',
    tags: ['lys', 'bevegelse', 'pendel', 'rytmisk'],
    easing: 'sine',
    keyframes: 5,
    previewIcon: 'breathing',
  },
  {
    id: 'light_circle_overhead',
    name: 'Sirkel Ovenfra',
    category: 'lys',
    duration: 8,
    description: 'Lys roterer i sirkel over motivet',
    tags: ['lys', 'bevegelse', 'sirkel', 'overhead'],
    easing: 'linear',
    keyframes: 8,
    previewIcon: 'rotate',
  },
  {
    id: 'breathing_light',
    name: 'Pustende Lys',
    category: 'effekt',
    duration: 4,
    description: 'Syklisk pulserende lyseffekt',
    tags: ['effekt', 'loop', 'ambient'],
    easing: 'sine',
    keyframes: 3,
    previewIcon: 'breathing',
  },
  {
    id: 'strobe_effect',
    name: 'Strobe Effekt',
    category: 'effekt',
    duration: 2,
    description: 'Blinkende lyseffekt',
    tags: ['effekt', 'strobe', 'action'],
    easing: 'step',
    keyframes: 8,
    previewIcon: 'strobe',
  },
  {
    id: 'smooth_transition',
    name: 'Myk Overgang',
    category: 'overgang',
    duration: 1.5,
    description: 'Jevn overgang mellom scener',
    tags: ['overgang', 'smooth', 'profesjonell'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'smooth',
  },
  {
    id: 'quick_cut',
    name: 'Rask Klipp',
    category: 'overgang',
    duration: 0.5,
    description: 'Rask og dynamisk overgang',
    tags: ['overgang', 'rask', 'action'],
    easing: 'linear',
    keyframes: 2,
    previewIcon: 'cut',
  },
  // ============ FOKUS & DOF PRESETS ============
  {
    id: 'rack_focus_fg_bg',
    name: 'Rack Focus: Foran → Bak',
    category: 'fokus',
    duration: 2.5,
    description: 'Skift fokus fra forgrunn til bakgrunn - klassisk filmteknikk',
    tags: ['fokus', 'rack', 'cinematisk', 'dof', 'dramatisk'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'rack_focus',
    dofSettings: {
      focusDistanceStart: 1.5,
      focusDistanceEnd: 5.0,
      apertureStart: 2.8,
      apertureEnd: 2.8,
      focusTargetType: 'foreground',
    },
  },
  {
    id: 'rack_focus_bg_fg',
    name: 'Rack Focus: Bak → Foran',
    category: 'fokus',
    duration: 2.5,
    description: 'Skift fokus fra bakgrunn til forgrunn',
    tags: ['fokus', 'rack', 'cinematisk', 'dof', 'reveal'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'rack_focus',
    dofSettings: {
      focusDistanceStart: 5.0,
      focusDistanceEnd: 1.5,
      apertureStart: 2.8,
      apertureEnd: 2.8,
      focusTargetType: 'background',
    },
  },
  {
    id: 'focus_reveal',
    name: 'Fokus Reveal',
    category: 'fokus',
    duration: 3,
    description: 'Start ute av fokus, gradvis skarphet - dramatisk intro',
    tags: ['fokus', 'reveal', 'intro', 'cinematisk', 'drømmende'],
    easing: 'easeOut',
    keyframes: 2,
    previewIcon: 'blur_reveal',
    dofSettings: {
      focusDistanceStart: 0.5,
      focusDistanceEnd: 3.0,
      apertureStart: 1.4,
      apertureEnd: 2.8,
      useAutoFocus: true,
      focusTargetType: 'subject',
    },
  },
  {
    id: 'focus_fadeout',
    name: 'Fokus Fadeout',
    category: 'fokus',
    duration: 2.5,
    description: 'Gradvis blur for drømmende avslutning',
    tags: ['fokus', 'fadeout', 'outro', 'cinematisk', 'drømmende'],
    easing: 'easeIn',
    keyframes: 2,
    previewIcon: 'blur_out',
    dofSettings: {
      focusDistanceStart: 3.0,
      focusDistanceEnd: 0.3,
      apertureStart: 2.8,
      apertureEnd: 1.4,
      focusTargetType: 'subject',
    },
  },
  {
    id: 'bokeh_pulse',
    name: 'Bokeh Puls',
    category: 'fokus',
    duration: 4,
    description: 'Blender pulserer f/1.4 ↔ f/8 for kreativ effekt',
    tags: ['fokus', 'bokeh', 'puls', 'kreativ', 'musikkvideo'],
    easing: 'sine',
    keyframes: 5,
    previewIcon: 'bokeh_pulse',
    dofSettings: {
      apertureStart: 1.4,
      apertureEnd: 8,
      focusTargetType: 'subject',
      useAutoFocus: true,
    },
  },
  {
    id: 'shallow_to_deep',
    name: 'Grunn → Dyp DOF',
    category: 'fokus',
    duration: 3,
    description: 'Fra intimt bokeh til full kontekst - utvider perspektivet',
    tags: ['fokus', 'dof', 'overgang', 'kontekst', 'establishing'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'aperture_open',
    dofSettings: {
      apertureStart: 1.4,
      apertureEnd: 11,
      focusTargetType: 'subject',
      useAutoFocus: true,
    },
  },
  {
    id: 'deep_to_shallow',
    name: 'Dyp → Grunn DOF',
    category: 'fokus',
    duration: 3,
    description: 'Fra kontekstuelt til intimt - isolerer subjektet',
    tags: ['fokus', 'dof', 'overgang', 'intimt', 'portrett'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'aperture_close',
    dofSettings: {
      apertureStart: 11,
      apertureEnd: 1.4,
      focusTargetType: 'subject',
      useAutoFocus: true,
    },
  },
  {
    id: 'follow_focus',
    name: 'Follow Focus',
    category: 'fokus',
    duration: 5,
    description: 'Kontinuerlig sporing av bevegelig motiv med Øye-AF',
    tags: ['fokus', 'tracking', 'bevegelse', 'af-c', 'walk-and-talk'],
    easing: 'linear',
    keyframes: 10,
    previewIcon: 'tracking',
    dofSettings: {
      apertureStart: 2.0,
      apertureEnd: 2.0,
      useAutoFocus: true,
      focusTargetType: 'subject',
    },
  },
  {
    id: 'vertigo_zoom',
    name: 'Vertigo / Dolly Zoom',
    category: 'fokus',
    duration: 4,
    description: 'Hitchcock-effekt: Dolly + zoom for å holde størrelse',
    tags: ['fokus', 'vertigo', 'dolly', 'zoom', 'hitchcock', 'cinematisk'],
    easing: 'easeInOut',
    keyframes: 2,
    previewIcon: 'vertigo',
    dofSettings: {
      focusDistanceStart: 2.0,
      focusDistanceEnd: 5.0,
      apertureStart: 2.8,
      apertureEnd: 2.8,
      focusTargetType: 'subject',
    },
  },
  {
    id: 'soft_glow',
    name: 'Soft Glow',
    category: 'fokus',
    duration: 2,
    description: 'Lett diffus uskarphet for romantisk stemning',
    tags: ['fokus', 'soft', 'romantisk', 'drømmende', 'beauty'],
    easing: 'easeInOut',
    keyframes: 3,
    previewIcon: 'soft_focus',
    dofSettings: {
      apertureStart: 4,
      apertureEnd: 1.8,
      focusTargetType: 'subject',
      useAutoFocus: true,
    },
  },
  {
    id: 'macro_reveal',
    name: 'Makro Reveal',
    category: 'fokus',
    duration: 3,
    description: 'Ekstrem nærfokus med minimalt dybdeskarphet',
    tags: ['fokus', 'makro', 'nær', 'detalj', 'produkt'],
    easing: 'easeOut',
    keyframes: 2,
    previewIcon: 'macro',
    dofSettings: {
      focusDistanceStart: 0.3,
      focusDistanceEnd: 0.5,
      apertureStart: 2.8,
      apertureEnd: 2.8,
      focusTargetType: 'custom',
    },
  },
];

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; color: string; gradient: string }> = {
  kamera: { 
    label: 'Kamera', 
    icon: <CameraAlt />, 
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
  },
  fokus: { 
    label: 'Fokus & DOF', 
    icon: <CenterFocusStrong />, 
    color: '#e74c3c',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
  },
  lys: { 
    label: 'Lys', 
    icon: <Lightbulb />, 
    color: '#f39c12',
    gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
  },
  overgang: { 
    label: 'Overgang', 
    icon: <Movie />, 
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
  },
  effekt: { 
    label: 'Effekt', 
    icon: <Animation />, 
    color: '#1abc9c',
    gradient: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)'
  },
};

const COMBO_PRESETS = [
  {
    id: 'cinematic_intro',
    name: 'Cinematisk Intro',
    description: 'Dolly inn med dramatisk lys reveal',
    items: ['dolly_in', 'dramatic_reveal'],
    mode: 'parallel' as const,
  },
  {
    id: 'product_showcase',
    name: 'Produkt Showcase',
    description: 'Orbit rundt med pustende lys',
    items: ['orbit_360', 'breathing_light'],
    mode: 'parallel' as const,
  },
  {
    id: 'dramatic_sequence',
    name: 'Dramatisk Sekvens',
    description: 'Lys fade inn, deretter crane opp',
    items: ['light_fade_in', 'crane_up'],
    mode: 'sequential' as const,
  },
  {
    id: 'reveal_exit',
    name: 'Reveal og Exit',
    description: 'Dolly inn, pause, dolly ut',
    items: ['dolly_in', 'dolly_out'],
    mode: 'sequential' as const,
  },
  // Lys bevegelse kombinasjoner
  {
    id: 'orbit_light_sync',
    name: 'Synkronisert Orbit',
    description: 'Kamera og lys roterer sammen rundt motivet',
    items: ['orbit_360', 'light_orbit'],
    mode: 'parallel' as const,
  },
  {
    id: 'dramatic_light_sweep',
    name: 'Dramatisk Lyssveip',
    description: 'Lys sveiper over mens kamera holder still',
    items: ['light_sweep_lr', 'light_fade_in'],
    mode: 'parallel' as const,
  },
  {
    id: 'rising_reveal',
    name: 'Stigende Reveal',
    description: 'Lys stiger opp mens intensitet øker',
    items: ['light_rise', 'dramatic_reveal'],
    mode: 'parallel' as const,
  },
  {
    id: 'pendulum_orbit',
    name: 'Pendel Orbit',
    description: 'Lys svinger mens kamera roterer',
    items: ['pan_left', 'light_pendulum'],
    mode: 'parallel' as const,
  },
  {
    id: 'approach_dolly',
    name: 'Dobbel Tilnærming',
    description: 'Både kamera og lys nærmer seg motivet',
    items: ['dolly_in', 'light_approach'],
    mode: 'parallel' as const,
  },
  {
    id: 'overhead_crane',
    name: 'Crane med Overlys',
    description: 'Kamera crane opp mens lys sirkler ovenfra',
    items: ['crane_up', 'light_circle_overhead'],
    mode: 'parallel' as const,
  },
  // DOF/Fokus kombinasjoner
  {
    id: 'cinematic_focus_dolly',
    name: 'Cinematisk Fokus Dolly',
    description: 'Dolly inn med rack focus for filmisk effekt',
    items: ['dolly_in', 'rack_focus_bg_fg'],
    mode: 'parallel' as const,
  },
  {
    id: 'reveal_with_focus',
    name: 'Reveal med Fokus',
    description: 'Fokus reveal kombinert med lys fade inn',
    items: ['focus_reveal', 'light_fade_in'],
    mode: 'parallel' as const,
  },
  {
    id: 'dreamy_outro',
    name: 'Drømmende Avslutning',
    description: 'Fokus fadeout med lys fade ut',
    items: ['focus_fadeout', 'light_fade_out'],
    mode: 'parallel' as const,
  },
  {
    id: 'portrait_isolation',
    name: 'Portrett Isolasjon',
    description: 'Dyp til grunn DOF med crane opp',
    items: ['deep_to_shallow', 'crane_up'],
    mode: 'parallel' as const,
  },
  {
    id: 'product_macro',
    name: 'Produkt Makro',
    description: 'Makro reveal med orbit for produktvisning',
    items: ['macro_reveal', 'orbit_360'],
    mode: 'parallel' as const,
  },
  {
    id: 'hitchcock_moment',
    name: 'Hitchcock Øyeblikk',
    description: 'Vertigo zoom med dramatisk lys reveal',
    items: ['vertigo_zoom', 'dramatic_reveal'],
    mode: 'parallel' as const,
  },
];

function AnimatedPreview({ type, color, isHovered }: { type: string; color: string; isHovered: boolean }) {
  const iconStyle = {
    fontSize: 32,
    color: color,
    filter: `drop-shadow(0 0 8px ${color}60)`,
  };

  const getAnimation = () => {
    if (!isHovered) return {};
    
    switch (type) {
      case 'zoom_in': return { animation: 'zoomIn 1.5s ease-in-out infinite' };
      case 'zoom_out': return { animation: 'zoomOut 1.5s ease-in-out infinite' };
      case 'rotate': return { animation: 'rotate360 2s linear infinite' };
      case 'up': return { animation: 'moveUp 1.5s ease-in-out infinite' };
      case 'pan': return { animation: 'panHorizontal 2s ease-in-out infinite' };
      case 'focus': return { animation: 'focusPulse 1.5s ease-in-out infinite' };
      case 'fade_in': return { animation: 'fadeIn 2s ease-in infinite' };
      case 'fade_out': return { animation: 'fadeOut 2s ease-out infinite' };
      case 'color': return { animation: 'colorShift 3s linear infinite' };
      case 'reveal': return { animation: 'dramaticReveal 2s ease-in infinite' };
      case 'breathing': return { animation: 'breathing 2s ease-in-out infinite' };
      case 'strobe': return { animation: 'strobe 0.3s step-end infinite' };
      case 'smooth': return { animation: 'smoothFade 2s ease-in-out infinite' };
      case 'cut': return { animation: 'quickCut 0.5s step-end infinite' };
      // DOF/Focus animations
      case 'rack_focus': return { animation: 'rackFocus 2s ease-in-out infinite' };
      case 'blur_reveal': return { animation: 'blurReveal 2.5s ease-out infinite' };
      case 'blur_out': return { animation: 'blurOut 2s ease-in infinite' };
      case 'bokeh_pulse': return { animation: 'bokehPulse 2s ease-in-out infinite' };
      case 'aperture_open': return { animation: 'apertureOpen 2s ease-in-out infinite' };
      case 'aperture_close': return { animation: 'apertureClose 2s ease-in-out infinite' };
      case 'tracking': return { animation: 'trackingMove 1.5s ease-in-out infinite' };
      case 'vertigo': return { animation: 'vertigoZoom 2s ease-in-out infinite' };
      case 'soft_focus': return { animation: 'softGlow 2s ease-in-out infinite' };
      case 'macro': return { animation: 'macroZoom 2s ease-in-out infinite' };
      default: return {};
    }
  };

  const getIcon = () => {
    const animStyle = { ...iconStyle, ...getAnimation() };
    switch (type) {
      case 'zoom_in': return <ZoomIn sx={animStyle} />;
      case 'zoom_out': return <ZoomOut sx={animStyle} />;
      case 'rotate': return <Autorenew sx={animStyle} />;
      case 'up': return <ArrowUpward sx={animStyle} />;
      case 'pan': return <SwapHoriz sx={animStyle} />;
      case 'focus': return <CenterFocusStrong sx={animStyle} />;
      case 'fade_in': return <LightMode sx={animStyle} />;
      case 'fade_out': return <LightMode sx={animStyle} />;
      case 'color': return <Gradient sx={animStyle} />;
      case 'reveal': return <Flare sx={animStyle} />;
      case 'breathing': return <BlurOn sx={animStyle} />;
      case 'strobe': return <FlashOn sx={animStyle} />;
      case 'smooth': return <AutoAwesome sx={animStyle} />;
      case 'cut': return <Bolt sx={animStyle} />;
      // DOF/Focus icons
      case 'rack_focus': return <CenterFocusStrong sx={animStyle} />;
      case 'blur_reveal': return <BlurOn sx={animStyle} />;
      case 'blur_out': return <BlurOn sx={animStyle} />;
      case 'bokeh_pulse': return <BlurOn sx={animStyle} />;
      case 'aperture_open': return <CenterFocusStrong sx={animStyle} />;
      case 'aperture_close': return <CenterFocusStrong sx={animStyle} />;
      case 'tracking': return <Videocam sx={animStyle} />;
      case 'vertigo': return <ZoomIn sx={animStyle} />;
      case 'soft_focus': return <BlurOn sx={animStyle} />;
      case 'macro': return <CenterFocusStrong sx={animStyle} />;
      case 'tilt': return <ArrowUpward sx={animStyle} />;
      default: return <Animation sx={iconStyle} />;
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes zoomIn { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        @keyframes zoomOut { 0%, 100% { transform: scale(1.3); } 50% { transform: scale(0.8); } }
        @keyframes rotate360 { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes moveUp { 0%, 100% { transform: translateY(8px); } 50% { transform: translateY(-8px); } }
        @keyframes panHorizontal { 0%, 100% { transform: translateX(-10px); } 50% { transform: translateX(10px); } }
        @keyframes focusPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes fadeIn { 0% { opacity: 0.2; } 100% { opacity: 1; } }
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes colorShift { 0% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(180deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes dramaticReveal { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes breathing { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.9); opacity: 0.6; } }
        @keyframes strobe { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.1; } }
        @keyframes smoothFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes quickCut { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        /* DOF/Focus animations */
        @keyframes rackFocus { 0% { filter: blur(0px); transform: scale(1); } 50% { filter: blur(3px); transform: scale(0.95); } 100% { filter: blur(0px); transform: scale(1); } }
        @keyframes blurReveal { 0% { filter: blur(6px); opacity: 0.5; } 100% { filter: blur(0px); opacity: 1; } }
        @keyframes blurOut { 0% { filter: blur(0px); opacity: 1; } 100% { filter: blur(6px); opacity: 0.5; } }
        @keyframes bokehPulse { 0%, 100% { filter: blur(0px); transform: scale(1); } 50% { filter: blur(2px); transform: scale(1.1); } }
        @keyframes apertureOpen { 0% { transform: scale(0.8); } 50% { transform: scale(1.2); } 100% { transform: scale(0.8); } }
        @keyframes apertureClose { 0% { transform: scale(1.2); } 50% { transform: scale(0.8); } 100% { transform: scale(1.2); } }
        @keyframes trackingMove { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes vertigoZoom { 0%, 100% { transform: scale(1) translateZ(0); } 50% { transform: scale(1.2) translateZ(10px); } }
        @keyframes softGlow { 0%, 100% { filter: blur(0px) brightness(1); } 50% { filter: blur(2px) brightness(1.2); } }
        @keyframes macroZoom { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
      `}</style>
      {getIcon()}
    </Box>
  );
}

export function TidslinjeLibraryPanel() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('alle');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [comboMode, setComboMode] = useState(false);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential'>('parallel');
  const [autoResetCamera, setAutoResetCamera] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [singleSpeedMultiplier, setSingleSpeedMultiplier] = useState(1);
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  const filteredPresets = useMemo(() => {
    return ANIMATION_PRESETS.filter(preset => {
      const matchesCategory = activeCategory === 'alle' || preset.category === activeCategory;
      const matchesSearch = search === '' ||
        preset.name.toLowerCase().includes(search.toLowerCase()) ||
        preset.description.toLowerCase().includes(search.toLowerCase()) ||
        preset.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const cameraConflict = useMemo(() => {
    const cameraItems = comboItems.filter(item => item.preset.category === 'kamera');
    return executionMode === 'parallel' && cameraItems.length > 1;
  }, [comboItems, executionMode]);

  const totalDuration = useMemo(() => {
    if (comboItems.length === 0) return 0;
    if (executionMode === 'parallel') {
      return Math.max(...comboItems.map(item => item.customDuration / item.speedMultiplier));
    }
    return comboItems.reduce((sum, item) => sum + (item.customDuration / item.speedMultiplier), 0);
  }, [comboItems, executionMode]);

  const handleApplyPreset = (preset: AnimationPreset) => {
    if (comboMode) {
      const exists = comboItems.find(item => item.preset.id === preset.id);
      if (exists) {
        setComboItems(comboItems.filter(item => item.preset.id !== preset.id));
        setEditingItemId(null);
      } else {
        setComboItems([...comboItems, { 
          preset, 
          order: comboItems.length,
          customDuration: preset.duration,
          speedMultiplier: 1,
        }]);
      }
    } else {
      const effectiveDuration = preset.duration / singleSpeedMultiplier;
      setPlayingId(preset.id);
      window.dispatchEvent(new CustomEvent('ch-apply-animation-preset', { 
        detail: { ...preset, duration: effectiveDuration, speedMultiplier: singleSpeedMultiplier, autoResetCamera } 
      }));
      setTimeout(() => setPlayingId(null), effectiveDuration * 1000);
    }
  };

  const handleUpdateComboItem = (presetId: string, updates: Partial<ComboItem>) => {
    setComboItems(comboItems.map(item => 
      item.preset.id === presetId ? { ...item, ...updates } : item
    ));
  };

  const handleApplyCombo = () => {
    if (comboItems.length === 0) return;
    
    const comboData = {
      items: comboItems.map(item => ({
        ...item.preset,
        duration: item.customDuration / item.speedMultiplier,
        speedMultiplier: item.speedMultiplier,
      })),
      mode: executionMode,
      totalDuration,
      autoResetCamera,
    };
    
    setPlayingId('combo');
    window.dispatchEvent(new CustomEvent('ch-apply-animation-combo', { detail: comboData }));
    setTimeout(() => setPlayingId(null), totalDuration * 1000 + 500);
  };

  const handleApplyComboPreset = (comboPreset: typeof COMBO_PRESETS[0]) => {
    const presets = comboPreset.items
      .map(id => ANIMATION_PRESETS.find(p => p.id === id))
      .filter(Boolean) as AnimationPreset[];
    
    const duration = comboPreset.mode === 'parallel' 
      ? Math.max(...presets.map(p => p.duration))
      : presets.reduce((sum, p) => sum + p.duration, 0);
    
    const comboData = {
      items: presets,
      mode: comboPreset.mode,
      totalDuration: duration,
      autoResetCamera,
    };
    
    setPlayingId(comboPreset.id);
    window.dispatchEvent(new CustomEvent('ch-apply-animation-combo', { detail: comboData }));
    setTimeout(() => setPlayingId(null), duration * 1000 + 500);
  };

  const isInCombo = (presetId: string) => comboItems.some(item => item.preset.id === presetId);
  const getComboItem = (presetId: string) => comboItems.find(item => item.preset.id === presetId);

  const touchSize = isTouchDevice ? 64 : 52;
  const fontSize = isTouchDevice ? 17 : 15;
  const cardPadding = isTouchDevice ? 3 : 2.5;
  const iconSize = isTouchDevice ? 28 : 22;

  return (
    <Box sx={{ p: isTouchDevice ? 3 : 2.5, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ 
        display: 'flex', alignItems: 'center', gap: 2.5,
        background: 'linear-gradient(135deg, rgba(231,76,60,0.25) 0%, rgba(192,57,43,0.2) 100%)',
        borderRadius: '20px', px: isTouchDevice ? 4 : 3, py: isTouchDevice ? 3 : 2.5, mb: 3,
        border: '2px solid rgba(231,76,60,0.4)',
      }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: isTouchDevice ? 64 : 54, height: isTouchDevice ? 64 : 54,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          boxShadow: '0 8px 24px rgba(231,76,60,0.5)',
        }}>
          <ShowChartIcon sx={{ fontSize: isTouchDevice ? 36 : 30, color: '#fff' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ 
            fontWeight: 800, fontSize: isTouchDevice ? 26 : 22,
            background: 'linear-gradient(90deg, #f5b7b1 0%, #e74c3c 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Tidslinje
          </Typography>
          <Typography sx={{ fontSize: isTouchDevice ? 15 : 13, color: '#aaa' }}>
            Sekvenser og kombinasjoner
          </Typography>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', gap: 2, mb: 3, p: 2, 
        bgcolor: '#252525', borderRadius: '18px',
        border: '2px solid rgba(255,255,255,0.1)',
      }}>
        <Button
          variant={!comboMode ? 'contained' : 'outlined'}
          startIcon={<PlayArrow sx={{ fontSize: iconSize }} />}
          onClick={() => { setComboMode(false); setComboItems([]); }}
          sx={{
            flex: 1, height: isTouchDevice ? 60 : 52, borderRadius: '14px',
            bgcolor: !comboMode ? '#e74c3c' : 'transparent',
            borderColor: 'rgba(255,255,255,0.25)',
            borderWidth: 2,
            color: '#fff', fontWeight: 700, fontSize: isTouchDevice ? 17 : 15, textTransform: 'none',
            '&:hover': { bgcolor: !comboMode ? '#c0392b' : 'rgba(255,255,255,0.1)' },
          }}
        >
          Enkelt
        </Button>
        <Button
          variant={comboMode ? 'contained' : 'outlined'}
          startIcon={<Layers sx={{ fontSize: iconSize }} />}
          onClick={() => setComboMode(true)}
          sx={{
            flex: 1, height: isTouchDevice ? 60 : 52, borderRadius: '14px',
            bgcolor: comboMode ? '#9b59b6' : 'transparent',
            borderColor: 'rgba(255,255,255,0.25)',
            borderWidth: 2,
            color: '#fff', fontWeight: 700, fontSize: isTouchDevice ? 17 : 15, textTransform: 'none',
            '&:hover': { bgcolor: comboMode ? '#8e44ad' : 'rgba(255,255,255,0.1)' },
          }}
        >
          Kombiner
        </Button>
      </Box>

      {!comboMode && (
        <Box sx={{ 
          mb: 3, p: isTouchDevice ? 3 : 2.5, bgcolor: '#252525', borderRadius: '18px',
          border: '2px solid rgba(255,255,255,0.1)',
        }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: isTouchDevice ? 18 : 16, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: '#e74c3c', fontSize: isTouchDevice ? 26 : 22 }} />
            Avspillingsinnstillinger
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: isTouchDevice ? 16 : 14, color: '#ccc', fontWeight: 500 }}>
                Hastighet
              </Typography>
              <Chip 
                label={`${singleSpeedMultiplier}x`}
                sx={{ bgcolor: '#e74c3c', color: '#fff', fontWeight: 700, height: isTouchDevice ? 36 : 30, fontSize: isTouchDevice ? 16 : 14, px: 1 }}
              />
            </Box>
            <Slider
              value={singleSpeedMultiplier}
              min={0.25}
              max={3}
              step={0.25}
              onChange={(_: Event, val: number | number[]) => setSingleSpeedMultiplier(val as number)}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
                { value: 3, label: '3x' },
              ]}
              sx={{ 
                color: '#e74c3c',
                height: isTouchDevice ? 10 : 6,
                '& .MuiSlider-thumb': { width: isTouchDevice ? 28 : 22, height: isTouchDevice ? 28 : 22 },
                '& .MuiSlider-markLabel': { fontSize: isTouchDevice ? 13 : 11, color: '#888', mt: 0.5 },
                '& .MuiSlider-rail': { opacity: 0.4 },
              }}
            />
          </Box>

          <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.15)' }} />

          <Box sx={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            p: isTouchDevice ? 2.5 : 2, bgcolor: 'rgba(52,152,219,0.15)', borderRadius: '14px',
            border: '2px solid rgba(52,152,219,0.4)',
            minHeight: isTouchDevice ? 64 : 52,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Videocam sx={{ color: '#3498db', fontSize: isTouchDevice ? 28 : 24 }} />
              <Typography sx={{ color: '#fff', fontSize: isTouchDevice ? 16 : 14, fontWeight: 600 }}>
                Tilbakestill kamera først
              </Typography>
            </Box>
            <Switch
              checked={autoResetCamera}
              onChange={(e) => setAutoResetCamera(e.target.checked)}
              sx={{
                transform: isTouchDevice ? 'scale(1.3)' : 'scale(1.1)',
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#3498db' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3498db' },
              }}
            />
          </Box>
        </Box>
      )}

      {comboMode && (
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ 
            p: 2, bgcolor: '#252525', borderRadius: '14px',
            border: cameraConflict ? '2px solid #e74c3c' : '1px solid rgba(255,255,255,0.08)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
                Kombinasjon ({comboItems.length} valgt)
              </Typography>
              <ToggleButtonGroup
                value={executionMode}
                exclusive
                onChange={(_, val) => val && setExecutionMode(val)}
                size="small"
              >
                <ToggleButton value="parallel" sx={{ 
                  color: '#fff', px: 2,
                  '&.Mui-selected': { bgcolor: '#1abc9c', color: '#fff' },
                }}>
                  <Tooltip title="Kjør samtidig"><Layers sx={{ mr: 0.5 }} /></Tooltip>
                  Parallell
                </ToggleButton>
                <ToggleButton value="sequential" sx={{ 
                  color: '#fff', px: 2,
                  '&.Mui-selected': { bgcolor: '#f39c12', color: '#fff' },
                }}>
                  <Tooltip title="Kjør etter hverandre"><Queue sx={{ mr: 0.5 }} /></Tooltip>
                  Sekvens
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {cameraConflict && (
              <Box sx={{ 
                display: 'flex', alignItems: 'center', gap: 1, mb: 2,
                p: 1.5, bgcolor: 'rgba(231,76,60,0.2)', borderRadius: '8px',
              }}>
                <Warning sx={{ color: '#e74c3c' }} />
                <Typography sx={{ color: '#e74c3c', fontSize: 13 }}>
                  Flere kamera-sekvenser kan ikke kjøres parallelt. Bruk Sekvens-modus.
                </Typography>
              </Box>
            )}

            {comboItems.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                {comboItems.map((item, idx) => {
                  const catInfo = CATEGORY_INFO[item.preset.category];
                  const isEditing = editingItemId === item.preset.id;
                  const effectiveDuration = item.customDuration / item.speedMultiplier;
                  return (
                    <Box key={item.preset.id} sx={{ mb: 1 }}>
                      <Box sx={{ 
                        display: 'flex', alignItems: 'center', gap: 1,
                        p: 1.5, bgcolor: isEditing ? `${catInfo.color}20` : 'rgba(255,255,255,0.05)',
                        borderRadius: '10px', border: `1px solid ${isEditing ? catInfo.color : 'transparent'}`,
                      }}>
                        {executionMode === 'sequential' && (
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#666', minWidth: 20 }}>
                            {idx + 1}.
                          </Typography>
                        )}
                        <Box sx={{ 
                          width: 32, height: 32, borderRadius: '8px', bgcolor: catInfo.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          '& svg': { fontSize: 18, color: '#fff' },
                        }}>
                          {catInfo.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>
                            {item.preset.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#888' }}>
                            {effectiveDuration.toFixed(1)}s @ {item.speedMultiplier}x
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => setEditingItemId(isEditing ? null : item.preset.id)}
                          sx={{ color: isEditing ? catInfo.color : '#666' }}
                        >
                          <Settings sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setComboItems(comboItems.filter(i => i.preset.id !== item.preset.id));
                            if (isEditing) setEditingItemId(null);
                          }}
                          sx={{ color: '#666' }}
                        >
                          <Close sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                      <Collapse in={isEditing}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '0 0 10px 10px', mt: -0.5 }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography sx={{ fontSize: 12, color: '#888', mb: 1 }}>
                              Varighet: {item.customDuration.toFixed(1)}s
                            </Typography>
                            <Slider
                              value={item.customDuration}
                              min={0.5}
                              max={15}
                              step={0.5}
                              onChange={(_: Event, val: number | number[]) => handleUpdateComboItem(item.preset.id, { customDuration: val as number })}
                              sx={{ 
                                color: catInfo.color,
                                '& .MuiSlider-thumb': { width: 16, height: 16 },
                              }}
                            />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 12, color: '#888', mb: 1 }}>
                              Hastighet: {item.speedMultiplier}x
                            </Typography>
                            <Slider
                              value={item.speedMultiplier}
                              min={0.25}
                              max={3}
                              step={0.25}
                              onChange={(_: Event, val: number | number[]) => handleUpdateComboItem(item.preset.id, { speedMultiplier: val as number })}
                              marks={[
                                { value: 0.5, label: '0.5x' },
                                { value: 1, label: '1x' },
                                { value: 2, label: '2x' },
                              ]}
                              sx={{ 
                                color: catInfo.color,
                                '& .MuiSlider-thumb': { width: 16, height: 16 },
                                '& .MuiSlider-markLabel': { fontSize: 10, color: '#666' },
                              }}
                            />
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography sx={{ color: '#666', fontSize: 13, mb: 2, textAlign: 'center', py: 2 }}>
                Trykk på sekvenskort for å legge til i kombinasjonen
              </Typography>
            )}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Box sx={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2,
              p: 1.5, bgcolor: 'rgba(52,152,219,0.1)', borderRadius: '10px',
              border: '1px solid rgba(52,152,219,0.3)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Videocam sx={{ color: '#3498db', fontSize: 20 }} />
                <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                  Tilbakestill kamera først
                </Typography>
              </Box>
              <Switch
                checked={autoResetCamera}
                onChange={(e) => setAutoResetCamera(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#3498db' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3498db' },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography sx={{ color: '#aaa', fontSize: isTouchDevice ? 16 : 14, fontWeight: 500 }}>
                Total varighet: <strong style={{ color: '#fff', fontSize: isTouchDevice ? 18 : 16 }}>{totalDuration.toFixed(1)}s</strong>
              </Typography>
              <Button
                onClick={() => { setComboItems([]); setEditingItemId(null); }}
                sx={{ color: '#999', textTransform: 'none', fontSize: isTouchDevice ? 15 : 14, fontWeight: 600, px: 2, py: 1 }}
              >
                Nullstill
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<PlaylistPlay sx={{ fontSize: isTouchDevice ? 28 : 24 }} />}
              onClick={handleApplyCombo}
              disabled={comboItems.length === 0 || cameraConflict || playingId !== null}
              sx={{
                height: isTouchDevice ? 60 : 52,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                fontWeight: 700, fontSize: isTouchDevice ? 18 : 16, textTransform: 'none',
                boxShadow: '0 6px 24px rgba(155,89,182,0.5)',
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: '#666' },
              }}
            >
              {playingId === 'combo' ? 'Spiller av...' : 'Kjør Kombinasjon'}
            </Button>
          </Box>
        </Box>
      )}

      {!comboMode && (
        <Box sx={{ mb: 3.5 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: isTouchDevice ? 18 : 16, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PlaylistPlay sx={{ color: '#9b59b6', fontSize: isTouchDevice ? 26 : 22 }} />
            Ferdige Kombinasjoner
          </Typography>
          <Grid container spacing={isTouchDevice ? 2 : 1.5}>
            {COMBO_PRESETS.map(combo => (
              <Grid size={{ xs: 6 }} key={combo.id}>
                <Card
                  onClick={() => handleApplyComboPreset(combo)}
                  sx={{
                    bgcolor: playingId === combo.id ? 'rgba(155,89,182,0.2)' : '#252525',
                    border: `3px solid ${playingId === combo.id ? '#9b59b6' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '16px', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: isTouchDevice ? 110 : 90,
                    '&:hover': { borderColor: '#9b59b6', transform: 'translateY(-2px)' },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  <CardContent sx={{ p: isTouchDevice ? 2 : 1.5, '&:last-child': { pb: isTouchDevice ? 2 : 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={combo.mode === 'parallel' ? 'Parallell' : 'Sekvens'}
                        sx={{
                          height: isTouchDevice ? 28 : 24, fontSize: isTouchDevice ? 13 : 11,
                          bgcolor: combo.mode === 'parallel' ? '#1abc9c30' : '#f39c1230',
                          color: combo.mode === 'parallel' ? '#1abc9c' : '#f39c12',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: isTouchDevice ? 17 : 15, color: '#fff', lineHeight: 1.3 }}>
                      {combo.name}
                    </Typography>
                    <Typography sx={{ fontSize: isTouchDevice ? 13 : 12, color: '#999', mt: 0.5, lineHeight: 1.3 }}>
                      {combo.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Box sx={{ 
        display: 'flex', alignItems: 'center', bgcolor: '#252525', 
        borderRadius: '18px', px: 3, py: isTouchDevice ? 2 : 1.5, mb: 3,
        minHeight: touchSize, border: '2px solid rgba(255,255,255,0.12)',
        '&:focus-within': { borderColor: '#e74c3c', boxShadow: '0 0 0 3px rgba(231,76,60,0.2)' },
      }}>
        <SearchIcon sx={{ color: '#888', mr: 2, fontSize: isTouchDevice ? 28 : 24 }} />
        <InputBase
          placeholder="Søk sekvenser..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, color: '#fff', fontSize: isTouchDevice ? 18 : 16, '& input': { py: 0.5 } }}
        />
        {search && (
          <IconButton onClick={() => setSearch('')} sx={{ color: '#888', p: 1.5 }}>
            <Close sx={{ fontSize: isTouchDevice ? 26 : 22 }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: isTouchDevice ? 2 : 1.5, flexWrap: 'wrap', mb: 3.5 }}>
        <Chip
          icon={<TimelineIcon sx={{ fontSize: isTouchDevice ? 22 : 20 }} />}
          label="Alle"
          onClick={() => setActiveCategory('alle')}
          sx={{
            bgcolor: activeCategory === 'alle' ? '#e74c3c' : '#2a2a2a',
            color: '#fff', fontWeight: 700, 
            height: isTouchDevice ? 52 : 44,
            fontSize: isTouchDevice ? 16 : 14,
            px: 1,
            border: activeCategory === 'alle' ? '2px solid #e74c3c' : '2px solid rgba(255,255,255,0.1)',
            '& .MuiChip-icon': { color: '#fff' },
            '&:hover': { transform: 'scale(1.02)' },
          }}
        />
        {Object.entries(CATEGORY_INFO).map(([key, { label, icon, color }]) => (
          <Chip
            key={key}
            icon={icon as React.ReactElement}
            label={label}
            onClick={() => setActiveCategory(key)}
            sx={{
              bgcolor: activeCategory === key ? color : '#2a2a2a',
              color: '#fff', fontWeight: 700, 
              height: isTouchDevice ? 52 : 44,
              fontSize: isTouchDevice ? 16 : 14,
              px: 1,
              border: activeCategory === key ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.1)',
              '& .MuiChip-icon': { color: '#fff', fontSize: isTouchDevice ? 22 : 20 },
              '&:hover': { transform: 'scale(1.02)' },
            }}
          />
        ))}
      </Box>

      <Grid container spacing={isTouchDevice ? 2.5 : 2}>
        {filteredPresets.map(preset => {
          const categoryInfo = CATEGORY_INFO[preset.category];
          const isPlaying = playingId === preset.id;
          const isHovered = hoveredId === preset.id;
          const inCombo = isInCombo(preset.id);
          
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={preset.id}>
              <Card
                onMouseEnter={() => setHoveredId(preset.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleApplyPreset(preset)}
                sx={{
                  bgcolor: inCombo ? `${categoryInfo.color}20` : '#252525',
                  border: `3px solid ${inCombo ? categoryInfo.color : isHovered ? `${categoryInfo.color}60` : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '20px', cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  minHeight: isTouchDevice ? 140 : 110,
                  '&:hover': { borderColor: categoryInfo.color, transform: 'translateY(-3px)' },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                {inCombo && (
                  <Box sx={{
                    position: 'absolute', top: -12, right: -12, zIndex: 1,
                    width: isTouchDevice ? 36 : 30, height: isTouchDevice ? 36 : 30, borderRadius: '50%',
                    bgcolor: categoryInfo.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 3px 12px ${categoryInfo.color}80`,
                  }}>
                    <Check sx={{ fontSize: isTouchDevice ? 24 : 20, color: '#fff' }} />
                  </Box>
                )}
                
                {isPlaying && (
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: isTouchDevice ? 5 : 4,
                    bgcolor: 'rgba(0,0,0,0.3)', overflow: 'hidden', borderRadius: '20px 20px 0 0',
                  }}>
                    <Box sx={{
                      height: '100%', bgcolor: categoryInfo.color,
                      animation: `progressBar ${preset.duration}s linear forwards`,
                      '@keyframes progressBar': { '0%': { width: '0%' }, '100%': { width: '100%' } },
                    }} />
                  </Box>
                )}
                
                <CardContent sx={{ p: isTouchDevice ? 2.5 : 2, '&:last-child': { pb: isTouchDevice ? 2.5 : 2 } }}>
                  <Box sx={{ display: 'flex', gap: 2.5 }}>
                    <Box sx={{
                      width: isTouchDevice ? 80 : 68, height: isTouchDevice ? 80 : 68,
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, ${categoryInfo.color}15 0%, ${categoryInfo.color}30 100%)`,
                      border: `2px solid ${categoryInfo.color}50`,
                      flexShrink: 0,
                    }}>
                      <AnimatedPreview type={preset.previewIcon} color={categoryInfo.color} isHovered={isHovered} />
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: isTouchDevice ? 18 : 16, color: '#fff', mb: 0.5 }}>
                        {preset.name}
                      </Typography>
                      <Typography sx={{ fontSize: isTouchDevice ? 14 : 13, color: '#999', mb: 1.5, lineHeight: 1.4 }}>
                        {preset.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Chip
                          icon={<Timer sx={{ fontSize: isTouchDevice ? 18 : 16 }} />}
                          label={`${preset.duration}s`}
                          sx={{ height: isTouchDevice ? 32 : 28, fontSize: isTouchDevice ? 14 : 12, bgcolor: 'rgba(255,255,255,0.1)', color: '#bbb', '& .MuiChip-icon': { color: '#bbb' } }}
                        />
                        <Chip
                          label={categoryInfo.label}
                          sx={{ height: isTouchDevice ? 32 : 28, fontSize: isTouchDevice ? 14 : 12, bgcolor: `${categoryInfo.color}30`, color: categoryInfo.color }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  
                  {!comboMode && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PlayArrow sx={{ fontSize: isTouchDevice ? 24 : 20 }} />}
                      disabled={isPlaying}
                      sx={{
                        mt: 2, height: isTouchDevice ? 56 : 48, borderRadius: '14px',
                        background: categoryInfo.gradient, fontWeight: 700, textTransform: 'none',
                        fontSize: isTouchDevice ? 17 : 15,
                        boxShadow: `0 4px 20px ${categoryInfo.color}40`,
                      }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleApplyPreset(preset); }}
                    >
                      {isPlaying ? 'Spiller...' : 'Kjør Sekvens'}
                    </Button>
                  )}
                  
                  {comboMode && (
                    <Button
                      fullWidth
                      variant={inCombo ? 'contained' : 'outlined'}
                      startIcon={inCombo ? <Check sx={{ fontSize: isTouchDevice ? 24 : 20 }} /> : <Add sx={{ fontSize: isTouchDevice ? 24 : 20 }} />}
                      sx={{
                        mt: 2, height: isTouchDevice ? 56 : 48, borderRadius: '14px',
                        bgcolor: inCombo ? categoryInfo.color : 'transparent',
                        borderColor: categoryInfo.color, borderWidth: 2,
                        color: inCombo ? '#fff' : categoryInfo.color,
                        fontWeight: 700, textTransform: 'none',
                        fontSize: isTouchDevice ? 17 : 15,
                      }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleApplyPreset(preset); }}
                    >
                      {inCombo ? 'Valgt' : 'Legg til'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

export default TidslinjeLibraryPanel;

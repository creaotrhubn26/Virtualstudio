/**
 * Constants for PanelCreator
 */

import {
  Help,
  Note,
  Movie,
  Inventory,
  Timer,
  Lightbulb,
  CameraAlt,
  Person,
  Settings,
  Public,
} from '@mui/icons-material';
import { CreatorHubFunction, MarketplaceService } from './types';

// Available CreatorHub Virtual Studio functions
export const CREATORHUB_FUNCTIONS: CreatorHubFunction[] = [
  { id: 'help', name: 'Hjelp & Dokumentasjon', description: 'Hjelp-panel med dokumentasjon og veiledninger', icon: Help },
  { id: 'notes', name: 'Notater', description: 'Notat-panel for å ta notater', icon: Note },
  { id: 'scenes', name: 'Scener', description: 'Scene-bibliotek og scener', icon: Movie },
  { id: 'assets', name: 'Assets', description: 'Asset-bibliotek', icon: Inventory },
  { id: 'timeline', name: 'Tidslinje', description: 'Animasjon tidslinje', icon: Timer },
  { id: 'lights', name: 'Lys', description: 'Lys-bibliotek og kontroller', icon: Lightbulb },
  { id: 'camera', name: 'Kamera', description: 'Kamera-utstyr og kontroller', icon: CameraAlt },
  { id: 'characters', name: 'Karakterer', description: 'Karakter-bibliotek', icon: Person },
  { id: 'equipment', name: 'Utstyr', description: 'Utstyr-bibliotek', icon: Settings },
  { id: 'hdri', name: 'HDRI', description: 'HDRI-bibliotek', icon: Public },
];

// Default marketplace services (these would normally come from marketplace API)
export const MARKETPLACE_SERVICES: MarketplaceService[] = [
  { 
    id: 'casting-planner', 
    name: 'Casting Planner', 
    description: 'Planlegg casting og rollebesetning for ditt prosjekt', 
    icon: 'TheaterComedy',
    installed: false,
    category: 'service',
    version: '1.0.0',
    author: 'CreatorHub'
  },
  { 
    id: 'ai-assistant', 
    name: 'AI Assistant', 
    description: 'AI-assistent for scene-oppsett og kreativ hjelp', 
    icon: 'SmartToy',
    installed: false,
    category: 'service',
    version: '1.0.0',
    author: 'CreatorHub'
  },
  { 
    id: 'analytics', 
    name: 'Analytics Dashboard', 
    description: 'Analytikk og statistikk for prosjekter', 
    icon: 'BarChart',
    installed: false,
    category: 'service',
    version: '1.0.0',
    author: 'CreatorHub'
  },
  { 
    id: 'collaboration', 
    name: 'Team Collaboration', 
    description: 'Samarbeidsverktøy for teamet ditt', 
    icon: 'People',
    installed: false,
    category: 'service',
    version: '1.0.0',
    author: 'CreatorHub'
  },
  { 
    id: 'export-manager', 
    name: 'Export Manager', 
    description: 'Avansert eksport-verktøy for prosjekter', 
    icon: 'Upload',
    installed: false,
    category: 'service',
    version: '1.0.0',
    author: 'CreatorHub'
  },
];















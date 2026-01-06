/**
 * CreatorHub Norge - Project Creation Modal
 * The modal is designed to be used in the CreatorHub Norge Virtual studio for creating new projects,but should be adaptable for other professions and also connected to the Casting Planner.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { trackButtonClick, trackModalOpen } from '@/hooks/useActionTracker';
// Import dynamic profession system
import { useProfessionConfigs } from '@/hooks/useProfessionConfigs';
import { useProfessionAdapter } from '@/hooks/useProfessionAdapter';
import getProfessionIcon from '@/utils/profession-icons';
import { useDynamicProfessions } from '../universal/hooks/useDynamicProfessions';
import { getProjectTypeNextSteps, getProjectTypeInitialDescription } from '@/utils/project-worklog-helpers';
// New context imports
import { useProject } from '../../contexts/ProjectContext';
// Comprehensive feature system integration
import { useEnhancedMasterIntegration } from '../../integration/EnhancedMasterIntegrationProvider';
import { useTheming } from '../../utils/theming-helper';
import { useExternalData } from '../../services/ExternalDataService';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { useRealTime } from '../../hooks/useRealTime';
import { apiRequest } from '../../lib/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Checkbox,
  Radio,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Stack,
  Paper,
  Drawer,
  IconButton,
  Tooltip,
  Badge,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import {
  PhotoCamera,
  Videocam,
  Event,
  Folder,
  Memory,
  CloudUpload,
  Check,
  Schedule,
  Assignment,
  Storage,
  LocationOn,
  People,
  Settings,
  PersonAdd,
  EventNote,
  Lightbulb,
  Save,
  Delete,
  AttachMoney,
  Refresh,
  ShoppingCart,
  Payment,
  DirectionsCar,
  Notes,
  // Project type icons
  Favorite,
  Portrait,
  Business,
  MusicNote,
  // Wedding culture icons
  AccountBalance,
  Star,
  Movie,
  ShoppingBag,
  ExpandMore,
  Groups,
  Group,
  Church,
  Home,
  Public,
  Circle,
  // Draft management icons
  History,
  Compare,
  Restore,
  Publish,
  Drafts,
  Visibility,
  VisibilityOff,
  ChevronLeft,
  ChevronRight,
  Timeline,
  CloudDone,
  AccessTime,
  Edit,
  CheckCircle,
  Warning,
  Info,
  Person,
  School,
  Work,
  SportsEsports,
  Campaign,
  Article,
  TheaterComedy,
  AutoAwesome,
  CameraAlt,
  Mic,
} from '@mui/icons-material';
import MemoryCardIcon from '../ui/MemoryCardIcon';
import MemoryCardSelector from '../memory-card/MemoryCardSelector';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useVisualEditor } from '../admin/visual-editor/VisualEditorContext';
import { useLeadImport } from '@/hooks/useLeadImport';
import ProjectHealthCheck from './ProjectHealthCheck';
import ProjectCollaborators from './ProjectCollaborators';
import { VIDEO_CAMERA_DATABASE, getCamerasByProfession, getLogFormatsByCamera, getCameraBrand } from '../../data/video-camera-database';
import { PHOTO_CAMERA_DATABASE, getPhotoCamerasByProfession, getPhotoCameraBrand } from '../../data/photo-camera-database';
import { MemoryCardRecommendationEngine, getMemoryCardTypesByProfession, formatCurrency, convertCurrency } from '../../data/memory-card-database';
import EnhancedMemoryCardSelector from '../memory-card/EnhancedMemoryCardSelector';
import { useNavigate } from 'react-router-dom';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import AddProjectTypeDialog from './AddProjectTypeDialog';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../hooks/useAuth';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { PROJECT_TYPES } from './projectTypeConstants';
import { ContactPicker } from './ContactPicker';
import { ContactProjectInfoSummary } from './ContactProjectInfoSummary';
import { logger } from '../../core/services/logger';
import type { ProjectData, MemoryCardConfig, SelectedMemoryCard, LabelingKey } from './types';
import type { SplitSheetContributor, ContributorRole } from '../split-sheets/types';

const log = logger.module('ProjectCreationModal');

// Function to generate PIN code from project name
const generatePinFromProjectName = (projectName: string): string => {
  if (!projectName) return '';
  
  // Remove special characters and spaces, convert to lowercase
  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, ',');
  
  // Safety check for empty clean name
  if (!cleanName || cleanName.length === 0) return '0000';
  
  // Create a simple hash from the project name
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
}
  
  // Convert to positive number and create 4-digit PIN
  const pin = Math.abs(hash).toString().slice(-4).padStart(4, '0');
  return pin;
};

// PROJECT_TYPES moved to projectTypeConstants.ts

// Project type categories for all project types - expandable and customizable
const PROJECT_TYPE_CATEGORIES = {
  wedding: {
    name: 'Bryllup',
    cultures: {
      norsk: {
        name: 'Norsk bryllup',
        typical_days: 1,
        day_names: ['Bryllupsdag'],
        description: 'Tradisjonelt norsk bryllup vanligvis én dag',
        icon: Event,
        color: '#E30617'
    },
      sikh: {
        name: 'Sikh bryllup',
        typical_days: 3,
        day_names: ['Chooda & Haldi','Sangeet','Anand Karaj & Reception'],
        description: 'Komplett Sikh bryllup med Chooda Haldi, Sangeet, Baraat, Anand Karaj og Langar',
        icon: AccountBalance,
        color: '#FF6B35'
    },
      indisk: {
        name: 'Indisk bryllup (Hindu)',
        typical_days: 4,
        day_names: ['Ganesh Puja & Haldi','Mehendi','Sangeet','Vielse & Reception'],
        description: 'Komplett Hindu bryllup med Ganesh Puja, Haldi, Mehendi, Sangeet, Saptapadi og Mangalsutra',
        icon: AccountBalance,
        color: '#FF9500'
    },
      pakistansk: {
        name: 'Pakistansk bryllup',
        typical_days: 3,
        day_names: ['Mehndi & Sangeet','Baraat & Nikkah','Walima resepsjon'],
        description: 'Komplett pakistansk bryllup med Mehndi, Baraat, Nikkah og Walima',
        icon: Home,
        color: '#00A651'
    },
      tyrkisk: {
        name: 'Tyrkisk bryllup',
        typical_days: 2,
        day_names: ['Kına Gecesi (Henna)','Düğün (Bryllup)'],
        description: 'Tradisjonell tyrkisk bryllupsfeiring',
        icon: Star,
        color: '#E30A17'
    },
      arabisk: {
        name: 'Arabisk bryllup',
        typical_days: 2,
        day_names: ['Nikah vielse','Zaffe & Walima'],
        description: 'Islamsk vielse med tradisjonell oppsett',
        icon: Home,
        color: '#007A3D'
    },
      somalisk: {
        name: 'Somalisk bryllup',
        typical_days: 2,
        day_names: ['Nikah seremoni','Aroos feiring'],
        description: 'Somaliske tradisjoner med kulturell musikk',
        icon: Star,
        color: '#4189DD'
    },
      etiopisk: {
        name: 'Etiopisk bryllup',
        typical_days: 2,
        day_names: ['Telosh seremoni','Kulturell resepsjon'],
        description: 'Etiopisk ortodoks tradisjon med kaffe-seremoni',
        icon: Church,
        color: '#FCDD09'
    },
      nigeriansk: {
        name: 'Nigeriansk bryllup',
        typical_days: 2,
        day_names: ['White Wedding','Traditional Wedding'],
        description: 'Kombinerer vestlige og tradisjonelle nigerianske ritualer',
        icon: Public,
        color: '#008751'
    },
      muslimsk: {
        name: 'Muslimsk bryllup',
        typical_days: 2,
        day_names: ['Mehendi kveld','Nikkah & Walima'],
        description: 'Islamsk bryllup med Mehndi, Nikkah kontrakt og Walima feiring',
        icon: Home,
        color: '#239F40'
    },
      libanesisk: {
        name: 'Libanesisk bryllup',
        typical_days: 2,
        day_names: ['Henna Party','Zaffe & Reception'],
        description: 'Libanesisk tradisjon med spektakulær Zaffe innmarsj og dabke dans',
        icon: Star,
        color: '#FF0000'
    },
      filipino: {
        name: 'Filipino bryllup',
        typical_days: 2,
        day_names: ['Despedida de Soltera','Wedding & Reception'],
        description: 'Filipino tradisjon med Pamamanhikan, Arras mynter og Veil/Cord seremoni',
        icon: Public,
        color: '#0038A8'
    },
      kinesisk: {
        name: 'Kinesisk bryllup',
        typical_days: 2,
        day_names: ['Tea Ceremony & Hair Combing','Door Games & Banquet'],
        description: 'Tradisjonell kinesisk vielse med te-seremoni, Door Games og Lion Dance',
        icon: Circle,
        color: '#DE2910'
    },
      koreansk: {
        name: 'Koreansk bryllup',
        typical_days: 1,
        day_names: ['Pyebaek & Wedding Hall'],
        description: 'Moderne koreansk vielse med tradisjonelle elementer',
        icon: Circle,
        color: '#003478'
    },
      thai: {
        name: 'Thai bryllup',
        typical_days: 1,
        day_names: ['Khan Maak & Rod Nam Sang'],
        description: 'Thai tradisjoner med vann-velsignelse',
        icon: AccountBalance,
        color: '#A51931'
    },
      iransk: {
        name: 'Iransk/Persisk bryllup',
        typical_days: 1,
        day_names: ['Aghd & Aroosi'],
        description: 'Persisk vielse med Sofreh-e Aghd',
        icon: Star,
        color: '#239F40'
    },
      annet: {
        name: 'Annet/Tilpasset arrangement',
        typical_days: 1,
        day_names: ['Tilpasset dag'],
        description: 'Fleksibel struktur for andre kulturer eller blandede tradisjoner',
        icon: Public,
        color: '#666666'
    }
  }
},
  event: {
    name: 'Event',
    defaultCategories: ['Innledning','Hovedprogram','Avslutning'],
    description: 'Konferanser, seminarer, festivaler og andre arrangementer'
},
  portrait: {
    name: 'Portrett',
    defaultCategories: ['Studio setup','Hovedfotografering','Kreative shots'],
    description: 'Individuell og familiefotografering'
},
  commercial: {
    name: 'Kommersiell',
    defaultCategories: ['Produktfoto','Miljøbilder','Team/Corporate'],
    description: 'Bedriftsfotografering og produktfoto'
},
  video: {
    name: 'Video',
    defaultCategories: ['Pre-production','Hovedinnspilling','B-roll'],
    description: 'Videoproduksjon og filming'
},
  music: {
    name: 'Musikk',
    defaultCategories: ['Opptak','Mixing','Mastering'],
    description: 'Musikkproduksjon og lydarbeid'
}
};

// For backward compatibility - extract wedding cultures
const WEDDING_CULTURES = PROJECT_TYPE_CATEGORIES.wedding.cultures;

// Cultural day explanations for dialog system
const CULTURAL_DAY_EXPLANATIONS: Record<string, Record<string, string>> = {
  sikh: {
    'Chooda & Haldi':'Chooda er en seremoni hvor bruden får røde armbånd og Haldi innebærer å smøre gurkemeie på brudeparet for renselse og velsignelser.','Sangeet':'En musikkfylt feiring med dans og sanger der familiene forbereder seg til bryllupet med glede og tradisjonelle opptredener.','Anand Karaj & Reception' : 'Anand Karaj er den hellige Sikh vielsesseremonien i Gurdwara, fulgt av resepsjon med mat og feiring.'
  },
  indisk: {
    'Ganesh Puja & Haldi':'Ganesh Puja ber om velsignelser fra Ganeshas for å fjerne hindringer og Haldi påføres brudeparet for å rense og beskytte.','Mehendi':'Kunstferdig hennamaling påføres brudens hender og føtter i komplekse mønstre som symboliserer glede, åndelig oppvåkning og tilbud.','Sangeet':'En livlig feiring med tradisjonelle sanger, dans og musikk der begge familier deltar i opptredener og konkurranser.','Vielse & Reception' : 'Den hellige Hindu vielsesseremonien med Saptapadi (syv skritt) og Mangalsutra, fulgt av festmiddag og tradisjonelle ritualer.'
  },
  pakistansk: {
    'Mehndi & Sangeet':'Mehndi feiring hvor bruden får henna påført mens familie og venner synger tradisjonelle pakistanske bryllupssanger med tradisjonell musikk og dans.','Baraat & Nikkah':'Baraat er brudgommens entre til bryllupet, og Nikkah er den religiøse islamske vielsesseremonien med signering av nikah-kontrakt.','Walima resepsjon' : 'Walima er den tradisjonelle resepsjonen arrangert av brudgommens familie for å feire det nye ekteskapet med mat og glede.'
  },
  tyrkisk: {
    'Kına Gecesi (Henna)':'En tradisjonsrik kveld hvor bruden får henna påført hendene mens kvinnelige gjester synger sorgtunge sanger om å forlate barndomshjemmet.','Düğün (Bryllup)' : 'Den offisielle bryllupsdagen med sivil eller religiøs seremoni, fulgt av stor feiring med tradisjonell tyrkisk mat, musikk og dans.'
  },
  arabisk: {
    'Nikah vielse':'Den islamske vielsesseremonien hvor nikah-kontrakten signeres i nærvær av vitner og familie, ofte fulgt av duaa og bønner.','Zaffe & Walima' : 'Zaffe er en spektakulær prosesjon med musikk og dans som leder brudeparet til festen, fulgt av Walima resepsjon.'
  },
  somalisk: {
    'Nikah seremoni':'Den religiøse islamske vielsen med recitasjon av Koranen, nikah-kontrakt og duaa i nærvær av familie og samfunn.','Aroos feiring' : 'Tradisjonell somalisk bryllupsfeiring med autentisk mat, kulturdans, poesi og musikk som feirer det nye ekteskapet.'
  },
  etiopisk: {
    'Telosh seremoni':'En tradisjonell etiopisk førbryllups-seremoni med velsignelser, bønner og familiesamling før den offisielle vielsen.','Kulturell resepsjon' : 'Storslått feiring med tradisjonell etiopisk kaffe-seremoni, injera mat, kulturell musikk og dans som feirer den nye familien.'
  },
  nigeriansk: {
    'White Wedding':'Vestlig-stil bryllup i kirke eller seremoni-lokale med hvit kjole og tradisjonelle europeiske bryllupstradisjoner.','Traditional Wedding' : 'Autentisk nigeriansk kulturell seremoni med tradisjonelle klær, ritualer, maten og musikk spesifikk for familiens stamme eller region.'
  },
  muslimsk: {
    'Mehendi kveld':'En intim feiring hvor bruden og kvinnelige gjester får henna påført i vakre mønstre mens de synger tradisjonelle sanger.','Nikkah & Walima' : 'Nikkah er den offisielle islamske vielsesseremonien med kontraktsignering, fulgt av Walima resepsjon for å feire ekteskapet.'
  },
  libanesisk: {
    'Henna Party':'En livlig feiring hvor bruden får henna påført av eldre kvinnelige slektninger mens gjester deltar i tradisjonell libanesisk musikk.','Zaffe & Reception' : 'Spektakulær Zaffe innmarsj med trommer og ululating, fulgt av resepsjon med autentisk libanesisk mat og tradisjonell dabke dans.'
  }
};

// Cultural day worklog tips and suggestions
const CULTURAL_DAY_WORKLOG_TIPS: Record<string, Record<string, {
  tasks: string[];
  considerations: string[];
  timeManagement: string;
  keyContacts: string[];
  equipment: string[];
}>> = {
  sikh: {
    'Chooda & Haldi': {
      tasks: [
        "Møte med familiene for å diskutere tidsplan","Undersøke ceremoni-lokalet og lysforhold","Planlegge foto-øyeblikk for Chooda-seremonien","Koordinere med andre fotografer/videografer","Sjekke tradisjonelle klær og farger for bedre bildekvalitet"
      ],
      considerations: [
        "Haldi kan gjøre klær gule - planlegg utstyr deretter","Respekter hellige øyeblikk - ikke all fotografering er tillatt","Kvinner og menn kan ha separate seremonier","Røde Chooda-armbånd er meget viktige - få nærbilder","Familietradisjoner kan variere - spør alltid først"
      ],
      timeManagement: "Start tidlig på dagen, ceremoni kan ta 3-4 timer",
      keyContacts: ["Brudgens familie","Religiøs leder","Event coordinator"],
      equipment: ["85mm linse for portretter","Rask autofokus for bevegelse","Backup minnekort"]
    },
    'Sangeet': {
      tasks: [
        "Planlegge bevegelige kameraposisjoner for dans","Teste lydnivå for video-opptak","Koordinere med DJ/musikere","Identifisere VIP-gjester som må fotograferes","Planlegge gruppefoto-øyeblikk"
      ],
      considerations: [
        "Sangeet er en gledesfull begivenhet - fang energien","Dans og musikk - høy ISO og fast lukkertid nødvendig","Fargerike outfits - juster hvitbalanse","Begge familier deltar - få balansert dekning","Kan være sent på kvelden - planlegg belysning"
      ],
      timeManagement: "Lang kveld, 6-8 timer med pauser",
      keyContacts: ["Event planner","DJ/musikere","Begge familier"],
      equipment: ["70-200mm for scenefoto","Flash for indoors","Ekstra batterier"]
    },
    'Anand Karaj & Reception': {
      tasks: [
        "Lære Sikh vielsesritualer på forhånd","Planlegge diskret fotografering i Gurdwara","Koordinere med Granthi (religiøs leder)","Identifisere Saptapadi (syv skritt) øyeblikk","Planlegge resepsjons-fotografering"
      ],
      considerations: [
        "Sko må av i Gurdwara - planlegg utstyr transport","Hellig sted - vær meget respektfull","Fire runder rundt Guru Granth Sahib er viktige","Langar (gratis måltid) er tradisjon","Kirpan (seremonieschwert) er hellig gjenstand"
      ],
      timeManagement: "Vielse 2-3 timer, resepsjon 4-5 timer",
      keyContacts: ["Granthi","Gurdwara komité","Begge familier"],
      equipment: ["24-70mm zoom","Silent shooting mode","Respektfulle klær"]
  }
},
  indisk: {
    'Ganesh Puja & Haldi': {
      tasks: [
        "Lære om Ganesh Puja ritualer på forhånd","Planlegge ceremonifotografering uten å forstyrre","Undersøke tradisjonelle elementer å fokusere på","Koordinere med prest/religiøs leder","Planlegge familiegruppefoto etter seremoni"
      ],
      considerations: [
        "Ganesh Puja er hellig - vær respektfull og diskret","Haldi-pasta gjør alt gult - beskytt utstyr","Mange ritualer krever stillhet","Blomster og offerings er viktige detaljer","Eldre familiemedlemmer kan ha spesielle roller"
      ],
      timeManagement: "Hellig seremoni 2-3 timer, deretter Haldi 1-2 timer",
      keyContacts: ["Hindu prest","Brudens familie","Brudgommens familie"],
      equipment: ["50mm for intimitet","Makro linse for detaljer","Stille kamera-modus"]
  }
},
  pakistansk: {
    'Mehndi & Sangeet': {
      tasks: [
        "Planlegge hennamaling close-up fotografering","Koordinere med henna-artisten","Identifisere familiesanger som skal fanges","Planlegge gruppefoto av kvinnelige gjester","Teste fargebalanse for gul/orange belysning"
      ],
      considerations: [
        "Mehndi er ofte kun for kvinner - mann-fotograf kan ha begrenset tilgang","Intrikate henna-mønstre krever makro-fotografering","Tradisjonelle pakistanske sanger - ta lydopptak","Sari og lehenga har vakre detaljer","Kan være formiddags eller kveld - sjekk tidsplan"
      ],
      timeManagement: "Mehndi 3-4 timer, musikk og dans 2-3 timer",
      keyContacts: ["Henna artist","Brudens søstre/kusiner","Musikere"],
      equipment: ["Macro linse 100mm","Ring light for henna","Audio recorder"]
  }
}
};

// Project phases for worklog organization
const PROJECT_PHASES: Record<string, { name: string; description: string; color: string; categories: string[] }> = {
  pre_production: {
    name: 'Pre-production',
    description: 'Planlegging, research, møter, forberedelser',
    color: '#2196f3',
    categories: ['planning','client_meeting','cultural_research','equipment_prep','location_scouting']
  },
  production: {
    name: 'Production',
    description: 'Selve fotografering, filming, opptak',
    color: '#4caf50',
    categories: ['shooting','filming','recording','directing','on_set_coordination']
  },
  post_production: {
    name: 'Post-production',
    description: 'Redigering, fargekorrigering, levering',
    color: '#ff9800',
    categories: ['editing','color_grading','sound_design','delivery','client_review']
  },
  business: {
    name: 'Business',
    description: 'Fakturering, markedsføring, oppfølging',
    color: '#9c27b0',
    categories: ['invoicing','marketing','client_follow_up','portfolio_update','social_media']
  }
};

// Dynamic Phase-Specific Worklog Templates - Comprehensive template system
const DYNAMIC_WORKLOG_TEMPLATES = {
  photographer: {
    pre_production: {
      planning: {
        title: "Prosjektplanlegging og research",
        description: "Detaljert planlegging av, fotograferingsoppdraget:\n\n• Gjennomgå kundens ønsker og forventninger\n• Research lokasjon og lysforhold\n• Planlegge utstyrsliste basert på prosjekttype\n• Koordinere med andre leverandører",
        timeEstimate: 3,
        checklistItems: ["Kundemøte gjennomført","Lokasjon bekreftet","Utstyr sjekket","Backup-plan etablert"]
    },
      client_meeting: {
        title: "Kundemøte og briefing",
        description: "Møte med kunde for å avklare, detaljer:\n\n• Gjennomgå ønskeliste og forventninger\n• Diskutere tidsplan og logistikk\n• Avklare leveringsformat og tidsfrist\n• Signere kontrakt og bekrefte booking",
        timeEstimate: 2,
        checklistItems: ["Kontrakt signert","Ønskeliste dokumentert","Tidsplan bekreftet","Betalingsbetingelser avklart"]
    },
      cultural_research: {
        title: "Kulturell research og forberedelser",
        description: "Research av kulturelle elementer og, tradisjoner:\n\n• Studere kulturspesifikke øyeblikk som må fanges\n• Koordinere med kulturelle rådgivere\n• Planlegge teknisk tilnærming for spesielle seremonier\n• Forberede respektfull tilnærming til hellige øyeblikk",
        timeEstimate: 2,
        checklistItems: ["Kulturelle tradisjoner research","Viktige øyeblikk identifisert","Respektfull tilnærming planlagt","Kommunikasjon med familie avklart"]
    }
  },
    production: {
      shooting: {
        title: "Hovedfotografering",
        description: "Utførelse av, fotograferingsoppdraget:\n\n• Ankomst og rigge utstyr\n• Fange planlagte øyeblikk og spontane situasjoner\n• Overvåke teknisk kvalitet kontinuerlig\n• Koordinere med andre leverandører på stedet",
        timeEstimate: 8,
        checklistItems: ["Utstyr rigget","Test-bilder tatt","Backup-system aktivt","Kommunikasjon med koordinator etablert"]
    },
      directing: {
        title: "Regi og koordinering",
        description: "Dirigere og koordinere fotograferingsøkten:\n\n• Lede posisjoner og gruppering\n• Koordinere med andre fotografer\n• Sikre at alle viktige øyeblikk fanges\n• Opprettholde energi og positiv stemning",
        timeEstimate: 4,
        checklistItems: ["Posisjoner planlagt","Gruppefoto koordinert","Candid moments fanget","Alle viktige personer inkludert"]
    }
  },
    post_production: {
      editing: {
        title: "Bilderedigering og seleksjon",
        description: "Redigering og finpuss av, bilder:\n\n• Selektere beste bilder fra dagens fotografering\n• Utføre fargekorrigering og teknisk optimalisering\n• Retusjering og kreativ bearbeiding\n• Forberede bilder for levering",
        timeEstimate: 12,
        checklistItems: ["Seleksjon gjennomført","Fargekorrigering utført","Retusjering fullført","Leveringsformat forberedt"]
    },
      client_review: {
        title: "Kundegodkjenning og revisjoner",
        description: "Presentasjon for kunde og eventuelle, justeringer:\n\n• Presentere utvalgte og redigerte bilder\n• Motta feedback og ønsker om justeringer\n• Utføre nødvendige revisjoner\n• Finalisere bildeutvalg for leveranse",
        timeEstimate: 3,
        checklistItems: ["Bilder presentert","Feedback mottatt","Revisjoner utført","Final godkjenning mottatt"]
    }
  },
    business: {
      invoicing: {
        title: "Fakturering og oppgjør",
        description: "Håndtering av betaling og, dokumentasjon:\n\n• Sende faktura basert på avtalt pris\n• Følge opp betaling\n• Arkivere kontrakt og dokumentasjon\n• Oppdatere økonomisystem",
        timeEstimate: 1,
        checklistItems: ["Faktura sendt","Betaling mottatt","Dokumentasjon arkivert","Regnskap oppdatert"]
    },
      portfolio_update: {
        title: "Portefølje og markedsføring",
        description: "Oppdatering av portefølje og, markedsmateriell:\n\n• Velge beste bilder for portefølje\n• Oppdatere hjemmeside med nye arbeider\n• Publisere på sosiale medier (med tillatelse)\n• Be om anbefalinger fra fornøyde kunder",
        timeEstimate: 2,
        checklistItems: ["Porteføljebilder valgt","Hjemmeside oppdatert","Sosiale medier oppdatert","Kundeanbefalinger mottatt"]
    }
  }
},
  music_producer: {
    pre_production: {
      planning: {
        title: "Prosjektplanlegging og konsept",
        description: "Detaljert planlegging av musikk-produksjonsprosjektet:\n\n• Definere kunstnerisk visjon og sjanger\n• Planlegge studiobooking og budsjett\n• Koordinere med musikere og sangere\n• Forberede teknisk setup og lyddesign",
        timeEstimate: 4,
        checklistItems: ["Kunstnerisk konsept definert","Studiobooking bekreftet","Musikere koordinert","Teknisk plan etablert"]
    },
      client_meeting: {
        title: "Kunstnermøte og kreativ briefing",
        description: "Møte med artist for å avklare kreative, retning:\n\n• Diskutere kunstnerisk visjon og målgruppe\n• Gjennomgå referanser og inspirasjon\n• Planlegge innspillingsplan og deadlines\n• Avklare roller og ansvar i produksjonen",
        timeEstimate: 2,
        checklistItems: ["Kreativ retning avklart","Referanser gjennomgått","Tidsplan bekreftet","Roller definert"]
    },
      equipment_prep: {
        title: "Studioforberedelse og utstyrsjekk",
        description: "Forberedelse av studio og teknisk, utstyr:\n\n• Kalibrere monitorer og akustikk\n• Teste mikrofoner og forforsterkere\n• Forberede software og plugins\n• Sette opp multispor og routing",
        timeEstimate: 3,
        checklistItems: ["Studio kalibrert","Utstyr testet","Software forberedt","Routing etablert"]
    }
  },
    production: {
      recording: {
        title: "Innspilling og opptak",
        description: "Hovedinnspillingssesjon i, studio:\n\n• Sette opp mikrofoner og instrumenter\n• Ta opp basisspor (trommer, bass, rytmegitar)\n• Spille inn hovedvokal og harmonier\n• Fange spontane ideer og alternativer",
        timeEstimate: 10,
        checklistItems: ["Setup fullført","Basisspor innspilt","Vokal innspilt","Alternativer dokumentert"]
    },
      directing: {
        title: "Produksjonsregi og kunstnerisk ledelse",
        description: "Lede den kreative prosessen under, innspilling:\n\n• Veilede artistens prestasjon\n• Foreslå arrangementsideer\n• Koordinere mellom musikerne\n• Sikre høy kunstnerisk kvalitet",
        timeEstimate: 6,
        checklistItems: ["Artistisk ledelse utført","Arrangement optimalisert","Musikerkoordinering fullført","Kvalitetskontroll utført"]
    },
      on_set_coordination: {
        title: "Studiokokordinering og kommunikasjon",
        description: "Koordinere alle aspekter av studiomiljøet:\n\n• Opprettholde kreativ atmosfære\n• Koordinere pauser og måltider\n• Dokumentere kreative beslutninger\n• Administrere studiets tidsplan",
        timeEstimate: 4,
        checklistItems: ["Atmosfære opprettholdt","Pauser koordinert","Beslutninger dokumentert","Tidsplan overholdt"]
    }
  },
    post_production: {
      editing: {
        title: "Lydmiksing og bearbeiding",
        description: "Detaljert miksing av innspilt, materiale:\n\n• Redigere og rense opptak\n• Balansere nivåer og panorering\n• Tillegge effekter og processing\n• Skape dynamisk og engasjerende lydbilde",
        timeEstimate: 15,
        checklistItems: ["Opptak redigert","Nivåer balansert","Effekter tillagt","Lydbilde optimalisert"]
    },
      sound_design: {
        title: "Lyddesign og kreativ bearbeiding",
        description: "Kreativ utvikling av lydens, karakter:\n\n• Design av unike lyder og teksturer\n• Eksperimentere med kreative effekter\n• Utvikle signaturlyd for prosjektet\n• Tillegge atmosfære og stemning",
        timeEstimate: 8,
        checklistItems: ["Lyddesign utført","Kreative effekter tillagt","Signaturlyd utviklet","Atmosfære skapt"]
    },
      client_review: {
        title: "Artistgodkjenning og revisjoner",
        description: "Presentasjon av miks for artist og, justeringer:\n\n• Presentere foreløpig miks for feedback\n• Motta kunstneriske ønsker og justeringer\n• Implementere endringer og refinere\n• Finalisere miks før mastering",
        timeEstimate: 4,
        checklistItems: ["Miks presentert","Feedback implementert","Justeringer utført","Final miks godkjent"]
    }
  },
    business: {
      invoicing: {
        title: "Fakturering og TONO/GRAMO registrering",
        description: "Håndtering av betaling og musikk-rettigheter:\n\n• Sende faktura til artist eller plateselskap\n• Registrere verk i TONO for komponist-rettigheter\n• Registrere innspilling i GRAMO for utøver-rettigheter\n• Dokumentere produsentandeler og kontrakter",
        timeEstimate: 2,
        checklistItems: ["Faktura sendt","TONO registrering utført","GRAMO registrering utført","Kontrakter arkivert"]
    },
      marketing: {
        title: "Promotering og markedsføring",
        description: "Markedsføring av produksjon og produsent-profil:\n\n• Lage produksjon-credits og press-kit\n• Publisere på streaming-tjenester med credits\n• Dele prosess-innhold på sosiale medier\n• Bygge produsent-merkenavn og referanser",
        timeEstimate: 3,
        checklistItems: ["Credits dokumentert","Streaming publisert","Sosiale medier oppdatert","Referanser sikret"]
    },
      client_follow_up: {
        title: "Oppfølging og framtidige prosjekter",
        description: "Opprettholde forhold og sikre framtidige, samarbeid:\n\n• Følge opp artistens tilfredshet\n• Diskutere framtidige prosjekter\n• Be om anbefalinger til andre artister\n• Opprettholde profesjonelt nettverk",
        timeEstimate: 1,
        checklistItems: ["Tilfredshet bekreftet","Framtidige prosjekter diskutert","Anbefalinger mottatt","Nettverk utviklet"]
    }
  }
},
  videographer: {
    pre_production: {
      planning: {
        title: "Produksjonsplanlegging og konsept",
        description: "Omfattende planlegging av, videoproduksjonen:\n\n• Utvikle kreativt konsept og narrative struktur\n• Planlegge shot list og filming schedule\n• Koordinere crew og utstyr\n• Rekognosere lokasjoner og planlegge logistikk",
        timeEstimate: 5,
        checklistItems: ["Konsept utviklet","Shot list planlagt","Crew koordinert","Lokasjoner rekognoscert"]
    },
      client_meeting: {
        title: "Klientbriefing og kreativ workshop",
        description: "Detaljert møte for å definere prosjektets, retning:\n\n• Gjennomgå kundens visjon og målsetting\n• Diskutere target audience og distribusjon\n• Planlegge timeline og leverables\n• Etablere kommunikasjonsrutiner under produksjonen",
        timeEstimate: 2,
        checklistItems: ["Visjon definert","Målgruppe identifisert","Timeline etablert","Kommunikasjon planlagt"]
    },
      location_scouting: {
        title: "Lokasjonsscouting og teknisk planlegging",
        description: "Utforskning og evaluering av, filmingsteder:\n\n• Besøke potensielle lokasjoner\n• Vurdere lysforhold og akustikk\n• Planlegge kameraplasseringer og bevegelser\n• Koordinere tillatelser og logistikk",
        timeEstimate: 4,
        checklistItems: ["Lokasjoner evaluert","Lysforhold kartlagt","Kameraplasseringer planlagt","Tillatelser sikret"]
    }
  },
    production: {
      filming: {
        title: "Hovedfilming og regi",
        description: "Gjennomføring av, videoinnspilingen:\n\n• Rigge utstyr og etablere setup\n• Filme planlagte sekvenser og cutaways\n• Dirigere talent og koordinere crew\n• Sikre teknisk kvalitet og kontinuitet",
        timeEstimate: 12,
        checklistItems: ["Utstyr rigget","Sekvenser filmet","Talent dirigert","Kvalitet sikret"]
    },
      directing: {
        title: "Kreativ ledelse og artistisk regi",
        description: "Lede den kreative prosessen på, settet:\n\n• Kommunisere visjonen til crew og talent\n• Ta kreative beslutninger i sanntid\n• Sikre narrativ kontinuitet\n• Opprettholde energi og fokus på settet",
        timeEstimate: 8,
        checklistItems: ["Visjon kommunisert","Kreative beslutninger tatt","Kontinuitet sikret","Set-energi opprettholdt"]
    },
      on_set_coordination: {
        title: "Set-koordinering og produksjonsledelse",
        description: "Administrere alle aspekter av, produksjonen:\n\n• Koordinere crew og utstyr\n• Overvåke tidsskjema og budsjett\n• Løse tekniske og logistiske utfordringer\n• Dokumentere produksjonsbeslutninger",
        timeEstimate: 6,
        checklistItems: ["Crew koordinert","Tidsplan overholdt","Utfordringer løst","Beslutninger dokumentert"]
    }
  },
    post_production: {
      editing: {
        title: "Videoredigering og postproduksjon",
        description: "Sammensetting og finpuss av, videomateriale:\n\n• Importere og organisere opptak\n• Utføre rough cut og fine cut\n• Tillegge overganger og effekter\n• Optimalisere pacing og narrativ flyt",
        timeEstimate: 20,
        checklistItems: ["Materiale organisert","Cuts utført","Effekter tillagt","Pacing optimalisert"]
    },
      color_grading: {
        title: "Fargekorrigering og grading",
        description: "Kreativ fargejustering og visuell, stemning:\n\n• Korrigere eksponering og hvitbalanse\n• Skape konsistent look gjennom prosjektet\n• Tillegge kreativ fargepalett\n• Optimalisere for forskjellige plattformer",
        timeEstimate: 8,
        checklistItems: ["Eksponering korrigert","Konsistent look etablert","Kreativ grading utført","Plattform-optimalisering fullført"]
    },
      sound_design: {
        title: "Lyddesign og audio post",
        description: "Utvikling av komplett, lydlandskap:\n\n• Rense og optimalisere dialog\n• Tillegge musikk og lydeffekter\n• Balansere lydnivåer og dynamikk\n• Skape immersive audio experience",
        timeEstimate: 10,
        checklistItems: ["Dialog optimalisert","Musikk og SFX tillagt","Nivåer balansert","Audio experience fullført"]
    }
  },
    business: {
      invoicing: {
        title: "Fakturering og kontraktsadministrasjon",
        description: "Håndtering av betaling og juridiske, aspekter:\n\n• Sende detaljert faktura basert på avtale\n• Følge opp betaling og kontrakter\n• Arkivere produksjonsdokumentasjon\n• Administrere opphavsrett og usage rights",
        timeEstimate: 2,
        checklistItems: ["Faktura sendt","Kontrakter administrert","Dokumentasjon arkivert","Rights administrert"]
    },
      portfolio_update: {
        title: "Porteføljeutvikling og markedsføring",
        description: "Bruke prosjekt til profesjonell, utvikling:\n\n• Velge beste klipp for demo reel\n• Oppdatere hjemmeside og portfolio\n• Lage case study av produksjonen\n• Dele prosess-innhold for markedsføring",
        timeEstimate: 3,
        checklistItems: ["Demo reel oppdatert","Portfolio utviklet","Case study laget","Markedsføring utført"]
    }
  }
},
  vendor: {
    pre_production: {
      planning: {
        title: "Produktplanlegging og markedsanalyse",
        description: "Strategisk planlegging av, produktlansering:\n\n• Analysere målmarked og konkurrenter\n• Definere produktposisjonering og USP\n• Planlegge pricing strategi og margins\n• Koordinere med leverandører og produsenter",
        timeEstimate: 4,
        checklistItems: ["Markedsanalyse utført","Posisjonering definert","Pricing etablert","Leverandører koordinert"]
    },
      client_meeting: {
        title: "Klientmøte og behovsanalyse",
        description: "Møte med potensielle kunder for å forstå, behov:\n\n• Kartlegge kundens krav og ønsker\n• Presentere relevante produktløsninger\n• Diskutere customization muligheter\n• Etablere tidslinje og leveringsbetingelser",
        timeEstimate: 2,
        checklistItems: ["Behov kartlagt","Løsninger presentert","Customization diskutert","Betingelser etablert"]
    }
  },
    production: {
      filming: {
        title: "Produktdemonstrasjon og innholdsproduksjon",
        description: "Skape markedsføringsinnhold for, produkter:\n\n• Filme produktdemonstrasjoner\n• Lage instruksjonsvideoer og tutorials\n• Fotografere produkter for katalog\n• Dokumentere installasjons- og bruksprosesser",
        timeEstimate: 6,
        checklistItems: ["Demo filmet","Tutorials laget","Produktfoto tatt","Prosesser dokumentert"]
    }
  },
    post_production: {
      editing: {
        title: "Markedsføringsmateriell og dokumentasjon",
        description: "Produsere ferdig markedsføringsinnhold:\n\n• Redigere produktvideoer og tutorials\n• Lage produktbrosjyrer og datablad\n• Utvikle online produktkataloger\n• Produsere installasjonsmanualer",
        timeEstimate: 8,
        checklistItems: ["Videoer redigert","Brosjyrer laget","Kataloger utviklet","Manualer produsert"]
    }
  },
    business: {
      invoicing: {
        title: "Salgs- og faktureringsprosess",
        description: "Administrere salgs- og, betalingsprosesser:\n\n• Generere tilbud og kontrakter\n• Prosessere bestillinger og fakturering\n• Koordinere levering og installasjon\n• Følge opp betaling og kundetilfredshet",
        timeEstimate: 3,
        checklistItems: ["Tilbud generert","Bestillinger prosessert","Levering koordinert","Oppfølging utført"]
    },
      marketing: {
        title: "Produktmarkedsføring og salgsfremmende tiltak",
        description: "Aktivt markedsføre produkter og, tjenester:\n\n• Implementere digitale markedsføringskampanjer\n• Delta på messer og bransjearrangementer\n• Utvikle partnerskap og distribusjonskanaler\n• Analysere salgsdata og optimalisere strategi",
        timeEstimate: 5,
        checklistItems: ["Kampanjer implementert","Arrangementer deltatt","Partnerskap utviklet","Analyse utført"]
    }
  }
}
};

// Template generation engine - intelligently creates worklog entries with dynamic pricing
const generateWorklogTemplate = (
  profession: string, 
  phase: string, 
  category: string, 
  projectType?: string, 
  culture?: string,
  pricingData?: any
) => {
  // Get base template
  const baseTemplate = (DYNAMIC_WORKLOG_TEMPLATES as any)[profession]?.[phase]?.[category];
  if (!baseTemplate) {
    return {
      title: `${category.replace('_,', ', ').replace(/\b\w/g, l => l.toUpperCase())} - ${phase.replace('_',', ')}`,
      description: `Arbeid relatert til ${category.replace('_',', ')} i ${phase.replace('_', ', ')}-fasen.`,
      timeEstimate: getDynamicTimeEstimate(profession, phase, category, pricingData),
      checklistItems: []
    };
  }

  // Clone template to avoid mutations
  let template = { ...baseTemplate };

  // Update time estimate with dynamic pricing data
  template.timeEstimate = getDynamicTimeEstimate(profession, phase, category, pricingData);

  // Add cultural context if relevant
  if (culture && culture !== 'norsk' && profession === 'photographer') {
    const culturalTips = CULTURAL_DAY_WORKLOG_TIPS[culture];
    if (culturalTips && Object.keys(culturalTips).length > 0) {
      // Add cultural considerations to description
      const culturalContext = `\n\n🌍 Kulturelle hensyn for ${culture}:\n${Object.values(culturalTips)[0]?.considerations?.slice(0, 3).map(c => `• ${c}`).join('\n') || 'Spesielle kulturelle hensyn må tas'}`;
      template.description += culturalContext;
  }
}

  // Add project type specific adjustments
  if (projectType && profession === 'music_producer') {
    if (projectType === 'album') {
      template.timeEstimate = Math.ceil(template.timeEstimate * 1.5); // Album projects take longer
      template.description += "\n\n🎼 Album-prosjekt: Tar hensyn til konseptuell sammenheng og konsistent lydprofil.";
  } else if (projectType === 'commercial') {
      template.description += "\n\n📺 Kommersielt prosjekt: Fokus på teknisk kvalitet og deadline-levering.";
  }
}

  return template;
};

// Memory card labeling schemes - normalisert versjon
const LABELING_SCHEMES = {
  ABCD: ['A','B','C','D'],
  EFGH: ['E','F','G','H'],
  NUMERIC: ['1','2','3','4','5','6','7','8','9'],
} as const;

type LabelingKey = keyof typeof LABELING_SCHEMES;

// Helper function for dynamic project type defaults
const getDefaultProjectType = (profession: string, isCastingPlanner: boolean = false): string => {
  if (isCastingPlanner) {
    // In casting planner, avoid wedding as default
    const typeMap: Record<string, string> = {
      photographer: 'portrait',
      videographer: 'video',
      music_producer: 'song',
      vendor: 'commercial'
    };
    return typeMap[profession] || 'commercial';
  }
  const typeMap: Record<string, string> = {
    photographer: 'wedding',
    videographer: 'wedding',
    music_producer: 'song',
    vendor: 'commercial'
  };
  return typeMap[profession] || 'commercial';
};

// Helper function to get project time estimates based on type and profession
const getProjectTimeEstimate = (projectType: string, profession: string): number => {
  const estimates = {
    'wedding': {
      'photographer': 8, 'videographer': 12, 'music_producer': 4, 'vendor': 6
    }, 'portrait': {
      'photographer': 3, 'videographer': 4, 'music_producer': 2, 'vendor': 2
    }, 'event': {
      'photographer': 6, 'videographer': 8, 'music_producer': 3, 'vendor': 4
    }, 'song': {
      'photographer': 2, 'videographer': 3, 'music_producer': 20, 'vendor': 1
    }, 'commercial': {
      'photographer': 4, 'videographer': 6, 'music_producer': 3, 'vendor': 5
    }
  };

  return estimates[projectType as keyof typeof estimates]?.[profession as keyof typeof estimates.wedding] || 4;
};

// Helper function for dynamic pricing defaults - connected to price administration system
const getDefaultPricing = (profession: string, packagesData?: any, pricingData?: any): number => {
  // Try to get pricing from the price administration system first
  if (packagesData?.packages && Array.isArray(packagesData.packages)) {
    const professionPackages = packagesData.packages.filter((pkg: any) => 
      pkg.profession === profession && pkg.status === 'active'
    );
    
    if (professionPackages.length > 0) {
      // Return the base price of the first active package for this profession
      const basePrice = professionPackages[0].basePrice;
      if (basePrice && !isNaN(parseFloat(basePrice))) {
        return parseFloat(basePrice);
    }
  }
}
  
  // Fallback to pricing structures if packages not available
  if (pricingData?.pricingStructures && Array.isArray(pricingData.pricingStructures)) {
    const professionPricing = pricingData.pricingStructures.find((pricing: any) => 
      pricing.profession === profession && pricing.status === 'active'
    );
    
    if (professionPricing) {
      // Try different pricing fields in order of preference
      const basePrice = professionPricing.basePrice || 
                       professionPricing.hourlyRate || 
                       professionPricing.fullDayRate;
      if (basePrice && !isNaN(parseFloat(basePrice))) {
        return parseFloat(basePrice);
    }
  }
}
  
  // Final fallback to hardcoded defaults
  const fallbackPriceMap: Record<string, number> = {
    photographer: 150,
    videographer: 100,
    music_producer: 800,
    vendor: 200
  };
  return fallbackPriceMap[profession] || 150;
};

// Helper function for dynamic time estimates based on pricing system
const getDynamicTimeEstimate = (profession: string, phase: string, category: string, pricingData?: any): number => {
  // Try to get time estimates from pricing structures first
  if (pricingData?.pricingStructures && Array.isArray(pricingData.pricingStructures)) {
    const professionPricing = pricingData.pricingStructures.find((pricing: any) => 
      pricing.profession === profession && pricing.status === 'active'
    );
    
    if (professionPricing) {
      // Look for phase-specific time estimates in the pricing structure
      const phaseTimeEstimate = professionPricing.phaseTimeEstimates?.[phase]?.[category];
      if (phaseTimeEstimate && !isNaN(parseFloat(phaseTimeEstimate))) {
        return parseFloat(phaseTimeEstimate);
    }
      
      // Fallback to base time estimate from pricing structure
      const baseTimeEstimate = professionPricing.baseTimeEstimate;
      if (baseTimeEstimate && !isNaN(parseFloat(baseTimeEstimate))) {
        return parseFloat(baseTimeEstimate);
    }
  }
}
  
  // Fallback to hardcoded estimates based on profession and phase
  const fallbackEstimates: Record<string, Record<string, Record<string, number>>> = {
    photographer: {
      pre_production: {
        planning: 3,
        client_meeting: 2,
        cultural_research: 2
      },
      production: {
        shooting: 8,
        directing: 4
      },
      post_production: {
        editing: 12,
        client_review: 3
      },
      business: {
        invoicing: 1,
        marketing: 2
      }
    },
    videographer: {
      pre_production: {
        planning: 4,
        client_meeting: 2,
        cultural_research: 2
      },
      production: {
        filming: 12,
        directing: 8
      },
      post_production: {
        editing: 20,
        color_grading: 8,
        sound_design: 10
      },
      business: {
        invoicing: 2,
        marketing: 3
      }
    },
    music_producer: {
      pre_production: {
        planning: 2,
        client_meeting: 1,
        cultural_research: 1
      },
      production: {
        recording: 8,
        mixing: 6
      },
      post_production: {
        mastering: 4,
        delivery: 1
      },
      business: {
        invoicing: 1,
        marketing: 2
      }
    },
    vendor: {
      pre_production: {
        planning: 2,
        client_meeting: 1
      },
      production: {
        filming: 6
      },
      post_production: {
        editing: 8
      },
      business: {
        invoicing: 1,
        marketing: 2
      }
    }
  };
  
  return fallbackEstimates[profession]?.[phase]?.[category] || 2;
};

interface ProjectCreationWithMemoryCardsProps {
  profession: string;
  userId?: string;
  onProjectCreated?: (projectData: any) => void;
  initialData?: any; // Pre-filled data from submission or other source
  // Integration props for universal workflow connectivity
  onMeetingCreate?: (meeting: any) => void;
  onProjectUpdate?: (project: any) => void;
  onWorklogCreate?: (worklog: any) => void;
  selectedProject?: any;
  onProjectSelect?: (project: any) => void;
  // New: open Event Management with prefilled event
  onOpenEventManagement?: (eventData: any) => void;
  // Casting Planner mode - simplifies UI and hides non-relevant features
  isCastingPlanner?: boolean;
  getTerm?: (key: string) => string; // Terminology helper from Casting Planner
}

interface MemoryCardConfig {
  label: string;
  type: string;
  capacity: string;
  dayNumber: number;
  dayName: string;
  count?: number;
  estimatedPhotos?: number;
}

// Interface for MemoryCardSelector component
interface MemoryCardSelectorConfig {
  capacity: string;
  count: number;
  estimatedPhotos: {
    raw: number;
    craw: number;
};
}

interface SelectedMemoryCard {
  type: string;
  capacity: string;
  brand?: string;
  model?: string;
  count?: number;
  estimatedPhotos?: number;
}

export default function ProjectCreationWithMemoryCards({
  profession,
  userId,
  initialData, // Pre-filled data from submission
  onProjectCreated,
  onMeetingCreate,
  onProjectUpdate,
  onWorklogCreate,
  selectedProject,
  onProjectSelect,
  onOpenEventManagement,
  isCastingPlanner = false,
  getTerm
}: ProjectCreationWithMemoryCardsProps) {
  // Get user and profession context with dynamic system support
  const { user } = useAuth();
  
  // Create auth headers for API requests
  const auth = {
    'Authorization': `Bearer ${user?.id || 'anonymous'}`,
    'X-User-Email': user?.email || 'anonymous@example.com'
  };
  const { getCurrentUserProfession, professionConfigs, isLoading: professionsLoading, getProfessionDisplayName, getProfessionIcon } = useDynamicProfessions();
  const userProfession = (user as any)?.profession || profession || getCurrentUserProfession();
  const professionConfig = professionConfigs?.[userProfession];
  
  // New context hooks - Enhanced with full ProjectContext functionality
  const { 
    currentProject, 
    createProject: createProjectContext, 
    updateProject, 
    loadProject,
    deleteProject,
    duplicateProject,
    archiveProject,
    updateProjectSettings,
    getProjectSettings,
    updateProjectMetadata,
    getProjectMetadata,
    updateIntegrationStatus,
    getIntegrationStatus,
    addProjectCollaborator,
    getProjectCollaborators,
    uploadProjectFile,
    getProjectFiles,
    addProjectMilestone,
    updateProjectStatus,
    addProjectComment,
    getProjectComments,
    createProjectBackup,
    getProjectBackups,
    getProjectAnalytics,
    getProjectPerformanceMetrics,
    searchProjects,
    getProjectsByDateRange,
    validateProjectData,
    checkProjectHealth,
    cacheProjectData,
    getCachedProjectData,
    invalidateProjectCache,
    refreshProjectCache,
    saveProjectDraft,
    getProjectDraft,
    deleteProjectDraft,
    syncProjectOffline,
    connectProjectIntegration,
    disconnectProjectIntegration,
    getProjectIntegrations,
    testProjectIntegration,
    transformProjectData,
    migrateProjectData,
    getProjectDataVersion,
    rollbackProjectData,
    optimizeProjectData,
    analyzeProjectData,
    cleanupProjectData,
    setProjectPermissions,
    getProjectPermissions,
    checkProjectAccess,
    auditProjectAccess,
    validateProjectCompliance,
    getProjectComplianceReport,
    updateProjectCompliance,
    getProjectAuditTrail
} = useProject();
  
  // Comprehensive feature system integration
  const { features, communication } = useEnhancedMasterIntegration();
  
  // External Data Service integration for location intelligence
  const { 
    getKartverketAddress, 
    searchKartverketPlaceNames,
    analyzeProperty,
    getCurrentWeather,
    getWeatherForecast,
    calculateTravelCosts,
    getFuelPrices
} = useExternalData();
  
  // Theming system
  const theming = useTheming('photographer');
  
  const { 
    settings, 
    updateSetting, 
    getSetting, 
    getProfessionDefaults,
    mergeWithDefaults 
} = useSettings();
  
  const { 
    theme, 
    getProfessionTheme, 
    getComponentTheme,
    isDarkMode 
} = useTheme();
  
  const { 
    isConnected, 
    emitEvent, 
    onEvent, 
    offEvent,
    createSession,
    joinSession,
    leaveSession
} = useRealTime();
  
  // Toast notification system
  const visualEditorContext = useVisualEditor() as any;
  const addNotification = visualEditorContext?.addNotification || ((notification: any) => {
    console.log('Visual Editor context not available, ', notification);
  });

  // Toast helper functions
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 4000) => {
      addNotification({
        title: type.charAt(0).toUpperCase() + type.slice(1) + ' Notification',
        message,
        type,
        read: false
    });
  }, [addNotification]);

  const showSuccessToast = useCallback((message: string, duration: number = 4000) => {
    showToast(message, 'success,', duration);
  }, [showToast]);

  const showErrorToast = useCallback((message: string, duration: number = 6000) => {
    showToast(message, 'error, ', duration);
  }, [showToast]);

  const showWarningToast = useCallback((message: string, duration: number = 5000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfoToast = useCallback((message: string, duration: number = 4000) => {
    showToast(message, 'info', duration);
  }, [showToast]);
  
  const [activeStep, setActiveStep] = useState(0);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [healthCheckPassed, setHealthCheckPassed] = useState(false);
  
  // Stepper configuration for project creation flow
  const creationSteps = useMemo(() => [
    { 
      label: 'Grunndata', 
      description: 'Kontakt, prosjektinfo og type',
      icon: <Person />
    },
    { 
      label: 'Split Sheet & Produksjonsteam', 
      description: 'Fordeling og samarbeidspartnere',
      icon: <AccountBalance />
    },
  ], []);
  const [cultureDayDialog, setCultureDayDialog] = useState({
    open: false,
    culture: '',
    day: '',
    explanation: ''
});
  
  const [worklogFormData, setWorklogFormData] = useState({
    title: '',
    description: '',
    category: 'planning',
    timeSpent: 2,
    projectPhase: 'pre_production'
});
  
  const [showWorklogTipsDialog, setShowWorklogTipsDialog] = useState(false);
  
  // Draft Management System
  const [draftSidebarOpen, setDraftSidebarOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<'draft' | 'published' | 'live'>('draft');
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [publishedProject, setPublishedProject] = useState<any>(null);
  
  // Location Intelligence State
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [locationAnalysis, setLocationAnalysis] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [travelCosts, setTravelCosts] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Initialize projectData state BEFORE useEffect hooks that use it
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: initialData?.projectName || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    eventDate: initialData?.eventDate || '',
    eventDates: (initialData?.eventDates as any) || ({} as Record<number, string>), // For multi-day events
    location: initialData?.location || '',
    projectType: initialData?.projectType || getDefaultProjectType(userProfession, isCastingPlanner),
    weddingCulture: 'norsk',
    totalDays: 1,
    activeDays: [1],
    memoryCardConfigs: [] as MemoryCardConfig[],
    selectedMemoryCards: [] as SelectedMemoryCard[],
    selectedCameras: [] as any[],
    enhancedMemoryCardSelection: null as any, // Enhanced memory card selection
    memoryCardBudget: 'mid' as 'budget' | 'mid' | 'premium' | 'professional',
    editingSoftware: '',
    driveIntegration: true,
    profession: profession,
    createShowcaseGallery: false,
    meetingOption: 'none', // 'none','now','later'
    meetingDate: '',
    meetingTime: '10:00',
    meetingDuration: 60,
    shotList: [] as any[], // Shot list data
    shotListTemplate: '', // Selected template
    shotListCulture: '', // Culture-specific suggestions
    saveAsDefault: false, // Save this meeting routine as default for future projects
    // clientEmail and clientPhone moved to top (already initialized from initialData)
    budget: initialData?.budget || '',
    specialRequests: '',
    estimatedDuration: '',
    dailyHours: {} as Record<number, number>, // Hours per day for multi-day events
    customDayNames: null as string[] | null, // Manuel dag-navngiving for tilpassede arrangementer
    customCategories: [] as string[], // Manuel kategorier for alle prosjekttyper (event, commercial, etc.)
    memoryCardLabeling: 'ABCD' as LabelingKey, // Default labeling scheme
    perImagePrice: 500, // Default price per image
    contractedImages: 50,
    // Pricing Administration Integration
    selectedPackage: null as any,
    customPricing: {
      basePrice: 0,
      hourlyRate: 0,
      travelCosts: 0,
      additionalCosts: [] as any[],
      discounts: [] as any[],
      totalEstimate: 0
    },
    automaticPricing: true, // Use pricing from administration settings
    // FASE 2: Showcase Gallery Security Settings
    showcaseGallerySecurity: {
      pinRequired: false,
      pin: '',
      passwordRequired: false,
      password: '',
      accessLevel: 'public' as 'public' | 'restricted' | 'private',
      enableIpRestrictions: false,
      allowedIpRanges: [] as string[],
      enableDownloadProtection: false,
      downloadProtectionLevel: 'none' as 'none' | 'watermark' | 'disabled',
      sessionTimeoutMinutes: 60,
      maxLoginAttempts: 3,
      lockoutDurationMinutes: 15
    },

    // Wedding Timeline Integration - aktiveres kun for bryllup + showcase
    createWeddingTimeline: false,
    weddingTimelineShared: false,
    weddingTimelineUrl: '',
    weddingTimelineSecurity: {
      useShowcasePassword: true, // Default: bruk samme passord som showcase
      customPassword: false,
      pin: '',
      password: '',
      accessLevel: 'restricted' as 'public' | 'restricted' | 'private'
    },

    // Project collaborators and invitations
    collaborators: [] as any[],
    // Split sheet creation for music producers
    enableSplitSheet: false,
    splitSheetData: null as any,
    // Add missing properties
    description: initialData?.description || '',
    venue: '',
    guestCount: initialData?.guestCount || '',
    primaryCamera: '',
    backupCamera: '',
    estimatedPhotos: '',
    fileFormat: 'raw+jpeg',
    equipmentNotes: '',
    backupStrategy: 'automatic',
    backupFrequency: 'realtime',
    // Additional missing properties
    downloadProtection: 'none' as 'none' | 'password' | 'timelimit',
    watermark: 'none' as 'none' | 'text' | 'logo' | 'both',
    clientAccess: 'full' as 'full' | 'limited' | 'readonly',
    meetingPreferences: {} as any,

    // Project Timeline Phase Management
    currentPhase: 'pre-planning' as 'pre-planning' | 'pre-production' | 'production' | 'post-production',
    phaseHistory: [] as Array<{
      phase: string;
      timestamp: string;
      notes?: string;
    }>,
    davinciIntegrationEnabled: false, // Enable when post-production phase is selected
    scriptParameters: {
      projectName: '',
      resolution: '3840x2160',
      frameRate: 25,
      colorSpace: 'Rec.709',
      timelineStructure: 'standard',
      audioChannels: 2,
      customSettings: {} as Record<string, any>
    } as any,
    // Camera and LOG format detection for ScriptManager
    cameraBrand: '',
    logFormat: '',
    detectedLogFormats: [] as string[]
  });
  
// Load meeting preferences from server (replaces localStorage)
useEffect(() => {
  if (!user) return;
  const load = async () => {
    try {
      const res = await fetch(`/api/user/meeting-preferences?profession=${encodeURIComponent(profession)}`);
      if (res.ok) {
        const data = await res.json();
        const prefs = data?.data;
        if (prefs) {
          setProjectData(prev => ({
            ...prev,
            meetingOption: prefs.meeting_option || 'none',
            meetingTime: prefs.meeting_time || '10:00',
            meetingDuration: prefs.meeting_duration || 60,
            saveAsDefault: false,
          }));
        }
      }
    } catch (error) {
      log.warn('Failed to load meeting preferences', error);
    }
  };
  load();
}, [user, profession]);

// Persist meeting preferences when changed
useEffect(() => {
  if (!user) return;
  const controller = new AbortController();
  const save = async () => {
    try {
      await fetch('/api/user/meeting-preferences', {
        method: 'POST',
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify({
          profession,
          meetingOption: (projectData as any)?.meetingOption,
          meetingTime: (projectData as any)?.meetingTime,
          meetingDuration: (projectData as any)?.meetingDuration,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      // ignore
    }
  };
  save();
  return () => controller.abort();
// @ts-ignore - projectData exists in component scope
}, [user, profession, (projectData as any)?.meetingOption, (projectData as any)?.meetingTime, (projectData as any)?.meetingDuration]);

  // Check user authentication status
  useEffect(() => {
    if (!user) {
      showWarningToast('No authenticated user found. Some features may not work properly.', 6000);
      log.warn('No authenticated user found. Some features may not work properly.');
  } else {
      showInfoToast('User authenticated successfully', 2000);
      log.info('User authenticated', user.email || user.id);
  }
}, [user, log, showWarningToast, showInfoToast]);

  // Feature system integration - component registration and usage tracking
  useEffect(() => {
    // Check feature access for project creation
    const projectCreationAccess = features.checkFeatureAccess('project-creation');
    const memoryCardPlanningAccess = features.checkFeatureAccess('memory-card-planning');
    const davinciIntegrationAccess = features.checkFeatureAccess('davinci-resolve-integration');
    
    // Track feature usage
    features.trackFeatureUsage('project-creation','component_opened', {
      profession: userProfession,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      hasAccess: projectCreationAccess.hasAccess
  });

    // Log feature access status
    if (!projectCreationAccess.hasAccess) {
      log.warn('Project creation feature not enabled', projectCreationAccess.reason);
  }
    if (!memoryCardPlanningAccess.hasAccess) {
      log.warn('Memory card planning feature not enabled', memoryCardPlanningAccess.reason);
  }
    if (!davinciIntegrationAccess.hasAccess) {
      log.warn('DaVinci Resolve integration feature not enabled', davinciIntegrationAccess.reason);
  }
}, [features, userProfession, user, log]);

  // Load profession-specific settings on mount
  useEffect(() => {
    if (userProfession && settings) {
      const professionDefaults = getProfessionDefaults(userProfession);
      if (professionDefaults) {
        // Apply profession-specific defaults to project data
        setProjectData(prev => ({
          ...prev,
          ...professionDefaults.projectCreation,
          ...professionDefaults.showcase,
          // Ensure all required properties exist
          description: prev.description || '',
          venue: prev.venue || '',
          guestCount: prev.guestCount || '',
          primaryCamera: prev.primaryCamera || '',
          backupCamera: prev.backupCamera || '',
          estimatedPhotos: prev.estimatedPhotos || '',
          fileFormat: prev.fileFormat || 'raw+jpeg',
          equipmentNotes: prev.equipmentNotes || '',
          backupStrategy: prev.backupStrategy || 'automatic',
          backupFrequency: prev.backupFrequency || 'realtime'
      }));
    }
  }
}, [userProfession, settings, getProfessionDefaults]);

  // Real-time event handling
  useEffect(() => {
    const handleProjectUpdate = (event: any) => {
      if (event.data.projectId === currentProject?.id) {
        showInfoToast('Project updated in real-time', 3000);
    }
  };

    const handleUserJoined = (event: any) => {
      showInfoToast(`${event.data.userName} joined the project`, 3000);
  };

    if (isConnected) {
      (onEvent as any)('project_updated', handleProjectUpdate, 'ProjectCreationWithMemoryCards', 'system');
      (onEvent as any)('user_joined', handleUserJoined, 'ProjectCreationWithMemoryCards', 'system');
    }

    return () => {
      if (isConnected) {
        (offEvent as any)('project_updated', handleProjectUpdate, 'ProjectCreationWithMemoryCards', 'system');
        (offEvent as any)('user_joined', handleUserJoined, 'ProjectCreationWithMemoryCards', 'system');
      }
    };
}, [isConnected, onEvent, offEvent, currentProject]);
  
  const [memoryCardLabeling, setMemoryCardLabeling] = useState<LabelingKey>('ABCD');
  const [showScriptManager, setShowScriptManager] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const memoryPlanSavedRef = useRef(false);

  // Normalize multi-day event dates from initialData
  useEffect(() => {
    const raw = initialData?.eventDates as any;
    if (!raw) return;
    let normalized: Record<number, string> = {};
    if (Array.isArray(raw)) {
      raw.forEach((d: string, idx: number) => {
        if (d) normalized[idx + 1] = d;
      });
    } else if (typeof raw === 'object') {
      Object.entries(raw).forEach(([k, v]) => {
        const n = Number(k);
        if (Number.isFinite(n) && typeof v === 'string') normalized[n] = v as string;
      });
    }
    if (Object.keys(normalized).length > 0) {
      const days = Object.keys(normalized).map((k) => Number(k)).sort((a, b) => a - b);
      const firstDate = normalized[days[0]];
      setProjectData((prev) => ({
        ...prev,
        eventDates: normalized,
        totalDays: days.length,
        activeDays: days,
        eventDate: prev.eventDate || firstDate,
      }));
    }
  }, [initialData?.eventDates]);

  // Existing client picker (Google Contacts)
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  // Dynamic project types system
  const { allTypes: dynamicProjectTypes, trackUsage, isLoading: projectTypesLoading, createProjectType } = useProjectTypes();
  const [addProjectTypeDialogOpen, setAddProjectTypeDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedContact) {
      setProjectData(prev => ({
        ...prev,
        clientName: selectedContact.displayName || `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
        clientEmail: selectedContact.email || '',
        clientPhone: selectedContact.phone || ''
      }));
    }
  }, [selectedContact]);

  // Event Management linkage prompt
  const [askedConnectEvent, setAskedConnectEvent] = useState(false);
  const [connectToEvent, setConnectToEvent] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [addCollaboratorDialogOpen, setAddCollaboratorDialogOpen] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorName, setNewCollaboratorName] = useState('');
  const [collaboratorEmailError, setCollaboratorEmailError] = useState(false);

  useEffect(() => {
    try {
      if (projectData?.projectType === 'event' && !askedConnectEvent) {
        setConnectDialogOpen(true);
      }
    } catch {}
  }, [projectData?.projectType, askedConnectEvent]);
  
  // Project Timeline Phase Management Functions
  const handlePhaseChange = (newPhase: 'pre-planning' | 'pre-production' | 'production' | 'post-production') => {
    setProjectData(prev => ({
      ...prev,
      currentPhase: newPhase,
      phaseHistory: [
        ...prev.phaseHistory,
        {
          phase: newPhase,
          timestamp: new Date().toISOString(),
          notes: `Phase changed to ${newPhase}`
      }
      ],
      // Enable DaVinci integration when entering post-production phase
      davinciIntegrationEnabled: newPhase === 'post-production'
  }));
    
    // Track phase change in feature system
    features.trackFeatureUsage('project-timeline-phases','phase_changed', {
      profession: userProfession,
      userId: user?.id,
      previousPhase: projectData.currentPhase,
      newPhase: newPhase,
      timestamp: new Date().toISOString()
    });
    
    // Show notification
    if (newPhase === 'post-production') {
      showSuccessToast('Post-production phase activated! DaVinci Resolve integration is now available.', 5000);
  }
};
  
  // Camera detection and LOG format detection
  const detectCameraInfo = (cameraModel: string) => {
    if (!cameraModel) return;
    
    // Try video camera first
    let cameraBrand = getCameraBrand(cameraModel);
    let logFormats = getLogFormatsByCamera(cameraModel);
    
    // If not found in video cameras, try photo cameras
    if (!cameraBrand) {
      cameraBrand = getPhotoCameraBrand(cameraModel);
  }
    
    setProjectData(prev => ({
      ...prev,
      cameraBrand: cameraBrand || '',
      detectedLogFormats: logFormats,
      // Auto-select first LOG format if available
      logFormat: logFormats.length > 0 ? logFormats[0] : ''
  }));
    
    // Show notification if LOG formats detected
    if (logFormats.length > 0) {
      showInfoToast(`Detected ${cameraBrand} camera with LOG support: ${logFormats.join('')}`, 3000);
  } else if (cameraBrand) {
      showInfoToast(`Detected ${cameraBrand} camera (no LOG support detected)`, 2000);
  }
};

  const openDavinciScriptManager = () => {
    if (!projectData.davinciIntegrationEnabled) {
      showWarningToast('Please enter Post-production phase to access DaVinci Resolve integration', 4000);
      return;
  }
    
    // Track DaVinci integration usage
    features.trackFeatureUsage('davinci-resolve-integration','script_manager_opened', {
      profession: userProfession,
      userId: user?.id,
      projectName: projectData.projectName,
      currentPhase: projectData.currentPhase,
      cameraBrand: projectData.cameraBrand,
      logFormat: projectData.logFormat,
      timestamp: new Date().toISOString()
    });
    
    // Open Script Manager dialog
    setShowScriptManager(true);
    showInfoToast('Opening DaVinci Resolve Script Manager...', 2000);
};

  
  // Health Check navigation handler
  const handleGoToStep = (stepIndex: number) => {
    setActiveStep(stepIndex);
};

  const handleGoToTab = (tabName: string) => {
    // Navigate to Universal Dashboard tab (would need parent component integration)
    log.debug('Navigate to tab', tabName);
    // TODO: Implement tab navigation to Universal Dashboard
  };

  const handleHealthCheckPassed = () => {
    setHealthCheckPassed(true);
    setShowHealthCheck(false);
    showSuccessToast('Health check passed! Ready to create project.', 3000);
    // Proceed with project creation
    createProjectContext(projectData as any);
};

  // Generate session ID for autosave
  const [sessionId] = useState(() => crypto.randomUUID());

  // Persist memory card plan once a project exists
  useEffect(() => {
    const savePlan = async () => {
      if (!currentProject?.id || memoryPlanSavedRef.current) return;
      try {
        const totalGb = Array.isArray(projectData.selectedMemoryCards)
          ? projectData.selectedMemoryCards.reduce((sum: number, c: any) => {
              const cap = parseFloat((c.capacity || '').toString().replace(/[^0-9.]/g, ', ')) || 0;
              const count = Number(c.count || 1);
              return sum + cap * count;
            }, 0)
          : 0;
        await fetch(`/api/projects/${encodeURIComponent(String(currentProject.id))}/memory-cards`, {
          method: 'POST',
          headers: { 'Content-Type' : 'application/json' },
          body: JSON.stringify({
            profession: userProfession,
            labelingScheme: projectData.memoryCardLabeling || memoryCardLabeling,
            totalRequiredGb: totalGb,
            cards: projectData.selectedMemoryCards || [],
            plan: projectData.enhancedMemoryCardSelection || {},
            notes: projectData.equipmentNotes || ''
          })
        });
        memoryPlanSavedRef.current = true;
      } catch (e) {
        log.warn('Failed to persist memory card plan', e);
      }
    };
    savePlan();
  }, [currentProject?.id, projectData.selectedMemoryCards, projectData.enhancedMemoryCardSelection, projectData.memoryCardLabeling, projectData.equipmentNotes, userProfession, memoryCardLabeling]);

  // Map collaborator role to split sheet contributor role
  const mapCollaboratorRoleToContributorRole = useCallback((collaboratorRole: string, prof: string): ContributorRole => {
    // Mapping based on profession
    switch (prof) {
      case 'photographer':
        switch (collaboratorRole) {
          case 'editor': return 'photo_editor';
          case 'assistant': return 'assistant';
          case 'stylist': return 'stylist';
          case 'makeup_artist': return 'makeup_artist';
          default: return 'collaborator';
        }
      case 'videographer':
        switch (collaboratorRole) {
          case 'editor': return 'video_editor';
          case 'colorist': return 'colorist';
          case 'sound_engineer': return 'sound_engineer';
          case 'cinematographer': return 'cinematographer';
          default: return 'collaborator';
        }
      case 'music_producer':
        switch (collaboratorRole) {
          case 'producer': return 'producer';
          case 'artist': return 'artist';
          case 'songwriter': return 'songwriter';
          case 'composer': return 'composer';
          case 'mix_engineer': return 'mix_engineer';
          case 'mastering_engineer': return 'mastering_engineer';
          default: return 'collaborator';
        }
      default:
        return 'collaborator';
    }
  }, []);

  // Map collaborators to split sheet contributors
  const mapCollaboratorsToContributors = useCallback((collaborators: any[]): SplitSheetContributor[] => {
    return collaborators.map((collab, index) => ({
      name: collab.name || collab.email || 'Ukjent',
      email: collab.email || '',
      role: mapCollaboratorRoleToContributorRole(collab.role || 'contributor', userProfession),
      percentage: 0, // User must set this in editor
      order_index: index,
      custom_fields: {},
      user_id: collab.user_id || undefined
    }));
  }, [userProfession, mapCollaboratorRoleToContributorRole]);

  // Create split sheet once project exists
  const splitSheetCreatedRef = useRef(false);
  useEffect(() => {
    const createSplitSheet = async () => {
      if (!currentProject?.id || !projectData.enableSplitSheet || splitSheetCreatedRef.current) return;
      
      try {
        // Map collaborators to contributors if no existing split sheet data
        const contributors = projectData.splitSheetData?.contributors || mapCollaboratorsToContributors(projectData.collaborators || []);
        
        // If we have contributors, distribute evenly if percentages are 0
        const contributorsWithPercentages = contributors.length > 0 && contributors.every((c: any) => c.percentage === 0)
          ? contributors.map((c: any, index: number) => ({
              ...c,
              percentage: 100 / contributors.length
            }))
          : contributors;

        const splitSheetRequest = {
          project_id: currentProject.id,
          title: `${projectData.projectName} - Split Sheet`,
          description: projectData.description || undefined,
          contributors: contributorsWithPercentages.map((c: any, index: number) => ({
            name: c.name,
            email: c.email || '',
            role: c.role,
            percentage: c.percentage,
            order_index: index,
            custom_fields: c.custom_fields || {},
            user_id: c.user_id || undefined
          }))
        };

        const response = await apiRequest('/api/split-sheets', {
          method: 'POST',
          body: JSON.stringify(splitSheetRequest)
        });

        if (response.success) {
          log.info('Split sheet created successfully', response.data);
          splitSheetCreatedRef.current = true;
          showSuccessToast('Split Sheet opprettet for prosjektet');
        }
      } catch (e) {
        log.warn('Failed to create split sheet', e);
        showErrorToast('Kunne ikke opprette Split Sheet. Du kan opprette den manuelt senere.');
      }
    };
    createSplitSheet();
  }, [currentProject?.id, projectData.enableSplitSheet, projectData.projectName, projectData.description, projectData.collaborators, projectData.splitSheetData, mapCollaboratorsToContributors, showSuccessToast, showErrorToast]);
  
  // Lead import modal states
  const [showLeadImport, setShowLeadImport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Navigation
  const navigate = useNavigate();

  // Get profession-specific split sheet descriptions
  const splitSheetInfo = useMemo(() => {
    const getSplitSheetDescription = (prof: string) => {
      const descriptions: Record<string, { main: string; explanation: string }> = {
        music_producer: {
          main: 'Fordel inntekter og royalty mellom bidragsytere i prosjektet. Split sheet-en vil automatisk bli opprettet når prosjektet er klart.',
          explanation: 'En Split Sheet er et dokument som spesifiserer hvordan inntekter og royalty skal deles mellom alle som bidrar til musikkproduksjonen (artister, tekstforfattere, produsenter, teknikere, etc.). Dette er viktig for å dokumentere eierskap og sikre riktig fordeling av inntekter.'
        },
        photographer: {
          main: 'Fordel inntekter mellom bidragsytere i prosjektet (fotografer, assistenter, retusjører, etc.). Split sheet-en vil automatisk bli opprettet når prosjektet er klart.',
          explanation: 'En Split Sheet dokumenterer hvordan inntekter skal deles mellom alle som bidrar til fotoprosjektet. Dette inkluderer hovedfotograf, assistenter, retusjører, og andre bidragsytere. Viktig for transparent fordeling av honorarer.'
        },
        videographer: {
          main: 'Fordel inntekter mellom bidragsytere i prosjektet (videografer, klippere, lydteknikere, etc.). Split sheet-en vil automatisk bli opprettet når prosjektet er klart.',
          explanation: 'En Split Sheet dokumenterer hvordan inntekter skal deles mellom alle som bidrar til videoprosjektet. Dette inkluderer hovedvideograf, klippere, lydteknikere, color graders, og andre bidragsytere. Viktig for transparent fordeling av honorarer.'
        }
      };
      return descriptions[prof] || {
        main: 'Fordel inntekter mellom bidragsytere i prosjektet. Split sheet-en vil automatisk bli opprettet når prosjektet er klart.',
        explanation: 'En Split Sheet dokumenterer hvordan inntekter skal deles mellom alle som bidrar til prosjektet. Dette er viktig for transparent fordeling av honorarer og sikrer at alle bidragsytere får riktig kompensasjon.'
      };
    };
    return getSplitSheetDescription(userProfession);
  }, [userProfession]);

  // Validate email helper
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle adding collaborator
  const handleAddCollaborator = () => {
    if (!newCollaboratorEmail.trim()) {
      setCollaboratorEmailError(true);
      showErrorToast('E-post er påkrevd');
      return;
    }

    if (!validateEmail(newCollaboratorEmail)) {
      setCollaboratorEmailError(true);
      showErrorToast('Ugyldig e-post format');
      return;
    }

    const collaboratorId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCollaborator = {
      id: collaboratorId,
      name: newCollaboratorName.trim() || newCollaboratorEmail.split('@')[0],
      email: newCollaboratorEmail.trim(),
      role: 'contributor' as const
    };

    setProjectData((prev) => ({
      ...prev,
      collaborators: [...(prev.collaborators || []), newCollaborator]
    }));

    setNewCollaboratorEmail('');
    setNewCollaboratorName('');
    setCollaboratorEmailError(false);
    setAddCollaboratorDialogOpen(false);
    showSuccessToast('Samarbeidspartner lagt til i teamet');
  };

  // Lead import functionality
  const { availableLeads, isLoadingLeads, importFromLead, isImporting } = {
    availableLeads: [],
    isLoadingLeads: false,
    importFromLead: () => Promise.resolve(),
    isImporting: false
};

  // Create worklog entry mutation for culture-specific planning
  const createWorklogMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/worklog', {
        method: 'POST',
        body: JSON.stringify(data)
    });
  }
  });
  

  /**
   * Check if Virtual Studio is available for this project
   * Requirements:
   * - User must be a photographer
   * - Project type must NOT be wedding
   * - User must have purchased Virtual Studio from marketplace (2495 NOK)
   */
  const canOpenVirtualStudio = useMemo(() => {
    const isPhotographer = userProfession === 'photographer';
    const isNonWeddingProject = projectData.projectType !== 'wedding';
    const hasBasicInfo = projectData.projectName && projectData.clientName;

    // Check if user has Virtual Studio marketplace access
    const { hasAccess } = features.checkFeatureAccess('virtual-studio', userProfession);

    return isPhotographer && isNonWeddingProject && hasBasicInfo && hasAccess;
  }, [projectData, userProfession, features]);

  /**
   * Open Virtual Studio with project context
   */
  const handleOpenVirtualStudio = useCallback(() => {
    // Track feature usage
    features.trackFeatureUsage('virtual-studio','opened_from_project', {
      profession: userProfession,
      userId: user?.id,
      projectId: currentProject?.id,
      projectType: projectData.projectType,
      timestamp: new Date().toISOString()
    });

    // Prepare Virtual Studio data from project
    const virtualStudioData = {
      projectId: currentProject?.id,
      projectName: projectData.projectName,
      projectType: projectData.projectType,
      clientName: projectData.clientName,
      cameraSetup: {
        primary: projectData.primaryCamera,
        backup: projectData.backupCamera,
        logFormat: projectData.logFormat
      },
      scenes: projectData.shotList?.map((shot: any) => ({
        name: shot.scene || shot.description,
        description: shot.description,
        duration: shot.estimatedDuration || 30,
        shotType: shot.shotType,
        notes: shot.notes
      })) || [],
      location: projectData.location,
      eventDate: projectData.eventDate,
      returnCallback: handleVirtualStudioComplete
    };

    // Show loading toast
    showInfoToast('Opening Virtual Studio with project data...', 2000);

    // Navigate to Virtual Studio with project context
    navigate('/virtual-studio', { state: virtualStudioData });
  }, [projectData, currentProject, user, userProfession, features, navigate, showInfoToast]);

  /**
   * Handle Virtual Studio completion and return
   */
  const handleVirtualStudioComplete = useCallback(async (result: any) => {
    try {
      showInfoToast('Processing Virtual Studio results...', 2000);

      // Create worklog entry for pre-visualization work
      await createWorklogMutation.mutateAsync({
        projectId: currentProject?.id,
        userId: user?.id,
        taskName: 'Virtual Studio Pre-visualization',
        description: `Created ${result.sceneCount} scenes with lighting setup and camera paths`,
        hoursSpent: result.workTime / 60,
        status: 'completed',
        artifacts: result.renderUrls || [],
        metadata: {
          sceneCount: result.sceneCount,
          cameraPathCount: result.cameraPathCount,
          renderCount: result.renderCount,
          exportedFormats: result.exportedFormats
        }
      });

      // Update project description with Virtual Studio data
      if (currentProject?.id) {
        await updateProject(currentProject.id, {
          description: `${currentProject.description || ''}\n\nVirtual Studio: ${result.sceneCount} scenes created`
        });
      }

      // Emit real-time event
      if (isConnected) {
        emitEvent('status_changed', {
          projectId: currentProject?.id,
          status: 'virtual_studio_completed',
          sceneCount: result.sceneCount,
          timestamp: new Date().toISOString()
        });
      }

      // Show success notification
      showSuccessToast(
        `Virtual Studio pre-visualization completed! ${result.sceneCount} scenes created.`,
        6000
      );

      // Track completion
      features.trackFeatureUsage('virtual-studio', 'completed', {
        profession: userProfession,
        userId: user?.id,
        projectId: currentProject?.id,
        sceneCount: result.sceneCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log.error('Error processing Virtual Studio results', error);
      showErrorToast('Failed to save Virtual Studio results. Please try again.', 6000);
    }
  }, [currentProject, user, createWorklogMutation, updateProject, isConnected, emitEvent, showSuccessToast, showErrorToast, showInfoToast, features, userProfession]);

  // Show initial data notification if pre-filled from submission
  useEffect(() => {
    if (initialData) {
      showInfoToast(`Project pre-filled from submission: ${initialData.clientName}`, 3000);
    }
  }, [initialData]);

  const buildEventPayload = useCallback(() => {
    const start = projectData?.eventDate || (projectData?.eventDates ? Object.values(projectData.eventDates)[0] : '');
    const end = projectData?.eventDate || (projectData?.eventDates ? Object.values(projectData.eventDates).slice(-1)[0] : '');
    const audience = profession === 'vendor' ? 'B2B' : 'Mixed';
    const venueName = projectData?.venue || projectData?.location || '';
    return {
      name: projectData?.projectName || 'Event',
      description: projectData?.description || '',
      type: 'conference',
      status: 'planning',
      startDate: start,
      endDate: end || start,
      venue: {
        name: venueName,
        address: venueName,
        city: '',
        country: 'Norge',
        capacity: parseInt(projectData?.guestCount || '0') || 0,
        type: 'physical'
      },
      target: {
        audience,
        segments: [],
        expectedAttendees: parseInt(projectData?.guestCount || '0') || 0,
        geography: ['Norge']
      },
      client: {
        name: projectData?.clientName || '',
        email: projectData?.clientEmail || '',
        phone: projectData?.clientPhone || ''
      },
      source: 'project_creation',
    };
  }, [projectData, profession]);

  const handleOpenEventManagementClick = useCallback(async () => {
    const payload = buildEventPayload();
    if (onOpenEventManagement) {
      onOpenEventManagement(payload);
      showSuccessToast('Åpner Event Management med prosjektdata...', 3000);
      return;
    }
    // Fallback: create event directly
    try {
      const res = await fetch('/api/events-management/events', {
        method: 'POST',
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create event');
      showSuccessToast('Event opprettet fra prosjektdata', 4000);
    } catch (e) {
      showErrorToast('Kunne ikke opprette event fra prosjekt', 5000);
    }
  }, [buildEventPayload, onOpenEventManagement, showSuccessToast, showErrorToast]);

  // Step navigation handlers
  const handleNext = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, creationSteps.length - 1));
  }, [creationSteps.length]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Calculate current step based on project data completion (for display only)
  const currentStep = useMemo(() => {
    if (!projectData.projectName && !projectData.clientName) return 0;
    if (!projectData.projectType) return 0;
    if (projectData.projectType && projectData.projectName && projectData.clientName) {
      return 1;
    }
    return 0;
  }, [projectData.projectName, projectData.clientName, projectData.projectType]);

  return (
    <Box sx={{ p: 3 }}>
      {initialData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 700,
              fontSize: '0.938rem',
              color: 'text.primary'
            }}
          >
            📨 Creating project from submission: {initialData.clientName}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              fontSize: '0.813rem',
              fontWeight: 500,
              color: 'text.secondary'
            }}
          >
            Client info has been pre-filled. Complete the remaining fields to create the project.
          </Typography>
        </Alert>
      )}
      
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ 
          fontWeight: 700,
          fontSize: '1.75rem',
          color: 'text.primary'
        }}
      >
        {isCastingPlanner 
          ? (getTerm ? `Nytt ${getTerm('project')}` : 'Nytt Casting Prosjekt')
          : initialData ? 'Create Project from Submission' : 'Project Creation with Memory Cards'
        }
      </Typography>

      {/* Vertical Stepper with Step Content */}
      <Stepper 
        activeStep={activeStep} 
        orientation="vertical" 
        sx={{ mt: 3, mb: 3 }}
        aria-label="Prosjekt opprettelse steg"
      >
        {creationSteps.map((step, index) => (
          <Step key={step.label} completed={index < activeStep}>
            <StepLabel
              StepIconComponent={({ active, completed }) => (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: completed || active
                      ? 'primary.main'
                      : 'action.disabledBackground',
                    color: completed || active ? 'primary.contrastText' : 'action.disabled',
                    border: active ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {step.icon}
                </Box>
              )}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'text.primary'
                }}
              >
                {step.label}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.813rem',
                  fontWeight: 500
                }}
              >
                {step.description}
              </Typography>
              {step.optional && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.813rem',
                    fontWeight: 500,
                    display: 'block', 
                    mt: 0.5 
                  }}
                >
                  (Valgfritt)
                </Typography>
              )}
            </StepLabel>
            <StepContent>
              {index === 0 && (
                /* Step 0: Grunndata - Contact & Project Info */
                <Box sx={{ mt: 2 }}>
                  {/* Existing client (Google Contacts) picker */}
                  <ContactPicker
                    selectedContact={selectedContact}
                    onContactSelect={setSelectedContact}
                    profession={profession}
                    showErrorToast={showErrorToast}
                    showInfoToast={showInfoToast}
                    showSuccessToast={showSuccessToast}
                  />

                  {/* Contact & Project Info Summary */}
                  <Box sx={{ mt: 3 }}>
                    <ContactProjectInfoSummary
                      projectId={currentProject?.id}
                      sessionId={sessionId}
                      guestCount={projectData.guestCount}
                      eventDate={projectData.eventDate}
                      eventDates={projectData.eventDates}
                      location={projectData.location}
                      projectType={projectData.projectType}
                      showProjectType={!!initialData?.projectType}
                      selectedContact={selectedContact}
                      clientName={projectData.clientName}
                      clientEmail={projectData.clientEmail}
                      clientPhone={projectData.clientPhone}
                    />
                  </Box>

                  {/* Pre-filled Data Preview */}
                  {initialData && (
                    <Card 
                      sx={{ 
                        mt: 3, 
                        mb: 2,
                        borderRadius: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                        border: '1px solid rgba(25, 118, 210, 0.2)'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: 'text.primary'
                          }}
                        >
                          <Info sx={{ color: 'primary.main' }} />
                          Pre-filled from Submission
                        </Typography>
                        <Divider sx={{ mb: 2, mt: 1 }} />
                      <Stack spacing={1.5}>
                        {initialData.clientName && (
                          <Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              Client
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
                              {initialData.clientName}
                            </Typography>
                          </Box>
                        )}
                        {initialData.clientEmail && (
                          <Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              Email
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
                              {initialData.clientEmail}
                            </Typography>
                          </Box>
                        )}
                        {initialData.projectType && (
                          <Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              Project Type
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
                              {initialData.projectType}
                            </Typography>
                          </Box>
                        )}
                        {initialData.description && (
                          <Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              Description
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
                              {initialData.description}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                      </CardContent>
                    </Card>
                  )}

                  {/* Project Type Selection with Dynamic Types */}
                  <Card 
                    sx={{ 
                      mt: 3,
                      mb: 3,
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '1.125rem',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: 'text.primary'
                        }}
                      >
                        <Folder sx={{ color: 'primary.main' }} />
                        Prosjekttype
                      </Typography>
                      <Divider sx={{ mb: 2, mt: 1 }} />
                      <ProjectTypeSelector
                        value={projectData.projectType || ''}
                        onChange={(selectedTypeId, isCustomType) => {
                          setProjectData((prev) => ({
                            ...prev,
                            projectType: selectedTypeId,
                            weddingCulture: !isCastingPlanner && selectedTypeId === 'wedding' ? prev.weddingCulture : 'norsk',
                          }));
                        }}
                        isCastingPlanner={isCastingPlanner}
                        customTypes={dynamicProjectTypes.filter(t => !(t as any).isGlobal).map(t => ({
                          id: typeof t.id === 'string' ? parseInt(t.id) || 0 : (t.id || 0),
                          name: t.name || '',
                          usageCount: (t as any).usageCount
                        }))}
                        onTrackUsage={(id) => trackUsage(id.toString())}
                        onAddCustomType={() => setAddProjectTypeDialogOpen(true)}
                        showAddButton={!isCastingPlanner}
                      />
                    </CardContent>
                  </Card>

                  {/* Add Project Type Dialog - Hidden in Casting Planner */}
                  {!isCastingPlanner && (
                    <AddProjectTypeDialog
                      open={addProjectTypeDialogOpen}
                      onClose={() => setAddProjectTypeDialogOpen(false)}
                      onSave={async (data) => {
                        await createProjectType(data);
                        showSuccessToast(`Custom project type "${data.name}" created successfully!`);
                      }}
                    />
                  )}
                </Box>
              )}
              {index === 1 && (
                /* Step 1: Split Sheet & Produksjonsteam */
                <Box sx={{ mt: 2 }}>
                  {/* Produksjonsteam (Collaborators) */}
                  {!isCastingPlanner && (
                    <Card 
                      sx={{ 
                        mb: 3,
                        borderRadius: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'box-shadow 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: 'text.primary'
                          }}
                        >
                          <Groups sx={{ color: 'primary.main' }} />
                          Produksjonsteam
                        </Typography>
                        <Divider sx={{ mb: 2, mt: 1 }} />
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            mb: 2
                          }}
                        >
                          Legg til samarbeidspartnere som skal være med i prosjektet. Disse kan automatisk legges til i Split Sheet hvis aktivert.
                        </Typography>
                        <ProjectCollaborators
                          collaborators={projectData.collaborators || []}
                          onAddCollaborator={() => setAddCollaboratorDialogOpen(true)}
                          onRemoveCollaborator={(id) => {
                            setProjectData((prev) => ({
                              ...prev,
                              collaborators: (prev.collaborators || []).filter((c: any) => c.id !== id)
                            }));
                            showSuccessToast('Samarbeidspartner fjernet fra teamet');
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Split Sheet Setup - Available for All Professions */}
                  <Card 
                    sx={{ 
                      mt: 2,
                      mb: 3,
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'box-shadow 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '1.125rem',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: 'text.primary'
                        }}
                      >
                        <AccountBalance sx={{ color:'#9f7aea' }} />
                        Split Sheet
                      </Typography>
                      <Divider sx={{ mb: 2, mt: 1 }} />
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.95rem',
                          fontWeight: 500,
                          mb: 2
                        }}
                      >
                        {splitSheetInfo.main}
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={projectData.enableSplitSheet || false}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setProjectData((prev) => ({
                                ...prev,
                                enableSplitSheet: enabled,
                                // Clear split sheet data if disabling
                                splitSheetData: enabled ? prev.splitSheetData : null
                              }));
                            }}
                          />
                        }
                        label={
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            Aktiver Split Sheet for dette prosjektet
                          </Typography>
                        }
                      />

                      {projectData.enableSplitSheet && (
                        <Box sx={{ mt: 3 }}>
                          <Alert 
                            severity="info" 
                            sx={{ 
                              mb: 3,
                              bgcolor: 'rgba(156, 39, 176, 0.08)',
                              border: '1px solid rgba(156, 39, 176, 0.2)'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.938rem', color: 'text.primary', mb: 0.5 }}>
                              Split Sheet vil bli opprettet automatisk
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
                              Du kan legge til bidragsytere og justere prosentandeler i Split Sheets-fanen etter at prosjektet er opprettet. Samarbeidspartnere fra Produksjonsteam vil automatisk bli inkludert.
                            </Typography>
                          </Alert>

                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.938rem',
                              color: 'text.primary',
                              mb: 1.5
                            }}
                          >
                            Hva er en Split Sheet?
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                              mb: 2,
                              lineHeight: 1.6
                            }}
                          >
                            {splitSheetInfo.explanation}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* Step Navigation Buttons */}
              <Box sx={{ mb: 2, mt: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={index === creationSteps.length - 1}
                  aria-label={index === creationSteps.length - 1 ? 'Fullfør prosjekt' : 'Gå til neste steg'}
                  size="large"
                  sx={{ 
                    minHeight: { xs: 56, sm: 52 },
                    fontSize: { xs: '1.125rem', sm: '1.063rem' },
                    fontWeight: 700,
                    px: { xs: 5, sm: 4 },
                    py: { xs: 2, sm: 1.5 },
                    flex: { xs: 1, sm: 'none' },
                    minWidth: { xs: '100%', sm: 140 }
                  }}
                >
                  {index === creationSteps.length - 1 ? 'Fullfør' : 'Neste'}
                </Button>
                <Button
                  disabled={index === 0}
                  onClick={handleBack}
                  aria-label="Gå til forrige steg"
                  size="large"
                  variant="outlined"
                  sx={{ 
                    minHeight: { xs: 56, sm: 52 },
                    fontSize: { xs: '1.125rem', sm: '1.063rem' },
                    fontWeight: 700,
                    px: { xs: 5, sm: 4 },
                    py: { xs: 2, sm: 1.5 },
                    flex: { xs: 1, sm: 'none' },
                    minWidth: { xs: '100%', sm: 140 }
                  }}
                >
                  Tilbake
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Add Collaborator Dialog */}
      <Dialog 
        open={addCollaboratorDialogOpen} 
        onClose={() => {
          setAddCollaboratorDialogOpen(false);
          setNewCollaboratorEmail('');
          setNewCollaboratorName('');
          setCollaboratorEmailError(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'text.primary' }}>
          Legg til samarbeidspartner
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Navn (valgfritt)"
              fullWidth
              autoComplete="name"
              value={newCollaboratorName}
              onChange={(e) => setNewCollaboratorName(e.target.value)}
              placeholder="Fornavn Etternavn"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                },
              }}
            />
            <TextField
              label="E-post"
              fullWidth
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newCollaboratorEmail}
              onChange={(e) => {
                setNewCollaboratorEmail(e.target.value);
                setCollaboratorEmailError(false);
              }}
              error={collaboratorEmailError}
              helperText={collaboratorEmailError ? 'Ugyldig e-post format' : ''}
              placeholder="samarbeidspartner@example.com"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: collaboratorEmailError ? 'error.main' : 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: collaboratorEmailError ? 'error.main' : 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: collaboratorEmailError ? 'error.main' : 'primary.main' },
                },
              }}
            />
            <Alert severity="info" sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)', border: '1px solid rgba(25, 118, 210, 0.2)' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Samarbeidspartneren vil bli lagt til i produksjonsteamet og kan automatisk inkluderes i Split Sheet hvis aktivert.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button 
            onClick={() => {
              setAddCollaboratorDialogOpen(false);
              setNewCollaboratorEmail('');
              setNewCollaboratorName('');
              setCollaboratorEmailError(false);
            }}
            sx={{ fontWeight: 600 }}
          >
            Avbryt
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddCollaborator}
            sx={{ fontWeight: 600 }}
          >
            Legg til
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connect to Event Management prompt - Hidden in Casting Planner */}
      {!isCastingPlanner && (
        <Dialog open={connectDialogOpen} onClose={() => { setConnectDialogOpen(false); setAskedConnectEvent(true); }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Koble til Event Management?</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.95rem', color: 'text.primary', mt: 1 }}>
              Du har valgt prosjekttypen «event». Vil du koble dette prosjektet til Event Management for planlegging og analyser?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConnectDialogOpen(false); setAskedConnectEvent(true); setConnectToEvent(false); }}>Nei</Button>
            <Button variant="contained" onClick={() => { setConnectDialogOpen(false); setAskedConnectEvent(true); setConnectToEvent(true); }}>Ja, koble</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

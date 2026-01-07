import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from './ToastStack';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Grow,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  PhotoCamera as PhotoCameraIcon,
  ViewList as ViewListIcon,
  Group as GroupIcon,
  Groups as GroupsIcon,
  LocationOn as LocationIcon,
  Inventory as InventoryIcon,
  Movie as MovieIcon,
  Share as ShareIcon,
  Assignment as AssignmentIcon,
  Work as WorkIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  AccessTime as AccessTimeIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Transgender as TransgenderIcon,
  PlayArrow as PlayArrowIcon,
  Business as BusinessIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Videocam as VideocamIcon,
  CameraAlt as CameraAltIcon,
  Lightbulb as LightbulbIcon,
  GraphicEq as GraphicEqIcon,
  Face as FaceIcon,
  Checkroom as CheckroomIcon,
  Build as BuildIcon,
  Inventory2 as PropIcon,
  Note as NoteIcon,
  ContactEmergency as ContactEmergencyIcon,
  Description as DescriptionIcon,
  TheaterComedy as TheaterComedyIcon,
  RecentActors as RecentActorsIcon,
  InterpreterMode as InterpreterModeIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  SwapHoriz as SwapHorizIcon,
  School as TutorialIcon,
  Folder,
} from '@mui/icons-material';
import { CastingProject, Role, Candidate, Schedule } from '../core/models/casting';
import AdminDashboard from './AdminDashboard';
import LoginDialog from './LoginDialog';
import { RichTextEditor } from './RichTextEditor';

// Custom icon: Person holding camera with list/clipboard
const ShotListIcon = ({ sx, ...props }: { sx?: any; [key: string]: any }) => {
  const style = { width: '1em', height: '1em', display: 'block', ...sx };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...props}
    >
      {/* Person body */}
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      {/* Camera in person's hand (right side) */}
      <rect x="15" y="3" width="4" height="3" rx="0.5" />
      <circle cx="17" cy="4.5" r="0.8" />
      <line x1="15" y1="4.5" x2="13" y2="4.5" />
      <line x1="16" y1="6" x2="16" y2="7" />
      {/* List/Clipboard in person's hand (left side) */}
      <rect x="3" y="5" width="3" height="5" rx="0.5" />
      <line x1="4" y1="6.5" x2="5" y2="6.5" />
      <line x1="4" y1="7.5" x2="5" y2="7.5" />
      <line x1="4" y1="8.5" x2="5" y2="8.5" />
      <line x1="4" y1="9.5" x2="5" y2="9.5" />
    </svg>
  );
};
import { castingService } from '../services/castingService';
import { resetMockCastingData } from '../data/mockCastingData';
import { sceneComposerService } from '../services/sceneComposerService';
import { consentService } from '../services/consentService';
import { castingAuthService } from '../services/castingAuthService';
import { CrewManagementPanel } from './CrewManagementPanel';
import { LocationManagementPanel } from './LocationManagementPanel';
import { PropManagementPanel } from './PropManagementPanel';
import { ProductionDayView } from './ProductionDayView';
import { CastingShotListPanel } from './CastingShotListPanel';
import { CastingSharingDialog } from './CastingSharingDialog';
import { RoleManagementPanel } from './RoleManagementPanel';
import { CandidateManagementPanel } from './CandidateManagementPanel';
import { DashboardPanel } from './DashboardPanel';
import { AuditionSchedulePanel } from './AuditionSchedulePanel';
import { SharingPanel } from './SharingPanel';
import { KanbanPanel } from './KanbanPanel';
import { CastingProfessionDialog } from './CastingProfessionDialog';
import NewProjectCreationModal from './Planning/NewProjectCreationModal';
import { CastingPlannerTutorial } from './CastingPlannerTutorial';
import { TutorialEditorPanel } from './TutorialEditorPanel';
import { ConsentManagementPanel } from './ConsentManagementPanel';
import { Tutorial } from '../services/tutorialService';
import { ProfessionOnboardingDialog, useProfessionOnboarding, ProfessionType } from './ProfessionOnboardingDialog';
import { useAuth } from '../hooks/useAuth';
import { ProjectProvider } from '../contexts/ProjectContext';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

interface CastingPlannerPanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isStandalone?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const tabIds = [
    'tabpanel-oversikt',
    'tabpanel-roller',
    'tabpanel-kandidater',
    'tabpanel-auditions',
    'tabpanel-team',
    'tabpanel-lokasjoner',
    'tabpanel-rekvisitter',
    'tabpanel-produksjonsplan',
    'tabpanel-shot-lists',
    'tabpanel-deling',
  ];
  const tabLabels = [
    'Oversikt',
    'Roller',
    'Kandidater',
    'Auditions',
    'Team',
    'Steder',
    'Utstyr',
    'Produksjonsplan',
    'Shot Lists',
    'Deling',
  ];
  
  if (value !== index) {
    return null;
  }
  return (
    <Box 
      role="tabpanel"
      id={tabIds[index]}
      aria-labelledby={`tab-${tabIds[index].replace('tabpanel-', '')}`}
      sx={{ 
        flex: 1, 
        overflow: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        width: '100%',
        // Responsive padding: larger on desktop, medium on tablet, small on mobile
        padding: isMobile ? '8px' : isTablet ? '12px' : '16px',
      }}
    >
      {children}
    </Box>
  );
}

export function CastingPlannerPanel({ onClose, isFullscreen = false, onToggleFullscreen, isStandalone = false }: CastingPlannerPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const toast = useToast();
  
  // WCAG 2.2 - 2.5.5 Target Size: minimum 44x44px touch targets
  const TOUCH_TARGET_SIZE = 44;
  
  // Shared TextField styling for dialogs with responsive font sizes
  // Responsive: xs (0.875rem), sm (1rem), md (0.95rem), lg (1.05rem), xl (1.125rem)
  const textFieldStyles = {
    '& .MuiInputLabel-root': { 
      color: 'rgba(255,255,255,0.6)',
      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
    },
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
      minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
      '& input': {
        fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
        py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
      },
      '& textarea': {
        fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
        py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
      },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
      '&.Mui-focused fieldset': { borderColor: '#00d4ff', borderWidth: 2 },
    },
  };
  
  // Shared InputLabel styling for Select components
  const inputLabelStyles = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
  };
  
  // Shared MenuProps for Select components to ensure MenuItem font sizes and proper z-index
  // Use container: document.body with higher z-index than Dialog (100000) to fix modal stacking issues
  const selectMenuProps = {
    container: document.body,
    sx: {
      zIndex: 100010,
    },
    PaperProps: {
      sx: {
        bgcolor: '#1c2128',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        mt: 0.5,
        maxHeight: { xs: 250, sm: 300, md: 280, lg: 320, xl: 400 },
        '& .MuiMenuItem-root': {
          fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
          minHeight: TOUCH_TARGET_SIZE,
          py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
          '&:hover': {
            bgcolor: 'rgba(139,92,246,0.15)',
          },
          '&.Mui-selected': {
            bgcolor: 'rgba(139,92,246,0.25)',
            '&:hover': {
              bgcolor: 'rgba(139,92,246,0.35)',
            },
          },
        },
      },
    },
  };
  
  // Profession configuration
  const PROFESSION_CONFIG = {
    photographer: {
      name: 'Fotograf',
      color: '#10b981',
      icon: PhotoCameraIcon,
      terminology: {
        project: 'Fotoprosjekt',
        shot: 'Bilde',
        shoot: 'Fotoshooting',
        shootDay: 'Fotodag',
        shotList: 'Bildeliste',
        portfolio: 'Portefølje',
        photo: 'Foto',
        photos: 'Bilder',
      },
      defaultCrewRoles: ['photographer', 'assistant', 'stylist'],
      shotListFields: ['aperture', 'shutter', 'iso', 'focal_length'],
      candidateRequirements: ['portfolio', 'photos'],
    },
    videographer: {
      name: 'Videograf',
      color: '#8b5cf6',
      icon: VideocamIcon,
      terminology: {
        project: 'Videoprosjekt',
        shot: 'Scene',
        shoot: 'Filming',
        shootDay: 'Filmdag',
        shotList: 'Sceneliste',
        portfolio: 'Showreel',
        photo: 'Video',
        photos: 'Videoer',
      },
      defaultCrewRoles: ['director', 'camera_operator', 'sound_engineer', 'gaffer'],
      shotListFields: ['fps', 'resolution', 'codec', 'audio_channels'],
      candidateRequirements: ['showreel', 'demo_reel'],
    },
  };
  
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState<CastingProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CastingProject | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showTutorialEditor, setShowTutorialEditor] = useState(false);
  const [previewTutorial, setPreviewTutorial] = useState<Tutorial | null>(null);

  const [availableScenes, setAvailableScenes] = useState<Array<{ id: string; name: string; thumbnail?: string }>>([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('all');
  const [scheduleDateFilter, setScheduleDateFilter] = useState<string>('');
  const [scheduleCandidateFilter, setScheduleCandidateFilter] = useState<string>('all');
  const [scheduleRoleFilter, setScheduleRoleFilter] = useState<string>('all');
  const [candidateViewMode, setCandidateViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Awaited<ReturnType<typeof castingAuthService.getUserRole>> | null>(null);
  
  // Permissions state for role-based tab visibility
  const [permissions, setPermissions] = useState<{
    canViewAll: boolean;
    canEditCasting: boolean;
    canEditProduction: boolean;
    canEditShotLists: boolean;
    canManageCrew: boolean;
    canManageLocations: boolean;
    canApprove: boolean;
  }>({
    canViewAll: false,
    canEditCasting: false,
    canEditProduction: false,
    canEditShotLists: false,
    canManageCrew: false,
    canManageLocations: false,
    canApprove: false,
  });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  
  // Ref to track current project ID for stale response detection
  const currentProjectIdRef = useRef<string | null>(null);
  
  const [profession, setProfession] = useState<'photographer' | 'videographer' | null>(null);
  const [professionDialogOpen, setProfessionDialogOpen] = useState(false);
  
  // Map profession to onboarding profession type
  const getOnboardingProfession = (): ProfessionType | null => {
    if (!profession) return null;
    if (profession === 'photographer') return 'photographer';
    if (profession === 'videographer') return 'director';
    return 'general';
  };
  
  // Profession onboarding hook
  const onboardingProfession = getOnboardingProfession();
  const { 
    showOnboarding, 
    closeOnboarding, 
    triggerOnboarding: triggerProfessionOnboarding,
    resetOnboarding 
  } = useProfessionOnboarding(onboardingProfession);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ id: number; email: string; role: string; display_name: string } | null>(() => {
    const stored = localStorage.getItem('adminUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [projectToDelete, setProjectToDelete] = useState<CastingProject | null>(null);
  const [projectCreationModalOpen, setProjectCreationModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<CastingProject | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  // Stable callback for project ID changes to prevent infinite loops
  const handleProjectIdChange = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);
  
  // Sort projects by updatedAt (most recent first) and limit to 4 for header
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 4);
  }, [projects]);
  
  const hasMoreProjects = projects.length > 4;
  const { user } = useAuth();

  const getHeaderRoleLabel = (role?: string | null): string => {
    if (!role) return 'Ukjent rolle';
    const labels: Record<string, string> = {
      owner: 'Eier',
      admin: 'Administrator',
      director: 'Regissør',
      producer: 'Produsent',
      casting_director: 'Castingansvarlig',
      production_manager: 'Produsentleder',
      camera_team: 'Kamerateam',
      agency: 'Byrå',
    };
    return labels[role] || role;
  };

  const accountRoleLabel = adminUser?.role ? getHeaderRoleLabel(adminUser.role) : '';
  const projectRoleLabel = currentUserRole?.role ? getHeaderRoleLabel(currentUserRole.role) : '';
  const headerRoleLabel = projectRoleLabel && accountRoleLabel && projectRoleLabel !== accountRoleLabel
    ? `${accountRoleLabel} (konto) • ${projectRoleLabel} (prosjekt)`
    : projectRoleLabel || accountRoleLabel;
  const headerProfessionLabel = profession ? PROFESSION_CONFIG[profession]?.name : '';

  // Get terminology helper (must be after profession state is defined)
  const getTerm = (key: string): string => {
    if (!profession) return key;
    const terminology = PROFESSION_CONFIG[profession]?.terminology as Record<string, string> | undefined;
    return terminology?.[key] || key;
  };

  // Get profession config helper (must be after profession state is defined)
  const getProfessionConfig = () => {
    if (!profession) return null;
    return PROFESSION_CONFIG[profession];
  };

  // Tab colors and icons matching quick navigation design (will be adapted based on profession)
  const professionConfig = getProfessionConfig();
  const tabConfig = [
    { color: professionConfig?.color || '#8b5cf6', icon: DashboardIcon }, // 0: Oversikt (includes Kanban)
    { color: '#f48fb1', icon: TheaterComedyIcon }, // 1: Roller - TheaterComedy for casting roles
    { color: professionConfig?.color || '#10b981', icon: RecentActorsIcon }, // 2: Kandidater - matches CandidateManagementPanel header
    { color: '#ffb800', icon: InterpreterModeIcon }, // 3: Auditions - person with microphone (moved next to Kandidater)
    { color: '#00d4ff', icon: GroupsIcon }, // 4: Team - GroupsIcon (3 people) matches CrewManagementPanel header
    { color: '#4caf50', icon: LocationIcon }, // 5: Steder
    { color: '#ff9800', icon: PropIcon }, // 6: Utstyr (using Inventory2Icon like prop panel header)
    { color: '#9c27b0', icon: CalendarIcon }, // 7: Kalender
    { color: professionConfig?.color || '#e91e63', icon: ShotListIcon }, // 8: Shot-list (custom icon: person with camera and list)
    { color: '#06b6d4', icon: ShareIcon }, // 9: Deling - cyan/teal
  ];

  // Quick navigation links for SpeedDial - matching tabConfig icons and colors
  // SpeedDial with direction="up" displays items from first to last (nearest to farthest from FAB)
  // Tab order: 0-Oversikt, 1-Roller, 2-Kandidater, 3-Auditions, 4-Team, 5-Steder, 6-Utstyr, 7-Kalender, 8-Shot-list, 9-Deling
  const quickNavigationLinks = useMemo(() => [
    { 
      title: 'Nytt prosjekt', 
      description: 'Opprett nytt casting prosjekt', 
      color: professionConfig?.color || '#8b5cf6', 
      icon: AddIcon, 
      tabIndex: -1, // Special action
      action: () => setProjectCreationModalOpen(true),
      badge: null,
    },
    { 
      title: 'Team', 
      description: 'Administrer crew og teammedlemmer', 
      color: tabConfig[4].color, // #00d4ff
      icon: tabConfig[4].icon, // GroupsIcon
      tabIndex: 4,
      badge: currentProject?.crew?.length || 0,
    },
    { 
      title: 'Steder', 
      description: 'Administrer lokasjoner og steder', 
      color: tabConfig[5].color, // #4caf50
      icon: tabConfig[5].icon, // LocationIcon
      tabIndex: 5,
      badge: currentProject?.locations?.length || 0,
    },
    { 
      title: 'Utstyr', 
      description: 'Administrer rekvisitter og utstyr', 
      color: tabConfig[6].color, // #ff9800
      icon: tabConfig[6].icon, // PropIcon
      tabIndex: 6,
      badge: currentProject?.props?.length || 0,
    },
    { 
      title: 'Kalender', 
      description: 'Produksjonsplan og timeplan', 
      color: tabConfig[7].color, // #9c27b0
      icon: tabConfig[7].icon, // CalendarIcon
      tabIndex: 7,
      badge: currentProject?.productionDays?.length || 0,
    },
    { 
      title: profession ? (PROFESSION_CONFIG[profession]?.terminology.shotList || 'Shot-list') : 'Shot-list', 
      description: profession === 'photographer' ? 'Fotolister og komposisjoner' : 'Videolister og scener', 
      color: tabConfig[8].color, // professionConfig?.color || '#e91e63'
      icon: tabConfig[8].icon, // ShotListIcon
      tabIndex: 8,
      badge: currentProject?.shotLists?.length || 0,
    },
  ], [profession, professionConfig, tabConfig, currentProject]);

  // Get user ID (fallback to 'default' if not available)
  const getUserId = (): string => {
    try {
      const stored = localStorage.getItem('currentUser') || localStorage.getItem('userId');
      return stored || 'default';
    } catch {
      return 'default';
    }
  };

  // Load profession from API or localStorage
  const loadProfession = async (): Promise<'photographer' | 'videographer' | null> => {
    try {
      const userId = getUserId();
      const response = await fetch(`/api/user/kv/casting-profession?user_id=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.value && (data.value === 'photographer' || data.value === 'videographer')) {
          return data.value;
        }
      }
    } catch (error) {
      console.warn('Failed to load profession from API:', error);
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('casting-profession');
      if (stored && (stored === 'photographer' || stored === 'videographer')) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load profession from localStorage:', error);
    }
    return null;
  };

  // Save profession to API and localStorage
  const saveProfession = async (prof: 'photographer' | 'videographer'): Promise<void> => {
    try {
      const userId = getUserId();
      await fetch('/api/user/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'casting-profession',
          value: prof,
          user_id: userId,
        }),
      });
    } catch (error) {
      console.warn('Failed to save profession to API:', error);
    }
    // Always save to localStorage as backup
    try {
      localStorage.setItem('casting-profession', prof);
    } catch (error) {
      console.warn('Failed to save profession to localStorage:', error);
    }
  };

  // Handle profession selection
  const handleProfessionSelect = async (prof: 'foto' | 'video' | 'felles' | 'admin') => {
    // Map new profession types to internal types
    const internalProf = prof === 'foto' ? 'photographer' : 
                         prof === 'video' ? 'videographer' : 
                         prof === 'felles' ? 'photographer' : 'photographer';
    setProfession(internalProf);
    setProfessionDialogOpen(false);
    await saveProfession(internalProf);
  };

  // Authentication guard - redirect to landing page if not logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('adminUser');
    if (!storedUser) {
      window.location.href = '/casting.html';
      return;
    }
  }, []);

  // Load profession on mount
  useEffect(() => {
    // Don't load profession if not authenticated
    if (!adminUser) {
      return;
    }
    
    const initProfession = async () => {
      const loadedProfession = await loadProfession();
      if (loadedProfession) {
        setProfession(loadedProfession);
      } else {
        // Show dialog if profession not set
        setProfessionDialogOpen(true);
      }
    };
    initProfession();
  }, [adminUser]);

  useEffect(() => {
    // Only initialize data if profession is set
    if (!profession) {
      return; // Wait for profession to be selected
    }

    // Use async function to handle async getProjects
    const initializeData = async () => {
      try {
        const projects = await castingService.getProjects();
        console.log('Initial useEffect: Existing projects:', projects.length);
        
        let shouldInitializeMock = false;
        
        if (projects.length === 0) {
          console.log('No projects found, initializing mock data...');
          shouldInitializeMock = true;
        } else {
          // Check if the first project is empty (no candidates, roles, etc.)
          const firstProject = projects[0];
          const isEmpty = 
            (!firstProject.candidates || firstProject.candidates.length === 0) &&
            (!firstProject.roles || firstProject.roles.length === 0) &&
            (!firstProject.crew || firstProject.crew.length === 0) &&
            (!firstProject.locations || firstProject.locations.length === 0);
          
          if (isEmpty) {
            console.log('Existing project is empty, replacing with mock data...');
            // Delete empty project
            try {
              await castingService.deleteProject(firstProject.id);
            } catch (error) {
              console.error('Failed to delete empty project:', error);
            }
            shouldInitializeMock = true;
          }
        }
        
        if (shouldInitializeMock) {
          try {
            await castingService.initializeMockData();
            // Reload projects after mock data initialization
            const mockProjects = await castingService.getProjects();
            console.log('After mock init: Projects found:', mockProjects.length);
            if (mockProjects.length > 0) {
              console.log('Mock project candidates:', mockProjects[0].candidates?.length || 0);
              setProjects(mockProjects);
              setCurrentProject(mockProjects[0]);
            }
            loadAvailableScenes();
            loadUserRole();
          } catch (error) {
            console.error('Failed to initialize mock data:', error);
          }
        } else {
          await loadProjects();
          loadAvailableScenes();
          loadUserRole();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [profession]);

  useEffect(() => {
    if (currentProject) {
      loadUserRole();
    }
    
    // Update project name in HTML title
    const projectNameElement = document.getElementById('castingPlannerProjectName');
    if (projectNameElement) {
      if (currentProject) {
        projectNameElement.textContent = currentProject.name;
      } else {
        projectNameElement.textContent = '';
      }
    }
  }, [currentProject, adminUser]);

  const loadUserRole = async () => {
    if (currentProject) {
      // Capture the project ID at the start of this async operation
      const projectIdForRequest = currentProject.id;
      currentProjectIdRef.current = projectIdForRequest;
      
      // Reset permissions and show loading state when switching projects
      setPermissionsLoading(true);
      setPermissions({
        canViewAll: false,
        canEditCasting: false,
        canEditProduction: false,
        canEditShotLists: false,
        canManageCrew: false,
        canManageLocations: false,
        canApprove: false,
      });
      
      try {
        // Check if logged in as admin/owner - grant full permissions
        if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'owner')) {
          setCurrentUserRole({
            role: adminUser.role === 'owner' ? 'director' : 'producer',
            permissions: {
              canViewAll: true,
              canEditCasting: true,
              canEditProduction: true,
              canEditShotLists: true,
              canManageCrew: true,
              canManageLocations: true,
              canApprove: true,
            },
          });
          setPermissions({
            canViewAll: true,
            canEditCasting: true,
            canEditProduction: true,
            canEditShotLists: true,
            canManageCrew: true,
            canManageLocations: true,
            canApprove: true,
          });
          setPermissionsLoading(false);
          return;
        }
        
        const role = await castingAuthService.getUserRole(projectIdForRequest);
        
        // Check if the project has changed while we were fetching - discard stale response
        if (currentProjectIdRef.current !== projectIdForRequest) {
          console.log('Discarding stale permission response for project:', projectIdForRequest);
          return;
        }
        
        setCurrentUserRole(role);
        
        // Load all permissions in parallel
        const [
          canViewAll,
          canEditCasting,
          canEditProduction,
          canEditShotLists,
          canManageCrew,
          canManageLocations,
          canApprove
        ] = await Promise.all([
          castingAuthService.canViewAll(projectIdForRequest),
          castingAuthService.canEditCasting(projectIdForRequest),
          castingAuthService.canEditProduction(projectIdForRequest),
          castingAuthService.canEditShotLists(projectIdForRequest),
          castingAuthService.canManageCrew(projectIdForRequest),
          castingAuthService.canManageLocations(projectIdForRequest),
          castingAuthService.canApprove(projectIdForRequest),
        ]);
        
        // Check again after permissions fetch - discard stale response
        if (currentProjectIdRef.current !== projectIdForRequest) {
          console.log('Discarding stale permission response for project:', projectIdForRequest);
          return;
        }
        
        setPermissions({
          canViewAll,
          canEditCasting,
          canEditProduction,
          canEditShotLists,
          canManageCrew,
          canManageLocations,
          canApprove,
        });
      } catch (error) {
        console.error('Error loading user role:', error);
        // Only update state if this is still the current project
        if (currentProjectIdRef.current === projectIdForRequest) {
          setCurrentUserRole(null);
          setPermissions({
            canViewAll: false,
            canEditCasting: false,
            canEditProduction: false,
            canEditShotLists: false,
            canManageCrew: false,
            canManageLocations: false,
            canApprove: false,
          });
        }
      } finally {
        // Only clear loading state if this is still the current project
        if (currentProjectIdRef.current === projectIdForRequest) {
          setPermissionsLoading(false);
        }
      }
    } else {
      currentProjectIdRef.current = null;
      setCurrentUserRole(null);
      setPermissionsLoading(false);
      setPermissions({
        canViewAll: false,
        canEditCasting: false,
        canEditProduction: false,
        canEditShotLists: false,
        canManageCrew: false,
        canManageLocations: false,
        canApprove: false,
      });
    }
  };

  const loadAvailableScenes = () => {
    const scenes = castingService.getAvailableScenes();
    setAvailableScenes(scenes);
  };

  const loadProjects = async () => {
    try {
      const loadedProjects = await castingService.getProjects();
      console.log('loadProjects: Loaded projects:', loadedProjects.length);
      setProjects(loadedProjects);
      
      // Set current project to first available, or create empty one if none exists
      if (loadedProjects.length > 0) {
        const firstProject = loadedProjects[0];
        console.log('Setting current project:', firstProject.id, 'with', firstProject.candidates?.length || 0, 'candidates');
        setCurrentProject(firstProject);
      } else {
        // Only create empty project if mock data initialization didn't work
        console.warn('No projects found, creating empty project');
        const defaultProject: CastingProject = {
          id: `project-${Date.now()}`,
          name: profession ? `Nytt ${getTerm('project')}` : 'Nytt Casting Prosjekt',
          description: '',
          roles: [],
          candidates: [],
          schedules: [],
          crew: [],
          locations: [],
          props: [],
          productionDays: [],
          shotLists: [],
          userRoles: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await castingService.saveProject(defaultProject);
        setProjects([defaultProject]);
        setCurrentProject(defaultProject);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Fallback to sync version
      const loadedProjects = await castingService.getProjects();
      setProjects(loadedProjects);
      if (loadedProjects.length > 0) {
        setCurrentProject(loadedProjects[0]);
      }
    }
  };

  const handleCreateRole = () => {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: '',
      description: '',
      requirements: {},
      status: 'draft',
    };
    setSelectedRole(newRole);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!currentProject || !selectedRole) return;
    
    if (!selectedRole.name.trim()) {
      toast.showWarning('Rolle må ha et navn');
      return;
    }
    
    try {
      await castingService.saveRole(currentProject.id, selectedRole);
      await loadProjects();
      setRoleDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error saving role:', error);
      toast.showError('Feil ved lagring av rolle');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!currentProject) return;
    if (window.confirm('Er du sikker på at du vil slette denne rollen?')) {
      try {
        await castingService.deleteRole(currentProject.id, roleId);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting role:', error);
        toast.showError('Feil ved sletting av rolle');
      }
    }
  };

  const handleCreateCandidate = () => {
    const newCandidate: Candidate = {
      id: `candidate-${Date.now()}`,
      name: '',
      contactInfo: {},
      photos: [],
      videos: [],
      auditionNotes: '',
      status: 'pending',
      assignedRoles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedCandidate(newCandidate);
    setCandidateDialogOpen(true);
  };

  const handleSaveCandidate = async () => {
    if (!currentProject || !selectedCandidate) return;
    
    if (!selectedCandidate.name.trim()) {
      toast.showWarning('Kandidat må ha et navn');
      return;
    }
    
    try {
      await castingService.saveCandidate(currentProject.id, selectedCandidate);
      await loadProjects();
      setCandidateDialogOpen(false);
      setSelectedCandidate(null);
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.showError('Feil ved lagring av kandidat');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!currentProject) return;
    if (window.confirm('Er du sikker på at du vil slette denne kandidaten?')) {
      try {
        await castingService.deleteCandidate(currentProject.id, candidateId);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting candidate:', error);
        toast.showError('Feil ved sletting av kandidat');
      }
    }
  };

  const handleCreateSchedule = () => {
    if (!currentProject || currentProject.candidates.length === 0 || currentProject.roles.length === 0) {
      toast.showWarning('Du må ha minst én kandidat og én rolle før du kan opprette timeplan');
      return;
    }
    
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      candidateId: currentProject.candidates[0].id,
      roleId: currentProject.roles[0].id,
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      location: '',
      status: 'scheduled',
    };
    setSelectedSchedule(newSchedule);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!currentProject || !selectedSchedule) return;

    try {
      await castingService.saveSchedule(currentProject.id, selectedSchedule);
      await loadProjects();
      setScheduleDialogOpen(false);
      setSelectedSchedule(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.showError('Feil ved lagring av timeplan');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!currentProject) return;
    if (window.confirm('Er du sikker på at du vil slette denne timeplanen?')) {
      try {
        await castingService.deleteSchedule(currentProject.id, scheduleId);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.showError('Feil ved sletting av timeplan');
      }
    }
  };

  // Use data directly from currentProject instead of async service calls
  const roles = currentProject?.roles || [];
  const allCandidates = currentProject?.candidates || [];
  const allSchedules = currentProject?.schedules || [];
  
  // Debug: Log candidates for Kanban
  useEffect(() => {
    if (activeTab === 9 && currentProject) {
      console.log('Kanban tab active, currentProject:', currentProject.id);
      console.log('allCandidates:', allCandidates);
      console.log('Current project candidates:', currentProject.candidates?.length || 0);
    }
  }, [activeTab, currentProject, allCandidates]);
  
  const candidates = allCandidates.filter(c => {
    const matchesSearch = !candidateSearchQuery || 
      c.name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.contactInfo?.email?.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.contactInfo?.phone?.includes(candidateSearchQuery);
    const matchesStatus = candidateStatusFilter === 'all' || c.status === candidateStatusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const schedules = allSchedules.filter(s => {
    const matchesDate = !scheduleDateFilter || s.date === scheduleDateFilter;
    const matchesCandidate = scheduleCandidateFilter === 'all' || s.candidateId === scheduleCandidateFilter;
    const matchesRole = scheduleRoleFilter === 'all' || s.roleId === scheduleRoleFilter;
    return matchesDate && matchesCandidate && matchesRole;
  });

  const stats = {
    totalRoles: roles.length,
    openRoles: roles.filter(r => r.status === 'open' || r.status === 'casting').length,
    totalCandidates: candidates.length,
    upcomingSchedules: schedules.filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date()).length,
  };

  return (
    <>
      <CastingProfessionDialog
        open={professionDialogOpen}
        onSelect={handleProfessionSelect}
      />
      <Box
        role="main"
        aria-label="Casting Planner"
        sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Responsive base font size: larger on desktop for better readability
        fontSize: isDesktop ? '16px' : isTablet ? '16px' : '14px', // Prevent zoom on iOS for tablet/mobile
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Project Selector Header */}
      <Box sx={{ 
        bgcolor: 'linear-gradient(180deg, #1c2128 0%, #161b22 100%)',
        background: 'linear-gradient(180deg, #1c2128 0%, #161b22 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 1, sm: 1.5 },
      }}>
        {/* Project chips row */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.75, sm: 1 },
          overflowX: 'auto',
          pb: 0.5,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
        }}>
          {/* Casting Planner Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
              mr: { xs: 0.5, sm: 1 },
              flexShrink: 0,
            }}
          >
            <img
              src="/casting-planner-logo.png"
              alt="Casting Planner"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                textTransform: 'uppercase', 
                letterSpacing: 1,
                fontSize: { xs: '0.6rem', sm: '0.65rem' },
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Prosjekter
            </Typography>
          </Box>
          
          {recentProjects.map((project) => {
            const isActive = currentProject?.id === project.id;
            const candidateCount = project.candidates?.length || 0;
            return (
              <Box
                key={project.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1.5 },
                  px: { xs: 1.5, sm: 2.5 },
                  py: { xs: 1, sm: 1.25 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: isActive 
                    ? '2px solid #00d4ff' 
                    : '1px solid rgba(255,255,255,0.08)',
                  bgcolor: isActive 
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 180, 230, 0.15) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 180, 230, 0.15) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  boxShadow: isActive 
                    ? '0 4px 20px rgba(0, 212, 255, 0.25), 0 0 0 1px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.15)' 
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  '&:hover, &:active': {
                    bgcolor: isActive 
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 180, 230, 0.2) 100%)'
                      : 'rgba(255,255,255,0.06)',
                    background: isActive 
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 180, 230, 0.2) 100%)'
                      : 'rgba(255,255,255,0.06)',
                    borderColor: isActive ? '#00d4ff' : 'rgba(255,255,255,0.15)',
                    transform: 'scale(1.02)',
                  },
                  flexShrink: 0,
                  minHeight: { xs: 44, sm: 48 },
                  touchAction: 'manipulation',
                  position: 'relative',
                  overflow: 'hidden',
                  // Active indicator bar at bottom
                  '&::after': isActive ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '10%',
                    right: '10%',
                    height: '3px',
                    bgcolor: '#00d4ff',
                    borderRadius: '3px 3px 0 0',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                  } : {},
                }}
              >
                <Box
                  onClick={() => setCurrentProject(project)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 0.75, sm: 1.25 },
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  {/* Active indicator dot with pulse animation */}
                  <Box sx={{ 
                    width: { xs: 10, sm: 12 }, 
                    height: { xs: 10, sm: 12 }, 
                    borderRadius: '50%', 
                    bgcolor: isActive ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                    boxShadow: isActive ? '0 0 12px #00d4ff, 0 0 4px #00d4ff' : 'none',
                    flexShrink: 0,
                    border: isActive ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': { boxShadow: '0 0 12px #00d4ff, 0 0 4px #00d4ff' },
                      '50%': { boxShadow: '0 0 20px #00d4ff, 0 0 8px #00d4ff' },
                    },
                  }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Typography 
                      sx={{ 
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                        fontWeight: isActive ? 700 : 500,
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: '90px', sm: '130px', md: '180px' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: isActive ? '0.02em' : 'normal',
                        textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                      }}
                    >
                      {project.name}
                    </Typography>
                    {isActive && (
                      <Typography 
                        sx={{ 
                          color: '#00d4ff',
                          fontSize: { xs: '0.6rem', sm: '0.65rem' },
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mt: 0.25,
                        }}
                      >
                        Aktivt prosjekt
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={candidateCount}
                    sx={{
                      height: { xs: 22, sm: 24 },
                      minWidth: { xs: 28, sm: 32 },
                      bgcolor: isActive ? 'rgba(0, 212, 255, 0.35)' : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      fontWeight: 700,
                      border: isActive ? '1px solid rgba(0, 212, 255, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  />
                </Box>
                {/* Edit button */}
                <IconButton
                  size="small"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setProjectToEdit(project);
                    setProjectCreationModalOpen(true);
                  }}
                  aria-label={`Rediger ${project.name}`}
                  title="Rediger prosjekt"
                  sx={{
                    color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                    '&:hover, &:active': {
                      color: '#00d4ff',
                      bgcolor: 'rgba(0, 212, 255, 0.15)',
                    },
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    minWidth: { xs: 28, sm: 32 },
                    p: 0,
                    borderRadius: 1.5,
                  }}
                >
                  <EditIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                </IconButton>
                {/* Delete button */}
                <IconButton
                  size="small"
                  onClick={async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (window.confirm(`Er du sikker på at du vil slette prosjektet "${project.name}"? Denne handlingen kan ikke angres.`)) {
                      try {
                        await castingService.deleteProject(project.id);
                        await loadProjects();
                        if (currentProject?.id === project.id) {
                          const remainingProjects = await castingService.getProjects();
                          if (remainingProjects.length > 0) {
                            setCurrentProject(remainingProjects[0]);
                          } else {
                            setCurrentProject(null);
                          }
                        }
                      } catch (error) {
                        console.error('Error deleting project:', error);
                        toast.showError('Kunne ikke slette prosjektet. Prøv igjen.');
                      }
                    }
                  }}
                  aria-label={`Slett ${project.name}`}
                  title="Slett prosjekt"
                  sx={{
                    color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                    '&:hover, &:active': {
                      color: '#ff4444',
                      bgcolor: 'rgba(255, 68, 68, 0.15)',
                    },
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    minWidth: { xs: 28, sm: 32 },
                    p: 0,
                    borderRadius: 1.5,
                  }}
                >
                  <DeleteIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                </IconButton>
              </Box>
            );
          })}
          
          {/* Show all projects button when more than 4 */}
          {hasMoreProjects && (
            <Button
              size="small"
              onClick={() => setProjectSelectorOpen(true)}
              sx={{
                minWidth: 'auto',
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.5, sm: 0.75 },
                borderRadius: { xs: 1.5, sm: 2 },
                border: '1px solid rgba(139, 92, 246, 0.3)',
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                color: '#a78bfa',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': {
                  bgcolor: 'rgba(139, 92, 246, 0.2)',
                  borderColor: '#8b5cf6',
                },
              }}
            >
              +{projects.length - 4} til
            </Button>
          )}

          {/* Add new project button */}
          <IconButton
            size="small"
            onClick={() => {
              setProjectToEdit(null);
              setProjectCreationModalOpen(true);
            }}
            aria-label="Nytt prosjekt"
            data-tutorial-target="create-project-button"
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              minWidth: { xs: 32, sm: 36 },
              border: '1px dashed rgba(255,255,255,0.2)',
              borderRadius: { xs: 1.5, sm: 2 },
              color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
              '&:hover, &:active': {
                borderColor: '#00d4ff',
                color: '#00d4ff',
                bgcolor: 'rgba(0, 212, 255, 0.1)',
              },
            }}
          >
            <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>

          {/* Tutorial button */}
          <IconButton
            size="small"
            onClick={() => setShowTutorial(true)}
            aria-label="Veiledning"
            title="Interaktiv veiledning"
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              minWidth: { xs: 32, sm: 36 },
              border: '1px solid rgba(233, 30, 99, 0.3)',
              borderRadius: { xs: 1.5, sm: 2 },
              color: '#e91e63',
              flexShrink: 0,
              bgcolor: 'rgba(233, 30, 99, 0.1)',
              '&:hover, &:active': {
                borderColor: '#e91e63',
                bgcolor: 'rgba(233, 30, 99, 0.2)',
              },
            }}
          >
            <TutorialIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          {adminUser ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {adminUser.display_name || adminUser.email}
                {headerRoleLabel ? ` • ${headerRoleLabel}` : ''}
                {headerProfessionLabel ? ` • ${headerProfessionLabel}` : ''}
              </Typography>
              <Chip
                label={`${adminUser.display_name || adminUser.email}${headerRoleLabel ? ` • ${headerRoleLabel}` : ''}${headerProfessionLabel ? ` • ${headerProfessionLabel}` : ''}`}
                size="small"
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  maxWidth: 200,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
              {/* Bytt profesjon - tilgjengelig for alle innloggede brukere */}
              <IconButton
                size="small"
                onClick={() => setProfessionDialogOpen(true)}
                aria-label="Bytt profesjon"
                title="Bytt profesjon"
                sx={{
                  color: '#10b981',
                  '&:hover': { bgcolor: 'rgba(16,185,129,0.1)' },
                }}
              >
                <SwapHorizIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              {/* Admin Dashboard - kun for admin/owner */}
              {(adminUser.role === 'owner' || adminUser.role === 'admin') && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => setShowTutorialEditor(true)}
                    aria-label="Rediger veiledninger"
                    title="Rediger veiledninger"
                    sx={{
                      color: '#e91e63',
                      '&:hover': { bgcolor: 'rgba(233,30,99,0.1)' },
                    }}
                  >
                    <TutorialIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setAdminDashboardOpen(true)}
                    aria-label="Administrer brukere"
                    title="Administrer brukere"
                    sx={{
                      color: '#8b5cf6',
                      '&:hover': { bgcolor: 'rgba(139,92,246,0.1)' },
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                  </IconButton>
                </>
              )}
              <IconButton
                size="small"
                onClick={() => {
                  localStorage.removeItem('adminUser');
                  localStorage.removeItem('currentUserId');
                  localStorage.removeItem('selectedProfession');
                  setAdminUser(null);
                  window.location.href = '/casting.html';
                }}
                aria-label="Logg ut"
                title="Logg ut"
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' },
                }}
              >
                <LogoutIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
            </Box>
          ) : (
            <IconButton
              size="small"
              onClick={() => setLoginDialogOpen(true)}
              aria-label="Logg inn"
              title="Logg inn"
              sx={{
                color: '#8b5cf6',
                flexShrink: 0,
                '&:hover': { bgcolor: 'rgba(139,92,246,0.1)' },
              }}
            >
              <LoginIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </IconButton>
          )}
        </Box>

        {/* Current project info bar */}
        {currentProject && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 }, 
            mt: { xs: 1.5, sm: 2 },
            pt: { xs: 1.5, sm: 2 },
            borderTop: '1px solid rgba(139,92,246,0.2)',
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                background: 'linear-gradient(135deg, #fff 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.01em',
                textShadow: '0 0 30px rgba(139,92,246,0.3)',
              }}
            >
              {currentProject.name}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Box 
        role="navigation"
        aria-label="Casting Planner navigasjon"
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', bgcolor: '#1c2128', flexShrink: 0 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_: React.SyntheticEvent, v: number) => setActiveTab(v)}
          aria-label="Casting Planner faner"
          variant="scrollable"
          scrollButtons={isMobile ? true : 'auto'}
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: isDesktop ? 64 : isTablet ? 56 : 44,
              minWidth: isDesktop ? 120 : isTablet ? 80 : 'auto',
              fontSize: isDesktop ? '18px' : isTablet ? '14px' : '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              padding: isDesktop ? '16px 20px' : isTablet ? '12px 16px' : '8px 10px',
              textTransform: 'none',
              flexShrink: 0,
              '&.Mui-selected': {
                color: '#fff',
              },
              '&:focus-visible': {
                outline: '3px solid #00d4ff',
                outlineOffset: '-2px',
                borderRadius: '4px',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: isMobile ? 0.5 : 1,
              },
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTabs-scrollButtons': {
              minWidth: isMobile ? 36 : 44,
              minHeight: isMobile ? 36 : 44,
              color: 'rgba(255,255,255,0.9)',
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 1,
              mx: 0.5,
              '&.Mui-disabled': {
                opacity: 0.3,
              },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
              },
              '&:focus-visible': {
                outline: '3px solid #00d4ff',
                outlineOffset: '2px',
              },
              '& svg': {
                fontSize: isMobile ? '1.5rem' : '1.75rem',
              },
            },
            '& .MuiTabs-flexContainer': {
              gap: isMobile ? '2px' : '4px',
            },
          }}
        >
          {tabConfig.map((config, index) => {
            const IconComponent = config.icon;
            const isSelected = activeTab === index;
            const tabLabels = [
              'Oversikt',
              'Roller',
              'Kandidater',
              'Auditions',
              'Team',
              'Steder',
              'Utstyr',
              'Kalender',
              profession ? getTerm('shotList') : 'Shot-list',
              'Deling',
            ];
            const tabIds = [
              'tab-oversikt',
              'tab-roller',
              'tab-kandidater',
              'tab-auditions',
              'tab-team',
              'tab-lokasjoner',
              'tab-rekvisitter',
              'tab-produksjonsplan',
              'tab-shot-lists',
              'tab-deling',
            ];
            const tabPanelIds = [
              'tabpanel-oversikt',
              'tabpanel-roller',
              'tabpanel-kandidater',
              'tabpanel-auditions',
              'tabpanel-team',
              'tabpanel-lokasjoner',
              'tabpanel-rekvisitter',
              'tabpanel-produksjonsplan',
              'tabpanel-shot-lists',
              'tabpanel-deling',
            ];
            
            return (
              <Tab
                key={index}
                icon={
                  <Box
                    sx={{
                      width: { xs: 18, sm: 20, md: 24 },
                      height: { xs: 18, sm: 20, md: 24 },
                      borderRadius: 1,
                      bgcolor: isSelected ? `${config.color}20` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <IconComponent sx={{ fontSize: { xs: 16, sm: 18, md: 22 }, color: isSelected ? config.color : 'rgba(255,255,255,0.7)' }} />
                  </Box>
                }
                iconPosition="start"
                label={isMobile ? undefined : tabLabels[index]}
                aria-label={`${tabLabels[index]} fane`}
                id={tabIds[index]}
                aria-controls={tabPanelIds[index]}
                sx={{
                  bgcolor: isSelected ? `${config.color}15` : 'transparent',
                  border: isSelected ? `1px solid ${config.color}30` : '1px solid transparent',
                  borderRadius: 1,
                  mx: { xs: 0.25, sm: 0.5 },
                  mb: { xs: 0.5, sm: 1 },
                  mt: { xs: 0.5, sm: 1 },
                  minHeight: isDesktop ? 64 : isTablet ? 56 : 40,
                  minWidth: isMobile ? 40 : undefined,
                  px: isMobile ? 1.5 : undefined,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: isSelected ? `${config.color}20` : `${config.color}10`,
                    border: `1px solid ${config.color}40`,
                    transform: isDesktop ? 'translateY(-2px)' : 'none',
                  },
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                  '&.Mui-selected': {
                    color: '#fff',
                  },
                }}
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#0d1117', display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%' }}>
        <TabPanel value={activeTab} index={0}>
          <DashboardPanel
            project={currentProject}
            roles={roles}
            candidates={allCandidates}
            schedules={schedules}
            onNavigateToTab={setActiveTab}
            onCreateRole={handleCreateRole}
            onCreateCandidate={handleCreateCandidate}
            onCreateSchedule={handleCreateSchedule}
            onOpenSharing={() => setSharingDialogOpen(true)}
            onUpdate={async () => {
              if (currentProject) {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) {
                  setCurrentProject(updated);
                }
              }
            }}
            onEditCandidate={(candidate) => {
              setSelectedCandidate(candidate);
              setCandidateDialogOpen(true);
            }}
            onCandidatesChange={loadProjects}
            profession={profession}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <RoleManagementPanel
            projectId={currentProject?.id || ''}
            roles={roles}
            onRolesChange={loadProjects}
            onEditRole={(role) => {
              setSelectedRole(role);
              setRoleDialogOpen(true);
            }}
            onCreateRole={handleCreateRole}
            profession={profession}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <CandidateManagementPanel
            projectId={currentProject?.id || ''}
            candidates={candidates}
            roles={roles}
            onCandidatesChange={loadProjects}
            onEditCandidate={(candidate) => {
              setSelectedCandidate(candidate);
              setCandidateDialogOpen(true);
            }}
            onCreateCandidate={handleCreateCandidate}
            profession={profession}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <AuditionSchedulePanel
            projectId={currentProject?.id || ''}
            schedules={schedules}
            candidates={candidates}
            roles={roles}
            availableScenes={availableScenes}
            onSchedulesChange={loadProjects}
            onEditSchedule={(schedule) => {
              setSelectedSchedule(schedule);
              setScheduleDialogOpen(true);
            }}
            onCreateSchedule={handleCreateSchedule}
            onNavigateToTab={setActiveTab}
            profession={profession}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {!currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Ingen prosjekt valgt
              </Typography>
            </Box>
          ) : !permissions.canManageCrew ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til å administrere teamet
              </Typography>
            </Box>
          ) : (
            <CrewManagementPanel
              projectId={currentProject.id}
              onUpdate={async () => {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) setCurrentProject(updated);
              }}
              profession={profession}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          {!currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Ingen prosjekt valgt
              </Typography>
            </Box>
          ) : !permissions.canManageLocations ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til å administrere lokasjoner
              </Typography>
            </Box>
          ) : (
            <LocationManagementPanel
              projectId={currentProject.id}
              onUpdate={async () => {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) setCurrentProject(updated);
              }}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          {!currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Ingen prosjekt valgt
              </Typography>
            </Box>
          ) : !permissions.canEditProduction ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til å administrere utstyr
              </Typography>
            </Box>
          ) : (
            <PropManagementPanel
              projectId={currentProject.id}
              onUpdate={async () => {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) setCurrentProject(updated);
              }}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          {!currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Ingen prosjekt valgt
              </Typography>
            </Box>
          ) : !permissions.canEditProduction ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til å redigere produksjonsplanen
              </Typography>
            </Box>
          ) : (
            <ProductionDayView
              projectId={currentProject.id}
              onUpdate={async () => {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) setCurrentProject(updated);
              }}
              profession={profession}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          {!currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Ingen prosjekt valgt
              </Typography>
            </Box>
          ) : !permissions.canEditShotLists ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til å redigere shot lists
              </Typography>
            </Box>
          ) : (
            <CastingShotListPanel
              projectId={currentProject.id}
              onUpdate={async () => {
                const updated = await castingService.getProject(currentProject.id);
                if (updated) setCurrentProject(updated);
              }}
              profession={profession}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={9}>
          {!permissions.canApprove && currentProject ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <Typography variant="body1" sx={{ fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem' }}>
                Du har ikke tilgang til delingsinnstillinger
              </Typography>
            </Box>
          ) : (
            <SharingPanel
              project={currentProject}
              onOpenSharingDialog={() => setSharingDialogOpen(true)}
            />
          )}
        </TabPanel>
      </Box>


      {/* Role Dialog */}
      <Dialog
        open={!!roleDialogOpen}
        onClose={() => {
          setRoleDialogOpen(false);
          setSelectedRole(null);
        }}
        maxWidth="lg"
        fullWidth
        container={() => document.body}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: { enter: 225, exit: 150 },
          enter: true,
          exit: true,
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            width: '100%',
            maxWidth: '90vw',
            zIndex: 100000,
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
          },
        }}
        sx={{
          zIndex: 100000,
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            willChange: 'opacity',
          },
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2, md: 1.75, lg: 2, xl: 2.5 },
          py: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          px: { xs: 2, sm: 2.5, md: 2.25, lg: 3, xl: 3.5 },
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Typography 
              variant="h6" 
              component="div"
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.375rem', md: '1.3rem', lg: '1.5rem', xl: '1.75rem' },
                fontWeight: 600,
                lineHeight: 1.2,
                mb: { xs: 0.5, sm: 0.75, md: 0.625, lg: 0.75, xl: 1 },
              }}
            >
              {selectedRole?.id && !selectedRole.name ? 'Ny rolle' : 'Rediger rolle'}
            </Typography>
            {selectedRole?.name && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.85rem', lg: '0.95rem', xl: '1rem' },
                  fontWeight: 400,
                }}
              >
                {selectedRole.name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          px: { xs: 2, sm: 2.5, md: 2.25, lg: 3, xl: 3.5 },
          pb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          overflow: 'visible',
        }}>
          {selectedRole && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 3.5, md: 3.25, lg: 3.5, xl: 4 } }}>
              {/* Basic Information Section */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mb: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                  <PersonIcon sx={{ color: '#00d4ff', fontSize: { xs: 20, sm: 24, md: 22, lg: 26, xl: 32 } }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#00d4ff', 
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}>
                    Grunnleggende informasjon
                  </Typography>
                </Box>
                <TextField
                  label="Rollenavn"
                  value={selectedRole.name}
                  onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                  fullWidth
                  required
                  sx={textFieldStyles}
                />
                
                <TextField
                  label="Beskrivelse"
                  value={selectedRole.description || ''}
                  onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  sx={textFieldStyles}
                />
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 } }} />
              
              {/* Requirements Section */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mb: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                  <AssignmentIcon sx={{ color: '#00d4ff', fontSize: { xs: 20, sm: 24, md: 22, lg: 26, xl: 32 } }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#00d4ff', 
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}>
                    Krav til kandidat
                  </Typography>
                </Box>
              
              <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2, md: 1.75, lg: 2.5, xl: 3 }, mb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="Min alder"
                  type="number"
                  value={selectedRole.requirements.age?.min || ''}
                  onChange={(e) => setSelectedRole({
                    ...selectedRole,
                    requirements: {
                      ...selectedRole.requirements,
                      age: { ...selectedRole.requirements.age, min: e.target.value ? parseInt(e.target.value) : undefined },
                    },
                  })}
                  sx={{
                    flex: 1,
                    ...textFieldStyles,
                  }}
                />
                <TextField
                  label="Maks alder"
                  type="number"
                  value={selectedRole.requirements.age?.max || ''}
                  onChange={(e) => setSelectedRole({
                    ...selectedRole,
                    requirements: {
                      ...selectedRole.requirements,
                      age: { ...selectedRole.requirements.age, max: e.target.value ? parseInt(e.target.value) : undefined },
                    },
                  })}
                  sx={{
                    flex: 1,
                    ...textFieldStyles,
                  }}
                />
              </Box>
              
              <FormControl fullWidth sx={{ mb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <InputLabel sx={inputLabelStyles}>Kjønn (valgfri)</InputLabel>
                <Select
                  value={selectedRole.requirements.gender?.[0] || ''}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedRole({
                    ...selectedRole,
                    requirements: {
                      ...selectedRole.requirements,
                      gender: e.target.value ? [e.target.value as string] : undefined,
                    },
                  })}
                  sx={{
                    color: '#fff',
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                    },
                  }}
                >
                  <MenuItem value="mann">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <PersonIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                      <span>Mann</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="kvinne">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <PersonIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                      <span>Kvinne</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="ikke-binær">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <TransgenderIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                      <span>Ikke-binær</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="alle">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <PeopleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                      <span>Alle</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Utseende (kommaseparert)"
                value={selectedRole.requirements.appearance?.join(', ') || ''}
                onChange={(e) => setSelectedRole({
                  ...selectedRole,
                  requirements: {
                    ...selectedRole.requirements,
                    appearance: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(s => s) : undefined,
                  },
                })}
                fullWidth
                placeholder="f.eks. høyde, hårfarge, kroppsbygning"
                sx={{
                  mb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Ferdigheter (kommaseparert)"
                value={selectedRole.requirements.skills?.join(', ') || ''}
                onChange={(e) => setSelectedRole({
                  ...selectedRole,
                  requirements: {
                    ...selectedRole.requirements,
                    skills: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(s => s) : undefined,
                  },
                })}
                fullWidth
                placeholder="f.eks. skuespill, dans, mimikk"
                sx={{
                  mb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Spesielle behov"
                value={selectedRole.requirements.specialNeeds?.join(', ') || ''}
                onChange={(e) => setSelectedRole({
                  ...selectedRole,
                  requirements: {
                    ...selectedRole.requirements,
                    specialNeeds: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(s => s) : undefined,
                  },
                })}
                fullWidth
                placeholder="f.eks. uniform, dialekt, kultur"
                sx={{
                  mb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
                  ...textFieldStyles,
                }}
              />
              
                <FormControl fullWidth>
                  <InputLabel sx={inputLabelStyles}>Scene Composer Scener</InputLabel>
                  <Select
                    multiple
                    value={selectedRole.sceneIds || []}
                    MenuProps={selectMenuProps}
                    onChange={(e) => setSelectedRole({
                      ...selectedRole,
                      sceneIds: e.target.value as string[],
                    })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75, md: 0.625, lg: 0.75, xl: 1 } }}>
                        {(selected as string[]).map((sceneId) => {
                          const scene = availableScenes.find(s => s.id === sceneId);
                          return (
                            <Chip
                              key={sceneId}
                              label={scene?.name || sceneId}
                              size="small"
                              sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.72rem', lg: '0.8rem', xl: '0.9rem' }, height: { xs: 22, sm: 24, md: 23, lg: 26, xl: 30 } }}
                            />
                          );
                        })}
                      </Box>
                    )}
                    sx={{
                      color: '#fff',
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                        py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                      },
                    }}
                  >
                    {availableScenes.map((scene) => (
                      <MenuItem key={scene.id} value={scene.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                          <MovieIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                          <span>{scene.name}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 } }} />

              {/* Production Requirements Section */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mb: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                  <WorkIcon sx={{ color: '#00d4ff', fontSize: { xs: 20, sm: 24, md: 22, lg: 26, xl: 32 } }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#00d4ff', 
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}>
                    Produksjonskrav
                  </Typography>
                </Box>

                {currentProject && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel sx={inputLabelStyles}>Crew-krav</InputLabel>
                      <Select
                        multiple
                        value={selectedRole.crewRequirements || []}
                        MenuProps={selectMenuProps}
                        onChange={(e) => setSelectedRole({
                          ...selectedRole,
                          crewRequirements: e.target.value as string[],
                        })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((crewId) => {
                              const crew = (currentProject?.crew || []).find(c => c.id === crewId);
                              return (
                                <Chip
                                  key={crewId}
                                  label={crew?.name || crewId}
                                  size="small"
                                  sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        sx={{
                          color: '#fff',
                          fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                          minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '& .MuiSelect-select': {
                            fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                            py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                          },
                        }}
                      >
                        {(currentProject?.crew || []).map((crew) => {
                          // Get appropriate icon based on crew role
                          const getCrewRoleIcon = (role: string) => {
                            const iconSize = { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 };
                            const roleMap: Record<string, React.ReactElement> = {
                              director: <MovieIcon sx={{ fontSize: iconSize }} />,
                              producer: <BusinessIcon sx={{ fontSize: iconSize }} />,
                              casting_director: <PeopleIcon sx={{ fontSize: iconSize }} />,
                              production_manager: <SupervisorAccountIcon sx={{ fontSize: iconSize }} />,
                              camera_operator: <VideocamIcon sx={{ fontSize: iconSize }} />,
                              camera_assistant: <CameraAltIcon sx={{ fontSize: iconSize }} />,
                              gaffer: <LightbulbIcon sx={{ fontSize: iconSize }} />,
                              grip: <BuildIcon sx={{ fontSize: iconSize }} />,
                              sound_engineer: <GraphicEqIcon sx={{ fontSize: iconSize }} />,
                              makeup_artist: <FaceIcon sx={{ fontSize: iconSize }} />,
                              wardrobe: <CheckroomIcon sx={{ fontSize: iconSize }} />,
                              other: <GroupIcon sx={{ fontSize: iconSize }} />,
                            };
                            return roleMap[role] || <GroupIcon sx={{ fontSize: iconSize }} />;
                          };
                          return (
                            <MenuItem key={crew.id} value={crew.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                                {getCrewRoleIcon(crew.role)}
                                <span>{crew.name} ({crew.role})</span>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel sx={inputLabelStyles}>Lokasjonskrav</InputLabel>
                      <Select
                        multiple
                        value={selectedRole.locationRequirements || []}
                        MenuProps={selectMenuProps}
                        onChange={(e) => setSelectedRole({
                          ...selectedRole,
                          locationRequirements: e.target.value as string[],
                        })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75, md: 0.625, lg: 0.75, xl: 1 } }}>
                            {(selected as string[]).map((locationId) => {
                              const location = (currentProject?.locations || []).find(l => l.id === locationId);
                              return (
                                <Chip
                                  key={locationId}
                                  label={location?.name || locationId}
                                  size="small"
                                  sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.72rem', lg: '0.8rem', xl: '0.9rem' }, height: { xs: 22, sm: 24, md: 23, lg: 26, xl: 30 } }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        sx={{
                          color: '#fff',
                          fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                          minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '& .MuiSelect-select': {
                            fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                            py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                          },
                        }}
                      >
                        {(currentProject?.locations || []).map((location) => (
                          <MenuItem key={location.id} value={location.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                              <LocationIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                              <span>{location.name}</span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel sx={inputLabelStyles}>Rekvisittkrav</InputLabel>
                      <Select
                        multiple
                        value={selectedRole.propRequirements || []}
                        MenuProps={selectMenuProps}
                        onChange={(e) => setSelectedRole({
                          ...selectedRole,
                          propRequirements: e.target.value as string[],
                        })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75, md: 0.625, lg: 0.75, xl: 1 } }}>
                            {(selected as string[]).map((propId) => {
                              const prop = (currentProject?.props || []).find(p => p.id === propId);
                              return (
                                <Chip
                                  key={propId}
                                  label={prop?.name || propId}
                                  size="small"
                                  sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.72rem', lg: '0.8rem', xl: '0.9rem' }, height: { xs: 22, sm: 24, md: 23, lg: 26, xl: 30 } }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        sx={{
                          color: '#fff',
                          fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                          minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                          '& .MuiSelect-select': {
                            fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                            py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                          },
                        }}
                      >
                        {(currentProject?.props || []).map((prop) => (
                          <MenuItem key={prop.id} value={prop.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                              <InventoryIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                              <span>{prop.name} ({prop.category})</span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 } }} />

              {/* Status Section */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mb: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                  <CheckCircleOutlineIcon sx={{ color: '#00d4ff', fontSize: { xs: 20, sm: 24, md: 22, lg: 26, xl: 32 } }} />
                  <Typography variant="subtitle2" sx={{ 
                    color: '#00d4ff', 
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}>
                    Status
                  </Typography>
                </Box>
                <FormControl fullWidth>
                  <InputLabel sx={inputLabelStyles}>Status</InputLabel>
                  <Select
                    value={selectedRole.status}
                    MenuProps={selectMenuProps}
                    onChange={(e) => setSelectedRole({ ...selectedRole, status: e.target.value as Role['status'] })}
                    sx={{
                      color: '#fff',
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      minHeight: { xs: 40, sm: 44, md: 46, lg: 52, xl: 60 },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                        py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                      },
                    }}
                  >
                    <MenuItem value="draft">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <EditIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                        <span>Draft</span>
                      </Box>
                    </MenuItem>
                    <MenuItem value="open">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <PeopleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                        <span>Åpen</span>
                      </Box>
                    </MenuItem>
                    <MenuItem value="casting">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <PlayArrowIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                        <span>Casting</span>
                      </Box>
                    </MenuItem>
                    <MenuItem value="filled">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <CheckCircleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                        <span>Fylt</span>
                      </Box>
                    </MenuItem>
                    <MenuItem value="cancelled">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <CancelIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 20, xl: 24 } }} />
                        <span>Avlyst</span>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          gap: { xs: 1, sm: 1.5, md: 1.375, lg: 1.5, xl: 2 },
        }}>
          <Button
            onClick={() => {
              setRoleDialogOpen(false);
              setSelectedRole(null);
            }}
            startIcon={<CancelIcon sx={{ fontSize: { xs: 18, sm: 20, md: 19, lg: 21, xl: 24 } }} />}
            sx={{ 
              color: 'rgba(255,255,255,0.6)',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 2.25, lg: 3, xl: 3.5 },
              py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
              minHeight: TOUCH_TARGET_SIZE,
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            startIcon={<SaveIcon sx={{ fontSize: { xs: 18, sm: 20, md: 19, lg: 21, xl: 24 } }} />}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
              px: { xs: 3, sm: 3.5, md: 3.25, lg: 4, xl: 5 },
              py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
              fontWeight: 600,
              minHeight: TOUCH_TARGET_SIZE,
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Dialog */}
      <Dialog
        open={candidateDialogOpen}
        onClose={() => {
          setCandidateDialogOpen(false);
          setSelectedCandidate(null);
        }}
        maxWidth="lg"
        fullWidth
        container={() => document.body}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: { enter: 225, exit: 150 },
          enter: true,
          exit: true,
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            width: '100%',
            maxWidth: '90vw',
            zIndex: 100000,
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
          },
        }}
        sx={{
          zIndex: 100000,
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            willChange: 'opacity',
          },
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2, md: 1.75, lg: 2, xl: 2.5 },
          py: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          px: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
        }}>
          <PersonIcon sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '1.625rem', lg: '1.875rem', xl: '2rem' }, color: '#00d4ff' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.375rem', md: '1.25rem', lg: '1.5rem', xl: '1.75rem' },
                fontWeight: 600,
                lineHeight: 1.2,
                mb: { xs: 0.5, sm: 0.75, md: 0.625, lg: 0.75, xl: 1 },
              }}
            >
              {selectedCandidate?.id && !selectedCandidate.name ? 'Ny kandidat' : 'Rediger kandidat'}
            </Typography>
            {selectedCandidate?.name && (
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.8125rem', lg: '0.9375rem', xl: '1rem' },
                  fontWeight: 400,
                }}
              >
                {selectedCandidate.name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          pt: { xs: 3, sm: 3.5, md: 3.25, lg: 3.5, xl: 4 },
          px: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          pb: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          overflow: 'visible',
        }}>
          {selectedCandidate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
              <TextField
                label="Navn"
                value={selectedCandidate.name}
                onChange={(e) => setSelectedCandidate({ ...selectedCandidate, name: e.target.value })}
                fullWidth
                required
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="E-post"
                value={selectedCandidate.contactInfo.email || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  contactInfo: { ...selectedCandidate.contactInfo, email: e.target.value },
                })}
                fullWidth
                type="email"
                inputMode="email"
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: '1rem', sm: '1.125rem', md: '1.0625rem', lg: '1.1875rem', xl: '1.25rem' } }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Telefon"
                value={selectedCandidate.contactInfo.phone || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  contactInfo: { ...selectedCandidate.contactInfo, phone: e.target.value },
                })}
                fullWidth
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: '1rem', sm: '1.125rem', md: '1.0625rem', lg: '1.1875rem', xl: '1.25rem' } }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Adresse"
                value={selectedCandidate.contactInfo.address || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  contactInfo: { ...selectedCandidate.contactInfo, address: e.target.value },
                })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: '1rem', sm: '1.125rem', md: '1.0625rem', lg: '1.1875rem', xl: '1.25rem' } }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <Box sx={{ mt: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mb: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 } }}>
                  <ImageIcon sx={{ color: '#00d4ff', fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.3125rem', lg: '1.4375rem', xl: '1.5rem' } }} />
                  <Typography variant="subtitle2" sx={{ color: '#00d4ff', fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' } }}>
                    Bilder / Video
                  </Typography>
                </Box>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const newPhotos: string[] = [...selectedCandidate.photos];
                    const newVideos: string[] = [...selectedCandidate.videos];
                    
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        if (file.type.startsWith('image/')) {
                          newPhotos.push(result);
                        } else if (file.type.startsWith('video/')) {
                          newVideos.push(result);
                        }
                        setSelectedCandidate({
                          ...selectedCandidate,
                          photos: [...newPhotos],
                          videos: [...newVideos],
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                  style={{ display: 'none' }}
                  id="candidate-media-upload"
                />
                <label htmlFor="candidate-media-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      '&:hover': { borderColor: '#00d4ff' },
                      minHeight: TOUCH_TARGET_SIZE,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      px: { xs: 1.5, sm: 2, md: 1.75, lg: 2, xl: 2.5 },
                      py: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 },
                    }}
                  >
                    Last opp bilder/video
                  </Button>
                </label>
                {selectedCandidate.photos.length > 0 && (
                  <Box sx={{ mt: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 }, display: 'flex', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, flexWrap: 'wrap' }}>
                    {selectedCandidate.photos.map((photo, idx) => (
                      <Box
                        key={idx}
                        component="img"
                        src={photo}
                        alt={`Kandidatbilde ${idx + 1}`}
                        sx={{
                          width: { xs: 60, sm: 70, md: 65, lg: 80, xl: 90 },
                          height: { xs: 60, sm: 70, md: 65, lg: 80, xl: 90 },
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              
              <TextField
                label="Audition-notater"
                value={selectedCandidate.auditionNotes}
                onChange={(e) => setSelectedCandidate({ ...selectedCandidate, auditionNotes: e.target.value })}
                fullWidth
                multiline
                rows={4}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <NoteIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isDesktop ? '1.25rem' : '1rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mt: 2,
                  ...textFieldStyles,
                }}
              />
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={inputLabelStyles}>Tildelte roller</InputLabel>
                <Select
                  multiple
                  value={selectedCandidate.assignedRoles}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedCandidate({
                    ...selectedCandidate,
                    assignedRoles: e.target.value as string[],
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((roleId) => {
                        const role = roles.find(r => r.id === roleId);
                        return (
                          <Chip
                            key={roleId}
                            label={role?.name || roleId}
                            size="small"
                            sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  sx={{
                    color: '#fff',
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 },
                    },
                  }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id} sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                        <AssignmentIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                        <span>{role.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={inputLabelStyles}>Status</InputLabel>
                <Select
                  value={selectedCandidate.status}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedCandidate({
                    ...selectedCandidate,
                    status: e.target.value as Candidate['status'],
                  })}
                  sx={{
                    color: '#fff',
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                    minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
                      py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 },
                    },
                  }}
                >
                  <MenuItem value="pending" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <ScheduleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Venter</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="requested" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <PeopleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Forespurt</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="shortlist" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Shortlist</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="selected" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <CheckCircleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Valgt</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="confirmed" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <CheckCircleIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Bekreftet</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="rejected" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' }, minHeight: { xs: 40, sm: 44, md: 48, lg: 52, xl: 60 }, py: { xs: 1, sm: 1.25, md: 1.375, lg: 1.5, xl: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 0.875, lg: 1, xl: 1.25 } }}>
                      <CancelIcon sx={{ fontSize: { xs: 16, sm: 18, md: 17, lg: 19, xl: 20 } }} />
                      <span>Avvist</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 }, mt: { xs: 3, sm: 3.5, md: 3.25, lg: 3.5, xl: 4 }, mb: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 } }}>
                <ContactEmergencyIcon sx={{ color: '#00d4ff', fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.3125rem', lg: '1.4375rem', xl: '1.5rem' } }} />
                <Typography variant="subtitle2" sx={{ 
                  color: '#00d4ff', 
                  fontSize: { xs: '1rem', sm: '1.0625rem', md: '1.03125rem', lg: '1.09375rem', xl: '1.125rem' },
                  fontWeight: 600,
                }}>
                  Nødskontakt
                </Typography>
              </Box>
              <TextField
                label="Navn"
                value={selectedCandidate.emergencyContact?.name || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  emergencyContact: {
                    ...selectedCandidate.emergencyContact,
                    name: e.target.value,
                  },
                })}
                fullWidth
                sx={{
                  ...textFieldStyles,
                }}
              />
              <TextField
                label="Telefon"
                value={selectedCandidate.emergencyContact?.phone || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  emergencyContact: {
                    ...selectedCandidate.emergencyContact,
                    phone: e.target.value,
                  },
                })}
                fullWidth
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                sx={{
                  mt: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
                  ...textFieldStyles,
                }}
              />
              <TextField
                label="Forhold"
                value={selectedCandidate.emergencyContact?.relationship || ''}
                onChange={(e) => setSelectedCandidate({
                  ...selectedCandidate,
                  emergencyContact: {
                    ...selectedCandidate.emergencyContact,
                    relationship: e.target.value,
                  },
                })}
                fullWidth
                sx={{
                  mt: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
                  ...textFieldStyles,
                }}
              />

              {selectedCandidate.id && currentProject && (
                <Box sx={{ mt: { xs: 3, sm: 3.5, md: 3.25, lg: 3.5, xl: 4 } }}>
                  <ConsentManagementPanel
                    projectId={currentProject.id}
                    candidateId={selectedCandidate.id}
                    onUpdate={() => {
                      loadProjects();
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
          gap: { xs: 1, sm: 1.5, md: 1.25, lg: 1.5, xl: 2 },
        }}>
          <Button
            onClick={() => {
              setCandidateDialogOpen(false);
              setSelectedCandidate(null);
            }}
            startIcon={<CancelIcon sx={{ fontSize: { xs: 18, sm: 20, md: 19, lg: 21, xl: 24 } }} />}
            sx={{ 
              color: 'rgba(255,255,255,0.6)',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
              py: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 },
              minHeight: TOUCH_TARGET_SIZE,
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSaveCandidate}
            variant="contained"
            startIcon={<SaveIcon sx={{ fontSize: { xs: 18, sm: 20, md: 19, lg: 21, xl: 24 } }} />}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '0.95rem', lg: '1.05rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 2.25, lg: 2.5, xl: 3 },
              py: { xs: 1, sm: 1.25, md: 1.125, lg: 1.25, xl: 1.5 },
              minHeight: TOUCH_TARGET_SIZE,
              px: isDesktop ? 4 : 3,
              py: isDesktop ? 1.5 : 1,
              fontWeight: 600,
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => {
          setScheduleDialogOpen(false);
          setSelectedSchedule(null);
        }}
        maxWidth="lg"
        fullWidth
        container={() => document.body}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: { enter: 225, exit: 150 },
          enter: true,
          exit: true,
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            width: '100%',
            maxWidth: '90vw',
            zIndex: 100000,
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
          },
        }}
        sx={{
          zIndex: 100000,
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            willChange: 'opacity',
          },
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: isDesktop ? 2 : 1.5,
          py: isDesktop ? 2.5 : 2,
        }}>
          <CalendarIcon sx={{ fontSize: isDesktop ? '2rem' : '1.5rem', color: '#00d4ff' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: isDesktop ? '1.75rem' : isTablet ? '1.375rem' : '1.125rem',
                fontWeight: 600,
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              {selectedSchedule?.id && !selectedSchedule.date ? 'Ny timeplan' : 'Rediger timeplan'}
            </Typography>
            {selectedSchedule?.date && (
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: isDesktop ? '1rem' : isTablet ? '0.875rem' : '0.75rem',
                  fontWeight: 400,
                }}
              >
                {selectedSchedule.date} {selectedSchedule.time && `kl. ${selectedSchedule.time}`}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          pt: isDesktop ? 4 : 3,
          px: isDesktop ? 3 : 2,
          pb: isDesktop ? 3 : 2,
          overflow: 'visible',
        }}>
          {selectedSchedule && currentProject && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isDesktop ? 3 : 2 }}>
              <FormControl fullWidth>
                <InputLabel sx={inputLabelStyles}>Kandidat</InputLabel>
                <Select
                  value={selectedSchedule.candidateId}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, candidateId: e.target.value })}
                  sx={{
                    color: '#fff',
                    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    },
                  }}
                >
                  {candidates.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: '1rem' }} />
                        <span>{c.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel sx={inputLabelStyles}>Rolle</InputLabel>
                <Select
                  value={selectedSchedule.roleId}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, roleId: e.target.value })}
                  sx={{
                    color: '#fff',
                    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    },
                  }}
                >
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIcon sx={{ fontSize: '1rem' }} />
                        <span>{r.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Dato"
                type="date"
                value={selectedSchedule.date}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isDesktop ? '1.25rem' : '1rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Tid"
                type="time"
                value={selectedSchedule.time}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, time: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isDesktop ? '1.25rem' : '1rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <TextField
                label="Lokasjon"
                value={selectedSchedule.location}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, location: e.target.value })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: isDesktop ? '1.25rem' : '1rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...textFieldStyles,
                }}
              />
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={inputLabelStyles}>Scene (valgfri)</InputLabel>
                <Select
                  value={selectedSchedule.sceneId || ''}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedSchedule({
                    ...selectedSchedule,
                    sceneId: e.target.value || undefined,
                  })}
                  sx={{
                    color: '#fff',
                    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    },
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloseIcon sx={{ fontSize: '1rem' }} />
                      <span>Ingen scene</span>
                    </Box>
                  </MenuItem>
                  {availableScenes.map((scene) => (
                    <MenuItem key={scene.id} value={scene.id}>
                      {scene.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Notes field - matching ProductionDayView style with animated icon */}
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1,
                    bgcolor: 'rgba(255,184,0,0.15)',
                    p: 1.5,
                    borderRadius: '8px',
                    border: '2px solid rgba(255,184,0,0.3)',
                    '@keyframes writing': {
                      '0%, 100%': { transform: 'rotate(-5deg) translateY(0px)' },
                      '25%': { transform: 'rotate(0deg) translateY(-2px)' },
                      '50%': { transform: 'rotate(5deg) translateY(0px)' },
                      '75%': { transform: 'rotate(0deg) translateY(2px)' },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: isDesktop ? 40 : 32,
                      height: isDesktop ? 40 : 32,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,184,0,0.2)',
                      border: '2px solid rgba(255,184,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <NoteIcon
                      sx={{
                        color: '#ffb800',
                        fontSize: isDesktop ? '1.5rem' : '1.125rem',
                        animation: 'writing 2.5s ease-in-out infinite',
                        filter: 'drop-shadow(0 2px 4px rgba(255,184,0,0.3))',
                      }}
                    />
                  </Box>
                  <Typography sx={{ color: '#ffb800', fontWeight: 700, fontSize: isDesktop ? '1rem' : '0.875rem' }}>
                    Notater
                  </Typography>
                </Box>
                <RichTextEditor
                  value={selectedSchedule.notes || ''}
                  onChange={(value) => setSelectedSchedule({ ...selectedSchedule, notes: value })}
                  placeholder="Skriv notater her..."
                  minHeight={120}
                  accentColor="#ffb800"
                />
              </Box>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={inputLabelStyles}>Status</InputLabel>
                <Select
                  value={selectedSchedule.status}
                  MenuProps={selectMenuProps}
                  onChange={(e) => setSelectedSchedule({
                    ...selectedSchedule,
                    status: e.target.value as Schedule['status'],
                  })}
                  sx={{
                    color: '#fff',
                    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '& .MuiSelect-select': {
                      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    },
                  }}
                >
                  <MenuItem value="scheduled">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: '1rem' }} />
                      <span>Planlagt</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="completed">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: '1rem' }} />
                      <span>Fullført</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="cancelled">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CancelIcon sx={{ fontSize: '1rem' }} />
                      <span>Avlyst</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: isDesktop ? 3 : 2,
          gap: isDesktop ? 2 : 1,
        }}>
          <Button
            onClick={() => {
              setScheduleDialogOpen(false);
              setSelectedSchedule(null);
            }}
            startIcon={<CancelIcon />}
            sx={{ 
              color: 'rgba(255,255,255,0.6)',
              fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem',
              px: isDesktop ? 3 : 2,
              py: isDesktop ? 1.5 : 1,
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSaveSchedule}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              fontSize: isDesktop ? '1.125rem' : isTablet ? '1rem' : '0.875rem',
              px: isDesktop ? 4 : 3,
              py: isDesktop ? 1.5 : 1,
              fontWeight: 600,
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Selector Dialog */}
      <Dialog
        open={projectSelectorOpen}
        onClose={() => setProjectSelectorOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            borderRadius: 2,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            py: 2,
            px: 3,
            bgcolor: '#161b22',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Alle prosjekter ({projects.length})
          </Typography>
          <IconButton
            onClick={() => setProjectSelectorOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {[...projects]
              .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
              .map((project) => {
                const isActive = currentProject?.id === project.id;
                const candidateCount = project.candidates?.length || 0;
                const updatedDate = project.updatedAt 
                  ? new Date(project.updatedAt).toLocaleDateString('nb-NO', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Ukjent';
                return (
                  <Box
                    key={project.id}
                    onClick={() => {
                      setCurrentProject(project);
                      setProjectSelectorOpen(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      px: 3,
                      py: 2,
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      bgcolor: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                      },
                    }}
                  >
                    <Box sx={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      bgcolor: isActive ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                      flexShrink: 0,
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        sx={{ 
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.9)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {project.name}
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '0.75rem',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Sist endret: {updatedDate}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${candidateCount} kandidater`}
                      sx={{
                        height: 24,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.7rem',
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setProjectToEdit(project);
                          setProjectCreationModalOpen(true);
                          setProjectSelectorOpen(false);
                        }}
                        sx={{
                          color: 'rgba(255,255,255,0.5)',
                          '&:hover': { color: '#00d4ff' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={async (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (window.confirm(`Er du sikker på at du vil slette "${project.name}"?`)) {
                            try {
                              await castingService.deleteProject(project.id);
                              await loadProjects();
                              if (currentProject?.id === project.id) {
                                const remaining = await castingService.getProjects();
                                setCurrentProject(remaining.length > 0 ? remaining[0] : null);
                              }
                            } catch (error) {
                              toast.showError('Kunne ikke slette prosjektet.');
                            }
                          }
                        }}
                        sx={{
                          color: 'rgba(255,255,255,0.5)',
                          '&:hover': { color: '#ff4444' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Sharing Dialog */}
      {currentProject && (
        <CastingSharingDialog
          open={sharingDialogOpen}
          projectId={currentProject.id}
          onClose={() => setSharingDialogOpen(false)}
          onUpdate={async () => {
            if (currentProject) {
              const updated = await castingService.getProject(currentProject.id);
              if (updated) setCurrentProject(updated);
            }
          }}
        />
      )}

      {/* Project Creation Modal */}
      <Dialog
        open={projectCreationModalOpen}
        onClose={() => setProjectCreationModalOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        container={() => document.body}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: { enter: 225, exit: 150 },
          enter: true,
          exit: true,
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            width: '100%',
            maxWidth: isMobile ? '100%' : '90vw',
            maxHeight: isMobile ? '100%' : '90vh',
            m: isMobile ? 0 : undefined,
            borderRadius: isMobile ? 0 : 2,
            zIndex: 100000,
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        sx={{
          zIndex: 100000,
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            willChange: 'opacity',
          },
        }}
      >
        {/* Header with close button */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            py: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 3 },
            bgcolor: '#161b22',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                color: '#fff',
              }}
            >
              {projectToEdit ? 'Rediger Prosjekt' : 'Nytt Casting Prosjekt'}
            </Typography>
            {(projectToEdit?.id || currentProjectId) && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(0, 212, 255, 0.15)',
                border: '1.5px solid rgba(0, 212, 255, 0.4)',
                alignSelf: 'flex-start',
              }}>
                <Folder sx={{ color: '#00d4ff', fontSize: { xs: '0.875rem', sm: '1rem' } }} />
                <Box>
                  <Typography variant="caption" sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    color: '#00d4ff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    lineHeight: 1,
                  }}>
                    Prosjekt-ID
                  </Typography>
                  <Typography variant="caption" sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    color: '#00d4ff',
                    fontFamily: 'monospace',
                    letterSpacing: '0.3px',
                    display: 'block',
                    lineHeight: 1.2,
                    mt: 0.25,
                  }}>
                    {projectToEdit?.id || currentProjectId}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <IconButton
            onClick={() => {
              setProjectCreationModalOpen(false);
              setProjectToEdit(null);
            }}
            aria-label="Lukk"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            overflow: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <ProjectProvider>
                <NewProjectCreationModal
                  profession={profession || 'photographer'}
                  userId={user?.id}
                  isCastingPlanner={true}
                  getTerm={getTerm}
                  initialData={projectToEdit || undefined}
                  onProjectIdChange={handleProjectIdChange}
                  onClose={() => {
                    setProjectCreationModalOpen(false);
                    setProjectToEdit(null);
                    setCurrentProjectId(null);
                  }}
                  onProjectCreated={async (projectData) => {
                    console.log('Project created/updated:', projectData);
                    console.log('Project ID:', projectData?.id);
                    setProjectCreationModalOpen(false);
                    setProjectToEdit(null);
                    
                    // Use the project data returned from backend directly
                    // The ID should always be set (generated when modal opens)
                    if (projectData?.id) {
                      // Ensure crew is initialized as an array if missing
                      const projectWithCrew = {
                        ...projectData,
                        id: projectData.id, // Explicitly set ID to ensure it's used
                        crew: projectData.crew || [],
                      } as CastingProject;
                      
                      console.log('Setting current project with ID:', projectWithCrew.id);
                      
                      // Save to database
                      try {
                        await castingService.saveProject(projectWithCrew);
                      } catch (error) {
                        console.error('Failed to save project to database:', error);
                      }
                      
                      // Invalidate query cache to force refresh
                      queryClient.invalidateQueries({ queryKey: ['/api/casting/projects'] });
                      
                      // Set the newly created project as current immediately
                      // This ensures all child components (roles, candidates, locations, shots, etc.) use the same project ID
                      setCurrentProject(projectWithCrew);
                      console.log('Current project set with ID:', projectWithCrew.id);
                      
                      // Reload projects list in the background to update the list
                      try {
                        const loadedProjects = await castingService.getProjects();
                        setProjects(loadedProjects);
                        // Ensure the new project is still set as current (in case reload changed something)
                        const foundProject = loadedProjects.find(p => p.id === projectData.id);
                        if (foundProject) {
                          // Ensure crew is initialized
                          const projectWithCrewFromDb = {
                            ...foundProject,
                            crew: foundProject.crew || [],
                          } as CastingProject;
                          setCurrentProject(projectWithCrewFromDb);
                        }
                      } catch (error) {
                        console.warn('Failed to reload projects list, using returned project data:', error);
                        // If reload fails, still use the returned project data
                        // Also try to update projects list with the new project
                        setProjects(prev => {
                          const exists = prev.some(p => p.id === projectData.id);
                          if (exists) {
                            return prev.map(p => {
                              if (p.id === projectData.id) {
                                return projectWithCrew;
                              }
                              return p;
                            });
                          } else {
                            return [projectWithCrew, ...prev];
                          }
                        });
                      }
                    } else {
                      // Fallback: reload projects if no project data
                      try {
                        const loadedProjects = await castingService.getProjects();
                        setProjects(loadedProjects);
                        if (loadedProjects.length > 0) {
                          setCurrentProject(loadedProjects[0]);
                        }
                      } catch (error) {
                        console.error('Failed to reload projects:', error);
                      }
                    }
                  }}
                />
              </ProjectProvider>
            </MemoryRouter>
          </QueryClientProvider>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={deleteProjectDialogOpen}
        onClose={() => {
          setDeleteProjectDialogOpen(false);
          setProjectToDelete(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DeleteIcon sx={{ fontSize: 28, color: '#ff4444' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
            Slett prosjekt
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>
            Er du sikker på at du vil slette prosjektet <strong>"{projectToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            Denne handlingen kan ikke angres. All data knyttet til prosjektet vil bli permanent slettet.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            gap: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Button
            onClick={() => {
              setDeleteProjectDialogOpen(false);
              setProjectToDelete(null);
            }}
            variant="outlined"
            sx={{
              color: 'rgba(255,255,255,0.8)',
              borderColor: 'rgba(255,255,255,0.2)',
              textTransform: 'none',
              px: 3,
              py: 1,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.3)',
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={async () => {
              if (!projectToDelete) return;
              
              try {
                await castingService.deleteProject(projectToDelete.id);
                await loadProjects();
                // If we deleted the current project, select the first available one
                if (currentProject?.id === projectToDelete.id) {
                  const remainingProjects = await castingService.getProjects();
                  if (remainingProjects.length > 0) {
                    setCurrentProject(remainingProjects[0]);
                  } else {
                    setCurrentProject(null);
                  }
                }
                setDeleteProjectDialogOpen(false);
                setProjectToDelete(null);
              } catch (error) {
                console.error('Error deleting project:', error);
                toast.showError('Kunne ikke slette prosjektet. Prøv igjen.');
              }
            }}
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{
              bgcolor: '#ff4444',
              color: '#fff',
              textTransform: 'none',
              px: 3,
              py: 1,
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#ff3333',
              },
            }}
          >
            Slett prosjekt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Quick Navigation SpeedDial FAB - 6-tier responsive optimized */}
      <SpeedDial
        ariaLabel="Hurtignavigasjon"
        direction="up"
        sx={{
          position: 'fixed',
          bottom: { 
            xs: 'calc(80px + max(16px, env(safe-area-inset-bottom, 16px)))', 
            sm: 24, 
            md: 32, 
            lg: 40,
            xl: 48,
          },
          right: { 
            xs: 16, 
            sm: 24, 
            md: 32, 
            lg: 40,
            xl: 48,
          },
          zIndex: 1200,
          '& .MuiSpeedDial-fab': {
            width: { xs: 64, sm: 64, md: 68, lg: 72, xl: 80 },
            height: { xs: 64, sm: 64, md: 68, lg: 72, xl: 80 },
            minWidth: { xs: 64, sm: 64, md: 68, lg: 72, xl: 80 },
            minHeight: { xs: 64, sm: 64, md: 68, lg: 72, xl: 80 },
            background: professionConfig
              ? `linear-gradient(135deg, ${professionConfig.color} 0%, ${professionConfig.color}cc 100%)`
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: professionConfig
              ? `0 8px 32px ${professionConfig.color}60, 0 0 0 4px ${professionConfig.color}20`
              : '0 8px 32px rgba(16, 185, 129, 0.5), 0 0 0 4px rgba(16, 185, 129, 0.15)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            '&:hover, &:active': {
              background: professionConfig
                ? `linear-gradient(135deg, ${professionConfig.color}dd 0%, ${professionConfig.color}aa 100%)`
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              boxShadow: professionConfig
                ? `0 12px 40px ${professionConfig.color}70, 0 0 0 6px ${professionConfig.color}30`
                : '0 12px 40px rgba(16, 185, 129, 0.6), 0 0 0 6px rgba(16, 185, 129, 0.25)',
              transform: 'scale(1.08)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiSpeedDialIcon-icon': {
              fontSize: { xs: '1.75rem', sm: '1.75rem', md: '2rem', lg: '2rem', xl: '2.25rem' },
              color: '#fff',
            },
          },
          '& .MuiSpeedDial-actions': {
            paddingBottom: { xs: '16px', sm: '14px', md: '12px' },
            gap: { xs: '14px', sm: '12px', md: '10px' },
          },
        }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
      >
        {quickNavigationLinks.map((link, index) => {
          const IconComponent = link.icon;
          const hasBadge = link.badge !== null && link.badge > 0;
          
          return (
            <SpeedDialAction
              key={link.title}
              icon={
                <Badge 
                  badgeContent={hasBadge ? link.badge : 0} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: '#fff',
                      color: link.color,
                      fontWeight: 'bold',
                      fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem', lg: '0.85rem', xl: '0.9rem' },
                      minWidth: { xs: '20px', sm: '22px', md: '24px', lg: '26px', xl: '28px' },
                      height: { xs: '20px', sm: '22px', md: '24px', lg: '26px', xl: '28px' },
                      padding: '0 5px',
                      border: `2px solid ${link.color}`,
                    },
                  }}
                >
                  <IconComponent sx={{ fontSize: { xs: '1.5rem', sm: '1.5rem', md: '1.75rem', lg: '2rem', xl: '2.25rem' }, color: '#fff' }} />
                </Badge>
              }
              tooltipTitle={link.title}
              tooltipOpen={speedDialOpen && (isDesktop || isTablet)}
              tooltipPlacement="left"
              onClick={() => {
                if (link.action) {
                  link.action();
                } else if (link.tabIndex >= 0) {
                  setActiveTab(link.tabIndex);
                }
                setSpeedDialOpen(false);
              }}
              sx={{
                color: '#fff',
                bgcolor: link.color,
                border: `3px solid rgba(255, 255, 255, 0.25)`,
                width: { xs: 56, sm: 56, md: 60, lg: 64, xl: 72 },
                height: { xs: 56, sm: 56, md: 60, lg: 64, xl: 72 },
                minWidth: { xs: 56, sm: 56, md: 60, lg: 64, xl: 72 },
                minHeight: { xs: 56, sm: 56, md: 60, lg: 64, xl: 72 },
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: `0 4px 20px ${link.color}50`,
                '&:hover, &:active': {
                  bgcolor: link.color,
                  filter: 'brightness(1.15)',
                  transform: 'scale(1.1)',
                  boxShadow: `0 8px 28px ${link.color}70`,
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiSpeedDialAction-staticTooltip': {
                  bgcolor: '#1c2128',
                  border: `2px solid ${link.color}60`,
                  borderRadius: '10px',
                  padding: { xs: '10px 14px', sm: '10px 14px', md: '12px 16px', lg: '12px 16px', xl: '14px 18px' },
                  maxWidth: { xs: '140px', sm: '160px', md: '180px', lg: '200px', xl: '240px' },
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                },
                '& .MuiSpeedDialAction-staticTooltipLabel': {
                  bgcolor: 'transparent',
                  color: '#fff',
                  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.9rem', lg: '0.95rem', xl: '1rem' },
                  fontWeight: 600,
                  padding: 0,
                  whiteSpace: 'nowrap',
                },
              }}
            />
          );
        })}
      </SpeedDial>
    </Box>

      <AdminDashboard
        open={adminDashboardOpen}
        onClose={() => setAdminDashboardOpen(false)}
        projectName={currentProject?.name}
      />

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLoginSuccess={(user) => setAdminUser(user)}
      />

      <CastingPlannerTutorial
        open={showTutorial || previewTutorial !== null}
        onClose={() => {
          setShowTutorial(false);
          setPreviewTutorial(null);
        }}
        onNavigateToTab={(tabIndex) => setActiveTab(tabIndex)}
        customTutorial={previewTutorial || undefined}
      />

      <TutorialEditorPanel
        open={showTutorialEditor}
        onClose={() => setShowTutorialEditor(false)}
        onPreviewTutorial={(tutorial) => {
          setShowTutorialEditor(false);
          setPreviewTutorial(tutorial);
        }}
      />

      {onboardingProfession && (
        <ProfessionOnboardingDialog
          open={showOnboarding}
          onClose={closeOnboarding}
          profession={onboardingProfession}
          userName={adminUser?.display_name}
        />
      )}
    </>
  );
}

import { useAcademy, useAcademyContext } from '../contexts/AcademyContext';
/**
 * Course Creator Sidebar
 * Comprehensive sidebar with auto-save, draft/publish, and versioning
 */

import { useState, useCallback, useEffect, useMemo, useReducer, memo, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';

// Extend Window interface for YouTube iframe API (NO API KEY REQUIRED!)
declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement | string, options: any) => {
        getDuration: () => number;
        destroy: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

import {
  Box,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Menu,
  MenuItem,
  MenuList,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Avatar,
  Paper,
  Collapse,
  ListItemSecondaryAction,
  InputAdornment,
  Autocomplete,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  CircularProgress,
  Snackbar,
  Slider,
  Checkbox,
} from '@mui/material';
import {
  Save,
  Publish,
  Edit,
  History,
  Settings,
  Preview,
  Share,
  Download,
  Upload,
  Delete,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  Schedule,
  Timer,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  ExpandMore,
  ExpandLess,
  MoreVert,
  CloudUpload,
  CloudDownload,
  RestoreFromTrash,
  ContentCopy,
  Bookmark,
  BookmarkBorder,
  Star,
  StarBorder,
  Flag,
  FlagOutlined,
  Refresh,
  Sync,
  SyncDisabled,
  AutoAwesome,
  Speed,
  Security,
  Backup,
  Restore,
  Timeline,
  Assessment,
  Analytics,
  TrendingUp,
  People,
  School,
  Work,
  Business,
  Celebration,
  Add,
  Close,
  DragIndicator,
  Search,
  FilterList,
  Image as ImageIcon,
  VideoLibrary,
  Article,
  Link as LinkIcon,
  InsertDriveFile,
  PlayArrow,
  Pause,
  AccessTime,
  Language,
  AttachMoney,
  Category,
  Person,
  Tag,
  Description,
  CheckCircleOutline,
  Cancel,
  OpenInNew,
} from '@mui/icons-material';
import {
  AcademyIcon,
  CourseIcon,
  LessonIcon,
  VideoPlayerIcon,
  InstructorIcon,
  StudentIcon,
  LearningPathIcon,
  CertificateIcon,
  QuizIcon,
  BookmarkIcon,
  NoteIcon,
  ContentCreationIcon,
} from '../shared/CreatorHubIcons';
import { useAutoSave } from '../hooks/useAutoSave';
import { useDebounce } from '../hooks/useDebounce';
import { useEnhancedMasterIntegration } from '../integration/EnhancedMasterIntegrationProvider';
import { withUniversalIntegration } from '../integration/UniversalIntegrationHOC';
import { useTheming } from '../utils/theming-helper';
import { ModuleEditor } from './CourseCreator/ModuleEditor';
import { LessonEditor } from './CourseCreator/LessonEditor';
import { ResourceEditor } from './CourseCreator/ResourceEditor';
import { LowerThirdEditor } from './CourseCreator/LowerThirdEditor';
import { ChapterEditor } from './CourseCreator/ChapterEditor';
import type { Module, Lesson, Resource, LowerThird, VideoChapter } from './CourseCreator/types';
import { lowerThirdTemplatesService } from '../services/lowerThirdTemplatesService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CourseVersion {
  id: string;
  version: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  changes: string[];
  isCurrent: boolean;
  isRestorable: boolean;
}

// Types are now imported from './CourseCreator/types'

// Section 7.2: Proper interface definitions - Course interface
interface Course {
  id: string;
  title: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  videoResolution?: string;
  videoFileSize?: string;
  videoFormat?: string;
  videoUploadDate?: string;
  category?: string;
  level?: string;
  language?: string;
  price?: number;
  tags?: string[];
  imageUrl?: string;
  instructorId?: string;
  prerequisites?: string[];
  isPublic?: boolean;
  modules?: Module[];
  lessons?: Lesson[];
  resources?: Resource[];
  lowerThirds?: LowerThird[];
  chapters?: VideoChapter[];
  [key: string]: unknown; // Allow additional properties
}

interface CourseCreatorSidebarProps {
  open: boolean;
  onClose: () => void;
  course: Course;
  onCourseUpdate: (course: Course) => void;
  onPublish: (course: Course) => void;
  onSaveDraft: (course: Course) => void;
  onPreview: (course: Course) => void;
  onShare: (course: Course) => void;
  onExport: (course: Course) => void;
  onImport: (course: Course) => void;
  onDelete: (course: Course) => void;
  onVersionRestore: (version: CourseVersion) => void;
  onVersionCreate: (version: CourseVersion) => void;
  activeTab: number;
  onTabChange: (tab: number) => void;
  modules: Module[];
  lessons: Lesson[];
  resources: Resource[];
  lowerThirds: LowerThird[];
  width?: number;
}

const SAMPLE_VERSIONS: CourseVersion[] = [
  {
    id: 'v1',
    version: '1.0.0',
    title: 'Initial Course Creation',
    description: 'First version of the course with basic structure',
    status: 'published',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    author: {
      id: 'user-1',
      name: 'Daniel Qazi',
      avatar: '/avatars/daniel-qazi.jpg',
    },
    changes: ['Created course structure', 'Added basic modules','Set up pricing'],
    isCurrent: false,
    isRestorable: true,
  },
  {
    id: 'v2',
    version: '1.1.0',
    title: 'Added Video Content',
    description: 'Enhanced course with video lessons and annotations',
    status: 'published',
    createdAt: '2024-01-16T14:20:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    author: {
      id: 'user-1',
      name: 'Daniel Qazi',
      avatar: '/avatars/daniel-qazi.jpg',
    },
    changes: ['Added video lessons','Implemented annotations','Created lower thirds'],
    isCurrent: false,
    isRestorable: true,
  },
  {
    id: 'v3',
    version: '1.2.0',
    title: 'Module System Integration',
    description: 'Current version with advanced module management',
    status: 'draft',
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-17T09:15:00Z',
    author: {
      id: 'user-1',
      name: 'Daniel Qazi',
      avatar: '/avatars/daniel-qazi.jpg',
    },
    changes: ['Implemented module system','Added drag-and-drop','Enhanced organization'],
    isCurrent: true,
    isRestorable: false,
  },
];

const SIDEBAR_TABS = [
  { id: 0, label: 'Video Details', icon: <VideoPlayerIcon />, color: '#2196f3' },
  { id: 1, label: 'Course Details', icon: <CourseIcon />, color: '#4caf50' },
  { id: 2, label: 'Modules', icon: <School />, color: '#ff9800' },
  { id: 3, label: 'Lessons', icon: <LessonIcon />, color: '#9c27b0' },
  { id: 4, label: 'Resources', icon: <Work />, color: '#e91e63' },
];

function CourseCreatorSidebar({
  open,
  onClose,
  course,
  onCourseUpdate,
  onPublish,
  onSaveDraft,
  onPreview,
  onShare,
  onExport,
  onImport,
  onDelete,
  onVersionRestore,
  onVersionCreate,
  activeTab,
  onTabChange,
  modules,
  lessons,
  resources,
  lowerThirds,
  width: propWidth,
}: CourseCreatorSidebarProps) {
  // Responsive width calculation
  const [drawerWidth, setDrawerWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const isTablet = window.matchMedia('(max-width: 1024px) and (min-width: 768px)').matches;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (isMobile) return Math.min(window.innerWidth - 40, 400);
      if (isTablet) return 400;
      return propWidth || 420; // Desktop default
    }
    return propWidth || 420;
  });

  // Update width on resize
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const isTablet = window.matchMedia('(max-width: 1024px) and (min-width: 768px)').matches;
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) {
          setDrawerWidth(Math.min(window.innerWidth - 40, 400));
        } else if (isTablet) {
          setDrawerWidth(400);
        } else {
          setDrawerWidth(propWidth || 420);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [propWidth]);

  const width = drawerWidth;
  const [expandedSections, setExpandedSections] = useState({
    autoSave: true,
    status: true,
    versions: false,
    analytics: false,
    tools: false,
  });
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionTitle, setVersionTitle] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    version: CourseVersion;
  } | null>(null);

  const { analytics, performance, debugging, features } = useEnhancedMasterIntegration();

  // Wire up Academy context
  const academyContext = useAcademyContext();
  const academyState = useAcademy();

  // Theming system
  const theming = useTheming();

  // Wire up CreatorHub icons for sidebar navigation
  const sidebarIcons = {
    academy: <AcademyIcon />,
    course: <CourseIcon />,
    lesson: <LessonIcon />,
    video: <VideoPlayerIcon />,
    instructor: <InstructorIcon />,
    student: <StudentIcon />,
    learningPath: <LearningPathIcon />,
    certificate: <CertificateIcon />,
    quiz: <QuizIcon />,
    bookmark: <BookmarkIcon />,
    note: <NoteIcon />,
    content: <ContentCreationIcon />,
  };
  
  // Log sidebar initialization
  console.log('Sidebar icons initialized:', Object.keys(sidebarIcons).length, 'Academy:', !!academyContext, !!academyState);

  // Performance and debugging integration
  useEffect(() => {
    const stopTiming = performance.startTiming('CourseCreatorSidebar:mount');
    debugging.log('CourseCreatorSidebar mounted', { courseId: course?.id });
    return () => {
      stopTiming();
      debugging.log('CourseCreatorSidebar unmounted', { courseId: course?.id });
    };
  }, [performance, debugging, course?.id]);

  // Comprehensive Feature System for Course Creator Sidebar
  const courseCreationAccess = features.checkFeatureAccess('course-creation');
  const courseManagementAccess = features.checkFeatureAccess('course-management');
  const versionControlAccess = features.checkFeatureAccess('version-control');
  const collaborationAccess = features.checkFeatureAccess('collaboration');
  const courseAnalyticsAccess = features.checkFeatureAccess('analytics-academy');
  const contentManagementAccess = features.checkFeatureAccess('content-management');
  const autoSaveAccess = features.checkFeatureAccess('auto-save');
  const coursePublishingAccess = features.checkFeatureAccess('course-publishing');

  // Feature access summary for rendering status indicators
  const featureAccessSummary = useMemo(() => ([
    { key: 'creation', label: 'Course Creation', access: courseCreationAccess, icon: <School /> },
    { key: 'management', label: 'Management', access: courseManagementAccess, icon: <Work /> },
    { key: 'versionControl', label: 'Version Control', access: versionControlAccess, icon: <History /> },
    { key: 'collaboration', label: 'Collaboration', access: collaborationAccess, icon: <People /> },
    { key: 'analytics', label: 'Analytics', access: courseAnalyticsAccess, icon: <TrendingUp /> },
    { key: 'content', label: 'Content', access: contentManagementAccess, icon: <Article /> },
    { key: 'autoSave', label: 'Auto Save', access: autoSaveAccess, icon: <Save /> },
    { key: 'publishing', label: 'Publishing', access: coursePublishingAccess, icon: <Publish /> },
  ]), [courseCreationAccess, courseManagementAccess, versionControlAccess, collaborationAccess, courseAnalyticsAccess, contentManagementAccess, autoSaveAccess, coursePublishingAccess]);

  // Course creator tools icon registry for sidebar quick actions
  const courseToolsIcons = useMemo(() => ({
    visibility: <Visibility />,
    visibilityOff: <VisibilityOff />,
    lock: <Lock />,
    lockOpen: <LockOpen />,
    timer: <Timer />,
    warning: <Warning />,
    error: <ErrorIcon />,
    moreVert: <MoreVert />,
    cloudDownload: <CloudDownload />,
    restoreFromTrash: <RestoreFromTrash />,
    bookmarkBorder: <BookmarkBorder />,
    star: <Star />,
    starBorder: <StarBorder />,
    flag: <Flag />,
    flagOutlined: <FlagOutlined />,
    speed: <Speed />,
    security: <Security />,
    timeline: <Timeline />,
    assessment: <Assessment />,
    trendingUp: <TrendingUp />,
    business: <Business />,
    celebration: <Celebration />,
    filterList: <FilterList />,
    image: <ImageIcon />,
    pause: <Pause />,
    language: <Language />,
    attachMoney: <AttachMoney />,
    category: <Category />,
    person: <Person />,
    tag: <Tag />,
    openInNew: <OpenInNew />,
  }), []);

  // Log course tools icon count for diagnostics
  debugging.log('Course tools icons loaded', { count: Object.keys(courseToolsIcons).length });

  // Auto-save configuration
  const autoSave = useAutoSave({
    config: {
      enableAutoSave: true,
      debounceDelay: 2000,
      maxRetries: 3,
      retryDelay: 1000,
      conflictResolution: 'client' as any,
      enableConflictDetection: true,
      enableVersioning: true,
      maxVersions: 10,
      enableCompression: false,
      enableEncryption: false,
    },
    onDataSaved: (data: any) => {
      console.log('Course auto-saved: ', data);
      analytics.trackEvent('course_auto_saved', {
        courseId: course.id,
        version: '1.2.0',
        timestamp: Date.now(),
      });
    },
    onError: (error: any) => {
      console.error('Auto-save error:', error);
      analytics.trackEvent('course_auto_save_error', {
        courseId: course.id,
        error,
        timestamp: Date.now(),
      });
    },
    onConflictDetected: (conflict: any) => {
      console.warn('Auto-save conflict detected:', conflict);
      analytics.trackEvent('course_auto_save_conflict', {
        courseId: course.id,
        conflict,
        timestamp: Date.now(),
      });
    },
  });

  // Auto-save course data
  useEffect(() => {
    if (course && autoSave.isEnabled) {
      autoSave.save('course', {
        ...course,
        metadata: {
          version: '1.2.0',
          lastModified: new Date().toISOString(),
          modulesCount: modules.length,
          lessonsCount: lessons.length,
          resourcesCount: resources.length,
          source: 'CourseCreatorSidebar',
          deviceId: 'browser',
        },
      });
    }
  }, [course, modules, lessons, resources, autoSave]);

  // Track feature usage
  useEffect(() => {
    features.trackFeatureUsage('course-creation', 'sidebar_opened', {
      timestamp: Date.now(),
      component: 'CourseCreatorSidebar',
      courseId: course?.id || 'unknown',
      modulesCount: modules.length,
      lessonsCount: lessons.length,
    });
  }, [features, course?.id, modules.length, lessons.length]);

  // Toggle section expansion
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Handle version creation
  const handleCreateVersion = useCallback(() => {
    if (!versionTitle.trim()) return;

    const newVersion: CourseVersion = {
      id: `v${Date.now()}`,
      version: `1.${SAMPLE_VERSIONS.length}.0`,
      title: versionTitle,
      description: versionDescription,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'user-1',
        name: 'Daniel Qazi',
        avatar: '/avatars/daniel-qazi.jpg',
      },
      changes: ['Manual version creation'],
      isCurrent: false,
      isRestorable: true,
    };

    onVersionCreate(newVersion);
    setShowVersionDialog(false);
    setVersionTitle('');
    setVersionDescription('');

    analytics.trackEvent('course_version_created', {
      courseId: course.id,
      versionId: newVersion.id,
      versionTitle: newVersion.title,
      timestamp: Date.now(),
    });
  }, [versionTitle, versionDescription, onVersionCreate, analytics, course.id]);

  // Handle version restore
  const handleRestoreVersion = useCallback(
    (version: CourseVersion) => {
      onVersionRestore(version);
      setContextMenu(null);

      analytics.trackEvent('course_version_restored', {
        courseId: course.id,
        versionId: version.id,
        versionTitle: version.title,
        timestamp: Date.now(),
      });
    },
    [onVersionRestore, analytics, course.id],
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle />;
      case 'draft':
        return <Edit />;
      case 'archived':
        return <Delete />;
      default:
        return <Info />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render auto-save status
  const renderAutoSaveStatus = () => (
    <Box>
      <ListItemButton 
        onClick={() => toggleSection('autoSave')}
        sx={{
          '@media (pointer: coarse)': {
            minHeight: '52px',
            padding: '14px 16px',
          }
        }}
      >
        <ListItemIcon>
          <Sync color={autoSave.isSaving ? 'primary' : 'inherit'} />
        </ListItemIcon>
        <ListItemText
          primary="Auto-Save"
          secondary={
            autoSave.isSaving
              ? 'Saving...'
              : autoSave.pendingChanges
                ? 'Pending changes'
                : 'Up to date'
          }
          primaryTypographyProps={{
            sx: {
              '@media (pointer: coarse)': {
                fontSize: '15px',
              }
            }
          }}
        />
        <ListItemSecondaryAction>
          <Chip
            label={autoSave.isSaving ? 'Saving' : autoSave.pendingChanges ? 'Pending' : 'Saved'}
            size="small"
            color={autoSave.isSaving ? 'primary' : autoSave.pendingChanges ? 'warning' : 'success'}
            variant="outlined"
          />
        </ListItemSecondaryAction>
        {expandedSections.autoSave ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedSections.autoSave} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Last saved:{', '}
                {autoSave.lastSave
                  ? formatDate(new Date(autoSave.lastSave).toISOString())
                  : 'Never'}
              </Typography>
            </Box>

            {autoSave.isSaving && <LinearProgress />}

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<Save />}
                onClick={() => autoSave.forceSave()}
                disabled={autoSave.isSaving}
              >
                Save Now
              </Button>
              <Button
                size="small"
                startIcon={autoSave.isPaused ? <Sync /> : <SyncDisabled />}
                onClick={autoSave.isPaused ? autoSave.resume : autoSave.pause}
              >
                {autoSave.isPaused ? 'Resume' : 'Pause'}
              </Button>
            </Stack>

            {autoSave.hasError && <Alert severity="error">{autoSave.error}</Alert>}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  // Render course status
  const renderCourseStatus = () => (
    <Box>
      <ListItemButton onClick={() => toggleSection('status')}>
        <ListItemIcon>{getStatusIcon(course.status || 'draft')}</ListItemIcon>
        <ListItemText
          primary="Course Status"
          secondary={`${course.status || 'draft'} • Version ${SAMPLE_VERSIONS.find((v) => v.isCurrent)?.version || '1.0.0'}`}
        />
        <ListItemSecondaryAction>
          <Chip
            label={course.status || 'draft'}
            size="small"
            color={getStatusColor(course.status || 'draft')}
            variant="filled"
          />
        </ListItemSecondaryAction>
        {expandedSections.status ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedSections.status} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<Publish />}
                onClick={() => onPublish(course)}
                disabled={course.status === 'published'}
                sx={{ flex: 1 }}
              >
                Publish
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => onSaveDraft(course)}
                sx={{ flex: 1 }}
              >
                Save Draft
              </Button>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<Preview />}
                onClick={() => onPreview(course)}
                sx={{ flex: 1 }}
              >
                Preview
              </Button>
              <Button
                size="small"
                startIcon={<Share />}
                onClick={() => onShare(course)}
                sx={{ flex: 1 }}
              >
                Share
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  // Render versions
  const renderVersions = () => (
    <Box>
      <ListItemButton onClick={() => toggleSection('versions')}>
        <ListItemIcon>
          <History />
        </ListItemIcon>
        <ListItemText primary="Versions" secondary={`${SAMPLE_VERSIONS.length} versions`} />
        {expandedSections.versions ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedSections.versions} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
          <Stack spacing={1}>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setShowVersionDialog(true)}
              fullWidth
            >
              Create Version
            </Button>

            {SAMPLE_VERSIONS.map((version) => (
              <Paper
                key={version.id}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: version.isCurrent ? 2 : 1,
                  borderColor: version.isCurrent ? 'primary.main' : 'divider','&:hover': { backgroundColor: 'action.hover' }}}
                onClick={() => !version.isCurrent && handleRestoreVersion(version)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    mouseX: e.clientX + 2,
                    mouseY: e.clientY - 6,
                    version: version,
                  });
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {version.title}
                  </Typography>
                  {version.isCurrent && <Chip label="Current" size="small" color="primary" />}
                </Stack>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  {version.description}
                </Typography>

                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(version.createdAt)}
                  </Typography>
                  <Chip
                    label={version.status}
                    size="small"
                    color={getStatusColor(version.status)}
                    variant="outlined"
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  // Render analytics
  const renderAnalytics = () => (
    <Box>
      <ListItemButton onClick={() => toggleSection('analytics')}>
        <ListItemIcon>
          <Analytics />
        </ListItemIcon>
        <ListItemText primary="Analytics" secondary="Course performance metrics" />
        {expandedSections.analytics ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedSections.analytics} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Content Overview
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {modules.length}
                  </Typography>
                  <Typography variant="caption">Modules</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {lessons.length}
                  </Typography>
                  <Typography variant="caption">Lessons</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {resources.length}
                  </Typography>
                  <Typography variant="caption">Resources</Typography>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Auto-Save Stats
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {autoSave.saveCount}
                  </Typography>
                  <Typography variant="caption">Saves</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {autoSave.errorCount}
                  </Typography>
                  <Typography variant="caption">Errors</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: theming.colors.primary }}>
                    {autoSave.conflictCount}
                  </Typography>
                  <Typography variant="caption">Conflicts</Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  // Video editing state
  const [videoUrl, setVideoUrl] = useState(course?.videoUrl || '');
  const [videoTitle, setVideoTitle] = useState(course?.title || '');
  const [videoDescription, setVideoDescription] = useState(course?.description || '');
  const [videoDuration, setVideoDuration] = useState(course?.duration || '');
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState(course?.thumbnailUrl || '');
  // Video metadata (section 2.3)
  const [videoResolution, setVideoResolution] = useState(course?.videoResolution || '');
  const [videoFileSize, setVideoFileSize] = useState(course?.videoFileSize || '');
  const [videoFormat, setVideoFormat] = useState(course?.videoFormat || '');
  const [videoUploadDate, setVideoUploadDate] = useState(course?.videoUploadDate || '');
  
  // Course Details state
  const [courseTitle, setCourseTitle] = useState(course?.title || '');
  const [courseDescription, setCourseDescription] = useState(course?.description || '');
  const [courseCategory, setCourseCategory] = useState(course?.category || '');
  const [courseLevel, setCourseLevel] = useState(course?.level || 'beginner');
  const [courseLanguage, setCourseLanguage] = useState(course?.language || 'no');
  const [coursePrice, setCoursePrice] = useState(course?.price || 0);
  const [courseTags, setCourseTags] = useState<string[]>(course?.tags || []);
  const [courseImageUrl, setCourseImageUrl] = useState(course?.imageUrl || '');
  const [courseInstructor, setCourseInstructor] = useState(course?.instructorId || '');
  const [coursePrerequisites, setCoursePrerequisites] = useState<string[]>(course?.prerequisites || []);
  const [isPublic, setIsPublic] = useState(course?.isPublic ?? true);
  
  // Modules state
  const [modulesList, setModulesList] = useState<Module[]>(modules || []);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const debouncedModuleSearch = useDebounce(moduleSearchQuery, 300);
  
  // Lessons state
  const [lessonsList, setLessonsList] = useState<Lesson[]>(lessons || []);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const debouncedLessonSearch = useDebounce(lessonSearchQuery, 300);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Resources state
  const [resourcesList, setResourcesList] = useState<Resource[]>(resources || []);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const debouncedResourceSearch = useDebounce(resourceSearchQuery, 300);
  
  // Lower Thirds state
  const [lowerThirdsList, setLowerThirdsList] = useState<LowerThird[]>(lowerThirds || []);
  const [selectedLowerThird, setSelectedLowerThird] = useState<LowerThird | null>(null);
  const [lowerThirdDialogOpen, setLowerThirdDialogOpen] = useState(false);
  const [selectedLowerThirds, setSelectedLowerThirds] = useState<Set<string>>(new Set());
  const [lowerThirdTemplates, setLowerThirdTemplates] = useState<LowerThird[]>([]);
  
  // Video Chapters state
  const [chaptersList, setChaptersList] = useState<VideoChapter[]>(course?.chapters || []);
  const [selectedChapter, setSelectedChapter] = useState<VideoChapter | null>(null);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  
  // Section 4.1: State Management with useReducer for complex UI state
  type UIState = {
    snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' };
    validationErrors: Record<string, string>;
    deleteConfirmDialog: {
      open: boolean;
      type: 'module' | 'lesson' | 'resource' | 'lowerThird' | 'chapter';
      id: string;
      name: string;
    } | null;
    loading: boolean;
    showTemplateDialog: boolean;
    showBulkEditDialog: boolean;
    showExportDialog: boolean;
    bulkEditType: 'lowerThirds' | 'chapters' | null;
  };

  type UIAction =
    | { type: 'SET_SNACKBAR'; payload: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' } }
    | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
    | { type: 'SET_DELETE_DIALOG'; payload: UIState['deleteConfirmDialog'] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_TEMPLATE_DIALOG'; payload: boolean }
    | { type: 'SET_BULK_EDIT_DIALOG'; payload: boolean }
    | { type: 'SET_EXPORT_DIALOG'; payload: boolean }
    | { type: 'SET_BULK_EDIT_TYPE'; payload: 'lowerThirds' | 'chapters' | null };

  const uiReducer = (state: UIState, action: UIAction): UIState => {
    switch (action.type) {
      case 'SET_SNACKBAR':
        return { ...state, snackbar: action.payload };
      case 'SET_VALIDATION_ERRORS':
        return { ...state, validationErrors: action.payload };
      case 'SET_DELETE_DIALOG':
        return { ...state, deleteConfirmDialog: action.payload };
      case 'SET_LOADING':
        return { ...state, loading: action.payload };
      case 'SET_TEMPLATE_DIALOG':
        return { ...state, showTemplateDialog: action.payload };
      case 'SET_BULK_EDIT_DIALOG':
        return { ...state, showBulkEditDialog: action.payload };
      case 'SET_EXPORT_DIALOG':
        return { ...state, showExportDialog: action.payload };
      case 'SET_BULK_EDIT_TYPE':
        return { ...state, bulkEditType: action.payload };
      default:
        return state;
    }
  };

  const [uiState, dispatchUI] = useReducer(uiReducer, {
    snackbar: { open: false, message: '', severity: 'info' },
    validationErrors: {},
    deleteConfirmDialog: null,
    loading: false,
    showTemplateDialog: false,
    showBulkEditDialog: false,
    showExportDialog: false,
    bulkEditType: null,
  });

  // Convenience functions for UI state
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    dispatchUI({ type: 'SET_SNACKBAR', payload: { open: true, message, severity } });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    dispatchUI({ type: 'SET_SNACKBAR', payload: { ...uiState.snackbar, open: false } });
  }, [uiState.snackbar]);

  // UI state (using reducer)
  const snackbar = uiState.snackbar;
  const validationErrors = uiState.validationErrors;
  const deleteConfirmDialog = uiState.deleteConfirmDialog;
  const loading = uiState.loading;
  const showTemplateDialog = uiState.showTemplateDialog;
  const showBulkEditDialog = uiState.showBulkEditDialog;
  const showExportDialog = uiState.showExportDialog;
  const bulkEditType = uiState.bulkEditType;

  // Dispatch-based setter functions for UI state managed by reducer
  const setShowTemplateDialog = useCallback((value: boolean) => {
    dispatchUI({ type: 'SET_TEMPLATE_DIALOG', payload: value });
  }, []);
  const setShowBulkEditDialog = useCallback((value: boolean) => {
    dispatchUI({ type: 'SET_BULK_EDIT_DIALOG', payload: value });
  }, []);
  const setDeleteConfirmDialog = useCallback((value: UIState['deleteConfirmDialog']) => {
    dispatchUI({ type: 'SET_DELETE_DIALOG', payload: value });
  }, []);
  const setBulkEditType = useCallback((value: 'lowerThirds' | 'chapters' | null) => {
    dispatchUI({ type: 'SET_BULK_EDIT_TYPE', payload: value });
  }, []);
  const setLoading = useCallback((value: boolean) => {
    dispatchUI({ type: 'SET_LOADING', payload: value });
  }, []);
  const setValidationErrors = useCallback((updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    if (typeof updater === 'function') {
      dispatchUI({ type: 'SET_VALIDATION_ERRORS', payload: updater(uiState.validationErrors) });
    } else {
      dispatchUI({ type: 'SET_VALIDATION_ERRORS', payload: updater });
    }
  }, [uiState.validationErrors]);

  // Section 3.5: Undo functionality - track deleted items for undo
  const [deletedItems, setDeletedItems] = useState<{
    type: 'module' | 'lesson' | 'resource' | 'lowerThird' | 'chapter';
    item: Module | Lesson | Resource | LowerThird | VideoChapter;
    timestamp: number;
  }[]>([]);
  
  // Load templates from database on mount
  useEffect(() => {
    lowerThirdTemplatesService.getTemplates()
      .then((templates) => {
        // Convert service type to component type
        setLowerThirdTemplates(templates as unknown as LowerThird[]);
      })
      .catch((error) => {
        console.warn('Failed to load lower third templates:', error);
      });
  }, []);
  
  // Save templates to database
  const saveTemplate = useCallback(async (lowerThird: LowerThird) => {
    const newTemplate = { ...lowerThird, id: `template-${Date.now()}`, videoId: '' };
    const newTemplates = [...lowerThirdTemplates, newTemplate];
    setLowerThirdTemplates(newTemplates);
    try {
      await lowerThirdTemplatesService.saveTemplates(newTemplates as any);
      showSnackbar('Template lagret', 'success');
    } catch (error) {
      console.warn('Failed to save template:', error);
      showSnackbar('Feil ved lagring av template', 'error');
    }
  }, [lowerThirdTemplates]);
  
  // Check for overlapping lower thirds
  const checkLowerThirdConflicts = useCallback((newLowerThird: LowerThird, excludeId?: string): LowerThird[] => {
    return lowerThirdsList.filter(lt => {
      if (excludeId && lt.id === excludeId) return false;
      return (
        (newLowerThird.startTime >= lt.startTime && newLowerThird.startTime < lt.endTime) ||
        (newLowerThird.endTime > lt.startTime && newLowerThird.endTime <= lt.endTime) ||
        (newLowerThird.startTime <= lt.startTime && newLowerThird.endTime >= lt.endTime)
      );
    });
  }, [lowerThirdsList]);
  
  // Export lower thirds and chapters to JSON
  const exportToJSON = useCallback(() => {
    const data = {
      lowerThirds: lowerThirdsList,
      chapters: chaptersList,
      videoId: course?.id,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-data-${course?.id || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSnackbar('Data eksportert', 'success');
  }, [lowerThirdsList, chaptersList, course?.id]);
  
  // Import lower thirds and chapters from JSON
  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.lowerThirds && Array.isArray(data.lowerThirds)) {
          setLowerThirdsList(data.lowerThirds.map((lt: Partial<LowerThird>) => ({
            ...lt,
            id: `lt-${Date.now()}-${Math.random()}`,
            videoId: course?.id || '',
            mainText: lt.mainText || '',
            startTime: lt.startTime || 0,
            endTime: lt.endTime || 0,
            position: lt.position || 'bottom-center',
            style: lt.style || {
              fontSize: 16,
              fontFamily: 'Arial',
              textColor: '#ffffff',
              backgroundColor: '#000000',
              opacity: 0.8,
              animation: 'fade',
            },
            order: lt.order || 0,
          } as LowerThird)));
        }
        if (data.chapters && Array.isArray(data.chapters)) {
          setChaptersList(data.chapters.map((ch: Partial<VideoChapter>) => ({
            ...ch,
            id: `ch-${Date.now()}-${Math.random()}`,
            videoId: course?.id || '',
            title: ch.title || '',
            timestamp: ch.timestamp || 0,
            order: ch.order || 0,
          } as VideoChapter)));
        }
        showSnackbar('Data importert', 'success');
      } catch (error) {
        console.error('Failed to import data:', error);
        showSnackbar('Feil ved import av data', 'error');
      }
    };
    reader.readAsText(file);
  }, [course?.id]);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when course changes
  useEffect(() => {
    setVideoUrl(course?.videoUrl || '');
    setVideoTitle(course?.title || '');
    setVideoDescription(course?.description || '');
    setVideoDuration(course?.duration || '');
    setVideoThumbnailUrl(course?.thumbnailUrl || '');
    setVideoResolution(course?.videoResolution || '');
    setVideoFileSize(course?.videoFileSize || '');
    setVideoFormat(course?.videoFormat || '');
    setVideoUploadDate(course?.videoUploadDate || '');
    setCourseTitle(course?.title || '');
    setCourseDescription(course?.description || '');
    setCourseCategory(course?.category || '');
    setCourseLevel(course?.level || 'beginner');
    setCourseLanguage(course?.language || 'no');
    setCoursePrice(course?.price || 0);
    setCourseTags(course?.tags || []);
    setCourseImageUrl(course?.imageUrl || '');
    setCourseInstructor(course?.instructorId || '');
    setCoursePrerequisites(course?.prerequisites || []);
    setIsPublic(course?.isPublic ?? true);
    setModulesList(modules || []);
    setLessonsList(lessons || []);
    setResourcesList(resources || []);
    setLowerThirdsList(lowerThirds || []);
    setChaptersList(course?.chapters || []);
  }, [course, modules, lessons, resources, lowerThirds]);

  // Sync changes back to parent when data changes (debounced to avoid infinite loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only update if there are actual changes
      const hasChanges = 
        JSON.stringify(modulesList) !== JSON.stringify(modules) ||
        JSON.stringify(lessonsList) !== JSON.stringify(lessons) ||
        JSON.stringify(resourcesList) !== JSON.stringify(resources) ||
        JSON.stringify(lowerThirdsList) !== JSON.stringify(lowerThirds) ||
        JSON.stringify(chaptersList) !== JSON.stringify(course?.chapters || []);
      
      if (hasChanges) {
        onCourseUpdate({
          ...course,
          modules: modulesList,
          lessons: lessonsList,
          resources: resourcesList,
          lowerThirds: lowerThirdsList,
          chapters: chaptersList,
        });
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [modulesList, lessonsList, resourcesList, lowerThirdsList, chaptersList, modules, lessons, resources, lowerThirds, course]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab === 0) {
          // Save video details
          const videoValidation = validateVideoUrl(videoUrl);
          const durationValidation = validateDuration(videoDuration);
          if (videoValidation.valid && durationValidation.valid && videoTitle.trim() !== '') {
            onCourseUpdate({
              ...course,
              videoUrl,
              title: videoTitle,
              description: videoDescription,
              duration: videoDuration,
              thumbnailUrl: videoThumbnailUrl,
              videoResolution,
              videoFileSize,
              videoFormat,
              videoUploadDate,
              lowerThirds: lowerThirdsList,
              chapters: chaptersList,
            });
            showSnackbar('Lagret (Ctrl+S)', 'success');
          }
        } else if (activeTab === 1) {
          // Save course details
          onCourseUpdate({
            ...course,
            title: courseTitle,
            description: courseDescription,
            category: courseCategory,
            level: courseLevel,
            language: courseLanguage,
            price: coursePrice,
            tags: courseTags,
            imageUrl: courseImageUrl,
            instructorId: courseInstructor,
            prerequisites: coursePrerequisites,
            isPublic,
          });
          showSnackbar('Lagret (Ctrl+S)', 'success');
        }
      }
      // Escape to close dialogs or sidebar
      if (e.key === 'Escape') {
        // Close dialogs first
        if (lowerThirdDialogOpen || chapterDialogOpen || moduleDialogOpen || lessonDialogOpen || resourceDialogOpen || showTemplateDialog || showBulkEditDialog) {
          setLowerThirdDialogOpen(false);
          setChapterDialogOpen(false);
          setModuleDialogOpen(false);
          setLessonDialogOpen(false);
          setResourceDialogOpen(false);
          setShowTemplateDialog(false);
          setShowBulkEditDialog(false);
          setSelectedLowerThird(null);
          setSelectedChapter(null);
          setSelectedModule(null);
          setSelectedLesson(null);
          setSelectedResource(null);
        } else {
          // If no dialogs open, close sidebar
          onClose();
        }
      }
      // Delete: Delete selected items (if applicable)
      if (e.key === 'Delete' && (selectedLowerThirds.size > 0 || selectedChapters.size > 0)) {
        e.preventDefault();
        if (selectedLowerThirds.size > 0) {
          const count = selectedLowerThirds.size;
          setLowerThirdsList(prev => prev.filter(lt => !selectedLowerThirds.has(lt.id)));
          setSelectedLowerThirds(new Set());
          showSnackbar(`${count} lower thirds slettet`, 'info');
        }
        if (selectedChapters.size > 0) {
          const count = selectedChapters.size;
          setChaptersList(prev => prev.filter(ch => !selectedChapters.has(ch.id)));
          setSelectedChapters(new Set());
          showSnackbar(`${count} chapters slettet`, 'info');
        }
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, activeTab, videoUrl, videoTitle, videoDuration, courseTitle, course, videoDescription, videoThumbnailUrl, lowerThirdsList, chaptersList, courseDescription, courseCategory, courseLevel, courseLanguage, coursePrice, courseTags, courseImageUrl, courseInstructor, coursePrerequisites, isPublic, onCourseUpdate]);

  // Validation helpers
  const validateVideoUrl = (url: string): { valid: boolean; error?: string; type?: 'youtube' | 'vimeo' | 'direct' } => {
    if (!url) return { valid: false, error: 'Video URL er påkrevd' };
    
    const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const directVideoRegex = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i;
    
    if (youtubeRegex.test(url)) {
      return { valid: true, type: 'youtube' };
    }
    if (vimeoRegex.test(url)) {
      return { valid: true, type: 'vimeo' };
    }
    if (directVideoRegex.test(url) || url.match(/^https?:\/\//)) {
      return { valid: true, type: 'direct' };
    }
    
    return { valid: false, error: 'Ugyldig video URL. Støtter YouTube, Vimeo eller direkte video-URLer' };
  };

  const validateDuration = (duration: string): { valid: boolean; error?: string } => {
    if (!duration) return { valid: false, error: 'Varighet er påkrevd' };
    
    const timeRegex = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
    if (!timeRegex.test(duration)) {
      return { valid: false, error: 'Ugyldig format. Bruk MM:SS eller HH:MM:SS' };
    }
    
    return { valid: true };
  };

  const extractVideoId = (url: string): string | null => {
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) return youtubeMatch[1];
    
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) return vimeoMatch[1];
    
    return null;
  };

  const getThumbnailUrl = (url: string): string | null => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;
    
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    
    // Vimeo requires API call, return null for now
    return null;
  };

  // Load YouTube iframe API script (no API key needed for basic usage)
  const loadYouTubeIframeAPI = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      // Wait for YouTube API to load
      let attempts = 0;
      const checkAPI = setInterval(() => {
        attempts++;
        if (window.YT && window.YT.Player) {
          clearInterval(checkAPI);
          resolve();
        } else if (attempts > 50) { // 5 seconds timeout
          clearInterval(checkAPI);
          reject(new Error('YouTube API failed to load'));
        }
      }, 100);
    });
  }, []);

  // Get video duration from YouTube, Vimeo, or direct video (NO API KEY REQUIRED)
  const fetchVideoDuration = useCallback(async (url: string): Promise<string | null> => {
    const validation = validateVideoUrl(url);
    if (!validation.valid) return null;

    try {
      if (validation.type === 'youtube') {
        const videoId = extractVideoId(url);
        if (!videoId) return null;

        // Method 1: Use YouTube iframe API (NO API KEY REQUIRED!)
        try {
          await loadYouTubeIframeAPI();
          
          return new Promise((resolve) => {
            // Create a hidden player to get video duration
            const container = document.createElement('div');
            container.style.display = 'none';
            document.body.appendChild(container);

            if (!window.YT) { resolve(null); return; }
            const player = new window.YT.Player(container, {
              videoId: videoId,
              events: {
                onReady: (event: any) => {
                  try {
                    const duration = event.target.getDuration();
                    if (duration && duration > 0) {
                      const hours = Math.floor(duration / 3600);
                      const mins = Math.floor((duration % 3600) / 60);
                      const secs = Math.floor(duration % 60);
                      
                      let formattedDuration = '';
                      if (hours > 0) {
                        formattedDuration = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                      } else {
                        formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
                      }
                      
                      player.destroy();
                      document.body.removeChild(container);
                      resolve(formattedDuration);
                    } else {
                      player.destroy();
                      document.body.removeChild(container);
                      resolve(null);
                    }
                  } catch (error) {
                    console.warn('Error getting YouTube duration:', error);
                    player.destroy();
                    document.body.removeChild(container);
                    resolve(null);
                  }
                },
                onError: () => {
                  player.destroy();
                  document.body.removeChild(container);
                  resolve(null);
                }
              }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
              try {
                if (player && player.destroy) {
                  player.destroy();
                }
                if (container.parentNode) {
                  document.body.removeChild(container);
                }
              } catch (e) {
                // Ignore cleanup errors
              }
              resolve(null);
            }, 10000);
          });
        } catch (error) {
          console.warn('YouTube iframe API error:', error);
          return null;
        }
      } else if (validation.type === 'vimeo') {
        const videoId = extractVideoId(url);
        if (!videoId) return null;

        // Vimeo oEmbed API (NO API KEY REQUIRED!)
        try {
          const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
          const response = await fetch(oEmbedUrl);
          if (response.ok) {
            const data = await response.json();
            // Vimeo oEmbed provides duration in seconds!
            if (data.duration) {
              const hours = Math.floor(data.duration / 3600);
              const mins = Math.floor((data.duration % 3600) / 60);
              const secs = Math.floor(data.duration % 60);
              
              let formattedDuration = '';
              if (hours > 0) {
                formattedDuration = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              } else {
                formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
              }
              return formattedDuration;
            }
          }
        } catch (error) {
          console.warn('Vimeo oEmbed error:', error);
        }
        return null;
      } else if (validation.type === 'direct') {
        // For direct video URLs, we can get duration from video element
        return new Promise((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.crossOrigin = 'anonymous';
          video.src = url;
          
          const timeout = setTimeout(() => {
            if (video.parentNode) {
              document.body.removeChild(video);
            }
            resolve(null);
          }, 10000); // 10 second timeout
          
          video.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            const duration = video.duration;
            if (duration && isFinite(duration) && duration > 0) {
              const hours = Math.floor(duration / 3600);
              const mins = Math.floor((duration % 3600) / 60);
              const secs = Math.floor(duration % 60);
              
              let formattedDuration = '';
              if (hours > 0) {
                formattedDuration = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              } else {
                formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
              }
              if (video.parentNode) {
                document.body.removeChild(video);
              }
              resolve(formattedDuration);
            } else {
              if (video.parentNode) {
                document.body.removeChild(video);
              }
              resolve(null);
            }
          });
          
          video.addEventListener('error', (e) => {
            clearTimeout(timeout);
            console.warn('Video metadata load error:', e);
            if (video.parentNode) {
              document.body.removeChild(video);
            }
            resolve(null);
          });
          
          // Start loading
          video.load();
          document.body.appendChild(video);
        });
      }
    } catch (error) {
      console.warn('Failed to fetch video duration:', error);
      return null;
    }

    return null;
  }, []);

  // Enhanced function to get YouTube duration using iframe API
  const getYouTubeDuration = useCallback(async (videoId: string): Promise<string | null> => {
    try {
      // Use YouTube iframe API (requires loading the API script)
      // For a simpler approach, we'll use a CORS proxy or public API
      // Since we can't use API keys easily, we'll use a workaround
      
      // Method: Load video in hidden iframe and use postMessage
      // This is limited by CORS, so we'll use a different approach
      
      // Best approach: Use a public YouTube duration API or proxy
      // For now, we'll try to use oEmbed + iframe method
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
      
      return new Promise((resolve) => {
        iframe.onload = () => {
          // Try to get duration via postMessage (may not work due to CORS)
          // For production, use YouTube Data API v3 with API key
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve(null);
          }, 1000);
        };
        
        document.body.appendChild(iframe);
      });
    } catch (error) {
      console.warn('Failed to get YouTube duration:', error);
      return null;
    }
  }, []);

  // Video URL validation and auto-fetch duration on change
  useEffect(() => {
    if (videoUrl) {
      const validation = validateVideoUrl(videoUrl);
      if (validation.valid && validation.type === 'youtube') {
        const thumbnail = getThumbnailUrl(videoUrl);
        if (thumbnail && !videoThumbnailUrl) {
          setVideoThumbnailUrl(thumbnail);
        }
        
        // Try to fetch YouTube duration using oEmbed or iframe method
        const videoId = extractVideoId(videoUrl);
        if (videoId && !videoDuration) {
          // Try to get duration using a public API proxy (no API key required)
          // Using a CORS proxy to access YouTube video page
          fetch(`https://www.youtube.com/watch?v=${videoId}`)
            .then(() => {
              // YouTube doesn't expose duration easily without API
              // Try alternative: use a public duration API service
              return fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`)
                .then(res => res.json())
                .then(() => {
                  // oEmbed doesn't provide duration, so we'll use iframe method
                  fetchVideoDuration(videoUrl).then(duration => {
                    if (duration) {
                      setVideoDuration(duration);
                      showSnackbar(`Video varighet hentet: ${duration}`, 'success');
                    }
                  });
                });
            })
            .catch(() => {
              // If all methods fail, try iframe-based fallback, then direct video method
              const fallbackVideoId = extractVideoId(videoUrl);
              if (fallbackVideoId) {
                getYouTubeDuration(fallbackVideoId).then(fallbackDuration => {
                  if (fallbackDuration) {
                    setVideoDuration(fallbackDuration);
                    showSnackbar(`Video varighet hentet: ${fallbackDuration}`, 'success');
                  } else {
                    fetchVideoDuration(videoUrl).then(duration => {
                      if (duration) {
                        setVideoDuration(duration);
                        showSnackbar(`Video varighet hentet: ${duration}`, 'success');
                      }
                    });
                  }
                });
              } else {
                fetchVideoDuration(videoUrl).then(duration => {
                  if (duration) {
                    setVideoDuration(duration);
                    showSnackbar(`Video varighet hentet: ${duration}`, 'success');
                  }
                });
              }
            });
        }
      } else if (validation.valid && validation.type === 'vimeo') {
        // Try to fetch Vimeo duration
        if (!videoDuration) {
          fetchVideoDuration(videoUrl).then(duration => {
            if (duration) {
              setVideoDuration(duration);
              showSnackbar(`Video varighet hentet: ${duration}`, 'success');
            }
          });
        }
      } else if (validation.valid && validation.type === 'direct') {
        // Get duration from direct video
        if (!videoDuration) {
          fetchVideoDuration(videoUrl).then(duration => {
            if (duration) {
              setVideoDuration(duration);
              showSnackbar(`Video varighet hentet: ${duration}`, 'success');
            }
          });
        }
      }
      
      if (!validation.valid) {
        setValidationErrors(prev => ({ ...prev, videoUrl: validation.error || '' }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.videoUrl;
          return newErrors;
        });
      }
    }
  }, [videoUrl, videoThumbnailUrl, videoDuration, fetchVideoDuration]);

  // Duration validation on change
  useEffect(() => {
    if (videoDuration) {
      const validation = validateDuration(videoDuration);
      if (!validation.valid) {
        setValidationErrors(prev => ({ ...prev, duration: validation.error || '' }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.duration;
          return newErrors;
        });
      }
    }
  }, [videoDuration]);

  // Helper functions for time formatting (must be defined before components that use them)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimecode = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const parseTimecode = (timecode: string): number => {
    // Supports formats: HH:MM:SS, MM:SS, HH:MM:SS.mmm, MM:SS.mmm
    const parts = timecode.split(':');
    if (parts.length === 2) {
      // MM:SS or MM:SS.mmm
      const [mins, secsPart] = parts;
      const secsParts = secsPart.split('.');
      const secs = parseFloat(secsParts[0] || '0');
      const ms = parseFloat(secsParts[1] || '0') / 1000;
      return parseInt(mins) * 60 + secs + ms;
    } else if (parts.length === 3) {
      // HH:MM:SS or HH:MM:SS.mmm
      const [hours, mins, secsPart] = parts;
      const secsParts = secsPart.split('.');
      const secs = parseFloat(secsParts[0] || '0');
      const ms = parseFloat(secsParts[1] || '0') / 1000;
      return parseInt(hours) * 3600 + parseInt(mins) * 60 + secs + ms;
    }
    return parseFloat(timecode) || 0;
  };

  // Get video duration in seconds for timeline
  const getVideoDuration = useCallback((): number => {
    if (!videoDuration || typeof videoDuration !== 'string') return 0;
    try {
      return parseTimecode(videoDuration);
    } catch (error) {
      console.warn('Error parsing video duration:', error);
      return 0;
    }
  }, [videoDuration]);

  // Sortable Lower Third Item Component (memoized)
  const SortableLowerThirdItem = memo(({ lowerThird }: { lowerThird: LowerThird }) => {
    const isSelected = selectedLowerThirds.has(lowerThird.id);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: lowerThird.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Paper
        ref={setNodeRef}
        style={style}
        sx={{
          p: 2,
          mb: 1,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
        }}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            setSelectedLowerThirds(prev => {
              const newSet = new Set(prev);
              if (newSet.has(lowerThird.id)) {
                newSet.delete(lowerThird.id);
              } else {
                newSet.add(lowerThird.id);
              }
              return newSet;
            });
          }
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedLowerThirds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(lowerThird.id)) {
                  newSet.delete(lowerThird.id);
                } else {
                  newSet.add(lowerThird.id);
                }
                return newSet;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab' }}
          >
            <DragIndicator />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">{lowerThird.mainText}</Typography>
            {lowerThird.subText && (
              <Typography variant="caption" color="text.secondary">
                {lowerThird.subText}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {formatTime(lowerThird.startTime)} - {formatTime(lowerThird.endTime)}
              </Typography>
              <Chip
                label={formatTime(lowerThird.endTime - lowerThird.startTime)}
                size="small"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </Stack>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLowerThird(lowerThird);
              setLowerThirdDialogOpen(true);
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmDialog({
                open: true,
                type: 'lowerThird',
                id: lowerThird.id,
                name: lowerThird.mainText,
              });
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  });

  // Sortable Chapter Item Component (memoized)
  const SortableChapterItem = memo(({ chapter }: { chapter: VideoChapter }) => {
    const isSelected = selectedChapters.has(chapter.id);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: chapter.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Paper
        ref={setNodeRef}
        style={style}
        sx={{
          p: 2,
          mb: 1,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
        }}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            setSelectedChapters(prev => {
              const newSet = new Set(prev);
              if (newSet.has(chapter.id)) {
                newSet.delete(chapter.id);
              } else {
                newSet.add(chapter.id);
              }
              return newSet;
            });
          }
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedChapters(prev => {
                const newSet = new Set(prev);
                if (newSet.has(chapter.id)) {
                  newSet.delete(chapter.id);
                } else {
                  newSet.add(chapter.id);
                }
                return newSet;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab' }}
          >
            <DragIndicator />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">{chapter.title}</Typography>
            {chapter.description && (
              <Typography variant="caption" color="text.secondary">
                {chapter.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={formatTime(chapter.timestamp)}
                size="small"
                icon={<AccessTime sx={{ fontSize: '0.75rem !important' }} />}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  showSnackbar(`Hopp til kapitel: ${chapter.title} på ${formatTime(chapter.timestamp)}`, 'info');
                }}
                sx={{ p: 0.5 }}
              >
                <PlayArrow fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedChapter(chapter);
              setChapterDialogOpen(true);
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmDialog({
                open: true,
                type: 'chapter',
                id: chapter.id,
                name: chapter.title,
              });
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  });

  // Handle drag end for lower thirds (memoized)
  const handleLowerThirdsDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLowerThirdsList((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  // Handle drag end for chapters (memoized)
  const handleChaptersDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChaptersList((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  // Render video details editor with enhanced features
  const renderVideoDetails = () => {
    const videoValidation = validateVideoUrl(videoUrl);
    const durationValidation = validateDuration(videoDuration);
    const isFormValid = videoValidation.valid && durationValidation.valid && videoTitle.trim() !== '';

    const handleSave = () => {
      if (!isFormValid) {
        showSnackbar('Vennligst fiks valideringsfeil før lagring', 'error');
        return;
      }

      onCourseUpdate({
        ...course,
        videoUrl,
        title: videoTitle,
        description: videoDescription,
        duration: videoDuration,
        thumbnailUrl: videoThumbnailUrl,
        videoResolution,
        videoFileSize,
        videoFormat,
        videoUploadDate,
        lowerThirds: lowerThirdsList,
        chapters: chaptersList,
      });
      showSnackbar('Video detaljer lagret', 'success');
    };

    const handleVideoUrlChange = (newUrl: string) => {
      setVideoUrl(newUrl);
      const validation = validateVideoUrl(newUrl);
      if (validation.valid && validation.type === 'youtube') {
        const thumbnail = getThumbnailUrl(newUrl);
        if (thumbnail) {
          setVideoThumbnailUrl(thumbnail);
        }
      }
    };

    return (
      <Box sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 },
        '@media (pointer: coarse)': {
          padding: '16px',
        }
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            color: theming.colors.primary,
            fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
            '@media (pointer: coarse)': {
              fontSize: '1.125rem',
            }
          }}
        >
          Video Details
        </Typography>
        <Stack spacing={{ xs: 2, sm: 2, md: 2 }}>
          {/* Video Preview with Integrated Player */}
          {videoUrl && videoValidation.valid && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Forhåndsvisning
                </Typography>
                <Box sx={{ 
                  position: 'relative',
                  width: '100%', 
                  height: 300, 
                  borderRadius: 1, 
                  overflow: 'hidden',
                  bgcolor: 'background.default',
                }}>
                  {(() => {
                    const isYouTube = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    const isVimeo = videoUrl.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
                    const isDirectVideo = videoUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i);
                    
                    if (isYouTube) {
                      const videoId = isYouTube[1];
                      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
                      return (
                        <iframe
                          src={embedUrl}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                          title="Video preview"
                        />
                      );
                    } else if (isVimeo) {
                      const videoId = isVimeo[1];
                      const embedUrl = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
                      return (
                        <iframe
                          src={embedUrl}
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                          title="Video preview"
                        />
                      );
                    } else if (isDirectVideo) {
                      return (
                        <video
                          controls
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                          src={videoUrl}
                          poster={videoThumbnailUrl || undefined}
                        />
                      );
                    } else {
                      // Fallback to thumbnail
                      return (
                        <Box sx={{ 
                          position: 'relative',
                          width: '100%', 
                          height: '100%', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}>
                          {videoThumbnailUrl ? (
                            <>
                              <Box
                                component="img"
                                src={videoThumbnailUrl}
                                alt="Video thumbnail"
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  opacity: 0.8,
                                  transition: 'opacity 0.3s',
                                }}
                              >
                                <IconButton
                                  sx={{
                                    bgcolor: 'rgba(139, 92, 246, 0.9)',
                                    color: '#fff',
                                    '&:hover': { bgcolor: 'rgba(139, 92, 246, 1)' },
                                  }}
                                >
                                  <PlayArrow sx={{ fontSize: 40 }} />
                                </IconButton>
                              </Box>
                            </>
                          ) : (
                            <Box sx={{ textAlign: 'center', p: 2 }}>
                              <VideoLibrary sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                Video URL: {videoValidation.type}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    }
                  })()}
                </Box>
                {/* Video Metadata - Section 2.3: Video Metadata */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Video Metadata
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                    {videoValidation.type && (
                      <Chip
                        label={`Type: ${videoValidation.type}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {videoDuration && (
                      <Chip
                        label={`Varighet: ${videoDuration}`}
                        size="small"
                        icon={<AccessTime />}
                      />
                    )}
                    {videoResolution && (
                      <Chip
                        label={`Oppløsning: ${videoResolution}`}
                        size="small"
                        icon={<VideoLibrary />}
                      />
                    )}
                    {videoFileSize && (
                      <Chip
                        label={`Størrelse: ${videoFileSize}`}
                        size="small"
                        icon={<InsertDriveFile />}
                      />
                    )}
                    {videoFormat && (
                      <Chip
                        label={`Format: ${videoFormat}`}
                        size="small"
                      />
                    )}
                    {videoUploadDate && (
                      <Chip
                        label={`Opplastet: ${new Date(videoUploadDate).toLocaleDateString('no-NO')}`}
                        size="small"
                        icon={<Schedule />}
                      />
                    )}
                  </Stack>
                  {videoUrl && (
                    <Chip
                      label={`URL: ${videoUrl.length > 30 ? videoUrl.substring(0, 30) + '...' : videoUrl}`}
                      size="small"
                      icon={<LinkIcon />}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          <TextField
            fullWidth
            label="Video URL"
            value={videoUrl}
            onChange={(e) => handleVideoUrlChange(e.target.value)}
            placeholder="YouTube, Vimeo eller direkte video URL"
            helperText={validationErrors.videoUrl || (videoValidation.valid ? `Type: ${videoValidation.type}` : 'Støtter YouTube, Vimeo og direkte video-URLer')}
            error={!!validationErrors.videoUrl}
            aria-label="Video URL input"
            aria-describedby={validationErrors.videoUrl ? "video-url-error" : "video-url-helper"}
            aria-invalid={!!validationErrors.videoUrl}
            InputProps={{
              endAdornment: videoValidation.valid ? (
                <InputAdornment position="end">
                  <CheckCircleOutline color="success" />
                </InputAdornment>
              ) : videoUrl ? (
                <InputAdornment position="end">
                  <Cancel color="error" />
                </InputAdornment>
              ) : null,
            }}
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />
          <TextField
            fullWidth
            label="Tittel"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            placeholder="Video tittel"
            required
            error={!videoTitle.trim()}
            helperText={!videoTitle.trim() ? 'Tittel er påkrevd' : ''}
            aria-label="Video tittel input"
            aria-required="true"
            aria-invalid={!videoTitle.trim()}
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            multiline
            rows={3}
            placeholder="Video beskrivelse"
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  fontSize: '16px',
                }
              }
            }}
          />
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              label="Varighet"
              value={videoDuration}
              onChange={(e) => setVideoDuration(e.target.value)}
              placeholder="f.eks. 5:30"
              helperText={validationErrors.duration || 'Format: MM:SS eller HH:MM:SS (hentes automatisk fra video)'}
              error={!!validationErrors.duration}
              InputProps={{
                endAdornment: durationValidation.valid ? (
                  <InputAdornment position="end">
                    <CheckCircleOutline color="success" />
                  </InputAdornment>
                ) : videoDuration ? (
                  <InputAdornment position="end">
                    <Cancel color="error" />
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
            <Tooltip title="Hent video varighet automatisk">
              <IconButton
                onClick={async () => {
                  if (!videoUrl) {
                    showSnackbar('Legg til video URL først', 'warning');
                    return;
                  }
                  const validation = validateVideoUrl(videoUrl);
                  if (!validation.valid) {
                    showSnackbar('Ugyldig video URL', 'error');
                    return;
                  }
                  
                  showSnackbar('Henter video varighet...', 'info');
                  const duration = await fetchVideoDuration(videoUrl);
                  if (duration) {
                    setVideoDuration(duration);
                    showSnackbar(`Video varighet hentet: ${duration}`, 'success');
                  } else {
                    // For YouTube, we need to use iframe API or a proxy service
                    if (validation.type === 'youtube') {
                      const videoId = extractVideoId(videoUrl);
                      if (videoId) {
                        // Try using YouTube iframe API (requires loading the API script)
                        // For now, show message that manual entry is needed
                        showSnackbar('YouTube varighet krever API-nøkkel. Vennligst legg inn manuelt eller bruk direkte video-URL.', 'info');
                      }
                    } else if (validation.type === 'vimeo') {
                      // Vimeo also requires API access
                      showSnackbar('Vimeo varighet krever API-tilgang. Vennligst legg inn manuelt.', 'info');
                    } else {
                      showSnackbar('Kunne ikke hente video varighet automatisk. Vennligst legg den inn manuelt.', 'warning');
                    }
                  }
                }}
                disabled={!videoUrl || !validateVideoUrl(videoUrl).valid}
                sx={{ mt: 1 }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
          <TextField
            fullWidth
            label="Thumbnail URL"
            value={videoThumbnailUrl}
            onChange={(e) => setVideoThumbnailUrl(e.target.value)}
            placeholder="URL til thumbnail bilde"
            helperText="Brukes som forhåndsvisning"
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />

          {/* Section 2.3: Additional Video Metadata */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Ekstra Video Metadata
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Oppløsning"
              value={videoResolution}
              onChange={(e) => setVideoResolution(e.target.value)}
              placeholder="f.eks. 1920x1080"
              helperText="Video oppløsning (bredde x høyde)"
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
            <TextField
              fullWidth
              label="Fil størrelse"
              value={videoFileSize}
              onChange={(e) => setVideoFileSize(e.target.value)}
              placeholder="f.eks. 250 MB"
              helperText="Video filstørrelse"
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Format"
              value={videoFormat}
              onChange={(e) => setVideoFormat(e.target.value)}
              placeholder="f.eks. MP4, WebM"
              helperText="Video format/type"
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
            <TextField
              fullWidth
              label="Opplastingsdato"
              type="date"
              value={videoUploadDate ? new Date(videoUploadDate).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value).toISOString() : '';
                setVideoUploadDate(date);
              }}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Dato videoen ble lastet opp"
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Export/Import Section */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={exportToJSON}
                variant="outlined"
                fullWidth
              >
                Eksporter JSON
              </Button>
              <Button
                size="small"
                startIcon={<Upload />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      importFromJSON(file);
                    }
                  };
                  input.click();
                }}
                variant="outlined"
                fullWidth
              >
                Importer JSON
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Lower Thirds Section */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Lower Thirds ({lowerThirdsList.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => {
                    if (lowerThirdsList.length > 0) {
                      const lastLowerThird = lowerThirdsList[lowerThirdsList.length - 1];
                      const newLowerThird: LowerThird = {
                        ...lastLowerThird,
                        id: `lt-${Date.now()}`,
                        mainText: `${lastLowerThird.mainText} (kopi)`,
                        startTime: lastLowerThird.endTime,
                        endTime: lastLowerThird.endTime + 5,
                        order: lowerThirdsList.length,
                      };
                      setSelectedLowerThird(newLowerThird);
                      setLowerThirdDialogOpen(true);
                    }
                  }}
                  disabled={lowerThirdsList.length === 0}
                >
                  Kopier siste
                </Button>
                <Button
                  size="small"
                  startIcon={<Bookmark />}
                  onClick={() => setShowTemplateDialog(true)}
                >
                  Templates
                </Button>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => {
                    setBulkEditType('lowerThirds');
                    setShowBulkEditDialog(true);
                  }}
                  disabled={selectedLowerThirds.size === 0}
                >
                  Bulk rediger ({selectedLowerThirds.size})
                </Button>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => {
                    const newLowerThird: LowerThird = {
                      id: `lt-${Date.now()}`,
                      mainText: '',
                      subText: '',
                      startTime: 0,
                      endTime: 5,
                      position: 'bottom-left',
                      style: {
                        fontSize: 16,
                        fontFamily: 'Arial',
                        textColor: '#ffffff',
                        backgroundColor: '#000000',
                        opacity: 0.8,
                        animation: 'fade',
                      },
                      videoId: course?.id || '',
                      order: lowerThirdsList.length,
                    };
                    setSelectedLowerThird(newLowerThird);
                    setLowerThirdDialogOpen(true);
                  }}
                >
                  Legg til
                </Button>
              </Stack>
            </Stack>
            
            {/* Timeline View for Lower Thirds */}
            {lowerThirdsList.length > 0 && getVideoDuration() > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Timeline visning
                </Typography>
                <Box sx={{ position: 'relative', height: 60, mt: 1 }}>
                  {lowerThirdsList.map((lt, index) => {
                    const duration = getVideoDuration();
                    const startPercent = (lt.startTime / duration) * 100;
                    const widthPercent = ((lt.endTime - lt.startTime) / duration) * 100;
                    return (
                      <Tooltip key={lt.id} title={`${lt.mainText} (${formatTimecode(lt.startTime)} - ${formatTimecode(lt.endTime)})`}>
                        <Box
                          onClick={() => {
                            setSelectedLowerThird(lt);
                            setLowerThirdDialogOpen(true);
                          }}
                          sx={{
                            position: 'absolute',
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                            height: 24,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                              transform: 'scaleY(1.2)',
                            },
                            zIndex: lowerThirdsList.length - index,
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'white', fontSize: '10px', px: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lt.mainText}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                  {/* Time markers */}
                  {Array.from({ length: Math.ceil(getVideoDuration() / 10) + 1 }).map((_, i) => {
                    const time = i * 10;
                    const position = (time / getVideoDuration()) * 100;
                    if (position > 100) return null;
                    return (
                      <Box
                        key={i}
                        sx={{
                          position: 'absolute',
                          left: `${position}%`,
                          top: 28,
                          width: '1px',
                          height: 8,
                          bgcolor: 'text.secondary',
                          opacity: 0.3,
                        }}
                      />
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  0:00 - {formatTime(getVideoDuration())}
                </Typography>
              </Box>
            )}
            
            {lowerThirdsList.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Ingen lower thirds. Klikk "Legg til" for å opprette en.
              </Alert>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLowerThirdsDragEnd}
              >
                <SortableContext
                  items={lowerThirdsList.map(lt => lt.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lowerThirdsList.map((lowerThird) => {
                    const conflicts = checkLowerThirdConflicts(lowerThird, lowerThird.id);
                    return (
                      <Box key={lowerThird.id}>
                        <SortableLowerThirdItem lowerThird={lowerThird} />
                        {conflicts.length > 0 && (
                          <Alert severity="warning" sx={{ mt: 0.5, mb: 1 }}>
                            Overlapper med: {conflicts.map(c => c.mainText).join(', ')}
                          </Alert>
                        )}
                      </Box>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Video Chapters Section */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Video Chapters ({chaptersList.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  startIcon={<PlayArrow />}
                  onClick={() => {
                    if (chaptersList.length > 0) {
                      // Sort chapters by timestamp and show first
                      const sortedChapters = [...chaptersList].sort((a, b) => a.timestamp - b.timestamp);
                      showSnackbar(`Første kapitel: ${sortedChapters[0].title} på ${formatTime(sortedChapters[0].timestamp)}`, 'info');
                    }
                  }}
                  disabled={chaptersList.length === 0}
                >
                  Vis første
                </Button>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => {
                    setBulkEditType('chapters');
                    setShowBulkEditDialog(true);
                  }}
                  disabled={selectedChapters.size === 0}
                >
                  Bulk rediger ({selectedChapters.size})
                </Button>
                <Button
                  size="small"
                  startIcon={<AutoAwesome />}
                  onClick={() => {
                    // Auto-detect chapters based on video duration (simple implementation)
                    if (getVideoDuration() > 0) {
                      const duration = getVideoDuration();
                      const chapterCount = Math.ceil(duration / 300); // One chapter per 5 minutes
                      const newChapters: VideoChapter[] = [];
                      for (let i = 0; i < chapterCount; i++) {
                        const timestamp = (i * duration) / chapterCount;
                        newChapters.push({
                          id: `ch-auto-${Date.now()}-${i}`,
                          title: `Kapitel ${i + 1}`,
                          timestamp,
                          description: `Auto-generert kapitel på ${formatTime(timestamp)}`,
                          order: chaptersList.length + i,
                          videoId: course?.id || '',
                        });
                      }
                      setChaptersList(prev => [...prev, ...newChapters]);
                      showSnackbar(`${newChapters.length} chapters auto-generert`, 'success');
                    } else {
                      showSnackbar('Sett video varighet først for auto-deteksjon', 'warning');
                    }
                  }}
                  disabled={getVideoDuration() === 0}
                >
                  Auto-detect
                </Button>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => {
                    const newChapter: VideoChapter = {
                      id: `ch-${Date.now()}`,
                      title: '',
                      timestamp: 0,
                      description: '',
                      order: chaptersList.length,
                      videoId: course?.id || '',
                    };
                    setSelectedChapter(newChapter);
                    setChapterDialogOpen(true);
                  }}
                >
                  Legg til
                </Button>
              </Stack>
            </Stack>
            
            {/* Timeline View for Chapters */}
            {chaptersList.length > 0 && getVideoDuration() > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Chapter timeline
                </Typography>
                <Box sx={{ position: 'relative', height: 80, mt: 1 }}>
                  {chaptersList
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((chapter, _index) => {
                      const duration = getVideoDuration();
                      const position = (chapter.timestamp / duration) * 100;
                      return (
                        <Tooltip key={chapter.id} title={`${chapter.title} - ${formatTime(chapter.timestamp)}`}>
                          <Box
                            onClick={() => {
                              setSelectedChapter(chapter);
                              setChapterDialogOpen(true);
                            }}
                            sx={{
                              position: 'absolute',
                              left: `${position}%`,
                              top: 0,
                              width: 2,
                              height: '100%',
                              bgcolor: 'secondary.main',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'secondary.dark',
                                width: 4,
                              },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: `8px solid ${theming.colors.secondary || '#8b5cf6'}`,
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                                bgcolor: 'background.paper',
                                px: 0.5,
                                borderRadius: 0.5,
                                fontSize: '10px',
                                maxWidth: 100,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {chapter.title}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  {/* Time markers */}
                  {Array.from({ length: Math.ceil(getVideoDuration() / 10) + 1 }).map((_, i) => {
                    const time = i * 10;
                    const position = (time / getVideoDuration()) * 100;
                    if (position > 100) return null;
                    return (
                      <Box
                        key={i}
                        sx={{
                          position: 'absolute',
                          left: `${position}%`,
                          bottom: 0,
                          width: '1px',
                          height: 20,
                          bgcolor: 'text.secondary',
                          opacity: 0.3,
                        }}
                      />
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  0:00 - {formatTime(getVideoDuration())}
                </Typography>
              </Box>
            )}
            
            {chaptersList.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Ingen chapters. Klikk "Legg til" for å opprette et kapitel.
              </Alert>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleChaptersDragEnd}
              >
                <SortableContext
                  items={chaptersList.map(ch => ch.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {chaptersList.map((chapter) => (
                    <SortableChapterItem key={chapter.id} chapter={chapter} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!isFormValid}
            fullWidth
            sx={{ 
              mt: 2,
              minHeight: { xs: '48px', sm: '44px', md: '40px' },
              fontSize: { xs: '0.9375rem', sm: '0.875rem' },
              '@media (pointer: coarse)': {
                minHeight: '52px',
                fontSize: '16px',
                padding: '14px 24px',
              }
            }}
          >
            Lagre endringer
          </Button>
        </Stack>
      </Box>
    );
  };

  // Render Course Details tab
  const renderCourseDetails = () => {
    const handleSave = () => {
      onCourseUpdate({
        ...course,
        title: courseTitle,
        description: courseDescription,
        category: courseCategory,
        level: courseLevel,
        language: courseLanguage,
        price: coursePrice,
        tags: courseTags,
        imageUrl: courseImageUrl,
        instructorId: courseInstructor,
        prerequisites: coursePrerequisites,
        isPublic,
      });
      showSnackbar('Course detaljer lagret', 'success');
    };

    return (
      <Box sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 },
        '@media (pointer: coarse)': {
          padding: '16px',
        }
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            color: theming.colors.primary,
            fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
            '@media (pointer: coarse)': {
              fontSize: '1.125rem',
            }
          }}
        >
          Course Details
        </Typography>
        <Stack spacing={{ xs: 2, sm: 2, md: 2 }}>
          <TextField
            fullWidth
            label="Course Tittel"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="Course tittel"
            required
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            multiline
            rows={4}
            placeholder="Course beskrivelse"
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  fontSize: '16px',
                }
              }
            }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={courseCategory}
                onChange={(e) => setCourseCategory(e.target.value)}
                label="Kategori"
              >
                <MenuItem value="photography">Fotografi</MenuItem>
                <MenuItem value="videography">Videografi</MenuItem>
                <MenuItem value="lighting">Lyssetting</MenuItem>
                <MenuItem value="editing">Redigering</MenuItem>
                <MenuItem value="other">Annet</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Nivå</InputLabel>
              <Select
                value={courseLevel}
                onChange={(e) => setCourseLevel(e.target.value)}
                label="Nivå"
              >
                <MenuItem value="beginner">Nybegynner</MenuItem>
                <MenuItem value="intermediate">Mellomnivå</MenuItem>
                <MenuItem value="advanced">Avansert</MenuItem>
                <MenuItem value="expert">Ekspert</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Språk</InputLabel>
              <Select
                value={courseLanguage}
                onChange={(e) => setCourseLanguage(e.target.value)}
                label="Språk"
              >
                <MenuItem value="no">Norsk</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="sv">Svenska</MenuItem>
                <MenuItem value="da">Dansk</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Pris (NOK)"
              type="number"
              value={coursePrice}
              onChange={(e) => setCoursePrice(Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">kr</InputAdornment>,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  '@media (pointer: coarse)': {
                    minHeight: '48px',
                    fontSize: '16px',
                  }
                }
              }}
            />
          </Stack>
          {/* Section 1.1: Course image/thumbnail upload */}
          <Box>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="course-image-upload"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // In a real app, you would upload the file to a server
                  // For now, we'll create a local URL
                  const fileUrl = URL.createObjectURL(file);
                  setCourseImageUrl(fileUrl);
                  showSnackbar(`Bilde valgt: ${file.name}`, 'success');
                }
              }}
            />
            <label htmlFor="course-image-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Last opp Course Bilde
              </Button>
            </label>
          </Box>
          <TextField
            fullWidth
            label="Course Bilde URL"
            value={courseImageUrl}
            onChange={(e) => setCourseImageUrl(e.target.value)}
            placeholder="URL til course bilde"
            helperText="Brukes som course thumbnail (eller last opp fil over)"
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />
          {courseImageUrl && (
            <Box
              component="img"
              src={courseImageUrl}
              alt="Course preview"
              sx={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 1,
                mt: 1,
              }}
              onError={() => {
                setCourseImageUrl('');
                showSnackbar('Kunne ikke laste bilde', 'error');
              }}
            />
          )}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={courseTags}
            onChange={(_, newValue) => setCourseTags(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Legg til tags"
                sx={{
                  '& .MuiInputBase-root': {
                    '@media (pointer: coarse)': {
                      minHeight: '48px',
                      fontSize: '16px',
                    }
                  }
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                  size="small"
                />
              ))
            }
          />
          {/* Instructor Selection */}
          <FormControl fullWidth>
            <InputLabel>Instruktør</InputLabel>
            <Select
              value={courseInstructor}
              onChange={(e) => setCourseInstructor(e.target.value)}
              label="Instruktør"
            >
              <MenuItem value="">Ingen instruktør valgt</MenuItem>
              <MenuItem value="instructor-1">Daniel Qazi</MenuItem>
              <MenuItem value="instructor-2">Jane Doe</MenuItem>
              <MenuItem value="instructor-3">John Smith</MenuItem>
            </Select>
          </FormControl>

          {/* Prerequisites */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={coursePrerequisites}
            onChange={(_, newValue) => setCoursePrerequisites(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Forutsetninger"
                placeholder="Legg til forutsetninger (kurs-ID eller navn)"
                helperText="Liste over kurs eller krav som må fullføres før dette kurset"
                sx={{
                  '& .MuiInputBase-root': {
                    '@media (pointer: coarse)': {
                      minHeight: '48px',
                      fontSize: '16px',
                    }
                  }
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                  size="small"
                />
              ))
            }
          />

          {/* Course Duration */}
          <TextField
            fullWidth
            label="Kurs varighet"
            value={course?.duration || ''}
            onChange={(e) => {
              onCourseUpdate({
                ...course,
                duration: e.target.value,
              });
            }}
            placeholder="HH:MM:SS eller MM:SS"
            helperText="Total varighet for hele kurset"
            sx={{
              '& .MuiInputBase-root': {
                '@media (pointer: coarse)': {
                  minHeight: '48px',
                  fontSize: '16px',
                }
              }
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            }
            label="Offentlig tilgjengelig"
          />
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            fullWidth
            sx={{ 
              mt: 2,
              minHeight: { xs: '48px', sm: '44px', md: '40px' },
              fontSize: { xs: '0.9375rem', sm: '0.875rem' },
              '@media (pointer: coarse)': {
                minHeight: '52px',
                fontSize: '16px',
                padding: '14px 24px',
              }
            }}
          >
            Lagre endringer
          </Button>
        </Stack>
      </Box>
    );
  };

  // Sortable Module Item Component (memoized)
  const SortableModuleItem = memo(({ module }: { module: Module }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: module.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Paper
        ref={setNodeRef}
        style={style}
        sx={{
          p: 2,
          mb: 1,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab' }}
          >
            <DragIndicator />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">{module.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {module.description || 'Ingen beskrivelse'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={`${module.lessons.length} leksjoner`} size="small" />
              {module.isLocked && <Chip label="Låst" size="small" color="warning" />}
            </Stack>
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedModule(module);
              setModuleDialogOpen(true);
            }}
            aria-label={`Rediger modul: ${module.title}`}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setDeleteConfirmDialog({
                open: true,
                type: 'module',
                id: module.id,
                name: module.title,
              });
            }}
            aria-label={`Slett modul: ${module.title}`}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  });

  // Handle drag end for modules (memoized)
  const handleModulesDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setModulesList((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  // Render Modules tab
  const renderModules = () => {
    const filteredModules = useMemo(() => {
      if (!debouncedModuleSearch) return modulesList;
      const query = debouncedModuleSearch.toLowerCase();
      return modulesList.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }, [modulesList, debouncedModuleSearch]);

    return (
      <Box sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 },
        '@media (pointer: coarse)': {
          padding: '16px',
        }
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theming.colors.primary,
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              '@media (pointer: coarse)': {
                fontSize: '1.125rem',
              }
            }}
          >
            Modules
          </Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => {
              const newModule: Module = {
                id: `mod-${Date.now()}`,
                title: '',
                description: '',
                order: modulesList.length,
                lessons: [],
                isLocked: false,
              };
              setSelectedModule(newModule);
              setModuleDialogOpen(true);
            }}
            aria-label="Legg til ny modul"
          >
            Legg til Modul
          </Button>
        </Stack>
        <TextField
          fullWidth
          placeholder="Søk i moduler..."
          value={moduleSearchQuery}
          onChange={(e) => setModuleSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {loading && modulesList.length === 0 ? (
          // Section 3.4: Skeleton loaders for lists
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : filteredModules.length === 0 ? (
          <Alert severity="info">
            {moduleSearchQuery ? 'Ingen moduler funnet' : 'Ingen moduler. Klikk "Legg til Modul" for å opprette en.'}
          </Alert>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModulesDragEnd}
          >
            <SortableContext
              items={filteredModules.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredModules.map((module) => (
                <SortableModuleItem key={module.id} module={module} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Box>
    );
  };

  // Render Lessons tab
  const renderLessons = () => {
    const filteredLessons = useMemo(() => {
      if (!debouncedLessonSearch) return lessonsList;
      const query = debouncedLessonSearch.toLowerCase();
      return lessonsList.filter(l => 
        l.title.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );
    }, [lessonsList, debouncedLessonSearch]);

    const lessonsByModule = useMemo(() => {
      const grouped: Record<string, Lesson[]> = {};
      filteredLessons.forEach(lesson => {
        if (!grouped[lesson.moduleId]) {
          grouped[lesson.moduleId] = [];
        }
        grouped[lesson.moduleId].push(lesson);
      });
      return grouped;
    }, [filteredLessons]);

    const toggleModule = (moduleId: string) => {
      setExpandedModules(prev => {
        const newSet = new Set(prev);
        if (newSet.has(moduleId)) {
          newSet.delete(moduleId);
        } else {
          newSet.add(moduleId);
        }
        return newSet;
      });
    };

    return (
      <Box sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 },
        '@media (pointer: coarse)': {
          padding: '16px',
        }
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theming.colors.primary,
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              '@media (pointer: coarse)': {
                fontSize: '1.125rem',
              }
            }}
          >
            Lessons
          </Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => {
              const newLesson: Lesson = {
                id: `les-${Date.now()}`,
                title: '',
                description: '',
                type: 'video',
                order: lessonsList.length,
                moduleId: modulesList[0]?.id || '',
                isLocked: false,
              };
              setSelectedLesson(newLesson);
              setLessonDialogOpen(true);
            }}
            aria-label="Legg til ny leksjon"
          >
            Legg til Leksjon
          </Button>
        </Stack>
        <TextField
          fullWidth
          placeholder="Søk i leksjoner..."
          value={lessonSearchQuery}
          onChange={(e) => setLessonSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {loading && lessonsList.length === 0 ? (
          // Section 3.4: Skeleton loaders for lists
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : Object.keys(lessonsByModule).length === 0 ? (
          <Alert severity="info">
            {lessonSearchQuery ? 'Ingen leksjoner funnet' : 'Ingen leksjoner. Klikk "Legg til Leksjon" for å opprette en.'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {modulesList.map(module => {
              const moduleLessons = lessonsByModule[module.id] || [];
              if (moduleLessons.length === 0) return null;
              const isExpanded = expandedModules.has(module.id);
              
              return (
                <Accordion
                  key={module.id}
                  expanded={isExpanded}
                  onChange={() => toggleModule(module.id)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                      <Typography variant="subtitle1">{module.title}</Typography>
                      <Chip label={`${moduleLessons.length} leksjoner`} size="small" />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {moduleLessons.map(lesson => (
                        <Paper key={lesson.id} sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2">{lesson.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {lesson.description || 'Ingen beskrivelse'}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip label={lesson.type} size="small" />
                                {lesson.duration && <Chip label={lesson.duration} size="small" />}
                              </Stack>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedLesson(lesson);
                                setLessonDialogOpen(true);
                              }}
                              aria-label={`Rediger leksjon: ${lesson.title}`}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteConfirmDialog({
                                  open: true,
                                  type: 'lesson',
                                  id: lesson.id,
                                  name: lesson.title,
                                });
                              }}
                              aria-label={`Slett leksjon: ${lesson.title}`}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  };

  // Sortable Resource Item Component (memoized)
  const SortableResourceItem = memo(({ resource }: { resource: Resource }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: resource.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const getResourceIcon = () => {
      switch (resource.type) {
        case 'file':
          return <InsertDriveFile />;
        case 'link':
          return <LinkIcon />;
        case 'document':
          return <Article />;
        default:
          return <Description />;
      }
    };

    return (
      <Paper
        ref={setNodeRef}
        style={style}
        sx={{
          p: 2,
          mb: 1,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab' }}
            aria-label={`Dra for å endre rekkefølge: ${resource.name}`}
          >
            <DragIndicator />
          </IconButton>
          <ListItemIcon>
            {getResourceIcon()}
          </ListItemIcon>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">{resource.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {resource.description || 'Ingen beskrivelse'}
            </Typography>
            {resource.category && (
              <Chip label={resource.category} size="small" sx={{ mt: 0.5 }} />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedResource(resource);
              setResourceDialogOpen(true);
            }}
            aria-label={`Rediger ressurs: ${resource.name}`}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setDeleteConfirmDialog({
                open: true,
                type: 'resource',
                id: resource.id,
                name: resource.name,
              });
            }}
            aria-label={`Slett ressurs: ${resource.name}`}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  });

  // Handle drag end for resources (memoized)
  const handleResourcesDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setResourcesList((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  // Render Resources tab
  const renderResources = () => {
    const filteredResources = useMemo(() => {
      if (!debouncedResourceSearch) return resourcesList;
      const query = debouncedResourceSearch.toLowerCase();
      return resourcesList.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query)
      );
    }, [resourcesList, debouncedResourceSearch]);

    return (
      <Box sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 },
        '@media (pointer: coarse)': {
          padding: '16px',
        }
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theming.colors.primary,
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              '@media (pointer: coarse)': {
                fontSize: '1.125rem',
              }
            }}
          >
            Resources
          </Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => {
              const newResource: Resource = {
                id: `res-${Date.now()}`,
                name: '',
                type: 'file',
                url: '',
                description: '',
                order: resourcesList.length,
              };
              setSelectedResource(newResource);
              setResourceDialogOpen(true);
            }}
            aria-label="Legg til ny ressurs"
          >
            Legg til Ressurs
          </Button>
        </Stack>
        <TextField
          fullWidth
          placeholder="Søk i ressurser..."
          value={resourceSearchQuery}
          onChange={(e) => setResourceSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {loading && resourcesList.length === 0 ? (
          // Section 3.4: Skeleton loaders for lists
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : filteredResources.length === 0 ? (
          <Alert severity="info">
            {resourceSearchQuery ? 'Ingen ressurser funnet' : 'Ingen ressurser. Klikk "Legg til Ressurs" for å opprette en.'}
          </Alert>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleResourcesDragEnd}
          >
            <SortableContext
              items={filteredResources.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredResources.map((resource) => (
                <SortableResourceItem key={resource.id} resource={resource} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Box>
    );
  };

  // Render tools
  const renderTools = () => (
    <Box>
      <ListItemButton onClick={() => toggleSection('tools')}>
        <ListItemIcon>
          <Settings />
        </ListItemIcon>
        <ListItemText primary="Tools" secondary="Export, import, and utilities" />
        {expandedSections.tools ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedSections.tools} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
          <Stack spacing={1}>
            <Button
              size="small"
              startIcon={<Download />}
              onClick={() => onExport(course)}
              fullWidth
            >
              Export Course
            </Button>
            <Button size="small" startIcon={<Upload />} onClick={() => onImport(course)} fullWidth>
              Import Course
            </Button>
            <Button
              size="small"
              startIcon={<Backup />}
              onClick={() => autoSave.forceSave()}
              fullWidth
            >
              Backup Now
            </Button>
            <Button
              size="small"
              startIcon={<Restore />}
              onClick={() => {
                const backup = autoSave.restoreFromBackup('course');
                if (backup) {
                  onCourseUpdate(backup);
                }
              }}
              fullWidth
            >
              Restore Backup
            </Button>
            <Divider />
            <Button
              size="small"
              startIcon={<Delete />}
              onClick={() => setShowDeleteDialog(true)}
              fullWidth
              color="error"
            >
              Delete Course
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  // Get help panel container to constrain drawer
  const helpPanel = typeof document !== 'undefined' ? document.getElementById('helpPanel') : null;
  
  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        container={helpPanel || undefined}
        ModalProps={{
          style: { position: 'absolute' },
          disablePortal: false,
          'aria-labelledby': 'course-creator-sidebar-title',
          'aria-describedby': 'course-creator-sidebar-description',
        }}
        sx={{
          position: 'absolute',
          width: { xs: '100%', sm: width, md: width },
          maxWidth: { xs: '100%', sm: '90vw', md: width },
          flexShrink: 0,
          zIndex: (theme) => theme.zIndex.drawer,
          right: 0,
          left: 'auto',
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: width, md: width },
            maxWidth: { xs: '100%', sm: '90vw', md: width },
            boxSizing: 'border-box',
            backgroundColor: 'background.paper',
            position: 'absolute',
            height: '100%',
            top: 0,
            right: 0,
            left: 'auto',
            // Touch-friendly on iPad
            '@media (pointer: coarse)': {
              paddingBottom: 'env(safe-area-inset-bottom)',
            },
          },
          '& .MuiBackdrop-root': {
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            // Less intrusive on touch devices
            '@media (pointer: coarse)': {
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            },
          }
        }}
      >
        <Box sx={{ 
          p: { xs: 1.5, sm: 2, md: 2 },
          borderBottom: 1, 
          borderColor: 'divider',
          // Touch-friendly header
          '@media (pointer: coarse)': {
            padding: '16px',
            minHeight: '64px',
          }
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography 
                id="course-creator-sidebar-title"
                variant="h6" 
                sx={{ 
                  color: theming.colors.primary,
                  fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  '@media (pointer: coarse)': {
                    fontSize: '1.125rem',
                  }
                }}
              >
                Course Creator
              </Typography>
              <Typography 
                id="course-creator-sidebar-description"
                variant="caption" 
                sx={{ display: 'none' }}
              >
                Sidebar for creating and editing course content, including video details, modules, lessons, and resources
              </Typography>

              {/* Feature Analytics Display */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 0.5}}
              >
                <Typography variant="caption" color="text.secondary">
                  Features: {features.getFeatureAnalytics().enabledFeatures}/
                  {features.getFeatureAnalytics().totalFeatures}
                </Typography>
                <Chip
                  label={`${Math.round(features.getFeatureAnalytics().featureAdoptionRate * 100)}%`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '8px', height: 16 }}
                />
              </Box>

              {/* Feature Access Status Indicators */}
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {featureAccessSummary.map((feature) => (
                  <Tooltip key={feature.key} title={`${feature.label}: ${feature.access.hasAccess ? 'Enabled' : feature.access.reason || 'Disabled'}`}>
                    <Badge
                      variant="dot"
                      color={feature.access.hasAccess ? 'success' : 'error'}
                      sx={{ '& .MuiBadge-badge': { width: 6, height: 6, minWidth: 6 } }}
                    >
                      <Avatar
                        sx={{ width: 20, height: 20, bgcolor: feature.access.hasAccess ? 'action.selected' : 'action.disabledBackground', fontSize: '0.6rem' }}
                      >
                        {feature.icon}
                      </Avatar>
                    </Badge>
                  </Tooltip>
                ))}
              </Stack>
            </Box>
            <IconButton 
              onClick={onClose} 
              size="small"
              aria-label="Lukk Course Creator sidebar"
              sx={{
                // Touch-friendly close button
                '@media (pointer: coarse)': {
                  minWidth: '44px',
                  minHeight: '44px',
                  padding: '12px',
                }
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Navigation Tabs */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2, md: 2 }, 
            flexShrink: 0,
            '@media (pointer: coarse)': {
              padding: '16px',
            }
          }}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              gutterBottom
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '@media (pointer: coarse)': {
                  fontSize: '0.875rem',
                }
              }}
            >
              Navigation
            </Typography>
            <List 
              dense={false}
              role="tablist"
              aria-label="Course creator navigation tabs"
            >
              {SIDEBAR_TABS.map((tab) => (
                <ListItem key={tab.id} disablePadding>
                  <ListItemButton
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`tabpanel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    selected={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTabChange(tab.id);
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const nextTab = SIDEBAR_TABS.find(t => t.id === tab.id + 1) || SIDEBAR_TABS[0];
                        onTabChange(nextTab.id);
                      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prevTab = SIDEBAR_TABS.find(t => t.id === tab.id - 1) || SIDEBAR_TABS[SIDEBAR_TABS.length - 1];
                        onTabChange(prevTab.id);
                      }
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      minHeight: { xs: '48px', sm: '44px', md: '40px' },
                      padding: { xs: '12px 16px', sm: '10px 16px', md: '8px 16px' },
                      // Touch-friendly on iPad
                      '@media (pointer: coarse)': {
                        minHeight: '52px',
                        padding: '14px 16px',
                        fontSize: '15px',
                      },
                      '&.Mui-selected': {
                        backgroundColor: `${tab.color}20`,
                        '& .MuiListItemIcon-root': {
                          color: tab.color,
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: { xs: 40, sm: 36, md: 36 },
                      '@media (pointer: coarse)': {
                        minWidth: 44,
                      }
                    }}>
                      {tab.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={tab.label}
                      primaryTypographyProps={{ 
                        variant: 'body2',
                        sx: {
                          fontSize: { xs: '0.875rem', sm: '0.875rem', md: '0.8125rem' },
                          '@media (pointer: coarse)': {
                            fontSize: '0.9375rem',
                          }
                        }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider />

          {/* Tab Content - Lazy loaded for performance */}
          <Box 
            sx={{ flex: 1, overflow: 'auto' }}
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {/* Live region for screen reader announcements */}
            <Box
              role="status"
              aria-live="polite"
              aria-atomic="true"
              sx={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              {SIDEBAR_TABS.find(t => t.id === activeTab)?.label} tab selected
            </Box>
            {activeTab === 0 && (
              <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
                {renderVideoDetails()}
              </Suspense>
            )}
            {activeTab === 1 && (
              <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
                {renderCourseDetails()}
              </Suspense>
            )}
            {activeTab === 2 && (
              <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
                {renderModules()}
              </Suspense>
            )}
            {activeTab === 3 && (
              <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
                {renderLessons()}
              </Suspense>
            )}
            {activeTab === 4 && (
              <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
                {renderResources()}
              </Suspense>
            )}
            {activeTab !== 0 && activeTab !== 1 && activeTab !== 2 && activeTab !== 3 && activeTab !== 4 && (
              <>
                <Divider />

          {/* Auto-Save Status */}
          {renderAutoSaveStatus()}

          <Divider />

          {/* Course Status */}
          {renderCourseStatus()}

          <Divider />

          {/* Versions */}
          {renderVersions()}

          <Divider />

          {/* Analytics */}
          {renderAnalytics()}

          <Divider />

                {/* Tools */}
                {renderTools()}
              </>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Version Creation Dialog */}
      <Dialog
        open={showVersionDialog}
        onClose={() => setShowVersionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Version</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Version Title"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="e.g., Added video content"
            />
            <TextField
              fullWidth
              label="Description"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Describe the changes in this version"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateVersion} disabled={!versionTitle.trim()}>
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this course? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDelete(course);
              setShowDeleteDialog(false);
            }}
          >
            Delete Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lower Third Dialog */}
      <Dialog
        open={lowerThirdDialogOpen}
        onClose={() => {
          setLowerThirdDialogOpen(false);
          setSelectedLowerThird(null);
        }}
        maxWidth="md"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          {selectedLowerThird && !selectedLowerThird.id.startsWith('lt-') ? 'Rediger Lower Third' : 'Ny Lower Third'}
        </DialogTitle>
        <DialogContent>
          {selectedLowerThird ? (
            <LowerThirdEditor
              lowerThird={selectedLowerThird}
              videoDuration={getVideoDuration()}
              onChange={setSelectedLowerThird}
              isNew={selectedLowerThird.id.startsWith('lt-')}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Initialiserer lower third...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLowerThirdDialogOpen(false);
            setSelectedLowerThird(null);
          }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={() => {
            if (selectedLowerThird) {
              // Check for conflicts
              const conflicts = checkLowerThirdConflicts(selectedLowerThird, selectedLowerThird.id.startsWith('lt-') ? undefined : selectedLowerThird.id);
              if (conflicts.length > 0) {
                const conflictNames = conflicts.map(c => c.mainText).join(', ');
                if (!confirm(`Advarsel: Denne lower third overlapper med: ${conflictNames}. Vil du fortsette?`)) {
                  return;
                }
              }
              
              if (selectedLowerThird.id.startsWith('lt-')) {
                // New lower third
                setLowerThirdsList(prev => [...prev, selectedLowerThird]);
              } else {
                // Update existing
                setLowerThirdsList(prev => prev.map(lt => 
                  lt.id === selectedLowerThird.id ? selectedLowerThird : lt
                ));
              }
              setLowerThirdDialogOpen(false);
              setSelectedLowerThird(null);
              showSnackbar('Lower third lagret', 'success');
            }
            }}
            disabled={!selectedLowerThird?.mainText}
          >
            Lagre
          </Button>
          <Button
            variant="outlined"
            startIcon={<Bookmark />}
            onClick={() => {
              if (selectedLowerThird) {
                saveTemplate(selectedLowerThird);
              }
            }}
            disabled={!selectedLowerThird?.mainText}
          >
            Lagre som template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lower Third Templates Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>Lower Third Templates</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {lowerThirdTemplates.length === 0 ? (
              <Alert severity="info">Ingen templates lagret. Lagre en lower third som template for å gjenbruke den.</Alert>
            ) : (
              lowerThirdTemplates.map((template) => (
                <Paper key={template.id} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">{template.mainText}</Typography>
                      {template.subText && (
                        <Typography variant="caption" color="text.secondary">
                          {template.subText}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      onClick={() => {
                        const newLowerThird: LowerThird = {
                          ...template,
                          id: `lt-${Date.now()}`,
                          startTime: 0,
                          endTime: 5,
                          order: lowerThirdsList.length,
                          videoId: course?.id || '',
                        };
                        setSelectedLowerThird(newLowerThird);
                        setLowerThirdDialogOpen(true);
                        setShowTemplateDialog(false);
                      }}
                    >
                      Bruk
                    </Button>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        const updatedTemplates = lowerThirdTemplates.filter(t => t.id !== template.id);
                        setLowerThirdTemplates(updatedTemplates);
                        try {
                          await lowerThirdTemplatesService.saveTemplates(updatedTemplates as any);
                        } catch (error) {
                          console.warn('Failed to update templates:', error);
                        }
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Lukk</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={showBulkEditDialog}
        onClose={() => setShowBulkEditDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          Bulk Rediger {bulkEditType === 'lowerThirds' ? 'Lower Thirds' : 'Chapters'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              {bulkEditType === 'lowerThirds' 
                ? `${selectedLowerThirds.size} lower thirds valgt`
                : `${selectedChapters.size} chapters valgt`}
            </Alert>
            {bulkEditType === 'lowerThirds' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Posisjon</InputLabel>
                  <Select
                    label="Posisjon"
                    onChange={(e) => {
                      setLowerThirdsList(prev => prev.map(lt => 
                        selectedLowerThirds.has(lt.id)
                          ? { ...lt, position: e.target.value as 'bottom-left' | 'bottom-center' | 'bottom-right' }
                          : lt
                      ));
                    }}
                  >
                    <MenuItem value="bottom-left">Nederst venstre</MenuItem>
                    <MenuItem value="bottom-center">Nederst senter</MenuItem>
                    <MenuItem value="bottom-right">Nederst høyre</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Font størrelse"
                  type="number"
                  onChange={(e) => {
                    const fontSize = Number(e.target.value);
                    setLowerThirdsList(prev => prev.map(lt => 
                      selectedLowerThirds.has(lt.id)
                        ? { ...lt, style: { ...lt.style, fontSize } }
                        : lt
                    ));
                  }}
                />
              </>
            )}
            {bulkEditType === 'chapters' && (
              <TextField
                fullWidth
                label="Beskrivelse (legges til alle valgte)"
                onChange={(e) => {
                  setChaptersList(prev => prev.map(ch => 
                    selectedChapters.has(ch.id)
                      ? { ...ch, description: e.target.value }
                      : ch
                  ));
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowBulkEditDialog(false);
            setSelectedLowerThirds(new Set());
            setSelectedChapters(new Set());
          }}>
            Lukk
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              showSnackbar('Bulk endringer lagret', 'success');
              setShowBulkEditDialog(false);
              setSelectedLowerThirds(new Set());
              setSelectedChapters(new Set());
            }}
          >
            Lagre endringer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chapter Dialog */}
      <Dialog
        open={chapterDialogOpen}
        onClose={() => {
          setChapterDialogOpen(false);
          setSelectedChapter(null);
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          {selectedChapter ? 'Rediger Kapitel' : 'Nytt Kapitel'}
        </DialogTitle>
        <DialogContent>
          {selectedChapter ? (
            <ChapterEditor
              chapter={selectedChapter}
              videoDuration={getVideoDuration()}
              chapters={chaptersList}
              onChange={setSelectedChapter}
              isNew={selectedChapter.id.startsWith('ch-')}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Initialiserer kapitel...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setChapterDialogOpen(false);
            setSelectedChapter(null);
          }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedChapter) {
                if (selectedChapter.id.startsWith('ch-')) {
                  // New chapter
                  setChaptersList(prev => [...prev, selectedChapter]);
                } else {
                  // Update existing
                  setChaptersList(prev => prev.map(ch => 
                    ch.id === selectedChapter.id ? selectedChapter : ch
                  ));
                }
                setChapterDialogOpen(false);
                setSelectedChapter(null);
                showSnackbar('Kapitel lagret', 'success');
              }
            }}
            disabled={!selectedChapter?.title}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Module Dialog */}
      <Dialog
        open={moduleDialogOpen}
        onClose={() => {
          setModuleDialogOpen(false);
          setSelectedModule(null);
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          {selectedModule ? 'Rediger Modul' : 'Ny Modul'}
        </DialogTitle>
        <DialogContent>
          {selectedModule ? (
            <ModuleEditor
              module={selectedModule}
              onChange={setSelectedModule}
              isNew={selectedModule.id.startsWith('mod-')}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Initialiserer modul...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setModuleDialogOpen(false);
            setSelectedModule(null);
          }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedModule) {
                if (selectedModule.id.startsWith('mod-')) {
                  // New module
                  setModulesList(prev => [...prev, selectedModule]);
                } else {
                  // Update existing
                  setModulesList(prev => prev.map(m => 
                    m.id === selectedModule.id ? selectedModule : m
                  ));
                }
                setModuleDialogOpen(false);
                setSelectedModule(null);
                showSnackbar('Modul lagret', 'success');
              }
            }}
            disabled={!selectedModule?.title}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog
        open={lessonDialogOpen}
        onClose={() => {
          setLessonDialogOpen(false);
          setSelectedLesson(null);
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          {selectedLesson ? 'Rediger Leksjon' : 'Ny Leksjon'}
        </DialogTitle>
        <DialogContent>
          {selectedLesson ? (
            <LessonEditor
              lesson={selectedLesson}
              modules={modulesList}
              onChange={setSelectedLesson}
              isNew={selectedLesson.id.startsWith('les-')}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Initialiserer leksjon...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLessonDialogOpen(false);
            setSelectedLesson(null);
          }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedLesson) {
                if (selectedLesson.id.startsWith('les-')) {
                  // New lesson
                  setLessonsList(prev => [...prev, selectedLesson]);
                } else {
                  // Update existing
                  setLessonsList(prev => prev.map(l => 
                    l.id === selectedLesson.id ? selectedLesson : l
                  ));
                }
                setLessonDialogOpen(false);
                setSelectedLesson(null);
                showSnackbar('Leksjon lagret', 'success');
              }
            }}
            disabled={!selectedLesson?.title || !selectedLesson?.moduleId}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog
        open={resourceDialogOpen}
        onClose={() => {
          setResourceDialogOpen(false);
          setSelectedResource(null);
        }}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>
          {selectedResource ? 'Rediger Ressurs' : 'Ny Ressurs'}
        </DialogTitle>
        <DialogContent>
          {selectedResource ? (
            <ResourceEditor
              resource={selectedResource}
              onChange={setSelectedResource}
              onFileUpload={async (file) => {
                setLoading(true);
                try {
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
                  const fileUrl = URL.createObjectURL(file);
                  setSelectedResource({
                    ...selectedResource,
                    url: fileUrl,
                    size: file.size,
                    name: selectedResource.name || file.name,
                  });
                  showSnackbar(`Fil lastet opp: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'success');
                } catch (error) {
                  showSnackbar('Feil ved opplasting av fil', 'error');
                  console.error('File upload error:', error);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
              isNew={selectedResource.id.startsWith('res-')}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Initialiserer ressurs...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setResourceDialogOpen(false);
            setSelectedResource(null);
          }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedResource) {
                if (selectedResource.id.startsWith('res-')) {
                  // New resource
                  setResourcesList(prev => [...prev, selectedResource]);
                } else {
                  // Update existing
                  setResourcesList(prev => prev.map(r => 
                    r.id === selectedResource.id ? selectedResource : r
                  ));
                }
                setResourceDialogOpen(false);
                setSelectedResource(null);
                showSnackbar('Ressurs lagret', 'success');
              }
            }}
            disabled={!selectedResource?.name || !selectedResource?.url}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Section 3.5: Undo Snackbar for deleted items */}
      {deletedItems.length > 0 && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={() => setDeletedItems([])}
          message={`${deletedItems.length} element(er) slettet`}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                // Restore all deleted items
                deletedItems.forEach(({ type, item }) => {
                  if (type === 'module') {
                    setModulesList(prev => [...prev, item as Module]);
                  } else if (type === 'lesson') {
                    setLessonsList(prev => [...prev, item as Lesson]);
                  } else if (type === 'resource') {
                    setResourcesList(prev => [...prev, item as Resource]);
                  } else if (type === 'lowerThird') {
                    setLowerThirdsList(prev => [...prev, item as LowerThird]);
                  } else if (type === 'chapter') {
                    setChaptersList(prev => [...prev, item as VideoChapter]);
                  }
                });
                setDeletedItems([]);
                showSnackbar('Alle elementer gjenopprettet', 'success');
              }}
            >
              Angre
            </Button>
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog?.open || false}
        onClose={() => setDeleteConfirmDialog(null)}
        sx={{
          zIndex: 100002,
          '& .MuiBackdrop-root': {
            zIndex: 100001,
          },
          '& .MuiDialog-container': {
            zIndex: 100002,
          },
        }}
        PaperProps={{
          sx: {
            zIndex: 100002,
          }
        }}
      >
        <DialogTitle>Bekreft sletting</DialogTitle>
        <DialogContent>
          <Typography>
            Er du sikker på at du vil slette "{deleteConfirmDialog?.name}"?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Du kan angre denne handlingen i 6 sekunder.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(null)}>
            Avbryt
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteConfirmDialog) {
                setLoading(true);
                try {
                  // Section 3.5: Store deleted item for undo functionality
                  let deletedItem: Module | Lesson | Resource | LowerThird | VideoChapter | null = null;
                  
                  switch (deleteConfirmDialog.type) {
                    case 'lowerThird': {
                      const item = lowerThirdsList.find(lt => lt.id === deleteConfirmDialog.id);
                      if (item) {
                        deletedItem = item;
                        setLowerThirdsList(prev => prev.filter(lt => lt.id !== deleteConfirmDialog.id));
                        setDeletedItems(prev => [...prev, { type: 'lowerThird', item, timestamp: Date.now() }]);
                      }
                      showSnackbar('Lower third slettet', 'success');
                      break;
                    }
                    case 'chapter': {
                      const item = chaptersList.find(ch => ch.id === deleteConfirmDialog.id);
                      if (item) {
                        deletedItem = item;
                        setChaptersList(prev => prev.filter(ch => ch.id !== deleteConfirmDialog.id));
                        setDeletedItems(prev => [...prev, { type: 'chapter', item, timestamp: Date.now() }]);
                      }
                      showSnackbar('Kapitel slettet', 'success');
                      break;
                    }
                    case 'module': {
                      const item = modulesList.find(m => m.id === deleteConfirmDialog.id);
                      if (item) {
                        deletedItem = item;
                        setModulesList(prev => prev.filter(m => m.id !== deleteConfirmDialog.id));
                        setDeletedItems(prev => [...prev, { type: 'module', item, timestamp: Date.now() }]);
                      }
                      showSnackbar('Modul slettet', 'success');
                      break;
                    }
                    case 'lesson': {
                      const item = lessonsList.find(l => l.id === deleteConfirmDialog.id);
                      if (item) {
                        deletedItem = item;
                        setLessonsList(prev => prev.filter(l => l.id !== deleteConfirmDialog.id));
                        setDeletedItems(prev => [...prev, { type: 'lesson', item, timestamp: Date.now() }]);
                      }
                      showSnackbar('Leksjon slettet', 'success');
                      break;
                    }
                    case 'resource': {
                      const item = resourcesList.find(r => r.id === deleteConfirmDialog.id);
                      if (item) {
                        deletedItem = item;
                        setResourcesList(prev => prev.filter(r => r.id !== deleteConfirmDialog.id));
                        setDeletedItems(prev => [...prev, { type: 'resource', item, timestamp: Date.now() }]);
                      }
                      showSnackbar('Ressurs slettet', 'success');
                      break;
                    }
                  }
                  // Log deleted item for debugging/audit trail
                  if (deletedItem) {
                    debugging.log('Item deleted', { type: deleteConfirmDialog.type, id: deleteConfirmDialog.id, itemName: deleteConfirmDialog.name });
                  }
                } catch (error) {
                  showSnackbar('Feil ved sletting', 'error');
                } finally {
                  setLoading(false);
                  setDeleteConfirmDialog(null);
                }
              }
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Slett'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => dispatchUI({ type: 'SET_EXPORT_DIALOG', payload: false })}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 100002 }}
      >
        <DialogTitle>Export Course Data</DialogTitle>
        <DialogContent>
          <Card sx={{ mb: 2, mt: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Export Quality</Typography>
              <Slider
                defaultValue={80}
                valueLabelDisplay="auto"
                step={10}
                marks
                min={10}
                max={100}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Adjust export quality for media assets
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<Download />} onClick={() => {
                showSnackbar('Course data exported', 'success');
                dispatchUI({ type: 'SET_EXPORT_DIALOG', payload: false });
              }}>
                Export JSON
              </Button>
              <Button size="small" startIcon={<ContentCopy />} onClick={() => {
                showSnackbar('Course data copied to clipboard', 'success');
              }}>
                Copy to Clipboard
              </Button>
            </CardActions>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatchUI({ type: 'SET_EXPORT_DIALOG', payload: false })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Version Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        {contextMenu && (
          <MenuList>
            <MenuItem onClick={() => handleRestoreVersion(contextMenu.version)}>
              <ListItemIcon>
                <Restore fontSize="small" />
              </ListItemIcon>
              <ListItemText>Restore Version</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => setContextMenu(null)}>
              <ListItemIcon>
                <ContentCopy fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate Version</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => setContextMenu(null)}>
              <ListItemIcon>
                <Download fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export Version</ListItemText>
            </MenuItem>
          </MenuList>
        )}
      </Menu>
    </>
	  );
	}

// Section 7.1: Error Boundary Component for graceful error handling
class CourseCreatorErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CourseCreatorSidebar Error:', error, errorInfo);
    // In production, you would send this to an error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Noe gikk galt
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {this.state.error?.message || 'En uventet feil oppstod i Course Creator Sidebar'}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Prøv igjen
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Wrap component with error boundary for graceful error handling
const CourseCreatorSidebarWithErrorBoundary = (props: CourseCreatorSidebarProps) => (
  <CourseCreatorErrorBoundary>
    <CourseCreatorSidebar {...props} />
  </CourseCreatorErrorBoundary>
);

export default withUniversalIntegration(CourseCreatorSidebarWithErrorBoundary, {
  componentId: 'course-creator-sidebar',
  componentName: 'Course Creator Sidebar',
  componentType: 'widget',
  componentCategory: 'academy',
  featureIds: [
    'course-creation',
    'course-management',
    'lesson-creation',
    'module-management',
    'content-management',
  ],
});

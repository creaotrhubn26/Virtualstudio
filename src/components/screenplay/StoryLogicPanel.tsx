/**
 * StoryLogicPanel.tsx
 * 
 * Story Logic System - A structured approach to validate and develop story foundations
 * before writing begins.
 * 
 * Three phases:
 * 1. Concept - Validate the idea before any writing
 * 2. Logline - Define story DNA
 * 3. Theme & Character Intent - Give the story meaning
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Tooltip,
  IconButton,
  Divider,
  Card,
  CardContent,
  Fade,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Create as CreateIcon,
  Psychology as PsychologyIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
  TipsAndUpdates as TipsIcon,
  Star as StarIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { storyLogicService } from '../../services/storyLogicService';
// ============================================================================
// Types & Interfaces
// ============================================================================

interface ConceptData {
  corePremise: string;
  genre: string;
  subGenre: string;
  tone: string[];
  targetAudience: string;
  audienceAge: string;
  whyNow: string;
  uniqueAngle: string;
  marketComparables: string;
}

interface LoglineData {
  protagonist: string;
  protagonistTrait: string;
  goal: string;
  antagonisticForce: string;
  stakes: string;
  fullLogline: string;
  loglineScore: number;
}

interface ThemeData {
  centralTheme: string;
  themeStatement: string;
  protagonistFlaw: string;
  flawOrigin: string;
  whatMustChange: string;
  transformationArc: string;
  emotionalJourney: string[];
  moralArgument: string;
}

interface StoryLogicState {
  concept: ConceptData;
  logline: LoglineData;
  theme: ThemeData;
  currentPhase: number;
  phaseStatus: {
    concept: 'incomplete' | 'weak' | 'ready';
    logline: 'incomplete' | 'weak' | 'ready';
    theme: 'incomplete' | 'weak' | 'ready';
  };
  lastSaved: string | null;
  isLocked: boolean;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GENRES = [
  'Drama', 'Comedy', 'Action', 'Thriller', 'Horror', 'Sci-Fi', 
  'Fantasy', 'Romance', 'Mystery', 'Crime', 'Documentary', 
  'Animation', 'Musical', 'Western', 'War', 'Biography'
];

const SUB_GENRES = {
  'Drama': ['Family Drama', 'Legal Drama', 'Medical Drama', 'Political Drama', 'Sports Drama'],
  'Comedy': ['Romantic Comedy', 'Dark Comedy', 'Satire', 'Slapstick', 'Parody'],
  'Action': ['Martial Arts', 'Spy Action', 'Heist', 'Disaster', 'Superhero'],
  'Thriller': ['Psychological', 'Political', 'Legal', 'Techno', 'Conspiracy'],
  'Horror': ['Supernatural', 'Slasher', 'Psychological', 'Body Horror', 'Found Footage'],
  'Sci-Fi': ['Space Opera', 'Cyberpunk', 'Post-Apocalyptic', 'Time Travel', 'Alien Invasion'],
  'Fantasy': ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'Fairy Tale', 'Mythological'],
  'Romance': ['Period Romance', 'Contemporary', 'Paranormal Romance', 'Tragic Romance'],
  'Mystery': ['Whodunit', 'Noir', 'Cozy Mystery', 'Procedural'],
  'Crime': ['Gangster', 'Heist', 'True Crime', 'Neo-Noir'],
};

const TONES = [
  'Dark', 'Light', 'Serious', 'Comedic', 'Suspenseful', 'Hopeful',
  'Melancholic', 'Satirical', 'Gritty', 'Whimsical', 'Intense',
  'Romantic', 'Cynical', 'Inspirational', 'Surreal', 'Nostalgic'
];

const AUDIENCE_AGES = [
  'Children (Under 12)', 'Teen (13-17)', 'Young Adult (18-25)',
  'Adult (26-45)', 'Mature Adult (46-65)', 'Senior (65+)', 'All Ages'
];

const EMOTIONAL_JOURNEY_BEATS = [
  'Hope', 'Fear', 'Joy', 'Sadness', 'Anger', 'Surprise', 
  'Disgust', 'Trust', 'Anticipation', 'Love', 'Shame', 
  'Pride', 'Guilt', 'Relief', 'Despair', 'Triumph'
];

// TROLL Demo Data for Story Logic
const TROLL_DEMO_STATE: StoryLogicState = {
  concept: {
    corePremise: 'An ancient troll awakens in modern Norway, forcing a paleontologist to bridge the gap between myth and reality before the military destroys the last remnant of Norse legend.',
    genre: 'Fantasy',
    subGenre: 'Monster/Creature Feature',
    tone: ['Epic', 'Emotional', 'Suspenseful', 'Folkloric'],
    targetAudience: 'Families and fantasy enthusiasts who love Nordic mythology',
    audienceAge: '12+',
    whyNow: 'Rising interest in Scandinavian mythology (Vikings, God of War), climate anxiety awakening dormant threats, and the universal theme of humanity\'s relationship with nature and forgotten traditions.',
    uniqueAngle: 'Unlike typical monster movies where creatures are purely antagonistic, the troll is a sympathetic being seeking home - making the real conflict about preservation vs. destruction of cultural heritage.',
    marketComparables: 'Godzilla (2014) meets The Water Horse, with themes similar to Princess Mononoke. Norwegian kaiju with heart.',
  },
  logline: {
    protagonist: 'Nora Tidemann',
    protagonistTrait: 'brilliant but skeptical',
    goal: 'must protect and guide the ancient troll back to Dovre',
    antagonisticForce: 'a military determined to destroy it and her own disbelief in folklore',
    stakes: 'lose the last living connection to Norway\'s mythological past forever',
    fullLogline: 'When a brilliant but skeptical paleontologist Nora Tidemann must protect and guide the ancient troll back to Dovre, she faces a military determined to destroy it and her own disbelief in folklore—or else lose the last living connection to Norway\'s mythological past forever.',
    loglineScore: 85,
  },
  theme: {
    centralTheme: 'Reconnecting with cultural heritage and the power of belief',
    themeStatement: 'Only by embracing the wisdom of our ancestors can we find our way home.',
    protagonistFlaw: 'Rational skepticism that blinds her to wonder and her estranged relationship with her father who believed in folklore',
    flawOrigin: 'Nora rejected her father\'s stories about trolls as a child, choosing science over tradition, leading to years of distance between them.',
    whatMustChange: 'She must reconcile scientific rationalism with folkloric wisdom, and heal her relationship with her father before it\'s too late.',
    transformationArc: 'From dismissive skeptic who mocks tradition → to reluctant believer who witnesses the impossible → to active protector who bridges past and present',
    emotionalJourney: ['Skepticism', 'Fear', 'Wonder', 'Determination', 'Grief', 'Hope', 'Triumph'],
    moralArgument: 'The film argues that progress without respect for the past leads to destruction, while embracing our heritage gives us the wisdom to face the future.',
  },
  currentPhase: 2,
  phaseStatus: {
    concept: 'ready',
    logline: 'ready',
    theme: 'ready',
  },
  lastSaved: new Date().toISOString(),
  isLocked: false,
};

const DEFAULT_STATE: StoryLogicState = {
  concept: {
    corePremise: '',
    genre: '',
    subGenre: '',
    tone: [],
    targetAudience: '',
    audienceAge: '',
    whyNow: '',
    uniqueAngle: '',
    marketComparables: '',
  },
  logline: {
    protagonist: '',
    protagonistTrait: '',
    goal: '',
    antagonisticForce: '',
    stakes: '',
    fullLogline: '',
    loglineScore: 0,
  },
  theme: {
    centralTheme: '',
    themeStatement: '',
    protagonistFlaw: '',
    flawOrigin: '',
    whatMustChange: '',
    transformationArc: '',
    emotionalJourney: [],
    moralArgument: '',
  },
  currentPhase: 0,
  phaseStatus: {
    concept: 'incomplete',
    logline: 'incomplete',
    theme: 'incomplete',
  },
  lastSaved: null,
  isLocked: false,
};

// ============================================================================
// Validation Functions
// ============================================================================

function validateConcept(concept: ConceptData): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 9;

  // Core premise
  if (concept.corePremise.length > 20) {
    score += 1;
    if (concept.corePremise.length < 50) {
      suggestions.push('Expand your core premise to capture the full scope of your story.');
    }
  } else {
    warnings.push('Core premise is too short or missing.');
  }

  // Genre
  if (concept.genre) {
    score += 1;
  } else {
    warnings.push('Select a primary genre.');
  }

  // Tone
  if (concept.tone.length > 0) {
    score += 1;
    if (concept.tone.length > 3) {
      suggestions.push('Consider narrowing your tones to 2-3 for a more focused story.');
    }
  } else {
    warnings.push('Select at least one tone for your story.');
  }

  // Target audience
  if (concept.targetAudience.length > 10) {
    score += 1;
  } else {
    warnings.push('Define your target audience more specifically.');
  }

  // Why now
  if (concept.whyNow.length > 20) {
    score += 2;
    if (concept.whyNow.length < 50) {
      suggestions.push('The "Why Now" section is crucial. Expand on current relevance.');
    }
  } else {
    warnings.push('"Why this story now?" needs more thought.');
  }

  // Unique angle
  if (concept.uniqueAngle.length > 20) {
    score += 2;
  } else {
    warnings.push('What makes YOUR take unique? This is essential.');
  }

  // Market comparables
  if (concept.marketComparables.length > 10) {
    score += 1;
    suggestions.push('Good! Comparables help position your story in the market.');
  }

  const isValid = score >= 6;
  return { isValid, score: Math.round((score / maxScore) * 100), warnings, suggestions };
}

function validateLogline(logline: LoglineData): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 6;

  // Check individual components
  if (logline.protagonist.length > 5) score += 1;
  else warnings.push('Define your protagonist.');

  if (logline.goal.length > 10) score += 1;
  else warnings.push('What does your protagonist want?');

  if (logline.antagonisticForce.length > 5) score += 1;
  else warnings.push('Define the antagonistic force (person, system, or internal).');

  if (logline.stakes.length > 10) score += 1.5;
  else warnings.push('What happens if the protagonist fails?');

  // Full logline quality
  if (logline.fullLogline.length > 30) {
    score += 1.5;
    
    // Check for key elements in the logline
    const hasWhen = /when|after|before/i.test(logline.fullLogline);
    const hasMust = /must|needs to|has to|tries to/i.test(logline.fullLogline);
    const hasOr = /or else|otherwise|before|unless/i.test(logline.fullLogline);
    
    if (!hasWhen) suggestions.push('Consider starting with "When..." to set up the inciting incident.');
    if (!hasMust) suggestions.push('Include what the protagonist "must" do.');
    if (!hasOr) suggestions.push('Add stakes: "or else..." / "before..." to raise tension.');
  } else {
    warnings.push('Write your complete logline (aim for 25-50 words).');
  }

  const isValid = score >= 4.5;
  return { isValid, score: Math.round((score / maxScore) * 100), warnings, suggestions };
}

function validateTheme(theme: ThemeData): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 8;

  // Central theme
  if (theme.centralTheme.length > 5) {
    score += 1;
  } else {
    warnings.push('Define your central theme (e.g., redemption, identity, love).');
  }

  // Theme statement
  if (theme.themeStatement.length > 20) {
    score += 1.5;
    if (!theme.themeStatement.includes('...')) {
      suggestions.push('A theme statement often follows: "This story argues that..."');
    }
  } else {
    warnings.push('Write a theme statement: what is your story arguing?');
  }

  // Protagonist flaw
  if (theme.protagonistFlaw.length > 10) {
    score += 1.5;
  } else {
    warnings.push('Define your protagonist\'s central flaw.');
  }

  // What must change
  if (theme.whatMustChange.length > 15) {
    score += 1.5;
  } else {
    warnings.push('What belief or behavior must the protagonist change?');
  }

  // Transformation arc
  if (theme.transformationArc.length > 20) {
    score += 1.5;
  } else {
    warnings.push('Describe the transformation arc from flaw to growth.');
  }

  // Emotional journey
  if (theme.emotionalJourney.length >= 3) {
    score += 1;
  } else {
    suggestions.push('Map at least 3-5 key emotional beats in your story.');
  }

  const isValid = score >= 6;
  return { isValid, score: Math.round((score / maxScore) * 100), warnings, suggestions };
}

// ============================================================================
// Helper Components
// ============================================================================

interface PhaseHeaderProps {
  number: number;
  title: string;
  purpose: string;
  icon: React.ReactNode;
  status: 'incomplete' | 'weak' | 'ready';
}

const PhaseHeader: React.FC<PhaseHeaderProps> = ({ number, title, purpose, icon, status }) => {
  const statusColors = {
    incomplete: '#6b7280',
    weak: '#f59e0b',
    ready: '#10b981',
  };

  const statusIcons = {
    incomplete: <ErrorIcon fontSize="small" />,
    weak: <WarningIcon fontSize="small" />,
    ready: <CheckIcon fontSize="small" />,
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${statusColors[status]}40, ${statusColors[status]}20)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${statusColors[status]}`,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
            Phase {number}: {title}
          </Typography>
          <Chip
            size="small"
            icon={statusIcons[status]}
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            sx={{
              bgcolor: `${statusColors[status]}20`,
              color: statusColors[status],
              '& .MuiChip-icon': { color: statusColors[status] },
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          {purpose}
        </Typography>
      </Box>
    </Box>
  );
};

interface ValidationDisplayProps {
  result: ValidationResult;
  title: string;
}

const ValidationDisplay: React.FC<ValidationDisplayProps> = ({ result, title }) => {
  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        mt: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#fff' }}>
          {title} Validation
        </Typography>
        <Chip
          size="small"
          label={`${result.score}%`}
          sx={{
            bgcolor: result.score >= 70 ? '#10b98120' : result.score >= 40 ? '#f59e0b20' : '#ef444420',
            color: result.score >= 70 ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444',
          }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={result.score}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.1)',
          '& .MuiLinearProgress-bar': {
            bgcolor: result.score >= 70 ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444',
            borderRadius: 3,
          },
        }}
      />
      
      {result.warnings.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {result.warnings.map((warning, idx) => (
            <Alert
              key={idx}
              severity="warning"
              sx={{
                mb: 1,
                bgcolor: 'rgba(245, 158, 11, 0.1)',
                color: '#fbbf24',
                '& .MuiAlert-icon': { color: '#f59e0b' },
              }}
            >
              {warning}
            </Alert>
          ))}
        </Box>
      )}
      
      {result.suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {result.suggestions.map((suggestion, idx) => (
            <Alert
              key={idx}
              severity="info"
              icon={<TipsIcon />}
              sx={{
                mb: 1,
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                '& .MuiAlert-icon': { color: '#3b82f6' },
              }}
            >
              {suggestion}
            </Alert>
          ))}
        </Box>
      )}
    </Paper>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface StoryLogicPanelProps {
  projectId?: string;
  onSave?: (data: StoryLogicState) => void;
  initialData?: StoryLogicState;
}

export const StoryLogicPanel: React.FC<StoryLogicPanelProps> = ({
  projectId,
  onSave,
  initialData,
}) => {
  const [state, setState] = useState<StoryLogicState>(initialData || DEFAULT_STATE);
  const [expandedPhase, setExpandedPhase] = useState<number>(0);
  const [showValidation, setShowValidation] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load from database or initialize with TROLL demo data
  useEffect(() => {
    if (!projectId || initialData) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const savedData = await storyLogicService.getStoryLogic(projectId);
        if (savedData) {
          setState(savedData);
          console.log('✓ Loaded story logic from database for project:', projectId);
        } else if (projectId.toLowerCase().includes('troll')) {
          // Initialize with TROLL demo data for troll projects
          setState(TROLL_DEMO_STATE);
          await storyLogicService.saveStoryLogic(projectId, TROLL_DEMO_STATE);
          console.log('🎬 Initialized TROLL story logic demo data');
        }
      } catch (error) {
        console.error('Failed to load story logic data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, initialData]);

  // Save to database
  const saveToStorage = useCallback(async () => {
    if (!projectId) return;
    
    setIsSaving(true);
    const dataToSave = { ...state, lastSaved: new Date().toISOString() };
    
    try {
      await storyLogicService.saveStoryLogic(projectId, dataToSave);
      setState(dataToSave);
      onSave?.(dataToSave);
      console.log('✓ Story logic saved for project:', projectId);
    } catch (error) {
      console.error('Failed to save story logic:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, state, onSave]);

  // Memoize emotionalJourney for stable comparison
  // Memoize validation results to prevent recalculation
  const validationResults = useMemo(() => {
    const conceptResult = validateConcept(state.concept);
    const loglineResult = validateLogline(state.logline);
    const themeResult = validateTheme(state.theme);

    return {
      concept: conceptResult.score >= 70 ? 'ready' as const : conceptResult.score >= 40 ? 'weak' as const : 'incomplete' as const,
      logline: loglineResult.score >= 70 ? 'ready' as const : loglineResult.score >= 40 ? 'weak' as const : 'incomplete' as const,
      theme: themeResult.score >= 70 ? 'ready' as const : themeResult.score >= 40 ? 'weak' as const : 'incomplete' as const,
    };
  }, [
    state.concept.corePremise,
    state.concept.genre,
    state.concept.uniqueAngle,
    state.concept.whyNow,
    state.concept.tone.length,
    state.concept.targetAudience,
    state.logline.protagonist,
    state.logline.goal,
    state.logline.antagonisticForce,
    state.logline.stakes,
    state.logline.fullLogline,
    state.theme.centralTheme,
    state.theme.themeStatement,
    state.theme.protagonistFlaw,
    state.theme.emotionalJourney.length
  ]);

  // Update validation status - only when memoized results change
  useEffect(() => {
    setState(prev => {
      if (prev.phaseStatus.concept === validationResults.concept &&
          prev.phaseStatus.logline === validationResults.logline &&
          prev.phaseStatus.theme === validationResults.theme) {
        return prev; // Return same reference to prevent re-render
      }
      return {
        ...prev,
        phaseStatus: validationResults,
      };
    });
  }, [validationResults]);

  // Generate logline from components
  const generateLogline = useCallback(() => {
    setState(prev => {
      const { protagonist, protagonistTrait, goal, antagonisticForce, stakes } = prev.logline;
      if (protagonist && goal && antagonisticForce && stakes) {
        const generated = `When ${protagonistTrait ? `a ${protagonistTrait} ` : ''}${protagonist} must ${goal}, they face ${antagonisticForce}—or else ${stakes}.`;
        return {
          ...prev,
          logline: { ...prev.logline, fullLogline: generated },
        };
      }
      return prev;
    });
  }, []);

  // Update concept field
  const updateConcept = (field: keyof ConceptData, value: string | string[]) => {
    setState(prev => ({
      ...prev,
      concept: { ...prev.concept, [field]: value },
    }));
  };

  // Update logline field
  const updateLogline = (field: keyof LoglineData, value: string | number) => {
    setState(prev => ({
      ...prev,
      logline: { ...prev.logline, [field]: value },
    }));
  };

  // Update theme field
  const updateTheme = (field: keyof ThemeData, value: string | string[]) => {
    setState(prev => ({
      ...prev,
      theme: { ...prev.theme, [field]: value },
    }));
  };

  // Reset all data
  const resetAll = async () => {
    if (window.confirm('Are you sure you want to reset all Story Logic data?')) {
      setState(DEFAULT_STATE);
      if (projectId) {
        await storyLogicService.deleteStoryLogic(projectId);
      }
    }
  };

  const conceptValidation = validateConcept(state.concept);
  const loglineValidation = validateLogline(state.logline);
  const themeValidation = validateTheme(state.theme);

  const overallProgress = Math.round(
    (conceptValidation.score + loglineValidation.score + themeValidation.score) / 3
  );

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
            Story Logic System
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Validate your story foundation before writing
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={state.isLocked ? 'Unlock to edit' : 'Lock to prevent changes'}>
            <IconButton
              onClick={() => setState(prev => ({ ...prev, isLocked: !prev.isLocked }))}
              sx={{ color: state.isLocked ? '#f59e0b' : '#6b7280' }}
            >
              {state.isLocked ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset all">
            <IconButton onClick={resetAll} sx={{ color: '#6b7280' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveToStorage}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
            }}
          >
            Save
          </Button>
        </Box>
      </Box>

      {/* Overall Progress */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#fff' }}>
            Overall Story Foundation
          </Typography>
          <Typography variant="h6" sx={{ color: overallProgress >= 70 ? '#10b981' : '#f59e0b' }}>
            {overallProgress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: overallProgress >= 70 ? '#10b981' : overallProgress >= 40 ? '#f59e0b' : '#ef4444',
              borderRadius: 4,
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Chip
            label={`Concept: ${conceptValidation.score}%`}
            size="small"
            sx={{
              bgcolor: `${state.phaseStatus.concept === 'ready' ? '#10b981' : state.phaseStatus.concept === 'weak' ? '#f59e0b' : '#6b7280'}20`,
              color: state.phaseStatus.concept === 'ready' ? '#10b981' : state.phaseStatus.concept === 'weak' ? '#f59e0b' : '#6b7280',
            }}
          />
          <Chip
            label={`Logline: ${loglineValidation.score}%`}
            size="small"
            sx={{
              bgcolor: `${state.phaseStatus.logline === 'ready' ? '#10b981' : state.phaseStatus.logline === 'weak' ? '#f59e0b' : '#6b7280'}20`,
              color: state.phaseStatus.logline === 'ready' ? '#10b981' : state.phaseStatus.logline === 'weak' ? '#f59e0b' : '#6b7280',
            }}
          />
          <Chip
            label={`Theme: ${themeValidation.score}%`}
            size="small"
            sx={{
              bgcolor: `${state.phaseStatus.theme === 'ready' ? '#10b981' : state.phaseStatus.theme === 'weak' ? '#f59e0b' : '#6b7280'}20`,
              color: state.phaseStatus.theme === 'ready' ? '#10b981' : state.phaseStatus.theme === 'weak' ? '#f59e0b' : '#6b7280',
            }}
          />
        </Box>
        {state.lastSaved && (
          <Typography variant="caption" sx={{ color: '#6b7280', mt: 1, display: 'block' }}>
            Last saved: {new Date(state.lastSaved).toLocaleString()}
          </Typography>
        )}
      </Paper>

      {/* Phase 1: Concept */}
      <Accordion
        expanded={expandedPhase === 0}
        onChange={() => setExpandedPhase(expandedPhase === 0 ? -1 : 0)}
        sx={{
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px !important',
          mb: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
          <PhaseHeader
            number={1}
            title="Concept"
            purpose="Validate the idea before any writing. Is this worth months of work?"
            icon={<LightbulbIcon sx={{ color: '#fbbf24' }} />}
            status={state.phaseStatus.concept}
          />
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Core Premise */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Core Premise"
                placeholder="What is your story about in 2-3 sentences? The fundamental idea."
                value={state.concept.corePremise}
                onChange={(e) => updateConcept('corePremise', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Genre & Sub-Genre */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#9ca3af' }}>Primary Genre</InputLabel>
                <Select
                  value={state.concept.genre}
                  label="Primary Genre"
                  onChange={(e) => {
                    updateConcept('genre', e.target.value);
                    updateConcept('subGenre', '');
                  }}
                  disabled={state.isLocked}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                  }}
                >
                  {GENRES.map((genre) => (
                    <MenuItem key={genre} value={genre}>{genre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#9ca3af' }}>Sub-Genre</InputLabel>
                <Select
                  value={state.concept.subGenre}
                  label="Sub-Genre"
                  onChange={(e) => updateConcept('subGenre', e.target.value)}
                  disabled={state.isLocked || !state.concept.genre}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                  }}
                >
                  {(SUB_GENRES[state.concept.genre as keyof typeof SUB_GENRES] || []).map((sub) => (
                    <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Tone Selection */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1 }}>
                Tone (select 1-3)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {TONES.map((tone) => (
                  <Chip
                    key={tone}
                    label={tone}
                    onClick={() => {
                      if (state.isLocked) return;
                      const current = state.concept.tone;
                      if (current.includes(tone)) {
                        updateConcept('tone', current.filter(t => t !== tone));
                      } else if (current.length < 3) {
                        updateConcept('tone', [...current, tone]);
                      }
                    }}
                    sx={{
                      bgcolor: state.concept.tone.includes(tone) ? '#3b82f620' : 'rgba(255,255,255,0.05)',
                      color: state.concept.tone.includes(tone) ? '#60a5fa' : '#9ca3af',
                      border: state.concept.tone.includes(tone) ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      cursor: state.isLocked ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        bgcolor: state.isLocked ? undefined : '#3b82f610',
                      },
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Target Audience */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Target Audience"
                placeholder="Who is this story for? Be specific."
                value={state.concept.targetAudience}
                onChange={(e) => updateConcept('targetAudience', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#9ca3af' }}>Audience Age Range</InputLabel>
                <Select
                  value={state.concept.audienceAge}
                  label="Audience Age Range"
                  onChange={(e) => updateConcept('audienceAge', e.target.value)}
                  disabled={state.isLocked}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  {AUDIENCE_AGES.map((age) => (
                    <MenuItem key={age} value={age}>{age}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Why Now */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Why This Story Now?"
                placeholder="What makes this story relevant today? Why should audiences care RIGHT NOW?"
                value={state.concept.whyNow}
                onChange={(e) => updateConcept('whyNow', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Unique Angle */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Unique Angle"
                placeholder="What makes YOUR take on this concept different from everything else?"
                value={state.concept.uniqueAngle}
                onChange={(e) => updateConcept('uniqueAngle', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Market Comparables */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Market Comparables"
                placeholder="e.g., 'Inception meets The Matrix' or 'Breaking Bad in the fashion industry'"
                value={state.concept.marketComparables}
                onChange={(e) => updateConcept('marketComparables', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>
          </Grid>

          {showValidation && <ValidationDisplay result={conceptValidation} title="Concept" />}
        </AccordionDetails>
      </Accordion>

      {/* Phase 2: Logline */}
      <Accordion
        expanded={expandedPhase === 1}
        onChange={() => setExpandedPhase(expandedPhase === 1 ? -1 : 1)}
        sx={{
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px !important',
          mb: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
          <PhaseHeader
            number={2}
            title="Logline"
            purpose="Define story DNA in one sentence. If it's weak, do not proceed."
            icon={<CreateIcon sx={{ color: '#60a5fa' }} />}
            status={state.phaseStatus.logline}
          />
        </AccordionSummary>
        <AccordionDetails>
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              color: '#60a5fa',
              '& .MuiAlert-icon': { color: '#3b82f6' },
            }}
          >
            <strong>Logline Formula:</strong> When [PROTAGONIST] must [GOAL], they face [ANTAGONISTIC FORCE]—or else [STAKES].
          </Alert>

          <Grid container spacing={2}>
            {/* Protagonist */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Protagonist"
                placeholder="Who is your main character? (role/occupation)"
                value={state.logline.protagonist}
                onChange={(e) => updateLogline('protagonist', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Defining Trait"
                placeholder="e.g., 'burnt-out', 'naive', 'ruthless'"
                value={state.logline.protagonistTrait}
                onChange={(e) => updateLogline('protagonistTrait', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Goal */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Goal"
                placeholder="What must the protagonist achieve? (action verb + objective)"
                value={state.logline.goal}
                onChange={(e) => updateLogline('goal', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Antagonistic Force */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Antagonistic Force"
                placeholder="Person, system, internal struggle, or force of nature"
                value={state.logline.antagonisticForce}
                onChange={(e) => updateLogline('antagonisticForce', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Stakes */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Stakes"
                placeholder="What happens if the protagonist fails? (consequences)"
                value={state.logline.stakes}
                onChange={(e) => updateLogline('stakes', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Generate Button */}
            <Grid size={12}>
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={generateLogline}
                disabled={state.isLocked}
                sx={{
                  borderColor: '#8b5cf6',
                  color: '#a78bfa',
                  '&:hover': {
                    borderColor: '#a78bfa',
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                  },
                }}
              >
                Generate Logline from Components
              </Button>
            </Grid>

            {/* Full Logline */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Complete Logline"
                placeholder="Write your complete logline here (25-50 words ideal)"
                value={state.logline.fullLogline}
                onChange={(e) => updateLogline('fullLogline', e.target.value)}
                disabled={state.isLocked}
                helperText={`${state.logline.fullLogline.split(/\s+/).filter(w => w).length} words`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                  '& .MuiFormHelperText-root': { color: '#6b7280' },
                }}
              />
            </Grid>

            {/* Logline Score */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
                  Logline Strength:
                </Typography>
                <Rating
                  value={Math.round(loglineValidation.score / 20)}
                  readOnly
                  icon={<StarIcon sx={{ color: '#fbbf24' }} />}
                  emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.2)' }} />}
                />
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  ({loglineValidation.score}%)
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {showValidation && <ValidationDisplay result={loglineValidation} title="Logline" />}
        </AccordionDetails>
      </Accordion>

      {/* Phase 3: Theme & Character Intent */}
      <Accordion
        expanded={expandedPhase === 2}
        onChange={() => setExpandedPhase(expandedPhase === 2 ? -1 : 2)}
        sx={{
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px !important',
          mb: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
          <PhaseHeader
            number={3}
            title="Theme & Character Intent"
            purpose="Give the story meaning. This prevents hollow or episodic scripts."
            icon={<PsychologyIcon sx={{ color: '#a78bfa' }} />}
            status={state.phaseStatus.theme}
          />
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Central Theme */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Central Theme"
                placeholder="e.g., redemption, identity, power, love, sacrifice"
                value={state.theme.centralTheme}
                onChange={(e) => updateTheme('centralTheme', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Moral Argument"
                placeholder="What is the story's stance on the theme?"
                value={state.theme.moralArgument}
                onChange={(e) => updateTheme('moralArgument', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Theme Statement */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Theme Statement"
                placeholder="This story argues that... (complete the sentence)"
                value={state.theme.themeStatement}
                onChange={(e) => updateTheme('themeStatement', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />
              <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1, mb: 1 }}>
                Character Transformation
              </Typography>
            </Grid>

            {/* Protagonist Flaw */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Protagonist's Core Flaw"
                placeholder="What internal weakness holds them back?"
                value={state.theme.protagonistFlaw}
                onChange={(e) => updateTheme('protagonistFlaw', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Flaw Origin"
                placeholder="Where did this flaw come from? (backstory)"
                value={state.theme.flawOrigin}
                onChange={(e) => updateTheme('flawOrigin', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* What Must Change */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="What Must Change by the End"
                placeholder="What belief, behavior, or worldview must the protagonist abandon or embrace?"
                value={state.theme.whatMustChange}
                onChange={(e) => updateTheme('whatMustChange', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Transformation Arc */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Transformation Arc"
                placeholder="Describe the journey from flawed beginning to transformed end. How do they change?"
                value={state.theme.transformationArc}
                onChange={(e) => updateTheme('transformationArc', e.target.value)}
                disabled={state.isLocked}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                }}
              />
            </Grid>

            {/* Emotional Journey */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1 }}>
                Emotional Journey Beats (select 3-5 key emotions)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {EMOTIONAL_JOURNEY_BEATS.map((emotion) => (
                  <Chip
                    key={emotion}
                    label={emotion}
                    onClick={() => {
                      if (state.isLocked) return;
                      const current = state.theme.emotionalJourney;
                      if (current.includes(emotion)) {
                        updateTheme('emotionalJourney', current.filter(e => e !== emotion));
                      } else if (current.length < 5) {
                        updateTheme('emotionalJourney', [...current, emotion]);
                      }
                    }}
                    sx={{
                      bgcolor: state.theme.emotionalJourney.includes(emotion) ? '#8b5cf620' : 'rgba(255,255,255,0.05)',
                      color: state.theme.emotionalJourney.includes(emotion) ? '#a78bfa' : '#9ca3af',
                      border: state.theme.emotionalJourney.includes(emotion) ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                      cursor: state.isLocked ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        bgcolor: state.isLocked ? undefined : '#8b5cf610',
                      },
                    }}
                  />
                ))}
              </Box>
              {state.theme.emotionalJourney.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#a78bfa' }}>
                    Emotional Arc: {state.theme.emotionalJourney.join(' → ')}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {showValidation && <ValidationDisplay result={themeValidation} title="Theme" />}
        </AccordionDetails>
      </Accordion>

      {/* Summary Card */}
      {overallProgress >= 70 && (
        <Fade in>
          <Card
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckIcon sx={{ color: '#10b981', fontSize: 32 }} />
                <Typography variant="h6" sx={{ color: '#10b981' }}>
                  Story Foundation Ready!
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                Your story logic is validated. You can proceed to outlining and writing with confidence.
              </Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
              <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
                Summary
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                <strong>Genre:</strong> {state.concept.genre} {state.concept.subGenre && `(${state.concept.subGenre})`}
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                <strong>Tone:</strong> {state.concept.tone.join(', ')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                <strong>Theme:</strong> {state.theme.centralTheme}
              </Typography>
              {state.logline.fullLogline && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#fff', fontStyle: 'italic' }}>
                    "{state.logline.fullLogline}"
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
};

export default StoryLogicPanel;

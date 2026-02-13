/**
 * Story API Service
 * Frontend API client for story/screenplay related endpoints
 */

const API_BASE = '/api';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
}

// ============================================================================
// Story Logic Types (Pre-writing: Concept, Logline, Theme)
// ============================================================================

export interface ConceptData {
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

export interface LoglineData {
  protagonist: string;
  protagonistTrait: string;
  goal: string;
  antagonisticForce: string;
  stakes: string;
  fullLogline: string;
  loglineScore: number;
}

export interface ThemeData {
  centralTheme: string;
  themeStatement: string;
  protagonistFlaw: string;
  flawOrigin: string;
  whatMustChange: string;
  transformationArc: string;
  emotionalJourney: string[];
  moralArgument: string;
}

export interface StoryLogicState {
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

// ============================================================================
// Storyboard Frame Types
// ============================================================================

export interface StoryboardFrame {
  id: string;
  sceneId?: string;
  manuscriptId?: string;
  projectId?: string;
  shotNumber?: number;
  imageUrl?: string;
  sketch?: string;
  description?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  duration?: number;
  notes?: string;
  scriptLineStart?: number;
  scriptLineEnd?: number;
  dialogueCharacter?: string;
  dialogueText?: string;
  actionDescription?: string;
  drawingData?: Record<string, unknown>;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Script Supervisor Note Types
// ============================================================================

export interface SupervisorNote {
  id: string;
  sceneId: string;
  manuscriptId?: string;
  projectId?: string;
  noteType?: 'general' | 'take' | 'continuity' | 'performance';
  takeNumber?: number;
  isCircled?: boolean;
  timecodeStart?: string;
  timecodeEnd?: string;
  durationSeconds?: number;
  camera?: string;
  lens?: string;
  soundRoll?: string;
  continuityNotes?: string;
  directorNotes?: string;
  performanceNotes?: string;
  technicalNotes?: string;
  wardrobeNotes?: string;
  propsNotes?: string;
  hairMakeupNotes?: string;
  rating?: number;
  status?: 'pending' | 'approved' | 'rejected';
  loggedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Character Arc Types
// ============================================================================

export interface CharacterArc {
  id: string;
  manuscriptId: string;
  projectId?: string;
  characterName: string;
  roleId?: string;
  arcType?: string;
  startingState?: string;
  endingState?: string;
  keyMoments?: Array<{ sceneId: string; description: string; page?: number }>;
  transformationTrigger?: string;
  internalConflict?: string;
  externalConflict?: string;
  characterWant?: string;
  characterNeed?: string;
  ghostWound?: string;
  lieBelieved?: string;
  truthLearned?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Story Beat Types
// ============================================================================

export interface StoryBeat {
  id: string;
  manuscriptId: string;
  projectId?: string;
  beatType: string; // e.g., 'opening-image', 'catalyst', 'midpoint', 'all-is-lost', etc.
  beatName: string;
  description?: string;
  pageNumber?: number;
  sceneId?: string;
  actId?: string;
  sequence?: string;
  isCompleted?: boolean;
  notes?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// API Functions
// ============================================================================

export const storyLogicApi = {
  get: async (projectId: string): Promise<StoryLogicState | null> => {
    try {
      const result = await apiRequest<{ success: boolean; storyLogic: StoryLogicState | null }>(
        `/projects/${projectId}/story-logic`
      );
      return result.storyLogic;
    } catch {
      return null;
    }
  },

  save: async (projectId: string, storyLogic: StoryLogicState): Promise<boolean> => {
    try {
      await apiRequest(`/projects/${projectId}/story-logic`, {
        method: 'POST',
        body: JSON.stringify({ storyLogic }),
      });
      return true;
    } catch {
      return false;
    }
  },

  delete: async (projectId: string): Promise<boolean> => {
    try {
      await apiRequest(`/projects/${projectId}/story-logic`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },
};

export const storyboardFramesApi = {
  getByScene: async (sceneId: string): Promise<StoryboardFrame[]> => {
    const result = await apiRequest<{ frames: StoryboardFrame[] }>(
      `/casting/scenes/${sceneId}/storyboard-frames`
    );
    return result.frames;
  },

  save: async (frame: Partial<StoryboardFrame>): Promise<StoryboardFrame> => {
    const result = await apiRequest<{ frame: StoryboardFrame }>('/casting/storyboard-frames', {
      method: 'POST',
      body: JSON.stringify(frame),
    });
    return result.frame;
  },

  delete: async (frameId: string): Promise<boolean> => {
    await apiRequest(`/casting/storyboard-frames/${frameId}`, { method: 'DELETE' });
    return true;
  },
};

export const supervisorNotesApi = {
  getByScene: async (sceneId: string): Promise<SupervisorNote[]> => {
    const result = await apiRequest<{ notes: SupervisorNote[] }>(
      `/casting/scenes/${sceneId}/supervisor-notes`
    );
    return result.notes;
  },

  save: async (note: Partial<SupervisorNote>): Promise<SupervisorNote> => {
    const result = await apiRequest<{ note: SupervisorNote }>('/casting/supervisor-notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
    return result.note;
  },

  delete: async (noteId: string): Promise<boolean> => {
    await apiRequest(`/casting/supervisor-notes/${noteId}`, { method: 'DELETE' });
    return true;
  },
};

export const characterArcsApi = {
  getByManuscript: async (manuscriptId: string): Promise<CharacterArc[]> => {
    const result = await apiRequest<{ characterArcs: CharacterArc[] }>(
      `/casting/manuscripts/${manuscriptId}/character-arcs`
    );
    return result.characterArcs;
  },

  save: async (arc: Partial<CharacterArc>): Promise<CharacterArc> => {
    const result = await apiRequest<{ characterArc: CharacterArc }>('/casting/character-arcs', {
      method: 'POST',
      body: JSON.stringify(arc),
    });
    return result.characterArc;
  },

  delete: async (arcId: string): Promise<boolean> => {
    await apiRequest(`/casting/character-arcs/${arcId}`, { method: 'DELETE' });
    return true;
  },
};

export const storyBeatsApi = {
  getByManuscript: async (manuscriptId: string): Promise<StoryBeat[]> => {
    const result = await apiRequest<{ storyBeats: StoryBeat[] }>(
      `/casting/manuscripts/${manuscriptId}/story-beats`
    );
    return result.storyBeats;
  },

  save: async (beat: Partial<StoryBeat>): Promise<StoryBeat> => {
    const result = await apiRequest<{ storyBeat: StoryBeat }>('/casting/story-beats', {
      method: 'POST',
      body: JSON.stringify(beat),
    });
    return result.storyBeat;
  },

  delete: async (beatId: string): Promise<boolean> => {
    await apiRequest(`/casting/story-beats/${beatId}`, { method: 'DELETE' });
    return true;
  },

  batchSave: async (manuscriptId: string, beats: Partial<StoryBeat>[]): Promise<StoryBeat[]> => {
    const result = await apiRequest<{ storyBeats: StoryBeat[] }>(
      `/casting/manuscripts/${manuscriptId}/story-beats/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ beats }),
      }
    );
    return result.storyBeats;
  },
};

// Combined export
export const storyApi = {
  storyLogic: storyLogicApi,
  storyboardFrames: storyboardFramesApi,
  supervisorNotes: supervisorNotesApi,
  characterArcs: characterArcsApi,
  storyBeats: storyBeatsApi,
};

export default storyApi;

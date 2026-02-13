/**
 * Notes Service
 * 
 * Provides database persistence for notes with localStorage fallback.
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  sceneId?: string;
  projectId?: string;
  timestamp: number;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredNotes {
  notes: Note[];
  lastUpdated: string;
}

const STORAGE_KEY = 'notes-data';

// Database availability cache
let dbAvailable: boolean | null = null;

async function checkDatabaseAvailability(): Promise<boolean> {
  if (dbAvailable !== null) {
    return dbAvailable;
  }
  
  try {
    const response = await fetch('/api/casting/health');
    const result = await response.json();
    dbAvailable = result.status === 'healthy';
    return dbAvailable;
  } catch (error) {
    console.error('Database not available:', error);
    dbAvailable = false;
    return false;
  }
}

function getStorageData(): StoredNotes {
  try {
    // Check legacy key first
    const legacyData = localStorage.getItem('virtualstudio_notes');
    if (legacyData) {
      const parsed = JSON.parse(legacyData);
      localStorage.removeItem('virtualstudio_notes');
      return { notes: parsed, lastUpdated: new Date().toISOString() };
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { notes: [], lastUpdated: '' };
  } catch (error) {
    console.error('Error reading notes from localStorage:', error);
    return { notes: [], lastUpdated: '' };
  }
}

function saveStorageData(data: StoredNotes): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving notes to localStorage:', error);
  }
}

export const notesService = {
  /**
   * Get all notes, optionally filtered by projectId or sceneId
   */
  async getNotes(options?: { projectId?: string; sceneId?: string }): Promise<Note[]> {
    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const params = new URLSearchParams();
        if (options?.projectId) params.set('projectId', options.projectId);
        if (options?.sceneId) params.set('sceneId', options.sceneId);
        
        const response = await fetch(`/api/notes?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const notes = (data.notes || data || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            category: n.category,
            sceneId: n.sceneId || n.scene_id,
            projectId: n.projectId || n.project_id,
            timestamp: n.timestamp || new Date(n.createdAt || n.created_at).getTime(),
          }));
          
          // Cache to localStorage
          saveStorageData({ notes, lastUpdated: new Date().toISOString() });
          return notes;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch notes from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const storageData = getStorageData();
    let notes = storageData.notes || [];
    
    // Filter if options provided
    if (options?.projectId) {
      notes = notes.filter(n => n.projectId === options.projectId);
    }
    if (options?.sceneId) {
      notes = notes.filter(n => n.sceneId === options.sceneId);
    }
    
    return notes;
  },

  /**
   * Save a note (create or update)
   */
  async saveNote(note: Note): Promise<Note> {
    const now = new Date().toISOString();
    const noteToSave = {
      ...note,
      updatedAt: now,
      timestamp: note.timestamp || Date.now(),
    };

    // Save to localStorage first for immediate access
    const storageData = getStorageData();
    const existingIndex = storageData.notes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      storageData.notes[existingIndex] = noteToSave;
    } else {
      storageData.notes.push(noteToSave);
    }
    storageData.lastUpdated = now;
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/notes', {
          method: existingIndex >= 0 ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteToSave),
        });
        if (response.ok) {
          const saved = await response.json();
          return { ...noteToSave, ...saved };
        }
      }
    } catch (error) {
      console.warn('Failed to save note to database:', error);
    }

    return noteToSave;
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    // Remove from localStorage
    const storageData = getStorageData();
    storageData.notes = storageData.notes.filter(n => n.id !== noteId);
    storageData.lastUpdated = new Date().toISOString();
    saveStorageData(storageData);

    // Try to delete from database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.warn('Failed to delete note from database:', error);
    }
  },

  /**
   * Save multiple notes at once
   */
  async saveNotes(notes: Note[]): Promise<void> {
    const now = new Date().toISOString();
    const notesToSave = notes.map(n => ({
      ...n,
      updatedAt: now,
      timestamp: n.timestamp || Date.now(),
    }));

    // Save to localStorage
    saveStorageData({ notes: notesToSave, lastUpdated: now });

    // Try to sync to database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch('/api/notes/batch', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notesToSave }),
        });
      }
    } catch (error) {
      console.warn('Failed to save notes to database:', error);
    }
  },
};

export default notesService;

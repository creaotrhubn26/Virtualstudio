/**
 * Notes Service
 * 
 * Provides database persistence for notes with settings-based fallback.
 */

import { settingsService } from './settingsService';

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

const SETTINGS_NAMESPACE = 'virtualStudio_notes';

const cacheNotes = async (notes: Note[]) => {
  try {
    await settingsService.setSetting(SETTINGS_NAMESPACE, notes);
  } catch {
    // Ignore cache failures
  }
};

export const notesService = {
  /**
   * Get all notes, optionally filtered by projectId or sceneId
   */
  async getNotes(options?: { projectId?: string; sceneId?: string }): Promise<Note[]> {
    // Try database first
    try {
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

        await cacheNotes(notes);
        return notes;
      }
    } catch (error) {
      console.warn('Failed to fetch notes from API, using settings cache:', error);
    }

    let notes = (await settingsService.getSetting<Note[]>(SETTINGS_NAMESPACE)) || [];
    
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

    const cached = (await settingsService.getSetting<Note[]>(SETTINGS_NAMESPACE)) || [];
    const existingIndex = cached.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      cached[existingIndex] = noteToSave;
    } else {
      cached.push(noteToSave);
    }
    await cacheNotes(cached);

    // Try to save to database
    try {
      const response = await fetch('/api/notes', {
        method: existingIndex >= 0 ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteToSave),
      });
      if (response.ok) {
        const saved = await response.json();
        return { ...noteToSave, ...saved };
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
    const cached = (await settingsService.getSetting<Note[]>(SETTINGS_NAMESPACE)) || [];
    const filtered = cached.filter(n => n.id !== noteId);
    await cacheNotes(filtered);

    // Try to delete from database
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
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

    await cacheNotes(notesToSave);

    // Try to sync to database
    try {
      await fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesToSave }),
      });
    } catch (error) {
      console.warn('Failed to save notes to database:', error);
    }
  },
};

export default notesService;

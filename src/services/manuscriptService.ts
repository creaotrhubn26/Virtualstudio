import {
  Manuscript,
  SceneBreakdown,
  DialogueLine,
  ScriptRevision,
  Act,
  ManuscriptExport,
  ShotCamera,
  ShotLighting,
  ShotAudio,
  ShotNote,
  StoryboardFrame,
} from '../core/models/casting';

// Database availability cache
let dbAvailable: boolean | null = null;
let dbCheckPromise: Promise<boolean> | null = null;

/**
 * Check if database is available
 */
async function checkDatabaseAvailability(): Promise<boolean> {
  if (dbAvailable !== null) {
    return dbAvailable;
  }
  
  if (dbCheckPromise) {
    return dbCheckPromise;
  }
  
  dbCheckPromise = (async () => {
    try {
      const response = await fetch('/api/casting/health');
      const result = await response.json();
      dbAvailable = result.status === 'healthy';
      return dbAvailable;
    } catch (error) {
      console.error('Database not available:', error);
      dbAvailable = false;
      return false;
    } finally {
      dbCheckPromise = null;
    }
  })();
  
  return dbCheckPromise;
}

/**
 * LocalStorage fallback for manuscripts
 */
const STORAGE_KEYS = {
  MANUSCRIPTS: 'casting_manuscripts',
  SCENES: 'casting_scenes',
  DIALOGUE: 'casting_dialogue',
  REVISIONS: 'casting_revisions',
};

function getManuscriptsFromStorage(projectId: string): Manuscript[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MANUSCRIPTS);
    if (!data) return [];
    const allManuscripts = JSON.parse(data) as Manuscript[];
    return allManuscripts.filter(m => m.projectId === projectId);
  } catch (error) {
    console.error('Error reading manuscripts from storage:', error);
    return [];
  }
}

function saveManuscriptToStorage(manuscript: Manuscript): void {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MANUSCRIPTS);
    const manuscripts = data ? JSON.parse(data) as Manuscript[] : [];
    const index = manuscripts.findIndex(m => m.id === manuscript.id);
    
    if (index >= 0) {
      manuscripts[index] = manuscript;
    } else {
      manuscripts.push(manuscript);
    }
    
    localStorage.setItem(STORAGE_KEYS.MANUSCRIPTS, JSON.stringify(manuscripts));
  } catch (error) {
    console.error('Error saving manuscript to storage:', error);
    throw error;
  }
}

function deleteManuscriptFromStorage(id: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MANUSCRIPTS);
    if (!data) return;
    
    const manuscripts = JSON.parse(data) as Manuscript[];
    const filtered = manuscripts.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MANUSCRIPTS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting manuscript from storage:', error);
    throw error;
  }
}

function getScenesFromStorage(manuscriptId: string): SceneBreakdown[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCENES);
    if (!data) return [];
    const allScenes = JSON.parse(data) as SceneBreakdown[];
    return allScenes.filter(s => s.manuscriptId === manuscriptId);
  } catch (error) {
    console.error('Error reading scenes from storage:', error);
    return [];
  }
}

function saveSceneToStorage(scene: SceneBreakdown): void {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCENES);
    const scenes = data ? JSON.parse(data) as SceneBreakdown[] : [];
    const index = scenes.findIndex(s => s.id === scene.id);
    
    if (index >= 0) {
      scenes[index] = scene;
    } else {
      scenes.push(scene);
    }
    
    localStorage.setItem(STORAGE_KEYS.SCENES, JSON.stringify(scenes));
  } catch (error) {
    console.error('Error saving scene to storage:', error);
    throw error;
  }
}

function getDialogueFromStorage(manuscriptId: string): DialogueLine[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DIALOGUE);
    if (!data) return [];
    const allDialogue = JSON.parse(data) as DialogueLine[];
    return allDialogue.filter(d => d.manuscriptId === manuscriptId);
  } catch (error) {
    console.error('Error reading dialogue from storage:', error);
    return [];
  }
}

function getRevisionsFromStorage(manuscriptId: string): ScriptRevision[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REVISIONS);
    if (!data) return [];
    const allRevisions = JSON.parse(data) as ScriptRevision[];
    return allRevisions.filter(r => r.manuscriptId === manuscriptId);
  } catch (error) {
    console.error('Error reading revisions from storage:', error);
    return [];
  }
}

function saveRevisionToStorage(revision: ScriptRevision): void {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REVISIONS);
    const revisions = data ? JSON.parse(data) as ScriptRevision[] : [];
    revisions.push(revision);
    localStorage.setItem(STORAGE_KEYS.REVISIONS, JSON.stringify(revisions));
  } catch (error) {
    console.error('Error saving revision to storage:', error);
    throw error;
  }
}

/**
 * Manuscript Service
 */
class ManuscriptService {
  /**
   * Get all manuscripts for a project
   */
  async getManuscripts(projectId: string): Promise<Manuscript[]> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts?projectId=${projectId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch manuscripts: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching manuscripts from database:', error);
        return getManuscriptsFromStorage(projectId);
      }
    }
    
    return getManuscriptsFromStorage(projectId);
  }

  /**
   * Get a single manuscript by ID
   */
  async getManuscript(id: string): Promise<Manuscript | null> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch manuscript: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching manuscript from database:', error);
      }
    }
    
    // Fallback to localStorage
    const allManuscripts = localStorage.getItem(STORAGE_KEYS.MANUSCRIPTS);
    if (!allManuscripts) return null;
    const manuscripts = JSON.parse(allManuscripts) as Manuscript[];
    return manuscripts.find(m => m.id === id) || null;
  }

  /**
   * Create a new manuscript
   */
  async createManuscript(manuscript: Manuscript): Promise<Manuscript> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch('/api/casting/manuscripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manuscript),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create manuscript: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating manuscript in database:', error);
      }
    }
    
    // Fallback to localStorage
    saveManuscriptToStorage(manuscript);
    return manuscript;
  }

  /**
   * Update a manuscript
   */
  async updateManuscript(manuscript: Manuscript): Promise<Manuscript> {
    manuscript.updatedAt = new Date().toISOString();
    
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${manuscript.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manuscript),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update manuscript: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating manuscript in database:', error);
      }
    }
    
    // Fallback to localStorage
    saveManuscriptToStorage(manuscript);
    return manuscript;
  }

  /**
   * Delete a manuscript
   */
  async deleteManuscript(id: string): Promise<void> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete manuscript: ${response.statusText}`);
        }
        
        return;
      } catch (error) {
        console.error('Error deleting manuscript from database:', error);
      }
    }
    
    // Fallback to localStorage
    deleteManuscriptFromStorage(id);
  }

  /**
   * Get scenes for a manuscript
   */
  async getScenes(manuscriptId: string): Promise<SceneBreakdown[]> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${manuscriptId}/scenes`);
        if (!response.ok) {
          throw new Error(`Failed to fetch scenes: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching scenes from database:', error);
      }
    }
    
    return getScenesFromStorage(manuscriptId);
  }

  /**
   * Create or update a scene
   */
  async saveScene(scene: SceneBreakdown): Promise<SceneBreakdown> {
    scene.updatedAt = new Date().toISOString();
    
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch('/api/casting/scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scene),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save scene: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error saving scene to database:', error);
      }
    }
    
    // Fallback to localStorage
    saveSceneToStorage(scene);
    return scene;
  }

  /**
   * Get dialogue for a manuscript
   */
  async getDialogue(manuscriptId: string): Promise<DialogueLine[]> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${manuscriptId}/dialogue`);
        if (!response.ok) {
          throw new Error(`Failed to fetch dialogue: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching dialogue from database:', error);
      }
    }
    
    return getDialogueFromStorage(manuscriptId);
  }

  /**
   * Get revisions for a manuscript
   */
  async getRevisions(manuscriptId: string): Promise<ScriptRevision[]> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${manuscriptId}/revisions`);
        if (!response.ok) {
          throw new Error(`Failed to fetch revisions: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching revisions from database:', error);
      }
    }
    
    return getRevisionsFromStorage(manuscriptId);
  }

  /**
   * Create a new revision
   */
  async createRevision(revision: ScriptRevision): Promise<ScriptRevision> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch('/api/casting/revisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(revision),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create revision: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating revision in database:', error);
      }
    }
    
    // Fallback to localStorage
    saveRevisionToStorage(revision);
    return revision;
  }

  /**
   * Parse screenplay and generate scene breakdown
   * Supports Fountain format
   */
  async parseScript(content: string, format: 'fountain' | 'markdown' | 'final-draft'): Promise<{
    scenes: SceneBreakdown[];
    dialogue: DialogueLine[];
    characters: Set<string>;
  }> {
    const scenes: SceneBreakdown[] = [];
    const dialogue: DialogueLine[] = [];
    const characters = new Set<string>();
    
    if (format === 'fountain') {
      return this.parseFountain(content);
    } else if (format === 'markdown') {
      return this.parseMarkdown(content);
    }
    
    return { scenes, dialogue, characters };
  }

  /**
   * Parse Fountain format screenplay
   * Fountain is a plain text markup language for screenwriting
   * Enhanced version with full Fountain spec support
   */
  private parseFountain(content: string): {
    scenes: SceneBreakdown[];
    dialogue: DialogueLine[];
    characters: Set<string>;
  } {
    const scenes: SceneBreakdown[] = [];
    const dialogue: DialogueLine[] = [];
    const characters = new Set<string>();
    
    // Parse title page first (key: value pairs at start)
    const titlePageEnd = this.parseTitlePage(content);
    const scriptContent = content.substring(titlePageEnd);
    
    const lines = scriptContent.split('\n');
    let currentScene: Partial<SceneBreakdown> | null = null;
    let sceneNumber = 1;
    let lineNumber = 1;
    let currentCharacter: string | null = null;
    let inDualDialogue = false;
    let pageNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments (/* */ or [[notes]])
      if (!trimmedLine || trimmedLine.startsWith('/*') || trimmedLine.startsWith('[[')) {
        if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('[[')) {
          // Skip multi-line comments
          while (i < lines.length && !lines[i].includes('*/') && !lines[i].includes(']]')) {
            i++;
          }
        }
        continue;
      }
      
      // Boneyard (omitted sections) - starts with /*
      if (trimmedLine.startsWith('/*')) {
        while (i < lines.length && !lines[i].includes('*/')) {
          i++;
        }
        continue;
      }
      
      // Section headers (# heading)
      if (trimmedLine.startsWith('#') && !trimmedLine.match(/^#+\d+#$/)) {
        // Skip section headers for now
        continue;
      }
      
      // Scene heading with optional scene number (#1# or #1)
      const sceneNumberMatch = trimmedLine.match(/^#(\d+)#?\s*/);
      let sceneHeading = trimmedLine;
      let explicitSceneNumber: string | null = null;
      
      if (sceneNumberMatch) {
        explicitSceneNumber = sceneNumberMatch[1];
        sceneHeading = trimmedLine.replace(sceneNumberMatch[0], '').trim();
      }
      
      // Scene heading: INT., EXT., INT/EXT, I/E or forced scene heading with .
      const isSceneHeading = 
        sceneHeading.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i) ||
        (sceneHeading.startsWith('.') && !sceneHeading.startsWith('..'));
      
      if (isSceneHeading) {
        // Save previous scene if exists
        if (currentScene) {
          scenes.push(currentScene as SceneBreakdown);
        }
        
        // Remove forced scene heading marker
        if (sceneHeading.startsWith('.')) {
          sceneHeading = sceneHeading.substring(1).trim();
        }
        
        // Parse scene heading
        const intExtMatch = sceneHeading.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i);
        const intExt = intExtMatch ? intExtMatch[1].replace(/\./g, '').replace(/\//g, '/').toUpperCase() : 'INT';
        
        // Extract location and time of day
        const remainder = sceneHeading.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '');
        const parts = remainder.split(/\s+-\s+/);
        const locationName = parts[0]?.trim() || 'UNKNOWN';
        const timeOfDay = parts[1]?.trim().toUpperCase() || 'DAY';
        
        currentScene = {
          id: `scene-${Date.now()}-${sceneNumber}`,
          manuscriptId: '',
          projectId: '',
          sceneNumber: explicitSceneNumber || sceneNumber.toString(),
          sceneHeading,
          intExt: intExt as 'INT' | 'EXT' | 'INT/EXT',
          locationName,
          timeOfDay: timeOfDay as any,
          description: '',
          characters: [],
          status: 'not-scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        sceneNumber++;
        currentCharacter = null;
        continue;
      }
      
      // Transition: FADE TO:, CUT TO:, etc. (all caps ending with TO:)
      if (trimmedLine.match(/^[A-Z\s]+TO:$/) || trimmedLine.startsWith('>') && trimmedLine.endsWith('<')) {
        // Transitions don't create scene elements but could be tracked
        currentCharacter = null;
        continue;
      }
      
      // Centered text (>text<)
      if (trimmedLine.startsWith('>') && trimmedLine.endsWith('<')) {
        // Centered text for montages, etc - skip for now
        continue;
      }
      
      // Page break (===)
      if (trimmedLine === '===' || trimmedLine.match(/^={3,}$/)) {
        pageNumber++;
        continue;
      }
      
      // Lyrics/singing (~lyrics)
      if (trimmedLine.startsWith('~')) {
        // Could be treated as special dialogue
        continue;
      }
      
      // Character name with character extension
      // ALL CAPS possibly followed by (V.O.) or (O.S.) or (CONT'D)
      const characterMatch = trimmedLine.match(/^(@?)([A-Z][A-Z\s0-9'.]+?)(\s*\([^)]+\))?$/);
      
      if (characterMatch && trimmedLine.length > 1 && trimmedLine.length < 50) {
        const forcedCharacter = characterMatch[1] === '@';
        const characterName = characterMatch[2].trim();
        const extension = characterMatch[3]?.trim() || '';
        
        // Check if it's likely a character name (not a transition)
        if (!characterName.match(/^(FADE|CUT|DISSOLVE|SMASH|MATCH|IRIS|WIPE)/)) {
          currentCharacter = characterName;
          characters.add(characterName);
          
          // Check for dual dialogue (^ prefix)
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('^')) {
            inDualDialogue = true;
            i++; // Skip the ^ line
          }
          
          // Add to current scene's character list
          if (currentScene && !currentScene.characters?.includes(characterName)) {
            currentScene.characters = [...(currentScene.characters || []), characterName];
          }
          
          continue;
        }
      }
      
      // Dialogue (follows character name)
      if (currentCharacter && trimmedLine.length > 0) {
        // Check if it's a parenthetical
        if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')')) {
          // Parenthetical - add to previous dialogue if exists
          if (dialogue.length > 0 && dialogue[dialogue.length - 1].characterName === currentCharacter) {
            dialogue[dialogue.length - 1].parenthetical = trimmedLine;
          }
          continue;
        }
        
        // It's dialogue
        const dialogueLine: DialogueLine = {
          id: `dialogue-${Date.now()}-${lineNumber}`,
          sceneId: currentScene?.id || '',
          manuscriptId: '',
          characterName: currentCharacter,
          dialogueText: trimmedLine,
          dialogueType: 'dialogue', // Note: dual dialogue detected but not distinguished in type
          lineNumber: lineNumber++,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dialogue.push(dialogueLine);
        
        inDualDialogue = false; // Reset dual dialogue flag
        continue;
      }
      
      // Action/description (forced action starts with !)
      if (trimmedLine.length > 0 && currentScene) {
        let actionText = trimmedLine;
        
        // Remove forced action marker
        if (actionText.startsWith('!')) {
          actionText = actionText.substring(1);
        }
        
        currentScene.description = (currentScene.description || '') + actionText + '\n';
        currentCharacter = null; // Reset character on action line
      }
    }
    
    // Save last scene
    if (currentScene) {
      scenes.push(currentScene as SceneBreakdown);
    }
    
    return { scenes, dialogue, characters };
  }

  /**
   * Parse Fountain title page
   * Returns the character position where the title page ends
   */
  private parseTitlePage(content: string): number {
    const lines = content.split('\n');
    let titlePageEnd = 0;
    let inTitlePage = true;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Title page ends at first empty line followed by non-title-page content
      if (!line) {
        // Check if next non-empty line is title page format
        let nextNonEmpty = i + 1;
        while (nextNonEmpty < lines.length && !lines[nextNonEmpty].trim()) {
          nextNonEmpty++;
        }
        
        if (nextNonEmpty < lines.length) {
          const nextLine = lines[nextNonEmpty].trim();
          // If next line doesn't look like title page (key: value), end title page
          if (!nextLine.match(/^[A-Za-z\s]+:/)) {
            inTitlePage = false;
            titlePageEnd = content.indexOf(lines[i]);
            break;
          }
        }
      }
      
      // Title page format: "Key: Value"
      if (!line.match(/^[A-Za-z\s]+:/) && line.length > 0) {
        inTitlePage = false;
        titlePageEnd = content.indexOf(lines[i]);
        break;
      }
    }
    
    return titlePageEnd;
  }

  /**
   * Parse Markdown format screenplay
   */
  private parseMarkdown(content: string): {
    scenes: SceneBreakdown[];
    dialogue: DialogueLine[];
    characters: Set<string>;
  } {
    // Simplified markdown parser
    // Assumes ## for scene headings, **NAME** for characters
    const scenes: SceneBreakdown[] = [];
    const dialogue: DialogueLine[] = [];
    const characters = new Set<string>();
    
    const lines = content.split('\n');
    let currentScene: Partial<SceneBreakdown> | null = null;
    let sceneNumber = 1;
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentScene) {
          scenes.push(currentScene as SceneBreakdown);
        }
        
        const heading = line.replace('## ', '').trim();
        currentScene = {
          id: `scene-${Date.now()}-${sceneNumber}`,
          manuscriptId: '',
          projectId: '',
          sceneNumber: sceneNumber.toString(),
          sceneHeading: heading,
          locationName: heading,
          description: '',
          characters: [],
          status: 'not-scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        sceneNumber++;
      } else if (line.match(/^\*\*[A-Z\s]+\*\*:/)) {
        const match = line.match(/^\*\*([A-Z\s]+)\*\*:\s*(.+)/);
        if (match) {
          const characterName = match[1].trim();
          const dialogueText = match[2].trim();
          
          characters.add(characterName);
          
          if (currentScene && !currentScene.characters?.includes(characterName)) {
            currentScene.characters = [...(currentScene.characters || []), characterName];
          }
          
          dialogue.push({
            id: `dialogue-${Date.now()}-${dialogue.length}`,
            sceneId: currentScene?.id || '',
            manuscriptId: '',
            characterName,
            dialogueText,
            dialogueType: 'dialogue',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (currentScene && line.trim().length > 0) {
        currentScene.description = (currentScene.description || '') + line + '\n';
      }
    }
    
    if (currentScene) {
      scenes.push(currentScene as SceneBreakdown);
    }
    
    return { scenes, dialogue, characters };
  }

  /**
   * Get acts for a manuscript
   */
  async getActs(manuscriptId: string): Promise<Act[]> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/manuscripts/${manuscriptId}/acts`);
        if (!response.ok) {
          throw new Error(`Failed to fetch acts: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching acts from database:', error);
      }
    }
    
    // Fallback to localStorage
    const key = `manuscript_${manuscriptId}_acts`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get a single act by ID
   */
  async getAct(actId: string): Promise<Act | null> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/acts/${actId}`);
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`Failed to fetch act: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching act from database:', error);
      }
    }
    
    return null;
  }

  /**
   * Create a new act
   */
  async createAct(act: Act): Promise<Act> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch('/api/casting/acts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(act),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create act: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating act in database:', error);
      }
    }
    
    // Fallback to localStorage
    const key = `manuscript_${act.manuscriptId}_acts`;
    const stored = localStorage.getItem(key);
    const acts: Act[] = stored ? JSON.parse(stored) : [];
    acts.push(act);
    localStorage.setItem(key, JSON.stringify(acts));
    
    return act;
  }

  /**
   * Update an existing act
   */
  async updateAct(act: Act): Promise<Act> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/acts/${act.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(act),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update act: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating act in database:', error);
      }
    }
    
    // Fallback to localStorage
    const key = `manuscript_${act.manuscriptId}_acts`;
    const stored = localStorage.getItem(key);
    const acts: Act[] = stored ? JSON.parse(stored) : [];
    const index = acts.findIndex(a => a.id === act.id);
    
    if (index >= 0) {
      acts[index] = act;
      localStorage.setItem(key, JSON.stringify(acts));
    }
    
    return act;
  }

  /**
   * Delete an act
   */
  async deleteAct(actId: string, manuscriptId: string): Promise<void> {
    const isDbAvailable = await checkDatabaseAvailability();
    
    if (isDbAvailable) {
      try {
        const response = await fetch(`/api/casting/acts/${actId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete act: ${response.statusText}`);
        }
        
        return;
      } catch (error) {
        console.error('Error deleting act from database:', error);
      }
    }
    
    // Fallback to localStorage
    const key = `manuscript_${manuscriptId}_acts`;
    const stored = localStorage.getItem(key);
    const acts: Act[] = stored ? JSON.parse(stored) : [];
    const filtered = acts.filter(a => a.id !== actId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  /**
   * Calculate script statistics
   */
  calculateStats(manuscript: Manuscript): {
    pageCount: number;
    wordCount: number;
    estimatedRuntime: number;
  } {
    const content = manuscript.content;
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    
    // Industry standard: ~250 words per page, 1 page ≈ 1 minute
    const pageCount = Math.ceil(wordCount / 250);
    const estimatedRuntime = pageCount;
    
    return { pageCount, wordCount, estimatedRuntime };
  }

  /**
   * Auto-link characters from manuscript to existing roles
   * Uses fuzzy matching to find role matches
   */
  async linkCharactersToRoles(
    projectId: string,
    characters: Set<string>
  ): Promise<Map<string, string>> {
    const characterToRoleMap = new Map<string, string>();
    
    const isDbAvailable = await checkDatabaseAvailability();
    if (!isDbAvailable) {
      return characterToRoleMap;
    }
    
    try {
      // Fetch all roles for the project
      const response = await fetch(`/api/casting/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project data');
      }
      
      const project = await response.json();
      const roles = project.roles || [];
      
      // Match characters to roles using fuzzy matching
      for (const character of characters) {
        const matchedRole = this.findBestRoleMatch(character, roles);
        if (matchedRole) {
          characterToRoleMap.set(character, matchedRole.id);
        }
      }
      
      return characterToRoleMap;
    } catch (error) {
      console.error('Error linking characters to roles:', error);
      return characterToRoleMap;
    }
  }

  /**
   * Find best matching role for a character name using fuzzy matching
   */
  private findBestRoleMatch(characterName: string, roles: any[]): any | null {
    const cleanCharacter = characterName.toLowerCase().trim();
    
    // Direct match first
    for (const role of roles) {
      const roleName = role.characterName?.toLowerCase().trim() || '';
      if (roleName === cleanCharacter) {
        return role;
      }
    }
    
    // Fuzzy match: check if character name contains role name or vice versa
    for (const role of roles) {
      const roleName = role.characterName?.toLowerCase().trim() || '';
      if (cleanCharacter.includes(roleName) || roleName.includes(cleanCharacter)) {
        return role;
      }
    }
    
    // Check common variations (removing V.O., O.S., CONT'D, etc.)
    const strippedCharacter = cleanCharacter
      .replace(/\s*\(v\.o\.\)\s*/gi, '')
      .replace(/\s*\(o\.s\.\)\s*/gi, '')
      .replace(/\s*\(cont'd\)\s*/gi, '')
      .replace(/\s*\(continuing\)\s*/gi, '')
      .trim();
    
    for (const role of roles) {
      const roleName = role.characterName?.toLowerCase().trim() || '';
      if (roleName === strippedCharacter || strippedCharacter.includes(roleName)) {
        return role;
      }
    }
    
    return null;
  }

  /**
   * Auto-link scene locations to existing locations in database
   */
  async linkLocationsToDatabase(
    projectId: string,
    scenes: SceneBreakdown[]
  ): Promise<Map<string, string>> {
    const sceneToLocationMap = new Map<string, string>();
    
    const isDbAvailable = await checkDatabaseAvailability();
    if (!isDbAvailable) {
      return sceneToLocationMap;
    }
    
    try {
      // Fetch all locations for the project
      const response = await fetch(`/api/casting/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project data');
      }
      
      const project = await response.json();
      const locations = project.locations || [];
      
      // Match scene locations to database locations
      for (const scene of scenes) {
        if (!scene.locationName) continue;
        
        const matchedLocation = this.findBestLocationMatch(scene.locationName, locations);
        if (matchedLocation) {
          sceneToLocationMap.set(scene.id, matchedLocation.id);
        }
      }
      
      return sceneToLocationMap;
    } catch (error) {
      console.error('Error linking locations:', error);
      return sceneToLocationMap;
    }
  }

  /**
   * Find best matching location using fuzzy matching
   */
  private findBestLocationMatch(locationName: string, locations: any[]): any | null {
    const cleanLocation = locationName.toLowerCase().trim();
    
    // Direct match first
    for (const location of locations) {
      const dbLocationName = location.locationName?.toLowerCase().trim() || '';
      if (dbLocationName === cleanLocation) {
        return location;
      }
    }
    
    // Fuzzy match
    for (const location of locations) {
      const dbLocationName = location.locationName?.toLowerCase().trim() || '';
      if (cleanLocation.includes(dbLocationName) || dbLocationName.includes(cleanLocation)) {
        return location;
      }
    }
    
    return null;
  }

  /**
   * Extract props mentioned in scene descriptions
   * Returns list of potential props that could be added to database
   */
  extractPropsFromScenes(scenes: SceneBreakdown[]): Set<string> {
    const props = new Set<string>();
    
    // Common prop keywords to look for
    const propKeywords = [
      'gun', 'knife', 'phone', 'laptop', 'car', 'keys', 'wallet', 'bag',
      'camera', 'book', 'letter', 'document', 'briefcase', 'suitcase',
      'bottle', 'glass', 'cup', 'plate', 'food', 'drink',
      'watch', 'ring', 'necklace', 'bracelet', 'jewelry',
      'hat', 'coat', 'jacket', 'sunglasses', 'umbrella',
      'newspaper', 'magazine', 'pen', 'pencil', 'notebook',
      'weapon', 'sword', 'shield', 'bow', 'arrow'
    ];
    
    for (const scene of scenes) {
      const description = scene.description?.toLowerCase() || '';
      
      for (const keyword of propKeywords) {
        if (description.includes(keyword)) {
          props.add(keyword);
        }
      }
    }
    
    return props;
  }

  /**
   * Apply auto-linking results to scenes and dialogue
   */
  async applyAutoLinking(
    projectId: string,
    scenes: SceneBreakdown[],
    dialogue: DialogueLine[],
    characters: Set<string>
  ): Promise<{
    scenes: SceneBreakdown[];
    dialogue: DialogueLine[];
    stats: {
      rolesLinked: number;
      locationsLinked: number;
      propsFound: number;
    };
  }> {
    // Link characters to roles
    const characterToRoleMap = await this.linkCharactersToRoles(projectId, characters);
    
    // Link locations
    const sceneToLocationMap = await this.linkLocationsToDatabase(projectId, scenes);
    
    // Extract props
    const extractedProps = this.extractPropsFromScenes(scenes);
    
    // Apply role linking to dialogue
    const updatedDialogue = dialogue.map(line => ({
      ...line,
      roleId: characterToRoleMap.get(line.characterName) || line.roleId,
    }));
    
    // Apply location linking to scenes
    const updatedScenes = scenes.map(scene => ({
      ...scene,
      locationId: sceneToLocationMap.get(scene.id) || scene.locationId,
      propsNeeded: scene.propsNeeded || Array.from(extractedProps),
    }));
    
    return {
      scenes: updatedScenes,
      dialogue: updatedDialogue,
      stats: {
        rolesLinked: characterToRoleMap.size,
        locationsLinked: sceneToLocationMap.size,
        propsFound: extractedProps.size,
      },
    };
  }

  /**
   * Export complete manuscript with all production data as JSON
   */
  async exportManuscriptAsJSON(
    manuscript: Manuscript,
    acts: Act[],
    scenes: SceneBreakdown[],
    characters: string[],
    dialogueLines: DialogueLine[],
    revisions: ScriptRevision[],
    shotData?: any
  ): Promise<ManuscriptExport> {
    const totalRuntime = scenes.reduce((sum, scene) => sum + (scene.estimatedDuration || 0), 0);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'Manual Export',

      metadata: {
        title: manuscript.title,
        subtitle: manuscript.subtitle || '',
        author: manuscript.author || '',
        format: manuscript.format as any,
        projectId: manuscript.projectId,
        manuscriptId: manuscript.id,
        createdAt: manuscript.createdAt,
        updatedAt: manuscript.updatedAt,
      },

      manuscript,
      acts,
      scenes,
      characters,
      dialogueLines,

      production: {
        shotDetails: {
          cameras: shotData?.cameras || {},
          lighting: shotData?.lighting || {},
          audio: shotData?.audio || {},
          notes: shotData?.notes || {},
        },
        storyboards: shotData?.storyboards || [],
      },

      revisions,

      statistics: {
        sceneCount: scenes.length,
        characterCount: characters.length,
        estimatedRuntime: totalRuntime,
        shotCount: scenes.reduce((sum, s) => sum + (s.description ? 1 : 0), 0),
      },
    };
  }

  /**
   * Download export as JSON file
   */
  downloadExportAsFile(exportData: ManuscriptExport, filename?: string): void {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${exportData.metadata.title.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Validate imported JSON structure
   */
  validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required top-level properties
    if (!data.version) errors.push('Missing version field');
    if (!data.metadata) errors.push('Missing metadata');
    if (!data.manuscript) errors.push('Missing manuscript data');
    if (!Array.isArray(data.scenes)) errors.push('Scenes must be an array');
    if (!Array.isArray(data.acts)) errors.push('Acts must be an array');

    // Check metadata structure
    if (data.metadata) {
      if (!data.metadata.title) errors.push('Metadata missing title');
      if (!data.metadata.manuscriptId) errors.push('Metadata missing manuscriptId');
    }

    // Check manuscript structure
    if (data.manuscript) {
      if (!data.manuscript.id) errors.push('Manuscript missing id');
      if (!data.manuscript.title) errors.push('Manuscript missing title');
      if (!data.manuscript.projectId) errors.push('Manuscript missing projectId');
    }

    // Check scenes have required fields
    if (Array.isArray(data.scenes)) {
      data.scenes.forEach((scene: any, index: number) => {
        if (!scene.id) errors.push(`Scene ${index} missing id`);
        if (!scene.sceneNumber) errors.push(`Scene ${index} missing sceneNumber`);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Import manuscript from JSON file
   */
  async importManuscriptFromJSON(file: File): Promise<{ success: boolean; data?: ManuscriptExport; error?: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      const validation = this.validateImportData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse JSON file',
      };
    }
  }

  /**
   * Restore manuscript from exported JSON (creates/updates in state)
   */
  async restoreFromExport(exportData: ManuscriptExport): Promise<{
    manuscript: Manuscript;
    acts: Act[];
    scenes: SceneBreakdown[];
    characters: string[];
    dialogueLines: DialogueLine[];
    revisions: ScriptRevision[];
  }> {
    // Generate new IDs for imported data to avoid conflicts
    const idMap = new Map<string, string>();

    // Map old IDs to new ones
    const newManuscriptId = `ms_${Date.now()}`;
    idMap.set(exportData.manuscript.id, newManuscriptId);

    // Update manuscript with new ID
    const updatedManuscript: Manuscript = {
      ...exportData.manuscript,
      id: newManuscriptId,
      updatedAt: new Date().toISOString(),
    };

    // Update acts with new IDs
    const updatedActs = exportData.acts.map((act) => {
      const newActId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(act.id, newActId);
      return {
        ...act,
        id: newActId,
        manuscriptId: newManuscriptId,
      };
    });

    // Update scenes with new IDs
    const updatedScenes = exportData.scenes.map((scene) => {
      const newSceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(scene.id, newSceneId);
      return {
        ...scene,
        id: newSceneId,
        manuscriptId: newManuscriptId,
        actId: scene.actId ? idMap.get(scene.actId) : undefined,
      };
    });

    // Update dialogue lines with new IDs
    const updatedDialogueLines = exportData.dialogueLines.map((line) => {
      const newLineId = `dialog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        ...line,
        id: newLineId,
        sceneId: idMap.get(line.sceneId) || line.sceneId,
      };
    });

    // Update revisions with new IDs
    const updatedRevisions = exportData.revisions.map((rev) => {
      const newRevId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        ...rev,
        id: newRevId,
        manuscriptId: newManuscriptId,
      };
    });

    return {
      manuscript: updatedManuscript,
      acts: updatedActs,
      scenes: updatedScenes,
      characters: exportData.characters,
      dialogueLines: updatedDialogueLines,
      revisions: updatedRevisions,
    };
  }
}

export const manuscriptService = new ManuscriptService();

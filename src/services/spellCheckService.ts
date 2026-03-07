/**
 * Spell Check Service for Screenplay Editor
 * 
 * Features:
 * - Bilingual support (Norwegian Bokmål + English)
 * - Screenplay-specific term recognition (INT/EXT, character names, etc.)
 * - Custom dictionary with learning
 * - "Check All" functionality
 * - Integration with browser spell check
 */

import settingsService, { getCurrentUserId } from './settingsService';

// Spell check result types
export interface SpellingError {
  word: string;
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  suggestions: string[];
  context: string; // Surrounding text for context
  type: 'spelling' | 'unknown' | 'case';
}

export interface SpellCheckResult {
  errors: SpellingError[];
  totalWords: number;
  checkedWords: number;
  ignoredWords: number;
  customDictionaryHits: number;
}

export interface DictionaryWord {
  word: string;
  language: 'en' | 'no' | 'both';
  addedAt: string;
  source: 'user' | 'screenplay' | 'character' | 'location';
}

// Screenplay-specific terms that should always be ignored
const SCREENPLAY_TERMS = new Set([
  // Scene headings
  'INT', 'EXT', 'INT/EXT', 'I/E', 'EST',
  // Time of day
  'DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'EVENING', 'AFTERNOON',
  'CONTINUOUS', 'LATER', 'SAME', 'MOMENTS',
  // Norwegian time
  'DAG', 'NATT', 'MORGEN', 'KVELD', 'ETTERMIDDAG', 'GRYNING', 'SKUMRING',
  'KONTINUERLIG', 'SENERE', 'SAMME',
  // Transitions
  'CUT', 'FADE', 'DISSOLVE', 'WIPE', 'SMASH', 'MATCH',
  'INTERCUT', 'FLASHBACK', 'FLASH', 'BACK', 'FORWARD',
  // Camera directions
  'POV', 'OS', 'OC', 'VO', 'CONT', 'CONTD', "CONT'D",
  'ANGLE', 'CLOSE', 'WIDE', 'MEDIUM', 'EXTREME', 'INSERT',
  'PAN', 'TILT', 'ZOOM', 'DOLLY', 'TRACK', 'CRANE', 'STEADICAM',
  'HANDHELD', 'AERIAL', 'UNDERWATER',
  // Parentheticals
  'BEAT', 'PAUSE', 'QUIETLY', 'ANGRILY', 'SOFTLY', 'LOUDLY',
  'WHISPERS', 'YELLS', 'LAUGHS', 'CRIES', 'SIGHS',
  // Norwegian parentheticals
  'STILLE', 'SINT', 'LAVT', 'HØYT', 'HVISKER', 'ROPER', 'LER', 'GRÅTER', 'SUKKER',
  // Common screenplay abbreviations
  'SFX', 'VFX', 'CGI', 'MOS', 'SOT', 'BG', 'FG', 'OTS',
  // Script elements
  'SUPER', 'TITLE', 'SUBTITLE', 'CHYRON', 'MONTAGE', 'SERIES', 'SHOTS',
  'BEGIN', 'END', 'THE',
  // Norwegian screenplay terms
  'TEKST', 'UNDERTEKST', 'TITTEL',
]);

// Common Norwegian words that English spell checkers might flag
const NORWEGIAN_COMMON_WORDS = new Set([
  // Articles, pronouns, prepositions
  'en', 'et', 'ei', 'den', 'det', 'de', 'han', 'hun', 'vi', 'dere', 'jeg', 'du', 'meg', 'deg',
  'seg', 'sin', 'sitt', 'sine', 'min', 'mitt', 'mine', 'din', 'ditt', 'dine',
  'vår', 'vårt', 'våre', 'deres', 'henne', 'hennes', 'hans', 'dens', 'dets',
  'i', 'på', 'til', 'fra', 'med', 'for', 'av', 'om', 'ved', 'hos', 'mot', 'etter',
  'mellom', 'under', 'over', 'bak', 'foran', 'gjennom', 'langs', 'rundt',
  // Common verbs
  'er', 'var', 'har', 'hadde', 'kan', 'kunne', 'vil', 'ville', 'skal', 'skulle',
  'må', 'måtte', 'får', 'fikk', 'går', 'gikk', 'kommer', 'kom', 'ser', 'så',
  'sier', 'sa', 'vet', 'visste', 'tror', 'tenker', 'mener', 'synes', 'liker',
  'elsker', 'hater', 'ønsker', 'trenger', 'prøver', 'hjelper', 'jobber', 'bor',
  // Common nouns
  'mann', 'kvinne', 'barn', 'gutt', 'jente', 'folk', 'menneske', 'mennesker',
  'hus', 'hjem', 'rom', 'dør', 'vindu', 'bil', 'vei', 'gate', 'by', 'land',
  'tid', 'dag', 'natt', 'morgen', 'kveld', 'uke', 'måned', 'år', 'liv', 'død',
  'øye', 'øyne', 'hånd', 'hender', 'hode', 'kropp', 'hjerte', 'ansikt',
  // Common adjectives
  'god', 'godt', 'gode', 'stor', 'stort', 'store', 'liten', 'lite', 'små',
  'ny', 'nytt', 'nye', 'gammel', 'gammelt', 'gamle', 'ung', 'ungt', 'unge',
  'lang', 'langt', 'lange', 'kort', 'kort', 'korte', 'høy', 'høyt', 'høye',
  'rask', 'raskt', 'raske', 'sakte', 'stille', 'rolig', 'sint', 'glad', 'trist',
  'redd', 'lei', 'sliten', 'sulten', 'tørst', 'kald', 'varm', 'våt', 'tørr',
  // Common adverbs
  'ikke', 'bare', 'også', 'aldri', 'alltid', 'ofte', 'sjelden', 'nå', 'da',
  'her', 'der', 'hvor', 'når', 'hvorfor', 'hvordan', 'hva', 'hvem', 'hvilken',
  'kanskje', 'sikkert', 'visst', 'egentlig', 'virkelig', 'helt', 'veldig', 'ganske',
  // Conjunctions
  'og', 'eller', 'men', 'så', 'fordi', 'hvis', 'når', 'mens', 'selv', 'om',
  'enten', 'både', 'verken', 'hverken', 'enn', 'at', 'som',
  // Numbers
  'en', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'syv', 'åtte', 'ni', 'ti',
  'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten', 'tjue',
  'hundre', 'tusen', 'million', 'milliard',
  // Other common words
  'ja', 'nei', 'ok', 'okay', 'hei', 'ha det', 'takk', 'vær', 'så', 'snill',
  'unnskyld', 'beklager', 'vent', 'stopp', 'kom', 'gå', 'se', 'hør',
]);

// Common English words (to help with mixed-language scripts)
const ENGLISH_COMMON_WORDS = new Set([
  // We rely mostly on browser spell check for English
  // These are words that might be flagged but are valid
  'okay', 'ok', 'gonna', 'gotta', 'wanna', 'kinda', 'sorta',
  'yeah', 'yep', 'nope', 'nah', 'uh', 'um', 'hmm', 'huh',
  'gonna', 'gotta', 'lemme', 'gimme', 'dunno', 'ain\'t',
]);

// Custom dictionary storage
const CUSTOM_DICT_KEY = 'screenplay_custom_dictionary';
const PROJECT_TERMS_KEY = 'screenplay_project_terms';

class SpellCheckService {
  private customDictionary: Map<string, DictionaryWord> = new Map();
  private projectTerms: Set<string> = new Set(); // Character names, locations from current project
  private initialized = false;

  constructor() {
    this.loadCustomDictionary();
  }

  /**
   * Load custom dictionary from settings cache
   */
  private loadCustomDictionary(): void {
    if (this.initialized) return;
    
    try {
      void this.hydrateFromDb();
    } catch (e) {
      console.warn('Failed to load custom dictionary:', e);
    }
    
    this.initialized = true;
  }

  /**
   * Save custom dictionary to settings cache
   */
  private saveCustomDictionary(): void {
    try {
      const words = Array.from(this.customDictionary.values());
      void settingsService.setSetting(CUSTOM_DICT_KEY, words, { userId: getCurrentUserId() });
    } catch (e) {
      console.warn('Failed to save custom dictionary:', e);
    }
  }

  private async hydrateFromDb(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const userId = getCurrentUserId();
      const dict = await settingsService.getSetting<DictionaryWord[]>(CUSTOM_DICT_KEY, { userId });
      if (dict) {
        this.customDictionary.clear();
        dict.forEach((word) => this.customDictionary.set(word.word.toLowerCase(), word));
      }

      const terms = await settingsService.getSetting<string[]>(PROJECT_TERMS_KEY, { userId });
      if (terms) {
        this.projectTerms = new Set(terms.map((term) => term.toLowerCase()));
      }
    } catch (e) {
      console.warn('Failed to hydrate custom dictionary:', e);
    }
  }

  /**
   * Add word to custom dictionary
   */
  addToDictionary(
    word: string, 
    language: 'en' | 'no' | 'both' = 'both',
    source: 'user' | 'screenplay' | 'character' | 'location' = 'user'
  ): boolean {
    const normalized = word.toLowerCase().trim();
    if (!normalized || normalized.length < 2) return false;
    
    if (this.customDictionary.has(normalized)) {
      return false; // Already exists
    }
    
    this.customDictionary.set(normalized, {
      word: normalized,
      language,
      addedAt: new Date().toISOString(),
      source
    });
    
    this.saveCustomDictionary();
    return true;
  }

  /**
   * Remove word from custom dictionary
   */
  removeFromDictionary(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    const existed = this.customDictionary.delete(normalized);
    if (existed) {
      this.saveCustomDictionary();
    }
    return existed;
  }

  /**
   * Get all custom dictionary words
   */
  getCustomDictionary(): DictionaryWord[] {
    return Array.from(this.customDictionary.values());
  }

  /**
   * Set project-specific terms (character names, locations)
   */
  setProjectTerms(terms: string[]): void {
    this.projectTerms.clear();
    terms.forEach(t => {
      if (t && t.length >= 2) {
        this.projectTerms.add(t.toLowerCase());
      }
    });
    
    try {
      safeStorage.setItem(PROJECT_TERMS_KEY, JSON.stringify(terms));
      void settingsService.setSetting(PROJECT_TERMS_KEY, terms, { userId: getCurrentUserId() });
    } catch (e) {
      console.warn('Failed to save project terms:', e);
    }
  }

  /**
   * Add project terms from screenplay content (character names, locations)
   */
  extractProjectTerms(content: string): string[] {
    const terms: Set<string> = new Set();
    const lines = content.split('\n');
    
    // Character names (ALL CAPS at start of line after blank)
    const charPattern = /^([A-ZÆØÅ][A-ZÆØÅ0-9\s\-'\.]+)(\s*\(.*\))?$/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Character names
      if (charPattern.test(line) && (i === 0 || lines[i-1].trim() === '')) {
        const match = line.match(charPattern);
        if (match) {
          const charName = match[1].replace(/\s*\(.*\)$/, '').trim();
          if (charName && charName.length >= 2 && !SCREENPLAY_TERMS.has(charName)) {
            terms.add(charName);
          }
        }
      }
      
      // Scene locations (after INT./EXT.)
      const sceneMatch = line.match(/^\.?(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]+([^-]+)/i);
      if (sceneMatch) {
        const location = sceneMatch[2].trim();
        if (location && location.length >= 2) {
          // Split by common separators and add each part
          location.split(/[\s\-\/]+/).forEach(part => {
            if (part.length >= 3 && !SCREENPLAY_TERMS.has(part.toUpperCase())) {
              terms.add(part);
            }
          });
        }
      }
    }
    
    const termArray = Array.from(terms);
    this.setProjectTerms(termArray);
    return termArray;
  }

  /**
   * Check if a word should be ignored
   */
  shouldIgnoreWord(word: string): boolean {
    const upper = word.toUpperCase();
    const lower = word.toLowerCase();
    
    // Screenplay terms
    if (SCREENPLAY_TERMS.has(upper)) return true;
    
    // Custom dictionary
    if (this.customDictionary.has(lower)) return true;
    
    // Project terms (character names, locations)
    if (this.projectTerms.has(lower)) return true;
    
    // Norwegian common words
    if (NORWEGIAN_COMMON_WORDS.has(lower)) return true;
    
    // English common words
    if (ENGLISH_COMMON_WORDS.has(lower)) return true;
    
    // Numbers
    if (/^\d+$/.test(word)) return true;
    
    // Very short words
    if (word.length < 2) return true;
    
    // Words with special characters (likely intentional)
    if (/[@#$%&*]/.test(word)) return true;
    
    // Contractions
    if (/^[a-zA-Z]+'[a-zA-Z]+$/.test(word)) return true;
    
    // ALL CAPS words (likely intentional - character names, emphasis)
    if (word === upper && word.length > 1) return true;
    
    return false;
  }

  /**
   * Check spelling of entire document
   * Returns list of potential spelling errors
   */
  async checkDocument(content: string): Promise<SpellCheckResult> {
    const errors: SpellingError[] = [];
    const lines = content.split('\n');
    let totalWords = 0;
    let checkedWords = 0;
    let ignoredWords = 0;
    let customDictionaryHits = 0;

    // First, extract project terms
    this.extractProjectTerms(content);

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      // Skip scene headings (they contain intentional terms)
      if (/^\.?(INT|EXT|EST|INT\.?\/EXT|I\/E)\b/i.test(line.trim())) {
        continue;
      }
      
      // Skip transitions
      if (/^(CUT TO|FADE|DISSOLVE|SMASH CUT|MATCH CUT):/i.test(line.trim())) {
        continue;
      }
      
      // Extract words from line
      const wordMatches = line.matchAll(/\b([a-zA-ZæøåÆØÅ][a-zA-ZæøåÆØÅ'-]*)\b/g);
      
      for (const match of wordMatches) {
        const word = match[1];
        const columnStart = match.index || 0;
        totalWords++;
        
        if (this.shouldIgnoreWord(word)) {
          if (this.customDictionary.has(word.toLowerCase())) {
            customDictionaryHits++;
          }
          ignoredWords++;
          continue;
        }
        
        checkedWords++;
        
        // Check if word looks potentially misspelled
        // We use heuristics since we don't have a full dictionary
        const possibleError = await this.checkWord(word);
        
        if (possibleError) {
          // Get context (surrounding words)
          const contextStart = Math.max(0, columnStart - 20);
          const contextEnd = Math.min(line.length, columnStart + word.length + 20);
          const context = line.substring(contextStart, contextEnd);
          
          errors.push({
            word,
            lineNumber: lineNum + 1,
            columnStart,
            columnEnd: columnStart + word.length,
            suggestions: possibleError.suggestions,
            context: (contextStart > 0 ? '...' : '') + context + (contextEnd < line.length ? '...' : ''),
            type: possibleError.type
          });
        }
      }
    }

    return {
      errors,
      totalWords,
      checkedWords,
      ignoredWords,
      customDictionaryHits
    };
  }

  /**
   * Check a single word for potential spelling issues
   * Uses heuristics since we don't have a full dictionary
   */
  private async checkWord(word: string): Promise<{ suggestions: string[]; type: 'spelling' | 'unknown' | 'case' } | null> {
    // For now, we use simple heuristics
    // In a production system, you'd integrate with a real spell checker API
    
    const lower = word.toLowerCase();
    
    // Check for common typo patterns
    const suggestions: string[] = [];
    
    // Double letters that might be typos
    if (/(.)\1{2,}/.test(lower)) {
      suggestions.push(lower.replace(/(.)\1{2,}/g, '$1$1'));
      return { suggestions, type: 'spelling' };
    }
    
    // Mixed case in middle of word (not ALL CAPS, not Title Case)
    if (!/^[A-ZÆØÅ]?[a-zæøå]+$/.test(word) && !/^[A-ZÆØÅ]+$/.test(word)) {
      if (/[a-zæøå][A-ZÆØÅ]/.test(word)) {
        suggestions.push(word.toLowerCase());
        suggestions.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        return { suggestions, type: 'case' };
      }
    }
    
    // Very unusual letter combinations (potential typos)
    const unusualPatterns = [
      /[qwx]{2,}/, // Unusual double consonants
      /[aeiouæøå]{4,}/, // Too many vowels in a row
      /[bcdfghjklmnpqrstvwxz]{5,}/, // Too many consonants
    ];
    
    for (const pattern of unusualPatterns) {
      if (pattern.test(lower)) {
        return { suggestions: [], type: 'unknown' };
      }
    }
    
    return null; // Word seems fine
  }

  /**
   * Get suggestions for a word using various methods
   */
  async getSuggestions(word: string): Promise<string[]> {
    const suggestions: string[] = [];
    const lower = word.toLowerCase();
    
    // Check custom dictionary for similar words
    for (const dictWord of this.customDictionary.keys()) {
      if (this.levenshteinDistance(lower, dictWord) <= 2) {
        suggestions.push(dictWord);
      }
    }
    
    // Check Norwegian common words for similar
    for (const norwWord of NORWEGIAN_COMMON_WORDS) {
      if (this.levenshteinDistance(lower, norwWord) <= 2) {
        suggestions.push(norwWord);
      }
    }
    
    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Get statistics about the dictionary
   */
  getStats(): {
    customWords: number;
    projectTerms: number;
    screenplayTerms: number;
    norwegianWords: number;
  } {
    return {
      customWords: this.customDictionary.size,
      projectTerms: this.projectTerms.size,
      screenplayTerms: SCREENPLAY_TERMS.size,
      norwegianWords: NORWEGIAN_COMMON_WORDS.size
    };
  }

  /**
   * Clear all custom dictionary entries
   */
  clearCustomDictionary(): void {
    this.customDictionary.clear();
    this.saveCustomDictionary();
  }

  /**
   * Export custom dictionary for backup
   */
  exportDictionary(): string {
    return JSON.stringify({
      customWords: Array.from(this.customDictionary.values()),
      projectTerms: Array.from(this.projectTerms),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import custom dictionary from backup
   */
  importDictionary(json: string): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;
    
    try {
      const data = JSON.parse(json);
      
      if (data.customWords) {
        for (const word of data.customWords) {
          if (this.addToDictionary(word.word, word.language, word.source)) {
            imported++;
          } else {
            skipped++;
          }
        }
      }
      
      if (data.projectTerms) {
        data.projectTerms.forEach((term: string) => this.projectTerms.add(term.toLowerCase()));
        safeStorage.setItem(PROJECT_TERMS_KEY, JSON.stringify(data.projectTerms));
        void settingsService.setSetting(PROJECT_TERMS_KEY, data.projectTerms, { userId: getCurrentUserId() });
      }
    } catch (e) {
      console.error('Failed to import dictionary:', e);
    }
    
    return { imported, skipped };
  }
}

// Export singleton instance
export const spellCheckService = new SpellCheckService();

// Export types
export type { SpellCheckService };

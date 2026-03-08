import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type FC,
  type KeyboardEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Autocomplete,
  Popper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Person as CharacterIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Star as StarIcon,
  TrendingUp as FrequentIcon,
} from '@mui/icons-material';
import settingsService, { getCurrentUserId } from '../services/settingsService';

interface CharacterAutocompleteProps {
  characters: string[];
  recentCharacters?: string[];
  frequentCharacters?: string[];
  onSelect: (character: string) => void;
  onAdd?: (character: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  placeholder?: string;
}

interface CharacterOption {
  name: string;
  type: 'recent' | 'frequent' | 'all' | 'new';
  count?: number;
}

export const CharacterAutocomplete: FC<CharacterAutocompleteProps> = ({
  characters,
  recentCharacters = [],
  frequentCharacters = [],
  onSelect,
  onAdd,
  inputValue,
  onInputChange,
  open,
  onClose,
  anchorEl,
  placeholder = 'Skriv karakternavn...',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Build options list with categories
  const options = useMemo((): CharacterOption[] => {
    const result: CharacterOption[] = [];
    const searchLower = inputValue.toLowerCase();
    
    // Filter by search input
    const filterBySearch = (names: string[]) => 
      names.filter(name => name.toLowerCase().includes(searchLower));
    
    // Recent characters (max 3)
    const recentFiltered = filterBySearch(recentCharacters).slice(0, 3);
    if (recentFiltered.length > 0 && !inputValue) {
      recentFiltered.forEach(name => {
        result.push({ name, type: 'recent' });
      });
    }
    
    // Frequent characters (max 5)
    const frequentFiltered = filterBySearch(frequentCharacters).slice(0, 5);
    frequentFiltered.forEach(name => {
      if (!result.find(o => o.name === name)) {
        result.push({ name, type: 'frequent' });
      }
    });
    
    // All matching characters
    const allFiltered = filterBySearch(characters);
    allFiltered.forEach(name => {
      if (!result.find(o => o.name === name)) {
        result.push({ name, type: 'all' });
      }
    });
    
    // Option to add new character if input doesn't match
    if (inputValue && !characters.find(c => c.toLowerCase() === inputValue.toLowerCase())) {
      result.push({ name: inputValue.toUpperCase(), type: 'new' });
    }
    
    return result;
  }, [characters, recentCharacters, frequentCharacters, inputValue]);

  // Reset selection when options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [options.length]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (options[selectedIndex]) {
          handleSelect(options[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Handle selection
  const handleSelect = (option: CharacterOption) => {
    if (option.type === 'new' && onAdd) {
      onAdd(option.name);
    }
    onSelect(option.name);
    onClose();
  };

  // Group options by type
  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: CharacterOption[] } = {
      recent: [],
      frequent: [],
      all: [],
      new: [],
    };
    
    options.forEach(opt => {
      groups[opt.type].push(opt);
    });
    
    return groups;
  }, [options]);

  if (!open || !anchorEl) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1500 }}
    >
      <Paper
        sx={{
          width: anchorEl.offsetWidth || 250,
          maxHeight: 300,
          overflow: 'auto',
          mt: 0.5,
          boxShadow: 4,
        }}
        onKeyDown={handleKeyDown}
      >
        <List ref={listRef} dense sx={{ py: 0 }}>
          {/* Recent */}
          {groupedOptions.recent.length > 0 && (
            <>
              <ListItem sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="caption" color="text.secondary">
                      Nylig brukt
                    </Typography>
                  }
                />
              </ListItem>
              {groupedOptions.recent.map((opt, idx) => {
                const globalIdx = options.indexOf(opt);
                return (
                  <ListItemButton
                    key={opt.name}
                    selected={selectedIndex === globalIdx}
                    onClick={() => handleSelect(opt)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'rgba(167, 139, 250, 0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CharacterIcon sx={{ color: '#60a5fa' }} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={opt.name} />
                  </ListItemButton>
                );
              })}
            </>
          )}

          {/* Frequent */}
          {groupedOptions.frequent.length > 0 && (
            <>
              {groupedOptions.recent.length > 0 && <Divider />}
              <ListItem sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FrequentIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="caption" color="text.secondary">
                      Ofte brukt
                    </Typography>
                  }
                />
              </ListItem>
              {groupedOptions.frequent.map((opt) => {
                const globalIdx = options.indexOf(opt);
                return (
                  <ListItemButton
                    key={opt.name}
                    selected={selectedIndex === globalIdx}
                    onClick={() => handleSelect(opt)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'rgba(167, 139, 250, 0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CharacterIcon sx={{ color: '#60a5fa' }} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={opt.name} />
                  </ListItemButton>
                );
              })}
            </>
          )}

          {/* All */}
          {groupedOptions.all.length > 0 && (
            <>
              {(groupedOptions.recent.length > 0 || groupedOptions.frequent.length > 0) && <Divider />}
              {inputValue && (
                <ListItem sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 0.5 }}>
                  <ListItemText 
                    primary={
                      <Typography variant="caption" color="text.secondary">
                        Treff
                      </Typography>
                    }
                  />
                </ListItem>
              )}
              {groupedOptions.all.map((opt) => {
                const globalIdx = options.indexOf(opt);
                return (
                  <ListItemButton
                    key={opt.name}
                    selected={selectedIndex === globalIdx}
                    onClick={() => handleSelect(opt)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'rgba(167, 139, 250, 0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CharacterIcon sx={{ color: '#60a5fa' }} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={opt.name} />
                  </ListItemButton>
                );
              })}
            </>
          )}

          {/* New character option */}
          {groupedOptions.new.length > 0 && (
            <>
              <Divider />
              {groupedOptions.new.map((opt) => {
                const globalIdx = options.indexOf(opt);
                return (
                  <ListItemButton
                    key={opt.name}
                    selected={selectedIndex === globalIdx}
                    onClick={() => handleSelect(opt)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <AddIcon sx={{ color: '#10b981' }} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Legg til "${opt.name}"`}
                      primaryTypographyProps={{ color: '#10b981' }}
                    />
                  </ListItemButton>
                );
              })}
            </>
          )}

          {/* Empty state */}
          {options.length === 0 && (
            <ListItem>
              <ListItemText 
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    Ingen karakterer funnet
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Popper>
  );
};

/**
 * Hook for managing character autocomplete state
 */
export const useCharacterAutocomplete = (characters: string[]) => {
  const [recentCharacters, setRecentCharacters] = useState<string[]>([]);
  const [characterCounts, setCharacterCounts] = useState<Map<string, number>>(new Map());

  // Load from settings cache
  useEffect(() => {
    const loadData = async () => {
      const resolvedUserId = getCurrentUserId();
      const storedRecent = await settingsService.getSetting<string[]>('screenplay_recent_characters', { userId: resolvedUserId });
      if (storedRecent) {
        setRecentCharacters(storedRecent);
      }

      const storedCounts = await settingsService.getSetting<Record<string, number>>('screenplay_character_counts', { userId: resolvedUserId });
      if (storedCounts) {
        setCharacterCounts(new Map(Object.entries(storedCounts)));
      }
    };
    void loadData();
  }, []);

  // Track character usage
  const trackCharacterUsage = (name: string) => {
    const resolvedUserId = getCurrentUserId();
    // Update recent
    setRecentCharacters(prev => {
      const filtered = prev.filter(c => c !== name);
      const updated = [name, ...filtered].slice(0, 10);
      void settingsService.setSetting('screenplay_recent_characters', updated, { userId: resolvedUserId });
      return updated;
    });
    
    // Update counts
    setCharacterCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(name, (newMap.get(name) || 0) + 1);
      void settingsService.setSetting('screenplay_character_counts', Object.fromEntries(newMap), { userId: resolvedUserId });
      return newMap;
    });
  };

  // Get frequent characters (sorted by count)
  const frequentCharacters = useMemo(() => {
    return Array.from(characterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }, [characterCounts]);

  return {
    recentCharacters,
    frequentCharacters,
    trackCharacterUsage,
  };
};

export default CharacterAutocomplete;

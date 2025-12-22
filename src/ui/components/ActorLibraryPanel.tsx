import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import { Search, Person, ChildCare, Elderly, FitnessCenter } from '@mui/icons-material';

interface LibraryActor {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  tags: string[];
}

const LIBRARY_ACTORS: LibraryActor[] = [
  { id: 'lib-woman-25', name: 'Kvinne 25', category: 'Voksen', tags: ['kvinne', 'ung', 'portrett'] },
  { id: 'lib-man-30', name: 'Mann 30', category: 'Voksen', tags: ['mann', 'ung', 'portrett'] },
  { id: 'lib-woman-40', name: 'Kvinne 40', category: 'Voksen', tags: ['kvinne', 'middelaldrende'] },
  { id: 'lib-man-45', name: 'Mann 45', category: 'Voksen', tags: ['mann', 'middelaldrende'] },
  { id: 'lib-child-8', name: 'Barn 8', category: 'Barn', tags: ['barn', 'gutt'] },
  { id: 'lib-child-6', name: 'Barn 6', category: 'Barn', tags: ['barn', 'jente'] },
  { id: 'lib-elder-70', name: 'Eldre 70', category: 'Eldre', tags: ['eldre', 'kvinne'] },
  { id: 'lib-elder-75', name: 'Eldre 75', category: 'Eldre', tags: ['eldre', 'mann'] },
  { id: 'lib-fitness-m', name: 'Fitness Mann', category: 'Fitness', tags: ['fitness', 'mann', 'atletisk'] },
  { id: 'lib-fitness-f', name: 'Fitness Kvinne', category: 'Fitness', tags: ['fitness', 'kvinne', 'atletisk'] },
];

export const ActorLibraryPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredActors = LIBRARY_ACTORS.filter((actor) => {
    const matchesSearch =
      searchQuery === '' ||
      actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      activeCategory === 'all' || actor.category.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder="Søk etter aktører..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      <Tabs
        value={activeCategory}
        onChange={(_, value) => setActiveCategory(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="all" label="Alle" icon={<Person />} iconPosition="start" />
        <Tab value="voksen" label="Voksen" icon={<Person />} iconPosition="start" />
        <Tab value="barn" label="Barn" icon={<ChildCare />} iconPosition="start" />
        <Tab value="eldre" label="Eldre" icon={<Elderly />} iconPosition="start" />
        <Tab value="fitness" label="Fitness" icon={<FitnessCenter />} iconPosition="start" />
      </Tabs>

      <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
        <Grid container spacing={1}>
          {filteredActors.map((actor) => (
            <Grid key={actor.id} sx={{ width: '50%', p: 0.5 }}>
              <Card
                sx={{
                  backgroundColor: '#2a2a2a',
                  '&:hover': { backgroundColor: '#333' },
                }}
              >
                <CardActionArea>
                  <Box
                    sx={{
                      height: 80,
                      backgroundColor: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Person sx={{ fontSize: 40, color: '#666' }} />
                  </Box>
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2" noWrap>
                      {actor.name}
                    </Typography>
                    <Chip
                      label={actor.category}
                      size="small"
                      sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {filteredActors.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Ingen aktører funnet
        </Typography>
      )}
    </Box>
  );
};

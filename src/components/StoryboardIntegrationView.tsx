import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardMedia,
  CardContent,
  Grid,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Image as ImageIcon,
  List as ListIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon,
  Lightbulb as LightIcon,
} from '@mui/icons-material';
import { SceneBreakdown } from '../core/models/casting';

interface StoryboardIntegrationViewProps {
  scene: SceneBreakdown;
  onUpdate: (scene: SceneBreakdown) => void;
}

type ViewMode = 'script' | 'storyboard' | 'shotlist';

interface StoryboardFrame {
  id: string;
  shotNumber: string;
  imageUrl?: string;
  sketch?: string;
  description: string;
  cameraAngle: string;
  movement: string;
  duration: number;
  notes?: string;
}

export const StoryboardIntegrationView: React.FC<StoryboardIntegrationViewProps> = ({
  scene,
  onUpdate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [storyboardFrames, setStoryboardFrames] = useState<StoryboardFrame[]>([
    {
      id: '1',
      shotNumber: '1A',
      description: 'Establishing shot av bygningen',
      cameraAngle: 'Wide',
      movement: 'Static',
      duration: 3,
    },
  ]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Scene {scene.sceneNumber}</Typography>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, mode) => mode && setViewMode(mode)}
            size="small"
          >
            <ToggleButton value="script">
              <DescriptionIcon sx={{ mr: 1 }} />
              Manus
            </ToggleButton>
            <ToggleButton value="storyboard">
              <ImageIcon sx={{ mr: 1 }} />
              Storyboard
            </ToggleButton>
            <ToggleButton value="shotlist">
              <ListIcon sx={{ mr: 1 }} />
              Shot-liste
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'script' && <ScriptView scene={scene} />}
        {viewMode === 'storyboard' && (
          <StoryboardView
            frames={storyboardFrames}
            onUpdate={setStoryboardFrames}
          />
        )}
        {viewMode === 'shotlist' && (
          <ShotListView
            frames={storyboardFrames}
            onUpdate={setStoryboardFrames}
          />
        )}
      </Box>
    </Box>
  );
};

const ScriptView: React.FC<{ scene: SceneBreakdown }> = ({ scene }) => {
  return (
    <Paper sx={{ p: 4, fontFamily: 'Courier, monospace', bgcolor: '#FFFFF8' }}>
      <Stack spacing={3}>
        {/* Scene Heading */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
          {scene.intExt}. {scene.locationName} - {scene.timeOfDay}
        </Typography>

        {/* Scene Description */}
        {scene.description && (
          <Typography sx={{ lineHeight: 2 }}>
            {scene.description}
          </Typography>
        )}

        {/* Dialogue */}
        {scene.characters && scene.characters.length > 0 && (
          <Stack spacing={2}>
            {scene.characters.map((char, i) => (
              <Box key={i}>
                <Typography
                  sx={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    mb: 1,
                  }}
                >
                  {char.toUpperCase()}
                </Typography>
                <Typography
                  sx={{
                    textAlign: 'center',
                    maxWidth: '60%',
                    mx: 'auto',
                    fontStyle: 'italic',
                    color: 'text.secondary',
                  }}
                >
                  (eksempel dialog for {char})
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

const StoryboardView: React.FC<{
  frames: StoryboardFrame[];
  onUpdate: (frames: StoryboardFrame[]) => void;
}> = ({ frames, onUpdate }) => {
  const handleAddFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `${frames.length + 1}`,
      shotNumber: `${frames.length + 1}A`,
      description: 'Ny shot',
      cameraAngle: 'Medium',
      movement: 'Static',
      duration: 2,
    };
    onUpdate([...frames, newFrame]);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Typography variant="h6">Storyboard</Typography>
        <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddFrame}>
          Ny Frame
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {frames.map((frame, index) => (
          <Grid key={frame.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <StoryboardFrameCard frame={frame} index={index} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const StoryboardFrameCard: React.FC<{
  frame: StoryboardFrame;
  index: number;
}> = ({ frame, index }) => {
  return (
    <Card>
      {/* Frame Image/Sketch Area */}
      <Box
        sx={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9 aspect ratio
          bgcolor: 'grey.100',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {frame.imageUrl ? (
          <CardMedia
            component="img"
            image={frame.imageUrl}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.200',
            }}
          >
            <Stack spacing={1} alignItems="center">
              <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Klikk for å legge til skisse
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Shot Number Overlay */}
        <Chip
          label={`Shot ${frame.shotNumber}`}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
          }}
        />

        {/* Camera & Light Indicators */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
          }}
        >
          <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
            <CameraIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
            <LightIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" fontWeight="medium">
            {frame.description}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Chip label={frame.cameraAngle} size="small" />
            <Chip label={frame.movement} size="small" />
            <Chip label={`${frame.duration}s`} size="small" />
          </Stack>

          {frame.notes && (
            <Typography variant="caption" color="text.secondary">
              {frame.notes}
            </Typography>
          )}

          <Stack direction="row" spacing={1} mt={1}>
            <IconButton size="small" color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const ShotListView: React.FC<{
  frames: StoryboardFrame[];
  onUpdate: (frames: StoryboardFrame[]) => void;
}> = ({ frames, onUpdate }) => {
  return (
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Shot #</TableCell>
            <TableCell>Beskrivelse</TableCell>
            <TableCell>Kamera</TableCell>
            <TableCell>Bevegelse</TableCell>
            <TableCell>Varighet</TableCell>
            <TableCell>Notater</TableCell>
            <TableCell>Handlinger</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {frames.map((frame) => (
            <TableRow key={frame.id} hover>
              <TableCell>
                <Chip label={frame.shotNumber} size="small" />
              </TableCell>
              <TableCell>{frame.description}</TableCell>
              <TableCell>{frame.cameraAngle}</TableCell>
              <TableCell>{frame.movement}</TableCell>
              <TableCell>{frame.duration}s</TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {frame.notes || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box sx={{ p: 2 }}>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          fullWidth
          onClick={() => {
            const newFrame: StoryboardFrame = {
              id: `${frames.length + 1}`,
              shotNumber: `${frames.length + 1}A`,
              description: 'Ny shot',
              cameraAngle: 'Medium',
              movement: 'Static',
              duration: 2,
            };
            onUpdate([...frames, newFrame]);
          }}
        >
          Legg til Shot
        </Button>
      </Box>
    </Paper>
  );
};

export default StoryboardIntegrationView;

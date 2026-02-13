/**
 * Character Animation Panel
 * UI for skeletal animation, IK, and blend shapes control
 */

import { useState, useEffect, type FC, type ReactNode, type ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tabs,
  Tab,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField
} from '@mui/material';
//
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipPrevious as SkipPrevIcon,
  SkipNext as SkipNextIcon,
  Loop as LoopIcon,
  Speed as SpeedIcon,
  Face as FaceIcon,
  Accessibility as SkeletonIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Refresh as ResetIcon,
  RadioButtonChecked as IKIcon
} from '@mui/icons-material';
import { useSkeletalAnimationStore, CharacterRig, BlendShape, IKTarget } from '../services/skeletalAnimationService';

interface CharacterAnimationPanelProps {
  onRigSelect?: (rigId: string) => void;
}

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

const TabPanel: FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: value === index ? '16px 0' : 0 }}>
    {value === index && children}
  </div>
);

export const CharacterAnimationPanel: FC<CharacterAnimationPanelProps> = ({
  onRigSelect
}) => {
  const {
    rigs,
    activeRigId,
    isPlaying,
    playbackSpeed,
    currentTime,
    ikEnabled,
    blendShapePresets,
    setActiveRig,
    playAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    setPlaybackSpeed,
    seekTo,
    setBlendShapeWeight,
    applyBlendShapePreset,
    setIKTarget,
    enableIK,
    resetAllBones,
    importAnimation,
    exportAnimation
  } = useSkeletalAnimationStore();
  
  const [expanded, setExpanded] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  
  const activeRig = activeRigId ? rigs.get(activeRigId) : null;
  const rigList = Array.from(rigs.values());
  
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAnimation();
    } else {
      if (activeRig?.currentAnimation) {
        resumeAnimation();
      } else if (activeRig && activeRig.animations.size > 0) {
        const firstAnim = Array.from(activeRig.animations.keys())[0];
        playAnimation(activeRigId!, firstAnim, loopEnabled);
      }
    }
  };
  
  const handleAnimationSelect = (animName: string) => {
    if (activeRigId) {
      playAnimation(activeRigId, animName, loopEnabled);
    }
  };
  
  const handleImportAnimation = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeRigId) {
      await importAnimation(activeRigId, file);
    }
  };
  
  const handleExportAnimation = async () => {
    if (activeRigId && activeRig?.currentAnimation) {
      const blob = await exportAnimation(activeRigId, activeRig.currentAnimation);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeRig.currentAnimation}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 360,
        maxHeight: 'calc(100vh - 200px)',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10001
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'secondary.dark',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SkeletonIcon />
          <Typography variant="subtitle1" fontWeight="bold">
            Character Animation
          </Typography>
          {activeRig && (
            <Chip
              size="small"
              label={activeRig.name}
              color="secondary"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        {/* Rig Selector */}
        {rigList.length > 0 && (
          <Box sx={{ p: 1.5, bgcolor: 'grey.900' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Active Character</InputLabel>
              <Select
                value={activeRigId || ''}
                onChange={(e) => {
                  setActiveRig(e.target.value);
                  onRigSelect?.(e.target.value);
                }}
                label="Active Character"
              >
                {rigList.map((rig) => (
                  <MenuItem key={rig.id} value={rig.id}>
                    {rig.name} ({rig.animations.size} anims)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        
        {activeRig ? (
          <>
            {/* Tabs */}
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<TimelineIcon />} label="Animations" />
              <Tab icon={<FaceIcon />} label="Blend Shapes" />
              <Tab icon={<IKIcon />} label="IK" />
            </Tabs>
            
            {/* Animations Tab */}
            <TabPanel value={tabIndex} index={0}>
              <Box sx={{ p: 1.5 }}>
                {/* Playback Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <IconButton size="small" onClick={() => seekTo(0)}>
                    <SkipPrevIcon />
                  </IconButton>
                  <IconButton
                    onClick={handlePlayPause}
                    sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => activeRigId && stopAnimation(activeRigId)}
                  >
                    <StopIcon />
                  </IconButton>
                  <IconButton size="small">
                    <SkipNextIcon />
                  </IconButton>
                  <Tooltip title={loopEnabled ? 'Loop enabled' : 'Loop disabled'}>
                    <IconButton
                      size="small"
                      onClick={() => setLoopEnabled(!loopEnabled)}
                      color={loopEnabled ? 'primary' : 'default'}
                    >
                      <LoopIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {/* Timeline */}
                <Box sx={{ mb: 2 }}>
                  <Slider
                    value={currentTime}
                    onChange={(_, v) => seekTo(v as number)}
                    min={0}
                    max={activeRig.animations.get(activeRig.currentAnimation || '')?.duration || 100}
                    step={0.01}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {currentTime.toFixed(2)}s
                  </Typography>
                </Box>
                
                {/* Speed Control */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    <SpeedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Speed: {playbackSpeed.toFixed(1)}x
                  </Typography>
                  <Slider
                    value={playbackSpeed}
                    onChange={(_, v) => setPlaybackSpeed(v as number)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    size="small"
                  />
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                {/* Animation List */}
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Animations ({activeRig.animations.size})
                </Typography>
                <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
                  {Array.from(activeRig.animations.values()).map((anim) => (
                    <ListItemButton
                      key={anim.id}
                      selected={activeRig.currentAnimation === anim.name}
                      onClick={() => handleAnimationSelect(anim.name)}
                    >
                      <ListItemText
                        primary={anim.name}
                        secondary={`${anim.duration.toFixed(1)}s • ${anim.loop ? 'Loop' : 'Once'}`}
                      />
                      {activeRig.currentAnimation === anim.name && isPlaying && (
                        <PlayIcon fontSize="small" color="primary" />
                      )}
                    </ListItemButton>
                  ))}
                </List>
                
                {/* Import/Export */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    Import
                    <input
                      type="file"
                      hidden
                      accept=".glb,.gltf,.fbx,.bvh,.json"
                      onChange={handleImportAnimation}
                    />
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportAnimation}
                    disabled={!activeRig.currentAnimation}
                  >
                    Export
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ResetIcon />}
                    onClick={() => activeRigId && resetAllBones(activeRigId)}
                  >
                    Reset
                  </Button>
                </Box>
              </Box>
            </TabPanel>
            
            {/* Blend Shapes Tab */}
            <TabPanel value={tabIndex} index={1}>
              <Box sx={{ p: 1.5 }}>
                {/* Presets */}
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Expression Presets
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {Array.from(blendShapePresets.keys()).map((preset) => (
                    <Chip
                      key={preset}
                      label={preset}
                      size="small"
                      onClick={() => activeRigId && applyBlendShapePreset(activeRigId, preset)}
                      clickable
                    />
                  ))}
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                {/* Blend Shape Sliders */}
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Blend Shapes ({activeRig.blendShapes.size})
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {Array.from(activeRig.blendShapes.values()).map((shape) => (
                    <Box key={shape.name} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {shape.name}: {(shape.weight * 100).toFixed(0)}%
                      </Typography>
                      <Slider
                        value={shape.weight}
                        onChange={(_, v) => activeRigId && setBlendShapeWeight(activeRigId, shape.name, v as number)}
                        min={0}
                        max={1}
                        step={0.01}
                        size="small"
                      />
                    </Box>
                  ))}
                  {activeRig.blendShapes.size === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      No blend shapes found on this character
                    </Typography>
                  )}
                </Box>
              </Box>
            </TabPanel>
            
            {/* IK Tab */}
            <TabPanel value={tabIndex} index={2}>
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Inverse Kinematics Targets
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Enable IK to control limb positions directly
                </Typography>
                
                {Array.from(activeRig.ikTargets.values()).map((target) => (
                  <Box key={target.chainName} sx={{ mb: 2, p: 1, bgcolor: 'grey.900', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{target.chainName}</Typography>
                      <Switch
                        size="small"
                        checked={target.enabled}
                        onChange={(e) => activeRigId && enableIK(activeRigId, target.chainName, e.target.checked)}
                      />
                    </Box>
                    
                    {target.enabled && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                        <Box>
                          <TextField
                            size="small"
                            label="X"
                            type="number"
                            value={target.targetPosition.x.toFixed(2)}
                            onChange={(e) => activeRigId && setIKTarget(activeRigId, target.chainName, {
                              targetPosition: { ...target.targetPosition, x: parseFloat(e.target.value) || 0 }
                            })}
                            inputProps={{ step: 0.1 }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            size="small"
                            label="Y"
                            type="number"
                            value={target.targetPosition.y.toFixed(2)}
                            onChange={(e) => activeRigId && setIKTarget(activeRigId, target.chainName, {
                              targetPosition: { ...target.targetPosition, y: parseFloat(e.target.value) || 0 }
                            })}
                            inputProps={{ step: 0.1 }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            size="small"
                            label="Z"
                            type="number"
                            value={target.targetPosition.z.toFixed(2)}
                            onChange={(e) => activeRigId && setIKTarget(activeRigId, target.chainName, {
                              targetPosition: { ...target.targetPosition, z: parseFloat(e.target.value) || 0 }
                            })}
                            inputProps={{ step: 0.1 }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </TabPanel>
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <SkeletonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No character selected
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Load a rigged character to access animation controls
            </Typography>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

export default CharacterAnimationPanel;

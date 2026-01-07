import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import MovieIcon from '@mui/icons-material/Movie';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import { useSnackbar } from 'notistack';
import {
  calendarEventsApi,
  CalendarEvent,
  crewConflictsApi,
  crewNotificationsApi,
  CrewConflict,
  candidatesApi,
  crewApi,
  locationsApi,
} from '../services/castingApiService';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface Candidate {
  id: string;
  name: string;
}

interface Crew {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface ProductionCalendarPanelProps {
  projectId: string;
  candidates?: Candidate[];
  crew?: Crew[];
  locations?: Location[];
  onEventCreate?: (event: CalendarEvent) => void;
}

const EVENT_TYPES = [
  { value: 'audition', label: 'Audition', icon: <TheatersIcon />, color: '#f59e0b' },
  { value: 'fitting', label: 'Kostyme/Fitting', icon: <CheckroomIcon />, color: '#ec4899' },
  { value: 'rehearsal', label: 'Prøve', icon: <GroupsIcon />, color: '#8b5cf6' },
  { value: 'shooting', label: 'Opptak', icon: <MovieIcon />, color: '#10b981' },
  { value: 'general', label: 'Generelt', icon: <EventIcon />, color: '#6b7280' },
];

const ProductionCalendarPanel: React.FC<ProductionCalendarPanelProps> = ({
  projectId,
  candidates: propCandidates,
  crew: propCrew,
  locations: propLocations,
  onEventCreate,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<string>('general');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [candidates, setCandidates] = useState<Candidate[]>(propCandidates || []);
  const [crew, setCrew] = useState<Crew[]>(propCrew || []);
  const [locations, setLocations] = useState<Location[]>(propLocations || []);
  const [crewConflicts, setCrewConflicts] = useState<Map<string, CrewConflict[]>>(new Map());

  useEffect(() => {
    loadEvents();
    loadProjectData();
  }, [projectId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const eventsData = await calendarEventsApi.getAll(projectId);
      setEvents(eventsData.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
    } catch (error) {
      enqueueSnackbar('Kunne ikke laste kalenderhendelser', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    try {
      if (!propCandidates?.length) {
        const candidatesData = await candidatesApi.getAll(projectId);
        setCandidates(candidatesData.map(c => ({ id: c.id, name: c.name })));
      }
      if (!propCrew?.length) {
        const crewData = await crewApi.getAll(projectId);
        setCrew(crewData.map(c => ({ id: c.id, name: c.name })));
      }
      if (!propLocations?.length) {
        const locationsData = await locationsApi.getAll(projectId);
        setLocations(locationsData.map(l => ({ id: l.id, name: l.name })));
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  const checkCrewConflicts = async (crewIds: string[], start: string, end: string) => {
    const conflicts = new Map<string, CrewConflict[]>();
    for (const crewId of crewIds) {
      try {
        const result = await crewConflictsApi.check(crewId, start.split('T')[0], end.split('T')[0]);
        if (result.hasConflicts) {
          conflicts.set(crewId, result.conflicts);
        }
      } catch (error) {
        console.error('Failed to check conflicts for crew:', crewId, error);
      }
    }
    setCrewConflicts(conflicts);
    return conflicts.size > 0;
  };

  const sendCrewNotifications = async (crewIds: string[], eventTitle: string, eventId: string) => {
    for (const crewId of crewIds) {
      try {
        await crewNotificationsApi.create(crewId, {
          project_id: projectId,
          event_id: eventId,
          notification_type: 'assignment',
          title: 'Ny tildeling',
          message: `Du er tildelt til: ${eventTitle}`,
        });
      } catch (error) {
        console.error('Failed to send notification to crew:', crewId, error);
      }
    }
  };

  const handleOpenDialog = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type);
      setStartTime(event.start_time ? event.start_time.slice(0, 16) : '');
      setEndTime(event.end_time ? event.end_time.slice(0, 16) : '');
      setSelectedLocation(event.location_id || '');
      setAllDay(event.all_day || false);
      setSelectedCandidates(event.candidate_ids || []);
      setSelectedCrew(event.crew_ids || []);
      setNotes(event.notes || '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventType('general');
    setStartTime('');
    setEndTime('');
    setSelectedLocation('');
    setAllDay(false);
    setSelectedCandidates([]);
    setSelectedCrew([]);
    setNotes('');
  };

  const handleSave = async () => {
    if (!title || !startTime) {
      enqueueSnackbar('Tittel og starttid er påkrevd', { variant: 'warning' });
      return;
    }

    if (selectedCrew.length > 0 && startTime && endTime) {
      const hasConflicts = await checkCrewConflicts(selectedCrew, startTime, endTime);
      if (hasConflicts) {
        const conflictingCrewNames = selectedCrew
          .filter(id => crewConflicts.has(id))
          .map(id => crew.find(c => c.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        enqueueSnackbar(`Advarsel: Crew-konflikter funnet for: ${conflictingCrewNames}`, { variant: 'warning' });
      }
    }

    setSubmitting(true);
    try {
      let eventId = editingEvent?.id;
      if (editingEvent) {
        await calendarEventsApi.update(editingEvent.id, {
          title,
          description,
          event_type: eventType as CalendarEvent['event_type'],
          start_time: startTime,
          end_time: endTime || undefined,
          location_id: selectedLocation || undefined,
          all_day: allDay,
          candidate_ids: selectedCandidates,
          crew_ids: selectedCrew,
          notes,
        });
        enqueueSnackbar('Hendelse oppdatert!', { variant: 'success' });
        
        const newCrewIds = selectedCrew.filter(id => !editingEvent.crew_ids?.includes(id));
        if (newCrewIds.length > 0) {
          await sendCrewNotifications(newCrewIds, title, editingEvent.id);
          enqueueSnackbar(`Varsler sendt til ${newCrewIds.length} nye crew-medlemmer`, { variant: 'info' });
        }
      } else {
        eventId = await calendarEventsApi.create({
          projectId,
          title,
          description,
          eventType,
          startTime,
          endTime: endTime || undefined,
          locationId: selectedLocation || undefined,
          allDay,
          candidateIds: selectedCandidates,
          crewIds: selectedCrew,
          notes,
        });
        enqueueSnackbar('Hendelse opprettet!', { variant: 'success' });
        
        if (selectedCrew.length > 0 && eventId) {
          await sendCrewNotifications(selectedCrew, title, eventId);
          enqueueSnackbar(`Varsler sendt til ${selectedCrew.length} crew-medlemmer`, { variant: 'info' });
        }
      }
      setDialogOpen(false);
      resetForm();
      loadEvents();
    } catch (error) {
      enqueueSnackbar('Kunne ikke lagre hendelse', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await calendarEventsApi.delete(eventId);
      enqueueSnackbar('Hendelse slettet', { variant: 'success' });
      loadEvents();
    } catch (error) {
      enqueueSnackbar('Kunne ikke slette hendelse', { variant: 'error' });
    }
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  };

  const formatDateTime = (dateStr: string, showTime = true) => {
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('nb-NO', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    if (!showTime) return dateFormatted;
    const timeFormatted = date.toLocaleTimeString('nb-NO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateFormatted} kl. ${timeFormatted}`;
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const dateKey = new Date(event.start_time).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupedEvents = groupEventsByDate();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon sx={{ color: '#10b981' }} />
          Produksjonskalender
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#10b981' }}
        >
          Ny hendelse
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {EVENT_TYPES.map((type) => (
          <Chip
            key={type.value}
            icon={type.icon as React.ReactElement}
            label={type.label}
            size="small"
            sx={{
              bgcolor: `${type.color}20`,
              color: type.color,
              '& .MuiChip-icon': { color: type.color },
            }}
          />
        ))}
      </Box>

      {events.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
          Ingen hendelser planlagt. Klikk "Ny hendelse" for å legge til opptak, prøver, eller andre produksjonshendelser.
        </Alert>
      ) : (
        <Box>
          {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
            <Box key={dateKey} sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {new Date(dateKey).toLocaleDateString('nb-NO', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
              <Grid container spacing={2}>
                {dayEvents.map((event) => {
                  const typeConfig = getEventTypeConfig(event.event_type);
                  const location = locations.find(l => l.id === event.location_id);
                  const eventCandidates = candidates.filter(c => event.candidate_ids?.includes(c.id));
                  const eventCrew = crew.filter(c => event.crew_ids?.includes(c.id));

                  return (
                    <Grid item xs={12} md={6} lg={4} key={event.id}>
                      <Card 
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.05)', 
                          border: `1px solid ${typeConfig.color}40`,
                          borderLeft: `4px solid ${typeConfig.color}`,
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: typeConfig.color,
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ color: typeConfig.color }}>{typeConfig.icon}</Box>
                              <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                {event.title}
                              </Typography>
                            </Box>
                            <Box>
                              <Tooltip title="Rediger">
                                <IconButton size="small" onClick={() => handleOpenDialog(event)}>
                                  <EditIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Slett">
                                <IconButton size="small" onClick={() => handleDelete(event.id)}>
                                  <DeleteIcon sx={{ fontSize: 16, color: 'rgba(239,68,68,0.7)' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {event.all_day ? 'Hele dagen' : (
                                <>
                                  {new Date(event.start_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                                  {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`}
                                </>
                              )}
                            </Typography>
                          </Box>

                          {location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <LocationOnIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                {location.name}
                              </Typography>
                            </Box>
                          )}

                          {eventCandidates.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <PersonIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                {eventCandidates.map(c => c.name).join(', ')}
                              </Typography>
                            </Box>
                          )}

                          {eventCrew.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupsIcon sx={{ fontSize: 14, color: '#06b6d4' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                {eventCrew.map(c => c.name).join(', ')}
                              </Typography>
                            </Box>
                          )}

                          {event.description && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, fontStyle: 'italic' }}>
                              {event.description}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon sx={{ color: '#10b981' }} />
          {editingEvent ? 'Rediger hendelse' : 'Ny hendelse'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Tittel *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                label="Type"
              >
                {EVENT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: type.color }}>{type.icon}</Box>
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  color="primary"
                />
              }
              label="Hele dagen"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Starttid *"
                type={allDay ? 'date' : 'datetime-local'}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              {!allDay && (
                <TextField
                  label="Sluttid"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              )}
            </Box>

            <FormControl fullWidth>
              <InputLabel>Lokasjon</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                label="Lokasjon"
              >
                <MenuItem value="">Ingen lokasjon</MenuItem>
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Kandidater</InputLabel>
              <Select
                multiple
                value={selectedCandidates}
                onChange={(e) => setSelectedCandidates(e.target.value as string[])}
                input={<OutlinedInput label="Kandidater" />}
                renderValue={(selected) => 
                  candidates
                    .filter(c => selected.includes(c.id))
                    .map(c => c.name)
                    .join(', ')
                }
              >
                {candidates.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Checkbox checked={selectedCandidates.includes(c.id)} />
                    <ListItemText primary={c.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Team</InputLabel>
              <Select
                multiple
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value as string[])}
                input={<OutlinedInput label="Team" />}
                renderValue={(selected) => 
                  crew
                    .filter(c => selected.includes(c.id))
                    .map(c => c.name)
                    .join(', ')
                }
              >
                {crew.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Checkbox checked={selectedCrew.includes(c.id)} />
                    <ListItemText primary={c.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Beskrivelse"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />

            <TextField
              label="Notater"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Avbryt</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
            disabled={submitting || !title || !startTime}
            sx={{ bgcolor: '#10b981' }}
          >
            {editingEvent ? 'Oppdater' : 'Opprett'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionCalendarPanel;

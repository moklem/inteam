import React, { useContext, useEffect, useState } from 'react';

import { getDay, setDay, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowBack,
  Event,
  LocationOn,
  Group,
  Description,
  Person,
  Repeat,
  Info,
  Public,
  Edit,
  EditCalendar,
  Notifications,
  Add,
  Delete
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Divider,
  FormControlLabel,
  Switch,
  ButtonGroup
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';


import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchEvent, updateEvent, loading: eventLoading, error: eventError, setError: setEventError, checkEventEditPermission  } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamLoading } = useContext(TeamContext);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Training');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 2)));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [teamId, setTeamId] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [userCoachTeams, setUserCoachTeams] = useState([]);
  const [organizingTeamIds, setOrganizingTeamIds] = useState([]);
  
  // Recurring event states
  const [eventData, setEventData] = useState(null);
  const [updateRecurring, setUpdateRecurring] = useState(false);
  const [convertToRecurring, setConvertToRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 3)));
  
  // Open access state
  const [isOpenAccess, setIsOpenAccess] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState(1); // Default Monday
  
  // Voting deadline state
  const [votingDeadline, setVotingDeadline] = useState(null);
  
  // Notification settings states
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState([
    { hours: 24, minutes: 0 },
    { hours: 1, minutes: 0 }
  ]);
  const [customMessage, setCustomMessage] = useState('');

useEffect(() => {
  const loadData = async () => {
    try {
      setInitialLoading(true);
      
      // Check permission first
      const canEdit = await checkEventEditPermission(id);
      if (!canEdit) {
        setSubmitError('Sie sind nicht berechtigt, diesen Termin zu bearbeiten');
        setTimeout(() => {
          navigate(`/coach/events/${id}`);
        }, 2000);
        return;
      }
      
      // Load teams first
      await fetchTeams();
        
      // Then load event
      const loadedEvent = await fetchEvent(id);
      setEventData(loadedEvent);
      
      // Set form values
      setTitle(loadedEvent.title);
      setType(loadedEvent.type);
      setStartTime(new Date(loadedEvent.startTime));
      setEndTime(new Date(loadedEvent.endTime));
      setLocation(loadedEvent.location);
      setDescription(loadedEvent.description || '');
      setNotes(loadedEvent.notes || '');
      setTeamId(loadedEvent.team._id);
      setIsOpenAccess(loadedEvent.isOpenAccess || false);
      setVotingDeadline(loadedEvent.votingDeadline ? new Date(loadedEvent.votingDeadline) : null);
      setSelectedWeekday(getDay(new Date(loadedEvent.startTime)));
      
      // Set notification settings
      if (loadedEvent.notificationSettings) {
        setNotificationEnabled(loadedEvent.notificationSettings.enabled !== false);
        setReminderTimes(loadedEvent.notificationSettings.reminderTimes || [
          { hours: 24, minutes: 0 },
          { hours: 1, minutes: 0 }
        ]);
        setCustomMessage(loadedEvent.notificationSettings.customMessage || '');
      }

      // Set selected teams
        if (loadedEvent.teams && loadedEvent.teams.length > 0) {
          setSelectedTeamIds(loadedEvent.teams.map(t => t._id));
          // Use organizingTeams if it exists, otherwise fall back to organizingTeam or team
          if (loadedEvent.organizingTeams && loadedEvent.organizingTeams.length > 0) {
            setOrganizingTeamIds(loadedEvent.organizingTeams.map(t => t._id));
          } else if (loadedEvent.organizingTeam) {
            setOrganizingTeamIds([loadedEvent.organizingTeam._id]);
          } else {
            setOrganizingTeamIds([loadedEvent.team._id]);
          }
        } else if (loadedEvent.team) {
          setSelectedTeamIds([loadedEvent.team._id]);
          if (loadedEvent.organizingTeams && loadedEvent.organizingTeams.length > 0) {
            setOrganizingTeamIds(loadedEvent.organizingTeams.map(t => t._id));
          } else if (loadedEvent.organizingTeam) {
            setOrganizingTeamIds([loadedEvent.organizingTeam._id]);
          } else {
            setOrganizingTeamIds([loadedEvent.team._id]);
          }
        }
              
      // Set selected players (combine invited, attending, declined, and team members who aren't explicitly uninvited)
      const allInvitedPlayers = [
        ...loadedEvent.invitedPlayers.map(p => p._id),
        ...loadedEvent.attendingPlayers.map(p => p._id),
        ...loadedEvent.declinedPlayers.map(p => p._id)
      ];

      // Add team members who aren't explicitly uninvited
      if (loadedEvent.team && teams.length > 0) {
        const eventTeam = teams.find(t => t._id === loadedEvent.team._id);
        if (eventTeam && eventTeam.players) {
          const teamPlayerIds = eventTeam.players
            .filter(player => 
              !loadedEvent.uninvitedPlayers || 
              !loadedEvent.uninvitedPlayers.some(p => p._id === player._id)
            )
            .map(p => p._id);
          allInvitedPlayers.push(...teamPlayerIds);
        }
      }
      
      // Remove duplicates
      setSelectedPlayers([...new Set(allInvitedPlayers)]);
    } catch (error) {  // THIS CLOSES THE TRY BLOCK
      console.error('Error loading data:', error);
      setSubmitError('Fehler beim Laden des Termins');
    } finally {  // THIS IS THE FINALLY BLOCK
      setInitialLoading(false);
    }
  };  // THIS CLOSES THE loadData FUNCTION
  
  loadData();
  }, [id, fetchEvent, fetchTeams, checkEventEditPermission, navigate]); // THIS CLOSES THE useEffect
       
  // Identify which teams the user coaches
 useEffect(() => {
  if (teams.length > 0 && user) {
    const coachTeams = teams.filter(team => 
      team.coaches.some(coach => coach._id === user._id)
    );
    setUserCoachTeams(coachTeams);
  }
 }, [teams, user]);
 
  // Update available players when teams change
useEffect(() => {
  if (selectedTeamIds.length > 0 && teams.length > 0) {
    // Combine players from all selected teams
    const allPlayers = [];
    const playerIds = new Set();
    
    selectedTeamIds.forEach(teamId => {
      const team = teams.find(t => t._id === teamId);
      if (team) {
        team.players.forEach(player => {
          if (!playerIds.has(player._id)) {
            playerIds.add(player._id);
            allPlayers.push(player);
          }
        });
      }
    });
    
    setAvailablePlayers(allPlayers);
  } else {
    setAvailablePlayers([]);
  }
  }, [selectedTeamIds, teams]);

  // Clear selected players when open access is enabled
  useEffect(() => {
    if (isOpenAccess) {
      setSelectedPlayers([]);
    }
  }, [isOpenAccess]);

  // Automatically set organizing team when only one team is selected
  useEffect(() => {
    if (selectedTeamIds.length === 1) {
      // When only one team is selected, make it the organizing team
      const selectedTeamId = selectedTeamIds[0];
      // Only update if the user is a coach of this team
      const isCoachOfTeam = userCoachTeams.some(t => t._id === selectedTeamId);
      if (isCoachOfTeam) {
        setOrganizingTeamIds([selectedTeamId]);
      }
    } else if (selectedTeamIds.length === 0) {
      // Clear organizing teams when no teams are selected
      setOrganizingTeamIds([]);
    }
    // When multiple teams are selected, keep the current organizing team if it's still in the selection
    // Otherwise, let the user choose via the dropdown
  }, [selectedTeamIds, userCoachTeams]);

  const validateForm = () => {
    const errors = {};
    
    if (!title.trim()) errors.title = 'Titel ist erforderlich';
    if (selectedTeamIds.length === 0) errors.teamId = 'Mindestens ein Team ist erforderlich';
    if (!location.trim()) errors.location = 'Ort ist erforderlich';
    if (!startTime) errors.startTime = 'Startzeit ist erforderlich';
    if (!endTime) errors.endTime = 'Endzeit ist erforderlich';
    
    if (startTime && endTime && startTime >= endTime) {
      errors.endTime = 'Endzeit muss nach der Startzeit liegen';
    }
    
    if (convertToRecurring) {
      if (!recurringEndDate) errors.recurringEndDate = 'Enddatum für wiederkehrende Termine ist erforderlich';
      if (recurringEndDate && recurringEndDate <= startTime) {
        errors.recurringEndDate = 'Enddatum muss nach der Startzeit liegen';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Notification reminder functions
  const addReminderTime = () => {
    setReminderTimes([...reminderTimes, { hours: 1, minutes: 0 }]);
  };

  const removeReminderTime = (index) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
  };

  const updateReminderTime = (index, field, value) => {
    const newReminderTimes = [...reminderTimes];
    newReminderTimes[index][field] = parseInt(value) || 0;
    setReminderTimes(newReminderTimes);
  };

  const handleSubmit = async (e, forceUpdateSingle = false) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitError('');
    setEventError(null);
    
    try {
      const updateData = {
        title,
        type,
        startTime,
        endTime,
        location,
        description,
        notes,
        invitedPlayers: isOpenAccess ? [] : selectedPlayers,
        isOpenAccess,
        team: organizingTeamIds[0] || selectedTeamIds[0],
        teams: selectedTeamIds,
        organizingTeam: organizingTeamIds[0] || selectedTeamIds[0]|| eventData?.team?._id,
        organizingTeams: organizingTeamIds,
        updateRecurring: !forceUpdateSingle && (eventData?.isRecurring || eventData?.isRecurringInstance) ? updateRecurring : false,
        convertToRecurring,
        recurringPattern: convertToRecurring ? recurringPattern : undefined,
        recurringEndDate: convertToRecurring ? recurringEndDate : undefined,
        weekday: updateRecurring && isRecurringEvent ? selectedWeekday : undefined,
        votingDeadline: votingDeadline,
        notificationSettings: {
          enabled: notificationEnabled,
          reminderTimes: reminderTimes,
          customMessage: customMessage
        }
      };
      
      const result = await updateEvent(id, updateData);
      
      // Wait a short moment to ensure state updates have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If it was a recurring update or conversion, navigate to the events list
      if ((updateRecurring && (eventData?.isRecurring || eventData?.isRecurringInstance)) || convertToRecurring) {
        navigate('/coach/events');
      } else {
        navigate(`/coach/events/${id}`);
      }
    } catch (error) {
      setSubmitError(error.message || 'Fehler beim Aktualisieren des Termins');
    }
  };

  const handlePlayerSelection = (event) => {
    const { value } = event.target;
    
    // Check if the select-all-action is in the array
    if (Array.isArray(value) && value.includes('select-all-action')) {
      // Remove the select-all-action from the array
      const filteredValue = value.filter(v => v !== 'select-all-action');
      
      // If select-all was clicked, toggle all selection
      if (selectedPlayers.length === availablePlayers.length && availablePlayers.length > 0) {
        setSelectedPlayers([]);
      } else {
        setSelectedPlayers(availablePlayers.map(player => player._id));
      }
    } else if (Array.isArray(value)) {
      // Normal selection change
      setSelectedPlayers(value);
    }
  };

  const handleSelectAllPlayers = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (selectedPlayers.length === availablePlayers.length && availablePlayers.length > 0) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(availablePlayers.map(player => player._id));
    }
  };

  if (initialLoading || teamLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isRecurringEvent = eventData?.isRecurring || eventData?.isRecurringInstance;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate(`/coach/events/${id}`)} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Termin bearbeiten
        </Typography>
      </Box>
      
      {(submitError || eventError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError || eventError}
        </Alert>
      )}
      
      {isRecurringEvent && (
        <Alert severity="info" icon={<Repeat />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            {eventData.isRecurring 
              ? 'Dies ist der Haupttermin einer wiederkehrenden Terminserie.'
              : 'Dieser Termin ist Teil einer wiederkehrenden Terminserie.'}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={updateRecurring}
                onChange={(e) => setUpdateRecurring(e.target.checked)}
                color="primary"
              />
            }
            label="Änderungen auf alle Termine der Serie anwenden"
            sx={{ mt: 1 }}
          />
        </Alert>
      )}
      
      {!isRecurringEvent && !convertToRecurring && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={convertToRecurring}
                onChange={(e) => setConvertToRecurring(e.target.checked)}
                color="primary"
              />
            }
            label="In wiederkehrenden Termin umwandeln"
          />
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Event sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Termindetails
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!!formErrors.title}
                helperText={formErrors.title}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required error={!!formErrors.type}>
                <InputLabel id="type-label">Typ</InputLabel>
                <Select
                  labelId="type-label"
                  value={type}
                  label="Typ"
                  onChange={(e) => setType(e.target.value)}
                >
                  <MenuItem value="Training">Training</MenuItem>
                  <MenuItem value="Game">Spiel</MenuItem>
                </Select>
                {formErrors.type && <FormHelperText>{formErrors.type}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {updateRecurring && isRecurringEvent ? (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="weekday-label">Wochentag</InputLabel>
                    <Select
                      labelId="weekday-label"
                      value={selectedWeekday}
                      label="Wochentag"
                      onChange={(e) => setSelectedWeekday(e.target.value)}
                    >
                      <MenuItem value={0}>Sonntag</MenuItem>
                      <MenuItem value={1}>Montag</MenuItem>
                      <MenuItem value={2}>Dienstag</MenuItem>
                      <MenuItem value={3}>Mittwoch</MenuItem>
                      <MenuItem value={4}>Donnerstag</MenuItem>
                      <MenuItem value={5}>Freitag</MenuItem>
                      <MenuItem value={6}>Samstag</MenuItem>
                    </Select>
                    <FormHelperText>Der Wochentag wird für alle Termine der Serie angepasst</FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <TimePicker
                      label="Startzeit"
                      value={startTime}
                      onChange={(newValue) => setStartTime(newValue)}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <TimePicker
                      label="Endzeit"
                      value={endTime}
                      onChange={(newValue) => setEndTime(newValue)}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <DateTimePicker
                      label="Startzeit"
                      value={startTime}
                      onChange={(newValue) => setStartTime(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!formErrors.startTime,
                          helperText: formErrors.startTime
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <DateTimePicker
                      label="Endzeit"
                      value={endTime}
                      onChange={(newValue) => setEndTime(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!formErrors.endTime,
                          helperText: formErrors.endTime
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DateTimePicker
                  label="Abstimmungsfrist (optional)"
                  value={votingDeadline}
                  onChange={(newValue) => setVotingDeadline(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: updateRecurring && isRecurringEvent ? "Frist für alle Termine der Serie - wird entsprechend angepasst" : "Nach dieser Zeit können Spieler nicht mehr abstimmen"
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <LocationOn sx={{ mt: 2, mr: 1, color: 'primary.main' }} />
                <TextField
                  fullWidth
                  label="Ort"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  error={!!formErrors.location}
                  helperText={formErrors.location}
                  required
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Description sx={{ mt: 2, mr: 1, color: 'primary.main' }} />
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={3}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Description sx={{ mt: 2, mr: 1, color: 'primary.main' }} />
                <TextField
                  fullWidth
                  label="Notizen (nur für Trainer sichtbar)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                />
              </Box>
            </Grid>
            
            {convertToRecurring && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Repeat sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h2">
                      Wiederkehrende Termine
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="recurring-pattern-label">Wiederholungsmuster</InputLabel>
                    <Select
                      labelId="recurring-pattern-label"
                      value={recurringPattern}
                      label="Wiederholungsmuster"
                      onChange={(e) => setRecurringPattern(e.target.value)}
                    >
                      <MenuItem value="weekly">Wöchentlich</MenuItem>
                      <MenuItem value="biweekly">Alle zwei Wochen</MenuItem>
                      <MenuItem value="monthly">Monatlich</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <DatePicker
                      label="Enddatum der Wiederholung"
                      value={recurringEndDate}
                      onChange={(newValue) => setRecurringEndDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: convertToRecurring,
                          error: !!formErrors.recurringEndDate,
                          helperText: formErrors.recurringEndDate
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            {/* Notification Settings Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Notifications sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Benachrichtigungen
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationEnabled}
                    onChange={(e) => setNotificationEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label="Benachrichtigungen für diesen Termin aktivieren"
              />
            </Grid>
            
            {notificationEnabled && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Erinnerungszeiten
                  </Typography>
                  
                  {reminderTimes.map((reminder, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TextField
                        type="number"
                        label="Stunden"
                        value={reminder.hours}
                        onChange={(e) => updateReminderTime(index, 'hours', e.target.value)}
                        sx={{ width: '100px', mr: 1 }}
                        inputProps={{ min: 0, max: 168 }}
                      />
                      <TextField
                        type="number"
                        label="Minuten"
                        value={reminder.minutes}
                        onChange={(e) => updateReminderTime(index, 'minutes', e.target.value)}
                        sx={{ width: '100px', mr: 1 }}
                        inputProps={{ min: 0, max: 59 }}
                      />
                      <Typography sx={{ mr: 1 }}>vor dem Termin</Typography>
                      {reminderTimes.length > 1 && (
                        <IconButton 
                          onClick={() => removeReminderTime(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  
                  <Button
                    onClick={addReminderTime}
                    startIcon={<Add />}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Weitere Erinnerung hinzufügen
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Individuelle Nachricht (optional)"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Benutzerdefinierte Nachricht für die Benachrichtigung..."
                    helperText="Wenn leer, wird eine automatische Nachricht generiert"
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Group sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Team & Spieler
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required error={!!formErrors.teamId}>
                <InputLabel id="team-label">Teams *</InputLabel>
                <Select
                  labelId="team-label"
                  multiple
                  value={selectedTeamIds}
                  label="Teams *"
                  onChange={(e) => setSelectedTeamIds(e.target.value)}
                  input={<OutlinedInput label="Teams *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((teamId) => {
                        const team = teams.find(t => t._id === teamId);
                        return team ? (
                          <Chip key={teamId} label={team.name} size="small" />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {teams.map((team) => {
                    const isCoachTeam = userCoachTeams.some(t => t._id === team._id);
                    return (
                      <MenuItem key={team._id} value={team._id}>
                        <Checkbox checked={selectedTeamIds.indexOf(team._id) > -1} />
                        <ListItemText 
                          primary={team.name}
                          secondary={isCoachTeam ? '(Sie sind Trainer)' : null}
                        />
                      </MenuItem>
                    );
                  })}
                </Select>
                {formErrors.teamId && (
                  <FormHelperText>{formErrors.teamId}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {selectedTeamIds.length > 1 && userCoachTeams.filter(team => selectedTeamIds.includes(team._id)).length > 1 && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="organizing-teams-label">Organisierende Teams *</InputLabel>
                    <Select
                      labelId="organizing-teams-label"
                      multiple
                      value={organizingTeamIds}
                      onChange={(e) => setOrganizingTeamIds(e.target.value)}
                      input={<OutlinedInput label="Organisierende Teams *" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((teamId) => {
                            const team = userCoachTeams.find(t => t._id === teamId);
                            return team ? (
                              <Chip key={teamId} label={team.name} size="small" />
                            ) : null;
                          })}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {userCoachTeams
                        .filter(team => selectedTeamIds.includes(team._id))
                        .map((team) => (
                          <MenuItem key={team._id} value={team._id}>
                            <Checkbox checked={organizingTeamIds.indexOf(team._id) > -1} />
                            <ListItemText primary={team.name} />
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isOpenAccess}
                    onChange={(e) => setIsOpenAccess(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Public sx={{ mr: 1 }} />
                    Offenes Training (für alle Vereinsmitglieder)
                  </Box>
                }
              />
            </Grid>
            
            {!isOpenAccess && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="players-label">Nominierte Spieler</InputLabel>
                  <Select
                    labelId="players-label"
                    multiple
                    value={selectedPlayers}
                    onChange={handlePlayerSelection}
                    input={<OutlinedInput label="Nominierte Spieler" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((playerId) => {
                          const player = availablePlayers.find(p => p._id === playerId);
                          return player ? (
                            <Chip key={playerId} label={player.name} size="small" />
                          ) : null;
                        })}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: '400px',
                          width: 250,
                          display: 'flex',
                          flexDirection: 'column',
                        },
                      },
                      MenuListProps: {
                        style: {
                          paddingTop: 0,
                          paddingBottom: 0,
                          overflow: 'auto',
                          flex: 1,
                        }
                      },
                      autoFocus: false,
                    }}
                  >
                    
                    <MenuItem 
                      value="select-all-action"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectAllPlayers(e);
                      }} 
                      style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}
                    >
                      <Checkbox
                        checked={selectedPlayers.length === availablePlayers.length && availablePlayers.length > 0}
                        indeterminate={selectedPlayers.length > 0 && selectedPlayers.length < availablePlayers.length}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      <ListItemText primary="Alle auswählen" />
                    </MenuItem>
                    
                    <Divider style={{ position: 'sticky', top: 48, backgroundColor: 'white', zIndex: 1 }} />
                    
                    {availablePlayers.map((player) => (
                      <MenuItem key={player._id} value={player._id}>
                        <Checkbox checked={selectedPlayers.indexOf(player._id) > -1} />
                        <ListItemText 
                          primary={player.name} 
                          secondary={player.role === 'Jugendspieler' ? 'Jugendspieler' : null} 
                        />
                      </MenuItem>
                    ))}
                    
                  </Select>
                </FormControl>
              </Grid>
            )}

            {isRecurringEvent && !updateRecurring && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<Info />}>
                  <Typography variant="body2">
                    Möchten Sie Änderungen auf die gesamte Serie anwenden? Aktivieren Sie den Schalter oben.
                  </Typography>
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/coach/events/${id}`)}
                sx={{ mr: 2 }}
              >
                Abbrechen
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                disabled={eventLoading}
                startIcon={eventLoading ? <CircularProgress size={20} /> : null}
              >
                {eventLoading 
                  ? 'Speichere...' 
                  : (convertToRecurring 
                    ? 'In Serie umwandeln' 
                    : 'Änderungen speichern')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default EditEvent;

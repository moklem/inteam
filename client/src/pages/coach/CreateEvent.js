import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import {
  ArrowBack,
  Event,
  LocationOn,
  Group,
  Description,
  Person,
  Repeat,
  Public,
  Notifications,
  Add,
  Delete
} from '@mui/icons-material';
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

const CreateEvent = () => {
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { createEvent, loading: eventLoading, error: eventError, setError: setEventError } = useContext(EventContext);
  const { teams, fetchTeams, loading: teamLoading } = useContext(TeamContext);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Training');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 2)));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [teamId, setTeamId] = useState([]);
  const [userCoachTeams, setUserCoachTeams] = useState([]);
  const [organizingTeamIds, setOrganizingTeamIds] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  
  // Recurring event states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 3)));
  
  // Open access state
  const [isOpenAccess, setIsOpenAccess] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  
  // Voting deadline state
  const [votingDeadline, setVotingDeadline] = useState(null);
  
  // Notification settings states
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState([
    { hours: 24, minutes: 0 },
    { hours: 1, minutes: 0 }
  ]);
  const [customMessage, setCustomMessage] = useState('');

  // Load teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      await fetchTeams();
    };
    loadTeams();
  }, [fetchTeams]);

  // Identify which teams the user coaches
  useEffect(() => {
    if (teams.length > 0 && user) {
      const coachTeams = teams.filter(team => 
        team.coaches.some(coach => coach._id === user._id)
      );
      setUserCoachTeams(coachTeams);
      
      // Set default organizing teams if not set
      if (organizingTeamIds.length === 0 && coachTeams.length > 0) {
        setOrganizingTeamIds([coachTeams[0]._id]);
      }
    }
  }, [teams, user, organizingTeamIds]);

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
      // By default, select all players unless open access
      if (!isOpenAccess) {
        setSelectedPlayers(allPlayers.map(player => player._id));
      }
    } else {
      setAvailablePlayers([]);
      setSelectedPlayers([]);
    }
  }, [selectedTeamIds, teams, isOpenAccess]);

  // Automatically set organizing teams based on selected teams
  useEffect(() => {
    if (selectedTeamIds.length > 0) {
      // Filter selected teams to only include teams where user is a coach
      const coachSelectedTeams = selectedTeamIds.filter(teamId => 
        userCoachTeams.some(t => t._id === teamId)
      );
      
      // Set all coach teams as organizing teams
      if (coachSelectedTeams.length > 0) {
        setOrganizingTeamIds(coachSelectedTeams);
      }
    } else {
      // Clear organizing teams when no teams are selected
      setOrganizingTeamIds([]);
    }
  }, [selectedTeamIds, userCoachTeams]);

  // Clear selected players when open access is enabled
  useEffect(() => {
    if (isOpenAccess) {
      setSelectedPlayers([]);
    } else if (selectedTeamIds.length > 0 && availablePlayers.length > 0) {
      // Re-select all players when open access is disabled
      setSelectedPlayers(availablePlayers.map(player => player._id));
    }
  }, [isOpenAccess, selectedTeamIds, availablePlayers]);

  const validateForm = () => {
    const errors = {};
    
    if (!title.trim()) errors.title = 'Titel ist erforderlich';
    if (selectedTeamIds.length === 0) errors.teamId = 'Mindestens ein Team ist erforderlich';
    if (!location.trim()) errors.location = 'Ort ist erforderlich';
    if (!startTime) errors.startTime = 'Startzeit ist erforderlich';
    if (!endTime) errors.endTime = 'Endzeit ist erforderlich';

    if (selectedTeamIds.length === 0) {
      errors.teamId = 'Mindestens ein Team ist erforderlich';
    } else {
      // Check if user is coach of at least one selected team
      const hasCoachTeam = selectedTeamIds.some(teamId => 
        userCoachTeams.some(t => t._id === teamId)
      );
      if (!hasCoachTeam) {
        errors.teamId = 'Sie müssen Trainer von mindestens einem der ausgewählten Teams sein';
      }
    }
    
    if (startTime && endTime && startTime >= endTime) {
      errors.endTime = 'Endzeit muss nach der Startzeit liegen';
    }
    
    if (isRecurring) {
      if (!recurringEndDate) errors.recurringEndDate = 'Enddatum für wiederkehrende Termine ist erforderlich';
      if (recurringEndDate && recurringEndDate <= startTime) {
        errors.recurringEndDate = 'Enddatum muss nach der Startzeit liegen';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitError('');
    setEventError(null);
    
    try {
      // Create events for each selected team
      const createdEvents = [];
      
      for (const teamId of selectedTeamIds) {
        const eventData = {
          title,
          type,
          startTime,
          endTime,
          location,
          description,
          notes,
          teams: selectedTeamIds,
          organizingTeam: organizingTeamIds[0], // Keep for backward compatibility
          organizingTeams: organizingTeamIds,
          invitedPlayers: isOpenAccess ? [] : selectedPlayers.filter(playerId => {
            // Only invite players that belong to this team
            const team = teams.find(t => t._id === teamId);
            return team && team.players.some(p => p._id === playerId);
          }),
          isOpenAccess,
          isRecurring,
          recurringPattern: isRecurring ? recurringPattern : undefined,
          recurringEndDate: isRecurring ? recurringEndDate : undefined,
          votingDeadline: votingDeadline,
          notificationSettings: {
            enabled: notificationEnabled,
            reminderTimes: reminderTimes,
            customMessage: customMessage
          }
        };
        
        const result = await createEvent(eventData);
        createdEvents.push(result);
      }
      
      // Wait a short moment to ensure state updates have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to the first created event
      if (createdEvents.length > 0) {
        const firstEvent = createdEvents[0];
        if (firstEvent.mainEvent) {
          navigate(`/coach/events/${firstEvent.mainEvent._id}`);
        } else {
          navigate(`/coach/events/${firstEvent._id}`);
        }
      }
    } catch (error) {
      setSubmitError(error.message || 'Fehler beim Erstellen des Termins');
    }
  };

  const handlePlayerSelection = (event) => {
    const { value } = event.target;
    setSelectedPlayers(value);
  };

  const handleSelectAllPlayers = () => {
    if (selectedPlayers.length === availablePlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(availablePlayers.map(player => player._id));
    }
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

  if (teamLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/events')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Neuen Termin erstellen
        </Typography>
      </Box>
      
      {(submitError || eventError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError || eventError}
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
              <Tooltip title="Geben Sie einen Titel für den Termin ein" placement="top">
                <TextField
                  fullWidth
                  label="Titel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={!!formErrors.title}
                  helperText={formErrors.title}
                  required
                  InputProps={{
                    sx: {
                      cursor: 'pointer',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Tooltip title="Wählen Sie den Typ des Termins" placement="top">
                <FormControl fullWidth required error={!!formErrors.type}>
                  <InputLabel id="type-label">Typ</InputLabel>
                  <Select
                    labelId="type-label"
                    value={type}
                    label="Typ"
                    onChange={(e) => setType(e.target.value)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          '& .MuiMenuItem-root': {
                            padding: '10px 16px',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)'
                            }
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="Training">Training</MenuItem>
                    <MenuItem value="Game">Spiel</MenuItem>
                  </Select>
                  {formErrors.type && <FormHelperText>{formErrors.type}</FormHelperText>}
                </FormControl>
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Tooltip title="Wählen Sie die Startzeit des Termins" placement="top">
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
                        helperText: formErrors.startTime,
                        sx: {
                          cursor: 'pointer',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Tooltip title="Wählen Sie die Endzeit des Termins" placement="top">
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
                        helperText: formErrors.endTime,
                        sx: {
                          cursor: 'pointer',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Tooltip title={isRecurring ? "Setzen Sie eine Zeit bis wann Spieler vor jedem Termin abstimmen können" : "Setzen Sie eine Frist bis wann Spieler abstimmen können (optional)"} placement="top">
                {isRecurring ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <TimePicker
                      label="Abstimmungsfrist (optional)"
                      value={votingDeadline}
                      onChange={(newValue) => setVotingDeadline(newValue)}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: "Zeit vor jedem Termin bis zu der abgestimmt werden kann",
                          sx: {
                            cursor: 'pointer',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main'
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                    <DateTimePicker
                      label="Abstimmungsfrist (optional)"
                      value={votingDeadline}
                      onChange={(newValue) => setVotingDeadline(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: "Nach dieser Zeit können Spieler nicht mehr abstimmen",
                          sx: {
                            cursor: 'pointer',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main'
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                )}
              </Tooltip>
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
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            {/* Recurring Event Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Repeat sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Wiederkehrende Termine
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    color="primary"
                    sx={{
                      cursor: 'pointer',
                      '& .MuiSwitch-switchBase': {
                        cursor: 'pointer'
                      }
                    }}
                  />
                }
                label="Termin wiederholt sich regelmäßig"
                sx={{ cursor: 'pointer' }}
              />
            </Grid>
            
            {isRecurring && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="recurring-pattern-label">Wiederholungsmuster</InputLabel>
                    <Select
                      labelId="recurring-pattern-label"
                      value={recurringPattern}
                      label="Wiederholungsmuster"
                      onChange={(e) => setRecurringPattern(e.target.value)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        }
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            '& .MuiMenuItem-root': {
                              padding: '10px 16px',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)'
                              }
                            }
                          }
                        }
                      }}
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
                          required: isRecurring,
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
            
            <Grid item xs={12} sm={6}>
              <Tooltip title="Wählen Sie ein oder mehrere Teams für diesen Termin" placement="top">
                <FormControl fullWidth error={!!formErrors.teamId}>
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
              </Tooltip>
            </Grid>

            {selectedTeamIds.length > 1 && userCoachTeams.filter(team => selectedTeamIds.includes(team._id)).length > 1 && (
              <Grid item xs={12} sm={6}>
                <Tooltip title="Wählen Sie die organisierenden Teams (müssen Teams sein, die Sie trainieren)" placement="top">
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
                </Tooltip>
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isOpenAccess}
                    onChange={(e) => setIsOpenAccess(e.target.checked)}
                    color="primary"
                    disabled={!teamId}
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
                <Tooltip title="Wählen Sie die Spieler, die zu diesem Termin eingeladen werden sollen" placement="top">
                  <FormControl fullWidth disabled={selectedTeamIds.length === 0}>
                    <InputLabel id="players-label">Nominierte Spieler</InputLabel>
                    <Select
                      labelId="players-label"
                      multiple
                      value={selectedPlayers}
                      onChange={handlePlayerSelection}
                      input={<OutlinedInput label="Eingeladene Spieler" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((playerId) => {
                            const player = availablePlayers.find(p => p._id === playerId);
                            return player ? (
                              <Chip
                                key={playerId}
                                label={player.name}
                                size="small"
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                  }
                                }}
                              />
                            ) : null;
                          })}
                        </Box>
                      )}
                      MenuProps={{
                        ...MenuProps,
                        PaperProps: {
                          ...MenuProps.PaperProps,
                          sx: {
                            ...MenuProps.PaperProps.style,
                            '& .MuiMenuItem-root': {
                              padding: '8px 16px',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)'
                              }
                            }
                          }
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      <MenuItem onClick={handleSelectAllPlayers}>
                        <Checkbox
                          checked={selectedPlayers.length === availablePlayers.length && availablePlayers.length > 0}
                          indeterminate={selectedPlayers.length > 0 && selectedPlayers.length < availablePlayers.length}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        />
                        <ListItemText primary="Alle auswählen" />
                      </MenuItem>
                      
                      <Divider />
                      
                      {availablePlayers.map((player) => (
                        <MenuItem key={player._id} value={player._id}>
                          <Checkbox
                            checked={selectedPlayers.indexOf(player._id) > -1}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          />
                          <ListItemText
                            primary={player.name}
                            secondary={player.role === 'Jugendspieler' ? 'Jugendspieler' : null}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Tooltip>
              </Grid>
            )}
            
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="Zurück zur Terminübersicht" placement="top">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/coach/events')}
                  sx={{
                    mr: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  Abbrechen
                </Button>
              </Tooltip>
              
              <Tooltip title={isRecurring ? "Wiederkehrende Termine erstellen" : "Termin erstellen"} placement="top">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={eventLoading}
                  startIcon={eventLoading ? <CircularProgress size={20} /> : <Event />}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                >
                  {eventLoading ? 'Erstelle...' : (isRecurring ? 'Termine erstellen' : 'Termin erstellen')}
                </Button>
              </Tooltip>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default CreateEvent;

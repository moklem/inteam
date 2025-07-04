import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
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
  Info,
  Public,
  Edit,
  EditCalendar
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
  
  // Recurring event states
  const [eventData, setEventData] = useState(null);
  const [updateRecurring, setUpdateRecurring] = useState(false);
  const [convertToRecurring, setConvertToRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 3)));
  
  // Open access state
  const [isOpenAccess, setIsOpenAccess] = useState(false);

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
      
      // Set selected players (combine invited, attending, and declined)
      const allInvitedPlayers = [
        ...loadedEvent.invitedPlayers.map(p => p._id),
        ...loadedEvent.attendingPlayers.map(p => p._id),
        ...loadedEvent.declinedPlayers.map(p => p._id)
      ];
      
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
       

  // Update available players when team changes
  useEffect(() => {
    if (teamId && teams.length > 0) {
      const selectedTeam = teams.find(team => team._id === teamId);
      if (selectedTeam) {
        setAvailablePlayers(selectedTeam.players);
      }
    } else {
      setAvailablePlayers([]);
    }
  }, [teamId, teams]);

  // Clear selected players when open access is enabled
  useEffect(() => {
    if (isOpenAccess) {
      setSelectedPlayers([]);
    }
  }, [isOpenAccess]);

  const validateForm = () => {
    const errors = {};
    
    if (!title.trim()) errors.title = 'Titel ist erforderlich';
    if (!teamId) errors.teamId = 'Team ist erforderlich';
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
        team: teamId,
        updateRecurring: !forceUpdateSingle && (eventData?.isRecurring || eventData?.isRecurringInstance) ? updateRecurring : false,
        convertToRecurring,
        recurringPattern: convertToRecurring ? recurringPattern : undefined,
        recurringEndDate: convertToRecurring ? recurringEndDate : undefined
      };
      
      const result = await updateEvent(id, updateData);
      
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
    setSelectedPlayers(value);
  };

  const handleSelectAllPlayers = () => {
    if (selectedPlayers.length === availablePlayers.length) {
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
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                <DateTimePicker
                  label="Startzeit"
                  value={startTime}
                  onChange={(newValue) => setStartTime(newValue)}
                  disabled={updateRecurring}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!formErrors.startTime,
                      helperText: formErrors.startTime || (updateRecurring ? 'Zeit wird für alle Termine angepasst' : '')
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
                  disabled={updateRecurring}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!formErrors.endTime,
                      helperText: formErrors.endTime || (updateRecurring ? 'Zeit wird für alle Termine angepasst' : '')
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
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Group sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Team & Spieler
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!formErrors.teamId}>
                <InputLabel id="team-label">Team</InputLabel>
                <Select
                  labelId="team-label"
                  value={teamId}
                  label="Team"
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  {teams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.teamId && <FormHelperText>{formErrors.teamId}</FormHelperText>}
              </FormControl>
            </Grid>
            
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
                  <InputLabel id="players-label">Eingeladene Spieler</InputLabel>
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
                            <Chip key={playerId} label={player.name} size="small" />
                          ) : null;
                        })}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    <MenuItem onClick={handleSelectAllPlayers}>
                      <Checkbox
                        checked={selectedPlayers.length === availablePlayers.length && availablePlayers.length > 0}
                        indeterminate={selectedPlayers.length > 0 && selectedPlayers.length < availablePlayers.length}
                      />
                      <ListItemText primary="Alle auswählen" />
                    </MenuItem>
                    
                    <Divider />
                    
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
            
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/coach/events/${id}`)}
                sx={{ mr: 2 }}
              >
                Abbrechen
              </Button>
              
              {isRecurringEvent ? (
                <ButtonGroup variant="contained">
                  <Button
                    onClick={(e) => handleSubmit(e, true)}
                    startIcon={<Edit />}
                  >
                    Nur diesen Termin
                  </Button>
                  <Button
                    onClick={(e) => {
                      setUpdateRecurring(true);
                      handleSubmit(e);
                    }}
                    startIcon={<EditCalendar />}
                  >
                    Alle Termine
                  </Button>
                </ButtonGroup>
              ) : (
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
              )}
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default EditEvent;

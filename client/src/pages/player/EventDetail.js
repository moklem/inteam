import React, { useContext, useEffect, useState, useRef } from 'react';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Event,
  LocationOn,
  Group,
  Person,
  Check,
  Close,
  ArrowBack,
  AccessTime,
  Description,
  SportsVolleyball,
  Help
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchEvent, acceptInvitation, declineInvitation, markAsUnsure, loading: eventLoading, error: eventError } = useContext(EventContext);
  const { loading: teamLoading } = useContext(TeamContext);
  
  const [event, setEvent] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogType, setReasonDialogType] = useState(''); // 'decline' or 'unsure'
  const [reason, setReason] = useState('');
  const [isVotingDeadlinePassed, setIsVotingDeadlinePassed] = useState(false);
  const reasonTextFieldRef = useRef(null);

  // Load event data
  useEffect(() => {
    let mounted = true;
    
    const loadEvent = async () => {
      if (!id) return;
      
      try {
        const eventData = await fetchEvent(id);
        if (mounted) {
          setEvent(eventData);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      }
    };
    
    loadEvent();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [id]); // Only depend on ID

  // Check voting deadline
  useEffect(() => {
    if (event) {
      const now = new Date();
      const deadline = event.votingDeadline ? new Date(event.votingDeadline) : null;
      setIsVotingDeadlinePassed(deadline && now > deadline);
    }
  }, [event]);

  // Determine user status
  useEffect(() => {
    if (event && user) {
      if (event.attendingPlayers.some(p => p._id === user._id)) {
        setUserStatus({ status: 'attending', label: 'Zugesagt', color: 'success', icon: <Check /> });
      } else if (event.declinedPlayers.some(p => p._id === user._id)) {
        setUserStatus({ status: 'declined', label: 'Abgesagt', color: 'error', icon: <Close /> });
      } else if (event.unsurePlayers && event.unsurePlayers.some(p => p && p._id === user._id)) {
        setUserStatus({ status: 'unsure', label: 'Unsicher', color: 'warning', icon: <Help /> });
      } else if (event.invitedPlayers.some(p => p._id === user._id)) {
        setUserStatus({ status: 'invited', label: 'Ausstehend', color: 'warning', icon: <Help /> });
      } else if (event.guestPlayers.some(g => g.player._id === user._id)) {
        setUserStatus({ status: 'guest', label: 'Gast', color: 'info', icon: <SportsVolleyball /> });
      } else if (event.uninvitedPlayers && event.uninvitedPlayers.some(p => p._id === user._id)) {
        setUserStatus({ status: 'uninvited', label: "You haven't been nominated", color: 'error', icon: <Close /> });
      } else{
        setUserStatus({ status: 'unknown', label: 'Unbekannt', color: 'default', icon: null });
      }
    }
  }, [event, user]);

  // Focus the text field when dialog opens
  useEffect(() => {
    if (reasonDialogOpen && reasonTextFieldRef.current) {
      setTimeout(() => {
        reasonTextFieldRef.current.focus();
      }, 100);
    }
  }, [reasonDialogOpen]);

  const handleAccept = async () => {
    try {
      await acceptInvitation(id);
      // Reload the event to get updated data
      const updatedEvent = await fetchEvent(id);
      setEvent(updatedEvent);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDecline = () => {
    setReasonDialogType('decline');
    setReasonDialogOpen(true);
    setReason('');
  };

  const handleUnsure = () => {
    setReasonDialogType('unsure');
    setReasonDialogOpen(true);
    setReason('');
  };

  const handleReasonSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    try {
      if (reasonDialogType === 'decline') {
        await declineInvitation(id, reason);
      } else if (reasonDialogType === 'unsure') {
        await markAsUnsure(id, reason);
      }
      
      // Reload the event to get updated data
      const updatedEvent = await fetchEvent(id);
      setEvent(updatedEvent);
      
      // Close dialog
      setReasonDialogOpen(false);
      setReason('');
    } catch (error) {
      console.error(`Error ${reasonDialogType === 'decline' ? 'declining' : 'marking as unsure'}:`, error);
    }
  };

  const formatEventDate = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const sameDay = start.getDate() === end.getDate() && 
                    start.getMonth() === end.getMonth() && 
                    start.getFullYear() === end.getFullYear();
    
    if (sameDay) {
      return `${format(start, 'EEEE, dd. MMMM yyyy', { locale: de })} | ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  };

  if (eventLoading || teamLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (eventError) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          Fehler beim Laden des Termins: {eventError}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/player/events')}
          sx={{ mt: 2 }}
        >
          Zurück zur Terminübersicht
        </Button>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Termin nicht gefunden.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/player/events')}
          sx={{ mt: 2 }}
        >
          Zurück zur Terminübersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/player/events')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Termindetails
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
            <Avatar sx={{ bgcolor: event.type === 'Training' ? 'primary.main' : 'secondary.main', mr: 2 }}>
              <Event />
            </Avatar>
            <Typography variant="h5" component="h2">
              {event.title}
            </Typography>
          </Box>

          {userStatus && userStatus.status === 'uninvited' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Du wurdest nicht nominiert
          </Alert>
        )}
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={event.team.name} 
              color="primary" 
              icon={<Group />}
            />
            <Chip 
              label={event.type === 'Training' ? 'Training' : 'Spiel'} 
              color={event.type === 'Training' ? 'primary' : 'secondary'} 
              variant="outlined"
              icon={<SportsVolleyball />}
            />
            {userStatus && (
              <Chip 
                label={userStatus.label} 
                color={userStatus.color} 
                icon={userStatus.icon}
              />
            )}
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" component="div">
                  Datum & Uhrzeit
                </Typography>
                <Typography variant="body1">
                  {formatEventDate(event.startTime, event.endTime)}
                </Typography>
              </Box>
            </Box>
            
            {event.votingDeadline && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <AccessTime sx={{ mr: 1, color: isVotingDeadlinePassed ? 'error.main' : 'warning.main' }} />
                <Box>
                  <Typography variant="subtitle1" component="div">
                    Abstimmungsfrist
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color={isVotingDeadlinePassed ? 'error.main' : 'text.primary'}
                  >
                    {format(new Date(event.votingDeadline), 'EEEE, dd. MMMM yyyy HH:mm', { locale: de })}
                  </Typography>
                  {isVotingDeadlinePassed && (
                    <Typography variant="body2" color="error.main">
                      Die Abstimmungsfrist ist abgelaufen
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" component="div">
                  Ort
                </Typography>
                <Typography variant="body1">
                  {event.location}
                </Typography>
              </Box>
            </Box>
            
            {event.description && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" component="div">
                    Beschreibung
                  </Typography>
                  <Typography variant="body1">
                    {event.description}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {event.notes && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" component="div">
                    Notizen
                  </Typography>
                  <Typography variant="body1">
                    {event.notes}
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Teilnehmer ({event.attendingPlayers.length})
            </Typography>
            
            {event.attendingPlayers.length > 0 ? (
              <List dense>
                {event.attendingPlayers.map(player => (
                  <ListItem key={player._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={player.name} 
                      secondary={player.position || 'Keine Position angegeben'}
                    />
                    {player._id === user._id && (
                      <Chip label="Du" size="small" color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Noch keine Teilnehmer.
              </Typography>
            )}
            
            {event.guestPlayers.length > 0 && (
              <>
                <Typography variant="subtitle1" component="div" sx={{ mt: 2, mb: 1 }}>
                  Gäste ({event.guestPlayers.length})
                </Typography>
                <List dense>
                  {event.guestPlayers.map(guest => (
                    <ListItem key={guest.player._id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={guest.player.name} 
                        secondary={`Von Team: ${guest.fromTeam.name}`}
                      />
                      {guest.player._id === user._id && (
                        <Chip label="Du" size="small" color="primary" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            
            {event.declinedPlayers.length > 0 && (
              <>
                <Typography variant="subtitle1" component="div" sx={{ mt: 2, mb: 1 }}>
                  Abgesagt ({event.declinedPlayers.length})
                </Typography>
                <List dense>
                  {event.declinedPlayers.map(player => (
                    <ListItem key={player._id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={player.name} />
                      {player._id === user._id && (
                        <Chip label="Du" size="small" color="error" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            
            {event.unsurePlayers && event.unsurePlayers.length > 0 && (
              <>
                <Typography variant="subtitle1" component="div" sx={{ mt: 2, mb: 1 }}>
                  Unsicher ({event.unsurePlayers.length})
                </Typography>
                <List dense>
                  {event.unsurePlayers.map(player => (
                    <ListItem key={player._id || player.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={player.name || 'Unbekannter Spieler'} />
                      {player._id === user._id && (
                        <Chip label="Du" size="small" color="warning" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Grid>
        </Grid>
        
        {/* Show action buttons for events (but not if uninvited) */}
        {userStatus && userStatus.status !== 'uninvited' && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {isVotingDeadlinePassed && (
              <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                Die Abstimmungsfrist ist abgelaufen. Änderungen sind nicht mehr möglich.
              </Alert>
            )}
            {userStatus.status === 'attending' ? (
              // If already attending, show decline and unsure buttons
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Help />}
                  onClick={handleUnsure}
                  disabled={isVotingDeadlinePassed}
                >
                  Unsicher
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Close />}
                  onClick={handleDecline}
                  disabled={isVotingDeadlinePassed}
                >
                  Absagen
                </Button>
              </>
          ) : userStatus && userStatus.status === 'declined' ? (
            // If already declined, show accept and unsure buttons
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<Check />}
                onClick={handleAccept}
                disabled={isVotingDeadlinePassed}
              >
                Zusagen
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Help />}
                onClick={handleUnsure}
                disabled={isVotingDeadlinePassed}
              >
                Unsicher
              </Button>
            </>
          ) : userStatus && userStatus.status === 'unsure' ? (
            // If already unsure, show accept and decline buttons
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<Check />}
                onClick={handleAccept}
                disabled={isVotingDeadlinePassed}
              >
                Zusagen
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Close />}
                onClick={handleDecline}
                disabled={isVotingDeadlinePassed}
              >
                Absagen
              </Button>
            </>
          ) : (
            // Default state - show all three buttons
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<Check />}
                onClick={handleAccept}
                disabled={isVotingDeadlinePassed}
              >
                Zusagen
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Help />}
                onClick={handleUnsure}
                disabled={isVotingDeadlinePassed}
              >
                Unsicher
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Close />}
                onClick={handleDecline}
                disabled={isVotingDeadlinePassed}
              >
                Absagen
              </Button>
            </>
          )}
        </Box>
        )}
      </Paper>
      
      {/* Reason Dialog */}
      <Dialog open={reasonDialogOpen} onClose={() => setReasonDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reasonDialogType === 'decline' ? 'Grund für Absage' : 'Grund für Unsicherheit'}
        </DialogTitle>
        <DialogContent>
          <TextField
            ref={reasonTextFieldRef}
            autoFocus
            margin="dense"
            label="Bitte geben Sie einen Grund an"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onTouchStart={(e) => {
              e.preventDefault();
              e.target.focus();
              e.target.click();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.target.focus();
            }}
            onClick={(e) => {
              e.target.focus();
            }}
            required
            error={reason.trim() === ''}
            helperText={reason.trim() === '' ? 'Grund ist erforderlich' : ''}
            inputProps={{
              autoComplete: 'off',
              autoCorrect: 'off',
              autoCapitalize: 'off',
              spellCheck: 'false',
              onTouchStart: (e) => {
                e.stopPropagation();
                e.target.focus();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleReasonSubmit} 
            variant="contained"
            color={reasonDialogType === 'decline' ? 'error' : 'warning'}
            disabled={!reason.trim()}
          >
            {reasonDialogType === 'decline' ? 'Absagen' : 'Als unsicher markieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventDetail;
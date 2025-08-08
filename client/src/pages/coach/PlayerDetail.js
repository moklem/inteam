import React, { useContext, useEffect, useState } from 'react';

import axios from 'axios';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PropTypes from 'prop-types';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Person,
  ArrowBack,
  Email,
  Phone,
  CalendarToday,
  SportsVolleyball,
  Group,
  Delete,
  Edit
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Button
} from '@mui/material';


import EditPlayerDialog from '../../components/coach/EditPlayerDialog';
import PlayerRatingCard from '../../components/PlayerRatingCard';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, removePlayerFromTeam, loading: teamsLoading } = useContext(TeamContext);
  
  const [player, setPlayer] = useState(null);
  const [playerTeams, setPlayerTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDeletePlayer = async () => {
    if (!window.confirm(`Wenn Sie den Spieler nur aus einem Team entfernen wollen, machen Sie das bitte über die Team Seite! Möchten Sie ${player.name} wirklich vollständig aus dem System löschen? Diese Aktion kann nicht rückgängig gemacht werden! `)) {
      return;
    }
    
    // Double confirmation for safety
    if (!window.confirm(`Sind Sie sicher? Alle Daten von ${player.name} werden unwiderruflich gelöscht.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Get the user object from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Nicht authentifiziert');
      }
      
      const userData = JSON.parse(userStr);
      if (!userData.token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }
      
      // Delete the user completely from the system
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${player._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Spielers');
      }
      
      // Navigate back to players list
      navigate('/coach/players');
    } catch (err) {
      console.error('Error deleting player:', err);
      setError(err.message || 'Fehler beim Löschen des Spielers');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = (updatedPlayer) => {
    setPlayer(updatedPlayer);
    setEditDialogOpen(false);
  };
  
  // In client/src/pages/coach/PlayerDetail.js

useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Step 1: Fetch player data directly from API
        try {
          const playerResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}`);
          
          if (!playerResponse.data) {
            setError('Spieler nicht gefunden');
            setLoading(false);
            return;
          }
          
          setPlayer(playerResponse.data);
        } catch (err) {
          if (err.response?.status === 404) {
            setError('Spieler nicht gefunden');
          } else {
            setError('Fehler beim Laden der Spielerdaten');
          }
          setLoading(false);
          return;
        }
        
        // Step 2: Fetch all teams to determine which ones the player belongs to
        await fetchTeams();
        
        // Step 3: After teams are loaded, find teams that include this player
        const playerTeamsList = teams.filter(team => 
          team.players.some(p => p._id === id)
        );
        
        setPlayerTeams(playerTeamsList);
        
        // Step 4: Set player teams
        // No need to load attributes anymore as legacy system is removed
        
      } catch (err) {
        console.error('Error loading player data:', err);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, fetchTeams]);


  const formatDate = (dateString) => {
    if (!dateString) return 'Nicht angegeben';
    
    try {
      return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/players')}
          sx={{ mt: 2 }}
        >
          Zurück zur Spielerübersicht
        </Button>
      </Box>
    );
  }

  if (!player) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Spieler nicht gefunden.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/players')}
          sx={{ mt: 2 }}
        >
          Zurück zur Spielerübersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/players')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Spielerdetails
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/coach/players/${id}/progress`)}
            sx={{ ml: 2 }}
          >
            Entwicklungsverlauf anzeigen
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
            <Avatar sx={{ bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main', mr: 2, width: 56, height: 56 }}>
              <Person sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" component="h2">
                {player.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {player.position || 'Keine Position angegeben'}
              </Typography>
            </Box>
          </Box>
          
          <Chip 
            label={player.role} 
            color={player.role === 'Jugendspieler' ? 'secondary' : 'primary'} 
            icon={<SportsVolleyball />}
          />
          <IconButton
            onClick={() => setEditDialogOpen(true)}
            color="primary"
            title="Spieler bearbeiten"
            sx={{ ml: 1 }}
          />
            <Edit />
            <IconButton
                onClick={handleDeletePlayer}
                color="error"
                title="Spieler vollständig löschen"
                sx={{ 
                  ml: 2,
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'white'
                  }
                }}
              >
                <Delete />
              </IconButton>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" component="h3" gutterBottom>
              Persönliche Informationen
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Email sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                {player.email || 'Keine E-Mail angegeben'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Phone sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                {player.phoneNumber || 'Keine Telefonnummer angegeben'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                {formatDate(player.birthDate)}
                {player.birthDate && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({calculateAge(player.birthDate)} Jahre)
                  </Typography>
                )}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" component="h3" gutterBottom>
              Teams
            </Typography>
            
            {playerTeams.length > 0 ? (
              <List>
                {playerTeams.map(team => (
                  <ListItem 
                    key={team._id} 
                    button 
                    component={RouterLink} 
                    to={`/coach/teams/${team._id}`}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main' }}>
                        <Group />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={team.name} 
                      secondary={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Spieler ist keinem Team zugeordnet.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Universelle Spielerbewertung (1-99 Skala)
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Diese Bewertungen sind universell und gelten teamübergreifend. Sie basieren auf den sechs Kernattributen des Volleyballs.
        </Typography>
        
        <PlayerRatingCard
          player={player}
          editable={true}
          showOverallRating={true}
          compact={false}
          onSave={() => {
            // Refresh could be added here if needed
            console.log('Player ratings saved');
          }}
        />
      </Paper>
      <EditPlayerDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        player={player}
        onSuccess={handleEditSuccess}
      />
    </Box>
  );
};

PlayerDetail.propTypes = {
  // No props for this component, but keeping the prop types structure for consistency
};

export default PlayerDetail;

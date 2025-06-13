import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Card,
  CardContent
} from '@mui/material';
import {
  Group,
  Person,
  ArrowBack,
  SportsTennis,
  Email,
  Phone
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeam, loading, error } = useContext(TeamContext);
  
  const [team, setTeam] = useState(null);
  const [isUserInTeam, setIsUserInTeam] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const teamData = await fetchTeam(id);
        setTeam(teamData);
        
        // Check if user is in this team
        if (teamData && user) {
          const userInTeam = teamData.players.some(player => player._id === user._id) || 
                            teamData.coaches.some(coach => coach._id === user._id);
          setIsUserInTeam(userInTeam);
        }
      } catch (error) {
        console.error('Error loading team:', error);
      }
    };
    
    loadTeam();
  }, [id, fetchTeam, user]);

  if (loading) {
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
          Fehler beim Laden des Teams: {error}
        </Alert>
        <IconButton 
          onClick={() => navigate('/player/teams')} 
          sx={{ mt: 2 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Team nicht gefunden.
        </Alert>
        <IconButton 
          onClick={() => navigate('/player/teams')} 
          sx={{ mt: 2 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/player/teams')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Team Details
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
            <Avatar sx={{ bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main', mr: 2 }}>
              <Group />
            </Avatar>
            <Typography variant="h5" component="h2">
              {team.name}
            </Typography>
          </Box>
          
          <Chip 
            label={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
            color={team.type === 'Youth' ? 'secondary' : 'primary'} 
            icon={<SportsTennis />}
          />
        </Box>
        
        {team.description && (
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            {team.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" component="h3" gutterBottom>
              Trainer ({team.coaches.length})
            </Typography>
            
            {team.coaches.length > 0 ? (
              <List>
                {team.coaches.map(coach => (
                  <ListItem key={coach._id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={coach.name}
                      secondary={
                        <React.Fragment>
                          {coach.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Email fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                              <Typography variant="body2" component="span">
                                {coach.email}
                              </Typography>
                            </Box>
                          )}
                          {coach.phoneNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Phone fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                              <Typography variant="body2" component="span">
                                {coach.phoneNumber}
                              </Typography>
                            </Box>
                          )}
                        </React.Fragment>
                      }
                    />
                    {coach._id === user?._id && (
                      <Chip label="Du" size="small" color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Keine Trainer zugewiesen.
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" component="h3" gutterBottom>
              Spieler ({team.players.length})
            </Typography>
            
            {team.players.length > 0 ? (
              <List>
                {team.players.map(player => (
                  <ListItem key={player._id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body1" component="span">
                            {player.name}
                          </Typography>
                          {player.role === 'Jugendspieler' && (
                            <Chip 
                              label="Jugendspieler" 
                              size="small" 
                              color="secondary" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          {player.position && (
                            <Typography variant="body2" component="span" color="text.primary">
                              {player.position}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                    {player._id === user?._id && (
                      <Chip label="Du" size="small" color="primary" />
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Keine Spieler zugewiesen.
              </Typography>
            )}
          </Grid>
        </Grid>
        
        {!isUserInTeam && (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Alert severity="info">
              Du bist kein Mitglied dieses Teams. Kontaktiere einen Trainer, wenn du diesem Team beitreten möchtest.
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TeamDetail;
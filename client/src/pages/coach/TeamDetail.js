import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  ListItemSecondaryAction,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Group,
  Person,
  ArrowBack,
  SportsTennis,
  Email,
  Phone,
  Edit,
  Delete,
  Add,
  Search,
  Clear
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeam, removePlayerFromTeam, loading, error } = useContext(TeamContext);
  
  const [team, setTeam] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState(null);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const teamData = await fetchTeam(id);
        setTeam(teamData);
        
        // Check if user is a coach of this team
        if (teamData && user) {
          setIsCoach(teamData.coaches.some(coach => coach._id === user._id));
        }
      } catch (error) {
        console.error('Error loading team:', error);
      }
    };
    
    loadTeam();
  }, [id, fetchTeam, user]);

  // Filter players based on search term
  useEffect(() => {
    if (team && team.players) {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = team.players.filter(player => 
          player.name.toLowerCase().includes(term) ||
          player.position?.toLowerCase().includes(term) ||
          player.email?.toLowerCase().includes(term)
        );
        setFilteredPlayers(filtered);
      } else {
        setFilteredPlayers(team.players);
      }
    }
  }, [team, searchTerm]);

  const handleRemovePlayer = (player) => {
    setPlayerToRemove(player);
    setOpenRemoveDialog(true);
  };

  const confirmRemovePlayer = async () => {
    if (!playerToRemove) return;
    
    try {
      await removePlayerFromTeam(team._id, playerToRemove._id);
      // Refresh team data
      const updatedTeam = await fetchTeam(id);
      setTeam(updatedTeam);
      setOpenRemoveDialog(false);
      setPlayerToRemove(null);
    } catch (error) {
      console.error('Error removing player:', error);
    }
  };

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
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/teams')}
          sx={{ mt: 2 }}
        >
          Zurück zur Teamübersicht
        </Button>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          Team nicht gefunden.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/coach/teams')}
          sx={{ mt: 2 }}
        >
          Zurück zur Teamübersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/coach/teams')} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Team Details
        </Typography>
        
        {isCoach && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            component={RouterLink}
            to={`/coach/teams/edit/${team._id}`}
          >
            Bearbeiten
          </Button>
        )}
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
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
              color={team.type === 'Youth' ? 'secondary' : 'primary'} 
              icon={<SportsTennis />}
            />
            
            {isCoach && (
              <Chip 
                label="Trainer" 
                color="success" 
                icon={<Person />}
              />
            )}
          </Box>
        </Box>
        
        {team.description && (
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            {team.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
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
          
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h3">
                Spieler ({team.players.length})
              </Typography>
              
              {isCoach && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  component={RouterLink}
                  to={`/coach/players?teamId=${team._id}`}
                >
                  Spieler hinzufügen
                </Button>
              )}
            </Box>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Spieler durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchTerm('')} edge="end">
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              size="small"
              sx={{ mb: 2 }}
            />
            
            {filteredPlayers.length > 0 ? (
              <List>
                {filteredPlayers.map(player => (
                  <ListItem 
                    key={player._id} 
                    alignItems="flex-start"
                    component={RouterLink}
                    to={`/coach/players/${player._id}`}
                    button
                    sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}
                  >
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
                          {player.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Email fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                              <Typography variant="body2" component="span">
                                {player.email}
                              </Typography>
                            </Box>
                          )}
                        </React.Fragment>
                      }
                    />
                    {isCoach && (
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemovePlayer(player);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Keine Spieler gefunden.' : 'Keine Spieler zugewiesen.'}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Remove Player Dialog */}
      <Dialog
        open={openRemoveDialog}
        onClose={() => setOpenRemoveDialog(false)}
      >
        <DialogTitle>Spieler entfernen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie {playerToRemove?.name} aus dem Team entfernen möchten?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveDialog(false)}>Abbrechen</Button>
          <Button onClick={confirmRemovePlayer} color="error" variant="contained">
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDetail;
import React, { useContext, useEffect, useState } from 'react';

import axios from 'axios';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';

import {
  Person,
  Search,
  Clear,
  Email,
  Phone,
  SportsVolleyball,
  FilterList,
  Add,
  PersonAdd,
  Link as LinkIcon,
  Edit
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Alert,
  Snackbar,
  useTheme, 
  useMediaQuery
} from '@mui/material';

import EditPlayerDialog from '../../components/coach/EditPlayerDialog';
import InviteLinkDialog from '../../components/coach/InviteLinkDialog';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

// Helper function to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Players = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();
  const teamIdParam = query.get('teamId');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, addPlayerToTeam, loading: teamsLoading } = useContext(TeamContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState(teamIdParam || '');
  const [filterRole, setFilterRole] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [youthPlayers, setYouthPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Set axios authorization header on component mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    if (userData?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
  }, []);

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch all players from API
  const fetchAllPlayers = async () => {
    try {
      setPlayersLoading(true);
      setError('');
      
      // axios should already have the Authorization header set
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
      
      // Process players to add team information
      const playersWithTeams = response.data.map(player => {
        const playerTeams = teams.filter(team => 
          team.players.some(p => p._id === player._id)
        ).map(team => ({
          id: team._id,
          name: team.name,
          type: team.type
        }));
        
        return {
          ...player,
          teams: playerTeams
        };
      });
      
      setAllPlayers(playersWithTeams);
      
      // Set youth players
      const youth = playersWithTeams.filter(player => player.role === 'Jugendspieler');
      setYouthPlayers(youth);
      
      setPlayersLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      
      // If 401, try to set the header again
      if (error.response?.status === 401) {
        const userStr = localStorage.getItem('user');
        const userData = userStr ? JSON.parse(userStr) : null;
        if (userData?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
          // Try once more
          try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
            const playersWithTeams = response.data.map(player => {
              const playerTeams = teams.filter(team => 
                team.players.some(p => p._id === player._id)
              ).map(team => ({
                id: team._id,
                name: team.name,
                type: team.type
              }));
              
              return {
                ...player,
                teams: playerTeams
              };
            });
            
            setAllPlayers(playersWithTeams);
            const youth = playersWithTeams.filter(player => player.role === 'Jugendspieler');
            setYouthPlayers(youth);
            setPlayersLoading(false);
            return;
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }
      }
      
      setError(error.response?.data?.message || 'Fehler beim Laden der Spieler');
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Fetch all players when teams are loaded
  useEffect(() => {
    if (teams.length > 0 || !teamsLoading) {
      fetchAllPlayers();
    }
  }, [teams, teamsLoading]);

  // Filter players based on search term, team, and role
  useEffect(() => {
    let filtered = tabValue === 0 ? allPlayers : youthPlayers;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.email && player.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply team filter
    if (filterTeam) {
      if (filterTeam === 'no-team') {
        // Show players without any team
        filtered = filtered.filter(player => player.teams.length === 0);
      } else {
        filtered = filtered.filter(player =>
          player.teams.some(team => team.id === filterTeam)
        );
      }
    }
    
    // Apply role filter
    if (filterRole) {
      filtered = filtered.filter(player => player.role === filterRole);
    }
    
    setFilteredPlayers(filtered);
  }, [allPlayers, youthPlayers, searchTerm, filterTeam, filterRole, tabValue]);

  const handleAddToTeam = async (playerId, teamId) => {
    try {
      await addPlayerToTeam(teamId, playerId);
      // Refresh players to update team associations
      await fetchAllPlayers();
    } catch (error) {
      console.error('Error adding player to team:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = (updatedPlayer) => {
    // Update the player in the local state
    setAllPlayers(prev => 
      prev.map(p => p._id === updatedPlayer._id ? { ...p, ...updatedPlayer } : p)
    );
    setEditDialogOpen(false);
    setSuccessMessage('Spieler erfolgreich aktualisiert');
  };

  if (playersLoading || teamsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, pb: 10  }}>
      <Box sx={{ mb: 3 }}>
  <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
    Spieler
  </Typography>
  
  <Box sx={{ 
    display: 'flex', 
    gap: 2, 
    flexDirection: { xs: 'column', sm: 'row' },
    width: { xs: '100%', sm: 'auto' }
  }}>
    <Button
      variant="contained"
      startIcon={<PersonAdd />}
      component={RouterLink}
      to="/coach/players/create"
      color="primary"
      fullWidth={isMobile}
      sx={{ 
        minHeight: 48,
        fontSize: { xs: '0.875rem', sm: '1rem' }
      }}
    >
      Spieler hinzufügen
    </Button>
    
    <Button
      variant="outlined"
      startIcon={<LinkIcon />}
      onClick={() => setInviteDialogOpen(true)}
      color="primary"
      fullWidth={isMobile}
      sx={{ 
        minHeight: 48,
        fontSize: { xs: '0.875rem', sm: '1rem' }
      }}
    >
      Per Link einladen
    </Button>
  </Box>
</Box>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label={`Alle Spieler (${allPlayers.length})`} />
          <Tab label={`Jugendspieler (${youthPlayers.length})`} />
        </Tabs>
        
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Spieler suchen..."
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
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Team filtern</InputLabel>
                  <Select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    label="Team filtern"
                  >
                    <MenuItem value="">Alle Teams</MenuItem>
                    <MenuItem value="no-team">Ohne Team</MenuItem>
                    <Divider />
                    {teams.map(team => (
                      <MenuItem key={team._id} value={team._id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {tabValue === 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Rolle filtern</InputLabel>
                    <Select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      label="Rolle filtern"
                    >
                      <MenuItem value="">Alle Rollen</MenuItem>
                      <MenuItem value="Spieler">Spieler</MenuItem>
                      <MenuItem value="Jugendspieler">Jugendspieler</MenuItem>
                      <MenuItem value="Trainer">Trainer</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {filteredPlayers.length > 0 ? (
          <Grid container spacing={3}>
            {filteredPlayers.map(player => (
              <Grid item xs={12} sm={6} md={4} key={player._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main', mr: 2 }}>
                        <Person />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {player.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {player.email}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={player.role} 
                        color={player.role === 'Jugendspieler' ? 'secondary' : 'primary'} 
                        size="small"
                        icon={<SportsVolleyball />}
                        sx={{ mb: 1 }}
                      />
                      
                      {player.position && (
                        <Typography variant="body2" color="text.secondary">
                          Position: {player.position}
                        </Typography>
                      )}
                      
                      {player.phoneNumber && (
                        <Typography variant="body2" color="text.secondary">
                          Tel: {player.phoneNumber}
                        </Typography>
                      )}
                    </Box>
                    
                    <Divider sx={{ mb: 1 }} />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Teams: {player.teams.length === 0 ? 'Keine Teams' : ''}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {player.teams.map(team => (
                        <Chip
                          key={team.id}
                          label={team.name}
                          size="small"
                          color={team.type === 'Youth' ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between' }}>
                      <Button
                        size="small"
                        component={RouterLink}
                        to={`/coach/players/${player._id}`}
                      >
                        Details
                      </Button>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlayer(player);
                        }}
                        title="Bearbeiten"
                      >
                        <Edit />
                      </IconButton>
                    
                    {teamIdParam && !player.teams.some(team => team.id === teamIdParam) && (
                      <Button 
                        size="small" 
                        color="primary"
                        onClick={() => handleAddToTeam(player._id, teamIdParam)}
                      >
                        Zum Team hinzufügen
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Keine Spieler gefunden.
            </Typography>
            {filterTeam === 'no-team' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Es gibt keine Spieler ohne Team.
              </Typography>
            )}
          </Box>
        )}
      </Paper>
      <InviteLinkDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        teams={teams} // Pass all teams so coach can select which team
      />
      <EditPlayerDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        player={selectedPlayer}
        onSuccess={handleEditSuccess}
      />
    </Box>
  );
};

export default Players;

import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
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
  Tabs
} from '@mui/material';
import {
  Person,
  Search,
  Clear,
  Email,
  Phone,
  SportsTennis,
  FilterList
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

// Helper function to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Players = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const teamIdParam = query.get('teamId');
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, addPlayerToTeam, loading } = useContext(TeamContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState(teamIdParam || '');
  const [filterRole, setFilterRole] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [youthPlayers, setYouthPlayers] = useState([]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Extract all players from teams
  useEffect(() => {
    if (teams.length > 0) {
      // Get all unique players
      const playersMap = new Map();
      
      teams.forEach(team => {
        team.players.forEach(player => {
          if (!playersMap.has(player._id)) {
            playersMap.set(player._id, {
              ...player,
              teams: [{ id: team._id, name: team.name, type: team.type }]
            });
          } else {
            const existingPlayer = playersMap.get(player._id);
            existingPlayer.teams.push({ id: team._id, name: team.name, type: team.type });
          }
        });
      });
      
      const players = Array.from(playersMap.values());
      
      // Set all players
      setAllPlayers(players);
      
      // Set youth players
      const youth = players.filter(player => player.role === 'Jugendspieler');
      setYouthPlayers(youth);
    }
  }, [teams]);

  // Filter players based on search term, team, and role
  useEffect(() => {
    let filtered = tabValue === 0 ? allPlayers : youthPlayers;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(term) ||
        player.email?.toLowerCase().includes(term) ||
        player.position?.toLowerCase().includes(term)
      );
    }
    
    // Filter by team
    if (filterTeam) {
      filtered = filtered.filter(player => 
        player.teams.some(team => team.id === filterTeam)
      );
    }
    
    // Filter by role
    if (filterRole) {
      filtered = filtered.filter(player => player.role === filterRole);
    }
    
    setFilteredPlayers(filtered);
  }, [allPlayers, youthPlayers, searchTerm, filterTeam, filterRole, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTeam('');
    setFilterRole('');
  };

  const handleAddToTeam = async (playerId, teamId) => {
    try {
      await addPlayerToTeam(teamId, playerId);
      // Refresh teams data
      await fetchTeams();
    } catch (error) {
      console.error('Error adding player to team:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Spieler
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Alle Spieler" />
          <Tab label="Jugendspieler" />
        </Tabs>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
          />
          <IconButton 
            color={showFilters ? 'primary' : 'default'} 
            onClick={() => setShowFilters(!showFilters)}
            sx={{ ml: 1 }}
          >
            <FilterList />
          </IconButton>
        </Box>
        
        {showFilters && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="team-filter-label">Team</InputLabel>
              <Select
                labelId="team-filter-label"
                id="team-filter"
                value={filterTeam}
                label="Team"
                onChange={(e) => setFilterTeam(e.target.value)}
              >
                <MenuItem value="">Alle Teams</MenuItem>
                {teams.map(team => (
                  <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="role-filter-label">Rolle</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={filterRole}
                label="Rolle"
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <MenuItem value="">Alle Rollen</MenuItem>
                <MenuItem value="Spieler">Spieler</MenuItem>
                <MenuItem value="Jugendspieler">Jugendspieler</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              startIcon={<Clear />} 
              onClick={clearFilters}
              size="small"
            >
              Filter zurücksetzen
            </Button>
          </Box>
        )}
        
        {filteredPlayers.length > 0 ? (
          <Grid container spacing={3}>
            {filteredPlayers.map(player => (
              <Grid item xs={12} sm={6} md={4} key={player._id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: player.role === 'Jugendspieler' ? 'secondary.main' : 'primary.main',
                          mr: 1
                        }}
                      >
                        <Person />
                      </Avatar>
                      <Typography variant="h6" component="div">
                        {player.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={player.role} 
                        color={player.role === 'Jugendspieler' ? 'secondary' : 'primary'} 
                        size="small"
                      />
                      
                      {player.position && (
                        <Chip 
                          label={player.position} 
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                    
                    {player.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {player.email}
                        </Typography>
                      </Box>
                    )}
                    
                    {player.phoneNumber && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Phone sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {player.phoneNumber}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Teams:
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
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      component={RouterLink} 
                      to={`/coach/players/${player._id}`}
                    >
                      Details
                    </Button>
                    
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
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Players;
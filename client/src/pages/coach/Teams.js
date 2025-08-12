import React, { useContext, useEffect, useState } from 'react';

import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';

import {
  Group,
  Person,
  Search,
  Add,
  SportsVolleyball,
  Clear,
  Pool
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
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const Teams = () => {
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, loading } = useContext(TeamContext);
  
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [coachTeams, setCoachTeams] = useState([]);
  const [otherTeams, setOtherTeams] = useState([]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Filter and categorize teams
  useEffect(() => {
    if (teams.length > 0 && user) {
      // Teams where user is a coach
      const userCoachTeams = teams.filter(team => 
        team.coaches.some(c => c._id === user._id)
      );
      
      // Other teams
      const userOtherTeams = teams.filter(team => 
        !team.coaches.some(c => c._id === user._id)
      );
      
      setCoachTeams(userCoachTeams);
      setOtherTeams(userOtherTeams);
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = teams.filter(team => 
          team.name.toLowerCase().includes(term) ||
          team.description?.toLowerCase().includes(term)
        );
        setFilteredTeams(filtered);
      } else {
        setFilteredTeams(teams);
      }
    }
  }, [teams, user, searchTerm]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teams
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Pool />}
            component={RouterLink}
            to="/coach/pools"
          >
            Training Pools
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            component={RouterLink}
            to="/coach/teams/create"
          >
            Neues Team
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Teams durchsuchen..."
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
        </Box>
        
        {searchTerm ? (
          // Search results
          <>
            <Typography variant="h6" component="h2" gutterBottom>
              Suchergebnisse
            </Typography>
            
            {filteredTeams.length > 0 ? (
              <Grid container spacing={3}>
                {filteredTeams.map(team => (
                  <Grid item xs={12} sm={6} md={4} key={team._id}>
                    <TeamCard team={team} isCoach={team.coaches.some(c => c._id === user._id)} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Keine Teams gefunden.
              </Typography>
            )}
          </>
        ) : (
          // Normal view (My Teams and Other Teams)
          <>
            <Typography variant="h6" component="h2" gutterBottom>
              Meine Teams
            </Typography>
            
            {coachTeams.length > 0 ? (
              <Grid container spacing={3}>
                {coachTeams.map(team => (
                  <Grid item xs={12} sm={6} md={4} key={team._id}>
                    <TeamCard team={team} isCoach={true} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Sie sind noch keinem Team als Trainer zugeordnet.
              </Typography>
            )}
            
            {otherTeams.length > 0 && (
              <>
                <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4 }}>
                  Andere Teams
                </Typography>
                
                <Grid container spacing={3}>
                  {otherTeams.map(team => (
                    <Grid item xs={12} sm={6} md={4} key={team._id}>
                      <TeamCard team={team} isCoach={false} />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </>
        )}
      </Paper>
      
    </Box>
  );
};

// Team Card Component
const TeamCard = ({ team, isCoach }) => {
  return (
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
              bgcolor: team.type === 'Youth' ? 'secondary.main' : 'primary.main',
              mr: 1
            }}
          >
            <Group />
          </Avatar>
          <Typography variant="h6" component="div">
            {team.name}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
            color={team.type === 'Youth' ? 'secondary' : 'primary'} 
            size="small"
          />
          
          {isCoach && (
            <Chip 
              label="Trainer" 
              color="success" 
              size="small"
              icon={<SportsVolleyball />}
            />
          )}
        </Box>
        
        {team.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {team.description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Person sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {team.players.length} Spieler
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SportsVolleyball sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {team.coaches.length} Trainer
          </Typography>
        </Box>
      </CardContent>
      
      <Divider />
      
      <CardActions>
        <Button 
          size="small" 
          component={RouterLink} 
          to={`/coach/teams/${team._id}`}
        >
          Details anzeigen
        </Button>
        
        {isCoach && (
          <Button 
            size="small" 
            component={RouterLink} 
            to={`/coach/teams/edit/${team._id}`}
            color="primary"
          >
            Bearbeiten
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// PropTypes for TeamCard component
TeamCard.propTypes = {
  team: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    description: PropTypes.string,
    players: PropTypes.arrayOf(PropTypes.shape({
      _id: PropTypes.string.isRequired
    })).isRequired,
    coaches: PropTypes.arrayOf(PropTypes.shape({
      _id: PropTypes.string.isRequired
    })).isRequired
  }).isRequired,
  isCoach: PropTypes.bool.isRequired
};

export default Teams;

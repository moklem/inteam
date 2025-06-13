import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  InputAdornment
} from '@mui/material';
import {
  Group,
  Person,
  Search,
  SportsTennis
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const Teams = () => {
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, loading } = useContext(TeamContext);
  
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Filter teams based on search term
  useEffect(() => {
    if (teams.length > 0) {
      let filtered = [...teams];
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(team => 
          team.name.toLowerCase().includes(term) ||
          team.description?.toLowerCase().includes(term)
        );
      }
      
      // Sort by team name
      filtered.sort((a, b) => {
        // Sort youth teams first
        if (a.type !== b.type) {
          return a.type === 'Youth' ? -1 : 1;
        }
        // Then sort by name
        return a.name.localeCompare(b.name);
      });
      
      setFilteredTeams(filtered);
    }
  }, [teams, searchTerm]);

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
        Teams
      </Typography>
      
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
              )
            }}
          />
        </Box>
        
        {filteredTeams.length > 0 ? (
          <Grid container spacing={3}>
            {filteredTeams.map(team => (
              <Grid item xs={12} sm={6} md={4} key={team._id}>
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
                    
                    <Chip 
                      label={team.type === 'Youth' ? 'Jugendteam' : 'Erwachsenenteam'} 
                      color={team.type === 'Youth' ? 'secondary' : 'primary'} 
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
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
                    
                    {team.coaches.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SportsTennis sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {team.coaches.length} Trainer
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      component={RouterLink} 
                      to={`/player/teams/${team._id}`}
                    >
                      Details anzeigen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Keine Teams gefunden.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Teams;
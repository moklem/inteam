import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Person,
  ArrowBack,
  Email,
  Phone,
  CalendarToday,
  SportsTennis,
  Group,
  Assessment,
  Save
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
  Button,
  TextField,
  Rating,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';
import { AttributeContext } from '../../context/AttributeContext';

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  const { 
    fetchPlayerAttributes, 
    createAttribute, 
    updateAttribute, 
    loading: attributesLoading 
  } = useContext(AttributeContext);
  
  const [player, setPlayer] = useState(null);
  const [playerTeams, setPlayerTeams] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newAttribute, setNewAttribute] = useState({
    attributeName: '',
    category: 'Technical',
    numericValue: 5,
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load teams
        const teamsData = await fetchTeams();
        
        // Find player in teams
        let foundPlayer = null;
        const playerTeams = [];
        
        teamsData.forEach(team => {
          const playerInTeam = team.players.find(p => p._id === id);
          if (playerInTeam) {
            if (!foundPlayer) {
              foundPlayer = playerInTeam;
            }
            playerTeams.push(team);
          }
        });
        
        if (foundPlayer) {
          setPlayer(foundPlayer);
          setPlayerTeams(playerTeams);
          
          // Set default selected team if player is in any team
          if (playerTeams.length > 0) {
            setSelectedTeam(playerTeams[0]._id);
          }
          
          // Load player attributes for the first team
          if (playerTeams.length > 0) {
            const attributes = await fetchPlayerAttributes(id, playerTeams[0]._id);
            setAttributes(attributes || []);
          }
        } else {
          setError('Spieler nicht gefunden');
        }
      } catch (err) {
        console.error('Error loading player data:', err);
        setError('Fehler beim Laden der Spielerdaten');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, fetchTeams, fetchPlayerAttributes]);

  // Load attributes when selected team changes
  useEffect(() => {
    const loadAttributes = async () => {
      if (selectedTeam && player) {
        try {
          const attributes = await fetchPlayerAttributes(id, selectedTeam);
          setAttributes(attributes || []);
        } catch (err) {
          console.error('Error loading attributes:', err);
        }
      }
    };
    
    loadAttributes();
  }, [selectedTeam, player, id, fetchPlayerAttributes]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAttributeChange = (e) => {
    const { name, value } = e.target;
    setNewAttribute(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (newValue) => {
    setNewAttribute(prev => ({
      ...prev,
      numericValue: newValue
    }));
  };

  const handleCreateAttribute = async () => {
    if (!selectedTeam || !newAttribute.attributeName) return;
    
    try {
      await createAttribute({
        player: id,
        attributeName: newAttribute.attributeName,
        category: newAttribute.category,
        numericValue: newAttribute.numericValue,
        notes: newAttribute.notes,
        team: selectedTeam
      });
      
      // Refresh attributes
      const attributes = await fetchPlayerAttributes(id, selectedTeam);
      setAttributes(attributes || []);
      
      // Reset form
      setNewAttribute({
        attributeName: '',
        category: 'Technical',
        numericValue: 5,
        notes: ''
      });
    } catch (err) {
      console.error('Error creating attribute:', err);
    }
  };

  const handleUpdateAttribute = async (attributeId, newValue, notes) => {
    try {
      await updateAttribute(attributeId, {
        numericValue: newValue,
        notes
      });
      
      // Refresh attributes
      const attributes = await fetchPlayerAttributes(id, selectedTeam);
      setAttributes(attributes || []);
    } catch (err) {
      console.error('Error updating attribute:', err);
    }
  };

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

  if (loading || teamsLoading || attributesLoading) {
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
            icon={<SportsTennis />}
          />
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="player tabs">
            <Tab label="Attribute" id="tab-0" />
            <Tab label="Neues Attribut" id="tab-1" />
          </Tabs>
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" sx={{ py: 3 }}>
          {playerTeams.length > 0 ? (
            <>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="team-select-label">Team auswählen</InputLabel>
                <Select
                  labelId="team-select-label"
                  value={selectedTeam}
                  label="Team auswählen"
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  {playerTeams.map(team => (
                    <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {attributes.length > 0 ? (
                <Grid container spacing={3}>
                  {attributes.map(attribute => (
                    <Grid item xs={12} sm={6} key={attribute._id}>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1">
                            {attribute.attributeName}
                          </Typography>
                          <Chip 
                            label={attribute.category} 
                            size="small" 
                            color={
                              attribute.category === 'Technical' ? 'primary' :
                              attribute.category === 'Tactical' ? 'secondary' :
                              attribute.category === 'Physical' ? 'success' :
                              attribute.category === 'Mental' ? 'info' : 'default'
                            }
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            Bewertung:
                          </Typography>
                          <Rating
                            value={attribute.numericValue}
                            onChange={(event, newValue) => {
                              handleUpdateAttribute(attribute._id, newValue, attribute.notes);
                            }}
                            precision={1}
                          />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            ({attribute.numericValue}/10)
                          </Typography>
                        </Box>
                        
                        <TextField
                          fullWidth
                          label="Notizen"
                          multiline
                          rows={2}
                          value={attribute.notes || ''}
                          onChange={(e) => {
                            const updatedNotes = e.target.value;
                            // Debounce this in a real application
                            handleUpdateAttribute(attribute._id, attribute.numericValue, updatedNotes);
                          }}
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Zuletzt aktualisiert: {formatDate(attribute.updatedAt)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Keine Attribute für dieses Team vorhanden. Erstellen Sie ein neues Attribut im Tab &quot;Neues Attribut&quot;.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Der Spieler muss einem Team zugeordnet sein, um Attribute zu verwalten.
            </Alert>
          )}
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" sx={{ py: 3 }}>
          {playerTeams.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="team-select-label">Team auswählen</InputLabel>
                  <Select
                    labelId="team-select-label"
                    value={selectedTeam}
                    label="Team auswählen"
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    {playerTeams.map(team => (
                      <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Attributname"
                  name="attributeName"
                  value={newAttribute.attributeName}
                  onChange={handleAttributeChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="category-select-label">Kategorie</InputLabel>
                  <Select
                    labelId="category-select-label"
                    name="category"
                    value={newAttribute.category}
                    label="Kategorie"
                    onChange={handleAttributeChange}
                  >
                    <MenuItem value="Technical">Technisch</MenuItem>
                    <MenuItem value="Tactical">Taktisch</MenuItem>
                    <MenuItem value="Physical">Physisch</MenuItem>
                    <MenuItem value="Mental">Mental</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    Bewertung:
                  </Typography>
                  <Rating
                    value={newAttribute.numericValue}
                    onChange={(event, newValue) => handleRatingChange(newValue)}
                    precision={1}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    ({newAttribute.numericValue}/10)
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notizen"
                  multiline
                  rows={3}
                  name="notes"
                  value={newAttribute.notes}
                  onChange={handleAttributeChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Save />}
                  onClick={handleCreateAttribute}
                  disabled={!selectedTeam || !newAttribute.attributeName}
                >
                  Attribut speichern
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Der Spieler muss einem Team zugeordnet sein, um ein Attribut zu erstellen.
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

PlayerDetail.propTypes = {
  // No props for this component, but keeping the prop types structure for consistency
};

export default PlayerDetail;
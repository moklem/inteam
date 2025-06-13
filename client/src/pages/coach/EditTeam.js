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
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Group,
  Description
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';

const EditTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useContext(AuthContext);
  const { fetchTeam, updateTeam, loading, error, setError } = useContext(TeamContext);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('Adult');
  const [description, setDescription] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  // Load team data on component mount
  useEffect(() => {
    const loadTeam = async () => {
      try {
        setInitialLoading(true);
        
        const teamData = await fetchTeam(id);
        
        // Set form values
        setName(teamData.name);
        setType(teamData.type);
        setDescription(teamData.description || '');
        
        // Check if user is a coach of this team
        if (teamData && user) {
          const userIsCoach = teamData.coaches.some(coach => coach._id === user._id);
          setIsCoach(userIsCoach);
          
          // If not a coach, redirect to team detail
          if (!userIsCoach) {
            navigate(`/coach/teams/${id}`);
          }
        }
      } catch (error) {
        console.error('Error loading team:', error);
        setSubmitError('Fehler beim Laden des Teams');
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadTeam();
  }, [id, fetchTeam, user, navigate]);

  const validateForm = () => {
    const errors = {};
    
    if (!name.trim()) errors.name = 'Name ist erforderlich';
    if (!type) errors.type = 'Typ ist erforderlich';
    
    // Check if name is one of the allowed values
    const allowedNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'U20', 'U18', 'U16'];
    if (name.trim() && !allowedNames.includes(name.trim())) {
      errors.name = 'Name muss einer der folgenden sein: ' + allowedNames.join(', ');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitError('');
    setError(null);
    
    try {
      const teamData = {
        name,
        type,
        description
      };
      
      const updatedTeam = await updateTeam(id, teamData);
      navigate(`/coach/teams/${updatedTeam._id}`);
    } catch (err) {
      setSubmitError(err.message || 'Fehler beim Aktualisieren des Teams');
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate(`/coach/teams/${id}`)} 
          sx={{ mr: 1 }}
          aria-label="Zurück"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Team bearbeiten
        </Typography>
      </Box>
      
      {(submitError || error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError || error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Group sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Teamdetails
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name || "Erlaubte Namen: H1, H2, H3, H4, H5, U20, U18, U16"}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!formErrors.type}>
                <InputLabel id="type-label">Typ</InputLabel>
                <Select
                  labelId="type-label"
                  value={type}
                  label="Typ"
                  onChange={(e) => setType(e.target.value)}
                >
                  <MenuItem value="Adult">Erwachsenenteam</MenuItem>
                  <MenuItem value="Youth">Jugendteam</MenuItem>
                </Select>
                {formErrors.type && <FormHelperText>{formErrors.type}</FormHelperText>}
              </FormControl>
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
              <Divider sx={{ my: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                Um Spieler zu verwalten, gehen Sie zurück zur Teamdetailseite.
              </Alert>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/coach/teams/${id}`)}
                sx={{ mr: 2 }}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Änderungen speichern'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default EditTeam;
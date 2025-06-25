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
  const { fetchTeam, updateTeam, error, setError } = useContext(TeamContext);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('Adult');
  const [description, setDescription] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        console.log('Starting to load team with ID:', id);
        setLoading(true);
        
        // Ensure we have a user before proceeding
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        // Fetch team data
        const teamData = await fetchTeam(id);
        console.log('Team data received:', teamData);
        
        if (!teamData) {
          console.log('No team data found');
          setSubmitError('Team nicht gefunden');
          setTimeout(() => navigate('/coach/teams'), 2000);
          return;
        }
        
        // Set form values
        setName(teamData.name || '');
        setType(teamData.type || 'Adult');
        setDescription(teamData.description || '');
        
        // Check if user is a coach of this team
        const userIsCoach = teamData.coaches?.some(coach => coach._id === user._id) || false;
        console.log('User is coach:', userIsCoach);
        setIsCoach(userIsCoach);
        
        // If not a coach, redirect after a brief delay
        if (!userIsCoach) {
          console.log('User is not a coach, will redirect');
          setSubmitError('Sie sind kein Trainer dieses Teams');
          setTimeout(() => {
            navigate(`/coach/teams/${id}`);
          }, 2000);
        }
        
      } catch (error) {
        console.error('Error loading team:', error);
        setSubmitError(error.message || 'Fehler beim Laden des Teams');
        setTimeout(() => navigate('/coach/teams'), 2000);
      } finally {
        setLoading(false);
      }
    };
    
    if (id && user) {
      loadTeam();
    } else if (!user) {
      setLoading(false);
    }
  }, [id, user]);

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
    setIsSubmitting(true);
    
    try {
      const teamData = {
        name,
        type,
        description
      };
      
      console.log('Updating team with data:', teamData);
      const updatedTeam = await updateTeam(id, teamData);
      console.log('Team updated successfully:', updatedTeam);
      
      navigate(`/coach/teams/${updatedTeam._id}`);
    } catch (err) {
      console.error('Error updating team:', err);
      setSubmitError(err.message || 'Fehler beim Aktualisieren des Teams');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isCoach) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          Sie sind kein Trainer dieses Teams
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
        <Box component="form" onSubmit={handleSubmit} noValidate>
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
                id="team-name"
                name="name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name || "Erlaubte Namen: H1, H2, H3, H4, H5, U20, U18, U16"}
                required
                autoComplete="off"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!formErrors.type}>
                <InputLabel id="type-label">Typ</InputLabel>
                <Select
                  labelId="type-label"
                  id="team-type"
                  name="type"
                  value={type}
                  label="Typ"
                  onChange={(e) => setType(e.target.value)}
                  autoComplete="off"
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
                  id="team-description"
                  name="description"
                  label="Beschreibung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={3}
                  autoComplete="off"
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
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Änderungen speichern'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default EditTeam;
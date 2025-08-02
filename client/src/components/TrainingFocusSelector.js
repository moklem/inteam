import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Sports,
  Psychology,
  FitnessCenter,
  Group,
  Save,
  Refresh,
  Info,
  KeyboardArrowUp,
  KeyboardArrowDown
} from '@mui/icons-material';
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AuthContext } from '../context/AuthContext';
import { TrainingPreferencesContext } from '../context/TrainingPreferencesContext';

// Training areas with German labels and icons
const TRAINING_AREAS = {
  technik: {
    name: 'Technik',
    icon: Sports,
    color: 'primary',
    subareas: [
      'Aufschlag',
      'Annahme', 
      'Angriff',
      'Block',
      'Abwehr'
    ]
  },
  taktik: {
    name: 'Taktik',
    icon: Psychology,
    color: 'secondary',
    subareas: [
      'Spielsysteme',
      'Positionen',
      'Kommunikation'
    ]
  },
  kondition: {
    name: 'Kondition',
    icon: FitnessCenter,
    color: 'success',
    subareas: [
      'Ausdauer',
      'Schnelligkeit',
      'Sprungkraft'
    ]
  },
  mental: {
    name: 'Mental',
    icon: Group,
    color: 'warning',
    subareas: [
      'Konzentration',
      'Teamgeist',
      'Motivation'
    ]
  }
};

const TrainingFocusSelector = ({ onSave }) => {
  const { user } = useContext(AuthContext);
  const { focusAreas, loading, error, updateFocusAreas } = useContext(TrainingPreferencesContext);
  
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Initialize selected areas from context
  useEffect(() => {
    if (focusAreas && focusAreas.length > 0) {
      setSelectedAreas(focusAreas);
    }
  }, [focusAreas]);

  const handleAreaClick = (areaKey) => {
    const area = TRAINING_AREAS[areaKey];
    const isSelected = selectedAreas.some(selected => selected.area === areaKey);
    
    if (isSelected) {
      // Remove area
      setSelectedAreas(prev => prev.filter(selected => selected.area !== areaKey));
    } else {
      // Add area (max 3)
      if (selectedAreas.length < 3) {
        const newArea = {
          area: areaKey,
          priority: selectedAreas.length + 1,
          icon: area.name,
          color: area.color
        };
        setSelectedAreas(prev => [...prev, newArea]);
      } else {
        setSnackbar({
          open: true,
          message: 'Du kannst maximal 3 Trainingsschwerpunkte auswählen.',
          severity: 'warning'
        });
      }
    }
  };

  const handleReorder = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedAreas.length) return;

    const items = Array.from(selectedAreas);
    const [movedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, movedItem);

    // Update priorities based on new order
    const updatedItems = items.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));

    setSelectedAreas(updatedItems);
  };

  const handleSave = async () => {
    if (selectedAreas.length === 0) {
      setSnackbar({
        open: true,
        message: 'Bitte wähle mindestens einen Trainingsschwerpunkt aus.',
        severity: 'warning'
      });
      return;
    }

    setSaving(true);
    try {
      await updateFocusAreas(selectedAreas);
      setSnackbar({
        open: true,
        message: 'Trainingsschwerpunkte erfolgreich gespeichert!',
        severity: 'success'
      });
      
      if (onSave) {
        onSave(selectedAreas);
      }
    } catch (err) {
      console.error('Error saving focus areas:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Trainingsschwerpunkte.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedAreas([]);
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          Trainingsschwerpunkte
        </Typography>
        <IconButton onClick={() => setInfoDialogOpen(true)} color="primary">
          <Info />
        </IconButton>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wähle bis zu 3 Bereiche aus, auf die du dich im Training konzentrieren möchtest. 
        Du kannst die Reihenfolge mit den Pfeil-Buttons anpassen.
      </Typography>

      {/* Training Areas Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(TRAINING_AREAS).map(([key, area]) => {
          const isSelected = selectedAreas.some(selected => selected.area === key);
          const IconComponent = area.icon;
          
          return (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? `${area.color}.main` : 'divider',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleAreaClick(key)}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <IconComponent 
                    sx={{ 
                      fontSize: 48, 
                      color: isSelected ? `${area.color}.main` : 'text.secondary',
                      mb: 1 
                    }} 
                  />
                  <Typography variant="h6" component="div" gutterBottom>
                    {area.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {area.subareas.slice(0, 3).map((subarea) => (
                      <Chip 
                        key={subarea}
                        label={subarea} 
                        size="small" 
                        variant="outlined"
                        color={isSelected ? area.color : 'default'}
                      />
                    ))}
                  </Box>
                  {isSelected && (
                    <Chip 
                      label={`Priorität ${selectedAreas.find(s => s.area === key)?.priority}`}
                      color={area.color}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Selected Areas with Reorder Buttons */}
      {selectedAreas.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Deine Trainingsschwerpunkte (Reihenfolge anpassen)
          </Typography>
          
          <List>
            {selectedAreas.map((area, index) => {
              const areaConfig = TRAINING_AREAS[area.area];
              const IconComponent = areaConfig.icon;
              
              return (
                <ListItem
                  key={area.area}
                  sx={{
                    mb: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 1
                  }}
                >
                  <ListItemIcon>
                    <IconComponent color={areaConfig.color} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {area.priority}. {areaConfig.name}
                        </Typography>
                        <Chip 
                          label={`Priorität ${area.priority}`}
                          color={areaConfig.color}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={areaConfig.subareas.join(', ')}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      disabled={index === 0}
                      onClick={() => handleReorder(index, 'up')}
                      size="small"
                    >
                      <KeyboardArrowUp />
                    </IconButton>
                    <IconButton
                      edge="end"
                      disabled={index === selectedAreas.length - 1}
                      onClick={() => handleReorder(index, 'down')}
                      size="small"
                    >
                      <KeyboardArrowDown />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          startIcon={<Refresh />}
          disabled={selectedAreas.length === 0 || saving}
        >
          Zurücksetzen
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          disabled={selectedAreas.length === 0 || saving}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="md">
        <DialogTitle>Trainingsschwerpunkte - Informationen</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Mit den Trainingsschwerpunkten kannst du deine persönlichen Entwicklungsziele festlegen:
          </Typography>
          
          {Object.entries(TRAINING_AREAS).map(([key, area]) => {
            const IconComponent = area.icon;
            return (
              <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <IconComponent sx={{ mr: 2, mt: 0.5, color: `${area.color}.main` }} />
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {area.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {area.subareas.join(', ')}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Du kannst bis zu 3 Schwerpunkte auswählen und deren Priorität mit den Pfeil-Buttons ändern.
            Deine Auswahl wird automatisch gespeichert und kann jederzeit angepasst werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

TrainingFocusSelector.propTypes = {
  onSave: PropTypes.func
};

export default TrainingFocusSelector;
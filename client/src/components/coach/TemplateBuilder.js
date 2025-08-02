import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

const CATEGORIES = [
  'Anfänger',
  'Fortgeschritten', 
  'Wettkampf',
  'Position-spezifisch',
  'Saisonvorbereitung',
  'Kondition',
  'Technik',
  'Taktik'
];

const TARGET_LEVELS = ['Anfänger', 'Fortgeschritten', 'Profi'];
const FOCUS_AREAS = ['Technik', 'Taktik', 'Kondition', 'Mental'];
const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privat' },
  { value: 'team', label: 'Team' },
  { value: 'public', label: 'Öffentlich' }
];

const DURATION_UNITS = ['Tage', 'Wochen', 'Monate'];

const TemplateBuilder = ({ open, onClose, template = null, teams = [], onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    visibility: 'team',
    teamId: '',
    duration: { value: 4, unit: 'Wochen' },
    phases: [],
    customizableParams: [],
    tags: [],
    targetLevel: 'Fortgeschritten'
  });

  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || '',
        visibility: template.visibility || 'team',
        teamId: template.teamId?._id || template.teamId || '',
        duration: template.duration || { value: 4, unit: 'Wochen' },
        phases: template.phases || [],
        customizableParams: template.customizableParams || [],
        tags: template.tags || [],
        targetLevel: template.targetLevel || 'Fortgeschritten'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        visibility: 'team',
        teamId: '',
        duration: { value: 4, unit: 'Wochen' },
        phases: [],
        customizableParams: [],
        tags: [],
        targetLevel: 'Fortgeschritten'
      });
    }
    setErrors({});
  }, [template, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDurationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      duration: { ...prev.duration, [field]: value }
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addPhase = () => {
    const newPhase = {
      name: `Phase ${formData.phases.length + 1}`,
      weeks: 2,
      focusAreas: ['Technik'],
      exercises: [],
      goals: '',
      notes: ''
    };
    
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, newPhase]
    }));
  };

  const updatePhase = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) => 
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const removePhase = (index) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index)
    }));
  };

  const addExercise = (phaseIndex) => {
    const newExercise = {
      id: `exercise_${Date.now()}`,
      name: '',
      sets: 3,
      reps: '10',
      duration: '',
      intensity: 'mittel',
      description: '',
      customizable: true
    };
    
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) => 
        i === phaseIndex 
          ? { ...phase, exercises: [...phase.exercises, newExercise] }
          : phase
      )
    }));
  };

  const updateExercise = (phaseIndex, exerciseIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) => 
        i === phaseIndex 
          ? {
              ...phase,
              exercises: phase.exercises.map((exercise, j) => 
                j === exerciseIndex 
                  ? { ...exercise, [field]: value }
                  : exercise
              )
            }
          : phase
      )
    }));
  };

  const removeExercise = (phaseIndex, exerciseIndex) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) => 
        i === phaseIndex 
          ? { ...phase, exercises: phase.exercises.filter((_, j) => j !== exerciseIndex) }
          : phase
      )
    }));
  };

  const addCustomizableParam = () => {
    const newParam = {
      param: '',
      label: '',
      defaultValue: '',
      options: [],
      type: 'text'
    };
    
    setFormData(prev => ({
      ...prev,
      customizableParams: [...prev.customizableParams, newParam]
    }));
  };

  const updateCustomizableParam = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customizableParams: prev.customizableParams.map((param, i) => 
        i === index ? { ...param, [field]: value } : param
      )
    }));
  };

  const removeCustomizableParam = (index) => {
    setFormData(prev => ({
      ...prev,
      customizableParams: prev.customizableParams.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name ist erforderlich';
    if (!formData.description.trim()) newErrors.description = 'Beschreibung ist erforderlich';
    if (!formData.category) newErrors.category = 'Kategorie ist erforderlich';
    if (!formData.targetLevel) newErrors.targetLevel = 'Zielniveau ist erforderlich';
    if (formData.phases.length === 0) newErrors.phases = 'Mindestens eine Phase ist erforderlich';
    
    // Validate phases
    formData.phases.forEach((phase, index) => {
      if (!phase.name.trim()) {
        newErrors[`phase_${index}_name`] = 'Phasenname ist erforderlich';
      }
      if (phase.weeks < 1) {
        newErrors[`phase_${index}_weeks`] = 'Mindestens 1 Woche erforderlich';
      }
      if (phase.focusAreas.length === 0) {
        newErrors[`phase_${index}_focusAreas`] = 'Mindestens ein Fokusbereich erforderlich';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    const templateData = {
      ...formData,
      teamId: formData.visibility === 'team' ? formData.teamId : undefined
    };
    
    onSave(templateData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        {template ? 'Trainingsvorlage bearbeiten' : 'Neue Trainingsvorlage erstellen'}
      </DialogTitle>
      
      <DialogContent sx={{ overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          
          {/* Basic Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Grundinformationen</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name der Vorlage"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Beschreibung"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    error={!!errors.description}
                    helperText={errors.description}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>Kategorie</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      label="Kategorie"
                      required
                    >
                      {CATEGORIES.map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.targetLevel}>
                    <InputLabel>Zielniveau</InputLabel>
                    <Select
                      value={formData.targetLevel}
                      onChange={(e) => handleInputChange('targetLevel', e.target.value)}
                      label="Zielniveau"
                      required
                    >
                      {TARGET_LEVELS.map(level => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Sichtbarkeit</InputLabel>
                    <Select
                      value={formData.visibility}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                      label="Sichtbarkeit"
                    >
                      {VISIBILITY_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {formData.visibility === 'team' && (
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Team</InputLabel>
                      <Select
                        value={formData.teamId}
                        onChange={(e) => handleInputChange('teamId', e.target.value)}
                        label="Team"
                      >
                        {teams.map(team => (
                          <MenuItem key={team._id} value={team._id}>
                            {team.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Dauer"
                    value={formData.duration.value}
                    onChange={(e) => handleDurationChange('value', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Einheit</InputLabel>
                    <Select
                      value={formData.duration.unit}
                      onChange={(e) => handleDurationChange('unit', e.target.value)}
                      label="Einheit"
                    >
                      {DURATION_UNITS.map(unit => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {/* Tags */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Tag hinzufügen"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} variant="outlined" size="small">
                    Hinzufügen
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Training Phases */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Trainingsphasen</Typography>
                <Button onClick={addPhase} startIcon={<AddIcon />} variant="outlined">
                  Phase hinzufügen
                </Button>
              </Box>
              
              {errors.phases && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.phases}
                </Alert>
              )}
              
              {formData.phases.map((phase, phaseIndex) => (
                <Accordion key={phaseIndex} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DragIcon />
                      <Typography>{phase.name || `Phase ${phaseIndex + 1}`}</Typography>
                      <Chip label={`${phase.weeks} Woche${phase.weeks !== 1 ? 'n' : ''}`} size="small" />
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phasenname"
                          value={phase.name}
                          onChange={(e) => updatePhase(phaseIndex, 'name', e.target.value)}
                          error={!!errors[`phase_${phaseIndex}_name`]}
                          helperText={errors[`phase_${phaseIndex}_name`]}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Wochen"
                          value={phase.weeks}
                          onChange={(e) => updatePhase(phaseIndex, 'weeks', parseInt(e.target.value))}
                          inputProps={{ min: 1 }}
                          error={!!errors[`phase_${phaseIndex}_weeks`]}
                          helperText={errors[`phase_${phaseIndex}_weeks`]}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors[`phase_${phaseIndex}_focusAreas`]}>
                          <InputLabel>Fokusbereiche</InputLabel>
                          <Select
                            multiple
                            value={phase.focusAreas}
                            onChange={(e) => updatePhase(phaseIndex, 'focusAreas', e.target.value)}
                            label="Fokusbereiche"
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                  <Chip key={value} label={value} size="small" />
                                ))}
                              </Box>
                            )}
                          >
                            {FOCUS_AREAS.map(area => (
                              <MenuItem key={area} value={area}>
                                {area}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Ziele"
                          value={phase.goals}
                          onChange={(e) => updatePhase(phaseIndex, 'goals', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Notizen"
                          value={phase.notes}
                          onChange={(e) => updatePhase(phaseIndex, 'notes', e.target.value)}
                        />
                      </Grid>
                      
                      {/* Exercises */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Übungen</Typography>
                          <Button 
                            onClick={() => addExercise(phaseIndex)} 
                            startIcon={<AddIcon />} 
                            size="small"
                            variant="outlined"
                          >
                            Übung hinzufügen
                          </Button>
                        </Box>
                        
                        {phase.exercises.map((exercise, exerciseIndex) => (
                          <Card key={exercise.id} variant="outlined" sx={{ mb: 1 }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2">
                                  Übung {exerciseIndex + 1}
                                </Typography>
                                <IconButton 
                                  onClick={() => removeExercise(phaseIndex, exerciseIndex)}
                                  size="small"
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                              
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    label="Übungsname"
                                    value={exercise.name}
                                    onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'name', e.target.value)}
                                  />
                                </Grid>
                                
                                <Grid item xs={4}>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    label="Sätze"
                                    value={exercise.sets}
                                    onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'sets', parseInt(e.target.value))}
                                    inputProps={{ min: 1 }}
                                  />
                                </Grid>
                                
                                <Grid item xs={4}>
                                  <TextField
                                    fullWidth
                                    label="Wiederholungen"
                                    value={exercise.reps}
                                    onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'reps', e.target.value)}
                                  />
                                </Grid>
                                
                                <Grid item xs={4}>
                                  <FormControl fullWidth>
                                    <InputLabel>Intensität</InputLabel>
                                    <Select
                                      value={exercise.intensity}
                                      onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'intensity', e.target.value)}
                                      label="Intensität"
                                    >
                                      <MenuItem value="niedrig">Niedrig</MenuItem>
                                      <MenuItem value="mittel">Mittel</MenuItem>
                                      <MenuItem value="hoch">Hoch</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Grid>
                                
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Beschreibung"
                                    value={exercise.description}
                                    onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'description', e.target.value)}
                                  />
                                </Grid>
                                
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={exercise.customizable}
                                        onChange={(e) => updateExercise(phaseIndex, exerciseIndex, 'customizable', e.target.checked)}
                                      />
                                    }
                                    label="Anpassbar für Spieler"
                                  />
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Button
                      onClick={() => removePhase(phaseIndex)}
                      startIcon={<DeleteIcon />}
                      color="error"
                      variant="outlined"
                    >
                      Phase löschen
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>

          {/* Customizable Parameters */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Anpassbare Parameter</Typography>
                <Button onClick={addCustomizableParam} startIcon={<AddIcon />} variant="outlined">
                  Parameter hinzufügen
                </Button>
              </Box>
              
              {formData.customizableParams.map((param, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">Parameter {index + 1}</Typography>
                      <IconButton 
                        onClick={() => removeCustomizableParam(index)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Parameter Name"
                          value={param.param}
                          onChange={(e) => updateCustomizableParam(index, 'param', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Label"
                          value={param.label}
                          onChange={(e) => updateCustomizableParam(index, 'label', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Typ</InputLabel>
                          <Select
                            value={param.type}
                            onChange={(e) => updateCustomizableParam(index, 'type', e.target.value)}
                            label="Typ"
                          >
                            <MenuItem value="text">Text</MenuItem>
                            <MenuItem value="number">Zahl</MenuItem>
                            <MenuItem value="select">Auswahl</MenuItem>
                            <MenuItem value="boolean">Ja/Nein</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Standardwert"
                          value={param.defaultValue}
                          onChange={(e) => updateCustomizableParam(index, 'defaultValue', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave} variant="contained">
          {template ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

TemplateBuilder.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  template: PropTypes.object,
  teams: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired
};

TemplateBuilder.defaultProps = {
  template: null
};

export default TemplateBuilder;
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Rating,
  Avatar,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TemplateLibrary = ({ open, onClose, onClone }) => {
  const { user } = useContext(AuthContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [targetLevelFilter, setTargetLevelFilter] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch public and team templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['template-library', searchTerm, categoryFilter, targetLevelFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (targetLevelFilter) params.append('targetLevel', targetLevelFilter);
      params.append('limit', '20');
      
      const response = await axios.get(`${API_URL}/training-templates?${params}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      
      // Filter to show only public and team templates that user can view
      const filteredTemplates = response.data.templates.filter(
        template => template.visibility === 'public' || template.visibility === 'team'
      );
      
      // Sort templates
      filteredTemplates.sort((a, b) => {
        switch (sortBy) {
          case 'rating': {
            const aRating = a.usage?.ratingCount > 0 ? a.usage.rating / a.usage.ratingCount : 0;
            const bRating = b.usage?.ratingCount > 0 ? b.usage.rating / b.usage.ratingCount : 0;
            return bRating - aRating;
          }
          case 'usage':
            return (b.usage?.count || 0) - (a.usage?.count || 0);
          case 'newest':
            return new Date(b.createdAt) - new Date(a.createdAt);
          default:
            return 0;
        }
      });
      
      return {
        ...response.data,
        templates: filteredTemplates
      };
    },
    enabled: !!user?.token && open
  });

  // Fetch categories
  const { data: metaData } = useQuery({
    queryKey: ['training-template-meta'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/training-templates/meta/categories`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    enabled: !!user?.token && open
  });

  // Rate template mutation
  const rateMutation = useMutation({
    mutationFn: async ({ templateId, rating }) => {
      const response = await axios.post(`${API_URL}/training-templates/${templateId}/rate`, 
        { rating }, 
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      // Refetch templates to get updated ratings
      // Note: In a real app, you might want to optimistically update the cache
    }
  });

  const templates = templatesData?.templates || [];
  const categories = metaData?.categories || [];
  const targetLevels = ['Anfänger', 'Fortgeschritten', 'Profi'];

  const handleCloneTemplate = (template) => {
    onClone(template);
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleRateTemplate = (templateId, rating) => {
    rateMutation.mutate({ templateId, rating });
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public': return <PublicIcon fontSize="small" color="success" />;
      case 'team': return <GroupIcon fontSize="small" color="primary" />;
      default: return null;
    }
  };

  const formatDuration = (duration) => {
    return `${duration.value} ${duration.unit}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Trainingsvorlagen-Bibliothek</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            Fehler beim Laden der Bibliothek: {error.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Schließen</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Trainingsvorlagen-Bibliothek</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ overflow: 'auto' }}>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    placeholder="Vorlagen durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Kategorie</InputLabel>
                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      label="Kategorie"
                    >
                      <MenuItem value="">Alle</MenuItem>
                      {categories.map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Niveau</InputLabel>
                    <Select
                      value={targetLevelFilter}
                      onChange={(e) => setTargetLevelFilter(e.target.value)}
                      label="Niveau"
                    >
                      <MenuItem value="">Alle</MenuItem>
                      {targetLevels.map(level => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Sortieren</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      label="Sortieren"
                    >
                      <MenuItem value="rating">Bewertung</MenuItem>
                      <MenuItem value="usage">Beliebtheit</MenuItem>
                      <MenuItem value="newest">Neueste</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('');
                      setTargetLevelFilter('');
                      setSortBy('rating');
                    }}
                  >
                    Filter zurücksetzen
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Keine Vorlagen gefunden
                </Typography>
                <Typography color="text.secondary">
                  Versuchen Sie andere Suchkriterien oder Filter.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {templates.map((template) => (
                <Grid item xs={12} sm={6} md={4} key={template._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ flexGrow: 1, mr: 1 }}>
                          {template.name}
                        </Typography>
                        <Tooltip title={template.visibility === 'public' ? 'Öffentlich' : 'Team'}>
                          {getVisibilityIcon(template.visibility)}
                        </Tooltip>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {template.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={template.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip 
                          label={template.targetLevel} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<ScheduleIcon />}
                          label={formatDuration(template.duration)}
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      {template.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                          {template.tags.slice(0, 2).map(tag => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                          {template.tags.length > 2 && (
                            <Chip label={`+${template.tags.length - 2}`} size="small" />
                          )}
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {template.createdBy?.name?.[0]}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            {template.createdBy?.name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rating 
                            value={template.usage?.ratingCount > 0 ? template.usage.rating / template.usage.ratingCount : 0} 
                            size="small" 
                            readOnly 
                            precision={0.5}
                          />
                          <Typography variant="caption" color="text.secondary">
                            ({template.usage?.count || 0})
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Erstellt: {formatDate(template.createdAt)}
                      </Typography>
                    </CardContent>
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewTemplate(template)}
                      >
                        Details
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<CopyIcon />}
                        onClick={() => handleCloneTemplate(template)}
                        variant="contained"
                      >
                        Kopieren
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      <Dialog 
        open={!!selectedTemplate} 
        onClose={() => setSelectedTemplate(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedTemplate?.name}</Typography>
            <IconButton onClick={() => setSelectedTemplate(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedTemplate.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Kategorie
                  </Typography>
                  <Typography>{selectedTemplate.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Zielniveau
                  </Typography>
                  <Typography>{selectedTemplate.targetLevel}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Dauer
                  </Typography>
                  <Typography>{formatDuration(selectedTemplate.duration)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phasen
                  </Typography>
                  <Typography>{selectedTemplate.phases?.length || 0}</Typography>
                </Grid>
              </Grid>
              
              {selectedTemplate.phases && selectedTemplate.phases.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Trainingsphasen
                  </Typography>
                  {selectedTemplate.phases.map((phase, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1">{phase.name}</Typography>
                          <Chip 
                            label={`${phase.weeks} Woche${phase.weeks !== 1 ? 'n' : ''}`} 
                            size="small" 
                          />
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {phase.focusAreas?.map(area => (
                              <Chip key={area} label={area} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        {phase.goals && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Ziele
                            </Typography>
                            <Typography>{phase.goals}</Typography>
                          </Box>
                        )}
                        
                        {phase.exercises && phase.exercises.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                              Übungen ({phase.exercises.length})
                            </Typography>
                            <List dense>
                              {phase.exercises.map((exercise, exerciseIndex) => (
                                <ListItem key={exerciseIndex} sx={{ px: 0 }}>
                                  <ListItemText
                                    primary={exercise.name}
                                    secondary={
                                      <Box>
                                        {exercise.sets && exercise.reps && (
                                          <Typography variant="caption" display="block">
                                            {exercise.sets} Sätze × {exercise.reps} Wiederholungen
                                          </Typography>
                                        )}
                                        {exercise.description && (
                                          <Typography variant="caption" color="text.secondary">
                                            {exercise.description}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        
                        {phase.notes && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Notizen
                            </Typography>
                            <Typography>{phase.notes}</Typography>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bewertung abgeben
                  </Typography>
                  <Rating
                    onChange={(event, newValue) => {
                      if (newValue) {
                        handleRateTemplate(selectedTemplate._id, newValue);
                      }
                    }}
                    disabled={rateMutation.isPending}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">
                      {selectedTemplate.usage?.ratingCount > 0 
                        ? (selectedTemplate.usage.rating / selectedTemplate.usage.ratingCount).toFixed(1)
                        : '0.0'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Bewertung
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">
                      {selectedTemplate.usage?.count || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Verwendet
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSelectedTemplate(null)}>
            Schließen
          </Button>
          <Button 
            variant="contained"
            startIcon={<CopyIcon />}
            onClick={() => {
              handleCloneTemplate(selectedTemplate);
              setSelectedTemplate(null);
            }}
          >
            Kopieren
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

TemplateLibrary.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onClone: PropTypes.func.isRequired
};

export default TemplateLibrary;
import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  ListItemIcon,
  ListItemText,
  Alert,
  Pagination,
  Rating,
  Avatar,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Share as ShareIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import TemplateBuilder from './TemplateBuilder';
import TemplateLibrary from '../shared/TemplateLibrary';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TrainingTemplates = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuTemplate, setMenuTemplate] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });

  // Fetch templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['training-templates', page, searchTerm, categoryFilter, visibilityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (visibilityFilter) params.append('visibility', visibilityFilter);
      params.append('page', page.toString());
      params.append('limit', '12');
      
      const response = await axios.get(`${API_URL}/training-templates?${params}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    enabled: !!user?.token
  });

  // Fetch teams for template creation
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/teams`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    enabled: !!user?.token
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
    enabled: !!user?.token
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (templateData) => {
      const response = await axios.post(`${API_URL}/training-templates`, templateData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      setBuilderOpen(false);
      setSelectedTemplate(null);
    }
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`${API_URL}/training-templates/${id}`, data, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      setBuilderOpen(false);
      setSelectedTemplate(null);
    }
  });

  // Clone template mutation
  const cloneMutation = useMutation({
    mutationFn: async ({ id, name, visibility, teamId }) => {
      const response = await axios.post(`${API_URL}/training-templates/${id}/clone`, {
        name,
        visibility,
        teamId
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_URL}/training-templates/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      setDeleteDialog({ open: false, template: null });
    }
  });

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setBuilderOpen(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setBuilderOpen(true);
    handleMenuClose();
  };

  const handleCloneTemplate = (template) => {
    cloneMutation.mutate({
      id: template._id,
      name: `${template.name} (Kopie)`,
      visibility: 'private'
    });
    handleMenuClose();
  };

  const handleDeleteTemplate = (template) => {
    setDeleteDialog({ open: true, template });
    handleMenuClose();
  };

  const handleMenuOpen = (event, template) => {
    setMenuAnchor(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTemplate(null);
  };

  const handleSaveTemplate = (templateData) => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate._id, data: templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.template) {
      deleteMutation.mutate(deleteDialog.template._id);
    }
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public': return <PublicIcon fontSize="small" />;
      case 'team': return <GroupIcon fontSize="small" />;
      case 'private': return <LockIcon fontSize="small" />;
      default: return null;
    }
  };

  const getVisibilityLabel = (visibility) => {
    switch (visibility) {
      case 'public': return 'Öffentlich';
      case 'team': return 'Team';
      case 'private': return 'Privat';
      default: return visibility;
    }
  };

  const templates = templatesData?.templates || [];
  const pagination = templatesData?.pagination || {};
  const categories = metaData?.categories || [];

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Fehler beim Laden der Trainingsvorlagen: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Trainingsvorlagen
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => setLibraryOpen(true)}
          >
            Bibliothek durchsuchen
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTemplate}
          >
            Neue Vorlage
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
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
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Kategorie"
                >
                  <MenuItem value="">Alle Kategorien</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Sichtbarkeit</InputLabel>
                <Select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  label="Sichtbarkeit"
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="private">Privat</MenuItem>
                  <MenuItem value="team">Team</MenuItem>
                  <MenuItem value="public">Öffentlich</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setVisibilityFilter('');
                  setPage(1);
                }}
              >
                Zurücksetzen
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
              Keine Trainingsvorlagen gefunden
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Erstellen Sie Ihre erste Trainingsvorlage oder durchsuchen Sie die Bibliothek.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTemplate}
            >
              Erste Vorlage erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1 }}>
                        {template.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, template)}
                      >
                        <MoreVertIcon />
                      </IconButton>
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
                        icon={getVisibilityIcon(template.visibility)}
                        label={getVisibilityLabel(template.visibility)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    {template.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                        {template.tags.slice(0, 3).map(tag => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                        {template.tags.length > 3 && (
                          <Chip label={`+${template.tags.length - 3}`} size="small" />
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
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => handleEditTemplate(template)}
                      disabled={template.createdBy?._id !== user._id}
                    >
                      Bearbeiten
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => handleCloneTemplate(template)}
                    >
                      Kopieren
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.pages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => handleEditTemplate(menuTemplate)}
          disabled={menuTemplate?.createdBy?._id !== user._id}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bearbeiten</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleCloneTemplate(menuTemplate)}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Kopieren</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleDeleteTemplate(menuTemplate)}
          disabled={menuTemplate?.createdBy?._id !== user._id}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Löschen</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, template: null })}
      >
        <DialogTitle>Trainingsvorlage löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie die Trainingsvorlage "{deleteDialog.template?.name}" löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, template: null })}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Builder Dialog */}
      <TemplateBuilder
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        teams={teams}
        onSave={handleSaveTemplate}
      />

      {/* Template Library Dialog */}
      <TemplateLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onClone={(template) => {
          cloneMutation.mutate({
            id: template._id,
            name: `${template.name} (Kopie)`,
            visibility: 'private'
          });
          setLibraryOpen(false);
        }}
      />
    </Box>
  );
};

export default TrainingTemplates;
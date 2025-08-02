import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Chip,
  Divider,
  Slider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Alert,
  Snackbar,
  Paper
} from '@mui/material';
import {
  ExpandMore,
  Palette,
  ViewModule,
  Notifications,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  VisibilityOff,
  Add,
  Remove,
  RestartAlt,
  FileUpload,
  FileDownload,
  Close
} from '@mui/icons-material';
import { useThemePreferences } from '../context/ThemePreferencesContext';

const InterfaceCustomizer = ({ open, onClose }) => {
  const {
    preferences,
    predefinedThemes,
    setTheme,
    applyPredefinedTheme,
    setLayout,
    updateWidget,
    reorderWidgets,
    addShortcut,
    removeShortcut,
    setNotifications,
    resetPreferences,
    exportPreferences,
    importPreferences
  } = useThemePreferences();

  const [selectedTheme, setSelectedTheme] = useState('custom');
  const [customPrimaryColor, setCustomPrimaryColor] = useState(preferences.theme.primaryColor);
  const [customAccentColor, setCustomAccentColor] = useState(preferences.theme.accentColor);
  const [importText, setImportText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleThemeChange = (themeName) => {
    setSelectedTheme(themeName);
    if (themeName !== 'custom') {
      applyPredefinedTheme(themeName);
    }
  };

  const handleCustomColorChange = (colorType, color) => {
    if (colorType === 'primary') {
      setCustomPrimaryColor(color);
    } else {
      setCustomAccentColor(color);
    }
    
    if (selectedTheme === 'custom') {
      setTheme({
        [colorType === 'primary' ? 'primaryColor' : 'accentColor']: color
      });
    }
  };

  const handleFontSizeChange = (event, newValue) => {
    const sizes = ['small', 'medium', 'large'];
    setTheme({ fontSize: sizes[newValue] });
  };

  const handleViewModeChange = (event) => {
    setLayout({ viewMode: event.target.value });
  };

  const handleWidgetVisibilityToggle = (widgetId) => {
    const widget = preferences.layout.dashboardWidgets.find(w => w.id === widgetId);
    updateWidget(widgetId, { visible: !widget.visible });
  };

  const handleWidgetReorder = (widgetId, direction) => {
    const widgets = [...preferences.layout.dashboardWidgets];
    const currentIndex = widgets.findIndex(w => w.id === widgetId);
    
    if (direction === 'up' && currentIndex > 0) {
      [widgets[currentIndex], widgets[currentIndex - 1]] = [widgets[currentIndex - 1], widgets[currentIndex]];
      widgets.forEach((widget, index) => {
        widget.position = index;
      });
      reorderWidgets(widgets);
    } else if (direction === 'down' && currentIndex < widgets.length - 1) {
      [widgets[currentIndex], widgets[currentIndex + 1]] = [widgets[currentIndex + 1], widgets[currentIndex]];
      widgets.forEach((widget, index) => {
        widget.position = index;
      });
      reorderWidgets(widgets);
    }
  };

  const handleNotificationToggle = (notificationType) => {
    const currentTypes = preferences.notifications.types;
    const newTypes = currentTypes.includes(notificationType)
      ? currentTypes.filter(type => type !== notificationType)
      : [...currentTypes, notificationType];
    
    setNotifications({ types: newTypes });
  };

  const handleQuietHoursToggle = () => {
    setNotifications({
      quietHours: {
        ...preferences.notifications.quietHours,
        enabled: !preferences.notifications.quietHours.enabled
      }
    });
  };

  const handleQuietHoursChange = (type, value) => {
    setNotifications({
      quietHours: {
        ...preferences.notifications.quietHours,
        [type]: value
      }
    });
  };

  const handleReset = () => {
    resetPreferences();
    setSelectedTheme('custom');
    setCustomPrimaryColor('#1976d2');
    setCustomAccentColor('#f50057');
    showSnackbar('Einstellungen zurückgesetzt');
  };

  const handleExport = () => {
    const preferences = exportPreferences();
    navigator.clipboard.writeText(preferences).then(() => {
      showSnackbar('Einstellungen in Zwischenablage kopiert');
    }).catch(() => {
      // Fallback: create download link
      const blob = new Blob([preferences], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'volleyball-app-preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('Einstellungen heruntergeladen');
    });
  };

  const handleImport = () => {
    if (importPreferences(importText)) {
      setImportText('');
      showSnackbar('Einstellungen erfolgreich importiert');
    } else {
      showSnackbar('Fehler beim Importieren der Einstellungen', 'error');
    }
  };

  const widgetNames = {
    upcomingEvents: 'Anstehende Termine',
    teamOverview: 'Team-Übersicht',
    recentActivity: 'Letzte Aktivitäten',
    quickActions: 'Schnellaktionen'
  };

  const fontSizeValue = ['small', 'medium', 'large'].indexOf(preferences.theme.fontSize);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Anpassungen</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            {/* Theme Selection */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center">
                  <Palette sx={{ mr: 1 }} />
                  <Typography variant="h6">Farbschema</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {Object.entries(predefinedThemes).map(([key, theme]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Card 
                        variant={selectedTheme === key ? "outlined" : "elevation"}
                        sx={{ 
                          cursor: 'pointer',
                          border: selectedTheme === key ? 2 : 0,
                          borderColor: 'primary.main'
                        }}
                        onClick={() => handleThemeChange(key)}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                backgroundColor: theme.primaryColor,
                                mr: 1,
                                borderRadius: 1
                              }} 
                            />
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                backgroundColor: theme.accentColor,
                                mr: 1,
                                borderRadius: 1
                              }} 
                            />
                            <Typography variant="subtitle1">{theme.name}</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {theme.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                {selectedTheme === 'custom' && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Benutzerdefinierte Farben
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <TextField
                        label="Primärfarbe"
                        type="color"
                        value={customPrimaryColor}
                        onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                        size="small"
                      />
                      <TextField
                        label="Akzentfarbe"
                        type="color"
                        value={customAccentColor}
                        onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                        size="small"
                      />
                    </Box>
                  </Box>
                )}
                
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Schriftgröße
                  </Typography>
                  <Slider
                    value={fontSizeValue}
                    onChange={handleFontSizeChange}
                    step={1}
                    marks={[
                      { value: 0, label: 'Klein' },
                      { value: 1, label: 'Mittel' },
                      { value: 2, label: 'Groß' }
                    ]}
                    min={0}
                    max={2}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Layout Settings */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center">
                  <ViewModule sx={{ mr: 1 }} />
                  <Typography variant="h6">Layout</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box mb={2}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Ansichtsmodus</FormLabel>
                    <RadioGroup
                      value={preferences.layout.viewMode}
                      onChange={handleViewModeChange}
                      row
                    >
                      <FormControlLabel 
                        value="compact" 
                        control={<Radio />} 
                        label="Kompakt" 
                      />
                      <FormControlLabel 
                        value="comfortable" 
                        control={<Radio />} 
                        label="Komfortabel" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Dashboard-Widgets
                </Typography>
                <List>
                  {preferences.layout.dashboardWidgets
                    .sort((a, b) => a.position - b.position)
                    .map((widget) => (
                    <ListItem key={widget.id}>
                      <ListItemIcon>
                        <IconButton
                          size="small"
                          onClick={() => handleWidgetVisibilityToggle(widget.id)}
                        >
                          {widget.visible ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </ListItemIcon>
                      <ListItemText primary={widgetNames[widget.id] || widget.id} />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleWidgetReorder(widget.id, 'up')}
                        >
                          <ArrowUpward />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleWidgetReorder(widget.id, 'down')}
                        >
                          <ArrowDownward />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* Notification Settings */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center">
                  <Notifications sx={{ mr: 1 }} />
                  <Typography variant="h6">Benachrichtigungen</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box mb={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.enabled}
                        onChange={(e) => setNotifications({ enabled: e.target.checked })}
                      />
                    }
                    label="Benachrichtigungen aktiviert"
                  />
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Benachrichtigungstypen
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  {[
                    { key: 'events', label: 'Termine' },
                    { key: 'teams', label: 'Teams' },
                    { key: 'invitations', label: 'Einladungen' }
                  ].map(({ key, label }) => (
                    <Chip
                      key={key}
                      label={label}
                      clickable
                      color={preferences.notifications.types.includes(key) ? 'primary' : 'default'}
                      onClick={() => handleNotificationToggle(key)}
                    />
                  ))}
                </Box>
                
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.quietHours.enabled}
                        onChange={handleQuietHoursToggle}
                      />
                    }
                    label="Ruhezeiten aktiviert"
                  />
                  
                  {preferences.notifications.quietHours.enabled && (
                    <Box display="flex" gap={2} mt={1}>
                      <TextField
                        label="Beginn"
                        type="time"
                        value={preferences.notifications.quietHours.start}
                        onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                        size="small"
                      />
                      <TextField
                        label="Ende"
                        type="time"
                        value={preferences.notifications.quietHours.end}
                        onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                        size="small"
                      />
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Import/Export */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Import/Export</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" gap={2} mb={2}>
                  <Button
                    startIcon={<FileDownload />}
                    onClick={handleExport}
                    variant="outlined"
                  >
                    Exportieren
                  </Button>
                  <Button
                    startIcon={<RestartAlt />}
                    onClick={handleReset}
                    variant="outlined"
                    color="warning"
                  >
                    Zurücksetzen
                  </Button>
                </Box>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Einstellungen importieren (JSON)"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="JSON-Einstellungen hier einfügen..."
                />
                <Box mt={1}>
                  <Button
                    startIcon={<FileUpload />}
                    onClick={handleImport}
                    disabled={!importText.trim()}
                  >
                    Importieren
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="contained">
            Fertig
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

InterfaceCustomizer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default InterfaceCustomizer;
import React, { useState, useContext, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  Download,
  Refresh,
  Timeline,
  EmojiEvents,
  Assessment
} from '@mui/icons-material';

import { ProgressContext } from '../context/ProgressContext';
import { AttributeContext } from '../context/AttributeContext';
import AttributeTimelineChart from './AttributeTimelineChart';
import TrendIndicator from './TrendIndicator';
import MilestoneTimeline from './MilestoneTimeline';

const ProgressDashboard = ({ playerId, playerName, playerPosition }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    loading,
    error,
    fetchPlayerProgress,
    calculateAttributeTrend,
    getMilestones,
    formatProgressionForChart,
    getDateRangePresets,
    calculateProgressionStats,
    exportProgressReport
  } = useContext(ProgressContext);

  const { getRatingCategory } = useContext(AttributeContext);

  // State management
  const [progressData, setProgressData] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('3M');
  const [selectedAttribute, setSelectedAttribute] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get date range presets
  const dateRangePresets = getDateRangePresets();

  // Load progress data
  const loadProgressData = useCallback(async (dateRange) => {
    if (!playerId) return;

    try {
      const currentRange = dateRange || selectedDateRange;
      const preset = dateRangePresets.find(p => p.key === currentRange);
      const fromDate = preset?.fromDate;
      const toDate = preset?.toDate;

      const data = await fetchPlayerProgress(playerId, fromDate, toDate);
      
      if (data && data.attributes) {
        setProgressData(data.attributes);
        
        // Calculate milestones across all attributes
        const allMilestones = [];
        Object.values(data.attributes).forEach(attr => {
          const attributeMilestones = getMilestones(attr.progressionHistory);
          attributeMilestones.forEach(milestone => {
            allMilestones.push({
              ...milestone,
              attributeName: attr.attributeName
            });
          });
        });
        
        // Sort milestones by date
        allMilestones.sort((a, b) => new Date(a.date) - new Date(b.date));
        setMilestones(allMilestones);
      }
    } catch (err) {
      console.error('Error loading progress data:', err);
    }
  }, [playerId, fetchPlayerProgress, getMilestones]);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProgressData(selectedDateRange);
    setIsRefreshing(false);
  };

  // Export progress report
  const handleExport = async () => {
    const preset = dateRangePresets.find(p => p.key === selectedDateRange);
    await exportProgressReport(playerId, preset?.fromDate, preset?.toDate);
  };

  // Initial data load
  useEffect(() => {
    if (playerId) {
      loadProgressData(selectedDateRange);
    }
  }, [playerId]); // Only reload when playerId changes

  // Get attributes with progress data
  const attributesWithProgress = Object.keys(progressData);
  const hasProgressData = attributesWithProgress.length > 0;

  // Calculate overall statistics
  const getOverallStats = () => {
    if (!hasProgressData) return null;

    let totalEntries = 0;
    let totalImprovement = 0;
    let improvingAttributes = 0;
    let decliningAttributes = 0;
    
    attributesWithProgress.forEach(attrName => {
      const attr = progressData[attrName];
      if (attr.progressionHistory && attr.progressionHistory.length > 0) {
        const trend = calculateAttributeTrend(attr.progressionHistory);
        totalEntries += attr.progressionHistory.length;
        totalImprovement += trend.change || 0;
        
        if (trend.direction === 'up') improvingAttributes++;
        else if (trend.direction === 'down') decliningAttributes++;
      }
    });

    return {
      totalAttributes: attributesWithProgress.length,
      totalEntries,
      averageImprovement: totalImprovement / attributesWithProgress.length,
      improvingAttributes,
      decliningAttributes,
      stableAttributes: attributesWithProgress.length - improvingAttributes - decliningAttributes,
      totalMilestones: milestones.length
    };
  };

  const overallStats = getOverallStats();

  // Render loading state
  if (loading && !hasProgressData) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  // Render no data state
  if (!hasProgressData) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', m: 3 }}>
        <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Keine Fortschrittsdaten verfügbar
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Für {playerName} sind noch keine Bewertungsdaten vorhanden.
          Sobald Bewertungen vorgenommen wurden, werden hier die Fortschritte angezeigt.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          Aktualisieren
        </Button>
      </Paper>
    );
  }

  // Tab panel component
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  TabPanel.propTypes = {
    children: PropTypes.node,
    value: PropTypes.number.isRequired,
    index: PropTypes.number.isRequired
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Entwicklungsverlauf
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={2}>
          {playerName} {playerPosition && `• ${playerPosition}`}
        </Typography>
        
        <Button
          startIcon={<Download />}
          onClick={handleExport}
          variant="outlined"
          disabled={loading}
          fullWidth={isMobile}
          sx={{ 
            mt: 1,
            minHeight: 48,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Bericht exportieren
        </Button>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Zeitraum</InputLabel>
              <Select
                value={selectedDateRange}
                label="Zeitraum"
                onChange={(e) => {
                  const newRange = e.target.value;
                  setSelectedDateRange(newRange);
                  loadProgressData(newRange);
                }}
              >
                {dateRangePresets.map(preset => (
                  <MenuItem key={preset.key} value={preset.key}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Attribut</InputLabel>
              <Select
                value={selectedAttribute}
                label="Attribut"
                onChange={(e) => setSelectedAttribute(e.target.value)}
              >
                <MenuItem value="all">Alle Attribute</MenuItem>
                {attributesWithProgress.map(attrName => (
                  <MenuItem key={attrName} value={attrName}>
                    {attrName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Overview Statistics */}
      {overallStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {overallStats.totalAttributes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Attribute
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {overallStats.improvingAttributes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verbessert
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {overallStats.totalMilestones}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Meilensteine
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {overallStats.averageImprovement > 0 ? '+' : ''}
                  {overallStats.averageImprovement.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ø Verbesserung
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
          >
            <Tab 
              icon={<Timeline />} 
              label="Verlaufscharts"
              iconPosition="top"
            />
            <Tab 
              icon={<EmojiEvents />} 
              label="Meilensteine"
              iconPosition="top"
            />
            <Tab 
              icon={<Assessment />} 
              label="Statistiken"
              iconPosition="top"
            />
          </Tabs>
        </Box>

        {/* Timeline Charts Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {attributesWithProgress
              .filter(attrName => selectedAttribute === 'all' || selectedAttribute === attrName)
              .map(attrName => {
                const attr = progressData[attrName];
                const trend = calculateAttributeTrend(attr.progressionHistory);
                const chartData = formatProgressionForChart(attr.progressionHistory, attrName);
                const category = getRatingCategory(attr.currentValue);

                return (
                  <Grid item xs={12} lg={6} key={attrName}>
                    <Card>
                      <CardHeader
                        title={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6">{attrName}</Typography>
                            <Chip 
                              label={`${attr.currentValue}`}
                              color={
                                category.color === 'green' ? 'success' :
                                category.color === 'lightGreen' ? 'success' :
                                category.color === 'yellow' ? 'warning' :
                                category.color === 'orange' ? 'warning' :
                                category.color === 'red' ? 'error' :
                                'default'
                              }
                              size="small"
                            />
                          </Box>
                        }
                        action={
                          <TrendIndicator
                            trend={trend.trend}
                            change={trend.change}
                            direction={trend.direction}
                            progressionRate={trend.progressionRate}
                            size="small"
                            showLabel={false}
                          />
                        }
                        subheader={`${attr.totalEntries} Bewertungen`}
                      />
                      <CardContent>
                        <AttributeTimelineChart
                          data={chartData}
                          attributeName={attrName}
                          height={250}
                          showMilestones={true}
                          milestones={milestones.filter(m => m.attributeName === attrName)}
                        />
                      </CardContent>
                    </Card>
                    </Grid>
                  );
                })
              }
            </Grid>
        </TabPanel>

        {/* Milestones Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <MilestoneTimeline 
              milestones={milestones}
              showAll={true}
            />
          </Box>
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {attributesWithProgress.map(attrName => {
                const attr = progressData[attrName];
                const stats = calculateProgressionStats(attr.progressionHistory);
                const trend = calculateAttributeTrend(attr.progressionHistory);
                
                // Define leagues for level display
                const getLeagueForValue = (value) => {
                  if (value >= 700) return { name: 'Bundesliga', color: 'warning.main' };
                  if (value >= 600) return { name: 'Dritte Liga', color: 'secondary.main' };
                  if (value >= 500) return { name: 'Regionalliga', color: 'info.main' };
                  if (value >= 400) return { name: 'Bayernliga', color: 'success.main' };
                  if (value >= 300) return { name: 'Landesliga', color: 'success.light' };
                  if (value >= 200) return { name: 'Bezirksliga', color: 'warning.light' };
                  if (value >= 100) return { name: 'Bezirksklasse', color: 'warning.dark' };
                  return { name: 'Kreisliga', color: 'error.main' };
                };
                
                const currentLeague = getLeagueForValue(attr.currentValue);

                return (
                  <Grid item xs={12} md={6} lg={4} key={attrName}>
                    <Card>
                      <CardHeader
                        title={attrName}
                        action={
                          <TrendIndicator
                            trend={trend.trend}
                            change={trend.change}
                            direction={trend.direction}
                            size="small"
                            showLabel={false}
                          />
                        }
                      />
                      <CardContent>
                        <Box display="flex" flexDirection="column" gap={2}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Aktueller Wert:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {attr.currentValue}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Liga:
                            </Typography>
                            <Chip 
                              label={currentLeague.name}
                              size="small"
                              sx={{ 
                                backgroundColor: currentLeague.color === 'secondary.main' ? '#9c27b0' :
                                               currentLeague.color === 'success.light' ? '#8bc34a' :
                                               undefined,
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                              color={
                                currentLeague.color === 'warning.main' ? 'warning' :
                                currentLeague.color === 'info.main' ? 'info' :
                                currentLeague.color === 'success.main' ? 'success' :
                                currentLeague.color === 'warning.light' ? 'warning' :
                                currentLeague.color === 'warning.dark' ? 'warning' :
                                currentLeague.color === 'error.main' ? 'error' :
                                'default'
                              }
                            />
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Durchschnittswert:
                            </Typography>
                            <Typography variant="body2">
                              {stats.averageValue}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Höchstwert:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              {stats.highestValue}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Niedrigstwert:
                            </Typography>
                            <Typography variant="body2" color="error.main">
                              {stats.lowestValue}
                            </Typography>
                          </Box>
                          
                          <Divider />
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Gesamt-Verbesserung:
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color={stats.totalImprovement > 0 ? 'success.main' : 
                                     stats.totalImprovement < 0 ? 'error.main' : 'text.primary'}
                              fontWeight="bold"
                            >
                              {stats.totalImprovement > 0 ? '+' : ''}{stats.totalImprovement}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Bewertungen:
                            </Typography>
                            <Typography variant="body2">
                              {stats.totalEntries}
                            </Typography>
                          </Box>
                          
                          {stats.plateauPeriods > 0 && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Plateau-Phasen:
                              </Typography>
                              <Typography variant="body2" color="warning.main">
                                {stats.plateauPeriods}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

ProgressDashboard.propTypes = {
  playerId: PropTypes.string.isRequired,
  playerName: PropTypes.string.isRequired,
  playerPosition: PropTypes.string
};

export default ProgressDashboard;
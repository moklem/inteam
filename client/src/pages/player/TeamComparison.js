import React, { useState, useEffect } from 'react';

import PropTypes from 'prop-types';

import {
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';

import AttributeComparison from '../../components/AttributeComparison';
import PrivacyNotice from '../../components/PrivacyNotice';
import StrengthsWeaknessesCard from '../../components/StrengthsWeaknessesCard';
import TeamPercentileChart from '../../components/TeamPercentileChart';
import { useAuth } from '../../context/AuthContext';
import { ComparisonProvider, useComparison } from '../../context/ComparisonContext';
import { useTeam } from '../../context/TeamContext';


// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

// Main Comparison Content Component
const ComparisonContent = () => {
  const { user } = useAuth();
  const { teams } = useTeam();
  const {
    percentileData,
    isLoading,
    hasError,
    percentileError,
    privacyOptOut,
    handlePrivacyOptOut,
    selectedTeamId,
    setSelectedTeamId,
    getRadarChartData,
    getStrengthsAndImprovements,
    getComparisonSummary,
    hasSufficientTeamSize
  } = useComparison();

  const [tabValue, setTabValue] = useState(0);

  // Get user's teams
  const userTeams = teams.filter(team => 
    team.players?.some(p => p._id === user._id) || 
    team.coaches?.some(c => c._id === user._id)
  );

  // Auto-select first team if none selected
  useEffect(() => {
    if (!selectedTeamId && userTeams.length > 0) {
      setSelectedTeamId(userTeams[0]._id);
    }
  }, [selectedTeamId, userTeams, setSelectedTeamId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTeamChange = (event) => {
    setSelectedTeamId(event.target.value);
  };

  if (userTeams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            Keine Teams gefunden
          </Typography>
          <Typography>
            Du musst Mitglied eines Teams sein, um Teamvergleiche zu sehen.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (privacyOptOut) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom align="center">
          Teamvergleich
        </Typography>
        <PrivacyNotice
          privacyOptOut={privacyOptOut}
          onPrivacyOptOut={handlePrivacyOptOut}
          teamSize={0}
          isMinimumTeamSize={false}
        />
      </Box>
    );
  }

  const radarData = getRadarChartData();
  const { strengths, improvements } = getStrengthsAndImprovements();
  const summary = getComparisonSummary();

  return (
    <Box>
      {/* Work in Progress Banner */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Diese Seite befindet sich noch in Entwicklung</strong>
        </Typography>
        <Typography variant="body2">
          Die Teamvergleich-Funktion wird derzeit noch optimiert und erweitert. 
          Einige Funktionen sind möglicherweise noch nicht vollständig verfügbar.
        </Typography>
      </Alert>

      {/* Header */}
      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom align="center">
          Teamvergleich
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" align="center" mb={2}>
          Anonyme Einordnung deiner Leistung im Team
        </Typography>

        {/* Team Selector - Moved to center */}
        {userTeams.length > 1 && (
          <FormControl sx={{ minWidth: 250, maxWidth: '100%' }}>
            <InputLabel>Team auswählen</InputLabel>
            <Select
              value={selectedTeamId || ''}
              label="Team auswählen"
              onChange={handleTeamChange}
            >
              {userTeams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Privacy Notice */}
      <Box mb={3}>
        <PrivacyNotice
          privacyOptOut={privacyOptOut}
          onPrivacyOptOut={handlePrivacyOptOut}
          teamSize={summary?.teamSize || 0}
          isMinimumTeamSize={hasSufficientTeamSize()}
        />
      </Box>

      {/* Error State */}
      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Fehler beim Laden der Vergleichsdaten
          </Typography>
          <Typography>
            {percentileError?.message || 'Unbekannter Fehler aufgetreten'}
          </Typography>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Main Content */}
      {!isLoading && !hasError && percentileData && (
        <>
          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="comparison tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-flexContainer': {
                  justifyContent: { xs: 'flex-start', sm: 'center' }
                }
              }}
            >
              <Tab 
                icon={<AssessmentIcon />} 
                label="Übersicht" 
                id="comparison-tab-0"
                aria-controls="comparison-tabpanel-0"
              />
              <Tab 
                icon={<BarChartIcon />} 
                label="Detailanalyse" 
                id="comparison-tab-1"
                aria-controls="comparison-tabpanel-1"
              />
              <Tab 
                icon={<TrendingUpIcon />} 
                label="Stärken & Schwächen" 
                id="comparison-tab-2"
                aria-controls="comparison-tabpanel-2"
              />
              <Tab 
                icon={<SecurityIcon />} 
                label="Datenschutz" 
                id="comparison-tab-3"
                aria-controls="comparison-tabpanel-3"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TeamPercentileChart
                  data={radarData}
                  isLoading={isLoading}
                  teamSize={summary?.teamSize}
                  title="Deine Position im Team"
                />
              </Grid>
              {summary && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Schnellübersicht
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {summary.teamSize}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Spieler im Team
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {summary.averagePercentile}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Durchschnitt
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="success.main">
                              {summary.strengthsCount}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Stärken
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="error.main">
                              {summary.improvementsCount}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Verbesserungen
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AttributeComparison
              data={radarData}
              strengths={strengths}
              improvements={improvements}
              teamSize={summary?.teamSize}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <StrengthsWeaknessesCard
              data={radarData}
              strengths={strengths}
              improvements={improvements}
              averagePercentile={summary?.averagePercentile}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <PrivacyNotice
              privacyOptOut={privacyOptOut}
              onPrivacyOptOut={handlePrivacyOptOut}
              teamSize={summary?.teamSize || 0}
              isMinimumTeamSize={hasSufficientTeamSize()}
            />
          </TabPanel>
        </>
      )}

      {/* No Data State */}
      {!isLoading && !hasError && !percentileData && selectedTeamId && (
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Keine Vergleichsdaten verfügbar
          </Typography>
          <Typography>
            Für dieses Team sind noch keine Bewertungen vorhanden oder das Team hat weniger als 5 Spieler.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

// Main Component with Provider Wrapper
const TeamComparison = () => {
  return (
    <ComparisonProvider>
      <ComparisonContent />
    </ComparisonProvider>
  );
};

export default TeamComparison;
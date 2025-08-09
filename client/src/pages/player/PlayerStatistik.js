import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

import { AuthContext } from '../../context/AuthContext';
import { ComparisonProvider } from '../../context/ComparisonContext';
import TeamComparison from './TeamComparison';
import ProgressDashboard from '../../components/ProgressDashboard';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`statistik-tabpanel-${index}`}
      aria-labelledby={`statistik-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
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

const PlayerStatistik = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">
          Bitte melden Sie sich an, um Ihre Statistiken zu sehen.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Statistik
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analysieren Sie Ihre Leistung und verfolgen Sie Ihren Fortschritt
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant={isMobile ? "fullWidth" : "standard"}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<AssessmentIcon />} 
            label="Teamvergleich"
            iconPosition="start"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="Fortschrittsverlauf"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <ComparisonProvider>
          <TeamComparison />
        </ComparisonProvider>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ProgressDashboard
          playerId={user._id}
          playerName={user.name}
          playerPosition={user.position}
        />
      </TabPanel>
    </Box>
  );
};

export default PlayerStatistik;
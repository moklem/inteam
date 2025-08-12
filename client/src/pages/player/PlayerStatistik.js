import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  Button,
  Alert
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Compare as CompareIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Pool as PoolIcon
} from '@mui/icons-material';

import { AuthContext } from '../../context/AuthContext';
import { ComparisonProvider } from '../../context/ComparisonContext';
import TeamComparison from './TeamComparison';
import ProgressDashboard from '../../components/ProgressDashboard';
import AssessmentComparison from '../../components/AssessmentComparison';
import PlayerPools from '../../components/PlayerPools';

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
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);
  const [showSelfAssessmentPrompt, setShowSelfAssessmentPrompt] = useState(false);
  const [hasCompletedSelfAssessment, setHasCompletedSelfAssessment] = useState(true);

  // Check if we should open the self-assessment tab (Trainer-Vergleich)
  useEffect(() => {
    if (location.state?.openSelfAssessment) {
      setTabValue(0); // Trainer-Vergleich is the first tab
    }
  }, [location.state]);

  // Check if player has completed self-assessment
  useEffect(() => {
    const checkSelfAssessmentStatus = async () => {
      if (!user || user.role !== 'Spieler') return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/attributes/universal?playerId=${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const hasCompleted = data.some(attr => 
            attr.selfAssessmentCompleted === true || 
            attr.selfLevel !== null || 
            attr.selfRating !== null
          );
          setHasCompletedSelfAssessment(hasCompleted);
        }
      } catch (error) {
        console.error('Error checking self-assessment status:', error);
      }
    };
    
    checkSelfAssessmentStatus();
  }, [user]);

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Statistik
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Analysieren Sie Ihre Leistung und verfolgen Sie Ihren Fortschritt
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/player/self-assessment')}
            sx={{ 
              minWidth: 200,
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #764ba2 30%, #667eea 90%)',
              }
            }}
          >
            Selbstbewertung
          </Button>
        </Box>
        
        {/* Show info alert only if self-assessment is not completed */}
        {!hasCompletedSelfAssessment && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 2,
              backgroundColor: 'rgba(102, 126, 234, 0.08)',
              '& .MuiAlert-icon': {
                color: '#667eea'
              }
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Tipp: Vervollständige deine Selbstbewertung!
              </Typography>
              <Typography variant="body2">
                Die Selbstbewertung hilft deinem Trainer, dir gezieltes Feedback zu geben und deine Entwicklung optimal zu fördern.
              </Typography>
            </Box>
          </Alert>
        )}
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
            icon={<PersonIcon />} 
            label={!isMobile && !isTablet ? "Trainer-Vergleich" : ""}
            iconPosition="start"
          />
          <Tab 
            icon={<TrendingUpIcon />} 
            label={!isMobile && !isTablet ? "Fortschrittsverlauf" : ""}
            iconPosition="start"
          />
          <Tab 
            icon={<PoolIcon />} 
            label={!isMobile && !isTablet ? "Training Pools" : ""}
            iconPosition="start"
          />
          <Tab 
            icon={<GroupsIcon />} 
            label={!isMobile && !isTablet ? "Teamvergleich" : ""}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <AssessmentComparison />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ProgressDashboard
          playerId={user._id}
          playerName={user.name}
          playerPosition={user.position}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <PlayerPools />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ComparisonProvider>
          <TeamComparison />
        </ComparisonProvider>
      </TabPanel>
    </Box>
  );
};

export default PlayerStatistik;
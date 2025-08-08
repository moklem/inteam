import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import {
  EmojiEvents,
  Star,
  TrendingUp,
  WorkspacePremium
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const MilestoneTimeline = ({ 
  milestones, 
  maxItems = 5,
  showAll = false,
  orientation = 'vertical'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get milestone icon based on type
  const getMilestoneIcon = (type) => {
    switch (type) {
      case 'elite':
        return <WorkspacePremium />;
      case 'excellent':
        return <EmojiEvents />;
      case 'good':
        return <Star />;
      default:
        return <TrendingUp />;
    }
  };

  // Get milestone color based on type
  const getMilestoneColor = (type) => {
    switch (type) {
      case 'elite':
        return 'primary';
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      default:
        return 'default';
    }
  };

  // Format milestone date
  const formatMilestoneDate = (date) => {
    return format(new Date(date), 'dd.MM.yyyy', { locale: de });
  };

  // Limit milestones if needed
  const displayMilestones = showAll ? milestones : milestones.slice(0, maxItems);

  if (!milestones || milestones.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Noch keine Meilensteine erreicht
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Meilensteine werden bei 70+, 80+ und 90+ Punkten freigeschaltet
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Timeline 
        position={isMobile ? "right" : "alternate"}
        sx={{
          [`& .MuiTimelineItem-root:before`]: {
            flex: isMobile ? 0 : 1,
            padding: isMobile ? '6px 16px' : '6px 16px'
          }
        }}
      >
        {displayMilestones.map((milestone, index) => (
          <TimelineItem key={`${milestone.attributeName}-${milestone.threshold}-${milestone.date}`}>
            <TimelineSeparator>
              <TimelineDot 
                color={getMilestoneColor(milestone.type)}
                variant="outlined"
                sx={{ 
                  border: 2,
                  p: 1
                }}
              >
                {getMilestoneIcon(milestone.type)}
              </TimelineDot>
              {index < displayMilestones.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Paper 
                elevation={2}
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {milestone.label}
                  </Typography>
                  <Chip 
                    label={formatMilestoneDate(milestone.date)}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip
                    label={milestone.attributeName}
                    size="small"
                    color="secondary"
                    variant="filled"
                  />
                  <Typography 
                    variant="body2" 
                    color="primary.main"
                    fontWeight="bold"
                  >
                    {milestone.value} Punkte
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {milestone.description}
                </Typography>

                {/* Visual progress indicator */}
                <Box 
                  sx={{ 
                    mt: 2,
                    height: 8,
                    bgcolor: 'grey.200',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(milestone.value / 99) * 100}%`,
                      bgcolor: getMilestoneColor(milestone.type) === 'primary' 
                        ? theme.palette.primary.main
                        : getMilestoneColor(milestone.type) === 'success'
                        ? theme.palette.success.main
                        : theme.palette.info.main,
                      borderRadius: 4,
                      transition: 'width 0.3s ease-in-out'
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${(milestone.threshold / 99) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      bgcolor: 'white',
                      boxShadow: 1
                    }}
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" mt={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    1
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ziel: {milestone.threshold}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    99
                  </Typography>
                </Box>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      {!showAll && milestones.length > maxItems && (
        <Box textAlign="center" mt={2}>
          <Typography variant="caption" color="text.secondary">
            ... und {milestones.length - maxItems} weitere Meilensteine
          </Typography>
        </Box>
      )}
    </Box>
  );
};

MilestoneTimeline.propTypes = {
  milestones: PropTypes.arrayOf(PropTypes.shape({
    attributeName: PropTypes.string.isRequired,
    threshold: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired
  })).isRequired,
  maxItems: PropTypes.number,
  showAll: PropTypes.bool,
  orientation: PropTypes.oneOf(['vertical', 'horizontal'])
};

export default MilestoneTimeline;
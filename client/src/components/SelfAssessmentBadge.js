import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { AttributeContext } from '../context/AttributeContext';

const SelfAssessmentBadge = ({ selfLevel, selfRating, attributeName }) => {
  const { getLeagueLevels } = useContext(AttributeContext);
  const leagues = getLeagueLevels();

  if (selfLevel === null || selfLevel === undefined || selfRating === null || selfRating === undefined) {
    return (
      <Tooltip title="Keine Selbsteinschätzung vorhanden">
        <Chip
          size="small"
          label="Keine Selbsteinschätzung"
          variant="outlined"
          sx={{ 
            borderColor: 'grey.400',
            color: 'grey.600'
          }}
        />
      </Tooltip>
    );
  }

  const leagueName = leagues[selfLevel]?.name || 'Unbekannt';
  const leagueColor = leagues[selfLevel]?.color || '#757575';
  const badgeLabel = `Selbst: ${leagueName} ${selfRating}`;

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Selbsteinschätzung - {attributeName}
          </Typography>
          <Typography variant="caption" display="block">
            Liga: {leagueName}
          </Typography>
          <Typography variant="caption" display="block">
            Bewertung: {selfRating}/99
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Spieler hat sich selbst bewertet
          </Typography>
        </Box>
      }
    >
      <Chip
        icon={<PersonIcon />}
        label={badgeLabel}
        size="small"
        sx={{
          backgroundColor: `${leagueColor}20`,
          borderColor: leagueColor,
          border: '1px solid',
          color: leagueColor,
          fontWeight: 'bold',
          '& .MuiChip-icon': {
            color: leagueColor
          }
        }}
      />
    </Tooltip>
  );
};

SelfAssessmentBadge.propTypes = {
  selfLevel: PropTypes.number,
  selfRating: PropTypes.number,
  attributeName: PropTypes.string
};

export default SelfAssessmentBadge;
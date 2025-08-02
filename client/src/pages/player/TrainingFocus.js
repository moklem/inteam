import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TrainingFocusSelector from '../../components/TrainingFocusSelector';

const TrainingFocus = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Trainingsschwerpunkte
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Wähle deine persönlichen Trainingsschwerpunkte aus, um dein Training zu individualisieren.
      </Typography>
      
      <Paper elevation={2}>
        <TrainingFocusSelector />
      </Paper>
    </Box>
  );
};

export default TrainingFocus;
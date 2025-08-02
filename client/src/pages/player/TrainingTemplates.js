import React from 'react';
import TemplateLibrary from '../../components/shared/TemplateLibrary';
import { Box, Typography } from '@mui/material';

const PlayerTrainingTemplates = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trainingsvorlagen
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Durchsuchen Sie verfügbare Trainingsvorlagen und kopieren Sie diese für Ihr persönliches Training.
      </Typography>
      
      <TemplateLibrary 
        open={true} 
        onClose={() => {}} 
        onClone={(template) => {
          // Handle cloning template for player
          console.log('Template cloned:', template);
        }}
      />
    </Box>
  );
};

export default PlayerTrainingTemplates;
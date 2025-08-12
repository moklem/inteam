import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const FeedbackDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  levelDiff, 
  ratingDiff, 
  attributeName,
  subAttributeName 
}) => {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!feedback.trim()) {
      setError('Bitte geben Sie eine Begründung für die große Abweichung ein.');
      return;
    }
    if (feedback.trim().length < 20) {
      setError('Die Begründung sollte mindestens 20 Zeichen enthalten.');
      return;
    }
    onSubmit(feedback);
    setFeedback('');
    setError('');
  };

  const handleClose = () => {
    setFeedback('');
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6">
            Große Abweichung - Feedback erforderlich
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Attribut:</strong> {attributeName}
          </Typography>
          {subAttributeName && (
            <Typography variant="body2" gutterBottom>
              <strong>Detailbewertung:</strong> {subAttributeName}
            </Typography>
          )}
          {levelDiff >= 1 && (
            <Typography variant="body2" gutterBottom>
              <strong>Level-Unterschied:</strong> {levelDiff} {levelDiff === 1 ? 'Stufe' : 'Stufen'}
            </Typography>
          )}
          {ratingDiff >= 20 && (
            <Typography variant="body2">
              <strong>Bewertungsunterschied:</strong> {Math.round(ratingDiff)} Punkte
            </Typography>
          )}
        </Alert>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Bei großen Abweichungen zwischen Selbsteinschätzung und Trainerbewertung 
          ist eine Begründung erforderlich. Dies hilft dem Spieler, die Bewertung 
          besser zu verstehen und sich gezielt zu verbessern.
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Begründung für die Abweichung"
          placeholder="Erklären Sie, warum Ihre Bewertung von der Selbsteinschätzung abweicht..."
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error || `${feedback.length}/20 Zeichen (Minimum)`}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!feedback.trim()}
        >
          Feedback senden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

FeedbackDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  levelDiff: PropTypes.number,
  ratingDiff: PropTypes.number,
  attributeName: PropTypes.string,
  subAttributeName: PropTypes.string
};

export default FeedbackDialog;
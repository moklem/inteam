import React, { useState } from 'react';

import PropTypes from 'prop-types';

import {
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  Shield as ShieldIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Divider,
  useTheme
} from '@mui/material';

const PrivacyNotice = ({ 
  privacyOptOut = false, 
  onPrivacyOptOut = () => {},
  teamSize = 0,
  isMinimumTeamSize = false
}) => {
  const theme = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingOptOut, setPendingOptOut] = useState(false);

  const handleOptOutToggle = (event) => {
    const newOptOut = event.target.checked;
    setPendingOptOut(newOptOut);
    setConfirmDialogOpen(true);
  };

  const handleConfirmOptOut = () => {
    onPrivacyOptOut(pendingOptOut);
    setConfirmDialogOpen(false);
  };

  const handleCancelOptOut = () => {
    setPendingOptOut(false);
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <SecurityIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h6">
              Datenschutz & Anonymität
            </Typography>
          </Box>
          
          {/* Privacy Status */}
          <Alert 
            severity={privacyOptOut ? "warning" : "success"}
            sx={{ mb: 2 }}
            icon={privacyOptOut ? <VisibilityOffIcon /> : <ShieldIcon />}
          >
            <Typography variant="body2">
              {privacyOptOut 
                ? "Teamvergleiche sind deaktiviert - deine Privatsphäre ist geschützt"
                : "Anonyme Teamvergleiche sind aktiv - deine Daten bleiben privat"
              }
            </Typography>
          </Alert>

          {/* Team Size Warning */}
          {!isMinimumTeamSize && !privacyOptOut && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Mindestens 5 Spieler erforderlich für aussagekräftige Vergleiche. 
                Aktuell: {teamSize} Spieler
              </Typography>
            </Alert>
          )}

          {/* Privacy Features */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Wie deine Privatsphäre geschützt wird:
            </Typography>
            
            <Box sx={{ ml: 2 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <Chip 
                  icon={<VisibilityOffIcon />} 
                  label="Keine Einzelwerte sichtbar" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Nur deine eigenen Perzentile werden angezeigt
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" mb={1}>
                <Chip 
                  icon={<PeopleIcon />} 
                  label="Anonyme Vergleiche" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Keine Namen oder Identitäten werden preisgegeben
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center">
                <Chip 
                  icon={<AnalyticsIcon />} 
                  label="Statistische Einordnung" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Nur Perzentile und Rangfolgen, keine Rohdaten
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Privacy Controls */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={privacyOptOut}
                  onChange={handleOptOutToggle}
                  color="warning"
                />
              }
              label="Teamvergleiche deaktivieren"
            />
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => setDetailsOpen(true)}
              startIcon={<InfoIcon />}
            >
              Details
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelOptOut}>
        <DialogTitle>
          {pendingOptOut ? "Teamvergleiche deaktivieren?" : "Teamvergleiche aktivieren?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {pendingOptOut 
              ? "Möchtest du die anonymen Teamvergleiche wirklich deaktivieren? Du kannst diese Einstellung jederzeit wieder ändern."
              : "Teamvergleiche zeigen dir anonym deine Position im Team. Deine individuellen Werte bleiben dabei privat und werden nicht an andere Spieler weitergegeben."
            }
          </Typography>
          
          {pendingOptOut && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Alle Vergleichsdaten werden aus dem Cache entfernt und nicht mehr angezeigt.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelOptOut}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmOptOut}
            variant="contained"
            color={pendingOptOut ? "warning" : "primary"}
          >
            {pendingOptOut ? "Deaktivieren" : "Aktivieren"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Privacy Information Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ShieldIcon sx={{ mr: 1 }} />
            Datenschutz bei Teamvergleichen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Wie funktionieren die anonymen Vergleiche?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Das System berechnet aus allen Spielerbewertungen im Team statistische Perzentile. 
                Du siehst nur deine eigene Position (z.B. &ldquo;75. Perzentil&rdquo;), aber niemals die 
                individuellen Werte anderer Spieler.
              </Typography>
              <Typography variant="body2">
                <strong>Beispiel:</strong> Ein 80. Perzentil in &ldquo;Aufschlag&rdquo; bedeutet, dass 80% 
                deiner Teamkollegen schlechtere Aufschlagwerte haben als du.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Was wird NICHT gezeigt?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" paragraph>
                  Individuelle Bewertungen anderer Spieler (1-99 Werte)
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Namen oder Identitäten von Teamkollegen
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Detaillierte Ranglisten mit Spielernamen
                </Typography>
                <Typography component="li" variant="body2">
                  Historische Entwicklungen anderer Spieler
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Deine Datenschutzrechte
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" paragraph>
                  Du kannst Teamvergleiche jederzeit aktivieren oder deaktivieren
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Bei Deaktivierung werden alle Vergleichsdaten aus dem Cache entfernt
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  Mindestens 5 Spieler sind erforderlich, um Einzelpersonen zu schützen
                </Typography>
                <Typography component="li" variant="body2">
                  Deine Bewertungen werden nur für Perzentilberechnungen verwendet
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Fazit:</strong> Die Teamvergleiche sind so konzipiert, dass sie dir 
              wertvolle Einblicke in deine Leistung geben, ohne die Privatsphäre anderer 
              Spieler zu verletzen oder deine eigenen Daten preiszugeben.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)} variant="contained">
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

PrivacyNotice.propTypes = {
  privacyOptOut: PropTypes.bool,
  onPrivacyOptOut: PropTypes.func,
  teamSize: PropTypes.number,
  isMinimumTeamSize: PropTypes.bool
};

export default PrivacyNotice;
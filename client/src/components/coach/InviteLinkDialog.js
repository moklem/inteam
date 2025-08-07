import React, { useState, useEffect } from 'react';

import axios from 'axios';
import PropTypes from 'prop-types';

import {
  ContentCopy,
  Delete,
  Link as LinkIcon,
  PersonAdd,
  Group
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Paper
} from '@mui/material';

const InviteLinkDialog = ({ open, onClose, preselectedTeam, teams }) => {
  const [selectedTeam, setSelectedTeam] = useState(preselectedTeam || '');
  const [description, setDescription] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState('');

  useEffect(() => {
    if (open && selectedTeam) {
      fetchInvites();
    }
  }, [open, selectedTeam]);

  useEffect(() => {
    if (preselectedTeam) {
      setSelectedTeam(preselectedTeam);
    }
  }, [preselectedTeam]);

  const fetchInvites = async () => {
    if (!selectedTeam) return;
    
    setLoadingInvites(true);
    try {
      const response = await axios.get(`/team-invites/team/${selectedTeam}`);
      setInvites(response.data.filter(invite => invite.isActive));
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setNewInviteUrl('');

    try {
      const response = await axios.post('/team-invites', {
        teamId: selectedTeam,
        description,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        expiresIn: expiresIn ? parseInt(expiresIn) : null
      });

      setSuccess('Einladungslink wurde erstellt!');
      setNewInviteUrl(response.data.inviteUrl);
      setDescription('');
      setMaxUsage('');
      setExpiresIn('');
      fetchInvites();
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Einladungslinks');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setSuccess('Link in Zwischenablage kopiert!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      await axios.delete(`/team-invites/${inviteId}`);
      fetchInvites();
    } catch (error) {
      setError('Fehler beim Löschen des Einladungslinks');
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setNewInviteUrl('');
    setDescription('');
    setMaxUsage('');
    setExpiresIn('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd />
          <Typography variant="h6">Spieler per Link einladen</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!preselectedTeam && teams && teams.length > 1 && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Team auswählen</InputLabel>
            <Select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              label="Team auswählen"
            >
              {teams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group />
                    {team.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Neuen Einladungslink erstellen
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <TextField
            label="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. Einladung für neue Spieler Saison 2025"
            fullWidth
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Max. Nutzungen (optional)"
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              placeholder="Unbegrenzt"
              sx={{ flex: 1 }}
            />
            
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Gültig für</InputLabel>
              <Select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                label="Gültig für"
              >
                <MenuItem value="">Unbegrenzt</MenuItem>
                <MenuItem value="7">7 Tage</MenuItem>
                <MenuItem value="30">30 Tage</MenuItem>
                <MenuItem value="90">90 Tage</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            onClick={handleCreateInvite}
            disabled={loading || !selectedTeam}
            startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
          >
            Einladungslink erstellen
          </Button>
        </Box>

        {newInviteUrl && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="subtitle2" gutterBottom>
              Neuer Einladungslink:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
                {newInviteUrl}
              </Typography>
              <Tooltip title="Link kopieren">
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyLink(newInviteUrl)}
                  sx={{ color: 'success.contrastText' }}
                >
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Aktive Einladungslinks
        </Typography>

        {loadingInvites ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : invites.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Noch keine aktiven Einladungslinks vorhanden
          </Typography>
        ) : (
          <List>
            {invites.map((invite) => (
              <ListItem key={invite._id} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {invite.description || 'Einladungslink'}
                      </Typography>
                      {invite.maxUsage && (
                        <Chip 
                          size="small" 
                          label={`${invite.usageCount}/${invite.maxUsage} genutzt`}
                          color={invite.usageCount >= invite.maxUsage ? 'error' : 'default'}
                        />
                      )}
                      {invite.expiresAt && (
                        <Chip 
                          size="small" 
                          label={`Gültig bis ${new Date(invite.expiresAt).toLocaleDateString('de-DE')}`}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Erstellt am {new Date(invite.createdAt).toLocaleDateString('de-DE')} • 
                        {invite.usageCount} mal genutzt
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all' }}>
                        {invite.inviteUrl}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Link kopieren">
                    <IconButton onClick={() => handleCopyLink(invite.inviteUrl)}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Link löschen">
                    <IconButton onClick={() => handleDeleteInvite(invite._id)} color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

InviteLinkDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  preselectedTeam: PropTypes.string,
  teams: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    // Add other team properties as needed
  })).isRequired
};

export default InviteLinkDialog;
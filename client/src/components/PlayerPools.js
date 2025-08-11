import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar
} from '@mui/material';
import {
  Pool as PoolIcon,
  Star as StarIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const PlayerPools = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState([]);
  const [error, setError] = useState(null);
  const [playerRating, setPlayerRating] = useState(null);
  const [playerAttendance, setPlayerAttendance] = useState(0);
  const [poolRating, setPoolRating] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    if (user?._id) {
      loadPoolData();
    }
  }, [user?._id]);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Fetch all pools
      const poolsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/training-pools`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch player's overall rating using the proper API endpoint
      let rating = null;
      let attendance = 0;
      
      try {
        // First try to get the overall rating
        const overallResponse = await axios.post(
          `${process.env.REACT_APP_API_URL}/attributes/calculate-overall`,
          { 
            playerId: user._id,
            playerPosition: user.position
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (overallResponse.data?.overallRating) {
          rating = Math.round(overallResponse.data.overallRating);
        }
      } catch (err) {
        console.log('Could not fetch overall rating, trying universal endpoint');
        
        // Fallback to universal attributes endpoint
        try {
          const universalResponse = await axios.get(
            `${process.env.REACT_APP_API_URL}/attributes/universal`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              params: { playerId: user._id }
            }
          );
          
          // Find the overall rating from the universal attributes
          const attrs = universalResponse.data;
          if (attrs && attrs.length > 0) {
            // Get attendance from any attribute that has it
            const attrWithAttendance = attrs.find(a => a.attendanceTracking?.threeMonthAttendance?.percentage !== undefined);
            if (attrWithAttendance) {
              attendance = attrWithAttendance.attendanceTracking.threeMonthAttendance.percentage || 0;
            }
            
            // Calculate overall rating manually if needed
            const coachRatings = {};
            attrs.forEach(attr => {
              if (attr.numericValue !== null && attr.numericValue !== undefined) {
                coachRatings[attr.attributeName] = attr.numericValue;
              }
            });
            
            if (Object.keys(coachRatings).length >= 8) {
              // Simple average for fallback
              const sum = Object.values(coachRatings).reduce((acc, val) => acc + val, 0);
              rating = Math.round(sum / Object.keys(coachRatings).length);
            }
          }
        } catch (err2) {
          console.log('Could not fetch universal attributes either');
        }
      }
      
      // Set default if still no rating
      if (rating === null) {
        rating = 50;
      }
      
      setPlayerRating(rating);
      setPlayerAttendance(attendance);
      
      // Calculate pool rating (combination of rating and attendance)
      // Pool rating = 70% skill rating + 30% attendance
      // But if attendance is 0, use 100% skill rating
      let calculatedPoolRating;
      if (attendance === 0) {
        calculatedPoolRating = rating;
      } else {
        calculatedPoolRating = Math.round(rating * 0.7 + attendance * 0.3);
      }
      setPoolRating(calculatedPoolRating);

      // Process pools to determine player's status in each
      const processedPools = poolsResponse.data.map(pool => {
        let playerStatus = 'not_eligible';
        
        // Check if player is in this pool
        const isApproved = pool.approvedPlayers?.some(
          ap => ap.player?._id === user._id || ap.player === user._id
        );
        // Note: The field is 'pendingApproval' not 'pendingPlayers'
        const isPending = pool.pendingApproval?.some(
          pp => pp.player?._id === user._id || pp.player === user._id
        );
        const isEligible = pool.eligiblePlayers?.some(
          ep => ep._id === user._id || ep === user._id
        );

        if (isApproved) {
          playerStatus = 'approved';
        } else if (isPending) {
          playerStatus = 'pending';
        } else if (isEligible) {
          playerStatus = 'eligible';
        } else if (pool.type === 'league') {
          // Check if player meets rating requirement for league pools using poolRating
          const minRating = pool.minRating || pool.leagueLevel?.minRating || 0;
          const maxRating = pool.maxRating || pool.leagueLevel?.maxRating || 99;
          // Use the calculated pool rating (skill + attendance) for eligibility
          if (calculatedPoolRating >= minRating && calculatedPoolRating <= maxRating) {
            playerStatus = 'eligible';
          }
        }

        return {
          ...pool,
          playerStatus
        };
      });

      setPools(processedPools);
      setLoading(false);
    } catch (err) {
      console.error('Error loading pool data:', err);
      setError('Fehler beim Laden der Training Pools');
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'eligible':
        return <StarIcon color="info" />;
      default:
        return <BlockIcon color="disabled" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return { label: 'Mitglied', color: 'success' };
      case 'pending':
        return { label: 'Ausstehend', color: 'warning' };
      case 'eligible':
        return { label: 'Berechtigt', color: 'info' };
      default:
        return { label: 'Nicht berechtigt', color: 'default' };
    }
  };

  const getLeagueName = (pool) => {
    if (pool.type !== 'league' || !pool.leagueLevel) return null;
    // leagueLevel is stored as a string (the name) not an object
    return typeof pool.leagueLevel === 'string' ? pool.leagueLevel : pool.leagueLevel.name;
  };

  const handlePoolClick = (pool) => {
    // Only allow clicking on eligible pools
    if (pool.playerStatus === 'eligible' && pool.type === 'league') {
      setSelectedPool(pool);
      setRequestDialogOpen(true);
    }
  };

  const handleRequestAccess = async () => {
    if (!selectedPool) return;
    
    try {
      setRequesting(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/training-pools/${selectedPool._id}/request-access`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSnackbarMessage('Anfrage erfolgreich gesendet! Der Trainer wird Ihre Anfrage prüfen.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setRequestDialogOpen(false);
      
      // Reload pools to update status
      loadPoolData();
    } catch (err) {
      console.error('Error requesting pool access:', err);
      // Log debug info if available
      if (err.response?.data?.debug) {
        console.log('Debug info from server:', err.response.data.debug);
      }
      setSnackbarMessage(
        err.response?.data?.message || 'Fehler beim Senden der Anfrage'
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setRequesting(false);
    }
  };

  const handleCloseDialog = () => {
    setRequestDialogOpen(false);
    setSelectedPool(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const teamPools = pools.filter(p => p.type === 'team');
  const leaguePools = pools.filter(p => p.type === 'league');
  const memberPools = pools.filter(p => p.playerStatus === 'approved');
  const pendingPools = pools.filter(p => p.playerStatus === 'pending');

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <PoolIcon color="primary" />
                <Typography variant="h6">{pools.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Verfügbare Pools
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">{memberPools.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Aktive Mitgliedschaften
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <PendingIcon color="warning" />
                <Typography variant="h6">{pendingPools.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Ausstehende Anfragen
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <StarIcon color="info" />
                <Typography variant="h6">{poolRating !== null ? poolRating : '-'}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Deine Pool-Bewertung
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {playerAttendance > 0 
                  ? `(${playerRating} Wertung + ${Math.round(playerAttendance)}% Anwesenheit)`
                  : 'Inkl. Anwesenheit*'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Team Pools Section */}
      {teamPools.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Team Training Pools
            </Typography>
            <List>
              {teamPools.map((pool, index) => (
                <React.Fragment key={pool._id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(pool.playerStatus)}
                    </ListItemIcon>
                    <ListItemText
                      primary={pool.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Team: {pool.team?.name || 'Unbekannt'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {pool.approvedPlayers?.length || 0} Mitglieder
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip 
                      size="small"
                      {...getStatusLabel(pool.playerStatus)}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* League Pools Section */}
      {leaguePools.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Liga Training Pools
            </Typography>
            <List>
              {leaguePools.map((pool, index) => {
                const leagueName = getLeagueName(pool);
                // Use pool.minRating and pool.maxRating directly (they're set from league level on backend)
                const minRating = pool.minRating || pool.leagueLevel?.minRating || 0;
                const maxRating = pool.maxRating || pool.leagueLevel?.maxRating || 99;
                const isInRange = poolRating >= minRating && poolRating <= maxRating;

                const isClickable = pool.playerStatus === 'eligible' && pool.type === 'league';
                
                return (
                  <React.Fragment key={pool._id}>
                    {index > 0 && <Divider />}
                    <ListItemButton 
                      onClick={() => handlePoolClick(pool)}
                      disabled={!isClickable}
                      sx={{ 
                        cursor: isClickable ? 'pointer' : 'default',
                        '&:hover': isClickable ? {
                          backgroundColor: 'action.hover'
                        } : {}
                      }}
                    >
                      <ListItemIcon>
                        {pool.playerStatus === 'not_eligible' && !isInRange ? 
                          <LockIcon color="disabled" /> : 
                          getStatusIcon(pool.playerStatus)
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {pool.name}
                            {leagueName && (
                              <Chip 
                                size="small" 
                                label={leagueName}
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Bewertung: {minRating} - {maxRating}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                              <LinearProgress 
                                variant="determinate" 
                                value={isInRange ? 100 : 0}
                                sx={{ width: 100, height: 6 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {pool.approvedPlayers?.length || 0} Mitglieder
                              </Typography>
                            </Box>
                            {isClickable && (
                              <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                                Klicken zum Beitreten
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip 
                        size="small"
                        {...getStatusLabel(pool.playerStatus)}
                      />
                    </ListItemButton>
                  </React.Fragment>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {pools.length === 0 && (
        <Alert severity="info">
          Keine Training Pools verfügbar. Kontaktiere deinen Trainer für weitere Informationen.
        </Alert>
      )}

      {/* Info about pool rating */}
      {poolRating !== null && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>*Hinweis zur Pool-Bewertung:</strong> Diese Bewertung kann vom Gesamtspielerwert abweichen, 
            da sie die Anwesenheit berücksichtigt. Die Pool-Bewertung setzt sich zusammen aus 70% Spielerbewertung 
            und 30% Anwesenheitsquote der letzten 3 Monate. Bei fehlenden Anwesenheitsdaten wird nur die 
            Spielerbewertung verwendet.
          </Typography>
        </Alert>
      )}

      {/* Request Access Dialog */}
      <Dialog
        open={requestDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Trainingspool beitreten
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie dem Trainingspool <strong>{selectedPool?.name}</strong> beitreten?
          </DialogContentText>
          {selectedPool && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Liga:</strong> {getLeagueName(selectedPool)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Bewertungsbereich:</strong> {selectedPool.minRating || selectedPool.leagueLevel?.minRating} - {selectedPool.maxRating || selectedPool.leagueLevel?.maxRating}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Ihre Pool-Bewertung:</strong> {poolRating}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Mindestanwesenheit:</strong> {selectedPool.minAttendancePercentage !== undefined && selectedPool.minAttendancePercentage !== null ? selectedPool.minAttendancePercentage : 75}%
              </Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Nach Ihrer Anfrage muss ein Trainer Ihre Mitgliedschaft genehmigen.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={requesting}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleRequestAccess} 
            variant="contained" 
            color="primary"
            disabled={requesting}
          >
            {requesting ? 'Wird gesendet...' : 'Anfrage senden'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlayerPools;
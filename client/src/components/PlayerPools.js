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
  Divider
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

      // Fetch player's current rating
      let rating = 50; // Default rating
      try {
        const ratingResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/attributes/player/${user._id}/universal`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: function (status) {
              return status < 500;
            }
          }
        );
        
        if (ratingResponse.status === 200) {
          rating = ratingResponse.data?.overallRating || ratingResponse.data?.numericValue || 50;
        }
      } catch (err) {
        console.log('Could not fetch player rating, using default');
      }
      
      setPlayerRating(rating);

      // Process pools to determine player's status in each
      const processedPools = poolsResponse.data.map(pool => {
        let playerStatus = 'not_eligible';
        
        // Check if player is in this pool
        const isApproved = pool.approvedPlayers?.some(
          ap => ap.player?._id === user._id || ap.player === user._id
        );
        const isPending = pool.pendingPlayers?.some(
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
          // Check if player meets rating requirement for league pools
          const minRating = pool.leagueLevel?.minRating || 0;
          const maxRating = pool.leagueLevel?.maxRating || 99;
          if (rating >= minRating && rating <= maxRating) {
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
    return pool.leagueLevel.name;
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
                <Typography variant="h6">{playerRating ? Math.round(playerRating) : '-'}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Deine Bewertung
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
                const minRating = pool.leagueLevel?.minRating || 0;
                const maxRating = pool.leagueLevel?.maxRating || 99;
                const isInRange = playerRating >= minRating && playerRating <= maxRating;

                return (
                  <React.Fragment key={pool._id}>
                    {index > 0 && <Divider />}
                    <ListItem>
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
                          </Box>
                        }
                      />
                      <Chip 
                        size="small"
                        {...getStatusLabel(pool.playerStatus)}
                      />
                    </ListItem>
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
    </Box>
  );
};

export default PlayerPools;
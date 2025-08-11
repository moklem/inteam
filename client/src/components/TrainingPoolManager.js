import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid,
  Divider,
  Badge,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  PersonAdd
} from '@mui/icons-material';
import axios from 'axios';

const TrainingPoolManager = ({ teamId, teamName }) => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddPlayersDialog, setOpenAddPlayersDialog] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [leagueLevels, setLeagueLevels] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [sortBy, setSortBy] = useState('team'); // 'team', 'rating', 'name'
  const [allTeams, setAllTeams] = useState([]);
  
  // Form states for creating/editing pools
  const [formData, setFormData] = useState({
    name: '',
    type: 'team',
    leagueLevel: '',
    minAttendancePercentage: 75
  });

  useEffect(() => {
    fetchPools();
    fetchLeagueLevels();
    fetchTeamPlayers();
    fetchAllTeams();
  }, [teamId]);

  const fetchPools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/training-pools`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Filter pools for this team
      const teamPools = response.data.filter(
        pool => pool.type === 'team' && pool.team?._id === teamId
      );
      const leaguePools = response.data.filter(
        pool => pool.type === 'league'
      );
      
      setPools([...teamPools, ...leaguePools]);
    } catch (error) {
      console.error('Error fetching training pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueLevels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/training-pools/config/league-levels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeagueLevels(response.data);
    } catch (error) {
      console.error('Error fetching league levels:', error);
    }
  };

  const fetchTeamPlayers = async () => {
    try {
      setLoadingPlayers(true);
      const token = localStorage.getItem('token');
      
      // Fetch ALL players, not just team players
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/players`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Sort to show team players first
      const allPlayers = response.data || [];
      const teamResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/teams/${teamId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const teamPlayerIds = (teamResponse.data.players || []).map(p => p._id);
      
      // Sort: team players first, then others
      const sortedPlayers = allPlayers.sort((a, b) => {
        const aIsTeamPlayer = teamPlayerIds.includes(a._id);
        const bIsTeamPlayer = teamPlayerIds.includes(b._id);
        if (aIsTeamPlayer && !bIsTeamPlayer) return -1;
        if (!aIsTeamPlayer && bIsTeamPlayer) return 1;
        return 0;
      });
      
      setAvailablePlayers(sortedPlayers);
      setFilteredPlayers(sortedPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchAllTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/teams`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayerRatings = async (playerIds) => {
    try {
      const token = localStorage.getItem('token');
      const ratingMap = {};
      
      // Fetch ratings in parallel with better error handling
      const ratingPromises = playerIds.map(async (playerId) => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/attributes/player/${playerId}/universal`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              validateStatus: function (status) {
                // Don't throw for 404s - these are expected for players without ratings
                return status < 500;
              }
            }
          );
          
          if (response.status === 404) {
            // Player has no rating yet, default to 50 (middle of range)
            return { playerId, rating: 50 };
          }
          
          return { 
            playerId, 
            rating: response.data?.overallRating || response.data?.numericValue || 50 
          };
        } catch (err) {
          // For any other error, default to 50
          console.warn(`Could not fetch rating for player ${playerId}, using default`);
          return { playerId, rating: 50 };
        }
      });
      
      const results = await Promise.all(ratingPromises);
      results.forEach(({ playerId, rating }) => {
        ratingMap[playerId] = rating;
      });
      
      return ratingMap;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      // Return default ratings for all players
      const defaultMap = {};
      playerIds.forEach(id => {
        defaultMap[id] = 50;
      });
      return defaultMap;
    }
  };

  const handleCreatePool = async () => {
    try {
      const token = localStorage.getItem('token');
      const poolData = {
        ...formData,
        teamId: teamId,
        name: formData.name || (formData.type === 'team' 
          ? `${teamName} Pool` 
          : `${formData.leagueLevel} Pool`)
      };
      
      await axios.post(
        `${process.env.REACT_APP_API_URL}/training-pools`,
        poolData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOpenCreateDialog(false);
      fetchPools();
      resetForm();
    } catch (error) {
      console.error('Error creating pool:', error);
      alert('Fehler beim Erstellen des Pools');
    }
  };

  const handleUpdatePool = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/training-pools/${selectedPool._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOpenEditDialog(false);
      fetchPools();
      resetForm();
    } catch (error) {
      console.error('Error updating pool:', error);
      alert('Fehler beim Aktualisieren des Pools');
    }
  };

  const handleApprovePlayer = async (poolId, playerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/training-pools/${poolId}/approve-player`,
        { playerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchPools();
    } catch (error) {
      console.error('Error approving player:', error);
      alert('Fehler beim Genehmigen des Spielers');
    }
  };

  const handleRejectPlayer = async (poolId, playerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/training-pools/${poolId}/reject-player`,
        { playerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchPools();
    } catch (error) {
      console.error('Error rejecting player:', error);
      alert('Fehler beim Ablehnen des Spielers');
    }
  };

  const handleRemovePlayer = async (poolId, playerId) => {
    if (!window.confirm('Möchten Sie diesen Spieler wirklich aus dem Pool entfernen?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/training-pools/${poolId}/remove-player/${playerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchPools();
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Fehler beim Entfernen des Spielers');
    }
  };

  const handleOpenAddPlayersDialog = (pool) => {
    setSelectedPool(pool);
    setSelectedPlayers([]);
    setFilterTeam('');
    setFilterPosition('');
    setSortBy('team');
    setOpenAddPlayersDialog(true);
    
    // Filter out players already in the pool
    const poolPlayerIds = [
      ...(pool.approvedPlayers || []).map(p => p.player._id),
      ...(pool.pendingApproval || []).map(p => p.player._id)
    ];
    
    const eligible = availablePlayers.filter(
      player => !poolPlayerIds.includes(player._id)
    );
    
    // Set initial players immediately so dialog shows something
    setAvailablePlayers(eligible);
    setFilteredPlayers(eligible);
    
    // Fetch ratings in background without blocking dialog opening
    fetchPlayerRatings(eligible.map(p => p._id)).then(ratings => {
      // Add ratings to players
      let playersWithRatings = eligible.map(player => ({
        ...player,
        overallRating: ratings[player._id] || 50 // Default to 50 instead of 0
      }));
      
      // For league pools, filter by rating requirements
      // But be lenient - if a player has no rating (defaulted to 50), 
      // still show them unless it's clearly outside the range
      if (pool.type === 'league' && pool.minRating && pool.maxRating) {
        playersWithRatings = playersWithRatings.filter(player => {
          const rating = player.overallRating || 50;
          // If player has default rating (50), only exclude if pool is very high or very low
          if (rating === 50) {
            // Show player unless pool is clearly for very high or very low rated players
            return !(pool.minRating > 70 || pool.maxRating < 30);
          }
          // For players with actual ratings, use strict filtering
          return rating >= pool.minRating && rating <= pool.maxRating;
        });
      }
      
      setAvailablePlayers(playersWithRatings);
      setFilteredPlayers(playersWithRatings);
    });
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...availablePlayers];
    
    // Apply team filter
    if (filterTeam) {
      if (filterTeam === 'without-own') {
        // Show all players except those from own team
        filtered = filtered.filter(player => 
          !player.teams?.some(t => (t._id || t) === teamId)
        );
      } else {
        // Filter by specific team
        filtered = filtered.filter(player => 
          player.teams?.some(t => (t._id || t) === filterTeam)
        );
      }
    }
    
    // Apply position filter
    if (filterPosition) {
      filtered = filtered.filter(player => player.position === filterPosition);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'team') {
        // Sort by team membership (team players first)
        const aIsTeamPlayer = a.teams?.some(t => (t._id || t) === teamId);
        const bIsTeamPlayer = b.teams?.some(t => (t._id || t) === teamId);
        if (aIsTeamPlayer && !bIsTeamPlayer) return -1;
        if (!aIsTeamPlayer && bIsTeamPlayer) return 1;
        return a.name?.localeCompare(b.name || '') || 0;
      } else if (sortBy === 'rating') {
        // Sort by rating (highest first)
        return (b.overallRating || 0) - (a.overallRating || 0);
      } else if (sortBy === 'name') {
        // Sort alphabetically
        return a.name?.localeCompare(b.name || '') || 0;
      }
      return 0;
    });
    
    setFilteredPlayers(filtered);
  }, [availablePlayers, filterTeam, filterPosition, sortBy, teamId]);

  const handleAddPlayers = async () => {
    if (selectedPlayers.length === 0) {
      alert('Bitte wählen Sie mindestens einen Spieler aus');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Add each selected player to the pool
      const promises = selectedPlayers.map(playerId => 
        axios.post(
          `${process.env.REACT_APP_API_URL}/training-pools/${selectedPool._id}/add-player`,
          { playerId },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      
      await Promise.all(promises);
      
      setOpenAddPlayersDialog(false);
      fetchPools();
      fetchTeamPlayers();
      setSelectedPlayers([]);
      setFilterTeam('');
      setFilterPosition('');
      setSortBy('team');
    } catch (error) {
      console.error('Error adding players:', error);
      alert('Fehler beim Hinzufügen der Spieler');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'team',
      leagueLevel: '',
      minAttendancePercentage: 75
    });
    setSelectedPool(null);
  };

  const openEditPoolDialog = (pool) => {
    setSelectedPool(pool);
    setFormData({
      name: pool.name,
      type: pool.type,
      leagueLevel: pool.leagueLevel || '',
      minAttendancePercentage: pool.minAttendancePercentage
    });
    setOpenEditDialog(true);
  };

  const getLeagueBadgeColor = (leagueLevel) => {
    const levelIndex = leagueLevels.findIndex(l => l.name === leagueLevel);
    if (levelIndex < 2) return 'default';
    if (levelIndex < 4) return 'primary';
    if (levelIndex < 6) return 'secondary';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const teamPools = pools.filter(p => p.type === 'team');
  const leaguePools = pools.filter(p => p.type === 'league');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Training Pools</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Pool erstellen
        </Button>
      </Box>

      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 2 }}>
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <GroupIcon />
              Team Pools ({teamPools.length})
            </Box>
          } 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <TrophyIcon />
              Liga Pools ({leaguePools.length})
            </Box>
          } 
        />
      </Tabs>

      {selectedTab === 0 && (
        <Grid container spacing={2}>
          {teamPools.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                Keine Team-Pools vorhanden. Erstellen Sie einen Pool für Ihr Team.
              </Alert>
            </Grid>
          ) : (
            teamPools.map(pool => (
              <Grid item xs={12} key={pool._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{pool.name}</Typography>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<PersonAdd />}
                          onClick={() => handleOpenAddPlayersDialog(pool)}
                          variant="outlined"
                        >
                          Spieler hinzufügen
                        </Button>
                        <IconButton onClick={() => openEditPoolDialog(pool)}>
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Anforderungen
                          </Typography>
                          <Stack spacing={1}>
                            <Chip
                              label={`Rating: ${pool.minRating}-${pool.maxRating}`}
                              size="small"
                              icon={<TrendingUpIcon />}
                            />
                            <Chip
                              label={`Min. ${pool.minAttendancePercentage}% Anwesenheit`}
                              size="small"
                              icon={<CheckIcon />}
                            />
                          </Stack>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Pool Status
                          </Typography>
                          <Stack spacing={1}>
                            <Typography variant="body2">
                              {pool.approvedPlayers?.length || 0} genehmigte Spieler
                            </Typography>
                            {pool.pendingApproval?.length > 0 && (
                              <Typography variant="body2" color="warning.main">
                                {pool.pendingApproval.length} Anfragen ausstehend
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Pending Approvals */}
                    {pool.pendingApproval?.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          <Badge badgeContent={pool.pendingApproval.length} color="warning">
                            <span>Ausstehende Anfragen</span>
                          </Badge>
                        </Typography>
                        <List dense>
                          {pool.pendingApproval.map(request => (
                            <ListItem key={request.player._id}>
                              <ListItemAvatar>
                                <Avatar>{request.player.name?.charAt(0)}</Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={request.player.name}
                                secondary={`Rating: ${request.currentRating} | Anwesenheit: ${request.attendancePercentage}%`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  color="success"
                                  onClick={() => handleApprovePlayer(pool._id, request.player._id)}
                                >
                                  <CheckIcon />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={() => handleRejectPlayer(pool._id, request.player._id)}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                        <Divider sx={{ my: 2 }} />
                      </>
                    )}

                    {/* Approved Players */}
                    <Typography variant="subtitle2" gutterBottom>
                      Genehmigte Spieler ({pool.approvedPlayers?.length || 0})
                    </Typography>
                    {pool.approvedPlayers?.length > 0 ? (
                      <List dense>
                        {pool.approvedPlayers.map(player => (
                          <ListItem key={player.player._id}>
                            <ListItemAvatar>
                              <Avatar>{player.player.name?.charAt(0)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={player.player.name}
                              secondary={`Rating: ${player.currentRating} | Anwesenheit: ${player.attendancePercentage}%`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleRemovePlayer(pool._id, player.player._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Noch keine genehmigten Spieler
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={2}>
          {leaguePools.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                Keine Liga-Pools vorhanden. Erstellen Sie Pools für verschiedene Liga-Level.
              </Alert>
            </Grid>
          ) : (
            leaguePools.map(pool => (
              <Grid item xs={12} key={pool._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Typography variant="h6">{pool.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Chip
                            label={pool.leagueLevel}
                            color={getLeagueBadgeColor(pool.leagueLevel)}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            Rating {pool.minRating}-{pool.maxRating}
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<PersonAdd />}
                          onClick={() => handleOpenAddPlayersDialog(pool)}
                          variant="outlined"
                        >
                          Spieler hinzufügen
                        </Button>
                        <IconButton onClick={() => openEditPoolDialog(pool)}>
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Anforderungen
                          </Typography>
                          <Stack spacing={1}>
                            <Chip
                              label={`Rating: ${pool.minRating}-${pool.maxRating}`}
                              size="small"
                              icon={<TrendingUpIcon />}
                            />
                            <Chip
                              label={`Min. ${pool.minAttendancePercentage}% Anwesenheit`}
                              size="small"
                              icon={<CheckIcon />}
                            />
                          </Stack>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Pool Status
                          </Typography>
                          <Stack spacing={1}>
                            <Typography variant="body2">
                              {pool.approvedPlayers?.length || 0} genehmigte Spieler
                            </Typography>
                            {pool.pendingApproval?.length > 0 && (
                              <Typography variant="body2" color="warning.main">
                                {pool.pendingApproval.length} Anfragen ausstehend
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Pending Approvals */}
                    {pool.pendingApproval?.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          <Badge badgeContent={pool.pendingApproval.length} color="warning">
                            <span>Ausstehende Anfragen</span>
                          </Badge>
                        </Typography>
                        <List dense>
                          {pool.pendingApproval.map(request => (
                            <ListItem key={request.player._id}>
                              <ListItemAvatar>
                                <Avatar>{request.player.name?.charAt(0)}</Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={request.player.name}
                                secondary={`Rating: ${request.currentRating} | Anwesenheit: ${request.attendancePercentage}%`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  color="success"
                                  onClick={() => handleApprovePlayer(pool._id, request.player._id)}
                                >
                                  <CheckIcon />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={() => handleRejectPlayer(pool._id, request.player._id)}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                        <Divider sx={{ my: 2 }} />
                      </>
                    )}

                    {/* Approved Players */}
                    <Typography variant="subtitle2" gutterBottom>
                      Genehmigte Spieler ({pool.approvedPlayers?.length || 0})
                    </Typography>
                    {pool.approvedPlayers?.length > 0 ? (
                      <List dense>
                        {pool.approvedPlayers.map(player => (
                          <ListItem key={player.player._id}>
                            <ListItemAvatar>
                              <Avatar>{player.player.name?.charAt(0)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={player.player.name}
                              secondary={`Rating: ${player.currentRating} | Anwesenheit: ${player.attendancePercentage}%`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleRemovePlayer(pool._id, player.player._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Noch keine genehmigten Spieler
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Create Pool Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Training Pool erstellen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pool Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'team' ? `${teamName} Pool` : 'Liga Pool'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Pool Typ</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Pool Typ"
                >
                  <MenuItem value="team">Team Pool</MenuItem>
                  <MenuItem value="league">Liga Pool</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formData.type === 'league' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Liga Level</InputLabel>
                  <Select
                    value={formData.leagueLevel}
                    onChange={(e) => setFormData({ ...formData, leagueLevel: e.target.value })}
                    label="Liga Level"
                  >
                    {leagueLevels.map(level => (
                      <MenuItem key={level.name} value={level.name}>
                        {level.name} (Rating {level.min}-{level.max})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Mindest-Anwesenheit (%)"
                value={formData.minAttendancePercentage}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  minAttendancePercentage: parseInt(e.target.value) 
                })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreatePool} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>

      {/* Add Players Dialog */}
      <Dialog open={openAddPlayersDialog} onClose={() => setOpenAddPlayersDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Spieler zum Pool hinzufügen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Wählen Sie Spieler aus, die Sie zum Pool &quot;{selectedPool?.name}&quot; hinzufügen möchten.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Sie können sowohl Spieler aus Ihrem Team als auch externe Spieler hinzufügen. 
            Team-Spieler sind mit einem blauen Rand markiert.
          </Alert>
          
          {/* Filter Controls */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Team filtern</InputLabel>
                <Select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  label="Team filtern"
                >
                  <MenuItem value="">Alle Spieler</MenuItem>
                  <MenuItem value={teamId}>Eigenes Team</MenuItem>
                  <MenuItem value="without-own">Ohne eigenes Team</MenuItem>
                  <Divider />
                  {allTeams.map(team => (
                    <MenuItem key={team._id} value={team._id}>
                      {team.name} {team._id === teamId && '(Eigenes Team)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Position filtern</InputLabel>
                <Select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  label="Position filtern"
                >
                  <MenuItem value="">Alle Positionen</MenuItem>
                  <MenuItem value="Zuspieler">Zuspieler</MenuItem>
                  <MenuItem value="Außen">Außen</MenuItem>
                  <MenuItem value="Mitte">Mitte</MenuItem>
                  <MenuItem value="Dia">Diagonal</MenuItem>
                  <MenuItem value="Libero">Libero</MenuItem>
                  <MenuItem value="Universal">Universal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sortieren nach</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sortieren nach"
                >
                  <MenuItem value="team">Team-Zugehörigkeit</MenuItem>
                  <MenuItem value="rating">Rating (Höchste zuerst)</MenuItem>
                  <MenuItem value="name">Name (A-Z)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* Results summary */}
          {filteredPlayers.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {filteredPlayers.length} Spieler gefunden
            </Typography>
          )}
          
          {loadingPlayers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : filteredPlayers.length === 0 ? (
            <Alert severity="info">
              {availablePlayers.length === 0 
                ? 'Alle verfügbaren Spieler sind bereits im Pool oder haben eine Anfrage gestellt.'
                : 'Keine Spieler entsprechen den gewählten Filterkriterien.'}
            </Alert>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredPlayers.map(player => {
                // Check if player is from this team
                const isTeamPlayer = player.teams?.some(t => t._id === teamId || t === teamId);
                
                return (
                  <ListItem
                    key={player._id}
                    button
                    onClick={() => {
                      if (selectedPlayers.includes(player._id)) {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player._id));
                      } else {
                        setSelectedPlayers([...selectedPlayers, player._id]);
                      }
                    }}
                    sx={{
                      backgroundColor: isTeamPlayer ? 'action.hover' : 'transparent',
                      borderLeft: isTeamPlayer ? '4px solid' : 'none',
                      borderLeftColor: isTeamPlayer ? 'primary.main' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: isTeamPlayer ? 'primary.main' : 'grey.500' }}>
                        {player.name?.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {player.name}
                          {isTeamPlayer && (
                            <Chip 
                              label="Team" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" component="span">
                              {player.position || 'Keine Position'}
                            </Typography>
                            {player.overallRating > 0 && (
                              <Chip 
                                label={`Rating: ${player.overallRating}`}
                                size="small"
                                color={player.overallRating >= 80 ? 'success' : player.overallRating >= 60 ? 'primary' : 'default'}
                                variant="filled"
                              />
                            )}
                          </Box>
                          {!isTeamPlayer && player.teams?.length > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Teams: {player.teams.map(t => t.name || t).join(', ')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end">
                        {selectedPlayers.includes(player._id) ? (
                          <CheckIcon color="primary" />
                        ) : (
                          <AddIcon />
                        )}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
          
          {selectedPlayers.length > 0 && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {selectedPlayers.length} Spieler ausgewählt
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddPlayersDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleAddPlayers} 
            variant="contained"
            disabled={selectedPlayers.length === 0}
          >
            Spieler hinzufügen ({selectedPlayers.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Pool Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pool bearbeiten</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pool Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Mindest-Anwesenheit (%)"
                value={formData.minAttendancePercentage}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  minAttendancePercentage: parseInt(e.target.value) 
                })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Abbrechen</Button>
          <Button onClick={handleUpdatePool} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

TrainingPoolManager.propTypes = {
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string.isRequired
};

export default TrainingPoolManager;
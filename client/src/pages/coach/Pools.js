import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Pool as PoolIcon,
  Group as GroupIcon,
  EmojiEvents as TrophyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd,
  CheckCircle,
  TrendingUp,
  Close as CloseIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';
import TrainingPoolManager from '../../components/TrainingPoolManager';

const Pools = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams } = useContext(TeamContext);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showPoolManager, setShowPoolManager] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/training-pools`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPools(response.data);
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePool = async (poolId) => {
    if (!window.confirm('Möchten Sie diesen Pool wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/training-pools/${poolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPools();
    } catch (error) {
      console.error('Error deleting pool:', error);
      alert('Fehler beim Löschen des Pools');
    }
  };

  const getLeagueBadgeColor = (leagueLevel) => {
    const levels = ['Kreisliga', 'Bezirksklasse', 'Bezirksliga', 'Landesliga', 'Bayernliga', 'Regionalliga', 'Dritte Liga', 'Bundesliga'];
    const levelIndex = levels.indexOf(leagueLevel);
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
  const myTeams = teams.filter(team => team.coaches?.some(c => c._id === user?._id));

  return (
    <Box sx={{ mt: 2, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Training Pools
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowPoolManager(true)}
        >
          Pool erstellen
        </Button>
      </Box>

      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
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
                Keine Team-Pools vorhanden. Erstellen Sie einen Pool für Ihre Teams.
              </Alert>
            </Grid>
          ) : (
            teamPools.map(pool => (
              <Grid item xs={12} md={6} key={pool._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Typography variant="h6">{pool.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Team: {pool.team?.name || 'Unbekannt'}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTeamId(pool.team?._id);
                            setShowPoolManager(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePool(pool._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} mb={2}>
                      <Chip
                        label={`Rating: ${pool.minRating}-${pool.maxRating}`}
                        size="small"
                        icon={<TrendingUp />}
                      />
                      <Chip
                        label={`Min. ${pool.minAttendancePercentage}% Anwesenheit`}
                        size="small"
                        icon={<CheckCircle />}
                      />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {pool.approvedPlayers?.length || 0} genehmigte Spieler
                      </Typography>
                      {pool.pendingApproval?.length > 0 && (
                        <Badge badgeContent={pool.pendingApproval.length} color="warning">
                          <Typography variant="body2" color="warning.main">
                            Anfragen ausstehend
                          </Typography>
                        </Badge>
                      )}
                    </Box>

                    {pool.approvedPlayers?.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Spieler:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {pool.approvedPlayers.slice(0, 5).map(player => (
                            <Chip
                              key={player.player._id}
                              label={player.player.name}
                              size="small"
                              avatar={<Avatar>{player.player.name?.charAt(0)}</Avatar>}
                            />
                          ))}
                          {pool.approvedPlayers.length > 5 && (
                            <Chip
                              label={`+${pool.approvedPlayers.length - 5} mehr`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
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
              <Grid item xs={12} md={6} key={pool._id}>
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
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTeamId(pool.team?._id);
                            setShowPoolManager(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePool(pool._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} mb={2}>
                      <Chip
                        label={`Min. ${pool.minAttendancePercentage}% Anwesenheit`}
                        size="small"
                        icon={<CheckCircle />}
                      />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {pool.approvedPlayers?.length || 0} genehmigte Spieler
                      </Typography>
                      {pool.pendingApproval?.length > 0 && (
                        <Badge badgeContent={pool.pendingApproval.length} color="warning">
                          <Typography variant="body2" color="warning.main">
                            Anfragen ausstehend
                          </Typography>
                        </Badge>
                      )}
                    </Box>

                    {pool.approvedPlayers?.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Spieler:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {pool.approvedPlayers.slice(0, 5).map(player => (
                            <Chip
                              key={player.player._id}
                              label={player.player.name}
                              size="small"
                              avatar={<Avatar>{player.player.name?.charAt(0)}</Avatar>}
                            />
                          ))}
                          {pool.approvedPlayers.length > 5 && (
                            <Chip
                              label={`+${pool.approvedPlayers.length - 5} mehr`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Pool Manager Dialog */}
      {showPoolManager && (
        <Paper 
          elevation={3}
          sx={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3,
            zIndex: 1300
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Pool Verwaltung</Typography>
            <IconButton onClick={() => {
              setShowPoolManager(false);
              setSelectedTeamId(null);
              fetchPools();
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {selectedTeamId ? (
            <TrainingPoolManager 
              teamId={selectedTeamId}
              teamName={myTeams.find(t => t._id === selectedTeamId)?.name || 'Team'}
            />
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Wählen Sie ein Team für den Pool:
              </Typography>
              <Grid container spacing={2}>
                {myTeams.map(team => (
                  <Grid item xs={12} sm={6} md={4} key={team._id}>
                    <Card 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTeamId(team._id)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1}>
                          <GroupIcon color="primary" />
                          <Typography variant="h6">{team.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {team.players?.length || 0} Spieler
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {myTeams.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      Sie sind noch kein Coach eines Teams. Erstellen Sie zuerst ein Team.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* Backdrop */}
      {showPoolManager && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1299
          }}
          onClick={() => {
            setShowPoolManager(false);
            setSelectedTeamId(null);
            fetchPools();
          }}
        />
      )}
    </Box>
  );
};

export default Pools;
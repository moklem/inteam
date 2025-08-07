import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { EmojiEvents, TrendingUp, Star } from '@mui/icons-material';
import AchievementBadge from './AchievementBadge';
import axios from 'axios';

const AchievementGallery = ({ playerId, isOwnProfile = false }) => {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [nextAchievable, setNextAchievable] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [error, setError] = useState(null);

  const categories = ['all', 'Fähigkeiten', 'Position', 'Team', 'Fortschritt', 'Spezial'];
  const rarities = ['all', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'];

  useEffect(() => {
    if (playerId) {
      loadAchievementData();
    }
  }, [playerId]);

  const loadAchievementData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Load all achievement data in parallel
      const [achievementsRes, statsRes, availableRes, nextRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/achievements/player/${playerId}`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/achievements/stats/${playerId}`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/achievements/available/${playerId}?limit=20`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/achievements/next/${playerId}`, config)
      ]);

      setAchievements(achievementsRes.data.achievements || []);
      setStats(statsRes.data.stats || null);
      setAvailableBadges(availableRes.data.badges || []);
      setNextAchievable(nextRes.data.badges || []);
      
    } catch (error) {
      console.error('Error loading achievement data:', error);
      setError('Fehler beim Laden der Achievements');
    } finally {
      setLoading(false);
    }
  };

  const filterAchievements = (achievementList, includeAvailable = false) => {
    let filtered = [...achievementList];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(achievement => achievement.category === categoryFilter);
    }

    if (rarityFilter !== 'all') {
      filtered = filtered.filter(achievement => achievement.rarity === rarityFilter);
    }

    return filtered;
  };

  const getTabContent = () => {
    switch (selectedTab) {
      case 0: // Errungenschaften
        return (
          <Grid container spacing={2}>
            {filterAchievements(achievements).map((achievement, index) => (
              <Grid item xs={6} sm={4} md={3} key={achievement._id || index}>
                <AchievementBadge
                  achievement={achievement}
                  size="medium"
                  isUnlocked={true}
                />
              </Grid>
            ))}
            {filterAchievements(achievements).length === 0 && (
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  textAlign="center" 
                  sx={{ py: 4 }}
                >
                  {achievements.length === 0 ? 
                    'Noch keine Achievements freigeschaltet.' :
                    'Keine Achievements für die gewählten Filter gefunden.'
                  }
                </Typography>
              </Grid>
            )}
          </Grid>
        );

      case 1: // Nächste Ziele
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              Bald erreichbare Achievements
            </Typography>
            <Grid container spacing={2}>
              {nextAchievable.map((badge, index) => (
                <Grid item xs={6} sm={4} md={3} key={badge.badgeId || index}>
                  <Box>
                    <AchievementBadge
                      achievement={badge}
                      size="medium"
                      isUnlocked={false}
                      progress={badge.progress}
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}
                    >
                      {badge.progressText}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={badge.progress}
                      sx={{ 
                        mt: 0.5, 
                        borderRadius: 1,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: badge.rarity === 'Gold' || badge.rarity === 'Diamant' ? 
                            '#FFD700' : '#C0C0C0'
                        }
                      }}
                    />
                  </Box>
                </Grid>
              ))}
              {nextAchievable.length === 0 && (
                <Grid item xs={12}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    textAlign="center" 
                    sx={{ py: 4 }}
                  >
                    Aktuell keine bald erreichbaren Achievements verfügbar.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 2: // Alle verfügbaren
        return (
          <Grid container spacing={2}>
            {filterAchievements(availableBadges).map((badge, index) => (
              <Grid item xs={6} sm={4} md={3} key={badge.badgeId || index}>
                <AchievementBadge
                  achievement={badge}
                  size="medium"
                  isUnlocked={false}
                  showDescription={false}
                />
              </Grid>
            ))}
            {filterAchievements(availableBadges).length === 0 && (
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  textAlign="center" 
                  sx={{ py: 4 }}
                >
                  Alle verfügbaren Achievements für die gewählten Filter sind bereits freigeschaltet!
                </Typography>
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
          Lade Achievements...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Achievement Statistics */}
      {stats && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmojiEvents sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5">
              Achievements ({stats.total}/{stats.totalAvailable})
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  Fortschritt: {stats.completionPercentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.completionPercentage}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(stats.byRarity).map(([rarity, count]) => 
                  count > 0 ? (
                    <Chip
                      key={rarity}
                      label={`${rarity}: ${count}`}
                      size="small"
                      variant="outlined"
                    />
                  ) : null
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={`Errungenschaften (${achievements.length})`}
            icon={<Star />}
            iconPosition="start"
          />
          <Tab 
            label={`Nächste Ziele (${nextAchievable.length})`}
            icon={<TrendingUp />}
            iconPosition="start"
          />
          <Tab 
            label={`Verfügbar (${availableBadges.length})`}
            disabled={availableBadges.length === 0}
          />
        </Tabs>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Kategorie</InputLabel>
          <Select
            value={categoryFilter}
            label="Kategorie"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category === 'all' ? 'Alle' : category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Seltenheit</InputLabel>
          <Select
            value={rarityFilter}
            label="Seltenheit"
            onChange={(e) => setRarityFilter(e.target.value)}
          >
            {rarities.map(rarity => (
              <MenuItem key={rarity} value={rarity}>
                {rarity === 'all' ? 'Alle' : rarity}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Content */}
      {getTabContent()}
    </Paper>
  );
};

export default AchievementGallery;
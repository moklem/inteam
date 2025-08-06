import React, { useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
  Person,
  Assessment,
  Star
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { TeamContext } from '../../context/TeamContext';
import { AttributeContext } from '../../context/AttributeContext';
import RatingBadge from '../../components/RatingBadge';
import PlayerRatingCard from '../../components/PlayerRatingCard';

const Attributes = () => {
  const { user } = useContext(AuthContext);
  const { teams, fetchTeams, loading: teamsLoading } = useContext(TeamContext);
  const { 
    attributes, 
    fetchTeamAttributes, 
    loading: attributesLoading 
  } = useContext(AttributeContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAttribute, setFilterAttribute] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filteredAttributes, setFilteredAttributes] = useState([]);
  const [uniqueAttributeNames, setUniqueAttributeNames] = useState([]);
  const [attributesByPlayer, setAttributesByPlayer] = useState({});
  const [viewMode, setViewMode] = useState('ratings'); // 'attributes' or 'ratings'

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Load attributes when team changes
  useEffect(() => {
    const loadAttributes = async () => {
      if (filterTeam) {
        await fetchTeamAttributes(filterTeam);
      }
    };
    
    loadAttributes();
  }, [filterTeam, fetchTeamAttributes]);

  // Extract unique attribute names
  useEffect(() => {
    if (attributes.length > 0) {
      const names = [...new Set(attributes.map(attr => attr.attributeName))];
      setUniqueAttributeNames(names);
    } else {
      setUniqueAttributeNames([]);
    }
  }, [attributes]);

  // Group attributes by player
  useEffect(() => {
    if (attributes.length > 0) {
      const byPlayer = {};
      
      attributes.forEach(attr => {
        const playerId = attr.player._id;
        if (!byPlayer[playerId]) {
          byPlayer[playerId] = {
            player: attr.player,
            attributes: []
          };
        }
        
        byPlayer[playerId].attributes.push(attr);
      });
      
      setAttributesByPlayer(byPlayer);
    } else {
      setAttributesByPlayer({});
    }
  }, [attributes]);

  // Filter attributes
  useEffect(() => {
    if (attributes.length > 0) {
      let filtered = [...attributes];
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(attr => 
          attr.player.name.toLowerCase().includes(term) ||
          attr.attributeName.toLowerCase().includes(term) ||
          attr.category.toLowerCase().includes(term)
        );
      }
      
      // Filter by category
      if (filterCategory) {
        filtered = filtered.filter(attr => attr.category === filterCategory);
      }
      
      // Filter by attribute name
      if (filterAttribute) {
        filtered = filtered.filter(attr => attr.attributeName === filterAttribute);
      }
      
      setFilteredAttributes(filtered);
    } else {
      setFilteredAttributes([]);
    }
  }, [attributes, searchTerm, filterCategory, filterAttribute]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterAttribute('');
  };

  if (teamsLoading || attributesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Spielerattribute
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="team-select-label">Team auswählen</InputLabel>
          <Select
            labelId="team-select-label"
            value={filterTeam}
            label="Team auswählen"
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <MenuItem value="">
              <em>Team auswählen</em>
            </MenuItem>
            {teams.map(team => (
              <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {filterTeam ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Attribute durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')} edge="end">
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                size="small"
              />
              <IconButton 
                color={showFilters ? 'primary' : 'default'} 
                onClick={() => setShowFilters(!showFilters)}
                sx={{ ml: 1 }}
              >
                <FilterList />
              </IconButton>
            </Box>
            
            {showFilters && viewMode === 'attributes' && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                  <Typography variant="body2">
                    Diese Filter gelten nur für das Legacy Attributsystem (1-10 Skala). Das neue 1-99 Bewertungssystem verwendet universelle Kernattribute.
                  </Typography>
                </Alert>
                
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel id="category-filter-label">Kategorie</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    id="category-filter"
                    value={filterCategory}
                    label="Kategorie"
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <MenuItem value="">Alle Kategorien</MenuItem>
                    <MenuItem value="Technical">Technisch</MenuItem>
                    <MenuItem value="Tactical">Taktisch</MenuItem>
                    <MenuItem value="Physical">Physisch</MenuItem>
                    <MenuItem value="Mental">Mental</MenuItem>
                    <MenuItem value="Other">Sonstiges</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel id="attribute-filter-label">Legacy Attribut</InputLabel>
                  <Select
                    labelId="attribute-filter-label"
                    id="attribute-filter"
                    value={filterAttribute}
                    label="Legacy Attribut"
                    onChange={(e) => setFilterAttribute(e.target.value)}
                  >
                    <MenuItem value="">Alle Legacy Attribute</MenuItem>
                    {uniqueAttributeNames.map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button 
                  variant="outlined" 
                  startIcon={<Clear />} 
                  onClick={clearFilters}
                  size="small"
                >
                  Filter zurücksetzen
                </Button>
              </Box>
            )}

            {/* View Mode Toggle */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant={viewMode === 'ratings' ? 'contained' : 'outlined'}
                startIcon={<Star />}
                onClick={() => setViewMode('ratings')}
                sx={{ mr: 1 }}
              >
                1-99 Bewertungssystem
              </Button>
              <Button
                variant={viewMode === 'attributes' ? 'contained' : 'outlined'}
                startIcon={<Assessment />}
                onClick={() => setViewMode('attributes')}
              >
                Attribut-Übersicht
              </Button>
            </Box>
            
            {/* New 1-99 Rating System View */}
            {viewMode === 'ratings' && !filterAttribute && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                  Universelle Spielerbewertungen (1-99 Skala)
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Diese Bewertungen sind teamübergreifend und basieren auf den sechs Kernattributen des Volleyballs.
                </Typography>
                
                <Grid container spacing={3}>
                  {Object.values(attributesByPlayer)
                    .filter(item => {
                      if (searchTerm) {
                        return item.player.name.toLowerCase().includes(searchTerm.toLowerCase());
                      }
                      return true;
                    })
                    .map(item => (
                      <Grid item xs={12} md={6} lg={4} key={item.player._id}>
                        <PlayerRatingCard
                          player={item.player}
                          editable={true}
                          showOverallRating={true}
                          compact={true}
                          onSave={() => {
                            // Refresh data after save
                            if (filterTeam) {
                              fetchTeamAttributes(filterTeam);
                            }
                          }}
                        />
                      </Grid>
                    ))}
                </Grid>
                
                {Object.keys(attributesByPlayer).length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      Keine Spieler in diesem Team gefunden oder noch keine Bewertungen erstellt.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Attribute Table View */}
            {viewMode === 'attributes' && filterAttribute && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {filterAttribute} - Übersicht
                </Typography>
                
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Spieler</TableCell>
                        <TableCell>Rolle</TableCell>
                        <TableCell>Bewertung</TableCell>
                        <TableCell>Notizen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAttributes
                        .filter(attr => attr.attributeName === filterAttribute)
                        .sort((a, b) => b.numericValue - a.numericValue)
                        .map(attr => (
                          <TableRow key={attr._id}>
                            <TableCell>
                              <Button
                                component={RouterLink}
                                to={`/coach/players/${attr.player._id}`}
                                size="small"
                                color="primary"
                              >
                                {attr.player.name}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={attr.player.role} 
                                size="small"
                                color={attr.player.role === 'Jugendspieler' ? 'secondary' : 'primary'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <RatingBadge value={attr.numericValue} size="small" />
                            </TableCell>
                            <TableCell>{attr.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {/* Player Attribute Cards (Legacy View) */}
            {viewMode === 'attributes' && !filterAttribute && Object.keys(attributesByPlayer).length > 0 && (
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {Object.values(attributesByPlayer)
                  .filter(item => {
                    if (searchTerm) {
                      return item.player.name.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                    return true;
                  })
                  .map(item => (
                    <Grid item xs={12} sm={6} md={4} key={item.player._id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Person sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6">
                              {item.player.name}
                            </Typography>
                          </Box>
                          
                          <Chip 
                            label={item.player.role} 
                            size="small"
                            color={item.player.role === 'Jugendspieler' ? 'secondary' : 'primary'}
                            sx={{ mb: 2 }}
                          />
                          
                          <Divider sx={{ mb: 2 }} />
                          
                          <Typography variant="subtitle2" gutterBottom>
                            Top Attribute:
                          </Typography>
                          
                          {item.attributes
                            .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
                            .slice(0, 3)
                            .map(attr => (
                              <Box key={attr._id} sx={{ mb: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2">
                                    {attr.attributeName}
                                  </Typography>
                                  <RatingBadge value={attr.numericValue} size="small" showLabel={false} />
                                </Box>
                              </Box>
                            ))}
                          
                          <Button
                            component={RouterLink}
                            to={`/coach/players/${item.player._id}`}
                            fullWidth
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2 }}
                          >
                            Alle Attribute anzeigen
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            )}
            
            {Object.keys(attributesByPlayer).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {viewMode === 'ratings' ? 'Keine Spieler mit Bewertungen gefunden.' : 'Keine Attribute gefunden.'}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Alert severity="info">
            Bitte wählen Sie ein Team aus, um die Attribute anzuzeigen.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default Attributes;

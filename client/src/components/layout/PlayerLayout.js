import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  SportsVolleyball,
  Dashboard,
  Event,
  Group,
  Notifications,
  Home,
  Refresh,
  FitnessCenter,
  Assignment,
  Palette
} from '@mui/icons-material';

import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import InterfaceCustomizer from '../InterfaceCustomizer';

const PlayerLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [pendingEvents, setPendingEvents] = useState(0);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  const { user, logout, isYouthPlayer } = useContext(AuthContext);
  const { events, fetchEvents } = useContext(EventContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Set the active tab based on the current route
  useEffect(() => {
    if (location.pathname === '/player' || location.pathname === '/player/') setValue(0);
    else if (location.pathname.includes('/player/events')) setValue(1);
    else if (location.pathname.includes('/player/teams')) setValue(2);
    else if (location.pathname.includes('/player/training-focus')) setValue(3);
    else if (location.pathname.includes('/player/training-templates')) setValue(4);
    else if (location.pathname.includes('/player/profile')) setValue(5);
  }, [location]);

  // Fetch events and count pending invitations
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Count pending event invitations
  useEffect(() => {
    if (events.length > 0) {
      const pending = events.filter(event => 
        event.invitedPlayers.some(p => p._id === user._id) && 
        !event.attendingPlayers.some(p => p._id === user._id) && 
        !event.declinedPlayers.some(p => p._id === user._id)
      ).length;
      
      setPendingEvents(pending);
    }
  }, [events, user]);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleCloseUserMenu();
  };

  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SportsVolleyball sx={{ mr: 1 }} />
        <Typography variant="h6" noWrap component="div">
          Volleyball App
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem button onClick={() => handleNavigate('/player')}>
          <ListItemIcon>
            <Dashboard />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => handleNavigate('/player/events')}>
          <ListItemIcon>
            <Badge badgeContent={pendingEvents} color="error">
              <Event />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Termine" />
        </ListItem>
        <ListItem button onClick={() => handleNavigate('/player/teams')}>
          <ListItemIcon>
            <Group />
          </ListItemIcon>
          <ListItemText primary="Teams" />
        </ListItem>
        <ListItem button onClick={() => handleNavigate('/player/training-focus')}>
          <ListItemIcon>
            <FitnessCenter />
          </ListItemIcon>
          <ListItemText primary="Trainingsschwerpunkte" />
        </ListItem>
        <ListItem button onClick={() => handleNavigate('/player/training-templates')}>
          <ListItemIcon>
            <Assignment />
          </ListItemIcon>
          <ListItemText primary="Trainingsvorlagen" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={() => setCustomizerOpen(true)}>
          <ListItemIcon>
            <Palette />
          </ListItemIcon>
          <ListItemText primary="Anpassungen" />
        </ListItem>
        <ListItem button onClick={() => handleNavigate('/player/profile')}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Profil" />
          </ListItem>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Abmelden" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <SportsVolleyball sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/player"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              VOLLEYBALL
            </Typography>

            <SportsVolleyball sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
            <Typography
              variant="h5"
              noWrap
              component={RouterLink}
              to="/player"
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              VB
            </Typography>
            
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              <Button
                component={RouterLink}
                to="/player"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Dashboard
              </Button>
              <Button
                component={RouterLink}
                to="/player/events"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                <Badge badgeContent={pendingEvents} color="error">
                  Termine
                </Badge>
              </Button>
              <Button
                component={RouterLink}
                to="/player/teams"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Teams
              </Button>
              <Button
                component={RouterLink}
                to="/player/training-focus"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Training
              </Button>
              <Button
                component={RouterLink}
                to="/player/training-templates"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Vorlagen
              </Button>
            </Box>

            <Tooltip title="Seite neu laden">
            <IconButton 
              color="inherit" 
              onClick={() => window.location.reload()}
              sx={{ mr: 2 }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>

            <Box sx={{ flexGrow: 0 }}>
              {isYouthPlayer() && (
                <Tooltip title="Jugendspieler">
                  <Typography variant="caption" sx={{ mr: 2, color: 'yellow' }}>
                    Jugendspieler
                  </Typography>
                </Tooltip>
              )}
              <Tooltip title="Einstellungen öffnen">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar alt={user?.name} src="/static/images/avatar/2.jpg" />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={() => { handleCloseUserMenu(); setCustomizerOpen(true); }}>
                  <ListItemIcon>
                    <Palette fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Anpassungen</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Profil</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Abmelden</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        {drawer}
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, mb: isMobile ? 7 : 0 }}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
      
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
          <BottomNavigation
            showLabels
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
          >
            <BottomNavigationAction 
              label="Home" 
              icon={<Home />} 
              onClick={() => navigate('/player')}
            />
            <BottomNavigationAction 
              label="Termine" 
              icon={
                <Badge badgeContent={pendingEvents} color="error">
                  <Event />
                </Badge>
              } 
              onClick={() => navigate('/player/events')}
            />
            <BottomNavigationAction 
              label="Teams" 
              icon={<Group />} 
              onClick={() => navigate('/player/teams')}
            />
            <BottomNavigationAction 
              label="Training" 
              icon={<FitnessCenter />} 
              onClick={() => navigate('/player/training-focus')}
            />
            <BottomNavigationAction 
              label="Profil" 
              icon={<AccountCircle />} 
              onClick={() => navigate('/player/profile')}
            />
          </BottomNavigation>
        </Paper>
      )}
      
      <InterfaceCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
      />
    </>
  );
};

PlayerLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default PlayerLayout;

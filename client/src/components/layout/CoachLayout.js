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
  Assessment,
  Add,
  EventNote,
  GroupAdd,
  PersonAdd,
  Home,
  Refresh
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
  Fab,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  useMediaQuery,
  useTheme
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { TeamContext } from '../../context/TeamContext';
import CoachSpeedDial from '../coach/CoachSpeedDial';

const CoachLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  const { user, logout } = useContext(AuthContext);
  const { events, fetchEvents } = useContext(EventContext);
  const { teams, fetchTeams } = useContext(TeamContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Set the active tab based on the current route
    useEffect(() => {
      if (location.pathname === '/coach' || location.pathname === '/coach/') setValue(0);
      else if (location.pathname.includes('/coach/events')) setValue(1);
      else if (location.pathname.includes('/coach/teams')) setValue(2);
      else if (location.pathname.includes('/coach/players')) setValue(3);
      else if (location.pathname.includes('/coach/attributes')) setValue(4);
      else if (location.pathname.includes('/coach/profile')) setValue(5);
    }, [location]);

  // Fetch events and teams
  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchTeams();
    }
  }, [user]);

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

  const handleSpeedDialOpen = () => {
    setSpeedDialOpen(true);
  };

  const handleSpeedDialClose = () => {
    setSpeedDialOpen(false);
  };

  const speedDialActions = [
    { icon: <EventNote />, name: 'Termin erstellen', action: () => navigate('/coach/events/create') },
    { icon: <GroupAdd />, name: 'Team erstellen', action: () => navigate('/coach/teams/create') }
  ];

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
        <ListItem
          button
          onClick={() => handleNavigate('/coach')}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>
            <Dashboard />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem
          button
          onClick={() => handleNavigate('/coach/events')}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>
            <Event />
          </ListItemIcon>
          <ListItemText primary="Termine" />
        </ListItem>
        <ListItem
          button
          onClick={() => handleNavigate('/coach/teams')}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>
            <Group />
          </ListItemIcon>
          <ListItemText primary="Teams" />
        </ListItem>
        <ListItem
          button
          onClick={() => handleNavigate('/coach/players')}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText primary="Spieler" />
        </ListItem>
        <ListItem
          button
          onClick={() => handleNavigate('/coach/attributes')}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon>
            <Assessment />
          </ListItemIcon>
          <ListItemText primary="Attribute" />
        </ListItem>
      </List>
      <Divider />
      <List>
        
        <ListItem
          button
          onClick={handleLogout}
          sx={{ cursor: 'pointer' }}
        ><ListItem button onClick={() => handleNavigate('/coach/profile')}>
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary="Profil" />
              </ListItem>
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
              to="/coach"
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
              to="/coach"
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
              TVE
            </Typography>
            
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              <Button
                component={RouterLink}
                to="/coach"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Dashboard
              </Button>
              <Button
                component={RouterLink}
                to="/coach/events"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Termine
              </Button>
              <Button
                component={RouterLink}
                to="/coach/teams"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Teams
              </Button>
              <Button
                component={RouterLink}
                to="/coach/players"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Spieler
              </Button>
              <Button
                component={RouterLink}
                to="/coach/attributes"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Attribute
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
              <Tooltip title="Trainer">
                <Typography variant="caption" sx={{ mr: 2, color: 'yellow' }}>
                  Trainer
                </Typography>
              </Tooltip>
              <Tooltip title="Einstellungen öffnen">
                <IconButton
                  onClick={handleOpenUserMenu}
                  sx={{ p: 0, cursor: 'pointer' }}
                  aria-label="Benutzermenü öffnen"
                >
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
                <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/coach/profile'); }}>
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
      
      {isMobile ? (
        <>
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
                onClick={() => navigate('/coach')}
              />
              <BottomNavigationAction 
                label="Termine" 
                icon={<Event />} 
                onClick={() => navigate('/coach/events')}
              />
              <BottomNavigationAction 
                label="Teams" 
                icon={<Group />} 
                onClick={() => navigate('/coach/teams')}
              />
              <BottomNavigationAction 
                label="Spieler" 
                icon={<AccountCircle />} 
                onClick={() => navigate('/coach/players')}
              />
               <BottomNavigationAction 
                  label="Profil" 
                  icon={<Settings />} 
                  onClick={() => navigate('/coach/profile')}
                />
            </BottomNavigation>
          </Paper>
          
        </>
      ) : null}
      
      {speedDialOpen && (
        <Menu
          anchorEl={document.getElementById('root')}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          sx={{ position: 'fixed', marginBottom: '500px', marginRight: '16px' }}
        >
          {speedDialActions.map((action) => (
            <MenuItem
              key={action.name}
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemIcon>
                {action.icon}
              </ListItemIcon>
              <Typography variant="body2">{action.name}</Typography>
            </MenuItem>
          ))}
        </Menu>
      )}
      <CoachSpeedDial teams={teams} />
    </>
  );
};

CoachLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default CoachLayout;

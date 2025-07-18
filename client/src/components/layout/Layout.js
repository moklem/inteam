import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';

import { Link as RouterLink, useNavigate } from 'react-router-dom';

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
  Refresh,
  GetApp
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
  useMediaQuery,
  useTheme
} from '@mui/material';

import { AuthContext } from '../../context/AuthContext';
import PWAInstall from '../common/PWAInstall';

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { user, logout, isCoach, isPlayer } = useContext(AuthContext);
  const navigate = useNavigate();

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
        <ListItem button onClick={() => handleNavigate('/dashboard')}>
          <ListItemIcon>
            <Dashboard />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        
        {isCoach() && (
          <>
            <ListItem button onClick={() => handleNavigate('/coach/events')}>
              <ListItemIcon>
                <Event />
              </ListItemIcon>
              <ListItemText primary="Termine" />
            </ListItem>
            <ListItem button onClick={() => handleNavigate('/coach/teams')}>
              <ListItemIcon>
                <Group />
              </ListItemIcon>
              <ListItemText primary="Teams" />
            </ListItem>
            <ListItem button onClick={() => handleNavigate('/coach/players')}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Spieler" />
            </ListItem>
            <ListItem button onClick={() => handleNavigate('/coach/attributes')}>
              <ListItemIcon>
                <Assessment />
              </ListItemIcon>
              <ListItemText primary="Attribute" />
            </ListItem>
          </>
        )}
        
        {isPlayer() && (
          <>
            <ListItem button onClick={() => handleNavigate('/player/events')}>
              <ListItemIcon>
                <Event />
              </ListItemIcon>
              <ListItemText primary="Termine" />
            </ListItem>
            <ListItem button onClick={() => handleNavigate('/player/teams')}>
              <ListItemIcon>
                <Group />
              </ListItemIcon>
              <ListItemText primary="Teams" />
            </ListItem>
          </>
        )}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={() => handleNavigate('/profile')}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Profil" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <GetApp />
          </ListItemIcon>
          <PWAInstall variant="menu-item" />
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
              to="/"
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
              to="/"
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

            {/* Reload Button */}
            <Tooltip title="Seite neu laden">
              <IconButton 
                color="inherit" 
                onClick={() => window.location.reload()}
                sx={{ mr: 2 }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              <Button
                component={RouterLink}
                to="/dashboard"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Dashboard
              </Button>
              
              {isCoach() && (
                <>
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
                </>
              )}
              
              {isPlayer() && (
                <>
                  <Button
                    component={RouterLink}
                    to="/player/events"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    Termine
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/player/teams"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    Teams
                  </Button>
                </>
              )}
            </Box>

            <Box sx={{ flexGrow: 0 }}>
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
                <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <Typography textAlign="center">Profil</Typography>
                </MenuItem>
                <MenuItem onClick={handleCloseUserMenu}>
                  <ListItemIcon>
                    <GetApp fontSize="small" />
                  </ListItemIcon>
                  <PWAInstall variant="menu-item" />
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
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;

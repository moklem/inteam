import React, { useState } from 'react';

import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import {
  Add,
  PersonAdd,
  Group,
  Event,
  Link as LinkIcon,
  Pool
} from '@mui/icons-material';
import {
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Backdrop
} from '@mui/material';

import InviteLinkDialog from './InviteLinkDialog';
import { TeamPropTypes } from '../../utils/PropTypes';

const CoachSpeedDial = ({ teams }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const actions = [
    { 
      icon: <LinkIcon />, 
      name: 'Einladungslink erstellen',
      onClick: () => {
        setInviteDialogOpen(true);
        setOpen(false); // Close SpeedDial when opening dialog
      }
    },
    { 
      icon: <PersonAdd />, 
      name: 'Spieler hinzufügen',
      onClick: () => {
        navigate('/coach/players/create');
        setOpen(false); // Auto-close after navigation
      }
    },
    { 
      icon: <Group />, 
      name: 'Team erstellen',
      onClick: () => {
        navigate('/coach/teams/create');
        setOpen(false); // Auto-close after navigation
      }
    },
    { 
      icon: <Event />, 
      name: 'Termin erstellen',
      onClick: () => {
        navigate('/coach/events/create');
        setOpen(false); // Auto-close after navigation
      }
    },
    { 
      icon: <Pool />, 
      name: 'Training Pool erstellen',
      onClick: () => {
        navigate('/coach/pools');
        setOpen(false); // Auto-close after navigation
      }
    }
  ];

  return (
    <>
      <Backdrop 
        open={open} 
        sx={{ zIndex: (theme) => theme.zIndex.speedDial - 1 }}
        onClick={() => setOpen(false)} // Close when clicking backdrop
      />
      <SpeedDial
        ariaLabel="Coach actions"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        icon={<SpeedDialIcon />}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        open={open}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>
      
      <InviteLinkDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        teams={teams}
      />
    </>
  );
};

CoachSpeedDial.propTypes = {
  teams: PropTypes.arrayOf(PropTypes.shape(TeamPropTypes))
};

export default CoachSpeedDial;
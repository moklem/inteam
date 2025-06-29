import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

import axios from 'axios';

import { AuthContext } from './AuthContext';

export const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasSetInitialTeam = useRef(false);
  
  const { user } = useContext(AuthContext);

  // Fetch all teams for the user - moved before useEffect to ensure proper initialization
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/teams`);
      
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTeams(prevTeams => {
          // Only update if the teams are different and not empty
          const areTeamsDifferent = JSON.stringify(prevTeams) !== JSON.stringify(res.data);
          return areTeamsDifferent ? res.data : prevTeams;
        });
      } else {
        // If no teams are returned, reset teams to an empty array
        setTeams([]);
      }
      
      return res.data || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch teams');
      console.error('Error fetching teams:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load teams when user changes
  useEffect(() => {
    if (user) {
      // Use the memoized fetchTeams function
      fetchTeams();
    } else {
      // Reset everything when user logs out
      setTeams([]);
      setCurrentTeam(null);
      hasSetInitialTeam.current = false;
      setError(null);
      setLoading(false);
    }
  }, [user, fetchTeams]);
  
  // This separate useEffect handles setting the current team
  // It only runs when teams changes and we haven't set an initial team yet
  useEffect(() => {
    // If we have teams and we haven't set an initial team yet
    if (Array.isArray(teams) && teams.length > 0 && !hasSetInitialTeam.current) {
      hasSetInitialTeam.current = true; // Mark that we've set the initial team
      setCurrentTeam(prevCurrentTeam => {
        // Only set a new current team if there isn't already one
        return prevCurrentTeam || teams[0];
      });
    } else if (teams.length === 0) {
      // Reset current team if no teams exist
      setCurrentTeam(null);
      hasSetInitialTeam.current = false;
    }
  }, [teams]); // Only depend on teams to avoid infinite loops

  // Fetch a specific team by ID
  const fetchTeam = async (teamId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/teams/${teamId}`);
      
      if (res.data) {
        // Update the team in the teams array
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team._id === res.data._id ? res.data : team
          )
        );
        
        // If this is the current team, update it
        if (currentTeam && currentTeam._id === res.data._id) {
          setCurrentTeam(res.data);
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch team');
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new team (coach only)
  const createTeam = async (teamData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/teams`, teamData);
      
      if (res.data) {
        setTeams(prevTeams => {
          // Only add the team if it's not already in the list
          const teamExists = prevTeams.some(team => team._id === res.data._id);
          return teamExists ? prevTeams : [...prevTeams, res.data];
        });
        
        // If no current team is set and we haven't set an initial team yet, set this as current
        if (!currentTeam && !hasSetInitialTeam.current) {
          hasSetInitialTeam.current = true;
          setCurrentTeam(prevCurrentTeam => prevCurrentTeam || res.data);
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
      console.error('Error creating team:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update a team (coach only)
  const updateTeam = async (teamId, teamData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`${process.env.REACT_APP_API_URL}/teams/${teamId}`, teamData);
      
      if (res.data) {
        // Update the team in the teams array
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team._id === res.data._id ? res.data : team
          )
        );
        
        // If this is the current team, update it
        if (currentTeam && currentTeam._id === res.data._id) {
          setCurrentTeam(prevCurrentTeam => ({
            ...prevCurrentTeam,
            ...res.data
          }));
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team');
      console.error('Error updating team:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a player to a team (coach only)
  const addPlayerToTeam = async (teamId, playerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/teams/${teamId}/players`, { playerId });
      
      if (res.data) {
        // Update the team in the teams array
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team._id === res.data._id ? res.data : team
          )
        );
        
        // If this is the current team, update it
        if (currentTeam && currentTeam._id === res.data._id) {
          setCurrentTeam(prevCurrentTeam => ({
            ...prevCurrentTeam,
            ...res.data
          }));
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add player to team');
      console.error('Error adding player to team:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove a player from a team (coach only)
  const removePlayerFromTeam = async (teamId, playerId) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete(`${process.env.REACT_APP_API_URL}/teams/${teamId}/players/${playerId}`);
      
      // Refresh the team data
      await fetchTeam(teamId);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove player from team');
      console.error('Error removing player from team:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get youth teams
  const getYouthTeams = () => {
    return teams.filter(team => team.type === 'Youth');
  };

  // Get adult teams
  const getAdultTeams = () => {
    return teams.filter(team => team.type === 'Adult');
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        loading,
        error,
        setCurrentTeam,
        fetchTeams,
        fetchTeam,
        createTeam,
        updateTeam,
        addPlayerToTeam,
        removePlayerFromTeam,
        getYouthTeams,
        getAdultTeams,
        setError
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

TeamProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default TeamProvider;

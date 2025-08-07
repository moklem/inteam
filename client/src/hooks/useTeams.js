import { useContext } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AuthContext } from '../context/AuthContext';
import axios from '../utils/axios';

// API functions
const fetchTeams = async () => {
  const res = await axios.get('/teams');
  return res.data || [];
};

const fetchTeam = async (teamId) => {
  const res = await axios.get(`/teams/${teamId}`);
  return res.data;
};

const createTeam = async (teamData) => {
  const res = await axios.post('/teams', teamData);
  return res.data;
};

const updateTeam = async ({ teamId, updates }) => {
  const res = await axios.put(`/teams/${teamId}`, updates);
  return res.data;
};

const addPlayerToTeam = async ({ teamId, playerId }) => {
  const res = await axios.post(`/teams/${teamId}/players`, { playerId });
  return res.data;
};

const removePlayerFromTeam = async ({ teamId, playerId }) => {
  await axios.delete(`/teams/${teamId}/players/${playerId}`);
  return true;
};

const addCoachToTeam = async ({ teamId, coachId }) => {
  const res = await axios.post(`/teams/${teamId}/coaches`, { coachId });
  return res.data;
};

// Custom hooks
export const useTeams = () => {
  const { user } = useContext(AuthContext);
  
  return useQuery({
    queryKey: ['teams', user?._id],
    queryFn: fetchTeams,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTeam = (teamId) => {
  const { user } = useContext(AuthContext);
  
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId),
    enabled: !!user && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTeam,
    onSuccess: (data) => {
      // Invalidate and refetch teams list
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Add the new team to the cache
      queryClient.setQueryData(['team', data._id], data);
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateTeam,
    onSuccess: (data) => {
      // Update the specific team in cache
      queryClient.setQueryData(['team', data._id], data);
      // Invalidate teams list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

export const useAddPlayerToTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addPlayerToTeam,
    onSuccess: (data) => {
      // Update the specific team in cache
      queryClient.setQueryData(['team', data._id], data);
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Invalidate events as team changes might affect them
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useRemovePlayerFromTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removePlayerFromTeam,
    onSuccess: (_, { teamId }) => {
      // Invalidate the specific team and teams list
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Invalidate events as team changes might affect them
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useAddCoachToTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addCoachToTeam,
    onSuccess: (data) => {
      // Update the specific team in cache
      queryClient.setQueryData(['team', data._id], data);
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

// Helper hooks for filtered data
export const useCoachTeams = () => {
  const { user } = useContext(AuthContext);
  const { data: teams, ...rest } = useTeams();
  
  const coachTeams = teams?.filter(team => 
    team.coaches && team.coaches.some(c => c._id === user?._id)
  ) || [];
  
  return {
    data: coachTeams,
    ...rest
  };
};

export const useYouthTeams = () => {
  const { data: teams, ...rest } = useTeams();
  
  const youthTeams = teams?.filter(team => team.type === 'Youth') || [];
  
  return {
    data: youthTeams,
    ...rest
  };
};

export const useAdultTeams = () => {
  const { data: teams, ...rest } = useTeams();
  
  const adultTeams = teams?.filter(team => team.type === 'Adult') || [];
  
  return {
    data: adultTeams,
    ...rest
  };
};
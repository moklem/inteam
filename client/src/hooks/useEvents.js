import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import axios from '../utils/axios';
import { AuthContext } from '../context/AuthContext';

// API functions
const fetchEvents = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.teamId) {
    queryParams.append('teamId', filters.teamId);
  }
  
  if (filters.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  
  const queryString = queryParams.toString();
  const url = `/events${queryString ? `?${queryString}` : ''}`;
  
  const res = await axios.get(url);
  return res.data || [];
};

const fetchEvent = async (eventId) => {
  const res = await axios.get(`/events/${eventId}`);
  return res.data;
};

const createEvent = async (eventData) => {
  const res = await axios.post('/events', eventData);
  return res.data;
};

const updateEvent = async ({ eventId, eventData }) => {
  const res = await axios.put(`/events/${eventId}`, eventData);
  return res.data;
};

const deleteEvent = async ({ eventId, deleteRecurring = false }) => {
  const url = `/events/${eventId}${deleteRecurring ? '?deleteRecurring=true' : ''}`;
  await axios.delete(url);
  return true;
};

const acceptInvitation = async (eventId) => {
  const res = await axios.post(`/events/${eventId}/accept`);
  return res.data;
};

const declineInvitation = async ({ eventId, reason }) => {
  const res = await axios.post(`/events/${eventId}/decline`, { reason });
  return res.data;
};

const markAsUnsure = async ({ eventId, reason }) => {
  const res = await axios.post(`/events/${eventId}/unsure`, { reason });
  return res.data;
};

const addGuestPlayer = async ({ eventId, playerId, fromTeamId }) => {
  const res = await axios.post(`/events/${eventId}/guests`, {
    playerId,
    fromTeamId
  });
  return res.data;
};

const removeGuestPlayer = async ({ eventId, playerId }) => {
  await axios.delete(`/events/${eventId}/guests/${playerId}`);
  return true;
};

const invitePlayer = async ({ eventId, playerId }) => {
  const res = await axios.post(`/events/${eventId}/invitedPlayers`, {
    playerId
  });
  return res.data;
};

const uninvitePlayer = async ({ eventId, playerId }) => {
  const res = await axios.delete(`/events/${eventId}/invitedPlayers/${playerId}`);
  return res.data;
};

// Custom hooks
export const useEvents = (filters = {}) => {
  const { user } = useContext(AuthContext);
  
  return useQuery({
    queryKey: ['events', user?._id, filters],
    queryFn: () => fetchEvents(filters),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes - events change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEvent = (eventId) => {
  const { user } = useContext(AuthContext);
  
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!user && !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute - individual events need to be more current
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEvent,
    onSuccess: (data) => {
      // Handle both single and recurring event creation
      if (data.events && Array.isArray(data.events)) {
        // Multiple events created (recurring)
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        // Single event created
        queryClient.setQueryData(['event', data._id], data);
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (data) => {
      if (data.message === 'All recurring events updated' || 
          data.message === 'Event converted to recurring series') {
        // Force complete refresh for recurring updates
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        // Update single event
        queryClient.setQueryData(['event', data._id], data);
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_, { eventId, deleteRecurring }) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  
  return useMutation({
    mutationFn: acceptInvitation,
    onMutate: async (eventId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });
      
      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(['events', user?._id]);
      const previousEvent = queryClient.getQueryData(['event', eventId]);
      
      // Optimistically update
      if (previousEvents && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['events', user._id], 
          previousEvents.map(event => {
            if (event._id === eventId) {
              return {
                ...event,
                attendingPlayers: event.attendingPlayers.some(p => p._id === user._id) 
                  ? event.attendingPlayers 
                  : [...event.attendingPlayers, minimalUser],
                invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
                declinedPlayers: event.declinedPlayers.filter(p => p._id !== user._id),
                unsurePlayers: event.unsurePlayers ? event.unsurePlayers.filter(p => p._id !== user._id) : [],
              };
            }
            return event;
          })
        );
      }
      
      if (previousEvent && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['event', eventId], {
          ...previousEvent,
          attendingPlayers: previousEvent.attendingPlayers.some(p => p._id === user._id) 
            ? previousEvent.attendingPlayers 
            : [...previousEvent.attendingPlayers, minimalUser],
          invitedPlayers: previousEvent.invitedPlayers.filter(p => p._id !== user._id),
          declinedPlayers: previousEvent.declinedPlayers.filter(p => p._id !== user._id),
          unsurePlayers: previousEvent.unsurePlayers ? previousEvent.unsurePlayers.filter(p => p._id !== user._id) : [],
        });
      }
      
      return { previousEvents, previousEvent };
    },
    onError: (err, eventId, context) => {
      // Revert optimistic updates on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', user?._id], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
    },
    onSettled: (_, __, eventId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
};

export const useDeclineInvitation = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  
  return useMutation({
    mutationFn: declineInvitation,
    onMutate: async ({ eventId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });
      
      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(['events', user?._id]);
      const previousEvent = queryClient.getQueryData(['event', eventId]);
      
      // Optimistically update
      if (previousEvents && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['events', user._id], 
          previousEvents.map(event => {
            if (event._id === eventId) {
              return {
                ...event,
                declinedPlayers: event.declinedPlayers.some(p => p._id === user._id) 
                  ? event.declinedPlayers 
                  : [...event.declinedPlayers, minimalUser],
                invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
                attendingPlayers: event.attendingPlayers.filter(p => p._id !== user._id),
                unsurePlayers: event.unsurePlayers ? event.unsurePlayers.filter(p => p._id !== user._id) : [],
              };
            }
            return event;
          })
        );
      }
      
      if (previousEvent && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['event', eventId], {
          ...previousEvent,
          declinedPlayers: previousEvent.declinedPlayers.some(p => p._id === user._id) 
            ? previousEvent.declinedPlayers 
            : [...previousEvent.declinedPlayers, minimalUser],
          invitedPlayers: previousEvent.invitedPlayers.filter(p => p._id !== user._id),
          attendingPlayers: previousEvent.attendingPlayers.filter(p => p._id !== user._id),
          unsurePlayers: previousEvent.unsurePlayers ? previousEvent.unsurePlayers.filter(p => p._id !== user._id) : [],
        });
      }
      
      return { previousEvents, previousEvent };
    },
    onError: (err, { eventId }, context) => {
      // Revert optimistic updates on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', user?._id], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
    },
    onSettled: (_, __, { eventId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
};

export const useMarkAsUnsure = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  
  return useMutation({
    mutationFn: markAsUnsure,
    onMutate: async ({ eventId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });
      
      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(['events', user?._id]);
      const previousEvent = queryClient.getQueryData(['event', eventId]);
      
      // Optimistically update
      if (previousEvents && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['events', user._id], 
          previousEvents.map(event => {
            if (event._id === eventId) {
              return {
                ...event,
                unsurePlayers: event.unsurePlayers && event.unsurePlayers.some(p => p._id === user._id) 
                  ? event.unsurePlayers 
                  : [...(event.unsurePlayers || []), minimalUser],
                invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
                attendingPlayers: event.attendingPlayers.filter(p => p._id !== user._id),
                declinedPlayers: event.declinedPlayers.filter(p => p._id !== user._id),
              };
            }
            return event;
          })
        );
      }
      
      if (previousEvent && user) {
        const minimalUser = { _id: user._id, name: user.name };
        
        queryClient.setQueryData(['event', eventId], {
          ...previousEvent,
          unsurePlayers: previousEvent.unsurePlayers && previousEvent.unsurePlayers.some(p => p._id === user._id) 
            ? previousEvent.unsurePlayers 
            : [...(previousEvent.unsurePlayers || []), minimalUser],
          invitedPlayers: previousEvent.invitedPlayers.filter(p => p._id !== user._id),
          attendingPlayers: previousEvent.attendingPlayers.filter(p => p._id !== user._id),
          declinedPlayers: previousEvent.declinedPlayers.filter(p => p._id !== user._id),
        });
      }
      
      return { previousEvents, previousEvent };
    },
    onError: (err, { eventId }, context) => {
      // Revert optimistic updates on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', user?._id], context.previousEvents);
      }
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
    },
    onSettled: (_, __, { eventId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
};

export const useAddGuestPlayer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addGuestPlayer,
    onSuccess: (data) => {
      queryClient.setQueryData(['event', data._id], data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useRemoveGuestPlayer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removeGuestPlayer,
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useInvitePlayer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: invitePlayer,
    onSuccess: (data) => {
      queryClient.setQueryData(['event', data._id], data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useUninvitePlayer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uninvitePlayer,
    onSuccess: (data) => {
      queryClient.setQueryData(['event', data._id], data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

// Helper hooks for filtered data
export const useUpcomingEvents = () => {
  const { data: events, ...rest } = useEvents();
  
  const now = new Date();
  const upcomingEvents = events?.filter(event => new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)) || [];
  
  return {
    data: upcomingEvents,
    ...rest
  };
};

export const usePastEvents = () => {
  const { data: events, ...rest } = useEvents();
  
  const now = new Date();
  const pastEvents = events?.filter(event => new Date(event.startTime) < now)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) || [];
  
  return {
    data: pastEvents,
    ...rest
  };
};

export const useCoachEvents = (coachTeamIds = []) => {
  const { data: events, ...rest } = useEvents();
  
  const coachEvents = events?.filter(event => {
    const eventTeamId = event.team._id || event.team;
    return coachTeamIds.includes(eventTeamId);
  }) || [];
  
  return {
    data: coachEvents,
    ...rest
  };
};
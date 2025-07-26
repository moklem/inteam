import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';

import axios from '../utils/axios';

import { AuthContext } from './AuthContext';
import { TeamContext } from './TeamContext';
import eventEmitter, { EVENTS } from '../utils/eventEmitter';

export const EventContext = createContext();

export const EventProvider = ({ children }) => {
  // Add a refresh timestamp to force updates
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Method to force refresh all data
  const forceRefresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useContext(AuthContext);
  const { currentTeam } = useContext(TeamContext);

  // Fetch events with optional filters - moved before useEffect
  const fetchEvents = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string from filters
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
      const url = `${process.env.REACT_APP_API_URL}/events${queryString ? `?${queryString}` : ''}`;
      
      const res = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setEvents(res.data);
      } else {
        // If no events are returned, reset events to an empty array
        setEvents([]);
      }
      
      return res.data || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch events');
      console.error('Error fetching events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to get team names from event
const getEventTeamNames = (event) => {
  if (event.teams && event.teams.length > 0) {
    return event.teams.map(t => t.name).join(', ');
  }
  return event.team ? event.team.name : '';
};

  // Load events when user or current team changes
  useEffect(() => {
    if (user) {
      if (user.role === 'Trainer' && currentTeam) {
        // For coaches, fetch events for their current team
        fetchEvents({ teamId: currentTeam._id });
      } else if (user.role === 'Spieler' || user.role === 'Jugendspieler') {
        // For players, fetch all events they can see (no team filter)
        fetchEvents();
      }
    } else {
      setEvents([]);
      setCurrentEvent(null);
      setLoading(false);
      setError(null);
    }
  }, [user, currentTeam, fetchEvents, lastRefresh]);
  
  // Listen for event updates from other components
  useEffect(() => {
    const handleEventUpdate = (data) => {
      // Don't immediately refresh all events - let the optimistic update show
      // The delayed fetchEvent in accept/decline/unsure will sync the specific event
      console.log('Event updated:', data);
    };
    
    eventEmitter.on(EVENTS.EVENT_UPDATED, handleEventUpdate);
    
    return () => {
      eventEmitter.off(EVENTS.EVENT_UPDATED, handleEventUpdate);
    };
  }, [user, currentTeam, fetchEvents]);

  // Fetch a specific event by ID
  const fetchEvent = useCallback(async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/events/${eventId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (res.data) {
        // Update the event in the events array
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event._id === res.data._id ? res.data : event
          )
        );
        
        // If this is the current event, update it
        if (currentEvent && currentEvent._id === res.data._id) {
          setCurrentEvent(res.data);
        }
      }
      
      return res.data || null;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch event');
      console.error('Error fetching event:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentEvent]);

  // Create a new event (coach only)
  const createEvent = async (eventData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/events`, eventData);
      
      if (res.data) {
        // Handle response for both single and recurring events
        if (res.data.events && Array.isArray(res.data.events)) {
          // Multiple events created (recurring)
          setEvents(prevEvents => [...prevEvents, ...res.data.events]);
          // Force refresh to ensure consistency
          forceRefresh();
          return res.data; // Return the full response with mainEvent
        } else {
          // Single event created
          setEvents(prevEvents => [...prevEvents, res.data]);
          return res.data;
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
      console.error('Error creating event:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an event (coach only)
  const updateEvent = async (eventId, eventData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`${process.env.REACT_APP_API_URL}/events/${eventId}`, eventData);
      
      if (res.data) {
        // Check if this was a recurring event update
        if (res.data.message === 'All recurring events updated') {
          // Force a complete refresh of all events
          forceRefresh();
          // Also fetch events to ensure we have the latest data
          await fetchEvents({ teamId: currentTeam?._id });
        } else if (res.data.message === 'Event converted to recurring series') {
          // Force a complete refresh when converting to recurring
          forceRefresh();
          await fetchEvents({ teamId: currentTeam?._id });
        } else {
          // Update the single event in the events array
          setEvents(prevEvents =>
            prevEvents.map(event =>
              event._id === res.data._id ? res.data : event
            )
          );
          
          // If this is the current event, update it
          if (currentEvent && currentEvent._id === res.data._id) {
            setCurrentEvent(prevCurrentEvent => ({
              ...prevCurrentEvent,
              ...res.data
            }));
          }
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update event');
      console.error('Error updating event:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an event (coach only)
  const deleteEvent = async (eventId, deleteRecurring = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${process.env.REACT_APP_API_URL}/events/${eventId}${deleteRecurring ? '?deleteRecurring=true' : ''}`;
      await axios.delete(url);
      
      if (deleteRecurring) {
        // Find the event to get its recurringGroupId
        const eventToDelete = events.find(e => e._id === eventId);
        if (eventToDelete && eventToDelete.recurringGroupId) {
          // Remove all events with the same recurringGroupId
          setEvents(prevEvents => 
            prevEvents.filter(event => event.recurringGroupId !== eventToDelete.recurringGroupId)
          );
        }
      } else {
        // Remove only the single event from the events array
        setEvents(prevEvents => prevEvents.filter(event => event._id !== eventId));
      }
      
      // If this is the current event, clear it
      if (currentEvent && currentEvent._id === eventId) {
        setCurrentEvent(null);
      }
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event');
      console.error('Error deleting event:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Accept an event invitation (player only)
  const acceptInvitation = async (eventId) => {
    try {
      setError(null);
      
      // Optimistic update - immediately update local state
      let updatedEvent = null;
      setEvents(prevEvents =>
        prevEvents.map(event => {
          if (event._id === eventId && user) {
            // Remove user from other lists and add to attending (if not already there)
            const isAlreadyAttending = event.attendingPlayers.some(p => p._id === user._id);
            
            // Create a minimal user object with just the required fields
            const minimalUser = { _id: user._id, name: user.name };
            
            // Update guest player status if user is a guest
            const updatedGuestPlayers = event.guestPlayers ? event.guestPlayers.map(guest => {
              if ((guest.player._id || guest.player) === user._id) {
                return { ...guest, status: 'accepted' };
              }
              return guest;
            }) : [];
            
            updatedEvent = {
              ...event,
              attendingPlayers: isAlreadyAttending ? event.attendingPlayers : [...event.attendingPlayers, minimalUser],
              invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
              declinedPlayers: event.declinedPlayers.filter(p => p._id !== user._id),
              unsurePlayers: event.unsurePlayers ? event.unsurePlayers.filter(p => p._id !== user._id) : [],
              guestPlayers: updatedGuestPlayers
            };
            return updatedEvent;
          }
          return event;
        })
      );
      
      // Update currentEvent if it's the same event
      if (currentEvent && currentEvent._id === eventId && updatedEvent) {
        setCurrentEvent(updatedEvent);
      }
      
      // Make the API call
      await axios.post(`${process.env.REACT_APP_API_URL}/events/${eventId}/accept`);
      
      // Emit event update notification
      eventEmitter.emit(EVENTS.EVENT_UPDATED, { eventId, action: 'accept' });

      return true;
    } catch (err) {
      // On error, revert the optimistic update by refreshing
      forceRefresh();
      setError(err.response?.data?.message || 'Failed to accept invitation');
      console.error('Error accepting invitation:', err);
      throw err;
    }
  };

  // Decline an event invitation (player only)
  const declineInvitation = async (eventId, reason) => {
    try {
      setError(null);
      
      // Optimistic update - immediately update local state
      let updatedEvent = null;
      setEvents(prevEvents =>
        prevEvents.map(event => {
          if (event._id === eventId && user) {
            // Remove user from other lists and add to declined (if not already there)
            const isAlreadyDeclined = event.declinedPlayers.some(p => p._id === user._id);
            
            // Create a minimal user object with just the required fields
            const minimalUser = { _id: user._id, name: user.name };
            
            // Update guest player status if user is a guest
            const updatedGuestPlayers = event.guestPlayers ? event.guestPlayers.map(guest => {
              if ((guest.player._id || guest.player) === user._id) {
                return { ...guest, status: 'declined' };
              }
              return guest;
            }) : [];
            
            updatedEvent = {
              ...event,
              declinedPlayers: isAlreadyDeclined ? event.declinedPlayers : [...event.declinedPlayers, minimalUser],
              invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
              attendingPlayers: event.attendingPlayers.filter(p => p._id !== user._id),
              unsurePlayers: event.unsurePlayers ? event.unsurePlayers.filter(p => p._id !== user._id) : [],
              guestPlayers: updatedGuestPlayers
            };
            return updatedEvent;
          }
          return event;
        })
      );
      
      // Update currentEvent if it's the same event
      if (currentEvent && currentEvent._id === eventId && updatedEvent) {
        setCurrentEvent(updatedEvent);
      }
      
      // Make the API call
      await axios.post(`${process.env.REACT_APP_API_URL}/events/${eventId}/decline`, { reason });
      
      // Emit event update notification
      eventEmitter.emit(EVENTS.EVENT_UPDATED, { eventId, action: 'decline' });

      return true;
    } catch (err) {
      // On error, revert the optimistic update by refreshing
      forceRefresh();
      setError(err.response?.data?.message || 'Failed to decline invitation');
      console.error('Error declining invitation:', err);
      throw err;
    }
  };

  // Mark as unsure for an event (player only)
  const markAsUnsure = async (eventId, reason) => {
    try {
      setError(null);
      
      // Optimistic update - immediately update local state
      let updatedEvent = null;
      setEvents(prevEvents =>
        prevEvents.map(event => {
          if (event._id === eventId && user) {
            // Remove user from other lists and add to unsure (if not already there)
            const isAlreadyUnsure = event.unsurePlayers && event.unsurePlayers.some(p => p._id === user._id);
            
            // Create a minimal user object with just the required fields
            const minimalUser = { _id: user._id, name: user.name };
            
            // Update guest player status if user is a guest
            const updatedGuestPlayers = event.guestPlayers ? event.guestPlayers.map(guest => {
              if ((guest.player._id || guest.player) === user._id) {
                return { ...guest, status: 'unsure' };
              }
              return guest;
            }) : [];
            
            updatedEvent = {
              ...event,
              unsurePlayers: isAlreadyUnsure ? event.unsurePlayers : [...(event.unsurePlayers || []), minimalUser],
              invitedPlayers: event.invitedPlayers.filter(p => p._id !== user._id),
              attendingPlayers: event.attendingPlayers.filter(p => p._id !== user._id),
              declinedPlayers: event.declinedPlayers.filter(p => p._id !== user._id),
              guestPlayers: updatedGuestPlayers
            };
            return updatedEvent;
          }
          return event;
        })
      );
      
      // Update currentEvent if it's the same event
      if (currentEvent && currentEvent._id === eventId && updatedEvent) {
        setCurrentEvent(updatedEvent);
      }
      
      // Make the API call
      await axios.post(`${process.env.REACT_APP_API_URL}/events/${eventId}/unsure`, { reason });
      
      // Emit event update notification
      eventEmitter.emit(EVENTS.EVENT_UPDATED, { eventId, action: 'unsure' });

      return true;
    } catch (err) {
      // On error, revert the optimistic update by refreshing
      forceRefresh();
      setError(err.response?.data?.message || 'Failed to mark as unsure');
      console.error('Error marking as unsure:', err);
      throw err;
    }
  };

  // Add a guest player to an event (coach only)
  const addGuestPlayer = async (eventId, playerId, fromTeamId) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/events/${eventId}/guests`, {
        playerId,
        fromTeamId
      });
      
      if (res.data) {
        // Update the event in the events array
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event._id === res.data._id ? res.data : event
          )
        );
        
        // If this is the current event, update it
        if (currentEvent && currentEvent._id === res.data._id) {
          setCurrentEvent(res.data);
        }
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add guest player');
      console.error('Error adding guest player:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove a guest player from an event (coach only)
  const removeGuestPlayer = async (eventId, playerId) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete(`${process.env.REACT_APP_API_URL}/events/${eventId}/guests/${playerId}`);
      
      // Refresh the event data
      await fetchEvent(eventId);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove guest player');
      console.error('Error removing guest player:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Uninvite a player from an event (coach only)
const uninvitePlayer = async (eventId, playerId) => {
  try {
    setLoading(true);
    setError(null);
    
    const res = await axios.delete(`${process.env.REACT_APP_API_URL}/events/${eventId}/invitedPlayers/${playerId}`);
    
    if (res.data) {
      // Update the event in the events array
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === res.data._id ? res.data : event
        )
      );
      
      // If this is the current event, update it
      if (currentEvent && currentEvent._id === res.data._id) {
        setCurrentEvent(res.data);
      }
    }
    
    return res.data;
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to uninvite player');
    console.error('Error uninviting player:', err);
    throw err;
  } finally {
    setLoading(false);
  }
};

// Invite a player to an event (coach only)
const invitePlayer = async (eventId, playerId) => {
  try {
    setLoading(true);
    setError(null);
    
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/events/${eventId}/invitedPlayers`, {
      playerId
    });
    
    if (res.data) {
      // Update the event in the events array
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === res.data._id ? res.data : event
        )
      );
      
      // If this is the current event, update it
      if (currentEvent && currentEvent._id === res.data._id) {
        setCurrentEvent(res.data);
      }
    }
    
    return res.data;
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to invite player');
    console.error('Error inviting player:', err);
    throw err;
  } finally {
    setLoading(false);
  }
};

      // Check if current user can edit an event
    const checkEventEditPermission = useCallback(async (eventId) => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/events/${eventId}/can-edit`);
        return res.data.canEdit;
      } catch (error) {
        console.error('Error checking edit permission:', error);
        return false;
      }
    }, []); // Empty dependency array since it doesn't depend on any state or props

  // Get upcoming events
  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  // Get past events
  const getPastEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.startTime) < now)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  };

  // Get recurring events by group ID
  const getRecurringEvents = (recurringGroupId) => {
    return events.filter(event => event.recurringGroupId === recurringGroupId);
  };

  // Check if user is attending an event
  const isAttending = (eventId) => {
    if (!user) return false;
    
    const event = events.find(e => e._id === eventId);
    if (!event) return false;
    
    return event.attendingPlayers.some(p => p._id === user._id);
  };

  // Check if user has declined an event
  const hasDeclined = (eventId) => {
    if (!user) return false;
    
    const event = events.find(e => e._id === eventId);
    if (!event) return false;
    
    return event.declinedPlayers.some(p => p._id === user._id);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        currentEvent,
        loading,
        error,
        setCurrentEvent,
        fetchEvents,
        fetchEvent,
        createEvent,
        updateEvent,
        deleteEvent,
        acceptInvitation,
        declineInvitation,
        markAsUnsure,
        addGuestPlayer,
        removeGuestPlayer,
        getUpcomingEvents,
        getPastEvents,
        getRecurringEvents,
        isAttending,
        hasDeclined,
        setError,
        checkEventEditPermission,
        uninvitePlayer,
        invitePlayer,
        forceRefresh
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

EventProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default EventProvider;

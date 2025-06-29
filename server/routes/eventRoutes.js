const express = require('express');
const router = express.Router();
const { protect, coach, player } = require('../middleware/authMiddleware');
const Event = require('../models/Event');
const Team = require('../models/Team');
const User = require('../models/User');

// Helper function to generate recurring events
const generateRecurringEvents = (baseEvent, pattern, endDate) => {
  const events = [];
  const startDate = new Date(baseEvent.startTime);
  const endDateTime = new Date(baseEvent.endTime);
  const recurringEndDate = new Date(endDate);
  
  // Calculate the time difference between start and end
  const timeDiff = endDateTime - startDate;
  
  // Generate events based on pattern
  let currentDate = new Date(startDate);
  let increment;
  
  switch (pattern) {
    case 'weekly':
      increment = 7;
      break;
    case 'biweekly':
      increment = 14;
      break;
    case 'monthly':
      increment = 0; // Special handling for monthly
      break;
    default:
      increment = 7;
  }
  
  while (currentDate <= recurringEndDate) {
    const eventData = {
      ...baseEvent,
      startTime: new Date(currentDate),
      endTime: new Date(currentDate.getTime() + timeDiff),
      isRecurringInstance: true,
      originalStartTime: baseEvent.startTime
    };
    
    events.push(eventData);
    
    // Move to next occurrence
    if (pattern === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + increment);
    }
  }
  
  return events;
};

// @route   POST /api/events
// @desc    Create a new event (with optional recurring)
// @access  Private/Coach
router.post('/', protect, coach, async (req, res) => {
  try {
    const { 
      title, 
      type, 
      startTime, 
      endTime, 
      location, 
      team, 
      description, 
      invitedPlayers,
      isOpenAccess,
      isRecurring,
      recurringPattern,
      recurringEndDate
    } = req.body;

    // Check if team exists
    const teamExists = await Team.findById(team);
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if coach is authorized to create events for this team
    if (!teamExists.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to create events for this team' });
    }

    // Base event data
    const baseEventData = {
      title,
      type,
      startTime,
      endTime,
      location,
      team,
      description,
      createdBy: req.user._id,
      invitedPlayers: invitedPlayers || teamExists.players,
      attendingPlayers: [],
      declinedPlayers: [],
      guestPlayers: [],
      isOpenAccess: isOpenAccess || false
    };

    let createdEvents = [];

    if (isRecurring && recurringPattern && recurringEndDate) {
      // Create the first event as the recurring group parent
      const parentEvent = await Event.create({
        ...baseEventData,
        isRecurring: true,
        recurringPattern,
        recurringEndDate
      });

      // Update parent event with its own ID as recurringGroupId
      parentEvent.recurringGroupId = parentEvent._id;
      await parentEvent.save();
      
      createdEvents.push(parentEvent);

      // Generate recurring instances
      const recurringInstances = generateRecurringEvents(
        baseEventData,
        recurringPattern,
        recurringEndDate
      );

      // Skip the first instance (already created as parent)
      for (let i = 1; i < recurringInstances.length; i++) {
        const instance = await Event.create({
          ...recurringInstances[i],
          recurringGroupId: parentEvent._id,
          isRecurring: false,
          isRecurringInstance: true
        });
        createdEvents.push(instance);
      }
    } else {
      // Create single event
      const event = await Event.create(baseEventData);
      createdEvents.push(event);
    }

    if (createdEvents.length > 0) {
      res.status(201).json({
        message: isRecurring ? `${createdEvents.length} recurring events created` : 'Event created',
        events: createdEvents,
        mainEvent: createdEvents[0]
      });
    } else {
      res.status(400).json({ message: 'Invalid event data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events
// @desc    Get all events
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let events;
    const filter = {};
    
    // Add date filter if provided
    if (req.query.date) {
      const date = new Date(req.query.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      filter.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // If user is a coach, get all events
    if (req.user.role === 'Trainer') {
      events = await Event.find({ ...filter })
        .populate('team', 'name type')
        .populate('invitedPlayers', 'name email position')
        .populate('attendingPlayers', 'name email position')
        .populate('declinedPlayers', 'name email position')
        .populate({
          path: 'guestPlayers.player',
          select: 'name email position'
        })
        .populate({
          path: 'guestPlayers.fromTeam',
          select: 'name type'
        })
        .sort({ startTime: 1 });
    } else {
      // For players (Spieler and Jugendspieler), get events where:
      // 1. They are explicitly invited
      // 2. They are already attending or declined
      // 3. They are a guest player
      // 4. The event has open access
      // 5. NEW: The event belongs to one of their teams
      
      // First, get all teams the player belongs to
      const playerTeams = await Team.find({ 
        players: req.user._id 
      }).select('_id');
      
      const teamIds = playerTeams.map(team => team._id);
      
      // Now query events with the updated filter
      events = await Event.find({
        $or: [
          { team: { $in: teamIds } }, // NEW: Events for player's teams
          { invitedPlayers: req.user._id },
          { attendingPlayers: req.user._id },
          { declinedPlayers: req.user._id },
          { 'guestPlayers.player': req.user._id },
          { isOpenAccess: true }
        ],
        ...filter
      })
        .populate('team', 'name type')
        .populate('invitedPlayers', 'name email position')
        .populate('attendingPlayers', 'name email position')
        .populate('declinedPlayers', 'name email position')
        .populate({
          path: 'guestPlayers.player',
          select: 'name email position'
        })
        .populate({
          path: 'guestPlayers.fromTeam',
          select: 'name type'
        })
        .sort({ startTime: 1 });
    }
    
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('team', 'name type')
      .populate('createdBy', 'name email')
      .populate('invitedPlayers', 'name email position')
      .populate('attendingPlayers', 'name email position')
      .populate('declinedPlayers', 'name email position')
      .populate({
        path: 'guestPlayers.player',
        select: 'name email position'
      })
      .populate({
        path: 'guestPlayers.fromTeam',
        select: 'name type'
      });
    
    if (event) {
      // Check if user is authorized to view this event
      const team = await Team.findById(event.team);
      
      if (
        req.user.role === 'Trainer' || 
        event.isOpenAccess ||
        event.invitedPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.attendingPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.declinedPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.guestPlayers.some(g => g.player._id.toString() === req.user._id.toString())
      ) {
        res.json(event);
      } else {
        res.status(403).json({ message: 'Not authorized to view this event' });
      }
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private/Coach
router.put('/:id', protect, coach, async (req, res) => {
  try {
    const { 
      title, 
      type, 
      startTime, 
      endTime, 
      location, 
      description, 
      invitedPlayers,
      isOpenAccess,
      team,
      updateRecurring,
      convertToRecurring,
      recurringPattern,
      recurringEndDate
    } = req.body;
    
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Check if coach is authorized to update this event
      const eventTeam = await Team.findById(event.team);
      
      if (!eventTeam.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }
      
      // If changing team, check authorization for new team
      if (team && team !== event.team.toString()) {
        const newTeam = await Team.findById(team);
        if (!newTeam || !newTeam.coaches.includes(req.user._id)) {
          return res.status(403).json({ message: 'Not authorized to move event to this team' });
        }
      }
      
      // Handle converting single event to recurring
      if (convertToRecurring && recurringPattern && recurringEndDate && !event.isRecurring && !event.isRecurringInstance) {
        // Update current event to be recurring parent
        event.isRecurring = true;
        event.recurringPattern = recurringPattern;
        event.recurringEndDate = recurringEndDate;
        event.recurringGroupId = event._id;
        
        // Update other fields
        if (title) event.title = title;
        if (type) event.type = type;
        if (startTime) event.startTime = startTime;
        if (endTime) event.endTime = endTime;
        if (location) event.location = location;
        if (description !== undefined) event.description = description;
        if (invitedPlayers) event.invitedPlayers = invitedPlayers;
        if (isOpenAccess !== undefined) event.isOpenAccess = isOpenAccess;
        if (team) event.team = team;
        
        await event.save();
        
        // Generate recurring instances
        const baseEventData = {
          title: event.title,
          type: event.type,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          team: event.team,
          description: event.description,
          createdBy: event.createdBy,
          invitedPlayers: event.invitedPlayers,
          attendingPlayers: [],
          declinedPlayers: [],
          guestPlayers: [],
          isOpenAccess: event.isOpenAccess
        };
        
        const recurringInstances = generateRecurringEvents(
          baseEventData,
          recurringPattern,
          recurringEndDate
        );
        
        // Create instances (skip first as it's the parent)
        for (let i = 1; i < recurringInstances.length; i++) {
          await Event.create({
            ...recurringInstances[i],
            recurringGroupId: event._id,
            isRecurring: false,
            isRecurringInstance: true
          });
        }
        
        res.json({ message: 'Event converted to recurring series', event });
      }
      // If this is a recurring event and updateRecurring is true, update all instances
      else if (event.recurringGroupId && updateRecurring) {
        const updateData = {};
        if (title) updateData.title = title;
        if (type) updateData.type = type;
        if (location) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (invitedPlayers) updateData.invitedPlayers = invitedPlayers;
        if (isOpenAccess !== undefined) updateData.isOpenAccess = isOpenAccess;
        if (team) updateData.team = team;
        
        // Update all events in the recurring group
        await Event.updateMany(
          { recurringGroupId: event.recurringGroupId },
          updateData
        );
        
        // If updating time, we need to handle each instance individually
        if (startTime || endTime) {
          const recurringEvents = await Event.find({ recurringGroupId: event.recurringGroupId });
          
          for (const recurringEvent of recurringEvents) {
            if (startTime) {
              const newStartTime = new Date(startTime);
              const originalStartTime = new Date(recurringEvent.originalStartTime || recurringEvent.startTime);
              newStartTime.setFullYear(originalStartTime.getFullYear());
              newStartTime.setMonth(originalStartTime.getMonth());
              newStartTime.setDate(originalStartTime.getDate());
              recurringEvent.startTime = newStartTime;
            }
            
            if (endTime) {
              const newEndTime = new Date(endTime);
              const originalEndTime = new Date(recurringEvent.endTime);
              newEndTime.setFullYear(originalEndTime.getFullYear());
              newEndTime.setMonth(originalEndTime.getMonth());
              newEndTime.setDate(originalEndTime.getDate());
              recurringEvent.endTime = newEndTime;
            }
            
            await recurringEvent.save();
          }
        }
        
        res.json({ message: 'All recurring events updated' });
      } else {
        // Update single event
        event.title = title || event.title;
        event.type = type || event.type;
        event.startTime = startTime || event.startTime;
        event.endTime = endTime || event.endTime;
        event.location = location || event.location;
        event.description = description !== undefined ? description : event.description;
        if (invitedPlayers) event.invitedPlayers = invitedPlayers;
        if (isOpenAccess !== undefined) event.isOpenAccess = isOpenAccess;
        if (team) event.team = team;
        
        const updatedEvent = await event.save();
        res.json(updatedEvent);
      }
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private/Coach
router.delete('/:id', protect, coach, async (req, res) => {
  try {
    const { deleteRecurring } = req.query;
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Check if coach is authorized to delete this event
      const team = await Team.findById(event.team);
      
      if (!team.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }
      
      // If this is a recurring event and deleteRecurring is true, delete all instances
      if (event.recurringGroupId && deleteRecurring === 'true') {
        await Event.deleteMany({ recurringGroupId: event.recurringGroupId });
        res.json({ message: 'All recurring events removed' });
      } else {
        await event.remove();
        res.json({ message: 'Event removed' });
      }
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/accept
// @desc    Accept event invitation
// @access  Private/Player
router.post('/:id/accept', protect, player, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Check if player is invited to this event or if it's open access
      if (!event.isOpenAccess && 
          !event.isPlayerInvited(req.user._id) && 
          !event.guestPlayers.some(g => g.player.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not invited to this event' });
      }
      
      event.acceptInvitation(req.user._id);
      await event.save();
      
      res.json({ message: 'Invitation accepted' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/decline
// @desc    Decline event invitation
// @access  Private/Player
router.post('/:id/decline', protect, player, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Check if player is invited to this event or if it's open access
      if (!event.isOpenAccess && 
          !event.isPlayerInvited(req.user._id) && 
          !event.guestPlayers.some(g => g.player.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not invited to this event' });
      }
      
      event.declineInvitation(req.user._id);
      await event.save();
      
      res.json({ message: 'Invitation declined' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/guests
// @desc    Add guest player to event
// @access  Private/Coach
router.post('/:id/guests', protect, coach, async (req, res) => {
  try {
    const { playerId, fromTeamId } = req.body;
    
    const event = await Event.findById(req.params.id);
    const player = await User.findById(playerId);
    const fromTeam = await Team.findById(fromTeamId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    if (!fromTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if coach is authorized to update this event
    const team = await Team.findById(event.team);
    
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Check if player is already a guest
    if (event.guestPlayers.some(g => g.player.toString() === playerId)) {
      return res.status(400).json({ message: 'Player is already a guest' });
    }
    
    // Add guest player
    event.guestPlayers.push({
      player: playerId,
      fromTeam: fromTeamId
    });
    
    await event.save();
    
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id/guests/:playerId
// @desc    Remove guest player from event
// @access  Private/Coach
router.delete('/:id/guests/:playerId', protect, coach, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if coach is authorized to update this event
    const team = await Team.findById(event.team);
    
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Remove guest player
    event.guestPlayers = event.guestPlayers.filter(
      g => g.player.toString() !== req.params.playerId
    );
    
    await event.save();
    
    res.json({ message: 'Guest player removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
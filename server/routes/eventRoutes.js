const express = require('express');
const router = express.Router();
const { protect, coach, player } = require('../middleware/authMiddleware');
const Event = require('../models/Event');
const Team = require('../models/Team');
const User = require('../models/User');
const { sendGuestInvitation } = require('../controllers/notificationController');
const { scheduleEventNotifications } = require('../utils/notificationQueue');

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
      teams, 
      description, 
      invitedPlayers,
      isOpenAccess,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      organizingTeam,
      notificationSettings
    } = req.body;

    // Handle both single team (legacy) and multiple teams
    const teamIds = teams || (team ? [team] : []);
    
    if (teamIds.length === 0) {
      return res.status(400).json({ message: 'At least one team is required' });
    }

    // Determine organizing team (the team the coach belongs to)
    let organizingTeamId = organizingTeam;
    
    if (!organizingTeamId) {
      // Find the first team where the user is a coach
      const coachTeams = await Team.find({ 
        _id: { $in: teamIds },
        coaches: req.user._id 
      });
      
      if (coachTeams.length === 0) {
        return res.status(403).json({ 
          message: 'You must be a coach of at least one of the selected teams' 
        });
      }
      
      organizingTeamId = coachTeams[0]._id;
    } else {
      // Verify the coach is authorized for the organizing team
      const orgTeam = await Team.findById(organizingTeamId);
      if (!orgTeam || !orgTeam.coaches.includes(req.user._id)) {
        return res.status(403).json({ 
          message: 'You must be a coach of the organizing team' 
        });
      }
    }

    // Verify all teams exist (but don't require coach authorization for all)
    const teamChecks = await Promise.all(
      teamIds.map(async (teamId) => {
        const teamExists = await Team.findById(teamId).populate('players', '_id');
        if (!teamExists) {
          return { exists: false, teamId };
        }
        return { exists: true, team: teamExists };
      })
    );

    const nonExistentTeams = teamChecks.filter(check => check.exists === false);
    if (nonExistentTeams.length > 0) {
      return res.status(404).json({ message: 'One or more teams not found' });
    }

    // Get all players from all selected teams (remove duplicates)
    const allTeamPlayers = [...new Set(
      teamChecks.flatMap(check => check.team.players.map(p => p._id.toString()))
    )];

    // Base event data
    const baseEventData = {
      title,
      type,
      startTime,
      endTime,
      location,
      teams: teamIds,
      organizingTeam: organizingTeamId,
      team: organizingTeamId, // Keep for backward compatibility
      description,
      createdBy: req.user._id,
      invitedPlayers: invitedPlayers || teamExists.players,
      attendingPlayers: [],
      declinedPlayers: [],
      unsurePlayers: [],
      playerResponses: [],
      guestPlayers: [],
      isOpenAccess: isOpenAccess || false,
      notificationSettings: notificationSettings || {
        enabled: true,
        reminderTimes: [
          { hours: 24, minutes: 0 },
          { hours: 1, minutes: 0 }
        ],
        customMessage: ''
      }
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
      // Schedule notifications for all created events
      for (const event of createdEvents) {
        await scheduleEventNotifications(event._id);
      }
      
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
        .populate('teams', 'name type')
        .populate('organizingTeam', 'name type')
        .populate('invitedPlayers', 'name email position')
        .populate('attendingPlayers', 'name email position')
        .populate('declinedPlayers', 'name email position')
        .populate('unsurePlayers', 'name email position')
        .populate('uninvitedPlayers', 'name email position')
        .populate({
          path: 'playerResponses.player',
          select: 'name email position'
        })
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
          { uninvitedPlayers: req.user._id },
          { isOpenAccess: true }
        ],
        ...filter
      })
        .populate('team', 'name type')
        .populate('teams', 'name type')
        .populate('organizingTeam', 'name type')
        .populate('invitedPlayers', 'name email position')
        .populate('attendingPlayers', 'name email position')
        .populate('declinedPlayers', 'name email position')
        .populate('unsurePlayers', 'name email position')
        .populate('uninvitedPlayers', 'name email position')
        .populate({
          path: 'playerResponses.player',
          select: 'name email position'
        })
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
      .populate('teams', 'name type')
      .populate('organizingTeam', 'name type')
      .populate('createdBy', 'name email')
      .populate('invitedPlayers', 'name email position')
      .populate('attendingPlayers', 'name email position')
      .populate('declinedPlayers', 'name email position')
      .populate('unsurePlayers', 'name email position')
      .populate('uninvitedPlayers', 'name email position')
      .populate({
        path: 'playerResponses.player',
        select: 'name email position'
      })
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
      
      // Allow access if:
      // 1. User is a coach
      // 2. Event is open access
      // 3. User is invited
      // 4. User has already responded (attending/declined)
      // 5. User is a guest player
      // 6. User is a member of the team (NEW)
      if (
        req.user.role === 'Trainer' || 
        event.isOpenAccess ||
        event.invitedPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.attendingPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.declinedPlayers.some(p => p._id.toString() === req.user._id.toString()) ||
        event.guestPlayers.some(g => g.player._id.toString() === req.user._id.toString()) ||
        team.players.includes(req.user._id) // Add this line
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
      teams,
      organizingTeam, 
      updateRecurring,
      convertToRecurring,
      recurringPattern,
      recurringEndDate,
      weekday,
      notificationSettings
    } = req.body;
    
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Check if coach is authorized to update this event
      // Check if coach is authorized to update this event (must be coach of organizing team)
      const orgTeam = await Team.findById(event.organizingTeam || event.team);
      
      if (!orgTeam || !orgTeam.coaches.includes(req.user._id)) {
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
        if (notificationSettings) event.notificationSettings = notificationSettings;
        
        await event.save();
        
        // Schedule notifications for the parent event
        await scheduleEventNotifications(event._id);
        
        // Generate recurring instances
        const baseEventData = {
          title: event.title,
          type: event.type,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          team: event.team,
          organizingTeam: event.organizingTeam || event.team,
          description: event.description,
          createdBy: event.createdBy,
          invitedPlayers: event.invitedPlayers,
          attendingPlayers: [],
          declinedPlayers: [],
          unsurePlayers: [],
          playerResponses: [],
          guestPlayers: [],
          isOpenAccess: event.isOpenAccess,
          notificationSettings: event.notificationSettings
        };
        
        const recurringInstances = generateRecurringEvents(
          baseEventData,
          recurringPattern,
          recurringEndDate
        );
        
        // Create instances (skip first as it's the parent)
        for (let i = 1; i < recurringInstances.length; i++) {
          const instance = await Event.create({
            ...recurringInstances[i],
            recurringGroupId: event._id,
            isRecurring: false,
            isRecurringInstance: true
          });
          
          // Schedule notifications for each instance
          await scheduleEventNotifications(instance._id);
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
        if (notificationSettings) updateData.notificationSettings = notificationSettings;
        if (teams) event.teams = teams;
        if (organizingTeam) event.organizingTeam = organizingTeam;
        
        // Update all events in the recurring group
        await Event.updateMany(
          { recurringGroupId: event.recurringGroupId },
          updateData
        );
        
        // Schedule notifications for all events in the recurring group
        const recurringEvents = await Event.find({ 
          $or: [
            { _id: event.recurringGroupId },
            { recurringGroupId: event.recurringGroupId }
          ]
        });
        
        for (const recurringEvent of recurringEvents) {
          await scheduleEventNotifications(recurringEvent._id);
        }
        
        // If updating time or weekday, we need to handle each instance individually
        if (startTime || endTime || weekday !== undefined) {
          const recurringEvents = await Event.find({ 
            $or: [
              { _id: event.recurringGroupId }, // Include parent
              { recurringGroupId: event.recurringGroupId } // Include all instances
            ]
          });
          
          for (const recurringEvent of recurringEvents) {
            // Update weekday if provided
            if (weekday !== undefined) {
              const currentDate = new Date(recurringEvent.startTime);
              const currentDay = currentDate.getDay();
              const dayDiff = weekday - currentDay;
              
              // Adjust the date to the new weekday
              const newStartDate = new Date(currentDate);
              newStartDate.setDate(currentDate.getDate() + dayDiff);
              
              // Apply time changes if provided
              if (startTime) {
                const newStartTime = new Date(startTime);
                newStartDate.setHours(newStartTime.getHours(), newStartTime.getMinutes());
              }
              
              recurringEvent.startTime = newStartDate;
              
              // Update end time accordingly
              if (endTime) {
                const newEndTime = new Date(endTime);
                const newEndDate = new Date(newStartDate);
                newEndDate.setHours(newEndTime.getHours(), newEndTime.getMinutes());
                recurringEvent.endTime = newEndDate;
              } else {
                // Maintain the same duration
                const duration = new Date(recurringEvent.endTime) - new Date(recurringEvent.originalStartTime || currentDate);
                recurringEvent.endTime = new Date(newStartDate.getTime() + duration);
              }
            } else {
              // Only time changes, no weekday change
              if (startTime) {
                const newStartTime = new Date(startTime);
                const originalStartTime = new Date(recurringEvent.startTime);
                originalStartTime.setHours(newStartTime.getHours(), newStartTime.getMinutes());
                recurringEvent.startTime = originalStartTime;
              }
              
              if (endTime) {
                const newEndTime = new Date(endTime);
                const originalEndTime = new Date(recurringEvent.endTime);
                originalEndTime.setHours(newEndTime.getHours(), newEndTime.getMinutes());
                recurringEvent.endTime = originalEndTime;
              }
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
        if (teams) event.teams = teams;
        if (organizingTeam) event.organizingTeam = organizingTeam;
        if (notificationSettings) event.notificationSettings = notificationSettings;  
        
        const updatedEvent = await event.save();
        
        // Schedule notifications for the updated event
        await scheduleEventNotifications(updatedEvent._id);
        
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
      // Check if coach is authorized to delete this event (must be coach of organizing team)
      const orgTeam = await Team.findById(event.organizingTeam || event.team);
      
      if (!orgTeam || !orgTeam.coaches.includes(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }
      
      // If this is a recurring event and deleteRecurring is true, delete all instances
      if (event.recurringGroupId && deleteRecurring === 'true') {
        await Event.deleteMany({ recurringGroupId: event.recurringGroupId });
        res.json({ message: 'All recurring events removed' });
      } else {
        await event.deleteOne();
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
      // Get the team to check if user is a member
      const team = await Team.findById(event.team);
      const isTeamMember = team.players.some(p => p.toString() === req.user._id.toString());
      
      // Check if player is invited to this event, if it's open access, or if they're a team member
      if (!event.isOpenAccess && 
          !event.isPlayerInvited(req.user._id) && 
          !event.guestPlayers.some(g => g.player.toString() === req.user._id.toString()) &&
          !isTeamMember) {
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
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Grund für Absage ist erforderlich' });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Get the team to check if user is a member
      const team = await Team.findById(event.team);
      const isTeamMember = team.players.some(p => p.toString() === req.user._id.toString());
      
      // Check if player is invited to this event, if it's open access, or if they're a team member
      if (!event.isOpenAccess && 
          !event.isPlayerInvited(req.user._id) && 
          !event.guestPlayers.some(g => g.player.toString() === req.user._id.toString()) &&
          !isTeamMember) {
        return res.status(403).json({ message: 'Not invited to this event' });
      }
      
      event.declineInvitation(req.user._id, reason);
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

// @route   POST /api/events/:id/unsure
// @desc    Mark as unsure for event
// @access  Private/Player
router.post('/:id/unsure', protect, player, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Grund für Unsicherheit ist erforderlich' });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (event) {
      // Get the team to check if user is a member
      const team = await Team.findById(event.team);
      const isTeamMember = team.players.some(p => p.toString() === req.user._id.toString());
      
      // Check if player is invited to this event, if it's open access, or if they're a team member
      if (!event.isOpenAccess && 
          !event.isPlayerInvited(req.user._id) && 
          !event.guestPlayers.some(g => g.player.toString() === req.user._id.toString()) &&
          !isTeamMember) {
        return res.status(403).json({ message: 'Not invited to this event' });
      }
      
      event.markAsUnsure(req.user._id, reason);
      await event.save();
      
      res.json({ message: 'Als unsicher markiert' });
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
    
    // FIXED: Complete the authorization check
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to invite players to this event' });
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
    
    // Send notification to the guest player
    try {
      await sendGuestInvitation(playerId, {
        invitationId: event._id,
        teamName: team.name,
        eventTitle: event.title,
        eventDate: event.startTime,
        teamId: team._id
      });
    } catch (notificationError) {
      console.error('Failed to send guest invitation notification:', notificationError);
      // Don't fail the whole request if notification fails
    }
    
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id/invitedPlayers/:playerId
// @desc    Uninvite a player from event
// @access  Private/Coach
router.delete('/:id/invitedPlayers/:playerId', protect, coach, async (req, res) => {
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
    
    // Remove player from all arrays
    event.invitedPlayers = event.invitedPlayers.filter(
      p => p.toString() !== req.params.playerId
    );
    event.attendingPlayers = event.attendingPlayers.filter(
      p => p.toString() !== req.params.playerId
    );
    event.declinedPlayers = event.declinedPlayers.filter(
      p => p.toString() !== req.params.playerId
    );
    event.unsurePlayers = event.unsurePlayers.filter(
      p => p.toString() !== req.params.playerId
    );
    
    // Remove from playerResponses if present
    event.playerResponses = event.playerResponses.filter(
      response => response.player.toString() !== req.params.playerId
    );

    if (!event.uninvitedPlayers.includes(req.params.playerId)) {
      event.uninvitedPlayers.push(req.params.playerId);
    }
    
    await event.save();
    
    // Populate the event before sending response
    const updatedEvent = await Event.findById(event._id)
      .populate('team', 'name type')
      .populate('teams', 'name type')
      .populate('organizingTeam', 'name type')
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
    
    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/invitedPlayers
// @desc    Invite a player to event
// @access  Private/Coach
router.post('/:id/invitedPlayers', protect, coach, async (req, res) => {
  try {
    const { playerId } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if coach is authorized to update this event
    const team = await Team.findById(event.team);
    
    if (!team.coaches.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Check if player is already invited
    if (event.invitedPlayers.includes(playerId) || 
        event.attendingPlayers.includes(playerId) || 
        event.declinedPlayers.includes(playerId)) {
      return res.status(400).json({ message: 'Player is already invited to this event' });
    }
    
    // Add player to invited list
    event.invitedPlayers.push(playerId);

    // Remove from uninvited players if present
    event.uninvitedPlayers = event.uninvitedPlayers.filter(
      p => p.toString() !== playerId
    );
    
    await event.save();
    
    // Populate the event before sending response
    const updatedEvent = await Event.findById(event._id)
      .populate('team', 'name type')
      .populate('teams', 'name type')
      .populate('organizingTeam', 'name type')
      .populate('createdBy', 'name')
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
    
    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/:id/can-edit
// @desc    Check if current user can edit this event
// @access  Private
router.get('/:id/can-edit', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('team');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is a coach AND part of the event's team
    const canEdit = req.user.role === 'Trainer' && 
                    event.team.coaches.some(coach => coach.toString() === req.user._id.toString());
    
    res.json({ canEdit });
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

// @route   POST /api/events/:id/guest/accept
// @desc    Accept guest player invitation
// @access  Private/Player
router.post('/:id/guest/accept', protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const playerId = req.user._id;
    
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is in guest players list
    const isGuest = event.guestPlayers.some(g => g.player.toString() === playerId.toString());
    
    if (!isGuest) {
      return res.status(400).json({ message: 'You are not invited as a guest for this event' });
    }
    
    // Check if already attending
    if (event.attendingPlayers.includes(playerId)) {
      return res.status(400).json({ message: 'You are already attending this event' });
    }
    
    // Add to attending players
    event.attendingPlayers.push(playerId);
    
    // Remove from declined players if present
    event.declinedPlayers = event.declinedPlayers.filter(p => p.toString() !== playerId.toString());
    
    await event.save();
    
    res.json({ message: 'Guest invitation accepted successfully' });
  } catch (error) {
    console.error('Accept guest invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/guest/decline
// @desc    Decline guest player invitation
// @access  Private/Player
router.post('/:id/guest/decline', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const eventId = req.params.id;
    const playerId = req.user._id;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Grund für Absage ist erforderlich' });
    }
    
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is in guest players list
    const isGuest = event.guestPlayers.some(g => g.player.toString() === playerId.toString());
    
    if (!isGuest) {
      return res.status(400).json({ message: 'You are not invited as a guest for this event' });
    }
    
    // Check if already declined
    if (event.declinedPlayers.includes(playerId)) {
      return res.status(400).json({ message: 'You have already declined this event' });
    }
    
    // Use the declineInvitation method which now handles reasons
    event.declineInvitation(playerId, reason);
    
    await event.save();
    
    res.json({ message: 'Guest invitation declined successfully' });
  } catch (error) {
    console.error('Decline guest invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/guest/unsure
// @desc    Mark guest as unsure for event
// @access  Private/Player
router.post('/:id/guest/unsure', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const eventId = req.params.id;
    const playerId = req.user._id;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Grund für Unsicherheit ist erforderlich' });
    }
    
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is in guest players list
    const isGuest = event.guestPlayers.some(g => g.player.toString() === playerId.toString());
    
    if (!isGuest) {
      return res.status(400).json({ message: 'You are not invited as a guest for this event' });
    }
    
    // Use the markAsUnsure method
    event.markAsUnsure(playerId, reason);
    
    await event.save();
    
    res.json({ message: 'Als unsicher markiert' });
  } catch (error) {
    console.error('Mark guest unsure error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
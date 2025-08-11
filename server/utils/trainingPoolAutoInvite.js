const Event = require('../models/Event');
const TrainingPool = require('../models/TrainingPool');

/**
 * Process training pool auto-invite for a specific event
 * This can be called immediately when conditions are met
 */
const processTrainingPoolAutoInvite = async (eventId) => {
  try {
    const event = await Event.findById(eventId)
      .populate('invitedPlayers')
      .populate('attendingPlayers')
      .populate('declinedPlayers')
      .populate('unsurePlayers')
      .populate('trainingPoolAutoInvite.poolId');

    if (!event) {
      console.log(`Event ${eventId} not found`);
      return { success: false, message: 'Event not found' };
    }

    // Check if auto-invite is enabled and not already sent
    if (!event.trainingPoolAutoInvite?.enabled || 
        !event.trainingPoolAutoInvite?.poolId ||
        event.trainingPoolAutoInvite?.invitesSent) {
      return { success: false, message: 'Auto-invite not enabled or already sent' };
    }

    const now = new Date();
    
    // Check trigger conditions
    let shouldTrigger = false;
    
    if (event.trainingPoolAutoInvite.triggerType === 'deadline') {
      // Check if voting deadline has passed
      if (event.votingDeadline && now >= new Date(event.votingDeadline)) {
        shouldTrigger = true;
        console.log(`Voting deadline passed for event ${event.title}, triggering auto-invite`);
      }
    } else if (event.trainingPoolAutoInvite.triggerType === 'hours_before') {
      // Check if we're within the hours_before window
      const hoursBeforeEvent = event.trainingPoolAutoInvite.hoursBeforeEvent || 24;
      const triggerTime = new Date(event.startTime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);
      
      if (now >= triggerTime) {
        shouldTrigger = true;
        console.log(`Within ${hoursBeforeEvent} hours of event ${event.title}, triggering auto-invite`);
      }
    }

    if (!shouldTrigger) {
      return { success: false, message: 'Trigger conditions not met yet' };
    }

    // Count current participants (attending + unsure)
    const currentParticipants = event.attendingPlayers.length + 
                              (event.unsurePlayers?.length || 0);
    const minParticipants = event.trainingPoolAutoInvite.minParticipants || 6;
    
    console.log(`Event ${event.title}: ${currentParticipants} current participants, ${minParticipants} minimum needed`);
    
    if (currentParticipants >= minParticipants) {
      // Mark as processed even though we didn't invite anyone
      event.trainingPoolAutoInvite.invitesSent = true;
      event.trainingPoolAutoInvite.invitesSentAt = now;
      await event.save();
      return { success: true, message: 'Event has enough participants, no auto-invite needed', playersInvited: 0 };
    }

    // Get the pool with approved players
    const pool = await TrainingPool.findById(event.trainingPoolAutoInvite.poolId)
      .populate('approvedPlayers.player');
    
    if (!pool) {
      console.error(`Training pool ${event.trainingPoolAutoInvite.poolId} not found`);
      return { success: false, message: 'Training pool not found' };
    }

    // Get players from pool who are not already involved with the event
    const alreadyInvitedIds = new Set([
      ...event.invitedPlayers.map(p => p._id?.toString() || p.toString()),
      ...event.attendingPlayers.map(p => p._id?.toString() || p.toString()),
      ...event.declinedPlayers.map(p => p._id?.toString() || p.toString()),
      ...(event.unsurePlayers || []).map(p => p._id?.toString() || p.toString()),
      ...(event.guestPlayers || []).map(g => g.player?._id?.toString() || g.player?.toString()).filter(Boolean)
    ]);
    
    const availablePoolPlayers = pool.approvedPlayers.filter(
      ap => ap.player && !alreadyInvitedIds.has(ap.player._id.toString())
    );
    
    console.log(`Found ${availablePoolPlayers.length} available players in pool ${pool.name}`);
    
    if (availablePoolPlayers.length === 0) {
      // Mark as processed even though we couldn't invite anyone
      event.trainingPoolAutoInvite.invitesSent = true;
      event.trainingPoolAutoInvite.invitesSentAt = now;
      await event.save();
      return { success: true, message: 'No available players in pool', playersInvited: 0 };
    }
    
    // Sort by rating (highest first) and attendance (highest first)
    availablePoolPlayers.sort((a, b) => {
      const ratingDiff = (b.currentRating || 0) - (a.currentRating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.attendancePercentage || 0) - (a.attendancePercentage || 0);
    });
    
    // ALWAYS invite ALL available players from the pool (not just the ones needed)
    const playersToInvite = availablePoolPlayers;
    const invitedPlayerIds = [];
    
    for (const poolPlayer of playersToInvite) {
      // Add as guest player from pool
      if (!event.guestPlayers) {
        event.guestPlayers = [];
      }
      
      event.guestPlayers.push({
        player: poolPlayer.player._id,
        fromTeam: pool.team // Use pool's team as the source team
      });
      
      // Also add to invited players
      event.invitedPlayers.push(poolPlayer.player._id);
      invitedPlayerIds.push(poolPlayer.player._id);
      
      console.log(`Auto-invited player ${poolPlayer.player.name} from pool ${pool.name}`);
    }
    
    // Mark that invites have been sent
    event.trainingPoolAutoInvite.invitesSent = true;
    event.trainingPoolAutoInvite.invitesSentAt = now;
    event.trainingPoolAutoInvite.invitedPoolPlayers = invitedPlayerIds;
    
    // Update pool statistics
    if (!pool.statistics) {
      pool.statistics = {
        totalInvitesSent: 0,
        acceptanceRate: 0,
        lastInviteSent: null
      };
    }
    pool.statistics.totalInvitesSent += playersToInvite.length;
    pool.statistics.lastInviteSent = now;
    
    await event.save();
    await pool.save();
    
    console.log(`Successfully auto-invited ${playersToInvite.length} players from pool ${pool.name} to event ${event.title}`);
    
    // TODO: Send notifications to invited players
    // This would integrate with your notification system
    
    return { 
      success: true, 
      message: `Auto-invited ${playersToInvite.length} players from pool ${pool.name}`,
      playersInvited: playersToInvite.length,
      playerNames: playersToInvite.map(p => p.player.name)
    };
    
  } catch (error) {
    console.error('Error processing training pool auto-invite:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Check if an event should trigger auto-invite based on current conditions
 * This is called when a player responds to an event
 */
const checkAndTriggerAutoInvite = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    
    if (!event || !event.trainingPoolAutoInvite?.enabled || event.trainingPoolAutoInvite?.invitesSent) {
      return null;
    }
    
    const now = new Date();
    
    // For deadline trigger, check if deadline has passed
    if (event.trainingPoolAutoInvite.triggerType === 'deadline' && event.votingDeadline) {
      if (now >= new Date(event.votingDeadline)) {
        console.log(`Voting deadline reached, processing auto-invite for event ${event.title}`);
        return await processTrainingPoolAutoInvite(eventId);
      }
    }
    
    // For hours_before trigger, check if we're in the window
    if (event.trainingPoolAutoInvite.triggerType === 'hours_before') {
      const hoursBeforeEvent = event.trainingPoolAutoInvite.hoursBeforeEvent || 24;
      const triggerTime = new Date(event.startTime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);
      
      if (now >= triggerTime) {
        console.log(`Hours-before window reached, processing auto-invite for event ${event.title}`);
        return await processTrainingPoolAutoInvite(eventId);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking auto-invite trigger:', error);
    return null;
  }
};

/**
 * Process auto-decline for players who haven't responded by voting deadline
 * This is called immediately when deadline is reached
 */
const processVotingDeadlineAutoDecline = async (eventId) => {
  try {
    const event = await Event.findById(eventId).populate('invitedPlayers');
    
    if (!event || event.autoDeclineProcessed) {
      return { success: false, message: 'Event not found or already processed' };
    }
    
    const now = new Date();
    
    // Check if voting deadline has passed
    if (!event.votingDeadline || now < new Date(event.votingDeadline)) {
      return { success: false, message: 'Voting deadline not reached yet' };
    }
    
    // Find players who were invited but haven't responded
    const respondedPlayerIds = new Set([
      ...event.attendingPlayers.map(p => p.toString()),
      ...event.declinedPlayers.map(p => p.toString()),
      ...(event.unsurePlayers || []).map(p => p.toString())
    ]);
    
    const unrespondedPlayers = event.invitedPlayers.filter(player =>
      !respondedPlayerIds.has(player._id.toString())
    );
    
    console.log(`Auto-declining ${unrespondedPlayers.length} unresponded players for event ${event.title}`);
    
    // Auto-decline unresponded players
    for (const player of unrespondedPlayers) {
      // Add to declined players
      if (!event.declinedPlayers.some(p => p.toString() === player._id.toString())) {
        event.declinedPlayers.push(player._id);
      }
      
      // Add a response with auto-decline reason
      const existingResponseIndex = event.playerResponses.findIndex(
        response => response.player.toString() === player._id.toString()
      );
      
      const autoDeclineResponse = {
        player: player._id,
        status: 'declined',
        reason: 'Automatisch abgelehnt - Abstimmungsfrist abgelaufen',
        respondedAt: now
      };
      
      if (existingResponseIndex >= 0) {
        event.playerResponses[existingResponseIndex] = autoDeclineResponse;
      } else {
        event.playerResponses.push(autoDeclineResponse);
      }
    }
    
    // Mark as processed
    event.autoDeclineProcessed = true;
    await event.save();
    
    console.log(`Processed voting deadline for event ${event.title}: auto-declined ${unrespondedPlayers.length} players`);
    
    // Now trigger auto-invite if configured
    if (event.trainingPoolAutoInvite?.enabled && event.trainingPoolAutoInvite?.triggerType === 'deadline') {
      const autoInviteResult = await processTrainingPoolAutoInvite(eventId);
      return {
        success: true,
        message: `Auto-declined ${unrespondedPlayers.length} players`,
        playersDeclined: unrespondedPlayers.length,
        autoInviteResult
      };
    }
    
    return {
      success: true,
      message: `Auto-declined ${unrespondedPlayers.length} players`,
      playersDeclined: unrespondedPlayers.length
    };
    
  } catch (error) {
    console.error('Error processing voting deadline auto-decline:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  processTrainingPoolAutoInvite,
  checkAndTriggerAutoInvite,
  processVotingDeadlineAutoDecline
};
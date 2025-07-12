const Event = require('../models/Event');
const Team = require('../models/Team');

// Fix uninvited players who are actually team members
async function fixUninvitedTeamPlayers() {
  try {
    console.log('[Data Fix] Starting fix for uninvited team players...');
    
    // Get all events with uninvited players
    const eventsWithUninvited = await Event.find({
      uninvitedPlayers: { $exists: true, $ne: [] }
    }).populate('teams team');
    
    console.log(`[Data Fix] Found ${eventsWithUninvited.length} events with uninvited players`);
    
    let totalFixed = 0;
    let eventsFixed = 0;
    
    for (const event of eventsWithUninvited) {
      // Skip if already fixed
      if (event._fixesApplied && event._fixesApplied.includes('uninvited_players_fix_2024')) {
        console.log(`[Data Fix] Event ${event.title} already fixed - skipping`);
        continue;
      }
      
      // Get the event's team(s)
      const eventTeamIds = event.teams?.length > 0 ? 
        event.teams.map(t => t._id || t) : 
        event.team ? [event.team._id || event.team] : [];
      
      // Get all players from these teams
      const teams = await Team.find({ 
        _id: { $in: eventTeamIds } 
      }).select('players');
      
      const teamPlayerIds = new Set();
      teams.forEach(team => {
        team.players.forEach(playerId => {
          teamPlayerIds.add(playerId.toString());
        });
      });
      
      // Check each uninvited player
      const playersToFix = [];
      const remainingUninvited = [];
      
      for (const playerId of event.uninvitedPlayers) {
        const playerIdStr = playerId.toString();
        
        // If this player is a team member
        if (teamPlayerIds.has(playerIdStr)) {
          // Check if not already in other lists
          const isInvited = event.invitedPlayers.some(p => p.toString() === playerIdStr);
          const isAttending = event.attendingPlayers.some(p => p.toString() === playerIdStr);
          const isDeclined = event.declinedPlayers.some(p => p.toString() === playerIdStr);
          const isGuest = event.guestPlayers && event.guestPlayers.some(g => g.player?.toString() === playerIdStr);
          
          if (!isInvited && !isAttending && !isDeclined && !isGuest) {
            playersToFix.push(playerId);
          } else {
            remainingUninvited.push(playerId);
          }
        } else {
          // Not a team member, keep in uninvited
          remainingUninvited.push(playerId);
        }
      }
      
      // Apply fixes if needed
      if (playersToFix.length > 0) {
        event.uninvitedPlayers = remainingUninvited;
        event.invitedPlayers.push(...playersToFix);
        
        // Mark as fixed
        if (!event._fixesApplied) {
          event._fixesApplied = [];
        }
        event._fixesApplied.push('uninvited_players_fix_2024');
        
        await event.save();
        
        totalFixed += playersToFix.length;
        eventsFixed++;
        console.log(`[Data Fix] Fixed ${playersToFix.length} players in event: ${event.title}`);
      }
    }
    
    console.log(`[Data Fix] Completed! Fixed ${totalFixed} players across ${eventsFixed} events`);
    
    return {
      success: true,
      totalFixed,
      eventsFixed
    };
    
  } catch (error) {
    console.error('[Data Fix] Error fixing uninvited players:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Reset fix status (for testing)
async function resetFixStatus() {
  try {
    const result = await Event.updateMany(
      { _fixesApplied: { $exists: true } },
      { $pull: { _fixesApplied: 'uninvited_players_fix_2024' } }
    );
    
    console.log(`[Data Fix] Reset fix status for ${result.modifiedCount} events`);
    return result;
  } catch (error) {
    console.error('[Data Fix] Error resetting fix status:', error);
    throw error;
  }
}

module.exports = {
  fixUninvitedTeamPlayers,
  resetFixStatus
};
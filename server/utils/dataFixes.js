const Event = require('../models/Event');
const Team = require('../models/Team');

// Fix uninvited players who are actually team members
async function fixUninvitedTeamPlayers() {
  try {
    console.log('[Data Fix] Checking for uninvited team players...');
    
    // Only run in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Data Fix] Skipping - not in production');
      return;
    }
    
    // Check if we've already run this fix
    const fixKey = 'uninvited_players_fix_2024';
    const fixApplied = await Event.findOne({ 
      _fixesApplied: fixKey 
    });
    
    if (fixApplied) {
      console.log('[Data Fix] Already applied - skipping');
      return;
    }
    
    // Get all events with uninvited players
    const eventsWithUninvited = await Event.find({
      uninvitedPlayers: { $exists: true, $ne: [] }
    });
    
    console.log(`[Data Fix] Found ${eventsWithUninvited.length} events to check`);
    
    let totalFixed = 0;
    
    for (const event of eventsWithUninvited) {
      // Get the event's team(s)
      const eventTeamIds = event.teams?.length > 0 ? event.teams : [event.team];
      
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
      event.uninvitedPlayers = event.uninvitedPlayers.filter(playerId => {
        const playerIdStr = playerId.toString();
        
        // If this player is a team member
        if (teamPlayerIds.has(playerIdStr)) {
          // Check if not already in other lists
          const isInvited = event.invitedPlayers.some(p => p.toString() === playerIdStr);
          const isAttending = event.attendingPlayers.some(p => p.toString() === playerIdStr);
          const isDeclined = event.declinedPlayers.some(p => p.toString() === playerIdStr);
          const isGuest = event.guestPlayers.some(g => g.player?.toString() === playerIdStr);
          
          if (!isInvited && !isAttending && !isDeclined && !isGuest) {
            playersToFix.push(playerId);
            return false; // Remove from uninvited
          }
        }
        return true; // Keep in uninvited
      });
      
      // Add fixed players to invited list
      if (playersToFix.length > 0) {
        event.invitedPlayers.push(...playersToFix);
        await event.save();
        totalFixed += playersToFix.length;
        console.log(`[Data Fix] Fixed ${playersToFix.length} players in event: ${event.title}`);
      }
    }
    
    // Mark fix as applied (on any event just as a flag)
    if (eventsWithUninvited.length > 0) {
      const flagEvent = eventsWithUninvited[0];
      if (!flagEvent._fixesApplied) {
        flagEvent._fixesApplied = [];
      }
      flagEvent._fixesApplied.push(fixKey);
      await flagEvent.save();
    }
    
    console.log(`[Data Fix] Completed! Fixed ${totalFixed} players total`);
    
  } catch (error) {
    console.error('[Data Fix] Error fixing uninvited players:', error);
    // Don't crash the server for data fixes
  }
}

module.exports = {
  fixUninvitedTeamPlayers
};
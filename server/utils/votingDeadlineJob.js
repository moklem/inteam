const Event = require('../models/Event');
const Team = require('../models/Team');
const TrainingPool = require('../models/TrainingPool');

// Check for voting deadlines and auto-decline players who haven't responded
const checkVotingDeadlines = async () => {
  try {
    console.log('Checking voting deadlines...');
    
    // Find events with voting deadlines that have passed and haven't been processed
    const now = new Date();
    const eventsWithExpiredDeadlines = await Event.find({
      votingDeadline: { $lt: now },
      autoDeclineProcessed: { $ne: true }
    }).populate('invitedPlayers');

    console.log(`Found ${eventsWithExpiredDeadlines.length} events with expired voting deadlines`);

    for (const event of eventsWithExpiredDeadlines) {
      console.log(`Processing event: ${event.title} (${event._id})`);
      
      // Find players who were invited but haven't responded
      const respondedPlayerIds = [
        ...event.attendingPlayers.map(p => p.toString()),
        ...event.declinedPlayers.map(p => p.toString()),
        ...(event.unsurePlayers || []).map(p => p.toString())
      ];

      const unrespondedPlayers = event.invitedPlayers.filter(player =>
        !respondedPlayerIds.includes(player._id.toString())
      );

      console.log(`Found ${unrespondedPlayers.length} unresponded players for event ${event.title}`);

      // Auto-decline unresponded players
      for (const player of unrespondedPlayers) {
        console.log(`Auto-declining player: ${player.name} for event: ${event.title}`);
        
        // Add to declined players
        if (!event.declinedPlayers.some(p => p.toString() === player._id.toString())) {
          event.declinedPlayers.push(player._id);
        }

        // Add a response with auto-decline reason
        const existingResponseIndex = event.playerResponses.findIndex(
          response => response.player.toString() === player._id.toString()
        );

        if (existingResponseIndex >= 0) {
          event.playerResponses[existingResponseIndex] = {
            player: player._id,
            status: 'declined',
            reason: 'Automatisch abgelehnt - Abstimmungsfrist abgelaufen',
            respondedAt: new Date()
          };
        } else {
          event.playerResponses.push({
            player: player._id,
            status: 'declined',
            reason: 'Automatisch abgelehnt - Abstimmungsfrist abgelaufen',
            respondedAt: new Date()
          });
        }
      }

      // Mark as processed
      event.autoDeclineProcessed = true;
      
      // Check if this event has training pool auto-invite enabled
      if (event.trainingPoolAutoInvite?.enabled && 
          event.trainingPoolAutoInvite?.poolId &&
          event.trainingPoolAutoInvite?.triggerType === 'deadline' &&
          !event.trainingPoolAutoInvite?.invitesSent) {
        
        console.log(`Processing training pool auto-invite for event ${event.title}`);
        
        try {
          // Get the pool with approved players
          const pool = await TrainingPool.findById(event.trainingPoolAutoInvite.poolId)
            .populate('approvedPlayers.player');
          
          if (pool) {
            // Count current participants
            const currentParticipants = event.attendingPlayers.length + 
                                      (event.unsurePlayers?.length || 0);
            const minParticipants = event.trainingPoolAutoInvite.minParticipants || 6;
            
            console.log(`Current participants: ${currentParticipants}, minimum needed: ${minParticipants}`);
            
            if (currentParticipants < minParticipants) {
              const playersNeeded = minParticipants - currentParticipants;
              
              // Get players from pool who are not already invited
              const alreadyInvitedIds = [
                ...event.invitedPlayers.map(p => p.toString()),
                ...event.attendingPlayers.map(p => p.toString()),
                ...event.declinedPlayers.map(p => p.toString()),
                ...(event.unsurePlayers || []).map(p => p.toString()),
                ...(event.guestPlayers || []).map(g => g.player?.toString()).filter(Boolean)
              ];
              
              const availablePoolPlayers = pool.approvedPlayers.filter(
                ap => ap.player && !alreadyInvitedIds.includes(ap.player._id.toString())
              );
              
              console.log(`Available pool players: ${availablePoolPlayers.length}`);
              
              // ALWAYS invite ALL available players from the pool (not just the ones needed)
              const playersToInvite = availablePoolPlayers;
              
              for (const poolPlayer of playersToInvite) {
                // Add as guest player from pool
                event.guestPlayers.push({
                  player: poolPlayer.player._id,
                  fromTeam: pool.team // Use pool's team as the source team
                });
                
                // Also add to invited players
                event.invitedPlayers.push(poolPlayer.player._id);
                
                console.log(`Auto-invited player ${poolPlayer.player.name} from pool ${pool.name}`);
              }
              
              // Mark that invites have been sent
              event.trainingPoolAutoInvite.invitesSent = true;
              event.trainingPoolAutoInvite.invitesSentAt = new Date();
              event.trainingPoolAutoInvite.invitedPoolPlayers = playersToInvite.map(p => p.player._id);
              
              console.log(`Auto-invited ${playersToInvite.length} players from pool ${pool.name}`);
            } else {
              console.log(`Event has enough participants, no auto-invite needed`);
            }
          } else {
            console.log(`Training pool not found: ${event.trainingPoolAutoInvite.poolId}`);
          }
        } catch (poolError) {
          console.error(`Error processing training pool auto-invite: ${poolError.message}`);
        }
      }
      
      await event.save();

      console.log(`Processed event ${event.title}: auto-declined ${unrespondedPlayers.length} players`);
    }

    console.log('Voting deadline check completed');
  } catch (error) {
    console.error('Error checking voting deadlines:', error);
  }
};


// Check for events that need auto-invite based on hours before event
const checkHoursBeforeAutoInvite = async () => {
  try {
    const now = new Date();
    console.log(`Checking hours-before auto-invites at ${now.toISOString()}`);
    
    // Find events with hours_before trigger that haven't been processed
    const events = await Event.find({
      'trainingPoolAutoInvite.enabled': true,
      'trainingPoolAutoInvite.triggerType': 'hours_before',
      'trainingPoolAutoInvite.invitesSent': { $ne: true },
      startTime: { $gt: now }
    }).populate('trainingPoolAutoInvite.poolId');
    
    for (const event of events) {
      const hoursBeforeEvent = event.trainingPoolAutoInvite.hoursBeforeEvent || 24;
      const triggerTime = new Date(event.startTime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);
      
      if (now >= triggerTime) {
        console.log(`Processing hours-before auto-invite for event ${event.title}`);
        
        try {
          const pool = await TrainingPool.findById(event.trainingPoolAutoInvite.poolId)
            .populate('approvedPlayers.player');
          
          if (pool) {
            // Count current participants
            const currentParticipants = event.attendingPlayers.length + 
                                      (event.unsurePlayers?.length || 0);
            const minParticipants = event.trainingPoolAutoInvite.minParticipants || 6;
            
            if (currentParticipants < minParticipants) {
              const playersNeeded = minParticipants - currentParticipants;
              
              // Get players from pool who are not already invited
              const alreadyInvitedIds = [
                ...event.invitedPlayers.map(p => p.toString()),
                ...event.attendingPlayers.map(p => p.toString()),
                ...event.declinedPlayers.map(p => p.toString()),
                ...(event.unsurePlayers || []).map(p => p.toString()),
                ...(event.guestPlayers || []).map(g => g.player?.toString()).filter(Boolean)
              ];
              
              const availablePoolPlayers = pool.approvedPlayers.filter(
                ap => ap.player && !alreadyInvitedIds.includes(ap.player._id.toString())
              );
              
              // ALWAYS invite ALL available players from the pool
              const playersToInvite = availablePoolPlayers;
              
              for (const poolPlayer of playersToInvite) {
                event.guestPlayers.push({
                  player: poolPlayer.player._id,
                  fromTeam: pool.team
                });
                event.invitedPlayers.push(poolPlayer.player._id);
              }
              
              // Mark that invites have been sent
              event.trainingPoolAutoInvite.invitesSent = true;
              event.trainingPoolAutoInvite.invitesSentAt = new Date();
              event.trainingPoolAutoInvite.invitedPoolPlayers = playersToInvite.map(p => p.player._id);
              
              await event.save();
              console.log(`Auto-invited ${playersToInvite.length} players from pool ${pool.name}`);
            }
          }
        } catch (error) {
          console.error(`Error processing hours-before auto-invite: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking hours-before auto-invites:', error);
  }
};

// Schedule the job to run every 15 minutes
const startVotingDeadlineJob = () => {
  console.log('Starting voting deadline and auto-invite job...');
  
  // Run every 15 minutes
  setInterval(checkVotingDeadlines, 15 * 60 * 1000);
  setInterval(checkHoursBeforeAutoInvite, 15 * 60 * 1000);

  console.log('Voting deadline and auto-invite job scheduled to run every 15 minutes');
  
  // Also run once on startup to catch any missed deadlines
  setTimeout(checkVotingDeadlines, 5000);
  setTimeout(checkHoursBeforeAutoInvite, 10000);
};

module.exports = {
  startVotingDeadlineJob,
  checkVotingDeadlines,
  checkHoursBeforeAutoInvite
};
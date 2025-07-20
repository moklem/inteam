const Event = require('../models/Event');
const Team = require('../models/Team');

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
      await event.save();

      console.log(`Processed event ${event.title}: auto-declined ${unrespondedPlayers.length} players`);
    }

    console.log('Voting deadline check completed');
  } catch (error) {
    console.error('Error checking voting deadlines:', error);
  }
};

// Schedule the job to run every 15 minutes
const startVotingDeadlineJob = () => {
  console.log('Starting voting deadline job...');
  
  // Run every 15 minutes (900000 milliseconds)
  setInterval(checkVotingDeadlines, 15 * 60 * 1000);

  console.log('Voting deadline job scheduled to run every 15 minutes');
  
  // Also run once on startup to catch any missed deadlines
  setTimeout(checkVotingDeadlines, 5000); // Wait 5 seconds after startup
};

module.exports = {
  startVotingDeadlineJob,
  checkVotingDeadlines
};
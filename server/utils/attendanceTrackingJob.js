const Event = require('../models/Event');
const PlayerAttribute = require('../models/PlayerAttribute');

// Check for events where attendance should be auto-processed after 7 days
const checkAttendanceProcessing = async () => {
  try {
    console.log('Checking events for automatic attendance processing...');
    
    // Find events that need attendance processing
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const eventsNeedingProcessing = await Event.find({
      endTime: { $lt: sevenDaysAgo }, // Event ended more than 7 days ago
      attendanceAutoProcessed: { $ne: true }, // Not already auto-processed
      $or: [
        { quickFeedback: { $exists: false } }, // No feedback at all
        { quickFeedback: { $size: 0 } }, // Empty feedback array
        { 
          quickFeedback: { 
            $not: { 
              $elemMatch: { provided: true } 
            } 
          } 
        } // No feedback with provided: true
      ]
    }).populate('invitedPlayers attendingPlayers')
      .populate({
        path: 'guestPlayers.player',
        model: 'User'
      });

    console.log(`Found ${eventsNeedingProcessing.length} events needing attendance processing`);

    for (const event of eventsNeedingProcessing) {
      console.log(`Processing attendance for event: ${event.title} (${event._id})`);
      
      try {
        // Get all players who were marked as attending
        // For auto-processing, we assume all players in attendingPlayers array actually attended
        const attendingPlayerIds = event.attendingPlayers.map(p => (p._id || p).toString());

        // Get all invited players (for calculating total events)
        const allInvitedIds = [
          ...event.invitedPlayers.map(p => p._id || p),
          ...event.guestPlayers.map(g => g.player._id || g.player)
        ];

        // Update attendance for all invited players
        const updatePromises = allInvitedIds.map(async (playerId) => {
          const attended = attendingPlayerIds.includes((playerId._id || playerId).toString());
          
          // Find the player's attribute (use first available)
          const attribute = await PlayerAttribute.findOne({
            player: playerId
          });
          
          if (attribute) {
            console.log(`Updating attendance for player ${attribute.player}: attended=${attended}`);
            
            // Update total counts
            attribute.attendanceTracking.totalEvents += 1;
            if (attended) {
              attribute.attendanceTracking.attendedEvents += 1;
            }
            
            // Calculate 3-month attendance
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            // Get events from last 3 months
            const recentEvents = await Event.find({
              $or: [
                { invitedPlayers: playerId },
                { 'guestPlayers.player': playerId }
              ],
              startTime: { $gte: threeMonthsAgo },
              type: { $in: ['Training', 'Game'] }
            });
            
            const eventsInPeriod = recentEvents.length;
            const attendedInPeriod = recentEvents.filter(e => 
              e.attendingPlayers.some(ap => ap.toString() === (playerId._id || playerId).toString()) ||
              e.guestPlayers.some(g => 
                (g.player._id || g.player).toString() === (playerId._id || playerId).toString() && 
                (g.status === 'accepted' || !g.status) // Handle cases where status might not exist
              )
            ).length;
            
            // Update 3-month stats
            attribute.attendanceTracking.eventsLast3Months = eventsInPeriod;
            attribute.attendanceTracking.attendedLast3Months = attendedInPeriod;
            
            // Calculate percentages
            const overallPercentage = attribute.attendanceTracking.totalEvents > 0 
              ? (attribute.attendanceTracking.attendedEvents / attribute.attendanceTracking.totalEvents * 100)
              : 0;
            
            const threeMonthPercentage = eventsInPeriod > 0 
              ? (attendedInPeriod / eventsInPeriod * 100) 
              : 0;
            
            attribute.attendanceTracking.attendancePercentage = Math.round(overallPercentage * 100) / 100;
            attribute.attendanceTracking.attendancePercentage3Months = Math.round(threeMonthPercentage * 100) / 100;
            
            await attribute.save();
          } else {
            console.log(`No PlayerAttribute found for player ${playerId}`);
          }
        });

        await Promise.all(updatePromises);
        
        // Mark event as auto-processed
        event.attendanceAutoProcessed = true;
        event.attendanceProcessedAt = new Date();
        await event.save();
        
        console.log(`Completed attendance processing for event: ${event.title}`);
        console.log(`Updated attendance for ${attendingPlayerIds.length} attending players out of ${allInvitedIds.length} invited`);
        
      } catch (error) {
        console.error(`Error processing attendance for event ${event.title}:`, error);
        // Continue with next event even if this one fails
      }
    }
    
  } catch (error) {
    console.error('Error checking attendance processing:', error);
  }
};

// Start the attendance processing job
const startAttendanceTrackingJob = () => {
  console.log('Starting attendance tracking job...');
  
  // Check immediately on startup
  checkAttendanceProcessing();
  
  // Then check every 24 hours (24 * 60 * 60 * 1000 ms)
  setInterval(checkAttendanceProcessing, 24 * 60 * 60 * 1000);
  
  console.log('Attendance tracking job scheduled to run every 24 hours');
};

module.exports = { startAttendanceTrackingJob, checkAttendanceProcessing };
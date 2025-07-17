const Event = require('../models/Event');
const PushSubscription = require('../models/PushSubscription');
const { sendEventReminders } = require('../controllers/notificationController');

// Check for upcoming events and send reminders
const checkAndSendEventReminders = async () => {
  try {
    console.log('[Notification Scheduler] Checking for upcoming events...');
    
    // Get current time and time 24 hours from now
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24HoursPlus15Min = new Date(in24Hours.getTime() + 15 * 60 * 1000);
    
    // Find events starting in the next 24 hours (with 15 minute window)
    const upcomingEvents = await Event.find({
      startTime: {
        $gte: in24Hours,
        $lte: in24HoursPlus15Min
      },
      // Only send reminders for events that haven't had reminders sent
      lastReminderSent: {
        $not: {
          $gte: now.setHours(0, 0, 0, 0) // Not sent today
        }
      }
    }).populate('attendingPlayers invitedPlayers');
    
    console.log(`[Notification Scheduler] Found ${upcomingEvents.length} events needing reminders`);
    
    // Send reminders for each event
    for (const event of upcomingEvents) {
      try {
        await sendEventReminders(event._id, 24);
        
        // Update the event to mark reminder as sent
        event.lastReminderSent = now;
        await event.save();
        
        console.log(`[Notification Scheduler] Sent reminders for event: ${event.title}`);
      } catch (error) {
        console.error(`[Notification Scheduler] Error sending reminders for event ${event._id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Notification Scheduler] Error in reminder check:', error);
  }
};

// Check for events starting in 1 hour
const checkAndSendLastMinuteReminders = async () => {
  try {
    console.log('[Notification Scheduler] Checking for events starting soon...');
    
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in1HourPlus15Min = new Date(in1Hour.getTime() + 15 * 60 * 1000);
    
    // Find events starting in the next hour
    const upcomingEvents = await Event.find({
      startTime: {
        $gte: in1Hour,
        $lte: in1HourPlus15Min
      },
      // Only send if we haven't sent a last minute reminder
      lastMinuteReminderSent: {
        $ne: true
      }
    }).populate('attendingPlayers invitedPlayers');
    
    console.log(`[Notification Scheduler] Found ${upcomingEvents.length} events starting soon`);
    
    // Send reminders for each event
    for (const event of upcomingEvents) {
      try {
        // Get all players who should receive notifications
        const playerIds = [
          ...event.attendingPlayers.map(p => p._id),
          ...event.invitedPlayers.map(p => p._id)
        ];

        // Get their push subscriptions
        const subscriptions = await PushSubscription.find({
          user: { $in: playerIds },
          'preferences.eventReminders': true
        });

        if (subscriptions.length > 0) {
          const payload = {
            title: `Event startet bald!`,
            body: `${event.title} beginnt in 1 Stunde`,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: `event-reminder-soon-${event._id}`,
            requireInteraction: true,
            data: {
              eventId: event._id,
              url: `/player/events/${event._id}`
            }
          };

          const { sendNotificationToMany } = require('../utils/webpush');
          await sendNotificationToMany(subscriptions, payload);
        }
        
        // Mark as sent
        event.lastMinuteReminderSent = true;
        await event.save();
        
        console.log(`[Notification Scheduler] Sent last minute reminders for event: ${event.title}`);
      } catch (error) {
        console.error(`[Notification Scheduler] Error sending last minute reminders for event ${event._id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Notification Scheduler] Error in last minute reminder check:', error);
  }
};

// Start the scheduler
const startNotificationScheduler = () => {
  console.log('[Notification Scheduler] Starting notification scheduler...');
  
  // Check for 24-hour reminders every 15 minutes
  setInterval(checkAndSendEventReminders, 15 * 60 * 1000);
  
  // Check for 1-hour reminders every 15 minutes
  setInterval(checkAndSendLastMinuteReminders, 15 * 60 * 1000);
  
  // Run immediately on startup
  checkAndSendEventReminders();
  checkAndSendLastMinuteReminders();
};

module.exports = {
  startNotificationScheduler,
  checkAndSendEventReminders,
  checkAndSendLastMinuteReminders
};
const Event = require('../models/Event');
const PushSubscription = require('../models/PushSubscription');
const { sendEventReminders } = require('../controllers/notificationController');
const { sendNotificationToMany } = require('./webpush');

// Send custom event reminder based on event's notification settings
const sendCustomEventReminder = async (event, reminderTime) => {
  try {
    // Get all players who should receive notifications
    const playerIds = [
      ...event.attendingPlayers.map(p => p._id || p),
      ...event.invitedPlayers.map(p => p._id || p)
    ];

    console.log(`[Notification Scheduler] Sending reminder to ${playerIds.length} players for event: ${event.title}`);

    // Get their push subscriptions
    const subscriptions = await PushSubscription.find({
      user: { $in: playerIds },
      'preferences.eventReminders': true
    });

    console.log(`[Notification Scheduler] Found ${subscriptions.length} subscriptions with event reminders enabled`);

    if (subscriptions.length === 0) {
      console.log('No subscriptions found for event reminders');
      return;
    }

    // Format reminder time for display
    const formatReminderTime = (hours, minutes = 0) => {
      if (hours === 0 && minutes === 0) return 'jetzt';
      if (hours === 0) return `${minutes} Minuten`;
      if (minutes === 0) return `${hours} Stunden`;
      return `${hours} Stunden und ${minutes} Minuten`;
    };

    // Use custom message if provided, otherwise use default
    const customMessage = event.notificationSettings?.customMessage;
    const defaultMessage = `${event.title} beginnt in ${formatReminderTime(reminderTime.hours, reminderTime.minutes)}`;
    
    const payload = {
      title: `Event-Erinnerung: ${event.title}`,
      body: customMessage || defaultMessage,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `event-reminder-${event._id}-${reminderTime.hours}h`,
      data: {
        eventId: event._id,
        url: `/player/events/${event._id}`,
        reminderTime: reminderTime.hours
      }
    };

    const results = await sendNotificationToMany(subscriptions, payload);
    console.log(`Custom reminder sent: ${results.successful} successful, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    console.error('Send custom event reminder error:', error);
    throw error;
  }
};

// Check for upcoming events and send reminders
const checkAndSendEventReminders = async () => {
  try {
    console.log('[Notification Scheduler] Checking for upcoming events...');
    
    const now = new Date();
    
    // Get all events in the next 7 days that have notifications enabled
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingEvents = await Event.find({
      startTime: {
        $gte: now,
        $lte: sevenDaysFromNow
      },
      'notificationSettings.enabled': true
    }).populate('attendingPlayers invitedPlayers');
    
    console.log(`[Notification Scheduler] Found ${upcomingEvents.length} events with notifications enabled`);
    
    // Check each event for reminders that need to be sent
    for (const event of upcomingEvents) {
      try {
        if (!event.notificationSettings || !event.notificationSettings.reminderTimes) {
          console.log(`[Notification Scheduler] Event ${event.title} has no reminder times configured`);
          continue;
        }
        
        const eventStartTime = new Date(event.startTime);
        console.log(`[Notification Scheduler] Checking event: ${event.title} at ${eventStartTime.toISOString()}`);
        console.log(`[Notification Scheduler] Event has ${event.notificationSettings.reminderTimes.length} reminder times`);
        
        // Check each reminder time
        for (const reminderTime of event.notificationSettings.reminderTimes) {
          const totalMinutes = reminderTime.hours * 60 + (reminderTime.minutes || 0);
          const reminderDateTime = new Date(eventStartTime.getTime() - totalMinutes * 60 * 1000);
          
          console.log(`[Notification Scheduler] Reminder ${reminderTime.hours}h${reminderTime.minutes || 0}m should be sent at: ${reminderDateTime.toISOString()}`);
          
          // Check if we should send this reminder now (within 30 minute window to account for server downtime)
          const timeDiff = now.getTime() - reminderDateTime.getTime();
          const shouldSendNow = timeDiff >= 0 && timeDiff <= 30 * 60 * 1000; // 30 minutes after scheduled time
          
          console.log(`[Notification Scheduler] Time diff: ${Math.round(timeDiff / 60000)} minutes, should send now: ${shouldSendNow}`);
          
          if (shouldSendNow) {
            // Check if this specific reminder has already been sent
            const reminderKey = `${reminderTime.hours}h${reminderTime.minutes || 0}m`;
            const alreadySent = event.remindersSent.some(sent => {
              const sentKey = `${sent.reminderTime || 0}h${sent.reminderMinutes || 0}m`;
              return sentKey === reminderKey && 
                     Math.abs(sent.sentAt.getTime() - reminderDateTime.getTime()) < 60 * 60 * 1000; // within 1 hour
            });
            
            if (!alreadySent) {
              await sendCustomEventReminder(event, reminderTime);
              
              // Mark this reminder as sent
              event.remindersSent.push({
                reminderTime: reminderTime.hours,
                reminderMinutes: reminderTime.minutes || 0,
                sentAt: now
              });
              await event.save();
              
              console.log(`[Notification Scheduler] Sent ${reminderTime.hours}h reminder for event: ${event.title}`);
            }
          }
        }
      } catch (error) {
        console.error(`[Notification Scheduler] Error processing event ${event._id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Notification Scheduler] Error in reminder check:', error);
  }
};


// Start the scheduler
const startNotificationScheduler = () => {
  console.log('[Notification Scheduler] Starting notification scheduler...');
  
  // Check for custom reminders every 10 minutes (more frequent to catch missed reminders)
  setInterval(checkAndSendEventReminders, 10 * 60 * 1000);
  
  // Run immediately on startup
  checkAndSendEventReminders();
};

module.exports = {
  startNotificationScheduler,
  checkAndSendEventReminders,
  sendCustomEventReminder
};
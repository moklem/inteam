const Event = require('../models/Event');
const PushSubscription = require('../models/PushSubscription');
const { sendEventReminders } = require('../controllers/notificationController');
const { sendNotificationToMany } = require('./webpush');

// Send custom event reminder based on event's notification settings
const sendCustomEventReminder = async (event, reminderTime) => {
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
          continue;
        }
        
        const eventStartTime = new Date(event.startTime);
        
        // Check each reminder time
        for (const reminderTime of event.notificationSettings.reminderTimes) {
          const totalMinutes = reminderTime.hours * 60 + (reminderTime.minutes || 0);
          const reminderDateTime = new Date(eventStartTime.getTime() - totalMinutes * 60 * 1000);
          
          // Check if we should send this reminder now (within 15 minute window)
          const timeDiff = Math.abs(now.getTime() - reminderDateTime.getTime());
          const withinWindow = timeDiff <= 15 * 60 * 1000; // 15 minutes
          
          if (withinWindow) {
            // Check if this specific reminder has already been sent
            const alreadySent = event.remindersSent.some(sent => 
              sent.reminderTime === reminderTime.hours && 
              Math.abs(sent.sentAt.getTime() - reminderDateTime.getTime()) < 60 * 60 * 1000 // within 1 hour
            );
            
            if (!alreadySent) {
              await sendCustomEventReminder(event, reminderTime);
              
              // Mark this reminder as sent
              event.remindersSent.push({
                reminderTime: reminderTime.hours,
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
  
  // Check for custom reminders every 15 minutes
  setInterval(checkAndSendEventReminders, 15 * 60 * 1000);
  
  // Run immediately on startup
  checkAndSendEventReminders();
};

module.exports = {
  startNotificationScheduler,
  checkAndSendEventReminders,
  sendCustomEventReminder
};
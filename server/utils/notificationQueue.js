const NotificationQueue = require('../models/NotificationQueue');
const Event = require('../models/Event');
const PushSubscription = require('../models/PushSubscription');
const { sendNotificationToMany } = require('./webpush');

// Send custom event reminder based on event's notification settings
const sendCustomEventReminder = async (event, reminderTime) => {
  try {
    // Get all players who should receive notifications
    // Include attending, invited, and team members
    const playerIds = [
      ...event.attendingPlayers.map(p => p._id || p),
      ...event.invitedPlayers.map(p => p._id || p)
    ];

    console.log(`[Notification Queue] Initial players (attending + invited): ${playerIds.length}`);
    
    // Also get team members from the event's team(s)
    const Team = require('../models/Team');
    const teamIds = event.teams && event.teams.length > 0 ? event.teams : [event.team];
    
    for (const teamId of teamIds) {
      if (teamId) {
        const team = await Team.findById(teamId).populate('players', '_id');
        if (team && team.players) {
          const teamPlayerIds = team.players.map(p => p._id.toString());
          // Add team members who aren't already in the list and aren't in uninvited players
          const uninvitedIds = (event.uninvitedPlayers || []).map(p => (p._id || p).toString());
          
          for (const playerId of teamPlayerIds) {
            if (!playerIds.some(id => id.toString() === playerId) && !uninvitedIds.includes(playerId)) {
              playerIds.push(playerId);
            }
          }
        }
      }
    }

    console.log(`[Notification Queue] Total players (including team members): ${playerIds.length} for event: ${event.title}`);

    // Get their push subscriptions
    const allSubscriptions = await PushSubscription.find({
      user: { $in: playerIds }
    });
    
    const subscriptions = allSubscriptions.filter(sub => sub.preferences?.eventReminders !== false);

    console.log(`[Notification Queue] Found ${allSubscriptions.length} total subscriptions, ${subscriptions.length} with event reminders enabled`);

    if (subscriptions.length === 0) {
      console.log('No subscriptions found for event reminders');
      return { successful: 0, failed: 0 };
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
    
    // Send notifications individually to each player so we can customize actions
    const results = { successful: 0, failed: 0 };
    
    for (const subscription of subscriptions) {
      try {
        const userId = subscription.user;
        
        // Check if this player has already responded
        const hasAttending = event.attendingPlayers.some(p => (p._id || p).toString() === userId.toString());
        const hasDeclined = event.declinedPlayers.some(p => (p._id || p).toString() === userId.toString());
        const hasResponded = hasAttending || hasDeclined;
        
        // Create base payload
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
        
        // Add accept/decline actions if player hasn't responded yet
        if (!hasResponded) {
          payload.requireInteraction = true;
          payload.actions = [
            {
              action: 'accept',
              title: 'Zusagen',
              icon: '/icons/check.png'
            },
            {
              action: 'decline',
              title: 'Absagen',
              icon: '/icons/close.png'
            },
            {
              action: 'unsubscribe',
              title: 'Benachrichtigungen deaktivieren',
              icon: '/icons/unsubscribe.png'
            }
          ];
        }
        
        const result = await sendNotificationToMany([subscription], payload);
        results.successful += result.successful;
        results.failed += result.failed;
      } catch (error) {
        console.error(`Error sending reminder to subscription ${subscription._id}:`, error);
        results.failed++;
      }
    }

    console.log(`Custom reminder sent: ${results.successful} successful, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    console.error('Send custom event reminder error:', error);
    throw error;
  }
};

// Schedule notifications for an event
const scheduleEventNotifications = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event || !event.notificationSettings || !event.notificationSettings.enabled) {
      return;
    }

    console.log(`[Notification Queue] Scheduling notifications for event: ${event.title}`);

    // Remove existing notifications for this event
    await NotificationQueue.deleteMany({ eventId });

    // Create new notification queue entries
    const reminderTimes = event.notificationSettings.reminderTimes || [];
    for (const reminderTime of reminderTimes) {
      const totalMinutes = reminderTime.hours * 60 + (reminderTime.minutes || 0);
      const scheduledTime = new Date(event.startTime.getTime() - totalMinutes * 60 * 1000);
      
      // Only schedule if the reminder time is in the future
      if (scheduledTime > new Date()) {
        await NotificationQueue.create({
          eventId,
          reminderTime,
          scheduledTime,
          status: 'pending'
        });
        
        console.log(`[Notification Queue] Scheduled reminder for ${reminderTime.hours}h${reminderTime.minutes || 0}m before event at ${scheduledTime.toISOString()}`);
      }
    }
  } catch (error) {
    console.error(`[Notification Queue] Error scheduling notifications for event ${eventId}:`, error);
  }
};

// Process pending notifications
const processPendingNotifications = async () => {
  try {
    const now = new Date();
    console.log(`[Notification Queue] ${now.toISOString()} - Processing pending notifications...`);

    // Find notifications that should be sent now (within 5 minutes of scheduled time)
    const dueNotifications = await NotificationQueue.find({
      status: 'pending',
      scheduledTime: {
        $lte: new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
      }
    }).populate('eventId');

    console.log(`[Notification Queue] Found ${dueNotifications.length} due notifications`);

    for (const notification of dueNotifications) {
      try {
        if (!notification.eventId) {
          console.log(`[Notification Queue] Event not found for notification ${notification._id}, marking as failed`);
          notification.status = 'failed';
          notification.error = 'Event not found';
          await notification.save();
          continue;
        }

        console.log(`[Notification Queue] Processing notification for event: ${notification.eventId.title}`);
        
        // Check if this notification was already sent by looking at the event's remindersSent array
        const alreadySent = notification.eventId.remindersSent.some(sent => 
          sent.reminderTime === notification.reminderTime.hours && 
          sent.reminderMinutes === (notification.reminderTime.minutes || 0)
        );

        if (alreadySent) {
          console.log(`[Notification Queue] Notification already sent for event ${notification.eventId.title}, marking as sent`);
          notification.status = 'sent';
          await notification.save();
          continue;
        }

        // Send the notification
        await sendCustomEventReminder(notification.eventId, notification.reminderTime);
        
        // Mark as sent
        notification.status = 'sent';
        notification.lastAttempt = now;
        notification.attempts += 1;
        await notification.save();
        
        console.log(`[Notification Queue] Successfully sent notification for event: ${notification.eventId.title}`);
        
      } catch (error) {
        console.error(`[Notification Queue] Error processing notification ${notification._id}:`, error);
        
        // Mark as failed if too many attempts
        notification.attempts += 1;
        notification.lastAttempt = now;
        notification.error = error.message;
        
        if (notification.attempts >= 3) {
          notification.status = 'failed';
          console.log(`[Notification Queue] Marking notification ${notification._id} as failed after 3 attempts`);
        }
        
        await notification.save();
      }
    }
  } catch (error) {
    console.error('[Notification Queue] Error processing pending notifications:', error);
  }
};

// Clean up old notifications
const cleanupOldNotifications = async () => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const result = await NotificationQueue.deleteMany({
      $or: [
        { status: 'sent', updatedAt: { $lt: twoDaysAgo } },
        { status: 'failed', updatedAt: { $lt: twoDaysAgo } }
      ]
    });
    
    if (result.deletedCount > 0) {
      console.log(`[Notification Queue] Cleaned up ${result.deletedCount} old notifications`);
    }
  } catch (error) {
    console.error('[Notification Queue] Error cleaning up old notifications:', error);
  }
};

// Start the queue processor
const startNotificationQueue = () => {
  console.log('[Notification Queue] Starting notification queue processor...');
  
  // Process pending notifications every 2 minutes
  const processInterval = setInterval(processPendingNotifications, 2 * 60 * 1000);
  
  // Clean up old notifications every hour
  const cleanupInterval = setInterval(cleanupOldNotifications, 60 * 60 * 1000);
  
  // Run immediately
  processPendingNotifications();
  
  // Return cleanup function
  return () => {
    clearInterval(processInterval);
    clearInterval(cleanupInterval);
  };
};

module.exports = {
  scheduleEventNotifications,
  processPendingNotifications,
  cleanupOldNotifications,
  startNotificationQueue
};
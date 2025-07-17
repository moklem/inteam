const PushSubscription = require('../models/PushSubscription');
const { sendNotification, sendNotificationToMany } = require('../utils/webpush');

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user._id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }

    // Check if subscription already exists
    let pushSub = await PushSubscription.findOne({
      'subscription.endpoint': subscription.endpoint
    });

    if (pushSub) {
      // Update existing subscription
      pushSub.user = userId;
      pushSub.subscription = subscription;
      pushSub.updatedAt = Date.now();
    } else {
      // Create new subscription
      pushSub = new PushSubscription({
        user: userId,
        subscription
      });
    }

    await pushSub.save();

    // Send welcome notification
    const welcomePayload = {
      title: 'Benachrichtigungen aktiviert!',
      body: 'Du erhältst jetzt Push-Benachrichtigungen für Events und Einladungen.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'welcome',
      data: {
        url: '/profile'
      }
    };

    await sendNotification(subscription, welcomePayload);

    res.status(201).json({ 
      message: 'Successfully subscribed to push notifications',
      subscription: pushSub
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Failed to subscribe to push notifications' });
  }
};

// Unsubscribe from push notifications
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint required' });
    }

    const result = await PushSubscription.deleteOne({
      user: userId,
      'subscription.endpoint': endpoint
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    const subscription = await PushSubscription.findOneAndUpdate(
      { user: userId },
      { preferences, updatedAt: Date.now() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'No push subscription found' });
    }

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: subscription.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};

// Send test notification
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await PushSubscription.findOne({ user: userId });

    if (!subscription) {
      return res.status(404).json({ message: 'No push subscription found' });
    }

    const payload = {
      title: 'Test Benachrichtigung',
      body: 'Dies ist eine Test-Benachrichtigung von deinem Volleyball Team Manager.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: 'test',
      data: {
        url: '/profile'
      }
    };

    const result = await sendNotification(subscription.subscription, payload);

    if (!result.success) {
      if (result.shouldDelete) {
        await PushSubscription.deleteOne({ _id: subscription._id });
        return res.status(410).json({ message: 'Subscription expired' });
      }
      return res.status(500).json({ message: 'Failed to send notification' });
    }

    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ message: 'Failed to send test notification' });
  }
};

// Send event reminder notifications
exports.sendEventReminders = async (eventId, reminderHours = 24) => {
  try {
    const Event = require('../models/Event');
    const event = await Event.findById(eventId)
      .populate('attendingPlayers')
      .populate('invitedPlayers')
      .populate('team');

    if (!event) {
      console.error('Event not found:', eventId);
      return;
    }

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

    const payload = {
      title: `Erinnerung: ${event.title}`,
      body: `${event.title} beginnt in ${reminderHours} Stunden`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `event-reminder-${eventId}`,
      data: {
        eventId,
        url: `/player/events/${eventId}`
      }
    };

    const results = await sendNotificationToMany(subscriptions, payload);
    console.log(`Event reminder sent: ${results.successful} successful, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    console.error('Send event reminders error:', error);
  }
};

// Send guest player invitation notification
exports.sendGuestInvitation = async (playerId, invitationData) => {
  try {
    const subscription = await PushSubscription.findOne({
      user: playerId,
      'preferences.guestInvitations': true
    });

    if (!subscription) {
      console.log('No subscription found for player:', playerId);
      return;
    }

    const payload = {
      title: 'Neue Gastspieler-Einladung',
      body: `Du wurdest als Gastspieler für ${invitationData.teamName} eingeladen`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `invitation-${invitationData.invitationId}`,
      requireInteraction: true,
      actions: [
        {
          action: 'accept',
          title: 'Annehmen',
          icon: '/icons/check.png'
        },
        {
          action: 'decline',
          title: 'Ablehnen',
          icon: '/icons/close.png'
        }
      ],
      data: {
        invitationId: invitationData.invitationId,
        teamId: invitationData.teamId,
        url: '/player/dashboard'
      }
    };

    const result = await sendNotification(subscription.subscription, payload);

    if (!result.success && result.shouldDelete) {
      await PushSubscription.deleteOne({ _id: subscription._id });
    }

    return result;
  } catch (error) {
    console.error('Send guest invitation error:', error);
  }
};

// Get user's notification status
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await PushSubscription.findOne({ user: userId });

    res.json({
      subscribed: !!subscription,
      preferences: subscription?.preferences || {
        eventReminders: true,
        guestInvitations: true,
        teamUpdates: true,
        reminderHours: 24
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Failed to get notification status' });
  }
};
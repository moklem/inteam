const webpush = require('web-push');

// Configure web-push with VAPID keys
const configureWebPush = () => {
  // Check if VAPID keys are configured
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('VAPID keys not configured. Push notifications will not work.');
    console.log('Generate VAPID keys using: npx web-push generate-vapid-keys');
    return false;
  }

  // Set VAPID details
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@volleyball-team.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  return true;
};

// Send push notification
const sendNotification = async (subscription, payload) => {
  try {
    const response = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true, response };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Check if the subscription is invalid
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { success: false, error: 'Subscription expired', shouldDelete: true };
    }
    
    return { success: false, error: error.message };
  }
};

// Send notification to multiple subscriptions
const sendNotificationToMany = async (subscriptions, payload) => {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendNotification(sub.subscription, payload))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
  
  return { successful, failed, total: subscriptions.length };
};

module.exports = {
  configureWebPush,
  sendNotification,
  sendNotificationToMany,
  webpush
};
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Subscribe to push notifications
router.post('/subscribe', notificationController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', notificationController.unsubscribe);

// Update notification preferences
router.put('/preferences', notificationController.updatePreferences);

// Send test notification
router.post('/test', notificationController.sendTestNotification);

// Get notification status
router.get('/status', notificationController.getStatus);

module.exports = router;
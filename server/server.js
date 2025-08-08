require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

// Import routes
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const eventRoutes = require('./routes/eventRoutes');
const attributeRoutes = require('./routes/attributeRoutes');
const teamInviteRoutes = require('./routes/teamInviteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const progressRoutes = require('./routes/progressRoutes');

// Import web-push configuration
const { configureWebPush } = require('./utils/webpush');
const { startNotificationScheduler } = require('./utils/notificationScheduler');
const { startNotificationQueue } = require('./utils/notificationQueue');
const { startVotingDeadlineJob } = require('./utils/votingDeadlineJob');


const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'InTeam Backend Server',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Configure web-push
configureWebPush();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/team-invites', teamInviteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/progress', progressRoutes);

// Manual data fix endpoint
app.post('/api/fix-uninvited-players', async (req, res) => {
  try {
    console.log('[API] Fix uninvited players requested');
    const { fixUninvitedTeamPlayers } = require('./utils/dataFixes');
    const result = await fixUninvitedTeamPlayers();
    
    res.json({ 
      message: 'Fix completed',
      ...result
    });
  } catch (error) {
    console.error('[API] Fix failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset fix status endpoint (for testing)
app.post('/api/reset-fix-status', async (req, res) => {
  try {
    const { resetFixStatus } = require('./utils/dataFixes');
    const result = await resetFixStatus();
    res.json({ 
      message: 'Reset completed',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('[API] Reset failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test notification scheduler endpoint
app.post('/api/test-notifications', async (req, res) => {
  try {
    console.log('[API] Manual notification check requested');
    const { processPendingNotifications } = require('./utils/notificationQueue');
    await processPendingNotifications();
    
    res.json({ 
      message: 'Notification check completed - see server logs for details'
    });
  } catch (error) {
    console.error('[API] Notification check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule notifications for all existing events
app.post('/api/schedule-all-notifications', async (req, res) => {
  try {
    console.log('[API] Scheduling notifications for all existing events');
    const Event = require('./models/Event');
    const { scheduleEventNotifications } = require('./utils/notificationQueue');
    
    const now = new Date();
    const events = await Event.find({
      startTime: { $gt: now },
      'notificationSettings.enabled': true
    });
    
    let scheduled = 0;
    for (const event of events) {
      await scheduleEventNotifications(event._id);
      scheduled++;
    }
    
    res.json({ 
      message: `Scheduled notifications for ${scheduled} events`
    });
  } catch (error) {
    console.error('[API] Schedule all notifications failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check event notification settings endpoint
app.get('/api/debug-event-notifications', async (req, res) => {
  try {
    const Event = require('./models/Event');
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const events = await Event.find({
      startTime: {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).select('title startTime notificationSettings remindersSent attendingPlayers invitedPlayers');
    
    const eventDetails = events.map(event => ({
      title: event.title,
      startTime: event.startTime,
      notificationSettings: event.notificationSettings,
      remindersSent: event.remindersSent,
      attendingPlayersCount: event.attendingPlayers.length,
      invitedPlayersCount: event.invitedPlayers.length
    }));
    
    res.json({ 
      message: 'Event notification settings',
      events: eventDetails
    });
  } catch (error) {
    console.error('[API] Debug check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check push subscription status endpoint
app.get('/api/debug-push-subscriptions', async (req, res) => {
  try {
    const PushSubscription = require('./models/PushSubscription');
    const User = require('./models/User');
    
    const subscriptions = await PushSubscription.find({})
      .populate('user', 'name email role')
      .select('user preferences createdAt updatedAt');
    
    const totalUsers = await User.countDocuments({ role: { $in: ['Spieler', 'Jugendspieler'] } });
    
    res.json({ 
      message: 'Push subscription status',
      totalPlayers: totalUsers,
      totalSubscriptions: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        userName: sub.user?.name || 'Unknown',
        userEmail: sub.user?.email || 'Unknown',
        userRole: sub.user?.role || 'Unknown',
        preferences: sub.preferences,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }))
    });
  } catch (error) {
    console.error('[API] Debug subscriptions check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check notification queue status endpoint
app.get('/api/debug-notification-queue', async (req, res) => {
  try {
    const NotificationQueue = require('./models/NotificationQueue');
    const now = new Date();
    
    const queueStats = await NotificationQueue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const upcomingNotifications = await NotificationQueue.find({
      status: 'pending',
      scheduledTime: { $gte: now }
    })
    .populate('eventId', 'title startTime')
    .sort({ scheduledTime: 1 })
    .limit(10);
    
    const overdueNotifications = await NotificationQueue.find({
      status: 'pending',
      scheduledTime: { $lt: now }
    })
    .populate('eventId', 'title startTime')
    .sort({ scheduledTime: 1 })
    .limit(10);
    
    res.json({
      message: 'Notification queue status',
      stats: queueStats,
      upcomingNotifications: upcomingNotifications.map(n => ({
        eventTitle: n.eventId?.title || 'Unknown',
        eventStartTime: n.eventId?.startTime,
        reminderTime: `${n.reminderTime.hours}h${n.reminderTime.minutes || 0}m`,
        scheduledTime: n.scheduledTime,
        status: n.status
      })),
      overdueNotifications: overdueNotifications.map(n => ({
        eventTitle: n.eventId?.title || 'Unknown',
        eventStartTime: n.eventId?.startTime,
        reminderTime: `${n.reminderTime.hours}h${n.reminderTime.minutes || 0}m`,
        scheduledTime: n.scheduledTime,
        status: n.status,
        attempts: n.attempts
      }))
    });
  } catch (error) {
    console.error('[API] Debug notification queue check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static assets in production
//if (process.env.NODE_ENV === 'production') {
//  app.use(express.static(path.join(__dirname, '../client/build')));
//  
//  app.get('*', (req, res) => {
//    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
//  });
//}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/volleyball-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  
  // Run data fixes in production
  if (process.env.NODE_ENV === 'production') {
    const { fixUninvitedTeamPlayers } = require('./utils/dataFixes');
    // Run fix after a short delay to ensure all models are loaded
    setTimeout(() => {
      fixUninvitedTeamPlayers().catch(err => 
        console.error('[Data Fix] Failed to run fixes:', err)
      );
    }, 5000);
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start notification systems after server is running
  startNotificationScheduler(); // Keep for backward compatibility
  startNotificationQueue(); // New persistent queue system
  startVotingDeadlineJob(); // Start voting deadline checking
});
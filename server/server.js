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

// Routes
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/team-invites', teamInviteRoutes);

// Manual data fix endpoint (temporary)
app.get('/api/fix-uninvited-players', async (req, res) => {
  try {
    console.log('[API] Fix uninvited players requested');
    const { fixUninvitedTeamPlayers } = require('./utils/dataFixes');
    await fixUninvitedTeamPlayers();
    res.json({ message: 'Fix completed - check server logs for details' });
  } catch (error) {
    console.error('[API] Fix failed:', error);
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
});
# Render Backend Deployment Guide

## Overview
This guide explains how to deploy the volleyball-app backend server on Render with all the correct package versions.

## Prerequisites
- A Render account (https://render.com)
- A GitHub/GitLab repository with your code
- MongoDB Atlas account or other MongoDB hosting service

## Package Versions
The backend uses the following main dependencies:
- Node.js: >=14.0.0 (recommended: 18.17.0 LTS)
- Express: ^4.18.2
- Mongoose: ^7.5.0
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.1
- cors: ^2.8.5
- dotenv: ^16.3.1
- morgan: ^1.10.0

## Deployment Steps

### 1. Prepare Your Repository
Ensure these files are in your repository:
- `server/render-build.sh` (build script)
- `render.yaml` (Render configuration)
- `server/package.json` and `server/package-lock.json`

### 2. Create a New Web Service on Render
1. Log in to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub/GitLab repository
4. Select your repository

### 3. Configure the Service
Use these settings:
- **Name**: volleyball-app-backend
- **Region**: Frankfurt (or your preferred region)
- **Branch**: main (or your default branch)
- **Runtime**: Node
- **Build Command**: `chmod +x ./server/render-build.sh && ./server/render-build.sh`
- **Start Command**: `cd server && node server.js`

### 4. Set Environment Variables
In the Render dashboard, add these environment variables:

```
NODE_VERSION=18.17.0
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/volleyball-app
JWT_SECRET=your-secret-key-here
PORT=10000
CORS_ORIGIN=https://your-frontend-url.com
```

### 5. Optional: Add Health Check Endpoint
Add this to your `server/server.js`:

```javascript
// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

### 6. Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. Monitor the logs for any errors

## Build Command Explanation
The build script (`render-build.sh`) does the following:
1. Navigates to the server directory
2. Runs `npm ci --production` to install exact versions from package-lock.json
3. Creates necessary directories (logs, uploads)
4. Sets proper file permissions

## Important Notes
- The `npm ci` command ensures exact package versions are installed
- The `--production` flag excludes devDependencies
- Make sure your MongoDB connection string is properly configured
- Update CORS_ORIGIN to match your frontend URL
- The volleyball-app dependency in package.json references the parent directory, which Render handles correctly

## Troubleshooting
- If build fails, check the Render logs
- Ensure all environment variables are set correctly
- Verify MongoDB connection string includes database name
- Check that Node version is compatible with your dependencies

## Alternative Build Commands
If you need to modify the build process, you can use these commands directly in Render:

```bash
# Simple version
cd server && npm ci --production

# With additional setup
cd server && npm ci --production && mkdir -p logs uploads

# With environment check
cd server && node --version && npm ci --production
```

## Security Considerations
- Never commit `.env` files to your repository
- Use Render's environment variables for sensitive data
- Generate a strong JWT_SECRET (Render can auto-generate this)
- Restrict CORS_ORIGIN to your specific frontend domain
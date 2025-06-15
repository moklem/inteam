#!/usr/bin/env bash
# Build script for Render deployment

echo "Starting Render build process..."

# Exit on error
set -e

# Navigate to server directory (Render starts from root)
cd server

# Clean install server dependencies
echo "Installing server dependencies..."
npm ci --production

# Go back to root
cd ..

# Build the client application
echo "Building React client..."
cd client
npm ci
npm run build
cd ..

# Back to server for directory setup
cd server
mkdir -p logs
mkdir -p uploads

# Set proper permissions
chmod -R 755 .
#!/usr/bin/env bash
# Optimized build script for Render backend deployment

echo "Starting Render build process..."

# Exit on error
set -e

# Navigate to server directory
cd server

# Clean install server dependencies (production only)
echo "Installing server dependencies..."
npm ci --production

# Create necessary directories
mkdir -p logs
mkdir -p uploads

# Set proper permissions
chmod -R 755 .

echo "Build complete!"
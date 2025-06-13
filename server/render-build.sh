#!/usr/bin/env bash
# Build script for Render deployment

echo "Starting Render build process..."

# Exit on error
set -e

# Navigate to server directory (Render starts from root)
cd server

# Clean install dependencies with exact versions from package-lock.json
echo "Installing server dependencies..."
npm ci --production

# Create necessary directories
mkdir -p logs
mkdir -p uploads

# Set proper permissions
chmod -R 755 .

echo "Build completed successfully!"
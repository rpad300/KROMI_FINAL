#!/bin/bash

# VisionKrono Production Deployment Script
# This script updates the production server with the latest code

set -e

echo "🚀 VisionKrono Production Deployment"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to infra directory
cd "$(dirname "$0")" || exit 1

# Step 1: Pull latest code
print_status "Pulling latest code from GitHub..."
cd .. || exit 1
git pull origin master
print_status "✅ Code updated"

# Step 2: Rebuild Docker image
print_status "Rebuilding Docker image..."
cd infra || exit 1
docker-compose build --no-cache visionkrono
print_status "✅ Docker image rebuilt"

# Step 3: Restart services
print_status "Restarting services..."
docker-compose up -d
print_status "✅ Services restarted"

# Step 4: Show status
print_status "Deployment complete! Checking status..."
docker-compose ps

print_status "🎉 Production deployment successful!"
print_status "Access your application at: https://your-domain.com:1144"


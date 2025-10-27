#!/bin/bash

# VisionKrono Deploy Script
# This script automates the deployment process

set -e

echo "🚀 VisionKrono Deploy Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_warning "Please copy env.example to .env and configure your API keys"
    print_warning "cp env.example .env"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_warning "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_warning "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

print_status "All prerequisites met!"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans || true

# Build the application
print_status "Building VisionKrono application..."
docker-compose build --no-cache

# Start the application
print_status "Starting VisionKrono..."
docker-compose up -d

# Wait for the application to start
print_status "Waiting for application to start..."
sleep 10

# Check if the application is running
if curl -k -s https://localhost:1144/api/config > /dev/null; then
    print_status "✅ VisionKrono is running successfully!"
    echo ""
    echo "🌐 Access URLs:"
    echo "   https://localhost:1144"
    echo "   https://127.0.0.1:1144"
    echo ""
    echo "📱 Mobile access (same network):"
    echo "   https://YOUR_SERVER_IP:1144"
    echo ""
    echo "📊 Container status:"
    docker-compose ps
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop app: docker-compose down"
    echo "   Restart: docker-compose restart"
    echo "   Update: ./deploy.sh"
else
    print_error "❌ Application failed to start!"
    print_warning "Check logs with: docker-compose logs"
    exit 1
fi

print_status "Deploy completed successfully! 🎉"

@echo off
REM VisionKrono Deploy Script for Windows
REM This script automates the deployment process on Windows

echo 🚀 VisionKrono Deploy Script
echo ==============================

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo [WARNING] Please copy env.example to .env and configure your API keys
    echo [WARNING] copy env.example .env
    pause
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo [WARNING] Please install Docker Desktop first: https://docs.docker.com/desktop/windows/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed!
    echo [WARNING] Please install Docker Compose first
    pause
    exit /b 1
)

echo [INFO] All prerequisites met!

REM Stop existing containers
echo [INFO] Stopping existing containers...
docker-compose down --remove-orphans

REM Build the application
echo [INFO] Building VisionKrono application...
docker-compose build --no-cache

REM Start the application
echo [INFO] Starting VisionKrono...
docker-compose up -d

REM Wait for the application to start
echo [INFO] Waiting for application to start...
timeout /t 10 /nobreak >nul

REM Check if the application is running
curl -k -s https://localhost:1144/api/config >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ❌ Application failed to start!
    echo [WARNING] Check logs with: docker-compose logs
    pause
    exit /b 1
) else (
    echo [INFO] ✅ VisionKrono is running successfully!
    echo.
    echo 🌐 Access URLs:
    echo    https://localhost:1144
    echo    https://127.0.0.1:1144
    echo.
    echo 📱 Mobile access (same network):
    echo    https://YOUR_SERVER_IP:1144
    echo.
    echo 📊 Container status:
    docker-compose ps
    echo.
    echo 📋 Useful commands:
    echo    View logs: docker-compose logs -f
    echo    Stop app: docker-compose down
    echo    Restart: docker-compose restart
    echo    Update: deploy.bat
)

echo [INFO] Deploy completed successfully! 🎉
pause

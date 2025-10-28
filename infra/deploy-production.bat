@echo off
REM VisionKrono Production Deployment Script for Windows

echo 🚀 VisionKrono Production Deployment
echo ======================================

cd /d "%~dp0" || exit /b 1

REM Step 1: Pull latest code
echo [INFO] Pulling latest code from GitHub...
cd .. || exit /b 1
git pull origin master
echo [INFO] ✅ Code updated

REM Step 2: Rebuild Docker image  
echo [INFO] Rebuilding Docker image...
cd infra || exit /b 1
docker-compose build --no-cache visionkrono
echo [INFO] ✅ Docker image rebuilt

REM Step 3: Restart services
echo [INFO] Restarting services...
docker-compose up -d
echo [INFO] ✅ Services restarted

REM Step 4: Show status
echo [INFO] Deployment complete! Checking status...
docker-compose ps

echo [INFO] 🎉 Production deployment successful!
echo [INFO] Access your application at: https://your-domain.com:1144

pause


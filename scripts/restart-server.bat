@echo off
echo ===================================
echo Reiniciando servidor com codigo novo
echo ===================================
echo.
echo Matando processo node...
taskkill /F /IM node.exe
timeout /t 2
echo.
echo Limpando cache...
del /Q node_modules\.cache\* 2>nul
echo.
echo Iniciando servidor...
node server.js


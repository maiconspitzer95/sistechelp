@echo off
title Sistech Desk - Modo Desenvolvimento
echo =======================================================
echo    Sistech Desk - Santa Casa de Pelotas
echo    Iniciando Servidor Backend e Cliente Frontend...
echo =======================================================

start "Sistech Desk Backend (Porta 3001)" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul
start "Sistech Desk Frontend (Porta 5173)" cmd /k "cd client && npm run dev"

echo.
echo Servicos iniciados!
echo Backend:  http://localhost:3001/api/health
echo Frontend: http://localhost:5173
echo.
pause

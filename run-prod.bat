@echo off
title Sistech Desk - Producao (Windows Server 2019)
echo =======================================================
echo    Sistech Desk - Santa Casa de Pelotas (Producao)
echo =======================================================

cd server
echo Verificando dependencias e rodando compilacao...
call npm run build
echo Iniciando backend com PM2...
call npx pm2 start ../ecosystem.config.js
call npx pm2 save
echo.
echo Sistech Desk em execucao no PM2!
echo Digite 'npx pm2 status' para acompanhar.
pause

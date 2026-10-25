@echo off
title Sistech Desk - Producao (Windows Server 2019)
echo =======================================================
echo    Sistech Desk - Santa Casa de Pelotas (Producao)
echo =======================================================

echo 1. Compilando aplicacao (Backend + Frontend)...
call npm run build
if %errorlevel% neq 0 (
    echo Erro no build da aplicacao!
    pause
    exit /b %errorlevel%
)

echo 2. Iniciando processo unico com PM2 (porta 5002)...
call pm2 start server.js --name sistech || call npx pm2 start server.js --name sistech
call pm2 save || call npx pm2 save

echo.
echo =======================================================
echo    Sistech Desk ativo com sucesso!
echo    Acesse: http://localhost:5002
echo =======================================================
pause

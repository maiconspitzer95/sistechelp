@echo off
title Sistech Desk - Build Completo
echo =======================================================
echo    Compilando Sistech Desk (Backend + Frontend)...
echo =======================================================

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Erro na compilacao do projeto!
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo    Build finalizado com sucesso!
echo    Frontend e Backend prontos para execucao no server.js
echo =======================================================
pause

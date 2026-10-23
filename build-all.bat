@echo off
title Sistech Desk - Build Completo
echo =======================================================
echo    Compilando Sistech Desk (Backend + Frontend)...
echo =======================================================

echo 1. Compilando Backend...
cd server
call npm run build
if %errorlevel% neq 0 (
    echo Erro na compilacao do backend!
    pause
    exit /b %errorlevel%
)

echo 2. Compilando Frontend...
cd ..\client
call npm run build
if %errorlevel% neq 0 (
    echo Erro na compilacao do frontend!
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================
echo    Build finalizado com sucesso!
echo =======================================================
pause

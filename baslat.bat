@echo off
title LORE - Editoryal Icerik Motoru
echo ========================================================
echo    L O R E - Elit Dijital Kultur Icerik Motoru
echo    Uygulama baslatiliyor, lutfen bekleyin...
echo ========================================================
echo.

cd /d "%~dp0"
call npm.cmd run dev -- --open

pause

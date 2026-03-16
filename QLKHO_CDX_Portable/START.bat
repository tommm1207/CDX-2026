@echo off
chcp 65001 >nul
title QLKHO CDX - Con Duong Xanh
echo.
echo  ============================================
echo    QLKHO CDX - Quan Ly Kho Con Duong Xanh
echo  ============================================
echo.
echo    App:   http://localhost:8092/
echo    Admin: http://localhost:8092/_/
echo.
echo    Dang nhap app: CDX004 / 132
echo.
echo    (Dong cua so nay de dung app)
echo  ============================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8092
pocketbase.exe serve --http=0.0.0.0:8092

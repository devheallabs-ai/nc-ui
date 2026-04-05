@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM NC UI — Start Script (Windows)
REM Build, serve, and play with NC UI files.
REM Part of the NC language ecosystem by DevHeal Labs AI.
REM ─────────────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "CLI=%SCRIPT_DIR%cli.js"
set "EXAMPLES_DIR=%SCRIPT_DIR%examples"
set "PLAYGROUND=%SCRIPT_DIR%playground.html"

REM ─── Check Node.js ─────────────────────────────────────────────────────────

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Node.js is not installed.
    echo   NC UI requires Node.js 16 or later.
    echo.
    echo   Install it from: https://nodejs.org
    echo.
    exit /b 1
)

REM ─── Route Command ─────────────────────────────────────────────────────────

if "%~1"=="" goto :usage
if /i "%~1"=="build" goto :build
if /i "%~1"=="serve" goto :serve
if /i "%~1"=="playground" goto :playground
if /i "%~1"=="examples" goto :examples
goto :usage

REM ─── Banner ────────────────────────────────────────────────────────────────

:banner
echo.
echo   ========================================
echo            NC UI  v1.1.0
echo     Build websites in plain English
echo   ========================================
echo.
goto :eof

REM ─── Build ─────────────────────────────────────────────────────────────────

:build
if "%~2"=="" (
    echo.
    echo   [ERROR] Missing file argument.
    echo   Usage: start.bat build ^<file.ncui^>
    echo.
    exit /b 1
)
if not exist "%~2" (
    echo.
    echo   [ERROR] File not found: %~2
    echo.
    exit /b 1
)
call :banner
echo   Building %~2
echo.
node "%CLI%" build "%~2"
echo.
echo   Done. Open the generated .html file in your browser.
echo.
goto :eof

REM ─── Serve ─────────────────────────────────────────────────────────────────

:serve
if "%~2"=="" (
    echo.
    echo   [ERROR] Missing file argument.
    echo   Usage: start.bat serve ^<file.ncui^>
    echo.
    exit /b 1
)
if not exist "%~2" (
    echo.
    echo   [ERROR] File not found: %~2
    echo.
    exit /b 1
)
set "PORT=3000"
if not "%~3"=="" set "PORT=%~3"
call :banner
echo   Starting dev server...
echo.
node "%CLI%" serve "%~2" %PORT%
goto :eof

REM ─── Playground ────────────────────────────────────────────────────────────

:playground
call :banner
echo   Opening NC UI Playground...
echo.
if not exist "%PLAYGROUND%" (
    echo   [ERROR] playground.html not found.
    exit /b 1
)
start "" "%PLAYGROUND%"
echo   Playground opened.
echo.
goto :eof

REM ─── Examples ──────────────────────────────────────────────────────────────

:examples
call :banner
echo   Building all examples...
echo.
set "COUNT=0"
for %%f in ("%EXAMPLES_DIR%\*.ncui") do (
    echo   Building: %%~nxf
    node "%CLI%" build "%%f"
    set /a COUNT+=1
)
echo.
if !COUNT! equ 0 (
    echo   No .ncui files found in examples\.
) else (
    echo   Built !COUNT! example(s). Check examples\ for the .html files.
)
echo.
goto :eof

REM ─── Usage ─────────────────────────────────────────────────────────────────

:usage
call :banner
echo   Usage:
echo.
echo     start.bat build ^<file.ncui^>       Compile .ncui to .html
echo     start.bat serve ^<file.ncui^>       Dev server with live reload
echo     start.bat playground               Open browser-based playground
echo     start.bat examples                 Build all examples
echo.
echo   Quick start:
echo.
echo     start.bat build examples\portfolio.ncui
echo     start.bat serve examples\portfolio.ncui
echo     start.bat playground
echo.
echo   Part of the NC language ecosystem — https://devheallabs.in
echo.
goto :eof

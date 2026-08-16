@echo off
echo.
echo ========================================
echo   Wordle Word List Converter
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python from python.org
    echo Or see WORDLE_SETUP_INSTRUCTIONS.md for alternative methods
    pause
    exit /b 1
)

echo Checking for word list files...
echo.

if not exist "wordle-Ta.txt" (
    echo ERROR: wordle-Ta.txt not found!
    echo Please save the first document as wordle-Ta.txt
    echo.
    pause
    exit /b 1
)

if not exist "wordle-La.txt" (
    echo ERROR: wordle-La.txt not found!
    echo Please save the second document as wordle-La.txt
    echo.
    pause
    exit /b 1
)

echo [OK] Found both word list files
echo.
echo Converting to JSON format...
echo.

python process_wordle_lists.py

if errorlevel 1 (
    echo.
    echo ERROR: Conversion failed
    echo See WORDLE_SETUP_INSTRUCTIONS.md for help
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! Word lists converted!
echo ========================================
echo.
echo Your games now have 13,000+ words!
echo.
echo Next: Open wordle.html and test it!
echo.
pause

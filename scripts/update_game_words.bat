@echo off
REM Update all game word lists from word-lists/ to data/ folder
echo ============================================
echo Updating Game Word Lists
echo ============================================
echo.

echo [1/2] Updating Wordle word lists...
python scripts/update_wordle_json.py
echo.

echo [2/2] Updating Spelling Bee word list...
python scripts/update_spelling_bee_json.py
echo.

echo ============================================
echo All game word lists updated successfully!
echo ============================================
pause

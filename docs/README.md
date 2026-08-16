# 📚 Library Games - Documentation

Welcome to the documentation for the School Library Games project!

## 📖 Quick Navigation

### Getting Started
- **[START_HERE.md](./START_HERE.md)** - Begin here! First-time setup and overview
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide for common tasks
- **[SETUP.md](./SETUP.md)** - Detailed configuration and API setup

### Development
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - How to deploy the website
- **[IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)** - Future enhancements and roadmap
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Developer quick reference

### Completion Reports
- **[PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md)** - Overall project completion status
- **[COMPLETED_10K_WORDS.md](./COMPLETED_10K_WORDS.md)** - Word database implementation
- **[FIXES_COMPLETED.md](./FIXES_COMPLETED.md)** - Bug fixes and improvements
- **[CRITICAL_FIXES.md](./CRITICAL_FIXES.md)** - Critical bug fixes applied
- **[SESSION_COMPLETE_SUMMARY.md](./SESSION_COMPLETE_SUMMARY.md)** - Session summaries
- **[FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md)** - Pre-launch checklist
- **[WORDLE_SETUP_INSTRUCTIONS.md](./WORDLE_SETUP_INSTRUCTIONS.md)** - Wordle integration guide

### Resources
- **[ICONS_NEEDED.txt](./ICONS_NEEDED.txt)** - List of icons to create

## 🎯 Documentation by Task

### "I want to set up the project"
1. Read [START_HERE.md](./START_HERE.md)
2. Follow [SETUP.md](./SETUP.md)
3. Use [QUICK_START.md](./QUICK_START.md) for reference

### "I want to add word lists"
1. Read [COMPLETED_10K_WORDS.md](./COMPLETED_10K_WORDS.md)
2. Run scripts in `/scripts/` folder
3. Word lists are in `/word-lists/` folder

### "I want to deploy the website"
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Complete [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md)

### "I want to fix bugs"
1. Check [FIXES_COMPLETED.md](./FIXES_COMPLETED.md) for known issues
2. Review [CRITICAL_FIXES.md](./CRITICAL_FIXES.md) for past fixes

### "I want to add features"
1. Read [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)
2. Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for code structure

## 📂 Project Structure

```
/                          # Root directory
├── README.md             # Main project overview
├── docs/                 # This folder - all documentation
├── scripts/              # Python/batch scripts for word processing
├── word-lists/           # All word databases
├── css/                  # Stylesheets
├── js/                   # JavaScript code
├── data/                 # JSON data files
└── assets/               # Images, icons, sounds
```

## 🔧 Scripts Available

All scripts are located in `/scripts/` folder:

1. **filter_spelling_bee_words.py** - Filter words.txt to 4+ letters for Spelling Bee
   ```bash
   python scripts/filter_spelling_bee_words.py
   ```
   Or on Windows: `scripts\filter_spelling_bee.bat`

2. **process_wordle_lists.py** - Convert Wordle word lists to JSON
   ```bash
   python scripts/process_wordle_lists.py
   ```

3. **convert_words.bat** - Windows batch file to convert all word lists

## 🎮 Word List Files

Located in `/word-lists/`:

- **wordle-La.txt** - 2,309 Wordle target answers (5-letter words)
- **wordle-Ta.txt** - 12,972 Wordle valid guesses (5-letter words)
- **words.txt** - Full dictionary (all word lengths)
- **spelling-bee-words.json** - Filtered words (4+ letters) for Spelling Bee

## 📝 Notes

- All documentation uses Markdown format
- Scripts use Python 3
- Word lists are text files (one word per line) or JSON arrays
- Icon placeholders are in `assets/css/icon-placeholders.css`

## 🆘 Need Help?

1. Check [START_HERE.md](./START_HERE.md) first
2. Read relevant documentation above
3. Review code comments in `/js/` files
4. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for API details

---

**Last Updated**: August 15, 2026  
**Project Version**: 1.0.0

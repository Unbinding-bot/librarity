/**
 * Theme System
 * Manages light/dark mode switching with localStorage persistence
 */

export class ThemeSystem {
    constructor() {
        this.themes = {
            light: 'light',
            dark: 'dark'
        };
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.listeners = [];
    }

    /**
     * Initialize theme system
     */
    init() {
        // Apply initial theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.watchSystemTheme();
        
        console.log(`Theme system initialized (${this.currentTheme} mode)`);
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (error) {
            console.warn('Cannot access localStorage:', error);
            return null;
        }
    }

    /**
     * Get system/OS preferred theme
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.themes.dark;
        }
        return this.themes.light;
    }

    /**
     * Watch for system theme changes
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Use addEventListener if available, fallback to addListener
            const listener = (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.getStoredTheme()) {
                    const newTheme = e.matches ? this.themes.dark : this.themes.light;
                    this.applyTheme(newTheme);
                }
            };
            
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', listener);
            } else if (mediaQuery.addListener) {
                mediaQuery.addListener(listener);
            }
        }
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        const validTheme = theme === this.themes.dark ? this.themes.dark : this.themes.light;
        
        // Update HTML attribute
        document.documentElement.setAttribute('data-theme', validTheme);
        
        // Update body class for additional styling
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${validTheme}`);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(validTheme);
        
        // Update current theme
        this.currentTheme = validTheme;
        
        // Notify listeners
        this.notifyListeners(validTheme);
        
        console.log(`Theme applied: ${validTheme}`);
    }

    /**
     * Update meta theme-color for mobile browsers
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        
        // Set appropriate theme color based on theme
        const color = theme === this.themes.dark ? '#1a1a1a' : '#2d5016';
        metaThemeColor.setAttribute('content', color);
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === this.themes.dark ? this.themes.light : this.themes.dark;
        this.setTheme(newTheme);
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        const validTheme = theme === this.themes.dark ? this.themes.dark : this.themes.light;
        
        // Store preference
        try {
            localStorage.setItem('theme', validTheme);
        } catch (error) {
            console.warn('Cannot save theme to localStorage:', error);
        }
        
        // Apply theme
        this.applyTheme(validTheme);
    }

    /**
     * Clear stored theme preference (revert to system preference)
     */
    clearPreference() {
        try {
            localStorage.removeItem('theme');
        } catch (error) {
            console.warn('Cannot clear theme from localStorage:', error);
        }
        
        // Apply system theme
        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Check if dark mode is active
     */
    isDarkMode() {
        return this.currentTheme === this.themes.dark;
    }

    /**
     * Check if light mode is active
     */
    isLightMode() {
        return this.currentTheme === this.themes.light;
    }

    /**
     * Add listener for theme changes
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of theme change
     */
    notifyListeners(theme) {
        this.listeners.forEach(callback => {
            try {
                callback(theme);
            } catch (error) {
                console.error('Theme listener error:', error);
            }
        });
    }

    /**
     * Create theme toggle button
     */
    createToggleButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return null;
        }

        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle theme');
        button.setAttribute('title', 'Toggle light/dark mode');
        
        // Add icon
        this.updateButtonIcon(button);
        
        // Add click handler
        button.addEventListener('click', () => {
            this.toggle();
            this.updateButtonIcon(button);
        });
        
        container.appendChild(button);
        
        return button;
    }

    /**
     * Update toggle button icon
     */
    updateButtonIcon(button) {
        const isDark = this.isDarkMode();
        button.innerHTML = isDark ? 
            '<span class="theme-icon">🌙</span><span class="theme-label">Dark</span>' : 
            '<span class="theme-icon">☀️</span><span class="theme-label">Light</span>';
        button.setAttribute('aria-label', isDark ? 'Dark mode' : 'Light mode');
    }
}

// Create global instance
const themeSystem = new ThemeSystem();

// Make available globally
window.themeSystem = themeSystem;

export default themeSystem;

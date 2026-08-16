/* ================================================
   Library Games - Event System
   Manages themed events like Halloween, Christmas, etc.
   ================================================ */

class EventSystem {
    constructor() {
        this.activeEvent = null;
        this.events = [];
        this.styleElement = null;
    }
    
    /**
     * Initialize event system
     */
    async init() {
        await this.loadEvents();
        await this.checkActiveEvent();
        console.log('✓ Event System initialized');
    }
    
    /**
     * Load events from JSON
     */
    async loadEvents() {
        try {
            const response = await fetch('./data/events.json');
            if (!response.ok) {
                throw new Error('Failed to load events');
            }
            
            const data = await response.json();
            this.events = data.events || [];
            
            console.log(`Loaded ${this.events.length} events`);
            
        } catch (error) {
            console.error('Error loading events:', error);
            this.events = [];
        }
    }
    
    /**
     * Check if any event is currently active
     */
    async checkActiveEvent() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        
        // Find active event within date range
        const activeEvent = this.events.find(event => {
            if (!event.active) return false;
            
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            
            return today >= start && today <= end;
        });
        
        if (activeEvent) {
            this.activateEvent(activeEvent);
        } else {
            this.deactivateEvent();
        }
    }
    
    /**
     * Activate an event theme
     */
    activateEvent(event) {
        this.activeEvent = event;
        console.log(`🎉 Activating event: ${event.name}`);
        
        // Apply theme
        this.applyTheme(event.theme);
        
        // Apply custom CSS
        if (event.customCSS) {
            this.applyCustomCSS(event.customCSS);
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('eventActivated', {
            detail: { event }
        }));
    }
    
    /**
     * Deactivate current event
     */
    deactivateEvent() {
        if (!this.activeEvent) return;
        
        console.log(`Deactivating event: ${this.activeEvent.name}`);
        this.activeEvent = null;
        
        // Remove custom styles
        this.removeCustomStyles();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('eventDeactivated'));
    }
    
    /**
     * Apply theme colors
     */
    applyTheme(theme) {
        if (!theme) return;
        
        const root = document.documentElement;
        
        if (theme.primaryColor) {
            root.style.setProperty('--primary', theme.primaryColor);
            root.style.setProperty('--primary-color', theme.primaryColor);
        }
        
        if (theme.secondaryColor) {
            root.style.setProperty('--secondary', theme.secondaryColor);
            root.style.setProperty('--secondary-color', theme.secondaryColor);
        }
        
        if (theme.accentColor) {
            root.style.setProperty('--accent', theme.accentColor);
            root.style.setProperty('--accent-color', theme.accentColor);
        }
        
        if (theme.backgroundImage) {
            document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundSize = 'cover';
        }
    }
    
    /**
     * Apply custom CSS for event
     */
    applyCustomCSS(css) {
        // Remove existing custom styles
        this.removeCustomStyles();
        
        // Create new style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'event-custom-styles';
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }
    
    /**
     * Remove custom styles
     */
    removeCustomStyles() {
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }
        
        // Reset theme to defaults
        const root = document.documentElement;
        root.style.removeProperty('--primary');
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--secondary');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--accent-color');
        
        document.body.style.backgroundImage = '';
        document.body.style.backgroundAttachment = '';
        document.body.style.backgroundSize = '';
    }
    
    /**
     * Get currently active event
     */
    getActiveEvent() {
        return this.activeEvent;
    }
    
    /**
     * Get all events
     */
    getAllEvents() {
        return this.events;
    }
    
    /**
     * Check if a specific event is active
     */
    isEventActive(eventId) {
        return this.activeEvent && this.activeEvent.id === eventId;
    }
    
    /**
     * Manually activate an event (for preview purposes)
     */
    previewEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            this.activateEvent(event);
            return true;
        }
        return false;
    }
    
    /**
     * Reload events and recheck active event
     */
    async reload() {
        await this.loadEvents();
        await this.checkActiveEvent();
    }
}

// Create singleton instance
const eventSystem = new EventSystem();

// Export for use in other modules
export default eventSystem;

// Make available globally
if (typeof window !== 'undefined') {
    window.eventSystem = eventSystem;
}

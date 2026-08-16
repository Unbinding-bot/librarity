/* ================================================
   Library Games - Content Manager
   High-level API for managing website content
   ================================================ */

import githubAPI from './github-api.js';

class ContentManager {
    constructor() {
        this.cache = {
            banners: null,
            events: null,
            books: null,
            dailyOverrides: null,
            comingSoon: null
        };
        this.cacheTimestamps = {};
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    /**
     * Initialize content manager
     */
    async init() {
        await githubAPI.init();
        console.log('✓ Content Manager initialized');
    }
    
    /**
     * Check if cache is still valid
     */
    isCacheValid(key) {
        if (!this.cache[key]) return false;
        if (!this.cacheTimestamps[key]) return false;
        
        const now = Date.now();
        const age = now - this.cacheTimestamps[key];
        return age < this.cacheTimeout;
    }
    
    /**
     * Update cache
     */
    updateCache(key, data) {
        this.cache[key] = data;
        this.cacheTimestamps[key] = Date.now();
    }
    
    /**
     * Clear cache for a specific key or all
     */
    clearCache(key = null) {
        if (key) {
            this.cache[key] = null;
            delete this.cacheTimestamps[key];
        } else {
            this.cache = {
                banners: null,
                events: null,
                books: null,
                dailyOverrides: null,
                comingSoon: null
            };
            this.cacheTimestamps = {};
        }
    }
    
    // ================================================
    // Banners Management
    // ================================================
    
    /**
     * Get all banners
     */
    async getBanners(useCache = true) {
        if (useCache && this.isCacheValid('banners')) {
            return this.cache.banners;
        }
        
        try {
            const { data } = await githubAPI.readJSON('data/banners.json');
            const banners = data.banners || [];
            this.updateCache('banners', banners);
            return banners;
        } catch (error) {
            console.error('Error getting banners:', error);
            throw error;
        }
    }
    
    /**
     * Add new banner
     */
    async addBanner(banner) {
        try {
            const banners = await this.getBanners(false);
            
            // Generate ID if not provided
            if (!banner.id) {
                banner.id = `banner_${Date.now()}`;
            }
            
            // Add default fields
            banner.active = banner.active !== false;
            banner.priority = banner.priority || banners.length + 1;
            
            banners.push(banner);
            
            await githubAPI.updateBanners(banners, `Add banner: ${banner.title}`);
            this.clearCache('banners');
            
            return banner;
        } catch (error) {
            console.error('Error adding banner:', error);
            throw error;
        }
    }
    
    /**
     * Update existing banner
     */
    async updateBanner(bannerId, updates) {
        try {
            const banners = await this.getBanners(false);
            const index = banners.findIndex(b => b.id === bannerId);
            
            if (index === -1) {
                throw new Error(`Banner not found: ${bannerId}`);
            }
            
            banners[index] = { ...banners[index], ...updates };
            
            await githubAPI.updateBanners(banners, `Update banner: ${banners[index].title}`);
            this.clearCache('banners');
            
            return banners[index];
        } catch (error) {
            console.error('Error updating banner:', error);
            throw error;
        }
    }
    
    /**
     * Delete banner
     */
    async deleteBanner(bannerId) {
        try {
            const banners = await this.getBanners(false);
            const filtered = banners.filter(b => b.id !== bannerId);
            
            if (filtered.length === banners.length) {
                throw new Error(`Banner not found: ${bannerId}`);
            }
            
            await githubAPI.updateBanners(filtered, `Delete banner: ${bannerId}`);
            this.clearCache('banners');
            
            return true;
        } catch (error) {
            console.error('Error deleting banner:', error);
            throw error;
        }
    }
    
    // ================================================
    // Events Management
    // ================================================
    
    /**
     * Get all events
     */
    async getEvents(useCache = true) {
        if (useCache && this.isCacheValid('events')) {
            return this.cache.events;
        }
        
        try {
            const { data } = await githubAPI.readJSON('data/events.json');
            const events = data.events || [];
            this.updateCache('events', events);
            return events;
        } catch (error) {
            console.error('Error getting events:', error);
            throw error;
        }
    }
    
    /**
     * Add new event
     */
    async addEvent(event) {
        try {
            const events = await this.getEvents(false);
            
            if (!event.id) {
                event.id = `event_${Date.now()}`;
            }
            
            event.active = event.active !== false;
            
            events.push(event);
            
            await githubAPI.updateEvents(events, `Add event: ${event.name}`);
            this.clearCache('events');
            
            return event;
        } catch (error) {
            console.error('Error adding event:', error);
            throw error;
        }
    }
    
    /**
     * Update existing event
     */
    async updateEvent(eventId, updates) {
        try {
            const events = await this.getEvents(false);
            const index = events.findIndex(e => e.id === eventId);
            
            if (index === -1) {
                throw new Error(`Event not found: ${eventId}`);
            }
            
            events[index] = { ...events[index], ...updates };
            
            await githubAPI.updateEvents(events, `Update event: ${events[index].name}`);
            this.clearCache('events');
            
            return events[index];
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }
    
    /**
     * Delete event
     */
    async deleteEvent(eventId) {
        try {
            const events = await this.getEvents(false);
            const filtered = events.filter(e => e.id !== eventId);
            
            if (filtered.length === events.length) {
                throw new Error(`Event not found: ${eventId}`);
            }
            
            await githubAPI.updateEvents(filtered, `Delete event: ${eventId}`);
            this.clearCache('events');
            
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }
    
    // ================================================
    // Books Management
    // ================================================
    
    /**
     * Get all books
     */
    async getBooks(useCache = true) {
        if (useCache && this.isCacheValid('books')) {
            return this.cache.books;
        }
        
        try {
            const { data } = await githubAPI.readJSON('data/books.json');
            const books = data.books || [];
            this.updateCache('books', books);
            return books;
        } catch (error) {
            console.error('Error getting books:', error);
            throw error;
        }
    }
    
    /**
     * Add new book
     */
    async addBook(book) {
        try {
            const books = await this.getBooks(false);
            
            if (!book.id) {
                book.id = `book_${Date.now()}`;
            }
            
            books.push(book);
            
            await githubAPI.updateBooks(books, `Add book: ${book.title}`);
            this.clearCache('books');
            
            return book;
        } catch (error) {
            console.error('Error adding book:', error);
            throw error;
        }
    }
    
    /**
     * Update existing book
     */
    async updateBook(bookId, updates) {
        try {
            const books = await this.getBooks(false);
            const index = books.findIndex(b => b.id === bookId);
            
            if (index === -1) {
                throw new Error(`Book not found: ${bookId}`);
            }
            
            books[index] = { ...books[index], ...updates };
            
            await githubAPI.updateBooks(books, `Update book: ${books[index].title}`);
            this.clearCache('books');
            
            return books[index];
        } catch (error) {
            console.error('Error updating book:', error);
            throw error;
        }
    }
    
    /**
     * Delete book
     */
    async deleteBook(bookId) {
        try {
            const books = await this.getBooks(false);
            const filtered = books.filter(b => b.id !== bookId);
            
            if (filtered.length === books.length) {
                throw new Error(`Book not found: ${bookId}`);
            }
            
            await githubAPI.updateBooks(filtered, `Delete book: ${bookId}`);
            this.clearCache('books');
            
            return true;
        } catch (error) {
            console.error('Error deleting book:', error);
            throw error;
        }
    }
    
    // ================================================
    // Daily Overrides Management
    // ================================================
    
    /**
     * Get all daily overrides
     */
    async getDailyOverrides(useCache = true) {
        if (useCache && this.isCacheValid('dailyOverrides')) {
            return this.cache.dailyOverrides;
        }
        
        try {
            const { data } = await githubAPI.readJSON('data/daily-overrides.json');
            const overrides = data.overrides || [];
            this.updateCache('dailyOverrides', overrides);
            return overrides;
        } catch (error) {
            console.error('Error getting daily overrides:', error);
            throw error;
        }
    }
    
    /**
     * Add daily override
     */
    async addDailyOverride(override) {
        try {
            const overrides = await this.getDailyOverrides(false);
            
            if (!override.id) {
                override.id = `override_${Date.now()}`;
            }
            
            overrides.push(override);
            
            await githubAPI.updateDailyOverrides(overrides, `Add daily override for ${override.date}`);
            this.clearCache('dailyOverrides');
            
            return override;
        } catch (error) {
            console.error('Error adding daily override:', error);
            throw error;
        }
    }
    
    /**
     * Update daily override
     */
    async updateDailyOverride(overrideId, updates) {
        try {
            const overrides = await this.getDailyOverrides(false);
            const index = overrides.findIndex(o => o.id === overrideId);
            
            if (index === -1) {
                throw new Error(`Override not found: ${overrideId}`);
            }
            
            overrides[index] = { ...overrides[index], ...updates };
            
            await githubAPI.updateDailyOverrides(overrides, `Update daily override: ${overrideId}`);
            this.clearCache('dailyOverrides');
            
            return overrides[index];
        } catch (error) {
            console.error('Error updating daily override:', error);
            throw error;
        }
    }
    
    /**
     * Delete daily override
     */
    async deleteDailyOverride(overrideId) {
        try {
            const overrides = await this.getDailyOverrides(false);
            const filtered = overrides.filter(o => o.id !== overrideId);
            
            if (filtered.length === overrides.length) {
                throw new Error(`Override not found: ${overrideId}`);
            }
            
            await githubAPI.updateDailyOverrides(filtered, `Delete daily override: ${overrideId}`);
            this.clearCache('dailyOverrides');
            
            return true;
        } catch (error) {
            console.error('Error deleting daily override:', error);
            throw error;
        }
    }
    
    // ================================================
    // Coming Soon Management
    // ================================================
    
    /**
     * Get all coming soon items
     */
    async getComingSoon(useCache = true) {
        if (useCache && this.isCacheValid('comingSoon')) {
            return this.cache.comingSoon;
        }
        
        try {
            const { data } = await githubAPI.readJSON('data/coming-soon.json');
            const items = data.items || [];
            this.updateCache('comingSoon', items);
            return items;
        } catch (error) {
            console.error('Error getting coming soon items:', error);
            throw error;
        }
    }
    
    /**
     * Add coming soon item
     */
    async addComingSoonItem(item) {
        try {
            const items = await this.getComingSoon(false);
            
            if (!item.id) {
                item.id = `coming_soon_${Date.now()}`;
            }
            
            items.push(item);
            
            await githubAPI.updateComingSoon(items, `Add coming soon: ${item.title}`);
            this.clearCache('comingSoon');
            
            return item;
        } catch (error) {
            console.error('Error adding coming soon item:', error);
            throw error;
        }
    }
    
    /**
     * Update coming soon item
     */
    async updateComingSoonItem(itemId, updates) {
        try {
            const items = await this.getComingSoon(false);
            const index = items.findIndex(i => i.id === itemId);
            
            if (index === -1) {
                throw new Error(`Coming soon item not found: ${itemId}`);
            }
            
            items[index] = { ...items[index], ...updates };
            
            await githubAPI.updateComingSoon(items, `Update coming soon: ${items[index].title}`);
            this.clearCache('comingSoon');
            
            return items[index];
        } catch (error) {
            console.error('Error updating coming soon item:', error);
            throw error;
        }
    }
    
    /**
     * Delete coming soon item
     */
    async deleteComingSoonItem(itemId) {
        try {
            const items = await this.getComingSoon(false);
            const filtered = items.filter(i => i.id !== itemId);
            
            if (filtered.length === items.length) {
                throw new Error(`Coming soon item not found: ${itemId}`);
            }
            
            await githubAPI.updateComingSoon(filtered, `Delete coming soon: ${itemId}`);
            this.clearCache('comingSoon');
            
            return true;
        } catch (error) {
            console.error('Error deleting coming soon item:', error);
            throw error;
        }
    }
    
    // ================================================
    // Utility Functions
    // ================================================
    
    /**
     * Get recent commits
     */
    async getRecentActivity(limit = 10) {
        try {
            return await githubAPI.getCommits(limit);
        } catch (error) {
            console.error('Error getting recent activity:', error);
            throw error;
        }
    }
    
    /**
     * Upload image
     */
    async uploadImage(file, folder = 'assets/images') {
        try {
            // Read file as base64
            const reader = new FileReader();
            const base64Data = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            // Generate filename
            const timestamp = Date.now();
            const extension = file.name.split('.').pop();
            const filename = `${folder}/${timestamp}.${extension}`;
            
            const result = await githubAPI.uploadImage(filename, base64Data, `Upload image: ${file.name}`);
            
            return {
                success: true,
                url: `./${result.path}`,
                path: result.path
            };
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
}

// Create singleton instance
const contentManager = new ContentManager();

// Export for use in other modules
export default contentManager;

// Make available globally
if (typeof window !== 'undefined') {
    window.contentManager = contentManager;
}

    /**
     * Get game content
     */
    async getGameContent(useCache = true) {
        if (useCache && this.isCacheValid('gameContent')) {
            return this.cache.gameContent.data;
        }
        
        try {
            const content = await githubAPI.readJSON('data/game-content.json');
            this.updateCache('gameContent', content);
            return content;
        } catch (error) {
            console.error('Error loading game content:', error);
            return {
                wordle: { wordList: [], dailyWords: [] },
                spelling_bee: { puzzles: [] },
                word_ladder: { puzzles: [] },
                trivia: { categories: [], questions: [] },
                flashcards: { decks: [] },
                wikipedia_race: { challenges: [] }
            };
        }
    }
    
    /**
     * Update game content for a specific game
     */
    async updateGameContent(gameType, content) {
        const allContent = await this.getGameContent(false);
        allContent[gameType] = content;
        
        await githubAPI.updateGameContent(allContent, `Update ${gameType} game content`);
        this.clearCache('gameContent');
        
        console.log(`Updated ${gameType} content`);
    }
    
    /**
     * Add word to Wordle word list
     */
    async addWordleWord(word) {
        const content = await this.getGameContent(false);
        if (!content.wordle.wordList.includes(word.toLowerCase())) {
            content.wordle.wordList.push(word.toLowerCase());
            content.wordle.wordList.sort();
            await this.updateGameContent('wordle', content.wordle);
        }
    }
    
    /**
     * Add trivia question
     */
    async addTriviaQuestion(question) {
        const content = await this.getGameContent(false);
        question.id = `trivia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        content.trivia.questions.push(question);
        await this.updateGameContent('trivia', content.trivia);
    }
    
    /**
     * Delete trivia question
     */
    async deleteTriviaQuestion(questionId) {
        const content = await this.getGameContent(false);
        content.trivia.questions = content.trivia.questions.filter(q => q.id !== questionId);
        await this.updateGameContent('trivia', content.trivia);
    }
    
    /**
     * Add flashcard deck
     */
    async addFlashcardDeck(deck) {
        const content = await this.getGameContent(false);
        deck.id = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        content.flashcards.decks.push(deck);
        await this.updateGameContent('flashcards', content.flashcards);
    }

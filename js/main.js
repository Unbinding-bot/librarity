/* ================================================
   Library Games - Main Application Entry Point
   ================================================ */

import router from './router.js';

// Global app state
window.appState = {
    user: null,
    theme: 'default',
    loading: false,
    config: {}
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('🎮 Library Games - Initializing...');
    
    try {
        // Show loading screen
        showLoading();
        
        // Initialize components
        await initializeComponents();
        
        // Setup routes
        setupRoutes();
        
        // Setup global event listeners
        setupEventListeners();
        
        // Check for active theme/event
        await checkActiveEvent();
        
        // Initialize ambient effects
        initAmbientEffects();
        
        // Hide loading screen and show app
        hideLoading();
        
        console.log('✅ Library Games - Ready!');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Failed to load application. Please refresh the page.');
    }
}

/**
 * Show loading screen
 */
function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

/**
 * Hide loading screen and show app
 */
function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen && app) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            app.style.display = 'block';
            
            // Trigger fade in animation
            app.style.opacity = '0';
            requestAnimationFrame(() => {
                app.style.transition = 'opacity 0.5s ease';
                app.style.opacity = '1';
            });
        }, 500);
    }
}

/**
 * Initialize all components
 */
async function initializeComponents() {
    // Import and initialize theme system FIRST (before any UI renders)
    const { default: themeSystem } = await import('./theme/theme-system.js');
    themeSystem.init();
    window.themeSystem = themeSystem;
    
    // Import event system
    const { default: eventSystem } = await import('./events/event-system.js');
    await eventSystem.init();
    
    // Import carousel component
    const { default: BannerCarousel } = await import('./components/banner-carousel.js');
    
    // Initialize navbar
    await initNavbar();
    
    // Initialize footer
    await initFooter();
    
    // Initialize banner carousel
    window.bannerCarousel = new BannerCarousel('banner-carousel', {
        autoPlay: true,
        autoPlayInterval: 5000,
        showControls: true,
        showIndicators: true,
        pauseOnHover: true,
        keyboardNavigation: true,
        swipeEnabled: true,
        loop: true
    });
    
    console.log('✓ Components initialized');
}

/**
 * Initialize navbar (placeholder)
 */
async function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    navbar.innerHTML = `
        <div class="navbar-container flex-between">
            <div class="navbar-logo flex gap-md">
                <span class="logo-text font-handwritten text-primary" style="font-size: 1.5rem; font-weight: 700;">
                    Library Games
                </span>
            </div>
            <nav class="navbar-nav flex gap-lg">
                <a href="#/" class="nav-link">Home</a>
                <a href="#/games" class="nav-link">Games</a>
                <a href="wordle.html" class="nav-link">🎮 Wordle</a>
                <a href="spelling-bee.html" class="nav-link">🐝 Spelling Bee</a>
                <a href="word-ladder.html" class="nav-link">🪜 Word Ladder</a>
                <a href="trivia.html" class="nav-link">🎯 Trivia</a>
                <a href="flashcards.html" class="nav-link">📇 Flashcards</a>
                <a href="wikipedia-race.html" class="nav-link">🏁 Wiki Race</a>
                <a href="tools.html" class="nav-link">Tools</a>
                <a href="#/books" class="nav-link">Books</a>
                <a href="leaderboard.html" class="nav-link">Leaderboards</a>
                <a href="#/coming-soon" class="nav-link">Coming Soon</a>
            </nav>
            <div class="navbar-actions">
                <div id="theme-toggle-container" class="nav-actions"></div>
                <button id="menu-toggle" class="btn btn-sm btn-outline hide-desktop">☰</button>
            </div>
        </div>
    `;
    
    // Add styles for navbar
    const style = document.createElement('style');
    style.textContent = `
        .navbar {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            padding: var(--spacing-md) var(--spacing-lg);
            box-shadow: var(--shadow-md);
            position: sticky;
            top: 0;
            z-index: var(--z-sticky);
        }
        .navbar-container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .nav-link {
            color: white;
            font-weight: 600;
            padding: var(--spacing-sm) var(--spacing-md);
            border-radius: var(--radius-md);
            transition: background-color var(--transition-fast);
        }
        .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .nav-link.active {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .logo-img {
            border: 3px solid white;
        }
        @media (max-width: 768px) {
            .navbar-nav {
                display: none;
            }
            .navbar-nav.open {
                display: flex;
                flex-direction: column;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--primary-color);
                padding: var(--spacing-md);
                box-shadow: var(--shadow-lg);
            }
            .hide-desktop {
                display: block !important;
            }
        }
        @media (min-width: 769px) {
            .hide-desktop {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Setup mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navbarNav = navbar.querySelector('.navbar-nav');
    if (menuToggle && navbarNav) {
        menuToggle.addEventListener('click', () => {
            navbarNav.classList.toggle('open');
        });
    }
    
    // Create theme toggle button
    if (window.themeSystem) {
        window.themeSystem.createToggleButton('theme-toggle-container');
    }
}

/**
 * Initialize footer (placeholder)
 */
async function initFooter() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const currentYear = new Date().getFullYear();
    
    footer.innerHTML = `
        <div class="footer-content text-center p-lg">
            <p class="text-muted">
                Powered by School Library © ${currentYear}
            </p>
            <p class="text-muted text-sm">
                Made with 💚 for learning
            </p>
        </div>
    `;
    
    // Add footer styles
    const style = document.createElement('style');
    style.textContent = `
        .footer {
            background-color: var(--surface-color);
            border-top: 2px solid var(--border-color);
            margin-top: var(--spacing-xxl);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Setup application routes
 */
function setupRoutes() {
    // Home page
    router.register('/', {
        title: 'Library Games - Home',
        component: async () => {
            return `
                <div class="home-page">
                    <div class="hero text-center p-xl">
                        <h1 class="ink-writing font-handwritten">Welcome to Library Games</h1>
                        <p class="text-lg text-secondary">
                            Learn, Play, and Explore in our Interactive Library
                        </p>
                    </div>
                    
                    <div class="bookshelf-container mt-xl">
                        <h2 class="text-center mb-lg">Choose Your Adventure</h2>
                        
                        <!-- Games Shelf -->
                        <section class="shelf-section mb-xl">
                            <h3 class="shelf-title">📚 Games</h3>
                            <div class="bookshelf grid grid-cols-3 gap-lg">
                                ${createBookSpine('Wordle', 'primary', null, true, 'wordle.html')}
                                ${createBookSpine('Spelling Bee', 'secondary', null, true, 'spelling-bee.html')}
                                ${createBookSpine('Word Ladder', 'accent', null, true, 'word-ladder.html')}
                                ${createBookSpine('Trivia', 'primary', null, true, 'trivia.html')}
                                ${createBookSpine('Flashcards', 'secondary', null, true, 'flashcards.html')}
                                ${createBookSpine('Wikipedia Race', 'accent', null, true, 'wikipedia-race.html')}
                            </div>
                        </section>
                        
                        <!-- Tools Shelf -->
                        <section class="shelf-section mb-xl">
                            <h3 class="shelf-title">🔧 Tools</h3>
                            <div class="bookshelf grid grid-cols-3 gap-lg">
                                ${createBookSpine('Dictionary', 'info', null, true, 'tools.html#dictionary')}
                                ${createBookSpine('Thesaurus', 'info', null, true, 'tools.html#thesaurus')}
                                ${createBookSpine('Rhyme Finder', 'info', null, true, 'tools.html#rhyme')}
                            </div>
                        </section>
                        
                        <!-- Other Sections -->
                        <section class="shelf-section">
                            <h3 class="shelf-title">Coming Soon</h3>
                            <div class="bookshelf grid grid-cols-3 gap-lg">
                                ${createBookSpine('Book List', 'warning', '/books', false)}
                                ${createBookSpine('Coming Soon', 'muted', '/coming-soon', false)}
                            </div>
                        </section>
                    </div>
                </div>
            `;
        }
    });
    
    // Games listing page
    router.register('/games', {
        title: 'Games - Library Games',
        component: async () => {
            return `
                <div class="games-page">
                    <h1>Games</h1>
                    <p>Select a game to play!</p>
                    <div class="grid grid-cols-2-md grid-cols-3-lg gap-lg mt-lg">
                        ${createGameCard('Wordle', 'Guess the 5-letter word', '/games/wordle')}
                        ${createGameCard('Spelling Bee', 'Form words from letters', '/games/spelling-bee')}
                        ${createGameCard('Word Ladder', 'Transform one word to another', '/games/word-ladder')}
                        ${createGameCard('Trivia', 'Test your knowledge', '/games/trivia')}
                        ${createGameCard('Flashcards', 'Study with flashcards', '/games/flashcards')}
                        ${createGameCard('Wikipedia Race', 'Navigate between articles', '/games/wikipedia-race')}
                    </div>
                </div>
            `;
        }
    });
    
    // Placeholder routes for other pages
    ['tools', 'books', 'coming-soon', 'admin'].forEach(path => {
        router.register(`/${path}`, {
            title: `${capitalize(path)} - Library Games`,
            component: async () => {
                return `
                    <div class="placeholder-page text-center p-xl">
                        <h1>${capitalize(path)}</h1>
                        <p class="text-muted">This feature is coming soon!</p>
                        <button class="btn btn-primary mt-lg" onclick="window.router.navigate('/')">
                            Return Home
                        </button>
                    </div>
                `;
            }
        });
    });
    
    console.log('✓ Routes configured');
    
    // Trigger initial route now that all routes are registered
    router.ready();
}

/**
 * Create book spine HTML
 * @param {string} title
 * @param {string} color
 * @param {string|null} link  - hash route path (e.g. '/games/wordle'), or null if using href
 * @param {boolean} enabled   - false = greyed out, non-clickable
 * @param {string|null} href  - full href override (e.g. 'tools.html#dictionary')
 */
function createBookSpine(title, color, link, enabled = true, href = null) {
    const colors = {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        accent: 'var(--accent-color)',
        info: '#2196f3',
        warning: '#ff9800',
        muted: '#999999'
    };
    
    if (!enabled) {
        return `
            <div class="book-spine card book-spine-disabled"
               style="background: ${colors[color]}; color: white; min-height: 200px; cursor: not-allowed; opacity: 0.5; position:relative;"
               title="${title} — Coming Soon">
                <div class="book-content flex flex-center" style="height: 100%;">
                    <h3 class="font-handwritten" style="writing-mode: vertical-rl; text-orientation: mixed;">
                        ${title}
                    </h3>
                </div>
                <div style="position:absolute;bottom:0.5rem;left:50%;transform:translateX(-50%);font-size:0.65rem;opacity:0.8;white-space:nowrap;">
                    Coming Soon
                </div>
            </div>
        `;
    }

    const resolvedHref = href || `#${link}`;

    return `
        <a href="${resolvedHref}" class="book-spine card" 
           style="background: ${colors[color]}; color: white; min-height: 200px; cursor: pointer;"
           onmouseenter="this.style.transform='translateY(-8px)'"
           onmouseleave="this.style.transform='translateY(0)'">
            <div class="book-content flex flex-center" style="height: 100%;">
                <h3 class="font-handwritten" style="writing-mode: vertical-rl; text-orientation: mixed;">
                    ${title}
                </h3>
            </div>
        </a>
    `;
}

/**
 * Create game card HTML
 */
function createGameCard(title, description, link) {
    return `
        <a href="#${link}" class="game-card card" style="text-decoration: none;">
            <h3>${title}</h3>
            <p class="text-muted">${description}</p>
            <button class="btn btn-primary mt-md w-full">Play Now</button>
        </a>
    `;
}

/**
 * Capitalize string
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Handle online/offline events
    window.addEventListener('online', () => {
        showToast('You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('You are offline. Some features may not work.', 'warning');
    });
    
    // Handle errors
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
    });
}

/**
 * Check for active event/theme
 */
async function checkActiveEvent() {
    try {
        // Will be implemented when theme system is created
        console.log('✓ Theme check complete');
    } catch (error) {
        console.error('Error checking active event:', error);
    }
}

/**
 * Initialize ambient effects (dust particles, spotlight)
 */
function initAmbientEffects() {
    // Add dust particles
    createDustParticles();
    
    // Add spotlight sweep
    createSpotlight();
}

/**
 * Create floating dust particles
 */
function createDustParticles() {
    const particleCount = 20;
    const body = document.body;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'dust-particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.animationDuration = `${10 + Math.random() * 10}s`;
        body.appendChild(particle);
    }
}

/**
 * Create spotlight sweep effect
 */
function createSpotlight() {
    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight';
    document.body.appendChild(spotlight);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Show error message
 */
function showError(message) {
    showToast(message, 'error');
}

// Make showToast available globally for inline event handlers
window.showToast = showToast;
window.showError = showError;

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for use in other modules
export { showToast, showError };

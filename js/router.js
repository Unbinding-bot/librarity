/* ================================================
   Library Games - Client-Side Router
   Hash-based routing for GitHub Pages compatibility
   ================================================ */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.middlewares = [];
        this.history = [];
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRouteChange());
        window.addEventListener('load', () => this.handleRouteChange());
    }
    
    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/', '/games', '/games/:id')
     * @param {Object} config - Route configuration
     */
    register(path, config) {
        const routePattern = this.pathToRegex(path);
        this.routes.set(path, {
            pattern: routePattern,
            component: config.component,
            title: config.title || 'Library Games',
            middleware: config.middleware || [],
            params: this.extractParamNames(path)
        });
        return this;
    }
    
    /**
     * Add global middleware
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    
    /**
     * Convert route path to regex pattern
     * @param {string} path - Route path
     * @returns {RegExp} - Regex pattern
     */
    pathToRegex(path) {
        // Convert '/games/:id' to regex that captures params
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }
    
    /**
     * Extract parameter names from path
     * @param {string} path - Route path
     * @returns {Array} - Array of parameter names
     */
    extractParamNames(path) {
        const matches = path.match(/:\w+/g);
        return matches ? matches.map(match => match.slice(1)) : [];
    }
    
    /**
     * Get current route from hash
     * @returns {string} - Current route path
     */
    getCurrentPath() {
        const hash = window.location.hash.slice(1) || '/';
        return hash.split('?')[0]; // Remove query params
    }
    
    /**
     * Get query parameters from URL
     * @returns {Object} - Query parameters
     */
    getQueryParams() {
        const hash = window.location.hash.slice(1);
        const queryString = hash.split('?')[1];
        if (!queryString) return {};
        
        const params = {};
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
        return params;
    }
    
    /**
     * Match current path to registered routes
     * @returns {Object|null} - Matched route with params
     */
    matchRoute() {
        const path = this.getCurrentPath();
        
        for (const [routePath, route] of this.routes) {
            const match = path.match(route.pattern);
            if (match) {
                // Extract params from URL
                const params = {};
                route.params.forEach((paramName, index) => {
                    params[paramName] = match[index + 1];
                });
                
                return {
                    route,
                    params,
                    query: this.getQueryParams(),
                    path: routePath
                };
            }
        }
        
        return null;
    }
    
    /**
     * Handle route change
     */
    async handleRouteChange() {
        // If no routes registered yet, defer — routes are registered after components init
        if (this.routes.size === 0) {
            return;
        }

        const match = this.matchRoute();
        
        if (!match) {
            // Unknown hash routes → silently redirect home instead of showing 404
            const path = this.getCurrentPath();
            if (path !== '/') {
                this.navigate('/', { replace: true });
                return;
            }
            this.render404();
            return;
        }
        
        const { route, params, query } = match;
        
        // Run global middlewares
        for (const middleware of this.middlewares) {
            const result = await middleware({ route, params, query });
            if (result === false) {
                // Middleware blocked navigation
                return;
            }
        }
        
        // Run route-specific middlewares
        for (const middleware of route.middleware) {
            const result = await middleware({ route, params, query });
            if (result === false) {
                // Middleware blocked navigation
                return;
            }
        }
        
        // Update page title
        document.title = route.title;
        
        // Store in history
        this.history.push({
            path: this.getCurrentPath(),
            params,
            query,
            timestamp: Date.now()
        });
        
        // Render component
        this.currentRoute = { route, params, query };
        await this.renderComponent(route.component, params, query);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    /**
     * Render component
     * @param {Function} component - Component function
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    async renderComponent(component, params, query) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('Main content element not found');
            return;
        }
        
        // Add page transition animation
        mainContent.classList.add('page-transition-exit');
        
        // Wait for exit animation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
            // Call component function to get HTML
            const html = await component({ params, query, router: this });
            
            // Update content
            mainContent.innerHTML = html;
            
            // Add enter animation
            mainContent.classList.remove('page-transition-exit');
            mainContent.classList.add('page-transition-enter');
            
            // Remove animation class after completion
            setTimeout(() => {
                mainContent.classList.remove('page-transition-enter');
            }, 400);
            
        } catch (error) {
            console.error('Error rendering component:', error);
            this.render500(error);
        }
    }
    
    /**
     * Call this after all routes are registered to trigger the initial render.
     */
    ready() {
        this.handleRouteChange();
    }

    /**
     * Navigate to a new route
     * @param {string} path - Route path
     * @param {Object} options - Navigation options
     */
    navigate(path, options = {}) {
        const { replace = false, query = {} } = options;
        
        // Build query string
        const queryString = Object.keys(query).length > 0
            ? '?' + Object.entries(query)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&')
            : '';
        
        const fullPath = path + queryString;
        
        if (replace) {
            window.location.replace('#' + fullPath);
        } else {
            window.location.hash = fullPath;
        }
    }
    
    /**
     * Navigate back
     */
    back() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current
            const previous = this.history[this.history.length - 1];
            if (previous) {
                this.navigate(previous.path, { replace: true });
            } else {
                this.navigate('/', { replace: true });
            }
        } else {
            this.navigate('/', { replace: true });
        }
    }
    
    /**
     * Reload current route
     */
    reload() {
        this.handleRouteChange();
    }
    
    /**
     * Render 404 page
     */
    render404() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        document.title = '404 - Page Not Found | Library Games';
        
        mainContent.innerHTML = `
            <div class="error-page text-center p-xl">
                <h1 class="font-handwritten" style="font-size: 6rem;">404</h1>
                <h2>Page Not Found</h2>
                <p class="text-muted">
                    The page you're looking for doesn't exist in our library.
                </p>
                <button class="btn btn-primary btn-lg mt-lg" onclick="window.router.navigate('/')">
                    Return to Home
                </button>
            </div>
        `;
    }
    
    /**
     * Render 500 error page
     * @param {Error} error - Error object
     */
    render500(error) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        document.title = '500 - Error | Library Games';
        
        mainContent.innerHTML = `
            <div class="error-page text-center p-xl">
                <h1 class="font-handwritten" style="font-size: 6rem;">500</h1>
                <h2>Something Went Wrong</h2>
                <p class="text-muted">
                    An error occurred while loading this page.
                </p>
                ${error ? `<p class="text-error text-sm">${error.message}</p>` : ''}
                <div class="flex gap-md flex-center mt-lg">
                    <button class="btn btn-primary" onclick="window.router.reload()">
                        Try Again
                    </button>
                    <button class="btn btn-outline" onclick="window.router.navigate('/')">
                        Return to Home
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Get current route information
     * @returns {Object} - Current route info
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    /**
     * Check if a path is currently active
     * @param {string} path - Path to check
     * @returns {boolean} - True if active
     */
    isActive(path) {
        return this.getCurrentPath() === path;
    }
}

// Create and export router instance
const router = new Router();

// Make router globally available
window.router = router;

export default router;

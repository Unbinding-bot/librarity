/* ================================================
   Library Games - GitHub OAuth Authentication
   Allows repository collaborators to access admin panel
   ================================================ */

class GitHubAuth {
    constructor() {
        // GitHub OAuth Configuration
        // IMPORTANT: These should be configured for your repository
        this.config = {
            clientId: 'YOUR_GITHUB_CLIENT_ID', // Replace with your OAuth App Client ID
            clientSecret: null, // Never store secret in frontend code
            redirectUri: window.location.origin + window.location.pathname + '#/admin/callback',
            scope: 'read:user repo',
            authEndpoint: 'https://github.com/login/oauth/authorize',
            
            // Repository info for collaborator check
            owner: 'YOUR_GITHUB_USERNAME', // Replace with repository owner
            repo: 'library-games', // Replace with repository name
        };
        
        this.tokenKey = 'github_auth_token';
        this.userKey = 'github_auth_user';
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        const token = this.getToken();
        return token !== null && !this.isTokenExpired(token);
    }
    
    /**
     * Get stored access token
     * @returns {string|null}
     */
    getToken() {
        return sessionStorage.getItem(this.tokenKey);
    }
    
    /**
     * Store access token
     * @param {string} token
     */
    setToken(token) {
        sessionStorage.setItem(this.tokenKey, token);
    }
    
    /**
     * Get stored user info
     * @returns {Object|null}
     */
    getUser() {
        const userStr = sessionStorage.getItem(this.userKey);
        return userStr ? JSON.parse(userStr) : null;
    }
    
    /**
     * Store user info
     * @param {Object} user
     */
    setUser(user) {
        sessionStorage.setItem(this.userKey, JSON.stringify(user));
    }
    
    /**
     * Clear authentication data
     */
    clearAuth() {
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
    }
    
    /**
     * Check if token is expired (simple check - 1 hour timeout)
     * @param {string} token
     * @returns {boolean}
     */
    isTokenExpired(token) {
        // In a real implementation, you'd decode the token or track timestamp
        // For now, we'll check if it exists and assume it's valid
        // GitHub tokens don't expire quickly, but we can implement a timestamp check
        const timestamp = sessionStorage.getItem('auth_timestamp');
        if (!timestamp) return true;
        
        const hoursSinceAuth = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60);
        return hoursSinceAuth > 8; // 8 hour session timeout
    }
    
    /**
     * Initiate GitHub OAuth flow
     */
    login() {
        // Build authorization URL
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: this.config.scope,
            state: this.generateState()
        });
        
        // Store state for verification
        sessionStorage.setItem('oauth_state', params.get('state'));
        
        // Redirect to GitHub
        window.location.href = `${this.config.authEndpoint}?${params.toString()}`;
    }
    
    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code from GitHub
     * @param {string} state - State parameter for CSRF protection
     * @returns {Promise<boolean>} - Success status
     */
    async handleCallback(code, state) {
        try {
            // Verify state to prevent CSRF
            const storedState = sessionStorage.getItem('oauth_state');
            if (state !== storedState) {
                throw new Error('Invalid state parameter');
            }
            
            // Exchange code for access token
            // NOTE: This requires a backend proxy or GitHub OAuth App configured for
            // client-side flow. For GitHub Pages, we'll use a workaround with
            // GitHub's device flow or a serverless function.
            
            // For now, we'll simulate with a direct approach
            // In production, you'd call a backend API that exchanges the code
            const token = await this.exchangeCodeForToken(code);
            
            if (!token) {
                throw new Error('Failed to obtain access token');
            }
            
            // Store token
            this.setToken(token);
            sessionStorage.setItem('auth_timestamp', Date.now().toString());
            
            // Fetch user info
            const user = await this.fetchUser(token);
            this.setUser(user);
            
            // Verify user is a collaborator
            const isCollaborator = await this.checkCollaborator(token, user.login);
            
            if (!isCollaborator) {
                this.clearAuth();
                throw new Error('Access denied: You must be a repository collaborator');
            }
            
            return true;
            
        } catch (error) {
            console.error('OAuth callback error:', error);
            this.clearAuth();
            throw error;
        }
    }
    
    /**
     * Exchange authorization code for access token
     * @param {string} code
     * @returns {Promise<string>}
     */
    async exchangeCodeForToken(code) {
        // IMPORTANT: This is a simplified implementation
        // In production, this MUST be done through a backend proxy
        // to keep the client secret secure
        
        // For GitHub Pages deployment, you have several options:
        // 1. Use GitHub's device flow (no client secret needed)
        // 2. Use a serverless function (Vercel, Netlify, etc.)
        // 3. Use GitHub App installation tokens
        
        // For demo purposes, we'll show the structure:
        try {
            // This would call your backend API:
            // const response = await fetch('YOUR_BACKEND_API/auth/github/callback', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ code })
            // });
            
            // For now, return a placeholder
            // In real implementation, the backend would return the token
            
            // TEMPORARY: Using Personal Access Token as fallback
            // Users can generate a PAT with 'repo' scope and paste it
            const pat = prompt(
                'GitHub OAuth proxy not configured.\n\n' +
                'For demo purposes, enter a GitHub Personal Access Token with "repo" scope:\n\n' +
                '1. Go to GitHub Settings > Developer settings > Personal access tokens\n' +
                '2. Generate new token (classic) with "repo" scope\n' +
                '3. Paste token here\n\n' +
                'Note: This is a temporary workaround. In production, use proper OAuth flow.'
            );
            
            if (pat && pat.startsWith('ghp_')) {
                return pat;
            }
            
            throw new Error('Token exchange not implemented. See console for setup instructions.');
            
        } catch (error) {
            console.error('Token exchange error:', error);
            console.info(
                'To set up OAuth properly:\n' +
                '1. Create a GitHub OAuth App: https://github.com/settings/developers\n' +
                '2. Set Authorization callback URL to: ' + this.config.redirectUri + '\n' +
                '3. Create a backend proxy to exchange code for token (keeps secret secure)\n' +
                '4. Update auth.js with your backend API endpoint'
            );
            throw error;
        }
    }
    
    /**
     * Fetch user information from GitHub
     * @param {string} token
     * @returns {Promise<Object>}
     */
    async fetchUser(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }
    
    /**
     * Check if user is a repository collaborator
     * @param {string} token
     * @param {string} username
     * @returns {Promise<boolean>}
     */
    async checkCollaborator(token, username) {
        try {
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/collaborators/${username}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            // 204 = user is a collaborator
            // 404 = user is not a collaborator
            return response.status === 204;
            
        } catch (error) {
            console.error('Error checking collaborator status:', error);
            return false;
        }
    }
    
    /**
     * Logout user
     */
    logout() {
        this.clearAuth();
        
        // Show confirmation
        if (window.showToast) {
            window.showToast('Logged out successfully', 'success');
        }
        
        // Redirect to home
        if (window.router) {
            window.router.navigate('/');
        }
    }
    
    /**
     * Generate random state for CSRF protection
     * @returns {string}
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Get authorization header for API requests
     * @returns {Object}
     */
    getAuthHeaders() {
        const token = this.getToken();
        if (!token) return {};
        
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
    }
    
    /**
     * Refresh user info (check if still a collaborator)
     * @returns {Promise<boolean>}
     */
    async refreshAuth() {
        try {
            const token = this.getToken();
            const user = this.getUser();
            
            if (!token || !user) {
                return false;
            }
            
            // Fetch updated user info
            const updatedUser = await this.fetchUser(token);
            this.setUser(updatedUser);
            
            // Re-check collaborator status
            const isCollaborator = await this.checkCollaborator(token, updatedUser.login);
            
            if (!isCollaborator) {
                this.clearAuth();
                return false;
            }
            
            // Update timestamp
            sessionStorage.setItem('auth_timestamp', Date.now().toString());
            
            return true;
            
        } catch (error) {
            console.error('Error refreshing auth:', error);
            this.clearAuth();
            return false;
        }
    }
}

// Create and export auth instance
const githubAuth = new GitHubAuth();

// Make globally available
window.githubAuth = githubAuth;

export default githubAuth;

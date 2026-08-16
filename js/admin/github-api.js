/* ================================================
   Library Games - GitHub API Integration
   Manages content via GitHub API for GitHub Pages deployment
   ================================================ */

import { auth } from './auth.js';

class GitHubAPI {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.owner = null;
        this.repo = null;
        this.branch = 'main'; // or 'master' - will be auto-detected
    }
    
    /**
     * Initialize API with repository information
     */
    async init() {
        // Get repository info from auth config
        const config = auth.config;
        if (!config || !config.owner || !config.repo) {
            throw new Error('Repository configuration not found');
        }
        
        this.owner = config.owner;
        this.repo = config.repo;
        
        // Auto-detect default branch
        await this.detectDefaultBranch();
        
        console.log(`✓ GitHub API initialized: ${this.owner}/${this.repo} (${this.branch})`);
    }
    
    /**
     * Detect default branch (main or master)
     */
    async detectDefaultBranch() {
        try {
            const response = await this.request(`/repos/${this.owner}/${this.repo}`);
            this.branch = response.default_branch || 'main';
        } catch (error) {
            console.warn('Could not detect default branch, using "main":', error);
            this.branch = 'main';
        }
    }
    
    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const token = auth.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    /**
     * Read file content from repository
     */
    async readFile(path) {
        try {
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
            );
            
            // Decode base64 content
            const content = atob(response.content.replace(/\n/g, ''));
            
            return {
                content,
                sha: response.sha,
                path: response.path
            };
            
        } catch (error) {
            console.error(`Error reading file ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Read and parse JSON file
     */
    async readJSON(path) {
        try {
            const file = await this.readFile(path);
            return {
                data: JSON.parse(file.content),
                sha: file.sha,
                path: file.path
            };
        } catch (error) {
            console.error(`Error reading JSON ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Write file content to repository
     */
    async writeFile(path, content, message, sha = null) {
        try {
            // Encode content to base64
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            const body = {
                message: message || `Update ${path}`,
                content: encodedContent,
                branch: this.branch
            };
            
            // Include SHA if updating existing file
            if (sha) {
                body.sha = sha;
            }
            
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(body)
                }
            );
            
            return {
                success: true,
                sha: response.content.sha,
                path: response.content.path
            };
            
        } catch (error) {
            console.error(`Error writing file ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Write JSON data to file
     */
    async writeJSON(path, data, message, sha = null) {
        try {
            const content = JSON.stringify(data, null, 2);
            return await this.writeFile(path, content, message, sha);
        } catch (error) {
            console.error(`Error writing JSON ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete file from repository
     */
    async deleteFile(path, message, sha) {
        try {
            if (!sha) {
                throw new Error('SHA required to delete file');
            }
            
            const body = {
                message: message || `Delete ${path}`,
                sha,
                branch: this.branch
            };
            
            await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'DELETE',
                    body: JSON.stringify(body)
                }
            );
            
            return { success: true };
            
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Get list of files in a directory
     */
    async listFiles(path = '') {
        try {
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
            );
            
            return response.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type, // 'file' or 'dir'
                sha: item.sha,
                size: item.size
            }));
            
        } catch (error) {
            console.error(`Error listing files in ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Create or update banners.json
     */
    async updateBanners(banners, message = 'Update banners') {
        try {
            const { sha } = await this.readJSON('data/banners.json');
            return await this.writeJSON(
                'data/banners.json',
                { banners },
                message,
                sha
            );
        } catch (error) {
            console.error('Error updating banners:', error);
            throw error;
        }
    }
    
    /**
     * Create or update events.json
     */
    async updateEvents(events, message = 'Update events') {
        try {
            const { sha } = await this.readJSON('data/events.json');
            return await this.writeJSON(
                'data/events.json',
                { events },
                message,
                sha
            );
        } catch (error) {
            console.error('Error updating events:', error);
            throw error;
        }
    }
    
    /**
     * Create or update books.json
     */
    async updateBooks(books, message = 'Update books') {
        try {
            const { sha } = await this.readJSON('data/books.json');
            return await this.writeJSON(
                'data/books.json',
                { books },
                message,
                sha
            );
        } catch (error) {
            console.error('Error updating books:', error);
            throw error;
        }
    }
    
    /**
     * Create or update daily-overrides.json
     */
    async updateDailyOverrides(overrides, message = 'Update daily overrides') {
        try {
            const { sha } = await this.readJSON('data/daily-overrides.json');
            return await this.writeJSON(
                'data/daily-overrides.json',
                { overrides },
                message,
                sha
            );
        } catch (error) {
            console.error('Error updating daily overrides:', error);
            throw error;
        }
    }
    
    /**
     * Create or update coming-soon.json
     */
    async updateComingSoon(items, message = 'Update coming soon') {
        try {
            const { sha } = await this.readJSON('data/coming-soon.json');
            return await this.writeJSON(
                'data/coming-soon.json',
                { items },
                message,
                sha
            );
        } catch (error) {
            console.error('Error updating coming soon:', error);
            throw error;
        }
    }
    
    /**
     * Get repository information
     */
    async getRepoInfo() {
        try {
            return await this.request(`/repos/${this.owner}/${this.repo}`);
        } catch (error) {
            console.error('Error getting repo info:', error);
            throw error;
        }
    }
    
    /**
     * Get latest commits
     */
    async getCommits(limit = 10) {
        try {
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/commits?per_page=${limit}&sha=${this.branch}`
            );
            
            return response.map(commit => ({
                sha: commit.sha.substring(0, 7),
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: new Date(commit.commit.author.date),
                url: commit.html_url
            }));
            
        } catch (error) {
            console.error('Error getting commits:', error);
            throw error;
        }
    }
    
    /**
     * Create a commit with multiple file changes
     */
    async createCommit(files, message) {
        try {
            // Get the current commit SHA
            const refResponse = await this.request(
                `/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`
            );
            const currentCommitSha = refResponse.object.sha;
            
            // Get the tree SHA of the current commit
            const commitResponse = await this.request(
                `/repos/${this.owner}/${this.repo}/git/commits/${currentCommitSha}`
            );
            const currentTreeSha = commitResponse.tree.sha;
            
            // Create blobs for each file
            const tree = [];
            for (const file of files) {
                const blobResponse = await this.request(
                    `/repos/${this.owner}/${this.repo}/git/blobs`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            content: btoa(unescape(encodeURIComponent(file.content))),
                            encoding: 'base64'
                        })
                    }
                );
                
                tree.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: blobResponse.sha
                });
            }
            
            // Create new tree
            const treeResponse = await this.request(
                `/repos/${this.owner}/${this.repo}/git/trees`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        base_tree: currentTreeSha,
                        tree
                    })
                }
            );
            
            // Create commit
            const newCommitResponse = await this.request(
                `/repos/${this.owner}/${this.repo}/git/commits`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        message,
                        tree: treeResponse.sha,
                        parents: [currentCommitSha]
                    })
                }
            );
            
            // Update reference
            await this.request(
                `/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        sha: newCommitResponse.sha,
                        force: false
                    })
                }
            );
            
            return {
                success: true,
                sha: newCommitResponse.sha
            };
            
        } catch (error) {
            console.error('Error creating commit:', error);
            throw error;
        }
    }
    
    /**
     * Upload image to repository
     */
    async uploadImage(path, base64Data, message = 'Upload image') {
        try {
            // Remove data URL prefix if present
            const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
            
            const body = {
                message,
                content: base64Content,
                branch: this.branch
            };
            
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(body)
                }
            );
            
            return {
                success: true,
                path: response.content.path,
                sha: response.content.sha,
                downloadUrl: response.content.download_url
            };
            
        } catch (error) {
            console.error(`Error uploading image ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if API is properly configured and accessible
     */
    async testConnection() {
        try {
            await this.init();
            await this.getRepoInfo();
            return true;
        } catch (error) {
            console.error('GitHub API connection test failed:', error);
            return false;
        }
    }
}

// Create singleton instance
const githubAPI = new GitHubAPI();

// Export for use in other modules
export default githubAPI;

// Make available globally
if (typeof window !== 'undefined') {
    window.githubAPI = githubAPI;
}

    /**
     * Update game content
     */
    async updateGameContent(content, message = 'Update game content') {
        return this.writeJSON('data/game-content.json', content, message);
    }

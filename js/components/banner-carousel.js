/* ================================================
   Library Games - Banner Carousel Component
   Auto-rotating banner with navigation and indicators
   ================================================ */

class BannerCarousel {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }
        
        // Configuration
        this.config = {
            autoPlay: options.autoPlay !== false, // Default true
            autoPlayInterval: options.autoPlayInterval || 5000, // 5 seconds
            transitionDuration: options.transitionDuration || 600, // 600ms
            showControls: options.showControls !== false, // Default true
            showIndicators: options.showIndicators !== false, // Default true
            pauseOnHover: options.pauseOnHover !== false, // Default true
            keyboardNavigation: options.keyboardNavigation !== false, // Default true
            swipeEnabled: options.swipeEnabled !== false, // Default true
            loop: options.loop !== false, // Default true
            ...options
        };
        
        // State
        this.state = {
            banners: [],
            currentIndex: 0,
            isTransitioning: false,
            autoPlayTimer: null,
            isPaused: false,
            touchStartX: 0,
            touchEndX: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize carousel
     */
    async init() {
        await this.loadBanners();
        
        if (this.state.banners.length === 0) {
            this.renderEmpty();
            return;
        }
        
        this.render();
        this.attachEventListeners();
        
        if (this.config.autoPlay) {
            this.startAutoPlay();
        }
    }
    
    /**
     * Load banners from JSON
     */
    async loadBanners() {
        try {
            const response = await fetch('./data/banners.json');
            if (!response.ok) {
                throw new Error('Failed to load banners');
            }
            
            const data = await response.json();
            
            // Filter active banners and apply event overrides
            this.state.banners = data.banners
                .filter(banner => banner.active)
                .map(banner => this.applyEventStyling(banner));
            
            console.log(`✓ Loaded ${this.state.banners.length} banners`);
            
        } catch (error) {
            console.error('Error loading banners:', error);
            this.state.banners = [];
        }
    }
    
    /**
     * Apply event-based styling overrides
     */
    applyEventStyling(banner) {
        // Check if there's an active event
        const activeEvent = this.getActiveEvent();
        
        if (activeEvent && activeEvent.bannerOverrides) {
            return {
                ...banner,
                ...activeEvent.bannerOverrides,
                originalBanner: banner
            };
        }
        
        return banner;
    }
    
    /**
     * Get active event (if any)
     */
    getActiveEvent() {
        // Check if event system is available
        if (window.eventSystem) {
            return window.eventSystem.getActiveEvent();
        }
        return null;
    }
    
    /**
     * Render carousel HTML
     */
    render() {
        this.container.innerHTML = `
            <div class="carousel">
                <div class="carousel-track">
                    ${this.renderBanners()}
                </div>
                
                ${this.config.showControls ? this.renderControls() : ''}
                ${this.config.showIndicators ? this.renderIndicators() : ''}
            </div>
        `;
        
        this.updateCarousel();
    }
    
    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="carousel carousel-empty">
                <div class="carousel-empty-message">
                    <p>📢 No announcements at this time</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render banner slides
     */
    renderBanners() {
        return this.state.banners.map((banner, index) => {
            const isActive = index === this.state.currentIndex;
            
            return `
                <div class="carousel-slide ${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="banner-content" style="background: ${banner.backgroundColor || 'var(--primary)'};">
                        ${banner.image ? `
                            <div class="banner-image">
                                <img src="${banner.image}" alt="${this.escapeHtml(banner.title)}" loading="lazy">
                            </div>
                        ` : ''}
                        
                        <div class="banner-text">
                            ${banner.icon ? `<span class="banner-icon">${banner.icon}</span>` : ''}
                            <h2 class="banner-title">${this.escapeHtml(banner.title)}</h2>
                            ${banner.description ? `
                                <p class="banner-description">${this.escapeHtml(banner.description)}</p>
                            ` : ''}
                            ${banner.link ? `
                                <a href="${banner.link.url}" class="banner-button btn btn-light">
                                    ${this.escapeHtml(banner.link.text || 'Learn More')}
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render navigation controls
     */
    renderControls() {
        return `
            <button class="carousel-control carousel-control-prev" aria-label="Previous slide">
                <span class="carousel-control-icon">‹</span>
            </button>
            <button class="carousel-control carousel-control-next" aria-label="Next slide">
                <span class="carousel-control-icon">›</span>
            </button>
        `;
    }
    
    /**
     * Render indicators
     */
    renderIndicators() {
        return `
            <div class="carousel-indicators">
                ${this.state.banners.map((_, index) => `
                    <button 
                        class="carousel-indicator ${index === this.state.currentIndex ? 'active' : ''}"
                        data-index="${index}"
                        aria-label="Go to slide ${index + 1}"
                    ></button>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Navigation controls
        if (this.config.showControls) {
            const prevBtn = this.container.querySelector('.carousel-control-prev');
            const nextBtn = this.container.querySelector('.carousel-control-next');
            
            prevBtn?.addEventListener('click', () => this.prev());
            nextBtn?.addEventListener('click', () => this.next());
        }
        
        // Indicators
        if (this.config.showIndicators) {
            const indicators = this.container.querySelectorAll('.carousel-indicator');
            indicators.forEach(indicator => {
                indicator.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.goTo(index);
                });
            });
        }
        
        // Pause on hover
        if (this.config.pauseOnHover) {
            this.container.addEventListener('mouseenter', () => this.pause());
            this.container.addEventListener('mouseleave', () => this.resume());
        }
        
        // Keyboard navigation
        if (this.config.keyboardNavigation) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.prev();
                } else if (e.key === 'ArrowRight') {
                    this.next();
                }
            });
        }
        
        // Touch/swipe support
        if (this.config.swipeEnabled) {
            this.container.addEventListener('touchstart', (e) => {
                this.state.touchStartX = e.touches[0].clientX;
            });
            
            this.container.addEventListener('touchend', (e) => {
                this.state.touchEndX = e.changedTouches[0].clientX;
                this.handleSwipe();
            });
        }
    }
    
    /**
     * Handle swipe gesture
     */
    handleSwipe() {
        const swipeThreshold = 50; // pixels
        const diff = this.state.touchStartX - this.state.touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next slide
                this.next();
            } else {
                // Swipe right - prev slide
                this.prev();
            }
        }
    }
    
    /**
     * Go to next slide
     */
    next() {
        if (this.state.isTransitioning) return;
        
        let nextIndex = this.state.currentIndex + 1;
        
        if (nextIndex >= this.state.banners.length) {
            if (this.config.loop) {
                nextIndex = 0;
            } else {
                return; // Don't go past last slide if not looping
            }
        }
        
        this.goTo(nextIndex);
    }
    
    /**
     * Go to previous slide
     */
    prev() {
        if (this.state.isTransitioning) return;
        
        let prevIndex = this.state.currentIndex - 1;
        
        if (prevIndex < 0) {
            if (this.config.loop) {
                prevIndex = this.state.banners.length - 1;
            } else {
                return; // Don't go before first slide if not looping
            }
        }
        
        this.goTo(prevIndex);
    }
    
    /**
     * Go to specific slide
     */
    goTo(index) {
        if (this.state.isTransitioning) return;
        if (index === this.state.currentIndex) return;
        if (index < 0 || index >= this.state.banners.length) return;
        
        this.state.isTransitioning = true;
        this.state.currentIndex = index;
        
        this.updateCarousel();
        
        // Reset auto-play timer
        if (this.config.autoPlay && !this.state.isPaused) {
            this.stopAutoPlay();
            this.startAutoPlay();
        }
        
        // Allow next transition after animation completes
        setTimeout(() => {
            this.state.isTransitioning = false;
        }, this.config.transitionDuration);
    }
    
    /**
     * Update carousel display
     */
    updateCarousel() {
        const slides = this.container.querySelectorAll('.carousel-slide');
        const indicators = this.container.querySelectorAll('.carousel-indicator');
        
        // Update slides
        slides.forEach((slide, index) => {
            if (index === this.state.currentIndex) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        
        // Update indicators
        indicators.forEach((indicator, index) => {
            if (index === this.state.currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }
    
    /**
     * Start auto-play
     */
    startAutoPlay() {
        if (this.state.autoPlayTimer) return;
        
        this.state.autoPlayTimer = setInterval(() => {
            if (!this.state.isPaused) {
                this.next();
            }
        }, this.config.autoPlayInterval);
    }
    
    /**
     * Stop auto-play
     */
    stopAutoPlay() {
        if (this.state.autoPlayTimer) {
            clearInterval(this.state.autoPlayTimer);
            this.state.autoPlayTimer = null;
        }
    }
    
    /**
     * Pause carousel (on hover)
     */
    pause() {
        this.state.isPaused = true;
    }
    
    /**
     * Resume carousel (on mouse leave)
     */
    resume() {
        this.state.isPaused = false;
    }
    
    /**
     * Reload banners (useful after admin changes)
     */
    async reload() {
        this.stopAutoPlay();
        await this.loadBanners();
        
        if (this.state.banners.length === 0) {
            this.renderEmpty();
            return;
        }
        
        // Reset to first slide
        this.state.currentIndex = 0;
        this.render();
        this.attachEventListeners();
        
        if (this.config.autoPlay) {
            this.startAutoPlay();
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Destroy carousel and cleanup
     */
    destroy() {
        this.stopAutoPlay();
        this.container.innerHTML = '';
    }
}

// Export for use in other modules
export default BannerCarousel;

// Make available globally
if (typeof window !== 'undefined') {
    window.BannerCarousel = BannerCarousel;
}

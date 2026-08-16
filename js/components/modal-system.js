/**
 * Centralized Modal System
 * Used by all games for consistent modal behavior
 */

class ModalSystem {
    /**
     * Show a modal - properly centered on viewport
     * @param {string} modalId - ID of the modal element
     */
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        // Show modal with flex display for centering
        modal.style.display = 'flex';
        modal.style.animation = 'fadeIn 0.3s ease-in';
        
        // Reset scroll position to top
        setTimeout(() => {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
        }, 50);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close a modal
     * @param {string} modalId - ID of the modal element
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        modal.style.display = 'none';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Initialize modal close handlers for all modals
     * Call this once when page loads
     */
    static initializeModals() {
        // Close button handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) {
                    ModalSystem.closeModal(modalId);
                }
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    ModalSystem.closeModal(modal.id);
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
                openModals.forEach(modal => {
                    ModalSystem.closeModal(modal.id);
                });
            }
        });
    }

    /**
     * Show a result overlay (for game completion screens)
     * @param {string} resultId - ID of the result element
     */
    static showResult(resultId) {
        const result = document.getElementById(resultId);
        if (!result) {
            console.warn(`Result ${resultId} not found`);
            return;
        }

        result.style.display = 'flex';
        result.style.animation = 'fadeIn 0.3s ease-in';
        
        // Reset scroll position
        setTimeout(() => {
            const content = result.querySelector('.result-content, .results-content');
            if (content) {
                content.scrollTop = 0;
            }
        }, 50);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close a result overlay
     * @param {string} resultId - ID of the result element
     */
    static closeResult(resultId) {
        const result = document.getElementById(resultId);
        if (!result) {
            console.warn(`Result ${resultId} not found`);
            return;
        }

        result.style.display = 'none';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModalSystem.initializeModals());
} else {
    ModalSystem.initializeModals();
}

// Export for use in games
export default ModalSystem;

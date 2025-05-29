// static/js/ui.js - UI Manipulation Functions

// Theme Management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    storage.set('theme', newTheme);
    
    // Update user preference if logged in
    if (auth.isAuthenticated) {
        authAPI.updateProfile({ theme_preference: newTheme }).catch(console.error);
    }
}

function loadTheme() {
    const savedTheme = storage.get('theme') || 
                      (auth.user && auth.user.theme_preference) || 
                      'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input if exists
        const firstInput = modal.querySelector('input, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear form if exists
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id;
        closeModal(modalId);
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            closeModal(activeModal.id);
        }
    }
});

// Notification Functions
function showSuccess(message, duration = 5000) {
    showNotification(message, 'success', duration);
}

function showError(message, duration = 5000) {
    showNotification(message, 'error', duration);
}

function showWarning(message, duration = 5000) {
    showNotification(message, 'warning', duration);
}

function showInfo(message, duration = 5000) {
    showNotification(message, 'info', duration);
}

function showNotification(message, type = 'info', duration = 5000) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = createElement('div', {
        className: `notification-toast ${type}-message animate-fadeIn`,
        innerHTML: `
            <span>${escapeHtml(message)}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">✕</button>
        `
    });
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('animate-fadeOut');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Success message for main container
function hideSuccessMessage() {
    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.style.display = 'none';
    }
}

// Loading States
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const loading = container.querySelector('.loading');
        if (loading) loading.remove();
    }
}

// Skeleton Loading
function showSkeleton(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="skeleton-item">
                <div class="skeleton skeleton-title" style="width: ${60 + Math.random() * 40}%"></div>
                <div class="skeleton skeleton-text" style="width: ${40 + Math.random() * 40}%"></div>
                <div class="skeleton skeleton-text" style="width: ${30 + Math.random() * 30}%"></div>
            </div>
        `;
    }
    
    container.innerHTML = skeletons;
}

// Tab Management
function setupTabs(tabsContainerId, onTabChange) {
    const container = document.getElementById(tabsContainerId);
    if (!container) return;
    
    const tabs = container.querySelectorAll('[data-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Call callback with tab value
            if (onTabChange) {
                onTabChange(tab.dataset.tab);
            }
        });
    });
}

// Dropdown Management
function setupDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    if (!trigger || !menu) return;
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        menu.classList.remove('active');
    });
    
    // Close dropdown when selecting an item
    menu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            menu.classList.remove('active');
        });
    });
}

// Tooltip Management
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    tooltips.forEach(element => {
        const tooltipText = element.dataset.tooltip;
        
        const tooltip = createElement('span', {
            className: 'tooltip-text',
            textContent: tooltipText
        });
        
        element.classList.add('tooltip');
        element.appendChild(tooltip);
    });
}

// Confirmation Dialog
function confirmAction(message, onConfirm, onCancel) {
    const modal = createElement('div', {
        className: 'modal active',
        innerHTML: `
            <div class="modal-content" style="max-width: 400px;">
                <h3>Confirm Action</h3>
                <p>${escapeHtml(message)}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-danger" id="confirmBtn">Confirm</button>
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                </div>
            </div>
        `
    });
    
    document.body.appendChild(modal);
    
    const confirmBtn = modal.querySelector('#confirmBtn');
    const cancelBtn = modal.querySelector('#cancelBtn');
    
    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
}

// Form Validation UI
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Add error class to field
    field.classList.add('error');
    
    // Find or create error message element
    let errorEl = field.parentElement.querySelector('.field-error');
    if (!errorEl) {
        errorEl = createElement('div', {
            className: 'field-error error-message'
        });
        field.parentElement.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.remove('error');
    
    const errorEl = field.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.remove();
}

function clearAllFieldErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll('.error').forEach(field => {
        field.classList.remove('error');
    });
    
    form.querySelectorAll('.field-error').forEach(error => {
        error.remove();
    });
}

// Progress Indicator
function updateProgress(progressId, value, max = 100) {
    const progressBar = document.getElementById(progressId);
    if (!progressBar) return;
    
    const percentage = (value / max) * 100;
    progressBar.style.width = `${percentage}%`;
    
    // Update aria attributes for accessibility
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.setAttribute('aria-valuemax', max);
}

// Empty State
function showEmptyState(containerId, message = 'No items found', icon = '📋') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <div style="font-size: 4rem; margin-bottom: 20px;">${icon}</div>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// Pagination
function createPagination(totalItems, currentPage, itemsPerPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return '';
    
    let pagination = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        pagination += `<button class="btn btn-small" onclick="${onPageChange}(${currentPage - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            pagination += `<span class="current-page">${i}</span>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pagination += `<button class="btn btn-small" onclick="${onPageChange}(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pagination += '<span>...</span>';
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        pagination += `<button class="btn btn-small" onclick="${onPageChange}(${currentPage + 1})">Next</button>`;
    }
    
    pagination += '</div>';
    
    return pagination;
}

// Accordion
function setupAccordion(accordionId) {
    const accordion = document.getElementById(accordionId);
    if (!accordion) return;
    
    const headers = accordion.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isOpen = header.classList.contains('active');
            
            // Close all other accordion items
            headers.forEach(h => {
                h.classList.remove('active');
                h.nextElementSibling.style.maxHeight = null;
            });
            
            // Toggle current item
            if (!isOpen) {
                header.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

// Copy to Clipboard with UI feedback
async function copyToClipboardWithFeedback(text, buttonElement) {
    const originalText = buttonElement.textContent;
    
    try {
        await copyToClipboard(text);
        buttonElement.textContent = '✓ Copied!';
        buttonElement.classList.add('success');
        
        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.classList.remove('success');
        }, 2000);
    } catch (err) {
        buttonElement.textContent = '✗ Failed';
        buttonElement.classList.add('error');
        
        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.classList.remove('error');
        }, 2000);
    }
}

// Smooth Scroll
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Focus Management
function trapFocus(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        }
    });
}

// Initialize UI components on page load
document.addEventListener('DOMContentLoaded', () => {
    initTooltips();
    loadTheme();
});
/**
 * HSV Utilities - Helper functions & Advanced features
 */

'use strict';

// ==================== TOAST NOTIFICATIONS ====================
class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        this.container = container;
    }

    show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#FF6B00',
            info: '#17a2b8'
        };

        toast.style.cssText = `
            padding: 16px 24px;
            background: white;
            color: ${colors[type]};
            border-left: 4px solid ${colors[type]};
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
            min-width: 300px;
            max-width: 500px;
            pointer-events: auto;
            animation: toastSlideIn 0.3s ease;
            transition: all 0.3s ease;
        `;

        toast.innerHTML = `
            <span style="font-size: 20px; font-weight: bold;">${icons[type]}</span>
            <span style="flex: 1; color: #212529;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: transparent;
                border: none;
                color: #6C757D;
                font-size: 20px;
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            ">&times;</button>
        `;

        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Auto dismiss
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => {
                toast.remove();
                this.toasts = this.toasts.filter(t => t !== toast);
            }, 300);
        }, duration);
    }

    success(message) { this.show(message, 'success'); }
    error(message) { this.show(message, 'error'); }
    warning(message) { this.show(message, 'warning'); }
    info(message) { this.show(message, 'info'); }
}

// Global toast instance
const Toast = new ToastManager();

// ==================== DARK MODE TOGGLE ====================
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Apply saved theme
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        // Create toggle button if not exists
        if (!document.getElementById('themeToggle')) {
            this.createToggleButton();
        }
    }

    createToggleButton() {
        const toggle = document.createElement('button');
        toggle.id = 'themeToggle';
        toggle.className = 'theme-toggle';
        toggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
        toggle.title = this.currentTheme === 'dark' ? 'Light mode' : 'Dark mode';

        toggle.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--color-accent);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: var(--shadow-xl);
            z-index: 999;
            transition: all var(--transition-base);
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        toggle.addEventListener('click', () => this.toggle());
        toggle.addEventListener('mouseenter', () => {
            toggle.style.transform = 'scale(1.1)';
        });
        toggle.addEventListener('mouseleave', () => {
            toggle.style.transform = 'scale(1)';
        });

        document.body.appendChild(toggle);
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);

        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
            toggle.title = this.currentTheme === 'dark' ? 'Light mode' : 'Dark mode';
        }

        Toast.success(`Đã chuyển sang ${this.currentTheme === 'dark' ? 'Dark' : 'Light'} mode`);
    }
}

// Global theme instance
const Theme = new ThemeManager();

// ==================== LOADING OVERLAY ====================
const Loading = {
    show(message = 'Đang tải...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner"></div>
                    <p style="margin-top: 16px; color: white; font-weight: 500;">${message}</p>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.2s ease;
            `;
            document.body.appendChild(overlay);
        }
    },
    hide() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => overlay.remove(), 200);
        }
    }
};

// ==================== CONFIRM DIALOG ====================
function confirmAction(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Xác nhận</h3>
            </div>
            <div class="modal-body">
                <p style="font-size: 16px;">${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="cancelBtn">Hủy</button>
                <button class="btn btn-accent" id="confirmBtn">Xác nhận</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cancelBtn').onclick = () => overlay.remove();
    document.getElementById('confirmBtn').onclick = () => {
        onConfirm();
        overlay.remove();
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

// ==================== DEBOUNCE & THROTTLE ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== FORM VALIDATION ====================
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = 'var(--color-danger)';

            // Show error message
            let error = input.nextElementSibling;
            if (!error || !error.classList.contains('error-message')) {
                error = document.createElement('span');
                error.className = 'error-message';
                error.style.color = 'var(--color-danger)';
                error.style.fontSize = 'var(--font-size-sm)';
                error.style.marginTop = 'var(--spacing-xs)';
                error.textContent = 'Trường này không được để trống';
                input.parentNode.insertBefore(error, input.nextSibling);
            }
        } else {
            input.style.borderColor = '';
            const error = input.nextElementSibling;
            if (error && error.classList.contains('error-message')) {
                error.remove();
            }
        }
    });

    return isValid;
}

// ==================== SCROLL TO TOP ====================
function createScrollToTop() {
    const button = document.createElement('button');
    button.id = 'scrollToTop';
    button.innerHTML = '↑';
    button.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--color-primary);
        color: white;
        border: none;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: var(--shadow-lg);
        z-index: 998;
        opacity: 0;
        visibility: hidden;
        transition: all var(--transition-base);
    `;

    document.body.appendChild(button);

    // Show/hide on scroll
    window.addEventListener('scroll', throttle(() => {
        if (window.pageYOffset > 300) {
            button.style.opacity = '1';
            button.style.visibility = 'visible';
        } else {
            button.style.opacity = '0';
            button.style.visibility = 'hidden';
        }
    }, 200));

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==================== LAZY LOAD IMAGES ====================
function initLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ==================== COPY TO CLIPBOARD ====================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('Đã sao chép vào clipboard!');
    } catch (err) {
        Toast.error('Không thể sao chép');
    }
}

// ==================== AUTO INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Init scroll to top button
    createScrollToTop();

    // Init lazy load
    initLazyLoad();

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes toastSlideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Toast, Theme, Loading, confirmAction, debounce, throttle, validateForm, copyToClipboard };
}

// Navigation handler untuk sidebar modern
document.addEventListener('DOMContentLoaded', function() {
    initModernNavigation();
    initMobileMenu();
});

// Mobile Menu Toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('open');
    
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('open');
    
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function initMobileMenu() {
    // Close menu when clicking overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
        overlay.addEventListener('touchstart', closeMobileMenu);
    }
    
    // Close menu when clicking on a nav link on mobile
    const navLinks = document.querySelectorAll('.nav-section a[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                // Close menu with slight delay for better UX
                setTimeout(closeMobileMenu, 100);
            }
        });
    });
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 1024) {
                closeMobileMenu();
            }
        }, 250);
    });
}

function initModernNavigation() {
    // Handle tab switching
    const navLinks = document.querySelectorAll('.nav-section a[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('current-page-title');
    
    // Map tab names to display titles
    const tabTitles = {
        'dashboard': 'Dashboard Overview',
        'booking': 'Manajemen Booking',
        'checkin': 'Check-in & Check-out',
        'payment': 'Manajemen Pembayaran',
        'housekeeping': 'Manajemen Housekeeping',
        'rooms': 'Konfigurasi Kamar & Harga',
        'guests': 'Database Tamu',
        'calendar': 'Kalender Booking',
        'finance': 'Manajemen Keuangan',
        'reports': 'Laporan & Analisis',
        'data': 'Export & Import Data'
    };
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            
            // Use global showTab function if available (from app.js)
            if (window.sikabuApp && typeof window.sikabuApp.showTab === 'function') {
                window.sikabuApp.showTab(targetTab);
            } else {
                // Fallback: direct tab switching
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Hide all tab contents
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show target tab content
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Update page title
                if (pageTitle && tabTitles[targetTab]) {
                    pageTitle.textContent = tabTitles[targetTab];
                }
                
                // Reload calendar data when calendar tab is opened
                if (targetTab === 'calendar' && window.calendarManager) {
                    window.calendarManager.loadData().then(() => {
                        window.calendarManager.renderCalendar();
                    });
                }
            }
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 1024) {
                document.querySelector('.sidebar').classList.remove('open');
            }
        });
    });
    
    // Mobile menu toggle
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle btn btn-icon';
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileToggle.style.display = 'none';
    
    // Add mobile toggle functionality
    mobileToggle.addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    });
    
    // Show/hide mobile toggle based on screen size
    function checkScreenSize() {
        if (window.innerWidth <= 1024) {
            mobileToggle.style.display = 'flex';
            const headerActions = document.querySelector('.header-actions');
            if (headerActions && !headerActions.contains(mobileToggle)) {
                headerActions.prepend(mobileToggle);
            }
        } else {
            mobileToggle.style.display = 'none';
            document.querySelector('.sidebar').classList.remove('open');
        }
    }
    
    // Check screen size on load and resize
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar');
        const toggle = mobileToggle;
        
        if (window.innerWidth <= 1024 && 
            sidebar && sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Enhanced modal functions
function showModal(title, content) {
    const modal = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('show');
        
        // Focus trap untuk accessibility
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-overlay');
    if (modal && e.target === modal) {
        closeModal();
    }
});

// Enhanced button interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// Loading states untuk form submissions
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
        element.disabled = true;
        const originalText = element.textContent;
        element.textContent = 'Loading...';
        element.dataset.originalText = originalText;
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
        element.disabled = false;
        if (element.dataset.originalText) {
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add toast styles if not already added
    if (!document.querySelector('#toast-styles')) {
        const toastStyles = document.createElement('style');
        toastStyles.id = 'toast-styles';
        toastStyles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem;
                border-radius: 0.5rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                border-left: 4px solid;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                min-width: 300px;
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            }
            
            .toast-info { border-left-color: #2563eb; }
            .toast-success { border-left-color: #10b981; }
            .toast-warning { border-left-color: #f59e0b; }
            .toast-error { border-left-color: #ef4444; }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 0.25rem;
            }
            
            .toast-close:hover {
                background: #f3f4f6;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(toastStyles);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        'info': 'info-circle',
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle'
    };
    return icons[type] || 'info-circle';
}

// Export functions for global use
window.showModal = showModal;
window.closeModal = closeModal;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
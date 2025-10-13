/**
 * User Management System for SikaBuView
 * Handles user authentication, roles, and permissions
 */

class UserManager {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('sikabu_users')) || [];
        this.userLevels = {
            'admin': {
                name: 'Administrator',
                permissions: ['dashboard', 'booking', 'payment', 'rooms', 'guests', 'finance', 'housekeeping', 'reports', 'data', 'users', 'calendar'],
                color: '#dc2626'
            },
            'staff': {
                name: 'Staff Operasional',
                permissions: ['dashboard', 'booking', 'payment', 'rooms', 'guests', 'housekeeping', 'calendar'],
                color: '#2563eb'
            },
            'report': {
                name: 'Staff Laporan',
                permissions: ['reports', 'calendar'],
                color: '#059669'
            }
        };
        
        this.init();
    }
    
    init() {
        // Create default admin user if no users exist
        if (this.users.length === 0) {
            this.createDefaultAdmin();
        }
        
        // Check for existing session
        const sessionUser = localStorage.getItem('sikabu_current_user');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.applyUserPermissions();
        } else {
            this.showLoginModal();
        }
        
        this.setupUserInterface();
    }
    
    createDefaultAdmin() {
        const defaultAdmin = {
            id: 'admin_' + Date.now(),
            username: 'admin',
            password: 'admin123', // In production, this should be hashed
            name: 'Administrator',
            level: 'admin',
            email: 'admin@sikabuview.com',
            created: new Date().toISOString(),
            active: true
        };
        
        this.users.push(defaultAdmin);
        this.saveUsers();
        
        console.log('Default admin created - Username: admin, Password: admin123');
    }
    
    showLoginModal() {
        const loginModal = document.createElement('div');
        loginModal.id = 'login-modal';
        loginModal.className = 'modal-overlay show';
        loginModal.innerHTML = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🔐 Login SikaBuView</h3>
                    </div>
                    <div class="modal-body">
                        <form id="login-form">
                            <div class="form-group">
                                <label for="login-username">Username</label>
                                <input type="text" id="login-username" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="login-password">Password</label>
                                <input type="password" id="login-password" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary btn-block">
                                    <i class="fas fa-sign-in-alt"></i> Login
                                </button>
                            </div>
                        </form>
                        <div class="login-info">
                            <small class="text-muted">
                                Default: admin / admin123
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loginModal);
        
        // Handle login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            this.login(username, password);
        });
        
        // Focus on username field
        setTimeout(() => {
            document.getElementById('login-username').focus();
        }, 100);
    }
    
    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password && u.active);
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('sikabu_current_user', JSON.stringify(user));
            
            // Remove login modal
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.remove();
            }
            
            this.applyUserPermissions();
            this.showLoginSuccess();
            
            return true;
        } else {
            this.showError('Username atau password salah!');
            return false;
        }
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('sikabu_current_user');
        
        // Reset all navigation and tabs to original state
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = ''; // Clear any inline styles
        });
        
        document.querySelectorAll('.nav-section a[data-tab]').forEach(link => {
            const listItem = link.closest('li');
            listItem.style.display = 'block'; // Show all nav items
        });
        
        // Remove user info from header
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.remove();
        }
        
        // Show login modal
        this.showLoginModal();
    }
    
    applyUserPermissions() {
        if (!this.currentUser) return;
        
        const userLevel = this.userLevels[this.currentUser.level];
        const permissions = userLevel.permissions;
        
        // Hide/show navigation items based on permissions
        document.querySelectorAll('.nav-section a[data-tab]').forEach(link => {
            const tab = link.getAttribute('data-tab');
            const listItem = link.closest('li');
            
            if (permissions.includes(tab)) {
                listItem.style.display = 'block';
            } else {
                listItem.style.display = 'none';
            }
        });
        
        // Don't manipulate tab content display - let the tab system handle it
        // Just ensure unauthorized tabs are not accessible
        
        // Show first allowed tab
        const firstAllowedTab = permissions[0];
        if (firstAllowedTab && window.sikabuApp) {
            window.sikabuApp.showTab(firstAllowedTab);
        }
        
        // Update user info in header
        this.updateUserInfo();
    }
    
    updateUserInfo() {
        const userLevel = this.userLevels[this.currentUser.level];
        
        // Add user info to header if not exists
        let userInfo = document.querySelector('.user-info');
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(userInfo, headerActions.firstChild);
            }
        }
        
        userInfo.innerHTML = `
            <div class="user-dropdown">
                <button class="user-toggle btn btn-outline">
                    <div class="user-avatar" style="background-color: ${userLevel.color}">
                        ${this.currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <span class="user-name">${this.currentUser.name}</span>
                        <span class="user-level">${userLevel.name}</span>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-menu">
                    <a href="#" onclick="userManager.showProfile()" class="user-menu-item">
                        <i class="fas fa-user"></i> Profil
                    </a>
                    <a href="#" onclick="userManager.logout()" class="user-menu-item">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        `;
        
        // Add dropdown functionality
        const userToggle = userInfo.querySelector('.user-toggle');
        const userMenu = userInfo.querySelector('.user-menu');
        
        userToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userMenu.classList.remove('show');
        });
    }
    
    showProfile() {
        window.showModal('Profil Pengguna', `
            <div class="user-profile">
                <div class="profile-avatar" style="background-color: ${this.userLevels[this.currentUser.level].color}">
                    ${this.currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                    <h4>${this.currentUser.name}</h4>
                    <p class="profile-username">@${this.currentUser.username}</p>
                    <p class="profile-level">${this.userLevels[this.currentUser.level].name}</p>
                    <p class="profile-email">${this.currentUser.email}</p>
                </div>
            </div>
        `);
    }
    
    // User management functions for admin
    getAllUsers() {
        return this.users;
    }
    
    createUser(userData) {
        const newUser = {
            id: 'user_' + Date.now(),
            username: userData.username,
            password: userData.password,
            name: userData.name,
            level: userData.level,
            email: userData.email,
            created: new Date().toISOString(),
            active: true
        };
        
        // Check if username already exists
        if (this.users.find(u => u.username === userData.username)) {
            throw new Error('Username sudah digunakan!');
        }
        
        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    }
    
    updateUser(userId, userData) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('User tidak ditemukan!');
        }
        
        this.users[userIndex] = { ...this.users[userIndex], ...userData };
        this.saveUsers();
        return this.users[userIndex];
    }
    
    deleteUser(userId) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('User tidak ditemukan!');
        }
        
        // Don't allow deleting current user
        if (this.users[userIndex].id === this.currentUser.id) {
            throw new Error('Tidak dapat menghapus user yang sedang login!');
        }
        
        this.users.splice(userIndex, 1);
        this.saveUsers();
    }
    
    saveUsers() {
        localStorage.setItem('sikabu_users', JSON.stringify(this.users));
    }
    
    hasPermission(permission) {
        if (!this.currentUser) return false;
        const userLevel = this.userLevels[this.currentUser.level];
        return userLevel.permissions.includes(permission);
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getUserLevels() {
        return this.userLevels;
    }
    
    setupUserInterface() {
        // Add user management styles
        const userStyles = document.createElement('style');
        userStyles.id = 'user-management-styles';
        userStyles.textContent = `
            .user-info {
                position: relative;
                margin-right: 1rem;
            }
            
            .user-dropdown {
                position: relative;
            }
            
            .user-toggle {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 1rem;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius-md);
                background: var(--white);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .user-toggle:hover {
                border-color: var(--primary-color);
                background: var(--gray-50);
            }
            
            .user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .user-details {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                min-width: 120px;
            }
            
            .user-name {
                font-weight: 600;
                font-size: 0.875rem;
                color: var(--gray-900);
            }
            
            .user-level {
                font-size: 0.75rem;
                color: var(--gray-600);
            }
            
            .user-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: var(--white);
                border: 1px solid var(--gray-200);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                min-width: 180px;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }
            
            .user-menu.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .user-menu-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                color: var(--gray-700);
                text-decoration: none;
                border-bottom: 1px solid var(--gray-100);
                transition: background-color 0.2s ease;
            }
            
            .user-menu-item:hover {
                background: var(--gray-50);
                color: var(--primary-color);
            }
            
            .user-menu-item:last-child {
                border-bottom: none;
            }
            
            .user-profile {
                text-align: center;
                padding: 1rem;
            }
            
            .profile-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 2rem;
                margin: 0 auto 1rem;
            }
            
            .profile-info h4 {
                margin: 0 0 0.5rem;
                color: var(--gray-900);
            }
            
            .profile-username {
                color: var(--gray-600);
                font-size: 0.875rem;
                margin: 0 0 0.25rem;
            }
            
            .profile-level {
                color: var(--primary-color);
                font-weight: 600;
                margin: 0 0 0.25rem;
            }
            
            .profile-email {
                color: var(--gray-500);
                font-size: 0.875rem;
                margin: 0;
            }
            
            .login-info {
                text-align: center;
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--gray-200);
            }
            
            @media (max-width: 768px) {
                .user-toggle {
                    padding: 0.5rem;
                }
                
                .user-details {
                    display: none;
                }
                
                .user-menu {
                    right: -20px;
                }
            }
        `;
        
        if (!document.querySelector('#user-management-styles')) {
            document.head.appendChild(userStyles);
        }
    }
    
    showLoginSuccess() {
        if (window.showToast) {
            window.showToast(`Selamat datang, ${this.currentUser.name}!`, 'success');
        }
    }
    
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Initialize user manager
window.userManager = new UserManager();
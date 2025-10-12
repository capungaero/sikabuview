/**
 * Main Application Controller for Sikabuview
 * Handles initialization and data management
 */

class SikaBuApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.managers = {};
        this.init();
    }
    
    async init() {
        // Wait for all managers to be initialized
        await this.waitForManagers();
        
        // Initialize data management
        this.setupDataManagement();
        
        // Update initial data
        this.updateDatabaseStatus();
        
        // Show initial tab
        this.showTab('dashboard');
    }
    
    async waitForManagers() {
        // Wait for all manager instances to be available
        const checkManagers = () => {
            return window.dbManager;
        };
        
        while (!checkManagers()) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Store references
        this.managers = {
            database: window.dbManager,
            booking: window.bookingManager,
            payment: window.paymentManager,
            finance: window.financeManager,
            print: window.printManager
        };
    }
    
    setupDataManagement() {
        // Export data button
        const exportBtn = document.querySelector('button[onclick="exportData()"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Import file input
        const importInput = document.getElementById('import-file');
        if (importInput) {
            importInput.addEventListener('change', (e) => this.importData(e.target));
        }
        
        // Database status refresh
        const refreshStatusBtn = document.querySelector('button[onclick="checkDatabaseStatus()"]');
        if (refreshStatusBtn) {
            refreshStatusBtn.addEventListener('click', () => this.updateDatabaseStatus());
        }
        
        // Reset data button
        const resetBtn = document.querySelector('button[onclick="confirmResetData()"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.confirmResetData());
        }
    }
    
    showTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all nav links (both old and new nav)
        document.querySelectorAll('.main-nav a, .nav-section a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activate nav link (both old and new nav)
        const selectedNavLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedNavLink) {
            selectedNavLink.classList.add('active');
        }
        
        // Update page title if modern header exists
        const pageTitle = document.getElementById('current-page-title');
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
        
        if (pageTitle && tabTitles[tabName]) {
            pageTitle.textContent = tabTitles[tabName];
        }
        
        this.currentTab = tabName;
        
        // Update data when switching to specific tabs
        if (tabName === 'dashboard' && this.managers.booking) {
            this.managers.booking.updateDashboardStats();
        } else if (tabName === 'payment' && this.managers.booking) {
            this.managers.booking.updatePaymentBookingDropdown();
        } else if (tabName === 'finance' && this.managers.finance) {
            this.managers.finance.updateFinanceSummary();
        }
    }
    
    async exportData() {
        try {
            if (!this.managers.database) {
                this.showError('Database tidak tersedia');
                return;
            }
            
            this.showLoading('Mengekspor data...');
            
            const exportData = await this.managers.database.exportData();
            
            // Create downloadable file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `sikabuview_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.hideLoading();
            this.showSuccess('Data berhasil diekspor');
            
        } catch (error) {
            this.hideLoading();
            this.showError('Error mengekspor data: ' + error.message);
        }
    }
    
    async importData(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            this.showError('File harus berformat JSON');
            return;
        }
        
        try {
            this.showLoading('Mengimpor data...');
            
            const fileContent = await this.readFile(file);
            const importData = JSON.parse(fileContent);
            
            // Validate import data
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Format file tidak valid');
            }
            
            // Confirm import
            const confirmImport = await this.showConfirmation(
                'Konfirmasi Import',
                'Import data akan mengganti semua data yang ada. Apakah Anda yakin?'
            );
            
            if (!confirmImport) {
                this.hideLoading();
                return;
            }
            
            // Import data
            await this.managers.database.importData(importData);
            
            // Reload all data
            await this.reloadAllData();
            
            this.hideLoading();
            this.showSuccess('Data berhasil diimpor');
            
            // Reset file input
            fileInput.value = '';
            
        } catch (error) {
            this.hideLoading();
            this.showError('Error mengimpor data: ' + error.message);
            fileInput.value = '';
        }
    }
    
    async reloadAllData() {
        // Reload data in all managers
        if (this.managers.booking) {
            await this.managers.booking.loadBookings();
        }
        
        if (this.managers.payment) {
            await this.managers.payment.loadPayments();
        }
        
        if (this.managers.finance) {
            await this.managers.finance.loadFinanceData();
            this.managers.finance.updateFinanceSummary();
        }
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Error membaca file'));
            reader.readAsText(file);
        });
    }
    
    async updateDatabaseStatus() {
        try {
            if (!this.managers.database) {
                this.updateDatabaseStatusUI('Error', 'Unknown', 0);
                return;
            }
            
            const status = this.managers.database.getStatus();
            
            // Get total records count
            let totalRecords = 0;
            try {
                const tables = ['bookings', 'payments', 'expenses'];
                for (const table of tables) {
                    const records = await this.managers.database.select(table);
                    totalRecords += records.length;
                }
            } catch (error) {
                console.error('Error counting records:', error);
            }
            
            // Update UI
            const statusText = status.connected ? 'Terhubung' : 'Terputus';
            const modeText = this.getDatabaseModeLabel(status.type);
            
            this.updateDatabaseStatusUI(statusText, modeText, totalRecords);
            
        } catch (error) {
            console.error('Error checking database status:', error);
            this.updateDatabaseStatusUI('Error', 'Unknown', 0);
        }
    }
    
    updateDatabaseStatusUI(status, mode, totalRecords) {
        const statusElement = document.getElementById('db-status');
        const modeElement = document.getElementById('db-mode');
        const recordsElement = document.getElementById('total-records');
        
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.color = status === 'Terhubung' ? '#28a745' : '#dc3545';
        }
        
        if (modeElement) {
            modeElement.textContent = mode;
        }
        
        if (recordsElement) {
            recordsElement.textContent = totalRecords;
        }
    }
    
    getDatabaseModeLabel(type) {
        const labels = {
            'sqlite': 'SQLite (Server)',
            'indexeddb': 'IndexedDB (Browser)',
            'localstorage': 'LocalStorage (Browser)'
        };
        return labels[type] || 'Unknown';
    }
    
    async confirmResetData() {
        const confirmed = await this.showConfirmation(
            'Konfirmasi Reset Data',
            '⚠️ PERINGATAN: Tindakan ini akan menghapus SEMUA data booking, pembayaran, dan pengeluaran. Tindakan ini tidak dapat dibatalkan!\n\nApakah Anda benar-benar yakin?'
        );
        
        if (!confirmed) return;
        
        // Double confirmation
        const doubleConfirmed = await this.showConfirmation(
            'Konfirmasi Terakhir',
            'Ini adalah konfirmasi terakhir. Semua data akan hilang permanen. Lanjutkan?'
        );
        
        if (!doubleConfirmed) return;
        
        try {
            this.showLoading('Menghapus semua data...');
            
            await this.managers.database.clearAllData();
            await this.reloadAllData();
            
            this.hideLoading();
            this.showSuccess('Semua data berhasil dihapus');
            
        } catch (error) {
            this.hideLoading();
            this.showError('Error menghapus data: ' + error.message);
        }
    }
    
    // UI Helper methods
    showModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showConfirmation(title, message) {
        return new Promise((resolve) => {
            const modalTitle = document.getElementById('modal-title');
            const modalMessage = document.getElementById('modal-message');
            const modalConfirm = document.getElementById('modal-confirm');
            
            modalTitle.textContent = title;
            modalMessage.innerHTML = message.replace(/\n/g, '<br>');
            modalConfirm.textContent = 'Ya';
            
            modalConfirm.onclick = () => {
                this.closeModal();
                resolve(true);
            };
            
            // Add cancel handler
            const cancelHandler = () => {
                this.closeModal();
                resolve(false);
            };
            
            // Set up cancel button
            document.querySelector('.modal-footer .btn-secondary').onclick = cancelHandler;
            
            this.showModal();
        });
    }
    
    showLoading(message = 'Loading...') {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-size: 18px;
            `;
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading"></div>
                <p style="margin-top: 20px;">${message}</p>
            </div>
        `;
        loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: all;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        notification.innerHTML = `${icon} ${message}`;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        // Click to remove
        notification.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Global functions for HTML onclick events
window.showTab = (tabName) => {
    if (window.sikabuApp) {
        window.sikabuApp.showTab(tabName);
    }
};

window.closeModal = () => {
    if (window.sikabuApp) {
        window.sikabuApp.closeModal();
    }
};

window.exportData = () => {
    if (window.sikabuApp) {
        window.sikabuApp.exportData();
    }
};

window.importData = (fileInput) => {
    if (window.sikabuApp) {
        window.sikabuApp.importData(fileInput);
    }
};

window.checkDatabaseStatus = () => {
    if (window.sikabuApp) {
        window.sikabuApp.updateDatabaseStatus();
    }
};

window.confirmResetData = () => {
    if (window.sikabuApp) {
        window.sikabuApp.confirmResetData();
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sikabuApp = new SikaBuApp();
});
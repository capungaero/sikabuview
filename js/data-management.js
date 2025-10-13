// Data Management - Export, Import, Backup & Restore
class DataManagement {
    constructor() {
        this.tables = ['bookings', 'rooms', 'guests', 'payments', 'expenses', 'tasks'];
    }

    async init() {
        console.log('Initializing Data Management...');
        await this.updateDatabaseStatus();
    }

    async updateDatabaseStatus() {
        try {
            const stats = {};
            let totalRecords = 0;

            for (const table of this.tables) {
                const records = await window.dbManager.select(table) || [];
                stats[table] = records.length;
                totalRecords += records.length;
            }

            // Update UI
            this.displayDatabaseStatus(stats, totalRecords);
        } catch (error) {
            console.error('Error updating database status:', error);
            showNotification('Gagal memuat status database', 'error');
        }
    }

    displayDatabaseStatus(stats, totalRecords) {
        const statusContainer = document.querySelector('.db-status');
        if (!statusContainer) return;

        const html = `
            <div class="db-stat-grid">
                <div class="db-stat-item">
                    <i class="fas fa-calendar-check"></i>
                    <div>
                        <div class="db-stat-label">Bookings</div>
                        <div class="db-stat-value">${stats.bookings || 0}</div>
                    </div>
                </div>
                <div class="db-stat-item">
                    <i class="fas fa-bed"></i>
                    <div>
                        <div class="db-stat-label">Rooms</div>
                        <div class="db-stat-value">${stats.rooms || 0}</div>
                    </div>
                </div>
                <div class="db-stat-item">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="db-stat-label">Guests</div>
                        <div class="db-stat-value">${stats.guests || 0}</div>
                    </div>
                </div>
                <div class="db-stat-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <div class="db-stat-label">Payments</div>
                        <div class="db-stat-value">${stats.payments || 0}</div>
                    </div>
                </div>
                <div class="db-stat-item">
                    <i class="fas fa-receipt"></i>
                    <div>
                        <div class="db-stat-label">Expenses</div>
                        <div class="db-stat-value">${stats.expenses || 0}</div>
                    </div>
                </div>
                <div class="db-stat-item">
                    <i class="fas fa-tasks"></i>
                    <div>
                        <div class="db-stat-label">Tasks</div>
                        <div class="db-stat-value">${stats.tasks || 0}</div>
                    </div>
                </div>
            </div>
            <div class="db-total">
                <strong>Total Records:</strong> ${totalRecords}
            </div>
            <div class="db-info">
                <small><i class="fas fa-info-circle"></i> Last updated: ${new Date().toLocaleString('id-ID')}</small>
            </div>
        `;

        statusContainer.innerHTML = html;
    }

    async exportData() {
        try {
            showNotification('Mengekspor data...', 'info');

            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                data: {}
            };

            // Collect all data from tables
            for (const table of this.tables) {
                const records = await window.dbManager.select(table) || [];
                exportData.data[table] = records;
            }

            // Create JSON file
            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Download file
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `sikabuview-backup-${timestamp}.json`;
            link.click();

            URL.revokeObjectURL(url);
            showNotification('Data berhasil diekspor', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Gagal mengekspor data: ' + error.message, 'error');
        }
    }

    async importData(file) {
        if (!file) {
            showNotification('Pilih file untuk diimport', 'warning');
            return;
        }

        if (!confirm('Import akan menimpa semua data yang ada. Lanjutkan?')) {
            return;
        }

        try {
            showNotification('Mengimport data...', 'info');

            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.data) {
                throw new Error('Format file tidak valid');
            }

            // Import data to each table
            let totalImported = 0;
            for (const table of this.tables) {
                if (importData.data[table]) {
                    // Clear existing data
                    const existing = await window.dbManager.select(table) || [];
                    for (const record of existing) {
                        await window.dbManager.delete(table, record.id);
                    }

                    // Insert new data
                    for (const record of importData.data[table]) {
                        await window.dbManager.insert(table, record);
                        totalImported++;
                    }
                }
            }

            showNotification(`Berhasil mengimport ${totalImported} records`, 'success');
            await this.updateDatabaseStatus();

            // Refresh all managers
            if (window.roomsManager) await window.roomsManager.loadData();
            if (window.guestsManager) await window.guestsManager.loadData();
            if (window.calendarManager) await window.calendarManager.loadData();
            if (window.checkInOutManager) await window.checkInOutManager.loadData();
            if (window.reportsManager) await window.reportsManager.loadData();

        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Gagal mengimport data: ' + error.message, 'error');
        }
    }

    async clearAllData() {
        if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data! Apakah Anda yakin?')) {
            return;
        }

        if (!confirm('Konfirmasi sekali lagi - semua data akan hilang permanen!')) {
            return;
        }

        try {
            showNotification('Menghapus semua data...', 'info');

            let totalDeleted = 0;
            for (const table of this.tables) {
                const records = await window.dbManager.select(table) || [];
                for (const record of records) {
                    await window.dbManager.delete(table, record.id);
                    totalDeleted++;
                }
            }

            showNotification(`${totalDeleted} records berhasil dihapus`, 'success');
            await this.updateDatabaseStatus();

            // Refresh all managers
            if (window.roomsManager) await window.roomsManager.loadData();
            if (window.guestsManager) await window.guestsManager.loadData();
            if (window.calendarManager) await window.calendarManager.loadData();
            if (window.checkInOutManager) await window.checkInOutManager.loadData();
            if (window.reportsManager) await window.reportsManager.loadData();

        } catch (error) {
            console.error('Error clearing data:', error);
            showNotification('Gagal menghapus data: ' + error.message, 'error');
        }
    }

    async exportTableToCSV(tableName) {
        try {
            const records = await window.dbManager.select(tableName) || [];
            
            if (records.length === 0) {
                showNotification(`Tidak ada data di tabel ${tableName}`, 'warning');
                return;
            }

            const headers = Object.keys(records[0]);
            const csvRows = [];

            // Add headers
            csvRows.push(headers.join(','));

            // Add data rows
            for (const record of records) {
                const values = headers.map(header => {
                    const value = record[header] || '';
                    return `"${value}"`;
                });
                csvRows.push(values.join(','));
            }

            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${tableName}-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification(`Tabel ${tableName} berhasil diekspor`, 'success');
        } catch (error) {
            console.error('Error exporting table:', error);
            showNotification('Gagal mengekspor tabel: ' + error.message, 'error');
        }
    }
}

// Global functions for data management
async function exportData() {
    if (window.dataManagement) {
        await window.dataManagement.exportData();
    }
}

async function importData(input) {
    if (window.dataManagement && input.files[0]) {
        await window.dataManagement.importData(input.files[0]);
        input.value = ''; // Reset input
    }
}

async function checkDatabaseStatus() {
    if (window.dataManagement) {
        await window.dataManagement.updateDatabaseStatus();
        showNotification('Status database diperbarui', 'success');
    }
}

async function clearAllData() {
    if (window.dataManagement) {
        await window.dataManagement.clearAllData();
    }
}

async function exportTableCSV(tableName) {
    if (window.dataManagement) {
        await window.dataManagement.exportTableToCSV(tableName);
    }
}

// User Management Functions
function showUserManagement() {
    if (!window.userManager) {
        showNotification('User Manager belum tersedia', 'error');
        return;
    }

    if (!window.userManager.hasPermission('users')) {
        showNotification('Anda tidak memiliki akses untuk mengelola user', 'error');
        return;
    }

    const users = window.userManager.getAllUsers();
    const userLevels = window.userManager.getUserLevels();
    
    let userListHtml = '<div class="user-management-container">';
    userListHtml += '<div class="user-list">';
    
    users.forEach(user => {
        const level = userLevels[user.level];
        const isCurrentUser = window.userManager.getCurrentUser().id === user.id;
        
        userListHtml += `
            <div class="user-item ${!user.active ? 'inactive' : ''}">
                <div class="user-avatar" style="background-color: ${level.color}">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <h4>${user.name} ${isCurrentUser ? '(Anda)' : ''}</h4>
                    <p class="user-username">@${user.username}</p>
                    <p class="user-level" style="color: ${level.color}">${level.name}</p>
                    <p class="user-email">${user.email}</p>
                    <small class="user-created">Dibuat: ${new Date(user.created).toLocaleDateString('id-ID')}</small>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${!isCurrentUser ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    userListHtml += '</div></div>';
    
    window.showModal('Manajemen User', userListHtml);
}

function showAddUserModal() {
    if (!window.userManager) {
        showNotification('User manager belum siap. Silakan coba lagi.', 'error');
        return;
    }
    
    if (!window.userManager.hasPermission('users')) {
        showNotification('Anda tidak memiliki akses untuk mengelola user', 'error');
        return;
    }

    const userLevels = window.userManager.getUserLevels();
    let levelOptions = '';
    
    Object.keys(userLevels).forEach(level => {
        levelOptions += `<option value="${level}">${userLevels[level].name}</option>`;
    });

    const addUserForm = `
        <form id="add-user-form" class="user-form">
            <div class="form-group">
                <label for="user-name">Nama Lengkap</label>
                <input type="text" id="user-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="user-username">Username</label>
                <input type="text" id="user-username" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="user-email">Email</label>
                <input type="email" id="user-email" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="user-password">Password</label>
                <input type="password" id="user-password" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="user-level">Level User</label>
                <select id="user-level" class="form-control" required>
                    <option value="">Pilih Level</option>
                    ${levelOptions}
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Simpan User
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.closeModal()">
                    Batal
                </button>
            </div>
        </form>
    `;

    window.showModal('Tambah User Baru', addUserForm);

    // Handle form submission with timeout to ensure DOM is ready
    setTimeout(() => {
        const form = document.getElementById('add-user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('user-name').value,
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            password: document.getElementById('user-password').value,
            level: document.getElementById('user-level').value
        };

        try {
            window.userManager.createUser(userData);
            window.closeModal();
            showNotification('User berhasil ditambahkan', 'success');
            // Refresh user list if currently shown
            const userList = document.querySelector('.user-management-container');
            if (userList) {
                showUserManagement();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
            });
        } else {
            console.error('Form element not found: add-user-form');
        }
    }, 200);
}

function editUser(userId) {
    if (!window.userManager.hasPermission('users')) {
        showNotification('Anda tidak memiliki akses untuk mengelola user', 'error');
        return;
    }

    const users = window.userManager.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('User tidak ditemukan', 'error');
        return;
    }

    const userLevels = window.userManager.getUserLevels();
    let levelOptions = '';
    
    Object.keys(userLevels).forEach(level => {
        const selected = level === user.level ? 'selected' : '';
        levelOptions += `<option value="${level}" ${selected}>${userLevels[level].name}</option>`;
    });

    const editUserForm = `
        <form id="edit-user-form" class="user-form">
            <div class="form-group">
                <label for="edit-user-name">Nama Lengkap</label>
                <input type="text" id="edit-user-name" class="form-control" value="${user.name}" required>
            </div>
            <div class="form-group">
                <label for="edit-user-username">Username</label>
                <input type="text" id="edit-user-username" class="form-control" value="${user.username}" required>
            </div>
            <div class="form-group">
                <label for="edit-user-email">Email</label>
                <input type="email" id="edit-user-email" class="form-control" value="${user.email}" required>
            </div>
            <div class="form-group">
                <label for="edit-user-password">Password Baru (kosongkan jika tidak diubah)</label>
                <input type="password" id="edit-user-password" class="form-control">
                <small class="text-muted">Biarkan kosong untuk mempertahankan password lama</small>
            </div>
            <div class="form-group">
                <label for="edit-user-level">Level User</label>
                <select id="edit-user-level" class="form-control" required>
                    ${levelOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="edit-user-active" ${user.active ? 'checked' : ''}>
                    User Aktif
                </label>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Update User
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.closeModal()">
                    Batal
                </button>
            </div>
        </form>
    `;

    window.showModal('Edit User', editUserForm);

    // Handle form submission with timeout to ensure DOM is ready
    setTimeout(() => {
        const form = document.getElementById('edit-user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('edit-user-name').value,
            username: document.getElementById('edit-user-username').value,
            email: document.getElementById('edit-user-email').value,
            level: document.getElementById('edit-user-level').value,
            active: document.getElementById('edit-user-active').checked
        };

        const newPassword = document.getElementById('edit-user-password').value;
        if (newPassword) {
            userData.password = newPassword;
        }

        try {
            window.userManager.updateUser(userId, userData);
            window.closeModal();
            showNotification('User berhasil diupdate', 'success');
            
            // Refresh user list if currently shown
            const userList = document.querySelector('.user-management-container');
            if (userList) {
                showUserManagement();
            }
            
            // If current user updated themselves, refresh permissions
            if (window.userManager.getCurrentUser().id === userId) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
            });
        } else {
            console.error('Form element not found: edit-user-form');
        }
    }, 200);
}

function deleteUser(userId) {
    if (!window.userManager.hasPermission('users')) {
        showNotification('Anda tidak memiliki akses untuk mengelola user', 'error');
        return;
    }

    const users = window.userManager.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('User tidak ditemukan', 'error');
        return;
    }

    if (!confirm(`Yakin ingin menghapus user "${user.name}"?`)) {
        return;
    }

    try {
        window.userManager.deleteUser(userId);
        showNotification('User berhasil dihapus', 'success');
        showUserManagement(); // Refresh the list
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Logo Settings Functions
function showLogoSettings() {
    const currentLogo = localStorage.getItem('sikabu_custom_logo');
    
    const logoSettingsHtml = `
        <div class="logo-settings-container">
            <div class="current-logo">
                <h4>Logo Saat Ini</h4>
                <div class="logo-preview">
                    ${currentLogo ? 
                        `<img src="${currentLogo}" alt="Custom Logo" style="max-width: 200px; max-height: 100px;">
                         <button class="btn btn-sm btn-danger" onclick="removeCustomLogo()" style="margin-top: 10px;">
                            <i class="fas fa-trash"></i> Hapus Logo
                         </button>` : 
                        '<p class="text-muted">Menggunakan logo default</p>'
                    }
                </div>
            </div>
            
            <div class="upload-logo">
                <h4>Upload Logo Baru</h4>
                <div class="upload-area" id="logo-upload-area">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Klik untuk pilih file atau drag & drop</p>
                    <small>Format: PNG, JPG, SVG (Max 2MB)</small>
                    <input type="file" id="logo-file-input" accept="image/*" style="display: none;">
                </div>
            </div>
            
            <div class="logo-guidelines">
                <h4>Panduan Logo</h4>
                <ul>
                    <li>Ukuran optimal: 200x80 piksel</li>
                    <li>Format yang didukung: PNG, JPG, SVG</li>
                    <li>Ukuran file maksimal: 2MB</li>
                    <li>Background transparan disarankan</li>
                </ul>
            </div>
        </div>
    `;

    window.showModal('Pengaturan Logo', logoSettingsHtml);

    // Setup file upload with timeout to ensure DOM is ready
    setTimeout(() => {
        const uploadArea = document.getElementById('logo-upload-area');
        const fileInput = document.getElementById('logo-file-input');

        if (!uploadArea || !fileInput) {
            console.error('Logo upload elements not found');
            return;
        }

        uploadArea.addEventListener('click', () => fileInput.click());

    // Handle drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleLogoUpload(files[0]);
        }
    });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleLogoUpload(e.target.files[0]);
            }
        });
    }, 200);
}

function handleLogoUpload(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('File harus berupa gambar!', 'error');
        return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Ukuran file maksimal 2MB!', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const logoData = e.target.result;
        
        // Save to localStorage
        localStorage.setItem('sikabu_custom_logo', logoData);
        
        // Apply immediately
        applyCustomLogo();
        
        showNotification('Logo berhasil diupload!', 'success');
        window.closeModal();
    };
    
    reader.readAsDataURL(file);
}

function removeCustomLogo() {
    if (confirm('Yakin ingin menghapus logo custom?')) {
        localStorage.removeItem('sikabu_custom_logo');
        applyCustomLogo();
        showNotification('Logo custom berhasil dihapus', 'success');
        window.closeModal();
    }
}

function applyCustomLogo() {
    const customLogo = localStorage.getItem('sikabu_custom_logo');
    const logoElements = document.querySelectorAll('.logo, .app-logo, .brand-logo');
    
    logoElements.forEach(element => {
        if (customLogo) {
            if (element.tagName === 'IMG') {
                element.src = customLogo;
            } else {
                element.innerHTML = `<img src="${customLogo}" alt="SikaBu Logo" style="max-height: 40px;">`;
            }
        } else {
            // Restore default
            if (element.tagName === 'IMG') {
                element.src = 'assets/logo-default.png';
            } else {
                element.innerHTML = '<i class="fas fa-hotel"></i> SikaBuView';
            }
        }
    });
}

// System Settings Functions
function showSystemSettings() {
    const settings = JSON.parse(localStorage.getItem('sikabu_settings')) || {
        companyName: 'SikaBuView',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        currency: 'IDR',
        timezone: 'Asia/Jakarta',
        dateFormat: 'DD/MM/YYYY',
        autoBackup: false,
        notifications: true
    };

    const systemSettingsHtml = `
        <form id="system-settings-form" class="settings-form">
            <div class="settings-section">
                <h4>Informasi Perusahaan</h4>
                <div class="form-group">
                    <label for="company-name">Nama Perusahaan</label>
                    <input type="text" id="company-name" class="form-control" value="${settings.companyName}">
                </div>
                <div class="form-group">
                    <label for="company-address">Alamat</label>
                    <textarea id="company-address" class="form-control" rows="3">${settings.companyAddress}</textarea>
                </div>
                <div class="form-group">
                    <label for="company-phone">Telepon</label>
                    <input type="text" id="company-phone" class="form-control" value="${settings.companyPhone}">
                </div>
                <div class="form-group">
                    <label for="company-email">Email</label>
                    <input type="email" id="company-email" class="form-control" value="${settings.companyEmail}">
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Pengaturan Regional</h4>
                <div class="form-group">
                    <label for="currency">Mata Uang</label>
                    <select id="currency" class="form-control">
                        <option value="IDR" ${settings.currency === 'IDR' ? 'selected' : ''}>Rupiah (IDR)</option>
                        <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>US Dollar (USD)</option>
                        <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>Euro (EUR)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="timezone">Zona Waktu</label>
                    <select id="timezone" class="form-control">
                        <option value="Asia/Jakarta" ${settings.timezone === 'Asia/Jakarta' ? 'selected' : ''}>WIB (Asia/Jakarta)</option>
                        <option value="Asia/Makassar" ${settings.timezone === 'Asia/Makassar' ? 'selected' : ''}>WITA (Asia/Makassar)</option>
                        <option value="Asia/Jayapura" ${settings.timezone === 'Asia/Jayapura' ? 'selected' : ''}>WIT (Asia/Jayapura)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="date-format">Format Tanggal</label>
                    <select id="date-format" class="form-control">
                        <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Pengaturan Sistem</h4>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="auto-backup" ${settings.autoBackup ? 'checked' : ''}>
                        Auto Backup Harian
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifications" ${settings.notifications ? 'checked' : ''}>
                        Aktifkan Notifikasi
                    </label>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Simpan Pengaturan
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.closeModal()">
                    Batal
                </button>
            </div>
        </form>
    `;

    window.showModal('Pengaturan Sistem', systemSettingsHtml);

    // Handle form submission with timeout to ensure DOM is ready
    setTimeout(() => {
        const form = document.getElementById('system-settings-form');
        if (form) {
            form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newSettings = {
            companyName: document.getElementById('company-name').value,
            companyAddress: document.getElementById('company-address').value,
            companyPhone: document.getElementById('company-phone').value,
            companyEmail: document.getElementById('company-email').value,
            currency: document.getElementById('currency').value,
            timezone: document.getElementById('timezone').value,
            dateFormat: document.getElementById('date-format').value,
            autoBackup: document.getElementById('auto-backup').checked,
            notifications: document.getElementById('notifications').checked
        };

        localStorage.setItem('sikabu_settings', JSON.stringify(newSettings));
        showNotification('Pengaturan berhasil disimpan', 'success');
        window.closeModal();
            });
        } else {
            console.error('Form element not found: system-settings-form');
        }
    }, 200);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForDatabase();
        window.dataManagement = new DataManagement();
        await window.dataManagement.init();
        console.log('Data Management initialized successfully');

        // Apply custom logo on load
        applyCustomLogo();

        // Export functions to global scope for HTML onclick handlers
        window.showUserManagement = showUserManagement;
        window.showAddUserModal = showAddUserModal;
        window.editUser = editUser;
        window.deleteUser = deleteUser;
        window.showLogoSettings = showLogoSettings;
        window.removeCustomLogo = removeCustomLogo;
        window.showSystemSettings = showSystemSettings;
        
        console.log('User management and logo functions exported to global scope');

        // Add event listener for clear all data button
        const clearBtn = document.getElementById('clear-all-data-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                await clearAllData();
            });
        }

        // Add event listener for import file input
        const importInput = document.getElementById('import-file');
        if (importInput) {
            importInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    await importData(e.target);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing Data Management:', error);
    }
});

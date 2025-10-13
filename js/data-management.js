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

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForDatabase();
        window.dataManagement = new DataManagement();
        await window.dataManagement.init();
        console.log('Data Management initialized successfully');
    } catch (error) {
        console.error('Error initializing Data Management:', error);
    }
});

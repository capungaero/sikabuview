// Housekeeping Management Module
class HousekeepingManager {
    constructor() {
        this.tasks = [];
        this.inventory = [];
        this.init();
    }

    init() {
        this.loadTasks();
        this.loadInventory();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addTaskForm = document.getElementById('add-task-form');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        }
    }

    async loadTasks() {
        try {
            await waitForDatabase();
            
            try {
                this.tasks = await window.dbManager.select('tasks') || [];
            } catch (error) {
                console.warn('Tasks table not found, using empty array');
                this.tasks = [];
            }
            this.renderCleaningSchedule();
            this.renderMaintenanceTasks();
            this.renderHousekeepingList();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    async loadInventory() {
        try {
            await waitForDatabase();
            
            try {
                this.inventory = await window.dbManager.select('inventory') || [];
            } catch (error) {
                console.warn('Inventory table not found, using empty array');
                this.inventory = [];
            }
            this.renderInventory();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.inventory = [];
        }
    }

    async handleAddTask(e) {
        e.preventDefault();
        
        const roomNumber = document.getElementById('task-room-number')?.value;
        const taskType = document.getElementById('task-type')?.value;
        const assignedTo = document.getElementById('task-assigned-to')?.value;
        const priority = document.getElementById('task-priority')?.value;
        const dueDate = document.getElementById('task-due-date')?.value;
        const status = document.getElementById('task-status')?.value || 'pending';
        const description = document.getElementById('task-description')?.value;
        const notes = document.getElementById('task-notes')?.value;

        const taskData = {
            id: this.generateTaskId(),
            roomNumber: roomNumber,
            taskType: taskType,
            assignedTo: assignedTo,
            priority: priority,
            description: description,
            notes: notes,
            dueDate: dueDate,
            status: status,
            createdAt: new Date().toISOString()
        };

        try {
            await window.dbManager.insert('tasks', taskData);
            this.tasks.push(taskData);
            this.renderCleaningSchedule();
            this.renderMaintenanceTasks();
            this.hideTaskForm();
            e.target.reset();
            showNotification('Tugas berhasil ditambahkan!', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            showNotification('Error menambahkan tugas!', 'error');
        }
    }

    generateTaskId() {
        return 'TSK' + Date.now().toString().slice(-6);
    }

    renderCleaningSchedule() {
        const container = document.getElementById('cleaning-schedule-grid');
        if (!container) return;

        const cleaningTasks = this.tasks.filter(task => task.type === 'cleaning');
        
        container.innerHTML = cleaningTasks.map(task => {
            const room = roomsManager?.rooms?.find(r => r.id === task.roomId);
            return `
                <div class="task-card ${task.priority}" data-task-id="${task.id}">
                    <div class="task-header">
                        <h4>${room ? room.number : 'Unknown Room'}</h4>
                        <span class="priority-badge ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    </div>
                    <div class="task-details">
                        <p><strong>Petugas:</strong> ${task.assignee}</p>
                        <p><strong>Target:</strong> ${new Date(task.dueDate).toLocaleString('id-ID')}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${task.status}">${this.getStatusLabel(task.status)}</span></p>
                        <p><strong>Deskripsi:</strong> ${task.description}</p>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small btn-primary" onclick="housekeepingManager.updateTaskStatus('${task.id}', 'completed')">
                            Selesai
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="housekeepingManager.editTask('${task.id}')">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p>Tidak ada tugas cleaning</p>';
    }

    renderMaintenanceTasks() {
        const container = document.getElementById('maintenance-tasks-list');
        if (!container) return;

        const maintenanceTasks = this.tasks.filter(task => task.type === 'maintenance');
        
        container.innerHTML = maintenanceTasks.map(task => {
            const room = roomsManager?.rooms?.find(r => r.id === task.roomId);
            return `
                <div class="task-card ${task.priority}" data-task-id="${task.id}">
                    <div class="task-header">
                        <h4>${room ? room.number : 'Unknown Room'}</h4>
                        <span class="priority-badge ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    </div>
                    <div class="task-details">
                        <p><strong>Petugas:</strong> ${task.assignee}</p>
                        <p><strong>Target:</strong> ${new Date(task.dueDate).toLocaleString('id-ID')}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${task.status}">${this.getStatusLabel(task.status)}</span></p>
                        <p><strong>Deskripsi:</strong> ${task.description}</p>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small btn-primary" onclick="housekeepingManager.updateTaskStatus('${task.id}', 'completed')">
                            Selesai
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="housekeepingManager.editTask('${task.id}')">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p>Tidak ada tugas maintenance</p>';
    }

    getPriorityLabel(priority) {
        const labels = {
            'low': 'Rendah',
            'normal': 'Normal', 
            'high': 'Tinggi',
            'urgent': 'Mendesak'
        };
        return labels[priority] || priority;
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'in-progress': 'Dikerjakan',
            'completed': 'Selesai'
        };
        return labels[status] || status;
    }

    showAddTaskForm() {
        document.getElementById('task-form').style.display = 'block';
        document.getElementById('task-assignee').focus();
    }

    hideTaskForm() {
        document.getElementById('task-form').style.display = 'none';
        document.getElementById('add-task-form').reset();
    }

    async updateTaskStatus(taskId, status) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = status;
        task.completedAt = status === 'completed' ? new Date().toISOString() : null;

        try {
            await window.dbManager.update('tasks', task);
            this.renderCleaningSchedule();
            this.renderMaintenanceTasks();
            this.renderHousekeepingList();
            showNotification(`Tugas ${status === 'completed' ? 'selesai' : 'diupdate'}!`, 'success');
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Error mengupdate tugas!', 'error');
        }
    }

    renderHousekeepingList() {
        const tbody = document.getElementById('housekeeping-list');
        if (!tbody) return;

        if (this.tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada tugas housekeeping</td></tr>';
            return;
        }

        tbody.innerHTML = this.tasks.map(task => {
            let statusBadge = '';
            let priorityBadge = '';
            
            switch(task.status) {
                case 'pending':
                    statusBadge = '<span class="badge badge-warning">Pending</span>';
                    break;
                case 'in-progress':
                    statusBadge = '<span class="badge badge-info">Dikerjakan</span>';
                    break;
                case 'completed':
                    statusBadge = '<span class="badge badge-success">Selesai</span>';
                    break;
                default:
                    statusBadge = `<span class="badge badge-secondary">${task.status}</span>`;
            }

            switch(task.priority) {
                case 'urgent':
                    priorityBadge = '<span class="badge badge-danger">Mendesak</span>';
                    break;
                case 'high':
                    priorityBadge = '<span class="badge badge-warning">Tinggi</span>';
                    break;
                case 'medium':
                    priorityBadge = '<span class="badge badge-info">Sedang</span>';
                    break;
                case 'low':
                    priorityBadge = '<span class="badge badge-secondary">Rendah</span>';
                    break;
                default:
                    priorityBadge = `<span class="badge">${task.priority}</span>`;
            }

            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleString('id-ID') : '-';

            return `
                <tr>
                    <td>${task.id}</td>
                    <td>${task.roomNumber || '-'}</td>
                    <td>${task.taskType || task.type || '-'}</td>
                    <td>${task.assignedTo || task.assignee || '-'}</td>
                    <td>${priorityBadge}</td>
                    <td>${dueDate}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="window.housekeepingManager.updateTaskStatus('${task.id}', 'completed')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.housekeepingManager.deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteTask(taskId) {
        if (!confirm('Yakin ingin menghapus tugas ini?')) return;

        try {
            await window.dbManager.delete('tasks', taskId);
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderCleaningSchedule();
            this.renderMaintenanceTasks();
            this.renderHousekeepingList();
            showNotification('Tugas berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Error menghapus tugas!', 'error');
        }
    }

    renderInventory() {
        const container = document.getElementById('inventory-grid');
        if (!container) return;

        // Sample inventory items - you can expand this
        const sampleInventory = [
            { item: 'Handuk', stock: 50, minimum: 20, status: 'adequate' },
            { item: 'Sabun', stock: 15, minimum: 20, status: 'low' },
            { item: 'Shampo', stock: 30, minimum: 15, status: 'adequate' },
            { item: 'Tissue', stock: 5, minimum: 10, status: 'critical' }
        ];

        container.innerHTML = sampleInventory.map(item => `
            <div class="inventory-item ${item.status}">
                <h4>${item.item}</h4>
                <p>Stock: ${item.stock}</p>
                <p>Minimum: ${item.minimum}</p>
                <span class="status-badge ${item.status}">
                    ${item.status === 'adequate' ? 'Cukup' : 
                      item.status === 'low' ? 'Rendah' : 'Kritis'}
                </span>
            </div>
        `).join('');
    }

    showHousekeepingTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.housekeeping-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.housekeeping-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName + (tabName === 'cleaning' ? '-schedule' : 
                                                   tabName === 'maintenance' ? '-tasks' : 
                                                   tabName === 'inventory' ? '-check' : ''));
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activate button
        const activeBtn = document.querySelector(`.housekeeping-tabs .tab-btn[onclick="showHousekeepingTab('${tabName}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

// Reports Management Module (housekeeping-specific)
class ReportsHousekeepingManager {
    constructor() {
        this.bookings = [];
        this.payments = [];
        this.expenses = [];
        this.rooms = [];
        this.currentPeriod = 'month';
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.generateReport();
    }

    setupEventListeners() {
        const periodSelect = document.getElementById('report-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.updateReportPeriod();
            });
        }

        const startDate = document.getElementById('report-start');
        const endDate = document.getElementById('report-end');
        
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.generateReport());
            endDate.addEventListener('change', () => this.generateReport());
        }
    }

    async loadData() {
        try {
            await waitForDatabase();
            
            // Load data with fallback for missing tables
            try {
                this.bookings = await window.dbManager.select('bookings') || [];
            } catch (error) {
                console.warn('Bookings table not found, using empty array');
                this.bookings = [];
            }
            
            try {
                this.payments = await window.dbManager.select('payments') || [];
            } catch (error) {
                console.warn('Payments table not found, using empty array');
                this.payments = [];
            }
            
            try {
                this.expenses = await window.dbManager.select('expenses') || [];
            } catch (error) {
                console.warn('Expenses table not found, using empty array');
                this.expenses = [];
            }
            
            try {
                this.rooms = await window.dbManager.select('rooms') || [];
            } catch (error) {
                console.warn('Rooms table not found, using empty array');
                this.rooms = [];
            }
        } catch (error) {
            console.error('Error loading reports data:', error);
            this.bookings = [];
            this.payments = [];
            this.expenses = [];
            this.rooms = [];
        }
    }

    updateReportPeriod() {
        const startDate = document.getElementById('report-start');
        const endDate = document.getElementById('report-end');
        
        if (!startDate || !endDate) return;

        const today = new Date();
        let start, end;

        switch (this.currentPeriod) {
            case 'today':
                start = end = today;
                break;
            case 'week':
                start = new Date(today);
                start.setDate(today.getDate() - today.getDay());
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        startDate.value = start.toISOString().split('T')[0];
        endDate.value = end.toISOString().split('T')[0];
        
        this.generateReport();
    }

    generateReport() {
        const startDate = document.getElementById('report-start')?.value;
        const endDate = document.getElementById('report-end')?.value;
        
        if (!startDate || !endDate) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filter data by period
        const filteredBookings = this.bookings.filter(booking => {
            const date = new Date(booking.createdAt);
            return date >= start && date <= end;
        });

        const filteredPayments = this.payments.filter(payment => {
            const date = new Date(payment.createdAt);
            return date >= start && date <= end;
        });

        // Calculate metrics
        this.calculateOccupancyRate(filteredBookings, start, end);
        this.calculateRevPAR(filteredPayments, start, end);
        this.calculateADR(filteredPayments, filteredBookings);
        this.generateCharts(filteredBookings, filteredPayments);
        this.generateDetailedReports(filteredBookings, filteredPayments);
    }

    calculateOccupancyRate(bookings, startDate, endDate) {
        const totalRooms = this.rooms.length;
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const totalRoomNights = totalRooms * totalDays;

        let occupiedRoomNights = 0;
        bookings.forEach(booking => {
            if (booking.status === 'confirmed' || booking.status === 'checked-in' || booking.status === 'checked-out') {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                occupiedRoomNights += nights;
            }
        });

        const occupancyRate = totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;

        // Update UI
        const occupancyElement = document.getElementById('occupancy-rate');
        const occupiedElement = document.getElementById('occupied-rooms');
        const totalElement = document.getElementById('total-rooms');

        if (occupancyElement) occupancyElement.textContent = occupancyRate.toFixed(1) + '%';
        if (occupiedElement) occupiedElement.textContent = occupiedRoomNights;
        if (totalElement) totalElement.textContent = totalRoomNights;
    }

    calculateRevPAR(payments, startDate, endDate) {
        const totalRevenue = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const availableRoomNights = this.rooms.length * totalDays;
        
        const revPAR = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;

        // Update UI
        const revparElement = document.getElementById('revpar');
        const revenueElement = document.getElementById('total-revenue');
        const roomNightsElement = document.getElementById('available-room-nights');

        if (revparElement) revparElement.textContent = formatCurrency(revPAR);
        if (revenueElement) revenueElement.textContent = formatCurrency(totalRevenue);
        if (roomNightsElement) roomNightsElement.textContent = availableRoomNights;
    }

    calculateADR(payments, bookings) {
        const totalRevenue = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const roomsSold = bookings.filter(b => 
            b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'checked-out'
        ).length;
        
        const adr = roomsSold > 0 ? totalRevenue / roomsSold : 0;

        // Update UI
        const adrElement = document.getElementById('adr');
        const adrRevenueElement = document.getElementById('adr-revenue');
        const roomsSoldElement = document.getElementById('rooms-sold');

        if (adrElement) adrElement.textContent = formatCurrency(adr);
        if (adrRevenueElement) adrRevenueElement.textContent = formatCurrency(totalRevenue);
        if (roomsSoldElement) roomsSoldElement.textContent = roomsSold;
    }

    generateCharts(bookings, payments) {
        // This would require a charting library like Chart.js
        // For now, we'll show simple statistics
        console.log('Charts would be generated here with:', { bookings, payments });
    }

    generateDetailedReports(bookings, payments) {
        this.generateBookingReport(bookings);
        this.generateFinancialReport(payments);
    }

    generateBookingReport(bookings) {
        const container = document.getElementById('booking-detail-table');
        if (!container) return;

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Tamu</th>
                        <th>Kamar</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Status</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => {
                        const room = this.rooms.find(r => r.id === booking.roomId);
                        return `
                            <tr>
                                <td>${booking.id}</td>
                                <td>${booking.guestName}</td>
                                <td>${room ? room.number : 'Unknown'}</td>
                                <td>${new Date(booking.checkInDate).toLocaleDateString('id-ID')}</td>
                                <td>${new Date(booking.checkOutDate).toLocaleDateString('id-ID')}</td>
                                <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
                                <td>${formatCurrency(booking.totalAmount)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    generateFinancialReport(payments) {
        const container = document.getElementById('financial-detail-table');
        if (!container) return;

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Payment ID</th>
                        <th>Booking ID</th>
                        <th>Tanggal</th>
                        <th>Metode</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                        <tr>
                            <td>${payment.id}</td>
                            <td>${payment.bookingId}</td>
                            <td>${new Date(payment.createdAt).toLocaleDateString('id-ID')}</td>
                            <td>${payment.paymentMethod}</td>
                            <td>${formatCurrency(payment.totalAmount)}</td>
                            <td><span class="status-badge ${payment.status}">${payment.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showReportTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.report-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.report-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activate button
        const activeBtn = document.querySelector(`.report-tabs .tab-btn[onclick="showReportTab('${tabName}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

// Global functions for new features
function showAddTaskForm() {
    if (window.housekeepingManager) {
        window.housekeepingManager.showAddTaskForm();
    }
}

function hideTaskForm() {
    if (window.housekeepingManager) {
        window.housekeepingManager.hideTaskForm();
    }
}

function showHousekeepingTab(tabName) {
    if (window.housekeepingManager) {
        window.housekeepingManager.showHousekeepingTab(tabName);
    }
}

function generateReport() {
    if (window.reportsHousekeepingManager) {
        window.reportsHousekeepingManager.generateReport();
    } else if (window.reportsManager) {
        window.reportsManager.generateReport();
    }
}

function updateReportPeriod() {
    if (window.reportsHousekeepingManager) {
        window.reportsHousekeepingManager.updateReportPeriod();
    } else if (window.reportsManager) {
        window.reportsManager.updateReportPeriod();
    }
}

function showReportTab(tabName) {
    if (window.reportsHousekeepingManager) {
        window.reportsHousekeepingManager.showReportTab(tabName);
    } else if (window.reportsManager) {
        window.reportsManager.showReportTab(tabName);
    }
}

function showCheckinTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.checkin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.checkin-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-list');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate button
    const activeBtn = document.querySelector(`.checkin-tabs .tab-btn[onclick="showCheckinTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function printRoomList() {
    if (window.printManager) {
        window.printManager.printRooms();
    }
}

function printGuestList() {
    if (window.printManager) {
        window.printManager.printGuests();
    }
}

function printHousekeepingReport() {
    if (window.printManager) {
        window.printManager.printHousekeeping();
    }
}

function printAllReports() {
    if (window.printManager) {
        window.printManager.printReports();
    }
}

// Initialize new managers when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for database to be ready before initializing managers
    try {
        await waitForDatabase();
        window.housekeepingManager = new HousekeepingManager();
    // Avoid overwriting the global reportsManager from reports.js
    // expose a separate instance for housekeeping reports if needed
    window.reportsHousekeepingManager = new ReportsHousekeepingManager();
    } catch (error) {
        console.error('Failed to initialize housekeeping and reports managers:', error);
    }
});
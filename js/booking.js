/**
 * Booking Module for SikaBu View
 * Handles all booking-related operations
 */

class BookingManager {
    constructor() {
        this.currentBookings = [];
        this.filteredBookings = [];
        this.init();
    }
    
    async init() {
        await this.loadBookings();
        this.setupEventListeners();
        this.updateDashboardStats();
    }
    
    setupEventListeners() {
        // Add booking form submission
        const addBookingForm = document.getElementById('add-booking-form');
        if (addBookingForm) {
            addBookingForm.addEventListener('submit', (e) => this.handleAddBooking(e));
        }
        
        // Auto-generate guest ID
        const guestIdField = document.getElementById('guest-id');
        const guestNameField = document.getElementById('guest-name');
        if (guestIdField && guestNameField) {
            guestNameField.addEventListener('input', () => this.generateGuestId());
        }
        
        // Calculate total price
        const quantityField = document.getElementById('booking-quantity');
        const priceField = document.getElementById('booking-price');
        if (quantityField && priceField) {
            [quantityField, priceField].forEach(field => {
                field.addEventListener('input', () => this.calculateTotalPrice());
            });
        }
        
        // Set default dates
        this.setDefaultDates();
    }
    
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const bookingDateField = document.getElementById('booking-date');
        const checkinDateField = document.getElementById('checkin-date');
        
        if (bookingDateField && !bookingDateField.value) {
            bookingDateField.value = today;
        }
        
        if (checkinDateField && !checkinDateField.value) {
            checkinDateField.value = tomorrowStr;
        }
    }
    
    generateGuestId() {
        const guestName = document.getElementById('guest-name').value;
        const guestIdField = document.getElementById('guest-id');
        
        if (guestName && guestIdField) {
            // Generate ID from name + timestamp
            const namePrefix = guestName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
            const timestamp = Date.now().toString().slice(-4);
            guestIdField.value = `${namePrefix}${timestamp}`;
        }
    }
    
    calculateTotalPrice() {
        const quantity = parseInt(document.getElementById('booking-quantity').value) || 0;
        const price = parseFloat(document.getElementById('booking-price').value) || 0;
        const total = quantity * price;
        
        // Show total in a visual way (you can add a display element for this)
        console.log('Total Price:', this.formatCurrency(total));
    }
    
    async handleAddBooking(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const bookingData = {
                guestId: formData.get('guestId'),
                guestName: formData.get('guestName'),
                guestPhone: formData.get('guestPhone'),
                bookingDate: formData.get('bookingDate'),
                checkinDate: formData.get('checkinDate'),
                checkoutDate: formData.get('checkoutDate'),
                bookingType: formData.get('bookingType'),
                quantity: parseInt(formData.get('quantity')),
                price: parseFloat(formData.get('price')),
                notes: formData.get('notes') || '',
                status: 'pending'
            };
            
            // Validate dates
            if (new Date(bookingData.checkinDate) >= new Date(bookingData.checkoutDate)) {
                throw new Error('Tanggal check-out harus setelah tanggal check-in');
            }
            
            // Calculate total price
            bookingData.totalPrice = bookingData.quantity * bookingData.price;
            
            // Save to database
            const bookingId = await window.dbManager.insert('bookings', bookingData);
            
            if (bookingId) {
                this.showSuccess('Booking berhasil ditambahkan');
                this.hideAddBookingForm();
                await this.loadBookings();
                this.updateDashboardStats();
                
                // Reload calendar if available
                if (window.calendarManager) {
                    await window.calendarManager.loadData();
                    window.calendarManager.renderCalendar();
                }
                
                event.target.reset();
                this.setDefaultDates();
            }
        } catch (error) {
            this.showError('Error menambah booking: ' + error.message);
        }
    }
    
    async loadBookings() {
        try {
            await waitForDatabase();
            this.currentBookings = await window.dbManager.select('bookings', {}, 'bookingDate DESC');
            this.filteredBookings = [...this.currentBookings];
            this.displayBookings();
            this.updatePaymentBookingDropdown();
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Error memuat data booking');
        }
    }
    
    displayBookings() {
        const bookingList = document.getElementById('booking-list');
        if (!bookingList) return;
        
        if (this.filteredBookings.length === 0) {
            bookingList.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">Tidak ada data booking</td>
                </tr>
            `;
            return;
        }
        
        bookingList.innerHTML = this.filteredBookings.map(booking => `
            <tr>
                <td>#${booking.id}</td>
                <td>
                    <strong>${booking.guestName}</strong><br>
                    <small>${booking.guestId}</small><br>
                    <small>${booking.guestPhone}</small>
                </td>
                <td>${this.formatDate(booking.bookingDate)}</td>
                <td>
                    <strong>In:</strong> ${this.formatDate(booking.checkinDate)}<br>
                    <strong>Out:</strong> ${this.formatDate(booking.checkoutDate)}
                </td>
                <td>
                    <span class="booking-type">${this.getBookingTypeLabel(booking.bookingType)}</span>
                </td>
                <td>${booking.quantity}</td>
                <td>${this.formatCurrency(booking.totalPrice)}</td>
                <td>
                    <span class="status-badge status-${booking.status}">
                        ${this.getStatusLabel(booking.status)}
                    </span>
                </td>
                <td>
                    <button class="action-btn view" onclick="bookingManager.viewBooking(${booking.id})" title="Lihat Detail">
                        👁️
                    </button>
                    <button class="action-btn edit" onclick="bookingManager.editBooking(${booking.id})" title="Edit">
                        ✏️
                    </button>
                    ${booking.status === 'pending' || booking.status === 'confirmed' ? `
                        <button class="action-btn pay" onclick="bookingManager.processPayment(${booking.id})" title="Bayar">
                            💳
                        </button>
                    ` : ''}
                    <button class="action-btn delete" onclick="bookingManager.deleteBooking(${booking.id})" title="Hapus">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    getBookingTypeLabel(type) {
        const labels = {
            'kamar': 'Kamar',
            'villa': 'Villa',
            'tenda': 'Tenda',
            'camping': 'Camping Ground',
            'all': 'Seluruh Lokasi'
        };
        return labels[type] || type;
    }
    
    getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'confirmed': 'Terkonfirmasi',
            'checkedin': 'Check-in',
            'checkedout': 'Check-out',
            'cancelled': 'Dibatalkan'
        };
        return labels[status] || status;
    }
    
    filterBookings() {
        const searchTerm = document.getElementById('booking-search').value.toLowerCase();
        const typeFilter = document.getElementById('booking-filter-type').value;
        const statusFilter = document.getElementById('booking-filter-status').value;
        
        this.filteredBookings = this.currentBookings.filter(booking => {
            const matchesSearch = !searchTerm || 
                booking.guestName.toLowerCase().includes(searchTerm) ||
                booking.guestId.toLowerCase().includes(searchTerm) ||
                booking.guestPhone.includes(searchTerm);
            
            const matchesType = !typeFilter || booking.bookingType === typeFilter;
            const matchesStatus = !statusFilter || booking.status === statusFilter;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        
        this.displayBookings();
    }
    
    async viewBooking(id) {
        const booking = this.currentBookings.find(b => b.id === id);
        if (!booking) return;
        
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = 'Detail Booking';
        modalMessage.innerHTML = `
            <div class="booking-detail">
                <p><strong>ID Booking:</strong> #${booking.id}</p>
                <p><strong>Tamu:</strong> ${booking.guestName} (${booking.guestId})</p>
                <p><strong>Telepon:</strong> ${booking.guestPhone}</p>
                <p><strong>Tanggal Booking:</strong> ${this.formatDate(booking.bookingDate)}</p>
                <p><strong>Check-in:</strong> ${this.formatDate(booking.checkinDate)}</p>
                <p><strong>Check-out:</strong> ${this.formatDate(booking.checkoutDate)}</p>
                <p><strong>Jenis:</strong> ${this.getBookingTypeLabel(booking.bookingType)}</p>
                <p><strong>Jumlah:</strong> ${booking.quantity}</p>
                <p><strong>Harga per Unit:</strong> ${this.formatCurrency(booking.price)}</p>
                <p><strong>Total Harga:</strong> ${this.formatCurrency(booking.totalPrice)}</p>
                <p><strong>Status:</strong> ${this.getStatusLabel(booking.status)}</p>
                ${booking.notes ? `<p><strong>Catatan:</strong> ${booking.notes}</p>` : ''}
            </div>
        `;
        
        modalConfirm.textContent = 'Tutup';
        modalConfirm.onclick = () => this.closeModal();
        
        this.showModal();
    }
    
    async editBooking(id) {
        const booking = this.currentBookings.find(b => b.id === id);
        if (!booking) return;
        
        // Fill form with existing data
        document.getElementById('guest-id').value = booking.guestId;
        document.getElementById('guest-name').value = booking.guestName;
        document.getElementById('guest-phone').value = booking.guestPhone;
        document.getElementById('booking-date').value = booking.bookingDate;
        document.getElementById('checkin-date').value = booking.checkinDate;
        document.getElementById('checkout-date').value = booking.checkoutDate;
        document.getElementById('booking-type').value = booking.bookingType;
        document.getElementById('booking-quantity').value = booking.quantity;
        document.getElementById('booking-price').value = booking.price;
        document.getElementById('booking-notes').value = booking.notes;
        
        // Change form to edit mode
        const form = document.getElementById('add-booking-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Booking';
        
        // Store the booking ID for update
        form.dataset.editId = id;
        
        this.showAddBookingForm();
    }
    
    async deleteBooking(id) {
        const booking = this.currentBookings.find(b => b.id === id);
        if (!booking) return;
        
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = 'Konfirmasi Hapus';
        modalMessage.textContent = `Apakah Anda yakin ingin menghapus booking ${booking.guestName} (#${id})?`;
        
        modalConfirm.textContent = 'Hapus';
        modalConfirm.onclick = async () => {
            try {
                await window.dbManager.delete('bookings', id);
                this.showSuccess('Booking berhasil dihapus');
                await this.loadBookings();
                this.updateDashboardStats();
                this.closeModal();
            } catch (error) {
                this.showError('Error menghapus booking: ' + error.message);
            }
        };
        
        this.showModal();
    }
    
    async updateBookingStatus(id, status) {
        try {
            await window.dbManager.update('bookings', id, { status });
            await this.loadBookings();
            this.updateDashboardStats();
            
            // Reload calendar if available
            if (window.calendarManager) {
                await window.calendarManager.loadData();
                window.calendarManager.renderCalendar();
            }
            
            this.showSuccess(`Status booking berhasil diubah ke ${this.getStatusLabel(status)}`);
        } catch (error) {
            this.showError('Error mengubah status: ' + error.message);
        }
    }
    
    processPayment(bookingId) {
        // Switch to payment tab and load the booking
        window.showTab('payment');
        if (window.paymentManager) {
            window.paymentManager.loadBookingForPayment(bookingId);
        }
    }
    
    updatePaymentBookingDropdown() {
        const dropdown = document.getElementById('payment-booking-id');
        if (!dropdown) return;
        
        // Get unpaid bookings
        const unpaidBookings = this.currentBookings.filter(booking => 
            booking.status === 'confirmed' || booking.status === 'checkedin'
        );
        
        dropdown.innerHTML = '<option value="">Pilih booking untuk checkout</option>' +
            unpaidBookings.map(booking => `
                <option value="${booking.id}">
                    #${booking.id} - ${booking.guestName} (${this.getBookingTypeLabel(booking.bookingType)})
                </option>
            `).join('');
    }
    
    async updateDashboardStats() {
        // Only update if we're on dashboard tab
        if (window.sikabuApp && window.sikabuApp.currentTab !== 'dashboard') {
            return;
        }
        
        // Update today's bookings
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = this.currentBookings.filter(booking => 
            booking.bookingDate === today
        ).length;
        
        const todayBookingsElement = document.getElementById('today-bookings');
        if (todayBookingsElement) {
            todayBookingsElement.textContent = todayBookings;
        }
        
        // Update recent bookings
        this.updateRecentBookings();
    }
    
    updateRecentBookings() {
        const recentBookingsContainer = document.getElementById('recent-bookings');
        if (!recentBookingsContainer) return;
        
        const recentBookings = this.currentBookings.slice(0, 5);
        
        if (recentBookings.length === 0) {
            recentBookingsContainer.innerHTML = '<p>Tidak ada booking terbaru</p>';
            return;
        }
        
        recentBookingsContainer.innerHTML = recentBookings.map(booking => `
            <div class="activity-item">
                <div>
                    <strong>${booking.guestName}</strong> - ${this.getBookingTypeLabel(booking.bookingType)}<br>
                    <small>${this.formatDate(booking.bookingDate)} | ${this.formatCurrency(booking.totalPrice)}</small>
                </div>
                <span class="status-badge status-${booking.status}">
                    ${this.getStatusLabel(booking.status)}
                </span>
            </div>
        `).join('');
    }
    
    // UI Helper methods
    showAddBookingForm() {
        const form = document.getElementById('booking-form');
        if (form) {
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    hideAddBookingForm() {
        const form = document.getElementById('booking-form');
        const addForm = document.getElementById('add-booking-form');
        
        if (form) {
            form.style.display = 'none';
        }
        
        if (addForm) {
            // Reset form to add mode
            const submitBtn = addForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Simpan Booking';
            delete addForm.dataset.editId;
        }
    }
    
    showModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    showSuccess(message) {
        // You can implement a toast notification here
        alert('✅ ' + message);
    }
    
    showError(message) {
        // You can implement a toast notification here
        alert('❌ ' + message);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
}

// Global functions for HTML onclick events
window.showAddBookingForm = () => {
    if (window.bookingManager) {
        window.bookingManager.showAddBookingForm();
    }
};

window.hideAddBookingForm = () => {
    if (window.bookingManager) {
        window.bookingManager.hideAddBookingForm();
    }
};

window.filterBookings = () => {
    if (window.bookingManager) {
        window.bookingManager.filterBookings();
    }
};

// Initialize booking manager
// Initialize BookingManager after database is ready
(async function initBookingManager() {
    try {
        await waitForDatabase();
        window.bookingManager = new BookingManager();
    } catch (error) {
        console.error('Failed to initialize BookingManager:', error);
    }
})();
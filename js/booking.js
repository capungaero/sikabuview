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
                checkIn: formData.get('checkinDate'),
                checkOut: formData.get('checkoutDate'),
                bookingType: formData.get('bookingType'),
                quantity: parseInt(formData.get('quantity')),
                price: parseFloat(formData.get('price')),
                notes: formData.get('notes') || '',
                status: formData.get('status') || 'pending',
                roomNumber: formData.get('roomNumber') || '',
                createdAt: new Date().toISOString()
            };
            
            // Validate dates
            if (new Date(bookingData.checkIn) >= new Date(bookingData.checkOut)) {
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
                
                // Dispatch event for calendar sync
                document.dispatchEvent(new CustomEvent('bookingCreated', {
                    detail: { bookingId, bookingData }
                }));
                
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
                        <span style="font-size:1.3em;">👁️</span> Lihat
                    </button>
                    <button class="action-btn edit" onclick="bookingManager.editBooking(${booking.id})" title="Edit">
                        <span style="font-size:1.3em;">✏️</span> Edit
                    </button>
                    ${booking.status === 'pending' || booking.status === 'confirmed' ? `
                        <button class="action-btn pay" onclick="bookingManager.processPayment(${booking.id})" title="Bayar">
                            <span style="font-size:1.3em;">💳</span> Bayar
                        </button>
                    ` : ''}
                    <button class="action-btn delete" onclick="bookingManager.deleteBooking(${booking.id})" title="Hapus">
                        <span style="font-size:1.3em;">🗑️</span> Hapus
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
                
                // Dispatch event for calendar sync
                document.dispatchEvent(new CustomEvent('bookingDeleted', {
                    detail: { bookingId: id }
                }));
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
            
            this.showSuccess(`Status booking berhasil diubah ke ${this.getStatusLabel(status)}`);
            
            // Dispatch event for calendar sync
            document.dispatchEvent(new CustomEvent('bookingUpdated', {
                detail: { bookingId: id, status }
            }));
        } catch (error) {
            this.showError('Error mengubah status: ' + error.message);
        }
    }
    
    async processPayment(bookingId) {
        // Ambil data booking
        const booking = this.currentBookings.find(b => b.id === bookingId);
        if (!booking) {
            window.showNotification && window.showNotification('Booking tidak ditemukan', 'error');
            return;
        }

        // Tagihan tambahan
        let extraCharges = [];

        // Render popup pembayaran
        const renderPaymentModal = () => {
            let extraRows = extraCharges.map((item, idx) => `
                <tr>
                    <td>${item.name}</td>
                    <td>Rp ${item.amount.toLocaleString('id-ID')}</td>
                    <td><button type="button" class="btn btn-danger btn-sm" onclick="removeExtraCharge(${idx})">Hapus</button></td>
                </tr>
            `).join('');
            if (!extraRows) extraRows = '<tr><td colspan="3" style="text-align:center;color:#aaa;">Belum ada tagihan tambahan</td></tr>';

            const total = booking.price + extraCharges.reduce((sum, c) => sum + c.amount, 0);

            // Format tanggal check-in dan check-out
            let checkIn = booking.checkIn || booking.checkinDate || '-';
            let checkOut = booking.checkOut || booking.checkoutDate || '-';
            // Format jika tipe Date
            if (checkIn instanceof Date) checkIn = checkIn.toLocaleDateString('id-ID');
            if (checkOut instanceof Date) checkOut = checkOut.toLocaleDateString('id-ID');

            // Tampilkan tipe kamar
            let bookingType = booking.bookingType ? (window.bookingManager && window.bookingManager.getBookingTypeLabel ? window.bookingManager.getBookingTypeLabel(booking.bookingType) : booking.bookingType) : '-';

            return `
                <div class="payment-popup">
                    <h3>Pembayaran Booking</h3>
                    <div class="booking-summary">
                        <p><b>Nama Tamu:</b> ${booking.guestName}</p>
                        <p><b>Tipe Kamar:</b> ${bookingType}</p>
                        <p><b>Kamar/Unit:</b> ${booking.roomNumber || '-'}</p>
                        <p><b>Check-in:</b> ${checkIn}</p>
                        <p><b>Check-out:</b> ${checkOut}</p>
                        <p><b>Status:</b> ${booking.status}</p>
                        <p><b>Harga Booking:</b> Rp ${booking.price.toLocaleString('id-ID')}</p>
                    </div>
                    <hr>
                    <h4>Tagihan Tambahan</h4>
                    <table class="extra-charges-table">
                        <thead><tr><th>Item</th><th>Jumlah</th><th></th></tr></thead>
                        <tbody>${extraRows}</tbody>
                    </table>
                    <form id="extra-charge-form" style="margin-top:10px;display:flex;gap:8px;align-items:end;">
                        <div>
                            <label>Nama Item</label>
                            <input type="text" id="extra-item-name" required placeholder="Contoh: Makanan">
                        </div>
                        <div>
                            <label>Jumlah (Rp)</label>
                            <input type="number" id="extra-item-amount" required min="0" step="1000" placeholder="0">
                        </div>
                        <button type="submit" class="btn btn-primary">Tambah</button>
                    </form>
                    <hr>
                    <div class="total-row"><b>Total Bayar:</b> <span style="font-size:1.2em;color:#2563eb;">Rp ${total.toLocaleString('id-ID')}</span></div>
                    <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
                        <button class="btn btn-success" onclick="confirmPayment()">Konfirmasi Bayar</button>
                        <button class="btn btn-secondary" onclick="window.closeModal()">Tutup</button>
                    </div>
                </div>
            `;
        };

        // Handler untuk tambah tagihan
        window.removeExtraCharge = (idx) => {
            extraCharges.splice(idx, 1);
            window.showModal('Pembayaran Booking', renderPaymentModal());
            setupModalHandlers();
        };

        function setupModalHandlers() {
            const form = document.getElementById('extra-charge-form');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const name = document.getElementById('extra-item-name').value.trim();
                    const amount = parseInt(document.getElementById('extra-item-amount').value, 10) || 0;
                    if (name && amount > 0) {
                        extraCharges.push({ name, amount });
                        window.showModal('Pembayaran Booking', renderPaymentModal());
                        setupModalHandlers();
                    }
                };
            }
        }

        window.confirmPayment = async () => {
            // Simpan pembayaran (update status booking, simpan tagihan tambahan jika perlu)
            booking.status = 'paid';
            booking.extraCharges = extraCharges;
            // Simpan ke database jika ada dbManager
            if (window.dbManager) {
                await window.dbManager.update('bookings', booking.id, booking);
            }
            window.closeModal();
            window.showNotification && window.showNotification('Pembayaran berhasil dikonfirmasi', 'success');
            // Refresh tampilan
            if (window.bookingManager) {
                window.bookingManager.loadBookings && window.bookingManager.loadBookings();
            }
        };

        window.showModal('Pembayaran Booking', renderPaymentModal());
        setupModalHandlers();
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
        
        // Listen for bookings created from calendar
        document.addEventListener('bookingCreated', (event) => {
            const { bookingData } = event.detail;
            console.log('New booking created from calendar:', bookingData);
            
            // Refresh booking list if we're on booking page
            if (document.getElementById('booking-list') && window.bookingManager) {
                window.bookingManager.loadBookings();
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize BookingManager:', error);
    }
})();
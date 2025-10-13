/**
 * Payment Module for SikaBu View
 * Handles payment processing and checkout
 */

class PaymentManager {
    constructor() {
        this.currentPayments = [];
        this.filteredPayments = [];
        this.currentBooking = null;
        this.additionalOrders = [];
        this.init();
    }
    
    async init() {
        await this.loadPayments();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Payment form submission
        const paymentForm = document.getElementById('add-payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }

        // Auto-load booking data when booking ID is entered
        const paymentBookingId = document.getElementById('payment-booking-id');
        if (paymentBookingId) {
            paymentBookingId.addEventListener('blur', (e) => this.loadBookingDataForPayment(e.target.value));
        }

        // Payment booking selection
        const bookingSelect = document.getElementById('payment-booking-id');
        if (bookingSelect) {
            bookingSelect.addEventListener('change', () => this.loadBookingForPayment());
        }
        
        // Additional order form
        const additionalItem = document.getElementById('additional-item');
        const additionalDescription = document.getElementById('additional-description');
        const additionalPrice = document.getElementById('additional-price');
        
        if (additionalItem) {
            additionalItem.addEventListener('change', (e) => {
                if (e.target.value === 'lainnya') {
                    additionalDescription.placeholder = 'Masukkan deskripsi item';
                } else {
                    additionalDescription.placeholder = `Deskripsi ${e.target.value}`;
                }
            });
        }
    }
    
    async loadPayments() {
        try {
            await waitForDatabase();
            this.currentPayments = await window.dbManager.select('payments', {}, 'paymentDate DESC');
            this.filteredPayments = [...this.currentPayments];
            this.displayPayments();
        } catch (error) {
            console.error('Error loading payments:', error);
            this.showError('Error memuat data pembayaran');
        }
    }

    async loadBookingDataForPayment(bookingId) {
        if (!bookingId) return;
        
        try {
            await waitForDatabase();
            const bookings = await window.dbManager.select('bookings');
            const booking = bookings.find(b => b.id === bookingId);
            
            if (booking) {
                document.getElementById('payment-guest-name').value = booking.guestName || '';
                
                // Calculate total amount
                const totalAmount = booking.totalPrice || (booking.price * booking.quantity);
                document.getElementById('payment-amount').value = totalAmount;
                
                // Set default paid amount
                document.getElementById('payment-paid').value = totalAmount;
                
                // Set default date to now
                const now = new Date();
                document.getElementById('payment-date').value = now.toISOString().slice(0, 16);
            } else {
                showNotification('Booking ID tidak ditemukan!', 'warning');
            }
        } catch (error) {
            console.error('Error loading booking for payment:', error);
        }
    }

    async handlePaymentSubmit(e) {
        e.preventDefault();
        
        const bookingId = document.getElementById('payment-booking-id').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const paidAmount = parseFloat(document.getElementById('payment-paid').value);
        const paymentMethod = document.getElementById('payment-method').value;
        const paymentDate = document.getElementById('payment-date').value;
        const reference = document.getElementById('payment-reference').value;
        const notes = document.getElementById('payment-notes').value;

        try {
            // Validate
            if (!bookingId || !paymentMethod || !paymentDate) {
                showNotification('Mohon lengkapi semua field yang wajib diisi!', 'warning');
                return;
            }

            // Get booking data
            const bookings = await window.dbManager.select('bookings');
            const booking = bookings.find(b => b.id === bookingId);
            
            if (!booking) {
                showNotification('Booking tidak ditemukan!', 'error');
                return;
            }

            // Create payment record
            const payment = {
                id: 'PAY-' + Date.now(),
                bookingId: bookingId,
                guestName: booking.guestName,
                amount: amount,
                paidAmount: paidAmount,
                paymentMethod: paymentMethod,
                paymentDate: paymentDate,
                reference: reference,
                notes: notes,
                status: paidAmount >= amount ? 'paid' : 'partial',
                createdAt: new Date().toISOString()
            };

            await window.dbManager.insert('payments', payment);

            // Update booking status if fully paid
            if (paidAmount >= amount) {
                booking.paymentStatus = 'paid';
                booking.paidAt = paymentDate;
                await window.dbManager.update('bookings', booking);
            }

            // Hide form and reload
            hidePaymentForm();
            await this.loadPayments();
            
            // Clear form
            document.getElementById('add-payment-form').reset();
            
            showNotification('Pembayaran berhasil disimpan!', 'success');
        } catch (error) {
            console.error('Error processing payment:', error);
            showNotification('Error saat memproses pembayaran: ' + error.message, 'error');
        }
    }
    
    async loadBookingForPayment(bookingId = null) {
        const bookingSelect = document.getElementById('payment-booking-id');
        const selectedBookingId = bookingId || parseInt(bookingSelect.value);
        
        if (!selectedBookingId) {
            this.hidePaymentDetails();
            return;
        }
        
        try {
            // Get booking details
            const bookings = await window.dbManager.select('bookings', { id: selectedBookingId });
            
            if (bookings.length === 0) {
                this.showError('Booking tidak ditemukan');
                return;
            }
            
            this.currentBooking = bookings[0];
            
            // Check if already paid
            const existingPayments = await window.dbManager.select('payments', { bookingId: selectedBookingId });
            if (existingPayments.length > 0) {
                this.showError('Booking ini sudah dibayar');
                this.hidePaymentDetails();
                return;
            }
            
            // Set the dropdown value if called programmatically
            if (bookingId) {
                bookingSelect.value = bookingId;
            }
            
            this.displayBookingDetails();
            this.showPaymentDetails();
            this.resetAdditionalOrders();
            this.updatePaymentSummary();
            
        } catch (error) {
            console.error('Error loading booking:', error);
            this.showError('Error memuat detail booking');
        }
    }
    
    displayBookingDetails() {
        const summaryContainer = document.getElementById('booking-summary-content');
        if (!summaryContainer || !this.currentBooking) return;
        
        const booking = this.currentBooking;
        const nights = this.calculateNights(booking.checkinDate, booking.checkoutDate);
        
        summaryContainer.innerHTML = `
            <div class="booking-summary-grid">
                <div class="summary-item">
                    <label>ID Booking:</label>
                    <span>#${booking.id}</span>
                </div>
                <div class="summary-item">
                    <label>Tamu:</label>
                    <span>${booking.guestName} (${booking.guestId})</span>
                </div>
                <div class="summary-item">
                    <label>Telepon:</label>
                    <span>${booking.guestPhone}</span>
                </div>
                <div class="summary-item">
                    <label>Jenis:</label>
                    <span>${this.getBookingTypeLabel(booking.bookingType)}</span>
                </div>
                <div class="summary-item">
                    <label>Periode:</label>
                    <span>${this.formatDate(booking.checkinDate)} - ${this.formatDate(booking.checkoutDate)} (${nights} malam)</span>
                </div>
                <div class="summary-item">
                    <label>Jumlah:</label>
                    <span>${booking.quantity} unit</span>
                </div>
                <div class="summary-item">
                    <label>Harga per Unit:</label>
                    <span>${this.formatCurrency(booking.price)}</span>
                </div>
                <div class="summary-item total">
                    <label>Total Penginapan:</label>
                    <span>${this.formatCurrency(booking.totalPrice)}</span>
                </div>
            </div>
        `;
    }
    
    calculateNights(checkinDate, checkoutDate) {
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const diffTime = Math.abs(checkout - checkin);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    addAdditionalOrder() {
        const itemSelect = document.getElementById('additional-item');
        const descriptionInput = document.getElementById('additional-description');
        const priceInput = document.getElementById('additional-price');
        
        const item = itemSelect.value;
        const description = descriptionInput.value.trim();
        const price = parseFloat(priceInput.value) || 0;
        
        if (!item || !description || price <= 0) {
            this.showError('Mohon lengkapi semua field pesanan tambahan');
            return;
        }
        
        const additionalOrder = {
            id: Date.now(),
            item: item,
            description: description,
            price: price
        };
        
        this.additionalOrders.push(additionalOrder);
        this.displayAdditionalOrders();
        this.updatePaymentSummary();
        
        // Reset form
        itemSelect.value = '';
        descriptionInput.value = '';
        priceInput.value = '';
    }
    
    displayAdditionalOrders() {
        const container = document.getElementById('additional-orders-list');
        if (!container) return;
        
        if (this.additionalOrders.length === 0) {
            container.innerHTML = '<p class="text-center">Belum ada pesanan tambahan</p>';
            return;
        }
        
        container.innerHTML = this.additionalOrders.map(order => `
            <div class="additional-item">
                <div>
                    <strong>${this.getItemLabel(order.item)}</strong><br>
                    <small>${order.description}</small>
                </div>
                <div style="text-align: right;">
                    <div>${this.formatCurrency(order.price)}</div>
                    <button class="action-btn delete" onclick="paymentManager.removeAdditionalOrder(${order.id})" title="Hapus">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    removeAdditionalOrder(orderId) {
        this.additionalOrders = this.additionalOrders.filter(order => order.id !== orderId);
        this.displayAdditionalOrders();
        this.updatePaymentSummary();
    }
    
    updatePaymentSummary() {
        if (!this.currentBooking) return;
        
        const accommodationCost = this.currentBooking.totalPrice;
        const additionalCost = this.additionalOrders.reduce((sum, order) => sum + order.price, 0);
        const totalPayment = accommodationCost + additionalCost;
        
        // Update display elements
        const accommodationElement = document.getElementById('accommodation-cost');
        const additionalElement = document.getElementById('additional-cost');
        const totalElement = document.getElementById('total-payment');
        
        if (accommodationElement) {
            accommodationElement.textContent = this.formatCurrency(accommodationCost);
        }
        
        if (additionalElement) {
            additionalElement.textContent = this.formatCurrency(additionalCost);
        }
        
        if (totalElement) {
            totalElement.textContent = this.formatCurrency(totalPayment);
        }
    }
    
    async processPayment() {
        if (!this.currentBooking) {
            this.showError('Pilih booking terlebih dahulu');
            return;
        }
        
        const paymentMethod = document.getElementById('payment-method').value;
        const paymentNotes = document.getElementById('payment-notes').value.trim();
        
        if (!paymentMethod) {
            this.showError('Pilih metode pembayaran');
            return;
        }
        
        try {
            const accommodationCost = this.currentBooking.totalPrice;
            const additionalCost = this.additionalOrders.reduce((sum, order) => sum + order.price, 0);
            const totalAmount = accommodationCost + additionalCost;
            
            const paymentData = {
                bookingId: this.currentBooking.id,
                accommodationCost: accommodationCost,
                additionalCost: additionalCost,
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                paymentDate: new Date().toISOString(),
                notes: paymentNotes,
                additionalOrders: JSON.stringify(this.additionalOrders)
            };
            
            // Save payment
            const paymentId = await window.dbManager.insert('payments', paymentData);
            
            if (paymentId) {
                // Update booking status to checked out
                await window.dbManager.update('bookings', this.currentBooking.id, { 
                    status: 'checkedout' 
                });
                
                // Update dashboard stats
                if (window.bookingManager) {
                    await window.bookingManager.loadBookings();
                    window.bookingManager.updateDashboardStats();
                }
                
                // Update finance data
                if (window.financeManager) {
                    await window.financeManager.loadFinanceData();
                    window.financeManager.updateFinanceSummary();
                }
                
                this.showSuccess('Pembayaran berhasil diproses');
                this.clearPaymentForm();
                await this.loadPayments();
            }
            
        } catch (error) {
            console.error('Error processing payment:', error);
            this.showError('Error memproses pembayaran: ' + error.message);
        }
    }
    
    clearPaymentForm() {
        // Reset booking selection
        const bookingSelect = document.getElementById('payment-booking-id');
        if (bookingSelect) {
            bookingSelect.value = '';
        }
        
        // Reset payment method and notes
        const paymentMethod = document.getElementById('payment-method');
        const paymentNotes = document.getElementById('payment-notes');
        
        if (paymentMethod) paymentMethod.value = 'cash';
        if (paymentNotes) paymentNotes.value = '';
        
        // Clear additional orders
        this.resetAdditionalOrders();
        
        // Hide payment details
        this.hidePaymentDetails();
        
        // Clear current booking
        this.currentBooking = null;
    }
    
    resetAdditionalOrders() {
        this.additionalOrders = [];
        this.displayAdditionalOrders();
    }
    
    displayPayments() {
        const paymentList = document.getElementById('payment-list');
        if (!paymentList) return;
        
        if (this.filteredPayments.length === 0) {
            paymentList.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data pembayaran</td>
                </tr>
            `;
            return;
        }
        
        paymentList.innerHTML = this.filteredPayments.map(payment => {
            const statusBadge = payment.status === 'paid' ? 
                '<span class="badge badge-success">Lunas</span>' : 
                '<span class="badge badge-warning">Partial</span>';
                
            return `
                <tr>
                    <td>${payment.id}</td>
                    <td>${this.formatDateTime(payment.paymentDate)}</td>
                    <td>${payment.bookingId}</td>
                    <td>${payment.guestName || '-'}</td>
                    <td>${this.formatCurrency(payment.paidAmount)}</td>
                    <td>${this.getPaymentMethodLabel(payment.paymentMethod)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.paymentManager.viewPayment('${payment.id}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.paymentManager.printReceipt('${payment.id}')" title="Cetak Kwitansi">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    async viewPayment(id) {
        const payment = this.currentPayments.find(p => p.id === id);
        if (!payment) return;
        
        // Get booking details
        const bookings = await window.dbManager.select('bookings', { id: payment.bookingId });
        const booking = bookings[0];
        
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = 'Detail Pembayaran';
        
        let additionalOrdersHtml = '';
        if (payment.additionalOrders) {
            try {
                const additionalOrders = JSON.parse(payment.additionalOrders);
                if (additionalOrders.length > 0) {
                    additionalOrdersHtml = `
                        <p><strong>Pesanan Tambahan:</strong></p>
                        <ul>
                            ${additionalOrders.map(order => `
                                <li>${this.getItemLabel(order.item)} - ${order.description}: ${this.formatCurrency(order.price)}</li>
                            `).join('')}
                        </ul>
                    `;
                }
            } catch (error) {
                console.error('Error parsing additional orders:', error);
            }
        }
        
        modalMessage.innerHTML = `
            <div class="payment-detail">
                <p><strong>ID Pembayaran:</strong> #${payment.id}</p>
                <p><strong>ID Booking:</strong> #${payment.bookingId}</p>
                ${booking ? `<p><strong>Tamu:</strong> ${booking.guestName} (${booking.guestId})</p>` : ''}
                <p><strong>Tanggal Pembayaran:</strong> ${this.formatDateTime(payment.paymentDate)}</p>
                <p><strong>Biaya Penginapan:</strong> ${this.formatCurrency(payment.accommodationCost)}</p>
                <p><strong>Biaya Tambahan:</strong> ${this.formatCurrency(payment.additionalCost)}</p>
                <p><strong>Total Pembayaran:</strong> ${this.formatCurrency(payment.totalAmount)}</p>
                <p><strong>Metode Pembayaran:</strong> ${this.getPaymentMethodLabel(payment.paymentMethod)}</p>
                ${additionalOrdersHtml}
                ${payment.notes ? `<p><strong>Catatan:</strong> ${payment.notes}</p>` : ''}
            </div>
        `;
        
        modalConfirm.textContent = 'Tutup';
        modalConfirm.onclick = () => this.closeModal();
        
        this.showModal();
    }
    
    filterPayments() {
        const searchTerm = document.getElementById('payment-search').value.toLowerCase();
        const dateFrom = document.getElementById('payment-date-from').value;
        const dateTo = document.getElementById('payment-date-to').value;
        
        this.filteredPayments = this.currentPayments.filter(payment => {
            const matchesSearch = !searchTerm || 
                payment.id.toString().includes(searchTerm) ||
                payment.bookingId.toString().includes(searchTerm);
            
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const paymentDate = new Date(payment.paymentDate).toISOString().split('T')[0];
                
                if (dateFrom && paymentDate < dateFrom) {
                    matchesDate = false;
                }
                
                if (dateTo && paymentDate > dateTo) {
                    matchesDate = false;
                }
            }
            
            return matchesSearch && matchesDate;
        });
        
        this.displayPayments();
    }
    
    printReceipt(paymentId) {
        // This will be implemented in the print module
        if (window.printManager) {
            window.printManager.printPaymentReceipt(paymentId);
        }
    }
    
    // Helper methods
    showPaymentDetails() {
        const paymentDetails = document.getElementById('payment-details');
        if (paymentDetails) {
            paymentDetails.style.display = 'block';
        }
    }
    
    hidePaymentDetails() {
        const paymentDetails = document.getElementById('payment-details');
        if (paymentDetails) {
            paymentDetails.style.display = 'none';
        }
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
    
    getItemLabel(item) {
        const labels = {
            'makanan': 'Makanan',
            'bbq': 'BBQ',
            'minuman': 'Minuman',
            'laundry': 'Laundry',
            'transport': 'Transport',
            'lainnya': 'Lainnya'
        };
        return labels[item] || item;
    }
    
    getPaymentMethodLabel(method) {
        const labels = {
            'cash': 'Cash',
            'transfer': 'Transfer Bank',
            'card': 'Kartu Kredit/Debit',
            'ewallet': 'E-Wallet',
            'debit': 'Kartu Debit',
            'credit': 'Kartu Kredit',
            'digital': 'Digital Payment'
        };
        return labels[method] || method;
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
        alert('✅ ' + message);
    }
    
    showError(message) {
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
    
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
window.loadBookingForPayment = () => {
    if (window.paymentManager) {
        window.paymentManager.loadBookingForPayment();
    }
};

window.addAdditionalOrder = () => {
    if (window.paymentManager) {
        window.paymentManager.addAdditionalOrder();
    }
};

window.processPayment = () => {
    if (window.paymentManager) {
        window.paymentManager.processPayment();
    }
};

window.clearPaymentForm = () => {
    if (window.paymentManager) {
        window.paymentManager.clearPaymentForm();
    }
};

window.filterPayments = () => {
    if (window.paymentManager) {
        window.paymentManager.filterPayments();
    }
};

// Initialize payment manager
// Initialize PaymentManager after database is ready
(async function initPaymentManager() {
    try {
        await waitForDatabase();
        window.paymentManager = new PaymentManager();
    } catch (error) {
        console.error('Failed to initialize PaymentManager:', error);
    }
})();
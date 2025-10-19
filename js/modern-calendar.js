/**
 * Modern Calendar Component with Booking Sync
 * Google Calendar inspired design
 */

class ModernCalendar {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        this.bookings = [];
        this.monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        this.init();
    }

    async init() {
        await this.loadBookings();
        this.render();
        this.setupEventListeners();
        
        // Auto refresh every 5 minutes
        setInterval(() => {
            this.refresh();
        }, 5 * 60 * 1000);
    }

    setupEventListeners() {
        // Listen for booking changes
        document.addEventListener('bookingUpdated', () => {
            this.refresh();
        });

        document.addEventListener('bookingCreated', () => {
            this.refresh();
        });

        document.addEventListener('bookingDeleted', () => {
            this.refresh();
        });
    }

    async loadBookings() {
        try {
            // Get bookings from database
            if (window.dbManager) {
                this.bookings = await window.dbManager.getAll('bookings') || [];
            } else {
                // Fallback to localStorage
                const storedBookings = localStorage.getItem('sikabu_bookings');
                this.bookings = storedBookings ? JSON.parse(storedBookings) : [];
            }
            
            // Process bookings to create calendar events
            this.processBookings();
        } catch (error) {
            console.error('Error loading bookings for calendar:', error);
            this.bookings = [];
        }
    }

    processBookings() {
        this.events = [];
        
        this.bookings.forEach(booking => {
            if (!booking.checkIn || !booking.checkOut) return;
            
            const checkInDate = new Date(booking.checkIn);
            const checkOutDate = new Date(booking.checkOut);
            const currentDate = new Date();
            
            // Determine booking status
            let status = 'staying';
            if (this.isSameDay(checkInDate, currentDate)) {
                status = 'checkin';
            } else if (this.isSameDay(checkOutDate, currentDate)) {
                status = 'checkout';
            } else if (currentDate < checkInDate) {
                status = 'upcoming';
            } else if (currentDate > checkOutDate) {
                status = 'completed';
            }

            // Add check-in event
            this.events.push({
                date: checkInDate,
                type: 'checkin',
                title: `Check-in: ${booking.guestName}`,
                room: booking.roomNumber,
                booking: booking,
                status: status
            });

            // Add staying events for all days between check-in and check-out
            const stayDate = new Date(checkInDate);
            stayDate.setDate(stayDate.getDate() + 1);
            
            while (stayDate < checkOutDate) {
                this.events.push({
                    date: new Date(stayDate),
                    type: 'staying',
                    title: `${booking.guestName} - Kamar ${booking.roomNumber}`,
                    room: booking.roomNumber,
                    booking: booking,
                    status: status
                });
                stayDate.setDate(stayDate.getDate() + 1);
            }

            // Add check-out event
            this.events.push({
                date: checkOutDate,
                type: 'checkout',
                title: `Check-out: ${booking.guestName}`,
                room: booking.roomNumber,
                booking: booking,
                status: status
            });
        });
    }

    render() {
        this.updateTitle();
        this.renderCalendar();
    }

    updateTitle() {
        const titleElement = document.getElementById('calendar-title');
        if (titleElement) {
            titleElement.textContent = `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }
    }

    renderCalendar() {
        const calendarBody = document.getElementById('calendar-body');
        if (!calendarBody) return;

        calendarBody.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDate = firstDay.getDay(); // 0 = Sunday

        // Add previous month's trailing days
        const prevMonth = new Date(year, month - 1, 0);
        for (let i = startDate - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            const cellDate = new Date(year, month - 1, day);
            calendarBody.appendChild(this.createCalendarCell(cellDate, true));
        }

        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            calendarBody.appendChild(this.createCalendarCell(cellDate, false));
        }

        // Add next month's leading days
        const totalCells = calendarBody.children.length;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            const cellDate = new Date(year, month + 1, day);
            calendarBody.appendChild(this.createCalendarCell(cellDate, true));
        }
    }

    createCalendarCell(date, isOtherMonth) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        if (isOtherMonth) {
            cell.classList.add('other-month');
        }
        
        if (this.isSameDay(date, this.today)) {
            cell.classList.add('today');
        }

        // Create date number
        const dateEl = document.createElement('div');
        dateEl.className = 'calendar-date';
        dateEl.textContent = date.getDate();
        cell.appendChild(dateEl);

        // Create events container
        const eventsEl = document.createElement('div');
        eventsEl.className = 'calendar-events';
        
        // Get events for this date
        const dayEvents = this.getEventsForDate(date);
        const maxVisibleEvents = 3;
        
        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `calendar-event status-${event.status || 'pending'}`;
            eventElement.textContent = event.title;
            eventElement.title = `${event.title}\nWaktu: ${event.checkIn} - ${event.checkOut}\nStatus: ${this.getStatusLabel(event.status)}\nKamar: ${event.roomNumber || '-'}`;
            
            cell.appendChild(eventElement);
        });

        // Show "more" indicator if there are hidden events
        if (dayEvents.length > maxVisibleEvents) {
            const moreEl = document.createElement('div');
            moreEl.className = 'calendar-more-events';
            moreEl.textContent = `+${dayEvents.length - maxVisibleEvents} lainnya`;
            moreEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDayEvents(date, dayEvents);
            });
            eventsEl.appendChild(moreEl);
        }

        cell.appendChild(eventsEl);

        // Add click handler for cell
        cell.addEventListener('click', () => {
            this.onCellClick(date);
        });

        return cell;
    }

    getEventsForDate(date) {
        return this.events.filter(event => 
            this.isSameDay(event.date, date)
        ).sort((a, b) => {
            // Sort by type priority: checkin > checkout > staying
            const priority = { checkin: 1, checkout: 2, staying: 3 };
            return priority[a.type] - priority[b.type];
        });
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    formatDate(date) {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'paid': 'Sudah Bayar'
        };
        return labels[status] || 'Pending';
    }

    showEventDetails(event) {
        const booking = event.booking;
        const details = `
            <div class="event-details">
                <h4>${event.title}</h4>
                <p><strong>Tamu:</strong> ${booking.guestName}</p>
                <p><strong>Kamar:</strong> ${booking.roomNumber}</p>
                <p><strong>Check-in:</strong> ${this.formatDate(new Date(booking.checkIn))}</p>
                <p><strong>Check-out:</strong> ${this.formatDate(new Date(booking.checkOut))}</p>
                <p><strong>Status:</strong> ${this.getStatusText(event.status)}</p>
                ${booking.notes ? `<p><strong>Catatan:</strong> ${booking.notes}</p>` : ''}
            </div>
        `;
        
        window.showModal('Detail Booking', details);
    }

    showDayEvents(date, events) {
        const eventsList = events.map(event => `
            <div class="event-item ${event.type}">
                <div class="event-type">${this.getEventTypeText(event.type)}</div>
                <div class="event-title">${event.title}</div>
                <div class="event-room">Kamar ${event.room}</div>
            </div>
        `).join('');

        const content = `
            <div class="day-events">
                <h4>Events untuk ${this.formatDate(date)}</h4>
                <div class="events-list">
                    ${eventsList}
                </div>
            </div>
        `;
        
        window.showModal('Events Hari Ini', content);
    }

    getEventTypeText(type) {
        const types = {
            checkin: 'Check-in',
            checkout: 'Check-out',
            staying: 'Menginap',
            maintenance: 'Maintenance'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            upcoming: 'Akan Datang',
            checkin: 'Check-in Hari Ini',
            staying: 'Sedang Menginap',
            checkout: 'Check-out Hari Ini',
            completed: 'Selesai'
        };
        return statuses[status] || status;
    }

    onCellClick(date) {
        // Show create booking modal for the selected date
        this.showCreateBookingModal(date);
    }

    showCreateBookingModal(date) {
        const formattedDate = date.toISOString().split('T')[0];
        const tomorrowDate = new Date(date);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowFormatted = tomorrowDate.toISOString().split('T')[0];

        const modalContent = `
            <div class="quick-booking-form">
                <h4>Buat Booking Baru</h4>
                <p class="selected-date">Tanggal: ${this.formatDate(date)}</p>
                
                <form id="quick-booking-form">
                    <div class="form-group">
                        <label for="quick-guest-name">Nama Tamu</label>
                        <input type="text" id="quick-guest-name" name="guestName" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="quick-guest-phone">No. Telepon</label>
                        <input type="tel" id="quick-guest-phone" name="guestPhone" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quick-checkin">Check-in</label>
                            <input type="date" id="quick-checkin" name="checkIn" value="${formattedDate}" required>
                        </div>
                        <div class="form-group">
                            <label for="quick-checkout">Check-out</label>
                            <input type="date" id="quick-checkout" name="checkOut" value="${tomorrowFormatted}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quick-room-type">Jenis Akomodasi</label>
                            <select id="quick-room-type" name="bookingType" required>
                                <option value="">Pilih Jenis</option>
                                <option value="kamar">Kamar</option>
                                <option value="villa">Villa</option>
                                <option value="camping">Camping Ground</option>
                                <option value="tent">Tenda</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quick-room-number">Nomor Kamar/Unit</label>
                            <input type="text" id="quick-room-number" name="roomNumber" placeholder="Contoh: A101">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quick-status">Status</label>
                            <select id="quick-status" name="status" required>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="paid">Sudah Bayar</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quick-price">Harga (Rp)</label>
                            <input type="number" id="quick-price" name="price" min="0" step="5000" value="100000">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Simpan Booking
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        `;

        window.showModal('Booking Baru', modalContent);

        // Setup form handler
        const form = document.getElementById('quick-booking-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleQuickBooking(e));
        }
    }

    async handleQuickBooking(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const bookingData = {
                guestId: 'G' + Date.now(), // Auto generate ID
                guestName: formData.get('guestName'),
                guestPhone: formData.get('guestPhone'),
                bookingDate: new Date().toISOString().split('T')[0],
                checkIn: formData.get('checkIn'),
                checkOut: formData.get('checkOut'),
                bookingType: formData.get('bookingType'),
                roomNumber: formData.get('roomNumber') || '',
                quantity: 1,
                price: parseFloat(formData.get('price')) || 0,
                status: formData.get('status') || 'pending',
                notes: 'Dibuat dari calendar',
                createdAt: new Date().toISOString(),
                totalPrice: parseFloat(formData.get('price')) || 0
            };

            // Validate dates
            if (new Date(bookingData.checkIn) >= new Date(bookingData.checkOut)) {
                throw new Error('Tanggal check-out harus setelah tanggal check-in');
            }

            // Save to database
            if (window.dbManager) {
                const bookingId = await window.dbManager.insert('bookings', bookingData);
                
                if (bookingId) {
                    window.closeModal();
                    
                    // Show success notification
                    if (window.showNotification) {
                        window.showNotification('Booking berhasil ditambahkan', 'success');
                    }
                    
                    // Refresh calendar
                    await this.refresh();
                    
                    // Dispatch event for other modules
                    document.dispatchEvent(new CustomEvent('bookingCreated', {
                        detail: { bookingId, bookingData }
                    }));
                } else {
                    throw new Error('Gagal menyimpan booking');
                }
            } else {
                throw new Error('Database tidak tersedia');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            if (window.showNotification) {
                window.showNotification('Error: ' + error.message, 'error');
            }
        }
    }

    // Navigation methods
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    async refresh() {
        await this.loadBookings();
        this.render();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Kalender telah diperbarui', 'success');
        }
    }
}

// Initialize calendar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the calendar tab
    if (document.getElementById('calendar')) {
        window.calendar = new ModernCalendar();
    }
});

// Export for global access
window.ModernCalendar = ModernCalendar;
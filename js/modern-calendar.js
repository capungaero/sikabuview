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

    init() {
        this.loadBookings();
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

    loadBookings() {
        // Get bookings from localStorage or database
        const storedBookings = localStorage.getItem('sikabu_bookings');
        this.bookings = storedBookings ? JSON.parse(storedBookings) : [];
        
        // Process bookings to create calendar events
        this.processBookings();
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
        
        dayEvents.slice(0, maxVisibleEvents).forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `calendar-event ${event.type}`;
            eventEl.textContent = event.title;
            eventEl.title = `${event.title}\nKamar: ${event.room}\nTanggal: ${this.formatDate(event.date)}`;
            
            // Add click handler
            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetails(event);
            });
            
            eventsEl.appendChild(eventEl);
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
        // Could be used to create new booking or show day details
        console.log('Clicked date:', this.formatDate(date));
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

    refresh() {
        this.loadBookings();
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
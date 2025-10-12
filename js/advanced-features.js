// Rooms Management Module
class RoomsManager {
    constructor() {
        this.rooms = [];
        this.init();
    }

    init() {
        this.loadRooms();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addRoomForm = document.getElementById('add-room-form');
        if (addRoomForm) {
            addRoomForm.addEventListener('submit', (e) => this.handleAddRoom(e));
        }
    }

    async loadRooms() {
        try {
            await waitForDatabase();
            
            try {
                this.rooms = await window.dbManager.select('rooms') || [];
            } catch (error) {
                console.warn('Rooms table not found, using empty array');
                this.rooms = [];
            }
            this.renderRoomsList();
            this.updateRoomOptions();
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.rooms = [];
        }
    }

    async handleAddRoom(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const roomData = {
            id: this.generateRoomId(),
            type: formData.get('room-type') || document.getElementById('room-type').value,
            number: formData.get('room-number') || document.getElementById('room-number').value,
            capacity: parseInt(formData.get('room-capacity') || document.getElementById('room-capacity').value),
            price: parseInt(formData.get('room-price') || document.getElementById('room-price').value),
            facilities: formData.get('room-facilities') || document.getElementById('room-facilities').value,
            description: formData.get('room-description') || document.getElementById('room-description').value,
            status: formData.get('room-status') || document.getElementById('room-status').value,
            createdAt: new Date().toISOString()
        };

        try {
            await window.dbManager.insert('rooms', roomData);
            this.rooms.push(roomData);
            this.renderRoomsList();
            this.updateRoomOptions();
            this.hideRoomForm();
            e.target.reset();
            showNotification('Kamar berhasil ditambahkan!', 'success');
        } catch (error) {
            console.error('Error adding room:', error);
            showNotification('Error menambahkan kamar!', 'error');
        }
    }

    generateRoomId() {
        return 'RM' + Date.now().toString().slice(-6);
    }

    renderRoomsList() {
        const container = document.getElementById('rooms-container');
        if (!container) return;

        container.innerHTML = this.rooms.map(room => `
            <div class="room-card ${room.status}" data-room-id="${room.id}">
                <div class="room-header">
                    <h4>${room.number}</h4>
                    <span class="room-type">${this.getRoomTypeLabel(room.type)}</span>
                </div>
                <div class="room-details">
                    <p><strong>Kapasitas:</strong> ${room.capacity} orang</p>
                    <p><strong>Harga:</strong> ${formatCurrency(room.price)}/malam</p>
                    <p><strong>Status:</strong> <span class="status-badge ${room.status}">${this.getStatusLabel(room.status)}</span></p>
                    <p><strong>Fasilitas:</strong> ${room.facilities || '-'}</p>
                </div>
                <div class="room-actions">
                    <button class="btn btn-small btn-primary" onclick="roomsManager.editRoom('${room.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="roomsManager.deleteRoom('${room.id}')">Hapus</button>
                    <button class="btn btn-small btn-secondary" onclick="roomsManager.changeRoomStatus('${room.id}')">Ubah Status</button>
                </div>
            </div>
        `).join('');
    }

    getRoomTypeLabel(type) {
        const labels = {
            'kamar': 'Kamar',
            'villa': 'Villa',
            'camping': 'Area Camping',
            'tent': 'Tenda'
        };
        return labels[type] || type;
    }

    getStatusLabel(status) {
        const labels = {
            'available': 'Tersedia',
            'occupied': 'Terisi',
            'maintenance': 'Maintenance',
            'cleaning': 'Cleaning',
            'out-of-order': 'Out of Order'
        };
        return labels[status] || status;
    }

    updateRoomOptions() {
        const selects = document.querySelectorAll('select[id$="-room"], select[id="checkout-room"], select[id="task-room"]');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Pilih Kamar</option>' + 
                this.rooms.map(room => 
                    `<option value="${room.id}">${room.number} - ${this.getRoomTypeLabel(room.type)}</option>`
                ).join('');
            if (currentValue) select.value = currentValue;
        });
    }

    async editRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        // Populate form with room data
        document.getElementById('room-type').value = room.type;
        document.getElementById('room-number').value = room.number;
        document.getElementById('room-capacity').value = room.capacity;
        document.getElementById('room-price').value = room.price;
        document.getElementById('room-facilities').value = room.facilities || '';
        document.getElementById('room-description').value = room.description || '';
        document.getElementById('room-status').value = room.status;

        this.showRoomForm();
        this.editingRoomId = roomId;
    }

    async deleteRoom(roomId) {
        if (!confirm('Yakin ingin menghapus kamar ini?')) return;

        try {
            await window.dbManager.delete('rooms', roomId);
            this.rooms = this.rooms.filter(r => r.id !== roomId);
            this.renderRoomsList();
            this.updateRoomOptions();
            showNotification('Kamar berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting room:', error);
            showNotification('Error menghapus kamar!', 'error');
        }
    }

    showRoomForm() {
        document.getElementById('room-form').style.display = 'block';
        document.getElementById('room-number').focus();
    }

    hideRoomForm() {
        document.getElementById('room-form').style.display = 'none';
        document.getElementById('add-room-form').reset();
        this.editingRoomId = null;
    }

    filterRooms() {
        const typeFilter = document.getElementById('room-type-filter').value;
        const statusFilter = document.getElementById('room-status-filter').value;
        
        const filteredRooms = this.rooms.filter(room => {
            const typeMatch = !typeFilter || room.type === typeFilter;
            const statusMatch = !statusFilter || room.status === statusFilter;
            return typeMatch && statusMatch;
        });

        this.renderFilteredRooms(filteredRooms);
    }

    renderFilteredRooms(rooms) {
        const container = document.getElementById('rooms-container');
        if (!container) return;

        container.innerHTML = rooms.map(room => `
            <div class="room-card ${room.status}" data-room-id="${room.id}">
                <div class="room-header">
                    <h4>${room.number}</h4>
                    <span class="room-type">${this.getRoomTypeLabel(room.type)}</span>
                </div>
                <div class="room-details">
                    <p><strong>Kapasitas:</strong> ${room.capacity} orang</p>
                    <p><strong>Harga:</strong> ${formatCurrency(room.price)}/malam</p>
                    <p><strong>Status:</strong> <span class="status-badge ${room.status}">${this.getStatusLabel(room.status)}</span></p>
                    <p><strong>Fasilitas:</strong> ${room.facilities || '-'}</p>
                </div>
                <div class="room-actions">
                    <button class="btn btn-small btn-primary" onclick="roomsManager.editRoom('${room.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="roomsManager.deleteRoom('${room.id}')">Hapus</button>
                </div>
            </div>
        `).join('');
    }
}

// Guests Management Module
class GuestsManager {
    constructor() {
        this.guests = [];
        this.init();
    }

    init() {
        this.loadGuests();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addGuestForm = document.getElementById('add-guest-form');
        if (addGuestForm) {
            addGuestForm.addEventListener('submit', (e) => this.handleAddGuest(e));
        }
    }

    async loadGuests() {
        try {
            await waitForDatabase();
            
            try {
                this.guests = await window.dbManager.select('guests') || [];
            } catch (error) {
                console.warn('Guests table not found, using empty array');
                this.guests = [];
            }
            this.renderGuestsList();
        } catch (error) {
            console.error('Error loading guests:', error);
            this.guests = [];
        }
    }

    async handleAddGuest(e) {
        e.preventDefault();
        const guestData = {
            id: this.generateGuestId(),
            name: document.getElementById('guest-name').value,
            idCard: document.getElementById('guest-id-card').value,
            phone: document.getElementById('guest-phone').value,
            email: document.getElementById('guest-email').value,
            address: document.getElementById('guest-address').value,
            company: document.getElementById('guest-company').value,
            purpose: document.getElementById('guest-purpose').value,
            notes: document.getElementById('guest-notes').value,
            createdAt: new Date().toISOString(),
            visits: 1,
            totalSpent: 0,
            status: 'regular'
        };

        try {
            await window.dbManager.insert('guests', guestData);
            this.guests.push(guestData);
            this.renderGuestsList();
            this.hideGuestForm();
            e.target.reset();
            showNotification('Tamu berhasil didaftarkan!', 'success');
        } catch (error) {
            console.error('Error adding guest:', error);
            showNotification('Error mendaftarkan tamu!', 'error');
        }
    }

    generateGuestId() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sequence = (this.guests.length + 1).toString().padStart(3, '0');
        return `G${year}${month}${sequence}`;
    }

    renderGuestsList() {
        const container = document.getElementById('guests-container');
        if (!container) return;

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID Tamu</th>
                        <th>Nama</th>
                        <th>No. Telepon</th>
                        <th>Email</th>
                        <th>Total Kunjungan</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.guests.map(guest => `
                        <tr>
                            <td>${guest.id}</td>
                            <td>${guest.name}</td>
                            <td>${guest.phone}</td>
                            <td>${guest.email || '-'}</td>
                            <td>${guest.visits}</td>
                            <td><span class="status-badge ${guest.status}">${guest.status}</span></td>
                            <td>
                                <button class="btn btn-small btn-primary" onclick="guestsManager.viewGuestDetails('${guest.id}')">Detail</button>
                                <button class="btn btn-small btn-secondary" onclick="guestsManager.editGuest('${guest.id}')">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showGuestForm() {
        document.getElementById('guest-form').style.display = 'block';
        document.getElementById('guest-id').value = this.generateGuestId();
        document.getElementById('guest-name').focus();
    }

    hideGuestForm() {
        document.getElementById('guest-form').style.display = 'none';
        document.getElementById('add-guest-form').reset();
    }

    searchGuests() {
        const searchTerm = document.getElementById('guest-search').value.toLowerCase();
        const filteredGuests = this.guests.filter(guest => 
            guest.name.toLowerCase().includes(searchTerm) ||
            guest.phone.includes(searchTerm) ||
            guest.id.toLowerCase().includes(searchTerm)
        );
        this.renderFilteredGuests(filteredGuests);
    }

    renderFilteredGuests(guests) {
        const container = document.getElementById('guests-container');
        if (!container) return;

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID Tamu</th>
                        <th>Nama</th>
                        <th>No. Telepon</th>
                        <th>Email</th>
                        <th>Total Kunjungan</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${guests.map(guest => `
                        <tr>
                            <td>${guest.id}</td>
                            <td>${guest.name}</td>
                            <td>${guest.phone}</td>
                            <td>${guest.email || '-'}</td>
                            <td>${guest.visits}</td>
                            <td><span class="status-badge ${guest.status}">${guest.status}</span></td>
                            <td>
                                <button class="btn btn-small btn-primary" onclick="guestsManager.viewGuestDetails('${guest.id}')">Detail</button>
                                <button class="btn btn-small btn-secondary" onclick="guestsManager.editGuest('${guest.id}')">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Calendar Management Module
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.bookings = [];
        this.rooms = [];
        this.init();
    }

    init() {
        this.loadData();
        this.renderCalendar();
    }

    async loadData() {
        try {
            await waitForDatabase();
            
            try {
                this.bookings = await window.dbManager.select('bookings') || [];
            } catch (error) {
                console.warn('Bookings table not found, using empty array');
                this.bookings = [];
            }
            try {
                this.rooms = await window.dbManager.select('rooms') || [];
            } catch (error) {
                console.warn('Rooms table not found, using empty array');
                this.rooms = [];
            }
        } catch (error) {
            console.error('Error loading calendar data:', error);
            this.bookings = [];
            this.rooms = [];
        }
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const calendarTitle = document.getElementById('calendar-title');
        
        if (!calendarGrid || !calendarTitle) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        calendarTitle.textContent = new Intl.DateTimeFormat('id-ID', { 
            month: 'long', 
            year: 'numeric' 
        }).format(this.currentDate);

        // Generate calendar days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let calendarHTML = '<div class="calendar-header-row">';
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        dayNames.forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });
        calendarHTML += '</div>';

        for (let week = 0; week < 6; week++) {
            calendarHTML += '<div class="calendar-week">';
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                
                const occupancyData = this.getOccupancyForDate(currentDate);
                
                calendarHTML += `
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" 
                         data-date="${currentDate.toISOString().split('T')[0]}"
                         onclick="calendarManager.showDayDetails('${currentDate.toISOString().split('T')[0]}')">
                        <div class="day-number">${currentDate.getDate()}</div>
                        <div class="day-occupancy">
                            <div class="occupancy-bar">
                                <div class="occupancy-fill" style="width: ${occupancyData.percentage}%"></div>
                            </div>
                            <div class="occupancy-text">${occupancyData.occupied}/${occupancyData.total}</div>
                        </div>
                    </div>
                `;
            }
            calendarHTML += '</div>';
        }

        calendarGrid.innerHTML = calendarHTML;
        this.renderTodayAvailability();
    }

    getOccupancyForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        const totalRooms = this.rooms.length;
        let occupiedRooms = 0;

        this.bookings.forEach(booking => {
            if (booking.status === 'confirmed' || booking.status === 'checked-in') {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                if (date >= checkIn && date < checkOut) {
                    occupiedRooms++;
                }
            }
        });

        return {
            total: totalRooms,
            occupied: occupiedRooms,
            percentage: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
        };
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    navigateCalendar(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    renderTodayAvailability() {
        const container = document.getElementById('today-availability');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        
        container.innerHTML = this.rooms.map(room => {
            const isOccupied = this.isRoomOccupiedOnDate(room.id, today);
            return `
                <div class="availability-item ${isOccupied ? 'occupied' : 'available'}">
                    <div class="room-info">
                        <h4>${room.number}</h4>
                        <p>${roomsManager.getRoomTypeLabel(room.type)}</p>
                    </div>
                    <div class="availability-status">
                        <span class="status-badge ${isOccupied ? 'occupied' : 'available'}">
                            ${isOccupied ? 'Terisi' : 'Tersedia'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    isRoomOccupiedOnDate(roomId, dateStr) {
        const date = new Date(dateStr);
        return this.bookings.some(booking => {
            if (booking.roomId === roomId && (booking.status === 'confirmed' || booking.status === 'checked-in')) {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                return date >= checkIn && date < checkOut;
            }
            return false;
        });
    }
}

// Check-in/Check-out Module
class CheckInOutManager {
    constructor() {
        this.bookings = [];
        this.rooms = [];
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const checkinForm = document.getElementById('checkin-form');
        const checkoutForm = document.getElementById('checkout-form');
        
        if (checkinForm) {
            checkinForm.addEventListener('submit', (e) => this.handleCheckIn(e));
        }
        
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckOut(e));
        }
    }

    async loadData() {
        try {
            await waitForDatabase();
            
            try {
                this.bookings = await window.dbManager.select('bookings') || [];
            } catch (error) {
                console.warn('Bookings table not found, using empty array');
                this.bookings = [];
            }
            try {
                this.rooms = await window.dbManager.select('rooms') || [];
            } catch (error) {
                console.warn('Rooms table not found, using empty array');
                this.rooms = [];
            }
            this.renderTodayActivities();
        } catch (error) {
            console.error('Error loading check-in/out data:', error);
            this.bookings = [];
            this.rooms = [];
        }
    }

    showQuickCheckin() {
        document.getElementById('quick-checkin-form').style.display = 'block';
        document.getElementById('checkin-time').value = new Date().toISOString().slice(0, 16);
        document.getElementById('checkin-booking').focus();
    }

    showQuickCheckout() {
        document.getElementById('quick-checkout-form').style.display = 'block';
        document.getElementById('checkout-time').value = new Date().toISOString().slice(0, 16);
        this.populateOccupiedRooms();
    }

    populateOccupiedRooms() {
        const select = document.getElementById('checkout-room');
        if (!select) return;

        const occupiedBookings = this.bookings.filter(booking => 
            booking.status === 'checked-in'
        );

        select.innerHTML = '<option value="">Pilih Kamar yang Check-out</option>' + 
            occupiedBookings.map(booking => {
                const room = this.rooms.find(r => r.id === booking.roomId);
                return `<option value="${booking.id}">${room ? room.number : 'Unknown'} - ${booking.guestName}</option>`;
            }).join('');
    }

    async handleCheckIn(e) {
        e.preventDefault();
        const bookingId = document.getElementById('checkin-booking').value;
        const checkinTime = document.getElementById('checkin-time').value;
        const notes = document.getElementById('checkin-notes').value;

        try {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (!booking) {
                showNotification('Booking tidak ditemukan!', 'error');
                return;
            }

            booking.status = 'checked-in';
            booking.actualCheckInTime = checkinTime;
            booking.checkinNotes = notes;

            await window.dbManager.update('bookings', booking);
            
            // Update room status
            const room = this.rooms.find(r => r.id === booking.roomId);
            if (room) {
                room.status = 'occupied';
                await window.dbManager.update('rooms', room);
            }

            this.hideCheckinForm();
            this.loadData();
            showNotification('Check-in berhasil!', 'success');
        } catch (error) {
            console.error('Error processing check-in:', error);
            showNotification('Error saat check-in!', 'error');
        }
    }

    async handleCheckOut(e) {
        e.preventDefault();
        const bookingId = document.getElementById('checkout-room').value;
        const checkoutTime = document.getElementById('checkout-time').value;
        const condition = document.getElementById('checkout-condition').value;
        const notes = document.getElementById('checkout-notes').value;

        try {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (!booking) {
                showNotification('Booking tidak ditemukan!', 'error');
                return;
            }

            booking.status = 'checked-out';
            booking.actualCheckOutTime = checkoutTime;
            booking.checkoutNotes = notes;
            booking.roomCondition = condition;

            await window.dbManager.update('bookings', booking);
            
            // Update room status based on condition
            const room = this.rooms.find(r => r.id === booking.roomId);
            if (room) {
                room.status = condition === 'good' ? 'available' : 
                             condition === 'need-cleaning' ? 'cleaning' : 'maintenance';
                await window.dbManager.update('rooms', room);
            }

            this.hideCheckoutForm();
            this.loadData();
            showNotification('Check-out berhasil!', 'success');
        } catch (error) {
            console.error('Error processing check-out:', error);
            showNotification('Error saat check-out!', 'error');
        }
    }

    renderTodayActivities() {
        this.renderTodayCheckins();
        this.renderTodayCheckouts();
        this.renderActiveGuests();
    }

    renderTodayCheckins() {
        const container = document.getElementById('today-checkins');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const todayCheckins = this.bookings.filter(booking => 
            booking.checkInDate.startsWith(today) && booking.status === 'confirmed'
        );

        container.innerHTML = todayCheckins.map(booking => {
            const room = this.rooms.find(r => r.id === booking.roomId);
            return `
                <div class="checkin-item">
                    <div class="booking-info">
                        <h4>${booking.guestName}</h4>
                        <p>Kamar: ${room ? room.number : 'Unknown'}</p>
                        <p>Waktu: ${new Date(booking.checkInDate).toLocaleTimeString('id-ID')}</p>
                    </div>
                    <div class="checkin-actions">
                        <button class="btn btn-primary" onclick="checkInOutManager.processCheckin('${booking.id}')">
                            Check-in
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p>Tidak ada check-in hari ini</p>';
    }

    renderTodayCheckouts() {
        const container = document.getElementById('today-checkouts');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const todayCheckouts = this.bookings.filter(booking => 
            booking.checkOutDate.startsWith(today) && booking.status === 'checked-in'
        );

        container.innerHTML = todayCheckouts.map(booking => {
            const room = this.rooms.find(r => r.id === booking.roomId);
            return `
                <div class="checkout-item">
                    <div class="booking-info">
                        <h4>${booking.guestName}</h4>
                        <p>Kamar: ${room ? room.number : 'Unknown'}</p>
                        <p>Waktu: ${new Date(booking.checkOutDate).toLocaleTimeString('id-ID')}</p>
                    </div>
                    <div class="checkout-actions">
                        <button class="btn btn-warning" onclick="checkInOutManager.processCheckout('${booking.id}')">
                            Check-out
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p>Tidak ada check-out hari ini</p>';
    }

    renderActiveGuests() {
        const container = document.getElementById('active-guests');
        if (!container) return;

        const activeGuests = this.bookings.filter(booking => booking.status === 'checked-in');

        container.innerHTML = activeGuests.map(booking => {
            const room = this.rooms.find(r => r.id === booking.roomId);
            const checkinDate = new Date(booking.actualCheckInTime || booking.checkInDate);
            const nights = Math.ceil((new Date() - checkinDate) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="active-guest-item">
                    <div class="guest-info">
                        <h4>${booking.guestName}</h4>
                        <p>Kamar: ${room ? room.number : 'Unknown'}</p>
                        <p>Check-in: ${checkinDate.toLocaleDateString('id-ID')}</p>
                        <p>Lama menginap: ${nights} malam</p>
                    </div>
                    <div class="guest-actions">
                        <button class="btn btn-secondary" onclick="checkInOutManager.viewGuestDetails('${booking.id}')">
                            Detail
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p>Tidak ada tamu yang sedang menginap</p>';
    }

    hideCheckinForm() {
        document.getElementById('quick-checkin-form').style.display = 'none';
        document.getElementById('checkin-form').reset();
    }

    hideCheckoutForm() {
        document.getElementById('quick-checkout-form').style.display = 'none';
        document.getElementById('checkout-form').reset();
    }
}

// Global functions
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(notification);
    }

    // Set message and style based on type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.style.display = 'block';

    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Utility function to wait for database to be ready
async function waitForDatabase() {
    let attempts = 0;
    while ((!window.dbManager || !window.dbManager.isReady) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.dbManager || !window.dbManager.isReady) {
        throw new Error('Database not ready after waiting');
    }
    
    return window.dbManager;
}

function showAddRoomForm() {
    if (window.roomsManager) {
        window.roomsManager.showRoomForm();
    }
}

function hideRoomForm() {
    if (window.roomsManager) {
        window.roomsManager.hideRoomForm();
    }
}

function filterRooms() {
    if (window.roomsManager) {
        window.roomsManager.filterRooms();
    }
}

function showAddGuestForm() {
    if (window.guestsManager) {
        window.guestsManager.showGuestForm();
    }
}

function hideGuestForm() {
    if (window.guestsManager) {
        window.guestsManager.hideGuestForm();
    }
}

function searchGuests() {
    if (window.guestsManager) {
        window.guestsManager.searchGuests();
    }
}

function showQuickCheckin() {
    if (window.checkInOutManager) {
        window.checkInOutManager.showQuickCheckin();
    }
}

function showQuickCheckout() {
    if (window.checkInOutManager) {
        window.checkInOutManager.showQuickCheckout();
    }
}

function navigateCalendar(direction) {
    if (window.calendarManager) {
        window.calendarManager.navigateCalendar(direction);
    }
}

// Initialize managers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.roomsManager = new RoomsManager();
    window.guestsManager = new GuestsManager();
    window.calendarManager = new CalendarManager();
    window.checkInOutManager = new CheckInOutManager();
});
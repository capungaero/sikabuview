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
            number: formData.get('roomNumber') || document.getElementById('room-number')?.value,
            type: formData.get('roomType') || document.getElementById('room-type')?.value,
            name: formData.get('roomName') || document.getElementById('room-name')?.value,
            capacity: parseInt(formData.get('capacity') || document.getElementById('room-capacity')?.value || 2),
            priceWeekday: parseInt(formData.get('priceWeekday') || document.getElementById('room-price-weekday')?.value || 0),
            priceWeekend: parseInt(formData.get('priceWeekend') || document.getElementById('room-price-weekend')?.value || 0),
            facilities: formData.get('facilities') || document.getElementById('room-facilities')?.value,
            floor: formData.get('floor') || document.getElementById('room-floor')?.value,
            notes: formData.get('notes') || document.getElementById('room-notes')?.value,
            status: formData.get('status') || document.getElementById('room-status')?.value || 'tersedia',
            createdAt: new Date().toISOString()
        };

        try {
            await window.dbManager.insert('rooms', roomData);
            this.rooms.push(roomData);
            this.renderRoomsList();
            this.updateRoomOptions();
            hideRoomForm();
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
        // Render for rooms-container (card view)
        const container = document.getElementById('rooms-container');
        if (container) {
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
                        <button class="btn btn-small btn-primary" onclick="window.roomsManager.editRoom('${room.id}')">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="window.roomsManager.deleteRoom('${room.id}')">Hapus</button>
                        <button class="btn btn-small btn-secondary" onclick="window.roomsManager.changeRoomStatus('${room.id}')">Ubah Status</button>
                    </div>
                </div>
            `).join('');
        }

        // Render for rooms-list (table view)
        const tbody = document.getElementById('rooms-list');
        if (tbody) {
            if (this.rooms.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data kamar/villa</td></tr>';
                return;
            }

            tbody.innerHTML = this.rooms.map(room => {
                let statusBadge = '';
                switch(room.status) {
                    case 'tersedia':
                    case 'available':
                        statusBadge = '<span class="badge badge-success">Tersedia</span>';
                        break;
                    case 'terisi':
                    case 'occupied':
                        statusBadge = '<span class="badge badge-danger">Terisi</span>';
                        break;
                    case 'maintenance':
                        statusBadge = '<span class="badge badge-warning">Maintenance</span>';
                        break;
                    case 'tidak-aktif':
                        statusBadge = '<span class="badge badge-secondary">Tidak Aktif</span>';
                        break;
                    default:
                        statusBadge = `<span class="badge">${room.status}</span>`;
                }

                return `
                    <tr>
                        <td>${room.number || room.roomNumber}</td>
                        <td>${this.getRoomTypeLabel(room.type || room.roomType)}</td>
                        <td>${room.name || room.roomName || '-'}</td>
                        <td>${room.capacity} orang</td>
                        <td>${formatCurrency(room.priceWeekday || room.price || 0)}</td>
                        <td>${formatCurrency(room.priceWeekend || room.price || 0)}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="window.roomsManager.editRoom('${room.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.roomsManager.deleteRoom('${room.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
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
            idNumber: document.getElementById('guest-id-number')?.value,
            fullName: document.getElementById('guest-full-name')?.value,
            email: document.getElementById('guest-email')?.value,
            phoneNumber: document.getElementById('guest-phone-number')?.value,
            birthDate: document.getElementById('guest-birth-date')?.value,
            gender: document.getElementById('guest-gender')?.value,
            address: document.getElementById('guest-address')?.value,
            city: document.getElementById('guest-city')?.value,
            country: document.getElementById('guest-country')?.value,
            nationality: document.getElementById('guest-nationality')?.value,
            occupation: document.getElementById('guest-occupation')?.value,
            notes: document.getElementById('guest-notes')?.value,
            createdAt: new Date().toISOString(),
            visits: 0,
            totalSpent: 0,
            status: 'active'
        };

        try {
            await window.dbManager.insert('guests', guestData);
            this.guests.push(guestData);
            this.renderGuestsList();
            hideGuestForm();
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
        // Render for guests-container (card/table view)
        const container = document.getElementById('guests-container');
        if (container) {
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
                                <td>${guest.fullName || guest.name}</td>
                                <td>${guest.phoneNumber || guest.phone}</td>
                                <td>${guest.email || '-'}</td>
                                <td>${guest.visits || 0}</td>
                                <td><span class="status-badge ${guest.status}">${guest.status}</span></td>
                                <td>
                                    <button class="btn btn-small btn-primary" onclick="window.guestsManager.viewGuestDetails('${guest.id}')">Detail</button>
                                    <button class="btn btn-small btn-secondary" onclick="window.guestsManager.editGuest('${guest.id}')">Edit</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // Render for guests-list (tbody)
        const tbody = document.getElementById('guests-list');
        if (tbody) {
            if (this.guests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data tamu</td></tr>';
                return;
            }

            tbody.innerHTML = this.guests.map(guest => `
                <tr>
                    <td>${guest.idNumber || guest.idCard || '-'}</td>
                    <td>${guest.fullName || guest.name}</td>
                    <td>${guest.email || '-'}</td>
                    <td>${guest.phoneNumber || guest.phone}</td>
                    <td>${guest.city || '-'}</td>
                    <td>${guest.visits || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.guestsManager.viewGuestDetails('${guest.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.guestsManager.editGuest('${guest.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.guestsManager.deleteGuest('${guest.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
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
        // Update month-year display
        const monthYearDisplay = document.getElementById('calendar-month-year');
        if (monthYearDisplay) {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            monthYearDisplay.textContent = new Intl.DateTimeFormat('id-ID', { 
                month: 'long', 
                year: 'numeric' 
            }).format(this.currentDate);
        }

        // Render calendar grid
        const calendarDays = document.getElementById('calendar-days');
        if (!calendarDays) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Generate calendar days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let calendarHTML = '';

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                
                const occupancyData = this.getOccupancyForDate(currentDate);
                
                let statusClass = '';
                let statusColor = '#4CAF50'; // Available
                
                if (occupancyData.percentage >= 100) {
                    statusClass = 'full';
                    statusColor = '#F44336'; // Full
                } else if (occupancyData.percentage >= 75) {
                    statusClass = 'high';
                    statusColor = '#FF9800'; // High occupancy
                } else if (occupancyData.percentage >= 50) {
                    statusClass = 'medium';
                    statusColor = '#2196F3'; // Medium
                }
                
                calendarHTML += `
                    <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${statusClass}" 
                         data-date="${currentDate.toISOString().split('T')[0]}"
                         onclick="window.calendarManager?.showDayDetails('${currentDate.toISOString().split('T')[0]}')"
                         style="background: ${isCurrentMonth ? 'white' : '#f5f5f5'}; border-left: 3px solid ${statusColor};">
                        <div class="calendar-day-number">${currentDate.getDate()}</div>
                        <div class="calendar-bookings">
                            <small style="color: ${statusColor}; font-weight: 600;">
                                ${occupancyData.occupied}/${occupancyData.total} kamar
                            </small>
                        </div>
                    </div>
                `;
            }
        }

        calendarDays.innerHTML = calendarHTML;
    }

    getOccupancyForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        const totalRooms = this.rooms.length;
        let occupiedRooms = 0;

        this.bookings.forEach(booking => {
            if (booking.status === 'confirmed' || booking.status === 'checked-in' || booking.status === 'checkedin') {
                // Support both naming conventions: checkinDate/checkoutDate and checkInDate/checkOutDate
                const checkInField = booking.checkinDate || booking.checkInDate;
                const checkOutField = booking.checkoutDate || booking.checkOutDate;
                
                if (checkInField && checkOutField) {
                    const checkIn = new Date(checkInField);
                    const checkOut = new Date(checkOutField);
                    const checkDate = new Date(dateStr);
                    
                    // Check if date falls within booking period (inclusive check-in, exclusive check-out)
                    if (checkDate >= checkIn && checkDate < checkOut) {
                        occupiedRooms++;
                    }
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
            if (booking.roomId === roomId && (booking.status === 'confirmed' || booking.status === 'checked-in' || booking.status === 'checkedin')) {
                // Support both naming conventions
                const checkInField = booking.checkinDate || booking.checkInDate;
                const checkOutField = booking.checkoutDate || booking.checkOutDate;
                
                if (checkInField && checkOutField) {
                    const checkIn = new Date(checkInField);
                    const checkOut = new Date(checkOutField);
                    return date >= checkIn && date < checkOut;
                }
            }
            return false;
        });
    }

    showDayDetails(dateStr) {
        const date = new Date(dateStr);
        const occupancyData = this.getOccupancyForDate(date);
        
        // Get bookings for this date
        const dayBookings = this.bookings.filter(booking => {
            // Support both naming conventions
            const checkInField = booking.checkinDate || booking.checkInDate;
            const checkOutField = booking.checkoutDate || booking.checkOutDate;
            
            if (checkInField && checkOutField) {
                const checkIn = new Date(checkInField);
                const checkOut = new Date(checkOutField);
                return date >= checkIn && date < checkOut && 
                       (booking.status === 'confirmed' || booking.status === 'checked-in' || booking.status === 'checkedin');
            }
            return false;
        });

        let detailsHTML = `
            <div class="modal-overlay" onclick="this.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <h3>${date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <p><strong>Okupansi:</strong> ${occupancyData.occupied}/${occupancyData.total} kamar (${occupancyData.percentage.toFixed(0)}%)</p>
                    <hr>
                    <h4>Booking untuk tanggal ini:</h4>
        `;

        if (dayBookings.length === 0) {
            detailsHTML += '<p>Tidak ada booking</p>';
        } else {
            detailsHTML += '<ul style="list-style: none; padding: 0;">';
            dayBookings.forEach(booking => {
                const statusBadge = booking.status === 'checked-in' ? 
                    '<span class="badge badge-success">Checked-in</span>' : 
                    '<span class="badge badge-info">Confirmed</span>';
                detailsHTML += `
                    <li style="padding: 10px; border-bottom: 1px solid #eee;">
                        <strong>${booking.guestName}</strong> - Kamar ${booking.roomNumber || 'N/A'} ${statusBadge}<br>
                        <small>Check-in: ${new Date(booking.checkInDate).toLocaleDateString('id-ID')} | 
                        Check-out: ${new Date(booking.checkOutDate).toLocaleDateString('id-ID')}</small>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        detailsHTML += `
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()" style="margin-top: 15px;">Tutup</button>
                </div>
            </div>
        `;

        // Add modal to page
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = detailsHTML;
        document.body.appendChild(modalDiv.firstElementChild);
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
        const checkinForm = document.getElementById('add-checkin-form');
        const checkoutForm = document.getElementById('add-checkout-form');
        
        if (checkinForm) {
            checkinForm.addEventListener('submit', (e) => this.handleCheckIn(e));
        }
        
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckOut(e));
        }

        // Auto-load booking data when booking ID is entered
        const checkinBookingId = document.getElementById('checkin-booking-id');
        if (checkinBookingId) {
            checkinBookingId.addEventListener('blur', (e) => this.loadBookingForCheckin(e.target.value));
        }

        const checkoutBookingId = document.getElementById('checkout-booking-id');
        if (checkoutBookingId) {
            checkoutBookingId.addEventListener('blur', (e) => this.loadBookingForCheckout(e.target.value));
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

    async loadBookingForCheckin(bookingId) {
        if (!bookingId) return;
        
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            document.getElementById('checkin-guest-name').value = booking.guestName || '';
            
            // Set default time to now
            const now = new Date();
            document.getElementById('checkin-actual-time').value = 
                now.toISOString().slice(0, 16);
        } else {
            showNotification('Booking ID tidak ditemukan!', 'warning');
        }
    }

    async loadBookingForCheckout(bookingId) {
        if (!bookingId) return;
        
        const booking = this.bookings.find(b => b.id === bookingId && b.status === 'checkedin');
        if (booking) {
            document.getElementById('checkout-guest-name').value = booking.guestName || '';
            document.getElementById('checkout-room-number').value = booking.roomNumber || '';
            
            // Set default time to now
            const now = new Date();
            document.getElementById('checkout-actual-time').value = 
                now.toISOString().slice(0, 16);
        } else {
            showNotification('Booking tidak ditemukan atau belum check-in!', 'warning');
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
        const bookingId = document.getElementById('checkin-booking-id').value;
        const roomNumber = document.getElementById('checkin-room-number').value;
        const checkinTime = document.getElementById('checkin-actual-time').value;
        const notes = document.getElementById('checkin-notes').value;

        try {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (!booking) {
                showNotification('Booking tidak ditemukan!', 'error');
                return;
            }

            // Validate booking status
            if (booking.status === 'checkedin') {
                showNotification('Booking ini sudah check-in!', 'warning');
                return;
            }

            if (booking.status === 'cancelled') {
                showNotification('Booking ini sudah dibatalkan!', 'error');
                return;
            }

            // Update booking data
            booking.status = 'checkedin';
            booking.roomNumber = roomNumber;
            booking.actualCheckinTime = checkinTime;
            booking.checkinNotes = notes;
            booking.updatedAt = new Date().toISOString();

            await window.dbManager.update('bookings', booking);
            
            // Update room status if room number provided
            if (roomNumber) {
                const room = this.rooms.find(r => r.number === roomNumber);
                if (room) {
                    room.status = 'terisi';
                    room.currentBookingId = bookingId;
                    await window.dbManager.update('rooms', room);
                }
            }

            // Hide form and reload data
            hideCheckinForm();
            await this.loadData();
            
            // Reload calendar if available
            if (window.calendarManager && window.calendarManager !== this) {
                await window.calendarManager.loadData();
                window.calendarManager.renderCalendar();
            }
            
            // Clear form
            document.getElementById('add-checkin-form').reset();
            
            showNotification('Check-in berhasil! Tamu: ' + booking.guestName, 'success');
        } catch (error) {
            console.error('Error processing check-in:', error);
            showNotification('Error saat check-in: ' + error.message, 'error');
        }
    }

    async handleCheckOut(e) {
        e.preventDefault();
        const bookingId = document.getElementById('checkout-booking-id').value;
        const checkoutTime = document.getElementById('checkout-actual-time').value;
        const condition = document.getElementById('checkout-condition').value;
        const notes = document.getElementById('checkout-notes').value;

        try {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (!booking) {
                showNotification('Booking tidak ditemukan!', 'error');
                return;
            }

            // Validate booking status
            if (booking.status !== 'checkedin') {
                showNotification('Booking ini belum check-in!', 'warning');
                return;
            }

            // Update booking data
            booking.status = 'checkedout';
            booking.actualCheckoutTime = checkoutTime;
            booking.checkoutNotes = notes;
            booking.roomCondition = condition;
            booking.updatedAt = new Date().toISOString();

            await window.dbManager.update('bookings', booking);
            
            // Update room status
            if (booking.roomNumber) {
                const room = this.rooms.find(r => r.number === booking.roomNumber);
                if (room) {
                    // Set room status based on condition
                    if (condition === 'baik') {
                        room.status = 'tersedia';
                    } else if (condition === 'perlu-cleaning') {
                        room.status = 'terisi'; // Will be cleaned
                        // Create housekeeping task
                        await this.createCleaningTask(room.number, 'Cleaning setelah check-out');
                    } else if (condition === 'perlu-perbaikan') {
                        room.status = 'maintenance';
                        // Create maintenance task
                        await this.createCleaningTask(room.number, 'Perbaikan diperlukan');
                    }
                    room.currentBookingId = null;
                    await window.dbManager.update('rooms', room);
                }
            }

            // Hide form and reload data
            hideCheckoutForm();
            await this.loadData();
            
            // Reload calendar if available
            if (window.calendarManager && window.calendarManager !== this) {
                await window.calendarManager.loadData();
                window.calendarManager.renderCalendar();
            }
            
            // Clear form
            document.getElementById('add-checkout-form').reset();
            
            showNotification('Check-out berhasil! Tamu: ' + booking.guestName, 'success');
        } catch (error) {
            console.error('Error processing check-out:', error);
            showNotification('Error saat check-out: ' + error.message, 'error');
        }
    }

    async createCleaningTask(roomNumber, description) {
        try {
            const task = {
                id: 'TASK-' + Date.now(),
                roomNumber: roomNumber,
                taskType: 'cleaning',
                description: description,
                assignedTo: '',
                priority: 'high',
                status: 'pending',
                dueDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                createdAt: new Date().toISOString()
            };

            await window.dbManager.insert('housekeeping', task);
        } catch (error) {
            console.warn('Could not create cleaning task:', error);
        }
    }

    renderTodayActivities() {
        this.renderCheckinList();
    }

    renderCheckinList() {
        const tbody = document.getElementById('checkin-list');
        if (!tbody) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Get all bookings that are checked in today or checking out today
        const todayBookings = this.bookings.filter(booking => {
            const checkinDate = booking.checkinDate ? booking.checkinDate.split('T')[0] : '';
            const checkoutDate = booking.checkoutDate ? booking.checkoutDate.split('T')[0] : '';
            return (checkinDate === today || checkoutDate === today || booking.status === 'checkedin');
        });

        if (todayBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data check-in/out hari ini</td></tr>';
            return;
        }

        tbody.innerHTML = todayBookings.map(booking => {
            const checkinTime = booking.actualCheckinTime ? 
                new Date(booking.actualCheckinTime).toLocaleString('id-ID') : '-';
            const checkoutTime = booking.actualCheckoutTime ? 
                new Date(booking.actualCheckoutTime).toLocaleString('id-ID') : '-';
            
            let statusBadge = '';
            let actions = '';
            
            switch(booking.status) {
                case 'confirmed':
                    statusBadge = '<span class="badge badge-info">Confirmed</span>';
                    actions = `<button class="btn btn-sm btn-primary" onclick="window.checkInOutManager.quickCheckin('${booking.id}')">Check-in</button>`;
                    break;
                case 'checkedin':
                    statusBadge = '<span class="badge badge-success">Checked-in</span>';
                    actions = `<button class="btn btn-sm btn-warning" onclick="window.checkInOutManager.quickCheckout('${booking.id}')">Check-out</button>`;
                    break;
                case 'checkedout':
                    statusBadge = '<span class="badge badge-secondary">Checked-out</span>';
                    actions = '<span class="text-muted">Selesai</span>';
                    break;
                default:
                    statusBadge = `<span class="badge badge-light">${booking.status}</span>`;
                    actions = '-';
            }

            return `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.guestName || '-'}</td>
                    <td>${booking.roomNumber || '-'}</td>
                    <td>${checkinTime}</td>
                    <td>${checkoutTime}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    quickCheckin(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            document.getElementById('checkin-booking-id').value = bookingId;
            document.getElementById('checkin-guest-name').value = booking.guestName || '';
            document.getElementById('checkin-room-number').value = booking.roomNumber || '';
            document.getElementById('checkin-actual-time').value = new Date().toISOString().slice(0, 16);
            showCheckinForm();
        }
    }

    quickCheckout(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            document.getElementById('checkout-booking-id').value = bookingId;
            document.getElementById('checkout-guest-name').value = booking.guestName || '';
            document.getElementById('checkout-room-number').value = booking.roomNumber || '';
            document.getElementById('checkout-actual-time').value = new Date().toISOString().slice(0, 16);
            showCheckoutForm();
        }
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

// Calendar navigation functions
function previousMonth() {
    if (window.calendarManager) {
        window.calendarManager.navigateCalendar(-1);
    }
}

function nextMonth() {
    if (window.calendarManager) {
        window.calendarManager.navigateCalendar(1);
    }
}

function refreshCalendar() {
    if (window.calendarManager) {
        window.calendarManager.loadData();
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

// Initialize managers when DOM is loaded and database is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await waitForDatabase();
        window.roomsManager = new RoomsManager();
        window.guestsManager = new GuestsManager();
        window.calendarManager = new CalendarManager();
        window.checkInOutManager = new CheckInOutManager();
    } catch (error) {
        console.error('Failed to initialize advanced feature managers:', error);
    }
});

// --- Show/Hide Form Utilities for All Modules ---
function showCheckinForm() {
    document.getElementById('checkin-form').style.display = 'block';
}
function hideCheckinForm() {
    document.getElementById('checkin-form').style.display = 'none';
}
function showCheckoutForm() {
    document.getElementById('checkout-form').style.display = 'block';
}
function hideCheckoutForm() {
    document.getElementById('checkout-form').style.display = 'none';
}
function showAddPaymentForm() {
    document.getElementById('payment-form').style.display = 'block';
}
function hidePaymentForm() {
    document.getElementById('payment-form').style.display = 'none';
}
function showAddFinanceForm() {
    document.getElementById('finance-form').style.display = 'block';
}
function hideFinanceForm() {
    document.getElementById('finance-form').style.display = 'none';
}
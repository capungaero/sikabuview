// Reports Manager - Advanced Analytics and Reporting
class ReportsManager {
    constructor() {
        this.bookings = [];
        this.rooms = [];
        this.payments = [];
        this.expenses = [];
        this.currentPeriod = 'month'; // day, week, month, year
        this.currentDate = new Date();
    }

    async init() {
        console.log('Initializing Reports Manager...');
        await this.loadData();
        this.setupEventListeners();
        this.updateAllReports();
    }

    async loadData() {
        try {
            this.bookings = await window.dbManager.select('bookings') || [];
            this.rooms = await window.dbManager.select('rooms') || [];
            this.payments = await window.dbManager.select('payments') || [];
            this.expenses = await window.dbManager.select('expenses') || [];
        } catch (error) {
            console.error('Error loading reports data:', error);
        }
    }

    setupEventListeners() {
        // Period filter
        const periodBtns = document.querySelectorAll('.period-filter-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                this.updateAllReports();
            });
        });

        // Refresh reports when a payment is created
        document.addEventListener('paymentCreated', async () => {
            try {
                await this.loadData();
                this.updateAllReports();
            } catch (err) {
                console.error('Error updating reports after payment:', err);
            }
        });
    }

    updateAllReports() {
        this.updateOccupancyRate();
        this.updateRevenue();
        this.updateRevPAR();
        this.updateBookingStats();
    }

    // Calculate Occupancy Rate
    updateOccupancyRate() {
        const totalRooms = this.rooms.length;
        if (totalRooms === 0) {
            this.setElementText('occupancy-rate', '0%');
            this.setElementText('occupied-rooms-report', '0');
            this.setElementText('total-rooms', '0');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const occupiedRooms = this.bookings.filter(booking => {
            if (booking.status === 'confirmed' || booking.status === 'checkedin') {
                const checkIn = new Date(booking.checkinDate || booking.checkInDate);
                const checkOut = new Date(booking.checkoutDate || booking.checkOutDate);
                const todayDate = new Date(today);
                return todayDate >= checkIn && todayDate < checkOut;
            }
            return false;
        }).length;

        const occupancyRate = ((occupiedRooms / totalRooms) * 100).toFixed(1);
        
        this.setElementText('occupancy-rate', `${occupancyRate}%`);
        this.setElementText('occupied-rooms-report', occupiedRooms);
        this.setElementText('total-rooms', totalRooms);
    }

    // Calculate Revenue
    updateRevenue() {
        const { start, end } = this.getPeriodRange();
        
        let totalRevenue = 0;
        this.payments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate || payment.createdAt);
            if (paymentDate >= start && paymentDate <= end) {
                totalRevenue += parseFloat(payment.amount || 0);
            }
        });

        // Update revenue display
        const revenueEl = document.getElementById('total-revenue');
        if (revenueEl) {
            revenueEl.textContent = this.formatCurrency(totalRevenue);
        }
    }

    // Calculate RevPAR (Revenue Per Available Room)
    updateRevPAR() {
        const { start, end } = this.getPeriodRange();
        const totalRooms = this.rooms.length;
        
        if (totalRooms === 0) {
            this.setElementText('revpar', 'Rp 0');
            return;
        }

        let totalRevenue = 0;
        this.payments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate || payment.createdAt);
            if (paymentDate >= start && paymentDate <= end) {
                totalRevenue += parseFloat(payment.amount || 0);
            }
        });

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const availableRoomNights = totalRooms * days;
        const revPAR = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;

        this.setElementText('revpar', this.formatCurrency(revPAR));
    }

    // Booking Statistics
    updateBookingStats() {
        const { start, end } = this.getPeriodRange();
        
        const periodBookings = this.bookings.filter(booking => {
            const bookingDate = new Date(booking.createdAt);
            return bookingDate >= start && bookingDate <= end;
        });

        const stats = {
            total: periodBookings.length,
            confirmed: periodBookings.filter(b => b.status === 'confirmed').length,
            checkedin: periodBookings.filter(b => b.status === 'checkedin').length,
            checkedout: periodBookings.filter(b => b.status === 'checkedout').length,
            cancelled: periodBookings.filter(b => b.status === 'cancelled').length
        };

        // Update stats display if elements exist
        this.setElementText('total-bookings-stat', stats.total);
        this.setElementText('confirmed-bookings-stat', stats.confirmed);
        this.setElementText('checkedin-bookings-stat', stats.checkedin);
        this.setElementText('checkedout-bookings-stat', stats.checkedout);
        this.setElementText('cancelled-bookings-stat', stats.cancelled);
    }

    // Get period date range
    getPeriodRange() {
        const today = new Date();
        let start, end;

        switch (this.currentPeriod) {
            case 'day':
                start = new Date(today.setHours(0, 0, 0, 0));
                end = new Date(today.setHours(23, 59, 59, 999));
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                weekStart.setHours(0, 0, 0, 0);
                start = weekStart;
                end = new Date(weekStart);
                end.setDate(weekStart.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
                end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        return { start, end };
    }

    // Export report to CSV
    exportToCSV(reportType) {
        let data = [];
        let filename = '';

        switch (reportType) {
            case 'bookings':
                data = this.bookings.map(b => ({
                    'ID': b.id,
                    'Nama Tamu': b.guestName,
                    'Kamar': b.roomNumber,
                    'Check-in': b.checkinDate || b.checkInDate,
                    'Check-out': b.checkoutDate || b.checkOutDate,
                    'Status': b.status,
                    'Total': b.totalPrice
                }));
                filename = 'laporan-booking.csv';
                break;
            case 'revenue':
                data = this.payments.map(p => ({
                    'ID': p.id,
                    'Booking ID': p.bookingId,
                    'Tanggal': p.paymentDate || p.createdAt,
                    'Jumlah': p.amount,
                    'Metode': p.paymentMethod,
                    'Status': p.status
                }));
                filename = 'laporan-pendapatan.csv';
                break;
            case 'occupancy':
                data = this.generateOccupancyData();
                filename = 'laporan-okupansi.csv';
                break;
        }

        if (data.length === 0) {
            showNotification('Tidak ada data untuk diekspor', 'warning');
            return;
        }

        const csv = this.convertToCSV(data);
        this.downloadCSV(csv, filename);
        showNotification('Laporan berhasil diekspor', 'success');
    }

    generateOccupancyData() {
        const { start, end } = this.getPeriodRange();
        const data = [];
        const totalRooms = this.rooms.length;

        let currentDate = new Date(start);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const occupiedRooms = this.bookings.filter(booking => {
                if (booking.status === 'confirmed' || booking.status === 'checkedin') {
                    const checkIn = new Date(booking.checkinDate || booking.checkInDate);
                    const checkOut = new Date(booking.checkoutDate || booking.checkOutDate);
                    const current = new Date(dateStr);
                    return current >= checkIn && current < checkOut;
                }
                return false;
            }).length;

            const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

            data.push({
                'Tanggal': dateStr,
                'Kamar Terisi': occupiedRooms,
                'Total Kamar': totalRooms,
                'Okupansi %': occupancyRate
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return data;
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    setElementText(id, text) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        }
    }
}

// Global report functions
async function generateReport() {
    if (window.reportsManager) {
        await window.reportsManager.loadData();
        window.reportsManager.updateAllReports();
        showNotification('Laporan berhasil di-generate', 'success');
    }
}

function exportReport(type) {
    if (window.reportsManager) {
        window.reportsManager.exportToCSV(type);
    }
}

function printReport() {
    window.print();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForDatabase();
        window.reportsManager = new ReportsManager();
        await window.reportsManager.init();
        console.log('Reports Manager initialized successfully');
    } catch (error) {
        console.error('Error initializing Reports Manager:', error);
    }
});

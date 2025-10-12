/**
 * Print Module for SikaBu View
 * Handles printing functionality for all modules
 */

class PrintManager {
    constructor() {
        this.init();
    }
    
    init() {
        // Add print-specific CSS if not already present
        this.addPrintStyles();
    }
    
    addPrintStyles() {
        // Print styles are already included in print.css
        // This method can be used for additional dynamic styles
    }
    
    // Booking Report Printing
    async printBookingReport() {
        try {
            await waitForDatabase();
            const bookings = await window.dbManager.select('bookings', {}, 'bookingDate DESC');
            
            const printContent = this.generateBookingReport(bookings);
            this.print(printContent, 'Laporan Booking');
            
        } catch (error) {
            console.error('Error printing booking report:', error);
            alert('Error mencetak laporan booking');
        }
    }
    
    generateBookingReport(bookings) {
        const today = new Date().toLocaleDateString('id-ID');
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        const statusSummary = bookings.reduce((summary, booking) => {
            summary[booking.status] = (summary[booking.status] || 0) + 1;
            return summary;
        }, {});
        
        const typeSummary = bookings.reduce((summary, booking) => {
            summary[booking.bookingType] = (summary[booking.bookingType] || 0) + 1;
            return summary;
        }, {});
        
        return `
            <div class="print-header">
                <h1>SikaBu View</h1>
                <p>Laporan Booking</p>
                <p>Dicetak pada: ${today}</p>
            </div>
            
            <div class="print-summary">
                <h3>Ringkasan</h3>
                <div class="summary-row">
                    <span>Total Booking:</span>
                    <span>${totalBookings}</span>
                </div>
                <div class="summary-row">
                    <span>Total Pendapatan:</span>
                    <span>${this.formatCurrency(totalRevenue)}</span>
                </div>
                <div class="summary-row">
                    <span>Rata-rata per Booking:</span>
                    <span>${totalBookings > 0 ? this.formatCurrency(totalRevenue / totalBookings) : 'Rp 0'}</span>
                </div>
            </div>
            
            <div class="print-summary">
                <h3>Statistik Status</h3>
                ${Object.entries(statusSummary).map(([status, count]) => `
                    <div class="summary-row">
                        <span>${this.getStatusLabel(status)}:</span>
                        <span>${count}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="print-summary">
                <h3>Statistik Jenis Booking</h3>
                ${Object.entries(typeSummary).map(([type, count]) => `
                    <div class="summary-row">
                        <span>${this.getBookingTypeLabel(type)}:</span>
                        <span>${count}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="page-break"></div>
            
            <h3>Detail Booking</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tamu</th>
                        <th>Tanggal Booking</th>
                        <th>Check-in/out</th>
                        <th>Jenis</th>
                        <th>Jumlah</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>#${booking.id}</td>
                            <td>${booking.guestName}<br><small>${booking.guestPhone}</small></td>
                            <td>${this.formatDate(booking.bookingDate)}</td>
                            <td>${this.formatDate(booking.checkinDate)} - ${this.formatDate(booking.checkoutDate)}</td>
                            <td>${this.getBookingTypeLabel(booking.bookingType)}</td>
                            <td>${booking.quantity}</td>
                            <td>${this.formatCurrency(booking.totalPrice)}</td>
                            <td>${this.getStatusLabel(booking.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>Laporan digenerate oleh SikaBu View - Sistem Manajemen Penginapan</p>
            </div>
        `;
    }
    
    // Payment Report Printing
    async printPaymentReport() {
        try {
            await waitForDatabase();
            const payments = await window.dbManager.select('payments', {}, 'paymentDate DESC');
            
            // Get booking details for each payment
            const paymentsWithBookings = await Promise.all(payments.map(async (payment) => {
                const bookings = await window.dbManager.select('bookings', { id: payment.bookingId });
                return {
                    ...payment,
                    booking: bookings[0]
                };
            }));
            
            const printContent = this.generatePaymentReport(paymentsWithBookings);
            this.print(printContent, 'Laporan Pembayaran');
            
        } catch (error) {
            console.error('Error printing payment report:', error);
            alert('Error mencetak laporan pembayaran');
        }
    }
    
    generatePaymentReport(payments) {
        const today = new Date().toLocaleDateString('id-ID');
        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const totalAccommodation = payments.reduce((sum, payment) => sum + payment.accommodationCost, 0);
        const totalAdditional = payments.reduce((sum, payment) => sum + payment.additionalCost, 0);
        
        const methodSummary = payments.reduce((summary, payment) => {
            summary[payment.paymentMethod] = (summary[payment.paymentMethod] || 0) + payment.totalAmount;
            return summary;
        }, {});
        
        return `
            <div class="print-header">
                <h1>SikaBu View</h1>
                <p>Laporan Pembayaran</p>
                <p>Dicetak pada: ${today}</p>
            </div>
            
            <div class="print-summary">
                <h3>Ringkasan Pembayaran</h3>
                <div class="summary-row">
                    <span>Total Transaksi:</span>
                    <span>${totalPayments}</span>
                </div>
                <div class="summary-row">
                    <span>Total Pembayaran:</span>
                    <span>${this.formatCurrency(totalAmount)}</span>
                </div>
                <div class="summary-row">
                    <span>Biaya Penginapan:</span>
                    <span>${this.formatCurrency(totalAccommodation)}</span>
                </div>
                <div class="summary-row">
                    <span>Biaya Tambahan:</span>
                    <span>${this.formatCurrency(totalAdditional)}</span>
                </div>
                <div class="summary-row total-row">
                    <span>Rata-rata per Transaksi:</span>
                    <span>${totalPayments > 0 ? this.formatCurrency(totalAmount / totalPayments) : 'Rp 0'}</span>
                </div>
            </div>
            
            <div class="print-summary">
                <h3>Statistik Metode Pembayaran</h3>
                ${Object.entries(methodSummary).map(([method, amount]) => `
                    <div class="summary-row">
                        <span>${this.getPaymentMethodLabel(method)}:</span>
                        <span>${this.formatCurrency(amount)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="page-break"></div>
            
            <h3>Detail Pembayaran</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tamu</th>
                        <th>Tanggal</th>
                        <th>Penginapan</th>
                        <th>Tambahan</th>
                        <th>Total</th>
                        <th>Metode</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                        <tr>
                            <td>#${payment.id}</td>
                            <td>${payment.booking ? payment.booking.guestName : 'Unknown'}<br>
                                <small>${payment.booking ? payment.booking.guestPhone : '-'}</small></td>
                            <td>${this.formatDateTime(payment.paymentDate)}</td>
                            <td>${this.formatCurrency(payment.accommodationCost)}</td>
                            <td>${this.formatCurrency(payment.additionalCost)}</td>
                            <td><strong>${this.formatCurrency(payment.totalAmount)}</strong></td>
                            <td>${this.getPaymentMethodLabel(payment.paymentMethod)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>Laporan digenerate oleh SikaBu View - Sistem Manajemen Penginapan</p>
            </div>
        `;
    }
    
    // Finance Report Printing
    async printFinanceReport() {
        try {
            await waitForDatabase();
            const expenses = await window.dbManager.select('expenses', {}, 'expenseDate DESC');
            const payments = await window.dbManager.select('payments', {}, 'paymentDate DESC');
            
            const printContent = this.generateFinanceReport(expenses, payments);
            this.print(printContent, 'Laporan Keuangan');
            
        } catch (error) {
            console.error('Error printing finance report:', error);
            alert('Error mencetak laporan keuangan');
        }
    }
    
    generateFinanceReport(expenses, payments) {
        const today = new Date().toLocaleDateString('id-ID');
        
        // Calculate totals
        const totalIncome = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;
        
        // Category breakdown for expenses
        const expenseByCategory = expenses.reduce((summary, expense) => {
            summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
            return summary;
        }, {});
        
        // Monthly breakdown
        const monthlyData = this.getMonthlyFinanceData(expenses, payments);
        
        return `
            <div class="print-header">
                <h1>SikaBu View</h1>
                <p>Laporan Keuangan</p>
                <p>Dicetak pada: ${today}</p>
            </div>
            
            <div class="finance-cards">
                <div class="finance-card">
                    <h3>Total Pendapatan</h3>
                    <div class="amount">${this.formatCurrency(totalIncome)}</div>
                    <small>${payments.length} transaksi</small>
                </div>
                <div class="finance-card">
                    <h3>Total Pengeluaran</h3>
                    <div class="amount">${this.formatCurrency(totalExpense)}</div>
                    <small>${expenses.length} transaksi</small>
                </div>
                <div class="finance-card">
                    <h3>Keuntungan Bersih</h3>
                    <div class="amount">${this.formatCurrency(netProfit)}</div>
                    <small>${profitMargin.toFixed(1)}% margin</small>
                </div>
            </div>
            
            <div class="print-summary">
                <h3>Pengeluaran per Kategori</h3>
                ${Object.entries(expenseByCategory).map(([category, amount]) => `
                    <div class="summary-row">
                        <span>${this.getCategoryLabel(category)}:</span>
                        <span>${this.formatCurrency(amount)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="print-summary">
                <h3>Ringkasan Bulanan (6 Bulan Terakhir)</h3>
                ${monthlyData.map(month => `
                    <div class="summary-row">
                        <span>${month.month}:</span>
                        <span>Masuk: ${this.formatCurrency(month.income)} | 
                              Keluar: ${this.formatCurrency(month.expense)} | 
                              Saldo: ${this.formatCurrency(month.profit)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="page-break"></div>
            
            <h3>Detail Pendapatan</h3>
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>ID Pembayaran</th>
                        <th>Penginapan</th>
                        <th>Tambahan</th>
                        <th>Total</th>
                        <th>Metode</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.slice(0, 50).map(payment => `
                        <tr>
                            <td>${this.formatDate(payment.paymentDate)}</td>
                            <td>#${payment.id}</td>
                            <td>${this.formatCurrency(payment.accommodationCost)}</td>
                            <td>${this.formatCurrency(payment.additionalCost)}</td>
                            <td><strong>${this.formatCurrency(payment.totalAmount)}</strong></td>
                            <td>${this.getPaymentMethodLabel(payment.paymentMethod)}</td>
                        </tr>
                    `).join('')}
                    ${payments.length > 50 ? `
                        <tr>
                            <td colspan="6" class="text-center">
                                <em>... dan ${payments.length - 50} transaksi lainnya</em>
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            
            <div class="page-break"></div>
            
            <h3>Detail Pengeluaran</h3>
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Deskripsi</th>
                        <th>Jumlah</th>
                        <th>Catatan</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.slice(0, 50).map(expense => `
                        <tr>
                            <td>${this.formatDate(expense.expenseDate)}</td>
                            <td>${this.getCategoryLabel(expense.category)}</td>
                            <td>${expense.description}</td>
                            <td>${this.formatCurrency(expense.amount)}</td>
                            <td>${expense.notes || '-'}</td>
                        </tr>
                    `).join('')}
                    ${expenses.length > 50 ? `
                        <tr>
                            <td colspan="5" class="text-center">
                                <em>... dan ${expenses.length - 50} pengeluaran lainnya</em>
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>Laporan digenerate oleh SikaBu View - Sistem Manajemen Penginapan</p>
            </div>
        `;
    }
    
    // Payment Receipt Printing
    async printPaymentReceipt(paymentId) {
        try {
            await waitForDatabase();
            const payments = await window.dbManager.select('payments', { id: paymentId });
            if (payments.length === 0) {
                alert('Pembayaran tidak ditemukan');
                return;
            }
            
            const payment = payments[0];
            const bookings = await window.dbManager.select('bookings', { id: payment.bookingId });
            const booking = bookings[0];
            
            const printContent = this.generatePaymentReceipt(payment, booking);
            this.print(printContent, `Kwitansi Pembayaran #${paymentId}`);
            
        } catch (error) {
            console.error('Error printing receipt:', error);
            alert('Error mencetak kwitansi');
        }
    }
    
    generatePaymentReceipt(payment, booking) {
        const receiptNumber = `RCP-${payment.id.toString().padStart(6, '0')}`;
        
        let additionalOrdersHtml = '';
        if (payment.additionalOrders) {
            try {
                const additionalOrders = JSON.parse(payment.additionalOrders);
                if (additionalOrders.length > 0) {
                    additionalOrdersHtml = `
                        <h4>Pesanan Tambahan:</h4>
                        <table style="margin-bottom: 20px;">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Deskripsi</th>
                                    <th>Harga</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${additionalOrders.map(order => `
                                    <tr>
                                        <td>${this.getItemLabel(order.item)}</td>
                                        <td>${order.description}</td>
                                        <td>${this.formatCurrency(order.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
            } catch (error) {
                console.error('Error parsing additional orders:', error);
            }
        }
        
        return `
            <div class="print-header">
                <h1>SikaBu View</h1>
                <p>Villa & Camping Ground</p>
                <p style="margin-top: 20px;"><strong>KWITANSI PEMBAYARAN</strong></p>
                <p>No: ${receiptNumber}</p>
            </div>
            
            <div style="margin: 30px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                        <strong>Kepada:</strong><br>
                        ${booking ? booking.guestName : 'Unknown'}<br>
                        ${booking ? booking.guestPhone : '-'}<br>
                        ID Tamu: ${booking ? booking.guestId : '-'}
                    </div>
                    <div style="text-align: right;">
                        <strong>Tanggal:</strong> ${this.formatDate(payment.paymentDate)}<br>
                        <strong>ID Booking:</strong> #${payment.bookingId}<br>
                        <strong>ID Pembayaran:</strong> #${payment.id}
                    </div>
                </div>
                
                <h4>Detail Booking:</h4>
                <table style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Jenis</th>
                            <th>Periode</th>
                            <th>Jumlah</th>
                            <th>Harga</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${booking ? this.getBookingTypeLabel(booking.bookingType) : '-'}</td>
                            <td>${booking ? `${this.formatDate(booking.checkinDate)} - ${this.formatDate(booking.checkoutDate)}` : '-'}</td>
                            <td>${booking ? booking.quantity : '-'}</td>
                            <td>${this.formatCurrency(payment.accommodationCost)}</td>
                        </tr>
                    </tbody>
                </table>
                
                ${additionalOrdersHtml}
                
                <div class="print-summary">
                    <div class="summary-row">
                        <span>Biaya Penginapan:</span>
                        <span>${this.formatCurrency(payment.accommodationCost)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Biaya Tambahan:</span>
                        <span>${this.formatCurrency(payment.additionalCost)}</span>
                    </div>
                    <div class="summary-row total-row">
                        <span><strong>Total Pembayaran:</strong></span>
                        <span><strong>${this.formatCurrency(payment.totalAmount)}</strong></span>
                    </div>
                    <div class="summary-row">
                        <span>Metode Pembayaran:</span>
                        <span>${this.getPaymentMethodLabel(payment.paymentMethod)}</span>
                    </div>
                </div>
                
                ${payment.notes ? `
                    <div style="margin-top: 20px;">
                        <strong>Catatan:</strong><br>
                        ${payment.notes}
                    </div>
                ` : ''}
                
                <div style="margin-top: 40px; text-align: center;">
                    <p>Terima kasih telah menginap di SikaBu View</p>
                    <p style="margin-top: 60px;">
                        ________________<br>
                        Tanda Tangan & Stempel
                    </p>
                </div>
            </div>
        `;
    }
    
    // Utility methods
    getMonthlyFinanceData(expenses, payments) {
        const monthlyData = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            
            const monthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.expenseDate);
                return expenseDate >= month && expenseDate < nextMonth;
            });
            
            const monthPayments = payments.filter(payment => {
                const paymentDate = new Date(payment.paymentDate);
                return paymentDate >= month && paymentDate < nextMonth;
            });
            
            const monthIncome = monthPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
            const monthExpense = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            monthlyData.push({
                month: month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                income: monthIncome,
                expense: monthExpense,
                profit: monthIncome - monthExpense
            });
        }
        
        return monthlyData;
    }
    
    print(content, title = 'SikaBu View Report') {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        const printDocument = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <link rel="stylesheet" href="css/style.css">
                <link rel="stylesheet" href="css/print.css">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.4; 
                        color: #000; 
                        background: white;
                        margin: 20px;
                        font-size: 12px;
                    }
                    .print-header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        padding-bottom: 20px; 
                        border-bottom: 2px solid #000; 
                    }
                    .print-header h1 { 
                        font-size: 24px; 
                        margin-bottom: 10px; 
                    }
                    .print-summary { 
                        margin: 20px 0; 
                        padding: 15px; 
                        border: 1px solid #000; 
                        background-color: #f9f9f9; 
                    }
                    .summary-row { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 5px 0; 
                    }
                    .total-row { 
                        border-top: 1px solid #000; 
                        padding-top: 5px; 
                        margin-top: 10px; 
                        font-weight: bold; 
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                    }
                    table th, table td { 
                        border: 1px solid #000; 
                        padding: 8px; 
                        text-align: left; 
                        font-size: 11px; 
                    }
                    table th { 
                        background-color: #f0f0f0; 
                        font-weight: bold; 
                    }
                    .page-break { 
                        page-break-before: always; 
                    }
                    .print-footer { 
                        margin-top: 40px; 
                        text-align: center; 
                        font-size: 10px; 
                        border-top: 1px solid #000; 
                        padding-top: 10px; 
                    }
                    .finance-cards { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 20px 0; 
                    }
                    .finance-card { 
                        flex: 1; 
                        margin: 0 10px; 
                        padding: 15px; 
                        border: 1px solid #000; 
                        text-align: center; 
                    }
                    .finance-card h3 { 
                        font-size: 12px; 
                        margin-bottom: 10px; 
                    }
                    .finance-card .amount { 
                        font-size: 18px; 
                        font-weight: bold; 
                    }
                    @media print {
                        .page-break { page-break-before: always; }
                        .no-break { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
        
        printWindow.document.write(printDocument);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
    }
    
    // Helper methods for formatting
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
    
    getPaymentMethodLabel(method) {
        const labels = {
            'cash': 'Tunai',
            'transfer': 'Transfer Bank',
            'debit': 'Kartu Debit',
            'credit': 'Kartu Kredit',
            'digital': 'Digital Payment'
        };
        return labels[method] || method;
    }
    
    getCategoryLabel(category) {
        const labels = {
            'maintenance': 'Maintenance',
            'utilities': 'Utilities',
            'supplies': 'Supplies',
            'food': 'Makanan',
            'staff': 'Gaji Staff',
            'marketing': 'Marketing',
            'equipment': 'Peralatan',
            'other': 'Lainnya'
        };
        return labels[category] || category;
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
window.printBookingReport = () => {
    if (window.printManager) {
        window.printManager.printBookingReport();
    }
};

window.printPaymentReport = () => {
    if (window.printManager) {
        window.printManager.printPaymentReport();
    }
};

window.printFinanceReport = () => {
    if (window.printManager) {
        window.printManager.printFinanceReport();
    }
};

// Initialize print manager
window.printManager = new PrintManager();
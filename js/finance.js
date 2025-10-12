/**
 * Finance Module for SikaBu View
 * Handles financial management, income, and expenses
 */

class FinanceManager {
    constructor() {
        this.currentExpenses = [];
        this.currentIncome = [];
        this.allTransactions = [];
        this.currentPeriod = 'month';
        this.customDateFrom = null;
        this.customDateTo = null;
        this.init();
    }
    
    async init() {
        await this.loadFinanceData();
        this.setupEventListeners();
        this.updateFinanceSummary();
    }
    
    setupEventListeners() {
        // Add expense form submission
        const addExpenseForm = document.getElementById('add-expense-form');
        if (addExpenseForm) {
            addExpenseForm.addEventListener('submit', (e) => this.handleAddExpense(e));
        }
        
        // Finance period change
        const financePeriod = document.getElementById('finance-period');
        if (financePeriod) {
            financePeriod.addEventListener('change', (e) => this.handlePeriodChange(e));
        }
        
        // Set default expense date
        this.setDefaultExpenseDate();
    }
    
    setDefaultExpenseDate() {
        const today = new Date().toISOString().split('T')[0];
        const expenseDateField = document.getElementById('expense-date');
        
        if (expenseDateField && !expenseDateField.value) {
            expenseDateField.value = today;
        }
    }
    
    async loadFinanceData() {
        try {
            await waitForDatabase();
            
            // Load expenses
            this.currentExpenses = await window.dbManager.select('expenses', {}, 'expenseDate DESC');
            
            // Load income from payments
            const payments = await window.dbManager.select('payments', {}, 'paymentDate DESC');
            
            // Transform payments to income format
            this.currentIncome = await Promise.all(payments.map(async (payment) => {
                // Get booking details for guest info
                const bookings = await window.dbManager.select('bookings', { id: payment.bookingId });
                const booking = bookings[0];
                
                return {
                    id: payment.id,
                    date: payment.paymentDate.split('T')[0], // Extract date part
                    paymentId: payment.id,
                    guestName: booking ? booking.guestName : 'Unknown',
                    bookingType: booking ? booking.bookingType : 'unknown',
                    amount: payment.totalAmount,
                    source: 'accommodation'
                };
            }));
            
            // Combine all transactions for the all-transactions view
            this.generateAllTransactions();
            
            // Display data
            this.displayIncomeData();
            this.displayExpenseData();
            this.displayAllTransactions();
            
        } catch (error) {
            console.error('Error loading finance data:', error);
            this.showError('Error memuat data keuangan');
        }
    }
    
    generateAllTransactions() {
        this.allTransactions = [];
        
        // Add income transactions
        this.currentIncome.forEach(income => {
            this.allTransactions.push({
                date: income.date,
                type: 'income',
                description: `Pembayaran ${income.guestName} - ${this.getBookingTypeLabel(income.bookingType)}`,
                income: income.amount,
                expense: 0,
                balance: 0, // Will be calculated later
                relatedId: income.paymentId
            });
        });
        
        // Add expense transactions
        this.currentExpenses.forEach(expense => {
            this.allTransactions.push({
                date: expense.expenseDate,
                type: 'expense',
                description: `${expense.description} (${this.getCategoryLabel(expense.category)})`,
                income: 0,
                expense: expense.amount,
                balance: 0, // Will be calculated later
                relatedId: expense.id
            });
        });
        
        // Sort by date
        this.allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate running balance
        let runningBalance = 0;
        this.allTransactions.forEach(transaction => {
            runningBalance += transaction.income - transaction.expense;
            transaction.balance = runningBalance;
        });
    }
    
    async handleAddExpense(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const expenseData = {
                expenseDate: formData.get('expenseDate'),
                category: formData.get('category'),
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                notes: formData.get('notes') || ''
            };
            
            // Validate data
            if (expenseData.amount <= 0) {
                throw new Error('Jumlah pengeluaran harus lebih dari 0');
            }
            
            // Save to database
            const expenseId = await window.dbManager.insert('expenses', expenseData);
            
            if (expenseId) {
                this.showSuccess('Pengeluaran berhasil ditambahkan');
                this.hideAddExpenseForm();
                await this.loadFinanceData();
                this.updateFinanceSummary();
                event.target.reset();
                this.setDefaultExpenseDate();
            }
            
        } catch (error) {
            this.showError('Error menambah pengeluaran: ' + error.message);
        }
    }
    
    handlePeriodChange(event) {
        this.currentPeriod = event.target.value;
        
        const customPeriodDiv = document.getElementById('custom-period');
        if (customPeriodDiv) {
            if (this.currentPeriod === 'custom') {
                customPeriodDiv.style.display = 'block';
                // Set default custom dates (current month)
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                
                document.getElementById('finance-date-from').value = firstDay.toISOString().split('T')[0];
                document.getElementById('finance-date-to').value = lastDay.toISOString().split('T')[0];
            } else {
                customPeriodDiv.style.display = 'none';
            }
        }
        
        this.updateFinanceSummary();
    }
    
    updateFinanceSummary() {
        const { startDate, endDate } = this.getPeriodDates();
        
        // Filter data for the selected period
        const periodIncome = this.currentIncome.filter(income => {
            const incomeDate = new Date(income.date);
            return incomeDate >= startDate && incomeDate <= endDate;
        });
        
        const periodExpenses = this.currentExpenses.filter(expense => {
            const expenseDate = new Date(expense.expenseDate);
            return expenseDate >= startDate && expenseDate <= endDate;
        });
        
        // Calculate totals
        const totalIncome = periodIncome.reduce((sum, income) => sum + income.amount, 0);
        const totalExpense = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;
        
        // Update display
        const totalIncomeElement = document.getElementById('total-income');
        const totalExpenseElement = document.getElementById('total-expense');
        const netProfitElement = document.getElementById('net-profit');
        const incomeCountElement = document.getElementById('income-count');
        const expenseCountElement = document.getElementById('expense-count');
        const profitMarginElement = document.getElementById('profit-margin');
        
        if (totalIncomeElement) {
            totalIncomeElement.textContent = this.formatCurrency(totalIncome);
        }
        
        if (totalExpenseElement) {
            totalExpenseElement.textContent = this.formatCurrency(totalExpense);
        }
        
        if (netProfitElement) {
            netProfitElement.textContent = this.formatCurrency(netProfit);
            netProfitElement.style.color = netProfit >= 0 ? '#28a745' : '#dc3545';
        }
        
        if (incomeCountElement) {
            incomeCountElement.textContent = `${periodIncome.length} transaksi`;
        }
        
        if (expenseCountElement) {
            expenseCountElement.textContent = `${periodExpenses.length} transaksi`;
        }
        
        if (profitMarginElement) {
            profitMarginElement.textContent = `${profitMargin.toFixed(1)}% margin`;
        }
        
        // Update dashboard monthly income
        if (this.currentPeriod === 'month') {
            const monthlyIncomeElement = document.getElementById('monthly-income');
            if (monthlyIncomeElement) {
                monthlyIncomeElement.textContent = this.formatCurrency(totalIncome);
            }
        }
    }
    
    getPeriodDates() {
        const now = new Date();
        let startDate, endDate;
        
        switch (this.currentPeriod) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
                
            case 'week':
                const dayOfWeek = now.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
                endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
                
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
                
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear() + 1, 0, 1);
                break;
                
            case 'custom':
                const fromDate = document.getElementById('finance-date-from').value;
                const toDate = document.getElementById('finance-date-to').value;
                
                if (fromDate && toDate) {
                    startDate = new Date(fromDate);
                    endDate = new Date(toDate);
                    endDate.setDate(endDate.getDate() + 1); // Include the end date
                } else {
                    // Default to current month if dates not set
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                }
                break;
                
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        
        return { startDate, endDate };
    }
    
    displayIncomeData() {
        const incomeList = document.getElementById('income-list');
        if (!incomeList) return;
        
        if (this.currentIncome.length === 0) {
            incomeList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data pendapatan</td>
                </tr>
            `;
            return;
        }
        
        incomeList.innerHTML = this.currentIncome.map(income => `
            <tr>
                <td>${this.formatDate(income.date)}</td>
                <td>#${income.paymentId}</td>
                <td>${income.guestName}</td>
                <td>${this.getBookingTypeLabel(income.bookingType)}</td>
                <td>${this.formatCurrency(income.amount)}</td>
                <td>
                    <span class="source-badge">${this.getSourceLabel(income.source)}</span>
                </td>
            </tr>
        `).join('');
    }
    
    displayExpenseData() {
        const expenseList = document.getElementById('expense-list');
        if (!expenseList) return;
        
        if (this.currentExpenses.length === 0) {
            expenseList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data pengeluaran</td>
                </tr>
            `;
            return;
        }
        
        expenseList.innerHTML = this.currentExpenses.map(expense => `
            <tr>
                <td>${this.formatDate(expense.expenseDate)}</td>
                <td>${this.getCategoryLabel(expense.category)}</td>
                <td>${expense.description}</td>
                <td>${this.formatCurrency(expense.amount)}</td>
                <td>${expense.notes || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick="financeManager.editExpense(${expense.id})" title="Edit">
                        ✏️
                    </button>
                    <button class="action-btn delete" onclick="financeManager.deleteExpense(${expense.id})" title="Hapus">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    displayAllTransactions() {
        const transactionsList = document.getElementById('all-transactions-list');
        if (!transactionsList) return;
        
        if (this.allTransactions.length === 0) {
            transactionsList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data transaksi</td>
                </tr>
            `;
            return;
        }
        
        transactionsList.innerHTML = this.allTransactions.map(transaction => `
            <tr>
                <td>${this.formatDate(transaction.date)}</td>
                <td>
                    <span class="transaction-type ${transaction.type}">
                        ${transaction.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}
                    </span>
                </td>
                <td>${transaction.description}</td>
                <td class="income-cell">
                    ${transaction.income > 0 ? this.formatCurrency(transaction.income) : '-'}
                </td>
                <td class="expense-cell">
                    ${transaction.expense > 0 ? this.formatCurrency(transaction.expense) : '-'}
                </td>
                <td class="balance-cell ${transaction.balance >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(transaction.balance)}
                </td>
            </tr>
        `).join('');
    }
    
    async editExpense(id) {
        const expense = this.currentExpenses.find(e => e.id === id);
        if (!expense) return;
        
        // Fill form with existing data
        document.getElementById('expense-date').value = expense.expenseDate;
        document.getElementById('expense-category').value = expense.category;
        document.getElementById('expense-description').value = expense.description;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-notes').value = expense.notes;
        
        // Change form to edit mode
        const form = document.getElementById('add-expense-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Pengeluaran';
        
        // Store the expense ID for update
        form.dataset.editId = id;
        
        this.showAddExpenseForm();
    }
    
    async deleteExpense(id) {
        const expense = this.currentExpenses.find(e => e.id === id);
        if (!expense) return;
        
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalTitle.textContent = 'Konfirmasi Hapus';
        modalMessage.textContent = `Apakah Anda yakin ingin menghapus pengeluaran "${expense.description}" (${this.formatCurrency(expense.amount)})?`;
        
        modalConfirm.textContent = 'Hapus';
        modalConfirm.onclick = async () => {
            try {
                await window.dbManager.delete('expenses', id);
                this.showSuccess('Pengeluaran berhasil dihapus');
                await this.loadFinanceData();
                this.updateFinanceSummary();
                this.closeModal();
            } catch (error) {
                this.showError('Error menghapus pengeluaran: ' + error.message);
            }
        };
        
        this.showModal();
    }
    
    showFinanceTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.finance-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activate button
        event.target.classList.add('active');
    }
    
    // Helper methods
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
    
    getSourceLabel(source) {
        const labels = {
            'accommodation': 'Penginapan',
            'food': 'Makanan',
            'additional': 'Tambahan'
        };
        return labels[source] || source;
    }
    
    showAddExpenseForm() {
        const form = document.getElementById('expense-form');
        if (form) {
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    hideAddExpenseForm() {
        const form = document.getElementById('expense-form');
        const addForm = document.getElementById('add-expense-form');
        
        if (form) {
            form.style.display = 'none';
        }
        
        if (addForm) {
            // Reset form to add mode
            const submitBtn = addForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Simpan Pengeluaran';
            delete addForm.dataset.editId;
        }
    }
    
    showModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
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
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
}

// Global functions for HTML onclick events
window.showAddExpenseForm = () => {
    if (window.financeManager) {
        window.financeManager.showAddExpenseForm();
    }
};

window.hideAddExpenseForm = () => {
    if (window.financeManager) {
        window.financeManager.hideAddExpenseForm();
    }
};

window.updateFinanceSummary = () => {
    if (window.financeManager) {
        window.financeManager.updateFinanceSummary();
    }
};

window.showFinanceTab = (tabName) => {
    if (window.financeManager) {
        window.financeManager.showFinanceTab(tabName);
    }
};

// Initialize finance manager
// Initialize FinanceManager after database is ready
(async function initFinanceManager() {
    try {
        await waitForDatabase();
        window.financeManager = new FinanceManager();
    } catch (error) {
        console.error('Failed to initialize FinanceManager:', error);
    }
})();
/**
 * Database Layer for SikaBu View
 * Handles SQLite connection with fallback to IndexedDB/localStorage
 */

class DatabaseManager {
    constructor() {
        this.dbType = null;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.dbName = 'sikabuview_db';
        this.dbVersion = 2; // Increment version to trigger upgrade
        this.isReady = false;
        this.readyPromise = null;
        
        // Initialize database
        this.readyPromise = this.init();
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.checkDatabaseConnection();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.switchToLocalDB();
        });
    }
    
    async init() {
        try {
            // Try SQLite first (if available via backend)
            await this.initSQLite();
        } catch (error) {
            console.log('SQLite not available, switching to IndexedDB');
            await this.initIndexedDB();
        }
        this.isReady = true;
        return this;
    }
    
    async initSQLite() {
        // Check if SQLite backend is available
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.dbType = 'sqlite';
                console.log('Connected to SQLite database');
                await this.createSQLiteTables();
            } else {
                throw new Error('SQLite backend not available');
            }
        } catch (error) {
            throw new Error('SQLite connection failed');
        }
    }
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB failed, falling back to localStorage');
                this.initLocalStorage();
                resolve();
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.dbType = 'indexeddb';
                console.log('Connected to IndexedDB');
                // Initialize default data after connection
                this.initializeDefaultData();
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createIndexedDBStores(db);
            };
        });
    }
    
    initLocalStorage() {
        this.dbType = 'localstorage';
        console.log('Using localStorage');
        
        // Initialize localStorage structure if not exists
        const tables = ['bookings', 'payments', 'expenses', 'settings', 'rooms', 'guests', 'tasks', 'inventory'];
        tables.forEach(table => {
            if (!localStorage.getItem(table)) {
                localStorage.setItem(table, JSON.stringify([]));
            }
        });

        // Add default rooms if none exist
        this.initializeDefaultData();
        this.isReady = true;
    }

    async initializeDefaultData() {
        try {
            // Check if rooms already exist
            const rooms = await this.select('rooms');
            if (!rooms || rooms.length === 0) {
                // Add default rooms
                const defaultRooms = [
                    {
                        id: 'RM001',
                        type: 'kamar',
                        number: '101',
                        capacity: 2,
                        price: 150000,
                        facilities: 'AC, TV, Kamar Mandi Dalam',
                        description: 'Kamar standar dengan fasilitas lengkap',
                        status: 'available',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'RM002',
                        type: 'kamar',
                        number: '102',
                        capacity: 2,
                        price: 150000,
                        facilities: 'AC, TV, Kamar Mandi Dalam',
                        description: 'Kamar standar dengan fasilitas lengkap',
                        status: 'available',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'VL001',
                        type: 'villa',
                        number: 'Villa A',
                        capacity: 6,
                        price: 500000,
                        facilities: 'AC, TV, Dapur, Ruang Tamu, 2 Kamar Tidur',
                        description: 'Villa keluarga dengan fasilitas lengkap',
                        status: 'available',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'CP001',
                        type: 'camping',
                        number: 'Camp Area 1',
                        capacity: 4,
                        price: 50000,
                        facilities: 'Area Tenda, Listrik, Kamar Mandi Umum',
                        description: 'Area camping dengan fasilitas dasar',
                        status: 'available',
                        createdAt: new Date().toISOString()
                    }
                ];

                for (const room of defaultRooms) {
                    await this.insert('rooms', room);
                }
                console.log('Default rooms initialized');
            }
        } catch (error) {
            console.error('Error initializing default data:', error);
        }
    }
    
    createIndexedDBStores(db) {
        // Bookings store
        if (!db.objectStoreNames.contains('bookings')) {
            const bookingStore = db.createObjectStore('bookings', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            bookingStore.createIndex('guestId', 'guestId', { unique: false });
            bookingStore.createIndex('bookingDate', 'bookingDate', { unique: false });
            bookingStore.createIndex('status', 'status', { unique: false });
        }
        
        // Payments store
        if (!db.objectStoreNames.contains('payments')) {
            const paymentStore = db.createObjectStore('payments', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            paymentStore.createIndex('bookingId', 'bookingId', { unique: false });
            paymentStore.createIndex('paymentDate', 'paymentDate', { unique: false });
        }
        
        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
            const expenseStore = db.createObjectStore('expenses', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            expenseStore.createIndex('category', 'category', { unique: false });
            expenseStore.createIndex('expenseDate', 'expenseDate', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Rooms store
        if (!db.objectStoreNames.contains('rooms')) {
            const roomStore = db.createObjectStore('rooms', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            roomStore.createIndex('type', 'type', { unique: false });
            roomStore.createIndex('status', 'status', { unique: false });
            roomStore.createIndex('number', 'number', { unique: true });
        }

        // Guests store
        if (!db.objectStoreNames.contains('guests')) {
            const guestStore = db.createObjectStore('guests', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            guestStore.createIndex('name', 'name', { unique: false });
            guestStore.createIndex('phone', 'phone', { unique: false });
            guestStore.createIndex('idCard', 'idCard', { unique: true });
        }

        // Tasks store (for housekeeping)
        if (!db.objectStoreNames.contains('tasks')) {
            const taskStore = db.createObjectStore('tasks', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            taskStore.createIndex('type', 'type', { unique: false });
            taskStore.createIndex('status', 'status', { unique: false });
            taskStore.createIndex('priority', 'priority', { unique: false });
            taskStore.createIndex('roomId', 'roomId', { unique: false });
        }

        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
            const inventoryStore = db.createObjectStore('inventory', { 
                keyPath: 'id',
                autoIncrement: false 
            });
            inventoryStore.createIndex('item', 'item', { unique: false });
            inventoryStore.createIndex('category', 'category', { unique: false });
        }
    }
    
    async createSQLiteTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guestId TEXT NOT NULL,
                guestName TEXT NOT NULL,
                guestPhone TEXT NOT NULL,
                bookingDate DATE NOT NULL,
                checkinDate DATE NOT NULL,
                checkoutDate DATE NOT NULL,
                bookingType TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                totalPrice DECIMAL(10,2) NOT NULL,
                notes TEXT,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bookingId INTEGER NOT NULL,
                accommodationCost DECIMAL(10,2) NOT NULL,
                additionalCost DECIMAL(10,2) DEFAULT 0,
                totalAmount DECIMAL(10,2) NOT NULL,
                paymentMethod TEXT NOT NULL,
                paymentDate DATETIME NOT NULL,
                notes TEXT,
                additionalOrders TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bookingId) REFERENCES bookings(id)
            )`,
            `CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expenseDate DATE NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        for (const table of tables) {
            await this.executeSQLite(table);
        }
    }
    
    async executeSQLite(query, params = []) {
        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, params })
            });
            
            if (!response.ok) {
                throw new Error('SQLite query failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('SQLite execution error:', error);
            throw error;
        }
    }
    
    // Generic CRUD operations
    async insert(table, data) {
        try {
            // Wait for database to be ready
            if (!this.isReady) {
                await this.readyPromise;
            }
            
            switch (this.dbType) {
                case 'sqlite':
                    return await this.insertSQLite(table, data);
                case 'indexeddb':
                    return await this.insertIndexedDB(table, data);
                case 'localstorage':
                    return this.insertLocalStorage(table, data);
                default:
                    throw new Error('No database available');
            }
        } catch (error) {
            console.error('Insert error:', error);
            throw error;
        }
    }
    
    async select(table, conditions = {}, orderBy = null, limit = null) {
        try {
            // Wait for database to be ready
            if (!this.isReady) {
                await this.readyPromise;
            }
            
            switch (this.dbType) {
                case 'sqlite':
                    return await this.selectSQLite(table, conditions, orderBy, limit);
                case 'indexeddb':
                    return await this.selectIndexedDB(table, conditions, orderBy, limit);
                case 'localstorage':
                    return this.selectLocalStorage(table, conditions, orderBy, limit);
                default:
                    throw new Error('No database available');
            }
        } catch (error) {
            console.error('Select error:', error);
            throw error;
        }
    }
    
    async update(table, id, data) {
        try {
            // Wait for database to be ready
            if (!this.isReady) {
                await this.readyPromise;
            }
            
            switch (this.dbType) {
                case 'sqlite':
                    return await this.updateSQLite(table, id, data);
                case 'indexeddb':
                    return await this.updateIndexedDB(table, id, data);
                case 'localstorage':
                    return this.updateLocalStorage(table, id, data);
                default:
                    throw new Error('No database available');
            }
        } catch (error) {
            console.error('Update error:', error);
            throw error;
        }
    }
    
    async delete(table, id) {
        try {
            // Wait for database to be ready
            if (!this.isReady) {
                await this.readyPromise;
            }
            
            switch (this.dbType) {
                case 'sqlite':
                    return await this.deleteSQLite(table, id);
                case 'indexeddb':
                    return await this.deleteIndexedDB(table, id);
                case 'localstorage':
                    return this.deleteLocalStorage(table, id);
                default:
                    throw new Error('No database available');
            }
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }
    
    // SQLite implementations
    async insertSQLite(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(',');
        
        const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
        const result = await this.executeSQLite(query, values);
        return result.lastInsertRowid || result.insertId;
    }
    
    async selectSQLite(table, conditions = {}, orderBy = null, limit = null) {
        let query = `SELECT * FROM ${table}`;
        const params = [];
        
        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions).map(key => {
                params.push(conditions[key]);
                return `${key} = ?`;
            }).join(' AND ');
            query += ` WHERE ${whereClause}`;
        }
        
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        
        const result = await this.executeSQLite(query, params);
        return result.rows || result;
    }
    
    async updateSQLite(table, id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(',');
        
        const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
        values.push(id);
        
        return await this.executeSQLite(query, values);
    }
    
    async deleteSQLite(table, id) {
        const query = `DELETE FROM ${table} WHERE id = ?`;
        return await this.executeSQLite(query, [id]);
    }
    
    // IndexedDB implementations
    async insertIndexedDB(table, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite');
            const store = transaction.objectStore(table);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async selectIndexedDB(table, conditions = {}, orderBy = null, limit = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readonly');
            const store = transaction.objectStore(table);
            const request = store.getAll();
            
            request.onsuccess = () => {
                let results = request.result;
                
                // Apply conditions
                if (Object.keys(conditions).length > 0) {
                    results = results.filter(item => {
                        return Object.keys(conditions).every(key => 
                            item[key] === conditions[key]
                        );
                    });
                }
                
                // Apply ordering
                if (orderBy) {
                    const [field, direction = 'ASC'] = orderBy.split(' ');
                    results.sort((a, b) => {
                        const aVal = a[field];
                        const bVal = b[field];
                        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                        return direction.toUpperCase() === 'DESC' ? -comparison : comparison;
                    });
                }
                
                // Apply limit
                if (limit) {
                    results = results.slice(0, limit);
                }
                
                resolve(results);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateIndexedDB(table, id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite');
            const store = transaction.objectStore(table);
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const existingData = getRequest.result;
                if (existingData) {
                    const updatedData = { ...existingData, ...data };
                    const updateRequest = store.put(updatedData);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Record not found'));
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }
    
    async deleteIndexedDB(table, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite');
            const store = transaction.objectStore(table);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // localStorage implementations
    insertLocalStorage(table, data) {
        const records = JSON.parse(localStorage.getItem(table) || '[]');
        const id = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;
        const newRecord = { id, ...data };
        records.push(newRecord);
        localStorage.setItem(table, JSON.stringify(records));
        return id;
    }
    
    selectLocalStorage(table, conditions = {}, orderBy = null, limit = null) {
        let records = JSON.parse(localStorage.getItem(table) || '[]');
        
        // Apply conditions
        if (Object.keys(conditions).length > 0) {
            records = records.filter(record => {
                return Object.keys(conditions).every(key => 
                    record[key] === conditions[key]
                );
            });
        }
        
        // Apply ordering
        if (orderBy) {
            const [field, direction = 'ASC'] = orderBy.split(' ');
            records.sort((a, b) => {
                const aVal = a[field];
                const bVal = b[field];
                const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return direction.toUpperCase() === 'DESC' ? -comparison : comparison;
            });
        }
        
        // Apply limit
        if (limit) {
            records = records.slice(0, limit);
        }
        
        return records;
    }
    
    updateLocalStorage(table, id, data) {
        const records = JSON.parse(localStorage.getItem(table) || '[]');
        const index = records.findIndex(record => record.id === id);
        
        if (index !== -1) {
            records[index] = { ...records[index], ...data };
            localStorage.setItem(table, JSON.stringify(records));
            return true;
        }
        
        return false;
    }
    
    deleteLocalStorage(table, id) {
        const records = JSON.parse(localStorage.getItem(table) || '[]');
        const filteredRecords = records.filter(record => record.id !== id);
        localStorage.setItem(table, JSON.stringify(filteredRecords));
        return true;
    }
    
    // Utility methods
    async checkDatabaseConnection() {
        try {
            if (this.isOnline) {
                await this.initSQLite();
            }
        } catch (error) {
            console.log('SQLite still not available');
        }
        
        return {
            type: this.dbType,
            online: this.isOnline,
            connected: this.db !== null || this.dbType === 'localstorage'
        };
    }
    
    async switchToLocalDB() {
        if (this.dbType !== 'localstorage') {
            console.log('Switching to local database due to connectivity issues');
            await this.initIndexedDB();
        }
    }
    
    async exportData() {
        const data = {};
        const tables = ['bookings', 'payments', 'expenses', 'settings'];
        
        for (const table of tables) {
            try {
                data[table] = await this.select(table);
            } catch (error) {
                console.error(`Error exporting ${table}:`, error);
                data[table] = [];
            }
        }
        
        return {
            exportDate: new Date().toISOString(),
            dbType: this.dbType,
            data: data
        };
    }
    
    async importData(importData) {
        try {
            // Validate import data
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Invalid import data format');
            }
            
            const tables = ['bookings', 'payments', 'expenses', 'settings'];
            
            for (const table of tables) {
                if (importData.data[table] && Array.isArray(importData.data[table])) {
                    // Clear existing data
                    const existingRecords = await this.select(table);
                    for (const record of existingRecords) {
                        await this.delete(table, record.id);
                    }
                    
                    // Insert imported data
                    for (const record of importData.data[table]) {
                        const { id, ...dataWithoutId } = record;
                        await this.insert(table, dataWithoutId);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }
    
    async clearAllData() {
        const tables = ['bookings', 'payments', 'expenses'];
        
        for (const table of tables) {
            try {
                const records = await this.select(table);
                for (const record of records) {
                    await this.delete(table, record.id);
                }
            } catch (error) {
                console.error(`Error clearing ${table}:`, error);
            }
        }
        
        return true;
    }
    
    getStatus() {
        return {
            type: this.dbType,
            online: this.isOnline,
            connected: this.db !== null || this.dbType === 'localstorage',
            ready: this.isReady
        };
    }
}

// Initialize global database instance and wait for it to be ready
(async function() {
    window.dbManager = new DatabaseManager();
    await window.dbManager.readyPromise;
    console.log('Database manager ready:', window.dbManager.getStatus());
})();
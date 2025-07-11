// Configurazione Firebase con gestione errori migliorata e ottimizzazioni
const SYSTEM_VERSION = '1.0.2';

const firebaseConfig = {
    apiKey: "AIzaSyA5l7kO0FiNP0DgYxkCyNn6A-aABQeDBAo",
    authDomain: "prenotazioni-52007.firebaseapp.com",
    projectId: "prenotazioni-52007",
    storageBucket: "prenotazioni-52007.firebasestorage.app",
    messagingSenderId: "38626524066",
    appId: "1:38626524066:web:6d01b3f338abaac3a790fb",
    measurementId: "G-QTCPJ46646"
};

// Utility function for safe logging - VERSIONE UNICA OTTIMIZZATA
function safeLog(level, message, data = null) {
    try {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [FIREBASE-${level.toUpperCase()}] [v${SYSTEM_VERSION}] ${message}`;
        
        // Ottimizzazione: usa console.table per oggetti complessi
        if (data && typeof data === 'object' && Object.keys(data).length > 3) {
            console.groupCollapsed(logMessage);
            console.table(data);
            console.groupEnd();
            return;
        }
        
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'info':
                console.info(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    } catch (e) {
        console.error('Error in logging function:', e);
    }
}

// Initialize Firebase with error handling
let db = null;
let isFirebaseInitialized = false;

try {
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
    }

    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseInitialized = true;
    safeLog('info', 'Firebase initialized successfully');
} catch (error) {
    safeLog('error', 'Failed to initialize Firebase', error);
    isFirebaseInitialized = false;
}

// Setup offline persistence with error handling
if (isFirebaseInitialized && db) {
    db.enablePersistence()
        .then(() => {
            safeLog('info', 'Firebase offline persistence enabled');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                safeLog('warn', 'Multiple tabs open, persistence can only be enabled in one tab at a time');
            } else if (err.code === 'unimplemented') {
                safeLog('warn', 'The current browser does not support all features required for persistence');
            } else {
                safeLog('error', 'Failed to enable persistence', err);
            }
        });
}

// Database manager ottimizzato per gestire operazioni Firebase
class DatabaseManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isFirebaseReady = isFirebaseInitialized;
        this.retryAttempts = 3;
        this.baseRetryDelay = 1000; // Base delay per exponential backoff
        this.maxRetryDelay = 10000; // Massimo delay
        this.operationTimeout = this.getConfigurableTimeout();
        
        // OTTIMIZZAZIONE: Gestione concorrenza migliorata
        this.activeSaves = new Map(); // Track active save operations
        this.saveQueue = new Map(); // Queue per operazioni in attesa
        this.connectionQuality = 'good'; // good, poor, offline
        
        // OTTIMIZZAZIONE: Cache per ridurre chiamate Firebase
        this.bookingsCache = new Map();
        this.settingsCache = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minuti
        
        this.setupConnectionMonitoring();
        this.setupPerformanceMonitoring();
        
        safeLog('info', 'DatabaseManager initialized with optimizations', { 
            isOnline: this.isOnline, 
            isFirebaseReady: this.isFirebaseReady,
            cacheEnabled: true
        });
    }
    
    getConfigurableTimeout() {
        try {
            // Ottimizzazione: timeout adattivo basato sulla qualità della connessione
            const baseTimeout = parseInt(process?.env?.FIREBASE_TIMEOUT) || 10000;
            return this.connectionQuality === 'poor' ? baseTimeout * 2 : baseTimeout;
        } catch {
            return 10000;
        }
    }

    // OTTIMIZZAZIONE: Monitoraggio performance
    setupPerformanceMonitoring() {
        try {
            // Monitora la qualità della connessione
            if ('connection' in navigator) {
                const connection = navigator.connection;
                this.updateConnectionQuality(connection.effectiveType);
                
                connection.addEventListener('change', () => {
                    this.updateConnectionQuality(connection.effectiveType);
                });
            }
        } catch (error) {
            safeLog('warn', 'Performance monitoring not available', error);
        }
    }

    updateConnectionQuality(effectiveType) {
        const qualityMap = {
            'slow-2g': 'poor',
            '2g': 'poor',
            '3g': 'good',
            '4g': 'good'
        };
        
        this.connectionQuality = qualityMap[effectiveType] || 'good';
        this.operationTimeout = this.getConfigurableTimeout();
        
        safeLog('debug', 'Connection quality updated', { 
            effectiveType, 
            quality: this.connectionQuality,
            timeout: this.operationTimeout
        });
    }

    setupConnectionMonitoring() {
        try {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.connectionQuality = 'good';
                safeLog('info', 'Connection restored');
                this.updateConnectionStatus('online');
                this.processQueuedOperations(); // OTTIMIZZAZIONE: Processa operazioni in coda
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.connectionQuality = 'offline';
                safeLog('warn', 'Connection lost');
                this.updateConnectionStatus('offline');
            });

            // Initial connection status
            this.updateConnectionStatus(this.isOnline ? 'online' : 'offline');

            // Monitor Firebase connection if available
            if (this.isFirebaseReady && db) {
                db.enableNetwork().then(() => {
                    safeLog('info', 'Firebase network enabled');
                    this.updateConnectionStatus('online');
                }).catch((error) => {
                    safeLog('error', 'Failed to enable Firebase network', error);
                    this.updateConnectionStatus('offline');
                });
            }
        } catch (error) {
            safeLog('error', 'Error setting up connection monitoring', error);
        }
    }

    // OTTIMIZZAZIONE: Processa operazioni in coda quando torna online
    async processQueuedOperations() {
        if (this.saveQueue.size === 0) return;
        
        safeLog('info', `Processing ${this.saveQueue.size} queued operations`);
        
        for (const [key, operation] of this.saveQueue) {
            try {
                await operation.execute();
                this.saveQueue.delete(key);
                safeLog('debug', 'Queued operation processed', { key });
            } catch (error) {
                safeLog('error', 'Failed to process queued operation', { key, error: error.message });
            }
        }
    }

    updateConnectionStatus(status) {
        try {
            const statusElement = document.getElementById('connectionStatus');
            if (!statusElement) return;
            
            // OTTIMIZZAZIONE: Evita aggiornamenti DOM inutili
            const currentClass = statusElement.className;
            const newClass = `connection-status ${status}`;
            
            if (currentClass === newClass) return;
            
            switch (status) {
                case 'online':
                    statusElement.className = newClass;
                    statusElement.textContent = '🟢 Online';
                    break;
                case 'syncing':
                    statusElement.className = newClass;
                    statusElement.textContent = '🔄 Sincronizzazione...';
                    break;
                case 'offline':
                default:
                    statusElement.className = newClass;
                    statusElement.textContent = '🔴 Offline';
                    break;
            }
        } catch (error) {
            safeLog('error', 'Error updating connection status', error);
        }
    }

    // OTTIMIZZAZIONE: Timeout con exponential backoff
    withTimeout(promise, timeoutMs = this.operationTimeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operation timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    }

    // OTTIMIZZAZIONE: Exponential backoff per retry
    calculateRetryDelay(attempt) {
        const delay = Math.min(
            this.baseRetryDelay * Math.pow(2, attempt - 1),
            this.maxRetryDelay
        );
        
        // Aggiungi jitter per evitare thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
    }

    // Validazione ottimizzata con cache
    validateBookingData(booking) {
        try {
            if (!booking || typeof booking !== 'object') {
                throw new Error('Booking must be an object');
            }

            const required = ['firstName', 'lastName', 'email', 'phone', 'date', 'time'];
            const missing = required.filter(field => !booking[field]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }

            // OTTIMIZZAZIONE: Cache regex per performance
            if (!this._emailRegex) {
                this._emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            }
            if (!this._dateRegex) {
                this._dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            }
            if (!this._timeRegex) {
                this._timeRegex = /^\d{2}:\d{2}$/;
            }

            if (!this._emailRegex.test(booking.email)) {
                throw new Error('Invalid email format');
            }

            if (!this._dateRegex.test(booking.date)) {
                throw new Error('Invalid date format (expected YYYY-MM-DD)');
            }

            // OTTIMIZZAZIONE: Validazione data più robusta
            const dateObj = new Date(booking.date + 'T00:00:00');
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date value');
            }

            // Verifica che la data sia realmente valida (non 30 febbraio)
            const [year, month, day] = booking.date.split('-').map(Number);
            if (dateObj.getFullYear() !== year || 
                dateObj.getMonth() !== month - 1 || 
                dateObj.getDate() !== day) {
                throw new Error('Invalid date (e.g., February 30th)');
            }

            if (!this._timeRegex.test(booking.time)) {
                throw new Error('Invalid time format (expected HH:MM)');
            }

            return true;
        } catch (error) {
            safeLog('error', 'Booking validation failed', { booking, error: error.message });
            throw error;
        }
    }

    // OTTIMIZZAZIONE: ID generation più robusto
    generateBookingId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        const counter = (this._idCounter = (this._idCounter || 0) + 1).toString(36);
        return `${timestamp}-${random}-${counter}`;
    }

    // OTTIMIZZAZIONE: Cache per esistenza booking
    async bookingExists(bookingId) {
        try {
            if (!bookingId) return false;
            
            // Controlla cache prima
            if (this.bookingsCache.has(bookingId)) {
                const cached = this.bookingsCache.get(bookingId);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return true;
                }
            }
            
            const doc = await this.withTimeout(
                db.collection('bookings').doc(bookingId).get()
            );
            
            const exists = doc.exists;
            
            // Aggiorna cache
            if (exists) {
                this.bookingsCache.set(bookingId, {
                    exists: true,
                    timestamp: Date.now()
                });
            }
            
            return exists;
        } catch (error) {
            safeLog('warn', 'Error checking if booking exists', { bookingId, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Gestione concorrenza migliorata per salvataggio
    async saveBooking(booking) {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for saveBooking');
            return { success: false, error: 'Database not available' };
        }

        // OTTIMIZZAZIONE: Prevenzione race condition
        const saveKey = booking.id || `new_${Date.now()}`;
        
        if (this.activeSaves.has(saveKey)) {
            safeLog('warn', 'Save operation already in progress', { id: saveKey });
            return { success: false, error: 'Save operation already in progress' };
        }

        this.activeSaves.set(saveKey, Date.now());

        try {
            this.updateConnectionStatus('syncing');
            
            // Validate booking data
            this.validateBookingData(booking);
            
            // OTTIMIZZAZIONE: Logica semplificata per determinare operazione
            const isUpdate = booking.id && await this.bookingExists(booking.id);
            const operation = isUpdate ? 'UPDATE' : 'CREATE';
            
            safeLog('info', 'Saving booking', { 
                id: booking.id || 'new', 
                operation
            });
            
            const bookingData = this.prepareBookingForFirestore(booking);
            let savedBookingId = booking.id;
            
            // OTTIMIZZAZIONE: Retry con exponential backoff
            let lastError = null;
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    if (operation === 'CREATE') {
                        if (savedBookingId) {
                            // Create con ID specifico
                            await this.withTimeout(
                                db.collection('bookings').doc(savedBookingId).set({
                                    ...bookingData,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                })
                            );
                        } else {
                            // Create nuovo documento
                            const docRef = await this.withTimeout(
                                db.collection('bookings').add({
                                    ...bookingData,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                })
                            );
                            savedBookingId = docRef.id;
                        }
                    } else {
                        // Update esistente
                        const { id, createdAt, ...updateData } = bookingData;
                        await this.withTimeout(
                            db.collection('bookings').doc(booking.id).update({
                                ...updateData,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            })
                        );
                    }
                    
                    // OTTIMIZZAZIONE: Aggiorna cache
                    this.bookingsCache.set(savedBookingId, {
                        data: bookingData,
                        timestamp: Date.now()
                    });
                    
                    this.updateConnectionStatus('online');
                    safeLog('info', 'Booking saved successfully', { id: savedBookingId, operation });
                    return { success: true, id: savedBookingId };
                    
                } catch (error) {
                    lastError = error;
                    safeLog('warn', `Save attempt ${attempt} failed`, { 
                        id: savedBookingId, 
                        error: error.message,
                        attempt
                    });
                    
                    if (attempt < this.retryAttempts) {
                        const delay = this.calculateRetryDelay(attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            throw lastError;
            
        } catch (error) {
            safeLog('error', 'Failed to save booking after all attempts', { 
                booking: booking.id || 'new', 
                error: error.message 
            });
            
            // OTTIMIZZAZIONE: Aggiungi alla coda se offline
            if (!this.isOnline) {
                this.saveQueue.set(saveKey, {
                    execute: () => this.saveBooking(booking),
                    booking,
                    timestamp: Date.now()
                });
                safeLog('info', 'Booking queued for later processing', { id: saveKey });
            }
            
            this.updateConnectionStatus('offline');
            return { success: false, error: error.message };
        } finally {
            this.activeSaves.delete(saveKey);
        }
    }

    prepareBookingForFirestore(booking) {
        try {
            const prepared = {
                firstName: String(booking.firstName || '').trim(),
                lastName: String(booking.lastName || '').trim(),
                email: String(booking.email || '').trim().toLowerCase(),
                phone: String(booking.phone || '').trim(),
                date: String(booking.date || '').trim(),
                time: String(booking.time || '').trim(),
                status: String(booking.status || 'pending').trim(),
                notes: String(booking.notes || '').trim(),
                duration: Math.max(15, Math.min(480, parseInt(booking.duration) || 30)),
                color: String(booking.color || '#8b5cf6').trim()
            };

            // Ensure status is valid
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'old'];
            if (!validStatuses.includes(prepared.status)) {
                prepared.status = 'pending';
            }

            // Handle dates for updates
            if (booking.id && booking.createdAt) {
                prepared.createdAt = firebase.firestore.Timestamp.fromDate(
                    booking.createdAt instanceof Date ? booking.createdAt : new Date(booking.createdAt)
                );
            }

            // Only include ID if it exists (for updates)
            if (booking.id) {
                prepared.id = booking.id;
            }

            return prepared;
        } catch (error) {
            safeLog('error', 'Error preparing booking for Firestore', error);
            throw new Error('Failed to prepare booking data');
        }
    }

    // OTTIMIZZAZIONE: Load con cache intelligente
    async loadBookings() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for loadBookings');
            return [];
        }

        try {
            this.updateConnectionStatus('syncing');
            
            safeLog('info', 'Loading bookings from Firestore');
            
            const snapshot = await this.withTimeout(
                db.collection('bookings')
                    .orderBy('createdAt', 'desc')
                    .get()
            );
            
            const bookings = [];
            
            snapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const booking = this.processBookingFromFirestore(doc.id, data);
                    if (booking) {
                        bookings.push(booking);
                        // OTTIMIZZAZIONE: Aggiorna cache
                        this.bookingsCache.set(doc.id, {
                            data: booking,
                            timestamp: Date.now()
                        });
                    }
                } catch (error) {
                    safeLog('warn', 'Error processing booking document', { docId: doc.id, error: error.message });
                }
            });
            
            this.updateConnectionStatus('online');
            safeLog('info', `Loaded ${bookings.length} bookings successfully`);
            return bookings;
            
        } catch (error) {
            safeLog('error', 'Failed to load bookings', error);
            this.updateConnectionStatus('offline');
            return [];
        }
    }

    processBookingFromFirestore(docId, data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid booking data');
            }

            const booking = {
                id: docId,
                firstName: String(data.firstName || ''),
                lastName: String(data.lastName || ''),
                email: String(data.email || ''),
                phone: String(data.phone || ''),
                date: String(data.date || ''),
                time: String(data.time || ''),
                status: String(data.status || 'pending'),
                notes: String(data.notes || ''),
                duration: parseInt(data.duration) || 30,
                color: String(data.color || '#8b5cf6'),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            };

            // Validate essential fields
            if (!booking.firstName || !booking.lastName || !booking.email || !booking.date || !booking.time) {
                throw new Error('Missing essential booking fields');
            }

            return booking;
        } catch (error) {
            safeLog('error', 'Error processing booking from Firestore', { docId, error: error.message });
            return null;
        }
    }

    // OTTIMIZZAZIONE: Delete con cache cleanup
    async deleteBooking(id) {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for deleteBooking');
            return { success: false, error: 'Database not available' };
        }

        if (!id || typeof id !== 'string') {
            safeLog('error', 'Invalid booking ID for deletion', id);
            return { success: false, error: 'Invalid booking ID' };
        }

        try {
            this.updateConnectionStatus('syncing');
            
            let lastError = null;
            
            // Retry con exponential backoff
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    safeLog('info', `Deleting booking attempt ${attempt}`, { id });
                    
                    await this.withTimeout(
                        db.collection('bookings').doc(id).delete()
                    );
                    
                    // OTTIMIZZAZIONE: Pulisci cache
                    this.bookingsCache.delete(id);
                    
                    this.updateConnectionStatus('online');
                    safeLog('info', 'Booking deleted successfully', { id });
                    return { success: true };
                    
                } catch (error) {
                    lastError = error;
                    safeLog('warn', `Delete attempt ${attempt} failed`, { id, error: error.message });
                    
                    if (attempt < this.retryAttempts) {
                        const delay = this.calculateRetryDelay(attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            throw lastError;
            
        } catch (error) {
            safeLog('error', 'Failed to delete booking after all attempts', { id, error: error.message });
            this.updateConnectionStatus('offline');
            return { success: false, error: error.message };
        }
    }

    // OTTIMIZZAZIONE: Settings con cache
    async saveSettings(settings) {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for saveSettings');
            throw new Error('Database not available');
        }

        try {
            this.updateConnectionStatus('syncing');
            
            if (!settings || typeof settings !== 'object') {
                throw new Error('Invalid settings object');
            }
            
            safeLog('info', 'Saving settings to Firestore');
            
            await this.withTimeout(
                db.collection('settings').doc('main').set({
                    ...settings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );
            
            // OTTIMIZZAZIONE: Aggiorna cache settings
            this.settingsCache = {
                data: settings,
                timestamp: Date.now()
            };
            
            this.updateConnectionStatus('online');
            safeLog('info', 'Settings saved successfully');
            return { success: true };
            
        } catch (error) {
            safeLog('error', 'Failed to save settings', error);
            this.updateConnectionStatus('offline');
            throw error;
        }
    }

    // OTTIMIZZAZIONE: Load settings con cache
    async loadSettings() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for loadSettings');
            return null;
        }

        try {
            // OTTIMIZZAZIONE: Controlla cache prima
            if (this.settingsCache && 
                Date.now() - this.settingsCache.timestamp < this.cacheExpiry) {
                safeLog('debug', 'Settings loaded from cache');
                return this.settingsCache.data;
            }
            
            this.updateConnectionStatus('syncing');
            
            safeLog('info', 'Loading settings from Firestore');
            
            const doc = await this.withTimeout(
                db.collection('settings').doc('main').get()
            );
            
            this.updateConnectionStatus('online');
            
            if (doc.exists) {
                const settings = doc.data();
                
                // OTTIMIZZAZIONE: Aggiorna cache
                this.settingsCache = {
                    data: settings,
                    timestamp: Date.now()
                };
                
                safeLog('info', 'Settings loaded successfully');
                return settings;
            } else {
                safeLog('info', 'No settings document found');
                return null;
            }
            
        } catch (error) {
            safeLog('error', 'Failed to load settings', error);
            this.updateConnectionStatus('offline');
            return null;
        }
    }

    // OTTIMIZZAZIONE: Real-time listener con gestione memoria
    onBookingsChange(callback) {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for real-time listener');
            return null;
        }

        if (typeof callback !== 'function') {
            safeLog('error', 'onBookingsChange called with non-function callback');
            return null;
        }

        try {
            safeLog('info', 'Setting up real-time bookings listener');
            
            const unsubscribe = db.collection('bookings')
                .orderBy('createdAt', 'desc')
                .onSnapshot(
                    snapshot => {
                        try {
                            const bookings = [];
                            
                            snapshot.forEach(doc => {
                                try {
                                    const booking = this.processBookingFromFirestore(doc.id, doc.data());
                                    if (booking) {
                                        bookings.push(booking);
                                        // OTTIMIZZAZIONE: Aggiorna cache in real-time
                                        this.bookingsCache.set(doc.id, {
                                            data: booking,
                                            timestamp: Date.now()
                                        });
                                    }
                                } catch (error) {
                                    safeLog('warn', 'Error processing booking in real-time update', { docId: doc.id, error: error.message });
                                }
                            });
                            
                            safeLog('info', `Real-time update: ${bookings.length} bookings`);
                            callback(bookings);
                            
                        } catch (error) {
                            safeLog('error', 'Error processing real-time snapshot', error);
                            callback([]);
                        }
                    },
                    error => {
                        safeLog('error', 'Real-time listener error', error);
                        this.updateConnectionStatus('offline');
                        callback([]);
                    }
                );
            
            // OTTIMIZZAZIONE: Restituisci funzione di cleanup
            return () => {
                try {
                    unsubscribe();
                    safeLog('info', 'Real-time listener unsubscribed');
                } catch (error) {
                    safeLog('error', 'Error unsubscribing real-time listener', error);
                }
            };
                
        } catch (error) {
            safeLog('error', 'Error setting up real-time listener', error);
            return null;
        }
    }

    // OTTIMIZZAZIONE: Force sync migliorato
    async forceSync() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for forceSync');
            return false;
        }

        try {
            this.updateConnectionStatus('syncing');
            
            safeLog('info', 'Forcing network sync');
            
            // OTTIMIZZAZIONE: Pulisci cache durante force sync
            this.bookingsCache.clear();
            this.settingsCache = null;
            
            await this.withTimeout(db.enableNetwork());
            
            this.updateConnectionStatus('online');
            safeLog('info', 'Force sync completed successfully');
            return true;
            
        } catch (error) {
            safeLog('error', 'Force sync failed', error);
            this.updateConnectionStatus('offline');
            return false;
        }
    }

    // OTTIMIZZAZIONE: Test connessione con timeout ridotto
    async testConnection() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for connection test');
            return false;
        }

        try {
            safeLog('info', 'Testing Firebase connection');
            
            await this.withTimeout(
                db.collection('test').doc('connection').get(),
                3000 // Timeout ridotto per test veloce
            );
            
            safeLog('info', 'Firebase connection test successful');
            return true;
            
        } catch (error) {
            safeLog('error', 'Firebase connection test failed', error);
            return false;
        }
    }

    // OTTIMIZZAZIONE: Health status dettagliato
    getHealthStatus() {
        try {
            return {
                isOnline: this.isOnline,
                isFirebaseReady: this.isFirebaseReady,
                connectionQuality: this.connectionQuality,
                operationTimeout: this.operationTimeout,
                activeSaves: this.activeSaves.size,
                queuedOperations: this.saveQueue.size,
                cacheStats: {
                    bookingsCount: this.bookingsCache.size,
                    settingsCached: !!this.settingsCache,
                    cacheExpiry: this.cacheExpiry
                },
                performance: {
                    retryAttempts: this.retryAttempts,
                    baseRetryDelay: this.baseRetryDelay,
                    maxRetryDelay: this.maxRetryDelay
                }
            };
        } catch (error) {
            safeLog('error', 'Error getting health status', error);
            return { error: error.message };
        }
    }

    // OTTIMIZZAZIONE: Cleanup method per memory management
    cleanup() {
        try {
            safeLog('info', 'Cleaning up DatabaseManager');
            
            // Pulisci cache
            this.bookingsCache.clear();
            this.settingsCache = null;
            
            // Pulisci operazioni attive
            this.activeSaves.clear();
            this.saveQueue.clear();
            
            // Rimuovi event listeners
            window.removeEventListener('online', this.onlineHandler);
            window.removeEventListener('offline', this.offlineHandler);
            
            safeLog('info', 'DatabaseManager cleanup completed');
        } catch (error) {
            safeLog('error', 'Error during DatabaseManager cleanup', error);
        }
    }
}

// OTTIMIZZAZIONE: Singleton pattern per DatabaseManager
let dbManagerInstance = null;

try {
    dbManagerInstance = new DatabaseManager();
    window.dbManager = dbManagerInstance;
    safeLog('info', 'Global database manager instance created');
} catch (error) {
    safeLog('error', 'Failed to create database manager instance', error);

    // Fallback mock ottimizzato
    window.dbManager = {
        async saveBooking() {
            return { success: false, error: 'Database not available' };
        },
        async loadBookings() {
            return [];
        },
        async deleteBooking() {
            return { success: false, error: 'Database not available' };
        },
        async saveSettings() {
            throw new Error('Database not available');
        },
        async loadSettings() {
            return null;
        },
        onBookingsChange() {
            return () => {}; // Return cleanup function
        },
        async forceSync() {
            return false;
        },
        async testConnection() {
            return false;
        },
        getHealthStatus() {
            return { error: 'Database manager not available' };
        },
        cleanup() {
            // no-op
        }
    };

    safeLog('warn', 'Created fallback database manager');
}

// OTTIMIZZAZIONE: Cleanup globale quando la pagina si chiude
window.addEventListener('beforeunload', () => {
    if (dbManagerInstance && typeof dbManagerInstance.cleanup === 'function') {
        dbManagerInstance.cleanup();
    }
});
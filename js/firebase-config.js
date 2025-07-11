// Configurazione Firebase con gestione errori migliorata
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

// Utility function for safe logging
function safeLog(level, message, data = null) {
    try {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [FIREBASE-${level.toUpperCase()}] [v${SYSTEM_VERSION}] ${message}`;
        
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

// Database manager per gestire operazioni Firebase
class DatabaseManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isFirebaseReady = isFirebaseInitialized;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // Base delay, will be exponential
        this.operationTimeout = this.getConfigurableTimeout(); // Configurable timeout
        this.activeSaves = new Map(); // Track active save operations
        
        this.setupConnectionMonitoring();
        safeLog('info', 'DatabaseManager initialized', { 
            isOnline: this.isOnline, 
            isFirebaseReady: this.isFirebaseReady 
        });
    }
    
    getConfigurableTimeout() {
        try {
            // Check for environment variable or default to 10 seconds
            return parseInt(process?.env?.FIREBASE_TIMEOUT) || 10000;
        } catch {
            return 10000;
        }
    }

    setupConnectionMonitoring() {
        try {
            window.addEventListener('online', () => {
                this.isOnline = true;
                safeLog('info', 'Connection restored');
                this.updateConnectionStatus('online');
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
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

    updateConnectionStatus(status) {
        try {
            const statusElement = document.getElementById('connectionStatus');
            if (!statusElement) {
                safeLog('warn', 'Connection status element not found');
                return;
            }
            
            switch (status) {
                case 'online':
                    statusElement.className = 'connection-status online';
                    statusElement.textContent = '🟢 Online';
                    break;
                case 'syncing':
                    statusElement.className = 'connection-status syncing';
                    statusElement.textContent = '🔄 Sincronizzazione...';
                    break;
                case 'offline':
                default:
                    statusElement.className = 'connection-status offline';
                    statusElement.textContent = '🔴 Offline';
                    break;
            }
        } catch (error) {
            safeLog('error', 'Error updating connection status', error);
        }
    }

    // Create a timeout wrapper for Firebase operations
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

    // Validate booking data before Firebase operations
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

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(booking.email)) {
                throw new Error('Invalid email format');
            }

            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
                throw new Error('Invalid date format (expected YYYY-MM-DD)');
            }

            // Validate time format
            if (!/^\d{2}:\d{2}$/.test(booking.time)) {
                throw new Error('Invalid time format (expected HH:MM)');
            }

            return true;
        } catch (error) {
            safeLog('error', 'Booking validation failed', { booking, error: error.message });
            throw error;
        }
    }

    // Generate unique ID for new bookings
    generateBookingId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Check if booking exists in Firestore
    async bookingExists(bookingId) {
        try {
            if (!bookingId) return false;
            
            const doc = await this.withTimeout(
                db.collection('bookings').doc(bookingId).get()
            );
            
            return doc.exists;
        } catch (error) {
            safeLog('warn', 'Error checking if booking exists', { bookingId, error: error.message });
            return false;
        }
    }

    // Salva prenotazione con logica corretta per CREATE vs UPDATE
    async saveBooking(booking) {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for saveBooking');
            return { success: false, error: 'Database not available' };
        }

        try {
            this.updateConnectionStatus('syncing');
            
            // Validate booking data
            this.validateBookingData(booking);
            
            // Determine if this is a new booking or an update
            const isNewBooking = !booking.id;
            const isUpdate = booking.id && await this.bookingExists(booking.id);
            
            safeLog('info', 'Saving booking', { 
                id: booking.id, 
                isNewBooking, 
                isUpdate,
                operation: isNewBooking ? 'CREATE' : (isUpdate ? 'UPDATE' : 'CREATE_WITH_ID')
            });
            
            const bookingData = this.prepareBookingForFirestore(booking);
            
            let lastError = null;
            let savedBookingId = booking.id;
            
            // Retry logic
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    safeLog('info', `Saving booking attempt ${attempt}`, { 
                        id: savedBookingId,
                        operation: isNewBooking ? 'CREATE' : (isUpdate ? 'UPDATE' : 'CREATE_WITH_ID')
                    });
                    
                    if (isNewBooking) {
                        // Create completely new booking without ID
                        const docRef = await this.withTimeout(
                            db.collection('bookings').add({
                                ...bookingData,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            })
                        );
                        
                        savedBookingId = docRef.id;
                        safeLog('info', 'New booking created', { id: savedBookingId });
                        
                    } else if (isUpdate) {
                        // Update existing booking
                        const { id, createdAt, ...updateData } = bookingData;
                        
                        await this.withTimeout(
                            db.collection('bookings').doc(booking.id).update({
                                ...updateData,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            })
                        );
                        
                        safeLog('info', 'Existing booking updated', { id: booking.id });
                        
                    } else {
                        // Create new booking with specific ID (booking doesn't exist yet)
                        if (!savedBookingId) {
                            savedBookingId = this.generateBookingId();
                        }
                        
                        await this.withTimeout(
                            db.collection('bookings').doc(savedBookingId).set({
                                ...bookingData,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            })
                        );
                        
                        safeLog('info', 'New booking created with specific ID', { id: savedBookingId });
                    }
                    
                    this.updateConnectionStatus('online');
                    safeLog('info', 'Booking saved successfully', { id: savedBookingId });
                    return { success: true, id: savedBookingId };
                    
                } catch (error) {
                    lastError = error;
                    safeLog('warn', `Save attempt ${attempt} failed`, { 
                        id: savedBookingId, 
                        error: error.message,
                        errorCode: error.code 
                    });
                    
                    // If it's a "not found" error on update, try creating instead
                    if (error.message.includes('No document to update') && isUpdate) {
                        safeLog('info', 'Document not found for update, switching to create mode');
                        // Remove the ID and try creating a new document
                        savedBookingId = this.generateBookingId();
                        
                        try {
                            await this.withTimeout(
                                db.collection('bookings').doc(savedBookingId).set({
                                    ...bookingData,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                })
                            );
                            
                            this.updateConnectionStatus('online');
                            safeLog('info', 'Booking created after update failure', { id: savedBookingId });
                            return { success: true, id: savedBookingId };
                        } catch (createError) {
                            safeLog('error', 'Failed to create after update failure', createError);
                            lastError = createError;
                        }
                    }
                    
                    if (attempt < this.retryAttempts) {
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                    }
                }
            }
            
            throw lastError;
            
        } catch (error) {
            safeLog('error', 'Failed to save booking after all attempts', { 
                booking: booking.id || 'new', 
                error: error.message 
            });
            this.updateConnectionStatus('offline');
            return { success: false, error: error.message };
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
                duration: parseInt(booking.duration) || 30,
                color: String(booking.color || '#8b5cf6').trim()
            };

            // Ensure duration is within reasonable bounds
            prepared.duration = Math.max(15, Math.min(480, prepared.duration));

            // Ensure status is valid
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'old'];
            if (!validStatuses.includes(prepared.status)) {
                prepared.status = 'pending';
            }

            // Handle dates - don't include createdAt in prepared data for new bookings
            // Firebase will set it automatically
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

    // Carica tutte le prenotazioni con error handling
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

    // Elimina prenotazione con retry logic
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
            
            // Retry logic
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    safeLog('info', `Deleting booking attempt ${attempt}`, { id });
                    
                    await this.withTimeout(
                        db.collection('bookings').doc(id).delete()
                    );
                    
                    this.updateConnectionStatus('online');
                    safeLog('info', 'Booking deleted successfully', { id });
                    return { success: true };
                    
                } catch (error) {
                    lastError = error;
                    safeLog('warn', `Delete attempt ${attempt} failed`, { id, error: error.message });
                    
                    if (attempt < this.retryAttempts) {
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
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

    // Salva impostazioni nel database
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
            
            this.updateConnectionStatus('online');
            safeLog('info', 'Settings saved successfully');
            return { success: true };
            
        } catch (error) {
            safeLog('error', 'Failed to save settings', error);
            this.updateConnectionStatus('offline');
            throw error;
        }
    }

    // Carica impostazioni dal database
    async loadSettings() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for loadSettings');
            return null;
        }

        try {
            this.updateConnectionStatus('syncing');
            
            safeLog('info', 'Loading settings from Firestore');
            
            const doc = await this.withTimeout(
                db.collection('settings').doc('main').get()
            );
            
            this.updateConnectionStatus('online');
            
            if (doc.exists) {
                const settings = doc.data();
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

    // Ascolta cambiamenti in tempo reale
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
            
            return db.collection('bookings')
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
                                    }
                                } catch (error) {
                                    safeLog('warn', 'Error processing booking in real-time update', { docId: doc.id, error: error.message });
                                }
                            });
                            
                            safeLog('info', `Real-time update: ${bookings.length} bookings`);
                            callback(bookings);
                            
                        } catch (error) {
                            safeLog('error', 'Error processing real-time snapshot', error);
                            callback([]); // Call with empty array on error
                        }
                    },
                    error => {
                        safeLog('error', 'Real-time listener error', error);
                        this.updateConnectionStatus('offline');
                        callback([]); // Call with empty array on error
                    }
                );
                
        } catch (error) {
            safeLog('error', 'Error setting up real-time listener', error);
            return null;
        }
    }

    // Forza sincronizzazione
    async forceSync() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for forceSync');
            return false;
        }

        try {
            this.updateConnectionStatus('syncing');
            
            safeLog('info', 'Forcing network sync');
            
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

    // Test connessione Firebase
    async testConnection() {
        if (!this.isFirebaseReady || !db) {
            safeLog('error', 'Firebase not ready for connection test');
            return false;
        }

        try {
            safeLog('info', 'Testing Firebase connection');
            
            await this.withTimeout(
                db.collection('test').doc('connection').get(),
                5000 // Shorter timeout for connection test
            );
            
            safeLog('info', 'Firebase connection test successful');
            return true;
            
        } catch (error) {
            safeLog('error', 'Firebase connection test failed', error);
            return false;
        }
    }

    // Get health status
    getHealthStatus() {
       try {
    // Provo a usare l'istanza reale
    window.dbManager = dbManagerInstance;
    safeLog('info', 'Global database manager instance created');
} catch (error) {
    safeLog('error', 'Failed to create database manager instance', error);

    // Se fallisce, uso un fallback mock
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
            // no-op
        },
        async forceSync() {
            return false;
        },
        async testConnection() {
            return false;
        },
        getHealthStatus() {
            return { error: 'Database manager not available' };
        }
    };

    safeLog('warn', 'Created fallback database manager');
}
    }
}


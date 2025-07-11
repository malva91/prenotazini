// Configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA5l7kO0FiNP0DgYxkCyNn6A-aABQeDBAo",
    authDomain: "prenotazioni-52007.firebaseapp.com",
    projectId: "prenotazioni-52007",
    storageBucket: "prenotazioni-52007.firebasestorage.app",
    messagingSenderId: "38626524066",
    appId: "1:38626524066:web:6d01b3f338abaac3a790fb",
    measurementId: "G-QTCPJ46646"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Configurazione offline
db.enablePersistence()
    .then(() => {
        console.log('Firebase offline persistence enabled');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
        }
    });

// Database manager per gestire operazioni Firebase
class DatabaseManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.setupConnectionMonitoring();
    }

    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus('online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus('offline');
        });

        // Monitora lo stato di connessione Firebase
        db.enableNetwork().then(() => {
            this.updateConnectionStatus('online');
        }).catch(() => {
            this.updateConnectionStatus('offline');
        });
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        if (status === 'online') {
            statusElement.className = 'connection-status online';
            statusElement.textContent = '🟢 Online';
        } else if (status === 'syncing') {
            statusElement.className = 'connection-status syncing';
            statusElement.textContent = '🔄 Sincronizzazione...';
        } else {
            statusElement.className = 'connection-status offline';
            statusElement.textContent = '🔴 Offline';
        }
    }

    // Salva prenotazione
    async saveBooking(booking) {
        try {
            this.updateConnectionStatus('syncing');
            
            if (booking.id) {
                // Aggiorna prenotazione esistente
                const { id, createdAt, ...updateData } = booking;
                
                await db.collection('bookings').doc(booking.id).update({
                    ...updateData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Crea nuova prenotazione
                const docRef = await db.collection('bookings').add({
                    ...booking,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                booking.id = docRef.id;
            }
            
            this.updateConnectionStatus('online');
            return { success: true, id: booking.id };
        } catch (error) {
            console.error('DatabaseManager: Error saving booking:', error);
            this.updateConnectionStatus('offline');
            return { success: false, error: error.message };
        }
    }

    // Carica tutte le prenotazioni
    async loadBookings() {
        try {
            this.updateConnectionStatus('syncing');
            
            const snapshot = await db.collection('bookings')
                .orderBy('createdAt', 'desc')
                .get();
            
            const bookings = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const booking = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date()
                };
                bookings.push(booking);
            });
            
            this.updateConnectionStatus('online');
            return bookings;
        } catch (error) {
            console.error('DatabaseManager: Error loading bookings:', error);
            this.updateConnectionStatus('offline');
            return [];
        }
    }

    // Elimina prenotazione
    async deleteBooking(id) {
        try {
            this.updateConnectionStatus('syncing');
            
            await db.collection('bookings').doc(id).delete();
            
            this.updateConnectionStatus('online');
            return { success: true };
        } catch (error) {
            console.error('DatabaseManager: Error deleting booking:', error);
            this.updateConnectionStatus('offline');
            return { success: false, error: error.message };
        }
    }

    // Salva impostazioni nel database
    async saveSettings(settings) {
        try {
            this.updateConnectionStatus('syncing');
            
            await db.collection('settings').doc('main').set({
                ...settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.updateConnectionStatus('online');
            return { success: true };
        } catch (error) {
            console.error('DatabaseManager: Error saving settings:', error);
            this.updateConnectionStatus('offline');
            throw error;
        }
    }

    // Carica impostazioni dal database
    async loadSettings() {
        try {
            this.updateConnectionStatus('syncing');
            
            const doc = await db.collection('settings').doc('main').get();
            
            this.updateConnectionStatus('online');
            
            if (doc.exists) {
                return doc.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('DatabaseManager: Error loading settings:', error);
            this.updateConnectionStatus('offline');
            return null;
        }
    }

    // Ascolta cambiamenti in tempo reale
    onBookingsChange(callback) {
        return db.collection('bookings')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const bookings = [];
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const booking = {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date()
                    };
                    bookings.push(booking);
                });
                
                callback(bookings);
            }, error => {
                console.error('DatabaseManager: Error in real-time listener:', error);
                this.updateConnectionStatus('offline');
            });
    }

    // Forza sincronizzazione
    async forceSync() {
        try {
            this.updateConnectionStatus('syncing');
            
            await db.enableNetwork();
            
            this.updateConnectionStatus('online');
            return true;
        } catch (error) {
            console.error('DatabaseManager: Error forcing sync:', error);
            this.updateConnectionStatus('offline');
            return false;
        }
    }
}

// Istanza globale del database manager
window.dbManager = new DatabaseManager();
// Storage Manager for Firebase operations
class StorageManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        this.setupConnectionHandlers();
        this.loadSyncQueue();
        console.log('Storage manager initialized with Firebase');
    }

    setupConnectionHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
            this.processSyncQueue();
            notificationManager.onlineMode();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost - switching to offline mode');
            notificationManager.offlineMode();
        });
    }

    // Save booking to Firebase
    async saveBooking(booking) {
        try {
            if (this.isOnline) {
                const success = await this.saveToFirestore(booking);
                if (success) {
                    console.log('Booking saved to Firebase:', booking.id);
                    return { success: true };
                } else {
                    this.addToSyncQueue('saveBooking', booking);
                    await this.saveToLocalStorage('bookings', booking.id, booking);
                    return { success: true };
                }
            } else {
                await this.saveToLocalStorage('bookings', booking.id, booking);
                this.addToSyncQueue('saveBooking', booking);
                console.log('Booking saved offline:', booking.id);
                return { success: true };
            }
        } catch (error) {
            console.error('Failed to save booking:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all bookings
    async getBookings() {
        try {
            if (this.isOnline) {
                const firestoreBookings = await this.getFromFirestore();
                if (firestoreBookings.length >= 0) {
                    await this.syncLocalStorageWithFirestore('bookings', firestoreBookings);
                    console.log('Bookings loaded from Firebase:', firestoreBookings.length);
                    return firestoreBookings;
                }
            }

            const localBookings = await this.getFromLocalStorage('bookings');
            console.log('Bookings loaded from localStorage:', localBookings.length);
            return localBookings;
        } catch (error) {
            console.error('Failed to get bookings:', error);
            try {
                return await this.getFromLocalStorage('bookings');
            } catch (localError) {
                console.error('Failed to get bookings from localStorage:', localError);
                return [];
            }
        }
    }

    // Update booking status
    async updateBookingStatus(bookingId, status) {
        try {
            if (this.isOnline) {
                const success = await this.updateInFirestore(bookingId, { status, updatedAt: new Date() });
                if (success) {
                    const localBookings = await this.getFromLocalStorage('bookings');
                    const booking = localBookings.find(b => b.id === bookingId);
                    if (booking) {
                        booking.status = status;
                        booking.updatedAt = new Date();
                        await this.saveToLocalStorage('bookings', bookingId, booking);
                    }
                    return { success: true };
                } else {
                    this.addToSyncQueue('updateBookingStatus', { id: bookingId, status });
                }
            } else {
                const localBookings = await this.getFromLocalStorage('bookings');
                const booking = localBookings.find(b => b.id === bookingId);
                if (booking) {
                    booking.status = status;
                    booking.updatedAt = new Date();
                    await this.saveToLocalStorage('bookings', bookingId, booking);
                    this.addToSyncQueue('updateBookingStatus', { id: bookingId, status });
                    return { success: true };
                } else {
                    throw new Error('Booking not found');
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to update booking status:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete booking
    async deleteBooking(bookingId) {
        try {
            if (this.isOnline) {
                const success = await this.removeFromFirestore(bookingId);
                if (success) {
                    await this.removeFromLocalStorage('bookings', bookingId);
                    return { success: true };
                } else {
                    this.addToSyncQueue('deleteBooking', { id: bookingId });
                }
            } else {
                await this.removeFromLocalStorage('bookings', bookingId);
                this.addToSyncQueue('deleteBooking', { id: bookingId });
            }

            console.log('Booking deleted:', bookingId);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete booking:', error);
            return { success: false, error: error.message };
        }
    }

    // Firebase operations
    async saveToFirestore(booking) {
        try {
            const bookingData = {
                ...booking,
                createdAt: firebase.firestore.Timestamp.fromDate(booking.createdAt),
                updatedAt: firebase.firestore.Timestamp.fromDate(booking.updatedAt)
            };

            await db.collection('bookings').doc(booking.id).set(bookingData);
            console.log('Booking saved to Firestore:', booking.id);
            return true;
        } catch (error) {
            console.error('Firestore save failed:', error);
            return false;
        }
    }

    async getFromFirestore() {
        try {
            const snapshot = await db.collection('bookings').orderBy('createdAt', 'desc').get();
            const bookings = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                bookings.push({
                    id: doc.id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    date: data.date,
                    timeSlot: data.timeSlot,
                    status: data.status,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    notes: data.notes,
                    duration: data.duration
                });
            });

            console.log('Bookings loaded from Firestore:', bookings.length);
            return bookings;
        } catch (error) {
            console.error('Firestore get failed:', error);
            throw error;
        }
    }

    async updateInFirestore(bookingId, updates) {
        try {
            const updateData = { ...updates };
            if (updateData.updatedAt) {
                updateData.updatedAt = firebase.firestore.Timestamp.fromDate(updateData.updatedAt);
            }
            
            await db.collection('bookings').doc(bookingId).update(updateData);
            console.log('Booking updated in Firestore:', bookingId);
            return true;
        } catch (error) {
            console.error('Firestore update failed:', error);
            return false;
        }
    }

    async removeFromFirestore(bookingId) {
        try {
            await db.collection('bookings').doc(bookingId).delete();
            console.log('Booking deleted from Firestore:', bookingId);
            return true;
        } catch (error) {
            console.error('Firestore delete failed:', error);
            return false;
        }
    }

    // LocalStorage operations (backup)
    async saveToLocalStorage(collection, id, data) {
        const key = `booking_system_${collection}`;
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        existing[id] = {
            ...data,
            createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt
        };
        localStorage.setItem(key, JSON.stringify(existing));
    }

    async getFromLocalStorage(collection) {
        const key = `booking_system_${collection}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return Object.values(data).map(item => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }));
    }

    async removeFromLocalStorage(collection, id) {
        const key = `booking_system_${collection}`;
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        delete existing[id];
        localStorage.setItem(key, JSON.stringify(existing));
    }

    // Sync queue management
    addToSyncQueue(action, data) {
        this.syncQueue.push({
            action,
            data,
            timestamp: new Date()
        });
        this.saveSyncQueue();
        console.log('Added to sync queue:', action, data.id);
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log('Processing sync queue:', this.syncQueue.length);
        
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            let success = false;
            
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    switch (item.action) {
                        case 'saveBooking':
                            success = await this.saveToFirestore(item.data);
                            break;
                        case 'updateBookingStatus':
                            success = await this.updateInFirestore(item.data.id, { 
                                status: item.data.status, 
                                updatedAt: new Date() 
                            });
                            break;
                        case 'deleteBooking':
                            success = await this.removeFromFirestore(item.data.id);
                            break;
                    }

                    if (success) break;
                } catch (error) {
                    console.warn(`Sync attempt ${attempt} failed for ${item.action}:`, error);
                }

                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }

            if (!success) {
                this.syncQueue.push(item);
                console.error(`Failed to sync ${item.action} after ${this.retryAttempts} attempts`);
            }
        }

        this.saveSyncQueue();
    }

    saveSyncQueue() {
        try {
            localStorage.setItem('booking_system_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to save sync queue:', error);
        }
    }

    loadSyncQueue() {
        try {
            const saved = localStorage.getItem('booking_system_sync_queue');
            if (saved) {
                this.syncQueue = JSON.parse(saved).map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            }
        } catch (error) {
            console.error('Failed to load sync queue:', error);
        }
    }

    async syncLocalStorageWithFirestore(collection, firestoreData) {
        const key = `booking_system_${collection}`;
        const syncData = {};
        
        firestoreData.forEach(item => {
            syncData[item.id] = {
                ...item,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString()
            };
        });
        
        localStorage.setItem(key, JSON.stringify(syncData));
    }

    // Utility methods
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            queueLength: this.syncQueue.length,
            oldestPendingSync: this.syncQueue.length > 0 ? this.syncQueue[0].timestamp : null
        };
    }

    async forcSync() {
        if (this.isOnline) {
            await this.processSyncQueue();
        }
    }

    clearLocalData() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('booking_system_'));
        keys.forEach(key => localStorage.removeItem(key));
        this.syncQueue = [];
        console.log('Local data cleared');
    }

    async testFirebaseConnection() {
        try {
            await db.collection('test').doc('connection').get();
            console.log('Firebase connection test successful');
            return true;
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            return false;
        }
    }
}

// Initialize storage manager
const storageManager = new StorageManager();
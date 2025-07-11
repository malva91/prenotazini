// Booking management ottimizzato con gestione errori migliorata
import { Utils } from './utils.js';

export class BookingManager {
    constructor(dbManager, settingsManager) {
        this.dbManager = dbManager;
        this.settingsManager = settingsManager;
        this.bookings = [];
        this.listeners = [];
        this.isLoading = false;
        this.lastLoadTime = null;
        
        // OTTIMIZZAZIONE: Gestione concorrenza migliorata
        this.activeSaves = new Map();
        this.saveQueue = new Map();
        this.maxConcurrentSaves = 3;
        
        // OTTIMIZZAZIONE: Cache per operazioni frequenti
        this.availabilityCache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minuti
        
        // OTTIMIZZAZIONE: Batch processing
        this.batchSize = 50;
        this.processingBatch = false;
        
        // OTTIMIZZAZIONE: Real-time listener management
        this.realtimeUnsubscribe = null;
        this.listenerRetryCount = 0;
        this.maxListenerRetries = 3;
        
        Utils.log('info', 'BookingManager initialized with optimizations');
    }

    // OTTIMIZZAZIONE: Load bookings con batch processing
    async loadBookings() {
        if (this.isLoading) {
            Utils.log('warn', 'loadBookings called while already loading');
            return this.bookings;
        }

        this.isLoading = true;
        const performanceId = Utils.startPerformanceMeasure('loadBookings');
        
        try {
            Utils.log('info', 'Loading bookings from database');
            
            if (!this.dbManager) {
                throw new Error('Database manager not available');
            }

            const loadedBookings = await this.dbManager.loadBookings();
            
            if (!Array.isArray(loadedBookings)) {
                Utils.log('error', 'loadBookings returned non-array', loadedBookings);
                this.bookings = [];
            } else {
                // OTTIMIZZAZIONE: Batch validation per performance
                this.bookings = await this.batchValidateBookings(loadedBookings);
                Utils.log('info', `Loaded ${this.bookings.length} valid bookings`);
            }
            
            this.lastLoadTime = new Date();
            this.clearAvailabilityCache(); // Invalida cache disponibilità
            this.notifyListeners();
            
            Utils.endPerformanceMeasure(performanceId);
            return this.bookings;
        } catch (error) {
            Utils.log('error', 'Error loading bookings', error);
            Utils.endPerformanceMeasure(performanceId);
            return this.bookings;
        } finally {
            this.isLoading = false;
        }
    }

    // OTTIMIZZAZIONE: Batch validation per performance
    async batchValidateBookings(bookings) {
        const validBookings = [];
        const batchSize = this.batchSize;
        
        for (let i = 0; i < bookings.length; i += batchSize) {
            const batch = bookings.slice(i, i + batchSize);
            
            // Process batch
            const validBatch = batch.filter(booking => {
                try {
                    return this.validateBooking(booking);
                } catch (error) {
                    Utils.log('warn', 'Error validating booking in batch', { 
                        bookingId: booking?.id, 
                        error: error.message 
                    });
                    return false;
                }
            });
            
            validBookings.push(...validBatch);
            
            // OTTIMIZZAZIONE: Yield control per non bloccare UI
            if (i + batchSize < bookings.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return validBookings;
    }

    // OTTIMIZZAZIONE: Validation migliorata con cache
    validateBooking(booking) {
        try {
            if (!booking || typeof booking !== 'object') {
                Utils.log('warn', 'Invalid booking object', booking);
                return false;
            }

            // OTTIMIZZAZIONE: Cache per validazioni ripetute
            const bookingKey = `${booking.id}_${booking.updatedAt || booking.createdAt}`;
            if (this.validationCache && this.validationCache.has(bookingKey)) {
                return this.validationCache.get(bookingKey);
            }

            const required = ['id', 'firstName', 'lastName', 'email', 'phone', 'date', 'time'];
            const missing = required.filter(field => !booking[field]);
            
            if (missing.length > 0) {
                Utils.log('warn', 'Booking missing required fields', { booking: booking.id, missing });
                return false;
            }

            // Validate email
            if (!Utils.validateEmail(booking.email)) {
                Utils.log('warn', 'Booking has invalid email', { booking: booking.id, email: booking.email });
                return false;
            }

            // Validate date
            if (!Utils.isValidDate(booking.date)) {
                Utils.log('warn', 'Booking has invalid date', { booking: booking.id, date: booking.date });
                return false;
            }

            // Validate time format
            if (!/^\d{2}:\d{2}$/.test(booking.time)) {
                Utils.log('warn', 'Booking has invalid time format', { booking: booking.id, time: booking.time });
                return false;
            }

            // Sanitize string fields
            booking.firstName = Utils.sanitizeInput(booking.firstName);
            booking.lastName = Utils.sanitizeInput(booking.lastName);
            booking.email = Utils.sanitizeInput(booking.email);
            booking.phone = Utils.sanitizeInput(booking.phone);
            booking.notes = Utils.sanitizeInput(booking.notes || '');

            // OTTIMIZZAZIONE: Cache risultato validazione
            if (!this.validationCache) {
                this.validationCache = new Map();
            }
            if (this.validationCache.size < 1000) { // Limita dimensione cache
                this.validationCache.set(bookingKey, true);
            }

            return true;
        } catch (error) {
            Utils.log('error', 'Error validating booking', { booking, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Save booking con queue management
    async saveBooking(bookingData) {
        const saveKey = bookingData.id || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // OTTIMIZZAZIONE: Gestione concorrenza migliorata
        if (this.activeSaves.has(saveKey)) {
            Utils.log('warn', 'Save operation already in progress', { id: saveKey });
            return { success: false, error: 'Save operation already in progress' };
        }

        // OTTIMIZZAZIONE: Limita salvataggi concorrenti
        if (this.activeSaves.size >= this.maxConcurrentSaves) {
            Utils.log('info', 'Max concurrent saves reached, queuing operation', { id: saveKey });
            return this.queueSaveOperation(saveKey, bookingData);
        }

        this.activeSaves.set(saveKey, Date.now());
        const performanceId = Utils.startPerformanceMeasure(`saveBooking_${saveKey}`);
        
        try {
            Utils.log('info', 'Saving booking', { 
                id: bookingData.id || 'new',
                hasId: !!bookingData.id,
                operation: bookingData.id ? 'UPDATE' : 'CREATE'
            });

            if (!this.dbManager) {
                throw new Error('Database manager not available');
            }

            // Validate booking data before saving
            if (!this.validateBookingData(bookingData)) {
                throw new Error('Invalid booking data');
            }

            // Ensure required fields are present and sanitize data
            const sanitizedData = this.sanitizeBookingData(bookingData);
            
            // OTTIMIZZAZIONE: Assign unique color più efficiente
            if (!sanitizedData.color) {
                sanitizedData.color = Utils.getUniqueColorForDate(sanitizedData.date, this.bookings);
                Utils.log('debug', 'Assigned unique color for booking', { 
                    date: sanitizedData.date,
                    color: sanitizedData.color
                });
            }
            
            const result = await this.dbManager.saveBooking(sanitizedData);
            
            if (result.success) {
                Utils.log('info', 'Booking saved successfully', { 
                    id: result.id,
                    originalId: bookingData.id 
                });
                
                // OTTIMIZZAZIONE: Update locale immediato per UX migliore
                if (!bookingData.id && result.id) {
                    sanitizedData.id = result.id;
                    this.addBookingToLocal(sanitizedData);
                } else if (bookingData.id) {
                    this.updateBookingInLocal(sanitizedData);
                }
                
                // Invalida cache disponibilità
                this.clearAvailabilityCache();
                
                // Process queued operations
                this.processQueuedSaves();
            } else {
                Utils.log('error', 'Failed to save booking', result);
            }
            
            Utils.endPerformanceMeasure(performanceId);
            return result;
        } catch (error) {
            Utils.log('error', 'Error saving booking', { 
                bookingData: {
                    id: bookingData?.id,
                    firstName: bookingData?.firstName,
                    lastName: bookingData?.lastName
                }, 
                error: error.message 
            });
            Utils.endPerformanceMeasure(performanceId);
            return { success: false, error: error.message };
        } finally {
            this.activeSaves.delete(saveKey);
        }
    }

    // OTTIMIZZAZIONE: Queue management per salvataggi
    async queueSaveOperation(saveKey, bookingData) {
        return new Promise((resolve) => {
            this.saveQueue.set(saveKey, {
                bookingData,
                resolve,
                timestamp: Date.now()
            });
            
            Utils.log('info', 'Save operation queued', { 
                id: saveKey, 
                queueSize: this.saveQueue.size 
            });
        });
    }

    async processQueuedSaves() {
        if (this.saveQueue.size === 0 || this.activeSaves.size >= this.maxConcurrentSaves) {
            return;
        }

        const [saveKey, operation] = this.saveQueue.entries().next().value;
        this.saveQueue.delete(saveKey);
        
        try {
            const result = await this.saveBooking(operation.bookingData);
            operation.resolve(result);
        } catch (error) {
            Utils.log('error', 'Error processing queued save', { saveKey, error: error.message });
            operation.resolve({ success: false, error: error.message });
        }
    }

    // OTTIMIZZAZIONE: Local booking management per UX migliore
    addBookingToLocal(booking) {
        try {
            // Evita duplicati
            const existingIndex = this.bookings.findIndex(b => b.id === booking.id);
            if (existingIndex === -1) {
                this.bookings.unshift(booking); // Aggiungi in cima
                this.notifyListeners();
            }
        } catch (error) {
            Utils.log('error', 'Error adding booking to local array', error);
        }
    }

    updateBookingInLocal(booking) {
        try {
            const index = this.bookings.findIndex(b => b.id === booking.id);
            if (index !== -1) {
                this.bookings[index] = { ...this.bookings[index], ...booking };
                this.notifyListeners();
            }
        } catch (error) {
            Utils.log('error', 'Error updating booking in local array', error);
        }
    }

    validateBookingData(data) {
        try {
            if (!data || typeof data !== 'object') {
                Utils.log('error', 'validateBookingData: data is not an object', data);
                return false;
            }

            const required = ['firstName', 'lastName', 'email', 'phone', 'date', 'time'];
            const missing = required.filter(field => !data[field] || data[field].toString().trim() === '');
            
            if (missing.length > 0) {
                Utils.log('error', 'validateBookingData: missing required fields', missing);
                return false;
            }

            if (!Utils.validateEmail(data.email)) {
                Utils.log('error', 'validateBookingData: invalid email', data.email);
                return false;
            }

            if (!Utils.validatePhone(data.phone)) {
                Utils.log('error', 'validateBookingData: invalid phone', data.phone);
                return false;
            }

            if (!Utils.isValidDate(data.date)) {
                Utils.log('error', 'validateBookingData: invalid date', data.date);
                return false;
            }

            return true;
        } catch (error) {
            Utils.log('error', 'Error in validateBookingData', error);
            return false;
        }
    }

    sanitizeBookingData(data) {
        try {
            const sanitized = {
                firstName: Utils.sanitizeInput(data.firstName),
                lastName: Utils.sanitizeInput(data.lastName),
                email: Utils.sanitizeInput(data.email),
                phone: Utils.sanitizeInput(data.phone),
                date: data.date,
                time: data.time,
                duration: Math.max(15, Math.min(480, parseInt(data.duration) || 30)),
                status: data.status || 'pending',
                notes: Utils.sanitizeInput(data.notes || ''),
                color: data.color || Utils.getUniqueColorForDate(data.date, this.bookings),
                createdAt: data.createdAt || new Date(),
                updatedAt: new Date()
            };

            // Only include ID if it exists (for updates)
            if (data.id) {
                sanitized.id = data.id;
            }

            // Ensure status is valid
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'old'];
            if (!validStatuses.includes(sanitized.status)) {
                sanitized.status = 'pending';
            }

            Utils.log('debug', 'Booking data sanitized', {
                hasId: !!sanitized.id,
                firstName: sanitized.firstName,
                lastName: sanitized.lastName,
                status: sanitized.status,
                color: sanitized.color
            });

            return sanitized;
        } catch (error) {
            Utils.log('error', 'Error sanitizing booking data', error);
            throw new Error('Failed to sanitize booking data');
        }
    }

    // OTTIMIZZAZIONE: Delete con cleanup locale
    async deleteBooking(id) {
        try {
            Utils.log('info', 'Deleting booking', { id });

            if (!id) {
                throw new Error('Booking ID is required');
            }

            if (!this.dbManager) {
                throw new Error('Database manager not available');
            }

            const result = await this.dbManager.deleteBooking(id);
            
            if (result.success) {
                Utils.log('info', 'Booking deleted successfully', { id });
                
                // OTTIMIZZAZIONE: Remove from local array immediately
                this.bookings = this.bookings.filter(booking => booking.id !== id);
                this.clearAvailabilityCache(); // Invalida cache
                this.notifyListeners();
            } else {
                Utils.log('error', 'Failed to delete booking', result);
            }
            
            return result;
        } catch (error) {
            Utils.log('error', 'Error deleting booking', { id, error: error.message });
            return { success: false, error: error.message };
        }
    }

    // OTTIMIZZAZIONE: Get bookings con cache
    getBookingsForDate(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'getBookingsForDate called with invalid date', date);
                return [];
            }

            // CORREZIONE: Usa data locale per evitare problemi di timezone
            const dateObj = new Date(date);
            const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            
            // OTTIMIZZAZIONE: Check cache first
            const cacheKey = `date_${dateString}`;
            if (this.availabilityCache.has(cacheKey)) {
                const cached = this.availabilityCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.bookings;
                }
            }

            const dayBookings = this.bookings.filter(booking => {
                try {
                    return booking.date === dateString;
                } catch (error) {
                    Utils.log('warn', 'Error filtering booking by date', { booking: booking.id, error: error.message });
                    return false;
                }
            });

            // OTTIMIZZAZIONE: Cache result
            this.availabilityCache.set(cacheKey, {
                bookings: dayBookings,
                timestamp: Date.now()
            });

            Utils.log('debug', `Found ${dayBookings.length} bookings for date ${dateString}`);
            return dayBookings;
        } catch (error) {
            Utils.log('error', 'Error in getBookingsForDate', { date, error: error.message });
            return [];
        }
    }

    // OTTIMIZZAZIONE: Clear availability cache
    clearAvailabilityCache() {
        try {
            this.availabilityCache.clear();
            Utils.log('debug', 'Availability cache cleared');
        } catch (error) {
            Utils.log('error', 'Error clearing availability cache', error);
        }
    }

    getBookingsForDateRange(startDate, endDate) {
        try {
            if (!Utils.isValidDate(startDate) || !Utils.isValidDate(endDate)) {
                Utils.log('warn', 'getBookingsForDateRange called with invalid dates', { startDate, endDate });
                return [];
            }

            // CORREZIONE: Usa date locali per evitare problemi di timezone
            const startObj = new Date(startDate);
            const endObj = new Date(endDate);
            const start = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
            const end = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
            
            const rangeBookings = this.bookings.filter(booking => {
                try {
                    return booking.date >= start && booking.date <= end;
                } catch (error) {
                    Utils.log('warn', 'Error filtering booking by date range', { booking: booking.id, error: error.message });
                    return false;
                }
            });

            Utils.log('debug', `Found ${rangeBookings.length} bookings for date range ${start} to ${end}`);
            return rangeBookings;
        } catch (error) {
            Utils.log('error', 'Error in getBookingsForDateRange', { startDate, endDate, error: error.message });
            return [];
        }
    }

    // OTTIMIZZAZIONE: Time slot availability con cache
    isTimeSlotAvailable(date, time, duration = 30, excludeId = null) {
        try {
            if (!Utils.isValidDate(date) || !time) {
                Utils.log('warn', 'isTimeSlotAvailable called with invalid parameters', { date, time });
                return false;
            }

            // OTTIMIZZAZIONE: Cache key per availability
            const cacheKey = `availability_${date}_${time}_${duration}_${excludeId || 'none'}`;
            if (this.availabilityCache.has(cacheKey)) {
                const cached = this.availabilityCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.available;
                }
            }

            const dayBookings = this.getBookingsForDate(date)
                .filter(booking => {
                    try {
                        return booking.status !== 'cancelled' && booking.id !== excludeId;
                    } catch (error) {
                        Utils.log('warn', 'Error filtering booking in isTimeSlotAvailable', { booking: booking.id, error: error.message });
                        return false;
                    }
                });

            const requestedStart = Utils.parseTimeToMinutes(time);
            const requestedEnd = requestedStart + duration;

            const isAvailable = !dayBookings.some(booking => {
                try {
                    const bookingStart = Utils.parseTimeToMinutes(booking.time);
                    const bookingEnd = bookingStart + (booking.duration || 30);
                    return (requestedStart < bookingEnd && requestedEnd > bookingStart);
                } catch (error) {
                    Utils.log('warn', 'Error checking booking overlap', { booking: booking.id, error: error.message });
                    return false;
                }
            });

            // OTTIMIZZAZIONE: Cache result
            this.availabilityCache.set(cacheKey, {
                available: isAvailable,
                timestamp: Date.now()
            });

            Utils.log('debug', `Time slot ${time} availability for ${date}: ${isAvailable}`);
            return isAvailable;
        } catch (error) {
            Utils.log('error', 'Error in isTimeSlotAvailable', { date, time, duration, error: error.message });
            return false;
        }
    }

    getAvailableTimeSlots(date) {
        try {
            if (!this.settingsManager) {
                Utils.log('error', 'Settings manager not available');
                return [];
            }

            const allSlots = this.settingsManager.generateTimeSlots(date);
            if (!Array.isArray(allSlots)) {
                Utils.log('warn', 'generateTimeSlots returned non-array', allSlots);
                return [];
            }

            const interval = this.settingsManager.getTimeSlotInterval() || 30;

            const availableSlots = allSlots.filter(time => {
                try {
                    return this.isTimeSlotAvailable(date, time, interval);
                } catch (error) {
                    Utils.log('warn', 'Error checking slot availability', { time, error: error.message });
                    return false;
                }
            });

            Utils.log('debug', `Found ${availableSlots.length} available slots for ${date}`);
            return availableSlots;
        } catch (error) {
            Utils.log('error', 'Error in getAvailableTimeSlots', { date, error: error.message });
            return [];
        }
    }

    getBookingStats() {
        try {
            const stats = {
                total: 0,
                pending: 0,
                confirmed: 0,
                cancelled: 0,
                old: 0
            };

            if (!Array.isArray(this.bookings)) {
                Utils.log('warn', 'Bookings is not an array in getBookingStats');
                return stats;
            }

            this.bookings.forEach(booking => {
                try {
                    stats.total++;
                    if (stats.hasOwnProperty(booking.status)) {
                        stats[booking.status]++;
                    } else {
                        Utils.log('warn', 'Unknown booking status', { booking: booking.id, status: booking.status });
                    }
                } catch (error) {
                    Utils.log('warn', 'Error processing booking in stats', { booking: booking.id, error: error.message });
                }
            });

            Utils.log('debug', 'Booking stats calculated', stats);
            return stats;
        } catch (error) {
            Utils.log('error', 'Error in getBookingStats', error);
            return { total: 0, pending: 0, confirmed: 0, cancelled: 0, old: 0 };
        }
    }

    // OTTIMIZZAZIONE: Update old bookings con batch processing
    async updateOldBookings() {
        try {
            const today = new Date();
            // CORREZIONE: Usa data locale per evitare problemi di timezone
            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const currentTime = Utils.parseTimeToMinutes(
                today.toTimeString().slice(0, 5)
            );

            let updatedCount = 0;
            const bookingsToUpdate = [];
            const bookingsToDelete = [];
            
            // NUOVO: Calcola data di una settimana fa per cancellazione automatica
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const oneWeekAgoString = `${oneWeekAgo.getFullYear()}-${String(oneWeekAgo.getMonth() + 1).padStart(2, '0')}-${String(oneWeekAgo.getDate()).padStart(2, '0')}`;

            // OTTIMIZZAZIONE: Identifica bookings da aggiornare prima
            this.bookings.forEach((booking) => {
                try {
                    const bookingDate = booking.date;
                    
                    // NUOVO: Cancella prenotazioni più vecchie di una settimana
                    if (bookingDate < oneWeekAgoString) {
                        bookingsToDelete.push(booking);
                    } else if (booking.status === 'confirmed') {
                        // Aggiorna a 'old' le prenotazioni passate ma recenti
                        const bookingTime = Utils.parseTimeToMinutes(booking.time);
                        const bookingDuration = booking.duration || 30;
                        const bookingEndTime = bookingTime + bookingDuration;

                        if (bookingDate < todayString || 
                            (bookingDate === todayString && bookingEndTime <= currentTime)) {
                            bookingsToUpdate.push(booking);
                        }
                    }
                } catch (error) {
                    Utils.log('error', 'Error checking old booking', { booking: booking.id, error: error.message });
                }
            });

            // NUOVO: Cancella prenotazioni vecchie di più di una settimana
            if (bookingsToDelete.length > 0) {
                Utils.log('info', `Deleting ${bookingsToDelete.length} bookings older than one week`);
                
                for (const booking of bookingsToDelete) {
                    try {
                        const result = await this.deleteBooking(booking.id);
                        if (result.success) {
                            Utils.log('debug', 'Old booking deleted', { id: booking.id, date: booking.date });
                        } else {
                            Utils.log('error', 'Failed to delete old booking', { id: booking.id, error: result.error });
                        }
                    } catch (error) {
                        Utils.log('error', 'Error deleting old booking', { booking: booking.id, error: error.message });
                    }
                }
            }

            // OTTIMIZZAZIONE: Batch update
            if (bookingsToUpdate.length > 0) {
                Utils.log('info', `Updating ${bookingsToUpdate.length} bookings to old status`);
                
                for (const booking of bookingsToUpdate) {
                    try {
                        booking.status = 'old';
                        await this.saveBooking(booking);
                        updatedCount++;
                    } catch (error) {
                        Utils.log('error', 'Error updating old booking', { booking: booking.id, error: error.message });
                    }
                }

                Utils.log('info', `Updated ${updatedCount} bookings to old status, deleted ${bookingsToDelete.length} old bookings`);
            }
        } catch (error) {
            Utils.log('error', 'Error in updateOldBookings', error);
        }
    }

    // OTTIMIZZAZIONE: Filter bookings con performance migliorata
    filterBookings(searchTerm = '', statusFilter = 'all') {
        try {
            if (!Array.isArray(this.bookings)) {
                Utils.log('warn', 'Bookings is not an array in filterBookings');
                return [];
            }

            const performanceId = Utils.startPerformanceMeasure('filterBookings');
            let filtered = this.bookings;

            // OTTIMIZZAZIONE: Filter by status first (più efficiente)
            if (statusFilter && statusFilter !== 'all') {
                filtered = filtered.filter(booking => {
                    try {
                        return booking.status === statusFilter;
                    } catch (error) {
                        Utils.log('warn', 'Error filtering booking by status', { booking: booking.id, error: error.message });
                        return false;
                    }
                });
            }

            // OTTIMIZZAZIONE: Search term processing
            if (searchTerm && typeof searchTerm === 'string') {
                const term = searchTerm.toLowerCase().trim();
                if (term) {
                    // OTTIMIZZAZIONE: Pre-compile search terms
                    const searchTerms = term.split(' ').filter(t => t.length > 0);
                    
                    filtered = filtered.filter(booking => {
                        try {
                            const searchableText = [
                                booking.firstName,
                                booking.lastName,
                                booking.email,
                                booking.phone,
                                booking.notes
                            ].filter(field => field)
                             .join(' ')
                             .toLowerCase();

                            // OTTIMIZZAZIONE: All terms must match
                            return searchTerms.every(searchTerm => 
                                searchableText.includes(searchTerm)
                            );
                        } catch (error) {
                            Utils.log('warn', 'Error filtering booking by search term', { booking: booking.id, error: error.message });
                            return false;
                        }
                    });
                }
            }

            Utils.endPerformanceMeasure(performanceId);
            Utils.log('debug', `Filtered ${filtered.length} bookings from ${this.bookings.length} total`);
            return filtered;
        } catch (error) {
            Utils.log('error', 'Error in filterBookings', { searchTerm, statusFilter, error: error.message });
            return [];
        }
    }

    // OTTIMIZZAZIONE: Event listeners con gestione memoria migliorata
    addListener(callback) {
        try {
            if (typeof callback !== 'function') {
                Utils.log('error', 'addListener called with non-function callback');
                return;
            }
            
            this.listeners.push(callback);
            Utils.log('debug', `Added listener, total: ${this.listeners.length}`);
        } catch (error) {
            Utils.log('error', 'Error in addListener', error);
        }
    }

    removeListener(callback) {
        try {
            const initialLength = this.listeners.length;
            this.listeners = this.listeners.filter(listener => listener !== callback);
            Utils.log('debug', `Removed listener, total: ${this.listeners.length} (was ${initialLength})`);
        } catch (error) {
            Utils.log('error', 'Error in removeListener', error);
        }
    }

    // OTTIMIZZAZIONE: Notify listeners con error isolation
    notifyListeners() {
        try {
            if (!Array.isArray(this.listeners)) {
                Utils.log('warn', 'Listeners is not an array');
                this.listeners = [];
                return;
            }

            Utils.log('debug', `Notifying ${this.listeners.length} listeners`);
            
            // OTTIMIZZAZIONE: Async notification per non bloccare UI
            setTimeout(() => {
                this.listeners.forEach((callback, index) => {
                    try {
                        if (typeof callback === 'function') {
                            callback(this.bookings);
                        } else {
                            Utils.log('warn', `Listener at index ${index} is not a function`);
                        }
                    } catch (error) {
                        Utils.log('error', `Error in listener at index ${index}`, error);
                    }
                });
            }, 0);
        } catch (error) {
            Utils.log('error', 'Error in notifyListeners', error);
        }
    }

    // OTTIMIZZAZIONE: Real-time listener con retry logic
    setupRealTimeListener() {
        try {
            if (!this.dbManager || typeof this.dbManager.onBookingsChange !== 'function') {
                Utils.log('warn', 'Database manager does not support real-time listeners');
                return null;
            }

            Utils.log('info', 'Setting up real-time listener');
            
            const setupListener = () => {
                try {
                    this.realtimeUnsubscribe = this.dbManager.onBookingsChange((bookings) => {
                        try {
                            Utils.log('info', `Real-time update received: ${bookings?.length || 0} bookings`);
                            
                            if (Array.isArray(bookings)) {
                                // OTTIMIZZAZIONE: Batch validate bookings
                                this.batchValidateBookings(bookings).then(validBookings => {
                                    this.bookings = validBookings;
                                    this.clearAvailabilityCache();
                                    this.updateOldBookings();
                                    this.notifyListeners();
                                });
                            } else {
                                Utils.log('warn', 'Real-time update received non-array bookings', bookings);
                            }
                            
                            // Reset retry count on success
                            this.listenerRetryCount = 0;
                        } catch (error) {
                            Utils.log('error', 'Error processing real-time update', error);
                            this.handleListenerError();
                        }
                    });
                } catch (error) {
                    Utils.log('error', 'Error setting up real-time listener', error);
                    this.handleListenerError();
                }
            };

            setupListener();
            return () => this.cleanup();
            
        } catch (error) {
            Utils.log('error', 'Error in setupRealTimeListener', error);
            return null;
        }
    }

    // OTTIMIZZAZIONE: Handle listener errors con retry
    handleListenerError() {
        this.listenerRetryCount++;
        
        if (this.listenerRetryCount <= this.maxListenerRetries) {
            const retryDelay = Math.pow(2, this.listenerRetryCount) * 1000; // Exponential backoff
            
            Utils.log('warn', `Real-time listener error, retrying in ${retryDelay}ms (attempt ${this.listenerRetryCount})`);
            
            setTimeout(() => {
                this.setupRealTimeListener();
            }, retryDelay);
        } else {
            Utils.log('error', 'Max real-time listener retries reached, giving up');
        }
    }
    
    // OTTIMIZZAZIONE: Cleanup method migliorato
    cleanup() {
        try {
            Utils.log('info', 'Cleaning up BookingManager');
            
            // Cleanup real-time listener
            if (this.realtimeUnsubscribe && typeof this.realtimeUnsubscribe === 'function') {
                this.realtimeUnsubscribe();
                this.realtimeUnsubscribe = null;
                Utils.log('info', 'Real-time listener unsubscribed');
            }
            
            // Clear all caches
            this.clearAvailabilityCache();
            if (this.validationCache) {
                this.validationCache.clear();
            }
            
            // Clear listeners
            this.listeners = [];
            
            // Clear active operations
            this.activeSaves.clear();
            this.saveQueue.clear();
            
            Utils.log('info', 'BookingManager cleanup completed');
        } catch (error) {
            Utils.log('error', 'Error during BookingManager cleanup', error);
        }
    }

    // OTTIMIZZAZIONE: Health status dettagliato
    getHealthStatus() {
        try {
            return {
                isLoading: this.isLoading,
                bookingsCount: this.bookings?.length || 0,
                listenersCount: this.listeners?.length || 0,
                lastLoadTime: this.lastLoadTime,
                hasDbManager: !!this.dbManager,
                hasSettingsManager: !!this.settingsManager,
                performance: {
                    activeSaves: this.activeSaves.size,
                    queuedSaves: this.saveQueue.size,
                    maxConcurrentSaves: this.maxConcurrentSaves,
                    cacheSize: this.availabilityCache.size,
                    validationCacheSize: this.validationCache?.size || 0
                },
                realtime: {
                    hasListener: !!this.realtimeUnsubscribe,
                    retryCount: this.listenerRetryCount,
                    maxRetries: this.maxListenerRetries
                }
            };
        } catch (error) {
            Utils.log('error', 'Error getting health status', error);
            return {
                isLoading: false,
                bookingsCount: 0,
                listenersCount: 0,
                lastLoadTime: null,
                hasDbManager: false,
                hasSettingsManager: false,
                error: error.message
            };
        }
    }
}
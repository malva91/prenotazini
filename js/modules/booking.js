// Booking management with enhanced error handling
import { Utils } from './utils.js';

export class BookingManager {
    constructor(dbManager, settingsManager) {
        this.dbManager = dbManager;
        this.settingsManager = settingsManager;
        this.bookings = [];
        this.listeners = [];
        this.isLoading = false;
        this.lastLoadTime = null;
        
        Utils.log('info', 'BookingManager initialized');
    }

    async loadBookings() {
        if (this.isLoading) {
            Utils.log('warn', 'loadBookings called while already loading');
            return this.bookings;
        }

        this.isLoading = true;
        
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
                // Validate and sanitize bookings
                this.bookings = loadedBookings.filter(booking => this.validateBooking(booking));
                Utils.log('info', `Loaded ${this.bookings.length} valid bookings`);
            }
            
            this.lastLoadTime = new Date();
            this.notifyListeners();
            return this.bookings;
        } catch (error) {
            Utils.log('error', 'Error loading bookings', error);
            // Don't clear existing bookings on error, just return what we have
            return this.bookings;
        } finally {
            this.isLoading = false;
        }
    }

    validateBooking(booking) {
        try {
            if (!booking || typeof booking !== 'object') {
                Utils.log('warn', 'Invalid booking object', booking);
                return false;
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

            return true;
        } catch (error) {
            Utils.log('error', 'Error validating booking', { booking, error: error.message });
            return false;
        }
    }

    async saveBooking(bookingData) {
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
            
            // Assign unique color for the date if not provided or if it's a new booking
            if (!sanitizedData.color) {
                sanitizedData.color = Utils.getUniqueColorForDate(sanitizedData.date, this.bookings);
                Utils.log('debug', 'Assigned unique color for booking', { 
                    date: sanitizedData.date,
                    color: sanitizedData.color,
                    existingBookingsCount: this.bookings.length
                });
            }
            
            // CRITICAL FIX: Don't pre-generate ID for new bookings
            // Let Firebase generate the ID automatically
            if (!sanitizedData.id) {
                // Remove any undefined id to ensure clean creation
                delete sanitizedData.id;
                Utils.log('info', 'Creating new booking without pre-generated ID');
            } else {
                Utils.log('info', 'Updating existing booking', { id: sanitizedData.id });
            }
            
            const result = await this.dbManager.saveBooking(sanitizedData);
            
            if (result.success) {
                Utils.log('info', 'Booking saved successfully', { 
                    id: result.id,
                    originalId: bookingData.id 
                });
                
                // Update the booking data with the returned ID if it was a new booking
                if (!bookingData.id && result.id) {
                    sanitizedData.id = result.id;
                }
                
                // Reload bookings to ensure consistency
                await this.loadBookings();
            } else {
                Utils.log('error', 'Failed to save booking', result);
            }
            
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
            return { success: false, error: error.message };
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
                duration: parseInt(data.duration) || 30,
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

            // Ensure duration is within reasonable bounds
            sanitized.duration = Math.max(15, Math.min(480, sanitized.duration));

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
                // Remove from local array immediately
                this.bookings = this.bookings.filter(booking => booking.id !== id);
                this.notifyListeners();
                // Reload to ensure consistency
                await this.loadBookings();
            } else {
                Utils.log('error', 'Failed to delete booking', result);
            }
            
            return result;
        } catch (error) {
            Utils.log('error', 'Error deleting booking', { id, error: error.message });
            return { success: false, error: error.message };
        }
    }

    getBookingsForDate(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'getBookingsForDate called with invalid date', date);
                return [];
            }

            const dateString = new Date(date).toISOString().split('T')[0];
            const dayBookings = this.bookings.filter(booking => {
                try {
                    return booking.date === dateString;
                } catch (error) {
                    Utils.log('warn', 'Error filtering booking by date', { booking: booking.id, error: error.message });
                    return false;
                }
            });

            Utils.log('debug', `Found ${dayBookings.length} bookings for date ${dateString}`);
            return dayBookings;
        } catch (error) {
            Utils.log('error', 'Error in getBookingsForDate', { date, error: error.message });
            return [];
        }
    }

    getBookingsForDateRange(startDate, endDate) {
        try {
            if (!Utils.isValidDate(startDate) || !Utils.isValidDate(endDate)) {
                Utils.log('warn', 'getBookingsForDateRange called with invalid dates', { startDate, endDate });
                return [];
            }

            const start = new Date(startDate).toISOString().split('T')[0];
            const end = new Date(endDate).toISOString().split('T')[0];
            
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

    isTimeSlotAvailable(date, time, duration = 30, excludeId = null) {
        try {
            if (!Utils.isValidDate(date) || !time) {
                Utils.log('warn', 'isTimeSlotAvailable called with invalid parameters', { date, time });
                return false;
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
                    return false; // If we can't check, assume no conflict
                }
            });

            Utils.log('debug', `Time slot ${time} availability for ${date}: ${isAvailable}`);
            return isAvailable;
        } catch (error) {
            Utils.log('error', 'Error in isTimeSlotAvailable', { date, time, duration, error: error.message });
            return false; // Safer to assume not available
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

    updateOldBookings() {
        try {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            const currentTime = Utils.parseTimeToMinutes(
                today.toTimeString().slice(0, 5)
            );

            let updatedCount = 0;

            this.bookings.forEach(async (booking) => {
                try {
                    if (booking.status === 'confirmed') {
                        const bookingDate = booking.date;
                        const bookingTime = Utils.parseTimeToMinutes(booking.time);
                        const bookingDuration = booking.duration || 30;
                        const bookingEndTime = bookingTime + bookingDuration;

                        // Check if booking is in the past
                        if (bookingDate < todayString || 
                            (bookingDate === todayString && bookingEndTime <= currentTime)) {
                            
                            booking.status = 'old';
                            await this.saveBooking(booking);
                            updatedCount++;
                        }
                    }
                } catch (error) {
                    Utils.log('error', 'Error updating old booking', { booking: booking.id, error: error.message });
                }
            });

            if (updatedCount > 0) {
                Utils.log('info', `Updated ${updatedCount} bookings to old status`);
            }
        } catch (error) {
            Utils.log('error', 'Error in updateOldBookings', error);
        }
    }

    filterBookings(searchTerm = '', statusFilter = 'all') {
        try {
            if (!Array.isArray(this.bookings)) {
                Utils.log('warn', 'Bookings is not an array in filterBookings');
                return [];
            }

            let filtered = [...this.bookings];

            // Filter by status
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

            // Filter by search term
            if (searchTerm && typeof searchTerm === 'string') {
                const term = searchTerm.toLowerCase().trim();
                if (term) {
                    filtered = filtered.filter(booking => {
                        try {
                            const searchableFields = [
                                booking.firstName,
                                booking.lastName,
                                booking.email,
                                booking.phone,
                                booking.notes
                            ].filter(field => field); // Remove null/undefined fields

                            return searchableFields.some(field => 
                                field.toString().toLowerCase().includes(term)
                            );
                        } catch (error) {
                            Utils.log('warn', 'Error filtering booking by search term', { booking: booking.id, error: error.message });
                            return false;
                        }
                    });
                }
            }

            Utils.log('debug', `Filtered ${filtered.length} bookings from ${this.bookings.length} total`);
            return filtered;
        } catch (error) {
            Utils.log('error', 'Error in filterBookings', { searchTerm, statusFilter, error: error.message });
            return [];
        }
    }

    // Event listeners for real-time updates
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

    notifyListeners() {
        try {
            if (!Array.isArray(this.listeners)) {
                Utils.log('warn', 'Listeners is not an array');
                this.listeners = [];
                return;
            }

            Utils.log('debug', `Notifying ${this.listeners.length} listeners`);
            
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
        } catch (error) {
            Utils.log('error', 'Error in notifyListeners', error);
        }
    }

    // Setup real-time listener
    setupRealTimeListener() {
        try {
            if (!this.dbManager || typeof this.dbManager.onBookingsChange !== 'function') {
                Utils.log('warn', 'Database manager does not support real-time listeners');
                return null;
            }

            Utils.log('info', 'Setting up real-time listener');
            
            return this.dbManager.onBookingsChange((bookings) => {
                try {
                    Utils.log('info', `Real-time update received: ${bookings?.length || 0} bookings`);
                    
                    if (Array.isArray(bookings)) {
                        // Validate all bookings before updating
                        this.bookings = bookings.filter(booking => this.validateBooking(booking));
                        this.updateOldBookings();
                        this.notifyListeners();
                    } else {
                        Utils.log('warn', 'Real-time update received non-array bookings', bookings);
                    }
                } catch (error) {
                    Utils.log('error', 'Error processing real-time update', error);
                }
            });
        } catch (error) {
            Utils.log('error', 'Error setting up real-time listener', error);
            return null;
        }
    }

    // Health check method
    getHealthStatus() {
        try {
            return {
                isLoading: this.isLoading,
                bookingsCount: this.bookings?.length || 0,
                listenersCount: this.listeners?.length || 0,
                lastLoadTime: this.lastLoadTime,
                hasDbManager: !!this.dbManager,
                hasSettingsManager: !!this.settingsManager
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
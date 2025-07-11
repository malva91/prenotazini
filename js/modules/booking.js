// Booking management
import { Utils } from './utils.js';

export class BookingManager {
    constructor(dbManager, settingsManager) {
        this.dbManager = dbManager;
        this.settingsManager = settingsManager;
        this.bookings = [];
        this.listeners = [];
    }

    async loadBookings() {
        try {
            this.bookings = await this.dbManager.loadBookings();
            this.notifyListeners();
            return this.bookings;
        } catch (error) {
            console.error('Error loading bookings:', error);
            return [];
        }
    }

    async saveBooking(bookingData) {
        try {
            const result = await this.dbManager.saveBooking(bookingData);
            if (result.success) {
                await this.loadBookings(); // Reload to get updated data
            }
            return result;
        } catch (error) {
            console.error('Error saving booking:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteBooking(id) {
        try {
            const result = await this.dbManager.deleteBooking(id);
            if (result.success) {
                await this.loadBookings(); // Reload to get updated data
            }
            return result;
        } catch (error) {
            console.error('Error deleting booking:', error);
            return { success: false, error: error.message };
        }
    }

    getBookingsForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        return this.bookings.filter(booking => booking.date === dateString);
    }

    getBookingsForDateRange(startDate, endDate) {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        
        return this.bookings.filter(booking => {
            return booking.date >= start && booking.date <= end;
        });
    }

    isTimeSlotAvailable(date, time, duration = 30, excludeId = null) {
        const dateString = date.toISOString().split('T')[0];
        const dayBookings = this.getBookingsForDate(date)
            .filter(booking => booking.status !== 'cancelled' && booking.id !== excludeId);

        const requestedStart = Utils.parseTimeToMinutes(time);
        const requestedEnd = requestedStart + duration;

        return !dayBookings.some(booking => {
            const bookingStart = Utils.parseTimeToMinutes(booking.time);
            const bookingEnd = bookingStart + (booking.duration || 30);

            return (requestedStart < bookingEnd && requestedEnd > bookingStart);
        });
    }

    getAvailableTimeSlots(date) {
        const allSlots = this.settingsManager.generateTimeSlots(date);
        const interval = this.settingsManager.getTimeSlotInterval();

        return allSlots.filter(time => 
            this.isTimeSlotAvailable(date, time, interval)
        );
    }

    getBookingStats() {
        const stats = {
            total: this.bookings.length,
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            old: 0
        };

        this.bookings.forEach(booking => {
            if (stats.hasOwnProperty(booking.status)) {
                stats[booking.status]++;
            }
        });

        return stats;
    }

    // Update old bookings status
    updateOldBookings() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const currentTime = Utils.parseTimeToMinutes(
            today.toTimeString().slice(0, 5)
        );

        this.bookings.forEach(async (booking) => {
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
                }
            }
        });
    }

    filterBookings(searchTerm = '', statusFilter = 'all') {
        let filtered = [...this.bookings];

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(booking => booking.status === statusFilter);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(booking => 
                booking.firstName?.toLowerCase().includes(term) ||
                booking.lastName?.toLowerCase().includes(term) ||
                booking.email?.toLowerCase().includes(term) ||
                booking.phone?.toLowerCase().includes(term) ||
                booking.notes?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }

    // Event listeners for real-time updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.bookings));
    }

    // Setup real-time listener
    setupRealTimeListener() {
        return this.dbManager.onBookingsChange((bookings) => {
            this.bookings = bookings;
            this.updateOldBookings();
            this.notifyListeners();
        });
    }
}
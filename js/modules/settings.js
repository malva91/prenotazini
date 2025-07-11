// Settings management
export class SettingsManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.defaultSettings = {
            businessHours: {
                monday: { 
                    open: '09:00', 
                    close: '18:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                tuesday: { 
                    open: '09:00', 
                    close: '18:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                wednesday: { 
                    open: '09:00', 
                    close: '18:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                thursday: { 
                    open: '09:00', 
                    close: '18:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                friday: { 
                    open: '09:00', 
                    close: '18:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                saturday: { 
                    open: '09:00', 
                    close: '16:00', 
                    closed: false,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                },
                sunday: { 
                    open: '10:00', 
                    close: '16:00', 
                    closed: true,
                    hasBreak: false,
                    breakStart: '13:00',
                    breakEnd: '14:00'
                }
            },
            holidays: [],
            timeSlotInterval: 30
        };
        this.settings = { ...this.defaultSettings };
    }

    async loadSettings() {
        try {
            const savedSettings = await this.dbManager.loadSettings();
            if (savedSettings) {
                // Merge with defaults to ensure all new properties exist
                this.settings = this.mergeWithDefaults(savedSettings);
            }
            return this.settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.settings;
        }
    }

    mergeWithDefaults(savedSettings) {
        const merged = { ...this.defaultSettings, ...savedSettings };
        
        // Ensure each day has all required properties
        Object.keys(this.defaultSettings.businessHours).forEach(day => {
            if (merged.businessHours[day]) {
                merged.businessHours[day] = {
                    ...this.defaultSettings.businessHours[day],
                    ...merged.businessHours[day]
                };
            }
        });
        
        return merged;
    }

    async saveSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            await this.dbManager.saveSettings(this.settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    getBusinessHours() {
        return this.settings.businessHours;
    }

    getHolidays() {
        return this.settings.holidays || [];
    }

    getTimeSlotInterval() {
        return this.settings.timeSlotInterval || 30;
    }

    isBusinessDay(date) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const businessHours = this.getBusinessHours();
        return businessHours[dayName] && !businessHours[dayName].closed;
    }

    isHoliday(date) {
        const dateString = date.toISOString().split('T')[0];
        return this.getHolidays().includes(dateString);
    }

    getBusinessHoursForDay(date) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return this.getBusinessHours()[dayName];
    }

    isDateAvailable(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        if (checkDate < today) return false;
        if (!this.isBusinessDay(date)) return false;
        if (this.isHoliday(date)) return false;
        return true;
    }

    isTimeInBreak(time, businessHours) {
        if (!businessHours.hasBreak) return false;
        
        const timeMinutes = this.parseTimeToMinutes(time);
        const breakStart = this.parseTimeToMinutes(businessHours.breakStart);
        const breakEnd = this.parseTimeToMinutes(businessHours.breakEnd);
        
        return timeMinutes >= breakStart && timeMinutes < breakEnd;
    }

    generateTimeSlots(date) {
        const businessHours = this.getBusinessHoursForDay(date);
        if (!businessHours || businessHours.closed) return [];

        const slots = [];
        const interval = this.getTimeSlotInterval();
        const openTime = this.parseTimeToMinutes(businessHours.open);
        const closeTime = this.parseTimeToMinutes(businessHours.close);

        if (businessHours.hasBreak) {
            const breakStart = this.parseTimeToMinutes(businessHours.breakStart);
            const breakEnd = this.parseTimeToMinutes(businessHours.breakEnd);

            // Morning slots (before break)
            for (let time = openTime; time < breakStart; time += interval) {
                slots.push(this.minutesToTime(time));
            }

            // Afternoon slots (after break)
            for (let time = breakEnd; time < closeTime; time += interval) {
                slots.push(this.minutesToTime(time));
            }
        } else {
            // Regular continuous hours
            for (let time = openTime; time < closeTime; time += interval) {
                slots.push(this.minutesToTime(time));
            }
        }

        return slots;
    }

    parseTimeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    formatBusinessHoursDisplay(businessHours) {
        if (businessHours.closed) return 'Chiuso';
        
        if (businessHours.hasBreak) {
            return `${businessHours.open} - ${businessHours.breakStart} / ${businessHours.breakEnd} - ${businessHours.close}`;
        } else {
            return `${businessHours.open} - ${businessHours.close}`;
        }
    }
}
// Settings management with enhanced error handling
import { Utils } from './utils.js';

export class SettingsManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.isLoading = false;
        this.lastLoadTime = null;
        
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
        
        this.settings = this.deepClone(this.defaultSettings);
        
        Utils.log('info', 'SettingsManager initialized');
    }

    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            Utils.log('error', 'Error deep cloning object', error);
            return {};
        }
    }

    validateSettings(settings) {
        try {
            if (!settings || typeof settings !== 'object') {
                Utils.log('warn', 'validateSettings: settings is not an object');
                return false;
            }

            // Validate business hours structure
            if (settings.businessHours) {
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                
                for (const day of days) {
                    const dayHours = settings.businessHours[day];
                    if (dayHours && typeof dayHours === 'object') {
                        // Validate time format
                        if (dayHours.open && !/^\d{2}:\d{2}$/.test(dayHours.open)) {
                            Utils.log('warn', `Invalid open time format for ${day}`, dayHours.open);
                            return false;
                        }
                        if (dayHours.close && !/^\d{2}:\d{2}$/.test(dayHours.close)) {
                            Utils.log('warn', `Invalid close time format for ${day}`, dayHours.close);
                            return false;
                        }
                        if (dayHours.breakStart && !/^\d{2}:\d{2}$/.test(dayHours.breakStart)) {
                            Utils.log('warn', `Invalid break start time format for ${day}`, dayHours.breakStart);
                            return false;
                        }
                        if (dayHours.breakEnd && !/^\d{2}:\d{2}$/.test(dayHours.breakEnd)) {
                            Utils.log('warn', `Invalid break end time format for ${day}`, dayHours.breakEnd);
                            return false;
                        }
                    }
                }
            }

            // Validate holidays array
            if (settings.holidays && !Array.isArray(settings.holidays)) {
                Utils.log('warn', 'validateSettings: holidays is not an array');
                return false;
            }

            // Validate time slot interval
            if (settings.timeSlotInterval && (typeof settings.timeSlotInterval !== 'number' || settings.timeSlotInterval < 15 || settings.timeSlotInterval > 120)) {
                Utils.log('warn', 'validateSettings: invalid timeSlotInterval', settings.timeSlotInterval);
                return false;
            }

            return true;
        } catch (error) {
            Utils.log('error', 'Error validating settings', error);
            return false;
        }
    }

    sanitizeSettings(settings) {
        try {
            const sanitized = this.deepClone(this.defaultSettings);

            if (!settings || typeof settings !== 'object') {
                Utils.log('warn', 'sanitizeSettings: using default settings due to invalid input');
                return sanitized;
            }

            // Sanitize business hours
            if (settings.businessHours && typeof settings.businessHours === 'object') {
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                
                days.forEach(day => {
                    if (settings.businessHours[day] && typeof settings.businessHours[day] === 'object') {
                        const dayHours = settings.businessHours[day];
                        const defaultDayHours = sanitized.businessHours[day];
                        
                        sanitized.businessHours[day] = {
                            open: this.sanitizeTime(dayHours.open) || defaultDayHours.open,
                            close: this.sanitizeTime(dayHours.close) || defaultDayHours.close,
                            closed: Boolean(dayHours.closed),
                            hasBreak: Boolean(dayHours.hasBreak),
                            breakStart: this.sanitizeTime(dayHours.breakStart) || defaultDayHours.breakStart,
                            breakEnd: this.sanitizeTime(dayHours.breakEnd) || defaultDayHours.breakEnd
                        };
                    }
                });
            }

            // Sanitize holidays
            if (Array.isArray(settings.holidays)) {
                sanitized.holidays = settings.holidays
                    .filter(holiday => typeof holiday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(holiday))
                    .sort();
            }

            // Sanitize time slot interval
            if (typeof settings.timeSlotInterval === 'number') {
                sanitized.timeSlotInterval = Math.max(15, Math.min(120, Math.round(settings.timeSlotInterval)));
            }

            return sanitized;
        } catch (error) {
            Utils.log('error', 'Error sanitizing settings', error);
            return this.deepClone(this.defaultSettings);
        }
    }

    sanitizeTime(timeString) {
        try {
            if (!timeString || typeof timeString !== 'string') {
                return null;
            }

            const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
            if (!match) {
                return null;
            }

            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);

            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                return null;
            }

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            Utils.log('error', 'Error sanitizing time', { timeString, error: error.message });
            return null;
        }
    }

    async loadSettings() {
        if (this.isLoading) {
            Utils.log('warn', 'loadSettings called while already loading');
            return this.settings;
        }

        this.isLoading = true;

        try {
            Utils.log('info', 'Loading settings from database');

            if (!this.dbManager) {
                throw new Error('Database manager not available');
            }

            const savedSettings = await this.dbManager.loadSettings();
            
            if (savedSettings) {
                if (this.validateSettings(savedSettings)) {
                    this.settings = this.sanitizeSettings(savedSettings);
                    Utils.log('info', 'Settings loaded and validated successfully');
                } else {
                    Utils.log('warn', 'Loaded settings failed validation, using defaults');
                    this.settings = this.deepClone(this.defaultSettings);
                }
            } else {
                Utils.log('info', 'No saved settings found, using defaults');
                this.settings = this.deepClone(this.defaultSettings);
            }

            this.lastLoadTime = new Date();
            return this.settings;
        } catch (error) {
            Utils.log('error', 'Error loading settings', error);
            this.settings = this.deepClone(this.defaultSettings);
            return this.settings;
        } finally {
            this.isLoading = false;
        }
    }

    async saveSettings(newSettings) {
        try {
            Utils.log('info', 'Saving settings');

            if (!this.dbManager) {
                throw new Error('Database manager not available');
            }

            if (!newSettings || typeof newSettings !== 'object') {
                throw new Error('Invalid settings object');
            }

            // Merge with current settings
            const mergedSettings = { ...this.settings, ...newSettings };
            
            // Validate and sanitize
            if (!this.validateSettings(mergedSettings)) {
                throw new Error('Settings validation failed');
            }

            const sanitizedSettings = this.sanitizeSettings(mergedSettings);
            
            await this.dbManager.saveSettings(sanitizedSettings);
            
            this.settings = sanitizedSettings;
            Utils.log('info', 'Settings saved successfully');
            
            return true;
        } catch (error) {
            Utils.log('error', 'Error saving settings', error);
            throw error;
        }
    }

    getBusinessHours() {
        try {
            return this.deepClone(this.settings.businessHours);
        } catch (error) {
            Utils.log('error', 'Error getting business hours', error);
            return this.deepClone(this.defaultSettings.businessHours);
        }
    }

    getHolidays() {
        try {
            return Array.isArray(this.settings.holidays) ? [...this.settings.holidays] : [];
        } catch (error) {
            Utils.log('error', 'Error getting holidays', error);
            return [];
        }
    }

    getTimeSlotInterval() {
        try {
            const interval = this.settings.timeSlotInterval;
            return (typeof interval === 'number' && interval >= 15 && interval <= 120) ? interval : 30;
        } catch (error) {
            Utils.log('error', 'Error getting time slot interval', error);
            return 30;
        }
    }

    isBusinessDay(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'isBusinessDay called with invalid date', date);
                return false;
            }

            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const businessHours = this.getBusinessHours();
            
            return businessHours[dayName] && !businessHours[dayName].closed;
        } catch (error) {
            Utils.log('error', 'Error checking if business day', { date, error: error.message });
            return false;
        }
    }

    isHoliday(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'isHoliday called with invalid date', date);
                return false;
            }

            const dateString = new Date(date).toISOString().split('T')[0];
            const holidays = this.getHolidays();
            
            return holidays.includes(dateString);
        } catch (error) {
            Utils.log('error', 'Error checking if holiday', { date, error: error.message });
            return false;
        }
    }

    getBusinessHoursForDay(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'getBusinessHoursForDay called with invalid date', date);
                return null;
            }

            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const businessHours = this.getBusinessHours();
            
            return businessHours[dayName] || null;
        } catch (error) {
            Utils.log('error', 'Error getting business hours for day', { date, error: error.message });
            return null;
        }
    }

    isDateAvailable(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'isDateAvailable called with invalid date', date);
                return false;
            }

            // Check if date is in the past
            if (Utils.isDateInPast(date)) {
                return false;
            }

            // Check if it's a business day
            if (!this.isBusinessDay(date)) {
                return false;
            }

            // Check if it's a holiday
            if (this.isHoliday(date)) {
                return false;
            }

            return true;
        } catch (error) {
            Utils.log('error', 'Error checking date availability', { date, error: error.message });
            return false;
        }
    }

    isTimeInBreak(time, businessHours) {
        try {
            if (!businessHours || typeof businessHours !== 'object' || !businessHours.hasBreak) {
                return false;
            }

            if (!time || typeof time !== 'string') {
                Utils.log('warn', 'isTimeInBreak called with invalid time', time);
                return false;
            }

            const timeMinutes = Utils.parseTimeToMinutes(time);
            const breakStart = Utils.parseTimeToMinutes(businessHours.breakStart);
            const breakEnd = Utils.parseTimeToMinutes(businessHours.breakEnd);
            
            return timeMinutes >= breakStart && timeMinutes < breakEnd;
        } catch (error) {
            Utils.log('error', 'Error checking if time is in break', { time, businessHours, error: error.message });
            return false;
        }
    }

    generateTimeSlots(date) {
        try {
            if (!Utils.isValidDate(date)) {
                Utils.log('warn', 'generateTimeSlots called with invalid date', date);
                return [];
            }

            const businessHours = this.getBusinessHoursForDay(date);
            if (!businessHours || businessHours.closed) {
                Utils.log('debug', 'No business hours or closed for date', date);
                return [];
            }

            const slots = [];
            const interval = this.getTimeSlotInterval();
            const openTime = Utils.parseTimeToMinutes(businessHours.open);
            const closeTime = Utils.parseTimeToMinutes(businessHours.close);

            if (openTime >= closeTime) {
                Utils.log('warn', 'Invalid business hours: open time >= close time', businessHours);
                return [];
            }

            if (businessHours.hasBreak) {
                const breakStart = Utils.parseTimeToMinutes(businessHours.breakStart);
                const breakEnd = Utils.parseTimeToMinutes(businessHours.breakEnd);

                // Validate break times
                if (breakStart >= breakEnd || breakStart < openTime || breakEnd > closeTime) {
                    Utils.log('warn', 'Invalid break times, ignoring break', businessHours);
                    // Generate slots without break
                    for (let time = openTime; time < closeTime; time += interval) {
                        slots.push(Utils.minutesToTime(time));
                    }
                } else {
                    // Morning slots (before break)
                    for (let time = openTime; time < breakStart; time += interval) {
                        slots.push(Utils.minutesToTime(time));
                    }

                    // Afternoon slots (after break)
                    for (let time = breakEnd; time < closeTime; time += interval) {
                        slots.push(Utils.minutesToTime(time));
                    }
                }
            } else {
                // Regular continuous hours
                for (let time = openTime; time < closeTime; time += interval) {
                    slots.push(Utils.minutesToTime(time));
                }
            }

            Utils.log('debug', `Generated ${slots.length} time slots for ${date}`);
            return slots;
        } catch (error) {
            Utils.log('error', 'Error generating time slots', { date, error: error.message });
            return [];
        }
    }

    formatBusinessHoursDisplay(businessHours) {
        try {
            if (!businessHours || typeof businessHours !== 'object') {
                return 'Orari non disponibili';
            }

            if (businessHours.closed) {
                return 'Chiuso';
            }
            
            if (businessHours.hasBreak) {
                return `${businessHours.open} - ${businessHours.breakStart} / ${businessHours.breakEnd} - ${businessHours.close}`;
            } else {
                return `${businessHours.open} - ${businessHours.close}`;
            }
        } catch (error) {
            Utils.log('error', 'Error formatting business hours display', { businessHours, error: error.message });
            return 'Errore formato orari';
        }
    }

    // Health check method
    getHealthStatus() {
        try {
            return {
                isLoading: this.isLoading,
                lastLoadTime: this.lastLoadTime,
                hasDbManager: !!this.dbManager,
                settingsValid: this.validateSettings(this.settings),
                businessHoursCount: Object.keys(this.settings.businessHours || {}).length,
                holidaysCount: (this.settings.holidays || []).length,
                timeSlotInterval: this.settings.timeSlotInterval
            };
        } catch (error) {
            Utils.log('error', 'Error getting health status', error);
            return {
                isLoading: false,
                lastLoadTime: null,
                hasDbManager: false,
                settingsValid: false,
                businessHoursCount: 0,
                holidaysCount: 0,
                timeSlotInterval: 30,
                error: error.message
            };
        }
    }

    // Reset to defaults
    resetToDefaults() {
        try {
            Utils.log('info', 'Resetting settings to defaults');
            this.settings = this.deepClone(this.defaultSettings);
            return true;
        } catch (error) {
            Utils.log('error', 'Error resetting to defaults', error);
            return false;
        }
    }
}
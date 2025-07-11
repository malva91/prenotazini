// Calendar management
import { Utils } from './utils.js';

export class CalendarManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.viewMode = 'month'; // month, week, day
    }

    generateCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const calendar = [];
        const current = new Date(startDate);

        for (let week = 0; week < 6; week++) {
            const weekDays = [];
            for (let day = 0; day < 7; day++) {
                weekDays.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            calendar.push(weekDays);
            
            // Stop if we've covered all days of the month
            if (current.getMonth() !== month && week >= 4) break;
        }

        return calendar;
    }

    generateTimeSlots(date) {
        const businessHours = this.settingsManager.getBusinessHoursForDay(date);
        if (!businessHours || businessHours.closed) return [];

        const slots = [];
        const interval = this.settingsManager.getTimeSlotInterval();
        const openTime = Utils.parseTimeToMinutes(businessHours.open);
        const closeTime = Utils.parseTimeToMinutes(businessHours.close);

        for (let time = openTime; time < closeTime; time += interval) {
            slots.push(Utils.minutesToTime(time));
        }

        return slots;
    }

    isDateAvailable(date) {
        if (Utils.isDateInPast(date)) return false;
        if (!this.settingsManager.isBusinessDay(date)) return false;
        if (this.settingsManager.isHoliday(date)) return false;
        return true;
    }

    getWeekDates(date) {
        const week = [];
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(startOfWeek);
            weekDate.setDate(startOfWeek.getDate() + i);
            week.push(weekDate);
        }

        return week;
    }

    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        return this.currentDate;
    }

    navigateWeek(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        return this.currentDate;
    }

    navigateDay(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + direction);
        return this.currentDate;
    }

    setViewMode(mode) {
        this.viewMode = mode;
    }

    getViewMode() {
        return this.viewMode;
    }

    getCurrentDate() {
        return new Date(this.currentDate);
    }

    setCurrentDate(date) {
        this.currentDate = new Date(date);
    }

    goToToday() {
        this.currentDate = new Date();
        return this.currentDate;
    }
}
// Utility functions
export class Utils {
    static formatDate(date) {
        return new Intl.DateTimeFormat('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    static formatTime(time) {
        return time.replace(/^(\d{1,2}):(\d{2})$/, (match, hours, minutes) => {
            const h = parseInt(hours);
            const m = parseInt(minutes);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        });
    }

    static formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins} min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}min`;
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static isDateInPast(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    }

    static parseTimeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    static minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    static getRandomColor() {
        const colors = [
            '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
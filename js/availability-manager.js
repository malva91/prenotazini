// Availability Manager
class AvailabilityManager {
    constructor() {
        this.config = {
            regularHours: {
                '1': [{ start: '07:00', end: '12:00' }, { start: '14:00', end: '19:00' }], // Lunedì
                '2': [{ start: '07:00', end: '12:00' }, { start: '14:00', end: '19:00' }], // Martedì
                '3': [{ start: '07:00', end: '12:00' }, { start: '14:00', end: '19:00' }], // Mercoledì
                '4': [{ start: '07:00', end: '12:00' }, { start: '14:00', end: '19:00' }], // Giovedì
                '5': [{ start: '07:00', end: '12:00' }, { start: '14:00', end: '19:00' }], // Venerdì
                '6': [{ start: '07:00', end: '17:00' }], // Sabato
                '0': [] // Domenica chiuso
            },
            specialHours: [],
            slotDuration: 15, // 15 minuti
            breakBetweenSlots: 0,
            holidays: [
                '2024-01-01', '2024-01-06', '2024-04-25', '2024-05-01',
                '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08',
                '2024-12-25', '2024-12-26'
            ]
        };

        this.loadConfig();
        console.log('Availability manager initialized');
    }

    getAvailableSlots(date) {
        const dateStr = utils.formatDate(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay().toString();

        // Controlla se è un giorno festivo
        if (this.config.holidays.includes(dateStr)) {
            console.log(`${dateStr} is a holiday`);
            return [];
        }

        // Controlla orari speciali per questa data
        const specialHour = this.config.specialHours.find(sh => sh.date === dateStr);
        if (specialHour) {
            if (specialHour.type === 'closure') {
                console.log(`${dateStr} is closed: ${specialHour.reason}`);
                return [];
            }
            console.log(`Using special hours for ${dateStr}`);
            return this.generateSlotsFromTimeSlots(specialHour.hours);
        }

        // Usa orari regolari
        const regularHours = this.config.regularHours[dayOfWeek] || [];
        if (regularHours.length === 0) {
            console.log(`${dateStr} is regularly closed`);
            return [];
        }

        return this.generateSlotsFromTimeSlots(regularHours);
    }

    generateSlotsFromTimeSlots(timeSlots) {
        const slots = [];

        timeSlots.forEach(slot => {
            const startTime = this.timeStringToMinutes(slot.start);
            const endTime = this.timeStringToMinutes(slot.end);

            // Genera slot singoli ogni 15 minuti
            for (let time = startTime; time < endTime; time += this.config.slotDuration) {
                const slotTime = this.minutesToTimeString(time);
                slots.push(slotTime);
            }
        });

        return slots.sort();
    }

    timeStringToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    isDateAvailable(date) {
        const slots = this.getAvailableSlots(date);
        return slots.length > 0 && utils.isDateAvailable(date);
    }

    getConfig() {
        return { ...this.config };
    }

    saveConfig() {
        try {
            localStorage.setItem('availability_config', JSON.stringify(this.config));
            console.log('Configuration saved');
        } catch (error) {
            console.error('Failed to save configuration:', error);
        }
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('availability_config');
            if (saved) {
                const loaded = JSON.parse(saved);
                this.config = { ...this.config, ...loaded };
                console.log('Configuration loaded');
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    addHoliday(date) {
        if (!this.config.holidays.includes(date)) {
            this.config.holidays.push(date);
            this.config.holidays.sort();
            this.saveConfig();
            console.log(`Added holiday: ${date}`);
        }
    }

    removeHoliday(date) {
        this.config.holidays = this.config.holidays.filter(h => h !== date);
        this.saveConfig();
        console.log(`Removed holiday: ${date}`);
    }

    updateRegularHours(dayOfWeek, hours) {
        this.config.regularHours[dayOfWeek.toString()] = hours;
        this.saveConfig();
        console.log(`Updated regular hours for day ${dayOfWeek}:`, hours);
    }
}

// Initialize availability manager
const availabilityManager = new AvailabilityManager();
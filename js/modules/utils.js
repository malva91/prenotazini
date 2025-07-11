// Utility functions ottimizzate con gestione errori migliorata
export class Utils {
    static APP_VERSION = '1.0.2';
    
    // OTTIMIZZAZIONE: Cache per regex frequentemente usate
    static _regexCache = new Map();
    
    // OTTIMIZZAZIONE: Cache per formattazioni date
    static _dateFormatCache = new Map();
    
    // OTTIMIZZAZIONE: Pool di colori ottimizzato con migliore distribuzione
    static _colorPool = [
        '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
        '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#f472b6',
        '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa',
        '#4ade80', '#facc15', '#f87171', '#818cf8', '#2dd4bf',
        '#c084fc', '#22d3ee', '#4ade80', '#fbbf24', '#fb923c'
    ];
    
    static log(level, message, data = null) {
        try {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [UTILS-${level.toUpperCase()}] ${message}`;
            
            // OTTIMIZZAZIONE: Logging condizionale basato su environment
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' && level === 'debug') {
                return; // Skip debug logs in production
            }
            
            switch (level) {
                case 'error':
                    console.error(logMessage, data);
                    break;
                case 'warn':
                    console.warn(logMessage, data);
                    break;
                case 'info':
                    console.info(logMessage, data);
                    break;
                default:
                    console.log(logMessage, data);
            }
        } catch (e) {
            console.error('Error in Utils logging:', e);
        }
    }

    // OTTIMIZZAZIONE: Cached regex getter
    static getRegex(pattern, flags = '') {
        const key = `${pattern}_${flags}`;
        if (!this._regexCache.has(key)) {
            this._regexCache.set(key, new RegExp(pattern, flags));
        }
        return this._regexCache.get(key);
    }

    // OTTIMIZZAZIONE: Format date con cache intelligente
    static formatDate(date) {
        try {
            if (!date) {
                this.log('warn', 'formatDate called with null/undefined date');
                return 'Data non valida';
            }

            // Ensure we have a Date object
            let dateObj;
            if (typeof date === 'string') {
                dateObj = new Date(date);
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                this.log('error', 'formatDate called with invalid date type', { date, type: typeof date });
                return 'Data non valida';
            }

            if (isNaN(dateObj.getTime())) {
                this.log('error', 'formatDate called with invalid date', date);
                return 'Data non valida';
            }

            // OTTIMIZZAZIONE: Cache per date formattate
            const dateKey = dateObj.toISOString().split('T')[0];
            if (this._dateFormatCache.has(dateKey)) {
                return this._dateFormatCache.get(dateKey);
            }

            const formatted = new Intl.DateTimeFormat('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(dateObj);

            // OTTIMIZZAZIONE: Limita dimensione cache
            if (this._dateFormatCache.size > 100) {
                const firstKey = this._dateFormatCache.keys().next().value;
                this._dateFormatCache.delete(firstKey);
            }
            
            this._dateFormatCache.set(dateKey, formatted);
            return formatted;
            
        } catch (error) {
            this.log('error', 'Error in formatDate', { date, error: error.message });
            return 'Data non valida';
        }
    }

    // OTTIMIZZAZIONE: Format time con validazione migliorata
    static formatTime(time) {
        try {
            if (!time || typeof time !== 'string') {
                this.log('warn', 'formatTime called with invalid time', time);
                return '00:00';
            }

            // OTTIMIZZAZIONE: Usa cached regex
            const timeRegex = this.getRegex('^(\\d{1,2}):(\\d{2})$');
            const match = time.match(timeRegex);
            
            if (!match) {
                this.log('warn', 'Invalid time format', time);
                return '00:00';
            }

            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                this.log('warn', 'Invalid time values', { time, hours, minutes });
                return '00:00';
            }
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
        } catch (error) {
            this.log('error', 'Error in formatTime', { time, error: error.message });
            return '00:00';
        }
    }

    // OTTIMIZZAZIONE: Format duration con cache
    static formatDuration(minutes) {
        try {
            const numMinutes = parseInt(minutes);
            if (isNaN(numMinutes) || numMinutes < 0) {
                this.log('warn', 'formatDuration called with invalid minutes', minutes);
                return '0 min';
            }

            // OTTIMIZZAZIONE: Cache per durate comuni
            if (!this._durationCache) {
                this._durationCache = new Map();
            }
            
            if (this._durationCache.has(numMinutes)) {
                return this._durationCache.get(numMinutes);
            }

            const hours = Math.floor(numMinutes / 60);
            const mins = numMinutes % 60;
            
            let formatted;
            if (hours === 0) {
                formatted = `${mins} min`;
            } else if (mins === 0) {
                formatted = `${hours}h`;
            } else {
                formatted = `${hours}h ${mins}min`;
            }
            
            // Cache solo durate comuni (< 12 ore)
            if (numMinutes < 720) {
                this._durationCache.set(numMinutes, formatted);
            }
            
            return formatted;
            
        } catch (error) {
            this.log('error', 'Error in formatDuration', { minutes, error: error.message });
            return '0 min';
        }
    }

    // OTTIMIZZAZIONE: ID generation più robusto e veloce
    static generateId() {
        try {
            // Usa performance.now() se disponibile per maggiore precisione
            const timestamp = (typeof performance !== 'undefined' && performance.now) 
                ? performance.now().toString(36)
                : Date.now().toString(36);
                
            const random = Math.random().toString(36).substr(2, 9);
            
            // OTTIMIZZAZIONE: Counter per evitare collisioni
            this._idCounter = (this._idCounter || 0) + 1;
            const counter = this._idCounter.toString(36);
            
            return `${timestamp}-${random}-${counter}`;
        } catch (error) {
            this.log('error', 'Error generating ID', error);
            // Fallback più semplice ma comunque unico
            return `${Date.now()}-${Math.random().toString(36).substr(2)}`;
        }
    }

    // OTTIMIZZAZIONE: Date validation più robusta
    static isDateInPast(date) {
        try {
            if (!date) {
                this.log('warn', 'isDateInPast called with null/undefined date');
                return true;
            }

            // OTTIMIZZAZIONE: Cache per "oggi"
            if (!this._todayCache || Date.now() - this._todayCache.timestamp > 60000) { // 1 minuto
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                this._todayCache = {
                    date: today,
                    timestamp: Date.now()
                };
            }
            
            const checkDate = new Date(date);
            if (isNaN(checkDate.getTime())) {
                this.log('warn', 'isDateInPast called with invalid date', date);
                return true;
            }
            
            checkDate.setHours(0, 0, 0, 0);
            return checkDate < this._todayCache.date;
            
        } catch (error) {
            this.log('error', 'Error in isDateInPast', { date, error: error.message });
            return true;
        }
    }

    // OTTIMIZZAZIONE: Parse time ottimizzato
    static parseTimeToMinutes(timeString) {
        try {
            if (!timeString || typeof timeString !== 'string') {
                this.log('warn', 'parseTimeToMinutes called with invalid time', timeString);
                return 0;
            }

            // OTTIMIZZAZIONE: Cache per conversioni comuni
            if (!this._timeParseCache) {
                this._timeParseCache = new Map();
            }
            
            if (this._timeParseCache.has(timeString)) {
                return this._timeParseCache.get(timeString);
            }

            const parts = timeString.split(':');
            if (parts.length !== 2) {
                this.log('warn', 'Invalid time format in parseTimeToMinutes', timeString);
                return 0;
            }

            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                this.log('warn', 'Invalid time values in parseTimeToMinutes', { timeString, hours, minutes });
                return 0;
            }

            const result = hours * 60 + minutes;
            
            // Cache solo orari validi
            if (this._timeParseCache.size < 100) { // Limita dimensione cache
                this._timeParseCache.set(timeString, result);
            }
            
            return result;
            
        } catch (error) {
            this.log('error', 'Error in parseTimeToMinutes', { timeString, error: error.message });
            return 0;
        }
    }

    // OTTIMIZZAZIONE: Minutes to time con cache
    static minutesToTime(minutes) {
        try {
            const numMinutes = parseInt(minutes);
            if (isNaN(numMinutes) || numMinutes < 0) {
                this.log('warn', 'minutesToTime called with invalid minutes', minutes);
                return '00:00';
            }

            // OTTIMIZZAZIONE: Cache per conversioni comuni
            if (!this._minutesToTimeCache) {
                this._minutesToTimeCache = new Map();
            }
            
            if (this._minutesToTimeCache.has(numMinutes)) {
                return this._minutesToTimeCache.get(numMinutes);
            }

            const hours = Math.floor(numMinutes / 60);
            const mins = numMinutes % 60;
            
            // Ensure hours don't exceed 23
            const validHours = Math.min(hours, 23);
            
            const result = `${validHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            
            // Cache solo per orari validi e comuni (< 24 ore)
            if (numMinutes < 1440 && this._minutesToTimeCache.size < 100) {
                this._minutesToTimeCache.set(numMinutes, result);
            }
            
            return result;
            
        } catch (error) {
            this.log('error', 'Error in minutesToTime', { minutes, error: error.message });
            return '00:00';
        }
    }

    // OTTIMIZZAZIONE: Random color con distribuzione migliorata
    static getRandomColor() {
        try {
            // OTTIMIZZAZIONE: Usa crypto.getRandomValues se disponibile per migliore randomness
            let randomIndex;
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                const array = new Uint32Array(1);
                crypto.getRandomValues(array);
                randomIndex = array[0] % this._colorPool.length;
            } else {
                randomIndex = Math.floor(Math.random() * this._colorPool.length);
            }
            
            return this._colorPool[randomIndex];
        } catch (error) {
            this.log('error', 'Error in getRandomColor', error);
            return '#8b5cf6'; // Fallback color
        }
    }

    // OTTIMIZZAZIONE: Validazione date più robusta
    static validateDateParameter(date) {
        try {
            if (!date) return null;
            
            if (typeof date === 'string') {
                // OTTIMIZZAZIONE: Usa cached regex
                const dateRegex = this.getRegex('^\\d{4}-\\d{2}-\\d{2}$');
                if (!dateRegex.test(date)) {
                    return null;
                }
                
                const parsed = new Date(date + 'T00:00:00');
                if (isNaN(parsed.getTime())) {
                    return null;
                }
                
                // OTTIMIZZAZIONE: Validazione più efficiente dei componenti
                const [year, month, day] = date.split('-').map(Number);
                if (parsed.getFullYear() !== year || 
                    parsed.getMonth() !== month - 1 || 
                    parsed.getDate() !== day) {
                    return null;
                }
                
                return date;
            }
            
            if (date instanceof Date) {
                return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
            }
            
            return null;
        } catch (error) {
            this.log('error', 'Error validating date parameter', { date, error: error.message });
            return null;
        }
    }

    // OTTIMIZZAZIONE: Unique color con algoritmo migliorato
    static getUniqueColorForDate(date, existingBookings = []) {
        try {
            const dateString = this.validateDateParameter(date);
            if (!dateString) {
                this.log('warn', 'Invalid date parameter in getUniqueColorForDate', date);
                return this.getRandomColor();
            }
            
            // OTTIMIZZAZIONE: Filtraggio più efficiente
            const usedColors = new Set();
            
            if (Array.isArray(existingBookings)) {
                for (const booking of existingBookings) {
                    if (booking && 
                        typeof booking === 'object' && 
                        booking.date === dateString &&
                        booking.color &&
                        typeof booking.color === 'string') {
                        usedColors.add(booking.color);
                    }
                }
            }
            
            // OTTIMIZZAZIONE: Trova primo colore disponibile più efficiente
            for (const color of this._colorPool) {
                if (!usedColors.has(color)) {
                    this.log('debug', 'Assigned unique color', { 
                        date: dateString,
                        color,
                        usedColorsCount: usedColors.size
                    });
                    return color;
                }
            }
            
            // Se tutti i colori sono usati, usa distribuzione hash-based
            const hash = this.simpleHash(dateString + Date.now());
            const colorIndex = hash % this._colorPool.length;
            
            this.log('info', `All colors used for date ${dateString}, using hash-based selection`);
            return this._colorPool[colorIndex];
            
        } catch (error) {
            this.log('error', 'Error in getUniqueColorForDate', { date, error: error.message });
            return '#8b5cf6';
        }
    }

    // OTTIMIZZAZIONE: Simple hash function per distribuzione colori
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // OTTIMIZZAZIONE: Debounce migliorato con cleanup
    static debounce(func, wait = 300) {
        if (typeof func !== 'function') {
            this.log('error', 'debounce called with non-function', typeof func);
            return () => {};
        }

        let timeout;
        let lastArgs;
        
        const debouncedFunction = function(...args) {
            lastArgs = args;
            
            try {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    try {
                        func.apply(this, lastArgs);
                    } catch (error) {
                        Utils.log('error', 'Error in debounced function execution', error);
                    }
                }, wait);
            } catch (error) {
                Utils.log('error', 'Error in debounced function setup', error);
            }
        };
        
        // OTTIMIZZAZIONE: Aggiungi metodo di cleanup
        debouncedFunction.cancel = () => {
            clearTimeout(timeout);
            timeout = null;
            lastArgs = null;
        };
        
        return debouncedFunction;
    }

    // OTTIMIZZAZIONE: Same date comparison più efficiente
    static isSameDate(date1, date2) {
        try {
            if (!date1 || !date2) {
                return false;
            }

            // OTTIMIZZAZIONE: Confronto diretto se entrambe sono stringhe ISO
            if (typeof date1 === 'string' && typeof date2 === 'string') {
                const d1Str = date1.split('T')[0];
                const d2Str = date2.split('T')[0];
                return d1Str === d2Str;
            }

            const d1 = new Date(date1);
            const d2 = new Date(date2);
            
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
                return false;
            }

            return d1.toDateString() === d2.toDateString();
        } catch (error) {
            this.log('error', 'Error in isSameDate', { date1, date2, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Email validation con cached regex
    static validateEmail(email) {
        try {
            if (!email || typeof email !== 'string') {
                return false;
            }
            
            // OTTIMIZZAZIONE: Usa cached regex più robusta
            const emailRegex = this.getRegex('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
            return emailRegex.test(email.trim());
        } catch (error) {
            this.log('error', 'Error in validateEmail', { email, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Phone validation migliorata
    static validatePhone(phone) {
        try {
            if (!phone || typeof phone !== 'string') {
                return false;
            }
            
            const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
            
            // OTTIMIZZAZIONE: Validazione più robusta per numeri italiani e internazionali
            const phoneRegex = this.getRegex('^[\\d]{8,15}$');
            return phoneRegex.test(cleanPhone);
        } catch (error) {
            this.log('error', 'Error in validatePhone', { phone, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Safe DOM operations con performance migliorata
    static safeGetElement(id) {
        try {
            if (!id) {
                this.log('warn', 'safeGetElement called with empty id');
                return null;
            }
            
            // OTTIMIZZAZIONE: Cache per elementi DOM frequentemente acceduti
            if (!this._elementCache) {
                this._elementCache = new Map();
            }
            
            if (this._elementCache.has(id)) {
                const cached = this._elementCache.get(id);
                // Verifica che l'elemento sia ancora nel DOM
                if (document.contains(cached)) {
                    return cached;
                } else {
                    this._elementCache.delete(id);
                }
            }
            
            const element = document.getElementById(id);
            if (element) {
                // Cache solo se la cache non è troppo grande
                if (this._elementCache.size < 50) {
                    this._elementCache.set(id, element);
                }
            } else {
                this.log('warn', `Element not found: ${id}`);
            }
            
            return element;
        } catch (error) {
            this.log('error', 'Error in safeGetElement', { id, error: error.message });
            return null;
        }
    }

    // OTTIMIZZAZIONE: Batch DOM updates
    static safeSetTextContent(elementId, content) {
        try {
            const element = this.safeGetElement(elementId);
            if (element && element.textContent !== content) {
                element.textContent = content || '';
                return true;
            }
            return false;
        } catch (error) {
            this.log('error', 'Error in safeSetTextContent', { elementId, content, error: error.message });
            return false;
        }
    }

    static safeSetInnerHTML(elementId, html) {
        try {
            const element = this.safeGetElement(elementId);
            if (element && element.innerHTML !== html) {
                element.innerHTML = html || '';
                return true;
            }
            return false;
        } catch (error) {
            this.log('error', 'Error in safeSetInnerHTML', { elementId, html, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Event listener con cleanup automatico
    static safeAddEventListener(elementId, event, handler, options = {}) {
        try {
            if (typeof handler !== 'function') {
                this.log('error', 'safeAddEventListener called with non-function handler');
                return null;
            }

            const element = this.safeGetElement(elementId);
            if (!element) {
                return null;
            }

            // OTTIMIZZAZIONE: Wrapper per error handling automatico
            const wrappedHandler = (e) => {
                try {
                    handler(e);
                } catch (error) {
                    this.log('error', `Error in event handler for ${event} on ${elementId}`, error);
                }
            };

            element.addEventListener(event, wrappedHandler, options);
            
            // OTTIMIZZAZIONE: Restituisci funzione di cleanup
            return () => {
                try {
                    element.removeEventListener(event, wrappedHandler, options);
                } catch (error) {
                    this.log('error', 'Error removing event listener', error);
                }
            };
        } catch (error) {
            this.log('error', 'Error in safeAddEventListener', { elementId, event, error: error.message });
            return null;
        }
    }

    // OTTIMIZZAZIONE: JSON operations con error recovery
    static safeParseJSON(jsonString, defaultValue = null) {
        try {
            if (!jsonString || typeof jsonString !== 'string') {
                return defaultValue;
            }
            return JSON.parse(jsonString);
        } catch (error) {
            this.log('warn', 'Error parsing JSON, returning default value', { 
                jsonString: jsonString?.substring(0, 100), 
                error: error.message 
            });
            return defaultValue;
        }
    }

    static safeStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            this.log('error', 'Error stringifying object', { obj, error: error.message });
            return defaultValue;
        }
    }

    // OTTIMIZZAZIONE: Input sanitization migliorata
    static sanitizeInput(input) {
        try {
            if (!input || typeof input !== 'string') {
                return '';
            }
            
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .replace(/javascript:/gi, '') // Remove javascript: protocol
                .substring(0, 1000); // Limit length
        } catch (error) {
            this.log('error', 'Error sanitizing input', { input, error: error.message });
            return '';
        }
    }

    // OTTIMIZZAZIONE: Date validation più robusta
    static isValidDate(date) {
        try {
            if (!date) return false;
            
            const d = new Date(date);
            if (!(d instanceof Date) || isNaN(d.getTime())) {
                return false;
            }
            
            // OTTIMIZZAZIONE: Verifica range ragionevole (1900-2100)
            const year = d.getFullYear();
            return year >= 1900 && year <= 2100;
        } catch (error) {
            this.log('error', 'Error in isValidDate', { date, error: error.message });
            return false;
        }
    }

    // OTTIMIZZAZIONE: Timeout con cleanup automatico
    static createSafeTimeout(callback, delay) {
        try {
            if (typeof callback !== 'function') {
                this.log('error', 'createSafeTimeout called with non-function callback');
                return null;
            }

            const timeoutId = setTimeout(() => {
                try {
                    callback();
                } catch (error) {
                    this.log('error', 'Error in timeout callback', error);
                }
            }, delay || 0);
            
            // OTTIMIZZAZIONE: Restituisci oggetto con cleanup
            return {
                id: timeoutId,
                cancel: () => clearTimeout(timeoutId)
            };
        } catch (error) {
            this.log('error', 'Error creating timeout', error);
            return null;
        }
    }

    // OTTIMIZZAZIONE: Performance measurement utilities
    static startPerformanceMeasure(name) {
        try {
            if (typeof performance !== 'undefined' && performance.mark) {
                performance.mark(`${name}-start`);
                return name;
            }
            return Date.now();
        } catch (error) {
            this.log('error', 'Error starting performance measure', error);
            return Date.now();
        }
    }

    static endPerformanceMeasure(measureId) {
        try {
            if (typeof performance !== 'undefined' && performance.mark && typeof measureId === 'string') {
                performance.mark(`${measureId}-end`);
                performance.measure(measureId, `${measureId}-start`, `${measureId}-end`);
                
                const measure = performance.getEntriesByName(measureId)[0];
                this.log('debug', `Performance: ${measureId}`, { duration: `${measure.duration.toFixed(2)}ms` });
                
                // Cleanup
                performance.clearMarks(`${measureId}-start`);
                performance.clearMarks(`${measureId}-end`);
                performance.clearMeasures(measureId);
                
                return measure.duration;
            } else if (typeof measureId === 'number') {
                const duration = Date.now() - measureId;
                this.log('debug', 'Performance measure', { duration: `${duration}ms` });
                return duration;
            }
        } catch (error) {
            this.log('error', 'Error ending performance measure', error);
        }
        return 0;
    }

    // OTTIMIZZAZIONE: Memory cleanup utilities
    static clearCaches() {
        try {
            this._regexCache?.clear();
            this._dateFormatCache?.clear();
            this._durationCache?.clear();
            this._timeParseCache?.clear();
            this._minutesToTimeCache?.clear();
            this._elementCache?.clear();
            this._todayCache = null;
            
            this.log('info', 'Utils caches cleared');
        } catch (error) {
            this.log('error', 'Error clearing caches', error);
        }
    }

    // OTTIMIZZAZIONE: Get cache statistics
    static getCacheStats() {
        try {
            return {
                regex: this._regexCache?.size || 0,
                dateFormat: this._dateFormatCache?.size || 0,
                duration: this._durationCache?.size || 0,
                timeParse: this._timeParseCache?.size || 0,
                minutesToTime: this._minutesToTimeCache?.size || 0,
                element: this._elementCache?.size || 0,
                todayCached: !!this._todayCache
            };
        } catch (error) {
            this.log('error', 'Error getting cache stats', error);
            return {};
        }
    }
}

// OTTIMIZZAZIONE: Cleanup automatico delle cache ogni 10 minuti
if (typeof window !== 'undefined') {
    setInterval(() => {
        try {
            // Pulisci cache se sono troppo grandi
            const stats = Utils.getCacheStats();
            const totalCacheSize = Object.values(stats).reduce((sum, size) => sum + (typeof size === 'number' ? size : 0), 0);
            
            if (totalCacheSize > 500) { // Soglia arbitraria
                Utils.clearCaches();
                Utils.log('info', 'Automatic cache cleanup performed', { previousSize: totalCacheSize });
            }
        } catch (error) {
            Utils.log('error', 'Error in automatic cache cleanup', error);
        }
    }, 10 * 60 * 1000); // 10 minuti
}
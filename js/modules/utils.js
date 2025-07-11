// Utility functions with enhanced error handling and logging
export class Utils {
    static APP_VERSION = '1.0.1'; // Version for cache busting
    
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
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
    }

    static formatDate(date) {
        try {
            if (!date) {
                this.log('warn', 'formatDate called with null/undefined date');
                return 'Data non valida';
            }

            // Ensure we have a Date object
            if (typeof date === 'string') {
                date = new Date(date);
            }

            if (!(date instanceof Date) || isNaN(date.getTime())) {
                this.log('error', 'formatDate called with invalid date', date);
                return 'Data non valida';
            }

            return new Intl.DateTimeFormat('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } catch (error) {
            this.log('error', 'Error in formatDate', { date, error: error.message });
            return 'Data non valida';
        }
    }

    static formatTime(time) {
        try {
            if (!time || typeof time !== 'string') {
                this.log('warn', 'formatTime called with invalid time', time);
                return '00:00';
            }

            return time.replace(/^(\d{1,2}):(\d{2})$/, (match, hours, minutes) => {
                const h = parseInt(hours);
                const m = parseInt(minutes);
                
                if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
                    this.log('warn', 'Invalid time format', time);
                    return '00:00';
                }
                
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            });
        } catch (error) {
            this.log('error', 'Error in formatTime', { time, error: error.message });
            return '00:00';
        }
    }

    static formatDuration(minutes) {
        try {
            const numMinutes = parseInt(minutes);
            if (isNaN(numMinutes) || numMinutes < 0) {
                this.log('warn', 'formatDuration called with invalid minutes', minutes);
                return '0 min';
            }

            const hours = Math.floor(numMinutes / 60);
            const mins = numMinutes % 60;
            
            if (hours === 0) return `${mins} min`;
            if (mins === 0) return `${hours}h`;
            return `${hours}h ${mins}min`;
        } catch (error) {
            this.log('error', 'Error in formatDuration', { minutes, error: error.message });
            return '0 min';
        }
    }

    static generateId() {
        try {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        } catch (error) {
            this.log('error', 'Error generating ID', error);
            // Fallback to simple timestamp
            return Date.now().toString();
        }
    }

    static isDateInPast(date) {
        try {
            if (!date) {
                this.log('warn', 'isDateInPast called with null/undefined date');
                return true; // Safer to assume it's in the past
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const checkDate = new Date(date);
            if (isNaN(checkDate.getTime())) {
                this.log('warn', 'isDateInPast called with invalid date', date);
                return true; // Safer to assume it's in the past
            }
            
            checkDate.setHours(0, 0, 0, 0);
            return checkDate < today;
        } catch (error) {
            this.log('error', 'Error in isDateInPast', { date, error: error.message });
            return true; // Safer to assume it's in the past
        }
    }

    static parseTimeToMinutes(timeString) {
        try {
            if (!timeString || typeof timeString !== 'string') {
                this.log('warn', 'parseTimeToMinutes called with invalid time', timeString);
                return 0;
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

            return hours * 60 + minutes;
        } catch (error) {
            this.log('error', 'Error in parseTimeToMinutes', { timeString, error: error.message });
            return 0;
        }
    }

    static minutesToTime(minutes) {
        try {
            const numMinutes = parseInt(minutes);
            if (isNaN(numMinutes) || numMinutes < 0) {
                this.log('warn', 'minutesToTime called with invalid minutes', minutes);
                return '00:00';
            }

            const hours = Math.floor(numMinutes / 60);
            const mins = numMinutes % 60;
            
            // Ensure hours don't exceed 23
            const validHours = Math.min(hours, 23);
            
            return `${validHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        } catch (error) {
            this.log('error', 'Error in minutesToTime', { minutes, error: error.message });
            return '00:00';
        }
    }

    static getRandomColor() {
        try {
            const colors = [
                '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
                '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#f472b6',
                '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa',
                '#4ade80', '#facc15', '#f87171', '#818cf8', '#2dd4bf'
            ];
            const randomIndex = Math.floor(Math.random() * colors.length);
            return colors[randomIndex] || '#8b5cf6'; // Fallback color
        } catch (error) {
            this.log('error', 'Error in getRandomColor', error);
            return '#8b5cf6'; // Fallback color
        }
    }

    static getUniqueColorForDate(date, existingBookings = []) {
        try {
            const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            
            // Get all colors used on this date
            const usedColors = existingBookings
                .filter(booking => booking.date === dateString)
                .map(booking => booking.color)
                .filter(color => color); // Remove null/undefined colors
            
            const availableColors = [
                '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
                '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#f472b6',
                '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa',
                '#4ade80', '#facc15', '#f87171', '#818cf8', '#2dd4bf'
            ];
            
            // Find first available color not used on this date
            const unusedColors = availableColors.filter(color => !usedColors.includes(color));
            
            if (unusedColors.length > 0) {
                // Return first unused color
                return unusedColors[0];
            } else {
                // If all colors are used, return a random one (fallback)
                this.log('warn', `All colors used for date ${dateString}, using random color`);
                return availableColors[Math.floor(Math.random() * availableColors.length)];
            }
        } catch (error) {
            this.log('error', 'Error in getUniqueColorForDate', { date, error: error.message });
            return '#8b5cf6'; // Fallback color
        }
    }

    static getVersionedUrl(url) {
        try {
            if (!url || typeof url !== 'string') {
                return url;
            }
            
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}v=${this.APP_VERSION}`;
        } catch (error) {
            this.log('error', 'Error in getVersionedUrl', { url, error: error.message });
            return url;
        }
    }

    static loadVersionedScript(src, onLoad = null, onError = null) {
        try {
            const script = document.createElement('script');
            script.src = this.getVersionedUrl(src);
            script.type = 'module';
            
            if (onLoad && typeof onLoad === 'function') {
                script.onload = onLoad;
            }
            
            if (onError && typeof onError === 'function') {
                script.onerror = onError;
            }
            
            document.head.appendChild(script);
            return script;
        } catch (error) {
            this.log('error', 'Error loading versioned script', { src, error: error.message });
            return null;
        }
    }

    static loadVersionedStylesheet(href, onLoad = null, onError = null) {
        try {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = this.getVersionedUrl(href);
            
            if (onLoad && typeof onLoad === 'function') {
                link.onload = onLoad;
            }
            
            if (onError && typeof onError === 'function') {
                link.onerror = onError;
            }
            
            document.head.appendChild(link);
            return link;
        } catch (error) {
            this.log('error', 'Error loading versioned stylesheet', { href, error: error.message });
            return null;
        }
    }

    static debounce(func, wait) {
        if (typeof func !== 'function') {
            this.log('error', 'debounce called with non-function', typeof func);
            return () => {}; // Return empty function
        }

        let timeout;
        return function executedFunction(...args) {
            try {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait || 300);
            } catch (error) {
                Utils.log('error', 'Error in debounced function', error);
            }
        };
    }

    static isSameDate(date1, date2) {
        try {
            if (!date1 || !date2) {
                return false;
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

    static validateEmail(email) {
        try {
            if (!email || typeof email !== 'string') {
                return false;
            }
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email.trim());
        } catch (error) {
            this.log('error', 'Error in validateEmail', { email, error: error.message });
            return false;
        }
    }

    static validatePhone(phone) {
        try {
            if (!phone || typeof phone !== 'string') {
                return false;
            }
            const cleanPhone = phone.replace(/\s/g, '');
            const re = /^[\d\s\-\+\(\)]{8,}$/;
            return re.test(cleanPhone) && cleanPhone.length >= 8;
        } catch (error) {
            this.log('error', 'Error in validatePhone', { phone, error: error.message });
            return false;
        }
    }

    static safeGetElement(id) {
        try {
            if (!id) {
                this.log('warn', 'safeGetElement called with empty id');
                return null;
            }
            
            const element = document.getElementById(id);
            if (!element) {
                this.log('warn', `Element not found: ${id}`);
            }
            return element;
        } catch (error) {
            this.log('error', 'Error in safeGetElement', { id, error: error.message });
            return null;
        }
    }

    static safeSetTextContent(elementId, content) {
        try {
            const element = this.safeGetElement(elementId);
            if (element) {
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
            if (element) {
                element.innerHTML = html || '';
                return true;
            }
            return false;
        } catch (error) {
            this.log('error', 'Error in safeSetInnerHTML', { elementId, html, error: error.message });
            return false;
        }
    }

    static safeAddEventListener(elementId, event, handler) {
        try {
            if (typeof handler !== 'function') {
                this.log('error', 'safeAddEventListener called with non-function handler');
                return false;
            }

            const element = this.safeGetElement(elementId);
            if (element) {
                element.addEventListener(event, (e) => {
                    try {
                        handler(e);
                    } catch (error) {
                        this.log('error', `Error in event handler for ${event} on ${elementId}`, error);
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            this.log('error', 'Error in safeAddEventListener', { elementId, event, error: error.message });
            return false;
        }
    }

    static safeParseJSON(jsonString, defaultValue = null) {
        try {
            if (!jsonString || typeof jsonString !== 'string') {
                return defaultValue;
            }
            return JSON.parse(jsonString);
        } catch (error) {
            this.log('warn', 'Error parsing JSON, returning default value', { jsonString, error: error.message });
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

    static sanitizeInput(input) {
        try {
            if (!input || typeof input !== 'string') {
                return '';
            }
            
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .substring(0, 1000); // Limit length
        } catch (error) {
            this.log('error', 'Error sanitizing input', { input, error: error.message });
            return '';
        }
    }

    static isValidDate(date) {
        try {
            if (!date) return false;
            const d = new Date(date);
            return d instanceof Date && !isNaN(d.getTime());
        } catch (error) {
            this.log('error', 'Error in isValidDate', { date, error: error.message });
            return false;
        }
    }

    static createSafeTimeout(callback, delay) {
        try {
            if (typeof callback !== 'function') {
                this.log('error', 'createSafeTimeout called with non-function callback');
                return null;
            }

            return setTimeout(() => {
                try {
                    callback();
                } catch (error) {
                    this.log('error', 'Error in timeout callback', error);
                }
            }, delay || 0);
        } catch (error) {
            this.log('error', 'Error creating timeout', error);
            return null;
        }
    }
}
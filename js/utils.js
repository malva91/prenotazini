// Utility functions
const utils = {
    // Generate UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Format date
    formatDate(date, format = 'dd/MM/yyyy') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        switch (format) {
            case 'dd/MM/yyyy':
                return `${day}/${month}/${year}`;
            case 'yyyy-MM-dd':
                return `${year}-${month}-${day}`;
            case 'EEEE d MMMM yyyy':
                return date.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
            default:
                return date.toLocaleDateString('it-IT');
        }
    },

    // Check if date is today or in the future
    isDateAvailable(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        return checkDate >= today;
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone
    validatePhone(phone) {
        const re = /^[\d\s\-\+\(\)]{8,}$/;
        return re.test(phone.replace(/\s/g, ''));
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show/hide elements
    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.remove('hidden');
        }
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.add('hidden');
        }
    },

    // Create element with classes and content
    createElement(tag, classes = '', content = '') {
        const element = document.createElement(tag);
        if (classes) {
            element.className = classes;
        }
        if (content) {
            element.innerHTML = content;
        }
        return element;
    },

    // Add event listener with cleanup
    addEventListeners(elements, event, handler) {
        if (!Array.isArray(elements)) {
            elements = [elements];
        }
        
        elements.forEach(element => {
            if (typeof element === 'string') {
                element = document.getElementById(element);
            }
            if (element) {
                element.addEventListener(event, handler);
            }
        });
    }
};
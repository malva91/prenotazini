// Calendar view renderers
import { Utils } from './utils.js';

export class CalendarViews {
    constructor(bookingManager, settingsManager) {
        this.bookingManager = bookingManager;
        this.settingsManager = settingsManager;
    }

    renderMonthView(date, bookings) {
        const container = document.getElementById('adminCalendarGrid');
        if (!container) return;

        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        container.innerHTML = '';
        container.className = 'grid grid-cols-7 gap-1';

        // Header
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'bg-gray-700 p-3 text-center font-semibold text-gray-300 border border-gray-600';
            header.textContent = day;
            container.appendChild(header);
        });

        // Calendar days
        const current = new Date(startDate);
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const dayElement = this.createMonthDayElement(current, month, bookings);
                container.appendChild(dayElement);
                current.setDate(current.getDate() + 1);
            }
            if (current.getMonth() !== month && week >= 4) break;
        }
    }

    createMonthDayElement(date, currentMonth, bookings) {
        const dayElement = document.createElement('div');
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = Utils.isSameDate ? Utils.isSameDate(date, new Date()) : 
                       date.toDateString() === new Date().toDateString();
        
        const dayBookings = bookings.filter(booking => 
            booking.date === date.toISOString().split('T')[0] && 
            (booking.status === 'confirmed' || booking.status === 'old')
        );

        dayElement.className = `
            bg-gray-800 border border-gray-600 p-2 min-h-24 relative
            ${isCurrentMonth ? 'text-gray-100' : 'text-gray-500 bg-gray-900'}
            ${isToday ? 'ring-2 ring-blue-500' : ''}
        `;

        dayElement.innerHTML = `
            <div class="font-medium mb-1">${date.getDate()}</div>
            <div class="space-y-1">
                ${dayBookings.slice(0, 3).map(booking => `
                    <div class="text-xs p-1 rounded truncate cursor-pointer ${booking.status === 'old' ? 'booking-old' : ''}" 
                         style="background-color: ${booking.color || Utils.getRandomColor()}; color: white;"
                         onclick="bookingSystem.showBookingDetails('${booking.id}')"
                         title="${booking.firstName} ${booking.lastName} - ${booking.time}">
                        ${booking.firstName} ${booking.lastName}
                    </div>
                `).join('')}
                ${dayBookings.length > 3 ? `
                    <div class="text-xs text-gray-400">+${dayBookings.length - 3} altri</div>
                ` : ''}
            </div>
        `;

        return dayElement;
    }

    renderWeekView(date, bookings) {
        const container = document.getElementById('weekCalendarGrid');
        if (!container) return;

        const weekDates = this.getWeekDates(date);
        const businessHours = this.settingsManager.getBusinessHours();
        
        // Get time range with 15-minute precision
        const timeRange = this.getTimeRange(businessHours);
        const timeSlots = this.generateTimeSlots(timeRange.start, timeRange.end, 15);

        container.innerHTML = '';
        container.className = 'flex flex-col bg-gray-800 rounded-lg overflow-hidden';

        // Create header with days
        this.createWeekHeader(container, weekDates);
        
        // Create scrollable content area
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'flex-1 overflow-y-auto';
        
        const contentGrid = document.createElement('div');
        contentGrid.className = 'grid grid-cols-8 gap-px bg-gray-600';
        
        // Create time slots with 15-minute precision
        timeSlots.forEach(time => {
            this.createWeekTimeSlot(contentGrid, time, weekDates, bookings);
        });
        
        scrollContainer.appendChild(contentGrid);
        container.appendChild(scrollContainer);
    }

    renderDayView(date, bookings) {
        const container = document.getElementById('dayCalendarGrid');
        if (!container) return;

        const businessHours = this.settingsManager.getBusinessHoursForDay(date);
        if (!businessHours || businessHours.closed) {
            container.innerHTML = '<div class="text-center text-gray-400 p-8">Giorno di chiusura</div>';
            return;
        }

        const dayBookings = bookings.filter(booking => 
            booking.date === date.toISOString().split('T')[0] && 
            (booking.status === 'confirmed' || booking.status === 'old')
        );

        // Generate 15-minute time slots
        const openTime = Utils.parseTimeToMinutes(businessHours.open);
        const closeTime = Utils.parseTimeToMinutes(businessHours.close);
        const timeSlots = this.generateTimeSlots(openTime, closeTime, 15);

        container.innerHTML = '';
        container.className = 'flex flex-col bg-gray-800 rounded-lg overflow-hidden';

        // Create header
        const header = document.createElement('div');
        header.className = 'bg-gray-700 p-4 border-b border-gray-600';
        header.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-100">
                ${date.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                })}
            </h3>
        `;
        container.appendChild(header);

        // Create scrollable content
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'flex-1 overflow-y-auto';
        
        const contentGrid = document.createElement('div');
        // Changed from grid-cols-2 to use CSS Grid with fr units for 20/80 proportion
        contentGrid.className = 'grid gap-px bg-gray-600';
        contentGrid.style.gridTemplateColumns = '1fr 4fr'; // 20% / 80% proportion

        timeSlots.forEach((time, index) => {
            this.createDayTimeSlot(contentGrid, time, dayBookings, date, index);
        });

        scrollContainer.appendChild(contentGrid);
        container.appendChild(scrollContainer);
    }

    createWeekHeader(container, weekDates) {
        const header = document.createElement('div');
        header.className = 'grid grid-cols-8 gap-px bg-gray-600 border-b border-gray-600';
        
        // Empty corner for time column
        const corner = document.createElement('div');
        corner.className = 'bg-gray-700 p-3 text-center font-semibold text-gray-300';
        corner.textContent = 'Ora';
        header.appendChild(corner);

        // Day headers
        weekDates.forEach(date => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'bg-gray-700 p-3 text-center font-semibold text-gray-300';
            const isToday = date.toDateString() === new Date().toDateString();
            dayHeader.innerHTML = `
                <div class="${isToday ? 'text-blue-400 font-bold' : ''}">
                    ${date.toLocaleDateString('it-IT', { weekday: 'short' })}
                </div>
                <div class="text-lg ${isToday ? 'text-blue-400' : ''}">${date.getDate()}</div>
            `;
            header.appendChild(dayHeader);
        });
        
        container.appendChild(header);
    }

    createWeekTimeSlot(container, time, weekDates, bookings) {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'bg-gray-800 p-2 text-center text-xs text-gray-400 border-r border-gray-600 min-h-8 flex items-center justify-center';
        const minutes = time.split(':')[1];
        if (minutes === '00') {
            timeLabel.textContent = time;
            timeLabel.classList.add('font-semibold', 'text-gray-300');
        } else if (minutes === '30') {
            timeLabel.textContent = time;
        } else {
            timeLabel.textContent = '';
        }
        container.appendChild(timeLabel);

        // Day slots
        weekDates.forEach(date => {
            const daySlot = document.createElement('div');
            daySlot.className = 'bg-gray-900 min-h-8 relative border-r border-gray-600 border-b border-gray-700';
            
            const dayBookings = bookings.filter(booking => 
                booking.date === date.toISOString().split('T')[0] && 
                (booking.status === 'confirmed' || booking.status === 'old')
            );

            // Find bookings that start at this exact time slot
            const timeMinutes = Utils.parseTimeToMinutes(time);
            const bookingsStartingHere = dayBookings.filter(booking => {
                const bookingStart = Utils.parseTimeToMinutes(booking.time);
                return bookingStart === timeMinutes;
            });

            // Render bookings that start at this time
            this.renderWeekBookingsAtTime(daySlot, bookingsStartingHere, timeMinutes);
            
            container.appendChild(daySlot);
        });
    }

    createDayTimeSlot(container, time, bookings, date, index) {
        // Time label - now takes 20% of the width
        const timeLabel = document.createElement('div');
        const minutes = time.split(':')[1];
        const isHour = minutes === '00';
        
        timeLabel.className = `bg-gray-800 p-2 text-center text-xs min-h-8 flex items-center justify-center border-r border-gray-600 border-b border-gray-700 ${isHour ? 'font-semibold text-gray-300' : 'text-gray-500'}`;
        timeLabel.textContent = isHour ? time : (minutes === '30' ? time : '');
        container.appendChild(timeLabel);

        // Content slot - now takes 80% of the width
        const contentSlot = document.createElement('div');
        contentSlot.className = 'bg-gray-900 min-h-8 relative border-r border-gray-600 border-b border-gray-700';

        // Find bookings that start at this exact time slot
        const timeMinutes = Utils.parseTimeToMinutes(time);
        const bookingsStartingHere = bookings.filter(booking => {
            const bookingStart = Utils.parseTimeToMinutes(booking.time);
            return bookingStart === timeMinutes;
        });

        // Render bookings that start at this time (using the same logic as week view)
        this.renderDayBookingsAtTime(contentSlot, bookingsStartingHere, timeMinutes);

        container.appendChild(contentSlot);
    }

    renderWeekBookingsAtTime(container, bookings, currentTimeMinutes) {
        if (bookings.length === 0) return;

        bookings.forEach((booking, index) => {
            const bookingElement = document.createElement('div');
            const bookingDuration = booking.duration || 30;
            
            // Calculate height based on duration (15 minutes = 32px)
            const heightInSlots = Math.ceil(bookingDuration / 15);
            const height = heightInSlots * 32;
            
            // Calculate width and position for overlapping
            const totalOverlapping = bookings.length;
            const width = totalOverlapping > 1 ? `calc(${100 / totalOverlapping}% - 2px)` : 'calc(100% - 2px)';
            const left = totalOverlapping > 1 ? `calc(${(index * 100) / totalOverlapping}% + 1px)` : '1px';

            const statusClass = booking.status === 'old' ? 'booking-old' : '';

            bookingElement.className = `absolute rounded text-white text-xs p-1 cursor-pointer overflow-hidden ${statusClass}`;
            bookingElement.style.cssText = `
                background-color: ${booking.color || Utils.getRandomColor()};
                height: ${height}px;
                width: ${width};
                left: ${left};
                top: 1px;
                z-index: ${10 + index};
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

            bookingElement.innerHTML = `
                <div class="font-medium truncate">${booking.firstName} ${booking.lastName}</div>
                <div class="text-xs opacity-90 truncate">${booking.time}</div>
                ${booking.notes ? `<div class="text-xs opacity-75 truncate">${booking.notes}</div>` : ''}
            `;

            bookingElement.addEventListener('click', () => {
                window.bookingSystem?.showBookingDetails(booking.id);
            });

            container.appendChild(bookingElement);
        });
    }

    renderDayBookingsAtTime(container, bookings, currentTimeMinutes) {
        if (bookings.length === 0) return;

        bookings.forEach((booking, index) => {
            const bookingElement = document.createElement('div');
            const bookingDuration = booking.duration || 30;
            
            // Calculate height based on duration (15 minutes = 32px, same as week view)
            const heightInSlots = Math.ceil(bookingDuration / 15);
            const height = heightInSlots * 32;
            
            // Calculate width and position for overlapping (same logic as week view)
            const totalOverlapping = bookings.length;
            const width = totalOverlapping > 1 ? `calc(${100 / totalOverlapping}% - 2px)` : 'calc(100% - 2px)';
            const left = totalOverlapping > 1 ? `calc(${(index * 100) / totalOverlapping}% + 1px)` : '1px';

            const statusClass = booking.status === 'old' ? 'booking-old' : '';

            bookingElement.className = `absolute rounded text-white text-xs p-2 cursor-pointer overflow-hidden ${statusClass}`;
            bookingElement.style.cssText = `
                background-color: ${booking.color || Utils.getRandomColor()};
                height: ${height}px;
                width: ${width};
                left: ${left};
                top: 1px;
                z-index: ${10 + index};
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

            const endTime = Utils.minutesToTime(Utils.parseTimeToMinutes(booking.time) + bookingDuration);
            bookingElement.innerHTML = `
                <div class="font-medium truncate">${booking.firstName} ${booking.lastName}</div>
                <div class="text-xs opacity-90 truncate">${booking.time} - ${endTime}</div>
                ${height > 60 && booking.phone ? `<div class="text-xs opacity-80 truncate">📞 ${booking.phone}</div>` : ''}
                ${height > 80 && booking.notes ? `<div class="text-xs opacity-75 truncate italic">${booking.notes}</div>` : ''}
            `;

            bookingElement.addEventListener('click', () => {
                window.bookingSystem?.showBookingDetails(booking.id);
            });

            container.appendChild(bookingElement);
        });
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

    getTimeRange(businessHours) {
        let earliestOpen = 24 * 60; // 24:00 in minutes
        let latestClose = 0;

        Object.values(businessHours).forEach(hours => {
            if (!hours.closed) {
                const open = Utils.parseTimeToMinutes(hours.open);
                const close = Utils.parseTimeToMinutes(hours.close);
                earliestOpen = Math.min(earliestOpen, open);
                latestClose = Math.max(latestClose, close);
            }
        });

        return {
            start: earliestOpen === 24 * 60 ? 9 * 60 : earliestOpen, // Default to 9:00 if no hours set
            end: latestClose === 0 ? 18 * 60 : latestClose // Default to 18:00 if no hours set
        };
    }

    generateTimeSlots(startMinutes, endMinutes, interval) {
        const slots = [];
        for (let time = startMinutes; time < endMinutes; time += interval) {
            slots.push(Utils.minutesToTime(time));
        }
        return slots;
    }
}
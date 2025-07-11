// UI Rendering utilities
import { Utils } from './utils.js';

export class UIRenderer {
    constructor(bookingManager, settingsManager, modalManager, toastManager) {
        this.bookingManager = bookingManager;
        this.settingsManager = settingsManager;
        this.modalManager = modalManager;
        this.toastManager = toastManager;
    }

    renderCalendarGrid(calendar, selectedDate, bookings = []) {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        grid.innerHTML = '';

        calendar.forEach(week => {
            week.forEach(date => {
                const dayElement = document.createElement('div');
                const isCurrentMonth = date.getMonth() === calendar[2][3].getMonth();
                const isToday = this.isSameDate(date, new Date());
                const isSelected = selectedDate && this.isSameDate(date, selectedDate);
                const isAvailable = this.settingsManager.isDateAvailable(date);
                const dayBookings = bookings.filter(booking => 
                    booking.date === date.toISOString().split('T')[0]
                );

                dayElement.className = `
                    calendar-day p-2 text-center cursor-pointer rounded-lg transition-colors duration-200
                    ${isCurrentMonth ? 'text-gray-100' : 'text-gray-500'}
                    ${isToday ? 'bg-blue-600 text-white' : ''}
                    ${isSelected ? 'selected' : ''}
                    ${!isAvailable ? 'disabled' : 'hover:bg-gray-700'}
                `;

                dayElement.innerHTML = `
                    <div class="font-medium">${date.getDate()}</div>
                    ${dayBookings.length > 0 ? `<div class="text-xs text-blue-400">${dayBookings.length} prenotazioni</div>` : ''}
                `;

                if (isAvailable) {
                    dayElement.addEventListener('click', () => {
                        window.selectDate(date);
                    });
                }

                grid.appendChild(dayElement);
            });
        });
    }

    renderTimeSlots(slots, selectedTime) {
        const container = document.getElementById('timeSlots');
        if (!container) return;

        container.innerHTML = '';

        if (slots.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center col-span-full">Nessun orario disponibile per questa data</p>';
            return;
        }

        slots.forEach(time => {
            const slot = document.createElement('button');
            slot.className = `
                time-slot p-3 rounded-lg border border-gray-600 text-center transition-colors duration-200
                ${selectedTime === time ? 'selected' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}
            `;
            slot.textContent = time;
            slot.addEventListener('click', () => window.selectTime(time));
            container.appendChild(slot);
        });
    }

    renderBookingsList(bookings, searchTerm = '', statusFilter = 'all') {
        const container = document.getElementById('bookingsList');
        if (!container) return;

        // Filter bookings based on status filter
        let filteredBookings = this.bookingManager.filterBookings(searchTerm, statusFilter);
        
        // If status filter is not 'old' or 'all', exclude old bookings from the default view
        if (statusFilter !== 'old' && statusFilter !== 'all') {
            filteredBookings = filteredBookings.filter(booking => booking.status !== 'old');
        }

        container.innerHTML = '';

        if (filteredBookings.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                    <div class="text-gray-400 text-lg">Nessuna prenotazione trovata</div>
                </div>
            `;
            return;
        }

        filteredBookings.forEach(booking => {
            const bookingElement = this.createBookingCard(booking);
            container.appendChild(bookingElement);
        });
    }

    createBookingCard(booking) {
        const card = document.createElement('div');
        const statusColors = {
            pending: 'border-yellow-500 bg-yellow-900/20',
            confirmed: 'border-green-500 bg-green-900/20',
            cancelled: 'border-red-500 bg-red-900/20',
            old: 'border-gray-500 bg-gray-900/20'
        };

        const statusLabels = {
            pending: 'In attesa',
            confirmed: 'Confermata',
            cancelled: 'Annullata',
            old: 'Passata'
        };

        card.className = `booking-card bg-gray-800 rounded-xl p-6 border-l-4 fade-in`;
        card.style.borderLeftColor = booking.color || '#8b5cf6';
        
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-4 mb-3">
                        <div class="w-4 h-4 rounded-full flex-shrink-0" style="background-color: ${booking.color || '#8b5cf6'}"></div>
                        <h3 class="text-lg font-semibold text-gray-100">
                            ${booking.firstName} ${booking.lastName}
                        </h3>
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusBadgeClass(booking.status)}">
                            ${statusLabels[booking.status]}
                        </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                        <div>
                            <span class="text-gray-400">📅 Data:</span>
                            <span class="ml-2">${Utils.formatDate(new Date(booking.date))}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">🕐 Orario:</span>
                            <span class="ml-2">${booking.time}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">⏱️ Durata:</span>
                            <span class="ml-2">${Utils.formatDuration(booking.duration || 30)}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">📧 Email:</span>
                            <span class="ml-2">${booking.email}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">📱 Telefono:</span>
                            <span class="ml-2">${booking.phone}</span>
                        </div>
                        ${booking.notes ? `
                        <div class="md:col-span-3">
                            <span class="text-gray-400">📝 Note:</span>
                            <span class="ml-2">${booking.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="bookingSystem.editBooking('${booking.id}')" 
                            class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                        ✏️
                    </button>
                    <button onclick="bookingSystem.deleteBooking('${booking.id}')" 
                            class="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
                        🗑️
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    getStatusBadgeClass(status) {
        const classes = {
            pending: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
            confirmed: 'bg-green-900/50 text-green-300 border border-green-700',
            cancelled: 'bg-red-900/50 text-red-300 border border-red-700',
            old: 'bg-gray-900/50 text-gray-300 border border-gray-700'
        };
        return classes[status] || 'bg-gray-900/50 text-gray-300 border border-gray-700';
    }

    renderStats(stats) {
        const elements = {
            totalBookings: document.getElementById('totalBookings'),
            pendingBookings: document.getElementById('pendingBookings'),
            confirmedBookings: document.getElementById('confirmedBookings'),
            cancelledBookings: document.getElementById('cancelledBookings')
        };

        if (elements.totalBookings) elements.totalBookings.textContent = stats.total;
        if (elements.pendingBookings) elements.pendingBookings.textContent = stats.pending;
        if (elements.confirmedBookings) elements.confirmedBookings.textContent = stats.confirmed;
        if (elements.cancelledBookings) elements.cancelledBookings.textContent = stats.cancelled;
    }

    renderBusinessHours(businessHours) {
        const container = document.getElementById('businessHours');
        if (!container) return;

        const days = [
            { key: 'monday', label: 'Lunedì' },
            { key: 'tuesday', label: 'Martedì' },
            { key: 'wednesday', label: 'Mercoledì' },
            { key: 'thursday', label: 'Giovedì' },
            { key: 'friday', label: 'Venerdì' },
            { key: 'saturday', label: 'Sabato' },
            { key: 'sunday', label: 'Domenica' }
        ];

        container.innerHTML = days.map(day => {
            const hours = businessHours[day.key];
            return `
                <div class="bg-gray-700 rounded-lg p-4 space-y-4">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-300">${day.label}</label>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center space-x-2">
                                <input type="checkbox" id="closed-${day.key}" ${hours.closed ? 'checked' : ''} 
                                       class="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500">
                                <label for="closed-${day.key}" class="text-sm text-gray-300">Chiuso</label>
                            </div>
                            <div class="flex items-center space-x-2">
                                <input type="checkbox" id="hasBreak-${day.key}" ${hours.hasBreak ? 'checked' : ''} 
                                       ${hours.closed ? 'disabled' : ''}
                                       class="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500">
                                <label for="hasBreak-${day.key}" class="text-sm text-gray-300">Pausa pranzo</label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Orari principali -->
                    <div class="grid grid-cols-2 gap-4 ${hours.closed ? 'opacity-50' : ''}">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Apertura</label>
                            <input type="time" id="open-${day.key}" value="${hours.open}" 
                                   ${hours.closed ? 'disabled' : ''}
                                   class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Chiusura</label>
                            <input type="time" id="close-${day.key}" value="${hours.close}" 
                                   ${hours.closed ? 'disabled' : ''}
                                   class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm">
                        </div>
                    </div>
                    
                    <!-- Orari pausa pranzo -->
                    <div id="breakHours-${day.key}" class="grid grid-cols-2 gap-4 ${hours.closed || !hours.hasBreak ? 'hidden opacity-50' : ''}">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Inizio pausa</label>
                            <input type="time" id="breakStart-${day.key}" value="${hours.breakStart || '13:00'}" 
                                   ${hours.closed || !hours.hasBreak ? 'disabled' : ''}
                                   class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Fine pausa</label>
                            <input type="time" id="breakEnd-${day.key}" value="${hours.breakEnd || '14:00'}" 
                                   ${hours.closed || !hours.hasBreak ? 'disabled' : ''}
                                   class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm">
                        </div>
                    </div>
                    
                    <!-- Anteprima orario -->
                    <div class="text-xs text-gray-400 bg-gray-800 rounded p-2">
                        <span class="font-medium">Anteprima: </span>
                        <span id="preview-${day.key}">${this.settingsManager.formatBusinessHoursDisplay(hours)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        days.forEach(day => {
            const closedCheckbox = document.getElementById(`closed-${day.key}`);
            const hasBreakCheckbox = document.getElementById(`hasBreak-${day.key}`);
            const openInput = document.getElementById(`open-${day.key}`);
            const closeInput = document.getElementById(`close-${day.key}`);
            const breakStartInput = document.getElementById(`breakStart-${day.key}`);
            const breakEndInput = document.getElementById(`breakEnd-${day.key}`);
            const breakHoursDiv = document.getElementById(`breakHours-${day.key}`);
            const previewSpan = document.getElementById(`preview-${day.key}`);

            const updatePreview = () => {
                const currentHours = {
                    closed: closedCheckbox.checked,
                    hasBreak: hasBreakCheckbox.checked,
                    open: openInput.value,
                    close: closeInput.value,
                    breakStart: breakStartInput.value,
                    breakEnd: breakEndInput.value
                };
                previewSpan.textContent = this.settingsManager.formatBusinessHoursDisplay(currentHours);
            };

            if (closedCheckbox) {
                closedCheckbox.addEventListener('change', () => {
                    const isDisabled = closedCheckbox.checked;
                    [openInput, closeInput, hasBreakCheckbox, breakStartInput, breakEndInput].forEach(input => {
                        if (input) input.disabled = isDisabled;
                    });
                    
                    const containers = [openInput?.parentElement?.parentElement, breakHoursDiv];
                    containers.forEach(container => {
                        if (container) container.style.opacity = isDisabled ? '0.5' : '1';
                    });
                    
                    if (isDisabled) {
                        hasBreakCheckbox.checked = false;
                        breakHoursDiv.classList.add('hidden');
                    }
                    
                    updatePreview();
                });
            }

            if (hasBreakCheckbox) {
                hasBreakCheckbox.addEventListener('change', () => {
                    const hasBreak = hasBreakCheckbox.checked;
                    breakHoursDiv.classList.toggle('hidden', !hasBreak);
                    [breakStartInput, breakEndInput].forEach(input => {
                        if (input) input.disabled = !hasBreak || closedCheckbox.checked;
                    });
                    updatePreview();
                });
            }

            // Add change listeners to all time inputs for live preview
            [openInput, closeInput, breakStartInput, breakEndInput].forEach(input => {
                if (input) {
                    input.addEventListener('change', updatePreview);
                }
            });
        });
    }

    renderHolidays(holidays) {
        const container = document.getElementById('holidaysList');
        if (!container) return;

        if (holidays.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Nessuna festività configurata</p>';
            return;
        }

        container.innerHTML = holidays.map(holiday => `
            <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span class="text-gray-100">${Utils.formatDate(new Date(holiday))}</span>
                <button onclick="bookingSystem.removeHoliday('${holiday}')" 
                        class="text-red-400 hover:text-red-300 transition-colors duration-200">
                    🗑️
                </button>
            </div>
        `).join('');
    }

    renderTimeSlotSettings(currentInterval) {
        // Set current value in the existing select
        const select = document.getElementById('timeSlotInterval');
        if (select) {
            select.value = currentInterval.toString();
        }
    }

    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    updateProgressSteps(currentStep) {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            const stepData = step.dataset.step;
            const circle = step.querySelector('div');
            const text = step.querySelector('span');
            
            if (stepData === currentStep) {
                circle.className = 'w-12 h-12 rounded-full flex items-center justify-center border-2 bg-blue-600 border-blue-600';
                text.className = 'mt-2 text-sm font-medium text-blue-400';
            } else {
                circle.className = 'w-12 h-12 rounded-full flex items-center justify-center border-2 bg-gray-700 border-gray-600';
                text.className = 'mt-2 text-sm font-medium text-gray-500';
            }
        });
    }
}
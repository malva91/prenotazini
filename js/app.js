// Main application
import { Utils } from './modules/utils.js';
import { ToastManager } from './modules/toast.js';
import { ModalManager } from './modules/modal.js';
import { SettingsManager } from './modules/settings.js';
import { CalendarManager } from './modules/calendar.js';
import { BookingManager } from './modules/booking.js';
import { UIRenderer } from './modules/ui-renderer.js';
import { CalendarViews } from './modules/calendar-views.js';

class BookingSystem {
    constructor() {
        this.currentView = 'client';
        this.currentStep = 'date';
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentAdminTab = 'bookings';
        
        // Initialize managers
        this.toastManager = new ToastManager();
        this.modalManager = new ModalManager();
        this.settingsManager = new SettingsManager(window.dbManager);
        this.calendarManager = new CalendarManager(this.settingsManager);
        this.bookingManager = new BookingManager(window.dbManager, this.settingsManager);
        this.uiRenderer = new UIRenderer(this.bookingManager, this.settingsManager, this.modalManager, this.toastManager);
        this.calendarViews = new CalendarViews(this.bookingManager, this.settingsManager);
        
        this.init();
    }

    async init() {
        try {
            // Load settings and bookings
            await this.settingsManager.loadSettings();
            await this.bookingManager.loadBookings();
            
            // Setup real-time listener
            this.bookingManager.setupRealTimeListener();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial render
            this.renderCurrentView();
            
            console.log('BookingSystem initialized successfully');
        } catch (error) {
            console.error('Error initializing BookingSystem:', error);
            this.toastManager.error('Errore durante l\'inizializzazione del sistema');
        }
    }

    setupEventListeners() {
        // Admin toggle
        const adminToggle = document.getElementById('adminToggle');
        if (adminToggle) {
            adminToggle.addEventListener('click', () => this.showAdminLogin());
        }

        // Back to client
        const backToClient = document.getElementById('backToClient');
        if (backToClient) {
            backToClient.addEventListener('click', () => this.showClientView());
        }

        // Admin login
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Admin logout
        const adminLogout = document.getElementById('adminLogout');
        if (adminLogout) {
            adminLogout.addEventListener('click', () => this.showClientView());
        }

        // Calendar navigation
        const prevMonth = document.getElementById('prevMonth');
        if (prevMonth) {
            prevMonth.addEventListener('click', () => this.navigateCalendar(-1));
        }

        const nextMonth = document.getElementById('nextMonth');
        if (nextMonth) {
            nextMonth.addEventListener('click', () => this.navigateCalendar(1));
        }

        // Step navigation
        const backToDate = document.getElementById('backToDate');
        if (backToDate) {
            backToDate.addEventListener('click', () => this.goToStep('date'));
        }

        const backToTime = document.getElementById('backToTime');
        if (backToTime) {
            backToTime.addEventListener('click', () => this.goToStep('time'));
        }

        // Booking form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }

        // New booking
        const newBooking = document.getElementById('newBooking');
        if (newBooking) {
            newBooking.addEventListener('click', () => this.resetBookingFlow());
        }

        // Admin tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchAdminTab(tabName);
            });
        });

        // Calendar view buttons
        const monthView = document.getElementById('monthView');
        if (monthView) {
            monthView.addEventListener('click', () => this.setCalendarView('month'));
        }

        const weekView = document.getElementById('weekView');
        if (weekView) {
            weekView.addEventListener('click', () => this.setCalendarView('week'));
        }

        const dayView = document.getElementById('dayView');
        if (dayView) {
            dayView.addEventListener('click', () => this.setCalendarView('day'));
        }

        // Calendar navigation (admin)
        const calendarPrev = document.getElementById('calendarPrev');
        if (calendarPrev) {
            calendarPrev.addEventListener('click', () => this.navigateAdminCalendar(-1));
        }

        const calendarNext = document.getElementById('calendarNext');
        if (calendarNext) {
            calendarNext.addEventListener('click', () => this.navigateAdminCalendar(1));
        }

        const calendarToday = document.getElementById('calendarToday');
        if (calendarToday) {
            calendarToday.addEventListener('click', () => this.goToToday());
        }

        // Search and filter
        const searchBookings = document.getElementById('searchBookings');
        if (searchBookings) {
            searchBookings.addEventListener('input', 
                Utils.debounce(() => this.filterBookings(), 300)
            );
        }

        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.filterBookings());
        }

        // Settings
        const saveHours = document.getElementById('saveHours');
        if (saveHours) {
            saveHours.addEventListener('click', () => this.saveBusinessHours());
        }

        const addHoliday = document.getElementById('addHoliday');
        if (addHoliday) {
            addHoliday.addEventListener('click', () => this.addHoliday());
        }

        // Time slot settings
        const saveTimeSlotSettings = document.getElementById('saveTimeSlotSettings');
        if (saveTimeSlotSettings) {
            saveTimeSlotSettings.addEventListener('click', () => this.saveTimeSlotSettings());
        }

        // Edit booking form
        const editBookingForm = document.getElementById('editBookingForm');
        if (editBookingForm) {
            editBookingForm.addEventListener('submit', (e) => this.handleEditBookingSubmit(e));
        }

        // Export and sync
        const exportData = document.getElementById('exportData');
        if (exportData) {
            exportData.addEventListener('click', () => this.exportData());
        }

        const syncData = document.getElementById('syncData');
        if (syncData) {
            syncData.addEventListener('click', () => this.syncData());
        }

        // Booking manager listener
        this.bookingManager.addListener(() => {
            this.updateStats();
            if (this.currentView === 'admin') {
                this.renderCurrentAdminTab();
            }
        });
    }

    // View Management
    showClientView() {
        this.currentView = 'client';
        this.renderCurrentView();
    }

    showAdminLogin() {
        this.currentView = 'adminLogin';
        this.renderCurrentView();
    }

    showAdminDashboard() {
        this.currentView = 'admin';
        this.renderCurrentView();
    }

    renderCurrentView() {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        // Show current view
        const viewMap = {
            'client': 'clientView',
            'adminLogin': 'adminLogin',
            'admin': 'adminDashboard'
        };

        const currentViewElement = document.getElementById(viewMap[this.currentView]);
        if (currentViewElement) {
            currentViewElement.classList.remove('hidden');
        }

        // Render view-specific content
        if (this.currentView === 'client') {
            this.renderClientView();
        } else if (this.currentView === 'admin') {
            this.renderAdminView();
        }
    }

    renderClientView() {
        this.uiRenderer.updateProgressSteps(this.currentStep);
        
        if (this.currentStep === 'date') {
            this.renderDateStep();
        } else if (this.currentStep === 'time') {
            this.renderTimeStep();
        }
    }

    renderAdminView() {
        this.updateStats();
        this.renderCurrentAdminTab();
    }

    // Step Management
    goToStep(step) {
        this.currentStep = step;
        
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show current step
        const stepElement = document.getElementById(`${step}Step`);
        if (stepElement) {
            stepElement.classList.remove('hidden');
        }

        this.uiRenderer.updateProgressSteps(step);

        // Render step-specific content
        if (step === 'date') {
            this.renderDateStep();
        } else if (step === 'time') {
            this.renderTimeStep();
        }
    }

    renderDateStep() {
        const calendar = this.calendarManager.generateCalendar(
            this.calendarManager.getCurrentDate().getFullYear(),
            this.calendarManager.getCurrentDate().getMonth()
        );

        this.uiRenderer.renderCalendarGrid(calendar, this.selectedDate);
        this.updateCurrentMonthDisplay();
    }

    renderTimeStep() {
        if (!this.selectedDate) {
            this.goToStep('date');
            return;
        }

        const timeSlots = this.settingsManager.generateTimeSlots(this.selectedDate);
        const availableSlots = this.bookingManager.getAvailableTimeSlots(this.selectedDate);
        this.uiRenderer.renderTimeSlots(availableSlots, this.selectedTime);
    }

    // Date and Time Selection
    selectDate(date) {
        if (!this.settingsManager.isDateAvailable(date)) return;
        
        this.selectedDate = date;
        this.selectedTime = null; // Reset time selection
        this.goToStep('time');
    }

    selectTime(time) {
        this.selectedTime = time;
        this.goToStep('form');
    }

    // Calendar Navigation
    navigateCalendar(direction) {
        this.calendarManager.navigateMonth(direction);
        this.renderDateStep();
    }

    updateCurrentMonthDisplay() {
        const monthElement = document.getElementById('currentMonth');
        if (monthElement) {
            const date = this.calendarManager.getCurrentDate();
            monthElement.textContent = date.toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric'
            });
        }
    }

    // Booking Management
    async handleBookingSubmit(e) {
        e.preventDefault();
        
        const bookingData = {
            firstName: document.getElementById('firstName')?.value,
            lastName: document.getElementById('lastName')?.value,
            email: document.getElementById('email')?.value,
            phone: document.getElementById('phone')?.value,
            notes: document.getElementById('notes')?.value,
            date: this.selectedDate.toISOString().split('T')[0],
            time: this.selectedTime,
            duration: this.settingsManager.getTimeSlotInterval(),
            status: 'pending',
            color: Utils.getRandomColor()
        };

        try {
            const result = await this.bookingManager.saveBooking(bookingData);
            
            if (result.success) {
                this.showBookingSuccess(bookingData);
                this.goToStep('success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error saving booking:', error);
            this.toastManager.error('Errore durante il salvataggio della prenotazione');
        }
    }

    showBookingSuccess(bookingData) {
        const summaryElement = document.getElementById('bookingSummary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div><strong>Nome:</strong> ${bookingData.firstName} ${bookingData.lastName}</div>
                <div><strong>Data:</strong> ${Utils.formatDate(new Date(bookingData.date))}</div>
                <div><strong>Orario:</strong> ${bookingData.time}</div>
                <div><strong>Email:</strong> ${bookingData.email}</div>
                <div><strong>Telefono:</strong> ${bookingData.phone}</div>
                ${bookingData.notes ? `<div><strong>Note:</strong> ${bookingData.notes}</div>` : ''}
            `;
        }
    }

    resetBookingFlow() {
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentStep = 'date';
        
        // Reset form
        const form = document.getElementById('bookingForm');
        if (form) {
            form.reset();
        }
        
        this.goToStep('date');
    }

    // Admin Functions
    async handleAdminLogin(e) {
        e.preventDefault();
        
        const password = document.getElementById('adminPassword')?.value;
        
        if (password === 'admin123') {
            this.showAdminDashboard();
        } else {
            this.toastManager.error('Password non corretta');
        }
    }

    switchAdminTab(tabName) {
        this.currentAdminTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.className = 'admin-tab w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 bg-blue-900/50 text-blue-300 border border-blue-700';
            } else {
                tab.className = 'admin-tab w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 text-gray-400 hover:bg-gray-700 hover:text-gray-300';
            }
        });

        this.renderCurrentAdminTab();
    }

    renderCurrentAdminTab() {
        // Hide all admin content
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show current tab
        const tabElement = document.getElementById(`${this.currentAdminTab}Tab`);
        if (tabElement) {
            tabElement.classList.remove('hidden');
        }

        // Render tab-specific content
        if (this.currentAdminTab === 'bookings') {
            this.filterBookings();
        } else if (this.currentAdminTab === 'calendar') {
            this.renderAdminCalendar();
        } else if (this.currentAdminTab === 'settings') {
            this.renderSettings();
        }
    }

    // Calendar View Management
    setCalendarView(view) {
        this.calendarManager.setViewMode(view);
        
        // Update view buttons
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${view}View`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Show/hide view containers
        document.getElementById('monthViewContainer')?.classList.toggle('hidden', view !== 'month');
        document.getElementById('weekViewContainer')?.classList.toggle('hidden', view !== 'week');
        document.getElementById('dayViewContainer')?.classList.toggle('hidden', view !== 'day');

        this.renderAdminCalendar();
    }

    renderAdminCalendar() {
        const currentDate = this.calendarManager.getCurrentDate();
        const bookings = this.bookingManager.bookings;
        
        // Update month display
        const monthElement = document.getElementById('calendarMonth');
        if (monthElement) {
            const viewMode = this.calendarManager.getViewMode();
            let displayText = '';
            
            if (viewMode === 'month') {
                displayText = currentDate.toLocaleDateString('it-IT', {
                    month: 'long',
                    year: 'numeric'
                });
            } else if (viewMode === 'week') {
                const weekDates = this.calendarViews.getWeekDates(currentDate);
                const startDate = weekDates[0];
                const endDate = weekDates[6];
                displayText = `${startDate.getDate()} - ${endDate.getDate()} ${endDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
            } else if (viewMode === 'day') {
                displayText = currentDate.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
            
            monthElement.textContent = displayText;
        }

        // Render appropriate view
        const viewMode = this.calendarManager.getViewMode();
        if (viewMode === 'month') {
            this.calendarViews.renderMonthView(currentDate, bookings);
        } else if (viewMode === 'week') {
            this.calendarViews.renderWeekView(currentDate, bookings);
        } else if (viewMode === 'day') {
            this.calendarViews.renderDayView(currentDate, bookings);
        }
    }

    navigateAdminCalendar(direction) {
        const viewMode = this.calendarManager.getViewMode();
        
        if (viewMode === 'month') {
            this.calendarManager.navigateMonth(direction);
        } else if (viewMode === 'week') {
            this.calendarManager.navigateWeek(direction);
        } else if (viewMode === 'day') {
            this.calendarManager.navigateDay(direction);
        }
        
        this.renderAdminCalendar();
    }

    goToToday() {
        this.calendarManager.goToToday();
        this.renderAdminCalendar();
    }

    // Booking Management (Admin)
    filterBookings() {
        const searchTerm = document.getElementById('searchBookings')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';
        
        this.uiRenderer.renderBookingsList(this.bookingManager.bookings, searchTerm, statusFilter);
    }

    editBooking(id) {
        const booking = this.bookingManager.bookings.find(b => b.id === id);
        if (!booking) return;

        // Populate edit form
        document.getElementById('editBookingId').value = booking.id;
        document.getElementById('editFirstName').value = booking.firstName;
        document.getElementById('editLastName').value = booking.lastName;
        document.getElementById('editEmail').value = booking.email;
        document.getElementById('editPhone').value = booking.phone;
        document.getElementById('editDate').value = booking.date;
        document.getElementById('editTime').value = booking.time;
        document.getElementById('editDuration').value = booking.duration || 30;
        document.getElementById('editStatus').value = booking.status;
        document.getElementById('editNotes').value = booking.notes || '';

        this.modalManager.open('editBookingModal');
    }

    async handleEditBookingSubmit(e) {
        e.preventDefault();

        const bookingData = {
            id: document.getElementById('editBookingId').value,
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            date: document.getElementById('editDate').value,
            time: document.getElementById('editTime').value,
            duration: parseInt(document.getElementById('editDuration').value),
            status: document.getElementById('editStatus').value,
            notes: document.getElementById('editNotes').value
        };

        try {
            const result = await this.bookingManager.saveBooking(bookingData);
            
            if (result.success) {
                this.modalManager.close();
                this.toastManager.success('Prenotazione aggiornata con successo');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            this.toastManager.error('Errore durante l\'aggiornamento della prenotazione');
        }
    }

    async deleteBooking(id) {
        if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;

        try {
            const result = await this.bookingManager.deleteBooking(id);
            
            if (result.success) {
                this.toastManager.success('Prenotazione eliminata con successo');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            this.toastManager.error('Errore durante l\'eliminazione della prenotazione');
        }
    }

    showBookingDetails(id) {
        const booking = this.bookingManager.bookings.find(b => b.id === id);
        if (booking) {
            this.editBooking(id);
        }
    }

    // Settings Management
    renderSettings() {
        const businessHours = this.settingsManager.getBusinessHours();
        const holidays = this.settingsManager.getHolidays();
        const timeSlotInterval = this.settingsManager.getTimeSlotInterval();

        this.uiRenderer.renderBusinessHours(businessHours);
        this.uiRenderer.renderHolidays(holidays);
        this.uiRenderer.renderTimeSlotSettings(timeSlotInterval);
    }

    async saveBusinessHours() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const businessHours = {};

        days.forEach(day => {
            const closedCheckbox = document.getElementById(`closed-${day}`);
            const hasBreakCheckbox = document.getElementById(`hasBreak-${day}`);
            const openInput = document.getElementById(`open-${day}`);
            const closeInput = document.getElementById(`close-${day}`);
            const breakStartInput = document.getElementById(`breakStart-${day}`);
            const breakEndInput = document.getElementById(`breakEnd-${day}`);

            businessHours[day] = {
                closed: closedCheckbox?.checked || false,
                hasBreak: hasBreakCheckbox?.checked || false,
                open: openInput?.value || '09:00',
                close: closeInput?.value || '18:00',
                breakStart: breakStartInput?.value || '13:00',
                color: Utils.getUniqueColorForDate(this.selectedDate, this.managers.bookingManager.bookings)
            };
        });

        try {
            await this.settingsManager.saveSettings({ businessHours });
            this.toastManager.success('Orari di apertura salvati con successo');
        } catch (error) {
            console.error('Error saving business hours:', error);
            this.toastManager.error('Errore durante il salvataggio degli orari');
        }
    }

    async addHoliday() {
        const dateInput = document.getElementById('newHoliday');
        if (!dateInput?.value) return;

        const holidays = [...this.settingsManager.getHolidays(), dateInput.value];

        try {
            await this.settingsManager.saveSettings({ holidays });
            dateInput.value = '';
            this.renderSettings();
            this.toastManager.success('Festività aggiunta con successo');
        } catch (error) {
            console.error('Error adding holiday:', error);
            this.toastManager.error('Errore durante l\'aggiunta della festività');
        }
    }

    async removeHoliday(date) {
        const holidays = this.settingsManager.getHolidays().filter(h => h !== date);

        try {
            await this.settingsManager.saveSettings({ holidays });
            this.renderSettings();
            this.toastManager.success('Festività rimossa con successo');
        } catch (error) {
            console.error('Error removing holiday:', error);
            this.toastManager.error('Errore durante la rimozione della festività');
        }
    }

    async saveTimeSlotSettings() {
        const intervalSelect = document.getElementById('timeSlotInterval');
        if (!intervalSelect) return;

        const timeSlotInterval = parseInt(intervalSelect.value);

        try {
            await this.settingsManager.saveSettings({ timeSlotInterval });
            this.toastManager.success('Impostazioni intervalli salvate con successo');
        } catch (error) {
            console.error('Error saving time slot settings:', error);
            this.toastManager.error('Errore durante il salvataggio delle impostazioni');
        }
    }

    // Utility Functions
    updateStats() {
        const stats = this.bookingManager.getBookingStats();
        this.uiRenderer.renderStats(stats);
    }

    async exportData() {
        try {
            const bookings = this.bookingManager.bookings;
            const dataStr = JSON.stringify(bookings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `prenotazioni_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.toastManager.success('Dati esportati con successo');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.toastManager.error('Errore durante l\'esportazione dei dati');
        }
    }

    async syncData() {
        try {
            const success = await window.dbManager.forceSync();
            if (success) {
                await this.bookingManager.loadBookings();
                this.toastManager.success('Sincronizzazione completata');
            } else {
                this.toastManager.warning('Impossibile sincronizzare - controlla la connessione');
            }
        } catch (error) {
            console.error('Error syncing data:', error);
            this.toastManager.error('Errore durante la sincronizzazione');
        }
    }
}

// Make functions globally available for onclick handlers
window.selectDate = function(date) {
    if (window.bookingSystem) {
        window.bookingSystem.selectDate(date);
    }
};

window.selectTime = function(time) {
    if (window.bookingSystem) {
        window.bookingSystem.selectTime(time);
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.bookingSystem = new BookingSystem();
});
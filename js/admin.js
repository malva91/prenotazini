// Admin functionality
class AdminManager {
    constructor() {
        this.isLoggedIn = false;
        this.bookings = [];
        this.setupSessionCheck();
    }

    setupSessionCheck() {
        const adminLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
        const loginTime = sessionStorage.getItem('admin_login_time');
        
        if (adminLoggedIn && loginTime) {
            const timeDiff = Date.now() - parseInt(loginTime);
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (timeDiff < thirtyMinutes) {
                this.isLoggedIn = true;
                this.showAdminDashboard();
            } else {
                sessionStorage.removeItem('admin_logged_in');
                sessionStorage.removeItem('admin_login_time');
            }
        }
    }

    showAdminLogin() {
        utils.hide('clientView');
        utils.hide('adminDashboardView');
        utils.show('adminLoginView');
        utils.hide('adminToggle');
    }

    showClientView() {
        utils.show('clientView');
        utils.hide('adminLoginView');
        utils.hide('adminDashboardView');
        utils.show('adminToggle');
    }

    async login(password) {
        if (password === 'admin123') {
            sessionStorage.setItem('admin_logged_in', 'true');
            sessionStorage.setItem('admin_login_time', Date.now().toString());
            
            this.isLoggedIn = true;
            console.log('Admin login successful');
            this.showAdminDashboard();
            return true;
        } else {
            console.log('Failed login attempt');
            return false;
        }
    }

    logout() {
        sessionStorage.removeItem('admin_logged_in');
        sessionStorage.removeItem('admin_login_time');
        this.isLoggedIn = false;
        console.log('Admin logout');
        this.showClientView();
    }

    async showAdminDashboard() {
        utils.hide('clientView');
        utils.hide('adminLoginView');
        utils.show('adminDashboardView');
        utils.hide('adminToggle');

        await this.loadBookings();
        this.renderAdminDashboard();
    }

    async loadBookings() {
        try {
            this.bookings = await storageManager.getBookings();
        } catch (error) {
            console.error('Failed to load bookings:', error);
            notificationManager.error('Errore', 'Impossibile caricare le prenotazioni');
        }
    }

    renderAdminDashboard() {
        const container = document.getElementById('adminDashboardView');
        if (!container) return;

        const stats = this.calculateStats();

        container.innerHTML = `
            <!-- Header -->
            <header class="bg-gray-800 shadow-lg border-b border-gray-700">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-100">Pannello Amministratore</h1>
                            <p class="text-gray-400">Gestisci prenotazioni e configurazioni</p>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <button onclick="adminManager.exportData()" class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                                <i data-lucide="download" class="w-4 h-4"></i>
                                <span>Esporta</span>
                            </button>
                            
                            <button onclick="adminManager.logout()" class="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
                                <i data-lucide="log-out" class="w-4 h-4"></i>
                                <span>Esci</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div class="flex">
                <!-- Sidebar -->
                <aside class="w-64 bg-gray-800 shadow-lg min-h-screen border-r border-gray-700">
                    <div class="p-6">
                        <!-- Stats -->
                        <div class="grid grid-cols-2 gap-4 mb-8">
                            <div class="bg-blue-900/50 p-3 rounded-lg border border-blue-700">
                                <div class="text-2xl font-bold text-blue-400">${stats.total}</div>
                                <div class="text-sm text-blue-300">Totali</div>
                            </div>
                            <div class="bg-yellow-900/50 p-3 rounded-lg border border-yellow-700">
                                <div class="text-2xl font-bold text-yellow-400">${stats.pending}</div>
                                <div class="text-sm text-yellow-300">In attesa</div>
                            </div>
                            <div class="bg-green-900/50 p-3 rounded-lg border border-green-700">
                                <div class="text-2xl font-bold text-green-400">${stats.confirmed}</div>
                                <div class="text-sm text-green-300">Confermate</div>
                            </div>
                            <div class="bg-red-900/50 p-3 rounded-lg border border-red-700">
                                <div class="text-2xl font-bold text-red-400">${stats.cancelled}</div>
                                <div class="text-sm text-red-300">Annullate</div>
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- Main content -->
                <main class="flex-1 p-6 bg-gray-900">
                    <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-semibold text-gray-100">Gestione Prenotazioni</h2>
                            <button onclick="adminManager.loadBookings(); adminManager.renderAdminDashboard();" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                                <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-2"></i>
                                Aggiorna
                            </button>
                        </div>

                        ${this.renderBookingsList()}
                    </div>
                </main>
            </div>
        `;

        lucide.createIcons();
    }

    renderBookingsList() {
        if (this.bookings.length === 0) {
            return `
                <div class="text-center py-12">
                    <i data-lucide="calendar" class="w-12 h-12 text-gray-600 mx-auto mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-100 mb-2">Nessuna prenotazione trovata</h3>
                    <p class="text-gray-400">Non ci sono ancora prenotazioni</p>
                </div>
            `;
        }

        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-700/50 border-b border-gray-600">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contatti</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Appuntamento</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stato</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody class="bg-gray-800 divide-y divide-gray-700">
                        ${this.bookings.map(booking => this.renderBookingRow(booking)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderBookingRow(booking) {
        const statusBadge = this.getStatusBadge(booking.status);
        
        return `
            <tr class="hover:bg-gray-700/50 transition-colors duration-200">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="bg-blue-900/50 w-10 h-10 rounded-full flex items-center justify-center border border-blue-700">
                            <i data-lucide="user" class="w-5 h-5 text-blue-400"></i>
                        </div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-100">${booking.firstName} ${booking.lastName}</div>
                            <div class="text-sm text-gray-400">ID: ${booking.id.slice(0, 8)}...</div>
                        </div>
                    </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="space-y-1">
                        <div class="flex items-center text-sm text-gray-100">
                            <i data-lucide="mail" class="w-4 h-4 mr-2 text-gray-400"></i>
                            ${booking.email}
                        </div>
                        <div class="flex items-center text-sm text-gray-300">
                            <i data-lucide="phone" class="w-4 h-4 mr-2 text-gray-400"></i>
                            ${booking.phone}
                        </div>
                    </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="space-y-1">
                        <div class="flex items-center text-sm text-gray-100">
                            <i data-lucide="calendar" class="w-4 h-4 mr-2 text-gray-400"></i>
                            ${utils.formatDate(booking.date)}
                        </div>
                        <div class="flex items-center text-sm text-gray-300">
                            <i data-lucide="clock" class="w-4 h-4 mr-2 text-gray-400"></i>
                            ${booking.timeSlot}
                        </div>
                    </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center space-x-2">
                        ${booking.status === 'pending' ? `
                            <button onclick="adminManager.updateBookingStatus('${booking.id}', 'confirmed')" class="text-green-400 hover:text-green-300 p-1 rounded transition-colors duration-200" title="Conferma">
                                <i data-lucide="check" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                        
                        ${booking.status !== 'cancelled' ? `
                            <button onclick="adminManager.updateBookingStatus('${booking.id}', 'cancelled')" class="text-red-400 hover:text-red-300 p-1 rounded transition-colors duration-200" title="Annulla">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                        
                        <button onclick="adminManager.deleteBooking('${booking.id}')" class="text-red-400 hover:text-red-300 p-1 rounded transition-colors duration-200" title="Elimina">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusBadge(status) {
        switch (status) {
            case 'pending':
                return '<span class="px-2 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded-full border border-yellow-700">In attesa</span>';
            case 'confirmed':
                return '<span class="px-2 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded-full border border-green-700">Confermata</span>';
            case 'cancelled':
                return '<span class="px-2 py-1 text-xs font-medium bg-red-900/50 text-red-300 rounded-full border border-red-700">Annullata</span>';
            default:
                return '<span class="px-2 py-1 text-xs font-medium bg-gray-900/50 text-gray-300 rounded-full border border-gray-700">Sconosciuto</span>';
        }
    }

    calculateStats() {
        return {
            total: this.bookings.length,
            pending: this.bookings.filter(b => b.status === 'pending').length,
            confirmed: this.bookings.filter(b => b.status === 'confirmed').length,
            cancelled: this.bookings.filter(b => b.status === 'cancelled').length
        };
    }

    async updateBookingStatus(bookingId, newStatus) {
        try {
            const result = await storageManager.updateBookingStatus(bookingId, newStatus);
            
            if (result.success) {
                console.log('Booking status updated:', bookingId, newStatus);
                
                if (newStatus === 'confirmed') {
                    notificationManager.success('Prenotazione confermata', 'La prenotazione è stata confermata con successo');
                } else if (newStatus === 'cancelled') {
                    notificationManager.info('Prenotazione annullata', 'La prenotazione è stata annullata');
                }
                
                await this.loadBookings();
                this.renderAdminDashboard();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to update booking status:', error);
            notificationManager.error('Errore', 'Impossibile aggiornare lo stato della prenotazione');
        }
    }

    async deleteBooking(bookingId) {
        if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
            return;
        }

        try {
            const result = await storageManager.deleteBooking(bookingId);
            
            if (result.success) {
                console.log('Booking deleted:', bookingId);
                notificationManager.success('Prenotazione eliminata', 'La prenotazione è stata eliminata con successo');
                await this.loadBookings();
                this.renderAdminDashboard();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to delete booking:', error);
            notificationManager.error('Errore', 'Impossibile eliminare la prenotazione');
        }
    }

    exportData() {
        try {
            const data = JSON.stringify({
                exportDate: new Date().toISOString(),
                count: this.bookings.length,
                bookings: this.bookings
            }, null, 2);

            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookings_export_${utils.formatDate(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);

            notificationManager.success('Export completato', 'I dati sono stati esportati con successo');
        } catch (error) {
            console.error('Export failed:', error);
            notificationManager.error('Errore export', 'Impossibile esportare i dati');
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();
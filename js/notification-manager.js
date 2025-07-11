// Notification Manager
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.defaultDuration = 5000;
        console.log('Notification manager initialized');
    }

    show(notification) {
        const id = utils.generateUUID();
        const fullNotification = {
            id,
            duration: this.defaultDuration,
            ...notification
        };

        this.notifications.push(fullNotification);
        this.renderNotifications();
        
        console.log('Notification shown:', id, notification.type, notification.title);

        // Auto-dismiss se non è persistente
        if (!fullNotification.persistent && fullNotification.duration && fullNotification.duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, fullNotification.duration);
        }

        return id;
    }

    dismiss(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.renderNotifications();
        console.log('Notification dismissed:', id);
    }

    dismissAll() {
        this.notifications = [];
        this.renderNotifications();
        console.log('All notifications dismissed');
    }

    // Convenience methods
    success(title, message, duration) {
        return this.show({
            type: 'success',
            title,
            message,
            duration
        });
    }

    error(title, message, persistent = false) {
        return this.show({
            type: 'error',
            title,
            message,
            persistent,
            duration: persistent ? 0 : 8000
        });
    }

    warning(title, message, duration) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration
        });
    }

    info(title, message, duration) {
        return this.show({
            type: 'info',
            title,
            message,
            duration
        });
    }

    // Specific notifications
    bookingCreated(bookingId) {
        return this.success(
            'Prenotazione creata',
            'La tua prenotazione è stata registrata e sarà confermata al più presto.'
        );
    }

    bookingConfirmed(bookingId) {
        return this.success(
            'Prenotazione confermata',
            'La tua prenotazione è stata confermata. Ti aspettiamo!'
        );
    }

    bookingCancelled(bookingId) {
        return this.info(
            'Prenotazione annullata',
            'La prenotazione è stata annullata con successo.'
        );
    }

    syncError() {
        return this.error(
            'Errore di sincronizzazione',
            'Impossibile sincronizzare i dati. Riproveremo automaticamente.',
            true
        );
    }

    offlineMode() {
        return this.warning(
            'Modalità offline',
            'Connessione persa. Le modifiche saranno sincronizzate quando tornerai online.',
            8000
        );
    }

    onlineMode() {
        return this.success(
            'Connessione ripristinata',
            'Sincronizzazione dei dati in corso...'
        );
    }

    renderNotifications() {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        container.innerHTML = '';

        this.notifications.forEach(notification => {
            const toast = this.createToastElement(notification);
            container.appendChild(toast);
        });
    }

    createToastElement(notification) {
        const bgColor = this.getBgColor(notification.type);
        const progressColor = this.getProgressColor(notification.type);
        const icon = this.getIcon(notification.type);

        const toast = utils.createElement('div', `min-w-80 max-w-md p-4 rounded-lg border shadow-xl backdrop-blur-sm transform transition-all duration-300 ease-in-out animate-slide-in ${bgColor}`);

        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0 mt-0.5">
                    <i data-lucide="${icon}" class="w-5 h-5 ${this.getIconColor(notification.type)}"></i>
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-gray-100">
                        ${notification.title}
                    </h4>
                    <p class="text-sm text-gray-300 mt-1">
                        ${notification.message}
                    </p>
                </div>
                
                <button class="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors duration-200" onclick="notificationManager.dismiss('${notification.id}')">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            
            ${!notification.persistent && notification.duration && notification.duration > 0 ? `
                <div class="mt-3 w-full bg-gray-700 rounded-full h-1">
                    <div class="h-1 rounded-full transition-all duration-100 ease-linear ${progressColor}" style="width: 100%; animation: shrink ${notification.duration}ms linear;"></div>
                </div>
            ` : ''}
        `;

        // Initialize Lucide icons
        setTimeout(() => lucide.createIcons(), 0);

        return toast;
    }

    getIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'alert-triangle';
            case 'info': return 'info';
            default: return 'info';
        }
    }

    getIconColor(type) {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            default: return 'text-blue-400';
        }
    }

    getBgColor(type) {
        switch (type) {
            case 'success': return 'bg-green-900/90 border-green-700';
            case 'error': return 'bg-red-900/90 border-red-700';
            case 'warning': return 'bg-yellow-900/90 border-yellow-700';
            case 'info': return 'bg-blue-900/90 border-blue-700';
            default: return 'bg-blue-900/90 border-blue-700';
        }
    }

    getProgressColor(type) {
        switch (type) {
            case 'success': return 'bg-green-400';
            case 'error': return 'bg-red-400';
            case 'warning': return 'bg-yellow-400';
            case 'info': return 'bg-blue-400';
            default: return 'bg-blue-400';
        }
    }
}

// Add CSS for shrink animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
    }
`;
document.head.appendChild(style);

// Initialize notification manager
const notificationManager = new NotificationManager();
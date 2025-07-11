// Version Manager for cache busting and resource loading
class VersionManager {
    constructor() {
        this.currentVersion = '1.0.3';
        this.storageKey = 'booking_system_version';
        this.isInitialized = false;
        this.cacheBustingEnabled = true;
        this.init();
    }

    init() {
        try {
            // Controlla se il cache-busting loader è attivo
            if (window.cacheBustingSystem) {
                safeLog('info', 'Cache-busting system rilevato, integrazione attiva');
                this.cacheBustingEnabled = true;
                this.currentVersion = window.cacheBustingSystem.getVersion() || this.currentVersion;
            }
            
            this.checkVersionUpdate();
            this.setupVersionDisplay();
            this.setupVersionAPI();
            this.isInitialized = true;
            safeLog('info', 'VersionManager initialized successfully');
        } catch (error) {
            safeLog('error', 'Failed to initialize VersionManager', error);
        }
    }

    checkVersionUpdate() {
        try {
            const storedVersion = localStorage.getItem(this.storageKey);
            
            if (storedVersion && storedVersion !== this.currentVersion) {
                safeLog('info', `Version update detected: ${storedVersion} -> ${this.currentVersion}`);
                this.clearCache();
                this.showUpdateNotification();
            }
            
            localStorage.setItem(this.storageKey, this.currentVersion);
        } catch (error) {
            safeLog('error', 'Error checking version update', error);
        }
    }

    clearCache() {
        try {
            // Clear browser cache programmatically where possible
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                    });
                });
            }

            // Clear localStorage cache entries (but keep user data)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('cache_') || key.includes('_cache'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            safeLog('info', 'Cache cleared for version update');
        } catch (error) {
            safeLog('error', 'Error clearing cache', error);
        }
    }

    showUpdateNotification() {
        try {
            // Create update notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg';
            notification.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sistema aggiornato alla versione ${this.currentVersion}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        } catch (error) {
            safeLog('error', 'Error showing update notification', error);
        }
    }

    setupVersionDisplay() {
        try {
            // Aggiorna display esistente o crea nuovo
            let versionDisplay = document.getElementById('versionDisplay');
            
            if (!versionDisplay) {
                versionDisplay = document.createElement('div');
                versionDisplay.id = 'versionDisplay';
                versionDisplay.className = 'fixed bottom-4 right-4 text-xs text-gray-400 bg-gray-800 px-3 py-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer z-40';
                document.body.appendChild(versionDisplay);
            }
            
            versionDisplay.textContent = `v${this.currentVersion}`;
            versionDisplay.title = `Sistema Prenotazioni v${this.currentVersion}\nClicca per dettagli versione`;
            
            // Aggiungi click handler per info versione
            versionDisplay.addEventListener('click', () => this.showVersionInfo());
            
            // Aggiorna anche altri elementi con classe version-display
            document.querySelectorAll('.version-display').forEach(el => {
                el.textContent = `v${this.currentVersion}`;
            });
            
        } catch (error) {
            safeLog('error', 'Error setting up version display', error);
        }
    }

    setupVersionAPI() {
        try {
            // API pubblica per controllo versione
            window.versionManager = {
                getCurrentVersion: () => this.currentVersion,
                checkForUpdates: () => this.checkForUpdates(),
                forceReload: () => this.forceReload(),
                showInfo: () => this.showVersionInfo(),
                clearCache: () => this.clearCache(),
                isInitialized: () => this.isInitialized,
                isCacheBustingEnabled: () => this.cacheBustingEnabled
            };
            
            safeLog('info', 'Version API configurata');
        } catch (error) {
            safeLog('error', 'Error setting up version API', error);
        }
    }

    showVersionInfo() {
        try {
            const info = {
                'Versione': this.currentVersion,
                'Cache-busting': this.cacheBustingEnabled ? 'Attivo' : 'Disattivo',
                'Ultima verifica': new Date().toLocaleString('it-IT'),
                'Browser': navigator.userAgent.split(' ').pop(),
                'Online': navigator.onLine ? 'Sì' : 'No'
            };

            const message = Object.entries(info)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            alert(`📱 Sistema Prenotazioni\n\n${message}\n\n💡 Suggerimento: Usa F5 per ricaricare manualmente`);
        } catch (error) {
            safeLog('error', 'Error showing version info', error);
        }
    }

    getCurrentVersion() {
        return this.currentVersion;
    }

    // Force reload with cache busting
    forceReload() {
        try {
            safeLog('info', 'Force reload richiesto');
            
            // Se cache-busting system è disponibile, usalo
            if (window.cacheBustingSystem && typeof window.cacheBustingSystem.forceReload === 'function') {
                window.cacheBustingSystem.forceReload();
                return;
            }
            
            // Fallback: clear cache e reload
            this.clearCache();
            
            setTimeout(() => {
                window.location.reload(true);
            }, 100);
            
        } catch (error) {
            safeLog('error', 'Error forcing reload', error);
            // Fallback to simple reload
            window.location.reload(true);
        }
    }

    // Check if current version is latest
    async checkForUpdates() {
        try {
            safeLog('info', 'Controllo aggiornamenti...');
            
            // Se cache-busting system è disponibile, usalo
            if (window.cacheBustingSystem && typeof window.cacheBustingSystem.checkUpdate === 'function') {
                const updateAvailable = window.cacheBustingSystem.checkUpdate();
                return {
                    currentVersion: this.currentVersion,
                    isLatest: !updateAvailable,
                    updateAvailable,
                    method: 'cache-busting-system'
                };
            }
            
            // Fallback: controllo locale
            return {
                currentVersion: this.currentVersion,
                isLatest: true,
                updateAvailable: false,
                method: 'local-check'
            };
        } catch (error) {
            safeLog('error', 'Error checking for updates', error);
            return {
                currentVersion: this.currentVersion,
                isLatest: true,
                updateAvailable: false,
                error: error.message,
                method: 'error-fallback'
            };
        }
    }

    // Integrazione con cache-busting system
    integrateCacheBusting() {
        try {
            if (window.cacheBustingSystem) {
                this.cacheBustingEnabled = true;
                this.currentVersion = window.cacheBustingSystem.getVersion() || this.currentVersion;
                safeLog('info', 'Integrazione cache-busting completata', {
                    version: this.currentVersion,
                    systemLoaded: window.cacheBustingSystem.isLoaded()
                });
                return true;
            }
            return false;
        } catch (error) {
            safeLog('error', 'Error integrating cache-busting', error);
            return false;
        }
    }
}

// Safe logging function for version manager
function safeLog(level, message, data = null) {
    try {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [VERSION-${level.toUpperCase()}] ${message}`;
        
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
        console.error('Error in version manager logging:', e);
    }
}

// Initialize version manager
let versionManager = null;
try {
    versionManager = new VersionManager();
    
    // Integra con cache-busting system se disponibile
    if (window.cacheBustingSystem) {
        versionManager.integrateCacheBusting();
    }
    
} catch (error) {
    console.error('Failed to initialize version manager:', error);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionManager;
}
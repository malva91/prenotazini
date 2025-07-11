// Version Manager for cache busting and resource loading
class VersionManager {
    constructor() {
        this.currentVersion = '1.0.2';
        this.storageKey = 'booking_system_version';
        this.isInitialized = false;
        this.init();
    }

    init() {
        try {
            this.checkVersionUpdate();
            this.setupVersionDisplay();
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
            // Add version info to footer or create version display
            const versionDisplay = document.createElement('div');
            versionDisplay.id = 'versionDisplay';
            versionDisplay.className = 'fixed bottom-4 right-4 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded opacity-50 hover:opacity-100 transition-opacity';
            versionDisplay.textContent = `v${this.currentVersion}`;
            versionDisplay.title = `Sistema Prenotazioni v${this.currentVersion}`;
            
            document.body.appendChild(versionDisplay);
        } catch (error) {
            safeLog('error', 'Error setting up version display', error);
        }
    }

    getCurrentVersion() {
        return this.currentVersion;
    }

    // Force reload with cache busting
    forceReload() {
        try {
            // Clear all caches
            this.clearCache();
            
            // Add timestamp to URL to force reload
            const url = new URL(window.location);
            url.searchParams.set('_t', Date.now());
            url.searchParams.set('v', this.currentVersion);
            
            window.location.href = url.toString();
        } catch (error) {
            safeLog('error', 'Error forcing reload', error);
            // Fallback to simple reload
            window.location.reload(true);
        }
    }

    // Check if current version is latest
    async checkForUpdates() {
        try {
            // This could be extended to check against a server endpoint
            // For now, just return current version info
            return {
                currentVersion: this.currentVersion,
                isLatest: true,
                updateAvailable: false
            };
        } catch (error) {
            safeLog('error', 'Error checking for updates', error);
            return {
                currentVersion: this.currentVersion,
                isLatest: true,
                updateAvailable: false,
                error: error.message
            };
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
    window.versionManager = versionManager;
} catch (error) {
    console.error('Failed to initialize version manager:', error);
}

// Make it globally available

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionManager;
}
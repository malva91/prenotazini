/**
 * Cache-Busting Loader System
 * Sistema di caricamento dinamico con cache-busting automatico
 *
 * Questo script:
 * 1. Carica la versione corrente da version.js
 * 2. Aggiunge il parametro ?v=VERSION a tutti i file CSS, JS e risorse interne
 * 3. Gestisce il reload automatico quando la versione cambia
 * 4. Mostra la versione nell'interfaccia utente
 */

(async function() {
  'use strict';

  // === CONFIGURAZIONE ===
  let APP_VERSION = null;
  let isVersionLoaded = false;
  let isInitialized = false;

  // Logging con timestamp
  function log(level, message, data = null) {
    // OTTIMIZZAZIONE: Limita logging cache-busting
    if (level === 'debug' && Math.random() > 0.3) {
      return; // Mostra solo 30% dei debug logs
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CACHE-BUSTER-${level.toUpperCase()}] ${message}`;
    
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

  /**
   * STEP 1: Carica la versione da version.js (modulo ES)
   */
  async function loadVersion() {
    try {
      log('info', 'Caricamento versione da version.js...');
      
      // Usa timestamp per evitare cache del file version.js stesso
      const cacheBuster = Date.now();
      const versionModule = await import(`../version.js?cache=${cacheBuster}`);
      
      APP_VERSION = versionModule.APP_VERSION || versionModule.default?.version;
      
      if (!APP_VERSION) {
        throw new Error('APP_VERSION non trovata nel modulo');
      }
      
      isVersionLoaded = true;
      log('info', `Versione caricata: ${APP_VERSION}`);
      return APP_VERSION;
      
    } catch (error) {
      log('warn', 'Impossibile importare version.js, uso timestamp come fallback', error);
      APP_VERSION = `dev-${Date.now()}`;
      isVersionLoaded = true;
      return APP_VERSION;
    }
  }

  /**
   * STEP 2: Controlla se la versione è cambiata e forza il reload
   */
  function checkForVersionUpdate(version) {
    try {
      const storageKey = 'booking_system_version';
      const stored = localStorage.getItem(storageKey);
      
      if (stored && stored !== version) {
        log('info', `Aggiornamento rilevato: ${stored} → ${version}`);
        
        // Mostra notifica di aggiornamento
        showUpdateNotification(stored, version);
        
        // Salva nuova versione
        localStorage.setItem(storageKey, version);
        
        // Pulisci tutte le cache
        clearAllCaches();
        
        // Reload con cache bypass dopo un breve delay
        setTimeout(() => {
          log('info', 'Ricaricamento pagina per aggiornamento...');
          window.location.reload(true);
        }, 2000);
        
        return true;
      }
      
      if (!stored) {
        localStorage.setItem(storageKey, version);
        log('info', `Prima esecuzione, versione salvata: ${version}`);
      }
      
      return false;
    } catch (error) {
      log('error', 'Errore nel controllo versione', error);
      return false;
    }
  }

  /**
   * Mostra notifica di aggiornamento
   */
  function showUpdateNotification(oldVersion, newVersion) {
    try {
      const notification = document.createElement('div');
      notification.id = 'version-update-notification';
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md';
      notification.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <div>
            <div class="font-semibold">Sistema aggiornato!</div>
            <div class="text-sm opacity-90">v${oldVersion} → v${newVersion}</div>
            <div class="text-xs opacity-75">Ricaricamento in corso...</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Rimuovi dopo il reload
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
      
    } catch (error) {
      log('error', 'Errore nella notifica di aggiornamento', error);
    }
  }

  /**
   * Pulisce tutte le cache disponibili
   */
  async function clearAllCaches() {
    try {
      log('info', 'Pulizia cache in corso...');
      
      // Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        log('info', `Pulite ${cacheNames.length} cache API`);
      }

      // LocalStorage cache entries (mantieni dati utente)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache_') || key.includes('_cache') || key.includes('resource_'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      log('info', `Pulite ${keysToRemove.length} voci cache localStorage`);
      
    } catch (error) {
      log('error', 'Errore nella pulizia cache', error);
    }
  }

  /**
   * Determina se un URL è una risorsa interna
   */
  function isInternalResource(url) {
    try {
      if (!url || typeof url !== 'string') return false;
      
      // URL relativi sono sempre interni
      if (!url.startsWith('http')) return true;
      
      const resourceUrl = new URL(url, location.href);
      const currentOrigin = location.origin;
      
      // Stesso dominio
      if (resourceUrl.origin === currentOrigin) return true;
      
      // CDN esterni da escludere
      const externalDomains = [
        'cdn.tailwindcss.com',
        'www.gstatic.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdnjs.cloudflare.com',
        'unpkg.com',
        'jsdelivr.net'
      ];
      
      return !externalDomains.some(domain => resourceUrl.hostname.includes(domain));
      
    } catch (error) {
      log('warn', 'Errore nel controllo risorsa interna', { url, error: error.message });
      return false;
    }
  }

  /**
   * Aggiunge parametro versione all'URL
   */
  function addVersionParam(url) {
    try {
      if (!url || !isInternalResource(url)) return url;
      
      // Rimuovi parametri esistenti
      const cleanUrl = url.split('?')[0].split('#')[0];
      
      // Aggiungi versione
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}v=${APP_VERSION}`;
      
    } catch (error) {
      log('warn', 'Errore nell\'aggiunta parametro versione', { url, error: error.message });
      return url;
    }
  }

  /**
   * STEP 3: Cache-busting per CSS
   */
  function bustCSS() {
    try {
      let count = 0;
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const originalHref = link.getAttribute('href');
        if (originalHref && isInternalResource(originalHref)) {
          const cleanHref = originalHref.split('?')[0];
          const newHref = addVersionParam(cleanHref);
          
          if (newHref !== originalHref) {
            link.href = newHref;
            count++;
            // OTTIMIZZAZIONE: Log solo il totale, non ogni file
          }
        }
      });
      
      if (count > 0) {
        log('info', `Cache-busting CSS: ${count} file aggiornati`);
      }
    } catch (error) {
      log('error', 'Errore nel cache-busting CSS', error);
    }
  }

  /**
   * STEP 4: Cache-busting per JavaScript
   */
  function bustJS() {
    try {
      let count = 0;
      const scriptsToUpdate = [];
      
      document.querySelectorAll('script[src]').forEach(script => {
        const originalSrc = script.getAttribute('src');
        
        // Non aggiornare il loader stesso
        if (originalSrc && !originalSrc.includes('cache-busting-loader.js') && isInternalResource(originalSrc)) {
          scriptsToUpdate.push({
            original: script,
            src: originalSrc
          });
        }
      });
      
      // Aggiorna gli script
      scriptsToUpdate.forEach(({ original, src }) => {
        const cleanSrc = src.split('?')[0];
        const newSrc = addVersionParam(cleanSrc);
        
        if (newSrc !== src) {
          const newScript = document.createElement('script');
          newScript.src = newSrc;
          
          // Copia attributi
          if (original.async) newScript.async = true;
          if (original.defer) newScript.defer = true;
          if (original.type) newScript.type = original.type;
          if (original.crossOrigin) newScript.crossOrigin = original.crossOrigin;
          
          // Sostituisci
          original.parentNode.insertBefore(newScript, original);
          original.remove();
          
          count++;
          // OTTIMIZZAZIONE: Log solo il totale, non ogni file
        }
      });
      
      if (count > 0) {
        log('info', `Cache-busting JS: ${count} file aggiornati`);
      }
    } catch (error) {
      log('error', 'Errore nel cache-busting JS', error);
    }
  }

  /**
   * STEP 5: Cache-busting altre risorse
   */
  function bustOtherResources() {
    try {
      let count = 0;
      
      // Immagini, iframe, etc.
      document.querySelectorAll('img[src], iframe[src], video[src], audio[src]').forEach(element => {
        const originalSrc = element.getAttribute('src');
        if (originalSrc && isInternalResource(originalSrc)) {
          const cleanSrc = originalSrc.split('?')[0];
          const newSrc = addVersionParam(cleanSrc);
          
          if (newSrc !== originalSrc) {
            element.src = newSrc;
            count++;
            // OTTIMIZZAZIONE: Log solo il totale, non ogni file
          }
        }
      });
      
      if (count > 0) {
        log('info', `Cache-busting risorse: ${count} file aggiornati`);
      }
    } catch (error) {
      log('error', 'Errore nel cache-busting risorse', error);
    }
  }

  /**
   * STEP 6: Aggiorna UI con informazioni versione
   */
  function updateVersionDisplay() {
    try {
      // Aggiorna elementi esistenti
      document.querySelectorAll('.version-display, #versionDisplay').forEach(el => {
        el.textContent = `v${APP_VERSION}`;
        el.title = `Sistema Prenotazioni v${APP_VERSION}`;
      });

      // Crea display versione se non esiste
      if (!document.getElementById('versionDisplay')) {
        const versionDisplay = document.createElement('div');
        versionDisplay.id = 'versionDisplay';
        versionDisplay.className = 'fixed bottom-4 right-4 text-xs text-gray-400 bg-gray-800 px-3 py-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer z-40';
        versionDisplay.textContent = `v${APP_VERSION}`;
        versionDisplay.title = `Sistema Prenotazioni v${APP_VERSION}\nClicca per info sistema`;
        
        // Click per info sistema
        versionDisplay.addEventListener('click', showSystemInfo);
        
        document.body.appendChild(versionDisplay);
      }

      // Aggiorna meta tag
      let versionMeta = document.querySelector('meta[name="app-version"]');
      if (!versionMeta) {
        versionMeta = document.createElement('meta');
        versionMeta.name = 'app-version';
        document.head.appendChild(versionMeta);
      }
      versionMeta.content = APP_VERSION;

      log('info', `Display versione aggiornato: v${APP_VERSION}`);
    } catch (error) {
      log('error', 'Errore nell\'aggiornamento display versione', error);
    }
  }

  /**
   * Mostra informazioni sistema
   */
  function showSystemInfo() {
    try {
      const info = {
        versione: APP_VERSION,
        caricata: new Date().toLocaleString('it-IT'),
        browser: navigator.userAgent.split(' ').pop(),
        online: navigator.onLine,
        cache: 'caches' in window,
        localStorage: 'localStorage' in window
      };

      const message = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      alert(`📱 Sistema Prenotazioni\n\n${message}`);
    } catch (error) {
      log('error', 'Errore nel mostrare info sistema', error);
    }
  }

  /**
   * STEP 7: Inizializzazione principale
   */
  async function init() {
    if (isInitialized) {
      log('warn', 'Cache-busting già inizializzato');
      return;
    }

    try {
      log('info', '🚀 Inizializzazione cache-busting system...');
      
      // Carica versione
      await loadVersion();
      
      // Controlla aggiornamenti (può causare reload)
      if (checkForVersionUpdate(APP_VERSION)) {
        log('info', 'Reload in corso per aggiornamento versione');
        return; // Il reload interromperà l'esecuzione
      }
      
      // Applica cache-busting
      bustCSS();
      bustJS();
      bustOtherResources();
      
      // Aggiorna UI
      updateVersionDisplay();
      
      isInitialized = true;
      log('info', '✅ Cache-busting system inizializzato con successo');
      
    } catch (error) {
      log('error', 'Errore nell\'inizializzazione cache-busting', error);
    }
  }

  /**
   * Avvio automatico
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM già caricato
    setTimeout(init, 0);
  }

  /**
   * API pubblica per debug e controllo
   */
  window.cacheBustingSystem = {
    getVersion: () => APP_VERSION,
    isLoaded: () => isVersionLoaded,
    isInitialized: () => isInitialized,
    clearCache: clearAllCaches,
    forceReload: () => {
      clearAllCaches().then(() => {
        window.location.reload(true);
      });
    },
    checkUpdate: () => checkForVersionUpdate(APP_VERSION),
    showInfo: showSystemInfo,
    bustAll: () => {
      bustCSS();
      bustJS();
      bustOtherResources();
      updateVersionDisplay();
    }
  };

  // Esporta per uso in moduli
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.cacheBustingSystem;
  }

})();
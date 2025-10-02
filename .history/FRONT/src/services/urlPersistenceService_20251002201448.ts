/**
 * 🔗 URL Parameter Persistence Service
 * 
 * Ensures URL parameters (parcours, checkid) survive page refreshes
 * by storing them in localStorage and restoring them on app mount
 */

const STORAGE_KEY_URL_PARAMS = 'checkeasy_url_params';
const STORAGE_KEY_LAST_PATH = 'checkeasy_last_path';

export interface UrlParams {
  parcours?: string;
  checkid?: string;
  path?: string;
  timestamp?: number;
}

class UrlPersistenceService {
  /**
   * 💾 Save current URL parameters to localStorage
   */
  saveCurrentUrlParams(): void {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const parcours = urlParams.get('parcours');
      const checkid = urlParams.get('checkid');
      const path = window.location.pathname;

      // Only save if we have at least one parameter
      if (parcours || checkid) {
        const params: UrlParams = {
          parcours: parcours || undefined,
          checkid: checkid || undefined,
          path,
          timestamp: Date.now()
        };

        localStorage.setItem(STORAGE_KEY_URL_PARAMS, JSON.stringify(params));
        localStorage.setItem(STORAGE_KEY_LAST_PATH, path);

        console.log('💾 URL params saved to localStorage:', params);
      }
    } catch (error) {
      console.error('❌ Error saving URL params:', error);
    }
  }

  /**
   * 📖 Get saved URL parameters from localStorage
   */
  getSavedUrlParams(): UrlParams | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_URL_PARAMS);
      if (!saved) return null;

      const params: UrlParams = JSON.parse(saved);
      
      // Check if params are not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (params.timestamp && Date.now() - params.timestamp > maxAge) {
        console.log('⏰ Saved URL params are too old, ignoring');
        this.clearSavedParams();
        return null;
      }

      return params;
    } catch (error) {
      console.error('❌ Error reading saved URL params:', error);
      return null;
    }
  }

  /**
   * 🔄 Restore URL parameters if missing from current URL
   * Returns true if restoration was performed
   */
  restoreUrlParamsIfMissing(): boolean {
    try {
      const currentUrl = new URLSearchParams(window.location.search);
      const currentParcours = currentUrl.get('parcours');
      const currentCheckid = currentUrl.get('checkid');

      // If we already have both params, no need to restore
      if (currentParcours && currentCheckid) {
        console.log('✅ URL params already present, no restoration needed');
        // Still save them for next time
        this.saveCurrentUrlParams();
        return false;
      }

      // Try to restore from localStorage
      const saved = this.getSavedUrlParams();

      // 🆕 FIX: Also check activeCheckId in localStorage
      const activeCheckId = localStorage.getItem('activeCheckId');

      if (!saved && !activeCheckId) {
        console.log('ℹ️ No saved URL params to restore');
        return false;
      }

      // Build new URL with restored params
      const newParams = new URLSearchParams(window.location.search);
      let restored = false;

      if (!currentParcours && saved?.parcours) {
        newParams.set('parcours', saved.parcours);
        restored = true;
        console.log('🔄 Restored parcours param:', saved.parcours);
      }

      // 🆕 FIX: Restore checkid from saved params OR activeCheckId
      if (!currentCheckid) {
        const checkidToRestore = saved?.checkid || activeCheckId;
        if (checkidToRestore) {
          newParams.set('checkid', checkidToRestore);
          restored = true;
          console.log('🔄 Restored checkid param:', checkidToRestore,
            saved?.checkid ? '(from saved params)' : '(from activeCheckId)');
        }
      }

      if (restored) {
        const newUrl = `${window.location.pathname}?${newParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
        console.log('✅ URL params restored:', newUrl);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error restoring URL params:', error);
      return false;
    }
  }

  /**
   * 🗑️ Clear saved URL parameters
   */
  clearSavedParams(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_URL_PARAMS);
      localStorage.removeItem(STORAGE_KEY_LAST_PATH);
      console.log('🗑️ Saved URL params cleared');
    } catch (error) {
      console.error('❌ Error clearing saved URL params:', error);
    }
  }

  /**
   * 🔍 Get specific parameter from URL or localStorage
   */
  getParam(paramName: 'parcours' | 'checkid'): string | null {
    // First try current URL
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get(paramName);
    if (fromUrl) return fromUrl;

    // Fallback to saved params
    const saved = this.getSavedUrlParams();
    return saved?.[paramName] || null;
  }

  /**
   * 📊 Get current URL state
   */
  getCurrentState(): {
    hasParcoursInUrl: boolean;
    hasCheckidInUrl: boolean;
    hasParcoursInStorage: boolean;
    hasCheckidInStorage: boolean;
    canRestore: boolean;
  } {
    const urlParams = new URLSearchParams(window.location.search);
    const saved = this.getSavedUrlParams();
    const activeCheckId = localStorage.getItem('activeCheckId');

    return {
      hasParcoursInUrl: !!urlParams.get('parcours'),
      hasCheckidInUrl: !!urlParams.get('checkid'),
      hasParcoursInStorage: !!saved?.parcours,
      hasCheckidInStorage: !!(saved?.checkid || activeCheckId),
      canRestore: !!(saved?.parcours || saved?.checkid || activeCheckId)
    };
  }

  /**
   * 🎯 Initialize URL persistence
   * Call this on app mount
   */
  initialize(): void {
    console.log('🎯 Initializing URL persistence service');
    
    // Restore params if missing
    const restored = this.restoreUrlParamsIfMissing();
    
    if (!restored) {
      // Save current params for future refreshes
      this.saveCurrentUrlParams();
    }

    // Set up listener to save params on URL changes
    this.setupUrlChangeListener();
  }

  /**
   * 👂 Set up listener for URL changes
   */
  private setupUrlChangeListener(): void {
    // Save params whenever URL changes
    let lastUrl = window.location.href;
    
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.saveCurrentUrlParams();
      }
    };

    // Check every 500ms (lightweight)
    setInterval(checkUrlChange, 500);

    // Also listen to popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.saveCurrentUrlParams();
    });
  }
}

// Export singleton instance
export const urlPersistenceService = new UrlPersistenceService();


/**
 * 🔄 URL SYNC SERVICE
 * 
 * Service de synchronisation bidirectionnelle entre URL et IndexedDB.
 * 
 * Responsabilités :
 * - Synchroniser les paramètres URL avec IndexedDB
 * - Détecter les changements d'URL et mettre à jour IndexedDB
 * - Détecter les changements IndexedDB et mettre à jour l'URL
 * - Gérer les conflits de synchronisation
 * 
 * Principe : L'URL est la source de vérité primaire
 */

import { navigationStateManager } from './navigationStateManager';
import { checkSessionManager } from './checkSessionManager';

type SyncCallback = (params: { parcoursId: string | null; checkId: string | null }) => void;

class UrlSyncService {
  private subscribers: Set<SyncCallback> = new Set();
  private lastKnownUrl: string = '';
  private syncInterval: number | null = null;
  private isEnabled: boolean = false;

  /**
   * Démarre la synchronisation automatique
   */
  start(): void {
    if (this.isEnabled) {
      console.log('⚠️ [UrlSyncService] Déjà démarré');
      return;
    }

    console.log('🔄 [UrlSyncService] Démarrage de la synchronisation URL');
    this.isEnabled = true;
    this.lastKnownUrl = window.location.href;

    // Vérifier les changements d'URL toutes les 100ms
    this.syncInterval = window.setInterval(() => {
      this.checkUrlChanges();
    }, 100);

    // Synchronisation initiale
    this.syncUrlToIndexedDB();
  }

  /**
   * Arrête la synchronisation automatique
   */
  stop(): void {
    if (!this.isEnabled) {
      return;
    }

    console.log('🛑 [UrlSyncService] Arrêt de la synchronisation URL');
    this.isEnabled = false;

    if (this.syncInterval !== null) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Vérifie si l'URL a changé
   */
  private checkUrlChanges(): void {
    const currentUrl = window.location.href;

    if (currentUrl !== this.lastKnownUrl) {
      console.log('🔄 [UrlSyncService] Changement d\'URL détecté:', {
        from: this.lastKnownUrl,
        to: currentUrl
      });

      this.lastKnownUrl = currentUrl;
      this.syncUrlToIndexedDB();
    }
  }

  /**
   * Synchronise l'URL vers IndexedDB
   */
  private async syncUrlToIndexedDB(): Promise<void> {
    try {
      const urlParams = navigationStateManager.extractUrlParams(window.location.search);
      const { parcoursId, checkId } = urlParams;

      console.log('🔄 [UrlSyncService] Synchronisation URL → IndexedDB:', {
        parcoursId,
        checkId
      });

      // Notifier les abonnés
      this.notifySubscribers({ parcoursId, checkId });

      // Mettre à jour localStorage pour compatibilité
      if (checkId) {
        localStorage.setItem('activeCheckId', checkId);
      }

      if (parcoursId) {
        localStorage.setItem('activeParcoursId', parcoursId);
      }

      // Sauvegarder les paramètres URL
      const urlParamsData = {
        parcours: parcoursId,
        checkid: checkId,
        timestamp: Date.now()
      };
      localStorage.setItem('checkeasy_url_params', JSON.stringify(urlParamsData));

      // Sauvegarder le chemin actuel
      localStorage.setItem('checkeasy_last_path', window.location.pathname);

      // Mettre à jour lastActiveAt dans IndexedDB si on a un checkId
      if (checkId) {
        const session = await checkSessionManager.getCheckSession(checkId);
        if (session) {
          await checkSessionManager.saveCheckSession({
            ...session,
            lastActiveAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ [UrlSyncService] Erreur synchronisation URL → IndexedDB:', error);
    }
  }

  /**
   * Synchronise IndexedDB vers l'URL
   * @param parcoursId - ID du parcours
   * @param checkId - ID de la session
   */
  async syncIndexedDBToUrl(parcoursId: string, checkId: string): Promise<void> {
    try {
      console.log('🔄 [UrlSyncService] Synchronisation IndexedDB → URL:', {
        parcoursId,
        checkId
      });

      const currentPath = window.location.pathname;
      const newUrl = navigationStateManager.buildUrl(currentPath, parcoursId, checkId);

      // Mettre à jour l'URL sans recharger la page
      if (window.location.href !== newUrl) {
        window.history.replaceState({}, '', newUrl);
        this.lastKnownUrl = newUrl;

        console.log('✅ [UrlSyncService] URL mise à jour:', newUrl);
      }
    } catch (error) {
      console.error('❌ [UrlSyncService] Erreur synchronisation IndexedDB → URL:', error);
    }
  }

  /**
   * S'abonne aux changements de paramètres URL
   * @param callback - Fonction appelée lors des changements
   * @returns Fonction de désabonnement
   */
  subscribe(callback: SyncCallback): () => void {
    this.subscribers.add(callback);

    // Retourner une fonction de désabonnement
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notifie tous les abonnés
   */
  private notifySubscribers(params: { parcoursId: string | null; checkId: string | null }): void {
    this.subscribers.forEach(callback => {
      try {
        callback(params);
      } catch (error) {
        console.error('❌ [UrlSyncService] Erreur notification abonné:', error);
      }
    });
  }

  /**
   * Obtient les paramètres URL actuels
   */
  getCurrentParams(): { parcoursId: string | null; checkId: string | null } {
    return navigationStateManager.extractUrlParams(window.location.search);
  }

  /**
   * Vérifie si les paramètres URL sont cohérents avec IndexedDB
   */
  async checkConsistency(): Promise<{
    isConsistent: boolean;
    urlParams: { parcoursId: string | null; checkId: string | null };
    indexedDBParams: { parcoursId: string | null; checkId: string | null };
  }> {
    const urlParams = this.getCurrentParams();
    
    let indexedDBParams = {
      parcoursId: null as string | null,
      checkId: null as string | null
    };

    if (urlParams.checkId) {
      const session = await checkSessionManager.getCheckSession(urlParams.checkId);
      if (session) {
        indexedDBParams = {
          parcoursId: session.parcoursId,
          checkId: session.checkId
        };
      }
    }

    const isConsistent = 
      urlParams.parcoursId === indexedDBParams.parcoursId &&
      urlParams.checkId === indexedDBParams.checkId;

    return {
      isConsistent,
      urlParams,
      indexedDBParams
    };
  }

  /**
   * Force la synchronisation URL → IndexedDB
   */
  async forceSync(): Promise<void> {
    console.log('🔄 [UrlSyncService] Force sync URL → IndexedDB');
    await this.syncUrlToIndexedDB();
  }

  /**
   * Nettoie les paramètres URL et IndexedDB
   */
  async clear(): Promise<void> {
    console.log('🧹 [UrlSyncService] Nettoyage des paramètres');
    
    // Nettoyer localStorage
    localStorage.removeItem('activeCheckId');
    localStorage.removeItem('activeParcoursId');
    localStorage.removeItem('checkeasy_url_params');
    localStorage.removeItem('checkeasy_last_path');

    // Nettoyer l'URL
    const currentPath = window.location.pathname;
    window.history.replaceState({}, '', currentPath);
    this.lastKnownUrl = window.location.href;

    // Notifier les abonnés
    this.notifySubscribers({ parcoursId: null, checkId: null });
  }

  /**
   * Obtient le statut du service
   */
  getStatus(): {
    isEnabled: boolean;
    lastKnownUrl: string;
    subscribersCount: number;
    currentParams: { parcoursId: string | null; checkId: string | null };
  } {
    return {
      isEnabled: this.isEnabled,
      lastKnownUrl: this.lastKnownUrl,
      subscribersCount: this.subscribers.size,
      currentParams: this.getCurrentParams()
    };
  }
}

// Export singleton
export const urlSyncService = new UrlSyncService();
export default urlSyncService;


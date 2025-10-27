/**
 * 🔄 DATA LOADING ORCHESTRATOR
 * 
 * Service central qui coordonne tous les chargements de données.
 * 
 * Responsabilités :
 * - Coordonner tous les chargements de données
 * - Éviter les chargements multiples et concurrents (loading locks)
 * - Gérer le cache et la fraîcheur des données
 * - Synchroniser les contextes React avec les données chargées
 * 
 * Principe : Un seul chargement à la fois par ressource (parcours ou session)
 */

import { CheckSession, checkSessionManager } from './checkSessionManager';
import { ParcoursData, parcoursManager } from './parcoursManager';
import { parcoursCache } from './parcoursCache';

interface LoadingState {
  isLoading: boolean;
  promise: Promise<any> | null;
}

interface CacheStrategy {
  /**
   * Durée de validité du cache en heures
   * @default 24
   */
  maxAgeHours: number;

  /**
   * Durée après laquelle recharger en arrière-plan (en heures)
   * @default 20
   */
  revalidateAfterHours: number;

  /**
   * Activer le rechargement en arrière-plan
   * @default true
   */
  enableBackgroundRevalidation: boolean;

  /**
   * Stratégie de cache
   * - 'cache-first': Utiliser le cache si disponible, sinon API
   * - 'network-first': Utiliser l'API, fallback sur cache en cas d'erreur
   * - 'cache-only': Utiliser uniquement le cache
   * - 'network-only': Utiliser uniquement l'API
   * @default 'cache-first'
   */
  strategy: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
}

const DEFAULT_CACHE_STRATEGY: CacheStrategy = {
  maxAgeHours: 24,
  revalidateAfterHours: 20,
  enableBackgroundRevalidation: true,
  strategy: 'cache-first'
};

class DataLoadingOrchestrator {
  // Map de locks de chargement : clé → Promise de chargement
  private loadingLocks: Map<string, Promise<any>> = new Map();

  // Map d'états de chargement pour le tracking
  private loadingStates: Map<string, LoadingState> = new Map();

  // Stratégie de cache
  private cacheStrategy: CacheStrategy = DEFAULT_CACHE_STRATEGY;

  /**
   * Configure la stratégie de cache
   * @param strategy - Nouvelle stratégie de cache
   */
  setCacheStrategy(strategy: Partial<CacheStrategy>): void {
    this.cacheStrategy = { ...this.cacheStrategy, ...strategy };
    console.log('⚙️ [DataLoadingOrchestrator] Stratégie de cache mise à jour:', this.cacheStrategy);
  }

  /**
   * Obtient la stratégie de cache actuelle
   */
  getCacheStrategy(): CacheStrategy {
    return { ...this.cacheStrategy };
  }

  /**
   * Charge les données de session depuis IndexedDB
   * @param checkId - ID de la session
   * @returns Session ou null si inexistante
   */
  async loadSessionData(checkId: string): Promise<CheckSession | null> {
    const lockKey = `session_${checkId}`;
    
    // Si un chargement est déjà en cours, attendre sa complétion
    if (this.loadingLocks.has(lockKey)) {
      console.log(`⏳ [DataLoadingOrchestrator] Chargement session ${checkId} déjà en cours, attente...`);
      return this.loadingLocks.get(lockKey)!;
    }
    
    // Créer un nouveau chargement
    const loadingPromise = this._loadSessionDataInternal(checkId);
    
    // Enregistrer le lock
    this.loadingLocks.set(lockKey, loadingPromise);
    this.loadingStates.set(lockKey, { isLoading: true, promise: loadingPromise });
    
    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Libérer le lock
      this.loadingLocks.delete(lockKey);
      this.loadingStates.set(lockKey, { isLoading: false, promise: null });
    }
  }

  /**
   * Implémentation interne du chargement de session
   */
  private async _loadSessionDataInternal(checkId: string): Promise<CheckSession | null> {
    console.log(`🔄 [DataLoadingOrchestrator] Chargement session ${checkId}...`);
    
    try {
      const session = await checkSessionManager.getCheckSession(checkId);
      
      if (session) {
        console.log(`✅ [DataLoadingOrchestrator] Session ${checkId} chargée`, {
          status: session.status,
          flowType: session.flowType,
          isFlowCompleted: session.isFlowCompleted,
        });
      } else {
        console.warn(`⚠️ [DataLoadingOrchestrator] Session ${checkId} introuvable`);
      }
      
      return session;
    } catch (error) {
      console.error(`❌ [DataLoadingOrchestrator] Erreur chargement session ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Charge les données de parcours (API ou cache)
   * @param parcoursId - ID du parcours
   * @param forceFlowType - Force un type de flow spécifique
   * @returns Données du parcours
   */
  async loadParcoursData(
    parcoursId: string, 
    forceFlowType?: 'checkin' | 'checkout'
  ): Promise<ParcoursData> {
    const lockKey = `parcours_${parcoursId}_${forceFlowType || 'default'}`;
    
    // Si un chargement est déjà en cours, attendre sa complétion
    if (this.loadingLocks.has(lockKey)) {
      console.log(`⏳ [DataLoadingOrchestrator] Chargement parcours ${parcoursId} déjà en cours, attente...`);
      return this.loadingLocks.get(lockKey)!;
    }
    
    // Créer un nouveau chargement
    const loadingPromise = this._loadParcoursDataInternal(parcoursId, forceFlowType);
    
    // Enregistrer le lock
    this.loadingLocks.set(lockKey, loadingPromise);
    this.loadingStates.set(lockKey, { isLoading: true, promise: loadingPromise });
    
    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Libérer le lock
      this.loadingLocks.delete(lockKey);
      this.loadingStates.set(lockKey, { isLoading: false, promise: null });
    }
  }

  /**
   * Implémentation interne du chargement de parcours
   */
  private async _loadParcoursDataInternal(
    parcoursId: string, 
    forceFlowType?: 'checkin' | 'checkout'
  ): Promise<ParcoursData> {
    console.log(`🔄 [DataLoadingOrchestrator] Chargement parcours ${parcoursId}...`);
    
    try {
      // 1. Vérifier le cache
      console.log(`🔍 [DataLoadingOrchestrator] Vérification cache pour parcours ${parcoursId}...`);
      const cachedData = await parcoursCache.getParcours(parcoursId);
      console.log(`🔍 [DataLoadingOrchestrator] Données cache:`, {
        hasCachedData: !!cachedData,
        cachedDataType: typeof cachedData,
        cachedDataKeys: cachedData ? Object.keys(cachedData).slice(0, 5) : []
      });

      const cacheValid = cachedData && await parcoursCache.isCacheValid(parcoursId, 24);
      console.log(`🔍 [DataLoadingOrchestrator] Cache valide:`, cacheValid);

      if (cacheValid && cachedData) {
        console.log(`✅ [DataLoadingOrchestrator] Parcours ${parcoursId} chargé depuis le cache`);

        // Charger depuis le cache
        const parcours = parcoursManager.loadFromRawDataWithMode(cachedData, forceFlowType);

        // Recharger en arrière-plan pour rafraîchir le cache (fire-and-forget)
        this._reloadParcoursInBackground(parcoursId, forceFlowType);

        return parcours;
      }
      
      // 2. Charger depuis l'API
      console.log(`🌐 [DataLoadingOrchestrator] Chargement parcours ${parcoursId} depuis l'API...`);
      const parcours = await parcoursManager.loadParcours(parcoursId, forceFlowType);
      
      console.log(`✅ [DataLoadingOrchestrator] Parcours ${parcoursId} chargé depuis l'API`);
      return parcours;
    } catch (error) {
      console.error(`❌ [DataLoadingOrchestrator] Erreur chargement parcours ${parcoursId}:`, error);
      throw error;
    }
  }

  /**
   * Recharge un parcours en arrière-plan (sans bloquer)
   */
  private _reloadParcoursInBackground(
    parcoursId: string, 
    forceFlowType?: 'checkin' | 'checkout'
  ): void {
    // Lancer le rechargement sans attendre
    parcoursManager.loadParcours(parcoursId, forceFlowType)
      .then(() => {
        console.log(`✅ [DataLoadingOrchestrator] Parcours ${parcoursId} rechargé en arrière-plan`);
      })
      .catch((error) => {
        console.error(`❌ [DataLoadingOrchestrator] Erreur rechargement arrière-plan:`, error);
      });
  }

  /**
   * Invalide le cache d'un parcours
   * @param parcoursId - ID du parcours
   */
  async invalidateParcoursCache(parcoursId: string): Promise<void> {
    console.log(`🗑️ [DataLoadingOrchestrator] Invalidation cache parcours ${parcoursId}`);
    await parcoursCache.clearCache(parcoursId);
  }

  /**
   * Vérifie si un chargement est en cours
   * @param key - Clé de chargement (parcoursId ou checkId)
   * @returns true si chargement en cours
   */
  isLoading(key: string): boolean {
    const state = this.loadingStates.get(key);
    return state?.isLoading || false;
  }

  /**
   * Vérifie si un chargement de session est en cours
   * @param checkId - ID de la session
   * @returns true si chargement en cours
   */
  isLoadingSession(checkId: string): boolean {
    return this.isLoading(`session_${checkId}`);
  }

  /**
   * Vérifie si un chargement de parcours est en cours
   * @param parcoursId - ID du parcours
   * @param forceFlowType - Type de flow
   * @returns true si chargement en cours
   */
  isLoadingParcours(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): boolean {
    return this.isLoading(`parcours_${parcoursId}_${forceFlowType || 'default'}`);
  }

  /**
   * Nettoie tous les locks de chargement (utile pour le debugging)
   */
  clearAllLocks(): void {
    console.log(`🧹 [DataLoadingOrchestrator] Nettoyage de tous les locks`);
    this.loadingLocks.clear();
    this.loadingStates.clear();
  }

  /**
   * Obtient l'état de tous les chargements en cours
   * @returns Map des états de chargement
   */
  getLoadingStates(): Map<string, LoadingState> {
    return new Map(this.loadingStates);
  }

  /**
   * Précharge un parcours (sans attendre le résultat)
   * Utile pour améliorer la performance
   * @param parcoursId - ID du parcours
   * @param forceFlowType - Type de flow
   */
  preloadParcours(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): void {
    console.log(`⚡ [DataLoadingOrchestrator] Préchargement parcours ${parcoursId}`);
    
    // Lancer le chargement sans attendre
    this.loadParcoursData(parcoursId, forceFlowType)
      .then(() => {
        console.log(`✅ [DataLoadingOrchestrator] Parcours ${parcoursId} préchargé`);
      })
      .catch((error) => {
        console.error(`❌ [DataLoadingOrchestrator] Erreur préchargement:`, error);
      });
  }

  /**
   * Charge à la fois la session et le parcours
   * @param checkId - ID de la session
   * @param parcoursId - ID du parcours
   * @param forceFlowType - Type de flow
   * @returns Session et parcours
   */
  async loadSessionAndParcours(
    checkId: string,
    parcoursId: string,
    forceFlowType?: 'checkin' | 'checkout'
  ): Promise<{ session: CheckSession | null; parcours: ParcoursData }> {
    console.log(`🔄 [DataLoadingOrchestrator] Chargement session + parcours...`);
    
    // Charger en parallèle
    const [session, parcours] = await Promise.all([
      this.loadSessionData(checkId),
      this.loadParcoursData(parcoursId, forceFlowType),
    ]);
    
    console.log(`✅ [DataLoadingOrchestrator] Session + parcours chargés`);
    
    return { session, parcours };
  }
}

// Export singleton
export const dataLoadingOrchestrator = new DataLoadingOrchestrator();
export default dataLoadingOrchestrator;


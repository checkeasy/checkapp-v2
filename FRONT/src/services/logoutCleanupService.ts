/**
 * 🧹 Logout Cleanup Service
 * 
 * Service centralisé pour nettoyer TOUTES les données lors de la déconnexion
 * Assure que l'utilisateur recommence vraiment de zéro
 */

import { checkSessionManager } from './checkSessionManager';
import { parcoursManager } from './parcoursManager';
import { dataLoadingOrchestrator } from './dataLoadingOrchestrator';

export class LogoutCleanupService {
  /**
   * 🧹 Nettoie COMPLÈTEMENT toutes les données de l'application
   * Appelé lors de la déconnexion pour assurer un démarrage de zéro
   */
  static async cleanupAllData(): Promise<void> {
    console.log('🧹 [LogoutCleanupService] Début du nettoyage complet...');

    try {
      // 1️⃣ Nettoyer localStorage
      await this.cleanupLocalStorage();

      // 2️⃣ Nettoyer IndexedDB
      await this.cleanupIndexedDB();

      // 3️⃣ Nettoyer sessionStorage
      await this.cleanupSessionStorage();

      // 4️⃣ Nettoyer les managers en mémoire
      await this.cleanupManagers();

      console.log('✅ [LogoutCleanupService] Nettoyage complet terminé');
    } catch (error) {
      console.error('❌ [LogoutCleanupService] Erreur lors du nettoyage:', error);
      // Continuer quand même pour ne pas bloquer la déconnexion
    }
  }

  /**
   * 🧹 Nettoie localStorage
   * ⚠️ IMPORTANT: Garde activeParcoursId pour rester sur le même parcours après logout
   */
  private static async cleanupLocalStorage(): Promise<void> {
    console.log('🧹 [LogoutCleanupService] Nettoyage localStorage...');

    // 🔒 Sauvegarder le parcours actif avant nettoyage
    const activeParcoursId = localStorage.getItem('activeParcoursId');

    const keysToRemove = [
      // Données utilisateur
      'userInfo',

      // Données de session (mais PAS activeParcoursId)
      'activeCheckId',
      'checkeasy_url_params',
      'checkeasy_last_path',

      // Données de flow
      'app-flow-state',
      'checkout-flow-state',
      'checkin-flow-state',
      'unified-flow-state',

      // Données de parcours
      'parcours-cache',
      'parcours-data',

      // Photos uploadées
      ...Object.keys(localStorage).filter(key => key.startsWith('uploaded_image_')),

      // Autres données temporaires
      ...Object.keys(localStorage).filter(key =>
        key.includes('temp') ||
        key.includes('cache') ||
        key.includes('session')
      )
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`⚠️ Erreur suppression localStorage[${key}]:`, error);
      }
    });

    // 🔓 Restaurer le parcours actif
    if (activeParcoursId) {
      localStorage.setItem('activeParcoursId', activeParcoursId);
      console.log(`✅ activeParcoursId conservé: ${activeParcoursId}`);
    }

    console.log(`✅ ${keysToRemove.length} clés localStorage supprimées (activeParcoursId conservé)`);
  }

  /**
   * 🧹 Nettoie sessionStorage
   */
  private static async cleanupSessionStorage(): Promise<void> {
    console.log('🧹 [LogoutCleanupService] Nettoyage sessionStorage...');

    try {
      sessionStorage.clear();
      console.log('✅ sessionStorage vidé');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage sessionStorage:', error);
    }
  }

  /**
   * 🧹 Nettoie IndexedDB
   */
  private static async cleanupIndexedDB(): Promise<void> {
    console.log('🧹 [LogoutCleanupService] Nettoyage IndexedDB...');

    try {
      // Utiliser checkSessionManager pour nettoyer les sessions
      await checkSessionManager.clearAllSessions();
      console.log('✅ Toutes les sessions IndexedDB supprimées');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage IndexedDB:', error);
    }
  }

  /**
   * 🧹 Nettoie les managers en mémoire
   */
  private static async cleanupManagers(): Promise<void> {
    console.log('🧹 [LogoutCleanupService] Nettoyage des managers...');

    try {
      // Réinitialiser parcoursManager
      parcoursManager.clearParcours();
      console.log('✅ ParcoursManager réinitialisé');

      // Réinitialiser dataLoadingOrchestrator
      dataLoadingOrchestrator.clearCache();
      console.log('✅ DataLoadingOrchestrator réinitialisé');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage managers:', error);
    }
  }

  /**
   * 🧹 Alias pour clearAllData (pour compatibilité)
   */
  static async cleanup(): Promise<void> {
    return this.cleanupAllData();
  }
}

export const logoutCleanupService = LogoutCleanupService;


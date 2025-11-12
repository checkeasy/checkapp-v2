/**
 * 🧭 NAVIGATION STATE MANAGER
 * 
 * Service central qui détermine la navigation correcte basée sur l'état de session.
 * 
 * Responsabilités :
 * - Déterminer la route correcte pour une session donnée
 * - Valider qu'une route est accessible
 * - Fournir la route de redirection si nécessaire
 * - Gérer les cas spéciaux (session terminée, checkin complété, etc.)
 * 
 * Principe : L'état de session (IndexedDB) est la source de vérité pour la navigation
 */

import { CheckSession } from './checkSessionManager';

class NavigationStateManager {
  /**
   * Détermine la route correcte pour une session donnée
   * @param session - Session depuis IndexedDB
   * @returns Route correcte (ex: '/checkout', '/checkin-home')
   */
  getCorrectRouteForSession(session: CheckSession): string {
    // 🏁 PRIORITÉ 1 : Session terminée
    if (session.status === 'terminated') {
      return '/checkout-home';
    }
    
    // 🏁 PRIORITÉ 2 : Session complétée (checkin)
    if (session.status === 'completed' && session.flowType === 'checkin') {
      return '/checkin-home';
    }
    
    // 🏁 PRIORITÉ 3 : Session active
    if (session.status === 'active') {
      if (session.flowType === 'checkin') {
        // Vérifier si toutes les tâches sont complétées
        if (session.isFlowCompleted) {
          return '/checkin-home';
        }
        return '/checkin';
      }

      if (session.flowType === 'checkout') {
        // 🆕 PRIORITÉ 3.1 : Vérifier si état initial doit être fait
        // Critère : takePicture === 'checkInAndCheckOut' ET etatInitialCompleted === false/undefined
        const needsEtatInitial = session.parcoursInfo?.takePicture === 'checkInAndCheckOut';
        const etatInitialDone = session.progress.etatInitialCompleted === true;

        if (needsEtatInitial && !etatInitialDone) {
          console.log('🎯 NavigationStateManager: Redirection vers /etat-initial (état initial non complété)');
          return '/etat-initial';
        }

        // 🆕 PRIORITÉ 3.2 : Vérifier si exit questions complétées
        if (session.progress.exitQuestionsCompleted) {
          return '/checkout-home';
        }

        // 🆕 PRIORITÉ 3.3 : Vérifier si toutes les tâches sont complétées
        if (session.isFlowCompleted) {
          return '/exit-questions';
        }

        // 🆕 PRIORITÉ 3.4 : Sinon, continuer le checkout
        return '/checkout';
      }
    }
    
    // 🏁 FALLBACK : Rediriger vers welcome
    console.warn('⚠️ État de session non reconnu, redirection vers /welcome', session);
    return '/welcome';
  }

  /**
   * Vérifie si une route est accessible pour une session donnée
   * @param currentPath - Route actuelle (ex: '/checkout')
   * @param session - Session depuis IndexedDB
   * @returns true si accessible, false sinon
   */
  isRouteAllowed(currentPath: string, session: CheckSession): boolean {
    // Routes toujours autorisées (pages publiques ou de navigation)
    const alwaysAllowed = ['/welcome', '/', '/signalements-a-traiter', '/signalements-historique'];
    if (alwaysAllowed.includes(currentPath)) {
      return true;
    }
    
    // Session terminée : seul /checkout-home est autorisé
    if (session.status === 'terminated') {
      return currentPath === '/checkout-home';
    }
    
    // Session complétée (checkin) : seul /checkin-home est autorisé
    if (session.status === 'completed' && session.flowType === 'checkin') {
      return currentPath === '/checkin-home';
    }
    
    // Session active : vérifier selon flowType
    if (session.status === 'active') {
      if (session.flowType === 'checkin') {
        const allowedRoutes = ['/checkin', '/checkin-home', '/etat-initial'];
        return allowedRoutes.includes(currentPath);
      }

      if (session.flowType === 'checkout') {
        // Routes autorisées pour une session checkout
        // Note: /checkin-home n'est PAS autorisé car c'est une page pour les voyageurs (checkin)
        // Pour les parcours "Ménage avec état initial", utiliser /etat-initial
        const allowedRoutes = ['/checkout', '/checkout-home', '/etat-initial', '/exit-questions'];
        return allowedRoutes.includes(currentPath);
      }
    }
    
    // Par défaut, route non autorisée
    return false;
  }

  /**
   * Détermine si une redirection est nécessaire
   * @param currentPath - Route actuelle
   * @param session - Session depuis IndexedDB
   * @returns true si redirection nécessaire
   */
  shouldRedirect(currentPath: string, session: CheckSession): boolean {
    return !this.isRouteAllowed(currentPath, session);
  }

  /**
   * Fournit la route de redirection
   * @param currentPath - Route actuelle
   * @param session - Session depuis IndexedDB
   * @returns Route de redirection ou null si pas de redirection
   */
  getRedirectTarget(currentPath: string, session: CheckSession): string | null {
    if (!this.shouldRedirect(currentPath, session)) {
      return null;
    }
    
    return this.getCorrectRouteForSession(session);
  }

  /**
   * Construit une URL complète avec paramètres
   * @param path - Chemin (ex: '/checkout')
   * @param parcoursId - ID du parcours
   * @param checkId - ID de la session
   * @returns URL complète (ex: '/checkout?parcours=XXX&checkid=YYY')
   */
  buildUrl(path: string, parcoursId: string, checkId: string): string {
    const params = new URLSearchParams();
    params.set('parcours', parcoursId);
    params.set('checkid', checkId);
    return `${path}?${params.toString()}`;
  }

  /**
   * Extrait les paramètres de l'URL
   * @param search - URLSearchParams ou string (ex: '?parcours=XXX&checkid=YYY')
   * @returns Objet avec parcoursId et checkId
   */
  extractUrlParams(search: URLSearchParams | string): { parcoursId: string | null; checkId: string | null } {
    const params = typeof search === 'string' ? new URLSearchParams(search) : search;
    return {
      parcoursId: params.get('parcours'),
      checkId: params.get('checkid'),
    };
  }

  /**
   * Valide que les paramètres URL sont présents et valides
   * @param parcoursId - ID du parcours
   * @param checkId - ID de la session
   * @returns true si valides
   */
  areUrlParamsValid(parcoursId: string | null, checkId: string | null): boolean {
    return Boolean(parcoursId && checkId);
  }

  /**
   * Détermine si une route nécessite des paramètres URL
   * @param path - Route (ex: '/checkout')
   * @returns true si paramètres requis
   */
  requiresUrlParams(path: string): boolean {
    const publicRoutes = ['/welcome'];
    return !publicRoutes.includes(path);
  }

  /**
   * Logs de debug pour la navigation
   * @param message - Message à logger
   * @param data - Données additionnelles
   */
  logNavigation(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`🧭 [NavigationStateManager] ${timestamp} - ${message}`, data || '');
  }

  /**
   * Détermine si une session est dans un état final (terminée ou annulée)
   * @param session - Session à vérifier
   * @returns true si état final
   */
  isSessionInFinalState(session: CheckSession): boolean {
    return session.status === 'terminated' || session.status === 'cancelled';
  }

  /**
   * Détermine si une session peut être modifiée
   * @param session - Session à vérifier
   * @returns true si modifiable
   */
  isSessionModifiable(session: CheckSession): boolean {
    return session.status === 'active';
  }

  /**
   * Détermine la prochaine étape logique pour une session
   * @param session - Session actuelle
   * @returns Description de la prochaine étape
   */
  getNextStep(session: CheckSession): string {
    if (session.status === 'terminated') {
      return 'Session terminée - Consulter le rapport';
    }
    
    if (session.status === 'completed' && session.flowType === 'checkin') {
      return 'Checkin terminé - Démarrer le checkout';
    }
    
    if (session.status === 'active') {
      if (session.flowType === 'checkin') {
        if (session.isFlowCompleted) {
          return 'Checkin terminé - Voir le récapitulatif';
        }
        return 'Continuer le checkin';
      }
      
      if (session.flowType === 'checkout') {
        if (session.progress.exitQuestionsCompleted) {
          return 'Checkout terminé - Voir le récapitulatif';
        }
        if (session.isFlowCompleted) {
          return 'Répondre aux questions de sortie';
        }
        return 'Continuer le checkout';
      }
    }
    
    return 'État inconnu';
  }

  /**
   * Vérifie si une transition de flow est nécessaire (checkin → checkout)
   * @param session - Session actuelle
   * @returns true si transition nécessaire
   */
  needsFlowTransition(session: CheckSession): boolean {
    return session.status === 'completed' && session.flowType === 'checkin';
  }

  /**
   * Détermine le type de parcours basé sur la configuration
   * @param parcoursType - Type de parcours depuis l'API
   * @returns Type de flow à utiliser
   */
  determineFlowTypeFromParcours(parcoursType: string): 'checkin' | 'checkout' {
    const lowerType = parcoursType.toLowerCase();
    
    // Parcours avec checkin
    if (lowerType.includes('voyage') || lowerType.includes('checkin')) {
      return 'checkin';
    }
    
    // Parcours checkout only (ménage)
    return 'checkout';
  }
}

// Export singleton
export const navigationStateManager = new NavigationStateManager();
export default navigationStateManager;


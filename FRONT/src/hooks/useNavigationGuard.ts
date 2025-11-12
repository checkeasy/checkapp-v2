/**
 * 🎣 useNavigationGuard Hook
 * 
 * Hook pour vérifier et rediriger si la route n'est pas autorisée.
 * 
 * Utilise le NavigationStateManager pour déterminer si la route actuelle
 * est autorisée pour la session donnée. Si non, redirige automatiquement
 * vers la route correcte.
 * 
 * @param session - Session actuelle (depuis IndexedDB)
 * @param loading - Indicateur de chargement
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navigationStateManager } from '@/services/navigationStateManager';
import { useNavigateWithParams } from './useNavigateWithParams';
import { CheckSession } from '@/services/checkSessionManager';

export function useNavigationGuard(session: CheckSession | null, loading: boolean) {
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (loading) {
      console.log('🛡️ [NavigationGuard] Chargement en cours, attente...');
      return;
    }

    // Si pas de session, pas de guard (sauf pour les routes protégées)
    if (!session) {
      console.log('🛡️ [NavigationGuard] Pas de session, pas de guard');
      return;
    }

    const currentPath = location.pathname;

    // Vérifier si la route est autorisée
    const isAllowed = navigationStateManager.isRouteAllowed(currentPath, session);

    if (!isAllowed) {
      // Déterminer la route de redirection
      const redirectTarget = navigationStateManager.getRedirectTarget(currentPath, session);

      if (redirectTarget) {
        console.log(
          `🚫 [NavigationGuard] Route ${currentPath} non autorisée pour session ${session.checkId}`,
          {
            status: session.status,
            flowType: session.flowType,
            isFlowCompleted: session.isFlowCompleted,
            redirectTarget,
          }
        );

        // Rediriger vers la route correcte
        navigateWithParams(redirectTarget, { replace: true });
      }
    } else {
      console.log(`✅ [NavigationGuard] Route ${currentPath} autorisée pour session ${session.checkId}`);
    }
  }, [session, loading, location.pathname, navigateWithParams]);
}


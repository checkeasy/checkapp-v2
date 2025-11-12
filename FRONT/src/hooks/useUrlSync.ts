/**
 * 🎣 useUrlSync Hook
 * 
 * Hook pour synchroniser l'URL avec IndexedDB (bidirectionnel).
 * 
 * Responsabilités :
 * - URL → IndexedDB : Activer le checkId depuis l'URL
 * - IndexedDB → URL : Ajouter le checkId à l'URL si manquant
 * 
 * @param activeCheckId - CheckId actif depuis le contexte
 * @param setActiveCheckId - Fonction pour activer un checkId
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationStateManager } from '@/services/navigationStateManager';

interface UseUrlSyncProps {
  activeCheckId: string | null;
  setActiveCheckId: (checkId: string) => void;
}

export function useUrlSync({ activeCheckId, setActiveCheckId }: UseUrlSyncProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { parcoursId, checkId } = navigationStateManager.extractUrlParams(location.search);

    // Cas 1 : Pas de checkId dans l'URL mais on a un checkId actif
    // → Ajouter le checkId à l'URL
    if (!checkId && activeCheckId && parcoursId) {
      const newUrl = navigationStateManager.buildUrl(location.pathname, parcoursId, activeCheckId);
      console.log(`🔄 [useUrlSync] Ajout checkId à l'URL: ${newUrl}`);
      navigate(newUrl, { replace: true });
      return;
    }

    // Cas 2 : CheckId dans l'URL différent du checkId actif
    // → Activer le checkId de l'URL
    if (checkId && checkId !== activeCheckId) {
      console.log(`🔄 [useUrlSync] Activation checkId depuis URL: ${checkId}`);
      setActiveCheckId(checkId);
    }

    // Cas 3 : Route nécessite des paramètres mais ils sont absents
    // → Rediriger vers /welcome
    if (navigationStateManager.requiresUrlParams(location.pathname)) {
      if (!navigationStateManager.areUrlParamsValid(parcoursId, checkId)) {
        console.warn(
          `⚠️ [useUrlSync] Paramètres URL manquants sur ${location.pathname}, redirection vers /welcome`
        );
        navigate('/welcome', { replace: true });
      }
    }
  }, [location.search, location.pathname, activeCheckId, setActiveCheckId, navigate]);
}


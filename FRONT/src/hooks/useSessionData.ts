/**
 * 🎣 useSessionData Hook
 * 
 * Hook unifié pour charger et synchroniser la session depuis IndexedDB.
 * 
 * Utilise le DataLoadingOrchestrator pour éviter les chargements multiples.
 * 
 * @param checkId - ID de la session à charger
 * @returns { session, loading, error, reload }
 */

import { useState, useEffect } from 'react';
import { dataLoadingOrchestrator } from '@/services/dataLoadingOrchestrator';
import { CheckSession } from '@/services/checkSessionManager';

export function useSessionData(checkId: string | null) {
  const [session, setSession] = useState<CheckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour recharger la session
  const reload = async () => {
    if (!checkId) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sessionData = await dataLoadingOrchestrator.loadSessionData(checkId);
      setSession(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkId) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await dataLoadingOrchestrator.loadSessionData(checkId);

        if (!cancelled) {
          setSession(sessionData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [checkId]);

  return { session, loading, error, reload };
}


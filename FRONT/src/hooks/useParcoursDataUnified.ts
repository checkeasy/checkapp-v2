/**
 * 🎣 useParcoursDataUnified Hook
 * 
 * Hook unifié pour charger et synchroniser le parcours (API ou cache).
 * 
 * Utilise le DataLoadingOrchestrator pour éviter les chargements multiples.
 * Gère automatiquement le cache avec une stratégie de 24h.
 * 
 * @param parcoursId - ID du parcours à charger
 * @param forceFlowType - Force un type de flow spécifique ('checkin' | 'checkout')
 * @returns { parcours, loading, error, reload }
 */

import { useState, useEffect } from 'react';
import { dataLoadingOrchestrator } from '@/services/dataLoadingOrchestrator';
import { ParcoursData } from '@/services/parcoursManager';

export function useParcoursDataUnified(
  parcoursId: string | null,
  forceFlowType?: 'checkin' | 'checkout'
) {
  const [parcours, setParcours] = useState<ParcoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour recharger le parcours
  const reload = async () => {
    if (!parcoursId) {
      setParcours(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parcoursData = await dataLoadingOrchestrator.loadParcoursData(
        parcoursId,
        forceFlowType
      );
      setParcours(parcoursData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setParcours(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!parcoursId) {
      setParcours(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadParcours() {
      try {
        setLoading(true);
        setError(null);

        const parcoursData = await dataLoadingOrchestrator.loadParcoursData(
          parcoursId,
          forceFlowType
        );

        if (!cancelled) {
          setParcours(parcoursData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
          setParcours(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadParcours();

    return () => {
      cancelled = true;
    };
  }, [parcoursId, forceFlowType]);

  return { parcours, loading, error, reload };
}


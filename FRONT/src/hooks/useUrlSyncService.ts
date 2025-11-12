/**
 * 🔄 useUrlSyncService Hook
 * 
 * Hook React pour utiliser le service de synchronisation URL.
 * 
 * Fonctionnalités :
 * - Démarre/arrête automatiquement la synchronisation
 * - S'abonne aux changements de paramètres URL
 * - Fournit des méthodes pour synchroniser manuellement
 */

import { useEffect, useState, useCallback } from 'react';
import { urlSyncService } from '@/services/urlSyncService';

interface UrlParams {
  parcoursId: string | null;
  checkId: string | null;
}

interface UseUrlSyncServiceOptions {
  /**
   * Démarre automatiquement la synchronisation au montage
   * @default true
   */
  autoStart?: boolean;

  /**
   * Callback appelé lors des changements de paramètres URL
   */
  onChange?: (params: UrlParams) => void;
}

interface UseUrlSyncServiceReturn {
  /**
   * Paramètres URL actuels
   */
  params: UrlParams;

  /**
   * Démarre la synchronisation
   */
  start: () => void;

  /**
   * Arrête la synchronisation
   */
  stop: () => void;

  /**
   * Force la synchronisation URL → IndexedDB
   */
  forceSync: () => Promise<void>;

  /**
   * Synchronise IndexedDB → URL
   */
  syncToUrl: (parcoursId: string, checkId: string) => Promise<void>;

  /**
   * Vérifie la cohérence entre URL et IndexedDB
   */
  checkConsistency: () => Promise<{
    isConsistent: boolean;
    urlParams: UrlParams;
    indexedDBParams: UrlParams;
  }>;

  /**
   * Nettoie les paramètres URL et IndexedDB
   */
  clear: () => Promise<void>;

  /**
   * Statut du service
   */
  status: {
    isEnabled: boolean;
    lastKnownUrl: string;
    subscribersCount: number;
  };
}

/**
 * Hook pour utiliser le service de synchronisation URL
 */
export const useUrlSyncService = (
  options: UseUrlSyncServiceOptions = {}
): UseUrlSyncServiceReturn => {
  const { autoStart = true, onChange } = options;

  const [params, setParams] = useState<UrlParams>(() => 
    urlSyncService.getCurrentParams()
  );

  const [status, setStatus] = useState(() => {
    const s = urlSyncService.getStatus();
    return {
      isEnabled: s.isEnabled,
      lastKnownUrl: s.lastKnownUrl,
      subscribersCount: s.subscribersCount
    };
  });

  // Démarrer la synchronisation
  const start = useCallback(() => {
    urlSyncService.start();
    setStatus(prev => ({ ...prev, isEnabled: true }));
  }, []);

  // Arrêter la synchronisation
  const stop = useCallback(() => {
    urlSyncService.stop();
    setStatus(prev => ({ ...prev, isEnabled: false }));
  }, []);

  // Forcer la synchronisation
  const forceSync = useCallback(async () => {
    await urlSyncService.forceSync();
  }, []);

  // Synchroniser vers l'URL
  const syncToUrl = useCallback(async (parcoursId: string, checkId: string) => {
    await urlSyncService.syncIndexedDBToUrl(parcoursId, checkId);
  }, []);

  // Vérifier la cohérence
  const checkConsistency = useCallback(async () => {
    return await urlSyncService.checkConsistency();
  }, []);

  // Nettoyer
  const clear = useCallback(async () => {
    await urlSyncService.clear();
  }, []);

  // S'abonner aux changements
  useEffect(() => {
    const unsubscribe = urlSyncService.subscribe((newParams) => {
      console.log('🔄 [useUrlSyncService] Paramètres URL changés:', newParams);
      setParams(newParams);

      // Appeler le callback onChange si fourni
      if (onChange) {
        onChange(newParams);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onChange]);

  // Démarrer/arrêter automatiquement
  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      if (autoStart) {
        stop();
      }
    };
  }, [autoStart, start, stop]);

  // Mettre à jour le statut périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      const s = urlSyncService.getStatus();
      setStatus({
        isEnabled: s.isEnabled,
        lastKnownUrl: s.lastKnownUrl,
        subscribersCount: s.subscribersCount
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    params,
    start,
    stop,
    forceSync,
    syncToUrl,
    checkConsistency,
    clear,
    status
  };
};

/**
 * Hook simplifié pour obtenir uniquement les paramètres URL
 */
export const useUrlParams = (): UrlParams => {
  const { params } = useUrlSyncService({ autoStart: true });
  return params;
};

/**
 * Hook pour synchroniser automatiquement un checkId avec l'URL
 */
export const useAutoSyncCheckId = (checkId: string | null, parcoursId: string | null) => {
  const { syncToUrl } = useUrlSyncService({ autoStart: true });

  useEffect(() => {
    if (checkId && parcoursId) {
      syncToUrl(parcoursId, checkId);
    }
  }, [checkId, parcoursId, syncToUrl]);
};

/**
 * Hook pour vérifier la cohérence URL/IndexedDB au montage
 */
export const useUrlConsistencyCheck = () => {
  const { checkConsistency } = useUrlSyncService({ autoStart: true });
  const [consistency, setConsistency] = useState<{
    isConsistent: boolean;
    urlParams: UrlParams;
    indexedDBParams: UrlParams;
  } | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await checkConsistency();
      setConsistency(result);

      if (!result.isConsistent) {
        console.warn('⚠️ [useUrlConsistencyCheck] Incohérence détectée:', result);
      }
    };

    check();
  }, [checkConsistency]);

  return consistency;
};


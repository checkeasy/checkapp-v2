import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { parcoursManager, ParcoursData } from '@/services/parcoursManager';
import { parcoursCache } from '@/services/parcoursCache';
import { Room, Task, FlowType } from '@/types/room';
import { Signalement } from '@/types/signalement';

/**
 * 🎯 GlobalParcoursContext
 *
 * Context React qui fournit les données de parcours à l'application
 * S'abonne au ParcoursManager et gère le state React
 */

interface ParcoursInfo {
  id: string;
  name: string;
  type: string;
  logement: string;
  takePicture: string;
}

interface ParcoursStats {
  totalRooms: number;
  totalTasks: number;
  totalPhotos: number;
  flowType: FlowType;
}

interface GlobalParcoursContextType {
  // État
  currentParcours: ParcoursData | null;
  loading: boolean;
  error: string | null;

  // Données dérivées
  parcoursInfo: ParcoursInfo | null;
  rooms: (Room & { tasks: Task[] })[];
  stats: ParcoursStats;
  apiSignalements: Signalement[];  // ✅ NOUVEAU - Signalements de l'API

  // Actions
  loadParcours: (parcoursId: string, forceFlowType?: FlowType) => Promise<void>;
  clearParcours: () => void;
  refreshParcours: () => void;
  forceCheckoutMode: () => void;
  forceCheckinMode: () => void;
  getApiSignalementsByRoom: (roomId: string) => Signalement[];  // ✅ NOUVEAU
}

const GlobalParcoursContext = createContext<GlobalParcoursContextType | undefined>(undefined);

export const GlobalParcoursProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentParcours, setCurrentParcours] = useState<ParcoursData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // S'abonner aux changements du ParcoursManager
  useEffect(() => {
    console.log('🔄 GlobalParcoursContext: Abonnement au ParcoursManager');
    
    const unsubscribe = parcoursManager.subscribe((parcours) => {
      console.log('📢 GlobalParcoursContext: Notification de changement:', parcours?.id);
      setCurrentParcours(parcours);
    });

    // Charger le parcours actuel si disponible
    const current = parcoursManager.getCurrentParcours();
    if (current) {
      setCurrentParcours(current);
    }

    return () => {
      console.log('🔄 GlobalParcoursContext: Désabonnement du ParcoursManager');
      unsubscribe();
    };
  }, []);

  /**
   * Charge un parcours (avec cache)
   */
  const loadParcours = useCallback(async (parcoursId: string, forceFlowType?: FlowType) => {
    console.log('🔄 GlobalParcoursContext: Chargement du parcours:', parcoursId);
    setLoading(true);
    setError(null);

    try {
      // 🎯 DEBUG: Vérifier si on doit forcer le rechargement (pour debug)
      const forceReload = new URLSearchParams(window.location.search).get('forceReload') === 'true';

      if (forceReload) {
        console.log('🔄 FORCE RELOAD activé - Suppression du cache');
        await parcoursCache.clearCache(parcoursId);
      }

      // 1. Vérifier le cache d'abord
      const isCacheValid = await parcoursCache.isCacheValid(parcoursId, 24);

      if (isCacheValid && !forceReload) {
        console.log('✅ Utilisation du cache');
        const cachedData = await parcoursCache.getParcours(parcoursId);
        if (cachedData) {
          console.log('📦 Données du cache:', {
            hasPiece: !!cachedData.piece,
            pieceCount: cachedData.piece?.length || 0,
            firstPiece: cachedData.piece?.[0] ? {
              nom: cachedData.piece[0].nom,
              hasTravelerNote: !!cachedData.piece[0].travelerNote,
              hasCleanerNote: !!cachedData.piece[0].cleanerNote
            } : null
          });
          parcoursManager.loadFromRawDataWithMode(cachedData, forceFlowType);
          setLoading(false);
          return;
        }
      }

      // 2. Sinon, charger depuis l'API
      console.log('🌐 Chargement depuis l\'API');
      const parcours = await parcoursManager.loadParcours(parcoursId, forceFlowType);
      
      // 3. Sauvegarder dans le cache
      await parcoursCache.saveParcours(
        parcoursId,
        parcours.rawData,
        {
          name: parcours.adaptedData.parcoursInfo.name,
          type: parcours.adaptedData.parcoursInfo.type,
          roomsCount: Object.keys(parcours.adaptedData.roomsData).length
        }
      );

      setLoading(false);
    } catch (err) {
      console.error('❌ Erreur chargement parcours:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setLoading(false);
    }
  }, []);

  /**
   * Réinitialise le parcours
   */
  const clearParcours = useCallback(() => {
    console.log('🗑️ GlobalParcoursContext: Réinitialisation du parcours');
    parcoursManager.clearParcours();
    setError(null);
  }, []);

  /**
   * Rafraîchit le parcours actuel
   */
  const refreshParcours = useCallback(() => {
    if (currentParcours) {
      console.log('🔄 GlobalParcoursContext: Rafraîchissement du parcours');
      loadParcours(currentParcours.id, currentParcours.adaptedData.flowType);
    }
  }, [currentParcours, loadParcours]);

  /**
   * Force le mode checkout
   */
  const forceCheckoutMode = useCallback(() => {
    const current = parcoursManager.getCurrentParcours();
    if (current) {
      console.log('🔄 GlobalParcoursContext: Forçage du mode checkout');
      parcoursManager.loadFromRawDataWithMode(current.rawData, 'checkout');
    }
  }, []);

  /**
   * Force le mode checkin
   */
  const forceCheckinMode = useCallback(() => {
    const current = parcoursManager.getCurrentParcours();
    if (current) {
      console.log('🔄 GlobalParcoursContext: Forçage du mode checkin');
      parcoursManager.loadFromRawDataWithMode(current.rawData, 'checkin');
    }
  }, []);

  /**
   * ✅ NOUVEAU - Récupère les signalements API pour une pièce spécifique
   */
  const getApiSignalementsByRoom = useCallback((roomId: string): Signalement[] => {
    if (!currentParcours?.adaptedData.apiSignalements) {
      return [];
    }
    return currentParcours.adaptedData.apiSignalements.filter(sig => sig.roomId === roomId);
  }, [currentParcours]);

  // Calculer les données dérivées
  const parcoursInfo = currentParcours?.adaptedData.parcoursInfo || null;
  const rooms = currentParcours ? Object.values(currentParcours.adaptedData.roomsData) : [];
  const stats = parcoursManager.getCurrentStats();
  const apiSignalements = currentParcours?.adaptedData.apiSignalements || [];

  const contextValue: GlobalParcoursContextType = {
    currentParcours,
    loading,
    error,
    parcoursInfo,
    rooms,
    stats,
    apiSignalements,
    loadParcours,
    clearParcours,
    refreshParcours,
    forceCheckoutMode,
    forceCheckinMode,
    getApiSignalementsByRoom
  };

  return (
    <GlobalParcoursContext.Provider value={contextValue}>
      {children}
    </GlobalParcoursContext.Provider>
  );
};

/**
 * Hook principal pour accéder au contexte
 */
export const useGlobalParcours = (): GlobalParcoursContextType => {
  const context = useContext(GlobalParcoursContext);
  if (!context) {
    throw new Error('useGlobalParcours must be used within a GlobalParcoursProvider');
  }
  return context;
};

/**
 * Hook pour accéder uniquement aux données (sans actions)
 */
export const useParcoursData = () => {
  const { currentParcours, parcoursInfo, rooms, stats, loading, error, forceCheckoutMode, forceCheckinMode } = useGlobalParcours();

  return {
    currentParcours,
    info: parcoursInfo,
    rooms,
    stats,
    isLoaded: !!currentParcours,
    loading,
    error,
    forceCheckoutMode,
    forceCheckinMode
  };
};

/**
 * Hook pour accéder uniquement aux actions
 */
export const useParcoursActions = () => {
  const { loadParcours, clearParcours, refreshParcours } = useGlobalParcours();
  
  return {
    loadParcours,
    clearParcours,
    refreshParcours
  };
};


import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { FlowType } from '@/types/room';
import { checkSessionManager, CheckSession as IDBCheckSession } from '@/services/checkSessionManager';
import { environment } from '@/config/environment';
import { navigationStateManager } from '@/services/navigationStateManager';

/**
 * 🎯 ActiveCheckIdContext
 * 
 * Gère le CheckID actif pour la session utilisateur
 * Un CheckID est un identifiant unique pour chaque parcours utilisateur
 * 
 * ✅ MIGRÉ vers IndexedDB via checkSessionManager
 */

interface UserInfo {
  firstName: string;
  lastName: string;
  phone: string;
  phoneIndex?: string; // 🌍 Indicatif international (ex: "+33", "+41", etc.)
  type: string;
}

interface ParcoursInfo {
  id: string;
  name: string;
  type: string;
  logement: string;
  takePicture: string;
  checkinDate?: string | null;
  checkoutDate?: string | null;
}

interface CheckSession {
  checkId: string;
  userId: string;
  userInfo: UserInfo;
  parcoursId: string;
  parcoursInfo: ParcoursInfo;
  flowType: FlowType;
  status: 'active' | 'completed' | 'cancelled';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  progress?: Record<string, unknown>;
}

interface ActiveCheckIdContextType {
  currentCheckId: string | null;
  isCheckIdActive: boolean;
  createNewCheckId: (userInfo: UserInfo, parcoursInfo: ParcoursInfo, flowType: FlowType) => Promise<string>;
  setActiveCheckId: (checkId: string | null) => Promise<void>; // ✅ Maintenant async
  getCheckSession: (checkId: string) => Promise<CheckSession | null>;
  completeCheckId: () => Promise<void>;
  clearCheckId: () => Promise<void>; // 🎯 FIX: Maintenant async pour compléter l'ancienne session
}

const ActiveCheckIdContext = createContext<ActiveCheckIdContextType | undefined>(undefined);

const STORAGE_KEY_ACTIVE = 'activeCheckId';
// ⚠️ DEPRECATED: Utilise maintenant IndexedDB via checkSessionManager
// const STORAGE_KEY_SESSIONS = 'checkSessionData';

export const ActiveCheckIdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCheckId, setCurrentCheckId] = useState<string | null>(() => {
    // 🎯 FIX CRITIQUE: Charger le CheckID UNIQUEMENT depuis l'URL
    // Ne JAMAIS utiliser localStorage pour éviter la contamination entre parcours
    try {
      // 🆕 REFACTORISÉ: Utiliser navigationStateManager pour extraire les paramètres
      const urlParams = navigationStateManager.extractUrlParams(window.location.search);
      const fromUrl = urlParams.checkId;
      const urlParcoursId = urlParams.parcoursId;

      if (fromUrl) {
        console.log('📖 CheckID chargé depuis URL:', fromUrl);
        // Sauvegarder dans localStorage UNIQUEMENT pour référence
        localStorage.setItem(STORAGE_KEY_ACTIVE, fromUrl);
        return fromUrl;
      }

      // 🎯 IMPORTANT: Si on a un parcoursId dans l'URL mais PAS de checkId,
      // cela signifie qu'on démarre un NOUVEAU parcours
      // Ne PAS charger un ancien checkId depuis localStorage !
      if (urlParcoursId) {
        console.log('🆕 Nouveau parcours détecté (parcoursId sans checkId)');
        console.log('⚠️ Ne PAS charger ancien checkId depuis localStorage');
        // Nettoyer l'ancien checkId pour éviter toute confusion
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
        return null;
      }

      // Seulement si AUCUN paramètre dans l'URL, essayer localStorage
      // (cas de navigation interne sans paramètres)
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (stored) {
        console.log('📖 CheckID chargé depuis localStorage (navigation interne):', stored);
        return stored;
      }

      console.log('⚠️ Aucun CheckID trouvé');
      return null;
    } catch (error) {
      console.error('❌ Erreur chargement CheckID:', error);
      return null;
    }
  });

  const isCheckIdActive = currentCheckId !== null;

  /**
   * 🔄 Convertit une session IDB vers format CheckSession
   */
  const convertIDBSessionToCheckSession = (idbSession: IDBCheckSession): CheckSession => {
    return {
      checkId: idbSession.checkId,
      userId: idbSession.userId,
      userInfo: {
        firstName: idbSession.userInfo?.firstName || '',
        lastName: idbSession.userInfo?.lastName || '',
        phone: idbSession.userInfo?.phone || idbSession.userId,
        phoneIndex: idbSession.userInfo?.phoneIndex, // 🌍 NOUVEAU: Indicatif international
        type: (idbSession.userInfo?.type as any) || 'AGENT'
      },
      parcoursId: idbSession.parcoursId,
      parcoursInfo: {
        id: idbSession.parcoursId,
        name: idbSession.parcoursInfo?.name || '',
        type: idbSession.parcoursInfo?.type || '',
        logement: '',
        takePicture: idbSession.parcoursInfo?.takePicture || ''
      },
      flowType: idbSession.flowType,
      status: idbSession.status,
      isFlowCompleted: idbSession.isFlowCompleted,
      createdAt: idbSession.createdAt,
      lastActiveAt: idbSession.lastActiveAt,
      completedAt: idbSession.completedAt,
      progress: idbSession.progress
    };
  };

  /**
   * 🧹 Efface le CheckID actif et prépare pour un nouveau parcours
   * 🎯 FIX CRITIQUE: Marque l'ancienne session comme complétée avant de nettoyer
   * 🎯 FIX URGENT: Nettoie aussi les photos uploadées de localStorage
   */
  const clearCheckId = useCallback(async () => {
    console.log('🧹 Nettoyage de l\'ancien CheckID:', currentCheckId);

    // Marquer l'ancienne session comme complétée si elle existe
    if (currentCheckId) {
      try {
        await checkSessionManager.completeCheckSession(currentCheckId);
        console.log('✅ Ancienne session marquée comme complétée:', currentCheckId);
      } catch (error) {
        console.error('❌ Erreur lors de la complétion de l\'ancienne session:', error);
        // Continue quand même le nettoyage
      }
    }

    // 🎯 FIX URGENT: Nettoyer TOUTES les photos uploadées de localStorage
    const photoKeys = Object.keys(localStorage).filter(key => key.startsWith('uploaded_image_'));
    let photosCleared = 0;

    photoKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        photosCleared++;
      } catch (error) {
        console.error('❌ Erreur suppression photo localStorage:', key, error);
      }
    });

    if (photosCleared > 0) {
      console.log(`🧹 ${photosCleared} photos nettoyées de localStorage`);
    }

    // Nettoyer l'état et le stockage
    setCurrentCheckId(null);
    localStorage.removeItem(STORAGE_KEY_ACTIVE);

    console.log('✅ CheckID nettoyé, prêt pour un nouveau parcours');
  }, [currentCheckId]);

  /**
   * 🆕 Envoie les données de création du check à Bubble
   */
  const sendCheckCreationToBubble = async (
    checkId: string,
    parcoursId: string,
    flowType: FlowType,
    userInfo: UserInfo,
    parcoursInfo: ParcoursInfo
  ) => {
    try {
      const apiUrl = environment.CREATE_CHECK_INITIALIZE_URL;

      const requestBody = {
        checkId,
        parcoursId,
        flowType,
        status: 'active',
        createdAt: new Date().toISOString(),
        firstname: userInfo.firstName,
        lastname: userInfo.lastName,
        phone: userInfo.phone,
        phoneIndex: userInfo.phoneIndex, // 🌍 NOUVEAU: Indicatif international
        checkinDate: parcoursInfo.checkinDate || null,
        checkoutDate: parcoursInfo.checkoutDate || null,
        parcoursInfo: {
          name: parcoursInfo.name,
          type: parcoursInfo.type
        }
      };

      console.log('🚀 ActiveCheckIdContext: Envoi création check à Bubble:', {
        url: apiUrl,
        checkId,
        parcoursId,
        flowType,
        checkinDate: parcoursInfo.checkinDate,
        checkoutDate: parcoursInfo.checkoutDate
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Essayer de lire le message d'erreur de Bubble
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ ActiveCheckIdContext: Réponse d\'erreur de Bubble:', errorData);
          errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
        } catch (e) {
          const errorText = await response.text();
          console.error('❌ ActiveCheckIdContext: Réponse d\'erreur (texte):', errorText);
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ ActiveCheckIdContext: Création check envoyée à Bubble avec succès:', result);
    } catch (error) {
      // Fire-and-forget: on log l'erreur mais on ne bloque pas la création du check
      console.error('❌ ActiveCheckIdContext: Erreur lors de l\'envoi de la création du check à Bubble:', error);
    }
  };

  /**
   * Crée un nouveau CheckID
   * ✅ MIGRÉ: Utilise maintenant IndexedDB via checkSessionManager
   * 🎯 FIX CRITIQUE: Nettoie l'ancienne session avant de créer une nouvelle
   */
  const createNewCheckId = useCallback(async (
    userInfo: UserInfo,
    parcoursInfo: ParcoursInfo,
    flowType: FlowType
  ): Promise<string> => {
    console.log('🆕 Création nouveau CheckID (IndexedDB):', { userInfo, parcoursInfo, flowType });

    // 🎯 FIX CRITIQUE: Nettoyer l'ancienne session d'abord
    await clearCheckId();
    console.log('✅ Ancienne session nettoyée, création d\'une nouvelle session');

    const userId = userInfo.phone; // Utiliser le téléphone comme ID utilisateur

    try {
      // ✅ Créer la session via checkSessionManager (IndexedDB)
      // 🎯 CORRECTION: Passer userInfo et parcoursInfo pour la reprise de session
      const idbSession = await checkSessionManager.createCheckSession(
        userId,
        parcoursInfo.id,
        flowType,
        {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          phone: userInfo.phone,
          phoneIndex: userInfo.phoneIndex, // 🌍 NOUVEAU: Indicatif international
          type: userInfo.type
        },
        {
          name: parcoursInfo.name,
          type: parcoursInfo.type,
          takePicture: parcoursInfo.takePicture  // 🆕 Pour déterminer si état initial nécessaire
        }
      );

      const checkId = idbSession.checkId;

      // Définir comme CheckID actif
      setCurrentCheckId(checkId);
      localStorage.setItem(STORAGE_KEY_ACTIVE, checkId);

      console.log('✅ CheckID créé et activé (IndexedDB):', checkId);

      // 🆕 Envoyer les données de création à Bubble
      await sendCheckCreationToBubble(checkId, parcoursInfo.id, flowType, userInfo, parcoursInfo);

      return checkId;
    } catch (error) {
      console.error('❌ Erreur création CheckID:', error);
      throw error;
    }
  }, [clearCheckId]);

  /**
   * Définit le CheckID actif
   * ✅ MIGRÉ: Utilise IndexedDB via checkSessionManager
   */
  const setActiveCheckId = useCallback(async (checkId: string | null) => {
    console.log('🔄 Changement CheckID actif (IndexedDB):', checkId);
    setCurrentCheckId(checkId);
    
    if (checkId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, checkId);
      
      // Mettre à jour lastActiveAt dans IndexedDB
      try {
        const session = await checkSessionManager.getCheckSession(checkId);
        if (session) {
          await checkSessionManager.saveCheckSession({
            ...session,
            lastActiveAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Erreur mise à jour lastActiveAt:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  }, []);

  /**
   * Récupère une session CheckID
   * ✅ MIGRÉ: Utilise IndexedDB via checkSessionManager
   */
  const getCheckSession = useCallback(async (checkId: string): Promise<CheckSession | null> => {
    try {
      const idbSession = await checkSessionManager.getCheckSession(checkId);
      if (!idbSession) return null;
      
      return convertIDBSessionToCheckSession(idbSession);
    } catch (error) {
      console.error('❌ Erreur récupération session:', error);
      return null;
    }
  }, []);

  /**
   * Marque le CheckID actuel comme complété
   * ✅ MIGRÉ: Utilise IndexedDB via checkSessionManager
   */
  const completeCheckId = useCallback(async () => {
    if (!currentCheckId) {
      console.warn('⚠️ Aucun CheckID actif à compléter');
      return;
    }

    console.log('✅ Complétion du CheckID (IndexedDB):', currentCheckId);

    try {
      await checkSessionManager.completeCheckSession(currentCheckId);
    } catch (error) {
      console.error('❌ Erreur complétion CheckID:', error);
    }
  }, [currentCheckId]);

  // Mettre à jour lastActiveAt périodiquement dans IndexedDB
  useEffect(() => {
    if (!currentCheckId) return;

    const interval = setInterval(async () => {
      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session) {
          await checkSessionManager.saveCheckSession({
            ...session,
            lastActiveAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Erreur mise à jour périodique lastActiveAt:', error);
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [currentCheckId]);

  const contextValue: ActiveCheckIdContextType = {
    currentCheckId,
    isCheckIdActive,
    createNewCheckId,
    setActiveCheckId,
    getCheckSession,
    completeCheckId,
    clearCheckId
  };

  return (
    <ActiveCheckIdContext.Provider value={contextValue}>
      {children}
    </ActiveCheckIdContext.Provider>
  );
};

export const useActiveCheckId = (): ActiveCheckIdContextType => {
  const context = useContext(ActiveCheckIdContext);
  if (!context) {
    throw new Error('useActiveCheckId must be used within an ActiveCheckIdProvider');
  }
  return context;
};


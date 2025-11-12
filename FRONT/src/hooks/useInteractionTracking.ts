/**
 * 🎯 Hook pour connecter le suivi d'interactions aux composants UI
 * 
 * Fournit des méthodes simples pour :
 * - Enregistrer toutes les interactions utilisateur
 * - Récupérer l'état visuel des composants depuis CheckID
 * - Restaurer automatiquement les états d'interface
 */

import { useCallback, useEffect, useState } from 'react';
import { 
  interactionTracker,
  ButtonClickInteraction,
  PhotoInteraction, 
  CheckboxInteraction,
  SignalementInteraction,
  PieceStateInteraction
} from '@/services/interactionTracker';
import { useUser } from '@/contexts/UserContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
import { checkSessionManager } from '@/services/checkSessionManager';

export interface PieceVisualState {
  // État général de la pièce
  status: 'not_started' | 'in_progress' | 'completed' | 'validated' | 'issues_reported';
  completionPercentage: number;
  
  // Indicateurs visuels
  hasPhotos: boolean;
  photosCount: number;
  hasValidatedPhotos: boolean;
  
  hasCheckboxes: boolean;
  checkboxesCount: number;
  checkedCheckboxesCount: number;
  
  hasSignalements: boolean;
  signalementsCount: number;
  openSignalementsCount: number;
  
  // Détails pour l'affichage
  lastInteractionAt?: string;
  totalInteractions: number;
  
  // Données complètes si besoin
  photos?: PhotoInteraction[];
  checkboxes?: CheckboxInteraction[];
  signalements?: SignalementInteraction[];
}

export interface TaskVisualState {
  taskId: string;
  isCompleted: boolean;
  hasPhoto: boolean;
  photoValidated?: boolean;
  hasCheckbox: boolean;
  checkboxChecked?: boolean;
  hasSignalements: boolean;
  lastInteractionAt?: string;
}

export const useInteractionTracking = () => {
  const { user } = useUser();
  const { parcours } = useParcoursData();
  const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);
  const [pieceStates, setPieceStates] = useState<Record<string, PieceVisualState>>({});

  /**
   * 🔗 Initialisation et récupération du CheckID actuel
   */
  useEffect(() => {
    const initializeCheckId = async () => {
      if (!user || !parcours) return;

      try {
        const sessionCheck = await checkSessionManager.checkExistingSessions(
          user.phone,
          parcours.id
        );

        if (sessionCheck.hasExistingSession && sessionCheck.session) {
          const checkId = sessionCheck.session.checkId;
          setCurrentCheckId(checkId);
          interactionTracker.setCurrentCheckId(checkId);
          
          console.log('🔗 useInteractionTracking: CheckID initialisé:', checkId);
          
          // Charger les états visuels des pièces
          await loadAllPieceStates(checkId);
        }
      } catch (error) {
        console.error('❌ useInteractionTracking: Erreur initialisation CheckID:', error);
      }
    };

    initializeCheckId();
  }, [user, parcours]);

  /**
   * 📊 Charge les états visuels de toutes les pièces
   */
  const loadAllPieceStates = useCallback(async (checkId: string) => {
    try {
      const session = await checkSessionManager.getCheckSession(checkId);
      if (!session || !parcours?.adaptedData?.roomsData) return;

      const rooms = Object.values(parcours.adaptedData.roomsData);
      const newPieceStates: Record<string, PieceVisualState> = {};

      for (const room of rooms) {
        const pieceState = await getPieceVisualState(room.id);
        if (pieceState) {
          newPieceStates[room.id] = pieceState;
        }
      }

      setPieceStates(newPieceStates);
      console.log('📊 États des pièces chargés:', Object.keys(newPieceStates).length);
    } catch (error) {
      console.error('❌ Erreur chargement états pièces:', error);
    }
  }, [parcours]);

  /**
   * 🖱️ Enregistre un clic sur bouton
   */
  const trackButtonClick = useCallback(async (
    buttonId: string,
    pieceId: string,
    taskId?: string,
    etapeId?: string,  // 🎯 NOUVEAU: Paramètre etapeId
    actionType: ButtonClickInteraction['actionType'] = 'validate',
    metadata?: Record<string, unknown>
  ) => {
    await interactionTracker.trackButtonClick({
      buttonId,
      pieceId,
      taskId,
      etapeId,  // 🎯 NOUVEAU
      actionType,
      timestamp: new Date().toISOString(),
      metadata
    });

    // Rafraîchir l'état visuel de la pièce
    await refreshPieceVisualState(pieceId);
  }, []);

  /**
   * 📸 Enregistre une photo prise
   */
  const trackPhotoTaken = useCallback(async (
    taskId: string,
    pieceId: string,
    photoData: string,
    etapeId?: string,  // 🎯 NOUVEAU: Paramètre etapeId
    metadata?: PhotoInteraction['metadata']
  ) => {
    const photoId = interactionTracker.generatePhotoId();
    
    await interactionTracker.trackPhotoTaken({
      photoId,
      taskId,
      pieceId,
      etapeId,  // 🎯 NOUVEAU
      photoData,
      timestamp: new Date().toISOString(),
      validated: false,
      retakeCount: 0,
      metadata
    });

    await refreshPieceVisualState(pieceId);
  }, []);

  /**
   * ✅ Enregistre un changement de checkbox
   */
  const trackCheckboxChange = useCallback(async (
    checkboxId: string,
    taskId: string,
    pieceId: string,
    isChecked: boolean,
    notes?: string,
    etapeId?: string  // ✅ AJOUTÉ: Paramètre etapeId
  ) => {
    await interactionTracker.trackCheckboxChange({
      checkboxId,
      taskId,
      pieceId,
      etapeId: etapeId || taskId,  // ✅ AJOUTÉ: Utiliser etapeId ou taskId comme fallback
      isChecked,
      checkedAt: isChecked ? new Date().toISOString() : undefined,
      uncheckedAt: !isChecked ? new Date().toISOString() : undefined,
      notes
    });

    await refreshPieceVisualState(pieceId);
  }, []);

  /**
   * 🚨 Enregistre un signalement
   */
  const trackSignalement = useCallback(async (
    pieceId: string,
    taskId: string | undefined,
    type: SignalementInteraction['type'],
    severity: SignalementInteraction['severity'],
    title: string,
    description: string,
    photos: string[] = []
  ) => {
    const signalementId = interactionTracker.generateSignalementId();
    
    await interactionTracker.trackSignalement({
      signalementId,
      pieceId,
      taskId,
      type,
      severity,
      title,
      description,
      photos,
      createdAt: new Date().toISOString(),
      status: 'open'
    });

    await refreshPieceVisualState(pieceId);
  }, []);

  /**
   * 🏠 Met à jour le statut d'une pièce
   */
  const updatePieceStatus = useCallback(async (
    pieceId: string,
    status: PieceStateInteraction['status'],
    completionPercentage?: number
  ) => {
    await interactionTracker.trackPieceStateChange({
      pieceId,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      validatedAt: status === 'validated' ? new Date().toISOString() : undefined,
      completionPercentage: completionPercentage ?? 0,
      totalInteractions: 0, // Sera calculé par le tracker
      photosCount: 0,
      checkboxesCount: 0,
      signalementsCount: 0
    });

    await refreshPieceVisualState(pieceId);
  }, []);

  /**
   * 🧭 Enregistre la navigation
   */
  const trackNavigation = useCallback(async (
    fromPieceId: string | undefined,
    toPieceId: string,
    trigger: 'user_click' | 'auto_navigation' | 'completion' | 'back_button' = 'user_click'
  ) => {
    await interactionTracker.trackNavigation(fromPieceId, toPieceId, trigger);
  }, []);

  /**
   * 📊 Récupère l'état visuel d'une pièce
   */
  const getPieceVisualState = useCallback(async (pieceId: string): Promise<PieceVisualState | null> => {
    try {
      const interactionState = await interactionTracker.getPieceInteractionState(pieceId);
      if (!interactionState) {
        // État par défaut si pas d'interactions
        return {
          status: 'not_started',
          completionPercentage: 0,
          hasPhotos: false,
          photosCount: 0,
          hasValidatedPhotos: false,
          hasCheckboxes: false,
          checkboxesCount: 0,
          checkedCheckboxesCount: 0,
          hasSignalements: false,
          signalementsCount: 0,
          openSignalementsCount: 0,
          totalInteractions: 0
        };
      }

      const { pieceState, photos, checkboxes, signalements } = interactionState;
      
      return {
        status: pieceState?.status || 'not_started',
        completionPercentage: pieceState?.completionPercentage || 0,
        
        hasPhotos: photos.length > 0,
        photosCount: photos.length,
        hasValidatedPhotos: photos.some(p => p.validated),
        
        hasCheckboxes: checkboxes.length > 0,
        checkboxesCount: checkboxes.length,
        checkedCheckboxesCount: checkboxes.filter(c => c.isChecked).length,
        
        hasSignalements: signalements.length > 0,
        signalementsCount: signalements.length,
        openSignalementsCount: signalements.filter(s => s.status === 'open').length,
        
        totalInteractions: pieceState?.totalInteractions || 0,
        lastInteractionAt: pieceState?.completedAt || pieceState?.validatedAt,
        
        // Données complètes pour l'affichage détaillé
        photos,
        checkboxes,
        signalements
      };
    } catch (error) {
      console.error('❌ Erreur récupération état visuel pièce:', error);
      return null;
    }
  }, []);

  /**
   * 🔄 Rafraîchit l'état visuel d'une pièce
   */
  const refreshPieceVisualState = useCallback(async (pieceId: string) => {
    const newState = await getPieceVisualState(pieceId);
    if (newState) {
      setPieceStates(prev => ({
        ...prev,
        [pieceId]: newState
      }));
    }
  }, [getPieceVisualState]);

  /**
   * 🎯 Récupère l'état visuel d'une tâche spécifique
   */
  const getTaskVisualState = useCallback(async (
    taskId: string,
    pieceId: string
  ): Promise<TaskVisualState> => {
    const interactionState = await interactionTracker.getPieceInteractionState(pieceId);
    
    if (!interactionState) {
      return {
        taskId,
        isCompleted: false,
        hasPhoto: false,
        hasCheckbox: false,
        hasSignalements: false
      };
    }

    const { photos, checkboxes, signalements } = interactionState;
    
    const taskPhotos = photos.filter(p => p.taskId === taskId);
    const taskCheckboxes = checkboxes.filter(c => c.taskId === taskId);
    const taskSignalements = signalements.filter(s => s.taskId === taskId);

    return {
      taskId,
      isCompleted: taskCheckboxes.some(c => c.isChecked) || taskPhotos.some(p => p.validated),
      hasPhoto: taskPhotos.length > 0,
      photoValidated: taskPhotos.length > 0 ? taskPhotos[0].validated : undefined,
      hasCheckbox: taskCheckboxes.length > 0,
      checkboxChecked: taskCheckboxes.length > 0 ? taskCheckboxes[0].isChecked : undefined,
      hasSignalements: taskSignalements.length > 0,
      lastInteractionAt: taskPhotos[0]?.timestamp || taskCheckboxes[0]?.checkedAt
    };
  }, []);

  /**
   * 🧹 Utilitaires
   */
  const isTrackingEnabled = Boolean(currentCheckId);
  const getCurrentCheckId = () => currentCheckId;
  const getPieceStateFromCache = (pieceId: string) => pieceStates[pieceId];

  return {
    // Actions de tracking
    trackButtonClick,
    trackPhotoTaken,
    trackCheckboxChange,
    trackSignalement,
    trackNavigation,
    updatePieceStatus,
    
    // Récupération d'états
    getPieceVisualState,
    getTaskVisualState,
    refreshPieceVisualState,
    loadAllPieceStates,
    
    // États en cache
    pieceStates,
    getPieceStateFromCache,
    
    // Utilitaires
    isTrackingEnabled,
    getCurrentCheckId,
    
    // Générateurs d'IDs
    generatePhotoId: () => interactionTracker.generatePhotoId(),
    generateSignalementId: () => interactionTracker.generateSignalementId()
  };
};

export default useInteractionTracking;




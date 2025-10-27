/**
 * 🎯 Hook d'auto-sauvegarde pour CheckID
 * 
 * À chaque interaction (clic bouton, photo, checkbox), 
 * sauvegarde automatiquement dans le CheckID actuel
 */

import { useCallback } from 'react';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { interactionTracker } from '@/services/interactionTracker';

export const useAutoSaveCheckId = () => {
  const { currentCheckId, isCheckIdActive } = useActiveCheckId();

  /**
   * 🔘 Sauvegarde un clic de bouton (état correct/déplorable, etc.)
   */
  const saveButtonClick = useCallback(async (
    buttonId: string,
    pieceId: string,
    taskId?: string,
    actionType: 'validate' | 'complete' | 'correct' | 'deplorable' = 'validate',
    metadata?: Record<string, unknown>
  ) => {
    if (!isCheckIdActive) {
      console.warn('⚠️ useAutoSaveCheckId: Pas de CheckID actif, skip save button');
      return;
    }

    console.log('🔘 AutoSave: Bouton cliqué ->', {
      currentCheckId,
      buttonId,
      pieceId,
      taskId,
      actionType
    });

    try {
      // 🎯 CORRECTION: taskId EST DÉJÀ l'etapeID (depuis les corrections du DataAdapter)
      // Plus besoin d'appeler le mapper qui peut retourner un mauvais ID
      const realEtapeId = taskId || buttonId;

      await interactionTracker.trackButtonClick({
        buttonId,
        pieceId,
        taskId,
        etapeId: realEtapeId,  // ✅ taskId contient directement l'etapeID de l'API
        actionType,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          checkId: currentCheckId,
          autoSaved: true,
          etapeId: realEtapeId
        }
      });

      console.log('✅ AutoSave: Bouton sauvegardé dans CheckID');
    } catch (error) {
      console.error('❌ AutoSave: Erreur save bouton:', error);
    }
  }, [currentCheckId, isCheckIdActive]);

  /**
   * 📸 Sauvegarde une photo prise
   */
  const savePhotoTaken = useCallback(async (
    taskId: string,
    pieceId: string,
    photoData: string,
    metadata?: Record<string, unknown>
  ) => {
    console.log('%c📸 SAUVEGARDE PHOTO - DÉBUT', 
      'color: #ffffff; font-weight: bold; font-size: 16px; background: #8b5cf6; padding: 6px 12px;', {
      isCheckIdActive,
      currentCheckId: currentCheckId || 'MANQUANT',
      taskId,
      pieceId,
      photoDataLength: photoData?.length || 0,
      photoDataPreview: photoData?.substring(0, 50) || 'VIDE',
      metadata,
      timestamp: new Date().toLocaleString()
    });

    if (!isCheckIdActive) {
      console.error('%c❌ SAUVEGARDE PHOTO - ÉCHEC', 
        'color: #ffffff; font-weight: bold; background: #ef4444; padding: 4px 8px;', 
        'Pas de CheckID actif');
      return;
    }

    try {
      // 🎯 CORRECTION: taskId EST DÉJÀ l'etapeID (depuis les corrections du DataAdapter)
      const realEtapeId = taskId;
      const photoId = interactionTracker.generatePhotoId();

      console.log('📝 Préparation données photo:', {
        photoId,
        taskId,
        pieceId,
        etapeId: realEtapeId,
        photoDataSize: photoData.length,
        hasMetadata: !!metadata
      });

      await interactionTracker.trackPhotoTaken({
        photoId,
        taskId,
        pieceId,
        etapeId: realEtapeId,
        photoData,
        timestamp: new Date().toISOString(),
        validated: false,
        retakeCount: 0,
        metadata: {
          ...metadata,
          checkId: currentCheckId,
          autoSaved: true,
          etapeId: realEtapeId
        }
      });

      console.log('%c✅ SAUVEGARDE PHOTO - SUCCÈS', 
        'color: #ffffff; font-weight: bold; font-size: 14px; background: #10b981; padding: 4px 8px;', {
        photoId,
        checkId: currentCheckId,
        taskId,
        pieceId
      });

      // 🎯 VÉRIFICATION IMMÉDIATE: Vérifier que la photo est dans IndexedDB
      setTimeout(async () => {
        try {
          const { checkSessionManager } = await import('@/services/checkSessionManager');
          const session = await checkSessionManager.getCheckSession(currentCheckId!);
          const savedPhoto = session?.progress?.interactions?.photosTaken?.[photoId];
          
          console.log('%c🔍 VÉRIFICATION INDEXEDDB POST-SAUVEGARDE', 
            'color: #ffffff; font-weight: bold; background: #f59e0b; padding: 4px 8px;', {
            photoId,
            photoTrouvée: !!savedPhoto,
            totalPhotos: session?.progress?.interactions?.photosTaken ? Object.keys(session.progress.interactions.photosTaken).length : 0,
            photoData: savedPhoto ? {
              hasPhotoData: !!savedPhoto[0]?.photoData,
              dataLength: savedPhoto[0]?.photoData?.length || 0
            } : 'NON TROUVÉE'
          });
        } catch (error) {
          console.error('❌ Erreur vérification IndexedDB:', error);
        }
      }, 500);

    } catch (error) {
      console.error('%c❌ SAUVEGARDE PHOTO - ERREUR CRITIQUE', 
        'color: #ffffff; font-weight: bold; font-size: 16px; background: #dc2626; padding: 8px 16px;', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [currentCheckId, isCheckIdActive]);

  /**
   * ☑️ Sauvegarde un changement de checkbox
   */
  const saveCheckboxChange = useCallback(async (
    checkboxId: string,
    taskId: string,
    pieceId: string,
    isChecked: boolean,
    notes?: string
  ) => {
    if (!isCheckIdActive) {
      console.warn('⚠️ useAutoSaveCheckId: Pas de CheckID actif, skip save checkbox');
      return;
    }

    console.log('☑️ AutoSave: Checkbox changée ->', {
      currentCheckId,
      checkboxId,
      taskId,
      pieceId,
      isChecked
    });

    try {
      await interactionTracker.trackCheckboxChange({
        checkboxId,
        taskId,
        pieceId,
        isChecked,
        checkedAt: isChecked ? new Date().toISOString() : undefined,
        uncheckedAt: !isChecked ? new Date().toISOString() : undefined,
        notes
      });

      console.log('✅ AutoSave: Checkbox sauvegardée dans CheckID');
    } catch (error) {
      console.error('❌ AutoSave: Erreur save checkbox:', error);
    }
  }, [currentCheckId, isCheckIdActive]);

  /**
   * 🚨 Sauvegarde un signalement
   */
  const saveSignalement = useCallback(async (
    pieceId: string,
    taskId: string | undefined,
    type: 'damage' | 'missing' | 'issue' | 'note',
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    photos: string[] = []
  ) => {
    if (!isCheckIdActive) {
      console.warn('⚠️ useAutoSaveCheckId: Pas de CheckID actif, skip save signalement');
      return;
    }

    console.log('🚨 AutoSave: Signalement créé ->', {
      currentCheckId,
      pieceId,
      type,
      severity,
      title
    });

    try {
      await interactionTracker.trackSignalement({
        signalementId: interactionTracker.generateSignalementId(),
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

      console.log('✅ AutoSave: Signalement sauvegardé dans CheckID');
    } catch (error) {
      console.error('❌ AutoSave: Erreur save signalement:', error);
    }
  }, [currentCheckId, isCheckIdActive]);

  /**
   * 🧭 Sauvegarde la navigation entre pièces
   */
  const saveNavigation = useCallback(async (
    fromPieceId: string | undefined,
    toPieceId: string,
    trigger: 'user_click' | 'auto_navigation' | 'completion' | 'back_button' = 'user_click'
  ) => {
    if (!isCheckIdActive) {
      console.warn('⚠️ useAutoSaveCheckId: Pas de CheckID actif, skip save navigation');
      return;
    }

    console.log('🧭 AutoSave: Navigation ->', {
      currentCheckId,
      from: fromPieceId,
      to: toPieceId,
      trigger
    });

    try {
      await interactionTracker.trackNavigation(fromPieceId, toPieceId, trigger);
      console.log('✅ AutoSave: Navigation sauvegardée dans CheckID');
    } catch (error) {
      console.error('❌ AutoSave: Erreur save navigation:', error);
    }
  }, [currentCheckId, isCheckIdActive]);

  /**
   * 📊 Sauvegarde un changement d'état de pièce
   */
  const savePieceStatusChange = useCallback(async (
    pieceId: string,
    status: 'not_started' | 'in_progress' | 'completed' | 'validated' | 'issues_reported',
    completionPercentage?: number
  ) => {
    if (!isCheckIdActive) {
      console.warn('⚠️ useAutoSaveCheckId: Pas de CheckID actif, skip save piece status');
      return;
    }

    console.log('📊 AutoSave: État pièce changé ->', {
      currentCheckId,
      pieceId,
      status,
      completionPercentage
    });

    try {
      await interactionTracker.trackPieceStateChange({
        pieceId,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        validatedAt: status === 'validated' ? new Date().toISOString() : undefined,
        completionPercentage: completionPercentage ?? 0,
        totalInteractions: 0,
        photosCount: 0,
        checkboxesCount: 0,
        signalementsCount: 0
      });

      console.log('✅ AutoSave: État pièce sauvegardé dans CheckID');
    } catch (error) {
      console.error('❌ AutoSave: Erreur save état pièce:', error);
    }
  }, [currentCheckId, isCheckIdActive]);

  return {
    // État
    isCheckIdActive,
    currentCheckId,
    
    // Actions de sauvegarde
    saveButtonClick,        // 🔘 Pour "État correct", "Déplorable", etc.
    savePhotoTaken,         // 📸 Photos prises
    saveCheckboxChange,     // ☑️ Checkboxes cochées/décochées
    saveSignalement,        // 🚨 Signalements créés
    saveNavigation,         // 🧭 Navigation entre pièces
    savePieceStatusChange   // 📊 Changements d'état des pièces
  };
};

export default useAutoSaveCheckId;




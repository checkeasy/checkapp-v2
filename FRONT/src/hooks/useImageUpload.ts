/**
 * 🎯 Hook pour gérer l'upload automatique des images
 * Fournit une API simple pour déclencher les uploads et suivre leur statut
 */

import { useState, useEffect, useCallback } from 'react';
import { imageUploadService, UploadStatus, UploadRequest } from '@/services/imageUploadService';
import { CapturedPhoto } from '@/types/photoCapture';

export interface ImageUploadState {
  isUploading: boolean;
  uploadedUrl: string | null;
  syncStatus: 'not_synced' | 'syncing' | 'synced' | 'error';
  error: string | null;
  progress?: number;
}

export function useImageUpload(imageId?: string) {
  const [uploadStates, setUploadStates] = useState<Map<string, ImageUploadState>>(new Map());

  /**
   * 📤 Déclenche l'upload d'une photo capturée
   */
  const uploadCapturedPhoto = useCallback(async (
    capturedPhoto: CapturedPhoto,
    options?: {
      taskId?: string;
      etapeId?: string;  // ✅ AJOUTÉ
      flowType?: 'checkin' | 'checkout';  // ✅ AJOUTÉ
      checkId?: string;
    }
  ) => {
    const uploadRequest: UploadRequest = {
      id: capturedPhoto.id,
      imageData: capturedPhoto.dataUrl,
      originalBlob: capturedPhoto.blob,
      pieceId: capturedPhoto.pieceId,
      taskId: options?.taskId,
      etapeId: options?.etapeId,  // ✅ AJOUTÉ
      flowType: options?.flowType,  // ✅ AJOUTÉ
      referencePhotoId: capturedPhoto.referencePhotoId,
      metadata: {
        width: capturedPhoto.meta.width,
        height: capturedPhoto.meta.height,
        takenAt: capturedPhoto.takenAt,
        checkId: options?.checkId,
        flowType: options?.flowType  // ✅ AJOUTÉ dans metadata aussi
      }
    };

    // Initialiser l'état d'upload
    setUploadStates(prev => {
      const newStates = new Map(prev);
      newStates.set(capturedPhoto.id, {
        isUploading: true,
        uploadedUrl: null,
        syncStatus: 'syncing',
        error: null
      });
      return newStates;
    });

    // Démarrer l'upload
    await imageUploadService.queueUpload(uploadRequest);
    
    console.log('%c🚀 UPLOAD DÉCLENCHÉ !',
      'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px; border-radius: 4px;', {
      photoId: capturedPhoto.id,
      pieceId: capturedPhoto.pieceId,
      taskId: options?.taskId,
      etapeId: options?.etapeId,  // ✅ AJOUTÉ
      checkId: options?.checkId
    });
    
  }, []);

  /**
   * 🔍 Obtient l'état d'upload pour une image
   */
  const getUploadState = useCallback((imageId: string): ImageUploadState => {
    const state = uploadStates.get(imageId);
    if (state) return state;

    // Vérifier si l'image a déjà été uploadée (URL en local)
    const uploadedUrl = imageUploadService.getUploadedUrl(imageId);
    if (uploadedUrl) {
      return {
        isUploading: false,
        uploadedUrl,
        syncStatus: 'synced',
        error: null
      };
    }

    return {
      isUploading: false,
      uploadedUrl: null,
      syncStatus: 'not_synced',
      error: null
    };
  }, [uploadStates]);

  /**
   * 🔄 Force le re-upload d'une image
   */
  const retryUpload = useCallback(async (capturedPhoto: CapturedPhoto, options?: { taskId?: string; etapeId?: string; checkId?: string; }) => {
    console.log('🔄 Retry upload pour:', capturedPhoto.id);
    await uploadCapturedPhoto(capturedPhoto, options);
  }, [uploadCapturedPhoto]);

  /**
   * 🎯 Obtient l'URL à utiliser pour afficher l'image (uploadée si disponible, sinon locale)
   */
  const getDisplayUrl = useCallback((imageId: string, fallbackDataUrl: string): string => {
    console.log('🔍 getDisplayUrl: Recherche URL uploadée:', {
      imageId: imageId,  // ID COMPLET
      storageKey: `uploaded_image_${imageId}`,
      hasLocalStorageItem: !!localStorage.getItem(`uploaded_image_${imageId}`)
    });
    
    const uploadedUrl = imageUploadService.getUploadedUrl(imageId);
    
    console.log('%c🔍 getDisplayUrl DEBUG COMPLET', 
      'color: #ef4444; font-weight: bold; font-size: 14px;', {
      imageId: imageId,
      uploadedUrl: uploadedUrl || 'NULL',
      uploadedUrlLength: uploadedUrl?.length || 0,
      fallbackDataUrl: fallbackDataUrl || 'NULL',
      fallbackLength: fallbackDataUrl?.length || 0,
      willReturn: uploadedUrl ? 'UPLOADED_URL' : 'FALLBACK',
      finalResult: uploadedUrl || fallbackDataUrl
    });
    
    return uploadedUrl || fallbackDataUrl;
  }, []);

  /**
   * 📊 Obtient les statistiques globales d'upload
   */
  const getUploadStats = useCallback(() => {
    const states = Array.from(uploadStates.values());
    return {
      total: states.length,
      syncing: states.filter(s => s.syncStatus === 'syncing').length,
      synced: states.filter(s => s.syncStatus === 'synced').length,
      errors: states.filter(s => s.syncStatus === 'error').length,
      notSynced: states.filter(s => s.syncStatus === 'not_synced').length
    };
  }, [uploadStates]);

  // 👂 Écouter les changements de statut d'upload
  useEffect(() => {
    const unsubscribe = imageUploadService.onStatusChange((status: UploadStatus) => {
      setUploadStates(prev => {
        const newStates = new Map(prev);
        const currentState = newStates.get(status.requestId) || {
          isUploading: false,
          uploadedUrl: null,
          syncStatus: 'not_synced' as const,
          error: null
        };

        // Mettre à jour selon le nouveau statut
        switch (status.status) {
          case 'pending':
          case 'uploading':
            newStates.set(status.requestId, {
              ...currentState,
              isUploading: true,
              syncStatus: 'syncing',
              error: null,
              progress: status.progress
            });
            break;

          case 'success':
            newStates.set(status.requestId, {
              ...currentState,
              isUploading: false,
              uploadedUrl: status.uploadedUrl || null,
              syncStatus: 'synced',
              error: null
            });
            break;

          case 'error':
            newStates.set(status.requestId, {
              ...currentState,
              isUploading: false,
              syncStatus: 'error',
              error: status.error || 'Erreur inconnue'
            });
            break;

          case 'retrying':
            newStates.set(status.requestId, {
              ...currentState,
              isUploading: true,
              syncStatus: 'syncing',
              error: `Tentative ${status.attempts}/${3}...`
            });
            break;
        }

        return newStates;
      });
    });

    return unsubscribe;
  }, []);

  // Si un imageId spécifique est fourni, retourner son état
  if (imageId) {
    return {
      uploadState: getUploadState(imageId),
      uploadCapturedPhoto,
      retryUpload,
      getDisplayUrl,
      getUploadStats
    };
  }

  // Sinon retourner l'API complète
  return {
    uploadStates,
    uploadCapturedPhoto,
    getUploadState,
    retryUpload,
    getDisplayUrl,
    getUploadStats
  };
}


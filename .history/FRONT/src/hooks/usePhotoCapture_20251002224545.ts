import { useState, useCallback } from 'react';
import { CapturedPhoto, UsePhotoCaptureResult } from '@/types/photoCapture';
import { resizeImage, detectBrowser } from '@/utils/cameraPolyfills';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function usePhotoCapture(pieceId: string): UsePhotoCaptureResult {
  const [capturedPhotos, setCapturedPhotos] = useState<Map<string, CapturedPhoto>>(new Map());

  const capturePhoto = useCallback(async (
    video: HTMLVideoElement, 
    referenceId: string
  ): Promise<CapturedPhoto> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('📸 Début de capture pour référence:', referenceId);
        
        // Créer un canvas pour la capture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Impossible de créer le contexte canvas');
        }

        // Obtenir les dimensions réelles de la vidéo
        const videoWidth = video.videoWidth || 1920;
        const videoHeight = video.videoHeight || 1440;
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        console.log('📐 Dimensions capture:', { width: videoWidth, height: videoHeight });

        // Dessiner la frame vidéo sur le canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        // Convertir en blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Impossible de créer le blob'));
            return;
          }

          try {
            // Convertir en Data URL pour l'affichage
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;

              // ✅ CORRECTION CRITIQUE : Utiliser referenceId (qui est l'etapeID) comme ID de la photo
              // Au lieu de générer un ID aléatoire qui sera perdu
              const capturedPhoto: CapturedPhoto = {
                id: referenceId,  // ✅ UTILISER L'ETAPEID DIRECTEMENT !
                pieceId,
                referencePhotoId: referenceId,
                blob,
                dataUrl,
                takenAt: new Date().toISOString(),
                meta: {
                  width: videoWidth,
                  height: videoHeight
                }
              };

              console.log('✅ Photo capturée avec succès:', {
                id: capturedPhoto.id,
                etapeID: referenceId,  // ✅ AJOUTÉ pour debug
                size: blob.size,
                dimensions: `${videoWidth}x${videoHeight}`
              });

              // Sauvegarder dans le state
              setCapturedPhotos(prev => {
                const newMap = new Map(prev);
                newMap.set(referenceId, capturedPhoto);
                return newMap;
              });

              resolve(capturedPhoto);
            };

            reader.onerror = () => {
              reject(new Error('Erreur lors de la conversion en Data URL'));
            };

            reader.readAsDataURL(blob);
          } catch (error) {
            reject(error);
          }
        }, 'image/jpeg', 0.85); // Qualité JPEG à 85%
        
      } catch (error) {
        console.error('❌ Erreur lors de la capture:', error);
        reject(error);
      }
    });
  }, [pieceId]);

  const removePhoto = useCallback((referenceId: string) => {
    console.log('🗑️ Suppression photo pour référence:', referenceId);
    setCapturedPhotos(prev => {
      const newMap = new Map(prev);
      const photo = newMap.get(referenceId);
      
      if (photo) {
        // Libérer la mémoire du blob si possible
        if (photo.blob && 'stream' in photo.blob) {
          try {
            (photo.blob as any).stream().cancel();
          } catch (e) {
            // Ignore les erreurs de nettoyage
          }
        }
        
        newMap.delete(referenceId);
        console.log('✅ Photo supprimée');
      }
      
      return newMap;
    });
  }, []);

  const clearAllPhotos = useCallback(() => {
    console.log('🧹 Suppression de toutes les photos capturées');
    
    // Libérer la mémoire de tous les blobs
    capturedPhotos.forEach(photo => {
      if (photo.blob && 'stream' in photo.blob) {
        try {
          (photo.blob as any).stream().cancel();
        } catch (e) {
          // Ignore les erreurs de nettoyage
        }
      }
    });
    
    setCapturedPhotos(new Map());
    console.log('✅ Toutes les photos supprimées');
  }, [capturedPhotos]);

  const getCapturedPhotoForReference = useCallback((referenceId: string): CapturedPhoto | null => {
    return capturedPhotos.get(referenceId) || null;
  }, [capturedPhotos]);

  return {
    capturedPhotos,
    capturePhoto,
    removePhoto,
    clearAllPhotos,
    getCapturedPhotoForReference
  };
}



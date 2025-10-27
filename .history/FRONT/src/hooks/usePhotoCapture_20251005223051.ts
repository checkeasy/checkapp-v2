import { useState, useCallback } from 'react';
import { CapturedPhoto, UsePhotoCaptureResult } from '@/types/photoCapture';
import { resizeImage, detectBrowser, getDeviceOrientation } from '@/utils/cameraPolyfills';

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

        // 📱 Détecter le navigateur pour optimisations spécifiques
        const browser = detectBrowser();

        // Créer un canvas pour la capture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
          // ✅ Optimisation mémoire pour mobile
          alpha: false,
          willReadFrequently: false
        });

        if (!ctx) {
          throw new Error('Impossible de créer le contexte canvas');
        }

        // Obtenir les dimensions réelles de la vidéo
        const videoWidth = video.videoWidth || 1920;
        const videoHeight = video.videoHeight || 1440;

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        console.log('📐 Dimensions capture:', {
          width: videoWidth,
          height: videoHeight,
          browser: browser.isIOS ? 'iOS' : browser.isAndroid ? 'Android' : 'Desktop'
        });

        // ✅ FIX: Ne pas appliquer de transformation miroir
        // Le preview vidéo est mirrored pour l'UX (scaleX(-1) en CSS)
        // Mais la photo capturée doit être dans l'orientation réelle (non-mirrored)
        // Suppression de la transformation miroir iOS qui causait le bug

        // Dessiner la frame vidéo sur le canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        // ✅ Optimisation mémoire : Redimensionner si trop grand
        const maxWidth = 1920;
        const maxHeight = 1440;
        const optimizedCanvas = resizeImage(canvas, maxWidth, maxHeight);

        console.log('📏 Dimensions optimisées:', {
          original: `${videoWidth}x${videoHeight}`,
          optimized: `${optimizedCanvas.width}x${optimizedCanvas.height}`,
          reduction: Math.round((1 - (optimizedCanvas.width * optimizedCanvas.height) / (videoWidth * videoHeight)) * 100) + '%'
        });

        // Convertir en blob avec qualité adaptée au navigateur
        const quality = browser.isIOS ? 0.80 : 0.85; // iOS : qualité légèrement réduite pour performance

        optimizedCanvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Impossible de créer le blob'));
            return;
          }

          try {
            console.log('💾 Taille du blob:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

            // ✅ Vérification taille maximale (5MB pour éviter les problèmes de mémoire)
            if (blob.size > 5 * 1024 * 1024) {
              console.warn('⚠️ Image trop volumineuse, compression supplémentaire...');
              // Réduire encore la qualité si nécessaire
              optimizedCanvas.toBlob(async (compressedBlob) => {
                if (compressedBlob) {
                  blob = compressedBlob;
                  console.log('✅ Taille après compression:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
                }
              }, 'image/jpeg', 0.70);
            }

            // Convertir en Data URL pour l'affichage
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;

              // ✅ CORRECTION CRITIQUE : Utiliser referenceId (qui est l'etapeID) comme ID de la photo
              const capturedPhoto: CapturedPhoto = {
                id: referenceId,  // ✅ UTILISER L'ETAPEID DIRECTEMENT !
                pieceId,
                referencePhotoId: referenceId,
                blob,
                dataUrl,
                takenAt: new Date().toISOString(),
                meta: {
                  width: optimizedCanvas.width,
                  height: optimizedCanvas.height
                }
              };

              console.log('✅ Photo capturée avec succès:', {
                id: capturedPhoto.id,
                etapeID: referenceId,
                size: (blob.size / 1024).toFixed(2) + ' KB',
                dimensions: `${optimizedCanvas.width}x${optimizedCanvas.height}`
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
        }, 'image/jpeg', quality);

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



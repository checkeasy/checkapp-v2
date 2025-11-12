import { useState, useCallback } from 'react';
import { CapturedPhoto, UsePhotoCaptureResult } from '@/types/photoCapture';
import { resizeImage, detectBrowser, getDeviceOrientation } from '@/utils/cameraPolyfills';
import { environment } from '@/config/environment';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// 🔍 DÉTECTION DE FLOU : Fonction pour analyser la netteté de l'image (Laplacien 2D amélioré)
function detectBlur(canvas: HTMLCanvasElement): { isBlurry: boolean; blurScore: number; stats: any } {
  try {
    if (!environment.BLUR_DETECTION_ENABLED) {
      return { isBlurry: false, blurScore: 0, stats: { disabled: true } };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return { isBlurry: false, blurScore: 0, stats: { error: 'no_context' } };

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 🔧 Paramètres configurables
    const step = environment.BLUR_ANALYSIS_STEP;
    const margin = environment.BLUR_EDGE_MARGIN;
    const threshold = environment.BLUR_THRESHOLD;
    const minVariance = environment.BLUR_MIN_VARIANCE;

    // Convertir en niveaux de gris
    const grayData: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b; // Formule standard de luminance
      grayData.push(gray);
    }

    // 📊 Calculer le Laplacien 2D (convolution avec kernel)
    let laplacianSum = 0;
    let pixelCount = 0;
    let maxLaplacian = 0;

    // Kernel Laplacien 3x3 standard
    const kernel = [
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0]
    ];

    // Analyser la zone centrale (ignorer les bords)
    const startX = Math.floor(margin / step);
    const endX = Math.floor((width - margin) / step);
    const startY = Math.floor(margin / step);
    const endY = Math.floor((height - margin) / step);

    for (let y = startY; y < endY; y += step) {
      for (let x = startX; x < endX; x += step) {
        // Vérifier qu'on ne sort pas des limites
        if (y < 1 || y >= height - 1 || x < 1 || x >= width - 1) continue;

        let laplacian = 0;
        // Appliquer le kernel Laplacien
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            if (idx >= 0 && idx < grayData.length) {
              laplacian += grayData[idx] * kernel[ky + 1][kx + 1];
            }
          }
        }

        laplacian = Math.abs(laplacian);
        laplacianSum += laplacian * laplacian;
        maxLaplacian = Math.max(maxLaplacian, laplacian);
        pixelCount++;
      }
    }

    // 📊 Calculer le score de netteté
    const blurScore = pixelCount > 0 ? Math.sqrt(laplacianSum / pixelCount) : 0;

    // 🔧 Déterminer si l'image est floue
    // Une image nette a un score Laplacien élevé
    const isBlurry = blurScore < threshold && maxLaplacian < minVariance;

    // 📈 Statistiques détaillées
    const stats = {
      blurScore: parseFloat(blurScore.toFixed(2)),
      maxLaplacian: parseFloat(maxLaplacian.toFixed(2)),
      pixelCount,
      threshold,
      minVariance,
      isBlurry,
      confidence: Math.min(100, Math.max(0, (blurScore / threshold) * 100))
    };

    console.log('🔍 Analyse de flou améliorée:', stats);

    return { isBlurry, blurScore, stats };
  } catch (error) {
    console.warn('⚠️ Erreur lors de la détection de flou:', error);
    return { isBlurry: false, blurScore: 0, stats: { error: String(error) } };
  }
}

// 🔧 AMÉLIORATION QUALITÉ : Fonction pour appliquer sharpening, contraste et optimisation d'exposition
function applyImageEnhancements(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  try {
    // Récupérer les données d'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 📊 Analyser l'exposition (luminosité moyenne)
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // 🔧 Calculer le facteur d'ajustement d'exposition
    // Si trop sombre (< 80), augmenter ; si trop clair (> 200), diminuer
    let exposureAdjustment = 1;
    if (avgBrightness < 80) {
      exposureAdjustment = 1.15; // +15% de luminosité
    } else if (avgBrightness > 200) {
      exposureAdjustment = 0.95; // -5% de luminosité
    }

    // 🔧 Appliquer sharpening SUBTIL et MOINS de contraste
    const sharpenStrength = 0.7; // Sharpening augmenté mais subtil
    const contrastStrength = 1.05; // Contraste RÉDUIT (1.05 au lieu de 1.2)

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1️⃣ Appliquer l'ajustement d'exposition
      r = Math.min(255, r * exposureAdjustment);
      g = Math.min(255, g * exposureAdjustment);
      b = Math.min(255, b * exposureAdjustment);

      // 2️⃣ Appliquer le contraste LÉGER (augmente très peu les différences)
      const centerValue = 128;
      r = centerValue + (r - centerValue) * contrastStrength;
      g = centerValue + (g - centerValue) * contrastStrength;
      b = centerValue + (b - centerValue) * contrastStrength;

      // 3️⃣ Appliquer le sharpening SUBTIL (augmente les détails fins)
      // Technique de sharpening par augmentation de contraste local MODÉRÉE
      const sharpenFactor = 1 + (sharpenStrength * 0.3); // Réduire l'impact du sharpening
      r = Math.min(255, Math.max(0, r * sharpenFactor - (centerValue * sharpenStrength * 0.2)));
      g = Math.min(255, Math.max(0, g * sharpenFactor - (centerValue * sharpenStrength * 0.2)));
      b = Math.min(255, Math.max(0, b * sharpenFactor - (centerValue * sharpenStrength * 0.2)));

      // Clamp values
      data[i] = Math.round(Math.min(255, Math.max(0, r)));
      data[i + 1] = Math.round(Math.min(255, Math.max(0, g)));
      data[i + 2] = Math.round(Math.min(255, Math.max(0, b)));
    }

    // Remettre les données modifiées sur le canvas
    ctx.putImageData(imageData, 0, 0);

    console.log('✨ Améliorations appliquées:', {
      avgBrightness: avgBrightness.toFixed(1),
      exposureAdjustment: (exposureAdjustment * 100).toFixed(0) + '%',
      sharpenStrength,
      contrastStrength
    });
  } catch (error) {
    console.warn('⚠️ Erreur lors de l\'application des améliorations:', error);
  }
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

        // ✅ FIX ROTATION BUG: Détecter l'orientation de l'appareil
        const deviceOrientation = getDeviceOrientation();

        // Ajuster les dimensions du canvas selon l'orientation
        // Pour les rotations de 90° ou 270°, inverser largeur et hauteur
        const needsRotation = deviceOrientation === 90 || deviceOrientation === -90 || deviceOrientation === 270;

        if (needsRotation) {
          canvas.width = videoHeight;
          canvas.height = videoWidth;
        } else {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
        }

        console.log('📐 Dimensions capture:', {
          width: videoWidth,
          height: videoHeight,
          deviceOrientation,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          browser: browser.isIOS ? 'iOS' : browser.isAndroid ? 'Android' : 'Desktop'
        });

        // ✅ FIX MIRROR BUG: Ne pas appliquer de transformation miroir
        // Le preview vidéo est mirrored pour l'UX (scaleX(-1) en CSS)
        // Mais la photo capturée doit être dans l'orientation réelle (non-mirrored)

        // ✅ FIX ROTATION BUG: Appliquer la rotation selon l'orientation de l'appareil
        if (needsRotation) {
          // Centrer le point de rotation
          ctx.translate(canvas.width / 2, canvas.height / 2);

          // Appliquer la rotation
          if (deviceOrientation === 90 || deviceOrientation === -270) {
            ctx.rotate(90 * Math.PI / 180);
          } else if (deviceOrientation === -90 || deviceOrientation === 270) {
            ctx.rotate(-90 * Math.PI / 180);
          } else if (deviceOrientation === 180 || deviceOrientation === -180) {
            ctx.rotate(180 * Math.PI / 180);
          }

          // Repositionner pour dessiner
          ctx.translate(-videoWidth / 2, -videoHeight / 2);
        }

        // Dessiner la frame vidéo sur le canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        // ✅ Optimisation mémoire : Redimensionner si trop grand
        // 🔧 AUGMENTATION QUALITÉ : Résolution max augmentée pour meilleure analyse IA
        const maxWidth = 3840;  // 4K width
        const maxHeight = 2880; // 4K height
        const optimizedCanvas = resizeImage(canvas, maxWidth, maxHeight);

        console.log('📏 Dimensions optimisées:', {
          original: `${videoWidth}x${videoHeight}`,
          optimized: `${optimizedCanvas.width}x${optimizedCanvas.height}`,
          reduction: Math.round((1 - (optimizedCanvas.width * optimizedCanvas.height) / (videoWidth * videoHeight)) * 100) + '%'
        });

        // 🔍 DÉTECTION DE FLOU : Analyser la netteté avant d'améliorer
        const { isBlurry, blurScore, stats } = detectBlur(optimizedCanvas);

        // 🔧 AMÉLIORATION QUALITÉ : Appliquer sharpening et optimisation d'exposition
        applyImageEnhancements(ctx, optimizedCanvas);

        // Convertir en blob avec qualité adaptée au navigateur
        // 🔧 AUGMENTATION QUALITÉ : Qualité JPEG augmentée à 0.98 pour meilleure analyse IA
        const quality = 0.98; // Qualité maximale pour analyse IA

        optimizedCanvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Impossible de créer le blob'));
            return;
          }

          try {
            console.log('💾 Taille du blob:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

            // ✅ Vérification taille maximale (15MB pour accommoder la meilleure qualité)
            // 🔧 AUGMENTATION QUALITÉ : Limite augmentée pour photos haute qualité
            if (blob.size > 15 * 1024 * 1024) {
              console.warn('⚠️ Image trop volumineuse, compression supplémentaire...');
              // Réduire encore la qualité si nécessaire
              optimizedCanvas.toBlob(async (compressedBlob) => {
                if (compressedBlob) {
                  blob = compressedBlob;
                  console.log('✅ Taille après compression:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
                }
              }, 'image/jpeg', 0.90);  // 🔧 Qualité fallback augmentée à 90%
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
                  height: optimizedCanvas.height,
                  // 🔍 DÉTECTION DE FLOU : Ajouter les informations de netteté complètes
                  isBlurry,
                  blurScore: parseFloat(blurScore.toFixed(2)),
                  blurStats: stats && typeof stats === 'object' && 'maxLaplacian' in stats ? {
                    maxLaplacian: stats.maxLaplacian,
                    pixelCount: stats.pixelCount,
                    threshold: stats.threshold,
                    minVariance: stats.minVariance,
                    confidence: stats.confidence
                  } : undefined
                }
              };

              console.log('✅ Photo capturée avec succès:', {
                id: capturedPhoto.id,
                etapeID: referenceId,
                size: (blob.size / 1024).toFixed(2) + ' KB',
                dimensions: `${optimizedCanvas.width}x${optimizedCanvas.height}`,
                // 🔍 DÉTECTION DE FLOU : Afficher les stats détaillées
                ...(stats && {
                  '🔍 Blur Detection': {
                    isBlurry,
                    blurScore: parseFloat(blurScore.toFixed(2)),
                    confidence: `${stats.confidence?.toFixed(1) || 0}%`,
                    maxLaplacian: stats.maxLaplacian?.toFixed(2)
                  }
                })
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



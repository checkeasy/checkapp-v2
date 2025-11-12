import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, RotateCcw, Upload, CheckCircle2, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedCamera, requestCameraPermissions } from '@/hooks/useCamera';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { PhotoCaptureModalProps, CapturedPhoto } from '@/types/photoCapture';
import { useImageOrientation, useOrientation } from '@/hooks/useOrientation';
import { OrientationPrompt } from '@/components/OrientationPrompt';
import { LockOrientation } from '@/components/LockOrientation';
import useInteractionTracking from '@/hooks/useInteractionTracking';

export function PhotoCaptureModal({
  isOpen,
  onClose,
  referencePhotos,
  onPhotosCaptured,
  pieceName,
  pieceId,
  flowType  // ✅ AJOUTÉ: "checkin" ou "checkout"
}: PhotoCaptureModalProps) {
  const [currentRefIndex, setCurrentRefIndex] = useState(0);
  const [ghostOpacity, setGhostOpacity] = useState(0); // 🎨 Opacité par défaut à 0%, activé automatiquement
  const [isCapturing, setIsCapturing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPhoto, setComparisonPhoto] = useState<string | null>(null);
  const [comparisonReferencePhoto, setComparisonReferencePhoto] = useState<string | null>(null); // ✅ Photo de référence pour la comparaison
  const [comparisonReferenceId, setComparisonReferenceId] = useState<string | null>(null); // ✅ AJOUTÉ: tache_id de la photo en comparaison
  const [allPhotosCompleted, setAllPhotosCompleted] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false); // 🔍 Panneau de diagnostic
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // 🍎 État de lecture vidéo
  const [manualStream, setManualStream] = useState<MediaStream | null>(null); // 🎯 Stream manuel comme Welcome
  const [isDragging, setIsDragging] = useState(false); // 📁 État du drag & drop
  const [blurWarning, setBlurWarning] = useState<{ show: boolean; score: number }>({ show: false, score: 0 }); // 🔍 Avertissement flou discret

  const videoRef = useRef<HTMLVideoElement>(null);
  const ghostRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🎯 NOUVEAU : Stocker les photos capturées localement pour éviter les problèmes de state async
  const capturedPhotosRef = useRef<CapturedPhoto[]>([]);

  // 🆕 Hook pour verrouiller l'orientation en portrait
  const { lockOrientation, unlockOrientation } = useOrientation();

  // 🆕 Détection de l'orientation de la photo de référence actuelle
  const currentReferencePhoto = referencePhotos[currentRefIndex];
  // 🎯 CORRECTION: Ne passer l'URL que si elle existe (évite les erreurs de chargement d'image)
  const referenceOrientation = useImageOrientation(currentReferencePhoto?.url || undefined);

  // 🆕 Vérifier si la photo est en paysage
  const isLandscapePhoto = referenceOrientation === 'landscape';
  
  // 🔍 Debug: Log de l'orientation détectée
  useEffect(() => {
    if (currentReferencePhoto && referenceOrientation) {
      console.log('🖼️ Photo actuelle:', {
        url: currentReferencePhoto.url,
        orientation: referenceOrientation,
        isLandscape: isLandscapePhoto,
        willRotate: isLandscapePhoto ? 'OUI (-90deg)' : 'NON'
      });
    }
  }, [currentReferencePhoto, referenceOrientation, isLandscapePhoto]);

  const { 
    stream, 
    error: cameraError, 
    isLoading, 
    startCamera, 
    stopCamera,
    availableCameras,
    selectedCameraId,
    switchCamera,
    refreshCameras,
    diagnosticLogs,
    clearDiagnosticLogs
  } = useEnhancedCamera();
  const { capturedPhotos, capturePhoto, removePhoto, getCapturedPhotoForReference } = usePhotoCapture(pieceId);
  const { uploadCapturedPhoto } = useImageUpload();
  const { currentCheckId } = useActiveCheckId();
  const { trackButtonClick } = useInteractionTracking();

  // 🎯 FONCTION EXACTE DE WELCOME.TSX - Démarrer le stream manuellement
  const startCameraManual = async () => {
    try {
      // 🎯 Détecter iOS
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      
      // Sur iOS, on essaie d'abord SANS contraintes de dimensions
      let constraints: MediaStreamConstraints;
      if (isIOS) {
        constraints = {
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        };
      } else {
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 }
          },
          audio: false
        };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Connecter au video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Attendre que les métadonnées soient chargées
        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve();
            return;
          }
          
          videoRef.current.onloadedmetadata = () => resolve();
          videoRef.current.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        });
        
        // Forcer le play
        await videoRef.current.play();
      }
      
      setManualStream(stream);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Erreur caméra: ${errorMessage}`);
    }
  };

  // 🎯 Démarrage automatique sur mobile
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isOpen && isMobile && !manualStream) {
      // Démarrage automatique après un petit délai
      const timer = setTimeout(() => {
        startCameraManual();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, manualStream, startCameraManual]);

  // 🎯 CORRECTION: Mettre à jour les URLs des photos après upload
  useEffect(() => {
    const updatePhotoUrls = () => {
      const { uploadCapturedPhoto } = require('@/hooks/useImageUpload');
      const imageUploadService = require('@/services/imageUploadService').imageUploadService;

      setCapturedPhotos(prevPhotos => {
        const updatedPhotos = new Map(prevPhotos);
        let hasUpdates = false;

        for (const [refId, photo] of updatedPhotos.entries()) {
          const uploadedUrl = imageUploadService.getUploadedUrl(photo.id);

          // Mise à jour seulement si une nouvelle URL est disponible
          if (uploadedUrl && uploadedUrl !== photo.dataUrl) {
            console.log('🔄 Mise à jour URL photo:', {
              photoId: photo.id,
              oldUrl: photo.dataUrl?.substring(0, 50),
              newUrl: uploadedUrl.substring(0, 50)
            });
            hasUpdates = true;
            updatedPhotos.set(refId, { ...photo, dataUrl: uploadedUrl });
          }
        }

        return hasUpdates ? updatedPhotos : prevPhotos;
      });
    };

    // Vérifier les URLs toutes les 500ms
    const interval = setInterval(updatePhotoUrls, 500);
    return () => clearInterval(interval);
  }, []);

  // 🎯 Cleanup du stream manuel à la fermeture
  useEffect(() => {
    if (!isOpen && manualStream) {
      manualStream.getTracks().forEach(track => track.stop());
      setManualStream(null);
    }
  }, [isOpen, manualStream]);

  // 📁 Drag & Drop handlers (desktop uniquement)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    
    if (!imageFile) {
      alert('Veuillez déposer un fichier image');
      return;
    }

    // Convertir en base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      // Capturer la photo avec l'image droppée
      const currentRef = referencePhotos[currentRefIndex];
      if (currentRef && currentCheckId) {
        await capturePhoto({
          base64Image: base64,
          tacheId: currentRef.tache_id,
          checkId: currentCheckId,
          flowType,
          pieceId
        });
      }
    };
    reader.readAsDataURL(imageFile);
  }, [currentRefIndex, referencePhotos, currentCheckId, flowType, pieceId, capturePhoto]);

  // 📁 Handler pour sélection de fichier
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }

    // Convertir en base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      // Capturer la photo avec l'image sélectionnée
      const currentRef = referencePhotos[currentRefIndex];
      if (currentRef && currentCheckId) {
        await capturePhoto({
          base64Image: base64,
          tacheId: currentRef.tache_id,
          checkId: currentCheckId,
          flowType,
          pieceId
        });
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input pour permettre de sélectionner le même fichier
    e.target.value = '';
  }, [currentRefIndex, referencePhotos, currentCheckId, flowType, pieceId, capturePhoto]);

  // 📁 Ouvrir le sélecteur de fichier
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ❌ SUPPRIMÉ : L'ancien useEffect qui utilisait le stream du hook
  // Maintenant on utilise manualStream avec connexion directe dans startCameraManual()

  // 🎨 Activer automatiquement le calque fantôme quand la caméra démarre (seulement si pas déjà activé)
  useEffect(() => {
    if (manualStream && referencePhotos.length > 0 && ghostOpacity === 0) {
      console.log('👻 Activation automatique du calque fantôme (opacité 30%)');
      setGhostOpacity(0.3);
    }
  }, [manualStream, referencePhotos.length]);

  // Mettre à jour l'image fantôme quand la référence change
  useEffect(() => {
    if (ghostRef.current && referencePhotos[currentRefIndex] && !showComparison && manualStream) {
      const currentRef = referencePhotos[currentRefIndex];
      console.log('👻 Mise à jour image fantôme:', currentRef.url);
      ghostRef.current.src = currentRef.url;
      
      // Forcer le chargement de l'image
      ghostRef.current.onload = () => {
        console.log('✅ Image fantôme chargée');
      };
      ghostRef.current.onerror = () => {
        console.error('❌ Erreur chargement image fantôme:', currentRef.url);
      };
    }
  }, [currentRefIndex, referencePhotos, showComparison, manualStream]);

  // Charger la première image au démarrage du modal ET activer l'opacité
  useEffect(() => {
    if (isOpen && referencePhotos.length > 0 && manualStream) {
      // Petit délai pour s'assurer que le ref est bien monté
      setTimeout(() => {
        if (ghostRef.current) {
          const firstRef = referencePhotos[0];
          console.log('🎬 Chargement initial de l\'image fantôme:', firstRef.url);
          ghostRef.current.src = firstRef.url;

          // Forcer le chargement avec onload
          ghostRef.current.onload = () => {
            console.log('✅ Première image fantôme chargée avec succès');
            // ✅ Activer automatiquement l'opacité après chargement
            // 🎯 CORRECTION: Afficher l'image fantôme avec une opacité visible (0.5 au lieu de 0.3)
            setGhostOpacity(0.5);
            console.log('👻 Activation automatique de l\'opacité du calque: 0.5');
          };

          ghostRef.current.onerror = () => {
            console.error('❌ Erreur chargement première image fantôme:', firstRef.url);
          };
        } else {
          console.warn('⚠️ ghostRef.current est null - l\'élément n\'est pas encore dans le DOM');
        }
      }, 100);
    }
  }, [isOpen, referencePhotos, manualStream]);

  // Réinitialiser les états quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Réinitialisation du modal pour nouvelle session');
      setAllPhotosCompleted(false);
      setShowComparison(false);
      setComparisonPhoto(null);
      setComparisonReferencePhoto(null); // ✅ Réinitialiser la photo de référence
      setComparisonReferenceId(null); // ✅ AJOUTÉ: Réinitialiser le tache_id
      setCurrentRefIndex(0);
      capturedPhotosRef.current = []; // 🎯 Réinitialiser le ref local
    } else {
      // Réinitialiser l'opacité quand le modal se ferme
      setGhostOpacity(0);
      capturedPhotosRef.current = []; // 🎯 Réinitialiser aussi à la fermeture
    }
  }, [isOpen]);

  // 🔒 Verrouiller l'orientation en mode portrait quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      console.log('🔒 Verrouillage de l\'orientation en mode portrait');
      lockOrientation('portrait').catch((error) => {
        console.warn('⚠️ Impossible de verrouiller l\'orientation:', error);
        // L'erreur est normale si le navigateur ne supporte pas l'API ou si l'app n'est pas en plein écran
      });
    } else {
      console.log('🔓 Déverrouillage de l\'orientation');
      unlockOrientation().catch((error) => {
        console.warn('⚠️ Impossible de déverrouiller l\'orientation:', error);
      });
    }
  }, [isOpen, lockOrientation, unlockOrientation]);

  const findNextUncompletedPhotoIndex = useCallback(() => {
    // Chercher la prochaine photo non capturée en commençant par l'index suivant
    for (let i = currentRefIndex + 1; i < referencePhotos.length; i++) {
      const ref = referencePhotos[i];
      if (!getCapturedPhotoForReference(ref.tache_id)) {
        return i;
      }
    }
    
    // Si aucune trouvée après l'index actuel, chercher depuis le début
    for (let i = 0; i < currentRefIndex; i++) {
      const ref = referencePhotos[i];
      if (!getCapturedPhotoForReference(ref.tache_id)) {
        return i;
      }
    }
    
    return -1; // Toutes les photos sont prises
  }, [currentRefIndex, referencePhotos, getCapturedPhotoForReference]);

  const handleClose = useCallback(() => {
    console.log('🚪 Fermeture modal avec photos capturées:', {
      fromState: capturedPhotos.size,
      fromRef: capturedPhotosRef.current.length
    });
    
    // Réinitialiser l'état de completion
    setAllPhotosCompleted(false);
    
    // 🎯 Utiliser le ref local au lieu du state
    const photosArray = capturedPhotosRef.current;
    onPhotosCaptured(photosArray);
    
    // Réinitialiser le ref
    capturedPhotosRef.current = [];
    
    onClose();
  }, [onClose, onPhotosCaptured, capturedPhotos]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || isCapturing) return;

    const currentRef = referencePhotos[currentRefIndex];

    // 🎯 CORRECTION: Permettre la capture même sans photo de référence
    // Si pas de référence, utiliser un ID générique
    const referenceId = currentRef?.tache_id || `no_ref_${Date.now()}`;

    setIsCapturing(true);

    try {
      console.log('📸 Capture en cours...', {
        currentRefIndex,
        tache_id: referenceId,
        hasReference: !!currentRef,
        etapeID: currentRef?.etapeID,
        flowType: flowType || 'unknown',
        isTodo: currentRef?.isTodo,
        todoTitle: currentRef?.todoTitle
      });

      const capturedPhoto = await capturePhoto(videoRef.current, referenceId);

      if (!capturedPhoto) {
        console.error('❌ Aucune photo capturée !');
        return;
      }

      // 🔍 DÉTECTION DE FLOU : Vérifier si la photo est floue
      if (capturedPhoto.meta?.isBlurry) {
        setBlurWarning({ show: true, score: capturedPhoto.meta.blurScore || 0 });
        // Masquer l'avertissement après 3 secondes
        setTimeout(() => {
          setBlurWarning({ show: false, score: 0 });
        }, 3000);
      }

      // 🎯 CRITIQUE : Ajouter la photo dans le ref local immédiatement
      capturedPhotosRef.current.push(capturedPhoto);
      console.log('✅ Photo capturée et ajoutée au ref local:', {
        id: capturedPhoto.id,
        referenceId: capturedPhoto.referencePhotoId,
        totalInRef: capturedPhotosRef.current.length,
        // 🔍 DÉTECTION DE FLOU : Afficher l'info de flou
        ...(capturedPhoto.meta?.isBlurry && {
          '⚠️ FLOU DÉTECTÉ': `Score: ${capturedPhoto.meta.blurScore}`
        })
      });

      // 🚀 NOUVEAU: Upload automatique de la photo
      console.log('📤 Déclenchement upload automatique...', {
        photoId: capturedPhoto.id,
        taskId: referenceId,
        etapeID: currentRef?.etapeID,
        flowType: flowType || 'unknown',
        isTodo: currentRef?.isTodo,
        todoTitle: currentRef?.todoTitle,
        hasReference: !!currentRef
      });

      await uploadCapturedPhoto(capturedPhoto, {
        taskId: referenceId,
        etapeId: currentRef?.etapeID,
        flowType: flowType,
        checkId: currentCheckId || undefined,
        metadata: {
          isTodo: currentRef?.isTodo || false,
          todoTitle: currentRef?.todoTitle || '',
          hasReference: !!currentRef
        }
      });
      
      // Effet visuel de capture
      if (videoRef.current) {
        videoRef.current.style.filter = 'brightness(1.5)';
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.filter = 'none';
          }
        }, 200);
      }

      console.log('✅ Upload terminé');
      
      // 🔍 Vérifier combien de photos ont été capturées EN COMPTANT CELLE-CI
      const totalPhotos = referencePhotos.length;

      // 🎯 NOUVELLE APPROCHE : Créer un Set des photos capturées incluant celle-ci
      const capturedPhotoIds = new Set<string>();

      // Ajouter toutes les photos déjà capturées
      capturedPhotos.forEach((photo, refId) => {
        capturedPhotoIds.add(refId);
      });

      // Ajouter la photo qu'on vient de capturer
      // 🎯 CORRECTION: Utiliser referenceId au lieu de currentRef.tache_id (qui peut être undefined)
      capturedPhotoIds.add(referenceId);
      
      const capturedCount = capturedPhotoIds.size;
      
      console.log(`📊 État après capture:`, {
        total: totalPhotos,
        captured: capturedCount,
        remaining: totalPhotos - capturedCount,
        allCompleted: capturedCount >= totalPhotos,
        capturedPhotoIds: Array.from(capturedPhotoIds)
      });
      
      // 🎯 Si TOUTES les photos sont capturées → Fermeture automatique
      // 🎯 CORRECTION: Gérer le cas sans photos de référence (totalPhotos === 0)
      if (capturedCount >= totalPhotos && (totalPhotos > 0 || capturedCount > 0)) {
        console.log('🎉 ✅ TOUTES LES PHOTOS CAPTURÉES !');
        console.log(`📸 ${totalPhotos > 0 ? totalPhotos : capturedCount} photo(s) capturée(s) pour ${pieceName}`);
        setAllPhotosCompleted(true);

        // 🔥 CRITIQUE : Marquer la tâche comme "completed" dans le système d'interaction
        // Pour CHAQUE photo de référence capturée, on track l'interaction
        console.log('💾 Sauvegarde des interactions "task_complete" pour persistance...');

        try {
          // 🎯 CORRECTION: Si pas de photos de référence, tracker quand même la capture
          if (referencePhotos.length === 0) {
            // Tracker la capture sans photo de référence
            await trackButtonClick(
              `photo-task-no-ref`,  // buttonId unique
              pieceId,                        // pieceId
              'no-ref-photo',                 // taskId
              'no-ref-photo',                 // etapeId
              'complete',                     // actionType = 'complete'
              {
                taskType: 'photo_capture',
                flowType: flowType,
                pieceName: pieceName,
                totalPhotos: 0,
                noReferencePhotos: true,
                autoCompleted: true,           // ✅ Indique que c'est une auto-completion
                completedAt: new Date().toISOString()
              }
            );
          } else {
            for (const ref of referencePhotos) {
              await trackButtonClick(
                `photo-task-${ref.tache_id}`,  // buttonId unique
                pieceId,                        // pieceId
                ref.tache_id,                   // taskId
                ref.etapeID || ref.tache_id,    // etapeId
                'complete',                     // actionType = 'complete'
                {
                  taskType: 'photo_capture',
                  photoUrl: ref.url,
                  flowType: flowType,
                  pieceName: pieceName,
                  totalPhotos: totalPhotos,
                  autoCompleted: true,           // ✅ Indique que c'est une auto-completion
                  completedAt: new Date().toISOString()
                }
              );
            }
          }
          console.log('✅ Toutes les interactions sauvegardées !');
        } catch (error) {
          console.error('❌ Erreur sauvegarde interactions:', error);
        }
        
        // Fermer automatiquement après 1.5 secondes
        setTimeout(() => {
          console.log('🚪 Fermeture automatique du plugin photo');
          
          // 🚀 CRITIQUE : Utiliser le ref local au lieu du state React
          const allCapturedPhotos = capturedPhotosRef.current;
          console.log('📸 Photos à transmettre au parent (depuis ref local):', {
            count: allCapturedPhotos.length,
            photoIds: allCapturedPhotos.map(p => p.id),
            capturedPhotosMapSize: capturedPhotos.size,
            comparison: {
              fromRef: allCapturedPhotos.length,
              fromState: capturedPhotos.size
            }
          });
          
          // ✅ CRITIQUE : Passer les photos au parent AVANT de fermer
          console.log('📤 Transmission des photos au parent:', allCapturedPhotos.length);
          onPhotosCaptured(allCapturedPhotos);
          
          // Réinitialiser l'état et le ref
          setAllPhotosCompleted(false);
          capturedPhotosRef.current = []; // Réinitialiser le ref
          
          // Fermer le modal
          onClose();
        }, 1500);
      } else {
        // 📸 Passer à la photo suivante non capturée
        const nextUncompletedIndex = findNextUncompletedPhotoIndex();
        
        if (nextUncompletedIndex !== -1) {
          console.log(`➡️ ${totalPhotos - capturedCount} photo(s) restante(s), navigation vers photo ${nextUncompletedIndex + 1}/${totalPhotos}`);
          setTimeout(() => setCurrentRefIndex(nextUncompletedIndex), 300);
        } else {
          // ⚠️ Toutes les photos sont capturées (logique ne devrait pas arriver ici normalement)
          console.warn('⚠️ Aucune photo suivante mais completion non détectée, fermeture forcée');
          setAllPhotosCompleted(true);
          
          setTimeout(() => {
            const allCapturedPhotos = capturedPhotosRef.current;
            console.log('📤 Fermeture forcée avec photos:', allCapturedPhotos.length);
            onPhotosCaptured(allCapturedPhotos);
            setAllPhotosCompleted(false);
            capturedPhotosRef.current = [];
            onClose();
          }, 1500);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur capture:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [currentRefIndex, referencePhotos, capturePhoto, isCapturing, capturedPhotos, findNextUncompletedPhotoIndex, getCapturedPhotoForReference, currentCheckId, flowType, uploadCapturedPhoto, pieceId, pieceName, trackButtonClick, onPhotosCaptured, onClose]);

  const handleRemovePhoto = useCallback((referenceId: string) => {
    console.log('🗑️ Suppression photo:', referenceId);
    removePhoto(referenceId);
  }, [removePhoto]);

  const handleShowComparison = useCallback((referenceId: string) => {
    const capturedPhoto = getCapturedPhotoForReference(referenceId);
    // ✅ CORRECTION: Trouver la photo de référence correspondante
    const referencePhoto = referencePhotos.find(ref => ref.tache_id === referenceId);

    if (capturedPhoto && referencePhoto) {
      console.log('🔍 Affichage comparaison pour:', {
        referenceId,
        capturedPhotoId: capturedPhoto.id,
        referencePhotoUrl: referencePhoto.url
      });
      setComparisonPhoto(capturedPhoto.dataUrl);
      setComparisonReferencePhoto(referencePhoto.url); // ✅ Stocker la photo de référence
      setComparisonReferenceId(referenceId); // ✅ AJOUTÉ: Stocker le tache_id pour le bouton "Reprendre"
      setShowComparison(true);
    } else {
      console.error('❌ Photo capturée ou référence introuvable pour:', referenceId);
    }
  }, [getCapturedPhotoForReference, referencePhotos]);

  const handleCloseComparison = useCallback(() => {
    console.log('🔍 Fermeture écran de comparaison');
    setShowComparison(false);
    setComparisonPhoto(null);
    setComparisonReferencePhoto(null); // ✅ Réinitialiser la photo de référence
    setComparisonReferenceId(null); // ✅ AJOUTÉ: Réinitialiser le tache_id

    // Recharger l'image fantôme pour la photo actuelle
    if (ghostRef.current && referencePhotos[currentRefIndex]) {
      const currentRef = referencePhotos[currentRefIndex];
      console.log('👻 Rechargement image fantôme après comparaison:', currentRef.url);
      ghostRef.current.src = currentRef.url;
    }
  }, [currentRefIndex, referencePhotos]);

  // 🍎 Fonction pour forcer manuellement le démarrage de la vidéo (iOS)
  const handleForceVideoPlay = useCallback(async () => {
    if (!videoRef.current) return;
    
    console.log('🔧 Forçage manuel du démarrage vidéo...');
    const video = videoRef.current;
    
    try {
      await video.play();
      console.log('✅ Vidéo démarrée manuellement');
      setIsVideoPlaying(true);
      
      // Vérifier les dimensions
      setTimeout(() => {
        console.log('📐 Dimensions vidéo après démarrage manuel:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.error('❌ PROBLÈME PERSISTANT : Dimensions = 0x0');
          alert('⚠️ La caméra est connectée mais ne produit pas d\'image.\n\nSolutions:\n1. Fermez les autres apps utilisant la caméra\n2. Redémarrez Safari\n3. Vérifiez Réglages > Safari > Caméra');
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Échec démarrage manuel vidéo:', error);
      alert('❌ Impossible de démarrer la vidéo. Vérifiez les permissions caméra dans Réglages > Safari > Caméra');
    }
  }, []);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // 🎯 AMÉLIORATION V2: Handler ultra-réactif sans délai
  const calculateOpacityFromEvent = useCallback((clientY: number) => {
    const slider = document.querySelector('.opacity-slider-track') as HTMLElement;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;
    const opacity = Math.max(0, Math.min(1, 1 - (y / height)));
    
    // ✅ Mise à jour IMMÉDIATE sans attendre le prochain render
    setGhostOpacity(opacity);
    
    // ✅ Mise à jour visuelle directe du ghost pour réactivité maximale
    if (ghostRef.current) {
      ghostRef.current.style.opacity = String(opacity);
    }
  }, []);

  // 🎯 AMÉLIORATION: Handler souris simplifié
  const handleSliderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSlider(true);
    calculateOpacityFromEvent(e.clientY);
  }, [calculateOpacityFromEvent]);

  // 🎯 AMÉLIORATION V2: Handler tactile ultra-réactif
  const handleSliderTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // ✅ Empêche le scroll pendant le drag
    e.stopPropagation();
    setIsDraggingSlider(true);
    if (e.touches.length > 0) {
      // ✅ Utiliser requestAnimationFrame pour fluidité maximale
      requestAnimationFrame(() => {
        calculateOpacityFromEvent(e.touches[0].clientY);
      });
    }
  }, [calculateOpacityFromEvent]);

  // 🎯 AMÉLIORATION V2: Handler de mouvement ultra-fluide avec RAF
  const handleSliderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSlider) return;

    e.preventDefault(); // ✅ Empêche le scroll pendant le drag

    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (clientY !== undefined) {
      // ✅ Utiliser requestAnimationFrame pour suivi fluide du doigt
      requestAnimationFrame(() => {
        calculateOpacityFromEvent(clientY);
      });
    }
  }, [isDraggingSlider, calculateOpacityFromEvent]);

  // 🎯 AMÉLIORATION: Handler de fin simplifié
  const handleSliderEnd = useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  // 🎯 AMÉLIORATION: Event listeners avec meilleure gestion du tactile
  useEffect(() => {
    if (isDraggingSlider) {
      const handleMouseMove = (e: MouseEvent) => handleSliderMove(e);
      const handleTouchMove = (e: TouchEvent) => handleSliderMove(e);
      const handleMouseUp = () => handleSliderEnd();
      const handleTouchEnd = () => handleSliderEnd();

      // ✅ Ajout des listeners avec passive: false pour permettre preventDefault
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd); // ✅ Gestion de l'annulation tactile

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isDraggingSlider, handleSliderMove, handleSliderEnd]);

  const currentRef = referencePhotos[currentRefIndex];
  const currentCapturedPhoto = currentRef ? getCapturedPhotoForReference(currentRef.tache_id) : null;

  // 🆕 Détection de l'orientation de la photo de référence en comparaison
  const comparisonReferenceOrientation = useImageOrientation(comparisonReferencePhoto || undefined);
  const isComparisonLandscapePhoto = comparisonReferenceOrientation === 'landscape';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* 🔒 Verrouillage de l'orientation en mode portrait */}
      <LockOrientation />

      {/* 🆕 Prompt d'orientation pour photos paysage */}
      <OrientationPrompt isLandscapePhoto={isLandscapePhoto} />

      {/* 🔍 AVERTISSEMENT FLOU DISCRET */}
      {blurWarning.show && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-pulse">
          <div className="bg-yellow-500/80 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm">
            ⚠️ Photo potentiellement floue (score: {blurWarning.score.toFixed(1)})
          </div>
        </div>
      )}

      {/* Header avec bouton fermer */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-white font-semibold">{pieceName}</h2>
            <p className="text-white/70 text-sm">
              {referencePhotos.length > 0
                ? `Photo ${currentRefIndex + 1} sur ${referencePhotos.length}`
                : 'Prendre une photo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-black/60 text-white border-white/30">
            {referencePhotos.length > 0
              ? `${Array.from(capturedPhotos.values()).length}/${referencePhotos.length} capturées`
              : `${Array.from(capturedPhotos.values()).length} photo${Array.from(capturedPhotos.values()).length > 1 ? 's' : ''}`}
          </Badge>

          {/* Bouton de flip de caméra */}
          {availableCameras.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
                const nextIndex = (currentIndex + 1) % availableCameras.length;
                switchCamera(availableCameras[nextIndex].deviceId);
              }}
              className="h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80 border-2 border-white/30"
              title="Changer de caméra"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Zone principale de capture */}
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 🎯 ÉLÉMENT VIDÉO EXACT DE WELCOME.TSX (qui fonctionne) */}
        <div
          className="relative"
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full bg-black"
            style={{
              display: manualStream ? 'block' : 'none',
              objectFit: 'cover'
            }}
          />
          {!manualStream && (
            <div className="absolute inset-0 w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-4">
              {(() => {
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                  return (
                    <>
                      <p className="text-gray-400 text-sm">Démarrage de la caméra...</p>
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent" />
                    </>
                  );
                } else {
                  return (
                    <>
                      {/* Input file caché */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className={`flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg transition-colors ${
                        isDragging ? 'border-primary bg-primary/10' : 'border-gray-600'
                      }`}>
                        <Upload className="h-16 w-16 text-gray-400" />
                        <p className="text-gray-300 text-lg font-medium">Déposez une image ici</p>
                        <p className="text-gray-500 text-sm">ou</p>
                        <div className="flex gap-3">
                          <Button
                            onClick={openFileSelector}
                            className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg"
                          >
                            📁 Choisir un fichier
                          </Button>
                          <Button
                            onClick={startCameraManual}
                            variant="outline"
                            className="font-bold py-2 px-6 rounded-lg"
                          >
                            📷 Utiliser la webcam
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          )}

          {/* Image fantôme (overlay) par-dessus - Seulement si overlay_enabled est true */}
          {currentRef && manualStream && currentRef.overlay_enabled !== false && (
            <img
              ref={ghostRef}
              alt="Référence"
              className="pointer-events-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: isLandscapePhoto ? '100vh' : '100vw',
                height: isLandscapePhoto ? '100vw' : '100vh',
                minWidth: isLandscapePhoto ? '100vh' : '100vw',
                minHeight: isLandscapePhoto ? '100vw' : '100vh',
                opacity: ghostOpacity,
                mixBlendMode: 'normal',
                objectFit: 'cover',
                transformOrigin: isLandscapePhoto ? '50vh 50vh' : 'center',
                transform: isLandscapePhoto ? 'rotate(-90deg)' : 'none'
              }}
            />
          )}
        </div>

        {/* Contrôle d'opacité vertical - VERSION SIMPLIFIÉE - Seulement si overlay_enabled */}
        {currentRef && currentRef.overlay_enabled !== false && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="flex flex-col items-center gap-2 bg-black/60 rounded-full p-3 backdrop-blur-sm">
              <span className="text-white text-xs">👻</span>
              <div
                className="opacity-slider-track w-6 h-32 bg-white/30 rounded-full relative cursor-grab active:cursor-grabbing touch-none select-none"
                onMouseDown={handleSliderMouseDown}
                onTouchStart={handleSliderTouchStart}
              >
                {/* Track de remplissage pour feedback visuel - SANS TRANSITION pour fluidité */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-white/50 rounded-full"
                  style={{
                    height: `${ghostOpacity * 100}%`,
                    transition: 'none' // ✅ Suppression transition pour réactivité instantanée
                  }}
                />
                {/* Curseur du slider - SANS TRANSITION pour fluidité */}
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full border-2 border-white shadow-lg ${
                    isDraggingSlider ? 'scale-125 shadow-2xl' : 'scale-100'
                  }`}
                  style={{
                    left: '50%',
                    top: `${(1 - ghostOpacity) * 100}%`,
                    transform: `translate(-50%, -50%) scale(${isDraggingSlider ? 1.25 : 1})`,
                    transition: 'none' // ✅ Suppression transition pour réactivité instantanée
                  }}
                />
              </div>
              <span className="text-white text-xs">🔍</span>
            </div>
          </div>
        )}

        {/* Bouton de capture - VERSION SIMPLIFIÉE */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button
            onClick={handleCapture}
            disabled={isCapturing || !manualStream}
            className={`h-20 w-20 rounded-full border-4 transition-all duration-200 ${
              currentCapturedPhoto
                ? 'bg-green-500 border-green-300 hover:bg-green-600'
                : 'bg-white border-white/50 hover:bg-gray-100'
            }`}
          >
            {isCapturing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-transparent" />
            ) : currentCapturedPhoto ? (
              <RotateCcw className="h-8 w-8 text-white" />
            ) : (
              <Camera className="h-8 w-8 text-gray-800" />
            )}
          </Button>
        </div>

        {/* Navigation des photos en bas */}
        {/* 🎯 CORRECTION: Afficher les thumbnails même quand il n'y a pas de photos de référence */}
        {(referencePhotos.length > 1 || (referencePhotos.length === 0 && capturedPhotos.size > 0)) && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex gap-2 bg-black/60 rounded-full p-2 backdrop-blur-sm">
              {referencePhotos.length > 0 ? (
                // Afficher les photos de référence avec leurs statuts de capture
                referencePhotos.map((ref, index) => {
                  const isActive = index === currentRefIndex;
                  const isCaptured = getCapturedPhotoForReference(ref.tache_id);
                  // 🔍 DÉTECTION DE FLOU : Vérifier si la photo capturée est floue
                  const isBlurry = isCaptured?.meta?.isBlurry || false;

                  return (
                    <button
                      key={ref.tache_id}
                      onClick={() => {
                        if (isCaptured) {
                          // Si photo capturée, afficher la comparaison
                          handleShowComparison(ref.tache_id);
                        } else {
                          // Sinon, changer de référence
                          setCurrentRefIndex(index);
                        }
                      }}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden transition-all ${
                        isActive
                          ? 'border-2 border-white scale-110 shadow-lg'
                          : isCaptured
                          ? 'border-2 border-green-400 shadow-md'
                          : 'border-2 border-white/30 hover:border-white/60'
                      }`}
                    >
                      <img
                        src={ref.url}
                        alt={`Référence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* ✅ Indicateur visuel élégant : photo capturée */}
                      {isCaptured && (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/40 to-green-600/60 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-xl">
                            <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}

                      {/* 🔍 BADGE FLOU DISCRET : Petit badge en haut à droite si photo floue */}
                      {isBlurry && (
                        <div className="absolute top-1 right-1 bg-yellow-500 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md" title="Photo potentiellement floue">
                          ⚠️
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                // 🎯 CORRECTION: Afficher les photos capturées quand il n'y a pas de photos de référence
                Array.from(capturedPhotos.values()).map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      // Afficher la photo capturée en grand
                      console.log('🖼️ Affichage photo capturée:', {
                        id: photo.id,
                        dataUrlLength: photo.dataUrl?.length,
                        dataUrlStart: photo.dataUrl?.substring(0, 50),
                        referencePhotoId: photo.referencePhotoId
                      });
                      setComparisonPhoto(photo.dataUrl);
                      setComparisonReferencePhoto(null);
                      setComparisonReferenceId(photo.referencePhotoId);
                      setShowComparison(true);
                    }}
                    className="relative w-12 h-12 rounded-lg overflow-hidden transition-all border-2 border-green-400 shadow-md hover:scale-110"
                    title={`Photo ${index + 1}`}
                  >
                    <img
                      src={photo.dataUrl}
                      alt={`Photo capturée ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* ✅ Indicateur visuel : photo capturée */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/40 to-green-600/60 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* 🔍 BADGE FLOU : Afficher si la photo est floue */}
                    {photo.meta?.isBlurry && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md" title="Photo potentiellement floue">
                        ⚠️
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 🍎 ALERTE : Caméra connectée mais vidéo ne joue pas (écran noir iOS) */}
        {stream && !isVideoPlaying && !isLoading && !cameraError && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
            <div className="text-center text-white max-w-md mx-auto p-6">
              <div className="text-6xl mb-4">📹</div>
              <h2 className="text-xl font-bold mb-3">Caméra détectée</h2>
              <p className="text-white/80 mb-6">
                La caméra est connectée mais la preview n'apparaît pas.
                <br />
                Appuyez sur le bouton ci-dessous pour démarrer.
              </p>
              
              <Button
                onClick={handleForceVideoPlay}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                size="lg"
              >
                ▶️ Démarrer la caméra
              </Button>
              
              <div className="mt-6 text-sm text-white/60 space-y-2">
                <p>💡 Si la preview reste noire après avoir appuyé :</p>
                <ul className="text-left space-y-1">
                  <li>• Fermez les autres apps utilisant la caméra</li>
                  <li>• Vérifiez Réglages &gt; Safari &gt; Caméra</li>
                  <li>• Redémarrez Safari si nécessaire</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* États d'erreur et de chargement */}
        {(isLoading || cameraError) && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
            <div className="text-center text-white">
              {isLoading && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4" />
                  <p>Démarrage de la caméra...</p>
                </>
              )}
              {cameraError && (
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-lg mb-2">Erreur caméra</p>
                  <p className="text-sm text-white/70 mb-6">{cameraError}</p>
                  
                  {/* Sélecteur de caméra */}
                  {availableCameras.length > 1 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm text-white/80">Essayez une autre caméra :</p>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={selectedCameraId || ""} 
                          onValueChange={switchCamera}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Choisir une caméra" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCameras.map((camera) => (
                              <SelectItem key={camera.deviceId} value={camera.deviceId}>
                                {camera.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={refreshCameras}
                          variant="outline" 
                          size="sm"
                          className="text-white border-white/20 bg-white/10"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions principales */}
                  <div className="space-y-3">
                    {/* Bouton pour demander les permissions caméra */}
                    <div className="flex justify-center">
                      <Button 
                        onClick={async () => {
                          console.log('🔑 Demande d\'autorisation caméra via bouton');
                          
                          // Utiliser la fonction spécialisée pour les permissions
                          const result = await requestCameraPermissions();
                          
                          if (result.granted) {
                            // Permissions accordées, actualiser et redémarrer
                            console.log('✅ Permissions accordées, redémarrage caméra...');
                            await refreshCameras();
                            await startCamera();
                          } else {
                            // Permissions refusées, afficher message explicatif
                            console.log('❌ Permissions refusées:', result.error);
                            
                            // Message spécialisé selon le type d'erreur
                            let message: string;
                            
                            if (result.needsPolyfill) {
                              // Cas spécial : navigateur incompatible
                              message = `🚫 ${result.error}\n\n🔧 Solutions recommandées :\n\n1. Mettez à jour votre navigateur vers la dernière version\n2. Utilisez un navigateur récent :\n   • Chrome (version 53+)\n   • Firefox (version 36+)\n   • Safari (version 11+)\n   • Edge (version 12+)\n3. Si vous utilisez un navigateur d'entreprise, contactez votre support IT\n4. En dernier recours, utilisez l'upload de fichier comme alternative`;
                            } else {
                              // Cas standard : problème de permissions
                              message = `🚫 ${result.error}\n\n📋 Instructions détaillées :\n\n1. Regardez l'icône 🔒 ou 📷 dans la barre d'adresse\n2. Cliquez dessus et sélectionnez "Autoriser"\n3. Ou allez dans les paramètres du navigateur > Confidentialité > Caméra\n4. Autorisez ce site à accéder à votre caméra\n5. Rechargez la page si nécessaire`;
                            }
                            
                            alert(message);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-2 font-medium"
                        disabled={isLoading}
                      >
                        {isLoading ? '⏳ Demande en cours...' : '🎥 Autoriser l\'accès caméra'}
                      </Button>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={startCamera} 
                        variant="outline" 
                        className="text-white border-white bg-white/10 hover:bg-white/20"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Réessayer
                      </Button>
                      
                      <Button 
                        onClick={refreshCameras}
                        variant="outline" 
                        className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Actualiser
                      </Button>
                      
                      {/* Action pour redémarrer complètement le plugin */}
                      <Button 
                        onClick={() => {
                          // Arrêter la caméra et relancer complètement le modal
                          stopCamera();
                          onClose();
                          // Réouvrir après un court délai pour forcer le redémarrage
                          setTimeout(() => {
                            window.location.reload();
                          }, 100);
                        }}
                        variant="ghost" 
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Redémarrer le plugin
                      </Button>
                    </div>

                    {/* Informations de debug */}
                    <div className="text-xs text-white/60 space-y-1">
                      <div>📊 Caméras détectées: {availableCameras.length}</div>
                      {selectedCameraId && (
                        <div>🎯 Sélectionnée: {
                          availableCameras.find(c => c.deviceId === selectedCameraId)?.label || 'Inconnue'
                        }</div>
                      )}
                    </div>

                    {/* Solutions suggérées */}
                    <div className="text-xs text-white/70 mt-4 text-left">
                      <p className="font-medium mb-2">💡 Comment résoudre :</p>
                      <div className="space-y-2">
                        <div className="bg-white/10 rounded p-2">
                          <p className="font-medium text-white/90 mb-1">🔑 Permissions caméra :</p>
                          <ul className="space-y-1">
                            <li>• Cliquez sur "Autoriser l'accès caméra" ci-dessus</li>
                            <li>• Ou cliquez sur l'icône 🔒/📷 dans la barre d'adresse</li>
                            <li>• Sélectionnez "Autoriser" pour la caméra</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-white/90 mb-1">🛠️ Autres solutions :</p>
                          <ul className="space-y-1">
                            <li>• Fermez les autres applications utilisant la caméra</li>
                            <li>• Essayez une autre caméra si disponible</li>
                            <li>• Rechargez la page si le problème persiste</li>
                            <li>• Vérifiez que vous êtes sur HTTPS (sécurisé)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay de succès */}
      {allPhotosCompleted && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/95 to-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center text-white max-w-md px-6">
            {/* Icône de succès animée */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-green-500/20 rounded-full animate-ping" />
              </div>
              <div className="relative">
                <div className="text-8xl mb-2">📸</div>
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-3 shadow-xl animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Message de succès */}
            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-green-300 to-green-100 bg-clip-text text-transparent">
              C'est terminé !
            </h2>
            <p className="text-xl text-white/90 mb-2">
              {referencePhotos.length > 0
                ? `${referencePhotos.length} photo${referencePhotos.length > 1 ? 's' : ''} capturée${referencePhotos.length > 1 ? 's' : ''} ✓`
                : `${Array.from(capturedPhotos.values()).length} photo${Array.from(capturedPhotos.values()).length > 1 ? 's' : ''} capturée${Array.from(capturedPhotos.values()).length > 1 ? 's' : ''} ✓`}
            </p>
            <p className="text-base text-white/60 mb-6">
              pour {pieceName}
            </p>

            {/* Barre de progression */}
            <div className="mb-6">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Message de fermeture */}
            <div className="flex items-center justify-center gap-3 text-white/70">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              <p className="text-sm">Fermeture automatique...</p>
            </div>
          </div>
        </div>
      )}

      {/* Écran de comparaison */}
      {/* 🎯 CORRECTION: Afficher l'écran de comparaison même sans photo de référence */}
      {showComparison && comparisonPhoto && (
        <div className="absolute inset-0 bg-black z-40">
          {/* Header comparaison */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseComparison}
                className="h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-white font-semibold">{pieceName} - Comparaison</h2>
              </div>
            </div>
          </div>

          {/* Grille de comparaison */}
          <div className="h-full pt-20 pb-24 px-4">
            <div className={`grid ${comparisonReferencePhoto ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4 h-full`}>
              {/* Image de référence - Afficher seulement s'il y en a une */}
              {comparisonReferencePhoto && (
                <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-white font-semibold text-center">📸 Référence</h3>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center bg-black w-full h-full">
                    <img
                      src={comparisonReferencePhoto}
                      alt="Référence"
                      className="w-full h-full object-contain"
                      style={{
                        transform: isComparisonLandscapePhoto ? 'rotate(-90deg)' : 'none',
                        transformOrigin: 'center center'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Photo capturée */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold text-center">📷 Photo capturée</h3>
                </div>
                <div className="flex-1 relative flex items-center justify-center bg-black w-full h-full p-4">
                  {/* 🎯 CORRECTION: Afficher la photo capturée avec bordure verte et timestamp */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="relative border-4 border-green-500 rounded-3xl overflow-hidden shadow-2xl" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                      <img
                        src={comparisonPhoto}
                        alt="Photo capturée"
                        className="w-full h-full object-contain"
                        onLoad={() => {
                          console.log('✅ Photo capturée chargée avec succès');
                        }}
                        onError={(e) => {
                          console.error('❌ Erreur chargement photo capturée:', {
                            src: comparisonPhoto?.substring(0, 100),
                            error: e
                          });
                        }}
                      />

                      {/* 📷 Icône caméra en haut à gauche */}
                      <div className="absolute top-4 left-4 bg-black/60 rounded-full p-2 backdrop-blur-sm">
                        <Camera className="w-6 h-6 text-white" />
                      </div>

                      {/* ⏰ Timestamp en bas à gauche */}
                      {comparisonPhoto && comparisonReferenceId && getCapturedPhotoForReference(comparisonReferenceId) && (
                        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm font-medium">
                          <span>📸</span>
                          <span>{new Date(getCapturedPhotoForReference(comparisonReferenceId)?.timestamp || Date.now()).toLocaleString('fr-FR')}</span>
                        </div>
                      )}

                      {/* 🔍 BADGE FLOU : Afficher si la photo est floue */}
                      {comparisonPhoto && comparisonReferenceId && getCapturedPhotoForReference(comparisonReferenceId)?.meta?.isBlurry && (
                        <div className="absolute top-4 right-4 bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-full flex items-center gap-2 font-semibold text-sm shadow-lg" title="Photo potentiellement floue">
                          <span className="text-lg">⚠️</span>
                          <span>Photo floue</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions comparaison */}
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="flex gap-3">
              <Button
                onClick={handleCloseComparison}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
              >
                Garder cette photo
              </Button>
              <Button
                onClick={() => {
                  // ✅ CORRECTION: Utiliser comparisonReferenceId au lieu de currentRefIndex
                  if (comparisonReferenceId) {
                    console.log('🔄 Reprise de la photo:', comparisonReferenceId);

                    // Trouver l'index de la photo de référence correspondante
                    const photoIndex = referencePhotos.findIndex(ref => ref.tache_id === comparisonReferenceId);

                    if (photoIndex !== -1) {
                      console.log('📸 Positionnement sur la photo à reprendre:', {
                        tache_id: comparisonReferenceId,
                        index: photoIndex,
                        photoNumber: photoIndex + 1
                      });

                      // 1. Supprimer la photo capturée
                      handleRemovePhoto(comparisonReferenceId);

                      // 2. Positionner la caméra sur cette photo de référence
                      setCurrentRefIndex(photoIndex);

                      // 3. Fermer l'écran de comparaison
                      handleCloseComparison();

                      // 4. Mettre à jour l'image fantôme (sera fait automatiquement par useEffect)
                      console.log('✅ Prêt à reprendre la photo');
                    } else {
                      console.error('❌ Photo de référence introuvable pour:', comparisonReferenceId);
                    }
                  } else {
                    console.error('❌ Aucun comparisonReferenceId disponible');
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Reprendre la photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Panneau de diagnostic iPhone */}
      {showDiagnostic && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-gray-700 max-h-[50vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">🔍 Diagnostic iPhone</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearDiagnosticLogs}
                  className="text-white hover:bg-white/10"
                >
                  🗑️
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const logsText = diagnosticLogs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
                    navigator.clipboard.writeText(logsText);
                    alert('📋 Logs copiés dans le presse-papier !');
                  }}
                  className="text-white hover:bg-white/10"
                >
                  📋
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDiagnostic(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* État du stream et de la vidéo */}
            <div className="mb-4 bg-gray-800 rounded p-3 space-y-2 text-xs">
              <h4 className="font-bold text-white">📊 État actuel</h4>
              <div className="space-y-1">
                <div>Stream: <span className={stream ? 'text-green-400' : 'text-red-400'}>{stream ? '✅ Connecté' : '❌ Déconnecté'}</span></div>
                <div>Vidéo playing: <span className={isVideoPlaying ? 'text-green-400' : 'text-red-400'}>{isVideoPlaying ? '✅ En lecture' : '❌ Arrêtée'}</span></div>
                {stream && (
                  <>
                    <div>Tracks: {stream.getVideoTracks().length} vidéo</div>
                    {stream.getVideoTracks().map((track, idx) => (
                      <div key={idx} className="ml-2 text-gray-400">
                        • {track.label}
                        <br />
                        &nbsp;&nbsp;État: {track.readyState}, Enabled: {track.enabled ? 'Oui' : 'Non'}
                      </div>
                    ))}
                  </>
                )}
                {videoRef.current && (
                  <>
                    <div>Dimensions: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</div>
                    <div>Ready state: {videoRef.current.readyState}</div>
                  </>
                )}
              </div>
            </div>

            {/* Bouton Forcer lecture vidéo */}
            {stream && !isVideoPlaying && (
              <div className="mb-3">
                <Button
                  onClick={handleForceVideoPlay}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  ▶️ FORCER DÉMARRAGE VIDÉO
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  🍎 Si l'écran reste noir, cliquez ici pour forcer le démarrage de la preview
                </p>
              </div>
            )}

            {/* Bouton Forcer caméra arrière */}
            <div className="mb-3">
              <Button
                onClick={async () => {
                  try {
                    stopCamera();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Forcer la demande de permission pour la caméra arrière avec 'exact'
                    const stream = await navigator.mediaDevices.getUserMedia({
                      video: {
                        facingMode: { exact: 'environment' }
                      }
                    });
                    
                    stream.getTracks().forEach(track => track.stop());
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Redémarrer la caméra normale
                    startCamera();
                  } catch (error: unknown) {
                    const err = error as { name?: string; message?: string };
                    console.error('❌ Erreur forçage caméra:', error);
                    alert(`❌ ${err.name || 'Error'}: ${err.message || 'Unknown error'}\n\nSi vous voyez "Permission denied", allez dans:\nRéglages > Safari > Caméra > Autoriser`);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                🔧 Forcer permission caméra ARRIÈRE
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                ⚠️ Si la caméra avant fonctionne mais pas l'arrière, utilisez ce bouton pour forcer iOS à demander la permission
              </p>
            </div>
            
            <div className="space-y-1 font-mono text-xs">
              {diagnosticLogs.length === 0 ? (
                <p className="text-gray-400">Aucun log pour le moment...</p>
              ) : (
                diagnosticLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      log.type === 'error' ? 'bg-red-900/30 text-red-200' :
                      log.type === 'success' ? 'bg-green-900/30 text-green-200' :
                      log.type === 'warning' ? 'bg-yellow-900/30 text-yellow-200' :
                      'bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

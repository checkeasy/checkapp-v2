import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { ArrowLeft, Camera, AlertTriangle, HelpCircle, CheckCircle2, Brush, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhotoCaptureModal } from "@/components/PhotoCaptureModal";
import { PhotoZoomModal } from "@/components/PhotoZoomModal";
import { CapturedPhoto } from "@/types/photoCapture";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileSheet } from "@/components/ProfileSheet";
import { HelpSheet } from "@/components/HelpSheet";
import { PieceSelector } from "@/components/PieceSelector";
import { TaskCard } from "@/components/TaskCard";
import { RoomTaskCard } from "@/components/RoomTaskCard";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { TaskNavigationAccordion } from "@/components/TaskNavigationAccordion";
import { useUser } from "@/contexts/UserContext";
import { useCheckoutFlow } from "@/contexts/CheckoutFlowContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useCheckoutFlowManager } from "@/hooks/useCheckoutFlowManager";
import { Typography } from "@/components/ui/typography";
import { PieceStatus } from "@/types/room";
import { Signalement } from "@/types/signalement";
import { useParcoursData, useGlobalParcours } from "@/contexts/GlobalParcoursContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { useAutoSaveCheckId } from "@/hooks/useAutoSaveCheckId";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useInteractionTracking } from "@/hooks/useInteractionTracking";
import { checkSessionManager } from "@/services/checkSessionManager";
import { imageUploadService } from "@/services/imageUploadService";
import { interactionTracker } from "@/services/interactionTracker";
import { navigatePreservingParams } from "@/utils/navigationHelpers";
import { toast } from "sonner";
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from "@/hooks/useSessionData";
import { useParcoursDataUnified } from "@/hooks/useParcoursDataUnified";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import { navigationStateManager } from "@/services/navigationStateManager";
interface CheckOutProps {
  roomName?: string;
  photoNumber?: number;
  totalPhotos?: number;
  roomInfo?: string;
  cleaningInfo?: string;
  referencePhoto?: string;
  pieces?: PieceStatus[];
  currentPieceId?: string;
  currentTaskIndex?: number;
  onPieceSelected?: (pieceId: string) => void;
}

// ✅ SUPPRIMÉ: mockSignalements - on utilise maintenant le contexte SignalementsContext

export const CheckOut = ({
  roomName = "Chambre",
  photoNumber = 1,
  totalPhotos = 2,
  roomInfo = "Indiquez les informations à connaître sur cette pièce : éléments à manipuler avec précaution, particularités, éventuels défauts déjà présents…",
  cleaningInfo = "Indiquez les informations indispensables : produits recommandés ou à proscrire, zones fragiles, particularités (bois brut, marbre…).",
  referencePhoto = "/src/assets/reference-photo.jpg",
  pieces,
  currentPieceId,
  currentTaskIndex,
  onPieceSelected
}: CheckOutProps) => {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isHelpSheetOpen, setIsHelpSheetOpen] = useState(false);
  // ✅ SUPPRIMÉ: selectedTab n'est plus utilisé car les onglets sont dans RoomTaskCard
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPhotoZoomModalOpen, setIsPhotoZoomModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);
  const [isSignalementsOpen, setIsSignalementsOpen] = useState(false);
  // ✅ SUPPRIMÉ: showContinueDialog n'est plus nécessaire
  const [capturedPhotosData, setCapturedPhotosData] = useState<Map<string, CapturedPhoto[]>>(new Map());
  const [validationMode, setValidationMode] = useState<'validated' | 'photos_retaken' | null>(null);
  const [bottomPadding, setBottomPadding] = useState(192); // Valeur par défaut (pb-48 = 192px)
  const [isCheckingSession, setIsCheckingSession] = useState(true); // 🏁 État pour bloquer l'affichage pendant la vérification
  const navigate = useNavigate();
  const notifiedRoomsRef = useRef(new Set<string>());
  const bottomBannerRef = useRef<HTMLDivElement>(null);
  const {
    user,
    logout
  } = useUser();
  const { openReportModal } = useReportProblem();
  const { getSignalementsByRoom, getPendingSignalements } = useSignalements();
  const { rooms: globalRooms, forceCheckoutMode, getApiSignalementsByRoom } = useParcoursData();  // ✅ NOUVEAU
  const { currentParcours } = useGlobalParcours();
  
  // 🎯 NOUVEAU: Intégration CheckID
  const { currentCheckId, isCheckIdActive, setActiveCheckId } = useActiveCheckId();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkout');

  // 🚨 FALLBACK: Si pas de CheckID, essayer de le récupérer depuis l'URL
  const fallbackCheckId = useMemo(() => {
    if (currentCheckId) return currentCheckId;

    if (checkIdFromUrl) {
      console.log('🔄 CheckOut: CheckID récupéré depuis URL comme fallback:', checkIdFromUrl);
      return checkIdFromUrl;
    }

    return null;
  }, [currentCheckId, checkIdFromUrl]);

  // 🎯 CORRECTION CRITIQUE: Activer automatiquement le checkID depuis l'URL
  // ⚡ useLayoutEffect s'exécute AVANT le rendu, garantissant que le checkID est actif avant les interactions
  useLayoutEffect(() => {
    const activateCheckIdFromUrl = async () => {
      // Si on a un checkID dans l'URL mais pas dans le contexte, l'activer
      if (fallbackCheckId && !currentCheckId) {
        console.log('🔥 CheckOut: Activation automatique du CheckID depuis URL (AVANT rendu):', fallbackCheckId);
        await setActiveCheckId(fallbackCheckId);
      }
    };

    activateCheckIdFromUrl();
  }, [fallbackCheckId, currentCheckId, setActiveCheckId]);

  // Utiliser le fallback si nécessaire
  const effectiveCheckId = currentCheckId || fallbackCheckId;

  // 🎯 FIX CRITIQUE: Synchroniser le checkId avec interactionTracker
  useEffect(() => {
    if (effectiveCheckId) {
      interactionTracker.setCurrentCheckId(effectiveCheckId);
    }
  }, [effectiveCheckId]);

  const {
    saveButtonClick,
    savePhotoTaken,
    saveCheckboxChange
  } = useAutoSaveCheckId();
  const { uploadCapturedPhoto, getDisplayUrl } = useImageUpload();

  // 🆕 Hook pour mettre à jour l'état des pièces
  const { updatePieceStatus } = useInteractionTracking();
  
  // 🚨 URL MONITORING: Surveiller tous les changements d'URL
  const urlMonitorRef = useRef(window.location.href);
  useEffect(() => {
    const monitorUrl = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== urlMonitorRef.current) {
        console.log('🚨 CHECKOUT URL CHANGED DETECTED:', {
          from: urlMonitorRef.current,
          to: currentUrl,
          hasCheckId: currentUrl.includes('checkid'),
          hasParcoursId: currentUrl.includes('parcours'),
          timestamp: new Date().toISOString()
        });
        urlMonitorRef.current = currentUrl;
      }
    };
    
    const interval = setInterval(monitorUrl, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, []);

  // 🎯 FIX: Trier les rooms par ordre AVANT de les convertir pour garantir la cohérence
  const sortedGlobalRooms = [...globalRooms].sort((a, b) => a.ordre - b.ordre);

  // Convertir les rooms en PieceStatus pour compatibilité avec le flow
  const defaultPieces: PieceStatus[] = sortedGlobalRooms.map(room => ({
    id: room.id,
    nom: room.nom,
    ordre: room.ordre || 1,
    roomInfo: room.roomInfo || '',
    cleaningInfo: room.cleaningInfo || '',
    photoReferences: room.photoReferences || { checkin: [], checkout: [] },
    status: 'VIDE' as const,
    tasks_total: room.tasks?.length || 0,
    tasks_done: 0,
    photos_required: room.tasks?.reduce((sum, task) => sum + (task.total_photos_required || 0), 0) || 0,
    photos_done: 0,
    tasks: room.tasks || []
  }));

  // 🎯 DEBUG: Vérifier l'ordre des pièces avant de passer à useCheckoutFlowManager
  console.log('🔍 CheckOut - Ordre des defaultPieces AVANT useCheckoutFlowManager:', defaultPieces.map((p, i) => ({
    index: i,
    nom: p.nom,
    ordre: p.ordre,
    id: p.id,
    isPremiere: i === 0 ? '✅ SERA SÉLECTIONNÉE' : ''
  })));

  const actualPieces = pieces || defaultPieces;
  
  // 🚀 NOUVEAU: Utilisation du nouveau CheckoutFlowManager spécialisé avec CheckID sync
  const checkoutFlow = useCheckoutFlowManager(actualPieces, currentParcours?.id);
  
  // Destructuration pour l'interface
  const {
    currentPieceId: actualCurrentPieceId,
    currentTaskIndex: actualCurrentTaskIndex,
    pieces: dynamicPieces,
    isFlowCompleted,
    totalProgress
  } = checkoutFlow;
  
  const currentPiece = checkoutFlow.getCurrentPiece();
  const syncedCurrentTask = checkoutFlow.getCurrentTask();
  
  // Force le mode checkout au chargement
  const [checkoutModeForced, setCheckoutModeForced] = useState(false);
  useEffect(() => {
    if (!checkoutModeForced) {
      console.log('🎯 CheckOut: Forçage du mode checkout');
      forceCheckoutMode();
      setCheckoutModeForced(true);
    }
  }, [forceCheckoutMode, checkoutModeForced]);

  // 🎯 FIX: Sauvegarder le chemin de la page dans la session pour restauration après F5
  useEffect(() => {
    const savePagePath = async () => {
      if (!effectiveCheckId) return;

      try {
        const { interactionTracker } = await import('@/services/interactionTracker');
        await interactionTracker.trackPagePath('/checkout');
        console.log('💾 CheckOut: Chemin de page sauvegardé dans session');
      } catch (error) {
        console.error('❌ CheckOut: Erreur sauvegarde chemin de page:', error);
      }
    };

    savePagePath();
  }, [effectiveCheckId]); // Se déclenche quand le checkId est disponible

  // 🎯 NOUVEAU: Restauration d'état depuis CheckID
  useEffect(() => {
    // Restauration depuis CheckID si actif

    const loadStateFromCheckId = async () => {
      console.log('%c🔍 CHECKOUT RESTAURATION - DÉBUT',
        'color: #ffffff; font-weight: bold; font-size: 18px; background: #3b82f6; padding: 8px 16px; border-radius: 4px;', {
        effectiveCheckId,
        isCheckIdActive,
        hasActiveCheckId: !!effectiveCheckId,
        timestamp: new Date().toLocaleString()
      });

      if (!effectiveCheckId || !isCheckIdActive) {
        console.error('%c❌ CHECKOUT RESTAURATION - ÉCHEC CONDITIONS',
          'color: #ffffff; font-weight: bold; font-size: 14px; background: #ef4444; padding: 6px 12px;', {
          effectiveCheckId: effectiveCheckId || 'MANQUANT',
          isCheckIdActive,
          raison: !effectiveCheckId ? 'Pas de CheckID' : 'CheckID non actif'
        });
        return;
      }

      try {
        console.log('🔍 Lecture session depuis IndexedDB...', effectiveCheckId);
        const session = await checkSessionManager.getCheckSession(effectiveCheckId);

        console.log('%c📦 SESSION RÉCUPÉRÉE',
          'color: #ffffff; font-weight: bold; background: #8b5cf6; padding: 4px 8px;', {
          existe: !!session,
          status: session?.status,
          hasProgress: !!session?.progress,
          hasInteractions: !!session?.progress?.interactions
        });

        // 🎯 FIX CRITIQUE: Valider le parcoursId AVANT de charger les données
        const urlParams = new URLSearchParams(location.search);
        const urlParcoursId = urlParams.get('parcours');

        if (session && urlParcoursId && session.parcoursId !== urlParcoursId) {
          console.error('%c❌ PARCOURS ID MISMATCH DÉTECTÉ!',
            'color: #ffffff; font-weight: bold; font-size: 16px; background: #dc2626; padding: 8px 16px;', {
            sessionParcoursId: session.parcoursId,
            urlParcoursId: urlParcoursId,
            checkId: effectiveCheckId
          });

          // Nettoyer le checkId invalide
          await setActiveCheckId(null);
          localStorage.removeItem('activeCheckId');

          toast.error('Session incompatible avec ce parcours. Veuillez recommencer.', {
            duration: 5000
          });

          return; // Ne PAS charger les données
        }

        if (!session?.progress?.interactions) {
          return;
        }

        // 🎯 NOUVEAU: Restaurer les URLs des photos uploadées depuis CheckID
        const { imageUploadService } = await import('@/services/imageUploadService');
        await imageUploadService.restoreUrlsFromCheckId(effectiveCheckId);

        const { buttonClicks, photosTaken: savedPhotos, checkboxStates } = session.progress.interactions;

        console.log('%c📊 CONTENU INTERACTIONS INDEXEDDB', 
          'color: #ffffff; font-weight: bold; background: #059669; padding: 4px 8px;', {
          buttonClicks: buttonClicks ? Object.keys(buttonClicks).length : 0,
          photosTaken: savedPhotos ? Object.keys(savedPhotos).length : 0,
          checkboxStates: checkboxStates ? Object.keys(checkboxStates).length : 0,
          photoIds: savedPhotos ? Object.keys(savedPhotos) : [],
          photosDetail: savedPhotos ? JSON.stringify(savedPhotos, null, 2).substring(0, 500) : 'AUCUNE'
        });

        // 🎯 NOTE: La restauration des checkboxes est maintenant gérée dans useCheckoutFlowManager
        // pour éviter les problèmes de timing et de réinitialisation de state
        // Voir useCheckoutFlowManager.ts ligne 90+ pour la logique de restauration

        console.log('ℹ️ CheckOut: Restauration des checkboxes gérée par useCheckoutFlowManager');
        console.log('📊 CheckOut: État actuel des pièces:', {
          totalPieces: checkoutFlow.pieces.length,
          completedTasks: checkoutFlow.pieces.reduce((sum, p) =>
            sum + (p.tasks?.filter(t => t.completed).length || 0), 0),
          totalTasks: checkoutFlow.pieces.reduce((sum, p) =>
            sum + (p.tasks?.length || 0), 0)
        });

        // 🎯 FIX CRITIQUE: Restaurer TOUTES les photos de la session, pas seulement la tâche courante
        console.log('📸 CheckOut: Restoration de TOUTES les photos de la session...');
        const restoredPhotosData = new Map<string, CapturedPhoto[]>();
        
        // 🎯 ÉTAPE 1: Restaurer TOUTES les photos depuis localStorage
        console.log('%c🔍 RECHERCHE PHOTOS LOCALSTORAGE (TOUTES)',
          'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px;', {
          sessionCheckId: effectiveCheckId,
          totalLocalStorageKeys: Object.keys(localStorage).filter(key => key.startsWith('uploaded_image_')).length
        });

        const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('uploaded_image_'));

        localStorageKeys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');

            // 🎯 FIX URGENT: Vérifier que la photo appartient à la session actuelle
            if (data.checkId && data.checkId !== effectiveCheckId) {
              console.warn('⚠️ Photo ignorée (checkId différent):', {
                photoCheckId: data.checkId,
                currentCheckId: effectiveCheckId,
                photoId: data.id
              });
              return; // Ignorer cette photo
            }

            // 🎯 FIX: Restaurer TOUTES les photos qui ont pieceId et taskId valides
            if (data.id && data.pieceId && data.taskId && data.uploadedUrl) {
              
              // Créer un objet CapturedPhoto reconstitué
              const capturedPhoto: CapturedPhoto = {
                id: data.id,
                pieceId: data.pieceId,
                referencePhotoId: data.referencePhotoId || '',
                blob: null,
                dataUrl: data.uploadedUrl, // URL uploadée complète
                takenAt: data.metadata?.takenAt || data.uploadedAt || new Date().toISOString(),
                meta: { width: 1920, height: 1440 }
              };
              
              // 🎯 FIX: Extraire etapeID de la clé composite pour compatibilité RoomTaskCard
              const etapeIdOnly = data.taskId.includes('_') ? data.taskId.split('_').pop() || data.taskId : data.taskId;
              
              // Ajouter à la map avec LES DEUX clés
              if (!restoredPhotosData.has(data.taskId)) {
                restoredPhotosData.set(data.taskId, []);
              }
              restoredPhotosData.get(data.taskId)!.push(capturedPhoto);
              
              // Aussi indexer avec la clé simple
              if (!restoredPhotosData.has(etapeIdOnly)) {
                restoredPhotosData.set(etapeIdOnly, []);
              }
              restoredPhotosData.get(etapeIdOnly)!.push(capturedPhoto);
            }
          } catch (error) {
            console.warn('⚠️ Erreur parsing photo localStorage:', key, error);
          }
        });
        
        console.log(`📸 ${restoredPhotosData.size} tâches avec photos restaurées depuis localStorage, total: ${Array.from(restoredPhotosData.values()).reduce((sum, photos) => sum + photos.length, 0)} photos`);
        
        // 🎯 ÉTAPE 2: Fallback vers CheckID (photos malformées)
        console.log('%c📸 ÉTAPE 2: Analyse photos IndexedDB', 
          'color: #ffffff; font-weight: bold; background: #f59e0b; padding: 4px 8px;', {
          totalPhotoIds: savedPhotos ? Object.keys(savedPhotos).length : 0,
          photoIds: savedPhotos ? Object.keys(savedPhotos) : []
        });

        for (const [photoId, photoDataArray] of Object.entries(savedPhotos || {})) {
          const photoArray = Array.isArray(photoDataArray) ? photoDataArray : [photoDataArray];
          
          console.log(`🔍 Analyse photoId: ${photoId}, entries: ${photoArray.length}`);
          
          for (const photoData of photoArray) {
            console.log('📸 Photo data:', {
              photoId,
              type: typeof photoData,
              isString: typeof photoData === 'string',
              hasPhotoData: photoData?.photoData ? 'OUI' : 'NON',
              hasUrl: photoData?.url ? 'OUI' : 'NON',
              hasTaskId: photoData?.taskId ? 'OUI' : 'NON',
              hasPieceId: photoData?.pieceId ? 'OUI' : 'NON',
              preview: JSON.stringify(photoData).substring(0, 200)
            });
            
            // 🚨 GESTION DONNÉES MALFORMÉES : Si photoData est juste un string (ID)
            if (typeof photoData === 'string') {
              const uploadedUrl = imageUploadService.getUploadedUrl(photoData);
              
              if (uploadedUrl) {
                
                // 🎯 RÉCUPÉRER LES MÉTADONNÉES COMPLÈTES DEPUIS LOCALSTORAGE
                let originalPieceId = actualCurrentPieceId || '';
                let originalTaskId = `reference-photos-${actualCurrentPieceId}`;
                
                try {
                  const localStorageData = localStorage.getItem(`uploaded_image_${photoData}`);
                  if (localStorageData) {
                    const parsedData = JSON.parse(localStorageData);
                    if (parsedData.pieceId) {
                      originalPieceId = parsedData.pieceId;
                      originalTaskId = parsedData.taskId || `reference-photos-${parsedData.pieceId}`;
                    }
                  }
                } catch (error) {
                  console.warn('⚠️ Impossible de récupérer métadonnées:', error);
                }
                
                // Créer un objet photo valide avec les VRAIES métadonnées
                const reconstructedPhoto: CapturedPhoto = {
                  id: photoData,
                  pieceId: originalPieceId,
                  referencePhotoId: '',
                  blob: null,
                  dataUrl: uploadedUrl,
                  takenAt: new Date().toISOString(),
                  meta: { width: 1920, height: 1440 }
                };
                
                // 🎯 FIX: Indexer avec DEUX clés pour compatibilité RoomTaskCard
                const uniqueKey = `${originalPieceId}_${originalTaskId}`;
                
                // Clé composite
                if (!restoredPhotosData.has(uniqueKey)) {
                  restoredPhotosData.set(uniqueKey, []);
                }
                restoredPhotosData.get(uniqueKey)!.push(reconstructedPhoto);
                
                // Clé simple (pour RoomTaskCard)
                if (!restoredPhotosData.has(originalTaskId)) {
                  restoredPhotosData.set(originalTaskId, []);
                }
                restoredPhotosData.get(originalTaskId)!.push(reconstructedPhoto);
              }
              
              continue; // Skip le reste du processing
            }
            
            if (photoData?.metadata?.taskId) {
              const taskId = photoData.metadata.taskId;
              const uploadedUrl = imageUploadService.getUploadedUrl(photoId);
              const uploadedUrlFromStorage = getDisplayUrl(photoId, '');
              const bestUrl = uploadedUrlFromStorage || uploadedUrl || photoData.url || '';

              // Créer un objet CapturedPhoto reconstitué avec la meilleure URL
              const capturedPhoto: CapturedPhoto = {
                id: photoId,
                pieceId: photoData.metadata.pieceId || '',
                referencePhotoId: photoData.metadata.referencePhotoId || '',
                blob: null, // Pas de blob pour les photos restaurées
                dataUrl: bestUrl, // 🎯 PRIORITÉ: URL uploadée > URL CheckID > vide
                takenAt: photoData.timestamp || new Date().toISOString(),
                meta: photoData.metadata?.meta || { width: 1920, height: 1440 }
              };

              // 🎯 FIX: Extraire etapeID de la clé composite pour compatibilité RoomTaskCard
              const etapeIdOnly = taskId.includes('_') ? taskId.split('_').pop() || taskId : taskId;

              // Ajouter à la map avec LES DEUX clés
              if (!restoredPhotosData.has(taskId)) {
                restoredPhotosData.set(taskId, []);
              }
              restoredPhotosData.get(taskId)!.push(capturedPhoto);
              
              // Aussi indexer avec la clé simple
              if (etapeIdOnly !== taskId) {
                if (!restoredPhotosData.has(etapeIdOnly)) {
                  restoredPhotosData.set(etapeIdOnly, []);
                }
                restoredPhotosData.get(etapeIdOnly)!.push(capturedPhoto);
              }
            }
          }
        }

        // Appliquer les photos restaurées
        if (restoredPhotosData.size > 0) {
          console.log('%c✅ APPLICATION PHOTOS AU STATE REACT', 
            'color: #ffffff; font-weight: bold; font-size: 16px; background: #10b981; padding: 6px 12px;', {
            tasksWithPhotos: Array.from(restoredPhotosData.keys()),
            totalPhotos: Array.from(restoredPhotosData.values()).reduce((sum, photos) => sum + photos.length, 0),
            photosParTache: Array.from(restoredPhotosData.entries()).map(([taskId, photos]) => ({
              taskId,
              count: photos.length,
              photoIds: photos.map(p => p.id)
            }))
          });
          setCapturedPhotosData(restoredPhotosData);
          console.log('✅ setCapturedPhotosData() appelé avec succès');
        } else {
          console.error('%c❌ AUCUNE PHOTO À RESTAURER', 
            'color: #ffffff; font-weight: bold; background: #ef4444; padding: 4px 8px;', {
            localStoragePhotos: localStorageKeys.length,
            indexedDBPhotos: savedPhotos ? Object.keys(savedPhotos).length : 0,
            raison: 'Vérifier la sauvegarde des photos'
          });
        }

        // 🎯 NOTE: La restauration des tâches complétées est maintenant gérée dans useCheckoutFlowManager
        // Cela évite les problèmes de timing et garantit que l'état est correctement initialisé
        console.log('✅ CheckOut: Restauration des tâches gérée par useCheckoutFlowManager');

      } catch (error) {
        console.error('%c❌ ERREUR CRITIQUE RESTAURATION', 
          'color: #ffffff; font-weight: bold; font-size: 16px; background: #dc2626; padding: 8px 16px;', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          checkId: effectiveCheckId
        });
      } finally {
        console.log('%c🏁 CHECKOUT RESTAURATION - FIN', 
          'color: #ffffff; font-weight: bold; font-size: 18px; background: #3b82f6; padding: 8px 16px; border-radius: 4px;', {
          timestamp: new Date().toLocaleString()
        });
      }
    };

    loadStateFromCheckId();
  }, [effectiveCheckId, isCheckIdActive]); // 🎯 Ne PAS inclure checkoutFlow.pieces pour éviter la boucle infinie

  // 🏁 Vérifier si la session est terminée et bloquer l'accès
  useEffect(() => {
    const checkSessionStatus = async () => {
      setIsCheckingSession(true);

      if (effectiveCheckId) {
        // ⏱️ Attendre un peu avant de vérifier pour laisser le temps à la session d'être mise à jour
        await new Promise(resolve => setTimeout(resolve, 800));

        const session = await checkSessionManager.getCheckSession(effectiveCheckId);
        console.log('🔍 CheckOut: Vérification session:', {
          checkId: effectiveCheckId,
          status: session?.status,
          rapportID: session?.rapportID,
          isTerminated: session?.status === 'terminated'
        });

        if (session && session.status === 'terminated') {
          console.warn('🚫 CheckOut: Session terminée, redirection vers checkout-home');
          toast.error('Ce parcours est déjà terminé. Consultez votre rapport.');

          // ⏱️ Attendre un peu avant de rediriger
          await new Promise(resolve => setTimeout(resolve, 1000));
          navigatePreservingParams(navigate, '/checkout-home', effectiveCheckId);
          return; // Ne pas débloquer l'affichage, on redirige
        }
      }

      // Débloquer l'affichage si la session n'est pas terminée
      setIsCheckingSession(false);
    };

    checkSessionStatus();
  }, [effectiveCheckId, navigate]);

  // 🎯 NOUVEAU: Mettre à jour les URLs des photos après upload
  useEffect(() => {
    const updatePhotoUrls = () => {
      setCapturedPhotosData(prevData => {
        const updatedData = new Map(prevData);
        let hasUpdates = false;

        for (const [taskId, photos] of updatedData.entries()) {
          const updatedPhotos = photos.map(photo => {
            const uploadedUrl = imageUploadService.getUploadedUrl(photo.id);
            
            // Mise à jour seulement si une nouvelle URL est disponible
            if (uploadedUrl && uploadedUrl !== photo.dataUrl) {
              hasUpdates = true;
              return { ...photo, dataUrl: uploadedUrl };
            }
            return photo;
          });

          if (JSON.stringify(updatedPhotos) !== JSON.stringify(photos)) {
            updatedData.set(taskId, updatedPhotos);
          }
        }

        return hasUpdates ? updatedData : prevData;
      });
    };

    // Vérifier une seule fois au montage, puis toutes les 5 secondes
    updatePhotoUrls();
    const intervalId = setInterval(updatePhotoUrls, 5000);
    
    return () => clearInterval(intervalId);
  }, [getDisplayUrl]);

  // 🎯 NOUVEAU: Mesure dynamique de la hauteur du bandeau fixe
  useEffect(() => {
    const measureBottomBanner = () => {
      if (bottomBannerRef.current) {
        const bannerHeight = bottomBannerRef.current.offsetHeight;
        const extraPadding = 16;
        const totalPadding = bannerHeight + extraPadding;
        
        // Mise à jour seulement si la hauteur a changé
        if (Math.abs(totalPadding - bottomPadding) > 5) {
          setBottomPadding(totalPadding);
        }
      }
    };

    // Mesurer immédiatement
    measureBottomBanner();

    // Mesurer après un délai pour s'assurer que le DOM est stable
    const timeoutId = setTimeout(measureBottomBanner, 100);

    // Mesurer lors du redimensionnement
    const handleResize = () => measureBottomBanner();
    window.addEventListener('resize', handleResize);

    // Observer les changements dans le bandeau (contenu dynamique)
    const observer = new MutationObserver(measureBottomBanner);
    if (bottomBannerRef.current) {
      observer.observe(bottomBannerRef.current, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [bottomPadding, currentPiece, syncedCurrentTask]); // Dépendances pour re-mesurer quand le contenu change

  // ✅ SUPPRIMÉ: L'initialisation se fait maintenant automatiquement dans useNavigationManager
  
  // Debug: Log des données de pièce quand une pièce est sélectionnée
  useEffect(() => {
    if (currentPieceId && globalRooms.length > 0) {
      const roomData = globalRooms.find(room => room.id === currentPieceId);
      const roomTasks = roomData?.tasks || [];
      console.log('🏠 Données de la pièce sélectionnée:', { 
        pieceId: currentPieceId, 
        roomData, 
        tasksCount: roomTasks.length
      });
      
      // Log spécifique pour les images de référence
      const photoTasks = roomTasks.filter(task => 
        task.type === 'photo_multiple' || task.type === 'photo_optional' || task.photo_references || task.photo_reference
      );
      console.log('📸 Tâches avec photos de référence:', photoTasks);
      photoTasks.forEach(task => {
        console.log(`📷 Tâche ${task.id}:`, {
          type: task.type,
          label: task.label,
          photoReferences: task.photo_references?.length || 0,
          photoReference: task.photo_reference ? 'oui' : 'non',
          urls: task.photo_references?.map(ref => ref.url) || (task.photo_reference ? [task.photo_reference.url] : [])
        });
      });
    }
  }, [currentPieceId, globalRooms]);

  // 🎯 FIX: REMOVED automatic redirect to exit questions
  // This was causing unwanted redirects while users were still working on checkout tasks
  // Users should manually navigate to exit questions via the "Terminer" button
  // The handleFinishCheckout function (line ~931) already handles navigation when user clicks finish

  // ✅ SUPPRIMÉ: Les calculs dynamicPieces, currentPiece, etc. sont maintenant dans useNavigationManager

  // ✅ NOUVEAU: Récupérer les vrais signalements pour la pièce courante (utilisateur + API)
  const currentRoomSignalements = useMemo(() => {
    if (!currentPiece?.nom || !currentPiece?.id) return [];

    // Récupérer les signalements utilisateur par nom de pièce
    const userSignalements = getSignalementsByRoom(currentPiece.nom);

    // ✅ NOUVEAU: Récupérer les signalements API par ID de pièce
    const apiSignalements = getApiSignalementsByRoom(currentPiece.id);

    // Combiner les deux sources
    const allSignalements = [...userSignalements, ...apiSignalements];

    console.log('🚨 Signalements pour la pièce:', {
      pieceName: currentPiece.nom,
      pieceId: currentPiece.id,
      userSignalementsCount: userSignalements.length,
      apiSignalementsCount: apiSignalements.length,
      totalCount: allSignalements.length,
      signalements: allSignalements.map(s => ({
        id: s.id,
        titre: s.titre,
        origine: s.origine,
        priorite: s.priorite
      }))
    });

    return allSignalements;
  }, [currentPiece?.nom, currentPiece?.id, getSignalementsByRoom, getApiSignalementsByRoom]);

  // ✅ SUPPRIMÉ: syncedCurrentTask est maintenant calculé dans useNavigationManager
  
  // Debug: Log de la tâche courante (avec transformation photo_optional -> photo_required en mode checkout)
  // console.log('📋 Tâche courante (nouveau workflow):', {
  //   actualCurrentPieceId,
  //   actualCurrentTaskIndex,
  //   currentPiece: currentPiece?.id,
  //   totalTasks: currentPiece?.checkoutTasks?.length || 0,
  //   availablePieceIds: dynamicPieces.map(p => p.id),
  //   syncedCurrentTask: syncedCurrentTask ? {
  //     id: syncedCurrentTask.id,
  //     type: syncedCurrentTask.type,
  //     label: syncedCurrentTask.label,
  //     isPhotoTask: syncedCurrentTask.isPhotoTask,
  //     isCompleted: syncedCurrentTask.isCompleted,
  //     hasPhotoReference: !!syncedCurrentTask.photo_reference,
  //     hasPhotoReferences: !!syncedCurrentTask.photo_references,
  //     photoReferencesCount: syncedCurrentTask.photo_references?.length || 0
  //   } : null
  // });
  // ✅ SUPPRIMÉ: totalTasks, stepNumber, totalSteps sont maintenant dans navigationManager
  // ✅ SUPPRIMÉ: handleTabClick n'est plus utilisé car les onglets sont dans RoomTaskCard
  // 🚀 NOUVEAU: Utilise le handler du CheckoutFlowManager avec CheckID
  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    console.log('🔔 handleTaskComplete appelé:', { taskId, completed, pieceId: currentPiece?.id });

    if (completed) {
      // 🎯 FIX: Différencier entre checkbox et button-click tasks
      const taskType = syncedCurrentTask?.type;

      try {
        if (taskType === 'checkbox') {
          // Pour les tâches checkbox: sauvegarder dans checkboxStates
          console.log('💾 Sauvegarde checkbox task:', {
            checkboxId: `checkbox_${taskId}`,
            taskId,
            pieceId: currentPiece?.id,
            taskType
          });

          await interactionTracker.trackCheckboxChange({
            checkboxId: `checkbox_${taskId}`,
            taskId,
            pieceId: currentPiece?.id || '',
            etapeId: syncedCurrentTask?.etapeID || taskId,
            isChecked: true,
            checkedAt: new Date().toISOString()
          });
          console.log('✅ Checkbox task sauvegardée dans checkboxStates:', taskId);
        } else {
          // Pour toutes les autres tâches (button-click): sauvegarder dans buttonClicks
          console.log('💾 Sauvegarde button-click task:', {
            buttonId: taskId,
            taskId,
            pieceId: currentPiece?.id,
            taskType,
            etapeId: syncedCurrentTask?.etapeID
          });

          await interactionTracker.trackButtonClick({
            buttonId: taskId,
            pieceId: currentPiece?.id || '',
            taskId,
            etapeId: syncedCurrentTask?.etapeID || taskId,
            actionType: 'complete',
            timestamp: new Date().toISOString(),
            metadata: {
              page: 'checkout',
              taskType: taskType || 'unknown',
              pieceName: currentPiece?.nom || '',
              completed: true,
              checkId: currentCheckId
            }
          });
          console.log('✅ Button-click task sauvegardée dans buttonClicks:', taskId);
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde task completion:', error);
      }

      // 🎯 NOUVEAU: Marquer la tâche comme complétée dans le flow manager
      checkoutFlow.completeCurrentTask();

      // 🚀 NOUVEAU: Navigation automatique vers la tâche suivante
      setTimeout(() => {
        checkoutFlow.goToNextTask();
      }, 500);
    } else {
      // 🎯 Retirer la completion
      const taskType = syncedCurrentTask?.type;

      try {
        if (taskType === 'checkbox') {
          await interactionTracker.trackCheckboxChange({
            checkboxId: `checkbox_${taskId}`,
            taskId,
            pieceId: currentPiece?.id || '',
            etapeId: syncedCurrentTask?.etapeID || taskId,
            isChecked: false,
            uncheckedAt: new Date().toISOString()
          });
          console.log('✅ Checkbox task retirée de checkboxStates:', taskId);
        } else {
          // Pour button-click tasks, on pourrait implémenter une logique de "uncomplete"
          // Pour l'instant, on log juste
          console.log('⚠️ Uncomplete pour button-click task non implémenté:', taskId);
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde uncomplete:', error);
      }
    }
  };
  // 🚀 NOUVEAU: Gestion photos avec CheckoutFlowManager
  const handleTakePhoto = async (taskId: string) => {
    console.log('📸 CheckOut: handleTakePhoto appelé pour tâche:', taskId);
    console.log('🔍 CheckOut: État actuel pour photo:', {
      taskId,
      syncedCurrentTask: !!syncedCurrentTask,
      currentPiece: !!currentPiece,
      isPhotoCaptureOpen,
      photoReferences: syncedCurrentTask?.photo_references?.length || 0
    });
    
    // 🎯 NOUVEAU: Sauvegarder l'intention de prendre une photo
    try {
      await saveButtonClick(
        `photo_intent_${taskId}`,
        currentPiece?.id || '',
        actualCurrentTaskIndex,
        'photo_intent',
        {
          page: 'checkout',
          taskType: syncedCurrentTask?.type || 'unknown',
          pieceName: currentPiece?.nom || '',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ CheckOut: Intention photo sauvegardée dans CheckID:', taskId);
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde intention photo:', error);
    }
    
    // 1. Naviguer vers la tâche si elle n'est pas déjà sélectionnée
    const pieceWithTask = dynamicPieces.find(piece => 
      piece.tasks.some(task => task.id === taskId)
    );
    
    if (pieceWithTask) {
      const taskIndex = pieceWithTask.tasks.findIndex(task => task.id === taskId);
      console.log('🎯 Navigation vers:', { pieceId: pieceWithTask.id, taskIndex });

      // Naviguer vers cette pièce et cette tâche
      checkoutFlow.jumpToPiece(pieceWithTask.id, taskIndex);
      
      // 🎯 MODIFIÉ: Ne pas return ici, continuer pour ouvrir le modal
    }
    
    // Vérifier que nous avons une tâche avec des photos de référence
    const currentTask = currentPiece?.tasks?.find(task => task.id === taskId);

    // ✅ CORRECTION: Accepter AUSSI les tâches TODO avec photo_reference (singulier)
    const hasPhotoReferences = currentTask?.photo_references && currentTask.photo_references.length > 0;
    const hasSinglePhotoReference = currentTask?.photo_reference;

    console.log('🔍 CheckOut: Vérification photo références:', {
      currentTask: !!currentTask,
      hasPhotoReferences,
      hasSinglePhotoReference: !!hasSinglePhotoReference,
      photoReferencesLength: currentTask?.photo_references?.length || 0,
      taskType: currentTask?.type
    });

    if (hasPhotoReferences || hasSinglePhotoReference) {
      console.log(`📷 Ouverture du modal photo pour ${currentPiece?.nom}`, {
        taskId,
        pieceId: currentPiece?.id,
        photosCount: hasPhotoReferences ? currentTask.photo_references.length : 1,
        isTodoWithPhoto: !!hasSinglePhotoReference
      });

      setIsPhotoCaptureOpen(true);
    } else {
      console.warn('⚠️ Aucune photo de référence trouvée pour cette tâche');
      alert('Aucune photo de référence disponible pour cette pièce.');
    }
  };
  // ✅ SUPPRIMÉ: navigateToNext et navigateToPrevious sont maintenant dans navigationManager
  const handleReportProblem = () => {
    openReportModal(currentPiece?.nom);
  };
  const handleGoBack = async () => {
    console.log('🏠 CheckOut: Navigation retour - Début sauvegarde complète');
    
    // 🎯 VALIDATION CRITIQUE: S'assurer qu'on est bien dans le contexte CheckOut
    const currentPath = location.pathname;
    if (!currentPath.includes('/checkout')) {
      console.error('❌ CheckOut: handleGoBack appelé depuis une page non-CheckOut:', currentPath);
      console.error('   → Ceci indique un problème de contexte ou de routing');
      return;
    }
    
    console.log('✅ CheckOut: Validation contexte OK - Navigation depuis CheckOut vers CheckOut-Home');

    // 🎯 ÉTAPE 1: Sauvegarder la progression AVANT la navigation
    try {
      await checkoutFlow.saveProgressToCheckId(
        actualCurrentPieceId,
        actualCurrentTaskIndex
      );
      console.log('💾 CheckOut: Progression sauvegardée avant navigation Home:', {
        pieceId: actualCurrentPieceId,
        taskIndex: actualCurrentTaskIndex,
        pieceName: currentPiece?.nom
      });
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde progression:', error);
      // Ne pas bloquer la navigation en cas d'erreur
    }

    // 🎯 ÉTAPE 2: Sauvegarder l'état complet des photos capturées
    try {
      if (capturedPhotosData.size > 0) {
        console.log('📸 CheckOut: Sauvegarde état photos avant navigation:', {
          totalPhotos: Array.from(capturedPhotosData.values()).flat().length,
          piecesWithPhotos: capturedPhotosData.size
        });
        
        // S'assurer que toutes les photos sont bien sauvegardées
        for (const [pieceId, photos] of capturedPhotosData.entries()) {
          for (const photo of photos) {
            try {
              await savePhotoTaken(
                photo.taskId,
                pieceId,
                photo.dataUrl,
                {
                  url: photo.dataUrl,
                  timestamp: photo.timestamp,
                  metadata: photo.metadata
                }
              );
            } catch (photoError) {
              console.error('❌ CheckOut: Erreur sauvegarde photo:', photoError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde photos:', error);
    }

    // 🎯 ÉTAPE 3: Sauvegarder l'état des tâches complétées
    try {
      const completedTasksCount = checkoutFlow.pieces.reduce((sum, piece) =>
        sum + (piece.tasks?.filter(t => t.completed).length || 0), 0
      );
      const totalTasksCount = checkoutFlow.pieces.reduce((sum, piece) => 
        sum + (piece.tasks?.length || 0), 0
      );

      console.log('✅ CheckOut: État des tâches avant navigation:', {
        completedTasks: completedTasksCount,
        totalTasks: totalTasksCount,
        progressPercentage: checkoutFlow.totalProgress
      });
    } catch (error) {
      console.error('❌ CheckOut: Erreur calcul état tâches:', error);
    }

    // 🎯 ÉTAPE 4: Sauvegarder l'action de retour avec contexte complet
    try {
      await saveButtonClick(
        'checkout_go_back',
        currentPiece?.id || '',
        actualCurrentTaskIndex,
        'navigation_back',
        {
          page: 'checkout',
          fromPiece: currentPiece?.nom,
          fromPieceId: actualCurrentPieceId,
          fromTaskIndex: actualCurrentTaskIndex,
          totalPhotos: Array.from(capturedPhotosData.values()).flat().length,
          completedTasks: checkoutFlow.pieces.reduce((sum, piece) =>
            sum + (piece.tasks?.filter(t => t.completed).length || 0), 0
          ),
          totalTasks: checkoutFlow.pieces.reduce((sum, piece) => 
            sum + (piece.tasks?.length || 0), 0
          ),
          progressPercentage: checkoutFlow.totalProgress,
          timestamp: new Date().toISOString(),
          navigationContext: 'home_button_click'
        }
      );
      console.log('✅ CheckOut: Action retour sauvegardée dans CheckID avec contexte complet');
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde action retour:', error);
    }

    // 🎯 ÉTAPE 5: Sauvegarder le chemin de navigation pour restauration
    try {
      const { interactionTracker } = await import('@/services/interactionTracker');
      await interactionTracker.trackPagePath('/checkout-home');
      console.log('📍 CheckOut: Chemin de navigation sauvegardé');
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde chemin:', error);
    }

    // 🎯 ÉTAPE 6: Vérification de cohérence avant navigation
    const urlParams = new URLSearchParams(window.location.search);
    const currentCheckId = urlParams.get('checkid') || effectiveCheckId;
    const currentParcours = urlParams.get('parcours');
    
    if (!currentCheckId) {
      console.warn('⚠️ CheckOut: Aucun checkId trouvé pour la navigation - Tentative de récupération');
      // Tenter de récupérer depuis localStorage
      const activeCheckId = localStorage.getItem('activeCheckId');
      if (activeCheckId) {
        console.log('🔄 CheckOut: CheckId récupéré depuis localStorage:', activeCheckId);
      }
    }

    console.log('🧭 CheckOut: Navigation vers /checkout-home avec préservation complète:', {
      checkId: currentCheckId,
      parcours: currentParcours,
      fromPage: '/checkout',
      preservedState: {
        pieceId: actualCurrentPieceId,
        taskIndex: actualCurrentTaskIndex,
        photosCount: Array.from(capturedPhotosData.values()).flat().length,
        progressPercentage: checkoutFlow.totalProgress
      }
    });

    // 🎯 ÉTAPE 7: Naviguer en préservant les paramètres vers la page d'accueil du checkout
    const targetPath = '/checkout-home';
    console.log('🎯 CheckOut: Navigation finale confirmée vers:', targetPath);
    console.log('   → Depuis CheckOut (/checkout) vers CheckOut Home (/checkout-home)');
    navigatePreservingParams(navigate, targetPath, currentCheckId);
  };

  const handleCheckCompletion = async () => {
    console.log('🏁 CheckOut: Vérification de l\'état d\'avancement pour completion');
    
    // 🎯 Vérifier si TOUS les TODOs de TOUTES les pièces sont terminés
    const totalTasks = checkoutFlow.pieces.reduce((sum, piece) => sum + (piece.tasks?.length || 0), 0);
    const completedTasks = checkoutFlow.pieces.reduce((sum, piece) =>
      sum + (piece.tasks?.filter(t => t.completed).length || 0), 0
    );
    const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

    console.log('📊 État d\'avancement:', {
      completedTasks,
      totalTasks,
      allTasksCompleted,
      progressPercentage: checkoutFlow.totalProgress
    });

    if (allTasksCompleted) {
      // ✅ Tout est terminé → Vérifier s'il y a des questions de sortie
      console.log('✅ Tous les TODOs terminés');

      // 🎯 Vérifier s'il y a des questions de sortie dans le parcours
      const hasExitQuestions = currentParcours?.rawData?.questionSortie &&
                               Array.isArray(currentParcours.rawData.questionSortie) &&
                               currentParcours.rawData.questionSortie.length > 0;

      if (hasExitQuestions) {
        // ✅ Il y a des questions de sortie → Naviguer vers la page des questions
        console.log('📋 Questions de sortie détectées, navigation vers exit-questions');
        navigatePreservingParams(navigate, '/exit-questions', currentCheckId);
      } else {
        // ❌ Pas de questions de sortie → Envoyer le webhook directement
        console.log('ℹ️ Pas de questions de sortie, envoi du webhook...');

        // Envoyer le webhook avec toutes les données
        (async () => {
          // Afficher un toast de chargement
          const loadingToast = toast.loading('📤 Envoi du rapport en cours...');

          try {
            const { debugService } = await import('@/services/debugService');
            const webhookResult = await debugService.sendUnifiedWebhook();

            if (webhookResult.success) {
              console.log('✅ CheckOut: Webhook envoyé avec succès');

              // 🏁 Marquer la session comme terminée et sauvegarder le rapportID
              if (currentCheckId) {
                const { checkSessionManager } = await import('@/services/checkSessionManager');
                await checkSessionManager.terminateCheckSession(currentCheckId, webhookResult.rapportID);
                console.log('🏁 Session terminée avec rapportID:', webhookResult.rapportID);

                // ⏱️ Attendre un peu pour s'assurer que tout est bien sauvegardé
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              toast.dismiss(loadingToast);
              toast.success('✅ Rapport envoyé avec succès !');

              // ⏱️ Attendre un peu avant de naviguer pour que l'utilisateur voie le message
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error('❌ CheckOut: Erreur webhook:', webhookResult.error);
              toast.dismiss(loadingToast);
              toast.warning('Checkout terminé, mais erreur lors de l\'envoi du rapport');
            }
          } catch (webhookError) {
            console.error('❌ CheckOut: Erreur envoi webhook:', webhookError);
            toast.dismiss(loadingToast);
            toast.warning('Checkout terminé, mais erreur lors de l\'envoi du rapport');
          }

          // Retourner à la page d'accueil du checkout
          navigatePreservingParams(navigate, '/checkout-home', currentCheckId);
        })();
      }
    } else {
      // ❌ Il reste des TODOs → Retourner à la page d'accueil du checkout
      console.log('⚠️ Il reste des TODOs, navigation vers checkout-home');
      navigatePreservingParams(navigate, '/checkout-home', currentCheckId);
    }
  };



  // 🚀 NOUVEAU: Simplifié grâce au navigation manager
  const handlePieceSelected = (pieceId: string) => {
    // Use custom handler if provided, otherwise use default navigation
    if (onPieceSelected) {
      onPieceSelected(pieceId);
      return;
    }

    // Analytics tracking
    if (typeof window !== 'undefined' && (window as unknown as { analytics?: { track: (event: string, data: Record<string, string>) => void } }).analytics) {
      (window as unknown as { analytics: { track: (event: string, data: Record<string, string>) => void } }).analytics.track('piece_opened', {
        piece_id: pieceId
      });
    }

    // ✅ SIMPLIFIÉ: Le CheckoutFlowManager gère toute la logique !
    checkoutFlow.jumpToPiece(pieceId);
  };

  const handlePhotosCaptured = async (capturedPhotos: CapturedPhoto[]) => {
    console.log('📸 CheckOut: Photos capturées reçues:', capturedPhotos.length);

    // Stocker les photos capturées avec l'ID de la tâche
    if (syncedCurrentTask && capturedPhotos.length > 0) {
      const uniquePieceId = actualCurrentPieceId;

      console.log(`💾 CheckOut: Stockage photos avec IDs uniques:`, {
        pieceId: uniquePieceId,
        photosCount: capturedPhotos.length,
        pieceName: currentPiece?.nom,
        photoIds: capturedPhotos.map(p => p.id)
      });

      // 🎯 CORRECTION CRITIQUE: Stocker toutes les photos ensemble
      // Utiliser l'ID de la première photo comme clé de groupe
      const groupKey = `${uniquePieceId}_${capturedPhotos[0].id}`;

      setCapturedPhotosData(prev => {
        const newMap = new Map(prev);
        newMap.set(groupKey, capturedPhotos);
        console.log('📸 CheckOut: Photos stockées avec clé de groupe:', groupKey);
        return newMap;
      });

      // 🎯 CORRECTION CRITIQUE: Upload et sauvegarde avec l'etapeID SPÉCIFIQUE de chaque photo
      try {
        console.log('🚀 CheckOut: Démarrage upload automatique...');

        for (const photo of capturedPhotos) {
          // 🎯 CORRECTION: Utiliser photo.id qui contient l'etapeID de la photo de référence
          const photoEtapeId = photo.id;  // ✅ Chaque photo a son propre etapeID !
          const uniqueTaskKey = `${uniquePieceId}_${photoEtapeId}`;

          console.log(`📤 CheckOut: Upload photo avec etapeID spécifique:`, {
            photoId: photo.id,
            etapeId: photoEtapeId,
            taskKey: uniqueTaskKey
          });

          // 🚀 Upload automatique vers l'API avec l'etapeID spécifique
          await uploadCapturedPhoto(photo, {
            taskId: uniqueTaskKey,
            checkId: currentCheckId || undefined,
            pieceId: uniquePieceId,
            etapeId: photoEtapeId,  // ✅ Utiliser l'etapeID de CETTE photo
            taskIndex: actualCurrentTaskIndex
          });

          // 🎯 FIX CRITIQUE: Sauvegarder dans IndexedDB avec l'etapeID spécifique
          await savePhotoTaken(
            uniqueTaskKey,           // taskId (clé unique pieceId_etapeId)
            uniquePieceId || '',     // pieceId
            photo.dataUrl,           // photoData (base64 string)
            {
              photoId: photo.id || `photo_${Date.now()}`,
              etapeId: photoEtapeId,  // ✅ Utiliser l'etapeID de CETTE photo
              taskIndex: actualCurrentTaskIndex,
              metadata: photo.metadata,
              timestamp: new Date().toISOString(),
              page: 'checkout',
              pieceName: currentPiece?.nom || ''
            }
          );
        }
        
        console.log('✅ CheckOut: Photos uploadées et sauvegardées dans CheckID:', capturedPhotos.length);
      } catch (error) {
        console.error('❌ CheckOut: Erreur upload/sauvegarde photos:', error);
        // Ne pas bloquer l'utilisateur en cas d'erreur d'upload
      }
    }
    
    // Fermer le modal
    setIsPhotoCaptureOpen(false);

    // Marquer comme photo retaken
    setValidationMode('photos_retaken');

    if (capturedPhotos.length > 0 && syncedCurrentTask) {
      // Marquer la tâche comme complétée
      await handleTaskComplete(syncedCurrentTask.id, true);
      console.log('✅ Tâche photos de référence marquée comme complétée');

      // 🎯 NOUVEAU: Marquer la tâche comme complétée dans le flow manager
      checkoutFlow.completeCurrentTask();

      // 🚀 NOUVEAU: Navigation automatique vers la tâche suivante
      console.log('🚀 CheckOut: Navigation automatique vers la tâche suivante...');
      setTimeout(() => {
        checkoutFlow.goToNextTask();
      }, 500); // Petit délai pour voir l'effet visuel
    }
  };

  // 🚀 NOUVEAU: Handlers pour validation avec CheckoutFlowManager
  const handleValidatePiece = async (taskId: string) => {
    // 🎯 CRITIQUE: Sauvegarder dans checkboxStates pour la restauration
    try {
      await interactionTracker.trackCheckboxChange({
        checkboxId: `checkbox_${taskId}`,
        taskId,
        pieceId: currentPiece?.id || '',
        isChecked: true,
        checkedAt: new Date().toISOString()
      });
      console.log('✅ Validation sauvegardée dans checkboxStates:', taskId);
    } catch (error) {
      console.error('❌ Erreur sauvegarde validation checkbox:', error);
    }

    // Marquer la tâche comme validée
    setValidationMode('validated');

    // 🆕 FIX: Mettre à jour l'état de la pièce dans IndexedDB
    if (currentPiece?.id) {
      try {
        await updatePieceStatus(currentPiece.id, 'validated', 100);
      } catch (error) {
        console.error('❌ Erreur mise à jour état pièce:', error);
      }
    }

    // 🎯 NOUVEAU: Marquer la tâche comme complétée dans le flow manager
    checkoutFlow.completeCurrentTask();

    // 🚀 NOUVEAU: Navigation automatique vers la tâche suivante
    setTimeout(() => {
      checkoutFlow.goToNextTask();
    }, 500);
  };

  const handleRetakePhotos = (taskId: string) => {
    console.log(`📸 Reprise des photos: ${taskId}`);
    
    // 🎯 CORRECTION: Utiliser syncedCurrentTask au lieu de chercher dans currentPiece.tasks
    // syncedCurrentTask contient les données actuelles et correctes
    const currentTask = syncedCurrentTask?.id === taskId ? syncedCurrentTask : currentPiece?.tasks?.find(task => task.id === taskId);
    
    // ✅ CORRECTION: Accepter AUSSI les tâches TODO avec photo_reference (singulier)
    const hasPhotoReferences = currentTask?.photo_references && currentTask.photo_references.length > 0;
    const hasSinglePhotoReference = currentTask?.photo_reference;
    
    console.log('🔍 CheckOut: Vérification photo références:', {
      currentTask: !!currentTask,
      usedSyncedTask: syncedCurrentTask?.id === taskId,
      hasPhotoReferences,
      hasSinglePhotoReference: !!hasSinglePhotoReference,
      photoReferencesLength: currentTask?.photo_references?.length || 0,
      taskType: currentTask?.type,
      taskId
    });
    
    if (hasPhotoReferences || hasSinglePhotoReference) {
      console.log(`📷 Ouverture du modal photo pour ${currentPiece?.nom}`, {
        taskId,
        pieceId: currentPiece?.id,
        photosCount: hasPhotoReferences ? currentTask.photo_references.length : 1,
        isTodoWithPhoto: !!hasSinglePhotoReference
      });
      
      setIsPhotoCaptureOpen(true);
    } else {
      console.warn('⚠️ Aucune photo de référence trouvée pour cette tâche');
      console.error('🐛 Debug info:', {
        syncedCurrentTask: syncedCurrentTask ? {
          id: syncedCurrentTask.id,
          type: syncedCurrentTask.type,
          hasPhotoReferences: !!syncedCurrentTask.photo_references,
          hasPhotoReference: !!syncedCurrentTask.photo_reference
        } : 'null',
        currentPieceTasks: currentPiece?.tasks?.length || 0
      });
      alert('Aucune photo de référence disponible pour cette pièce.');
    }
  };

  // Callback pour fermer le modal photo
  const handlePhotoCaptureClose = () => {
    console.log('❌ Modal photo fermé sans capture');
    setIsPhotoCaptureOpen(false);
  };

  // 🏁 Afficher un écran de chargement pendant la vérification
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification du parcours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto relative">
      {/* Header avec fil d'Ariane - Modernisé */}
      <div className="sticky top-0 z-50 bg-glass-bg/95 backdrop-blur-xl border-b border-white/20 shadow-elegant">
        <div className="flex items-center justify-between py-2 px-4 bg-background">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="hover:bg-white/20 transition-all duration-300 hover:scale-105">
            <Home className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex justify-center px-4 relative">
            <div className="flex items-center gap-2">
              <PieceSelector
                pieces={checkoutFlow.pieces}
                currentPieceId={actualCurrentPieceId}
                onPieceSelected={handlePieceSelected}
                signalements={getPendingSignalements().length}
                currentTasks={currentPiece?.checkoutTasks}
                currentTaskIndex={actualCurrentTaskIndex}
                completedTasks={(() => {
                  // Extract completed tasks from all pieces
                  const completedTasksObj: Record<string, boolean> = {};
                  checkoutFlow.pieces.forEach(piece => {
                    piece.tasks?.forEach(task => {
                      if (task.completed) {
                        completedTasksObj[task.id] = true;
                      }
                    });
                  });
          // console.log('🐛 DEBUG completedTasks passés à PieceSelector:', {
          //   completedTasksObj,
          //   currentPiece: currentPiece?.nom,
          //   currentPieceTasks: currentPiece?.checkoutTasks?.map(t => ({ id: t.id, label: t.label }))
          // });
                  return completedTasksObj;
                })()}
                onTaskSelected={(pieceId, taskIndex) => {
                  console.log('📋 CheckOut: Navigation vers tâche depuis PieceSelector', { pieceId, taskIndex });
                  checkoutFlow.jumpToPiece(pieceId, taskIndex);
                }}
                customGetPieceProgress={async (pieceId) => {
                  const result = await checkoutFlow.getPieceProgress(pieceId);
                  console.log('🎯 CheckOut: customGetPieceProgress depuis CheckID Database pour', pieceId, result);
                  return result;
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {syncedCurrentTask && (
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20 text-primary animate-scale-in">
                Étape {actualCurrentTaskIndex + 1}/{currentPiece?.tasks?.length || 0}
              </Badge>
            )}
            <div className="transition-transform duration-300 hover:scale-105">
              <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
            </div>
          </div>
        </div>
        
        {/* Fil d'Ariane amélioré - simplifié */}
        <div className="px-4 pb-3 bg-background">
          <div className="flex items-center justify-center gap-2 text-sm flex-nowrap">
            <div className="flex items-center gap-2">
              {/* Contenu simplifié */}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 py-2" style={{ paddingBottom: `${bottomPadding}px` }}>
        {/* ✅ SUPPRIMÉ: Les onglets Info ménage/Info pièce sont maintenant gérés par RoomTaskCard */}



        {/* Task Card avec comparaison photo unifiée */}
        {syncedCurrentTask ? (() => {
            // 🎯 DEBUG: Log des données passées à RoomTaskCard
            console.log('📋 CheckOut: Passage de données à RoomTaskCard:', {
              pieceId: currentPiece?.id,
              pieceNom: currentPiece?.nom,
              cleaningInfo: currentPiece?.cleaningInfo?.substring(0, 50) + '...',
              roomInfo: currentPiece?.roomInfo?.substring(0, 50) + '...',
              hasCleaningInfo: !!currentPiece?.cleaningInfo,
              hasRoomInfo: !!currentPiece?.roomInfo
            });

            // Affichage avec comparaison photo pour les tâches photo, sinon TaskCard simple
            return ['photo_multiple', 'photo_required', 'photo_validation', 'reference_photos'].includes(syncedCurrentTask.type) ? (
              <RoomTaskCard
                task={syncedCurrentTask}
                taskIndex={actualCurrentTaskIndex}
                totalTasks={currentPiece?.tasks?.length || 0}
                onValidatePiece={handleValidatePiece}
                onRetakePhotos={handleRetakePhotos}
                capturedPhotos={(() => {
                  // 🎯 NOUVEAU: Utiliser la clé unique pieceId_etapeId
                  const uniqueTaskKey = `${actualCurrentPieceId}_${syncedCurrentTask.id}`;
                  const photos = capturedPhotosData.get(uniqueTaskKey) || [];
                  // 🎯 Log simple pour debug
                  if (photos.length > 0) {
                    console.log('📸 CheckOut: Photos pour tâche:', {
                      taskId: syncedCurrentTask.id,
                      photosCount: photos.length,
                      hasUrls: photos.filter(p => p.dataUrl && p.dataUrl !== '').length
                    });
                  }

                  // 🎯 DIAGNOSTIC: Vérifier si les photos ont des URLs valides
                  if (photos.length > 0 && photos.some(p => !p.dataUrl || p.dataUrl === '')) {
                    console.log('⚠️ CheckOut: Photos sans URLs détectées:', {
                      taskId: syncedCurrentTask.id,
                      photosWithoutUrls: photos.filter(p => !p.dataUrl || p.dataUrl === '').length,
                      totalPhotos: photos.length
                    });
                  }

                  return photos;
                })()}
                onReportProblem={handleReportProblem}
                cleaningInfo={currentPiece?.cleaningInfo}
                roomInfo={currentPiece?.roomInfo}
                // 🎯 AJOUT: Champs originaux de l'API
                travelerNote={currentPiece?.travelerNote}
                cleanerNote={currentPiece?.cleanerNote}
                infoEntrance={currentPiece?.infoEntrance}
                validationMode={validationMode}
                signalements={currentRoomSignalements}
                isSignalementsOpen={isSignalementsOpen}
                onSignalementsOpenChange={setIsSignalementsOpen}
                isCheckoutMode={true}
                hideBottomActions={true} // 🎯 NOUVEAU: Cacher les boutons car ils sont dans le bandeau fixe
              />
            ) : (
              <TaskCard
                task={syncedCurrentTask}
                taskIndex={actualCurrentTaskIndex}
                totalTasks={currentPiece?.tasks?.length || 0}
                onTaskComplete={handleTaskComplete}
                onTakePhoto={handleTakePhoto}
              />
            );
          })() : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune tâche disponible pour cette pièce</p>
          </div>
        )}

        {/* Affichage des photos capturées */}
        {syncedCurrentTask?.type === 'photo_multiple' && syncedCurrentTask.isCompleted && (
          <div className="mt-6 space-y-3">
            <h5 className="font-medium text-foreground">
              ✅ Photos capturées
            </h5>
            <div className="space-y-4 animate-slide-up">
              <div className="text-center py-4">
                <h3 className={`text-lg font-semibold mb-2 ${
                  syncedCurrentTask.isCompleted 
                    ? 'text-green-600' 
                    : 'text-foreground'
                }`}>
                  {syncedCurrentTask.isCompleted ? '✅ ' : '📸 '}
                  {syncedCurrentTask.label}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {syncedCurrentTask.isCompleted 
                    ? `Toutes les photos ont été capturées avec succès !`
                    : syncedCurrentTask.description
                  }
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="outline">
                    Étape {actualCurrentTaskIndex + 1}/{currentPiece?.tasks?.length || 0}
                  </Badge>
                  {syncedCurrentTask.isCompleted && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Validé
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Grille des photos de référence */}
              {syncedCurrentTask.photo_references && syncedCurrentTask.photo_references.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {syncedCurrentTask.photo_references.map((image, index) => (
                    <div 
                      key={`${image.tache_id}-${index}`}
                      className={`group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-floating transition-all duration-500 cursor-pointer ${
                        syncedCurrentTask.isCompleted 
                          ? 'border-2 border-green-400 bg-green-50' 
                          : 'bg-gradient-subtle border border-white/30 hover:shadow-glow'
                      }`}
                      onClick={() => {
                        setSelectedPhotoUrl(image.url);
                        setIsPhotoZoomModalOpen(true);
                      }}
                    >
                      <img
                        src={image.url}
                        alt={`Photo de référence ${index + 1}`}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          syncedCurrentTask.isCompleted ? 'opacity-90' : ''
                        }`}
                        onError={(e) => {
                          console.error('Erreur chargement image:', image.url);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      
                      {/* Overlay de validation */}
                      {syncedCurrentTask.isCompleted && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className={`absolute bottom-2 left-2 text-white text-xs px-2 py-1 rounded ${
                        syncedCurrentTask.isCompleted ? 'bg-green-600/80' : 'bg-black/50'
                      }`}>
                        {syncedCurrentTask.isCompleted ? '✅ ' : ''}{index + 1}/{syncedCurrentTask.photo_references.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photo de référence pour les tâches simples */}
        {(() => {
          // 🔍 DIAGNOSTIC: Vérifier si la tâche a photo_reference ET photo_references
          if (syncedCurrentTask?.photo_reference) {
            console.log('🔍 Tâche avec photo_reference:', {
              taskId: syncedCurrentTask.id,
              hasPhotoReference: !!syncedCurrentTask.photo_reference,
              hasPhotoReferences: !!syncedCurrentTask.photo_references,
              photoReferencesLength: syncedCurrentTask.photo_references?.length || 0,
              taskType: syncedCurrentTask.type
            });
          }

          // ✅ CORRECTION: Ne PAS afficher si la tâche utilise RoomTaskCard
          // RoomTaskCard affiche déjà la photo de référence pour ces types
          const usesRoomTaskCard = ['photo_multiple', 'photo_required', 'photo_validation', 'reference_photos'].includes(syncedCurrentTask?.type || '');

          if (usesRoomTaskCard) {
            console.log('🚫 Photo de référence déjà affichée par RoomTaskCard, skip');
            return null;
          }

          // ✅ N'afficher que si photo_reference existe ET photo_references n'existe PAS
          if (!syncedCurrentTask?.photo_reference || (syncedCurrentTask.photo_references && syncedCurrentTask.photo_references.length > 0)) {
            return null;
          }

          return (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-foreground">
                  Photo de référence
                </h4>
              </div>
              <div className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border border-white/30 hover:shadow-glow transition-all duration-500 cursor-pointer" onClick={() => {
                setSelectedPhotoUrl(syncedCurrentTask.photo_reference.url);
                setIsPhotoZoomModalOpen(true);
              }}>
                <img
                  src={syncedCurrentTask.photo_reference.url}
                  alt="Photo de référence"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

            {/* Photo prise - affichée sous la photo de référence */}
            {(() => {
              // ✅ CORRECTION: Utiliser la même clé composite que pour le stockage
              const uniquePieceId = actualCurrentPieceId;
              const uniqueEtapeId = syncedCurrentTask.id;
              const uniqueTaskKey = `${uniquePieceId}_${uniqueEtapeId}`;

              // Récupérer la photo capturée pour cette tâche
              const capturedPhotosForTask = capturedPhotosData.get(uniqueTaskKey);
              const capturedPhoto = capturedPhotosForTask?.[0]; // Première photo capturée

              console.log('🔍 Recherche photo capturée:', {
                uniqueTaskKey,
                found: !!capturedPhoto,
                totalKeys: Array.from(capturedPhotosData.keys())
              });

              if (!capturedPhoto) return null;

              return (
                <div className="space-y-2 ml-4 border-l-4 border-green-500 pl-3">
                  <div className="text-sm text-green-700 font-medium">
                    ✅ Nouvelle photo prise
                  </div>
                  <div className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border-2 border-green-500 hover:shadow-glow transition-all duration-500">
                    <img
                      src={capturedPhoto.dataUrl}
                      alt="Photo prise"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        console.error('❌ Erreur chargement photo capturée:', capturedPhoto.id);
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium">
                      ✓ Photo prise
                    </div>
                  </div>
                  <div className="text-xs text-green-600">
                    📸 {new Date(capturedPhoto.takenAt).toLocaleString()}
                  </div>
                </div>
              );
            })()}
            </div>
          );
        })()}

        {/* Photos de référence pour les tâches photo_multiple */}
        {syncedCurrentTask?.type === 'photo_multiple' && syncedCurrentTask?.photo_references && syncedCurrentTask.photo_references.length > 0 && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">
                Photos de référence
              </h4>
            </div>
            <PhotoCarousel photos={syncedCurrentTask.photo_references} />

            {/* Photos prises - affichées sous les photos de référence */}
            {(() => {
              // ✅ CORRECTION: Utiliser la même clé composite que pour le stockage
              const uniquePieceId = actualCurrentPieceId;
              const uniqueEtapeId = syncedCurrentTask.id;
              const uniqueTaskKey = `${uniquePieceId}_${uniqueEtapeId}`;

              // Récupérer les photos capturées pour cette tâche
              const capturedPhotosForTask = capturedPhotosData.get(uniqueTaskKey);

              console.log('🔍 Recherche photos capturées (multiple):', {
                uniqueTaskKey,
                found: capturedPhotosForTask?.length || 0,
                totalKeys: Array.from(capturedPhotosData.keys())
              });

              if (!capturedPhotosForTask || capturedPhotosForTask.length === 0) return null;

              return (
                <div className="space-y-4">
                  <h5 className="font-medium text-foreground text-sm">
                    Vos photos ({capturedPhotosForTask.length})
                  </h5>

                  {/* Afficher chaque photo capturée avec sa référence */}
                  {syncedCurrentTask.photo_references.map((referencePhoto, index) => {
                    // Trouver la photo capturée correspondante
                    const correspondingCaptured = capturedPhotosForTask.find(
                      captured => captured.referencePhotoId === referencePhoto.tache_id
                    ) || capturedPhotosForTask[index];

                    if (!correspondingCaptured) return null;

                    return (
                      <div key={referencePhoto.tache_id || index} className="ml-4 border-l-4 border-green-500 pl-3">
                        <div className="text-sm text-green-700 font-medium mb-2">
                          ✅ Photo {index + 1} prise
                        </div>
                        <div className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border-2 border-green-500 hover:shadow-glow transition-all duration-500">
                          <img
                            src={correspondingCaptured.dataUrl}
                            alt={`Photo capturée ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              console.error('❌ Erreur chargement photo capturée:', correspondingCaptured.id);
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium">
                            ✓ Photo {index + 1}
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          📸 {new Date(correspondingCaptured.takenAt).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bandeau d'actions modernisé avec glassmorphism */}
      <div 
        ref={bottomBannerRef}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background border-t border-border shadow-floating p-3 pb-3 space-y-2 safe-area-inset-bottom animate-slide-up z-50"
      >
        
        {/* Message pour les tâches restantes en mode checkout */}
        {(() => {
          const currentPieceObj = currentPiece;
          const remainingTasks = currentPieceObj?.checkoutTasks?.filter(task => !task.isCompleted) || [];
          const completedTasks = currentPieceObj?.checkoutTasks?.filter(task => task.isCompleted) || [];
          
          return remainingTasks.length > 0 && completedTasks.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Il reste {remainingTasks.length} tâche{remainingTasks.length > 1 ? 's' : ''} à terminer dans cette pièce
                </span>
              </div>
            </div>
          ) : null;
        })()}

        {/* 🎯 NOUVEAU: Organisation des boutons dans un seul container */}
        <div className="flex flex-col gap-3">
          {/* 🎯 NOUVEAU: Vérifier si toutes les tâches sont terminées */}
          {(() => {
            const totalTasks = checkoutFlow.pieces.reduce((sum, piece) => sum + (piece.tasks?.length || 0), 0);
            const completedTasks = checkoutFlow.pieces.reduce((sum, piece) =>
              sum + (piece.tasks?.filter(t => t.completed).length || 0), 0
            );
            const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

            // Si toutes les tâches sont terminées, afficher le bouton "Répondre aux questions"
            if (allTasksCompleted) {
              return (
                <>
                  {/* Message de succès */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center animate-slide-up">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Toutes les tâches sont terminées !</span>
                    </div>
                    <p className="text-sm text-green-700">Passons aux questions de sortie</p>
                  </div>

                  {/* Bouton principal */}
                  <Button
                    variant="cta"
                    onClick={() => {
                      console.log('✅ Navigation vers les questions de sortie');
                      navigatePreservingParams(navigate, '/exit-questions', currentCheckId);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-elegant"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <path d="M12 17h.01"></path>
                    </svg>
                    Répondre aux questions
                  </Button>
                </>
              );
            }

            // Sinon, afficher les boutons normaux
            return (
              <>
                {/* Boutons d'action principaux */}
                <div className="flex gap-2">
                  {/* 🎯 NOUVEAU: Boutons photos depuis RoomTaskCard */}
                  {(syncedCurrentTask?.type === 'photo_required' || syncedCurrentTask?.type === 'photo_multiple' || syncedCurrentTask?.type === 'photo_validation' || syncedCurrentTask?.type === 'reference_photos') && (
                    <>
                      {/* Bouton Reprendre les photos (si photos déjà capturées) */}
                      {capturedPhotosData.get(`${actualCurrentPieceId}_${syncedCurrentTask.id}`)?.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => handleRetakePhotos(syncedCurrentTask.id)}
                          className="flex-1"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          📸 Reprendre les photos
                        </Button>
                      )}

                      {/* Bouton Valider ces photos (si photos déjà capturées) */}
                      {capturedPhotosData.get(`${actualCurrentPieceId}_${syncedCurrentTask.id}`)?.length > 0 ? (
                        <Button
                          variant="cta"
                          onClick={() => handleValidatePiece(syncedCurrentTask.id)}
                          className="flex-1"
                        >
                          Valider ces photos
                        </Button>
                      ) : (
                        /* Bouton Prendre photos (si pas encore de photos) */
                        <Button
                          variant="cta"
                          onClick={() => handleTakePhoto(syncedCurrentTask.id)}
                          className="flex-1"
                        >
                          Prendre photos
                        </Button>
                      )}
                    </>
                  )}

                  {/* Bouton checkbox (pour les tâches non-photo) */}
                  {syncedCurrentTask?.type === 'checkbox' &&
                    <Button
                      variant="cta"
                      onClick={() => handleTaskComplete(syncedCurrentTask.id, true)}
                      disabled={syncedCurrentTask.isCompleted}
                      className={`flex-1 ${syncedCurrentTask.isCompleted ? 'bg-gradient-primary hover:bg-gradient-primary/90 shadow-elegant' : ''}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {syncedCurrentTask.isCompleted ? "✓ Tâche validée" : "Valider tâche"}
                    </Button>
                  }
                </div>
              </>
            );
          })()}

          {/* Ligne des actions secondaires */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReportProblem}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-4"
            >
              Signaler un problème
            </button>
          
          {currentRoomSignalements.length > 0 && (
            <Popover open={isSignalementsOpen} onOpenChange={setIsSignalementsOpen}>
              <PopoverTrigger asChild>
                <button>
                  <Badge 
                    variant="destructive" 
                    className="h-auto w-auto px-2 py-1 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600 transition-colors animate-pulse rounded-full"
                  >
                    ⚠️ : {currentRoomSignalements.length}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Signalements en cours ({currentRoomSignalements.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentRoomSignalements.map((signalement) => (
                      <div key={signalement.id} className="p-2 bg-red-50 rounded-lg border-l-2 border-red-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-800 truncate">
                              {signalement.titre}
                            </p>
                            <p className="text-xs text-red-600 mt-1 line-clamp-2">
                              {signalement.commentaire}
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                              Origine: {signalement.origine}
                            </p>
                          </div>
                          {signalement.priorite && (
                            <div className="flex-shrink-0">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>
          )}
          </div>
        </div>
        
      </div>

      {/* Profile Sheet */}
      <ProfileSheet 
        isOpen={isProfileSheetOpen} 
        onClose={() => setIsProfileSheetOpen(false)} 
        onLogout={logout}
        onOpenHelp={() => {
          setIsProfileSheetOpen(false);
          setIsHelpSheetOpen(true);
        }}
      />

      {/* Help Sheet */}
      <HelpSheet isOpen={isHelpSheetOpen} onClose={() => setIsHelpSheetOpen(false)} />

      {/* Photo Zoom Modal */}
      <PhotoZoomModal
        isOpen={isPhotoZoomModalOpen}
        onClose={() => {
          setIsPhotoZoomModalOpen(false);
          setSelectedPhotoUrl('');
          setSelectedReferenceImage(null);
        }}
        imageUrl={selectedPhotoUrl}
        imageTitle={`Photo de référence - ${currentPiece?.nom || 'Pièce'}`}
      />

      {/* Modal de capture photo */}
      {isPhotoCaptureOpen && syncedCurrentTask && (
        <PhotoCaptureModal
          isOpen={isPhotoCaptureOpen}
          onClose={handlePhotoCaptureClose}
          referencePhotos={
            // ✅ CORRECTION: Accepter photo_references (pluriel) OU photo_reference (singulier pour TODO)
            syncedCurrentTask.photo_references ||
            (syncedCurrentTask.photo_reference ? [syncedCurrentTask.photo_reference] : [])
          }
          onPhotosCaptured={handlePhotosCaptured}
          pieceName={currentPiece?.nom || 'Pièce'}
          pieceId={currentPiece?.id || ''}
          flowType="checkout"  // ✅ AJOUTÉ: Toujours "checkout" dans CheckOut
        />
      )}

      {/* ✅ SUPPRIMÉ: Dialog de continuation - navigation directe maintenant */}
    </div>
  );
};
export default CheckOut;
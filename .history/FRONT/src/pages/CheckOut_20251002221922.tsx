import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Camera, AlertTriangle, HelpCircle, CheckCircle2, Brush, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhotoCaptureModal } from "@/components/PhotoCaptureModal";
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
import { checkSessionManager } from "@/services/checkSessionManager";
import { imageUploadService } from "@/services/imageUploadService";
import { navigatePreservingParams } from "@/utils/navigationHelpers";
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
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);
  const [isSignalementsOpen, setIsSignalementsOpen] = useState(false);
  // ✅ SUPPRIMÉ: showContinueDialog n'est plus nécessaire
  const [capturedPhotosData, setCapturedPhotosData] = useState<Map<string, CapturedPhoto[]>>(new Map());
  const [validationMode, setValidationMode] = useState<'validated' | 'photos_retaken' | null>(null);
  const [bottomPadding, setBottomPadding] = useState(192); // Valeur par défaut (pb-48 = 192px)
  const navigate = useNavigate();
  const notifiedRoomsRef = useRef(new Set<string>());
  const bottomBannerRef = useRef<HTMLDivElement>(null);
  const {
    user,
    logout
  } = useUser();
  const { openReportModal } = useReportProblem();
  const { getSignalementsByRoom, getPendingSignalements } = useSignalements();
  const { rooms: globalRooms, forceCheckoutMode } = useParcoursData();
  const { currentParcours } = useGlobalParcours();
  
  // 🎯 NOUVEAU: Intégration CheckID
  const { currentCheckId, isCheckIdActive } = useActiveCheckId();
  
  // 🚨 FALLBACK: Si pas de CheckID, essayer de le récupérer depuis l'URL
  const location = useLocation();
  const fallbackCheckId = useMemo(() => {
    if (currentCheckId) return currentCheckId;
    
    const urlParams = new URLSearchParams(location.search);
    const checkIdFromUrl = urlParams.get('checkid');
    
    if (checkIdFromUrl) {
      console.log('🔄 CheckOut: CheckID récupéré depuis URL comme fallback:', checkIdFromUrl);
      return checkIdFromUrl;
    }
    
    return null;
  }, [currentCheckId, location.search]);
  
  // Utiliser le fallback si nécessaire
  const effectiveCheckId = currentCheckId || fallbackCheckId;
  const {
    saveButtonClick,
    savePhotoTaken,
    saveCheckboxChange
  } = useAutoSaveCheckId();
  const { uploadCapturedPhoto, getDisplayUrl } = useImageUpload();
  
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
  
  // Convertir les rooms en PieceStatus pour compatibilité avec le flow
  const defaultPieces: PieceStatus[] = globalRooms.map(room => ({
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

  // 🎯 NOUVEAU: Restauration d'état depuis CheckID
  useEffect(() => {
    // Restauration depuis CheckID si actif

    const loadStateFromCheckId = async () => {
      if (!effectiveCheckId || !isCheckIdActive) {
        return;
      }
      
      try {
        const session = await checkSessionManager.getCheckSession(effectiveCheckId);
        
        if (!session?.progress?.interactions) {
          return;
        }

        // 🎯 NOUVEAU: Restaurer les URLs des photos uploadées depuis CheckID
        const { imageUploadService } = await import('@/services/imageUploadService');
        await imageUploadService.restoreUrlsFromCheckId(effectiveCheckId);

        const { buttonClicks, photosTaken: savedPhotos, checkboxStates } = session.progress.interactions;


        // 🎯 NOUVEAU: Restaurer l'état visuel dans le CheckoutFlowManager
        const completedTaskIds = new Set<string>();

        // Extraire les tâches complétées depuis les buttonClicks
        Object.entries(buttonClicks || {}).forEach(([compositeKey, clickDataArray]) => {
          // Parse la clé composite : pieceId_buttonId_timestamp
          const keyParts = compositeKey.split('_');
          if (keyParts.length >= 2) {
            const buttonId = keyParts.slice(1, -1).join('_'); // Reconstituer buttonId

            // Si c'est une tâche completion, ajouter à completedTaskIds
            if (buttonId && !buttonId.includes('photo_intent') && !buttonId.includes('validate_')) {
              completedTaskIds.add(buttonId);
            }
          }
        });

        console.log('🔄 CheckOut: Restoration tâches complétées:', Array.from(completedTaskIds));

        // 🎯 NOUVEAU: Restaurer les états des checkboxes
        console.log('☑️ CheckOut: Restauration checkboxes depuis CheckID...');
        const restoredCheckboxes = new Map<string, boolean>();

        if (checkboxStates) {
          Object.entries(checkboxStates).forEach(([checkboxId, checkboxData]: [string, any]) => {
            // checkboxData peut être un objet avec isChecked ou un boolean direct
            const isChecked = typeof checkboxData === 'boolean'
              ? checkboxData
              : checkboxData?.isChecked || false;

            restoredCheckboxes.set(checkboxId, isChecked);

            // Si la checkbox est cochée, ajouter la tâche aux tâches complétées
            if (isChecked) {
              // Le checkboxId peut être le taskId ou contenir le taskId
              // Format possible: "checkbox_taskId" ou juste "taskId"
              const taskId = checkboxId.replace('checkbox_', '');
              completedTaskIds.add(taskId);

              console.log('☑️ CheckOut: Checkbox restaurée:', {
                checkboxId,
                taskId,
                isChecked
              });
            }
          });

          console.log(`☑️ CheckOut: ${restoredCheckboxes.size} checkboxes restaurées`);
        }

        // Note: Task completion state is now managed within pieces array
        // The CheckoutFlowManager doesn't have a separate completeTask method
        // Task completion is tracked via the 'completed' property on each task in pieces
        console.log('🔄 CheckOut: Tâches à restaurer:', {
          completedTaskIdsFromCheckId: Array.from(completedTaskIds),
          currentPieces: checkoutFlow.pieces.length,
          checkboxesRestored: restoredCheckboxes.size
        });

        // 🎯 NOUVEAU: Restaurer capturedPhotosData depuis localStorage ET CheckID
        console.log('📸 CheckOut: Restoration photos pour pièce/étape courante...');
        const restoredPhotosData = new Map<string, CapturedPhoto[]>();
        
        // 🎯 ÉTAPE 1: Chercher dans localStorage par pieceId/taskId
        console.log('%c🔍 RECHERCHE PHOTOS LOCALSTORAGE', 
          'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px;', {
          currentPieceId: actualCurrentPieceId,
          currentEtapeId: syncedCurrentTask?.id,
          expectedUniqueKey: `${actualCurrentPieceId}_${syncedCurrentTask?.id}`,
          actualCurrentPieceIdType: typeof actualCurrentPieceId,
          syncedCurrentTaskIdType: typeof syncedCurrentTask?.id,
          hasActualCurrentPieceId: !!actualCurrentPieceId,
          hasSyncedCurrentTask: !!syncedCurrentTask?.id
        });
        
        const currentUniqueTaskKey = `${actualCurrentPieceId}_${syncedCurrentTask?.id}`;
        const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('uploaded_image_'));
        const matchingPhotos: CapturedPhoto[] = [];
        
        localStorageKeys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            // 🔍 DEBUG: Logs détaillés pour chaque photo
            console.log('%c🔍 VÉRIFICATION PHOTO LOCALSTORAGE', 
              'color: #3b82f6; font-weight: bold; font-size: 14px;', {
              key,
              photoId: data.id,
              photoPieceId: data.pieceId,
              photoTaskId: data.taskId,
              currentPieceId: actualCurrentPieceId,
              currentTaskKey: currentUniqueTaskKey,
              pieceIdMatch: data.pieceId === actualCurrentPieceId,
              taskIdMatch: data.taskId === currentUniqueTaskKey,
              bothMatch: data.pieceId === actualCurrentPieceId && data.taskId === currentUniqueTaskKey
            });
            
            // 🎯 VÉRIFIER SI CETTE PHOTO CORRESPOND À LA PIÈCE/ÉTAPE COURANTE
            if (data.pieceId === actualCurrentPieceId && data.taskId === currentUniqueTaskKey) {
              console.log('✅ Photo localStorage trouvée pour pièce/étape courante:', {
                photoId: data.id,
                pieceId: data.pieceId,
                taskId: data.taskId,
                uploadedUrl: data.uploadedUrl ? data.uploadedUrl.substring(0, 50) + '...' : 'N/A'
              });
              
              // Créer un objet CapturedPhoto reconstitué
              const capturedPhoto: CapturedPhoto = {
                id: data.id,
                pieceId: data.pieceId,
                referencePhotoId: data.referencePhotoId || '',
                blob: null,
                dataUrl: data.uploadedUrl, // 🎯 UTILISER L'URL UPLOADÉE COMPLÈTE
                takenAt: data.metadata?.takenAt || data.uploadedAt || new Date().toISOString(),
                meta: { width: 1920, height: 1440 }
              };
              
              matchingPhotos.push(capturedPhoto);
            }
          } catch (error) {
            console.warn('⚠️ Erreur parsing photo localStorage:', key, error);
          }
        });
        
        // Ajouter les photos trouvées à la map
        if (matchingPhotos.length > 0) {
          restoredPhotosData.set(currentUniqueTaskKey, matchingPhotos);
          console.log(`📸 ${matchingPhotos.length} photos restaurées depuis localStorage pour:`, currentUniqueTaskKey);
        } else {
          console.log('📄 Aucune photo trouvée dans localStorage pour la pièce/étape courante');
        }
        
        // 🎯 ÉTAPE 2: Fallback vers CheckID (photos malformées)
        console.log('🔍 Fallback CheckID pour photos malformées...');
        for (const [photoId, photoDataArray] of Object.entries(savedPhotos)) {
          console.log('🔍 CheckOut: Analyse photo:', { photoId, photoDataArray });
          
          // 🎯 DEBUG: Inspection complète des données sauvées
          console.log('🔍 CheckOut: Données photo complètes:', {
            photoId,
            typeofPhotoDataArray: typeof photoDataArray,
            isArray: Array.isArray(photoDataArray),
            photoDataArrayKeys: Object.keys(photoDataArray || {}),
            photoDataArrayValues: photoDataArray
          });
          
          // photoDataArray peut être un array ou un objet unique
          const photoArray = Array.isArray(photoDataArray) ? photoDataArray : [photoDataArray];
          
          for (const photoData of photoArray) {
            console.log('🔍 CheckOut: photoData individuel:', {
              photoData,
              typeOfPhotoData: typeof photoData,
              hasMetadata: !!photoData?.metadata,
              taskId: photoData?.metadata?.taskId,
              url: photoData?.url,
              urlLength: photoData?.url?.length || 0,
              allKeys: Object.keys(photoData || {})
            });
            
            // 🚨 GESTION DONNÉES MALFORMÉES : Si photoData est juste un string (ID)
            if (typeof photoData === 'string') {
              console.log('%c⚠️ PHOTO MALFORMÉE DÉTECTÉE', 
                'color: #f59e0b; font-weight: bold; font-size: 14px;', {
                photoId: photoData,
                originalPhotoId: photoId,
                isJustString: true
              });
              
              // Essayer de récupérer l'URL ET les métadonnées depuis localStorage
              const uploadedUrl = imageUploadService.getUploadedUrl(photoData);
              
              if (uploadedUrl) {
                console.log('%c🔧 RÉCUPÉRATION URL + MÉTADONNÉES DEPUIS PHOTO MALFORMÉE', 
                  'color: #22c55e; font-weight: bold; font-size: 14px;', {
                  photoStringId: photoData,
                  foundUrl: uploadedUrl.substring(0, 50) + '...'
                });
                
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
                      
                      console.log('%c🎯 MÉTADONNÉES ORIGINALES RÉCUPÉRÉES !', 
                        'color: #8b5cf6; font-weight: bold; font-size: 14px;', {
                        photoId: photoData,
                        originalPieceId: parsedData.pieceId,
                        originalTaskId: parsedData.taskId,
                        currentPieceId: actualCurrentPieceId
                      });
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
                
                // 🎯 NOUVEAU: Utiliser la clé unique pieceId_etapeId
                const uniqueKey = `${originalPieceId}_${originalTaskId}`;
                if (!restoredPhotosData.has(uniqueKey)) {
                  restoredPhotosData.set(uniqueKey, []);
                }
                restoredPhotosData.get(uniqueKey)!.push(reconstructedPhoto);
                
                console.log('%c🔧 PHOTO MALFORMÉE ASSIGNÉE À SA VRAIE PIÈCE', 
                  'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px;', {
                  photoId: photoData.substring(0, 12),
                  originalPieceId,
                  originalTaskId,
                  assignedCorrectly: originalPieceId !== actualCurrentPieceId ? 'OUI' : 'CURRENT'
                });
              }
              
              continue; // Skip le reste du processing
            }
            
            if (photoData?.metadata?.taskId) {
              const taskId = photoData.metadata.taskId;
              
              // 🎯 RÉCUPÉRER LA VRAIE URL UPLOADÉE
              const uploadedUrl = imageUploadService.getUploadedUrl(photoId);
              const finalUrl = uploadedUrl || photoData.url || '';
              
              console.log('🔍 CheckOut: URL pour photo restaurée:', {
                photoId,
                uploadedUrl: uploadedUrl ? 'FOUND' : 'NOT_FOUND',
                uploadedUrlValue: uploadedUrl,
                checkIdUrl: photoData.url ? 'FOUND' : 'NOT_FOUND',
                checkIdUrlValue: photoData.url,
                finalUrl: finalUrl ? 'OK' : 'EMPTY',
                finalUrlLength: finalUrl?.length || 0
              });

              // 🎯 FORCER LA RÉCUPÉRATION DE L'URL UPLOADÉE DEPUIS TOUTES LES SOURCES
              const uploadedUrlFromStorage = getDisplayUrl(photoId, '');
              
              // 🎯 SI PAS DANS LOCALSTORAGE, CHERCHER DANS LES URLs SAUVÉES EN CHECKID
              let bestUrl = uploadedUrlFromStorage || finalUrl || '';
              
              // 🎯 SI TOUJOURS PAS D'URL, CHERCHER DANS LES MÉTADONNÉES CHECKID
              if (!bestUrl && photoData?.url) {
                bestUrl = photoData.url;
              }
              
              console.log('%c📸 RESTAURATION PHOTO AVEC URL FORCÉE', 
                'color: #8b5cf6; font-weight: bold; font-size: 14px;', {
                photoId: photoId.substring(0, 12),
                uploadedFromStorage: uploadedUrlFromStorage ? 'TROUVÉE' : 'NON_TROUVÉE', 
                checkIdUrl: finalUrl ? 'TROUVÉE' : 'NON_TROUVÉE',
                metadataUrl: photoData?.url ? photoData.url.substring(0, 50) + '...' : 'NON_TROUVÉE',
                bestUrl: bestUrl ? bestUrl.substring(0, 50) + '...' : 'VIDE'
              });

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

              // Ajouter à la map par taskId
              if (!restoredPhotosData.has(taskId)) {
                restoredPhotosData.set(taskId, []);
              }
              restoredPhotosData.get(taskId)!.push(capturedPhoto);
              
              console.log('📷 CheckOut: Photo restaurée pour tâche:', {
                taskId,
                photoId,
                url: capturedPhoto.dataUrl ? 'OK' : 'MANQUANTE'
              });
            }
          }
        }

        // Appliquer les photos restaurées
        if (restoredPhotosData.size > 0) {
          console.log('📸 CheckOut: Application photos restaurées:', {
            tasksWithPhotos: Array.from(restoredPhotosData.keys()),
            totalPhotos: Array.from(restoredPhotosData.values()).reduce((sum, photos) => sum + photos.length, 0)
          });
          setCapturedPhotosData(restoredPhotosData);
        }

        // 🎯 NOUVEAU: Appliquer les tâches complétées aux pièces
        if (completedTaskIds.size > 0) {
          console.log('✅ CheckOut: Application tâches complétées:', {
            completedTaskIds: Array.from(completedTaskIds),
            totalCompleted: completedTaskIds.size
          });

          // Mettre à jour l'état completed des tâches dans le flow
          checkoutFlow.pieces.forEach(piece => {
            piece.tasks?.forEach(task => {
              if (completedTaskIds.has(task.id)) {
                task.completed = true;
                console.log('✅ CheckOut: Tâche marquée comme complétée:', {
                  pieceId: piece.id,
                  taskId: task.id,
                  taskLabel: task.label
                });
              }
            });
          });

          // Forcer un re-render pour afficher les checkboxes cochées
          // On peut utiliser un state update pour déclencher le re-render
          setPhotoTaken(prev => !prev); // Toggle pour forcer re-render
        }

      } catch (error) {
        console.error('❌ CheckOut: Erreur chargement état:', error);
      }
    };

    loadStateFromCheckId();
  }, [effectiveCheckId, isCheckIdActive, checkoutFlow.pieces]); // 🎯 Ajouter checkoutFlow.pieces pour détecter les changements

  // 🎯 NOUVEAU: Mettre à jour les URLs des photos après upload
  useEffect(() => {
    const updatePhotoUrls = () => {
      setCapturedPhotosData(prevData => {
        const updatedData = new Map(prevData);
        let hasUpdates = false;

        for (const [taskId, photos] of updatedData.entries()) {
          const updatedPhotos = photos.map(photo => {
            // 🎯 MÉTHODE ÉTATINTIAL : Récupérer URL uploadée DIRECTEMENT
            const uploadedUrl = imageUploadService.getUploadedUrl(photo.id);
            
            // 🎯 PHOTO ANCIENNE : CHERCHER L'URL DANS TOUTES LES SOURCES CHECKID
            if (!uploadedUrl && !photo.dataUrl) {
              console.log('%c🔍 RECHERCHE URL PHOTO ANCIENNE DANS CHECKID', 
                'color: #3b82f6; font-weight: bold; font-size: 14px;', {
                photoId: photo.id,
                taskId: taskId,
                takenAt: photo.takenAt
              });
              
              // PAS BESOIN D'UPLOAD SI L'URL EST DÉJÀ SAUVÉE QUELQUE PART !
              console.log('%c⚠️ PHOTO ANCIENNE SANS URL LOCALE - VÉRIFIER CHECKID', 
                'color: #f59e0b; font-weight: bold; font-size: 14px;', {
                photoId: photo.id,
                takenAt: photo.takenAt,
                hasDataUrl: !!photo.dataUrl,
                hasBlob: !!photo.blob
              });
            }
            
            console.log('🔍 CheckOut: Vérification URL photo:', {
              photoId: photo.id,  // ID COMPLET
              currentDataUrl: photo.dataUrl ? (photo.dataUrl.startsWith('data:') ? 'base64' : photo.dataUrl.substring(0, 30)) : 'VIDE',
              uploadedUrl: uploadedUrl ? (uploadedUrl.startsWith('data:') ? 'base64' : uploadedUrl.substring(0, 50)) : 'NULL',
              hasBlob: !!photo.blob,
              takenAt: photo.takenAt,
              areEqual: uploadedUrl === photo.dataUrl,
              shouldUpdate: uploadedUrl !== photo.dataUrl && uploadedUrl && uploadedUrl !== ''
            });
            
            // 🎯 DEBUG: Pourquoi la mise à jour ne se fait pas ?
            const willUpdate = uploadedUrl !== photo.dataUrl && uploadedUrl;
            console.log('🔍 DEBUG MISE À JOUR:', {
              photoId: photo.id.substring(0, 12),
              uploadedUrl: uploadedUrl ? uploadedUrl.substring(0, 30) : 'NULL',
              currentDataUrl: photo.dataUrl ? photo.dataUrl.substring(0, 30) : 'NULL',
              areEqual: uploadedUrl === photo.dataUrl,
              willUpdate
            });

            if (willUpdate) {
              console.log('%c🔄 MISE À JOUR URL PHOTO', 
                'color: #22c55e; font-weight: bold; font-size: 14px;', {
                photoId: photo.id.substring(0, 12),
                oldUrl: photo.dataUrl ? photo.dataUrl.substring(0, 30) : 'vide',
                newUrl: uploadedUrl.substring(0, 50) + '...'
              });
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

    // Vérifier les mises à jour toutes les 2 secondes
    const intervalId = setInterval(() => {
      console.log('%c🔄 VÉRIFICATION AUTOMATIQUE URLS', 
        'color: #3b82f6; font-weight: bold; font-size: 12px;');
      updatePhotoUrls();
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [getDisplayUrl]);

  // 🎯 NOUVEAU: Mesure dynamique de la hauteur du bandeau fixe
  useEffect(() => {
    const measureBottomBanner = () => {
      if (bottomBannerRef.current) {
        const bannerHeight = bottomBannerRef.current.offsetHeight;
        const extraPadding = 16; // 16px de marge supplémentaire pour éviter le collage
        const totalPadding = bannerHeight + extraPadding;
        
        console.log('📏 CheckOut: Mesure bandeau fixe:', {
          bannerHeight,
          extraPadding,
          totalPadding,
          currentPadding: bottomPadding
        });
        
        // Mise à jour seulement si la hauteur a changé
        if (Math.abs(totalPadding - bottomPadding) > 5) { // Seuil de 5px pour éviter les micro-ajustements
          setBottomPadding(totalPadding);
          console.log('✅ CheckOut: Padding ajusté:', totalPadding + 'px');
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

  // Auto-redirect to exit questions when all tasks are completed
  useEffect(() => {
    if (isFlowCompleted) {
      const timer = setTimeout(() => {
        // 🎯 NOUVEAU: Rediriger vers les questions de sortie au lieu de checkout-home
        navigatePreservingParams(navigate, '/exit-questions', currentCheckId);
      }, 1500); // 1.5 second delay for better UX

      return () => clearTimeout(timer);
    }
  }, [isFlowCompleted, navigate, currentCheckId]);

  // ✅ SUPPRIMÉ: Les calculs dynamicPieces, currentPiece, etc. sont maintenant dans useNavigationManager

  // ✅ NOUVEAU: Récupérer les vrais signalements pour la pièce courante
  const currentRoomSignalements = useMemo(() => {
    if (!currentPiece?.nom) return [];

    const signalements = getSignalementsByRoom(currentPiece.nom);

    console.log('🚨 Signalements pour la pièce:', {
      pieceName: currentPiece.nom,
      signalementsCount: signalements.length,
      signalements: signalements.map(s => ({
        id: s.id,
        titre: s.titre,
        origine: s.origine,
        priorite: s.priorite
      }))
    });

    return signalements;
  }, [currentPiece?.nom, getSignalementsByRoom]);

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
    if (completed) {
      // 🎯 NOUVEAU: Sauvegarder dans CheckID
      try {
        await saveButtonClick(
          taskId,
          currentPiece?.id || '',
          String(actualCurrentTaskIndex),
          'task_complete',
          {
            page: 'checkout',
            taskType: syncedCurrentTask?.type || 'unknown',
            pieceName: currentPiece?.nom || '',
            completed: true,
            timestamp: new Date().toISOString()
          }
        );
        console.log('✅ CheckOut: Tâche completion sauvegardée dans CheckID:', taskId);
      } catch (error) {
        console.error('❌ CheckOut: Erreur sauvegarde completion:', error);
      }

      // 🎯 NOUVEAU: Marquer la tâche comme complétée dans le flow manager
      checkoutFlow.completeCurrentTask();
      console.log('✅ CheckOut: Tâche marquée comme complétée');

      // 🚀 NOUVEAU: Navigation automatique vers la tâche suivante
      console.log('🚀 CheckOut: Navigation automatique vers la tâche suivante...');
      setTimeout(() => {
        checkoutFlow.goToNextTask();
      }, 500); // Petit délai pour voir l'effet visuel
    } else {
      // Note: CheckoutFlowManager doesn't have uncompleteTask method

      // 🎯 NOUVEAU: Sauvegarder l'annulation dans CheckID
      try {
        await saveButtonClick(
          `${taskId}_uncomplete`,
          currentPiece?.id || '',
          String(actualCurrentTaskIndex),
          'task_uncomplete',
          {
            page: 'checkout',
            taskType: syncedCurrentTask?.type || 'unknown',
            pieceName: currentPiece?.nom || '',
            completed: false,
            timestamp: new Date().toISOString()
          }
        );
        console.log('✅ CheckOut: Tâche uncomplettion sauvegardée dans CheckID:', taskId);
      } catch (error) {
        console.error('❌ CheckOut: Erreur sauvegarde uncomplettion:', error);
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
    console.log('🏠 CheckOut: Vérification de l\'état d\'avancement');
    
    // 🎯 NOUVEAU: Sauvegarder l'action de retour
    try {
      await saveButtonClick(
        'checkout_go_back',
        currentPiece?.id || '',
        actualCurrentTaskIndex,
        'navigation_back',
        {
          page: 'checkout',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ CheckOut: Action retour sauvegardée dans CheckID');
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde action retour:', error);
    }
    
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
      // ✅ Tout est terminé → Aller vers les questions de sortie
      console.log('✅ Tous les TODOs terminés, navigation vers exit-questions');
      navigatePreservingParams(navigate, '/exit-questions', currentCheckId);
    } else {
      // ❌ Il reste des TODOs → Retourner à la vue globale du logement (pas de rapport)
      console.log('⚠️ Il reste des TODOs, navigation vers la vue globale du logement');
      navigatePreservingParams(navigate, '/', currentCheckId);
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
      const uniqueEtapeId = syncedCurrentTask.id;
      
      console.log(`💾 CheckOut: Stockage photos avec IDs uniques:`, {
        pieceId: uniquePieceId,
        etapeId: uniqueEtapeId,
        photosCount: capturedPhotos.length,
        pieceName: currentPiece?.nom
      });
      
      // 🎯 NOUVEAU: Clé unique avec pieceId + etapeId
      const uniqueTaskKey = `${uniquePieceId}_${uniqueEtapeId}`;
      
      setCapturedPhotosData(prev => {
        const newMap = new Map(prev);
        newMap.set(uniqueTaskKey, capturedPhotos);
        console.log('📸 CheckOut: Photos stockées avec clé unique:', uniqueTaskKey);
        return newMap;
      });

      // 🎯 NOUVEAU: Upload automatique vers l'API + sauvegarde CheckID
      try {
        console.log('🚀 CheckOut: Démarrage upload automatique...');
        
        for (const photo of capturedPhotos) {
          // 🚀 Upload automatique vers l'API avec IDs uniques
          console.log(`📤 CheckOut: Upload photo ${photo.id}...`);
          await uploadCapturedPhoto(photo, {
            taskId: uniqueTaskKey,
            checkId: currentCheckId || undefined,
            pieceId: uniquePieceId,
            etapeId: uniqueEtapeId,
            taskIndex: actualCurrentTaskIndex
          });

          // 🎯 FIX CRITIQUE: Sauvegarder dans IndexedDB avec la bonne signature
          await savePhotoTaken(
            uniqueTaskKey,           // taskId (clé unique pieceId_etapeId)
            uniquePieceId || '',     // pieceId
            photo.dataUrl,           // photoData (base64 string)
            {
              photoId: photo.id || `photo_${Date.now()}`,
              etapeId: uniqueEtapeId,
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
    console.log(`✅ Validation de la pièce: ${taskId}`);

    // 🎯 NOUVEAU: Sauvegarder la validation dans CheckID
    try {
      await saveButtonClick(
        `validate_${taskId}`,
        currentPiece?.id || '',
        actualCurrentTaskIndex,
        'piece_validate',
        {
          page: 'checkout',
          taskType: syncedCurrentTask?.type || 'unknown',
          pieceName: currentPiece?.nom || '',
          validationMode: 'validated',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ CheckOut: Validation pièce sauvegardée dans CheckID:', taskId);
    } catch (error) {
      console.error('❌ CheckOut: Erreur sauvegarde validation:', error);
    }

    // Marquer la tâche comme validée
    setValidationMode('validated');

    // 🎯 NOUVEAU: Marquer la tâche comme complétée dans le flow manager
    checkoutFlow.completeCurrentTask();
    console.log('✅ CheckOut: Tâche marquée comme complétée');

    // 🚀 NOUVEAU: Navigation automatique vers la tâche suivante
    console.log('🚀 CheckOut: Navigation automatique vers la tâche suivante...');
    setTimeout(() => {
      checkoutFlow.goToNextTask();
    }, 500); // Petit délai pour voir l'effet visuel
  };

  const handleRetakePhotos = (taskId: string) => {
    console.log(`📸 Reprise des photos: ${taskId}`);
    
    // Vérifier que nous avons une tâche avec des photos de référence
    const currentTask = currentPiece?.tasks?.find(task => task.id === taskId);
    console.log('🔍 CheckOut: Vérification photo références:', {
      currentTask: !!currentTask,
      hasPhotoReferences: !!currentTask?.photo_references,
      photoReferencesLength: currentTask?.photo_references?.length || 0
    });
    
    if (currentTask?.photo_references && currentTask.photo_references.length > 0) {
      console.log(`📷 Ouverture du modal photo pour ${currentPiece?.nom}`, {
        taskId,
        pieceId: currentPiece?.id,
        photosCount: currentTask.photo_references.length
      });
      
      setIsPhotoCaptureOpen(true);
    } else {
      console.warn('⚠️ Aucune photo de référence trouvée pour cette tâche');
      alert('Aucune photo de référence disponible pour cette pièce.');
    }
  };

  // Callback pour fermer le modal photo
  const handlePhotoCaptureClose = () => {
    console.log('❌ Modal photo fermé sans capture');
    setIsPhotoCaptureOpen(false);
  };
  
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
        {syncedCurrentTask ? (
            // Affichage avec comparaison photo pour les tâches photo, sinon TaskCard simple
            ['photo_multiple', 'photo_required', 'photo_validation', 'reference_photos'].includes(syncedCurrentTask.type) ? (
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
            )
        ) : (
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
                        setSelectedReferenceImage(image.url);
                        setIsPhotoModalOpen(true);
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
              <div className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border border-white/30 hover:shadow-glow transition-all duration-500 cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
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
                  /* Bouton Prendre photos obligatoires (si pas encore de photos) */
                  <Button
                    variant="cta"
                    onClick={() => handleTakePhoto(syncedCurrentTask.id)}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    📷 Prendre photos obligatoires
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

      {/* Photo Reference Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => {
        setIsPhotoModalOpen(open);
        if (!open) {
          setSelectedReferenceImage(null); // Reset l'image sélectionnée quand on ferme
        }
      }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo de référence</DialogTitle>
            <DialogDescription>
              Visualisation de la photo de référence pour la tâche en cours
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Afficher l'image sélectionnée ou celle de la tâche courante */}
            {(selectedReferenceImage || syncedCurrentTask?.photo_reference) && (
              <img 
                src={selectedReferenceImage || syncedCurrentTask?.photo_reference?.url} 
                alt="Photo de référence en grand" 
                className="max-w-full max-h-full object-contain"
                onLoad={() => console.log('✅ Image chargée en modal')}
                onError={(e) => {
                  console.error('❌ Erreur chargement image modal:', e.currentTarget.src);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
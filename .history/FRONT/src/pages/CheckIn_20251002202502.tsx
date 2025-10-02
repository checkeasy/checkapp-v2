import { useState, useEffect, useRef, useMemo } from "react";
import { Camera, AlertTriangle, HelpCircle, CheckCircle2, Brush, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileSheet } from "@/components/ProfileSheet";
import { HelpSheet } from "@/components/HelpSheet";
import { PieceSelector } from "@/components/PieceSelector";
import { TaskCard } from "@/components/TaskCard";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { PieceStepsOverview } from "@/components/PieceStepsOverview";
import { RoomTaskCard } from "@/components/RoomTaskCard";
import { PhotoCaptureModal } from "@/components/PhotoCaptureModal";
import { useUser } from "@/contexts/UserContext";
import { useCheckinFlow } from "@/contexts/CheckinFlowContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { PieceStatus } from "@/types/room";
import { Signalement } from "@/types/signalement";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { CapturedPhoto } from "@/types/photoCapture";
import { debugService } from "@/services/debugService";
import { environment } from "@/config/environment";
import { toast } from "sonner";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { useAutoSaveCheckId } from "@/hooks/useAutoSaveCheckId";
import { checkSessionManager } from "@/services/checkSessionManager";
import { navigatePreservingParams } from "@/utils/navigationHelpers";

interface CheckInProps {
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

// Mock signalements data 
const mockSignalements: Signalement[] = [
  {
    id: "sig-1",
    titre: "Tache sur la moquette",
    piece: "Chambre",
    origine: "CLIENT",
    description: "Tache importante sur la moquette près de la fenêtre",
    status: 'A_TRAITER',
    priorite: true,
    miniatures: [],
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "sig-2", 
    titre: "Robinet qui fuit",
    piece: "Cuisine",
    origine: "AGENT",
    description: "Le robinet de l'évier fuit légèrement",
    status: 'A_TRAITER',
    priorite: false,
    miniatures: [],
    created_at: "2024-01-14T14:20:00Z",
    updated_at: "2024-01-14T14:20:00Z"
  },
  {
    id: "sig-3",
    titre: "Problème résolu",
    piece: "Salon", 
    origine: "CLIENT",
    description: "Problème qui a été résolu",
    status: 'RESOLU',
    priorite: false,
    miniatures: [],
    created_at: "2024-01-10T09:15:00Z",
    updated_at: "2024-01-16T16:45:00Z"
  }
];


export const CheckIn = ({
  roomName = "Chambre",
  photoNumber = 1,
  totalPhotos = 2,
  roomInfo = "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.",
  cleaningInfo = "Contrôlez l'état général de la pièce à l'arrivée du voyageur.",
  referencePhoto = "/src/assets/reference-photo.jpg",
  pieces,
  currentPieceId,
  currentTaskIndex,
  onPieceSelected
}: CheckInProps) => {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isHelpSheetOpen, setIsHelpSheetOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("current");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSignalementsOpen, setIsSignalementsOpen] = useState(false);
  const [validationMode, setValidationMode] = useState<'validated' | 'photos_retaken' | null>(null);
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);
  const [capturedPhotosData, setCapturedPhotosData] = useState<Map<string, CapturedPhoto[]>>(new Map());
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notifiedRoomsRef = useRef(new Set<string>());
  const {
    user,
    logout
  } = useUser();
  const {
    flowState,
    nextStep,
    completeStep,
    jumpToPiece,
    isPieceCompleted,
    checkAutoAdvancement,
    addTakenPhotos,
    getTakenPhotos
  } = useCheckinFlow();
  const { openReportModal } = useReportProblem();
  const { getSignalementsByRoom, getPendingSignalements } = useSignalements();
  const { rooms: globalRooms, currentParcours } = useParcoursData();

  // 🎯 NOUVEAU: Intégration CheckID pour persistence
  const { currentCheckId, isCheckIdActive } = useActiveCheckId();

  // 🚨 FALLBACK: Si pas de CheckID, essayer de le récupérer depuis l'URL
  const fallbackCheckId = useMemo(() => {
    if (currentCheckId) return currentCheckId;

    const urlParams = new URLSearchParams(location.search);
    const checkIdFromUrl = urlParams.get('checkid');

    if (checkIdFromUrl) {
      console.log('🔄 CheckIn: CheckID récupéré depuis URL comme fallback:', checkIdFromUrl);
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

  // Initialiser le CheckinFlow avec les données du parcours (une seule fois)
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (globalRooms.length > 0 && !initialized) {
      console.log('🎯 Initialisation CheckIn UNIQUE:', {
        globalRoomsCount: globalRooms.length,
        userType: user?.type,
        currentParcoursId: currentParcours?.id
      });

      // Le flow s'initialise automatiquement via CheckinFlowContext
      setInitialized(true);
    }
  }, [globalRooms.length, initialized]);
  
  // Convertir les rooms en PieceStatus pour compatibilité avec le flow (memoized)
  const defaultPieces: PieceStatus[] = useMemo(() => {
    if (globalRooms.length === 0) return [];
    
    return globalRooms.map(room => {
      let tasks = room.tasks || [];
      
      return {
        id: room.id,
        nom: room.nom,
        ordre: room.ordre || 1,
        roomInfo: room.roomInfo || '',
        cleaningInfo: room.cleaningInfo || '',
        photoReferences: room.photoReferences || { checkin: [], checkout: [] },
        status: 'VIDE' as const,
        tasks_total: tasks.length,
        tasks_done: 0,
        photos_required: tasks.reduce((sum, task) => sum + (task.total_photos_required || 0), 0) || 0,
        photos_done: 0,
        tasks: tasks
      };
    });
  }, [globalRooms]);
  const actualPieces = pieces || defaultPieces;

  // 🎯 NOUVEAU: Restauration d'état depuis CheckID
  useEffect(() => {
    const loadStateFromCheckId = async () => {
      if (!effectiveCheckId || !isCheckIdActive) {
        console.log('⚠️ CheckIn: Pas de CheckID actif, skip restauration');
        return;
      }

      try {
        const session = await checkSessionManager.getCheckSession(effectiveCheckId);

        if (!session?.progress) {
          console.log('ℹ️ CheckIn: Pas de progression sauvegardée');
          return;
        }

        console.log('📥 CheckIn: Restauration état depuis CheckID:', session.progress);

        // ✅ La restauration de position est maintenant gérée par CheckinFlowContext
        // qui charge automatiquement currentPieceId et currentTaskIndex

        // Restaurer les interactions si disponibles
        const { buttonClicks, photosTaken: savedPhotos, checkboxStates } = session.progress.interactions || {};

        if (buttonClicks) {
          console.log('📋 CheckIn: Restauration button clicks:', Object.keys(buttonClicks).length);
        }

        if (savedPhotos) {
          console.log('📸 CheckIn: Restauration photos:', Object.keys(savedPhotos).length);
          // Les photos sont restaurées via le contexte CheckinFlow
        }

        // 🎯 NOUVEAU: Restaurer les états des checkboxes
        if (checkboxStates) {
          console.log('☑️ CheckIn: Restauration checkboxes:', Object.keys(checkboxStates).length);

          const completedTaskIds = new Set<string>();

          Object.entries(checkboxStates).forEach(([checkboxId, checkboxData]: [string, any]) => {
            // checkboxData peut être un objet avec isChecked ou un boolean direct
            const isChecked = typeof checkboxData === 'boolean'
              ? checkboxData
              : checkboxData?.isChecked || false;

            if (isChecked) {
              // Le checkboxId peut être le taskId ou contenir le taskId
              const taskId = checkboxId.replace('checkbox_', '');
              completedTaskIds.add(taskId);

              // Marquer la tâche comme complétée dans le contexte CheckinFlow
              completeStep(taskId);

              console.log('☑️ CheckIn: Checkbox restaurée et tâche marquée complétée:', {
                checkboxId,
                taskId,
                isChecked
              });
            }
          });

          console.log(`✅ CheckIn: ${completedTaskIds.size} tâches restaurées depuis checkboxes`);
        }

      } catch (error) {
        console.error('❌ CheckIn: Erreur chargement état:', error);
      }
    };

    loadStateFromCheckId();
  }, [effectiveCheckId, isCheckIdActive]);

  // Auto-redirect to checkin home when all tasks are completed
  useEffect(() => {
    if (flowState.isCompleted) {
      const timer = setTimeout(() => {
        navigatePreservingParams(navigate, '/checkin-home', effectiveCheckId);
      }, 1500); // 1.5 second delay for better UX

      return () => clearTimeout(timer);
    }
  }, [flowState.isCompleted, navigate, effectiveCheckId]);

  // Function to calculate dynamic piece status based on completed tasks
  const getDynamicPieces = (): PieceStatus[] => {
    return actualPieces.map(piece => {
      if (!piece.tasks) return piece;
      const completedTasks = piece.tasks.filter(task => flowState.completedTasks[task.id]);
      const completedPhotos = completedTasks.filter(task => task.type === 'photo_required' || task.type === 'photo_optional');
      return {
        ...piece,
        tasks_done: completedTasks.length,
        photos_done: completedPhotos.length,
        status: completedTasks.length === piece.tasks.length ? 'VALIDEE' : completedTasks.length > 0 ? 'INCOMPLETE' : 'VIDE'
      };
    });
  };
  const dynamicPieces = getDynamicPieces();

  // Use flow state to determine current piece and task
  const actualCurrentPieceId = currentPieceId || flowState.currentStep.pieceId;
  const actualCurrentTaskIndex = currentTaskIndex !== undefined ? currentTaskIndex : flowState.currentStep.taskIndex;
  const currentPiece = dynamicPieces.find(p => p.id === actualCurrentPieceId);
  const currentIndex = dynamicPieces.findIndex(p => p.id === actualCurrentPieceId);
  const totalPieces = dynamicPieces.length;

  // Get active signalements for current room
  const currentRoomSignalements = currentPiece ? getSignalementsByRoom(currentPiece.nom) : [];
  const totalSignalements = getPendingSignalements().length;

  // Sync task completion with flow state
  const syncedCurrentTask = currentPiece?.tasks?.[actualCurrentTaskIndex] ? {
    ...currentPiece.tasks[actualCurrentTaskIndex],
    completed: flowState.completedTasks[currentPiece.tasks[actualCurrentTaskIndex].id] || false
  } : undefined;

  // Debug simplifié (plus de logs en boucle)
  const totalTasks = currentPiece?.tasks?.length || 0;
  const stepNumber = flowState.currentStep.stepNumber;
  const totalSteps = flowState.currentStep.totalSteps;

  // Reset validation mode when task changes or becomes incomplete
  useEffect(() => {
    if (!syncedCurrentTask?.completed) {
      setValidationMode(null);
    }
  }, [syncedCurrentTask?.id, syncedCurrentTask?.completed]);

  const handleTabClick = (tabValue: string) => {
    setSelectedTab(tabValue);
  };

  const handleTaskComplete = (taskId: string, completed: boolean) => {
    console.log(`Task ${taskId} completed: ${completed}`);
    if (completed) {
      completeStep(taskId);
      // Check for auto-advancement to next piece
      setTimeout(() => {
        const updatedDynamicPieces = getDynamicPieces();
        checkAutoAdvancement(updatedDynamicPieces);
        
        // Only navigate if flow is truly completed, otherwise go to next step
        if (flowState.isCompleted) {
          navigatePreservingParams(navigate, '/checkin-home', effectiveCheckId);
        } else {
          nextStep();
        }
      }, 500);
    }
  };

  const handleValidatePiece = (taskId: string) => {
    console.log(`✅ Voyageur valide la pièce: ${taskId}`);
    setValidationMode('validated');
    
    // Marquer la tâche comme terminée
    completeStep(taskId);
    
    // Navigation vers la pièce suivante
    setTimeout(() => {
      if (flowState.isCompleted) {
        navigatePreservingParams(navigate, '/checkin-home', effectiveCheckId);
      } else {
        nextStep();
      }
    }, 1000);
  };

  const handleRetakePhotos = (taskId: string) => {
    console.log(`📸 Voyageur reprend les photos: ${taskId}`);

    // Vérifier que nous avons une tâche avec des photos de référence
    const currentTask = currentPiece?.tasks?.find(task => task.id === taskId);

    // ✅ CORRECTION: Accepter AUSSI les tâches TODO avec photo_reference (singulier)
    const hasPhotoReferences = currentTask?.photo_references && currentTask.photo_references.length > 0;
    const hasSinglePhotoReference = currentTask?.photo_reference;

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

  const handleTakePhoto = (taskId: string) => {
    // Legacy function - redirects to handleRetakePhotos for compatibility
    handleRetakePhotos(taskId);
  };

  // Callback quand les photos sont capturées
  const handlePhotosCaptured = (capturedPhotos: CapturedPhoto[]) => {
    console.log('✅ Photos capturées par le voyageur:', capturedPhotos);
    
    // Stocker les photos capturées avec l'ID de la tâche
    if (syncedCurrentTask && capturedPhotos.length > 0) {
      const taskId = syncedCurrentTask.id;
      console.log(`💾 Stockage de ${capturedPhotos.length} photos pour la tâche ${taskId}`);
      
      setCapturedPhotosData(prev => {
        const newMap = new Map(prev);
        newMap.set(taskId, capturedPhotos);
        console.log('📸 Photos stockées:', Array.from(newMap.keys()));
        return newMap;
      });
    }
    
    // Fermer le modal
    setIsPhotoCaptureOpen(false);
    
    // Marquer comme photo retaken
    setValidationMode('photos_retaken');
    
    // Trouver la tâche courante et la compléter
    if (syncedCurrentTask) {
      completeStep(syncedCurrentTask.id);
      
      setTimeout(() => {
        if (flowState.isCompleted) {
          navigatePreservingParams(navigate, '/checkin-home', effectiveCheckId);
        } else {
          nextStep();
        }
      }, 1000);
    }
  };

  // Callback pour fermer le modal photo
  const handlePhotoCaptureClose = () => {
    console.log('❌ Modal photo fermé sans capture');
    setIsPhotoCaptureOpen(false);
  };

  const navigateToNext = () => {
    const currentPieceIndex = dynamicPieces.findIndex(p => p.id === actualCurrentPieceId);
    const currentTaskIndex = actualCurrentTaskIndex;
    const currentPiece = dynamicPieces[currentPieceIndex];
    if (currentTaskIndex < (currentPiece?.tasks?.length || 0) - 1) {
      // Next task in same piece
      jumpToPiece(actualCurrentPieceId, currentTaskIndex + 1);
    } else if (currentPieceIndex < dynamicPieces.length - 1) {
      // First task of next piece
      const nextPiece = dynamicPieces[currentPieceIndex + 1];
      jumpToPiece(nextPiece.id, 0);
    }
  };

  const navigateToPrevious = () => {
    const currentPieceIndex = dynamicPieces.findIndex(p => p.id === actualCurrentPieceId);
    const currentTaskIndex = actualCurrentTaskIndex;
    if (currentTaskIndex > 0) {
      // Previous task in same piece
      jumpToPiece(actualCurrentPieceId, currentTaskIndex - 1);
    } else if (currentPieceIndex > 0) {
      // Last task of previous piece
      const prevPiece = dynamicPieces[currentPieceIndex - 1];
      const lastTaskIndex = (prevPiece?.tasks?.length || 1) - 1;
      jumpToPiece(prevPiece.id, lastTaskIndex);
    }
  };

  const handleReportProblem = () => {
    openReportModal(currentPiece?.nom);
  };

  const handleGoBack = async () => {
    console.log('🏠 CheckIn: Navigation retour');

    // 🎯 NOUVEAU: Sauvegarder l'action de retour
    try {
      await saveButtonClick(
        'checkin_go_back',
        currentPiece?.id || '',
        actualCurrentTaskIndex,
        'navigation_back',
        {
          page: 'checkin',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ CheckIn: Action retour sauvegardée dans CheckID');
    } catch (error) {
      console.error('❌ CheckIn: Erreur sauvegarde action retour:', error);
    }

    // Naviguer en préservant les paramètres
    navigatePreservingParams(navigate, '/', effectiveCheckId);
  };

  const handlePieceSelected = (pieceId: string) => {
    // Use custom handler if provided, otherwise use default navigation
    if (onPieceSelected) {
      onPieceSelected(pieceId);
      return;
    }

    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('piece_opened', {
        piece_id: pieceId
      });
    }

    // Find the selected piece and its first uncompleted task
    const selectedPiece = dynamicPieces.find(p => p.id === pieceId);
    if (!selectedPiece?.tasks) {
      console.log(`No tasks found for piece: ${pieceId}`);
      return;
    }

    // Find the first uncompleted task
    const firstUncompletedTaskIndex = selectedPiece.tasks.findIndex(task => !flowState.completedTasks[task.id]);

    // If all tasks are completed, go to the first task
    const targetTaskIndex = firstUncompletedTaskIndex >= 0 ? firstUncompletedTaskIndex : 0;

    // Use the checkout flow context to jump to the selected piece and task
    jumpToPiece(pieceId, targetTaskIndex);
  };

  const handleSubmitCheckin = async () => {
    if (isSubmittingCheckin) return;
    
    setIsSubmittingCheckin(true);
    
    try {
      console.log('📥 Envoi des données de checkin...');
      
      // Envoyer les données via le webhook checkin
      const result = await debugService.sendCheckinWebhook();
      
      if (result.success) {
        toast.success('✅ Checkin envoyé avec succès !');
        console.log('✅ Checkin envoyé:', result);
        
        // Optionnel : Naviguer vers la page suivante après un délai
        setTimeout(() => {
          navigatePreservingParams(navigate, '/checkin-home', effectiveCheckId);
        }, 2000);
      } else {
        toast.error(`❌ Erreur envoi checkin: ${result.error}`);
        console.error('❌ Erreur checkin:', result);
      }
      
    } catch (error) {
      console.error('❌ Erreur envoi checkin:', error);
      toast.error('❌ Erreur lors de l\'envoi du checkin');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto relative">
      {/* Header avec fil d'Ariane - Optimisé mobile */}
      <div className="sticky top-0 z-50 bg-glass-bg/95 backdrop-blur-xl border-b border-white/20 shadow-elegant">
        <div className="flex items-center justify-between py-1 px-3 bg-background">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="hover:bg-white/20 transition-all duration-300 hover:scale-105 h-8 w-8 p-0">
            <Home className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex items-center justify-center gap-2 px-2">
            <PieceSelector 
              pieces={dynamicPieces} 
              currentPieceId={actualCurrentPieceId} 
              onPieceSelected={handlePieceSelected}
              signalements={totalSignalements}
              currentTasks={currentPiece?.tasks}
              currentTaskIndex={actualCurrentTaskIndex}
              completedTasks={flowState.completedTasks}
              onTaskSelected={(taskIndex) => jumpToPiece(actualCurrentPieceId, taskIndex)}
             />
          </div>
          
          <div className="flex items-center">
            <div className="transition-transform duration-300 hover:scale-105">
              <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 px-3 py-4 space-y-4 pb-24">
        {/* Debug supprimé - fonctionnalité opérationnelle */}

        {/* Contenu de la tâche en cours */}
        <div className="space-y-4">
          {syncedCurrentTask && (
            ['photo_multiple', 'photo_optional', 'photo_required', 'photo_validation', 'reference_photos'].includes(syncedCurrentTask.type) ? (
              <div className="space-y-4">
                <RoomTaskCard
                  task={syncedCurrentTask}
                  taskIndex={actualCurrentTaskIndex}
                  totalTasks={totalTasks}
                  onValidatePiece={handleValidatePiece}
                  onRetakePhotos={handleRetakePhotos}
                  capturedPhotos={capturedPhotosData.get(syncedCurrentTask.id) || []}
                  onReportProblem={handleReportProblem}
                  cleaningInfo={currentPiece?.cleaningInfo}
                  roomInfo={currentPiece?.roomInfo}
                  validationMode={validationMode}
                  signalements={currentRoomSignalements}
                  isSignalementsOpen={isSignalementsOpen}
                  onSignalementsOpenChange={setIsSignalementsOpen}
                />
                
                {/* Validation result display - only show validation message for direct validation */}
                {syncedCurrentTask.completed && validationMode === 'validated' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-slide-up">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Pièce validée</span>
                    </div>
                  </div>
                )}

                {/* Photos display - when photos exist for this task */}
                {syncedCurrentTask.completed && getTakenPhotos(syncedCurrentTask.id).length > 0 && (
                  <div className="space-y-3 animate-slide-up">
                    {/* Single photo */}
                    {syncedCurrentTask.photo_reference && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-foreground text-sm">Vos photos (1)</h5>
                        <PhotoCarousel photos={getTakenPhotos(syncedCurrentTask.id)} />
                      </div>
                    )}
                    
                    {/* Multiple photos */}
                    {syncedCurrentTask?.type === 'photo_multiple' && syncedCurrentTask?.photo_references && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-foreground text-sm">
                          Vos photos ({getTakenPhotos(syncedCurrentTask.id).length})
                        </h5>
                        <PhotoCarousel photos={getTakenPhotos(syncedCurrentTask.id)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <TaskCard
                task={syncedCurrentTask}
                taskIndex={actualCurrentTaskIndex}
                totalTasks={totalTasks}
                onTaskComplete={handleTaskComplete}
                onTakePhoto={handleTakePhoto}
              />
            )
          )}

          {!syncedCurrentTask && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Contrôle d'entrée terminé !</h3>
                <p className="text-muted-foreground mb-6">
                  Toutes les vérifications d'entrée ont été effectuées avec succès.
                </p>
                
                {/* Bouton d'envoi du checkin */}
                <div className="space-y-3">
                  <Button
                    onClick={handleSubmitCheckin}
                    disabled={isSubmittingCheckin}
                    className="w-full h-12 font-medium text-base rounded-xl transition-all duration-300"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {isSubmittingCheckin ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Envoi en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        <span>📥 Envoyer le rapport de checkin</span>
                      </div>
                    )}
                  </Button>
                  
                  {/* Bouton de debug en développement */}
                  {environment.IS_DEV && (
                    <Button
                      onClick={async () => {
                        try {
                          await debugService.displayStoredCheckinData();
                          toast.success('✅ Données affichées dans la console');
                        } catch (error) {
                          toast.error('❌ Erreur affichage données');
                        }
                      }}
                      variant="outline"
                      className="w-full text-sm"
                    >
                      🔍 Debug - Voir les données collectées
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Profile Sheet */}
      <ProfileSheet 
        isOpen={isProfileSheetOpen} 
        onClose={() => setIsProfileSheetOpen(false)} 
        onLogout={() => {
          logout();
          setIsProfileSheetOpen(false);
        }}
      />

      {/* Help Sheet */}
      <HelpSheet 
        isOpen={isHelpSheetOpen} 
        onClose={() => setIsHelpSheetOpen(false)} 
      />

      {/* Photo Capture Modal */}
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
          flowType="checkin"  // ✅ AJOUTÉ: Toujours "checkin" dans CheckIn
        />
      )}

      {/* Photo Modal */}
      {isPhotoModalOpen && syncedCurrentTask && (
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent className="max-w-sm max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="text-base">Photo de référence</DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4">
              {syncedCurrentTask?.photo_references && (
                <PhotoCarousel 
                  photos={syncedCurrentTask.photo_references}
                />
              )}
              {syncedCurrentTask?.photo_reference && (
                <PhotoCarousel 
                  photos={[syncedCurrentTask.photo_reference]}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CheckIn;
import { useState, useMemo } from "react";
import { ChevronDown, Check, Circle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { PieceStatus, Task } from "@/types/room";
import { useCheckoutFlow } from "@/contexts/CheckoutFlowContext";
import { useCheckinFlow } from "@/contexts/CheckinFlowContext";
import { useLocation } from "react-router-dom";
import { CapturedPhoto } from "@/types/photoCapture";
import { isPieceValidatedForCheckin } from "@/utils/checkinValidationHelpers";


interface PieceSelectorProps {
  pieces: PieceStatus[];
  currentPieceId: string;
  onPieceSelected: (pieceId: string) => void;
  onSelectorOpened?: () => void;
  signalements?: number;
  // Task navigation props
  currentTasks?: Task[];
  currentTaskIndex?: number;
  completedTasks?: Record<string, boolean>;
  onTaskSelected?: (pieceId: string, taskIndex: number) => void;
  // 🆕 Photos capturées pour validation CheckIn
  capturedPhotos?: Map<string, CapturedPhoto[]>;
}

export function PieceSelector({
  pieces,
  currentPieceId,
  onPieceSelected,
  onSelectorOpened,
  signalements = 0,
  currentTasks = [],
  currentTaskIndex = 0,
  completedTasks = {},
  onTaskSelected,
  capturedPhotos = new Map()
}: PieceSelectorProps) {
  const [open, setOpen] = useState(false);
  const currentPiece = pieces.find(p => p.id === currentPieceId);
  const currentIndex = pieces.findIndex(p => p.id === currentPieceId);
  const location = useLocation();

  // Use the appropriate flow context based on current route
  const isCheckIn = location.pathname.includes('checkin');
  const checkoutFlow = useCheckoutFlow();
  const checkinFlow = useCheckinFlow();

  // Select the appropriate flow context
  const flowContext = isCheckIn ? checkinFlow : checkoutFlow;
  const { isPieceCompleted } = flowContext;

  // 🎯 FIX: Recalculer les tâches complétées quand les pieces changent
  // Cela force le re-render du composant quand l'état du checkoutFlow change
  const memoizedCompletedTasks = useMemo(() => {
    const completedTasksObj: Record<string, boolean> = {};
    pieces.forEach(piece => {
      piece.tasks?.forEach(task => {
        if (task.completed) {
          completedTasksObj[task.id] = true;
        }
      });
    });
    return completedTasksObj;
  }, [pieces]);

  // Function to get piece progress based on context
  const getPieceProgress = (pieceId: string, pieces: PieceStatus[]) => {
    if (isCheckIn) {
      // For checkin, calculate progress from completed tasks
      const piece = pieces.find(p => p.id === pieceId);
      if (!piece?.tasks) return { completed: 0, total: 1 };

      const completedTasks = piece.tasks.filter(task => checkinFlow.flowState.completedTasks[task.id]);
      return {
        completed: completedTasks.length,
        total: piece.tasks.length
      };
    } else {
      // Use checkout flow's getPieceProgress (accepte pieceId ET pieces)
      return checkoutFlow.getPieceProgress(pieceId, pieces);
    }
  };

  // 🆕 Fonction pour vérifier si une pièce est validée en CheckIn
  const isCheckinPieceValidated = (piece: PieceStatus): boolean => {
    if (!isCheckIn) return false;
    return isPieceValidatedForCheckin(
      piece.id,
      checkinFlow.flowState.completedTasks,
      capturedPhotos,
      piece
    );
  };

  const getStatusIcon = (piece: PieceStatus) => {
    // 🆕 Pour CheckIn, utiliser la nouvelle logique de validation
    if (isCheckIn && isCheckinPieceValidated(piece)) {
      return <Check className="h-4 w-4 text-success-foreground" />;
    }

    const isCompleted = isPieceCompleted(piece.id, pieces);
    if (isCompleted) {
      return <Check className="h-4 w-4 text-success-foreground" />;
    }
    const progress = getPieceProgress(piece.id, pieces);
    const hasProgress = progress.completed > 0;
    if (hasProgress) {
      return <AlertCircle className="h-4 w-4 text-warning-foreground" />;
    }
    return <Circle className="h-4 w-4 text-destructive-foreground" />;
  };

  const getStatusColor = (piece: PieceStatus) => {
    // 🆕 Pour CheckIn, utiliser la nouvelle logique de validation
    if (isCheckIn && isCheckinPieceValidated(piece)) {
      return 'bg-success/20 text-success border-success/30';
    }

    const isCompleted = isPieceCompleted(piece.id, pieces);
    if (isCompleted) {
      return 'bg-success text-success-foreground';
    }
    const progress = getPieceProgress(piece.id, pieces);
    const hasProgress = progress.completed > 0;
    if (hasProgress) {
      return 'bg-warning text-warning-foreground';
    }
    return 'bg-muted text-muted-foreground';
  };

  const handlePieceSelect = (pieceId: string) => {
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('piece_selected_from_selector', { piece_id: pieceId });
    }
    
    // Always go to the piece view when clicking on piece name
    onPieceSelected(pieceId);
    setOpen(false); // Fermer le drawer après sélection
  };

  const handleTaskSelect = (pieceId: string, taskIndex: number) => {
    if (onTaskSelected) {
      onTaskSelected(pieceId, taskIndex);
      setOpen(false); // Fermer le drawer après sélection
    }
  };

  const handleSelectorOpen = () => {
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('piece_selector_opened');
    }
    onSelectorOpened?.();
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className="group h-auto px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-foreground hover:text-primary transition-all duration-300 hover:scale-[1.02] bg-white/60 backdrop-blur-sm border border-white/40 rounded-lg shadow-card hover:shadow-elegant focus:ring-2 focus:ring-primary/20 max-w-[calc(100vw-180px)] w-auto"
          onClick={handleSelectorOpen}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
            <Typography variant="section-subtitle" className="font-semibold truncate max-w-[100px] xs:max-w-[120px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[280px]">
              {currentPiece?.nom || 'Pièce'}
            </Typography>
            <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-180" />
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto bg-white border-t border-gray-200">
        <DrawerHeader className="text-center border-b border-gray-200">
          <DrawerTitle>Sélectionner une pièce</DrawerTitle>
        </DrawerHeader>
        {/* 🎯 FIX: Added max-height and overflow-y-auto for vertical scrolling */}
        <div className="px-6 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* New hierarchical navigation for checkout */}
          <div className="space-y-4">
            {pieces.map((piece, pieceIndex) => {
              const isCompleted = isPieceCompleted(piece.id, pieces);
              const progress = getPieceProgress(piece.id, pieces);
              const hasProgress = progress.completed > 0;
              const isActivePiece = piece.id === currentPieceId;
              const pieceTasks = piece.tasks || [];

              // 🎯 FIX CRITIQUE: En mode check-in, toujours afficher seulement le nom de la pièce
              // En mode checkout, afficher la structure hiérarchique avec les tâches (même pour 1 tâche)
              const shouldShowPieceOnly = isCheckIn;

              // If in check-in mode, show just the piece name (clickable)
              if (shouldShowPieceOnly) {
                // For single task pieces, check if the single task is completed
                const singleTaskCompleted = pieceTasks.length > 0 ? memoizedCompletedTasks?.[pieceTasks[0].id] || false : false;

                return (
                  <Button
                    key={piece.id}
                    variant="ghost"
                    className={`w-full justify-start h-auto min-h-0 p-4 rounded-2xl transition-all duration-200 ${
                      isActivePiece
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-gray-100 hover:bg-gray-200 text-foreground"
                    }`}
                    onClick={() => {
                      // 🆕 FIX: En mode CheckIn, appeler onTaskSelected avec la première tâche
                      if (isCheckIn && onTaskSelected && pieceTasks.length > 0) {
                        // Trouver la première tâche non complétée
                        const firstUncompletedTaskIndex = pieceTasks.findIndex(task => !memoizedCompletedTasks?.[task.id]);
                        const targetTaskIndex = firstUncompletedTaskIndex >= 0 ? firstUncompletedTaskIndex : 0;
                        onTaskSelected(piece.id, targetTaskIndex);
                        setOpen(false); // 🆕 FIX: Fermer le drawer après sélection
                      } else {
                        // En mode Checkout ou si pas de tâches, utiliser handlePieceSelect
                        handlePieceSelect(piece.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Status icon - Afficher SEULEMENT si la pièce n'est pas validée */}
                      {!isCheckinPieceValidated(piece) && !isCompleted && (
                        <div className="flex-shrink-0">
                          {hasProgress ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold text-base break-words whitespace-normal">
                          {piece.nom}
                        </div>
                        {/* 🎯 REMOVED: Ne plus afficher les tâches sous le nom de la pièce en CheckIn */}
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        <Badge
                          className={`text-xs ${
                            isCheckinPieceValidated(piece)
                              ? "bg-success/20 text-success border-success/30"
                              : isCompleted
                                ? "bg-success/20 text-success border-success/30"
                                : hasProgress
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : "bg-gray-200 text-gray-600 border-gray-300"
                          }`}
                        >
                          {isCheckinPieceValidated(piece) ? "Validée" : isCompleted ? "Validée" : hasProgress ? "En cours" : "À faire"}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                );
              }

              // For pieces with multiple tasks in CHECKOUT mode, show hierarchical structure
              return (
                <div key={piece.id} className="space-y-2">
                  {/* Piece header (non-clickable) */}
                  {/* 🎯 FIX: Added break-words and whitespace-normal for text wrapping */}
                  <div className="px-4 py-2">
                    <div className="font-bold text-base text-foreground break-words whitespace-normal">
                      {piece.nom} :
                    </div>
                  </div>

                  {/* Tasks (clickable) - ONLY IN CHECKOUT MODE */}
                  <div className="space-y-2 ml-4">
                    {pieceTasks.map((task, taskIndex) => {
                      const isTaskCompleted = memoizedCompletedTasks?.[task.id] || false;
                      const isCurrentTask = isActivePiece && taskIndex === currentTaskIndex;
                      
                      return (
                         <Button
                           key={task.id}
                           variant="ghost"
                           className={`w-full justify-start h-auto min-h-0 p-3 rounded-xl transition-all duration-200 ${
                             isTaskCompleted
                               ? "bg-success/20 text-success hover:bg-success/30 border border-success/30"
                               : isCurrentTask
                                 ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                 : "bg-gray-100 hover:bg-gray-200 text-foreground"
                           }`}
                          onClick={() => {
                            // Select piece and task
                            if (piece.id !== currentPieceId) {
                              onPieceSelected(piece.id);
                            }
                            if (onTaskSelected) {
                              onTaskSelected(piece.id, taskIndex);
                            }
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            {/* Status icon */}
                            <div className="flex-shrink-0">
                              {isTaskCompleted ? (
                                <Check className="w-4 h-4" />
                              ) : isCurrentTask ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </div>
                            
                            {/* Task content */}
                            {/* 🎯 FIX: Added min-w-0, break-words and whitespace-normal for text wrapping */}
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium text-sm break-words whitespace-normal">
                                {task.label}
                              </div>
                            </div>
                            
                             {/* Status badge */}
                             <div className="flex-shrink-0">
                               <Badge 
                                 className={`text-xs ${
                                   isTaskCompleted 
                                     ? "bg-success/20 text-success border-success/30" 
                                     : isCurrentTask
                                       ? "bg-primary/20 text-primary border-primary/30"
                                       : "bg-gray-200 text-gray-600 border-gray-300"
                                 }`}
                               >
                                 {isTaskCompleted ? "Terminée" : isCurrentTask ? "En cours" : "À faire"}
                               </Badge>
                             </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
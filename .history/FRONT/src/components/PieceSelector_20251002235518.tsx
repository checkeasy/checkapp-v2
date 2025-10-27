import { useState } from "react";
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
  onTaskSelected
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
      // Use checkout flow's getPieceProgress
      return checkoutFlow.getPieceProgress(pieceId, pieces);
    }
  };
  
  const getStatusIcon = (piece: PieceStatus) => {
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
          className="group h-auto px-4 py-3 text-sm font-medium text-foreground hover:text-primary transition-all duration-300 hover:scale-[1.02] bg-white/60 backdrop-blur-sm border border-white/40 rounded-lg shadow-card hover:shadow-elegant focus:ring-2 focus:ring-primary/20"
          onClick={handleSelectorOpen}
        >
          <div className="flex items-center gap-3">
            <Typography variant="section-subtitle" className="font-semibold">
              {currentPiece?.nom || 'Pièce'}
            </Typography>
            <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
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
              
              // If piece has only one task, show just the piece name (clickable)
              if (pieceTasks.length <= 1) {
                // For single task pieces, check if the single task is completed
                const singleTaskCompleted = pieceTasks.length > 0 ? completedTasks?.[pieceTasks[0].id] || false : false;
                
                return (
                  <Button
                    key={piece.id}
                    variant="ghost"
                    className={`w-full justify-start h-auto p-4 rounded-2xl transition-all duration-200 ${
                      isActivePiece 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "bg-gray-100 hover:bg-gray-200 text-foreground"
                    }`}
                    onClick={() => handlePieceSelect(piece.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {singleTaskCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : hasProgress ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 text-left">
                        <div className="font-bold text-base">
                          {piece.nom}
                        </div>
                         <div className={`text-sm ${
                           isActivePiece ? 'text-primary-foreground/80' : 'text-muted-foreground'
                         }`}>
                           {pieceTasks[0]?.label || 'À faire'}
                         </div>
                      </div>
                      
                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        <Badge 
                          className={`text-xs ${
                            singleTaskCompleted 
                              ? "bg-success/20 text-success border-success/30" 
                              : hasProgress
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-gray-200 text-gray-600 border-gray-300"
                          }`}
                        >
                          {singleTaskCompleted ? "Validée" : hasProgress ? "En cours" : "À faire"}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                );
              }
              
              // For pieces with multiple tasks, show hierarchical structure
              return (
                <div key={piece.id} className="space-y-2">
                  {/* Piece header (non-clickable) */}
                  <div className="px-4 py-2">
                    <div className="font-bold text-base text-foreground">
                      {piece.nom} :
                    </div>
                  </div>
                  
                  {/* Tasks (clickable) */}
                  <div className="space-y-2 ml-4">
                    {pieceTasks.map((task, taskIndex) => {
                      const isTaskCompleted = completedTasks?.[task.id] || false;
                      const isCurrentTask = isActivePiece && taskIndex === currentTaskIndex;
                      
                      return (
                         <Button
                           key={task.id}
                           variant="ghost"
                           className={`w-full justify-start h-auto p-3 rounded-xl transition-all duration-200 ${
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
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">
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
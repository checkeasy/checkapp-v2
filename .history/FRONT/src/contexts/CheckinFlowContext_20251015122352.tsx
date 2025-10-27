import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PhotoReference } from '@/types/room';
import { useParcoursData } from './GlobalParcoursContext';
import { useActiveCheckId } from './ActiveCheckIdContext';
import { checkSessionManager } from '@/services/checkSessionManager';

interface CheckinFlowStep {
  pieceId: string;
  taskIndex: number;
  stepNumber: number;
  totalSteps: number;
}

interface CheckinFlowState {
  currentStep: CheckinFlowStep;
  completedTasks: Record<string, boolean>;
  takenPhotos: Record<string, PhotoReference[]>;
  isCompleted: boolean;
  flowSequence: CheckinFlowStep[];
}

interface CheckinFlowContextType {
  flowState: CheckinFlowState;
  nextStep: () => void;
  completeStep: (taskId: string) => void;
  jumpToPiece: (pieceId: string, taskIndex: number) => void;
  isPieceCompleted: (pieceId: string, tasks: any[]) => boolean;
  checkAutoAdvancement: (pieces: any[]) => void;
  addTakenPhotos: (taskId: string, photos: PhotoReference[]) => void;
  getTakenPhotos: (taskId: string) => PhotoReference[];
  startCheckin: () => void;
  resetFlow: () => void;
  saveProgressToCheckId: (pieceId: string, taskIndex: number) => Promise<void>; // 🎯 FIX: Exposer pour sauvegarder avant navigation
}

const CheckinFlowContext = createContext<CheckinFlowContextType | undefined>(undefined);

const initialState: CheckinFlowState = {
  currentStep: { pieceId: '', taskIndex: 0, stepNumber: 1, totalSteps: 0 },
  completedTasks: {},
  takenPhotos: {},
  isCompleted: false,
  flowSequence: [],
};

export const CheckinFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [flowState, setFlowState] = useState<CheckinFlowState>(initialState);
  const { rooms } = useParcoursData();
  const { currentCheckId } = useActiveCheckId();

  // 🎯 LAZY INITIALIZATION: Ne s'initialise que sur les routes checkin
  const isCheckinRoute = location.pathname.includes('checkin');

  // 🎯 FIX CRITIQUE: Utiliser un ref pour éviter les chargements multiples
  const hasLoadedProgress = useRef(false);

  // 🆕 FIX: Fonction pour sauvegarder la progression dans CheckID
  const saveProgressToCheckId = useCallback(async (pieceId: string, taskIndex: number) => {
    if (!currentCheckId) {
      console.log('⚠️ CheckinFlow: Pas de CheckID, skip sauvegarde progression');
      return;
    }

    try {
      await checkSessionManager.updateSessionProgress(currentCheckId, {
        currentPieceId: pieceId,
        currentTaskIndex: taskIndex,
        interactions: {} // Préserver les interactions existantes
      });
      console.log('💾 CheckinFlow: Progression sauvegardée:', { pieceId, taskIndex, checkId: currentCheckId });
    } catch (error) {
      console.error('❌ CheckinFlow: Erreur sauvegarde progression:', error);
    }
  }, [currentCheckId]);

  // 🎯 FIX CRITIQUE: Charger la progression depuis CheckID au montage
  // Utilise un ref pour éviter les re-renders infinis
  useEffect(() => {
    const loadProgressFromCheckId = async () => {
      // 🎯 LAZY: Ne rien faire si on n'est pas sur une route checkin
      if (!isCheckinRoute) {
        return;
      }

      // Éviter les chargements multiples
      if (hasLoadedProgress.current) {
        console.log('⏭️ CheckinFlow: Progression déjà chargée, skip');
        return;
      }

      if (!currentCheckId) {
        console.log('⚠️ CheckinFlow: Pas de CheckID, skip chargement progression');
        return;
      }

      if (flowState.flowSequence.length === 0) {
        console.log('⚠️ CheckinFlow: Séquence vide, skip chargement progression');
        return;
      }

      try {
        console.log('🔄 CheckinFlow: Tentative de chargement progression pour checkId:', currentCheckId);
        const session = await checkSessionManager.getCheckSession(currentCheckId);

        if (session?.progress) {
          console.log('📥 CheckinFlow: Progression trouvée:', session.progress);

          // 🆕 FIX: Reconstruire completedTasks depuis pieceStates et buttonClicks
          const reconstructedCompletedTasks: Record<string, boolean> = {};

          // Méthode 1: Depuis pieceStates (état des pièces validées)
          if (session.progress.interactions?.pieceStates) {
            Object.entries(session.progress.interactions.pieceStates).forEach(([pieceId, pieceState]: [string, any]) => {
              // Si la pièce est complétée ou validée, marquer toutes ses tâches comme terminées
              if (pieceState.status === 'completed' || pieceState.status === 'validated') {
                // Trouver la pièce dans le parcours
                const piece = rooms.find(r => r.id === pieceId);
                if (piece?.tasks) {
                  piece.tasks.forEach(task => {
                    reconstructedCompletedTasks[task.id] = true;
                  });
                }
              }
            });
          }

          // Méthode 2: Depuis buttonClicks (clics sur "Pièce conforme")
          if (session.progress.interactions?.buttonClicks) {
            Object.entries(session.progress.interactions.buttonClicks).forEach(([key, clicks]: [string, any[]]) => {
              // Si c'est un clic de validation de pièce
              if (clicks.some((click: any) => click.metadata?.validationMode === 'validated')) {
                // Extraire le taskId du key (format: "validate_TASKID")
                const taskId = key.replace('validate_', '');
                reconstructedCompletedTasks[taskId] = true;
              }
            });
          }

          console.log('✅ CheckinFlow: Tâches complétées restaurées:', Object.keys(reconstructedCompletedTasks).length);

          if (session.progress.currentPieceId && session.progress.currentTaskIndex !== undefined) {
            // Trouver l'étape correspondante dans la séquence
            const stepIndex = flowState.flowSequence.findIndex(
              step => step.pieceId === session.progress.currentPieceId
            );

            if (stepIndex >= 0) {
              const restoredStep = flowState.flowSequence[stepIndex];
              console.log('✅ CheckinFlow: Position restaurée:', restoredStep);

              setFlowState(prev => ({
                ...prev,
                currentStep: restoredStep,
                completedTasks: reconstructedCompletedTasks  // 🆕 AJOUTÉ !
              }));

              // Marquer comme chargé pour éviter les rechargements
              hasLoadedProgress.current = true;
            } else {
              console.warn('⚠️ CheckinFlow: Étape non trouvée dans la séquence:', session.progress.currentPieceId);
            }
          }

          // 🎯 FIX: Ne PAS marquer automatiquement comme complété après F5
          // L'utilisateur doit pouvoir consulter/reprendre son parcours
          // Le flow ne sera complété que quand l'utilisateur clique explicitement sur "Terminer"
          if (session.isFlowCompleted) {
            console.log('ℹ️ CheckinFlow: Session marquée complétée mais pas d\'auto-completion après F5');
            // Ne PAS auto-compléter : l'utilisateur peut vouloir revoir ses photos
          }
        } else {
          console.log('ℹ️ CheckinFlow: Pas de progression sauvegardée pour ce checkId');
        }
      } catch (error) {
        console.error('❌ CheckinFlow: Erreur chargement progression:', error);
      }
    };

    loadProgressFromCheckId();
  }, [currentCheckId, flowState.flowSequence.length, rooms, isCheckinRoute]);

  // Initialiser le flow avec les vraies pièces du parcours
  useEffect(() => {
    // 🎯 LAZY: Ne rien faire si on n'est pas sur une route checkin
    if (!isCheckinRoute) {
      return;
    }

    if (rooms.length > 0 && flowState.flowSequence.length === 0) {
      const flowSequence: CheckinFlowStep[] = rooms.map((room, index) => ({
        pieceId: room.id,
        taskIndex: 0,
        stepNumber: index + 1,
        totalSteps: rooms.length
      }));

      console.log('🔄 CheckinFlow: Initialisation avec les pièces du parcours:', {
        roomsCount: rooms.length,
        flowSequence
      });

      setFlowState(prev => ({
        ...prev,
        flowSequence,
        currentStep: flowSequence[0] || prev.currentStep,
        isCompleted: false
      }));
    }
  }, [rooms.length, flowState.flowSequence.length, isCheckinRoute]);

  const nextStep = () => {
    setFlowState(prev => {
      const currentIndex = prev.flowSequence.findIndex(
        step => step.stepNumber === prev.currentStep.stepNumber
      );

      if (currentIndex < prev.flowSequence.length - 1) {
        const nextStep = prev.flowSequence[currentIndex + 1];

        // 🆕 FIX: Sauvegarder la progression
        saveProgressToCheckId(nextStep.pieceId, nextStep.taskIndex);

        return {
          ...prev,
          currentStep: nextStep
        };
      }

      // 🆕 FIX: Marquer comme complété dans CheckID
      if (currentCheckId) {
        checkSessionManager.completeCheckSession(currentCheckId);
      }

      return {
        ...prev,
        isCompleted: true
      };
    });
  };

  const completeStep = (taskId: string) => {
    setFlowState(prev => ({
      ...prev,
      completedTasks: {
        ...prev.completedTasks,
        [taskId]: true
      }
    }));
  };

  const jumpToPiece = (pieceId: string, taskIndex: number = 0) => {
    setFlowState(prev => {
      const targetStep = prev.flowSequence.find(step =>
        step.pieceId === pieceId && step.taskIndex === taskIndex
      );

      if (targetStep) {
        // 🆕 FIX: Sauvegarder la progression lors du saut
        saveProgressToCheckId(pieceId, taskIndex);

        return {
          ...prev,
          currentStep: targetStep,
          isCompleted: false
        };
      }

      return prev;
    });
  };

  const isPieceCompleted = (pieceId: string, tasks: any[]) => {
    if (!tasks) return false;
    return tasks.every(task => flowState.completedTasks[task.id]);
  };

  const checkAutoAdvancement = (pieces: any[]) => {
    // Check if all pieces are completed
    const allCompleted = pieces.every(piece =>
      piece.tasks?.every((task: any) => flowState.completedTasks[task.id])
    );

    console.log('🔍 CheckinFlow checkAutoAdvancement:', {
      allCompleted,
      piecesCount: pieces.length,
      completedTasksCount: Object.keys(flowState.completedTasks).filter(k => flowState.completedTasks[k]).length,
      totalTasksCount: pieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
    });

    // 🎯 FIX CRITIQUE: Ne plus vérifier isAtLastStep car le flowSequence ne contient qu'une étape par pièce
    // alors que chaque pièce peut avoir plusieurs tâches
    if (allCompleted) {
      console.log('✅ CheckinFlow: Toutes les tâches complétées, marquage isCompleted = true');
      setFlowState(prev => ({ ...prev, isCompleted: true }));
    }
  };

  const addTakenPhotos = (taskId: string, photos: PhotoReference[]) => {
    setFlowState(prev => ({
      ...prev,
      takenPhotos: {
        ...prev.takenPhotos,
        [taskId]: photos
      }
    }));
  };

  const getTakenPhotos = (taskId: string): PhotoReference[] => {
    return flowState.takenPhotos[taskId] || [];
  };

  const startCheckin = () => {
    setFlowState(initialState);
  };

  const resetFlow = () => {
    setFlowState(initialState);
  };

  const contextValue: CheckinFlowContextType = {
    flowState,
    nextStep,
    completeStep,
    jumpToPiece,
    isPieceCompleted,
    checkAutoAdvancement,
    addTakenPhotos,
    getTakenPhotos,
    startCheckin,
    resetFlow,
    saveProgressToCheckId,  // 🎯 FIX: Exposer pour permettre la sauvegarde manuelle avant navigation
  };

  return (
    <CheckinFlowContext.Provider value={contextValue}>
      {children}
    </CheckinFlowContext.Provider>
  );
};

export const useCheckinFlow = (): CheckinFlowContextType => {
  const context = useContext(CheckinFlowContext);
  if (!context) {
    throw new Error('useCheckinFlow must be used within a CheckinFlowProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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
  const [flowState, setFlowState] = useState<CheckinFlowState>(initialState);
  const { rooms } = useParcoursData();
  const { currentCheckId } = useActiveCheckId();

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
                currentStep: restoredStep
              }));

              // Marquer comme chargé pour éviter les rechargements
              hasLoadedProgress.current = true;
            } else {
              console.warn('⚠️ CheckinFlow: Étape non trouvée dans la séquence:', session.progress.currentPieceId);
            }
          }

          if (session.isFlowCompleted) {
            console.log('✅ CheckinFlow: Flow marqué comme complété');
            setFlowState(prev => ({
              ...prev,
              isCompleted: true
            }));
          }
        } else {
          console.log('ℹ️ CheckinFlow: Pas de progression sauvegardée pour ce checkId');
        }
      } catch (error) {
        console.error('❌ CheckinFlow: Erreur chargement progression:', error);
      }
    };

    loadProgressFromCheckId();
  }, [currentCheckId, flowState.flowSequence.length]);

  // Initialiser le flow avec les vraies pièces du parcours
  useEffect(() => {
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
  }, [rooms.length, flowState.flowSequence.length]);

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
    
    // Also check if we're at the end of the flow sequence
    const isAtLastStep = flowState.currentStep.stepNumber === flowState.currentStep.totalSteps;
    
    if (allCompleted && isAtLastStep) {
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
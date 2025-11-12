import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PieceStatus, PhotoReference } from '@/types/room';
import { useParcoursData } from './GlobalParcoursContext';

export interface FlowStep {
  pieceId: string;
  taskIndex: number;
  stepNumber: number;
  totalSteps: number;
}

export interface CheckoutFlowState {
  currentStep: FlowStep;
  isCompleted: boolean;
  completedSteps: string[];
  completedTasks: { [taskId: string]: boolean };
  takenPhotos: { [taskId: string]: PhotoReference[] };
  startTime?: string;
  endTime?: string;
  flowSequence: FlowStep[];
}

interface CheckoutFlowContextType {
  flowState: CheckoutFlowState;
  nextStep: () => void;
  completeStep: (stepId: string) => void;
  resetFlow: () => void;
  jumpToPiece: (pieceId: string, taskIndex?: number) => void;
  isPieceCompleted: (pieceId: string, pieces: PieceStatus[]) => boolean;
  getPieceProgress: (pieceId: string, pieces: PieceStatus[]) => { completed: number; total: number };
  checkAutoAdvancement: (pieces: PieceStatus[]) => void;
  startCheckout: () => void;
  addTakenPhotos: (taskId: string, photos: PhotoReference[]) => void;
}

const CheckoutFlowContext = createContext<CheckoutFlowContextType | undefined>(undefined);

export const CheckoutFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { rooms } = useParcoursData();

  const [flowState, setFlowState] = useState<CheckoutFlowState>({
    currentStep: { pieceId: '', taskIndex: 0, stepNumber: 1, totalSteps: 0 },
    isCompleted: false,
    completedSteps: [],
    completedTasks: {},
    takenPhotos: {},
    flowSequence: []
  });

  // Initialiser le flow avec les vraies pièces du parcours
  useEffect(() => {
    if (rooms.length === 0) return;

    // Calculer le nombre total de tâches dans les rooms
    const totalTasksInRooms = rooms.reduce((sum, room) => sum + (room.tasks?.length || 0), 0);

    // Recalculer la séquence si le nombre de tâches a changé
    if (totalTasksInRooms > 0 && totalTasksInRooms !== flowState.flowSequence.length) {
      // Créer une séquence avec toutes les tâches de toutes les pièces
      const flowSequence: FlowStep[] = [];
      let stepNumber = 1;

      rooms.forEach(room => {
        const taskCount = room.tasks?.length || 0;
        for (let taskIndex = 0; taskIndex < taskCount; taskIndex++) {
          flowSequence.push({
            pieceId: room.id,
            taskIndex,
            stepNumber: stepNumber++,
            totalSteps: 0 // Sera mis à jour après
          });
        }
      });

      // Mettre à jour totalSteps
      const totalSteps = flowSequence.length;
      flowSequence.forEach(step => {
        step.totalSteps = totalSteps;
      });

      console.log('🔄 CheckoutFlow: Initialisation avec les pièces du parcours:', {
        roomsCount: rooms.length,
        totalSteps,
        firstStep: flowSequence[0],
        flowSequence
      });

      setFlowState(prev => ({
        ...prev,
        flowSequence,
        currentStep: flowSequence[0] || prev.currentStep,
        isCompleted: false
      }));
    }
  }, [rooms, flowState.flowSequence.length]);

  const nextStep = () => {
    setFlowState(prev => {
      const currentIndex = prev.flowSequence.findIndex(
        step => step.pieceId === prev.currentStep.pieceId &&
                step.taskIndex === prev.currentStep.taskIndex
      );

      if (currentIndex < prev.flowSequence.length - 1) {
        // Move to next step
        return {
          ...prev,
          currentStep: prev.flowSequence[currentIndex + 1]
        };
      } else {
        // Only complete if we're truly at the end
        return {
          ...prev,
          isCompleted: true
        };
      }
    });
  };

  const completeStep = (stepId: string) => {
    setFlowState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId],
      completedTasks: { ...prev.completedTasks, [stepId]: true }
    }));
  };

  const jumpToPiece = (pieceId: string, taskIndex: number = 0) => {
    setFlowState(prev => {
      const targetStepIndex = prev.flowSequence.findIndex(
        step => step.pieceId === pieceId && step.taskIndex === taskIndex
      );

      if (targetStepIndex !== -1) {
        return {
          ...prev,
          currentStep: prev.flowSequence[targetStepIndex]
        };
      }

      return prev;
    });
  };

  const isPieceCompleted = (pieceId: string, pieces: PieceStatus[]): boolean => {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece?.tasks) return false;
    
    return piece.tasks.every(task => flowState.completedTasks[task.id]);
  };

  const getPieceProgress = (pieceId: string, pieces: PieceStatus[]) => {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece?.tasks) return { completed: 0, total: 0 };
    
    const completed = piece.tasks.filter(task => flowState.completedTasks[task.id]).length;
    return { completed, total: piece.tasks.length };
  };

  const checkAutoAdvancement = (pieces: PieceStatus[]) => {
    setFlowState(prev => {
      const currentPieceId = prev.currentStep.pieceId;

      if (isPieceCompleted(currentPieceId, pieces)) {
        // Find next piece in the flow sequence, not just in the pieces array
        const currentStepIndex = prev.flowSequence.findIndex(
          step => step.pieceId === prev.currentStep.pieceId &&
                  step.taskIndex === prev.currentStep.taskIndex
        );

        // Check if there are more steps in the sequence
        if (currentStepIndex < prev.flowSequence.length - 1) {
          // Move to next step in sequence
          return {
            ...prev,
            currentStep: prev.flowSequence[currentStepIndex + 1]
          };
        } else {
          // Check if ALL tasks in ALL pieces are really completed before marking as done
          const allTasksCompleted = prev.flowSequence.every(step => {
            const piece = pieces.find(p => p.id === step.pieceId);
            const task = piece?.tasks?.[step.taskIndex];
            return task ? prev.completedTasks[task.id] : false;
          });

          if (allTasksCompleted) {
            return {
              ...prev,
              isCompleted: true,
              endTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };
          }
        }
      }

      return prev;
    });
  };

  const startCheckout = () => {
    setFlowState(prev => ({
      ...prev,
      startTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }));
  };

  const addTakenPhotos = (taskId: string, photos: PhotoReference[]) => {
    setFlowState(prev => ({
      ...prev,
      takenPhotos: { ...prev.takenPhotos, [taskId]: photos }
    }));
  };

  const resetFlow = () => {
    setFlowState(prev => ({
      currentStep: prev.flowSequence[0] || { pieceId: '', taskIndex: 0, stepNumber: 1, totalSteps: 0 },
      isCompleted: false,
      completedSteps: [],
      completedTasks: {},
      takenPhotos: {},
      startTime: undefined,
      endTime: undefined,
      flowSequence: prev.flowSequence
    }));
  };

  return (
    <CheckoutFlowContext.Provider value={{ 
      flowState, 
      nextStep, 
      completeStep, 
      resetFlow, 
      jumpToPiece, 
      isPieceCompleted, 
      getPieceProgress, 
      checkAutoAdvancement,
      startCheckout,
      addTakenPhotos
    }}>
      {children}
    </CheckoutFlowContext.Provider>
  );
};

export const useCheckoutFlow = () => {
  const context = useContext(CheckoutFlowContext);
  if (context === undefined) {
    throw new Error('useCheckoutFlow must be used within a CheckoutFlowProvider');
  }
  return context;
};
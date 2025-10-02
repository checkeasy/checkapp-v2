import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
        return {
          ...prev,
          currentStep: prev.flowSequence[currentIndex + 1]
        };
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
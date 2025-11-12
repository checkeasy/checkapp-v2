import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PhotoReference } from '@/types/room';

/**
 * 🎯 UnifiedFlowContext
 * 
 * Context unifié qui remplace progressivement CheckoutFlowContext et CheckinFlowContext
 * Gère le flux complet: checkin → cleaning → checkout
 */

export type FlowType = 'checkin' | 'checkout';

export interface UnifiedFlowStep {
  pieceId: string;
  taskIndex: number;
  stepNumber: number;
  totalSteps: number;
  flowType: FlowType;
}

export interface UnifiedFlowState {
  flowType: FlowType;
  currentStep: UnifiedFlowStep;
  isCompleted: boolean;
  completedSteps: string[];
  completedTasks: { [taskId: string]: boolean };
  takenPhotos: { [taskId: string]: PhotoReference[] };
  startTime?: string;
  endTime?: string;
}

interface UnifiedFlowContextType {
  flowState: UnifiedFlowState;
  setFlowType: (type: FlowType) => void;
  nextStep: () => void;
  completeStep: (stepId: string) => void;
  resetFlow: () => void;
  jumpToPiece: (pieceId: string, taskIndex?: number) => void;
  isPieceCompleted: (pieceId: string, pieces: any[]) => boolean;
  getPieceProgress: (pieceId: string, pieces: any[]) => { completed: number; total: number };
  checkAutoAdvancement: (pieces: any[]) => void;
  startFlow: () => void;
  addTakenPhotos: (taskId: string, photos: PhotoReference[]) => void;
  getTakenPhotos: (taskId: string) => PhotoReference[];
}

const UnifiedFlowContext = createContext<UnifiedFlowContextType | undefined>(undefined);

// Séquences de flow par type
const CHECKIN_SEQUENCE: Omit<UnifiedFlowStep, 'flowType'>[] = [
  { pieceId: 'chambre', taskIndex: 0, stepNumber: 1, totalSteps: 3 },
  { pieceId: 'salon', taskIndex: 0, stepNumber: 2, totalSteps: 3 },
  { pieceId: 'cuisine', taskIndex: 0, stepNumber: 3, totalSteps: 3 }
];

const CHECKOUT_SEQUENCE: Omit<UnifiedFlowStep, 'flowType'>[] = [
  { pieceId: 'chambre', taskIndex: 0, stepNumber: 1, totalSteps: 5 },
  { pieceId: 'chambre', taskIndex: 1, stepNumber: 2, totalSteps: 5 },
  { pieceId: 'chambre', taskIndex: 2, stepNumber: 3, totalSteps: 5 },
  { pieceId: 'salon', taskIndex: 0, stepNumber: 4, totalSteps: 5 },
  { pieceId: 'cuisine', taskIndex: 0, stepNumber: 5, totalSteps: 5 }
];

export const UnifiedFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [flowState, setFlowState] = useState<UnifiedFlowState>(() => {
    const initialSequence = CHECKIN_SEQUENCE;
    return {
      flowType: 'checkin',
      currentStep: { ...initialSequence[0], flowType: 'checkin' },
      isCompleted: false,
      completedSteps: [],
      completedTasks: {},
      takenPhotos: {}
    };
  });

  const getCurrentSequence = () => {
    return flowState.flowType === 'checkin' ? CHECKIN_SEQUENCE : CHECKOUT_SEQUENCE;
  };

  const setFlowType = (type: FlowType) => {
    const sequence = type === 'checkin' ? CHECKIN_SEQUENCE : CHECKOUT_SEQUENCE;
    setFlowState({
      flowType: type,
      currentStep: { ...sequence[0], flowType: type },
      isCompleted: false,
      completedSteps: [],
      completedTasks: {},
      takenPhotos: {}
    });
  };

  const nextStep = () => {
    const sequence = getCurrentSequence();
    const currentIndex = sequence.findIndex(
      step => step.pieceId === flowState.currentStep.pieceId && 
              step.taskIndex === flowState.currentStep.taskIndex
    );

    if (currentIndex < sequence.length - 1) {
      setFlowState(prev => ({
        ...prev,
        currentStep: { ...sequence[currentIndex + 1], flowType: prev.flowType }
      }));
    } else {
      setFlowState(prev => ({
        ...prev,
        isCompleted: true,
        endTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }));
    }
  };

  const completeStep = (stepId: string) => {
    setFlowState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId],
      completedTasks: { ...prev.completedTasks, [stepId]: true }
    }));
  };

  const jumpToPiece = (pieceId: string, taskIndex: number = 0) => {
    const sequence = getCurrentSequence();
    const targetStepIndex = sequence.findIndex(
      step => step.pieceId === pieceId && step.taskIndex === taskIndex
    );
    
    if (targetStepIndex !== -1) {
      setFlowState(prev => ({
        ...prev,
        currentStep: { ...sequence[targetStepIndex], flowType: prev.flowType }
      }));
    }
  };

  const isPieceCompleted = (pieceId: string, pieces: any[]): boolean => {
    const piece = pieces.find((p: any) => p.id === pieceId);
    if (!piece?.tasks) return false;
    
    return piece.tasks.every((task: any) => flowState.completedTasks[task.id]);
  };

  const getPieceProgress = (pieceId: string, pieces: any[]) => {
    const piece = pieces.find((p: any) => p.id === pieceId);
    if (!piece?.tasks) return { completed: 0, total: 0 };
    
    const completed = piece.tasks.filter((task: any) => flowState.completedTasks[task.id]).length;
    return { completed, total: piece.tasks.length };
  };

  const checkAutoAdvancement = (pieces: any[]) => {
    const sequence = getCurrentSequence();
    const currentPieceId = flowState.currentStep.pieceId;
    
    if (isPieceCompleted(currentPieceId, pieces)) {
      const currentStepIndex = sequence.findIndex(
        step => step.pieceId === flowState.currentStep.pieceId && 
                step.taskIndex === flowState.currentStep.taskIndex
      );
      
      if (currentStepIndex < sequence.length - 1) {
        nextStep();
      } else {
        const allTasksCompleted = sequence.every(step => {
          const piece = pieces.find((p: any) => p.id === step.pieceId);
          const task = piece?.tasks?.[step.taskIndex];
          return task ? flowState.completedTasks[task.id] : false;
        });
        
        if (allTasksCompleted) {
          setFlowState(prev => ({ 
            ...prev, 
            isCompleted: true,
            endTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          }));
        }
      }
    }
  };

  const startFlow = () => {
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

  const getTakenPhotos = (taskId: string): PhotoReference[] => {
    return flowState.takenPhotos[taskId] || [];
  };

  const resetFlow = () => {
    const sequence = getCurrentSequence();
    setFlowState({
      flowType: flowState.flowType,
      currentStep: { ...sequence[0], flowType: flowState.flowType },
      isCompleted: false,
      completedSteps: [],
      completedTasks: {},
      takenPhotos: {},
      startTime: undefined,
      endTime: undefined
    });
  };

  return (
    <UnifiedFlowContext.Provider value={{ 
      flowState,
      setFlowType,
      nextStep, 
      completeStep, 
      resetFlow, 
      jumpToPiece, 
      isPieceCompleted, 
      getPieceProgress, 
      checkAutoAdvancement,
      startFlow,
      addTakenPhotos,
      getTakenPhotos
    }}>
      {children}
    </UnifiedFlowContext.Provider>
  );
};

export const useUnifiedFlow = () => {
  const context = useContext(UnifiedFlowContext);
  if (context === undefined) {
    throw new Error('useUnifiedFlow must be used within a UnifiedFlowProvider');
  }
  return context;
};


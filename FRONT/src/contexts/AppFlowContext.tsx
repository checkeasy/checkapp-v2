import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FlowStage = 'checkin' | 'cleaning' | 'checkout' | 'completed';

interface AppFlowState {
  currentStage: FlowStage;
  checkinCompleted: boolean;
  cleaningProgress: number; // 0-100
  checkoutCompleted: boolean;
  entryPhotosCount: number;
  exitPhotosCount: number;
  totalTasks: number;
  completedTasks: number;
}

interface AppFlowContextType {
  flowState: AppFlowState;
  updateFlowState: (updates: Partial<AppFlowState>) => void;
  completeCheckin: () => void;
  updateCleaningProgress: (completedTasks: number, totalTasks: number) => void;
  completeCheckout: () => void;
  resetFlow: () => void;
  getStageConfig: () => {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaAction: () => void;
    showCTA: boolean;
  };
}

const AppFlowContext = createContext<AppFlowContextType | undefined>(undefined);

const STORAGE_KEY = 'app-flow-state';

const initialState: AppFlowState = {
  currentStage: 'checkin',
  checkinCompleted: false,
  cleaningProgress: 0,
  checkoutCompleted: false,
  entryPhotosCount: 0,
  exitPhotosCount: 0,
  totalTasks: 0,
  completedTasks: 0,
};

export const AppFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [flowState, setFlowState] = useState<AppFlowState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialState;
    } catch {
      return initialState;
    }
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flowState));
  }, [flowState]);

  // Auto-determine current stage based on progress
  useEffect(() => {
    let newStage: FlowStage = 'checkin';
    
    if (flowState.checkoutCompleted) {
      newStage = 'completed';
    } else if (flowState.cleaningProgress === 100) {
      newStage = 'checkout';
    } else if (flowState.checkinCompleted) {
      newStage = 'cleaning';
    }

    if (newStage !== flowState.currentStage) {
      setFlowState(prev => ({ ...prev, currentStage: newStage }));
    }
  }, [flowState.checkinCompleted, flowState.cleaningProgress, flowState.checkoutCompleted]);

  const updateFlowState = (updates: Partial<AppFlowState>) => {
    setFlowState(prev => ({ ...prev, ...updates }));
  };

  const completeCheckin = () => {
    setFlowState(prev => ({
      ...prev,
      checkinCompleted: true,
      currentStage: 'cleaning'
    }));
  };

  const updateCleaningProgress = (completedTasks: number, totalTasks: number) => {
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    setFlowState(prev => ({
      ...prev,
      completedTasks,
      totalTasks,
      cleaningProgress: progress,
      currentStage: progress === 100 ? 'checkout' : 'cleaning'
    }));
  };

  const completeCheckout = () => {
    setFlowState(prev => ({
      ...prev,
      checkoutCompleted: true,
      currentStage: 'completed'
    }));
  };

  const resetFlow = () => {
    setFlowState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getStageConfig = () => {
    switch (flowState.currentStage) {
      case 'checkin':
        return {
          title: 'Check d\'entrée',
          subtitle: 'Photographiez l\'état actuel du logement',
          ctaText: 'Faire le check d\'entrée',
          ctaAction: () => window.location.href = '/checkin',
          showCTA: true
        };
      
      case 'cleaning':
        return {
          title: 'Ménage en cours',
          subtitle: `${flowState.completedTasks}/${flowState.totalTasks} tâches terminées (${flowState.cleaningProgress}%)`,
          ctaText: 'Continuer le ménage',
          ctaAction: () => {}, // Stay on current page
          showCTA: false
        };
      
      case 'checkout':
        return {
          title: 'Check de sortie',
          subtitle: 'Vérifiez et documentez l\'état final',
          ctaText: 'Faire le check de sortie',
          ctaAction: () => window.location.href = '/checkout',
          showCTA: true
        };
      
      case 'completed':
        return {
          title: 'Parcours terminé',
          subtitle: 'Tous les contrôles ont été effectués avec succès',
          ctaText: 'Nouveau parcours',
          ctaAction: resetFlow,
          showCTA: true
        };
      
      default:
        return {
          title: 'Parcours ménage',
          subtitle: 'État du parcours inconnu',
          ctaText: 'Commencer',
          ctaAction: resetFlow,
          showCTA: true
        };
    }
  };

  const contextValue: AppFlowContextType = {
    flowState,
    updateFlowState,
    completeCheckin,
    updateCleaningProgress,
    completeCheckout,
    resetFlow,
    getStageConfig,
  };

  return (
    <AppFlowContext.Provider value={contextValue}>
      {children}
    </AppFlowContext.Provider>
  );
};

export const useAppFlow = (): AppFlowContextType => {
  const context = useContext(AppFlowContext);
  if (!context) {
    throw new Error('useAppFlow must be used within an AppFlowProvider');
  }
  return context;
};
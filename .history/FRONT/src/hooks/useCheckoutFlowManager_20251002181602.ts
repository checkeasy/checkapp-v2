/**
 * 🚀 Hook de gestion du flux checkout avec synchronisation CheckID
 * Gère la progression, les tâches complétées, et la synchronisation avec CheckID
 */

import { useState, useEffect, useCallback } from 'react';
import { PieceStatus } from '@/types/room';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { checkSessionManager } from '@/services/checkSessionManager';

export interface CheckoutFlowManager {
  currentPieceId: string;
  currentTaskIndex: number;
  pieces: PieceStatus[];
  isFlowCompleted: boolean;
  totalProgress: number;
  goToNextTask: () => void;
  goToPreviousTask: () => void;
  jumpToPiece: (pieceId: string, taskIndex?: number) => void;
  completeCurrentTask: () => void;
  isPieceCompleted: (pieceId: string) => boolean;
  getPieceProgress: (pieceId: string) => { completed: number; total: number };
  getCurrentPiece: () => PieceStatus | undefined;
  getCurrentTask: () => any;
}

export function useCheckoutFlowManager(
  initialPieces: PieceStatus[],
  parcoursId?: string
): CheckoutFlowManager {
  const { currentCheckId } = useActiveCheckId();
  const [pieces, setPieces] = useState<PieceStatus[]>(initialPieces);
  const [currentPieceId, setCurrentPieceId] = useState<string>(
    initialPieces[0]?.id || ''
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [isFlowCompleted, setIsFlowCompleted] = useState(false);

  /**
   * 🔄 Mettre à jour pieces quand initialPieces change (après forceCheckoutMode par exemple)
   */
  useEffect(() => {
    if (initialPieces.length > 0) {
      // Comparer les valeurs au lieu de la référence pour éviter la boucle infinie
      const hasChanged =
        pieces.length !== initialPieces.length ||
        pieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) !==
        initialPieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);

      if (hasChanged) {
        console.log('🔄 useCheckoutFlowManager: Mise à jour pieces:', {
          oldCount: pieces.length,
          newCount: initialPieces.length,
          oldTotalTasks: pieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0),
          newTotalTasks: initialPieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
        });
        setPieces(initialPieces);
      }
    }
  }, [initialPieces, pieces.length]);

  /**
   * 📥 Charger la progression depuis CheckID au montage
   */
  useEffect(() => {
    const loadProgressFromCheckId = async () => {
      if (!currentCheckId) return;

      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session?.progress) {
          console.log('📥 Chargement progression depuis CheckID:', session.progress);
          
          if (session.progress.currentPieceId) {
            setCurrentPieceId(session.progress.currentPieceId);
          }
          if (session.progress.currentTaskIndex !== undefined) {
            setCurrentTaskIndex(session.progress.currentTaskIndex);
          }
          if (session.isFlowCompleted) {
            setIsFlowCompleted(true);
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement progression:', error);
      }
    };

    loadProgressFromCheckId();
  }, [currentCheckId]);

  /**
   * 💾 Sauvegarder la progression dans CheckID
   */
  const saveProgressToCheckId = useCallback(async (
    pieceId: string,
    taskIndex: number
  ) => {
    if (!currentCheckId) return;

    try {
      await checkSessionManager.updateSessionProgress(currentCheckId, {
        currentPieceId: pieceId,
        currentTaskIndex: taskIndex,
        interactions: {} // Préserver les interactions existantes
      });
      console.log('💾 Progression sauvegardée:', { pieceId, taskIndex });
    } catch (error) {
      console.error('❌ Erreur sauvegarde progression:', error);
    }
  }, [currentCheckId]);

  /**
   * ➡️ Passer à la tâche suivante
   */
  const goToNextTask = useCallback(() => {
    const currentPiece = pieces.find(p => p.id === currentPieceId);
    if (!currentPiece) return;

    const totalTasks = currentPiece.tasks.length;

    if (currentTaskIndex < totalTasks - 1) {
      // Tâche suivante dans la même pièce
      const newTaskIndex = currentTaskIndex + 1;
      setCurrentTaskIndex(newTaskIndex);
      saveProgressToCheckId(currentPieceId, newTaskIndex);
    } else {
      // Passer à la pièce suivante
      const currentPieceIndex = pieces.findIndex(p => p.id === currentPieceId);
      if (currentPieceIndex < pieces.length - 1) {
        const nextPiece = pieces[currentPieceIndex + 1];
        setCurrentPieceId(nextPiece.id);
        setCurrentTaskIndex(0);
        saveProgressToCheckId(nextPiece.id, 0);
      } else {
        // Flux terminé
        setIsFlowCompleted(true);
        if (currentCheckId) {
          checkSessionManager.completeCheckSession(currentCheckId);
        }
      }
    }
  }, [pieces, currentPieceId, currentTaskIndex, saveProgressToCheckId, currentCheckId]);

  /**
   * ⬅️ Revenir à la tâche précédente
   */
  const goToPreviousTask = useCallback(() => {
    if (currentTaskIndex > 0) {
      // Tâche précédente dans la même pièce
      const newTaskIndex = currentTaskIndex - 1;
      setCurrentTaskIndex(newTaskIndex);
      saveProgressToCheckId(currentPieceId, newTaskIndex);
    } else {
      // Revenir à la pièce précédente
      const currentPieceIndex = pieces.findIndex(p => p.id === currentPieceId);
      if (currentPieceIndex > 0) {
        const previousPiece = pieces[currentPieceIndex - 1];
        const lastTaskIndex = previousPiece.tasks.length - 1;
        setCurrentPieceId(previousPiece.id);
        setCurrentTaskIndex(lastTaskIndex);
        saveProgressToCheckId(previousPiece.id, lastTaskIndex);
      }
    }
  }, [pieces, currentPieceId, currentTaskIndex, saveProgressToCheckId]);

  /**
   * 🎯 Sauter à une pièce spécifique
   */
  const jumpToPiece = useCallback((pieceId: string, taskIndex: number = 0) => {
    setCurrentPieceId(pieceId);
    setCurrentTaskIndex(taskIndex);
    saveProgressToCheckId(pieceId, taskIndex);
  }, [saveProgressToCheckId]);

  /**
   * ✅ Marquer la tâche actuelle comme complétée
   */
  const completeCurrentTask = useCallback(() => {
    setPieces(prevPieces => {
      return prevPieces.map(piece => {
        if (piece.id === currentPieceId) {
          return {
            ...piece,
            tasks: piece.tasks.map((task, index) => {
              if (index === currentTaskIndex) {
                return { ...task, completed: true };
              }
              return task;
            })
          };
        }
        return piece;
      });
    });
  }, [currentPieceId, currentTaskIndex]);

  /**
   * 🔍 Vérifier si une pièce est complétée
   */
  const isPieceCompleted = useCallback((pieceId: string): boolean => {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return false;
    return piece.tasks.every(task => task.completed);
  }, [pieces]);

  /**
   * 📊 Obtenir la progression d'une pièce
   */
  const getPieceProgress = useCallback((pieceId: string): { completed: number; total: number } => {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return { completed: 0, total: 0 };
    
    const completed = piece.tasks.filter(task => task.completed).length;
    const total = piece.tasks.length;
    
    return { completed, total };
  }, [pieces]);

  /**
   * 📈 Calculer la progression totale
   */
  const totalProgress = pieces.reduce((acc, piece) => {
    const { completed, total } = getPieceProgress(piece.id);
    return acc + (total > 0 ? (completed / total) * 100 : 0);
  }, 0) / pieces.length;

  /**
   * 🎯 Obtenir la pièce actuelle
   */
  const getCurrentPiece = useCallback((): PieceStatus | undefined => {
    return pieces.find(p => p.id === currentPieceId);
  }, [pieces, currentPieceId]);

  /**
   * 📋 Obtenir la tâche actuelle
   */
  const getCurrentTask = useCallback(() => {
    const currentPiece = getCurrentPiece();
    if (!currentPiece) return undefined;
    return currentPiece.tasks[currentTaskIndex];
  }, [getCurrentPiece, currentTaskIndex]);

  return {
    currentPieceId,
    currentTaskIndex,
    pieces,
    isFlowCompleted,
    totalProgress,
    goToNextTask,
    goToPreviousTask,
    jumpToPiece,
    completeCurrentTask,
    isPieceCompleted,
    getPieceProgress,
    getCurrentPiece,
    getCurrentTask
  };
}


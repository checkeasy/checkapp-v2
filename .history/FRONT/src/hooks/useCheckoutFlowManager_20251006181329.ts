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
  restoreCompletedTasks: (completedTaskIds: Set<string>) => void;
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
   * 🎯 FIX: Préserver les états de complétion lors de la mise à jour
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

        // 🎯 FIX: Créer un map des tâches complétées pour les préserver
        const completedTasksMap = new Map<string, boolean>();
        pieces.forEach(piece => {
          piece.tasks?.forEach(task => {
            if (task.completed) {
              completedTasksMap.set(task.id, true);
            }
          });
        });

        // 🎯 FIX: Merger les états de complétion dans les nouvelles pieces
        const mergedPieces = initialPieces.map(piece => ({
          ...piece,
          tasks: piece.tasks?.map(task => ({
            ...task,
            completed: completedTasksMap.has(task.id) ? true : (task.completed || false)
          }))
        }));

        console.log('✅ useCheckoutFlowManager: États de complétion préservés:', {
          completedTasksCount: completedTasksMap.size,
          preservedInNewPieces: mergedPieces.reduce((sum, p) =>
            sum + (p.tasks?.filter(t => t.completed).length || 0), 0)
        });

        setPieces(mergedPieces);
      }
    }
  }, [initialPieces, pieces.length]);

  /**
   * 📥 Charger la progression depuis CheckID au montage
   * 🎯 FIX: Restaurer les checkboxes ET sélectionner intelligemment la pièce
   */
  useEffect(() => {
    const loadProgressFromCheckId = async () => {
      if (!currentCheckId) return;

      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session?.progress) {
          console.log('📥 Chargement progression depuis CheckID:', session.progress);

          // 🎯 NOUVEAU: Restaurer les états des checkboxes AVANT de définir la position
          const checkboxStates = session.progress.interactions?.checkboxStates;
          if (checkboxStates) {
            const completedTaskIds = new Set<string>();

            Object.entries(checkboxStates).forEach(([checkboxId, checkboxData]: [string, any]) => {
              const isChecked = typeof checkboxData === 'boolean'
                ? checkboxData
                : checkboxData?.isChecked || false;

              if (isChecked) {
                const taskId = checkboxId.replace('checkbox_', '');
                completedTaskIds.add(taskId);
              }
            });

            if (completedTaskIds.size > 0) {
              console.log('☑️ useCheckoutFlowManager: Restauration checkboxes:', {
                totalCheckboxes: Object.keys(checkboxStates).length,
                completedTasks: completedTaskIds.size,
                taskIds: Array.from(completedTaskIds)
              });

              // Restaurer les tâches complétées
              setPieces(prevPieces => {
                return prevPieces.map(piece => ({
                  ...piece,
                  tasks: piece.tasks?.map(task =>
                    completedTaskIds.has(task.id)
                      ? { ...task, completed: true }
                      : task
                  )
                }));
              });
            }
          }

          // 🎯 NOUVEAU: Trouver la première pièce avec des tâches incomplètes
          // Au lieu de simplement restaurer la dernière position
          const findFirstIncompletePiece = () => {
            for (const piece of pieces) {
              const incompleteTasks = piece.tasks?.filter(t => !t.completed) || [];
              if (incompleteTasks.length > 0) {
                const firstIncompleteIndex = piece.tasks?.findIndex(t => !t.completed) || 0;
                return {
                  pieceId: piece.id,
                  taskIndex: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0
                };
              }
            }
            // Si toutes les tâches sont complétées, retourner la dernière pièce
            const lastPiece = pieces[pieces.length - 1];
            return {
              pieceId: lastPiece?.id || pieces[0]?.id || '',
              taskIndex: (lastPiece?.tasks?.length || 1) - 1
            };
          };

          const optimalPosition = findFirstIncompletePiece();

          console.log('🎯 useCheckoutFlowManager: Sélection intelligente de la pièce:', {
            savedPosition: {
              pieceId: session.progress.currentPieceId,
              taskIndex: session.progress.currentTaskIndex
            },
            optimalPosition,
            reason: 'Première pièce avec tâches incomplètes'
          });

          // Utiliser la position optimale au lieu de la position sauvegardée
          setCurrentPieceId(optimalPosition.pieceId);
          setCurrentTaskIndex(optimalPosition.taskIndex);

          // 🎯 FIX: Do NOT restore isFlowCompleted from session
          // This was causing automatic redirects when loading a previously completed session
          // The flow completion should only be determined by actual task completion state
          // NOT by a saved flag that might be stale or incorrect
          console.log('ℹ️ Ignoring session.isFlowCompleted to prevent unwanted redirects');
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

  /**
   * 🔄 Restaure les tâches complétées depuis IndexedDB
   */
  const restoreCompletedTasks = useCallback((completedTaskIds: Set<string>) => {
    console.log('🔄 useCheckoutFlowManager: Restauration tâches complétées:', Array.from(completedTaskIds));
    
    setPieces(prevPieces => {
      const updatedPieces = prevPieces.map(piece => ({
        ...piece,
        tasks: piece.tasks?.map(task => 
          completedTaskIds.has(task.id)
            ? { ...task, completed: true }
            : task
        )
      }));

      console.log('✅ useCheckoutFlowManager: Tâches restaurées dans state:', {
        totalCompleted: completedTaskIds.size,
        piecesUpdated: updatedPieces.filter(p => p.tasks?.some(t => t.completed)).length
      });

      return updatedPieces;
    });
  }, []);

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
    getCurrentTask,
    restoreCompletedTasks
  };
}


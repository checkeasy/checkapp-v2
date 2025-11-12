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
  saveProgressToCheckId: (pieceId: string, taskIndex: number) => Promise<void>; // 🎯 FIX: Exposer pour sauvegarder avant navigation
}

export function useCheckoutFlowManager(
  initialPieces: PieceStatus[],
  parcoursId?: string
): CheckoutFlowManager {
  const { currentCheckId } = useActiveCheckId();
  const [pieces, setPieces] = useState<PieceStatus[]>(initialPieces);

  // 🎯 DEBUG: Log l'ordre des pièces reçues
  console.log('🔍 useCheckoutFlowManager - Ordre des initialPieces:', initialPieces.map((p, i) => ({
    index: i,
    nom: p.nom,
    ordre: p.ordre,
    id: p.id
  })));

  const [currentPieceId, setCurrentPieceId] = useState<string>(
    initialPieces[0]?.id || ''
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [isFlowCompleted, setIsFlowCompleted] = useState(false);

  // 🎯 DEBUG: Log la pièce sélectionnée au démarrage
  console.log('🎯 useCheckoutFlowManager - Pièce sélectionnée au démarrage:', {
    currentPieceId: initialPieces[0]?.id,
    nom: initialPieces[0]?.nom,
    ordre: initialPieces[0]?.ordre
  });

  /**
   * 🔄 Mettre à jour pieces quand initialPieces change (après forceCheckoutMode par exemple)
   * 🎯 FIX: Préserver les états de complétion lors de la mise à jour
   * 🎯 IMPORTANT: Aussi charger depuis IndexedDB pour restaurer après F5
   */
  useEffect(() => {
    const updatePiecesWithRestoration = async () => {
      if (initialPieces.length === 0) return;

      // Comparer les valeurs au lieu de la référence pour éviter la boucle infinie
      const hasChanged =
        pieces.length !== initialPieces.length ||
        pieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) !==
        initialPieces.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);

      if (!hasChanged) return;

      // 🎯 FIX CRITIQUE: Charger les états depuis IndexedDB si on a un checkId
      const completedTasksMap = new Map<string, boolean>();

      // 1. D'abord, préserver les états actuels en mémoire
      pieces.forEach(piece => {
        piece.tasks?.forEach(task => {
          if (task.completed) {
            completedTasksMap.set(task.id, true);
          }
        });
      });

      // 2. Ensuite, charger depuis IndexedDB (priorité absolue)
      // 🎯 FIX CRITIQUE: Vérifier que le parcoursId correspond avant de charger les données
      if (currentCheckId) {
        try {
          const session = await checkSessionManager.getCheckSession(currentCheckId);

          // 🎯 VALIDATION: Vérifier que le parcoursId de la session correspond au parcoursId actuel
          if (session && parcoursId && session.parcoursId !== parcoursId) {
            console.warn('⚠️ ParcoursId mismatch! Session:', session.parcoursId, 'vs Actuel:', parcoursId);
            console.warn('⚠️ Ignorer les données de l\'ancien parcours pour éviter la contamination');
            // Ne PAS charger les données d'un autre parcours !
            return;
          }

          // 🎯 NOUVEAU: Restaurer les tâches complétées depuis checkboxStates
          const checkboxStates = session?.progress?.interactions?.checkboxStates;

          if (checkboxStates) {
            console.log('🔍 Restauration checkboxStates - Clés trouvées:', Object.keys(checkboxStates));

            Object.entries(checkboxStates).forEach(([checkboxId, checkboxData]: [string, any]) => {
              const isChecked = typeof checkboxData === 'boolean'
                ? checkboxData
                : checkboxData?.isChecked || false;

              console.log('🔍 Analyse checkbox:', {
                checkboxId,
                isChecked,
                checkboxData: typeof checkboxData === 'object' ? checkboxData : 'boolean'
              });

              if (isChecked) {
                // 🎯 NOUVEAU: Extraire le taskId de plusieurs formats possibles
                let taskId = checkboxId;

                // Format 1: checkbox_<taskId> (ancien format)
                if (checkboxId.startsWith('checkbox_')) {
                  taskId = checkboxId.replace('checkbox_', '');
                }
                // Format 2: taskId directement (nouveau format simplifié)
                else if (!checkboxId.includes('_')) {
                  taskId = checkboxId;
                }
                // Format 3: taskId depuis checkboxData
                else if (checkboxData?.taskId) {
                  taskId = checkboxData.taskId;
                }

                console.log('✅ Tâche marquée comme complétée:', taskId);
                completedTasksMap.set(taskId, true);
              }
            });

            console.log('✅ Restauration checkboxStates:', completedTasksMap.size, 'tâches complétées depuis IndexedDB pour parcours:', parcoursId, {
              checkboxStates: Object.keys(checkboxStates),
              completedTasks: Array.from(completedTasksMap.keys())
            });
          } else {
            console.warn('⚠️ Aucun état de checkbox trouvé dans IndexedDB');
          }

          // 🎯 NOUVEAU: Restaurer aussi les tâches photo complétées depuis photosTaken
          const photosTaken = session?.progress?.interactions?.photosTaken;
          if (photosTaken) {
            console.log('🔍 Restauration photosTaken - Clés trouvées:', Object.keys(photosTaken));

            Object.entries(photosTaken).forEach(([photoKey, photoData]: [string, any]) => {
              // Les photos sont stockées avec une clé comme "pieceId_etapeId_photoIndex"
              // On extrait le taskId (etapeId)
              if (Array.isArray(photoData) && photoData.length > 0) {
                const firstPhoto = photoData[0];
                // Essayer d'extraire le taskId de plusieurs sources
                let taskId = firstPhoto?.taskId || firstPhoto?.etapeId;

                // Si pas trouvé, extraire de la clé (format: pieceId_etapeId_photoIndex)
                if (!taskId) {
                  const parts = photoKey.split('_');
                  if (parts.length >= 2) {
                    taskId = parts[1]; // etapeId est la deuxième partie
                  }
                }

                if (taskId) {
                  console.log('✅ Tâche photo marquée comme complétée:', taskId);
                  completedTasksMap.set(taskId, true);
                }
              }
            });

            console.log('✅ Restauration photosTaken:', completedTasksMap.size, 'tâches complétées au total');
          }

          // 🎯 NOUVEAU: Restaurer aussi les tâches complétées depuis buttonClicks
          const buttonClicks = session?.progress?.interactions?.buttonClicks;
          if (buttonClicks) {
            console.log('🔍 Restauration buttonClicks - Clés trouvées:', Object.keys(buttonClicks));

            Object.entries(buttonClicks).forEach(([buttonKey, buttonData]: [string, any]) => {
              // Les boutons sont stockés avec une clé comme "pieceId_etapeId_buttonId_timestamp"
              // On extrait le taskId/etapeId
              if (Array.isArray(buttonData) && buttonData.length > 0) {
                const firstClick = buttonData[0];

                // Essayer d'extraire le taskId de plusieurs sources
                let taskId = firstClick?.taskId || firstClick?.etapeId;

                // Si pas trouvé, extraire de la clé (format: pieceId_etapeId_buttonId_timestamp)
                if (!taskId) {
                  const parts = buttonKey.split('_');
                  if (parts.length >= 2) {
                    taskId = parts[1]; // etapeId est la deuxième partie
                  }
                }

                if (taskId && firstClick?.actionType === 'complete') {
                  console.log('✅ Tâche button-click marquée comme complétée:', taskId);
                  completedTasksMap.set(taskId, true);
                }
              }
            });

            console.log('✅ Restauration buttonClicks:', completedTasksMap.size, 'tâches complétées au total');
          }
        } catch (error) {
          console.error('❌ Erreur chargement états depuis IndexedDB:', error);
        }
      }

      // 3. Merger les états de complétion dans les nouvelles pieces
      const mergedPieces = initialPieces.map(piece => ({
        ...piece,
        tasks: piece.tasks?.map(task => {
          const isCompleted = completedTasksMap.has(task.id);
          if (isCompleted) {
            console.log('✅ Tâche restaurée comme complétée:', {
              taskId: task.id,
              label: task.label,
              piece: piece.nom
            });
          }
          return {
            ...task,
            completed: isCompleted ? true : (task.completed || false)
          };
        })
      }));

      const restoredCount = mergedPieces.reduce((sum, p) =>
        sum + (p.tasks?.filter(t => t.completed).length || 0), 0);

      if (restoredCount > 0) {
        console.log('✅ Restauration complète:', restoredCount, 'tâches marquées comme complétées');
      }

      setPieces(mergedPieces);
    };

    updatePiecesWithRestoration();
  }, [initialPieces, pieces.length, currentCheckId]);

  /**
   * 📥 Charger la progression depuis CheckID au montage
   * 🎯 FIX: Restaurer les checkboxes ET la position exacte de l'utilisateur
   * 🎯 FIX URGENT: Restaurer currentPieceId et currentTaskIndex sur reload
   */
  useEffect(() => {
    const loadProgressFromCheckId = async () => {
      if (!currentCheckId) return;

      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);

        // 🎯 FIX CRITIQUE: Vérifier que le parcoursId correspond avant de charger la progression
        if (session && parcoursId && session.parcoursId !== parcoursId) {
          console.warn('⚠️ ParcoursId mismatch dans loadProgressFromCheckId!');
          console.warn('⚠️ Session:', session.parcoursId, 'vs Actuel:', parcoursId);
          console.warn('⚠️ Ignorer la progression de l\'ancien parcours');
          return;
        }

        if (session?.progress) {
          // 🎯 ÉTAPE 1: Restaurer les états des checkboxes
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
              // Restaurer les tâches complétées
              setPieces(prevPieces => {
                const updatedPieces = prevPieces.map(piece => ({
                  ...piece,
                  tasks: piece.tasks?.map(task =>
                    completedTaskIds.has(task.id)
                      ? { ...task, completed: true }
                      : task
                  )
                }));

                return updatedPieces;
              });
            }
          }

          // 🎯 ÉTAPE 2: Restaurer la position exacte de l'utilisateur
          const savedPieceId = session.progress.currentPieceId;
          const savedTaskIndex = session.progress.currentTaskIndex;

          console.log('🔄 Restauration position utilisateur:', {
            savedPieceId,
            savedTaskIndex,
            hasSavedPosition: !!(savedPieceId && savedTaskIndex !== undefined)
          });

          // Vérifier si la position sauvegardée est valide
          const savedPieceExists = pieces.find(p => p.id === savedPieceId);
          const savedTaskExists = savedPieceExists?.tasks?.[savedTaskIndex];

          if (savedPieceId && savedTaskIndex !== undefined && savedPieceExists && savedTaskExists) {
            // ✅ Restaurer la position exacte sauvegardée
            console.log('✅ Restauration position sauvegardée:', {
              pieceId: savedPieceId,
              taskIndex: savedTaskIndex,
              taskName: savedTaskExists.title
            });
            setCurrentPieceId(savedPieceId);
            setCurrentTaskIndex(savedTaskIndex);
          } else {
            // ❌ Position sauvegardée invalide, utiliser la logique intelligente
            console.log('⚠️ Position sauvegardée invalide, recherche première tâche incomplète');

            // Trouver la première tâche incomplète
            const findFirstIncompletePiece = (piecesToCheck: typeof pieces) => {
              for (const piece of piecesToCheck) {
                const incompleteTasks = piece.tasks?.filter(t => !t.completed) || [];
                if (incompleteTasks.length > 0) {
                  const firstIncompleteIndex = piece.tasks?.findIndex(t => !t.completed) || 0;
                  return {
                    pieceId: piece.id,
                    taskIndex: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0
                  };
                }
              }
              // 🎯 FIX: Si toutes les tâches sont complétées OU aucune position sauvegardée, retourner la PREMIÈRE pièce
              const firstPiece = piecesToCheck[0];
              return {
                pieceId: firstPiece?.id || '',
                taskIndex: 0
              };
            };

            const optimalPosition = findFirstIncompletePiece(pieces);
            console.log('✅ Position optimale trouvée:', optimalPosition);
            setCurrentPieceId(optimalPosition.pieceId);
            setCurrentTaskIndex(optimalPosition.taskIndex);
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement progression:', error);
      }
    };

    loadProgressFromCheckId();
  }, [currentCheckId]);

  /**
   * 🎯 FIX URGENT: Assurer qu'une tâche valide est toujours sélectionnée
   * Ce useEffect s'exécute quand les pièces sont chargées et vérifie si une tâche est sélectionnée
   */
  useEffect(() => {
    // Ne rien faire si pas de pièces ou pas de checkId
    if (pieces.length === 0 || !currentCheckId) return;

    // Vérifier si la position actuelle est valide
    const currentPiece = pieces.find(p => p.id === currentPieceId);
    const currentTask = currentPiece?.tasks?.[currentTaskIndex];

    // Si la position actuelle est invalide (pièce vide ou tâche inexistante)
    if (!currentPieceId || !currentPiece || !currentTask) {
      console.log('🔍 Position actuelle invalide, recherche première tâche disponible:', {
        currentPieceId,
        hasPiece: !!currentPiece,
        hasTask: !!currentTask,
        piecesCount: pieces.length
      });

      // 🎯 FIX: Trouver la première tâche incomplète, sinon la première tâche de la première pièce
      const findFirstAvailableTask = () => {
        for (const piece of pieces) {
          if (!piece.tasks || piece.tasks.length === 0) continue;

          // Chercher la première tâche incomplète
          const firstIncompleteIndex = piece.tasks.findIndex(t => !t.completed);

          if (firstIncompleteIndex >= 0) {
            return {
              pieceId: piece.id,
              taskIndex: firstIncompleteIndex,
              taskName: piece.tasks[firstIncompleteIndex].nom || 'Tâche sans nom'
            };
          }
        }

        // 🎯 FIX: Si toutes les tâches sont complétées, retourner la PREMIÈRE pièce, PREMIÈRE tâche
        const firstPiece = pieces[0];
        return {
          pieceId: firstPiece?.id || '',
          taskIndex: 0,
          taskName: firstPiece?.tasks?.[0]?.nom || 'Tâche sans nom'
        };
      };

      const optimalTask = findFirstAvailableTask();

      console.log('✅ Sélection automatique de la tâche:', optimalTask);

      setCurrentPieceId(optimalTask.pieceId);
      setCurrentTaskIndex(optimalTask.taskIndex);

      // Sauvegarder la position
      saveProgressToCheckId(optimalTask.pieceId, optimalTask.taskIndex);
    } else {
      console.log('✅ Position actuelle valide:', {
        pieceId: currentPieceId,
        taskIndex: currentTaskIndex,
        taskName: currentTask.nom || 'Tâche sans nom'
      });
    }
  }, [pieces, currentPieceId, currentTaskIndex, currentCheckId]);

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
   * 🎯 Trouver la première tâche NON COMPLÉTÉE dans la même pièce
   */
  const findNextIncompleteTaskInCurrentPiece = useCallback(() => {
    const currentPiece = pieces.find(p => p.id === currentPieceId);
    if (!currentPiece) return null;

    for (let taskIndex = 0; taskIndex < currentPiece.tasks.length; taskIndex++) {
      const task = currentPiece.tasks[taskIndex];
      if (!task.completed) {
        return { pieceId: currentPieceId, taskIndex };
      }
    }
    // Toutes les tâches de la pièce actuelle sont complétées
    return null;
  }, [pieces, currentPieceId]);

  /**
   * 🎯 Trouver la première pièce NON COMPLÉTÉE
   */
  const findFirstIncompletePiece = useCallback(() => {
    for (const piece of pieces) {
      const hasIncompleteTasks = piece.tasks.some(task => !task.completed);
      if (hasIncompleteTasks) {
        // Trouver la première tâche non complétée de cette pièce
        for (let taskIndex = 0; taskIndex < piece.tasks.length; taskIndex++) {
          if (!piece.tasks[taskIndex].completed) {
            return { pieceId: piece.id, taskIndex };
          }
        }
      }
    }
    // Toutes les pièces sont complétées
    return null;
  }, [pieces]);

  /**
   * ➡️ Passer à la tâche suivante NON COMPLÉTÉE
   * 1️⃣ D'abord chercher dans la même pièce
   * 2️⃣ Si la pièce est complétée, aller à la prochaine pièce non complétée
   * 3️⃣ Si tout est complété, marquer le flux comme terminé
   */
  const goToNextTask = useCallback(() => {
    // 1️⃣ Chercher la prochaine tâche NON COMPLÉTÉE dans la MÊME pièce
    const nextTaskInCurrentPiece = findNextIncompleteTaskInCurrentPiece();

    if (nextTaskInCurrentPiece) {
      // Il y a une tâche non complétée dans la même pièce
      setCurrentTaskIndex(nextTaskInCurrentPiece.taskIndex);
      saveProgressToCheckId(currentPieceId, nextTaskInCurrentPiece.taskIndex);
      console.log('✅ goToNextTask: Tâche suivante dans la même pièce:', {
        pieceId: currentPieceId,
        taskIndex: nextTaskInCurrentPiece.taskIndex
      });
    } else {
      // 2️⃣ La pièce actuelle est complétée, chercher la prochaine pièce non complétée
      const nextIncompletePiece = findFirstIncompletePiece();

      if (nextIncompletePiece) {
        // Il y a une pièce non complétée
        setCurrentPieceId(nextIncompletePiece.pieceId);
        setCurrentTaskIndex(nextIncompletePiece.taskIndex);
        saveProgressToCheckId(nextIncompletePiece.pieceId, nextIncompletePiece.taskIndex);
        console.log('✅ goToNextTask: Navigation vers pièce non complétée:', {
          pieceId: nextIncompletePiece.pieceId,
          taskIndex: nextIncompletePiece.taskIndex
        });
      } else {
        // 3️⃣ Toutes les tâches et pièces sont complétées
        console.log('✅ goToNextTask: Toutes les tâches sont complétées');
        setIsFlowCompleted(true);
        if (currentCheckId) {
          checkSessionManager.completeCheckSession(currentCheckId);
        }
      }
    }
  }, [findNextIncompleteTaskInCurrentPiece, findFirstIncompletePiece, saveProgressToCheckId, currentPieceId, currentTaskIndex, currentCheckId]);

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
    restoreCompletedTasks,
    saveProgressToCheckId  // 🎯 FIX: Exposer pour permettre la sauvegarde manuelle avant navigation
  };
}


/**
 * 🎯 UTILITAIRES DE VALIDATION POUR CHECK-IN
 * 
 * Fonctions pour gérer la validation des pièces au check d'entrée
 */

import { PieceStatus, Task } from '@/types/room';
import { CapturedPhoto } from '@/types/photoCapture';

/**
 * Vérifie si une pièce est validée pour le check d'entrée
 * 
 * Une pièce est validée si:
 * 1. L'utilisateur a cliqué sur "Conforme" (validationMode === 'validated')
 * OU
 * 2. L'utilisateur a cliqué sur "Prendre photos" ET toutes les photos requises ont été prises
 * 
 * @param pieceId - ID de la pièce
 * @param completedTasks - Map des tâches complétées
 * @param capturedPhotos - Map des photos capturées par taskId
 * @param piece - Objet pièce avec ses tâches
 * @returns true si la pièce est validée
 */
export function isPieceValidatedForCheckin(
  pieceId: string,
  completedTasks: Record<string, boolean>,
  capturedPhotos: Map<string, CapturedPhoto[]>,
  piece?: PieceStatus
): boolean {
  if (!piece || !piece.tasks || piece.tasks.length === 0) {
    return false;
  }

  // Pour le check d'entrée, il n'y a qu'une seule tâche par pièce
  const task = piece.tasks[0];
  if (!task) {
    return false;
  }

  // Vérifier si la tâche est complétée (clic sur "Conforme")
  if (completedTasks[task.id]) {
    return true;
  }

  // Sinon, vérifier si toutes les photos requises ont été prises
  const photosForTask = capturedPhotos.get(task.id) || [];
  
  // Compter le nombre de photos de référence requises
  const photoReferences = piece.photoReferences?.checkin || [];
  const requiredPhotosCount = photoReferences.length;

  // Si aucune photo de référence, la pièce ne peut pas être validée par photos
  if (requiredPhotosCount === 0) {
    return false;
  }

  // Vérifier si toutes les photos ont été prises
  return photosForTask.length >= requiredPhotosCount;
}

/**
 * Vérifie si TOUTES les pièces sont validées
 * 
 * @param pieces - Liste des pièces
 * @param completedTasks - Map des tâches complétées
 * @param capturedPhotos - Map des photos capturées
 * @returns true si toutes les pièces sont validées
 */
export function areAllPiecesValidatedForCheckin(
  pieces: PieceStatus[],
  completedTasks: Record<string, boolean>,
  capturedPhotos: Map<string, CapturedPhoto[]>
): boolean {
  return pieces.every(piece =>
    isPieceValidatedForCheckin(piece.id, completedTasks, capturedPhotos, piece)
  );
}

/**
 * Calcule le nombre de pièces validées
 * 
 * @param pieces - Liste des pièces
 * @param completedTasks - Map des tâches complétées
 * @param capturedPhotos - Map des photos capturées
 * @returns Nombre de pièces validées
 */
export function getValidatedPiecesCount(
  pieces: PieceStatus[],
  completedTasks: Record<string, boolean>,
  capturedPhotos: Map<string, CapturedPhoto[]>
): number {
  return pieces.filter(piece =>
    isPieceValidatedForCheckin(piece.id, completedTasks, capturedPhotos, piece)
  ).length;
}

/**
 * Obtient le statut de validation d'une pièce pour affichage
 * 
 * @param pieceId - ID de la pièce
 * @param completedTasks - Map des tâches complétées
 * @param capturedPhotos - Map des photos capturées
 * @param piece - Objet pièce
 * @returns 'validated' | 'in_progress' | 'not_started'
 */
export function getPieceValidationStatus(
  pieceId: string,
  completedTasks: Record<string, boolean>,
  capturedPhotos: Map<string, CapturedPhoto[]>,
  piece?: PieceStatus
): 'validated' | 'in_progress' | 'not_started' {
  if (isPieceValidatedForCheckin(pieceId, completedTasks, capturedPhotos, piece)) {
    return 'validated';
  }

  // Vérifier s'il y a du progrès
  if (!piece || !piece.tasks || piece.tasks.length === 0) {
    return 'not_started';
  }

  const task = piece.tasks[0];
  const photosForTask = capturedPhotos.get(task.id) || [];

  if (completedTasks[task.id] || photosForTask.length > 0) {
    return 'in_progress';
  }

  return 'not_started';
}

/**
 * 🎯 NOUVEAU: Trouver la prochaine pièce non-validée
 * Utilisé pour rediriger l'utilisateur vers la pièce suivante à valider
 *
 * @param pieces - Liste des pièces
 * @param completedTasks - Map des tâches complétées
 * @param capturedPhotos - Map des photos capturées
 * @returns La première pièce non-validée, ou null si toutes sont validées
 */
export function getNextUnvalidatedPiece(
  pieces: PieceStatus[],
  completedTasks: Record<string, boolean>,
  capturedPhotos: Map<string, CapturedPhoto[]>
): PieceStatus | null {
  for (const piece of pieces) {
    if (!isPieceValidatedForCheckin(piece.id, completedTasks, capturedPhotos, piece)) {
      return piece;
    }
  }
  return null;
}


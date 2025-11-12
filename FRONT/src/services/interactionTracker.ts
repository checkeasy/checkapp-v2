/**
 * 🎯 SERVICE DE SUIVI DES INTERACTIONS GRANULAIRES
 * 
 * Capture TOUTES les interactions utilisateur :
 * - Clics sur boutons
 * - Photos prises
 * - Checkboxes cochées/décochées 
 * - Signalements créés
 * - Navigation entre pièces
 * - États des pièces
 * 
 * Synchronise automatiquement avec le CheckID
 */

import { checkSessionManager } from './checkSessionManager';
import { useUser } from '@/contexts/UserContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

export interface ButtonClickInteraction {
  buttonId: string;
  pieceId: string;
  taskId?: string;
  etapeId?: string;  // 🎯 NOUVEAU: ID de l'étape du parcours
  actionType: 'validate' | 'complete' | 'skip' | 'retry' | 'navigate';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PhotoInteraction {
  photoId: string;
  taskId: string;
  pieceId: string;
  etapeId?: string;             // 🎯 NOUVEAU: ID de l'étape du parcours
  photoData: string;           // Base64 ou URL
  thumbnailData?: string;      
  timestamp: string;
  geoLocation?: { lat: number; lng: number };
  deviceInfo?: string;
  validated: boolean;
  retakeCount: number;
  metadata?: {
    referencePhotoUrl?: string;
    comparisonScore?: number;
    qualityScore?: number;
  };
}

export interface CheckboxInteraction {
  checkboxId: string;
  taskId: string;
  pieceId: string;
  etapeId?: string;             // 🎯 NOUVEAU: ID de l'étape du parcours
  isChecked: boolean;
  checkedAt?: string;
  uncheckedAt?: string;
  validatedBy?: string;
  notes?: string;
}

export interface SignalementInteraction {
  signalementId: string;
  pieceId: string;
  taskId?: string;
  etapeId?: string;             // 🎯 NOUVEAU: ID de l'étape du parcours
  type: 'damage' | 'missing' | 'issue' | 'note';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  photos: string[];
  imgUrl?: string;              // ✅ AJOUTÉ: URL de l'image (blob ou uploadée)
  imgBase64?: string;           // ✅ AJOUTÉ: Base64 pur de l'image
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  metadata?: Record<string, unknown>;
}

export interface PieceStateInteraction {
  pieceId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'validated' | 'issues_reported';
  startedAt?: string;
  completedAt?: string;
  validatedAt?: string;
  completionPercentage: number;
  totalInteractions: number;
  photosCount: number;
  checkboxesCount: number;
  signalementsCount: number;
}

/**
 * 🎯 Réponse à une question de sortie (Exit Question)
 */
export interface ExitQuestionInteraction {
  questionID: string;
  questionContent: string;
  questionType: 'boolean' | 'image' | 'text';

  // Réponse pour type "boolean"
  checked?: boolean;

  // Réponse pour type "text"
  textResponse?: string;

  // Image (pour type "image" ou imageRequired="yes")
  hasImage: boolean;
  imageBase64?: string;  // Base64 pur (sans préfixe data:image/...)
  imageUrl?: string;     // URL si uploadée
  imagePhotoId?: string; // ID de la photo dans le système

  // Métadonnées
  timestamp: string;
  updatedAt?: string;
}

class InteractionTracker {
  private currentCheckId: string | null = null;
  private sessionQueue: any[] = []; // File d'attente si pas de session active

  /**
   * 🔗 Définit le CheckID actuel pour les interactions
   */
  setCurrentCheckId(checkId: string | null) {
    this.currentCheckId = checkId;
    console.log('🔗 InteractionTracker: CheckID défini:', checkId);
    
    // Traiter la file d'attente si CheckID maintenant disponible
    if (checkId && this.sessionQueue.length > 0) {
      console.log('📤 Traitement file d\'attente:', this.sessionQueue.length, 'interactions');
      this.sessionQueue.forEach(queuedInteraction => {
        this.processQueuedInteraction(queuedInteraction);
      });
      this.sessionQueue = [];
    }
  }

  /**
   * 🖱️ Enregistre un clic sur bouton
   */
  async trackButtonClick(interaction: ButtonClickInteraction): Promise<void> {
    console.log('🖱️ InteractionTracker: Clic bouton:', {
      buttonId: interaction.buttonId,
      pieceId: interaction.pieceId,
      taskId: interaction.taskId,
      etapeId: interaction.etapeId,  // 🎯 NOUVEAU
      actionType: interaction.actionType
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'buttonClick', data: interaction });
      console.log('⏳ Ajouté à la file d\'attente (pas de CheckID)');
      return;
    }

    try {
      // 🎯 NOUVEAU: Nettoyer et inclure etapeId dans la clé si disponible
      const cleanEtapeId = this.cleanEtapeId(interaction.etapeId);
      
      const keyPrefix = cleanEtapeId 
        ? `${interaction.pieceId}_${cleanEtapeId}_${interaction.buttonId}`
        : `${interaction.pieceId}_${interaction.buttonId}`;
      
      // Sauvegarder avec l'etapeId nettoyé
      const cleanedInteraction = { ...interaction, etapeId: cleanEtapeId };
      
      await this.updateCheckIdInteractions({
        buttonClicks: {
          [`${keyPrefix}_${Date.now()}`]: [cleanedInteraction]
        }
      });
    } catch (error) {
      console.error('❌ Erreur enregistrement clic bouton:', error);
    }
  }

  /**
   * 📸 Enregistre une photo prise
   */
  async trackPhotoTaken(interaction: PhotoInteraction): Promise<void> {
    console.log('📸 InteractionTracker: Photo prise:', {
      photoId: interaction.photoId,
      taskId: interaction.taskId,
      pieceId: interaction.pieceId,
      etapeId: interaction.etapeId,  // 🎯 NOUVEAU
      validated: interaction.validated
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'photoTaken', data: interaction });
      return;
    }

    try {
      // 🎯 NOUVEAU: Nettoyer l'etapeId pour les photos
      const cleanedInteraction = { 
        ...interaction, 
        etapeId: this.cleanEtapeId(interaction.etapeId)
      };
      
      await this.updateCheckIdInteractions({
        photosTaken: {
          [interaction.photoId]: [cleanedInteraction]
        }
      });
      
      // Mettre à jour le compteur de photos de la pièce
      await this.updatePieceState(interaction.pieceId, {
        photosCount: 1 // Sera additionné
      });
    } catch (error) {
      console.error('❌ Erreur enregistrement photo:', error);
    }
  }

  /**
   * ✅ Enregistre un changement de checkbox
   */
  async trackCheckboxChange(interaction: CheckboxInteraction): Promise<void> {
    console.log('✅ InteractionTracker: Checkbox changée:', {
      checkboxId: interaction.checkboxId,
      taskId: interaction.taskId,
      pieceId: interaction.pieceId,
      isChecked: interaction.isChecked
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'checkboxChange', data: interaction });
      return;
    }

    try {
      await this.updateCheckIdInteractions({
        checkboxStates: {
          [interaction.checkboxId]: interaction
        }
      });
      
      // Mettre à jour le compteur de checkboxes de la pièce
      await this.updatePieceState(interaction.pieceId, {
        checkboxesCount: interaction.isChecked ? 1 : -1 
      });
    } catch (error) {
      console.error('❌ Erreur enregistrement checkbox:', error);
    }
  }

  /**
   * 🚨 Enregistre un signalement
   */
  async trackSignalement(interaction: SignalementInteraction): Promise<void> {
    console.log('🚨 InteractionTracker: Signalement créé:', {
      signalementId: interaction.signalementId,
      pieceId: interaction.pieceId,
      type: interaction.type,
      severity: interaction.severity
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'signalement', data: interaction });
      return;
    }

    try {
      await this.updateCheckIdInteractions({
        signalements: {
          [interaction.signalementId]: interaction
        }
      });
      
      // Mettre à jour le compteur de signalements de la pièce
      await this.updatePieceState(interaction.pieceId, {
        signalementsCount: 1,
        status: 'issues_reported'
      });
    } catch (error) {
      console.error('❌ Erreur enregistrement signalement:', error);
    }
  }

  /**
   * 🏠 Met à jour l'état d'une pièce
   */
  async trackPieceStateChange(pieceState: PieceStateInteraction): Promise<void> {
    console.log('🏠 InteractionTracker: État pièce mis à jour:', {
      pieceId: pieceState.pieceId,
      status: pieceState.status,
      completionPercentage: pieceState.completionPercentage
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'pieceState', data: pieceState });
      return;
    }

    try {
      await this.updateCheckIdInteractions({
        pieceStates: {
          [pieceState.pieceId]: pieceState
        }
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour état pièce:', error);
    }
  }

  /**
   * 🎯 Enregistre une réponse à une question de sortie (Exit Question)
   */
  async trackExitQuestionResponse(response: ExitQuestionInteraction): Promise<void> {
    console.log('🎯 InteractionTracker: Réponse question de sortie:', {
      questionID: response.questionID,
      questionType: response.questionType,
      hasImage: response.hasImage,
      checked: response.checked,
      textResponse: response.textResponse?.substring(0, 50)
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ type: 'exitQuestion', data: response });
      return;
    }

    try {
      await this.updateCheckIdInteractions({
        exitQuestions: {
          [response.questionID]: response
        }
      });

      console.log('✅ InteractionTracker: Réponse question de sortie sauvegardée');
    } catch (error) {
      console.error('❌ Erreur enregistrement réponse question de sortie:', error);
    }
  }

  /**
   * 🎯 Récupère toutes les réponses aux questions de sortie
   */
  async getExitQuestionResponses(): Promise<Record<string, ExitQuestionInteraction>> {
    if (!this.currentCheckId) {
      console.warn('⚠️ Pas de CheckID actif');
      return {};
    }

    try {
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      return session?.progress?.interactions?.exitQuestions || {};
    } catch (error) {
      console.error('❌ Erreur récupération réponses questions de sortie:', error);
      return {};
    }
  }

  /**
   * 🎯 Marque les questions de sortie comme complétées
   */
  async markExitQuestionsCompleted(): Promise<void> {
    if (!this.currentCheckId) {
      console.warn('⚠️ Pas de CheckID actif');
      return;
    }

    try {
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      if (session) {
        session.progress = session.progress || { interactions: {} };
        session.progress.exitQuestionsCompleted = true;
        session.progress.exitQuestionsCompletedAt = new Date().toISOString();

        await checkSessionManager.updateSessionProgress(this.currentCheckId, {
          currentPieceId: session.progress.currentPieceId,
          currentTaskIndex: session.progress.currentTaskIndex,
          interactions: session.progress.interactions
        });
        console.log('✅ InteractionTracker: Questions de sortie marquées comme complétées');
      }
    } catch (error) {
      console.error('❌ Erreur marquage questions de sortie complétées:', error);
    }
  }

  /**
   * 🧭 Enregistre la navigation entre pièces
   */
  async trackNavigation(
    fromPieceId: string | undefined,
    toPieceId: string,
    trigger: 'user_click' | 'auto_navigation' | 'completion' | 'back_button'
  ): Promise<void> {
    console.log('🧭 InteractionTracker: Navigation:', {
      from: fromPieceId,
      to: toPieceId,
      trigger
    });

    if (!this.currentCheckId) {
      this.sessionQueue.push({ 
        type: 'navigation', 
        data: { fromPieceId, toPieceId, trigger, timestamp: new Date().toISOString() }
      });
      return;
    }

    try {
      // Récupérer la session actuelle pour mettre à jour la navigation
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      if (!session) return;

      const navigation = session.progress.interactions.navigation || {
        visitedPieces: [],
        timeSpentPerPiece: {},
        totalTimeSpent: 0,
        navigationHistory: []
      };

      // Ajouter à l'historique
      navigation.navigationHistory.push({
        fromPieceId,
        toPieceId,
        timestamp: new Date().toISOString(),
        trigger
      });

      // Ajouter à la liste des pièces visitées (unique)
      if (!navigation.visitedPieces.includes(toPieceId)) {
        navigation.visitedPieces.push(toPieceId);
      }

      await this.updateCheckIdInteractions({ navigation });
    } catch (error) {
      console.error('❌ Erreur enregistrement navigation:', error);
    }
  }

  /**
   * 🔄 Sauvegarde le chemin actuel de la page (lastPath) dans la session
   * 🎯 FIX: Permet de restaurer la bonne page après un rechargement (F5)
   * 🎯 IMPORTANT: Sauvegarde dans IndexedDB ET localStorage pour compatibilité avec RouteRestoration
   */
  async trackPagePath(path: string): Promise<void> {
    if (!this.currentCheckId) {
      console.warn('⚠️ Pas de CheckID actif pour enregistrer le chemin de page');
      return;
    }

    try {
      // Récupérer la session actuelle
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      if (!session) return;

      const navigation = session.progress.interactions.navigation || {
        visitedPieces: [],
        timeSpentPerPiece: {},
        totalTimeSpent: 0,
        navigationHistory: [],
        lastPath: undefined
      };

      // 🎯 Mettre à jour lastPath dans IndexedDB
      navigation.lastPath = path;

      await this.updateCheckIdInteractions({ navigation });

      // 🎯 IMPORTANT: Aussi sauvegarder dans localStorage pour RouteRestoration
      localStorage.setItem('checkeasy_last_path', path);

      console.log('💾 Chemin de page sauvegardé dans session ET localStorage:', path);
    } catch (error) {
      console.error('❌ Erreur sauvegarde chemin de page:', error);
    }
  }

  /**
   * 📊 Récupère l'état complet des interactions pour une pièce
   */
  async getPieceInteractionState(pieceId: string): Promise<{
    pieceState?: PieceStateInteraction;
    photos: PhotoInteraction[];
    checkboxes: CheckboxInteraction[];
    signalements: SignalementInteraction[];
    buttonClicks: ButtonClickInteraction[];
  } | null> {
    if (!this.currentCheckId) return null;

    try {
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      if (!session) return null;

      const interactions = session.progress.interactions;
      
      return {
        pieceState: interactions.pieceStates?.[pieceId],
        photos: Object.values(interactions.photosTaken || {})
          .flat()
          .filter(photo => photo.pieceId === pieceId),
        checkboxes: Object.values(interactions.checkboxStates || {})
          .filter(checkbox => checkbox.pieceId === pieceId),
        signalements: Object.values(interactions.signalements || {})
          .filter(signalement => signalement.pieceId === pieceId),
        buttonClicks: Object.values(interactions.buttonClicks || {})
          .flat()
          .filter(click => click.pieceId === pieceId)
      };
    } catch (error) {
      console.error('❌ Erreur récupération état pièce:', error);
      return null;
    }
  }

  /**
   * 🔄 Méthodes privées de mise à jour
   */
  private async updateCheckIdInteractions(interactionUpdates: any): Promise<void> {
    if (!this.currentCheckId) return;

    // Récupérer la session actuelle
    const session = await checkSessionManager.getCheckSession(this.currentCheckId);
    if (!session) return;

    // Fusionner les interactions existantes avec les nouvelles
    const currentInteractions = session.progress.interactions || {};
    const updatedInteractions = this.mergeInteractions(currentInteractions, interactionUpdates);

    // Mettre à jour la session
    await checkSessionManager.updateSessionProgress(this.currentCheckId, {
      currentPieceId: session.progress.currentPieceId,
      currentTaskIndex: session.progress.currentTaskIndex,
      // Sera géré par l'implémentation mise à jour de updateSessionProgress
      ...{ interactions: updatedInteractions }
    });
  }

  private mergeInteractions(current: any, updates: any): any {
    const merged = { ...current };

    // Fusionner chaque type d'interaction
    Object.keys(updates).forEach(key => {
      if (updates[key]) {
        merged[key] = { ...merged[key], ...updates[key] };
      }
    });

    return merged;
  }

  private async updatePieceState(pieceId: string, updates: Partial<PieceStateInteraction>): Promise<void> {
    if (!this.currentCheckId) return;

    try {
      const session = await checkSessionManager.getCheckSession(this.currentCheckId);
      if (!session) return;

      const currentState = session.progress.interactions.pieceStates?.[pieceId] || {
        pieceId,
        status: 'not_started',
        completionPercentage: 0,
        totalInteractions: 0,
        photosCount: 0,
        checkboxesCount: 0,
        signalementsCount: 0
      };

      // Mettre à jour avec additivité pour les compteurs
      const updatedState = {
        ...currentState,
        ...updates,
        totalInteractions: currentState.totalInteractions + 1,
        // Additionner les compteurs au lieu de les remplacer
        ...(updates.photosCount && {
          photosCount: Math.max(0, currentState.photosCount + updates.photosCount)
        }),
        ...(updates.checkboxesCount && {
          checkboxesCount: Math.max(0, currentState.checkboxesCount + updates.checkboxesCount)
        }),
        ...(updates.signalementsCount && {
          signalementsCount: Math.max(0, currentState.signalementsCount + updates.signalementsCount)
        })
      };

      await this.trackPieceStateChange(updatedState);
    } catch (error) {
      console.error('❌ Erreur mise à jour état pièce:', error);
    }
  }

  private processQueuedInteraction(queuedItem: any): void {
    switch (queuedItem.type) {
      case 'buttonClick':
        this.trackButtonClick(queuedItem.data);
        break;
      case 'photoTaken':
        this.trackPhotoTaken(queuedItem.data);
        break;
      case 'checkboxChange':
        this.trackCheckboxChange(queuedItem.data);
        break;
      case 'signalement':
        this.trackSignalement(queuedItem.data);
        break;
      case 'pieceState':
        this.trackPieceStateChange(queuedItem.data);
        break;
      case 'navigation':
        this.trackNavigation(
          queuedItem.data.fromPieceId,
          queuedItem.data.toPieceId,
          queuedItem.data.trigger
        );
        break;
      case 'exitQuestion':
        this.trackExitQuestionResponse(queuedItem.data);
        break;
    }
  }

  /**
   * 🧹 Utilitaires
   */
  generatePhotoId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 🎯 Nettoie un etapeId pour extraire seulement la partie numérique
   * @param etapeId - ID pouvant contenir du texte (ex: "etat-initial-1753358727481x453383598298510400-correct")
   * @returns ID nettoyé (ex: "1753358727481x453383598298510400")
   */
  cleanEtapeId(etapeId?: string): string | undefined {
    if (!etapeId) return undefined;
    
    // Pattern pour capturer le format timestampXrandom
    const etapeIdMatch = etapeId.match(/(\d+x\d+)/);
    const cleanId = etapeIdMatch ? etapeIdMatch[1] : etapeId;
    
    console.log('🎯 EtapeId nettoyé:', { original: etapeId, cleaned: cleanId });
    return cleanId;
  }

  generateSignalementId(): string {
    return `signalement_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getCurrentCheckId(): string | null {
    return this.currentCheckId;
  }

  getQueueLength(): number {
    return this.sessionQueue.length;
  }
}

export const interactionTracker = new InteractionTracker();




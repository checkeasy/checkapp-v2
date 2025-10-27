/**
 * 🐛 Service de debug pour envoyer le payload complet d'un rapport
 * Permet d'envoyer toutes les données collectées vers l'endpoint de debug pour analyse
 */

import { environment } from '@/config/environment';

export interface DebugPayload {
  // Informations de session
  checkId?: string;
  userId: string;
  userType: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
  timestamp: string;
  
  // Informations du parcours
  parcoursInfo: {
    id: string;
    name: string;
    type: string;
    logement: string;
    takePicture: string;
  } | null;
  
  // Données des pièces
  rooms: Array<{
    id: string;
    nom: string;
    tasks: Array<{
      id: string;
      label: string;
      type: string;
      completed: boolean;
      description?: string;
    }>;
    photoReferences?: Record<string, unknown>;
    cleaningInfo?: string;
    roomInfo?: string;
  }>;
  
  // Progrès et interactions  
  progress?: {
    completedTasks: number;
    totalTasks: number;
    interactions?: Record<string, unknown>;
    photosTaken?: Record<string, unknown>;
    tasksCompleted?: Record<string, unknown>;
    
    // Données spécifiques checkin/checkout
    checkinData?: {
      isCompleted: boolean;
      currentPieceId: string;
      completedTasks: Record<string, boolean>;
      takenPhotos: Record<string, unknown[]>;
    };
    checkoutData?: {
      isCompleted: boolean;
      currentPieceId: string;
      completedTasks: Record<string, boolean>;
      takenPhotos: Record<string, unknown[]>;
    };
  };
  
  // État de l'application
  appState: {
    currentUrl: string;
    flowState?: Record<string, unknown>;
    hasProgress: boolean;
    uploadedImages?: Record<string, string>;
  };
  
  // Données brutes pour debug
  rawData?: {
    localStorage: Record<string, unknown>;
    sessionStorage: Record<string, unknown>;
    indexedDBKeys?: string[];
  };
}

// 🎯 FORMAT STRUCTURÉ : IDs de base + objets checkin/checkout séparés
export interface EnrichedAPIPayload {
  // 🆔 IDs DE BASE
  parcourID: string;
  parcoursName: string;
  parcoursType: "Ménage" | "Voyageur";
  logementID: string;
  logementName: string;
  takePicture: "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly";
  
  // 📅 MÉTADONNÉES SESSION
  session: {
    checkId?: string;
    userId: string;
    userType: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
    timestamp: string;
    flowType: 'checkin' | 'checkout';
  };
  
  // 📊 STATISTIQUES GLOBALES
  stats: {
    totalPieces: number;
    photosCheckin: number;
    photosCheckout: number;
    validationsCheckin: number;
    validationsCheckout: number;
    signalementsTotal: number;
    exitQuestionsTotal: number;  // 🎯 AJOUTÉ: Nombre de questions de sortie
  };
  
  // 🏠 LISTE DES PIÈCES (IDs et noms)
  pieces: Array<{
    pieceID: string;
    nom: string;
    ordre?: number;
  }>;
  
  // 📥 DONNÉES CHECKIN (si présentes)
  checkin?: {
    completed: boolean;
    completedAt?: string;
    
    // Actions utilisateur par pièce
    pieceResults: Array<{
      pieceID: string;
      
      // Validations avec booléens
      validations: {
        etatGeneral: boolean;           // Pièce validée OK/Mauvais
        propreteOK: boolean;           // Propreté acceptable
        equipementsOK: boolean;        // Équipements fonctionnels
        dommagesDetectes: boolean;     // Y a-t-il des dommages
      };
      
      // Photos remontées par l'utilisateur
      photos: Array<{
        photoId: string;
        url: string;
        timestamp: string;
        type: 'etat_general' | 'detail_probleme' | 'equipement';
        validated: boolean;
      }>;
      
      // Checks effectués (checkboxes cochées)
      checks: Array<{
        checkId: string;
        taskName: string;
        checked: boolean;
        checkedAt?: string;
        notes?: string;
      }>;
      
      // Signalements créés
      signalements: Array<{
        signalementId: string;
        titre: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        photos: string[];
        createdAt: string;
      }>;
      
      // Notes utilisateur
      notes?: string;
      completedAt?: string;
    }>;
  };
  
  // 📤 DONNÉES CHECKOUT (si présentes)
  checkout?: {
    completed: boolean;
    completedAt?: string;
    
    // Actions utilisateur par pièce
    pieceResults: Array<{
      pieceID: string;
      
      // Validations avec booléens
      validations: {
        menageEffectue: boolean;       // Ménage terminé
        etatFinal: boolean;           // État final acceptable
        equipementsVerifies: boolean; // Équipements vérifiés
        problemesResolus: boolean;    // Problèmes résolus
      };
      
      // Photos finales remontées
      photos: Array<{
        photoId: string;
        url: string;
        timestamp: string;
        type: 'etat_final' | 'avant_apres' | 'verification';
        validated: boolean;
      }>;
      
      // Tâches effectuées (checkboxes)
      tasks: Array<{
        taskId: string;
        taskName: string;
        completed: boolean;
        completedAt?: string;
        verified: boolean;
        photos?: string[];
      }>;
      
      // Signalements résolus/créés
      signalements: Array<{
        signalementId: string;
        titre: string;
        action: 'resolu' | 'nouveau' | 'reporte';
        photos?: string[];
        timestamp: string;
      }>;
      
      // Notes finales
      notes?: string;
      completedAt?: string;
    }>;
  };

  // 🎯 QUESTIONS DE SORTIE (Exit Questions)
  exitQuestions?: Array<{
    questionId: string;
    questionContent: string;
    questionType: 'boolean' | 'text' | 'image';

    // Réponse boolean
    checked?: boolean;

    // Réponse texte
    textResponse?: string;

    // Image
    hasImage: boolean;
    imageBase64?: string;
    imageUrl?: string;
    imagePhotoId?: string;

    // Timestamps
    timestamp: string;
    updatedAt?: string;
  }>;
}

export interface DebugResult {
  success: boolean;
  debugId?: string;
  timestamp: string;
  error?: string;
  payloadType?: 'enriched';
}

class DebugService {
  
  /**
   * 🏗️ Génère le format enrichi qui ressemble au JSON de l'API
   */
  async generateEnrichedAPIFormat(): Promise<EnrichedAPIPayload | null> {
    try {
      console.log('🏗️ Génération du format API enrichi...');

      // Collecter les données de base
      console.log('🔍 Étape 1/6: Collecte des données de base...');
      const baseData = await this.collectDebugData();
      console.log('✅ Données de base collectées:', {
        hasParcoursInfo: !!baseData.parcoursInfo,
        parcoursId: baseData.parcoursInfo?.id,
        parcoursName: baseData.parcoursInfo?.name,
        roomsCount: baseData.rooms.length,
        checkId: baseData.checkId,
        userType: baseData.userType
      });

      if (!baseData.parcoursInfo) {
        console.error('❌ ERREUR: Pas de données de parcours disponibles pour le format API');
        console.error('❌ baseData:', baseData);
        return null;
      }

      // Importer les services nécessaires
      console.log('🔍 Étape 2/6: Import des services...');
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const { parcoursManager } = await import('@/services/parcoursManager');

      // Récupérer les données brutes du parcours
      const currentParcours = parcoursManager.getCurrentParcours();
      const rawParcoursData = currentParcours?.rawData;
      console.log('✅ Services importés, parcours actuel:', !!currentParcours);

      // Déterminer le flowType
      const flowType = baseData.userType === 'CLIENT' ? 'checkin' : 'checkout';
      console.log('✅ FlowType déterminé:', flowType);

      // Récupérer les interactions détaillées depuis CheckID
      console.log('🔍 Étape 3/6: Récupération des interactions...');
      let interactions = null;
      if (baseData.checkId) {
        try {
          const session = await checkSessionManager.getCheckSession(baseData.checkId);
          interactions = session?.progress?.interactions;
          console.log('✅ Interactions récupérées:', !!interactions);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer les interactions:', e);
        }
      } else {
        console.warn('⚠️ Pas de checkId disponible');
      }

      // Collecter les données critiques utilisateur
      console.log('🔍 Étape 4/6: Collecte des interactions utilisateur...');
      const userInteractions = await this.collectUserInteractions(baseData.checkId);
      console.log('✅ Interactions collectées:', {
        hasButtons: !!userInteractions.buttons,
        hasPhotos: !!userInteractions.uploadedPhotos,
        hasCheckboxes: !!userInteractions.checkboxes,
        hasCheckSession: !!userInteractions.checkSession
      });

      console.log('🔍 Étape 5/6: Collecte des signalements...');
      const signalements = await this.collectSignalements();
      console.log('✅ Signalements collectés:', signalements.length);

      // 🎯 NOUVEAU: Collecter les questions de sortie
      console.log('🔍 Étape 5.5/6: Collecte des questions de sortie...');
      const exitQuestions = await this.collectExitQuestions(baseData.checkId);
      console.log('✅ Questions de sortie collectées:', exitQuestions.length);

      console.log('🔍 Étape 6/6: Construction des données utilisateur...');
      const donneesUtilisateur = this.buildUserCriticalData(
        userInteractions,
        signalements,
        baseData.appState.uploadedImages || {},
        baseData.progress?.checkinData,
        baseData.progress?.checkoutData
      );
      console.log('✅ Données utilisateur construites:', {
        boutons: donneesUtilisateur.boutons.length,
        photos: donneesUtilisateur.photos.length,
        checkboxes: donneesUtilisateur.checkboxes.length,
        signalements: donneesUtilisateur.signalements.length,
        commentaires: donneesUtilisateur.commentaires.length,
        exitQuestions: exitQuestions.length
      });
      
      // Construire le payload enrichi avec le nouveau format structuré
      const enrichedPayload: EnrichedAPIPayload = {
        // 🆔 IDs DE BASE
        parcourID: baseData.parcoursInfo.id,
        parcoursName: baseData.parcoursInfo.name,
        parcoursType: baseData.parcoursInfo.type as "Ménage" | "Voyageur",
        logementID: baseData.parcoursInfo.id,
        logementName: baseData.parcoursInfo.logement,
        takePicture: baseData.parcoursInfo.takePicture as "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly",
        
        // 📅 MÉTADONNÉES SESSION
        session: {
          checkId: baseData.checkId,
          userId: baseData.userId,
          userType: baseData.userType,
          timestamp: baseData.timestamp,
          flowType
        },
        
        // 🏠 LISTE DES PIÈCES
        pieces: baseData.rooms.map((room, index) => ({
          pieceID: room.id as string,
          nom: room.nom as string,
          ordre: index + 1
        })),
        
        // 📊 STATISTIQUES (calculées depuis les données collectées)
        stats: this.calculateStats(donneesUtilisateur, baseData, exitQuestions.length),

        // 📥📤 DONNÉES CHECKIN/CHECKOUT (construites selon les données disponibles)
        ...this.buildCheckinCheckoutData(baseData, donneesUtilisateur),

        // 🎯 QUESTIONS DE SORTIE
        exitQuestions: exitQuestions.length > 0 ? exitQuestions : undefined
      };

      console.log('🏗️ Format API STRUCTURÉ généré (CHECKIN/CHECKOUT):', {
        pieces: enrichedPayload.pieces.length,
        photosCheckin: enrichedPayload.stats.photosCheckin,
        photosCheckout: enrichedPayload.stats.photosCheckout,
        hasCheckin: !!enrichedPayload.checkin,
        hasCheckout: !!enrichedPayload.checkout,
        signalements: enrichedPayload.stats.signalementsTotal,
        exitQuestions: exitQuestions.length
      });
      

      return enrichedPayload;

    } catch (error) {
      console.error('❌ ERREUR CRITIQUE génération format API enrichi:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      return null;
    }
  }
  
  /**
   * 🏠 Enrichit les données d'une pièce avec les interactions utilisateur
   */
  private enrichRoomData(
    room: Record<string, unknown>,
    rawParcoursData: Record<string, unknown>,
    interactions: Record<string, unknown> | null,
    uploadedImages: Record<string, string>,
    userType: string,
    userId: string,
    checkinData?: any,
    checkoutData?: any
  ): EnrichedAPIPayload['piece'][0] {
    // Trouver la pièce brute correspondante
    const rawPieces = rawParcoursData?.piece as Array<Record<string, unknown>> || [];
    const rawPiece = rawPieces.find((p: Record<string, unknown>) => p.pieceID === room.id);
    
    // Collecter les photos prises pour cette pièce
    const photosPrises: Array<Record<string, unknown>> = [];
    
    // 1. Photos depuis les interactions CheckID
    if (interactions?.photosTaken) {
      Object.entries(interactions.photosTaken as Record<string, unknown>).forEach(([photoId, photoDataArray]: [string, unknown]) => {
        const photoData = Array.isArray(photoDataArray) ? photoDataArray[0] as Record<string, unknown> : photoDataArray as Record<string, unknown>;
        if (photoData?.pieceId === room.id) {
          photosPrises.push({
            photoId,
            etapeType: this.determinePhotoType(photoData, userType),
            url: photoData.url || uploadedImages[photoId] || '',
            timestamp: photoData.timestamp || new Date().toISOString(),
            metadata: { ...photoData.metadata as Record<string, unknown>, source: 'checkid' }
          });
        }
      });
    }
    
    // 2. Photos CHECKIN depuis parcoursCache
    if (checkinData?.takenPhotos) {
      Object.entries(checkinData.takenPhotos).forEach(([photoKey, photoArray]) => {
        const photos = Array.isArray(photoArray) ? photoArray : [photoArray];
        photos.forEach((photoData: any, index: number) => {
          if (photoData?.pieceId === room.id || photoKey.includes(room.id as string)) {
            photosPrises.push({
              photoId: `checkin_${photoKey}_${index}`,
              etapeType: 'checkin',
              url: photoData.url || uploadedImages[photoKey] || '',
              timestamp: photoData.timestamp || new Date().toISOString(),
              metadata: { ...photoData, source: 'checkin_cache' }
            });
          }
        });
      });
    }
    
    // 3. Photos CHECKOUT depuis parcoursCache
    if (checkoutData?.takenPhotos) {
      Object.entries(checkoutData.takenPhotos).forEach(([photoKey, photoArray]) => {
        const photos = Array.isArray(photoArray) ? photoArray : [photoArray];
        photos.forEach((photoData: any, index: number) => {
          if (photoData?.pieceId === room.id || photoKey.includes(room.id as string)) {
            photosPrises.push({
              photoId: `checkout_${photoKey}_${index}`,
              etapeType: 'checkout',
              url: photoData.url || uploadedImages[photoKey] || '',
              timestamp: photoData.timestamp || new Date().toISOString(),
              metadata: { ...photoData, source: 'checkout_cache' }
            });
          }
        });
      });
    }
    
    // 4. Photos depuis uploadedImages (fallback)
    Object.entries(uploadedImages).forEach(([imageId, url]) => {
      // Éviter les doublons
      if (!photosPrises.some(p => p.url === url)) {
        photosPrises.push({
          photoId: imageId,
          etapeType: userType === 'CLIENT' ? 'checkin' : 'checkout',
          url,
          timestamp: new Date().toISOString(),
          metadata: { source: 'uploaded_images' }
        });
      }
    });
    
    console.log(`📸 Photos collectées pour ${room.nom}:`, {
      total: photosPrises.length,
      checkin: photosPrises.filter(p => p.etapeType === 'checkin').length,
      checkout: photosPrises.filter(p => p.etapeType === 'checkout').length,
      task: photosPrises.filter(p => p.etapeType === 'task').length
    });
    
    // Collecter les commentaires (simulé pour l'instant)
    const commentairesRepondus: Array<Record<string, unknown>> = [];
    if (rawPiece?.travelerNote) {
      commentairesRepondus.push({
        type: 'traveler',
        contenu: rawPiece.travelerNote,
        timestamp: new Date().toISOString(),
        userId: userId
      });
    }
    if (rawPiece?.cleanerNote) {
      commentairesRepondus.push({
        type: 'cleaner',
        contenu: rawPiece.cleanerNote,
        timestamp: new Date().toISOString(),
        userId: userId
      });
    }
    
    // Enrichir les étapes avec le statut d'exécution
    const rawEtapes = (rawPiece?.etapes as Array<Record<string, unknown>>) || [];
    const etapesEnrichies = rawEtapes.map((etape: Record<string, unknown>) => {
      const roomTasks = room.tasks as Array<Record<string, unknown>>;
      const taskCompleted = roomTasks.find((t: Record<string, unknown>) => 
        (t.id as string).includes((etape.todoTitle as string)?.toLowerCase().replace(/\s+/g, '-'))
      )?.completed || false;
      
      const relatedPhoto = photosPrises.find(p => {
        const metadata = p.metadata as Record<string, unknown>;
        const taskId = metadata?.taskId as string;
        const todoTitle = etape.todoTitle as string;
        return taskId?.includes(todoTitle?.toLowerCase().replace(/\s+/g, '-'));
      });
      
      return {
        ...etape,
        executed: taskCompleted || !!relatedPhoto,
        executedAt: (relatedPhoto?.timestamp as string) || undefined,
        photoTaken: relatedPhoto ? {
          url: (relatedPhoto.url as string),
          timestamp: (relatedPhoto.timestamp as string)
        } : undefined,
        userResponse: taskCompleted ? 'Complété' : undefined
      };
    });
    
    // Simuler des signalements (à adapter selon vos données réelles)
    const signalements: Array<Record<string, unknown>> = [];
    if (interactions?.signalements) {
      Object.entries(interactions.signalements as Record<string, unknown>).forEach(([sigId, sigData]: [string, unknown]) => {
        const signalementData = sigData as Record<string, unknown>;
        if (signalementData.pieceId === room.id) {
          signalements.push({
            id: sigId,
            titre: (signalementData.titre as string) || 'Signalement',
            description: (signalementData.description as string) || '',
            priorite: (signalementData.priorite as boolean) || false,
            status: (signalementData.status as string) || 'A_TRAITER',
            createdAt: (signalementData.createdAt as string) || new Date().toISOString(),
            photos: (signalementData.photos as string[]) || []
          });
        }
      });
    }
    
    return {
      logementID: (rawPiece?.logementID as string) || (room.id as string),
      pieceID: room.id as string,
      nom: room.nom as string,
      travelerNote: rawPiece?.travelerNote as string,
      cleanerNote: rawPiece?.cleanerNote as string,
      infoEntrance: rawPiece?.infoEntrance as string,
      
      photosPrises: photosPrises as any, // Type assertion temporaire
      commentairesRepondus: commentairesRepondus as any,
      etapes: etapesEnrichies as any,
      signalements: signalements as any
    };
  }
  
  /**
   * 📊 Calcule les statistiques globales
   */
  private calculateStats(donneesUtilisateur: any, baseData: DebugPayload, exitQuestionsCount: number = 0): EnrichedAPIPayload['stats'] {
    const checkinPhotos = donneesUtilisateur.photos.filter((p: any) => p.type === 'etat_entree').length;
    const checkoutPhotos = donneesUtilisateur.photos.filter((p: any) => p.type === 'etat_sortie').length;

    return {
      totalPieces: baseData.rooms.length,
      photosCheckin: checkinPhotos,
      photosCheckout: checkoutPhotos,
      validationsCheckin: baseData.progress?.checkinData ? Object.keys(baseData.progress.checkinData.completedTasks || {}).length : 0,
      validationsCheckout: baseData.progress?.checkoutData ? Object.keys(baseData.progress.checkoutData.completedTasks || {}).length : 0,
      signalementsTotal: donneesUtilisateur.signalements.length,
      exitQuestionsTotal: exitQuestionsCount  // 🎯 AJOUTÉ
    };
  }

  /**
   * 📥📤 Construit les données checkin et checkout selon les données disponibles
   */
  private buildCheckinCheckoutData(baseData: DebugPayload, donneesUtilisateur: any): Partial<Pick<EnrichedAPIPayload, 'checkin' | 'checkout'>> {
    const result: Partial<Pick<EnrichedAPIPayload, 'checkin' | 'checkout'>> = {};
    
    // 📥 DONNÉES CHECKIN
    if (baseData.progress?.checkinData) {
      result.checkin = {
        completed: baseData.progress.checkinData.isCompleted,
        completedAt: baseData.progress.checkinData.isCompleted ? new Date().toISOString() : undefined,
        
        pieceResults: baseData.rooms.map(room => this.buildCheckinPieceResult(
          room,
          baseData.progress!.checkinData!,
          donneesUtilisateur
        ))
      };
    }
    
    // 📤 DONNÉES CHECKOUT  
    if (baseData.progress?.checkoutData) {
      result.checkout = {
        completed: baseData.progress.checkoutData.isCompleted,
        completedAt: baseData.progress.checkoutData.isCompleted ? new Date().toISOString() : undefined,
        
        pieceResults: baseData.rooms.map(room => this.buildCheckoutPieceResult(
          room,
          baseData.progress!.checkoutData!,
          donneesUtilisateur
        ))
      };
    }
    
    return result;
  }

  /**
   * 🎯 Construit les étapes d'une pièce à partir des interactions
   * Transforme buttonClicks, checkboxStates, et photosTaken en étapes pour le webhook
   */
  private buildPieceEtapes(
    pieceId: string,
    donneesUtilisateur: any,
    flowType: 'checkin' | 'checkout'
  ): Array<any> {
    const etapes: Array<any> = [];

    console.log(`🎯 Construction des étapes pour pièce ${pieceId} (${flowType}):`, {
      boutons: donneesUtilisateur.boutons.length,
      checkboxes: donneesUtilisateur.checkboxes.length,
      photos: donneesUtilisateur.photos.length
    });

    // 1. Étapes depuis buttonClicks (boutons)
    donneesUtilisateur.boutons
      .filter((btn: any) => btn.pieceId === pieceId)
      .forEach((btn: any) => {
        etapes.push({
          etape_id: btn.taskId || btn.buttonId,
          type: 'button_click',
          etape_type: flowType,
          status: 'completed',
          timestamp: btn.timestamp,
          action: btn.actionType || 'complete',
          is_todo: false,
          todo_title: '',
          comment: '',
          photos_attached: [],
          metadata: btn.metadata || {}
        });
      });

    // 2. Étapes depuis checkboxStates (checkboxes)
    // ✅ CORRECTION: Transformer en format button_click comme demandé
    donneesUtilisateur.checkboxes
      .filter((cb: any) => cb.pieceId === pieceId)
      .forEach((cb: any) => {
        etapes.push({
          etape_id: cb.taskId || cb.etapeId,
          type: 'button_click',  // ✅ CORRECTION: type = "button_click" au lieu de "checkbox"
          etape_type: flowType,
          status: cb.isChecked ? 'completed' : 'pending',
          timestamp: cb.checkedAt || cb.timestamp || new Date().toISOString(),
          is_todo: false,
          todo_title: '',
          action: 'complete',  // ✅ AJOUT: action pour les checkboxes
          comment: '',  // ✅ CORRECTION: comment vide au lieu de cb.notes
          photos_attached: []
        });
      });

    // 3. Étapes depuis photosTaken (photos)
    donneesUtilisateur.photos
      .filter((photo: any) => photo.pieceId === pieceId)
      .forEach((photo: any) => {
        etapes.push({
          etape_id: photo.taskId || photo.photoId,
          type: 'photo_taken',
          etape_type: flowType,
          status: 'completed',
          timestamp: photo.timestamp,
          photo_id: photo.photoId,
          photo_url: photo.url,
          photo_base64: photo.url, // URL is used as base64 fallback
          validated: photo.validated || false,
          retake_count: photo.retakeCount || 0,
          is_todo: false,
          todo_title: ''
        });
      });

    // 4. Trier par timestamp chronologiquement
    etapes.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    console.log(`✅ ${etapes.length} étapes construites pour pièce ${pieceId}:`, {
      buttonClicks: etapes.filter(e => e.type === 'button_click').length,
      checkboxes: etapes.filter(e => e.type === 'checkbox').length,
      photos: etapes.filter(e => e.type === 'photo_taken').length
    });

    return etapes;
  }

  /**
   * 📥 Construit les résultats checkin pour une pièce
   */
  private buildCheckinPieceResult(
    room: any,
    checkinData: any,
    donneesUtilisateur: any
  ): EnrichedAPIPayload['checkin']['pieceResults'][0] {
    const pieceId = room.id as string;
    
    // 🎯 NOUVEAU: Récupérer les données d'état initial pour cette pièce
    const etatInitialPiece = donneesUtilisateur.etatInitial?.[pieceId];
    
    // Photos pour cette pièce
    const piecePhotos = donneesUtilisateur.photos.filter((p: any) => 
      p.pieceId === pieceId && p.type === 'etat_entree'
    );
    
    // Ajouter les photos de l'état initial si disponibles
    if (etatInitialPiece?.photoUrls) {
      etatInitialPiece.photoUrls.forEach((url: string, index: number) => {
        piecePhotos.push({
          photoId: `etat_initial_${pieceId}_${index}`,
          url,
          timestamp: etatInitialPiece.timestamp,
          type: 'etat_general',
          validated: true,
          metadata: { source: 'etat_initial' }
        });
      });
    }
    
    // Validations pour cette pièce
    const pieceValidations = donneesUtilisateur.boutons.filter((b: any) => 
      b.pieceId === pieceId
    );
    
    // Signalements pour cette pièce
    console.log(`🔍 Filtrage signalements pour pièce ${pieceId}:`, {
      totalSignalements: donneesUtilisateur.signalements.length,
      signalements: donneesUtilisateur.signalements.map((s: any) => ({
        id: s.id,
        roomId: s.roomId,
        pieceId: s.pieceId,
        piece: s.piece,
        titre: s.titre
      }))
    });

    const pieceSignalements = donneesUtilisateur.signalements.filter((s: any) => {
      const match = s.pieceId === pieceId || s.roomId === pieceId;
      console.log(`🔍 Signalement ${s.id}: pieceId=${s.pieceId}, roomId=${s.roomId}, match=${match}`);
      return match;
    });

    console.log(`🏠 Checkin ${pieceId}:`, {
      etatInitial: etatInitialPiece?.etat || 'non défini',
      hasComment: !!etatInitialPiece?.comment,
      photosEtatInitial: etatInitialPiece?.photosCount || 0,
      photosTotal: piecePhotos.length,
      signalementsCount: pieceSignalements.length
    });

    return {
      pieceID: pieceId,

      // 🎯 NOUVEAU: Étapes construites à partir de toutes les interactions
      etapes: this.buildPieceEtapes(pieceId, donneesUtilisateur, 'checkin'),

      validations: {
        etatGeneral: etatInitialPiece ? etatInitialPiece.etat === 'correct' : pieceValidations.some((v: any) => v.userResponse === 'OK'),
        propreteOK: etatInitialPiece ? etatInitialPiece.etat === 'correct' : !pieceSignalements.some((s: any) => s.type === 'issue'),
        equipementsOK: true, // À déterminer selon les checks
        dommagesDetectes: etatInitialPiece ? etatInitialPiece.etat === 'deplorable' : pieceSignalements.some((s: any) => s.type === 'damage')
      },
      
      photos: piecePhotos.map((photo: any) => ({
        photoId: photo.photoId,
        url: photo.url,
        timestamp: photo.timestamp,
        type: photo.type === 'etat_entree' ? 'etat_general' as const : 'detail_probleme' as const,
        validated: photo.validated
      })),
      
      checks: donneesUtilisateur.checkboxes
        .filter((c: any) => c.pieceId === pieceId)
        .map((check: any) => ({
          checkId: check.checkboxId,
          taskName: check.taskId,
          checked: check.isChecked,
          checkedAt: check.checkedAt,
          notes: check.notes
        })),
      
      signalements: pieceSignalements.map((sig: any) => ({
        signalementId: sig.signalementId,
        titre: sig.titre,
        description: sig.description,
        severity: sig.severity,
        photos: sig.photos,
        createdAt: sig.createdAt
      })),
      
      notes: etatInitialPiece?.comment || donneesUtilisateur.commentaires
        .find((c: any) => c.pieceId === pieceId)?.contenu,
      completedAt: etatInitialPiece?.timestamp || new Date().toISOString()
    };
  }

  /**
   * 📤 Construit les résultats checkout pour une pièce
   */
  private buildCheckoutPieceResult(
    room: any,
    checkoutData: any,
    donneesUtilisateur: any
  ): EnrichedAPIPayload['checkout']['pieceResults'][0] {
    const pieceId = room.id as string;

    // Photos checkout pour cette pièce
    const piecePhotos = donneesUtilisateur.photos.filter((p: any) =>
      p.pieceId === pieceId && p.type === 'etat_sortie'
    );

    return {
      pieceID: pieceId,

      // 🎯 NOUVEAU: Étapes construites à partir de toutes les interactions
      etapes: this.buildPieceEtapes(pieceId, donneesUtilisateur, 'checkout'),

      validations: {
        menageEffectue: checkoutData.completedTasks[`menage_${pieceId}`] || false,
        etatFinal: true, // À déterminer
        equipementsVerifies: checkoutData.completedTasks[`equipement_${pieceId}`] || false,
        problemesResolus: !donneesUtilisateur.signalements.some((s: any) => s.pieceId === pieceId)
      },
      
      photos: piecePhotos.map((photo: any) => ({
        photoId: photo.photoId,
        url: photo.url,
        timestamp: photo.timestamp,
        type: 'etat_final' as const,
        validated: photo.validated
      })),
      
      tasks: Object.entries(checkoutData.completedTasks || {})
        .filter(([taskId]) => taskId.includes(pieceId))
        .map(([taskId, completed]) => ({
          taskId,
          taskName: taskId,
          completed: completed as boolean,
          completedAt: completed ? new Date().toISOString() : undefined,
          verified: completed as boolean,
          photos: piecePhotos.map(p => p.url)
        })),
      
      signalements: donneesUtilisateur.signalements
        .filter((s: any) => s.pieceId === pieceId)
        .map((sig: any) => ({
          signalementId: sig.signalementId,
          titre: sig.titre,
          action: sig.status === 'resolved' ? 'resolu' as const : 'nouveau' as const,
          photos: sig.photos,
          timestamp: sig.createdAt
        })),
      
      notes: donneesUtilisateur.commentaires
        .find((c: any) => c.pieceId === pieceId)?.contenu,
      completedAt: checkoutData.isCompleted ? new Date().toISOString() : undefined
    };
  }

  /**
   * 🎯 Collecte les VRAIES données critiques utilisateur depuis les bons emplacements
   */
  private async collectUserInteractions(checkId?: string): Promise<Record<string, any>> {
    try {
      console.log('🔍 Collecte des VRAIES interactions utilisateur...');
      
      const interactions: Record<string, any> = {};
      
      // 1. 📸 Collecter les VRAIES photos uploadées
      const uploadedPhotos: Record<string, any> = {};
      const allLocalStorageKeys = Object.keys(localStorage);
      console.log('🔍 DIAGNOSTIC localStorage:', {
        totalKeys: allLocalStorageKeys.length,
        allKeys: allLocalStorageKeys,
        uploadedImageKeys: allLocalStorageKeys.filter(k => k.startsWith('uploaded_image_'))
      });
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('uploaded_image_')) {
          try {
            const photoData = JSON.parse(localStorage.getItem(key) || '{}');
            const photoId = key.replace('uploaded_image_', '');
            uploadedPhotos[photoId] = {
              ...photoData,
              id: photoId,
              source: 'uploaded_image'
            };
            console.log('📸 Photo trouvée:', { 
              id: photoId, 
              key,
              hasUrl: !!photoData.url, 
              hasUploadedUrl: !!photoData.uploadedUrl,
              pieceId: photoData.pieceId,
              fullData: photoData
            });
          } catch (e) {
            console.warn('📸 Erreur parsing photo:', key, e);
          }
        }
      });
      
      console.log('📸 RÉSUMÉ photos collectées:', {
        totalFound: Object.keys(uploadedPhotos).length,
        photoIds: Object.keys(uploadedPhotos),
        firstPhotoSample: Object.values(uploadedPhotos)[0]
      });
      
      interactions.uploadedPhotos = uploadedPhotos;
      
      // 2. 💬 Collecter depuis checkSessionManager (commentaires, interactions, états initiaux)
      if (checkId) {
        try {
          const { checkSessionManager } = await import('@/services/checkSessionManager');
          const session = await checkSessionManager.getCheckSession(checkId);
          if (session?.progress) {
            interactions.checkSession = session.progress;

            console.log('🔍 DIAGNOSTIC checkSession:', {
              hasProgress: !!session.progress,
              hasInteractions: !!session.progress.interactions,
              hasButtonClicks: !!session.progress.interactions?.buttonClicks,
              buttonClicksCount: Object.keys(session.progress.interactions?.buttonClicks || {}).length,
              hasCheckboxStates: !!session.progress.interactions?.checkboxStates,
              checkboxStatesCount: Object.keys(session.progress.interactions?.checkboxStates || {}).length,
              hasTasksCompleted: !!session.progress.interactions?.tasksCompleted,
              hasNotes: !!session.progress.interactions?.notes,
              fullSession: session.progress
            });

            // 🎯 NOUVEAU: Collecter les buttonClicks depuis IndexedDB
            if (session.progress.interactions?.buttonClicks) {
              interactions.buttons = session.progress.interactions.buttonClicks;
              console.log('🔘 ButtonClicks collectés depuis IndexedDB:', Object.keys(interactions.buttons).length);
            }

            // 🎯 NOUVEAU: Collecter les checkboxStates depuis IndexedDB
            if (session.progress.interactions?.checkboxStates) {
              interactions.checkboxes = session.progress.interactions.checkboxStates;
              console.log('☑️ CheckboxStates collectés depuis IndexedDB:', Object.keys(interactions.checkboxes).length);
            }
            
            // 🎯 SPÉCIAL: Collecter les données d'état initial
            const etatInitialData: Record<string, any> = {};
            if (session.progress.interactions?.buttonClicks) {
              Object.entries(session.progress.interactions.buttonClicks).forEach(([buttonKey, clickData]: [string, any]) => {
                // Format: "pieceId_etat-initial-pieceId-state_timestamp"
                if (buttonKey.includes('etat-initial-')) {
                  const match = buttonKey.match(/etat-initial-(.+)-(correct|deplorable)/);
                  if (match) {
                    const [, pieceId, etat] = match;
                    
                    if (!etatInitialData[pieceId]) {
                      etatInitialData[pieceId] = {};
                    }
                    
                    etatInitialData[pieceId] = {
                      pieceId,
                      etat: etat as 'correct' | 'deplorable',
                      timestamp: Array.isArray(clickData) ? clickData[0]?.timestamp : clickData?.timestamp,
                      comment: Array.isArray(clickData) ? clickData[0]?.metadata?.comment : clickData?.metadata?.comment,
                      photosCount: Array.isArray(clickData) ? clickData[0]?.metadata?.photosCount : clickData?.metadata?.photosCount,
                      photoUrls: Array.isArray(clickData) ? clickData[0]?.metadata?.photoUrls : clickData?.metadata?.photoUrls
                    };
                    
                    console.log('🏠 État initial trouvé:', { 
                      pieceId, 
                      etat, 
                      hasComment: !!etatInitialData[pieceId].comment,
                      photosCount: etatInitialData[pieceId].photosCount || 0
                    });
                  }
                }
              });
            }
            
            interactions.etatInitial = etatInitialData;
            
            console.log('💬 Session trouvée:', { 
              hasInteractions: !!session.progress.interactions,
              tasksCompleted: Object.keys(session.progress.interactions?.tasksCompleted || {}).length,
              etatsInitiaux: Object.keys(etatInitialData).length
            });
          }
        } catch (e) {
          console.warn('🔧 Impossible de récupérer session:', e);
        }
      }
      
      // 3. 🚨 Signalements depuis localStorage/contextes
      try {
        // Chercher les clés de signalements
        Object.keys(localStorage).forEach(key => {
          if (key.includes('signalement') || key.includes('problem')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              interactions[key] = data;
            } catch (e) {
              console.warn('Impossible de parser signalement:', key);
            }
          }
        });
      } catch (e) {
        console.warn('Erreur signalements:', e);
      }
      
      console.log('📊 VRAIES interactions collectées:', {
        photosUploadees: Object.keys(uploadedPhotos).length,
        hasCheckSession: !!interactions.checkSession,
        totalKeys: Object.keys(interactions).length
      });
      
      return interactions;
    } catch (e) {
      console.warn('🔧 Erreur collecte interactions:', e);
      return {};
    }
  }

  /**
   * 🎯 Collecte les signalements utilisateur
   */
  private async collectSignalements(): Promise<any[]> {
    try {
      const allSignalements: any[] = [];

      // Importer checkSessionManager
      const { checkSessionManager } = await import('@/services/checkSessionManager');

      // 1. ✅ NOUVEAU: Récupérer depuis la session CheckID active
      const sessions = checkSessionManager.getStoredSessions();
      console.log('🔍 collectSignalements: Sessions trouvées:', sessions.length);

      const activeSession = sessions.find(s => s.status === 'active' || !s.isFlowCompleted);
      console.log('🔍 collectSignalements: Session active:', activeSession ? activeSession.checkId : 'AUCUNE');

      if (activeSession?.progress?.interactions?.signalements) {
        const sessionSignalements = activeSession.progress.interactions.signalements;
        console.log('🚨 Signalements depuis session CheckID:', Object.keys(sessionSignalements).length);
        console.log('🔍 Signalements bruts:', sessionSignalements);

        Object.entries(sessionSignalements).forEach(([key, sig]: [string, any]) => {
          const signalement = {
            id: sig.signalementId || key,
            roomId: sig.pieceId || sig.roomId,
            piece: sig.metadata?.piece || sig.pieceName || '',
            titre: sig.title || sig.titre || '',
            commentaire: sig.description || sig.commentaire || '',
            imgUrl: sig.photos?.[0] || sig.metadata?.imgUrl,
            imgBase64: sig.metadata?.imgBase64,
            flowType: sig.metadata?.flowType || 'checkin',
            origine: sig.metadata?.origine || 'CLIENT',
            status: sig.status === 'resolved' ? 'RESOLU' : 'A_TRAITER',
            priorite: sig.severity === 'high' || sig.severity === 'critical',
            created_at: sig.createdAt || new Date().toISOString(),
            updated_at: sig.updatedAt || new Date().toISOString()
          };

          console.log('🔍 Signalement converti:', signalement);
          allSignalements.push(signalement);
        });
      } else {
        console.warn('⚠️ collectSignalements: Pas de signalements dans la session active');
      }

      // 2. Fallback: Récupérer depuis localStorage (ancienne méthode)
      const signalementsData = localStorage.getItem('signalements');
      if (signalementsData) {
        const signalements = JSON.parse(signalementsData);
        console.log('🔍 Signalements depuis localStorage:', signalements.length);
        if (Array.isArray(signalements)) {
          allSignalements.push(...signalements);
        }
      }

      console.log('🚨 Total signalements collectés:', allSignalements.length, allSignalements);
      return allSignalements;
    } catch (e) {
      console.error('❌ Erreur collecte signalements:', e);
      return [];
    }
  }

  /**
   * 🎯 Collecte les questions de sortie (Exit Questions)
   */
  private async collectExitQuestions(checkId?: string): Promise<EnrichedAPIPayload['exitQuestions']> {
    try {
      console.log('🎯 collectExitQuestions: Début collecte...');
      const exitQuestions: EnrichedAPIPayload['exitQuestions'] = [];

      if (!checkId) {
        console.warn('⚠️ collectExitQuestions: Pas de checkId disponible');
        return [];
      }

      // Récupérer les questions de sortie depuis la session CheckID
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const session = await checkSessionManager.getCheckSession(checkId);

      if (!session?.progress?.interactions?.exitQuestions) {
        console.log('ℹ️ collectExitQuestions: Pas de questions de sortie dans la session');
        return [];
      }

      const exitQuestionsData = session.progress.interactions.exitQuestions;
      console.log('🎯 Questions de sortie trouvées:', Object.keys(exitQuestionsData).length);

      // Convertir les questions de sortie au format API
      Object.entries(exitQuestionsData).forEach(([questionId, response]: [string, any]) => {
        exitQuestions.push({
          questionId: response.questionID || questionId,
          questionContent: response.questionContent || '',
          questionType: response.questionType || 'text',

          // Réponse boolean
          checked: response.checked !== undefined ? response.checked : undefined,

          // Réponse texte
          textResponse: response.textResponse || undefined,

          // Image
          hasImage: response.hasImage || false,
          imageBase64: response.imageBase64 || undefined,
          imageUrl: response.imageUrl || undefined,
          imagePhotoId: response.imagePhotoId || undefined,

          // Timestamps
          timestamp: response.timestamp || new Date().toISOString(),
          updatedAt: response.updatedAt || undefined
        });
      });

      console.log('✅ collectExitQuestions: Questions collectées:', exitQuestions.length);
      return exitQuestions;
    } catch (e) {
      console.error('❌ Erreur collecte exit questions:', e);
      return [];
    }
  }

  /**
   * 🎯 Construit les données critiques utilisateur
   */
  private buildUserCriticalData(
    userInteractions: Record<string, any>,
    signalements: any[],
    uploadedImages: Record<string, string>,
    checkinData?: any,
    checkoutData?: any
  ): EnrichedAPIPayload['donneesUtilisateur'] {
    
    // 1. Boutons (validations OK/Mauvais)
    const boutons: any[] = [];
    if (userInteractions.buttons) {
      Object.values(userInteractions.buttons).forEach((btn: any) => {
        boutons.push({
          buttonId: btn.buttonId || 'unknown',
          pieceId: btn.pieceId || 'unknown',
          taskId: btn.taskId,
          actionType: btn.actionType || 'validate',
          timestamp: btn.timestamp || new Date().toISOString(),
          userResponse: btn.validated ? 'OK' : 'MAUVAIS'
        });
      });
    }

    // 2. 📸 VRAIES Photos utilisateur depuis uploadedPhotos
    const photos: any[] = [];
    
    // Photos depuis les vraies données uploadées
    if (userInteractions.uploadedPhotos) {
      Object.entries(userInteractions.uploadedPhotos).forEach(([photoId, photoData]: [string, any]) => {
        photos.push({
          photoId,
          pieceId: photoData.pieceId || 'unknown',
          taskId: photoData.taskId || 'photo_upload',
          url: photoData.url || '',
          timestamp: photoData.timestamp || photoData.uploadedAt || new Date().toISOString(),
          type: photoData.userType === 'CLIENT' ? 'etat_entree' : 'etat_sortie',
          validated: !!photoData.url,
          retakeCount: 0,
          metadata: {
            source: 'uploaded_photos',
            originalId: photoId,
            userType: photoData.userType
          }
        });
        
        console.log('📸 Photo ajoutée:', { 
          id: photoId, 
          piece: photoData.pieceId, 
          hasUrl: !!photoData.url,
          type: photoData.userType === 'CLIENT' ? 'etat_entree' : 'etat_sortie'
        });
      });
    }

    // Ajouter les photos de checkinData/checkoutData si disponibles
    if (checkinData?.takenPhotos) {
      Object.entries(checkinData.takenPhotos).forEach(([key, photoArray]: [string, any]) => {
        const photoList = Array.isArray(photoArray) ? photoArray : [photoArray];
        photoList.forEach((photo: any, index: number) => {
          photos.push({
            photoId: `checkin_${key}_${index}`,
            pieceId: key,
            taskId: 'checkin_etat',
            url: photo.url || '',
            timestamp: photo.timestamp || new Date().toISOString(),
            type: 'etat_entree',
            validated: true,
            retakeCount: 0,
            metadata: { source: 'checkin_data' }
          });
        });
      });
    }

    // Photos des données uploadedImages (fallback)
    Object.entries(uploadedImages).forEach(([photoId, url]) => {
      // Éviter les doublons
      if (!photos.some(p => p.photoId === photoId)) {
        photos.push({
          photoId,
          pieceId: 'unknown',
          taskId: 'fallback_upload',
          url,
          timestamp: new Date().toISOString(),
          type: 'etat_entree',
          validated: true,
          retakeCount: 0,
          metadata: { source: 'fallback_uploaded_images' }
        });
      }
    });

    // 3. Checkboxes
    const checkboxes: any[] = [];
    if (userInteractions.checkboxes) {
      Object.values(userInteractions.checkboxes).forEach((cb: any) => {
        checkboxes.push({
          checkboxId: cb.checkboxId || 'unknown',
          taskId: cb.taskId || 'unknown',
          pieceId: cb.pieceId || 'unknown',
          isChecked: cb.isChecked || false,
          checkedAt: cb.checkedAt,
          notes: cb.notes,
          userValidation: cb.isChecked ? 'OK' : 'NON_VERIFIE'
        });
      });
    }

    // 4. Signalements
    const signalementsUtilisateur = signalements.map((sig: any) => ({
      signalementId: sig.id || 'unknown',
      pieceId: sig.roomId || sig.piece || 'unknown',
      type: 'issue',
      severity: sig.priorite ? 'high' : 'medium',
      titre: sig.titre || '',
      description: sig.commentaire || sig.description || '',
      photos: sig.imgUrl ? [sig.imgUrl] : [],
      createdAt: sig.created_at || new Date().toISOString(),
      status: sig.status === 'RESOLU' ? 'resolved' : 'open',
      userComment: sig.commentaire || sig.description
    }));

    // 5. 💬 VRAIS Commentaires depuis les interactions
    const commentaires: any[] = [];
    
    // Depuis la session checkId
    if (userInteractions.checkSession?.interactions) {
      const sessionData = userInteractions.checkSession.interactions;
      
      // Chercher des commentaires/notes dans les interactions
      if (sessionData.notes) {
        Object.entries(sessionData.notes).forEach(([pieceId, note]: [string, any]) => {
          commentaires.push({
            id: `comment_${pieceId}`,
            pieceId,
            type: 'note_generale',
            contenu: typeof note === 'string' ? note : note.content || note.text || '',
            timestamp: note.timestamp || new Date().toISOString(),
            source: 'check_session'
          });
        });
      }
      
      // Chercher dans les tâches complétées s'il y a des notes
      if (sessionData.tasksCompleted) {
        Object.entries(sessionData.tasksCompleted).forEach(([taskId, taskData]: [string, any]) => {
          if (typeof taskData === 'object' && taskData.comment) {
            commentaires.push({
              id: `task_comment_${taskId}`,
              pieceId: taskData.pieceId || 'unknown',
              taskId,
              type: 'observation',
              contenu: taskData.comment,
              timestamp: taskData.timestamp || new Date().toISOString(),
              source: 'task_completed'
            });
          }
        });
      }
    }
    
    console.log('💬 Commentaires collectés:', commentaires.length);
    
    // 6. États des pièces
    const etatsPieces: any[] = [];
    // À implémenter selon les données de validation

    // 7. 🏠 États initiaux depuis les interactions
    let etatInitial = {};
    if (userInteractions.etatInitial) {
      etatInitial = userInteractions.etatInitial;
    }

    console.log('🎯 RÉSUMÉ données critiques construites:', {
      boutons: boutons.length,
      photos: photos.length,
      checkboxes: checkboxes.length, 
      signalements: signalementsUtilisateur.length,
      commentaires: commentaires.length,
      etatsInitiaux: Object.keys(etatInitial).length,
      photosDetails: photos.map(p => ({ id: p.photoId, piece: p.pieceId, url: !!p.url }))
    });

    return {
      boutons,
      photos,
      checkboxes,
      signalements: signalementsUtilisateur,
      commentaires,
      etatsPieces,
      etatInitial // 🎯 NOUVEAU: Inclure les états initiaux
    };
  }

  /**
   * 🎯 Construit les données de pièce centrées sur l'utilisateur
   */
  private buildRoomUserData(
    room: Record<string, unknown>,
    rawParcoursData: Record<string, unknown>,
    donneesUtilisateur: EnrichedAPIPayload['donneesUtilisateur'],
    userType: string
  ): EnrichedAPIPayload['piece'][0] {
    const pieceId = room.id as string;
    
    // Compter les données utilisateur pour cette pièce
    const photosUtilisateur = donneesUtilisateur.photos.filter(p => p.pieceId === pieceId).length;
    const checkboxesUtilisateur = donneesUtilisateur.checkboxes.filter(c => c.pieceId === pieceId).length;
    const signalementsUtilisateur = donneesUtilisateur.signalements.filter(s => s.pieceId === pieceId).length;
    
    // Déterminer l'état utilisateur
    let etatUtilisateur: 'OK' | 'PROBLEME' | 'NON_VERIFIE' = 'NON_VERIFIE';
    const validations = donneesUtilisateur.boutons.filter(b => b.pieceId === pieceId && b.actionType === 'validate');
    if (validations.length > 0) {
      etatUtilisateur = validations.some(v => v.userResponse === 'MAUVAIS') ? 'PROBLEME' : 'OK';
    }
    
    // Récupérer les étapes de la pièce
    const rawPieces = rawParcoursData?.piece as Array<Record<string, unknown>> || [];
    const rawPiece = rawPieces.find((p: Record<string, unknown>) => p.pieceID === pieceId);
    const etapes = (rawPiece?.etapes as Array<Record<string, unknown>> || []).map(etape => ({
      pieceID: etape.pieceID as string,
      todoTitle: etape.todoTitle as string,
      isTodo: etape.isTodo as boolean,
      
      // Validation utilisateur
      validatedByUser: validations.length > 0,
      userResponse: etatUtilisateur === 'OK' ? 'OK' : etatUtilisateur === 'PROBLEME' ? 'PROBLEME' : 'NON_FAIT',
      userNotes: donneesUtilisateur.commentaires.find(c => c.pieceId === pieceId)?.contenu,
      userPhotos: donneesUtilisateur.photos.filter(p => p.pieceId === pieceId).map(p => p.url),
      validatedAt: validations[0]?.timestamp
    }));

    return {
      logementID: rawParcoursData?.logementID as string || 'unknown',
      pieceID: pieceId,
      nom: room.nom as string,
      etatUtilisateur,
      photosUtilisateur,
      checkboxesUtilisateur,
      signalementsUtilisateur,
      etapes
    };
  }

  /**
   * 🎯 Détermine le type de photo selon le contexte
   */
  private determinePhotoType(photoData: Record<string, unknown>, userType: string): 'checkin' | 'checkout' | 'task' {
    const metadata = photoData.metadata as Record<string, unknown>;
    if (metadata?.flowType) {
      return metadata.flowType as 'checkin' | 'checkout' | 'task';
    }
    
    if (photoData.taskId) {
      return 'task';
    }
    
    return userType === 'CLIENT' ? 'checkin' : 'checkout';
  }

  /**
   * 🔍 Récupère le checkId depuis l'URL
   */
  private getCheckIdFromUrl(): string | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('checkid');
    } catch (error) {
      console.warn('❌ Erreur lecture checkId URL:', error);
      return null;
    }
  }

  /**
   * 🏠 Récupère le parcoursId depuis l'URL
   */
  private getParcoursIdFromUrl(): string | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('parcours');
    } catch (error) {
      console.warn('❌ Erreur lecture parcours URL:', error);
      return null;
    }
  }

  /**
   * 🧪 Simule des données de checkin pour les tests
   */
  async simulateCheckinData(): Promise<void> {
    try {
      console.log('🧪 === SIMULATION DE DONNÉES CHECKIN ===');
      
      const checkId = this.getCheckIdFromUrl() || localStorage.getItem('activeCheckId');
      if (!checkId) {
        console.warn('❌ Aucun CheckID pour simulation');
        return;
      }

      const { interactionTracker } = await import('@/services/interactionTracker');
      
      // Simuler quelques clics de boutons (état initial)
      await interactionTracker.trackButtonClick({
        buttonId: 'etat-initial-chambre-deplorable',
        pieceId: 'chambre',
        taskId: 'etat-initial',
        actionType: 'validate',
        timestamp: new Date().toISOString(),
        metadata: {
          page: 'etat-initial',
          comment: 'Simulation: Problème détecté dans la chambre',
          photosCount: 1,
          photoUrls: ['https://example.com/photo1.jpg']
        }
      });

      // Simuler une photo
      await interactionTracker.trackPhotoTaken({
        photoId: 'sim_photo_' + Date.now(),
        taskId: 'etat-general-chambre',
        pieceId: 'chambre',
        photoData: 'data:image/jpeg;base64,simulation...',
        timestamp: new Date().toISOString(),
        validated: true,
        retakeCount: 0,
        metadata: {
          simulation: true,
          type: 'etat_entree'
        }
      });

      // Simuler un signalement
      await interactionTracker.trackSignalement({
        signalementId: 'sim_sig_' + Date.now(),
        pieceId: 'chambre',
        type: 'damage',
        severity: 'medium',
        title: 'Simulation: Tache sur moquette',
        description: 'Tache importante détectée lors du checkin',
        photos: [],
        createdAt: new Date().toISOString(),
        status: 'open',
        metadata: { simulation: true }
      });

      console.log('✅ Données de simulation créées !');
      console.log('🔄 Maintenant vous pouvez tester les webhooks avec des données');
      
    } catch (error) {
      console.error('❌ Erreur simulation:', error);
    }
  }

  /**
   * 📋 Affiche toutes les données stockées en base pour un checkId (COMME LA REPRISE DE PARCOURS)
   */
  async displayStoredCheckinData(): Promise<void> {
    try {
      console.log('🔍 === DIAGNOSTIC COMPLET DES DONNÉES STOCKÉES (REPRISE) ===');
      
      // 1. Utiliser la même logique que la reprise de parcours
      const userData = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const parcoursId = this.getParcoursIdFromUrl();
      
      console.log('👤 Utilisateur:', userData);
      console.log('🏠 Parcours ID:', parcoursId);
      
      if (!userData.phone || !parcoursId) {
        console.warn('❌ Données utilisateur ou parcours manquantes');
        console.log('🔍 userData:', userData);
        console.log('🔍 parcoursId:', parcoursId);
        return;
      }
      
      // 2. Récupérer TOUTES les sessions existantes pour cet utilisateur/parcours
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const sessionCheck = await checkSessionManager.checkExistingSessions(
        userData.phone,
        parcoursId
      );
      
      console.log('🔍 === VÉRIFICATION SESSIONS EXISTANTES ===', {
        hasExistingSession: sessionCheck.hasExistingSession,
        hasCompletedSession: sessionCheck.hasCompletedSession,
        activeSession: !!sessionCheck.session,
        completedSession: !!sessionCheck.completedSession
      });
      
      // 3. Prioriser la session active, sinon prendre la session complétée
      const session = sessionCheck.session || sessionCheck.completedSession;
      
      if (!session) {
        console.warn('❌ Aucune session trouvée (ni active ni complétée)');
        console.log('🔍 Créez d\'abord un parcours en passant par le checkin/checkout');
        return;
      }
      
      console.log('📊 === SESSION COMPLÈTE ===', {
        checkId: session.checkId,
        userId: session.userId,
        parcoursId: session.parcoursId,
        flowType: session.flowType,
        status: session.status,
        isCompleted: session.isFlowCompleted,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        completedAt: session.completedAt
      });
      
      // 4. Détailler les interactions (données réelles de reprise)
      console.log('🎯 === INTERACTIONS GRANULAIRES (REPRISE) ===');
      const interactions = session.progress.interactions;
      
      console.log('👆 CLICS BOUTONS:', {
        total: Object.keys(interactions.buttonClicks || {}).length,
        détails: interactions.buttonClicks
      });
      
      console.log('📸 PHOTOS PRISES:', {
        total: Object.keys(interactions.photosTaken || {}).length,
        détails: interactions.photosTaken
      });
      
      console.log('☑️ CHECKBOXES:', {
        total: Object.keys(interactions.checkboxStates || {}).length,
        détails: interactions.checkboxStates
      });
      
      console.log('🚨 SIGNALEMENTS:', {
        total: Object.keys(interactions.signalements || {}).length,
        détails: interactions.signalements
      });
      
      console.log('🏠 ÉTATS PIÈCES:', {
        total: Object.keys(interactions.pieceStates || {}).length,
        détails: interactions.pieceStates
      });
      
      // 5. Statistiques calculées
      console.log('📊 === STATISTIQUES ===', session.progress.statistics);
      
      // 6. Navigation (données de parcours)
      console.log('🗺️ === NAVIGATION ===', {
        pièceActuelle: session.progress.currentPieceId,
        indexTâche: session.progress.currentTaskIndex,
        navigation: session.progress.interactions.navigation
      });
      
      // 7. LocalStorage images (pour vérification)
      console.log('💾 === LOCALSTORAGE IMAGES (VÉRIFICATION) ===');
      const imageKeys = Object.keys(localStorage).filter(k => k.startsWith('uploaded_image_'));
      console.log('🖼️ Images uploadées:', {
        total: imageKeys.length,
        clés: imageKeys
      });
      
      imageKeys.slice(0, 3).forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          console.log(`📷 ${key}:`, {
            id: data.id,
            uploadedUrl: data.uploadedUrl?.substring(0, 50) + '...',
            pieceId: data.pieceId,
            hasDataUrl: !!data.dataUrl,
            uploadedAt: data.uploadedAt
          });
        } catch (e) {
          console.warn(`❌ Erreur parsing ${key}:`, e);
        }
      });
      
      // 8. Données legacy pour compatibilité
      console.log('🔄 === DONNÉES LEGACY ===');
      console.log('completedTasks:', session.progress.completedTasks);
      console.log('completedSteps:', session.progress.completedSteps);
      console.log('takenPhotos:', session.progress.takenPhotos);
      
      console.log('✅ === FIN DIAGNOSTIC (REPRISE) ===');
      console.log('🎯 Cette session peut être utilisée pour les webhooks !');
      
    } catch (error) {
      console.error('❌ Erreur diagnostic données:', error);
    }
  }

  /**
   * 🎯 WEBHOOK UNIFIÉ - Envoie TOUTES les données (CHECKIN + CHECKOUT) vers un seul endpoint
   * ✅ UTILISE LA MÊME LOGIQUE QUE database-admin.html via webhookDataGenerator
   * @param customUrl URL personnalisée (optionnel, sinon utilise l'URL par défaut)
   */
  async sendUnifiedWebhook(customUrl?: string): Promise<DebugResult> {
    try {
      console.log('🎯 Collecte des données COMPLÈTES (CHECKIN + CHECKOUT) pour webhook unifié...');
      console.log('✅ Utilisation de la logique de transformation de database-admin.html');

      // ✅ NOUVEAU: Utiliser le générateur de webhook partagé
      const { generateUnifiedWebhookData } = await import('./webhookDataGenerator');
      const { checkSessionManager } = await import('./checkSessionManager');

      // Récupérer le checkID actif
      const urlParams = new URLSearchParams(window.location.search);
      let currentCheckId = urlParams.get('checkid');
      if (!currentCheckId) {
        currentCheckId = localStorage.getItem('activeCheckId');
      }

      if (!currentCheckId) {
        console.error('❌ Aucun checkID actif trouvé');
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Aucun checkID actif trouvé'
        };
      }

      // Récupérer les données de session
      const session = await checkSessionManager.getCheckSession(currentCheckId);
      if (!session) {
        console.error('❌ Session introuvable pour checkID:', currentCheckId);
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Session introuvable'
        };
      }

      // ✅ Générer le payload avec la MÊME logique que database-admin.html
      const webhookPayload = await generateUnifiedWebhookData(session as any, currentCheckId);

      console.log('🎯 DONNÉES COMPLÈTES collectées:', {
        checkID: webhookPayload.checkID,
        parcours_id: webhookPayload.parcours_id,
        totalPieces: webhookPayload.stats.total_pieces,
        totalPhotos: webhookPayload.stats.total_photos,
        hasCheckin: !!webhookPayload.checkin,
        checkinPieces: webhookPayload.checkin?.pieces.length || 0,
        signalements: webhookPayload.stats.total_signalements,
        exitQuestions: webhookPayload.stats.total_exit_questions
      });

      // Envoyer au webhook unifié
      const UNIFIED_WEBHOOK_URL = customUrl || environment.WEBHOOK_UNIFIED_URL;
      console.log('🎯 URL webhook UNIFIÉ:', UNIFIED_WEBHOOK_URL);

      const result = await this.sendToWebhookEndpoint(webhookPayload as any, UNIFIED_WEBHOOK_URL, 'UNIFIÉ (CHECKIN + CHECKOUT)');

      console.log('🎯 Résultat webhook UNIFIÉ:', result);
      return result;

    } catch (error) {
      console.error('❌ Erreur webhook UNIFIÉ:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📥 Envoie les données de CHECKIN collectées via webhook
   * @deprecated Utiliser sendUnifiedWebhook() à la place
   */
  async sendCheckinWebhook(): Promise<DebugResult> {
    try {
      console.log('📥 Collecte des données CHECKIN pour webhook...');

      // Collecter les données de base
      const basePayload = await this.collectDebugData();

      // Générer le format enrichi spécifique checkin
      const enrichedPayload = await this.generateCheckinWebhookFormat(basePayload);

      if (!enrichedPayload) {
        console.error('❌ Impossible de générer les données checkin');
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Impossible de générer les données checkin'
        };
      }

      console.log('📥 DONNÉES CHECKIN collectées:', {
        parcourID: enrichedPayload.parcourID,
        parcoursType: enrichedPayload.parcoursType,
        checkinCompleted: enrichedPayload.checkin?.completed,
        piecesChecked: enrichedPayload.checkin?.pieceResults.length || 0,
        photosCheckin: enrichedPayload.stats.photosCheckin
      });

      // Envoyer au webhook checkin
      const result = await this.sendToCheckinWebhook(enrichedPayload);

      console.log('📥 Résultat webhook CHECKIN:', result);
      return result;

    } catch (error) {
      console.error('❌ Erreur webhook checkin:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📤 Envoie les données de CHECKOUT collectées via webhook
   */
  async sendCheckoutWebhook(): Promise<DebugResult> {
    try {
      console.log('📤 Collecte des données CHECKOUT pour webhook...');
      
      // Collecter les données de base
      const basePayload = await this.collectDebugData();
      
      // Générer le format enrichi spécifique checkout
      const enrichedPayload = await this.generateCheckoutWebhookFormat(basePayload);
      
      if (!enrichedPayload) {
        console.error('❌ Impossible de générer les données checkout');
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Impossible de générer les données checkout'
        };
      }
      
      console.log('📤 DONNÉES CHECKOUT collectées:', {
        parcourID: enrichedPayload.parcourID,
        checkoutCompleted: enrichedPayload.checkout?.completed,
        piecesCompleted: enrichedPayload.checkout?.pieceResults.length || 0,
        photosCheckout: enrichedPayload.stats.photosCheckout
      });
      
      // Envoyer au webhook checkout
      const result = await this.sendToCheckoutWebhook(enrichedPayload);
      
      console.log('📤 Résultat webhook CHECKOUT:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur webhook checkout:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🐛 Collecte et envoie le payload ENRICHI avec toutes les données critiques
   */
  async sendDebugPayload(): Promise<DebugResult> {
    try {
      console.log('🎯 Collecte des DONNÉES CRITIQUES pour debug...');
      
      // Collecter les données de base
      const basePayload = await this.collectDebugData();
      
      // 🎯 GÉNÉRER LE FORMAT ENRICHI avec toutes les données critiques
      const enrichedPayload = await this.generateEnrichedAPIFormat();
      
      if (!enrichedPayload) {
        console.error('❌ Impossible de générer les données enrichies - arrêt de l\'envoi');
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Impossible de générer les données critiques utilisateur'
        };
      }
      
      console.log('🎯 FORMAT STRUCTURÉ collecté:', {
        pieces: enrichedPayload.pieces.length,
        photosCheckin: enrichedPayload.stats.photosCheckin,
        photosCheckout: enrichedPayload.stats.photosCheckout,
        hasCheckin: !!enrichedPayload.checkin,
        hasCheckout: !!enrichedPayload.checkout,
        signalements: enrichedPayload.stats.signalementsTotal
      });
      
      // 🎯 ENVOYER LES DONNÉES ENRICHIES à l'endpoint
      const result = await this.sendToDebugEndpoint(enrichedPayload);
      
      console.log('🎯 Résultat envoi DONNÉES CRITIQUES:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur envoi données critiques:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * 📊 Collecte toutes les données de debug
   */
  async collectDebugData(): Promise<DebugPayload> {
    console.log('🐛 Début collecte des données de debug...');
    
    // Importer les modules nécessaires
    const { checkSessionManager } = await import('@/services/checkSessionManager');
    const { parcoursManager } = await import('@/services/parcoursManager');
    
    // 1. Récupérer l'utilisateur depuis localStorage
    let userData: Record<string, unknown> | null = null;
    try {
      const userStr = localStorage.getItem('userInfo'); // Clé correcte selon UserContext
      userData = userStr ? JSON.parse(userStr) : null;
      console.log('👤 Utilisateur récupéré:', userData);
    } catch (e) {
      console.warn('🔧 Impossible de récupérer utilisateur depuis localStorage:', e);
    }
    
    // 2. Récupérer l'ID du parcours depuis l'URL
    let currentParcoursId = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      currentParcoursId = urlParams.get('parcours');
      console.log('🔍 Parcours ID depuis URL:', currentParcoursId);
    } catch (e) {
      console.warn('🔧 Impossible de récupérer parcours depuis URL:', e);
    }
    
    // 3. Récupérer le CheckID actif (AVANT le parcours car on peut en avoir besoin)
    let currentCheckId = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      currentCheckId = urlParams.get('checkid');
      if (!currentCheckId) {
        currentCheckId = localStorage.getItem('activeCheckId');
      }

      // 🎯 NOUVEAU: Si on est sur database-admin.html, récupérer le CheckID sélectionné
      if (!currentCheckId && window.location.pathname.includes('database-admin.html')) {
        // Essayer de récupérer depuis les sessions disponibles
        const sessions = checkSessionManager.getStoredSessions();
        const activeSession = sessions.find(s => s.status === 'active' || !s.isFlowCompleted);
        if (activeSession) {
          currentCheckId = activeSession.checkId;
          console.log('🎯 CheckID récupéré depuis session active:', currentCheckId);
        }
      }

      console.log('🆔 CheckID récupéré:', currentCheckId);
    } catch (e) {
      console.warn('🔧 Impossible de récupérer CheckID:', e);
    }

    // 4. Récupérer les données du parcours depuis le ParcoursManager OU depuis le CheckID
    let parcoursInfo = null;
    let rooms: Array<Record<string, unknown>> = [];

    // 4a. Essayer depuis le CheckID d'abord (prioritaire)
    if (currentCheckId) {
      try {
        console.log('🔍 Tentative de récupération du parcours depuis CheckID:', currentCheckId);
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session?.parcoursInfo) {
          parcoursInfo = session.parcoursInfo;
          currentParcoursId = session.parcoursInfo.id;
          console.log('✅ Parcours récupéré depuis CheckID:', {
            id: parcoursInfo.id,
            name: parcoursInfo.name,
            type: parcoursInfo.type
          });

          // 🎯 RÉCUPÉRER LES ROOMS DEPUIS INDEXEDDB
          if (currentParcoursId) {
            try {
              console.log('🔍 Chargement du parcours depuis IndexedDB:', currentParcoursId);

              // Ouvrir IndexedDB
              const dbRequest = indexedDB.open('parcoursDB', 1);

              await new Promise<void>((resolve, reject) => {
                dbRequest.onsuccess = async (event) => {
                  const db = (event.target as IDBOpenDBRequest).result;
                  const transaction = db.transaction(['parcours'], 'readonly');
                  const store = transaction.objectStore('parcours');
                  const getRequest = store.get(currentParcoursId);

                  getRequest.onsuccess = () => {
                    const parcoursData = getRequest.result;
                    if (parcoursData?.pieces) {
                      rooms = parcoursData.pieces.map((piece: any) => ({
                        id: piece.id,
                        nom: piece.nom,
                        ordre: piece.ordre,
                        tasks: piece.etapes || []
                      }));
                      console.log('✅ Rooms chargées depuis IndexedDB:', rooms.length);
                    }
                    db.close();
                    resolve();
                  };

                  getRequest.onerror = () => {
                    console.warn('⚠️ Erreur lecture IndexedDB');
                    db.close();
                    reject(getRequest.error);
                  };
                };

                dbRequest.onerror = () => {
                  console.warn('⚠️ Erreur ouverture IndexedDB');
                  reject(dbRequest.error);
                };
              });
            } catch (loadError) {
              console.warn('⚠️ Impossible de charger les rooms depuis IndexedDB:', loadError);

              // Fallback: essayer ParcoursManager
              try {
                await parcoursManager.loadParcours(currentParcoursId);
                const loadedParcours = parcoursManager.getCurrentParcours();
                if (loadedParcours) {
                  rooms = Object.values(loadedParcours.adaptedData.roomsData).map(room => room as unknown as Record<string, unknown>);
                  console.log('✅ Rooms chargées depuis ParcoursManager (fallback):', rooms.length);
                }
              } catch (pmError) {
                console.warn('⚠️ Impossible de charger depuis ParcoursManager:', pmError);
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Impossible de récupérer parcours depuis CheckID:', e);
      }
    }

    // 4b. Fallback: essayer depuis ParcoursManager
    if (!parcoursInfo) {
      try {
        const currentParcours = parcoursManager.getCurrentParcours();
        if (currentParcours) {
          parcoursInfo = currentParcours.adaptedData.parcoursInfo;
          rooms = Object.values(currentParcours.adaptedData.roomsData).map(room => room as unknown as Record<string, unknown>);
          console.log('🏠 Données parcours récupérées depuis ParcoursManager:', { parcoursInfo, roomsCount: rooms.length });
        } else if (currentParcoursId) {
          // Essayer de charger le parcours si pas encore chargé
          console.log('🔄 Tentative de chargement du parcours:', currentParcoursId);
          await parcoursManager.loadParcours(currentParcoursId);
          const loadedParcours = parcoursManager.getCurrentParcours();
          if (loadedParcours) {
            parcoursInfo = loadedParcours.adaptedData.parcoursInfo;
            rooms = Object.values(loadedParcours.adaptedData.roomsData).map(room => room as unknown as Record<string, unknown>);
            console.log('🏠 Parcours chargé avec succès:', { parcoursInfo, roomsCount: rooms.length });
          }
        }
      } catch (e) {
        console.warn('🔧 Impossible de récupérer parcours depuis ParcoursManager:', e);

        // Fallback: essayer le cache localStorage
        if (currentParcoursId) {
          try {
            const cacheKey = `parcours_${currentParcoursId}`;
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              parcoursInfo = parsed.parcoursInfo;
              rooms = parsed.rooms || [];
              console.log('🏠 Données parcours depuis cache:', { parcoursInfo, roomsCount: rooms.length });
            }
          } catch (cacheError) {
            console.warn('🔧 Impossible de récupérer parcours depuis cache:', cacheError);
          }
        }
      }
    }
    
    // 5. Récupérer les données de progrès CHECKIN ET CHECKOUT
    let progress = null;
    let checkinData = null;
    let checkoutData = null;
    
    // 5a. Récupérer depuis CheckID si disponible
    if (currentCheckId) {
      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        progress = session?.progress || null;
        console.log('📊 Progrès récupéré depuis CheckID:', progress ? 'Données présentes' : 'Aucune donnée');
      } catch (e) {
        console.warn('🔧 Impossible de récupérer progrès depuis CheckID:', e);
      }
    }
    
    // 5b. Récupérer AUSSI depuis parcoursCache (checkin/checkout séparés)
    if (currentParcoursId) {
      try {
        const { parcoursCache } = await import('@/services/parcoursCache');
        
        // Vérifier les données de CHECKIN
        const hasCheckinProgress = await parcoursCache.hasCheckinProgress(currentParcoursId);
        if (hasCheckinProgress) {
          checkinData = await parcoursCache.getCheckinProgress(currentParcoursId);
          console.log('📥 Données CHECKIN récupérées:', {
            completed: checkinData?.isFlowCompleted,
            photosCount: Object.keys(checkinData?.takenPhotos || {}).length,
            tasksCount: Object.keys(checkinData?.completedTasks || {}).length
          });
        }
        
        // Vérifier les données de CHECKOUT
        const hasCheckoutProgress = await parcoursCache.hasCheckoutProgress(currentParcoursId);
        if (hasCheckoutProgress) {
          checkoutData = await parcoursCache.getCheckoutProgress(currentParcoursId);
          console.log('📤 Données CHECKOUT récupérées:', {
            completed: checkoutData?.isFlowCompleted,
            photosCount: Object.keys(checkoutData?.takenPhotos || {}).length,
            tasksCount: Object.keys(checkoutData?.completedTasks || {}).length
          });
        }
        
      } catch (e) {
        console.warn('🔧 Impossible de récupérer progrès depuis parcoursCache:', e);
      }
    } else {
      console.log('📊 Pas de CheckID ni parcoursId, pas de progrès récupérable');
    }
    
    // 6. Récupérer les images uploadées
    const uploadedImages: Record<string, string> = {};
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('uploaded_image_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.uploadedUrl) {
              const imageId = key.replace('uploaded_image_', '');
              uploadedImages[imageId] = data.uploadedUrl;
            }
          } catch (e) {
            // Ignore les erreurs de parsing
          }
        }
      });
      console.log('📸 Images uploadées récupérées:', Object.keys(uploadedImages).length);
    } catch (e) {
      console.warn('🔧 Impossible de récupérer images uploadées:', e);
    }
    
    // Collecter les données raw pour debug avancé
    const rawData = {
      localStorage: {} as Record<string, unknown>,
      sessionStorage: {} as Record<string, unknown>,
      indexedDBKeys: [] as string[]
    };
    
    // Récupérer localStorage (filtrer les données sensibles)
    try {
      Object.keys(localStorage).forEach(key => {
        // Inclure seulement les clés relatives à l'app
        if (key.includes('parcours') || key.includes('checkid') || key.includes('uploaded') || key.includes('user')) {
          try {
            rawData.localStorage[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch (e) {
            rawData.localStorage[key] = localStorage.getItem(key);
          }
        }
      });
    } catch (e) {
      console.warn('🔧 Impossible de récupérer localStorage');
    }
    
    // Récupérer sessionStorage
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('parcours') || key.includes('checkid')) {
          try {
            rawData.sessionStorage[key] = JSON.parse(sessionStorage.getItem(key) || 'null');
          } catch (e) {
            rawData.sessionStorage[key] = sessionStorage.getItem(key);
          }
        }
      });
    } catch (e) {
      console.warn('🔧 Impossible de récupérer sessionStorage');
    }
    
    // 7. Construire le payload final avec les données collectées
    const payload: DebugPayload = {
      checkId: currentCheckId || undefined,
      userId: (userData?.phone as string) || (userData?.id as string) || 'unknown',
      userType: (userData?.type as 'AGENT' | 'CLIENT' | 'GESTIONNAIRE') || 'AGENT',
      timestamp: new Date().toISOString(),
      
      parcoursInfo: parcoursInfo ? {
        id: currentParcoursId || 'unknown',
        name: (parcoursInfo.name as string) || 'unknown',
        type: (parcoursInfo.type as string) || 'unknown',
        logement: (parcoursInfo.logement as string) || 'unknown',
        takePicture: (parcoursInfo.takePicture as string) || 'unknown'
      } : null,
      
      rooms: rooms.map(room => ({
        id: (room.id as string) || 'unknown',
        nom: (room.nom as string) || 'unknown',
        tasks: ((room.tasks as Array<Record<string, unknown>>) || []).map((task: Record<string, unknown>) => ({
          id: (task.id as string) || 'unknown',
          label: (task.label as string) || 'unknown',
          type: (task.type as string) || 'unknown',
          completed: (task.completed as boolean) || false,
          description: task.description as string
        })),
        photoReferences: room.photoReferences as Record<string, unknown>,
        cleaningInfo: room.cleaningInfo as string,
        roomInfo: room.roomInfo as string
      })),
      
      progress: (progress || checkinData || checkoutData) ? {
        completedTasks: progress?.completedTasks || 0,
        totalTasks: progress?.totalTasks || 0,
        interactions: progress?.interactions,
        photosTaken: progress?.interactions?.photosTaken,
        tasksCompleted: progress?.interactions?.tasksCompleted,
        
        // Inclure les données de checkin si disponibles
        checkinData: checkinData ? {
          isCompleted: checkinData.isFlowCompleted,
          currentPieceId: checkinData.currentPieceId,
          completedTasks: checkinData.completedTasks,
          takenPhotos: checkinData.takenPhotos
        } : undefined,
        
        // Inclure les données de checkout si disponibles
        checkoutData: checkoutData ? {
          isCompleted: checkoutData.isFlowCompleted,
          currentPieceId: checkoutData.currentPieceId,
          completedTasks: checkoutData.completedTasks,
          takenPhotos: checkoutData.takenPhotos
        } : undefined
      } : undefined,
      
      appState: {
        currentUrl: window.location.href,
        flowState: ((window as unknown as Record<string, unknown>).__flowState as Record<string, unknown>) || null,
        hasProgress: (progress?.completedTasks || 0) > 0 || Object.keys(uploadedImages).length > 0,
        uploadedImages
      },
      
      rawData
    };
    
    // 8. Log final du payload collecté
    console.log('🐛 Payload de debug final collecté:', {
      hasUser: !!userData,
      userId: payload.userId,
      userType: payload.userType,
      hasParcoursInfo: !!payload.parcoursInfo,
      parcoursId: payload.parcoursInfo?.id,
      parcoursName: payload.parcoursInfo?.name,
      roomsCount: payload.rooms.length,
      hasProgress: !!payload.progress,
      checkId: payload.checkId,
      totalKeys: Object.keys(rawData.localStorage).length,
      uploadedImagesCount: Object.keys(uploadedImages).length
    });
    
    return payload;
  }
  
  /**
   * 📥 Génère le format spécifique pour le webhook checkin
   */
  private async generateCheckinWebhookFormat(baseData: DebugPayload): Promise<EnrichedAPIPayload | null> {
    try {
      const fullFormat = await this.generateEnrichedAPIFormat();
      if (!fullFormat) return null;
      
      // Retourner seulement les données de checkin
      return {
        ...fullFormat,
        // Forcer le focus sur checkin uniquement
        session: {
          ...fullFormat.session,
          flowType: 'checkin'
        },
        // Garder seulement les données checkin
        checkout: undefined // Supprimer les données checkout
      };
    } catch (error) {
      console.error('❌ Erreur génération format checkin:', error);
      return null;
    }
  }

  /**
   * 📤 Génère le format spécifique pour le webhook checkout
   */
  private async generateCheckoutWebhookFormat(baseData: DebugPayload): Promise<EnrichedAPIPayload | null> {
    try {
      const fullFormat = await this.generateEnrichedAPIFormat();
      if (!fullFormat) return null;
      
      // Retourner seulement les données de checkout
      return {
        ...fullFormat,
        // Forcer le focus sur checkout uniquement
        session: {
          ...fullFormat.session,
          flowType: 'checkout'
        },
        // Garder seulement les données checkout
        checkin: undefined // Supprimer les données checkin
      };
    } catch (error) {
      console.error('❌ Erreur génération format checkout:', error);
      return null;
    }
  }

  /**
   * 🎯 Envoie les données vers le webhook UNIFIÉ (checkin + checkout)
   * @param payload Données à envoyer
   * @param customUrl URL personnalisée (optionnel)
   */
  private async sendToUnifiedWebhook(payload: EnrichedAPIPayload, customUrl?: string): Promise<DebugResult> {
    // 🎯 IMPORTANT: Utiliser l'URL SANS /initialize pour l'envoi final
    // L'URL avec /initialize est pour l'initialisation, pas pour l'envoi final des données
    const UNIFIED_WEBHOOK_URL = customUrl || environment.WEBHOOK_UNIFIED_URL;

    console.log('🎯 URL webhook UNIFIÉ (envoi final SANS /initialize):', UNIFIED_WEBHOOK_URL);

    return this.sendToWebhookEndpoint(payload, UNIFIED_WEBHOOK_URL, 'UNIFIÉ (CHECKIN + CHECKOUT)');
  }

  /**
   * 📥 Envoie les données vers le webhook checkin
   * @deprecated Utiliser sendToUnifiedWebhook() à la place
   */
  private async sendToCheckinWebhook(payload: EnrichedAPIPayload): Promise<DebugResult> {
    return this.sendToWebhookEndpoint(payload, environment.CHECKIN_WEBHOOK_URL, 'CHECKIN');
  }

  /**
   * 📤 Envoie les données vers le webhook checkout
   * @deprecated Utiliser sendToUnifiedWebhook() à la place
   */
  private async sendToCheckoutWebhook(payload: EnrichedAPIPayload): Promise<DebugResult> {
    return this.sendToWebhookEndpoint(payload, environment.CHECKOUT_WEBHOOK_URL, 'CHECKOUT');
  }

  /**
   * 🌐 Méthode générique pour envoyer vers un webhook
   */
  private async sendToWebhookEndpoint(payload: EnrichedAPIPayload, url: string, type: string): Promise<DebugResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      console.log(`🌐 Envoi ${type} vers webhook:`, url);
      
      // ✅ CORRECTION: Gérer les deux formats de payload (ancien et nouveau)
      const isNewFormat = 'webhook_version' in payload;

      console.log(`🎯 Format détecté: ${isNewFormat ? 'NOUVEAU (webhookDataGenerator)' : 'ANCIEN (enriched)'}`);

      // 🔍 DEBUG: Afficher les champs clés du payload
      if (isNewFormat) {
        console.log(`📋 Payload NOUVEAU format:`, {
          webhook_version: (payload as any).webhook_version,
          schema: (payload as any).schema,
          checkID: (payload as any).checkID,
          parcours_id: (payload as any).parcours_id,
          totalPieces: (payload as any).stats?.total_pieces || 0,
          totalPhotos: (payload as any).stats?.total_photos || 0,
          hasCheckin: !!(payload as any).checkin,
          checkinPieces: (payload as any).checkin?.pieces?.length || 0
        });
      }

      console.log(`🎯 Contenu ${type}:`, isNewFormat ? {
        // Nouveau format (WebhookPayload)
        checkID: (payload as any).checkID,
        parcours_id: (payload as any).parcours_id,
        totalPieces: (payload as any).stats?.total_pieces || 0,
        totalPhotos: (payload as any).stats?.total_photos || 0,
        hasCheckinData: !!(payload as any).checkin,
        hasCheckoutData: !!(payload as any).checkout,
        checkinPieces: (payload as any).checkin?.pieces?.length || 0,
        checkoutPieces: (payload as any).checkout?.pieces?.length || 0
      } : {
        // Ancien format (EnrichedAPIPayload)
        parcourID: (payload as any).parcourID,
        parcoursType: (payload as any).parcoursType,
        totalPieces: (payload as any).stats?.totalPieces || 0,
        photosCheckin: (payload as any).stats?.photosCheckin || 0,
        photosCheckout: (payload as any).stats?.photosCheckout || 0,
        hasCheckinData: !!(payload as any).checkin,
        hasCheckoutData: !!(payload as any).checkout,
        checkinPieces: (payload as any).checkin?.pieceResults?.length || 0,
        checkoutPieces: (payload as any).checkout?.pieceResults?.length || 0
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ ${type} envoyé avec succès !`, result);
      
      return {
        success: true,
        debugId: result.debugId || result.id || 'unknown',
        timestamp: new Date().toISOString(),
        payloadType: 'enriched'
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ Timeout webhook ${type}`);
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Timeout webhook ${type} (30s)`
        };
      }
      
      console.error(`❌ Erreur webhook ${type}:`, error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🌐 Envoie les DONNÉES ENRICHIES vers l'endpoint de debug
   */
  private async sendToDebugEndpoint(payload: EnrichedAPIPayload): Promise<DebugResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      console.log('🌐 Envoi FORMAT STRUCTURÉ (CHECKIN/CHECKOUT) vers endpoint debug:', environment.DEBUG_URL);
      
      console.log('🎯 Contenu FORMAT STRUCTURÉ:', {
        parcourID: payload.parcourID,
        parcoursType: payload.parcoursType,
        totalPieces: payload.stats.totalPieces,
        photosCheckin: payload.stats.photosCheckin,
        photosCheckout: payload.stats.photosCheckout,
        hasCheckinData: !!payload.checkin,
        hasCheckoutData: !!payload.checkout,
        checkinPieces: payload.checkin?.pieceResults.length || 0,
        checkoutPieces: payload.checkout?.pieceResults.length || 0,
        signalements: payload.stats.signalementsTotal
      });
      
      const response = await fetch(environment.DEBUG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('✅ DONNÉES CRITIQUES ENRICHIES envoyées avec succès !', result);
      
      return {
        success: true,
        debugId: result.debugId || result.id || 'unknown',
        timestamp: new Date().toISOString(),
        payloadType: 'enriched'
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout de debug dépassé');
      }
      
      throw error;
    }
  }
  
  /**
   * 📋 Génère un résumé lisible du payload pour affichage
   */
  async generatePayloadSummary(payload: DebugPayload): Promise<string> {
    // Générer le format enrichi avec toutes les données critiques
    const enrichedFormat = await this.generateEnrichedAPIFormat(payload);
    
    if (enrichedFormat) {
      return this.generateEnrichedSummary(enrichedFormat);
    }
    
    return 'Impossible de générer les données critiques utilisateur';
  }
  
  /**
   * 📋 Génère le résumé de base
   */
  generateBasicSummary(payload: DebugPayload): string {
    const summary = [
      `🐛 RAPPORT DE DEBUG - ${payload.timestamp}`,
      ``,
      `👤 Utilisateur: ${payload.userType} (ID: ${payload.userId})`,
      `🆔 CheckID: ${payload.checkId || 'Non défini'}`,
      ``,
      `📋 Parcours:`,
      payload.parcoursInfo ? [
        `  - ID: ${payload.parcoursInfo.id}`,
        `  - Nom: ${payload.parcoursInfo.name}`,
        `  - Type: ${payload.parcoursInfo.type}`,
        `  - Logement: ${payload.parcoursInfo.logement}`,
        `  - Mode photo: ${payload.parcoursInfo.takePicture}`,
      ].join('\n') : '  - Aucun parcours défini',
      ``,
      `🏠 Pièces: ${payload.rooms.length}`,
      ...payload.rooms.map(room => 
        `  - ${room.nom} (${room.tasks.length} tâches, ${room.tasks.filter(t => t.completed).length} complétées)`
      ),
      ``,
      `📊 Progrès:`,
      payload.progress ? [
        `  - Tâches: ${payload.progress.completedTasks}/${payload.progress.totalTasks}`,
        `  - Photos prises: ${Object.keys(payload.progress.photosTaken || {}).length}`,
        payload.progress.checkinData ? `  - ✅ CHECKIN: ${payload.progress.checkinData.isCompleted ? 'Terminé' : 'En cours'} (${Object.keys(payload.progress.checkinData.takenPhotos).length} photos)` : '',
        payload.progress.checkoutData ? `  - ✅ CHECKOUT: ${payload.progress.checkoutData.isCompleted ? 'Terminé' : 'En cours'} (${Object.keys(payload.progress.checkoutData.takenPhotos).length} photos)` : ''
      ].filter(Boolean).join('\n') : '  - Aucun progrès enregistré',
      ``,
      `📱 État app:`,
      `  - URL: ${payload.appState.currentUrl}`,
      `  - A du progrès: ${payload.appState.hasProgress ? 'Oui' : 'Non'}`,
      `  - Images uploadées: ${Object.keys(payload.appState.uploadedImages || {}).length}`,
      ``,
      `🗄️ Données raw:`,
      `  - localStorage: ${Object.keys(payload.rawData?.localStorage || {}).length} clés`,
      `  - sessionStorage: ${Object.keys(payload.rawData?.sessionStorage || {}).length} clés`,
    ];
    
    return summary.join('\n');
  }
  
  /**
   * 🏗️ Génère le résumé enrichi format API
   */
  generateEnrichedSummary(enriched: EnrichedAPIPayload): string {
    const summary = [
      `🎯 FORMAT STRUCTURÉ CHECKIN/CHECKOUT - ${enriched.session.timestamp}`,
      ``,
      `📋 Parcours: ${enriched.parcoursName} (${enriched.parcoursType})`,
      `🏠 Logement: ${enriched.logementName}`,
      `👤 Session: ${enriched.session.userType} - ${enriched.session.flowType.toUpperCase()}`,
      ``,
      `📊 STATISTIQUES GLOBALES:`,
      `  - 🏠 Total pièces: ${enriched.stats.totalPieces}`,
      `  - 📥 Photos checkin: ${enriched.stats.photosCheckin}`,
      `  - 📤 Photos checkout: ${enriched.stats.photosCheckout}`,
      `  - ✅ Validations checkin: ${enriched.stats.validationsCheckin}`,
      `  - ✅ Validations checkout: ${enriched.stats.validationsCheckout}`,
      `  - 🚨 Signalements: ${enriched.stats.signalementsTotal}`,
      ``,
      `🏠 PIÈCES:`,
      ...enriched.pieces.map(piece => `  - ${piece.nom} (${piece.pieceID})`),
      ``
    ];

    // 📥 DONNÉES CHECKIN
    if (enriched.checkin) {
      summary.push(`📥 CHECKIN: ${enriched.checkin.completed ? 'TERMINÉ' : 'EN COURS'}`);
      summary.push(`  - Pièces traitées: ${enriched.checkin.pieceResults.length}`);
      
      enriched.checkin.pieceResults.slice(0, 3).forEach(piece => {
        summary.push(`  📍 ${enriched.pieces.find(p => p.pieceID === piece.pieceID)?.nom}:`);
        summary.push(`    • État général: ${piece.validations.etatGeneral ? 'OK' : 'PROBLÈME'}`);
        summary.push(`    • Photos: ${piece.photos.length}`);
        summary.push(`    • Checks: ${piece.checks.filter(c => c.checked).length}/${piece.checks.length}`);
        summary.push(`    • Signalements: ${piece.signalements.length}`);
      });
      
      if (enriched.checkin.pieceResults.length > 3) {
        summary.push(`  ... et ${enriched.checkin.pieceResults.length - 3} autres pièces`);
      }
      summary.push('');
    }

    // 📤 DONNÉES CHECKOUT  
    if (enriched.checkout) {
      summary.push(`📤 CHECKOUT: ${enriched.checkout.completed ? 'TERMINÉ' : 'EN COURS'}`);
      summary.push(`  - Pièces traitées: ${enriched.checkout.pieceResults.length}`);
      
      enriched.checkout.pieceResults.slice(0, 3).forEach(piece => {
        summary.push(`  📍 ${enriched.pieces.find(p => p.pieceID === piece.pieceID)?.nom}:`);
        summary.push(`    • Ménage effectué: ${piece.validations.menageEffectue ? 'OUI' : 'NON'}`);
        summary.push(`    • État final: ${piece.validations.etatFinal ? 'OK' : 'PROBLÈME'}`);
        summary.push(`    • Photos: ${piece.photos.length}`);
        summary.push(`    • Tâches: ${piece.tasks.filter(t => t.completed).length}/${piece.tasks.length}`);
      });
      
      if (enriched.checkout.pieceResults.length > 3) {
        summary.push(`  ... et ${enriched.checkout.pieceResults.length - 3} autres pièces`);
      }
      summary.push('');
    }
    
    return summary.join('\n');
  }
}

// Instance singleton
export const debugService = new DebugService();

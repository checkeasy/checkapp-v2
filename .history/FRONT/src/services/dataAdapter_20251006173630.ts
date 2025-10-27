import { Room, Task, PhotoReference, FlowType } from '@/types/room';
import { Signalement } from '@/types/signalement';

// Interface pour le Data.json réel
interface RealParcours {
  parcourID: string;
  parcoursName: string;
  parcoursType: "Ménage" | "Voyageur";
  logementID: string;
  logementName: string;
  takePicture: "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly";
  piece: RealPiece[];
  signalements?: RealSignalement[];  // ✅ AJOUTÉ - Signalements de l'API
}

interface RealPiece {
  logementID: string;
  pieceID: string;
  nom: string;
  travelerNote?: string;
  cleanerNote?: string;
  infoEntrance?: string;
  etapes: RealEtape[];
}

interface RealEtape {
  etapeID: string;  // ✅ AJOUTÉ - ID unique de l'étape depuis l'API
  pieceID: string;
  image?: string;
  isTodo: boolean;
  todoParam?: string;
  todoTitle?: string;
  todoOrder?: string;
  todoImage?: string;
}

// ✅ NOUVEAU - Interface pour les signalements de l'API
interface RealSignalement {
  signalementID: string;
  pieceID: string;
  photo?: string;
  commentaire: string;
  commentaireTraitement?: string;
}

/**
 * Service d'adaptation du Data.json vers le format existant
 */
export class DataAdapter {
  
  /**
   * Convertit le Data.json en format compatible avec l'UX existante
   */
  static adaptRealDataToExistingFormat(realData: RealParcours, forceFlowType?: FlowType): {
    roomsData: Record<string, Room>;
    flowType: FlowType;
  } {
    const roomsData: Record<string, Room> = {};
    
    // Détermine le type de flux - utilise le forçage si fourni, sinon basé sur le parcours
    const flowType: FlowType = forceFlowType || (realData.parcoursType === 'Ménage' ? 'checkout' : 'checkin');
    
    console.log('🔄 Mode déterminé:', { 
      forceFlowType, 
      parcoursType: realData.parcoursType, 
      finalFlowType: flowType 
    });
    
    // Convertit chaque pièce
    realData.piece.forEach((realPiece, index) => {
      const adaptedRoom = this.adaptPieceToRoom(realPiece, index + 1);
      if (adaptedRoom) {
        roomsData[adaptedRoom.id] = adaptedRoom;
      }
    });

    console.log('🔑 IDs de pièces générés:', Object.keys(roomsData));
    return { roomsData, flowType };
  }

  /**
   * Convertit une pièce réelle en Room compatible
   */
  private static adaptPieceToRoom(realPiece: RealPiece, ordre: number): Room | null {
    // Utilise directement le pieceID du Data.json
    const id = realPiece.pieceID;

    // 🎯 DEBUG: Log détaillé des données de la pièce
    console.log(`🏠 Pièce "${realPiece.nom}" → ID: "${id}"`, {
      travelerNote: realPiece.travelerNote,
      cleanerNote: realPiece.cleanerNote,
      infoEntrance: realPiece.infoEntrance,
      hasTravelerNote: !!realPiece.travelerNote,
      hasCleanerNote: !!realPiece.cleanerNote,
      hasInfoEntrance: !!realPiece.infoEntrance
    });

    // Sépare les étapes TODO et PHOTO
    const todoEtapes = realPiece.etapes.filter(e => e.isTodo);
    const photoEtapes = realPiece.etapes.filter(e => !e.isTodo);

    // Crée les références photos
    const photoReferences = this.createPhotoReferences(photoEtapes, todoEtapes);

    // 🎯 FIX: INVERSION - Dans l'API, travelerNote contient les instructions de ménage et cleanerNote est vide
    // Donc on inverse le mapping pour afficher les bonnes infos dans les bons onglets
    const cleaningInfo = realPiece.travelerNote || `Instructions de nettoyage pour ${this.cleanRoomName(realPiece.nom)}`;
    const roomInfo = realPiece.infoEntrance || realPiece.cleanerNote || `Informations pour ${this.cleanRoomName(realPiece.nom)}`;

    console.log(`✅ Pièce adaptée "${realPiece.nom}":`, {
      roomInfo: roomInfo.substring(0, 50) + '...',
      cleaningInfo: cleaningInfo.substring(0, 50) + '...',
      hasTravelerNote: !!realPiece.travelerNote,
      hasCleanerNote: !!realPiece.cleanerNote,
      hasInfoEntrance: !!realPiece.infoEntrance
    });

    return {
      id,
      nom: this.cleanRoomName(realPiece.nom),
      ordre,
      roomInfo,
      cleaningInfo,
      // 🎯 CORRECTION: Préserver les champs originaux de l'API
      travelerNote: realPiece.travelerNote,
      cleanerNote: realPiece.cleanerNote,
      infoEntrance: realPiece.infoEntrance,
      photoReferences
    };
  }

  /**
   * Génère un ID de pièce simple et cohérent avec le flow
   */
  private static generateRoomId(nom: string): string {
    const cleanName = nom
      .toLowerCase()
      .replace(/[🛏️🚿🍽️🛋️🚽🏠]/g, '') // Supprime les emojis
      .trim();
    
    // Mapping vers des IDs cohérents avec le FLOW_SEQUENCE
    if (cleanName.includes('chambre')) {
      if (cleanName.includes('1') || cleanName.includes('domino')) return 'chambre-1';
      if (cleanName.includes('2') || cleanName.includes('tempo')) return 'chambre-2';
      if (cleanName.includes('3') || cleanName.includes('ratio')) return 'chambre-3';
      if (cleanName.includes('4') || cleanName.includes('ego')) return 'chambre-4';
      return 'chambre';
    }
    
    if (cleanName.includes('cuisine')) return 'cuisine';
    if (cleanName.includes('salon')) return 'salon';
    if (cleanName.includes('salle d\'eau') || cleanName.includes('salle d eau')) {
      if (cleanName.includes('chambres vertes')) return 'salle-eau-vertes';
      if (cleanName.includes('domino')) return 'salle-eau-domino';
      if (cleanName.includes('ego')) return 'salle-eau-ego';
      return 'salle-eau';
    }
    if (cleanName.includes('toilettes')) {
      if (cleanName.includes('rdc')) return 'toilettes-rdc';
      if (cleanName.includes('etage')) return 'toilettes-etage';
      return 'toilettes';
    }
    if (cleanName.includes('ensemble du logement')) return 'ensemble-logement';
    if (cleanName.includes('terrasse')) return 'terrasse';
    if (cleanName.includes('buanderie')) return 'buanderie';
    if (cleanName.includes('salle de reunion')) return 'salle-reunion';
    
    // Fallback générique
    return cleanName
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30) || 'piece';
  }

  /**
   * Nettoie le nom de la pièce
   */
  private static cleanRoomName(nom: string): string {
    return nom.replace(/[🛏️🚿🍽️🛋️🚽🏠]\s*/g, '').trim();
  }

  /**
   * Crée les références photos pour checkin/checkout
   */
  private static createPhotoReferences(
    photoEtapes: RealEtape[], 
    todoEtapes: RealEtape[]
  ): Room['photoReferences'] {
    const photoReferences: Room['photoReferences'] = {};

    // Photos de référence (étapes avec isTodo: false)
    if (photoEtapes.length > 0) {
      const checkinPhotos: PhotoReference[] = photoEtapes.map((etape, index) => ({
        tache_id: etape.etapeID,  // ✅ CORRECTION: Utiliser etapeID
        etapeID: etape.etapeID,   // ✅ AJOUTÉ
        url: etape.image || '/placeholder-image.jpg',
        expected_orientation: index % 2 === 0 ? 'paysage' : 'portrait',
        overlay_enabled: true,
        isTodo: false  // ✅ AJOUTÉ: Photos de référence ne sont pas des TODO
      }));

      photoReferences.checkin = checkinPhotos;
      photoReferences.checkout = checkinPhotos; // Réutilise les mêmes pour checkout
    }

    // Photos de validation des tâches (étapes avec todoImage)
    const taskPhotos = todoEtapes
      .filter(etape => etape.todoImage)
      .map((etape, index) => ({
        tache_id: etape.etapeID,  // ✅ CORRECTION: Utiliser etapeID
        etapeID: etape.etapeID,   // ✅ AJOUTÉ
        url: etape.todoImage || '/placeholder-image.jpg',
        expected_orientation: 'paysage' as const,
        overlay_enabled: true,
        isTodo: true,  // ✅ AJOUTÉ: Photos de validation TODO
        todoTitle: etape.todoTitle  // ✅ AJOUTÉ: Titre de la tâche
      }));

    if (taskPhotos.length > 0) {
      if (!photoReferences.checkout) photoReferences.checkout = [];
      photoReferences.checkout.push(...taskPhotos);
    }

    return photoReferences;
  }

  /**
   * Génère les tâches pour une pièce selon le type de flux
   */
  static generateTasksFromRealData(
    realPiece: RealPiece, 
    flowType: FlowType
  ): Task[] {
    const tasks: Task[] = [];
    const todoEtapes = realPiece.etapes.filter(e => e.isTodo);
    const photoEtapes = realPiece.etapes.filter(e => !e.isTodo);

    console.log(`📋 Pièce ${realPiece.nom}:`, {
      totalEtapes: realPiece.etapes.length,
      todoEtapes: todoEtapes.length,
      photoEtapes: photoEtapes.length
    });

    // 1. D'ABORD : Créer une tâche spéciale pour les photos de référence (isTodo=false)
    if (photoEtapes.length > 0) {
      const referencePhotoTask = this.createReferencePhotoTask(
        photoEtapes, 
        realPiece.pieceID, 
        0 // Toujours en premier
      );
      if (referencePhotoTask) {
        tasks.push(referencePhotoTask);
        console.log(`📸 Tâche photos de référence créée: ${photoEtapes.length} images`);
      }
    }

    // 2. ENSUITE : Ajouter les tâches de vérification SEULEMENT en mode checkout
    if (flowType === 'checkout') {
      todoEtapes.forEach((etape, index) => {
        const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
        if (task) {
          tasks.push(task);
          console.log(`✅ Tâche todo créée (checkout): ${task.label}`);
        }
      });
    } else {
      console.log(`⏭️ Mode checkin: ignorer les ${todoEtapes.length} tâches détaillées (isTodo=true)`);
    }

    console.log(`📋 Total tâches créées pour ${realPiece.nom} (mode ${flowType}):`, tasks.length);
    return tasks;
  }

  /**
   * Crée une tâche à partir d'une étape TODO
   */
  private static createTaskFromEtape(
    etape: RealEtape,
    pieceId: string,
    index: number
  ): Task | null {
    const title = etape.todoTitle || etape.todoOrder;
    if (!title) return null;

    // ✅ CORRECTION: Utiliser directement l'etapeID de l'API au lieu de générer un slug
    const taskId = etape.etapeID;

    return {
      id: taskId,
      etapeID: etape.etapeID,  // ✅ AJOUTÉ: Stocker aussi dans un champ dédié
      piece_id: pieceId,
      ordre: index + 1,
      type: etape.todoImage ? 'photo_required' : 'checkbox',
      label: title.trim(),
      description: etape.todoOrder?.trim(),
      completed: false,
      ...(etape.todoImage && {
        photo_reference: {
          tache_id: etape.etapeID,  // ✅ CORRECTION: Utiliser etapeID au lieu de taskId généré
          etapeID: etape.etapeID,   // ✅ AJOUTÉ
          url: etape.todoImage.startsWith('//') ? 'https:' + etape.todoImage : etape.todoImage,
          expected_orientation: 'paysage',
          overlay_enabled: true
        }
      })
    };
  }

  /**
   * Crée une tâche spéciale pour les photos de référence (isTodo=false)
   */
  private static createReferencePhotoTask(
    photoEtapes: RealEtape[],
    pieceId: string,
    ordre: number
  ): Task | null {
    if (photoEtapes.length === 0) return null;

    // ✅ CORRECTION: Utiliser le premier etapeID pour la tâche photo
    const firstPhotoEtapeId = photoEtapes[0]?.etapeID || `reference-photos-${pieceId}`;

    const photoReferences: PhotoReference[] = photoEtapes.map((etape, index) => {
      // Corriger les URLs qui commencent par //
      let imageUrl = etape.image || '/placeholder-image.jpg';
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      console.log(`📸 Création photo référence ${index + 1}/${photoEtapes.length}:`, {
        etapeID: etape.etapeID,  // ✅ AJOUTÉ
        originalUrl: etape.image,
        correctedUrl: imageUrl,
        hasImage: !!etape.image
      });

      return {
        tache_id: etape.etapeID,  // ✅ CORRECTION: Utiliser etapeID au lieu de générer un ID
        etapeID: etape.etapeID,   // ✅ AJOUTÉ
        url: imageUrl,
        expected_orientation: index % 2 === 0 ? 'paysage' : 'portrait',
        overlay_enabled: true
      };
    });

    const referenceTask = {
      id: firstPhotoEtapeId,  // ✅ CORRECTION: Utiliser le premier etapeID
      etapeID: firstPhotoEtapeId,  // ✅ AJOUTÉ
      piece_id: pieceId,
      ordre: ordre + 1,
      type: 'reference_photos' as const,
      label: `📸 Photos de référence (${photoEtapes.length})`,
      description: `Consultez les ${photoEtapes.length} photo${photoEtapes.length > 1 ? 's' : ''} de référence pour cette pièce`,
      completed: false,
      total_photos_required: 0, // Pas de photos à prendre, juste à consulter
      photos_done: 0,
      photo_references: photoReferences
    };

    console.log('📋 Tâche photos de référence créée:', {
      id: referenceTask.id,
      etapeID: referenceTask.etapeID,  // ✅ AJOUTÉ
      type: referenceTask.type,
      photoCount: photoReferences.length,
      urls: photoReferences.map(ref => ref.url)
    });

    return referenceTask;
  }

  /**
   * Crée une tâche photo à partir des étapes photo
   */
  private static createPhotoTaskFromEtapes(
    photoEtapes: RealEtape[],
    pieceId: string,
    flowType: FlowType,
    ordre: number
  ): Task | null {
    if (photoEtapes.length === 0) return null;

    // ✅ CORRECTION: Utiliser le premier etapeID pour la tâche photo
    const firstPhotoEtapeId = photoEtapes[0]?.etapeID || `photos-${pieceId}`;

    const photoReferences: PhotoReference[] = photoEtapes.map((etape, index) => {
      // Corriger les URLs qui commencent par //
      let imageUrl = etape.image || '/placeholder-image.jpg';
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      console.log(`📸 Création photo référence ${index + 1}/${photoEtapes.length}:`, {
        etapeID: etape.etapeID,  // ✅ AJOUTÉ
        originalUrl: etape.image,
        correctedUrl: imageUrl,
        hasImage: !!etape.image
      });

      return {
        tache_id: etape.etapeID,  // ✅ CORRECTION: Utiliser etapeID au lieu de générer un ID
        etapeID: etape.etapeID,   // ✅ AJOUTÉ
        url: imageUrl,
        expected_orientation: index % 2 === 0 ? 'paysage' : 'portrait',
        overlay_enabled: true
      };
    });

    const taskType = photoEtapes.length === 1 ? 'photo_optional' : 'photo_multiple';
    const label = flowType === 'checkin'
      ? `📸 Photos d'état d'entrée`
      : `📸 Photos finales`;

    const photoTask = {
      id: firstPhotoEtapeId,  // ✅ CORRECTION: Utiliser le premier etapeID
      etapeID: firstPhotoEtapeId,  // ✅ AJOUTÉ
      piece_id: pieceId,
      ordre: ordre + 1,
      type: taskType,
      label,
      description: `Prendre ${photoEtapes.length} photo${photoEtapes.length > 1 ? 's' : ''} de référence`,
      completed: false,
      total_photos_required: photoEtapes.length,
      photos_done: 0,
      photo_references: photoReferences
    };

    console.log('📋 Tâche photo créée:', {
      id: photoTask.id,
      etapeID: photoTask.etapeID,  // ✅ AJOUTÉ
      type: taskType,
      photoCount: photoReferences.length,
      urls: photoReferences.map(ref => ref.url)
    });

    return photoTask;
  }

  /**
   * Génère un ID de tâche
   */
  private static generateTaskId(etape: RealEtape, index: number): string {
    const title = etape.todoTitle || etape.todoOrder || `task-${index}`;
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30)
      .replace(/-+$/, '') || `task-${index}`;
  }

  /**
   * Fonction principale d'adaptation complète
   */
  static adaptCompleteData(realData: RealParcours, forceFlowType?: FlowType) {
    console.log('🔄 Début adaptation complète des données:', { 
      parcourID: realData?.parcourID, 
      piecesCount: realData?.piece?.length || 0 
    });
    
    if (!realData) {
      throw new Error('rawData est null ou undefined');
    }
    
    if (!realData.piece || !Array.isArray(realData.piece)) {
      console.error('❌ Erreur: realData.piece n\'est pas un tableau valide:', realData.piece);
      throw new Error('Format de données invalide: piece n\'est pas un tableau');
    }
    
    const { roomsData, flowType } = this.adaptRealDataToExistingFormat(realData, forceFlowType);
    
    // Génère les tâches pour chaque pièce
    const roomsWithTasks = Object.keys(roomsData).reduce((acc, roomId) => {
      const room = roomsData[roomId];
      const realPiece = realData.piece.find(p => 
        p.pieceID === roomId
      );
      
      if (realPiece) {
        const tasks = this.generateTasksFromRealData(realPiece, flowType);
        acc[roomId] = { ...room, tasks };
      }
      
      return acc;
    }, {} as Record<string, Room & { tasks: Task[] }>);

    return {
      roomsData: roomsWithTasks,
      flowType,
      parcoursInfo: {
        name: realData.parcoursName,
        type: realData.parcoursType,
        logement: realData.logementName,
        takePicture: realData.takePicture
      }
    };
  }
}

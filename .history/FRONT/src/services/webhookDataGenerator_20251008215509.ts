/**
 * 🎯 MODULE DE GÉNÉRATION DES DONNÉES WEBHOOK
 *
 * Ce module contient la logique EXACTE de transformation des données
 * utilisée dans database-admin.html, pour garantir que les webhooks
 * envoyés automatiquement depuis l'app ont le même format.
 *
 * ⚠️ IMPORTANT: Ce fichier doit rester synchronisé avec la logique
 * de database-admin.html (fonction generateWebhookData)
 */

/**
 * 🔒 Fonction utilitaire pour séparer correctement URL et Base64
 * Garantit qu'une URL ne finit JAMAIS dans le champ photo_base64
 */
function separateUrlAndBase64(value: string | null | undefined): { url: string; base64: string } {
  // Si vide ou null, retourner des chaînes vides
  if (!value || value.trim() === '') {
    return { url: '', base64: '' };
  }

  const trimmedValue = value.trim();

  // ✅ PRIORITÉ 1: Vérifier si c'est une URL (http:// ou https://)
  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return { url: trimmedValue, base64: '' };
  }

  // ✅ PRIORITÉ 2: Vérifier si c'est une base64 (data:image)
  if (trimmedValue.startsWith('data:image')) {
    return { url: '', base64: trimmedValue };
  }

  // ⚠️ FALLBACK: Si ce n'est ni une URL ni une base64, considérer comme vide
  console.warn('⚠️ Valeur photo non reconnue (ni URL ni base64):', trimmedValue.substring(0, 50));
  return { url: '', base64: '' };
}

export interface WebhookPayload {
  webhook_version: string;
  schema: string;
  checkID: string;
  parcours_id: string | null;
  logement_id: string | null;
  logement_name: string | null;
  agent: {
    id: string | null;
    firstname: string | null;
    lastname: string | null;
    phone: string | null;
    type: string;
    type_label: string;
    verification_status: string | null;
  };
  parcours: {
    id: string | null;
    name: string | null;
    type: string;
    start_time: string;
    current_time: string;
    duration_minutes: number;
    completion_percentage: number;
    total_pieces: number;
    completed_pieces: number;
    pieces_with_issues: number;
  };
  checkin: {
    pieces: any[];
    stats: any;
    timestamp: string;
  } | null;
  checkout: any | null;
  signalements: any[];
  exit_questions: any[];
  taches: Record<string, any>;
  progression: Record<string, any>;
  stats: {
    total_pieces: number;
    total_photos: number;
    total_signalements: number;
    total_exit_questions: number;
    completion_rate: number;
  };
}

export interface SessionData {
  progress?: {
    interactions?: {
      buttonClicks?: Record<string, any[]>;
      photosTaken?: Record<string, any[]>;
      checkboxStates?: Record<string, any>;
      signalements?: Record<string, any>;
      pieceStates?: Record<string, any>;
    };
    pieceStates?: Record<string, any>;
  };
  parcoursData?: {
    piece?: any[];
  };
  parcoursInfo?: {
    id: string;
    name: string;
    type: string;
    logement?: string;
  };
  userInfo?: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    type?: string;
  };
  startTime?: string;
  checkinTimestamp?: string;
}

/**
 * 🎯 Génère les données du webhook au format unifié
 * Cette fonction reproduit EXACTEMENT la logique de database-admin.html
 */
export async function generateUnifiedWebhookData(
  sessionData: SessionData,
  checkId: string
): Promise<WebhookPayload> {
  console.log('🚀 Génération webhook UNIFIÉ - Structure optimisée et lisible');

  if (!sessionData) {
    throw new Error('sessionData est requis pour générer le webhook');
  }

  // Extraire les informations de base (communes)
  const userVerificationData = extractUserVerificationData(sessionData);
  const parcoursLogementInfo = extractParcoursLogementInfo(sessionData);

  // ✅ EXTRAIRE TOUTES LES PIÈCES SANS FILTRAGE (type='unified' pour tout inclure)
  const allPieces = await extractPiecesNewFormat(sessionData, 'unified');
  console.log('📦 TOUTES les pièces extraites:', allPieces.length, 'pièces');

  // 🔍 DEBUG: Afficher les flowTypes de toutes les étapes
  console.log('🔍 DEBUG: Analyse des flowTypes dans allPieces:');
  allPieces.forEach((piece: any, idx: number) => {
    console.log(`  Pièce ${idx} (${piece.nom}): ${piece.etapes.length} étapes`);
    const flowTypeCounts: Record<string, number> = {};
    piece.etapes.forEach((etape: any) => {
      const ft = etape.etape_type || 'undefined';
      flowTypeCounts[ft] = (flowTypeCounts[ft] || 0) + 1;
    });
    console.log(`    FlowTypes:`, flowTypeCounts);
  });

  // ✅ NOUVEAU: Tout mettre dans checkin (pas de séparation)
  const piecesCheckin = allPieces.filter((piece: any) => piece.etapes.length > 0);

  console.log('📥 TOUTES les pièces dans CHECKIN:', piecesCheckin.length, 'pièces,',
    piecesCheckin.reduce((sum: number, p: any) => sum + p.etapes.length, 0), 'étapes');

  const statsCheckin = calculateGlobalStats(piecesCheckin);

  // Extraire les signalements (tous)
  const allSignalements = extractAllSignalements(sessionData);

  // Extraire les questions de sortie
  const exitQuestions = await extractExitQuestions(sessionData);

  // 🎯 DÉTERMINER SI ON A DES DONNÉES
  const hasCheckinData = piecesCheckin.some((p: any) => p.etapes && p.etapes.length > 0);

  console.log('🎯 Données disponibles:', {
    hasCheckinData,
    checkinPieces: piecesCheckin.length,
    checkinEtapes: piecesCheckin.reduce((sum: number, p: any) => sum + (p.etapes?.length || 0), 0),
    exitQuestions: exitQuestions.length,
    signalements: allSignalements.length
  });

  // 📦 STRUCTURE SIMPLIFIÉE - TOUT DANS CHECKIN
  const payload: WebhookPayload = {
    // 🆔 VERSION
    webhook_version: "2.0",
    schema: "unified_all_in_checkin",

    // 🆔 IDENTIFIANTS
    checkID: checkId,
    parcours_id: parcoursLogementInfo.parcours_id || null,
    logement_id: parcoursLogementInfo.logement_id || null,
    logement_name: parcoursLogementInfo.logement_name || null,

    // 👤 AGENT
    agent: {
      id: userVerificationData.user_info?.phone || null,
      firstname: userVerificationData.user_info?.firstName || null,
      lastname: userVerificationData.user_info?.lastName || null,
      phone: userVerificationData.user_info?.phone || null,
      type: userVerificationData.user_info?.type || "CLIENT",
      type_label: userVerificationData.user_info?.type === 'CLIENT' ? 'Voyageur' : 'Agent',
      verification_status: userVerificationData.verification_status || null
    },

    // 📊 PARCOURS
    parcours: {
      id: parcoursLogementInfo.parcours_id || null,
      name: parcoursLogementInfo.parcours_name || null,
      type: "🏠 Contrôle logement",
      start_time: sessionData.startTime || new Date().toISOString(),
      current_time: new Date().toISOString(),
      duration_minutes: 0,
      completion_percentage: Math.round(statsCheckin.completion_rate || 0),
      total_pieces: piecesCheckin.length,
      completed_pieces: 0,
      pieces_with_issues: allSignalements.length
    },

    // 📥 CHECKIN - CONTIENT TOUTES LES DONNÉES (checkin + checkout)
    checkin: hasCheckinData ? {
      pieces: piecesCheckin.map((piece: any) => formatPieceForWebhook(piece, 'unified')),
      stats: statsCheckin,
      timestamp: sessionData.checkinTimestamp || sessionData.startTime || new Date().toISOString()
    } : null,

    // 📤 CHECKOUT - VIDE (toutes les données sont dans checkin)
    checkout: null,

    // 🚨 SIGNALEMENTS (tous)
    signalements: allSignalements,

    // 🎯 QUESTIONS DE SORTIE
    exit_questions: exitQuestions,

    // 📋 TÂCHES - VIDE (simplification)
    taches: {},

    // 📊 PROGRESSION - VIDE (simplification)
    progression: {},

    // 📊 STATS GLOBALES
    stats: {
      total_pieces: piecesCheckin.length,
      total_photos: statsCheckin.total_photos,
      total_signalements: allSignalements.length,
      total_exit_questions: exitQuestions.length,
      completion_rate: Math.round(statsCheckin.completion_rate || 0)
    }
  };

  return payload;
}

/**
 * 📊 Calculer les statistiques globales
 */
function calculateGlobalStats(pieces: any[]) {
  let total_photos = 0;
  let total_tasks = 0;
  let completed_tasks = 0;

  pieces.forEach((piece: any) => {
    piece.etapes.forEach((etape: any) => {
      total_tasks++;
      if (etape.status === 'completed' || etape.status === 'validated') {
        completed_tasks++;
      }
      if (etape.type === 'photo_taken') {
        total_photos++;
      }
    });
  });

  return {
    total_pieces: pieces.length,
    total_photos,
    total_tasks,
    completed_tasks,
    completion_rate: total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0
  };
}

/**
 * 🏠 Formater une pièce pour le webhook
 */
function formatPieceForWebhook(piece: any, flowType: string) {
  return {
    piece_id: piece.id,
    nom: piece.nom,
    status: piece.etat_utilisateur || 'non_defini',

    // 📋 Étapes complètes avec toutes les données utilisateur
    etapes: piece.etapes.map((etape: any) => {
      // 🔒 SÉCURITÉ: Séparer correctement URL et Base64 pour les photos
      let photoUrl = '';
      let photoBase64 = '';
      if (etape.type === 'photo_taken') {
        // Vérifier d'abord photo_url, puis photo_base64
        const photoValue = etape.photo_url || etape.photo_base64 || '';
        const separated = separateUrlAndBase64(photoValue);
        photoUrl = separated.url;
        photoBase64 = separated.base64;
      }

      return {
        etape_id: etape.etape_id,
        type: etape.type,
        etape_type: etape.etape_type || flowType,
        status: etape.status,
        timestamp: etape.timestamp,
        is_todo: etape.is_todo || false,
        todo_title: etape.todo_title || '',

        // 📷 Données photos (si type = photo_taken)
        ...(etape.type === 'photo_taken' && {
          photo_id: etape.photo_id,
          photo_url: photoUrl,
          photo_base64: photoBase64,
          validated: etape.validated,
          retake_count: etape.retake_count || 0
        }),

      // 🔘 Données boutons (si type = button_click)
      ...(etape.type === 'button_click' && {
        action: etape.action_type,
        comment: etape.comment || '',
        photos_attached: etape.photos_attached || []
      }),

      // 🚨 Données signalement (si type = signalement)
      ...(etape.type === 'signalement' && {
        comment: etape.comment || '',
        severity: etape.severity || 'normal',
        photos: etape.photos || []
      })
      };
    })

    // ❌ SUPPRIMÉ: signalements[] par pièce (pour éviter duplication)
    // Les signalements sont maintenant UNIQUEMENT dans signalements[] global
  };
}

/**
 * 👤 Extraire les données utilisateur
 */
function extractUserVerificationData(sessionData: SessionData) {
  console.log('👤 Extraction des données utilisateur depuis:', sessionData);

  const userVerificationData = {
    user_info: null as any,
    connexion_info: null as any,
    verification_status: 'non_verifie'
  };

  if (!sessionData) {
    console.warn('⚠️ sessionData undefined');
    return userVerificationData;
  }

  // Essayer de récupérer depuis sessionData.userInfo
  if (sessionData.userInfo) {
    userVerificationData.user_info = {
      phone: sessionData.userInfo.phone || null,
      firstName: sessionData.userInfo.firstName || null,
      lastName: sessionData.userInfo.lastName || null,
      type: sessionData.userInfo.type || 'CLIENT'
    };
    userVerificationData.verification_status = 'verifie_session';
    console.log('✅ Données utilisateur trouvées dans sessionData.userInfo');
  }

  return userVerificationData;
}

/**
 * 🏠 Extraire les informations parcours/logement
 * Cette fonction reproduit EXACTEMENT la logique de database-admin.html (lignes 4330-4430)
 */
function extractParcoursLogementInfo(sessionData: SessionData) {
  console.log('🏠 Extraction parcours/logement depuis:', sessionData);

  const parcoursLogementInfo = {
    parcours_id: null as string | null,
    parcours_name: null as string | null,
    logement_id: null as string | null,
    logement_name: null as string | null,
    extraction_source: 'non_trouve'
  };

  if (!sessionData) {
    console.warn('⚠️ sessionData est undefined, retour de données par défaut');
    return parcoursLogementInfo;
  }

  // 🎯 MÉTHODE 1: Depuis sessionData.parcoursInfo (structure principale)
  if (sessionData.parcoursInfo) {
    console.log('✅ parcoursInfo trouvé dans sessionData:', sessionData.parcoursInfo);
    parcoursLogementInfo.parcours_id = (sessionData.parcoursInfo as any).id || (sessionData as any).parcoursId || null;
    parcoursLogementInfo.parcours_name = (sessionData.parcoursInfo as any).name || null;
    parcoursLogementInfo.logement_id = (sessionData.parcoursInfo as any).logement_id || (sessionData as any).logement_id || null;
    parcoursLogementInfo.logement_name = (sessionData.parcoursInfo as any).logement || null;
    parcoursLogementInfo.extraction_source = 'session_parcoursInfo';
  }

  // 🎯 MÉTHODE 2: Depuis les propriétés directes de session
  if (!parcoursLogementInfo.parcours_id && (sessionData as any).parcoursId) {
    parcoursLogementInfo.parcours_id = (sessionData as any).parcoursId;
    parcoursLogementInfo.extraction_source = 'session_direct';
  }

  if (!parcoursLogementInfo.logement_id && (sessionData as any).logement_id) {
    parcoursLogementInfo.logement_id = (sessionData as any).logement_id;
    if (!parcoursLogementInfo.extraction_source.includes('session')) {
      parcoursLogementInfo.extraction_source = 'session_direct';
    }
  }

  // 🎯 MÉTHODE 3: Depuis l'URL actuelle (si elle contient les paramètres)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursFromUrl = urlParams.get('parcours');

    if (!parcoursLogementInfo.parcours_id && parcoursFromUrl) {
      parcoursLogementInfo.parcours_id = parcoursFromUrl;
      parcoursLogementInfo.extraction_source = 'url_params';
      console.log('🔗 Parcours ID récupéré depuis URL:', parcoursFromUrl);
    }
  } catch (e) {
    console.warn('⚠️ Erreur lecture URL params:', e);
  }

  // 🎯 MÉTHODE 4: Depuis les contextes globaux React (si accessibles via localStorage)
  try {
    const globalParcoursData = localStorage.getItem('current-parcours');
    if (!parcoursLogementInfo.parcours_id && globalParcoursData) {
      const parsed = JSON.parse(globalParcoursData);
      if (parsed.id) {
        parcoursLogementInfo.parcours_id = parsed.id;
        parcoursLogementInfo.parcours_name = parsed.name || parsed.parcoursName || null;
        parcoursLogementInfo.logement_name = parsed.logement || parsed.logementName || null;
        parcoursLogementInfo.extraction_source = 'global_parcours';
        console.log('🌐 Données parcours depuis global storage:', parsed);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur lecture global parcours:', e);
  }

  // 🎯 MÉTHODE 5: Depuis le cache parcours localStorage (recherche dans toutes les clés)
  try {
    Object.keys(localStorage).forEach(key => {
      if ((key.includes('parcours') || key.includes('logement')) &&
        !parcoursLogementInfo.parcours_id) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.id && !parcoursLogementInfo.parcours_id) {
            parcoursLogementInfo.parcours_id = data.id;
            parcoursLogementInfo.parcours_name = data.name || data.parcoursName || null;
            parcoursLogementInfo.logement_name = data.logement || data.logementName || null;
            parcoursLogementInfo.extraction_source = `localStorage_${key}`;
            console.log(`🔑 Données récupérées depuis ${key}:`, data);
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    });
  } catch (e) {
    console.warn('⚠️ Erreur recherche localStorage:', e);
  }

  console.log('📊 Résultat extraction parcours/logement:', parcoursLogementInfo);
  return parcoursLogementInfo;
}

/**
 * 🚨 Extraire tous les signalements
 */
function extractAllSignalements(sessionData: SessionData): any[] {
  const signalements: any[] = [];

  if (!sessionData?.progress?.interactions?.signalements) {
    return signalements;
  }

  Object.entries(sessionData.progress.interactions.signalements).forEach(([key, data]: [string, any]) => {
    // 🔒 SÉCURITÉ: Séparer correctement URL et Base64
    const photoValue = data.photoUrl || data.photoBase64 || '';
    const separated = separateUrlAndBase64(photoValue);

    signalements.push({
      id: key,
      description: data.description || 'Signalement',
      comment: data.comment || '',
      photo_url: separated.url,
      photo_base64: separated.base64,
      timestamp: data.timestamp || new Date().toISOString()
    });
  });

  return signalements;
}

/**
 * 🎯 Extraire les questions de sortie
 */
async function extractExitQuestions(sessionData: SessionData): Promise<any[]> {
  const exitQuestions: any[] = [];

  // Essayer de récupérer depuis sessionData.progress.interactions.exitQuestions
  if (sessionData?.progress?.interactions && 'exitQuestions' in sessionData.progress.interactions) {
    const exitQuestionsData = (sessionData.progress.interactions as any).exitQuestions;
    if (exitQuestionsData && typeof exitQuestionsData === 'object') {
      Object.entries(exitQuestionsData).forEach(([questionId, response]: [string, any]) => {
        exitQuestions.push({
          question_id: questionId,
          response: response.response || null,
          has_image: response.hasImage || false,
          image_url: response.imageUrl || null,
          timestamp: response.timestamp || new Date().toISOString()
        });
      });
    }
  }

  return exitQuestions;
}

/**
 * 🏠 Extraire les pièces avec leurs étapes
 * Cette fonction reproduit EXACTEMENT la logique de extractPiecesNewFormat de database-admin.html
 */
async function extractPiecesNewFormat(sessionData: SessionData, type: string): Promise<any[]> {
  const pieces: any[] = [];

  if (!sessionData) {
    console.warn('⚠️ Pas de sessionData, retour de pièces vides');
    return pieces;
  }

  console.log('🔍 EXTRACTION VRAIES DONNÉES - sessionData:', sessionData);

  // Extraire les vraies interactions utilisateur
  const roomStates = extractRoomStatesFromSession(sessionData);
  console.log('🏠 États des pièces extraits depuis session:', roomStates);

  // Si on a des interactions de pièces, les utiliser
  if (Object.keys(roomStates).length > 0) {
    for (const [pieceId, pieceInfo] of Object.entries(roomStates)) {
      const pieceData = {
        id: pieceId,
        nom: (pieceInfo as any).nom || getPieceName(pieceId),
        etat_utilisateur: (pieceInfo as any).etat_utilisateur || 'non_defini',
        statut_validation: getStatutValidationFromEtat((pieceInfo as any).etat_utilisateur),
        etapes: extractRealEtapes(sessionData, pieceId, type),
        // ✅ CORRECTION: Les signalements sont maintenant dans signalements[] global
        // Pas de signalements par pièce pour éviter la duplication
        signalements: []
      };

      pieces.push(pieceData);
    }
  } else {
    console.warn('⚠️ Aucune interaction trouvée, utilisation des pièces par défaut avec données réelles');

    // ✅ AJOUT: Utiliser les pièces standard mais avec les vraies données disponibles
    // (comme dans database-admin.html lignes 1745-1763)
    const standardRooms = [
      { id: generateUniquePieceId(), nom: "Chambre" },
      { id: generateUniquePieceId(), nom: "Cuisine" },
      { id: generateUniquePieceId(), nom: "Salle de Bain & Toilettes" },
      { id: generateUniquePieceId(), nom: "Salon" }
    ];

    standardRooms.forEach((room) => {
      const pieceData = {
        id: room.id,
        nom: room.nom,
        etat_utilisateur: 'non_defini',
        statut_validation: 'en_attente',
        etapes: extractRealEtapes(sessionData, room.id, type),
        signalements: []
      };

      pieces.push(pieceData);
    });
  }

  console.log(`✅ ${pieces.length} pièces extraites depuis données réelles`);
  return pieces;
}

/**
 * � Générer un ID unique pour une pièce
 */
function generateUniquePieceId(): string {
  return `${Date.now()}x${Math.random().toString().substr(2, 15)}`;
}

/**
 * �🏠 Extraire les états des pièces depuis la session
 */
function extractRoomStatesFromSession(sessionData: SessionData): Record<string, any> {
  const roomStates: Record<string, any> = {};

  if (!sessionData?.progress?.interactions) {
    return roomStates;
  }

  // Extraire depuis buttonClicks
  if (sessionData.progress.interactions.buttonClicks) {
    Object.entries(sessionData.progress.interactions.buttonClicks).forEach(([key, clickArray]: [string, any]) => {
      if (Array.isArray(clickArray) && clickArray.length > 0) {
        const click = clickArray[0];
        if (click.pieceId) {
          if (!roomStates[click.pieceId]) {
            roomStates[click.pieceId] = {
              nom: click.metadata?.roomName || getPieceName(click.pieceId),
              etat_utilisateur: click.actionType || 'non_defini'
            };
          }
        }
      }
    });
  }

  return roomStates;
}

/**
 * 📋 Extraire les étapes réelles d'une pièce
 * Cette fonction reproduit EXACTEMENT la logique de extractRealEtapes de database-admin.html
 */
function extractRealEtapes(sessionData: SessionData, pieceId: string, type: string): any[] {
  console.log(`🔍 Extraction étapes enrichies pour piece ${pieceId} (type=${type})`);
  const etapes: any[] = [];

  if (!sessionData?.progress?.interactions) {
    return etapes;
  }

  // 1. ✅ BUTTON CLICKS - Analyser toutes les interactions de boutons
  if (sessionData.progress.interactions.buttonClicks) {
    Object.entries(sessionData.progress.interactions.buttonClicks).forEach(([key, clickArray]: [string, any]) => {
      const belongsToPiece = key.includes(pieceId) || (Array.isArray(clickArray) && clickArray.some((click: any) => click.pieceId === pieceId));

      if (belongsToPiece && Array.isArray(clickArray)) {
        clickArray.forEach((click: any) => {
          const clickFlowType = click.metadata?.flowType || click.flowType || click.metadata?.page || 'checkin';

          // Filtrage par type
          if (type !== 'unified' && clickFlowType !== type) {
            return;
          }

          // Filtrage par pièce
          if (click.pieceId && click.pieceId !== pieceId) {
            return;
          }

          // Extraire le vrai etapeId
          let rawEtapeId = null;
          if (click.etapeId && /^\d+x\d+$/.test(click.etapeId)) {
            rawEtapeId = click.etapeId;
          } else if (click.buttonId && /^\d+x\d+$/.test(click.buttonId)) {
            rawEtapeId = click.buttonId;
          } else if (click.taskId && /^\d+x\d+$/.test(click.taskId)) {
            rawEtapeId = click.taskId;
          } else if (click.metadata?.etapeId && /^\d+x\d+$/.test(click.metadata?.etapeId)) {
            rawEtapeId = click.metadata.etapeId;
          }

          const realEtapeId = rawEtapeId;

          // ✅ Récupérer les métadonnées depuis l'API
          const apiMetadata = getEtapeMetadataFromAPI(sessionData, realEtapeId);

          // Structure complète avec toutes les données utilisateur
          const etapeData = {
            etape_id: realEtapeId,
            status: "completed",
            type: "button_click",
            etape_type: clickFlowType,
            action_type: click.actionType || 'validate',
            timestamp: click.timestamp || new Date().toISOString(),

            // ✅ Métadonnées de l'API (isTodo, titre, etc.)
            is_todo: apiMetadata?.is_todo || click.metadata?.isTodo || false,
            todo_title: apiMetadata?.todo_title || '',

            // ✅ Commentaire utilisateur
            comment: click.metadata?.comment || '',

            // ✅ Photos attachées au bouton
            photos_attached: click.metadata?.photoUrls || [],
            photos_count: click.metadata?.photosCount || 0
          };

          etapes.push(etapeData);
        });
      }
    });
  }

  // 2. 📷 PHOTOS TAKEN - Créer une étape distincte pour chaque photo
  if (sessionData.progress.interactions.photosTaken) {
    Object.entries(sessionData.progress.interactions.photosTaken).forEach(([photoKey, photoArray]: [string, any]) => {
      if (photoArray && Array.isArray(photoArray)) {
        photoArray.forEach((photo: any) => {
          // Filtrage par pièce
          if (photo.pieceId !== pieceId) {
            return;
          }

          // Détecter le flowType de la photo
          const photoFlowType = photo.metadata?.flowType || photo.flowType || photo.metadata?.page || 'checkout';

          // Filtrer par type si nécessaire
          if (type !== 'unified' && photoFlowType !== type) {
            return;
          }

          // Extraire l'etapeId
          let photoEtapeId = null;
          if (photo.taskId && photo.taskId.includes('_')) {
            const parts = photo.taskId.split('_');
            photoEtapeId = parts[parts.length - 1];
          }
          if (!photoEtapeId || !/^\d+x\d+$/.test(photoEtapeId)) {
            photoEtapeId = photo.metadata?.photoId || photo.metadata?.etapeId;
          }
          if (!photoEtapeId || !/^\d+x\d+$/.test(photoEtapeId)) {
            if (photo.etapeId && /^\d+x\d+$/.test(photo.etapeId)) {
              photoEtapeId = photo.etapeId;
            }
          }

          // Déterminer si c'est une base64 ou une URL
          const photoDataValue = photo.photoData || photo.metadata?.url || photo.uploadedUrl || '';
          const isBase64 = photoDataValue.startsWith('data:image');

          const photoData = {
            photo_id: photo.photoId,
            url: isBase64 ? '' : photoDataValue,  // URL seulement si ce n'est pas une base64
            timestamp: photo.timestamp,
            validated: photo.validated || false,
            retake_count: photo.retakeCount || 0
          };

          const photoEtape = {
            etape_id: photoEtapeId || `photo-${photo.photoId}`,
            type: "photo_taken",
            etape_type: photoFlowType,
            status: "completed",
            timestamp: photo.timestamp || new Date().toISOString(),
            is_todo: false,
            todo_title: '',
            action: 'photo_taken',
            comment: '',
            photo_id: photo.photoId,
            // ✅ CORRECTION: Séparer base64 et URL - vide si pas de données
            photo_base64: isBase64 ? photoDataValue : '',  // Base64 uniquement si c'est une base64, sinon vide
            photo_url: isBase64 ? '' : photoDataValue,     // URL uniquement si ce n'est pas une base64, sinon vide
            validated: photo.validated || false,
            retake_count: photo.retakeCount || 0,
            photos_attached: [photoData],
            photos_count: 1
          };

          etapes.push(photoEtape);
        });
      }
    });
  }

  // 3. ☑️ CHECKBOX STATES - Analyser les états des checkboxes
  // ✅ CORRECTION: Transformer en format button_click comme demandé
  if (sessionData.progress.interactions.checkboxStates) {
    Object.entries(sessionData.progress.interactions.checkboxStates).forEach(([checkboxKey, checkboxData]: [string, any]) => {
      console.log(`🔍 Traitement checkbox: ${checkboxKey}`, checkboxData);

      const checkboxPieceId = checkboxData.pieceId || checkboxKey.split('_')[0];

      if (checkboxPieceId === pieceId || checkboxKey.includes(pieceId)) {
        const checkboxFlowType = checkboxData.metadata?.flowType || checkboxData.flowType || checkboxData.metadata?.page || 'checkout';

        // Filtrage par type
        if (type !== 'unified' && checkboxFlowType !== type) {
          return;
        }

        // Récupérer le vrai etapeID
        let checkboxEtapeId = checkboxData.etapeId || checkboxData.taskId;

        // ✅ CORRECTION: Transformer en format button_click comme demandé
        const checkboxEtape = {
          etape_id: checkboxEtapeId || `checkbox-${checkboxKey}`,
          type: "button_click",  // ✅ CORRECTION: type = "button_click" au lieu de "checkbox"
          etape_type: checkboxFlowType,
          status: checkboxData.isChecked || checkboxData.checked ? "completed" : "pending",
          timestamp: checkboxData.checkedAt || checkboxData.timestamp || new Date().toISOString(),
          is_todo: false,
          todo_title: '',
          action: "complete",  // ✅ AJOUT: action pour les checkboxes
          comment: "",  // ✅ AJOUT: comment vide
          photos_attached: []  // ✅ AJOUT: photos_attached vide
        };

        console.log(`✅ Checkbox transformée en button_click:`, checkboxEtape);
        etapes.push(checkboxEtape);
      }
    });
  }

  console.log(`✅ ${etapes.length} étapes extraites pour pièce ${pieceId}`);
  return etapes;
}

/**
 * 🏷️ Obtenir le nom d'une pièce depuis son ID
 */
function getPieceName(pieceId: string): string {
  // Mapping basique des IDs de pièces vers leurs noms
  const pieceNames: Record<string, string> = {
    'chambre': 'Chambre',
    'cuisine': 'Cuisine',
    'salon': 'Salon',
    'salle_de_bain': 'Salle de Bain & Toilettes'
  };

  // Essayer de trouver un nom correspondant
  for (const [key, name] of Object.entries(pieceNames)) {
    if (pieceId.toLowerCase().includes(key)) {
      return name;
    }
  }

  return `Pièce ${pieceId.substring(0, 8)}`;
}

/**
 * 🏷️ Obtenir le statut de validation depuis l'état
 */
function getStatutValidationFromEtat(etat: string): string {
  switch (etat) {
    case 'correct': return 'validé';
    case 'deplorable':
    case 'probleme': return 'problème_détecté';
    default: return 'en_attente';
  }
}

/**
 * 🔥 Récupérer les métadonnées d'une étape depuis l'API
 * Cette fonction reproduit EXACTEMENT la logique de database-admin.html
 */
function getEtapeMetadataFromAPI(sessionData: SessionData, etapeId: string | null): any {
  if (!etapeId || !sessionData?.parcoursData?.piece) return null;

  for (const piece of sessionData.parcoursData.piece) {
    if (piece.etapes) {
      const etape = piece.etapes.find((e: any) => e.etapeID === etapeId);
      if (etape) {
        return {
          is_todo: etape.isTodo || false,
          todo_title: etape.todoTitle || '',
          todo_order: etape.todoOrder || '',
          image_url: etape.image || '',
          piece_name: piece.nom || ''
        };
      }
    }
  }
  return null;
}


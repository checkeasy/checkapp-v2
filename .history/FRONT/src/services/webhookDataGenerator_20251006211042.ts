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
    etapes: piece.etapes.map((etape: any) => ({
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
        photo_url: etape.photo_url || '',
        photo_base64: etape.photo_base64 || null,
        validated: etape.validated,
        retake_count: etape.retake_count || 0
      }),

      // 🔘 Données boutons (si type = button_click)
      ...(etape.type === 'button_click' && {
        action: etape.action_type || etape.action,
        comment: etape.comment || '',
        photos_attached: etape.photos_attached || []
      }),

      // 🚨 Données signalement (si type = signalement)
      ...(etape.type === 'signalement' && {
        comment: etape.comment || '',
        severity: etape.severity || 'normal',
        photos: etape.photos || []
      })
    })),

    // 🚨 Signalements (si présents)
    ...(piece.signalements && piece.signalements.length > 0 && {
      signalements: piece.signalements.map((sig: any) => ({
        id: sig.id,
        description: sig.description,
        comment: sig.comment || '',
        photo_url: sig.photo_url,
        photo_base64: sig.photo_base64 || null,
        timestamp: sig.timestamp
      }))
    })
  };
}

// Les fonctions suivantes seront implémentées dans la suite du fichier
// (extractUserVerificationData, extractParcoursLogementInfo, extractPiecesNewFormat, etc.)


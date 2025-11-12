export interface Signalement {
  // ✅ Identifiants
  id: string; // signalementID - ID unique du signalement
  parcoursId?: string; // ✅ NOUVEAU - ID du parcours auquel appartient le signalement
  checkId?: string; // ✅ NOUVEAU - ID du rapport/check auquel appartient le signalement
  rapportRef?: string; // ✅ NOUVEAU - Référence du rapport pour dédupliquer les signalements

  // ✅ Localisation
  roomId: string; // ID unique de la pièce (pieceID de l'API)
  piece: string; // Nom de la pièce (pour affichage)
  etapeId?: string; // ID de l'étape si signalement lié à une étape spécifique

  // ✅ Contenu
  titre: string; // Titre court pour l'affichage
  commentaire: string; // Commentaire détaillé de l'utilisateur

  // ✅ Images
  imgUrl?: string; // URL de l'image uploadée (après upload)
  imgBase64?: string; // Base64 de l'image (avant upload)

  // ✅ Métadonnées
  flowType: 'checkin' | 'checkout'; // Type de parcours
  origine: string; // CLIENT ou AGENT
  status: 'A_TRAITER' | 'RESOLU';
  priorite: boolean;
  typeSignalement?: 'Check in ménage' | 'Technique'; // Type de signalement pour Bubble

  // ✅ Timestamps
  created_at: string;
  updated_at: string;
}

export interface SignalementAction {
  type: 'PHOTO' | 'COMMENT' | 'RESOLVE';
  signalementId: string;
  data?: any;
}
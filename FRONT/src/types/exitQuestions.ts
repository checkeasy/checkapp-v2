/**
 * 🎯 Types pour les questions de sortie (Exit Questions)
 * 
 * Ces questions sont posées uniquement lors du checkout,
 * après validation de toutes les pièces et avant de retourner à la page d'accueil.
 */

/**
 * Structure d'une question de sortie reçue de l'API
 */
export interface ExitQuestion {
  questionID: string;
  questionContent: string;
  questionType: 'boolean' | 'image' | 'text';
  imageRequired: 'yes' | 'no';
}

/**
 * Réponse à une question de sortie (sauvegardée dans localStorage)
 */
export interface ExitQuestionResponse {
  // Identifiants
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

/**
 * État complet des réponses aux questions de sortie pour un checkID
 */
export interface ExitQuestionsState {
  checkID: string;
  responses: Record<string, ExitQuestionResponse>; // questionID -> response
  completedAt?: string;
  isCompleted: boolean;
}

/**
 * Props pour le composant ExitQuestionsPage
 */
export interface ExitQuestionsPageProps {
  questions: ExitQuestion[];
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Props pour les composants de question individuelle
 */
export interface ExitQuestionItemProps {
  question: ExitQuestion;
  response?: ExitQuestionResponse;
  onChange: (response: ExitQuestionResponse) => void;
}


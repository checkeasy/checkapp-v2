export interface PhotoReference {
  tache_id: string;
  etapeID: string;  // ✅ AJOUTÉ - ID unique de l'étape photo depuis l'API
  url: string;
  expected_orientation: 'portrait' | 'paysage';
  overlay_enabled: boolean;
  isTodo?: boolean;  // ✅ AJOUTÉ - Indique si c'est une photo de validation TODO
  todoTitle?: string;  // ✅ AJOUTÉ - Titre de la tâche TODO
}

export interface Task {
  id: string;
  etapeID: string;  // ✅ AJOUTÉ - ID unique de l'étape depuis l'API (identique à id)
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | 'photo_optional' | 'photo_multiple' | 'reference_photos' | 'photo_validation';
  label: string;
  description?: string;
  hint?: string;
  total_photos_required?: number;
  photos_done?: number;
  completed?: boolean;
  isTodo?: boolean;  // ✅ AJOUTÉ - Indique si c'est une tâche de ménage (isTodo=true dans l'API)
  photo_reference?: PhotoReference;
  photo_references?: PhotoReference[];
  allowRetake?: boolean; // Permet de reprendre les photos
  validationState?: 'pending' | 'validated' | 'retaken'; // État de validation
}

// Legacy Task interface for compatibility with existing components
export interface LegacyTask {
  id: string;
  task: string;
  completed: boolean;
  photo?: string;
  description?: string;
}

export interface Room {
  id: string;
  nom: string;
  ordre: number;
  roomInfo: string;
  cleaningInfo: string;
  // 🎯 AJOUT: Champs originaux de l'API pour préserver la granularité
  travelerNote?: string;      // Note pour le voyageur (checkin)
  cleanerNote?: string;        // Note pour l'agent de ménage (checkout)
  infoEntrance?: string;       // Informations d'entrée
  photoReferences: {
    checkin?: PhotoReference[];
    checkout?: PhotoReference[];
    single?: PhotoReference;
  };
}

// Legacy Room interface for compatibility with existing components
export interface LegacyRoom {
  id: string;
  name: string;
  photos: string[];
  instructions: string[];
  checkpoints: string[];
  generalInstructions: string[];
  cleaningInfo?: string;
  roomInfo?: string;
  specificTasks: LegacyTask[];
}

export interface PieceStatus extends Room {
  status: 'VALIDEE' | 'INCOMPLETE' | 'VIDE';
  tasks_total: number;
  tasks_done: number;
  photos_required: number;
  photos_done: number;
  tasks?: Task[];
}

export type FlowType = 'checkin' | 'checkout';
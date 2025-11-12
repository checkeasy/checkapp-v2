import chambreReference2 from "@/assets/chambre-reference-2.jpg";
import chambreReference3 from "@/assets/chambre-reference-3.jpg";
import chambreReferenceNew from "@/assets/chambre-reference-new.jpg";
import salonReference from "@/assets/salon-reference.jpg";
import salonReference2 from "@/assets/salon-reference-2.jpg";
import cuisineReference from "@/assets/cuisine-reference.jpg";
import { Room, PhotoReference, Task, FlowType } from "@/types/room";

export const roomsData: Record<string, Room> = {
  chambre: {
    id: "chambre",
    nom: "Chambre",
    ordre: 1,
    roomInfo: "Chambre principale avec lit double, placards intégrés et salle de bain attenante. Vérifier l'état des draps, des serviettes et l'ordre général de la pièce. Attention aux objets personnels qui pourraient avoir été oubliés.",
    cleaningInfo: "Aspirer sol et tapis. Changer les draps et taies d'oreiller. Nettoyer surfaces (tables de chevet, commodes). Vérifier placards et tiroirs. Aérer la pièce. Contrôler l'éclairage et climatisation.",
    photoReferences: {
      checkin: [{
        tache_id: "photos-etat-entree-chambre",
        url: chambreReference3,
        expected_orientation: 'paysage',
        overlay_enabled: true
      }, {
        tache_id: "photos-etat-entree-chambre",
        url: chambreReference2,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }, {
        tache_id: "photos-etat-entree-chambre",
        url: chambreReferenceNew,
        expected_orientation: 'paysage',
        overlay_enabled: true
      }],
      checkout: [{
        tache_id: "changer-draps",
        url: chambreReference3,
        expected_orientation: 'paysage',
        overlay_enabled: true
      }, {
        tache_id: "nettoyer-surfaces",
        url: chambreReference2,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }]
    }
  },
  salon: {
    id: "salon",
    nom: "Salon",
    ordre: 2,
    roomInfo: "Salon spacieux avec canapé en cuir et télévision. Attention aux télécommandes et objets de valeur sur la table basse. Plantes à arroser si séjour > 7 jours. Vérifier le fonctionnement des équipements électroniques.",
    cleaningInfo: "Aspirateur sur tapis et moquette uniquement. Produit spécial cuir pour le canapé. Éviter l'eau sur les appareils électroniques. Dépoussiérage délicat des étagères. Nettoyer écrans avec produit adapté.",
    photoReferences: {
      checkin: [{
        tache_id: "photos-etat-entree-salon",
        url: salonReference,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }, {
        tache_id: "photos-etat-entree-salon",
        url: salonReference2,
        expected_orientation: 'paysage',
        overlay_enabled: true
      }],
      checkout: [{
        tache_id: "aspirer-salon",
        url: salonReference,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }, {
        tache_id: "nettoyer-canape",
        url: salonReference2,
        expected_orientation: 'paysage',
        overlay_enabled: true
      }]
    }
  },
  cuisine: {
    id: "cuisine",
    nom: "Cuisine",
    ordre: 3,
    roomInfo: "Cuisine équipée avec électroménager intégré. Vérifier la propreté du four et du réfrigérateur. Robinetterie sensible aux calcaires. Plan de travail en granit nécessitant des produits spécifiques.",
    cleaningInfo: "Produits anti-calcaire obligatoires pour robinetterie. Dégraissant pour la hotte aspirante. Éviter l'eau sur les prises électriques. Nettoyer l'intérieur du micro-ondes et du réfrigérateur. Produit spécial granit pour le plan de travail.",
    photoReferences: {
      checkin: [{
        tache_id: "photo-etat-entree-cuisine",
        url: cuisineReference,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }],
      single: {
        tache_id: "photo-etat-entree-cuisine",
        url: cuisineReference,
        expected_orientation: 'portrait',
        overlay_enabled: true
      },
      checkout: [{
        tache_id: "nettoyer-electromenager",
        url: cuisineReference,
        expected_orientation: 'portrait',
        overlay_enabled: true
      }]
    }
  }
};

// Task generators for different flow types
export const generateRoomTasks = (roomId: string, flowType: FlowType): Task[] => {
  const room = roomsData[roomId];
  if (!room) return [];

  switch (flowType) {
    case 'checkin':
      return generateCheckinTasks(room);
    case 'checkout':
      return generateCheckoutTasks(room);
    default:
      return [];
  }
};

const generateCheckinTasks = (room: Room): Task[] => {
  const tasks: Task[] = [];

  switch (room.id) {
    case 'chambre':
      tasks.push({
        id: "photos-etat-entree-chambre",
        piece_id: room.id,
        ordre: 1,
        type: 'photo_multiple',
        label: "📸 Photos état d'entrée - Chambre",
        description: "Prendre 3 photos de l'état de la chambre à l'entrée pour documenter l'état initial.",
        completed: false,
        total_photos_required: 3,
        photos_done: 0,
        photo_references: room.photoReferences.checkin
      });
      break;
    
    case 'salon':
      tasks.push({
        id: "photos-etat-entree-salon",
        piece_id: room.id,
        ordre: 1,
        type: 'photo_multiple',
        label: "📸 Photos état d'entrée - Salon",
        description: "Prendre 2 photos similaires aux photos de référence du salon pour documenter l'aménagement.",
        completed: false,
        total_photos_required: 2,
        photos_done: 0,
        photo_references: room.photoReferences.checkin
      });
      break;
    
    case 'cuisine':
      tasks.push({
        id: "photo-etat-entree-cuisine",
        piece_id: room.id,
        ordre: 1,
        type: 'photo_optional',
        label: "📸 Photo état d'entrée - Cuisine",
        description: "Prendre 1 photo similaire à la photo de référence de la cuisine pour vérifier l'aménagement.",
        completed: false,
        total_photos_required: 1,
        photos_done: 0,
        photo_reference: room.photoReferences.single
      });
      break;
  }

  return tasks;
};

const generateCheckoutTasks = (room: Room): Task[] => {
  const tasks: Task[] = [];

  switch (room.id) {
    case 'chambre':
      tasks.push(
        {
          id: "changer-draps",
          piece_id: room.id,
          ordre: 1,
          type: 'photo_required',
          label: "Changer draps & taies",
          description: "Parure propre, tirée au carré.",
          completed: false,
          total_photos_required: 1,
          photos_done: 0,
          photo_reference: room.photoReferences.checkout?.[0]
        },
        {
          id: "aspirer-sous-lit",
          piece_id: room.id,
          ordre: 2,
          type: 'checkbox',
          label: "🧹 Aspirer sous lit & meubles",
          description: "Aucune boule de poussière.",
          completed: false
        },
        {
          id: "photos-chambre-similaires",
          piece_id: room.id,
          ordre: 3,
          type: 'photo_multiple',
          label: "📸 Prendre les photos similaires",
          description: "Prendre 3 photos de la chambre sous différents angles une fois terminée.",
          completed: false,
          total_photos_required: 3,
          photos_done: 0,
          photo_references: room.photoReferences.checkin // Réutilise les photos checkin
        }
      );
      break;
    
    case 'salon':
      tasks.push({
        id: "photos-salon-similaires",
        piece_id: room.id,
        ordre: 1,
        type: 'photo_multiple',
        label: "📸 Prendre les photos similaires",
        description: "Prendre 2 photos du salon sous différents angles.",
        completed: false,
        total_photos_required: 2,
        photos_done: 0,
        photo_references: room.photoReferences.checkin // Réutilise les photos checkin
      });
      break;
    
    case 'cuisine':
      tasks.push({
        id: "photo-cuisine",
        piece_id: room.id,
        ordre: 1,
        type: 'photo_optional',
        label: "Prendre une photo similaire",
        description: "Photo de contrôle de la cuisine.",
        completed: false,
        total_photos_required: 1,
        photos_done: 0,
        photo_reference: room.photoReferences.single
      });
      break;
  }

  return tasks;
};

export const getRoomData = (roomId: string): Room | undefined => {
  return roomsData[roomId];
};

export const getAllRooms = (): Room[] => {
  return Object.values(roomsData).sort((a, b) => a.ordre - b.ordre);
};
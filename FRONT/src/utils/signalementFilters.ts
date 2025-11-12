import { Signalement } from "@/types/signalement";

/**
 * Déduplique les signalements en masquant les doublons
 * Règles de déduplication :
 * 1. Si un signalement a un rapportRef, masquer les autres signalements avec le même rapportRef
 * 2. Si un signalement existe à la fois en mode utilisateur et en mode historique (même ID), garder seulement la version utilisateur
 */
export const deduplicateSignalements = (
  signalements: Signalement[]
): Signalement[] => {
  // Créer une map des signalements non-historiques par ID
  const userSignalementsMap = new Map<string, Signalement>();
  signalements.forEach(sig => {
    if (sig.origine !== 'HISTORIQUE') {
      userSignalementsMap.set(sig.id, sig);
    }
  });

  // Créer une map des rapportRef pour dédupliquer par rapport
  const rapportRefMap = new Map<string, Signalement>();

  // Filtrer pour masquer les doublons
  const filtered = signalements.filter(sig => {
    // Règle 1 : Dédupliquer par rapportRef (garder le premier, masquer les autres)
    if (sig.rapportRef) {
      if (rapportRefMap.has(sig.rapportRef)) {
        // Ce rapportRef a déjà été vu, masquer ce signalement
        return false;
      }
      // Enregistrer ce rapportRef
      rapportRefMap.set(sig.rapportRef, sig);
    }

    // Règle 2 : Masquer les signalements historiques s'il existe une version utilisateur
    if (sig.origine === 'HISTORIQUE') {
      if (userSignalementsMap.has(sig.id)) {
        return false;
      }
    }

    return true;
  });

  return filtered;
};

/**
 * Compte TOUS les signalements à traiter (actifs + historiques)
 * Utilisé pour afficher le badge sur la home page
 * Applique la même logique de déduplication que deduplicateSignalements
 */
export const countActiveSignalements = (
  signalements: Signalement[]
): number => {
  // Créer une map des signalements non-historiques par ID pour la déduplication
  const userSignalementsMap = new Map<string, Signalement>();
  signalements.forEach(sig => {
    if (sig.origine !== 'HISTORIQUE') {
      userSignalementsMap.set(sig.id, sig);
    }
  });

  // Créer une map des rapportRef pour dédupliquer par rapport
  const rapportRefMap = new Map<string, Signalement>();

  // Compter tous les signalements, en masquant les doublons
  let count = 0;
  signalements.forEach(sig => {
    // Règle 1 : Dédupliquer par rapportRef (compter seulement le premier)
    if (sig.rapportRef) {
      if (rapportRefMap.has(sig.rapportRef)) {
        // Ce rapportRef a déjà été vu, ne pas compter
        return;
      }
      // Enregistrer ce rapportRef
      rapportRefMap.set(sig.rapportRef, sig);
    }

    // Règle 2 : Ne pas compter les doublons historiques
    if (sig.origine === 'HISTORIQUE') {
      if (!userSignalementsMap.has(sig.id)) {
        count++;
      }
    } else {
      // Compter tous les signalements utilisateur
      count++;
    }
  });

  return count;
};


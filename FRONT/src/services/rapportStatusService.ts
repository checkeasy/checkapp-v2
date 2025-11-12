/**
 * 📋 SERVICE DE VÉRIFICATION DU STATUT DU RAPPORT IA
 * 
 * Service pour vérifier si le rapport IA est terminé et prêt à être consulté.
 * 
 * Responsabilités :
 * - Vérifier le statut du rapport via l'API Bubble
 * - Retourner si le rapport est terminé (avancée === "terminé")
 * - Gérer les erreurs de requête
 */

import { environment } from '@/config/environment';

export interface RapportData {
  "Parcours Titre": string;
  "Logement Titre": string;
  externalID: string;
  nomUser: string;
  "Modified Date": number;
  avancée: string; // "terminé" | "En cours" | etc.
  PrénomUser: string;
  isAI: boolean;
  Logement: string;
  "Created By": string;
  Conciergerie: string;
  "Created Date": number;
  phoneUser: string;
  "Check In": string;
  typeUser: string;
  "Check Out": string;
  avancéeRapport: string; // "En cours" | "Terminé" | etc.
  Facturé: boolean;
  Parcours: string;
  _id: string;
  Statut: string;
  Titre: string;
}

export interface RapportStatusResponse {
  status: "success" | "error";
  response: {
    rapport: RapportData;
  };
}

class RapportStatusService {
  /**
   * Vérifie le statut du rapport IA pour un checkId donné
   * @param checkId - L'ID du check en cours
   * @returns Les données du rapport ou null en cas d'erreur
   */
  async checkRapportStatus(checkId: string): Promise<RapportData | null> {
    try {
      const url = new URL(environment.CHECK_RAPPORT_URL);
      url.searchParams.set('checkid', checkId);

      console.log('📋 Vérification statut rapport:', {
        checkId,
        url: url.toString()
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('❌ Erreur lors de la vérification du rapport:', response.status);
        return null;
      }

      const data: RapportStatusResponse = await response.json();

      console.log('📦 Réponse complète de l\'API:', JSON.stringify(data, null, 2));

      if (data.status === 'success' && data.response?.rapport) {
        console.log('✅ Statut rapport récupéré:', {
          avancée: data.response.rapport.avancée,
          avancéeRapport: data.response.rapport.avancéeRapport,
          isRapportReady: data.response.rapport.avancéeRapport === 'Terminé',
          rapportKeys: Object.keys(data.response.rapport)
        });
        return data.response.rapport;
      }

      console.warn('⚠️ Réponse inattendue de l\'API rapport:', {
        status: data.status,
        hasResponse: !!data.response,
        hasRapport: !!data.response?.rapport,
        fullData: data
      });
      return null;

    } catch (error) {
      console.error('❌ Erreur lors de la vérification du rapport:', error);
      return null;
    }
  }

  /**
   * Vérifie si le rapport est terminé
   * @param checkId - L'ID du check en cours
   * @returns true si le rapport est terminé, false sinon
   */
  async isRapportReady(checkId: string): Promise<boolean> {
    const rapport = await this.checkRapportStatus(checkId);
    // ✅ CORRECTION: Vérifier avancéeRapport (et non avancée)
    const isReady = rapport?.avancéeRapport === 'Terminé';

    console.log('🔍 isRapportReady - Détails:', {
      checkId,
      avancéeRapport: rapport?.avancéeRapport,
      avancéeRapportType: typeof rapport?.avancéeRapport,
      avancéeRapportLength: rapport?.avancéeRapport?.length,
      avancéeRapportCharCodes: rapport?.avancéeRapport?.split('').map(c => c.charCodeAt(0)),
      expectedValue: 'Terminé',
      expectedCharCodes: 'Terminé'.split('').map(c => c.charCodeAt(0)),
      isReady,
      strictEquality: rapport?.avancéeRapport === 'Terminé',
      trimmedEquality: rapport?.avancéeRapport?.trim() === 'Terminé'
    });

    return isReady;
  }
}

// Export singleton
export const rapportStatusService = new RapportStatusService();


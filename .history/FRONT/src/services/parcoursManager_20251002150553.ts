/**
 * 🎯 ParcoursManager - Singleton de gestion des parcours
 *
 * Gère le parcours actuel en mémoire et notifie les changements
 */

import { DataAdapter } from './dataAdapter';
import { Room, Task, FlowType } from '@/types/room';
import { environment } from '@/config/environment';

export interface ParcoursData {
  id: string;
  rawData: any;
  adaptedData: {
    roomsData: Record<string, Room & { tasks: Task[] }>;
    flowType: FlowType;
    parcoursInfo: {
      id: string;
      name: string;
      type: string;
      logement: string;
      takePicture: string;
    };
  };
  loadedAt: number;
}

type ParcoursListener = (parcours: ParcoursData | null) => void;

class ParcoursManager {
  private currentParcours: ParcoursData | null = null;
  private listeners: Set<ParcoursListener> = new Set();

  /**
   * Charge un parcours depuis l'API
   */
  async loadParcours(parcoursId: string, forceFlowType?: FlowType): Promise<ParcoursData> {
    console.log('🔄 ParcoursManager: Chargement du parcours:', parcoursId);

    try {
      // Construire l'URL de l'API avec le bon endpoint
      const apiUrl = `${environment.API_BASE_URL}/${environment.BUBBLE_ENV}/api/1.1/wf/endpointPiece?parcours=${parcoursId}`;
      console.log('🌐 URL API:', apiUrl);

      // Appel API pour récupérer les données
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const rawData = await response.json();
      console.log('✅ Données brutes récupérées:', rawData);

      // Adapter les données (les endpoints workflow retournent directement les données)
      this.loadFromRawDataWithMode(rawData, forceFlowType);

      return this.currentParcours!;
    } catch (error) {
      console.error('❌ Erreur chargement parcours:', error);
      throw error;
    }
  }

  /**
   * Charge un parcours depuis des données brutes avec un mode forcé
   */
  loadFromRawDataWithMode(rawData: any, forceFlowType?: FlowType): void {
    console.log('🔄 ParcoursManager: Adaptation des données avec mode:', forceFlowType);

    try {
      const adaptedData = DataAdapter.adaptCompleteData(rawData, forceFlowType);

      this.currentParcours = {
        id: rawData.parcourID || rawData._id,
        rawData,
        adaptedData: {
          ...adaptedData,
          parcoursInfo: {
            id: rawData.parcourID || rawData._id,
            ...adaptedData.parcoursInfo
          }
        },
        loadedAt: Date.now()
      };

      console.log('✅ Parcours chargé:', {
        id: this.currentParcours.id,
        flowType: this.currentParcours.adaptedData.flowType,
        roomsCount: Object.keys(this.currentParcours.adaptedData.roomsData).length
      });

      // Notifier les listeners
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Erreur adaptation données:', error);
      throw error;
    }
  }

  /**
   * Obtient le parcours actuel
   */
  getCurrentParcours(): ParcoursData | null {
    return this.currentParcours;
  }

  /**
   * Obtient les pièces du parcours actuel
   */
  getCurrentRooms(): (Room & { tasks: Task[] })[] {
    if (!this.currentParcours) return [];
    return Object.values(this.currentParcours.adaptedData.roomsData);
  }

  /**
   * Obtient les statistiques du parcours actuel
   */
  getCurrentStats() {
    if (!this.currentParcours) {
      return {
        totalRooms: 0,
        totalTasks: 0,
        totalPhotos: 0,
        flowType: 'checkin' as FlowType
      };
    }

    const rooms = this.getCurrentRooms();
    const totalTasks = rooms.reduce((sum, room) => sum + room.tasks.length, 0);
    const totalPhotos = rooms.reduce((sum, room) => {
      return sum + room.tasks.filter(task => task.type === 'photo_required').length;
    }, 0);

    return {
      totalRooms: rooms.length,
      totalTasks,
      totalPhotos,
      flowType: this.currentParcours.adaptedData.flowType
    };
  }

  /**
   * S'abonne aux changements de parcours
   */
  subscribe(listener: ParcoursListener): () => void {
    this.listeners.add(listener);
    
    // Retourne une fonction de désabonnement
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentParcours);
      } catch (error) {
        console.error('❌ Erreur dans listener:', error);
      }
    });
  }

  /**
   * Réinitialise le parcours actuel
   */
  clearParcours(): void {
    console.log('🗑️ ParcoursManager: Réinitialisation du parcours');
    this.currentParcours = null;
    this.notifyListeners();
  }
}

// Export du singleton
export const parcoursManager = new ParcoursManager();


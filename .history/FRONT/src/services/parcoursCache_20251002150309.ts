/**
 * 🎯 ParcoursCache - Service de cache IndexedDB pour les parcours
 * 
 * Gère le cache local des parcours pour éviter les appels API répétés
 */

const DB_NAME = 'CheckEasyCache';
const DB_VERSION = 2;
const STORE_NAME = 'parcours';

interface CachedParcours {
  id: string;
  data: any;
  cachedAt: number;
  metadata?: {
    name?: string;
    type?: string;
    roomsCount?: number;
  };
}

class ParcoursCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Ouvre la base de données IndexedDB
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('✅ IndexedDB ouverte');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('✅ Object store créé:', STORE_NAME);
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Sauvegarde un parcours dans le cache
   */
  async saveParcours(parcoursId: string, data: any, metadata?: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cachedParcours: CachedParcours = {
        id: parcoursId,
        data,
        cachedAt: Date.now(),
        metadata
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(cachedParcours);
        request.onsuccess = () => {
          console.log('✅ Parcours sauvegardé dans le cache:', parcoursId);
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Erreur sauvegarde cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur saveParcours:', error);
      throw error;
    }
  }

  /**
   * Récupère un parcours depuis le cache
   */
  async getParcours(parcoursId: string): Promise<any | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(parcoursId);
        
        request.onsuccess = () => {
          const result = request.result as CachedParcours | undefined;
          if (result) {
            console.log('✅ Parcours trouvé dans le cache:', parcoursId);
            resolve(result.data);
          } else {
            console.log('ℹ️ Parcours non trouvé dans le cache:', parcoursId);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('❌ Erreur lecture cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur getParcours:', error);
      return null;
    }
  }

  /**
   * Vérifie si un parcours existe dans le cache
   */
  async hasParcours(parcoursId: string): Promise<boolean> {
    const data = await this.getParcours(parcoursId);
    return data !== null;
  }

  /**
   * Vérifie si le cache est valide (non expiré)
   */
  async isCacheValid(parcoursId: string, maxAgeHours: number = 24): Promise<boolean> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve) => {
        const request = store.get(parcoursId);
        
        request.onsuccess = () => {
          const result = request.result as CachedParcours | undefined;
          if (!result) {
            resolve(false);
            return;
          }

          const ageMs = Date.now() - result.cachedAt;
          const ageHours = ageMs / (1000 * 60 * 60);
          const isValid = ageHours < maxAgeHours;

          console.log(`ℹ️ Cache ${isValid ? 'valide' : 'expiré'}:`, {
            parcoursId,
            ageHours: ageHours.toFixed(2),
            maxAgeHours
          });

          resolve(isValid);
        };
        
        request.onerror = () => {
          console.error('❌ Erreur vérification cache:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('❌ Erreur isCacheValid:', error);
      return false;
    }
  }

  /**
   * Récupère les métadonnées d'un parcours
   */
  async getParcoursMetadata(parcoursId: string): Promise<any | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve) => {
        const request = store.get(parcoursId);
        
        request.onsuccess = () => {
          const result = request.result as CachedParcours | undefined;
          resolve(result?.metadata || null);
        };
        
        request.onerror = () => {
          console.error('❌ Erreur lecture métadonnées:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('❌ Erreur getParcoursMetadata:', error);
      return null;
    }
  }

  /**
   * Supprime un parcours du cache
   */
  async removeParcours(parcoursId: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(parcoursId);
        
        request.onsuccess = () => {
          console.log('✅ Parcours supprimé du cache:', parcoursId);
          resolve();
        };
        
        request.onerror = () => {
          console.error('❌ Erreur suppression cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur removeParcours:', error);
      throw error;
    }
  }

  /**
   * Vide tout le cache
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('✅ Cache vidé complètement');
          resolve();
        };
        
        request.onerror = () => {
          console.error('❌ Erreur vidage cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur clearAll:', error);
      throw error;
    }
  }
}

// Export du singleton
export const parcoursCache = new ParcoursCache();


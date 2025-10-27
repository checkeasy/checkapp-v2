/**
 * 🗄️ SERVICE DE GESTION DES SESSIONS CHECK
 * 
 * Gère le cycle de vie complet des sessions de check (checkin/checkout) :
 * - Création et initialisation des sessions
 * - Sauvegarde et récupération depuis IndexedDB
 * - Gestion de la progression et des interactions
 * - Synchronisation avec l'API
 */

import { environment } from '@/config/environment';

// Types
export interface CheckSession {
  checkId: string;
  userId: string;
  parcoursId: string;
  flowType: 'checkin' | 'checkout';
  status: 'active' | 'completed' | 'cancelled' | 'terminated';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  terminatedAt?: string;
  // 🎯 ID du rapport Bubble (récupéré après envoi du webhook final)
  rapportID?: string;
  // 🎯 Informations utilisateur pour la reprise de session
  userInfo?: {
    firstName: string;
    lastName: string;
    phone: string;
    type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
  };
  // 🎯 Informations parcours pour l'affichage
  parcoursInfo?: {
    name: string;
    type: string;
  };
  progress: {
    currentPieceId: string;
    currentTaskIndex: number;
    interactions: {
      buttonClicks?: Record<string, any[]>;
      photosTaken?: Record<string, any[]>;
      checkboxStates?: Record<string, any>;
      signalements?: Record<string, any>;
      pieceStates?: Record<string, any>;
      navigation?: any;
      exitQuestions?: Record<string, any>;
    };
    exitQuestionsCompleted?: boolean;
    exitQuestionsCompletedAt?: string;
  };
  metadata?: Record<string, any>;
}

export interface UserSessionsList {
  userId: string;
  sessions: CheckSession[];
  activeSessions: CheckSession[];
  completedSessions: CheckSession[];
}

export interface SessionCheckResult {
  hasExistingSession: boolean;
  hasCompletedSession: boolean;
  session?: CheckSession;
  completedSession?: CheckSession;
}

class CheckSessionManager {
  private dbName = environment.INDEXEDDB_NAME;
  private dbVersion = environment.INDEXEDDB_VERSION;
  private storeName = 'checkSessions';
  private db: IDBDatabase | null = null;

  /**
   * � Réinitialise complètement la base de données
   * Utile en cas de corruption ou de problème de migration
   */
  async resetDatabase(): Promise<void> {
    try {
      // Fermer la connexion existante
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Supprimer la base de données
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.dbName);
        request.onsuccess = () => {
          console.log('✅ Base de données supprimée');
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Erreur suppression DB:', request.error);
          reject(request.error);
        };
        request.onblocked = () => {
          console.warn('⚠️ Suppression DB bloquée (connexions ouvertes)');
        };
      });

      // Réinitialiser
      await this.initDB();
      console.log('✅ Base de données réinitialisée');
    } catch (error) {
      console.error('❌ Erreur réinitialisation DB:', error);
      throw error;
    }
  }

  /**
   * �🔌 Initialise la connexion à IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      // Vérifier que le store existe toujours
      if (this.db.objectStoreNames.contains(this.storeName)) {
        return this.db;
      } else {
        // Le store n'existe pas, fermer et réinitialiser
        console.warn('⚠️ Store manquant, réinitialisation de la DB...');
        this.db.close();
        this.db = null;
      }
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Vérifier que le store existe
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          console.error('❌ Store checkSessions manquant après ouverture!');
          console.log('📋 Stores disponibles:', Array.from(this.db.objectStoreNames));

          // Fermer et incrémenter la version pour forcer une migration
          this.db.close();
          this.db = null;

          // Réessayer avec une version incrémentée
          const newVersion = this.dbVersion + 1;
          console.log(`🔄 Réouverture avec version ${newVersion}...`);

          const retryRequest = indexedDB.open(this.dbName, newVersion);

          retryRequest.onerror = () => {
            console.error('❌ Erreur réouverture IndexedDB:', retryRequest.error);
            reject(retryRequest.error);
          };

          retryRequest.onsuccess = () => {
            this.db = retryRequest.result;
            console.log('✅ IndexedDB réinitialisée avec succès');
            resolve(this.db);
          };

          retryRequest.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Créer le store
            if (!db.objectStoreNames.contains(this.storeName)) {
              const store = db.createObjectStore(this.storeName, { keyPath: 'checkId' });
              store.createIndex('userId', 'userId', { unique: false });
              store.createIndex('parcoursId', 'parcoursId', { unique: false });
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
              console.log('✅ Store checkSessions créé (retry)');
            }
          };

          return;
        }

        console.log('✅ IndexedDB initialisée');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'checkId' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('parcoursId', 'parcoursId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ Store checkSessions créé');
        }
      };
    });
  }

  /**
   * 🆕 Crée une nouvelle session de check
   */
  async createCheckSession(
    userId: string,
    parcoursId: string,
    flowType: 'checkin' | 'checkout',
    userInfo?: {
      firstName: string;
      lastName: string;
      phone: string;
      type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
    },
    parcoursInfo?: {
      name: string;
      type: string;
    }
  ): Promise<CheckSession> {
    const checkId = this.generateCheckId();
    const now = new Date().toISOString();

    const session: CheckSession = {
      checkId,
      userId,
      parcoursId,
      flowType,
      status: 'active',
      isFlowCompleted: false,
      createdAt: now,
      lastActiveAt: now,
      userInfo,
      parcoursInfo,
      progress: {
        currentPieceId: '',
        currentTaskIndex: 0,
        interactions: {}
      }
    };

    await this.saveCheckSession(session);
    console.log('✅ Session créée:', checkId);

    return session;
  }

  /**
   * 💾 Sauvegarde une session dans IndexedDB
   */
  async saveCheckSession(session: CheckSession, retryCount = 0): Promise<void> {
    try {
      const db = await this.initDB();

      // Vérifier que le store existe avant de créer la transaction
      if (!db.objectStoreNames.contains(this.storeName)) {
        throw new Error(`Store ${this.storeName} n'existe pas dans la DB`);
      }

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Mettre à jour lastActiveAt
      session.lastActiveAt = new Date().toISOString();

      await new Promise<void>((resolve, reject) => {
        const request = store.put(session);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('💾 Session sauvegardée:', session.checkId);
    } catch (error) {
      console.error('❌ Erreur sauvegarde session:', error);

      // Si c'est une erreur de store manquant et qu'on n'a pas encore réessayé
      const errorObj = error as Error & { name?: string };
      if (retryCount === 0 && (
        errorObj?.message?.includes('not found') ||
        errorObj?.message?.includes('n\'existe pas') ||
        errorObj?.name === 'NotFoundError'
      )) {
        console.warn('⚠️ Store manquant, tentative de réinitialisation...');
        try {
          await this.resetDatabase();
          console.log('🔄 Nouvelle tentative de sauvegarde...');
          return await this.saveCheckSession(session, retryCount + 1);
        } catch (resetError) {
          console.error('❌ Échec de la réinitialisation:', resetError);
        }
      }

      throw error;
    }
  }

  /**
   * 🔄 Met à jour une session existante (partiel)
   */
  async updateCheckSession(
    checkId: string,
    updates: Partial<CheckSession>
  ): Promise<boolean> {
    try {
      const session = await this.getCheckSession(checkId);
      if (!session) {
        console.error('❌ Session introuvable pour mise à jour:', checkId);
        return false;
      }

      const updatedSession: CheckSession = {
        ...session,
        ...updates
      };

      await this.saveCheckSession(updatedSession);
      console.log('✅ Session mise à jour:', checkId, updates);
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour session:', error);
      return false;
    }
  }

  /**
   * 📖 Récupère une session par son checkId
   */
  async getCheckSession(checkId: string): Promise<CheckSession | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(checkId);

        request.onsuccess = () => {
          const session = request.result as CheckSession | undefined;
          if (session) {
            console.log('📖 Session récupérée:', checkId);
            resolve(session);
          } else {
            console.log('⚠️ Session non trouvée:', checkId);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('❌ Erreur récupération session:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur getCheckSession:', error);
      return null;
    }
  }

  /**
   * 🔍 Vérifie si des sessions existent pour un utilisateur/parcours
   */
  async checkExistingSessions(
    userId: string,
    parcoursId: string
  ): Promise<SessionCheckResult> {
    try {
      const sessions = await this.getUserSessions(userId);
      const parcoursSessions = sessions.filter(s => s.parcoursId === parcoursId);

      const activeSession = parcoursSessions.find(s => s.status === 'active' && !s.isFlowCompleted);
      const completedSession = parcoursSessions.find(s => s.isFlowCompleted);

      return {
        hasExistingSession: !!activeSession,
        hasCompletedSession: !!completedSession,
        session: activeSession,
        completedSession
      };
    } catch (error) {
      console.error('❌ Erreur checkExistingSessions:', error);
      return {
        hasExistingSession: false,
        hasCompletedSession: false
      };
    }
  }

  /**
   * 📋 Récupère toutes les sessions d'un utilisateur
   */
  async getUserSessions(userId: string): Promise<CheckSession[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');

      return new Promise((resolve, reject) => {
        const request = index.getAll(userId);
        
        request.onsuccess = () => {
          const sessions = request.result as CheckSession[];
          console.log('📋 Sessions utilisateur récupérées:', sessions.length);
          resolve(sessions);
        };
        
        request.onerror = () => {
          console.error('❌ Erreur récupération sessions utilisateur:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur getUserSessions:', error);
      return [];
    }
  }

  /**
   * 🔄 Met à jour la progression d'une session
   */
  async updateSessionProgress(
    checkId: string,
    progressUpdate: Partial<CheckSession['progress']>
  ): Promise<void> {
    try {
      const session = await this.getCheckSession(checkId);
      if (!session) {
        console.error('❌ Session non trouvée pour mise à jour:', checkId);
        return;
      }

      // 🎯 FIX CRITIQUE: Fusionner la progression avec deep merge des interactions
      const currentInteractions = session.progress.interactions || {};
      const newInteractions = progressUpdate.interactions || {};

      // Deep merge pour chaque type d'interaction
      const mergedInteractions = {
        buttonClicks: {
          ...(currentInteractions.buttonClicks || {}),
          ...(newInteractions.buttonClicks || {})
        },
        photosTaken: {
          ...(currentInteractions.photosTaken || {}),
          ...(newInteractions.photosTaken || {})
        },
        checkboxStates: {
          ...(currentInteractions.checkboxStates || {}),
          ...(newInteractions.checkboxStates || {})
        },
        signalements: {
          ...(currentInteractions.signalements || {}),
          ...(newInteractions.signalements || {})
        },
        pieceStates: {
          ...(currentInteractions.pieceStates || {}),
          ...(newInteractions.pieceStates || {})
        },
        exitQuestions: {
          ...(currentInteractions.exitQuestions || {}),
          ...(newInteractions.exitQuestions || {})
        },
        navigation: newInteractions.navigation || currentInteractions.navigation
      };

      session.progress = {
        ...session.progress,
        ...progressUpdate,
        interactions: mergedInteractions
      };

      await this.saveCheckSession(session);
      console.log('🔄 Progression mise à jour:', checkId);
    } catch (error) {
      console.error('❌ Erreur updateSessionProgress:', error);
      throw error;
    }
  }

  /**
   * ✅ Marque une session comme complétée
   */
  async completeCheckSession(checkId: string): Promise<void> {
    try {
      const session = await this.getCheckSession(checkId);
      if (!session) {
        console.error('❌ Session non trouvée:', checkId);
        return;
      }

      session.status = 'completed';
      session.isFlowCompleted = true;
      session.completedAt = new Date().toISOString();

      await this.saveCheckSession(session);
      console.log('✅ Session complétée:', checkId);
    } catch (error) {
      console.error('❌ Erreur completeCheckSession:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Supprime une session
   */
  async deleteCheckSession(checkId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(checkId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('🗑️ Session supprimée:', checkId);
    } catch (error) {
      console.error('❌ Erreur deleteCheckSession:', error);
      throw error;
    }
  }

  /**
   * 📊 Récupère toutes les sessions stockées
   */
  getStoredSessions(): CheckSession[] {
    // Fallback: récupérer depuis localStorage si IndexedDB échoue
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('check_session_'));
      return keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean) as CheckSession[];
    } catch (error) {
      console.error('❌ Erreur getStoredSessions:', error);
      return [];
    }
  }

  /**
   * 📋 Récupère la liste complète des sessions d'un utilisateur avec statistiques
   */
  async getUserSessionsList(userId: string): Promise<UserSessionsList & {
    hasAnySessions: boolean;
    totalCount: number;
    sessionsByParcours: Record<string, CheckSession[]>;
  }> {
    try {
      const sessions = await this.getUserSessions(userId);
      const activeSessions = sessions.filter(s => s.status === 'active' && !s.isFlowCompleted);
      const completedSessions = sessions.filter(s => s.isFlowCompleted);

      // Grouper par parcours
      const sessionsByParcours: Record<string, CheckSession[]> = {};
      sessions.forEach(session => {
        if (!sessionsByParcours[session.parcoursId]) {
          sessionsByParcours[session.parcoursId] = [];
        }
        sessionsByParcours[session.parcoursId].push(session);
      });

      return {
        userId,
        sessions,
        activeSessions,
        completedSessions,
        hasAnySessions: sessions.length > 0,
        totalCount: sessions.length,
        sessionsByParcours
      };
    } catch (error) {
      console.error('❌ Erreur getUserSessionsList:', error);
      return {
        userId,
        sessions: [],
        activeSessions: [],
        completedSessions: [],
        hasAnySessions: false,
        totalCount: 0,
        sessionsByParcours: {}
      };
    }
  }

  /**
   * 🎲 Génère un ID unique pour une session
   */
  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 🔄 MIGRATION: Enrichit une session existante avec userInfo et parcoursInfo
   */
  async migrateSession(
    checkId: string,
    userInfo: {
      firstName: string;
      lastName: string;
      phone: string;
      type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
    },
    parcoursInfo: {
      name: string;
      type: string;
    }
  ): Promise<boolean> {
    try {
      console.log('🔄 Migration de la session:', checkId);

      const session = await this.getCheckSession(checkId);
      if (!session) {
        console.warn('⚠️ Session introuvable pour migration:', checkId);
        return false;
      }

      // Mettre à jour la session avec les nouvelles infos
      const updatedSession: CheckSession = {
        ...session,
        userInfo,
        parcoursInfo,
        lastActiveAt: new Date().toISOString()
      };

      await this.saveCheckSession(updatedSession);
      console.log('✅ Session migrée avec succès:', checkId);
      return true;
    } catch (error) {
      console.error('❌ Erreur migration session:', error);
      return false;
    }
  }

  /**
   * 🔄 MIGRATION: Enrichit toutes les sessions d'un utilisateur
   */
  async migrateAllUserSessions(
    userId: string,
    userInfo: {
      firstName: string;
      lastName: string;
      phone: string;
      type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
    }
  ): Promise<number> {
    try {
      console.log('🔄 Migration de toutes les sessions de:', userId);

      const sessions = await this.getUserSessions(userId);
      let migratedCount = 0;

      for (const session of sessions) {
        // Si la session n'a pas de userInfo, la migrer
        if (!session.userInfo) {
          const parcoursInfo = session.parcoursInfo || {
            name: 'Parcours',
            type: session.flowType === 'checkin' ? 'Voyageur' : 'Ménage'
          };

          const success = await this.migrateSession(session.checkId, userInfo, parcoursInfo);
          if (success) migratedCount++;
        }
      }

      console.log(`✅ ${migratedCount} sessions migrées sur ${sessions.length}`);
      return migratedCount;
    } catch (error) {
      console.error('❌ Erreur migration sessions utilisateur:', error);
      return 0;
    }
  }
}

// Instance singleton
export const checkSessionManager = new CheckSessionManager();


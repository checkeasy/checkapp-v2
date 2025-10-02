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
  status: 'active' | 'completed' | 'cancelled';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
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
   * 🔌 Initialise la connexion à IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
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
    flowType: 'checkin' | 'checkout'
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
  async saveCheckSession(session: CheckSession): Promise<void> {
    try {
      const db = await this.initDB();
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
      throw error;
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
}

// Instance singleton
export const checkSessionManager = new CheckSessionManager();


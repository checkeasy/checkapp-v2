/**
 * 🔄 Script de migration des CheckSessions
 * 
 * Migre les données de LocalStorage vers IndexedDB
 * À exécuter une fois au chargement de l'application
 */

import { checkSessionManager, CheckSession } from './checkSessionManager';

interface LegacyCheckSession {
  checkId: string;
  userId: string;
  userInfo?: {
    firstName: string;
    lastName: string;
    phone: string;
    phoneIndex?: string; // 🌍 NOUVEAU: Indicatif international
    type: string;
  };
  parcoursId: string;
  parcoursInfo?: {
    id: string;
    name: string;
    type: string;
    logement: string;
    takePicture: string;
  };
  flowType: 'checkin' | 'checkout';
  status: 'active' | 'completed' | 'cancelled';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  progress?: any;
}

const STORAGE_KEY_SESSIONS = 'checkSessionData';
const MIGRATION_KEY = 'checkSessions_migrated_to_indexeddb';

/**
 * Vérifie si la migration a déjà été effectuée
 */
export const hasMigrationBeenDone = (): boolean => {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Marque la migration comme effectuée
 */
const markMigrationAsDone = (): void => {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error('❌ Erreur marquage migration:', error);
  }
};

/**
 * Récupère les anciennes sessions depuis LocalStorage
 */
const getLegacySessions = (): Record<string, LegacyCheckSession> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!data) return {};
    
    const sessions = JSON.parse(data);
    console.log('📦 Sessions legacy trouvées:', Object.keys(sessions).length);
    return sessions;
  } catch (error) {
    console.error('❌ Erreur lecture sessions legacy:', error);
    return {};
  }
};

/**
 * Convertit une session legacy vers le format IndexedDB
 */
const convertLegacySession = (legacy: LegacyCheckSession): CheckSession => {
  return {
    checkId: legacy.checkId,
    userId: legacy.userId,
    parcoursId: legacy.parcoursId,
    flowType: legacy.flowType,
    status: legacy.status,
    isFlowCompleted: legacy.isFlowCompleted,
    createdAt: legacy.createdAt,
    lastActiveAt: legacy.lastActiveAt,
    completedAt: legacy.completedAt,
    progress: {
      currentPieceId: '',
      currentTaskIndex: 0,
      interactions: legacy.progress?.interactions || {}
    }
  };
};

/**
 * Migre toutes les sessions vers IndexedDB
 */
export const migrateCheckSessionsToIndexedDB = async (): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
}> => {
  console.log('🔄 Début migration CheckSessions vers IndexedDB...');
  
  // Vérifier si déjà migré
  if (hasMigrationBeenDone()) {
    console.log('✅ Migration déjà effectuée, skip');
    return { success: true, migrated: 0, errors: 0 };
  }
  
  let migrated = 0;
  let errors = 0;
  
  try {
    const legacySessions = getLegacySessions();
    const sessionIds = Object.keys(legacySessions);
    
    if (sessionIds.length === 0) {
      console.log('ℹ️ Aucune session legacy à migrer');
      markMigrationAsDone();
      return { success: true, migrated: 0, errors: 0 };
    }
    
    console.log(`📦 ${sessionIds.length} sessions à migrer...`);
    
    // Migrer chaque session
    for (const sessionId of sessionIds) {
      try {
        const legacySession = legacySessions[sessionId];
        const convertedSession = convertLegacySession(legacySession);
        
        // Sauvegarder dans IndexedDB
        await checkSessionManager.saveCheckSession(convertedSession);
        
        migrated++;
        console.log(`✅ Session migrée: ${sessionId}`);
      } catch (error) {
        errors++;
        console.error(`❌ Erreur migration session ${sessionId}:`, error);
      }
    }
    
    // Marquer la migration comme effectuée
    markMigrationAsDone();
    
    console.log(`🎉 Migration terminée: ${migrated} réussies, ${errors} erreurs`);
    
    // Optionnel: Sauvegarder une copie backup avant de nettoyer
    if (migrated > 0 && errors === 0) {
      try {
        localStorage.setItem(
          'checkSessionData_backup',
          localStorage.getItem(STORAGE_KEY_SESSIONS) || '{}'
        );
        console.log('💾 Backup créé dans localStorage');
      } catch (error) {
        console.error('⚠️ Impossible de créer le backup:', error);
      }
    }
    
    return {
      success: errors === 0,
      migrated,
      errors
    };
  } catch (error) {
    console.error('❌ Erreur fatale migration:', error);
    return { success: false, migrated, errors: errors + 1 };
  }
};

/**
 * Nettoie les anciennes données LocalStorage (à exécuter manuellement)
 */
export const cleanupLegacyStorage = (): void => {
  console.log('🧹 Nettoyage anciennes données LocalStorage...');
  
  try {
    // Garder seulement activeCheckId, supprimer checkSessionData
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    console.log('✅ Anciennes données supprimées');
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
};

/**
 * Fonction d'aide pour restaurer depuis le backup (en cas de problème)
 */
export const restoreFromBackup = (): boolean => {
  try {
    const backup = localStorage.getItem('checkSessionData_backup');
    if (!backup) {
      console.warn('⚠️ Aucun backup trouvé');
      return false;
    }
    
    localStorage.setItem(STORAGE_KEY_SESSIONS, backup);
    localStorage.removeItem(MIGRATION_KEY); // Permettre une nouvelle migration
    console.log('✅ Backup restauré');
    return true;
  } catch (error) {
    console.error('❌ Erreur restauration backup:', error);
    return false;
  }
};


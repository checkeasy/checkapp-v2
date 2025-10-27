/**
 * 🌍 Configuration de l'environnement
 * Centralise toutes les variables d'environnement et configurations
 */

// Détection de l'environnement
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// URL de base de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://checkeasy-57905.bubbleapps.io';

// Environnement Bubble (test ou live)
const BUBBLE_ENV = import.meta.env.VITE_BUBBLE_ENV || 'version-live';

export const environment = {
  // Environnement
  isDevelopment,
  isProduction,
  IS_DEV: isDevelopment, // Alias pour compatibilité

  // API Configuration
  API_BASE_URL,
  BUBBLE_ENV,

  // Parcours Data Configuration
  // 🎯 URL pour récupérer les données de parcours (pièces, tâches, etc.)
  PARCOURS_DATA_URL: import.meta.env.VITE_PARCOURS_DATA_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/endpointPiece`,

  // Upload Configuration
  UPLOAD_ENABLED: import.meta.env.VITE_UPLOAD_ENABLED !== 'false', // Activé par défaut
  IMAGE_UPLOAD_URL: import.meta.env.VITE_IMAGE_UPLOAD_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/createfileapi`,
  UPLOAD_TIMEOUT: parseInt(import.meta.env.VITE_UPLOAD_TIMEOUT || '30000', 10), // 30 secondes
  UPLOAD_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_UPLOAD_RETRY_ATTEMPTS || '3', 10),
  
  // Webhook Configuration
  // 🎯 URL pour l'initialisation (avec /initialize)
  WEBHOOK_UNIFIED_URL_INIT: import.meta.env.VITE_WEBHOOK_UNIFIED_URL_INIT ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/checkendpoint/initialize`,

  // 🎯 URL pour l'envoi final (SANS /initialize) - utilisé après questions de sortie ou fin de checkout
  WEBHOOK_UNIFIED_URL: import.meta.env.VITE_WEBHOOK_UNIFIED_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/checkendpoint`,

  WEBHOOK_CHECKIN_URL: import.meta.env.VITE_WEBHOOK_CHECKIN_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/checkinendpoint/initialize`,
  WEBHOOK_CHECKOUT_URL: import.meta.env.VITE_WEBHOOK_CHECKOUT_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/checkoutendpoint/initialize`,

  // 🆕 URL pour la création d'un nouveau check
  CREATE_CHECK_INITIALIZE_URL: import.meta.env.VITE_CREATE_CHECK_INITIALIZE_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/createcheck`,

  // 📋 URL pour vérifier le statut du rapport IA
  CHECK_RAPPORT_URL: import.meta.env.VITE_CHECK_RAPPORT_URL ||
    `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/checkrapport`,

  // Debug Configuration
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true' || isDevelopment,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? 'debug' : 'error'),
  
  // Camera Configuration
  CAMERA_IDEAL_WIDTH: parseInt(import.meta.env.VITE_CAMERA_WIDTH || '1920', 10),
  CAMERA_IDEAL_HEIGHT: parseInt(import.meta.env.VITE_CAMERA_HEIGHT || '1440', 10),
  CAMERA_FACING_MODE: import.meta.env.VITE_CAMERA_FACING_MODE || 'environment', // 📷 Caméra arrière par défaut
  
  // Storage Configuration
  STORAGE_PREFIX: import.meta.env.VITE_STORAGE_PREFIX || 'checkeasy_',
  INDEXEDDB_NAME: import.meta.env.VITE_INDEXEDDB_NAME || 'checkeasy_db',
  INDEXEDDB_VERSION: parseInt(import.meta.env.VITE_INDEXEDDB_VERSION || '2', 10),
  
  // Session Configuration
  SESSION_TIMEOUT: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000', 10), // 1 heure
  SESSION_CLEANUP_INTERVAL: parseInt(import.meta.env.VITE_SESSION_CLEANUP_INTERVAL || '300000', 10), // 5 minutes
} as const;

// Type pour l'environnement
export type Environment = typeof environment;

// Helper pour logger selon le niveau
export const logger = {
  debug: (...args: any[]) => {
    if (environment.DEBUG_MODE || environment.LOG_LEVEL === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(environment.LOG_LEVEL)) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(environment.LOG_LEVEL)) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};

// Afficher la configuration au démarrage (en mode debug uniquement)
if (environment.DEBUG_MODE) {
  console.log('🌍 Configuration de l\'environnement:', {
    isDevelopment,
    isProduction,
    BUBBLE_ENV,
    UPLOAD_ENABLED: environment.UPLOAD_ENABLED,
    IMAGE_UPLOAD_URL: environment.IMAGE_UPLOAD_URL,
    DEBUG_MODE: environment.DEBUG_MODE
  });
}


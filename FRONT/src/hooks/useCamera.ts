/**
 * 📷 Hook pour gérer l'accès à la caméra
 * Gère les permissions, la sélection de caméra, et le stream vidéo
 * ✅ Compatible avec tous les navigateurs mobiles (iOS Safari, Chrome, Firefox, Samsung Internet, Edge)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { environment } from '@/config/environment';
import {
  initializeCameraPolyfills,
  detectBrowser,
  isSecureContext
} from '@/utils/cameraPolyfills';

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export interface CameraPermissionResult {
  granted: boolean;
  error?: string;
  needsPolyfill?: boolean;
}

export interface DiagnosticLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface UseEnhancedCameraResult {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  availableCameras: CameraDevice[];
  selectedCameraId: string | null;
  switchCamera: (deviceId: string) => Promise<void>;
  refreshCameras: () => Promise<void>;
  diagnosticLogs: DiagnosticLog[];
  clearDiagnosticLogs: () => void;
}

/**
 * 🔑 Demande les permissions caméra de manière explicite
 * ✅ Compatible cross-browser avec polyfills et fallbacks
 */
export async function requestCameraPermissions(): Promise<CameraPermissionResult> {
  try {
    console.log('🔑 Demande d\'autorisation caméra...');

    // 🔒 Vérifier le contexte sécurisé (HTTPS)
    if (!isSecureContext()) {
      return {
        granted: false,
        error: '🔒 HTTPS requis pour accéder à la caméra. Veuillez utiliser https:// au lieu de http://'
      };
    }

    // 🔧 Initialiser les polyfills
    const polyfillResult = initializeCameraPolyfills();
    if (!polyfillResult.success) {
      return {
        granted: false,
        error: polyfillResult.errors.join(', '),
        needsPolyfill: true
      };
    }

    // 📱 Détecter le navigateur pour adapter les contraintes
    const browser = detectBrowser();

    // 🎥 Construire les contraintes adaptées au navigateur
    let constraints: MediaStreamConstraints;

    if (browser.isIOS) {
      // 🍎 iOS : utiliser 'exact' pour FORCER la demande de permission caméra arrière
      // C'est CRITIQUE sur iOS car le système peut autoriser la caméra avant mais pas l'arrière
      constraints = {
        video: {
          facingMode: { exact: 'environment' },
          // Pas de width/height sur iOS Safari (peut causer des erreurs)
        }
      };
    } else {
      // Autres navigateurs : contraintes complètes avec 'ideal' (pas 'exact')
      constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: environment.CAMERA_IDEAL_WIDTH },
          height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
        }
      };
    }

    console.log('📋 Contraintes caméra:', constraints);

    // Demander l'accès à la caméra
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Arrêter immédiatement le stream (on voulait juste les permissions)
    stream.getTracks().forEach(track => track.stop());

    console.log('✅ Permissions caméra accordées');
    return { granted: true };

  } catch (error: unknown) {
    console.error('❌ Erreur permissions caméra:', error);

    let errorMessage = 'Impossible d\'accéder à la caméra';
    const err = error as { name?: string; message?: string };

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMessage = 'Aucune caméra détectée sur cet appareil.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMessage = 'La caméra est déjà utilisée par une autre application.';
    } else if (err.name === 'OverconstrainedError') {
      errorMessage = 'Les paramètres de la caméra ne sont pas supportés par cet appareil.';
    } else if (err.name === 'SecurityError') {
      errorMessage = 'Accès caméra bloqué pour des raisons de sécurité (HTTPS requis).';
    } else if (err.name === 'TypeError') {
      errorMessage = 'API caméra non supportée par ce navigateur. Veuillez mettre à jour votre navigateur.';
    }

    return { granted: false, error: errorMessage };
  }
}

/**
 * 📷 Hook principal pour gérer la caméra
 */
export function useEnhancedCamera(): UseEnhancedCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([]);
  
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * 📝 Ajoute un log de diagnostic (visible sur iPhone)
   */
  const addDiagLog = useCallback((message: string, type: DiagnosticLog['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const log: DiagnosticLog = { timestamp, message, type };
    
    setDiagnosticLogs(prev => {
      const newLogs = [...prev, log];
      // Garder max 50 logs
      if (newLogs.length > 50) {
        newLogs.shift();
      }
      return newLogs;
    });
    
    // Log console aussi
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📝';
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }, []);

  /**
   * 🧹 Efface les logs de diagnostic
   */
  const clearDiagnosticLogs = useCallback(() => {
    setDiagnosticLogs([]);
  }, []);

  /**
   * 🔍 Récupère la liste des caméras disponibles
   */
  const refreshCameras = useCallback(async () => {
    try {
      addDiagLog('🔍 Recherche des caméras disponibles...', 'info');
      
      // Demander les permissions d'abord pour avoir les labels
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()))
        .catch(() => {});
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Caméra ${device.deviceId.substring(0, 5)}`,
          kind: 'videoinput' as const
        }));
      
      addDiagLog(`📷 ${videoDevices.length} caméra(s) trouvée(s)`, 'success');
      videoDevices.forEach((cam, idx) => {
        addDiagLog(`  ${idx + 1}. ${cam.label}`, 'info');
      });
      
      setAvailableCameras(videoDevices);

      // Sélectionner la caméra ARRIÈRE par défaut si aucune n'est sélectionnée
      if (!selectedCameraId && videoDevices.length > 0) {
        // 📷 Stratégie 1 : Chercher dans les labels
        let rearCamera = videoDevices.find(cam =>
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('arrière') ||
          cam.label.toLowerCase().includes('environment')
        );
        
        // 📷 Stratégie 2 : Si pas trouvé, prendre la DERNIÈRE caméra (souvent la caméra arrière)
        // Sur beaucoup d'appareils Android, la caméra arrière est listée en dernier
        if (!rearCamera && videoDevices.length > 1) {
          rearCamera = videoDevices[videoDevices.length - 1];
          addDiagLog('📷 Sélection de la dernière caméra (probablement arrière)', 'info');
        }
        
        const cameraToUse = rearCamera || videoDevices[0];
        setSelectedCameraId(cameraToUse.deviceId);
        
        if (rearCamera && (
          rearCamera.label.toLowerCase().includes('back') ||
          rearCamera.label.toLowerCase().includes('rear') ||
          rearCamera.label.toLowerCase().includes('arrière') ||
          rearCamera.label.toLowerCase().includes('environment')
        )) {
          addDiagLog(`📷 Caméra ARRIÈRE sélectionnée: ${rearCamera.label}`, 'success');
        } else {
          addDiagLog(`⚠️ Caméra sélectionnée: ${cameraToUse.label} (vérifier si c'est la bonne)`, 'warning');
        }
      }
      
    } catch (error) {
      addDiagLog(`❌ Erreur récupération caméras: ${error}`, 'error');
    }
  }, [selectedCameraId, addDiagLog]);

  /**
   * 🎥 Démarre la caméra
   * ✅ Compatible cross-browser avec fallbacks iOS/Android
   */
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Arrêter le stream existant si présent
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      addDiagLog('🎥 Démarrage de la caméra...', 'info');

      // 📱 Détecter le navigateur
      const browser = detectBrowser();
      
      if (browser.isIOS) {
        if (browser.isSafari) {
          addDiagLog('📱 Détecté: Safari iOS', 'info');
        } else if (browser.isChrome) {
          addDiagLog('📱 Détecté: Chrome iOS', 'warning');
          addDiagLog('⚠️ Chrome iOS utilise WebKit (comme Safari)', 'warning');
        } else {
          addDiagLog('📱 Détecté: iOS (autre navigateur)', 'info');
        }
      } else if (browser.isAndroid) {
        addDiagLog('📱 Détecté: Android', 'info');
      } else {
        addDiagLog('💻 Détecté: Desktop', 'info');
      }

      // 🎥 Construire les contraintes - TOUJOURS préférer deviceId si disponible
      let constraints: MediaStreamConstraints;

      if (selectedCameraId) {
        // ✅ MEILLEURE APPROCHE : Utiliser deviceId directement
        addDiagLog(`📷 Utilisation deviceId: ${selectedCameraId}`, 'info');
        
        if (browser.isIOS) {
          // 🍎 iOS : Contraintes SIMPLES - IDEAL au lieu d'EXACT (évite NotReadableError)
          constraints = {
            video: {
              deviceId: { ideal: selectedCameraId }
              // ⚠️ Pas de width/height sur iOS - laisse l'appareil choisir
            },
            audio: false
          };
        } else {
          // 🤖 Android/Desktop : Peut utiliser width/height
          constraints = {
            video: {
              deviceId: { exact: selectedCameraId },
              width: { ideal: environment.CAMERA_IDEAL_WIDTH },
              height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
            },
            audio: false
          };
        }
      } else {
        // Fallback sur facingMode si pas de deviceId
        addDiagLog('📷 Utilisation facingMode (pas de deviceId)', 'warning');
        
        if (browser.isIOS) {
          // 🍎 iOS : IDEAL pour éviter NotReadableError (méthode Welcome.tsx)
          constraints = {
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          };
        } else {
          // Android : ideal pour flexibilité
          constraints = {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: environment.CAMERA_IDEAL_WIDTH },
              height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
            },
            audio: false
          };
        }
      }

      console.log('📋 Contraintes caméra:', constraints, 'Navigateur:', browser);

      // Demander l'accès à la caméra avec retry intelligent sur iOS
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError: unknown) {
        const err = firstError as { name?: string; message?: string };
        
        // 🍎 GESTION SPÉCIALE iOS : Si exact:environment échoue, on essaye plusieurs fallbacks
        if (browser.isIOS && err.name === 'OverconstrainedError') {
          addDiagLog('⚠️ Contraintes exact:environment trop strictes, essai fallback...', 'warning');
          
          try {
            // Tentative 1 : Utiliser 'ideal' au lieu de 'exact'
            const fallbackConstraints1: MediaStreamConstraints = {
              video: {
                facingMode: { ideal: 'environment' }
              },
              audio: false
            };
            addDiagLog('📷 Tentative avec facingMode: ideal...', 'info');
            newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints1);
            addDiagLog('✅ Fallback réussi avec ideal', 'success');
          } catch (secondError) {
            // Tentative 2 : Essayer n'importe quelle caméra
            addDiagLog('⚠️ Tentative avec n\'importe quelle caméra...', 'warning');
            const fallbackConstraints2: MediaStreamConstraints = {
              video: true,
              audio: false
            };
            newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints2);
            addDiagLog('⚠️ Caméra démarrée (possiblement la caméra AVANT)', 'warning');
          }
        } 
        // Si OverconstrainedError sur autre plateforme
        else if (err.name === 'OverconstrainedError') {
          console.warn('⚠️ Contraintes trop strictes, retry avec contraintes minimales...');
          addDiagLog('⚠️ Retry avec contraintes minimales...', 'warning');
          const fallbackConstraints: MediaStreamConstraints = {
            video: selectedCameraId
              ? { deviceId: { ideal: selectedCameraId } }
              : { facingMode: environment.CAMERA_FACING_MODE },
            audio: false
          };
          newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
        // 🍎 iOS : Permission refusée - Message spécifique
        else if (browser.isIOS && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          addDiagLog('❌ Permission caméra REFUSÉE par l\'utilisateur', 'error');
          addDiagLog('💡 SOLUTION iOS :', 'error');
          addDiagLog('  1. Réglages > Safari > Caméra', 'error');
          addDiagLog('  2. Sélectionnez "Demander" ou "Autoriser"', 'error');
          addDiagLog('  3. Rechargez la page', 'error');
          throw firstError;
        }
        // Autres erreurs
        else {
          throw firstError;
        }
      }

      streamRef.current = newStream;
      setStream(newStream);
      setError(null);

      // 🔍 DIAGNOSTIC CRITIQUE: Vérifier quelle caméra a été démarrée
      const videoTracks = newStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        const label = track.label;
        
        addDiagLog('✅ Caméra démarrée avec succès', 'success');
        addDiagLog(`📷 Caméra active: ${label}`, 'info');
        
        // Vérifier le facingMode réel
        if (settings.facingMode) {
          addDiagLog(`📐 Facing mode: ${settings.facingMode}`, 'info');
          
          // 🚨 DÉTECTION DU PROBLÈME iOS : MAUVAISE CAMÉRA DÉMARRÉE
          if (environment.CAMERA_FACING_MODE === 'environment' && settings.facingMode === 'user') {
            addDiagLog('⚠️⚠️⚠️ PROBLÈME CRITIQUE DÉTECTÉ ⚠️⚠️⚠️', 'error');
            addDiagLog('', 'error');
            addDiagLog('🎯 DEMANDÉ : Caméra ARRIÈRE (environment)', 'error');
            addDiagLog(`❌ OBTENU : Caméra AVANT (${settings.facingMode})`, 'error');
            addDiagLog('', 'error');
            addDiagLog('💡 CAUSE : Permission caméra arrière NON accordée', 'error');
            addDiagLog('', 'error');
            addDiagLog('🔧 SOLUTION IMMÉDIATE :', 'error');
            addDiagLog('  Cliquez sur "Forcer permission caméra ARRIÈRE" ci-dessous', 'error');
            addDiagLog('', 'error');
            addDiagLog('📱 SOLUTION PERMANENTE (iOS) :', 'error');
            addDiagLog('  1. Ouvrez Réglages iOS', 'error');
            addDiagLog('  2. Allez dans Safari > Caméra', 'error');
            addDiagLog('  3. Sélectionnez "Demander" ou "Autoriser"', 'error');
            addDiagLog('  4. Rechargez cette page', 'error');
            addDiagLog('', 'error');
            
            // 🚨 Afficher aussi une erreur visuelle pour que l'utilisateur ouvre le diagnostic
            setError('⚠️ Caméra AVANT détectée au lieu de la caméra ARRIÈRE. Ouvrez le diagnostic 🔍 pour la solution.');
          } else if (environment.CAMERA_FACING_MODE === 'user' && settings.facingMode === 'environment') {
            addDiagLog('⚠️ iOS a démarré la caméra arrière au lieu de la caméra avant', 'warning');
          }
        }
        
        // Vérifier les dimensions
        if (settings.width && settings.height) {
          addDiagLog(`📐 Résolution: ${settings.width}x${settings.height}`, 'info');
        }
      }

      // Rafraîchir la liste des caméras après le démarrage
      await refreshCameras();

    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      addDiagLog(`❌ Erreur: ${error.name || 'Unknown'}`, 'error');
      addDiagLog(`   Message: ${error.message}`, 'error');

      let errorMessage = 'Impossible de démarrer la caméra';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra.';
        addDiagLog('💡 Vérifiez les permissions dans les paramètres du navigateur', 'error');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucune caméra détectée.';
        addDiagLog('💡 Vérifiez qu\'une caméra est connectée', 'error');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'La caméra est déjà utilisée par une autre application.';
        addDiagLog('💡 Fermez les autres apps utilisant la caméra', 'error');
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Caméra non compatible avec les paramètres demandés.';
        addDiagLog('💡 Les contraintes sont trop strictes', 'error');
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Accès caméra bloqué (HTTPS requis).';
        addDiagLog('💡 Utilisez HTTPS', 'error');
      }

      setError(errorMessage);
      setStream(null);

    } finally {
      setIsLoading(false);
    }
  }, [selectedCameraId, refreshCameras, addDiagLog]);

  /**
   * 🛑 Arrête la caméra
   */
  const stopCamera = useCallback(() => {
    console.log('🛑 Arrêt de la caméra');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track arrêté:', track.kind, track.label);
      });
      streamRef.current = null;
    }
    
    setStream(null);
    setError(null);
  }, []);

  /**
   * 🔄 Change de caméra
   */
  const switchCamera = useCallback(async (deviceId: string) => {
    console.log('🔄 Changement de caméra vers:', deviceId);
    
    setSelectedCameraId(deviceId);
    
    // Redémarrer la caméra avec le nouveau deviceId
    if (stream) {
      stopCamera();
      // Attendre un peu avant de redémarrer
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Le startCamera sera appelé automatiquement via l'effet
  }, [stream, stopCamera]);

  /**
   * 🧹 Nettoyage au démontage
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    startCamera,
    stopCamera,
    availableCameras,
    selectedCameraId,
    switchCamera,
    refreshCameras,
    diagnosticLogs,
    clearDiagnosticLogs
  };
}


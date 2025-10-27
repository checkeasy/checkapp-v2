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

    if (browser.isIOS && browser.isSafari) {
      // iOS Safari : utiliser des contraintes minimales
      constraints = {
        video: {
          facingMode: environment.CAMERA_FACING_MODE,
          // Pas de width/height sur iOS Safari (peut causer des erreurs)
        }
      };
    } else {
      // Autres navigateurs : contraintes complètes avec 'ideal' (pas 'exact')
      constraints = {
        video: {
          facingMode: environment.CAMERA_FACING_MODE,
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

  } catch (error: any) {
    console.error('❌ Erreur permissions caméra:', error);

    let errorMessage = 'Impossible d\'accéder à la caméra';

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'Aucune caméra détectée sur cet appareil.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'La caméra est déjà utilisée par une autre application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Les paramètres de la caméra ne sont pas supportés par cet appareil.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Accès caméra bloqué pour des raisons de sécurité (HTTPS requis).';
    } else if (error.name === 'TypeError') {
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
  
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * 🔍 Récupère la liste des caméras disponibles
   */
  const refreshCameras = useCallback(async () => {
    try {
      console.log('🔍 Récupération des caméras disponibles...');
      
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
      
      console.log('📷 Caméras trouvées:', videoDevices.length, videoDevices);
      setAvailableCameras(videoDevices);

      // Sélectionner la première caméra si aucune n'est sélectionnée
      if (!selectedCameraId && videoDevices.length > 0) {
        // 📷 MODIFIÉ: Préférer la caméra FRONTALE (user) si disponible
        const frontCamera = videoDevices.find(cam =>
          cam.label.toLowerCase().includes('front') ||
          cam.label.toLowerCase().includes('avant') ||
          cam.label.toLowerCase().includes('user') ||
          cam.label.toLowerCase().includes('face')
        );
        setSelectedCameraId(frontCamera?.deviceId || videoDevices[0].deviceId);
        console.log('📷 Caméra sélectionnée par défaut:', frontCamera ? 'Frontale' : 'Première disponible');
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération caméras:', error);
    }
  }, [selectedCameraId]);

  /**
   * 🎥 Démarre la caméra
   * ✅ Compatible cross-browser avec fallbacks iOS/Android
   */
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🎥 Démarrage de la caméra...', { selectedCameraId });

      // Arrêter le stream existant si présent
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // 📱 Détecter le navigateur
      const browser = detectBrowser();

      // 🎥 Construire les contraintes adaptées au navigateur
      let constraints: MediaStreamConstraints;

      if (selectedCameraId) {
        // Si un deviceId est sélectionné, l'utiliser (préféré sur iOS)
        if (browser.isIOS) {
          // iOS : utiliser 'ideal' au lieu de 'exact' pour éviter les erreurs
          constraints = {
            video: {
              deviceId: { ideal: selectedCameraId },
              // Pas de width/height sur iOS (peut causer OverconstrainedError)
            },
            audio: false
          };
        } else {
          // Android/Desktop : utiliser 'exact' avec fallback
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
        // Pas de deviceId : utiliser facingMode
        if (browser.isIOS && browser.isSafari) {
          // iOS Safari : contraintes minimales
          constraints = {
            video: {
              facingMode: environment.CAMERA_FACING_MODE
            },
            audio: false
          };
        } else {
          // Autres navigateurs : contraintes complètes
          constraints = {
            video: {
              facingMode: environment.CAMERA_FACING_MODE,
              width: { ideal: environment.CAMERA_IDEAL_WIDTH },
              height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
            },
            audio: false
          };
        }
      }

      console.log('📋 Contraintes caméra:', constraints, 'Navigateur:', browser);

      // Demander l'accès à la caméra avec retry sur OverconstrainedError
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError: any) {
        // Si OverconstrainedError, réessayer avec des contraintes minimales
        if (firstError.name === 'OverconstrainedError') {
          console.warn('⚠️ Contraintes trop strictes, retry avec contraintes minimales...');
          const fallbackConstraints: MediaStreamConstraints = {
            video: selectedCameraId
              ? { deviceId: { ideal: selectedCameraId } }
              : { facingMode: environment.CAMERA_FACING_MODE },
            audio: false
          };
          newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } else {
          throw firstError;
        }
      }

      streamRef.current = newStream;
      setStream(newStream);
      setError(null);

      console.log('✅ Caméra démarrée avec succès');

      // Rafraîchir la liste des caméras après le démarrage
      await refreshCameras();

    } catch (err: any) {
      console.error('❌ Erreur démarrage caméra:', err);

      let errorMessage = 'Impossible de démarrer la caméra';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucune caméra détectée.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'La caméra est déjà utilisée par une autre application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Caméra non compatible avec les paramètres demandés.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Accès caméra bloqué (HTTPS requis).';
      }

      setError(errorMessage);
      setStream(null);

    } finally {
      setIsLoading(false);
    }
  }, [selectedCameraId, refreshCameras]);

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
   * 🔄 Effet pour redémarrer la caméra quand le deviceId change
   */
  useEffect(() => {
    if (selectedCameraId && !stream) {
      startCamera();
    }
  }, [selectedCameraId]);

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

  /**
   * 🔍 Charger les caméras au montage
   */
  useEffect(() => {
    refreshCameras();
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
    refreshCameras
  };
}


/**
 * 📷 Hook pour gérer l'accès à la caméra
 * Gère les permissions, la sélection de caméra, et le stream vidéo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { environment } from '@/config/environment';

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export interface CameraPermissionResult {
  granted: boolean;
  error?: string;
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
 */
export async function requestCameraPermissions(): Promise<CameraPermissionResult> {
  try {
    console.log('🔑 Demande d\'autorisation caméra...');
    
    // Demander l'accès à la caméra
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: environment.CAMERA_FACING_MODE,
        width: { ideal: environment.CAMERA_IDEAL_WIDTH },
        height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
      } 
    });
    
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
      errorMessage = 'Les paramètres de la caméra ne sont pas supportés.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Accès caméra bloqué pour des raisons de sécurité (HTTPS requis).';
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
        // Préférer la caméra arrière si disponible
        const backCamera = videoDevices.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('arrière') ||
          cam.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération caméras:', error);
    }
  }, [selectedCameraId]);

  /**
   * 🎥 Démarre la caméra
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
      
      // Construire les contraintes
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : {
              facingMode: environment.CAMERA_FACING_MODE,
              width: { ideal: environment.CAMERA_IDEAL_WIDTH },
              height: { ideal: environment.CAMERA_IDEAL_HEIGHT }
            },
        audio: false
      };
      
      console.log('📋 Contraintes caméra:', constraints);
      
      // Demander l'accès à la caméra
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
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


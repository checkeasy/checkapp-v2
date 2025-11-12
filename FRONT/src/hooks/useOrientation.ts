import { useState, useEffect, useCallback } from 'react';

export type OrientationType = 'portrait' | 'landscape';

interface UseOrientationReturn {
  currentOrientation: OrientationType;
  isPortrait: boolean;
  isLandscape: boolean;
  lockOrientation: (orientation: OrientationType) => Promise<void>;
  unlockOrientation: () => Promise<void>;
}

/**
 * Hook pour détecter et gérer l'orientation de l'appareil
 */
export const useOrientation = (): UseOrientationReturn => {
  const [currentOrientation, setCurrentOrientation] = useState<OrientationType>(() => {
    return getDeviceOrientation();
  });

  // Fonction pour obtenir l'orientation actuelle de l'appareil
  function getDeviceOrientation(): OrientationType {
    // Méthode 1: Screen Orientation API (moderne)
    if (window.screen?.orientation) {
      const type = window.screen.orientation.type;
      return type.includes('landscape') ? 'landscape' : 'portrait';
    }
    
    // Méthode 2: window.orientation (legacy, mais encore utilisé sur iOS)
    if (typeof window.orientation !== 'undefined') {
      const angle = window.orientation;
      return (angle === 90 || angle === -90) ? 'landscape' : 'portrait';
    }
    
    // Méthode 3: Dimensions de la fenêtre (fallback)
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  // Mettre à jour l'orientation quand l'appareil tourne
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = getDeviceOrientation();
      console.log('📱 Changement d\'orientation détecté:', newOrientation);
      setCurrentOrientation(newOrientation);
    };

    // Écouter les changements d'orientation (plusieurs méthodes pour compatibilité)
    
    // Méthode 1: Screen Orientation API
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    // Méthode 2: orientationchange event (legacy)
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Méthode 3: resize event (fallback)
    window.addEventListener('resize', handleOrientationChange);

    // Cleanup
    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Verrouiller l'orientation de l'écran
  const lockOrientation = useCallback(async (orientation: OrientationType) => {
    // 🖥️ Ne verrouiller que sur mobile/tablette (pas sur desktop)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      return; // Skip sur desktop
    }
    
    try {
      // Screen Orientation API
      if (window.screen?.orientation?.lock) {
        const lockType = orientation === 'landscape' 
          ? 'landscape' as OrientationLockType
          : 'portrait' as OrientationLockType;
        
        await window.screen.orientation.lock(lockType);
      }
    } catch (error) {
      // Silencieux: l'API peut échouer sur certains appareils
    }
  }, []);

  // Déverrouiller l'orientation de l'écran
  const unlockOrientation = useCallback(async () => {
    try {
      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock();
        console.log('🔓 Orientation déverrouillée');
      }
    } catch (error) {
      console.error('❌ Erreur lors du déverrouillage de l\'orientation:', error);
    }
  }, []);

  return {
    currentOrientation,
    isPortrait: currentOrientation === 'portrait',
    isLandscape: currentOrientation === 'landscape',
    lockOrientation,
    unlockOrientation
  };
};

/**
 * Hook pour détecter l'orientation d'une image
 */
export const useImageOrientation = (imageUrl: string | undefined): OrientationType | null => {
  const [orientation, setOrientation] = useState<OrientationType | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setOrientation(null);
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      const imageOrientation: OrientationType = img.naturalWidth > img.naturalHeight 
        ? 'landscape' 
        : 'portrait';
      
      console.log('🖼️ Orientation de l\'image détectée:', {
        url: imageUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        orientation: imageOrientation
      });
      
      setOrientation(imageOrientation);
    };

    img.onerror = () => {
      console.error('❌ Erreur chargement image pour détection orientation:', imageUrl);
      setOrientation(null);
    };

    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return orientation;
};


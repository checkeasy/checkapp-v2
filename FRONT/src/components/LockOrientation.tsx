import { useEffect } from 'react';

/**
 * Composant pour verrouiller l'orientation de l'écran en mode portrait
 * Utilise plusieurs méthodes pour assurer la compatibilité maximale
 */
export const LockOrientation: React.FC = () => {
  useEffect(() => {
    // Méthode 1: Screen Orientation API
    const lockScreenOrientation = async () => {
      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('portrait');
          console.log('🔒 Orientation verrouillée en portrait (Screen Orientation API)');
        }
      } catch (error) {
        console.warn('⚠️ Screen Orientation API non disponible ou échec:', error);
        // C'est normal si l'app n'est pas en plein écran ou si le navigateur ne supporte pas
      }
    };

    lockScreenOrientation();

    // Méthode 2: Ajouter un meta tag viewport pour bloquer la rotation
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const originalContent = metaViewport?.getAttribute('content') || '';
    
    if (metaViewport) {
      // Ajouter user-scalable=no pour certains navigateurs mobiles
      const newContent = originalContent.includes('user-scalable')
        ? originalContent
        : `${originalContent}, user-scalable=no`;
      
      metaViewport.setAttribute('content', newContent);
      console.log('🔒 Meta viewport mis à jour pour bloquer la rotation');
    }

    // Méthode 3: CSS pour forcer l'orientation portrait
    const style = document.createElement('style');
    style.id = 'lock-orientation-style';
    style.textContent = `
      @media screen and (orientation: landscape) {
        html {
          transform: rotate(-90deg);
          transform-origin: left top;
          width: 100vh;
          height: 100vw;
          overflow-x: hidden;
          position: absolute;
          top: 100%;
          left: 0;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('🔒 Style CSS ajouté pour forcer l\'orientation portrait');

    // Cleanup
    return () => {
      // Déverrouiller l'orientation
      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock();
        console.log('🔓 Orientation déverrouillée');
      }

      // Restaurer le meta viewport
      if (metaViewport && originalContent) {
        metaViewport.setAttribute('content', originalContent);
        console.log('🔓 Meta viewport restauré');
      }

      // Supprimer le style CSS
      const styleElement = document.getElementById('lock-orientation-style');
      if (styleElement) {
        styleElement.remove();
        console.log('🔓 Style CSS supprimé');
      }
    };
  }, []);

  return null; // Ce composant ne rend rien
};


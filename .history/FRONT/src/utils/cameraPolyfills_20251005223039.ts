/**
 * 📱 Polyfills pour la compatibilité cross-browser de l'API caméra
 * Supporte : Safari iOS, Chrome iOS/Android, Firefox Android, Samsung Internet, Edge mobile
 */

/**
 * 🔍 Détecte le type de navigateur et la plateforme
 */
export function detectBrowser() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSamsungBrowser = /SamsungBrowser/.test(ua);
  const isEdge = /Edg/.test(ua);

  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isSamsungBrowser,
    isEdge,
    isMobile: isIOS || isAndroid
  };
}

/**
 * 📱 Détecte l'orientation de l'appareil
 * Retourne l'angle de rotation nécessaire pour corriger l'orientation
 */
export function getDeviceOrientation(): number {
  // Vérifier si l'API Screen Orientation est disponible
  if (window.screen && (window.screen as any).orientation) {
    const orientation = (window.screen as any).orientation;
    const angle = orientation.angle || 0;
    return angle;
  }

  // Fallback : utiliser window.orientation (déprécié mais encore supporté sur iOS)
  if (typeof (window as any).orientation !== 'undefined') {
    return (window as any).orientation;
  }

  // Fallback : détecter via les dimensions de l'écran
  if (window.innerWidth > window.innerHeight) {
    return 90; // Paysage
  }

  return 0; // Portrait par défaut
}

/**
 * 🔒 Vérifie si l'application est en HTTPS (requis pour l'API caméra)
 */
export function isSecureContext(): boolean {
  // En développement local, http://localhost est considéré comme sécurisé
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  
  // En production, HTTPS est requis
  return window.location.protocol === 'https:' || window.isSecureContext;
}

/**
 * 📷 Polyfill pour navigator.mediaDevices
 * Nécessaire pour Safari iOS < 11 et anciens navigateurs
 */
export function polyfillMediaDevices() {
  // Si navigator.mediaDevices existe déjà, ne rien faire
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✅ navigator.mediaDevices déjà disponible');
    return true;
  }

  console.log('⚠️ Polyfill navigator.mediaDevices nécessaire');

  // Créer navigator.mediaDevices s'il n'existe pas
  if (!navigator.mediaDevices) {
    (navigator as any).mediaDevices = {};
  }

  // Polyfill getUserMedia
  if (!navigator.mediaDevices.getUserMedia) {
    // Essayer les anciennes API
    const getUserMedia = 
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;

    if (getUserMedia) {
      // Wrapper pour convertir l'ancienne API callback en Promise
      navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
        return new Promise((resolve, reject) => {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
      console.log('✅ Polyfill getUserMedia appliqué');
      return true;
    } else {
      console.error('❌ getUserMedia non supporté par ce navigateur');
      return false;
    }
  }

  // Polyfill enumerateDevices
  if (!navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices = async function() {
      console.warn('⚠️ enumerateDevices non supporté, retour d\'une liste vide');
      return [];
    };
  }

  return true;
}

/**
 * 🎨 Polyfill pour canvas.toBlob
 * Nécessaire pour IE11 et anciens navigateurs
 */
export function polyfillCanvasToBlob() {
  if (HTMLCanvasElement.prototype.toBlob) {
    console.log('✅ canvas.toBlob déjà disponible');
    return;
  }

  console.log('⚠️ Polyfill canvas.toBlob nécessaire');

  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: function(callback: BlobCallback, type = 'image/png', quality = 0.92) {
      const canvas = this;
      setTimeout(() => {
        try {
          const dataURL = canvas.toDataURL(type, quality);
          const binStr = atob(dataURL.split(',')[1]);
          const len = binStr.length;
          const arr = new Uint8Array(len);

          for (let i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i);
          }

          callback(new Blob([arr], { type: type || 'image/png' }));
        } catch (error) {
          console.error('❌ Erreur polyfill toBlob:', error);
          callback(null);
        }
      });
    }
  });

  console.log('✅ Polyfill canvas.toBlob appliqué');
}

/**
 * 🔄 Détecte l'orientation d'une image depuis les données EXIF
 */
export function getImageOrientation(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);
      
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1); // Pas un JPEG
        return;
      }
      
      const length = view.byteLength;
      let offset = 2;
      
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(1);
          return;
        }
        
        const marker = view.getUint16(offset, false);
        offset += 2;
        
        if (marker === 0xFFE1) {
          const little = view.getUint16(offset + 8, false) === 0x4949;
          offset += view.getUint16(offset, false);
          
          const tags = view.getUint16(offset, little);
          offset += 2;
          
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              resolve(view.getUint16(offset + (i * 12) + 8, little));
              return;
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      
      resolve(1);
    };
    
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 🔄 Corrige l'orientation d'une image en fonction de l'EXIF
 */
export function correctImageOrientation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  orientation: number
): void {
  const width = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const height = img instanceof HTMLVideoElement ? img.videoHeight : img.height;

  switch (orientation) {
    case 2:
      // Flip horizontal
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      // Rotation 180°
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      // Flip vertical
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      // Flip vertical + rotation 90° sens horaire
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      // Rotation 90° sens horaire
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      // Flip horizontal + rotation 90° sens horaire
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      // Rotation 90° sens anti-horaire
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      // Pas de transformation
      break;
  }
}

/**
 * 📏 Redimensionne une image pour optimiser la mémoire
 */
export function resizeImage(
  canvas: HTMLCanvasElement,
  maxWidth: number = 1920,
  maxHeight: number = 1440
): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;

  // Si l'image est déjà plus petite, ne rien faire
  if (width <= maxWidth && height <= maxHeight) {
    return canvas;
  }

  // Calculer le ratio pour conserver les proportions
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  const newWidth = Math.floor(width * ratio);
  const newHeight = Math.floor(height * ratio);

  // Créer un nouveau canvas redimensionné
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  }

  return resizedCanvas;
}

/**
 * 🚀 Initialise tous les polyfills nécessaires
 */
export function initializeCameraPolyfills(): {
  success: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  console.log('🚀 Initialisation des polyfills caméra...');

  // Vérifier le contexte sécurisé
  if (!isSecureContext()) {
    errors.push('HTTPS requis pour accéder à la caméra. Utilisez https:// au lieu de http://');
  }

  // Appliquer les polyfills
  if (!polyfillMediaDevices()) {
    errors.push('navigator.mediaDevices non supporté par ce navigateur');
  }

  polyfillCanvasToBlob();

  const browser = detectBrowser();
  console.log('📱 Navigateur détecté:', browser);

  if (errors.length === 0) {
    console.log('✅ Tous les polyfills initialisés avec succès');
  } else {
    console.error('❌ Erreurs lors de l\'initialisation des polyfills:', errors);
  }

  return {
    success: errors.length === 0,
    errors
  };
}


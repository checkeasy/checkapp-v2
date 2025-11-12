import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant wrapper pour forcer Weglot à retraduite le contenu
 * quand les routes changent
 */
export const WeglotTranslationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const retranslateTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<MutationObserver | null>(null);
  const lastTranslationTimeRef = useRef<number>(0);

  // Fonction pour retraduite le contenu
  const retranslateContent = () => {
    if (window.Weglot) {
      const storedLanguage = localStorage.getItem('weglot_language') || 'fr';

      try {
        // Méthode 1: Utiliser retranslate() si disponible
        if (window.Weglot.retranslate) {
          window.Weglot.retranslate();
          console.log(`✅ Weglot: Contenu retraduit (retranslate)`);
        }

        // Méthode 2: Utiliser switchTo() pour forcer la langue
        if (window.Weglot.switchTo) {
          window.Weglot.switchTo(storedLanguage);
          console.log(`✅ Weglot: Langue appliquée: ${storedLanguage}`);
        }

        // Méthode 3: Utiliser detectNewContent() pour scanner le DOM
        if (window.Weglot.detectNewContent) {
          window.Weglot.detectNewContent();
          console.log(`✅ Weglot: Nouveau contenu détecté`);
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la retranslation:', error);
      }
    }
  };

  // Quand la route change
  useEffect(() => {
    // Nettoyer le timeout précédent
    if (retranslateTimeoutRef.current) {
      clearTimeout(retranslateTimeoutRef.current);
    }

    const storedLanguage = localStorage.getItem('weglot_language') || 'fr';
    console.log(`🔄 Weglot: Route changée vers ${location.pathname}, langue: ${storedLanguage}`);

    // Délai pour laisser React monter les composants
    retranslateTimeoutRef.current = setTimeout(() => {
      retranslateContent();
    }, 500);

    return () => {
      if (retranslateTimeoutRef.current) {
        clearTimeout(retranslateTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  // MutationObserver pour détecter les changements du DOM
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    // Créer un observer pour détecter les changements du DOM
    observerRef.current = new MutationObserver(() => {
      const now = Date.now();
      // Limiter les retranslations à une par 200ms pour éviter les appels excessifs
      if (now - lastTranslationTimeRef.current > 200) {
        lastTranslationTimeRef.current = now;
        console.log(`🔍 Weglot: Changement du DOM détecté, retranslation...`);
        retranslateContent();
      }
    });

    // Observer les changements du DOM avec plus d'options
    observerRef.current.observe(rootElement, {
      childList: true,
      subtree: true,
      characterData: true, // Détecter les changements de texte
      attributes: true,    // Détecter les changements d'attributs
      characterDataOldValue: true,
      attributeOldValue: true,
    });

    // Retranslater aussi au montage du composant
    setTimeout(() => {
      retranslateContent();
    }, 100);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return <>{children}</>;
};

// Déclarer le type global pour Weglot
declare global {
  interface Window {
    Weglot?: {
      initialize: (config: { api_key: string; [key: string]: any }) => void;
      switchTo: (lang: string) => void;
      getCurrentLanguage: () => string;
      getLanguages: () => string[];
      on?: (event: string, callback: (lang: string) => void) => void;
    };
  }
}


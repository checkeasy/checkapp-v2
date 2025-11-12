import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook pour initialiser et gérer Weglot
 * Gère l'intégration multilingue avec React
 */
export const useWeglot = () => {
  const location = useLocation();

  useEffect(() => {
    // Attendre que Weglot soit disponible (chargé par index.html)
    let attempts = 0;
    const maxAttempts = 100; // 10 secondes max

    const checkWeglot = setInterval(() => {
      attempts++;

      if (window.Weglot && window.Weglot.initialize) {
        clearInterval(checkWeglot);

        try {
          // Initialiser Weglot avec le widget complètement désactivé
          window.Weglot.initialize({
            api_key: 'wg_6be7719df4ec60c9ba79755ad0e8c43d3',
            hideWidget: true, // Désactiver le widget Weglot par défaut
            autoSwitch: false, // Désactiver le changement automatique de langue
            enableTranslationUI: false // Désactiver l'UI de traduction
          });
          console.log('✅ Weglot initialisé avec succès (widget complètement désactivé)');

          // Forcer la suppression du widget Weglot du DOM
          const removeWeglotElements = () => {
            const selectors = [
              '[id^="weglot-"]',
              '[class*="wg-"]',
              '[class*="weglot"]',
              'a[lang]',
              'a[target="_self"][href="#"]'
            ];

            let removedCount = 0;
            selectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                // Vérifier que c'est bien un élément Weglot avant de le supprimer
                if (el.id?.includes('weglot') || el.className?.includes('wg') || el.className?.includes('weglot') || (el.tagName === 'A' && el.getAttribute('lang'))) {
                  el.remove();
                  removedCount++;
                }
              });
            });

            if (removedCount > 0) {
              console.log(`✅ Éléments Weglot supprimés du DOM (${removedCount} éléments)`);
            }
          };

          removeWeglotElements();
          setTimeout(removeWeglotElements, 100);
          setTimeout(removeWeglotElements, 500);

          // Récupérer la langue stockée et l'appliquer
          const storedLanguage = localStorage.getItem('weglot_language') || 'fr';
          if (window.Weglot.switchTo) {
            setTimeout(() => {
              window.Weglot.switchTo(storedLanguage);
              console.log(`✅ Langue initiale appliquée: ${storedLanguage}`);
            }, 500);
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'initialisation de Weglot:', error);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkWeglot);
        console.warn('⚠️ Weglot n\'a pas pu être initialisé après 10 secondes');
      }
    }, 100);

    return () => {
      clearInterval(checkWeglot);
    };
  }, []);

  // Appliquer la langue quand la route change
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const supportedLanguages = ['en', 'fr', 'es', 'de', 'pt', 'ar'];
    const detectedLang = pathSegments[0];

    if (supportedLanguages.includes(detectedLang)) {
      // Stocker la langue détectée
      localStorage.setItem('weglot_language', detectedLang);
      sessionStorage.setItem('weglot_language', detectedLang);

      // Appliquer la langue dans Weglot
      if (window.Weglot && window.Weglot.switchTo) {
        setTimeout(() => {
          window.Weglot.switchTo(detectedLang);
          console.log(`🌍 Langue changée en: ${detectedLang}`);
        }, 100);
      }
    } else {
      // Si pas de préfixe de langue, utiliser la langue stockée ou la langue par défaut
      const storedLanguage = localStorage.getItem('weglot_language') || 'fr';

      if (window.Weglot && window.Weglot.switchTo) {
        setTimeout(() => {
          window.Weglot.switchTo(storedLanguage);
          console.log(`🌍 Langue appliquée (stockée): ${storedLanguage}`);
        }, 100);
      }
    }
  }, [location.pathname]);

  // Ajouter un MutationObserver pour supprimer le widget Weglot s'il réapparaît
  useEffect(() => {
    const removeWeglotElements = () => {
      const selectors = [
        '[id^="weglot-"]',
        '[class*="wg-"]',
        '[class*="weglot"]',
        'a[lang]',
        'a[target="_self"][href="#"]'
      ];

      let removedCount = 0;
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          // Vérifier que c'est bien un élément Weglot avant de le supprimer
          if (el.id?.includes('weglot') || el.className?.includes('wg') || el.className?.includes('weglot') || (el.tagName === 'A' && el.getAttribute('lang'))) {
            el.remove();
            removedCount++;
          }
        });
      });

      return removedCount;
    };

    const observer = new MutationObserver(() => {
      const removed = removeWeglotElements();
      if (removed > 0) {
        console.log(`🧹 Éléments Weglot supprimés (réapparition détectée): ${removed} éléments`);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => observer.disconnect();
  }, []);
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


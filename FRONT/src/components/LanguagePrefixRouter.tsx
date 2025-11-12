import React, { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

/**
 * Composant wrapper pour gérer les routes avec préfixe de langue
 * Redirige les routes avec préfixe de langue vers les routes sans préfixe
 * Exemple: /en/welcome → /welcome
 *
 * Aussi stocke la langue sélectionnée pour Weglot
 */
export const LanguagePrefixRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // Extraire le préfixe de langue de l'URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const supportedLanguages = ['en', 'fr', 'es', 'de', 'pt', 'ar'];

  const languagePrefix = pathSegments[0];
  const isLanguagePrefix = supportedLanguages.includes(languagePrefix);

  // Stocker la langue dans localStorage et sessionStorage pour Weglot
  useEffect(() => {
    if (isLanguagePrefix) {
      // Stocker la langue sélectionnée
      localStorage.setItem('weglot_language', languagePrefix);
      sessionStorage.setItem('weglot_language', languagePrefix);

      // Essayer de changer la langue dans Weglot si disponible
      if (window.Weglot && window.Weglot.switchTo) {
        try {
          window.Weglot.switchTo(languagePrefix);
          console.log(`✅ Langue Weglot changée en: ${languagePrefix}`);
        } catch (error) {
          console.warn(`⚠️ Impossible de changer la langue Weglot: ${error}`);
        }
      }
    }
  }, [isLanguagePrefix, languagePrefix]);

  // Si l'URL a un préfixe de langue, rediriger sans le préfixe
  if (isLanguagePrefix && pathSegments.length > 1) {
    const pathWithoutLanguage = '/' + pathSegments.slice(1).join('/');
    const search = location.search;
    const hash = location.hash;

    return <Navigate to={pathWithoutLanguage + search + hash} replace />;
  }

  // Si l'URL est juste /en ou /fr, rediriger vers /
  if (isLanguagePrefix && pathSegments.length === 1) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};


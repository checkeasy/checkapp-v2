import { useLocation } from 'react-router-dom';

/**
 * Hook pour extraire la langue du préfixe d'URL
 * Exemple: /en/welcome → 'en'
 */
export const useLanguagePrefix = () => {
  const location = useLocation();
  
  // Extraire le préfixe de langue de l'URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const supportedLanguages = ['en', 'fr', 'es', 'de', 'pt', 'ar'];
  
  const languagePrefix = pathSegments[0];
  const isLanguagePrefix = supportedLanguages.includes(languagePrefix);
  
  return {
    language: isLanguagePrefix ? languagePrefix : 'fr', // Français par défaut
    isLanguagePrefix,
    pathWithoutLanguage: isLanguagePrefix 
      ? '/' + pathSegments.slice(1).join('/') 
      : location.pathname,
  };
};


import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🌍' }, // Utiliser un globe pour l'arabe au lieu du drapeau saoudien
];

export const LanguageSwitcher: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('fr');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Récupérer la langue actuelle de Weglot
    if (window.Weglot && window.Weglot.getCurrentLanguage) {
      const lang = window.Weglot.getCurrentLanguage();
      setCurrentLanguage(lang);
      console.log(`📍 Langue actuelle: ${lang}`);
    } else {
      // Si Weglot n'est pas disponible, utiliser la langue stockée ou le français par défaut
      const storedLanguage = localStorage.getItem('weglot_language') || 'fr';
      setCurrentLanguage(storedLanguage);
      console.log(`📍 Langue par défaut (stockée): ${storedLanguage}`);
    }
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    if (!window.Weglot || !window.Weglot.switchTo) {
      console.error('❌ Weglot n\'est pas disponible');
      return;
    }

    setIsLoading(true);
    console.log(`🔄 Changement de langue vers: ${languageCode}`);

    try {
      // Sauvegarder la préférence de langue
      localStorage.setItem('weglot_language', languageCode);
      sessionStorage.setItem('weglot_language', languageCode);

      // Changer la langue dans Weglot
      window.Weglot.switchTo(languageCode);
      setCurrentLanguage(languageCode);

      // Forcer Weglot à scanner le DOM pour les nouveaux éléments
      setTimeout(() => {
        if (window.Weglot && window.Weglot.detectNewContent) {
          window.Weglot.detectNewContent();
          console.log(`✅ Nouveau contenu détecté et traduit en: ${languageCode}`);
        }
        setIsLoading(false);
      }, 100);

      console.log(`✅ Langue changée en: ${languageCode}`);
    } catch (error) {
      console.error('❌ Erreur lors du changement de langue:', error);
      setIsLoading(false);
    }
  };

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-accent transition-colors z-50 relative"
          disabled={isLoading}
          title={`Changer la langue / Change language / Cambiar idioma`}
        >
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
            {currentLang?.flag} {currentLang?.code.toUpperCase()}
          </span>
          {/* Afficher seulement le drapeau en mobile */}
          <span className="text-sm sm:hidden">
            {currentLang?.flag}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[9999]">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${
              currentLanguage === language.code ? 'bg-primary/10' : ''
            }`}
          >
            <span className="mr-2 text-lg">{language.flag}</span>
            <span className="flex-1">{language.nativeName}</span>
            {currentLanguage === language.code && (
              <span className="ml-2 text-primary font-bold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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


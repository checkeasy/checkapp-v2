/**
 * 🏠 Property Data Helpers
 * 
 * Utilitaires pour extraire et formater les données du logement depuis l'API
 */

export interface PropertyData {
  address: string;
  wifi: {
    network: string;
    password: string;
  };
  parking: string;
  access: string;
  airbnbLink: string;
  checkIn: string;
  checkOut: string;
  visibleSections: string[];  // ✅ AJOUTÉ - Sections à afficher
}

/**
 * Extrait les données du logement depuis les rawData de l'API
 * 
 * @param rawData - Les données brutes de l'API (ParcoursData.rawData)
 * @returns PropertyData formaté pour l'affichage
 */
export function extractPropertyDataFromRawData(rawData: any): PropertyData {
  console.log('🏠 Extraction des données du logement depuis rawData:', rawData);

  if (!rawData) {
    console.warn('⚠️ rawData est null ou undefined, utilisation des données par défaut');
    return getDefaultPropertyData();
  }

  // Extraire les données du logement depuis rawData
  const address = rawData.logementAdress || '';
  const wifiName = rawData.logementWifiName || '';
  const wifiPassword = rawData.logementWifiPassword || '';
  const parking = rawData.logementInfoParking || '';
  const entrance = rawData.logementInfoEntrance || '';
  const entranceHour = rawData.logementEntranceHour || '15:00';  // ✅ AJOUTÉ - Heure d'entrée
  const exitHour = rawData.logementExitHour || '11:00';           // ✅ AJOUTÉ - Heure de sortie

  // ✅ NOUVEAU - Parser les sections visibles depuis logementContentview
  // Distinction importante :
  // - undefined = champ absent → afficher tout (rétrocompatibilité)
  // - "" = champ vide → ne rien afficher (volontaire)
  const contentViewRaw = rawData.logementContentview;
  const visibleSections = parseVisibleSections(contentViewRaw);

  console.log('📊 Données extraites:', {
    address,
    wifiName,
    wifiPassword: wifiPassword ? '***' : '(vide)',
    parking,
    entrance,
    entranceHour,
    exitHour,
    visibleSections
  });

  return {
    address: address || 'Adresse non renseignée',
    wifi: {
      network: wifiName || 'Réseau WiFi non renseigné',
      password: wifiPassword || 'Mot de passe non renseigné'
    },
    parking: parking || 'Informations de parking non renseignées',
    access: entrance || 'Informations d\'accès non renseignées',
    airbnbLink: '', // Pas dans l'API pour le moment
    checkIn: entranceHour,  // ✅ UTILISE LA VALEUR DE L'API
    checkOut: exitHour,      // ✅ UTILISE LA VALEUR DE L'API
    visibleSections          // ✅ AJOUTÉ - Sections à afficher
  };
}

/**
 * Parse la chaîne logementContentview et retourne un tableau des sections visibles
 * 
 * Mapping des valeurs API vers les clés internes :
 * - "Adresse" → "adresse"
 * - "Wi-Fi" ou "WiFi" → "wifi"
 * - "Se garer" → "parking"
 * - "Comment rentrer" → "access"
 * - "Lien de l'annonce" → "airbnb"
 * - "Check-in / Check-out" ou "Check-in/out" → "checkin-checkout"
 * 
 * @param contentView - Chaîne du type "Check-in/out, WiFi, Adresse" ou undefined
 * @returns Tableau normalisé des sections visibles
 * 
 * Comportement :
 * - undefined (champ absent) → Toutes les sections (rétrocompatibilité)
 * - "" (champ vide) → Aucune section
 * - "WiFi, Adresse" → Seulement WiFi et Adresse
 */
export function parseVisibleSections(contentView: string | undefined): string[] {
  // ✅ DISTINCTION IMPORTANTE:
  // undefined = champ absent de l'API → afficher TOUT (rétrocompatibilité avec anciens parcours)
  if (contentView === undefined) {
    console.log('🔍 logementContentview absent → Affichage de toutes les sections (rétrocompatibilité)');
    return ['adresse', 'wifi', 'parking', 'access', 'airbnb', 'checkin-checkout'];
  }

  // "" = champ présent mais vide → ne RIEN afficher (choix volontaire)
  if (contentView === '' || contentView.trim() === '') {
    console.log('🔍 logementContentview vide → Aucune section affichée');
    return [];
  }

  const sections = contentView.split(',').map(s => s.trim().toLowerCase());
  const normalized: string[] = [];

  sections.forEach(section => {
    // Normaliser les variations possibles
    if (section.includes('adresse')) {
      normalized.push('adresse');
    } else if (section.includes('wi-fi') || section.includes('wifi')) {
      normalized.push('wifi');
    } else if (section.includes('garer') || section.includes('parking')) {
      normalized.push('parking');
    } else if (section.includes('rentrer') || section.includes('accès') || section.includes('acces')) {
      normalized.push('access');
    } else if (section.includes('annonce') || section.includes('airbnb') || section.includes('lien')) {
      normalized.push('airbnb');
    } else if (section.includes('check-in') || section.includes('check-out') || section.includes('horaire')) {
      normalized.push('checkin-checkout');
    }
  });

  console.log('🔍 Sections visibles parsées:', { original: contentView, normalized });
  return normalized;
}

/**
 * Retourne les données par défaut quand aucune donnée n'est disponible
 */
export function getDefaultPropertyData(): PropertyData {
  return {
    address: 'Adresse non disponible',
    wifi: {
      network: 'Réseau WiFi non configuré',
      password: 'Mot de passe non disponible'
    },
    parking: 'Informations de parking non disponibles',
    access: 'Informations d\'accès non disponibles',
    airbnbLink: '',
    checkIn: '15:00',
    checkOut: '11:00',
    visibleSections: ['adresse', 'wifi', 'parking', 'access', 'airbnb', 'checkin-checkout'] // Toutes par défaut
  };
}


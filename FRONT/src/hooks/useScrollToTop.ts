/**
 * 🎣 useScrollToTop Hook
 *
 * Hook qui scroll automatiquement vers le haut de la page à chaque changement de route.
 * Utile pour les applications mobiles où on veut toujours voir le contenu depuis le début.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Scroll vers le haut avec un petit délai pour laisser le DOM se mettre à jour
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
}

/**
 * 🎣 useScrollToTopOnChange Hook
 *
 * Hook qui scroll vers le haut quand une dépendance change.
 * Utile pour les changements d'étape/pièce dans la même page.
 *
 * @param dependencies - Tableau de dépendances (ex: [currentPieceId, currentTaskIndex])
 */
export function useScrollToTopOnChange(dependencies: any[]) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, dependencies);
}


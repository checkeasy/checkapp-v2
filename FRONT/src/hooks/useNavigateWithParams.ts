/**
 * 🎣 useNavigateWithParams Hook
 * 
 * Hook wrapper pour navigate() qui préserve automatiquement les paramètres URL.
 * 
 * Garantit que les paramètres 'parcours' et 'checkid' sont toujours préservés
 * lors de la navigation, évitant ainsi la perte de contexte.
 * 
 * @returns Fonction navigate qui préserve les paramètres
 */

import { useNavigate, useLocation } from 'react-router-dom';

export function useNavigateWithParams() {
  const navigate = useNavigate();
  const location = useLocation();

  return (path: string, options?: { replace?: boolean; state?: any }) => {
    const urlParams = new URLSearchParams(location.search);
    const parcours = urlParams.get('parcours');
    const checkid = urlParams.get('checkid');

    const newParams = new URLSearchParams();
    if (parcours) newParams.set('parcours', parcours);
    if (checkid) newParams.set('checkid', checkid);

    const fullPath = newParams.toString() ? `${path}?${newParams.toString()}` : path;

    console.log(`🧭 [useNavigateWithParams] Navigation: ${location.pathname} → ${fullPath}`);

    navigate(fullPath, options);
  };
}


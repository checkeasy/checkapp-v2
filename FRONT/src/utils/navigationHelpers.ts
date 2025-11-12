import { NavigateFunction } from 'react-router-dom';

/**
 * Navigate to a new path while preserving URL query parameters (parcours and checkid)
 *
 * 🎯 FIX CRITIQUE: Ajout du paramètre 'mode' pour distinguer nouveau parcours vs reprise
 *
 * @param navigate - React Router's navigate function
 * @param path - The destination path (e.g., '/checkout', '/exit-questions')
 * @param checkId - Optional checkId to override the current one in URL params
 * @param mode - 'new' for new journey (don't preserve checkId) or 'resume' for resuming (default)
 *
 * @example
 * // Resume existing journey - preserve checkId
 * navigatePreservingParams(navigate, '/checkout', currentCheckId, 'resume');
 *
 * // Start new journey - don't preserve old checkId
 * navigatePreservingParams(navigate, '/checkout', null, 'new');
 *
 * // Override checkId param
 * navigatePreservingParams(navigate, '/checkout', 'new-check-id-123');
 */
export const navigatePreservingParams = (
  navigate: NavigateFunction,
  path: string,
  checkId?: string | null,
  mode: 'new' | 'resume' = 'resume'
): void => {
  const searchParams = new URLSearchParams(window.location.search);

  // Preserve parcours parameter
  const parcours = searchParams.get('parcours');

  // 🎯 FIX CRITIQUE: Gérer le checkId selon le mode
  let finalCheckId: string | null = null;

  if (mode === 'resume') {
    // Mode reprise: utiliser le checkId fourni ou préserver l'existant
    finalCheckId = checkId !== undefined ? checkId : searchParams.get('checkid');
  } else if (mode === 'new') {
    // Mode nouveau: utiliser UNIQUEMENT le checkId fourni (ne pas préserver l'ancien)
    finalCheckId = checkId || null;
  }

  // Build new search params
  const newSearchParams = new URLSearchParams();

  if (parcours) {
    newSearchParams.set('parcours', parcours);
  }

  if (finalCheckId) {
    newSearchParams.set('checkid', finalCheckId);
  }

  // Navigate with preserved params
  const searchString = newSearchParams.toString();
  const fullPath = searchString ? `${path}?${searchString}` : path;

  console.log('🧭 Navigation:', {
    path,
    mode,
    checkId: finalCheckId,
    fullPath
  });

  navigate(fullPath);
};


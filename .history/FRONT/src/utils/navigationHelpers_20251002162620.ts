import { NavigateFunction } from 'react-router-dom';

/**
 * Navigate to a new path while preserving URL query parameters (parcours and checkid)
 * 
 * @param navigate - React Router's navigate function
 * @param path - The destination path (e.g., '/checkout', '/exit-questions')
 * @param checkId - Optional checkId to override the current one in URL params
 * 
 * @example
 * // Preserve existing params
 * navigatePreservingParams(navigate, '/checkout');
 * 
 * // Override checkId param
 * navigatePreservingParams(navigate, '/checkout', 'new-check-id-123');
 */
export const navigatePreservingParams = (
  navigate: NavigateFunction,
  path: string,
  checkId?: string | null
): void => {
  const searchParams = new URLSearchParams(window.location.search);
  
  // Preserve parcours parameter
  const parcours = searchParams.get('parcours');
  
  // Use provided checkId or preserve existing one
  const finalCheckId = checkId !== undefined ? checkId : searchParams.get('checkid');
  
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
  
  navigate(fullPath);
};


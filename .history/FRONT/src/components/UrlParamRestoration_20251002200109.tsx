/**
 * 🔗 URL Parameter Restoration Component
 * 
 * Ensures URL parameters are restored on page refresh
 * Must be rendered at the app level, inside BrowserRouter
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { urlPersistenceService } from '@/services/urlPersistenceService';

export const UrlParamRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔗 UrlParamRestoration: Component mounted');
    
    // Initialize the URL persistence service
    urlPersistenceService.initialize();

    // Get current state
    const state = urlPersistenceService.getCurrentState();
    console.log('📊 URL Param State:', state);

    // If we're missing params and can restore them, do it
    if (!state.hasParcoursInUrl || !state.hasCheckidInUrl) {
      if (state.canRestore) {
        console.log('🔄 Attempting to restore missing URL params...');
        
        // The service will restore params via history.replaceState
        const restored = urlPersistenceService.restoreUrlParamsIfMissing();
        
        if (restored) {
          console.log('✅ URL params restored successfully');
          
          // Force a re-render by updating location
          // This ensures React Router picks up the new params
          const newSearch = window.location.search;
          if (newSearch !== location.search) {
            navigate(location.pathname + newSearch, { replace: true });
          }
        }
      } else {
        console.log('ℹ️ No saved params available to restore');
      }
    } else {
      console.log('✅ All URL params present');
    }
  }, []); // Run only once on mount

  // This component doesn't render anything
  return null;
};


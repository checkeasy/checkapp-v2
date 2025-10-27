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

    // 🎯 CRITICAL FIX: Check if user wants a NEW session
    // If URL has parcours but NO checkid, user wants to start fresh
    const urlParams = new URLSearchParams(window.location.search);
    const hasParcours = !!urlParams.get('parcours');
    const hasCheckid = !!urlParams.get('checkid');

    if (hasParcours && !hasCheckid) {
      console.log('🆕 NEW SESSION: URL has parcours but no checkid');
      console.log('   → Not restoring checkid, user wants to start fresh');
      return; // Exit early, don't restore anything
    }

    // If we're missing params and can restore them, do it
    // This only happens when URL has NO params at all (page refresh on non-welcome page)
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


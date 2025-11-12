/**
 * 🔗 URL Parameter Restoration Component
 * 
 * Ensures URL parameters are restored on page refresh
 * Must be rendered at the app level, inside BrowserRouter
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { urlPersistenceService } from '@/services/urlPersistenceService';

export const UrlParamRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [restorationAttempts, setRestorationAttempts] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const maxAttempts = 3;

  useEffect(() => {
    // Éviter les tentatives multiples simultanées
    if (isRestoring || restorationAttempts >= maxAttempts) {
      return;
    }

    console.log('🔗 UrlParamRestoration: Component mounted', {
      attempt: restorationAttempts + 1,
      maxAttempts,
      currentPath: location.pathname,
      currentSearch: location.search
    });

    setIsRestoring(true);

    // Initialize the URL persistence service with enhanced error handling
    try {
      urlPersistenceService.initialize();
    } catch (error) {
      console.error('❌ UrlParamRestoration: Erreur initialisation service:', error);
      setIsRestoring(false);
      return;
    }

    // Get current state with validation
    const state = urlPersistenceService.getCurrentState();
    console.log('📊 URL Param State:', {
      ...state,
      attempt: restorationAttempts + 1
    });

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

    // 🎯 ENHANCED RESTORATION LOGIC: Validation et retry
    const attemptRestoration = async () => {
      try {
        // If we're missing params and can restore them, do it
        if (!state.hasParcoursInUrl || !state.hasCheckidInUrl) {
          if (state.canRestore) {
            console.log('🔄 Attempting to restore missing URL params...', {
              hasParcoursInUrl: state.hasParcoursInUrl,
              hasCheckidInUrl: state.hasCheckidInUrl,
              canRestore: state.canRestore
            });

            // The service will restore params via history.replaceState
            const restored = urlPersistenceService.restoreUrlParamsIfMissing();

            if (restored) {
              console.log('✅ URL params restored successfully');

              // Wait a bit for the URL to be updated
              await new Promise(resolve => setTimeout(resolve, 100));

              // Force a re-render by updating location
              // This ensures React Router picks up the new params
              const newSearch = window.location.search;
              if (newSearch !== location.search) {
                console.log('🔄 Navigating to updated URL:', location.pathname + newSearch);
                navigate(location.pathname + newSearch, { replace: true });
              }
            } else {
              console.log('⚠️ URL params restoration failed');
              
              // Retry si on n'a pas atteint le max
              if (restorationAttempts < maxAttempts - 1) {
                console.log('🔄 Retrying URL restoration in 1s...');
                setTimeout(() => {
                  setRestorationAttempts(prev => prev + 1);
                  setIsRestoring(false);
                }, 1000);
                return;
              }
            }
          } else {
            console.log('ℹ️ No saved params available to restore');
          }
        } else {
          console.log('✅ All URL params present');
        }
        
      } catch (error) {
        console.error('❌ UrlParamRestoration: Erreur during restoration:', error);
        
        // Retry en cas d'erreur
        if (restorationAttempts < maxAttempts - 1) {
          console.log('🔄 Retrying after error in 1s...');
          setTimeout(() => {
            setRestorationAttempts(prev => prev + 1);
            setIsRestoring(false);
          }, 1000);
          return;
        }
      } finally {
        setIsRestoring(false);
      }
    };

    attemptRestoration();
  }, [location.pathname, location.search, restorationAttempts, isRestoring]); // Dependencies for proper re-runs

  // This component doesn't render anything
  return null;
};


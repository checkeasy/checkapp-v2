/**
 * 🔄 Route Restoration Component
 *
 * Ensures the correct route is restored after page refresh
 * Prevents unwanted redirects to /welcome
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

export const RouteRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);

  useEffect(() => {
    // Wait for authentication to be restored before attempting route restoration
    if (!isAuthenticated || hasAttemptedRestore) {
      return;
    }

    console.log('🔄 RouteRestoration: Component mounted', {
      currentPath: location.pathname,
      currentSearch: location.search,
      isAuthenticated
    });

    // Get saved path from localStorage
    const savedPath = localStorage.getItem('checkeasy_last_path');
    const savedParams = localStorage.getItem('checkeasy_url_params');

    if (!savedPath) {
      console.log('ℹ️ RouteRestoration: No saved path to restore');
      setHasAttemptedRestore(true);
      return;
    }

    const currentPath = location.pathname;
    const currentSearch = location.search;

    // If we're on /welcome but should be on a different route
    if (currentPath === '/welcome' && savedPath !== '/welcome') {
      console.log('🔄 RouteRestoration: Detected redirect to /welcome, restoring saved path:', savedPath);
      
      // Parse saved params
      let params = '';
      if (savedParams) {
        try {
          const parsedParams = JSON.parse(savedParams);
          const urlParams = new URLSearchParams();
          
          if (parsedParams.parcours) {
            urlParams.set('parcours', parsedParams.parcours);
          }
          
          // Also check for checkid in localStorage
          const activeCheckId = localStorage.getItem('activeCheckId');
          if (activeCheckId) {
            urlParams.set('checkid', activeCheckId);
          }
          
          params = urlParams.toString();
        } catch (error) {
          console.error('❌ RouteRestoration: Error parsing saved params:', error);
        }
      }
      
      const targetUrl = params ? `${savedPath}?${params}` : savedPath;
      console.log('✅ RouteRestoration: Navigating to:', targetUrl);

      setHasAttemptedRestore(true);
      navigate(targetUrl, { replace: true });
    } else if (currentPath !== '/welcome') {
      // We're on the correct route, just ensure params are present
      console.log('✅ RouteRestoration: Already on correct route:', currentPath);

      // If params are missing, restore them
      if (!currentSearch && savedParams) {
        try {
          const parsedParams = JSON.parse(savedParams);
          const urlParams = new URLSearchParams();

          if (parsedParams.parcours) {
            urlParams.set('parcours', parsedParams.parcours);
          }

          const activeCheckId = localStorage.getItem('activeCheckId');
          if (activeCheckId) {
            urlParams.set('checkid', activeCheckId);
          }

          const params = urlParams.toString();
          if (params) {
            const targetUrl = `${currentPath}?${params}`;
            console.log('🔄 RouteRestoration: Adding missing params:', targetUrl);
            navigate(targetUrl, { replace: true });
          }
        } catch (error) {
          console.error('❌ RouteRestoration: Error restoring params:', error);
        }
      }

      setHasAttemptedRestore(true);
    } else {
      // We're on /welcome and that's where we should be
      setHasAttemptedRestore(true);
    }
  }, [isAuthenticated, hasAttemptedRestore, location.pathname, location.search, navigate]);

  // This component doesn't render anything
  return null;
};


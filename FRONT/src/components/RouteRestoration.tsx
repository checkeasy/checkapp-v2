/**
 * 🔄 Route Restoration Component
 *
 * Ensures the correct route is restored after page refresh
 * Prevents unwanted redirects to /welcome
 *
 * 🆕 REFACTORISÉ: Utilise NavigationStateManager pour la logique de navigation
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { navigationStateManager } from '@/services/navigationStateManager';
import { checkSessionManager } from '@/services/checkSessionManager';

export const RouteRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);
  const [restorationAttempts, setRestorationAttempts] = useState(0);
  const maxRestorationAttempts = 3;

  useEffect(() => {
    console.log('🔄 RouteRestoration: useEffect triggered', {
      currentPath: location.pathname,
      currentSearch: location.search,
      isAuthenticated,
      hasAttemptedRestore,
      restorationAttempts,
      maxRestorationAttempts
    });

    // Wait for authentication to be restored before attempting route restoration
    if (!isAuthenticated) {
      console.log('⏳ RouteRestoration: Waiting for authentication...');
      return;
    }
    
    if (hasAttemptedRestore) {
      console.log('⏭️ RouteRestoration: Already attempted restore, skipping');
      return;
    }
    
    if (restorationAttempts >= maxRestorationAttempts) {
      console.log('🛑 RouteRestoration: Max attempts reached, stopping');
      return;
    }

    console.log('🔄 RouteRestoration: Starting restoration process', {
      currentPath: location.pathname,
      currentSearch: location.search,
      isAuthenticated,
      attempt: restorationAttempts + 1,
      maxAttempts: maxRestorationAttempts
    });

    // 🆕 REFACTORISÉ: Utiliser navigationStateManager pour extraire les paramètres
    const urlParams = navigationStateManager.extractUrlParams(location.search);
    const hasParcours = !!urlParams.parcoursId;
    const hasCheckid = !!urlParams.checkId;

    if (hasParcours && !hasCheckid) {
      console.log('🆕 NEW SESSION: URL has parcours but no checkid');
      console.log('   → User wants to start fresh, NOT restoring previous route');
      setHasAttemptedRestore(true);
      return; // Exit early, don't restore anything
    }

    // Get saved path from localStorage with validation
    const savedPath = localStorage.getItem('checkeasy_last_path');
    const savedParams = localStorage.getItem('checkeasy_url_params');
    const activeCheckId = localStorage.getItem('activeCheckId');

    // 🎯 ENHANCED VALIDATION: Vérifier la cohérence des données sauvegardées
    let parsedSavedParams = null;
    try {
      if (savedParams) {
        parsedSavedParams = JSON.parse(savedParams);
        
        // Vérifier l'expiration (24h)
        const now = Date.now();
        const savedTimestamp = parsedSavedParams.timestamp || 0;
        const ageHours = (now - savedTimestamp) / (1000 * 60 * 60);
        
        if (ageHours > 24) {
          console.log('⚠️ RouteRestoration: Données sauvegardées expirées (>24h)');
          localStorage.removeItem('checkeasy_url_params');
          localStorage.removeItem('checkeasy_last_path');
          setHasAttemptedRestore(true);
          return;
        }
      }
    } catch (error) {
      console.error('❌ RouteRestoration: Erreur parsing savedParams:', error);
      localStorage.removeItem('checkeasy_url_params');
    }

    if (!savedPath && !activeCheckId) {
      console.log('ℹ️ RouteRestoration: No saved path or active checkId to restore');
      setHasAttemptedRestore(true);
      return;
    }

    const currentPath = location.pathname;
    const currentSearch = location.search;

    // 🎯 ENHANCED LOGGING: Logs détaillés pour debugging
    console.log('📊 RouteRestoration: État de restauration:', {
      savedPath,
      currentPath,
      activeCheckId,
      hasSavedParams: !!parsedSavedParams,
      currentSearch,
      attempt: restorationAttempts + 1
    });

    console.log('🔍 RouteRestoration: Checking redirection conditions:', {
      currentPath,
      hasCheckid,
      savedPath,
      activeCheckId,
      shouldRedirect: currentPath === '/welcome' && hasCheckid
    });

    // 🎯 CRITICAL FIX: Redirect from /welcome if URL has checkid
    // This means user wants to restore an existing session
    if (currentPath === '/welcome' && hasCheckid) {
      console.log('✅ RouteRestoration: Conditions met! Attempting restoration:', {
        savedPath,
        hasCheckid,
        activeCheckId
      });

      // 🆕 REFACTORISÉ: Utiliser NavigationStateManager pour déterminer la route correcte
      const checkAndRestore = async () => {
        // Incrémenter le compteur de tentatives
        setRestorationAttempts(prev => prev + 1);

        let finalPath = savedPath;
        let sessionValidated = false;
        let validatedSession = null; // 🆕 Stocker la session pour éviter de la récupérer deux fois

        // 🎯 ÉTAPE 1: Valider la session si activeCheckId existe
        if (activeCheckId) {
          try {
            const session = await checkSessionManager.getCheckSession(activeCheckId);

            if (!session) {
              console.warn('⚠️ RouteRestoration: Session non trouvée, nettoyage localStorage');
              localStorage.removeItem('activeCheckId');
              localStorage.removeItem('checkeasy_last_path');
              localStorage.removeItem('checkeasy_url_params');
              setHasAttemptedRestore(true);
              return;
            }

            sessionValidated = true;
            validatedSession = session; // 🆕 Stocker la session
            console.log('✅ RouteRestoration: Session validée:', {
              checkId: session.checkId,
              flowType: session.flowType,
              status: session.status,
              hasProgress: !!session.progress?.currentPieceId,
              rapportID: session.rapportID
            });

            // 🆕 FIX: Ne pas forcer la redirection si savedPath est valide
            // Vérifier si le savedPath est autorisé pour cette session
            if (savedPath && navigationStateManager.isRouteAllowed(savedPath, session)) {
              finalPath = savedPath;
              console.log('✅ RouteRestoration: savedPath est autorisé, conservation:', {
                savedPath,
                sessionStatus: session.status,
                flowType: session.flowType
              });
            } else {
              // Si savedPath n'est pas autorisé, utiliser NavigationStateManager
              finalPath = navigationStateManager.getCorrectRouteForSession(session);
              console.log('🎯 RouteRestoration: savedPath non autorisé, route déterminée par NavigationStateManager:', {
                savedPath,
                finalPath,
                sessionStatus: session.status,
                flowType: session.flowType
              });
            }

          } catch (error) {
            console.error('❌ RouteRestoration: Erreur validation session:', error);

            // En cas d'erreur, retry si on n'a pas atteint le max
            if (restorationAttempts < maxRestorationAttempts - 1) {
              console.log('🔄 RouteRestoration: Retry validation in 1s...');
              setTimeout(() => {
                // Ne pas incrémenter hasAttemptedRestore pour permettre le retry
              }, 1000);
              return;
            }
          }
        }

        // 🎯 ÉTAPE 3: Déterminer le chemin de destination selon l'état de la session
        if (!finalPath || finalPath === '/welcome') {
          // Si pas de chemin sauvegardé OU si le chemin sauvegardé est /welcome
          if (sessionValidated && validatedSession) {
            // 🆕 FIX: Utiliser NavigationStateManager pour déterminer la route correcte basée sur la session
            // Cela évite de rediriger vers /checkin-home pour une session checkout
            finalPath = navigationStateManager.getCorrectRouteForSession(validatedSession);
            console.log('🎯 RouteRestoration: savedPath était /welcome, redirection intelligente basée sur session:', {
              flowType: validatedSession.flowType,
              status: validatedSession.status,
              finalPath
            });
          } else {
            // Si pas de session valide, aller vers checkin-home par défaut
            finalPath = '/checkin-home';
            console.log('🎯 RouteRestoration: Pas de session, redirection par défaut vers:', finalPath);
          }
        }

        // 🆕 REFACTORISÉ: Utiliser NavigationStateManager pour construire l'URL
        // Utiliser les paramètres de l'URL actuelle en priorité
        const currentUrlParams = navigationStateManager.extractUrlParams(location.search);
        const currentParcours = currentUrlParams.parcoursId;
        const currentCheckId = currentUrlParams.checkId;

        const parcoursId = currentParcours || parsedSavedParams?.parcours || '';
        const checkId = currentCheckId || activeCheckId || '';

        const targetUrl = navigationStateManager.buildUrl(finalPath, parcoursId, checkId);
        
        console.log('✅ RouteRestoration: Navigation finale:', {
          targetUrl,
          sessionValidated,
          attempt: restorationAttempts,
          finalPath,
          originalSavedPath: savedPath
        });

        setHasAttemptedRestore(true);
        navigate(targetUrl, { replace: true });
      };

      checkAndRestore();
    } else {
      console.log('❌ RouteRestoration: Redirection conditions NOT met:', {
        currentPath,
        isWelcome: currentPath === '/welcome',
        hasCheckid,
        reason: !hasCheckid ? 'No checkid in URL' : 'Unknown reason'
      });
      setHasAttemptedRestore(true);
    }
    
    if (currentPath !== '/welcome') {
      // We're on the correct route, just ensure params are present
      console.log('✅ RouteRestoration: Already on correct route:', currentPath);

      // 🆕 REFACTORISÉ: Utiliser NavigationStateManager pour restaurer les paramètres
      if (!currentSearch && savedParams && hasCheckid) {
        try {
          const parsedParams = JSON.parse(savedParams);
          const activeCheckId = localStorage.getItem('activeCheckId');

          const parcoursId = parsedParams.parcours || '';
          const checkId = activeCheckId || '';

          if (parcoursId || checkId) {
            const targetUrl = navigationStateManager.buildUrl(currentPath, parcoursId, checkId);
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
      console.log('✅ RouteRestoration: Staying on /welcome page');
      setHasAttemptedRestore(true);
    }
  }, [isAuthenticated, hasAttemptedRestore, location.pathname, location.search, navigate]);

  // This component doesn't render anything
  return null;
};


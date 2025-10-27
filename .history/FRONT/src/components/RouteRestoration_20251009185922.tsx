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

    // 🎯 CRITICAL FIX: Check if user wants a NEW session
    // If URL has parcours but NO checkid, user wants to start fresh
    const urlParams = new URLSearchParams(location.search);
    const hasParcours = !!urlParams.get('parcours');
    const hasCheckid = !!urlParams.get('checkid');

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

      // 🎯 ENHANCED FIX: Validation complète de la session et du chemin
      const checkAndRestore = async () => {
        // Incrémenter le compteur de tentatives
        setRestorationAttempts(prev => prev + 1);
        
        let finalPath = savedPath;
        let sessionValidated = false;
        
        // 🎯 ÉTAPE 1: Valider la session si activeCheckId existe
        if (activeCheckId) {
          try {
            const { checkSessionManager } = await import('@/services/checkSessionManager');
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
            console.log('✅ RouteRestoration: Session validée:', {
              checkId: session.checkId,
              flowType: session.flowType,
              status: session.status,
              hasProgress: !!session.progress?.currentPieceId,
              rapportID: session.rapportID
            });

            // 🎯 ÉTAPE 2: Déterminer le bon chemin selon la progression et le statut de session
            // 🏁 PRIORITÉ 1: Si session terminée, TOUJOURS rediriger vers checkout-home
            if (session.status === 'terminated') {
              finalPath = '/checkout-home';
              console.log('🏁 RouteRestoration: Session TERMINÉE, redirection FORCÉE vers checkout-home:', {
                rapportID: session.rapportID,
                savedPath,
                finalPath
              });
            } else if (session.status === 'completed' && session.flowType === 'checkin') {
              // CheckIn terminé, rediriger vers CheckOut
              finalPath = '/checkout-home';
              console.log('🔄 RouteRestoration: CheckIn terminé, redirection vers CheckOut:', finalPath);
            } else if (savedPath === '/checkin-home' || savedPath === '/checkout-home') {
              if (session.progress?.currentPieceId) {
                // L'utilisateur était en train de faire le parcours, restaurer vers /checkin ou /checkout
                finalPath = savedPath === '/checkin-home' ? '/checkin' : '/checkout';
                console.log('🔄 RouteRestoration: Session active détectée, redirection vers', finalPath, 'au lieu de', savedPath);
              }
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
          if (sessionValidated) {
            // Utiliser les informations de session pour déterminer le bon chemin
            finalPath = '/checkin-home'; // Par défaut, aller vers checkin-home
            console.log('🎯 RouteRestoration: savedPath était /welcome, redirection intelligente vers:', finalPath);
          } else {
            // Si pas de session valide, aller vers checkin-home par défaut
            finalPath = '/checkin-home';
            console.log('🎯 RouteRestoration: Pas de session, redirection par défaut vers:', finalPath);
          }
        }

        // 🎯 ÉTAPE 4: Construire les paramètres URL avec validation
        let params = '';
        const urlParams = new URLSearchParams();
        
        // Utiliser les paramètres de l'URL actuelle en priorité
        const currentUrlParams = new URLSearchParams(location.search);
        const currentParcours = currentUrlParams.get('parcours');
        const currentCheckId = currentUrlParams.get('checkid');
        
        if (currentParcours) {
          urlParams.set('parcours', currentParcours);
        } else if (parsedSavedParams?.parcours) {
          urlParams.set('parcours', parsedSavedParams.parcours);
        }

        if (currentCheckId) {
          urlParams.set('checkid', currentCheckId);
        } else if (activeCheckId) {
          urlParams.set('checkid', activeCheckId);
        }

        params = urlParams.toString();

        const targetUrl = params ? `${finalPath}?${params}` : finalPath;
        
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

      // If params are missing, restore them (only if we have a checkid)
      if (!currentSearch && savedParams && hasCheckid) {
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
      console.log('✅ RouteRestoration: Staying on /welcome page');
      setHasAttemptedRestore(true);
    }
  }, [isAuthenticated, hasAttemptedRestore, location.pathname, location.search, navigate]);

  // This component doesn't render anything
  return null;
};


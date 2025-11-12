/**
 * 🛡️ NavigationGuard Component
 * 
 * Protège les routes en fonction de l'état de la session.
 * Redirige automatiquement vers la route correcte si nécessaire.
 * 
 * Utilise NavigationStateManager pour déterminer les routes autorisées.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSession } from '@/services/checkSessionManager';
import { navigationStateManager } from '@/services/navigationStateManager';

interface NavigationGuardProps {
  session: CheckSession | null;
  loading: boolean;
  children: React.ReactNode;
}

export const NavigationGuard: React.FC<NavigationGuardProps> = ({
  session,
  loading,
  children
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (loading) {
      return;
    }

    // Si pas de session, laisser passer (Welcome page)
    if (!session) {
      setIsChecking(false);
      return;
    }

    const currentPath = location.pathname;

    console.log('🛡️ NavigationGuard: Vérification de la route:', {
      currentPath,
      sessionStatus: session.status,
      flowType: session.flowType,
      isFlowCompleted: session.isFlowCompleted
    });

    // Vérifier si la route est autorisée
    const isAllowed = navigationStateManager.isRouteAllowed(currentPath, session);

    if (!isAllowed) {
      console.warn('⚠️ NavigationGuard: Route non autorisée:', currentPath);
      
      // Obtenir la route de redirection
      const redirectTarget = navigationStateManager.getRedirectTarget(currentPath, session);
      
      if (redirectTarget) {
        console.log('🔄 NavigationGuard: Redirection vers:', redirectTarget);
        
        // Construire l'URL avec les paramètres
        const urlParams = navigationStateManager.extractUrlParams(location.search);
        const targetUrl = navigationStateManager.buildUrl(
          redirectTarget,
          urlParams.parcoursId || session.parcoursId,
          urlParams.checkId || session.checkId
        );
        
        navigate(targetUrl, { replace: true });
      }
    } else {
      console.log('✅ NavigationGuard: Route autorisée:', currentPath);
    }

    setIsChecking(false);
  }, [session, loading, location.pathname, location.search, navigate]);

  // Afficher un loader pendant la vérification
  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 🛡️ RouteGuard Component
 * 
 * Version simplifiée pour protéger une route spécifique.
 * Redirige vers une route de fallback si la session n'est pas valide.
 */
interface RouteGuardProps {
  session: CheckSession | null;
  loading: boolean;
  requiredStatus?: CheckSession['status'][];
  requiredFlowType?: CheckSession['flowType'];
  fallbackRoute?: string;
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  session,
  loading,
  requiredStatus,
  requiredFlowType,
  fallbackRoute = '/welcome',
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) {
      return;
    }

    // Si pas de session, rediriger vers fallback
    if (!session) {
      console.warn('⚠️ RouteGuard: Pas de session, redirection vers:', fallbackRoute);
      navigate(fallbackRoute, { replace: true });
      return;
    }

    // Vérifier le statut requis
    if (requiredStatus && !requiredStatus.includes(session.status)) {
      console.warn('⚠️ RouteGuard: Statut non autorisé:', {
        current: session.status,
        required: requiredStatus
      });
      
      const correctRoute = navigationStateManager.getCorrectRouteForSession(session);
      const urlParams = navigationStateManager.extractUrlParams(location.search);
      const targetUrl = navigationStateManager.buildUrl(
        correctRoute,
        urlParams.parcoursId || session.parcoursId,
        urlParams.checkId || session.checkId
      );
      
      navigate(targetUrl, { replace: true });
      return;
    }

    // Vérifier le type de flow requis
    if (requiredFlowType && session.flowType !== requiredFlowType) {
      console.warn('⚠️ RouteGuard: Type de flow non autorisé:', {
        current: session.flowType,
        required: requiredFlowType
      });
      
      const correctRoute = navigationStateManager.getCorrectRouteForSession(session);
      const urlParams = navigationStateManager.extractUrlParams(location.search);
      const targetUrl = navigationStateManager.buildUrl(
        correctRoute,
        urlParams.parcoursId || session.parcoursId,
        urlParams.checkId || session.checkId
      );
      
      navigate(targetUrl, { replace: true });
      return;
    }

    setIsChecking(false);
  }, [session, loading, requiredStatus, requiredFlowType, fallbackRoute, navigate, location.search]);

  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 🛡️ SessionRequiredGuard Component
 * 
 * Protège une route en exigeant une session active.
 * Redirige vers /welcome si pas de session.
 */
interface SessionRequiredGuardProps {
  session: CheckSession | null;
  loading: boolean;
  children: React.ReactNode;
}

export const SessionRequiredGuard: React.FC<SessionRequiredGuardProps> = ({
  session,
  loading,
  children
}) => {
  return (
    <RouteGuard
      session={session}
      loading={loading}
      fallbackRoute="/welcome"
    >
      {children}
    </RouteGuard>
  );
};

/**
 * 🛡️ FlowTypeGuard Component
 * 
 * Protège une route en exigeant un type de flow spécifique.
 */
interface FlowTypeGuardProps {
  session: CheckSession | null;
  loading: boolean;
  requiredFlowType: 'checkin' | 'checkout';
  children: React.ReactNode;
}

export const FlowTypeGuard: React.FC<FlowTypeGuardProps> = ({
  session,
  loading,
  requiredFlowType,
  children
}) => {
  return (
    <RouteGuard
      session={session}
      loading={loading}
      requiredFlowType={requiredFlowType}
    >
      {children}
    </RouteGuard>
  );
};

/**
 * 🛡️ ActiveSessionGuard Component
 * 
 * Protège une route en exigeant une session active (non terminée).
 */
interface ActiveSessionGuardProps {
  session: CheckSession | null;
  loading: boolean;
  children: React.ReactNode;
}

export const ActiveSessionGuard: React.FC<ActiveSessionGuardProps> = ({
  session,
  loading,
  children
}) => {
  return (
    <RouteGuard
      session={session}
      loading={loading}
      requiredStatus={['active', 'completed']}
    >
      {children}
    </RouteGuard>
  );
};


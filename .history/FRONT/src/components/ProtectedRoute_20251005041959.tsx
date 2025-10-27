import React from 'react';
<parameter name="Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useUser();
  const location = useLocation();

  if (!isAuthenticated) {
    // 🎯 CORRECTION CRITIQUE: Préserver les paramètres URL lors de la redirection
    // Si l'URL contient un checkID, l'utilisateur essaie de reprendre un parcours
    const urlParams = new URLSearchParams(location.search);
    const hasCheckId = urlParams.has('checkid');
    const hasParcours = urlParams.has('parcours');

    // Si on a un checkID ET un parcours, préserver les paramètres
    if (hasCheckId && hasParcours) {
      console.log('🔄 ProtectedRoute: Redirection vers /welcome avec préservation des paramètres');
      return <Navigate to={`/welcome${location.search}`} replace />;
    }

    // Sinon, redirection simple vers /welcome
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
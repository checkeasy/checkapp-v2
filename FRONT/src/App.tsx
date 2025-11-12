import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useWeglot } from "@/hooks/useWeglot";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { WeglotTranslationWrapper } from "@/components/WeglotTranslationWrapper";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import CheckEasy from "./pages/CheckEasy";
import CheckOut from "./pages/CheckOut";
import CheckIn from "./pages/CheckIn";
import { CheckoutHome } from "./pages/CheckoutHome";
import { CheckinHome } from "./pages/CheckinHome";
import { EtatInitial } from "./pages/EtatInitial";
import { ExitQuestionsPageWrapper } from "./pages/ExitQuestionsPageWrapper";
import SignalementsATraiter from "./pages/SignalementsATraiter";
import SignalementsHistorique from "./pages/SignalementsHistorique";
import NotFound from "./pages/NotFound";
import CameraTest from "./components/CameraTest";
import { UserProvider } from "@/contexts/UserContext";
import { CheckoutFlowProvider } from "@/contexts/CheckoutFlowContext";
import { CheckinFlowProvider } from "@/contexts/CheckinFlowContext";
import { UnifiedFlowProvider } from "@/contexts/UnifiedFlowContext";
import { ReportProblemProvider } from "@/contexts/ReportProblemContext";
import { SignalementsProvider } from "@/contexts/SignalementsContext";
import { AppFlowProvider } from "@/contexts/AppFlowContext";
import { GlobalParcoursProvider } from "@/contexts/GlobalParcoursContext";
import { ActiveCheckIdProvider } from "@/contexts/ActiveCheckIdContext";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UrlParamRestoration } from "@/components/UrlParamRestoration";
import { RouteRestoration } from "@/components/RouteRestoration";
import { initializeCameraPolyfills } from "@/utils/cameraPolyfills";
import { runCompatibilityTests } from "@/utils/cameraCompatibilityTest";

const queryClient = new QueryClient();

// 🚀 Initialiser les polyfills caméra au chargement de l'application
if (typeof window !== 'undefined') {
  console.log('🚀 Initialisation des polyfills caméra...');
  const polyfillResult = initializeCameraPolyfills();

  if (!polyfillResult.success) {
    console.error('❌ Erreurs lors de l\'initialisation des polyfills:', polyfillResult.errors);
  }

  // 🧪 Exécuter les tests de compatibilité en développement
  if (import.meta.env.DEV) {
    runCompatibilityTests().then(report => {
      if (!report.criticalPassed) {
        console.error('❌ ATTENTION: Des tests critiques ont échoué. La caméra pourrait ne pas fonctionner.');
      }
    });
  }
}

// 🌍 Composant pour matcher les routes avec préfixe de langue
// ✅ Weglot traduit le contenu au niveau du serveur, on affiche juste le bon composant
const LanguageRouteMatcher = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const supportedLanguages = ['en', 'fr', 'es', 'de', 'pt', 'ar'];

  const lang = pathSegments[0];
  const isLanguagePrefix = supportedLanguages.includes(lang);

  // Extraire la route sans le préfixe de langue
  const routePath = isLanguagePrefix
    ? '/' + pathSegments.slice(1).join('/')
    : '/' + pathSegments.join('/');

  console.log(`🌍 Route avec langue: ${lang}, path: ${routePath}`);

  // ✅ Weglot va traduire le contenu automatiquement
  // On retourne juste le composant approprié

  if (routePath === '/' || routePath === '') {
    return (
      <ProtectedRoute>
        <CheckEasy />
      </ProtectedRoute>
    );
  } else if (routePath === '/welcome') {
    return <Welcome />;
  } else if (routePath === '/checkout') {
    return (
      <ProtectedRoute>
        <CheckOut />
      </ProtectedRoute>
    );
  } else if (routePath === '/checkout-home') {
    return (
      <ProtectedRoute>
        <CheckoutHome />
      </ProtectedRoute>
    );
  } else if (routePath === '/exit-questions') {
    return (
      <ProtectedRoute>
        <ExitQuestionsPageWrapper />
      </ProtectedRoute>
    );
  } else if (routePath === '/etat-initial') {
    return (
      <ProtectedRoute>
        <EtatInitial />
      </ProtectedRoute>
    );
  } else if (routePath === '/checkin') {
    return (
      <ProtectedRoute>
        <CheckIn />
      </ProtectedRoute>
    );
  } else if (routePath === '/checkin-home') {
    return (
      <ProtectedRoute>
        <CheckinHome />
      </ProtectedRoute>
    );
  } else if (routePath === '/signalements-a-traiter') {
    return (
      <ProtectedRoute>
        <SignalementsATraiter />
      </ProtectedRoute>
    );
  } else if (routePath === '/signalements-historique') {
    return (
      <ProtectedRoute>
        <SignalementsHistorique />
      </ProtectedRoute>
    );
  } else if (routePath === '/camera-test') {
    return <CameraTest />;
  }

  return <NotFound />;
};

// 🌍 Composant pour gérer les routes avec préfixe de langue
// ✅ NE PAS rediriger - laisser Weglot gérer les URLs
const LanguageRouteWrapper = ({ children, lang }: { children: React.ReactNode; lang: string }) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const supportedLanguages = ['en', 'fr', 'es', 'de', 'pt', 'ar'];

  const detectedLang = pathSegments[0];
  const isLanguagePrefix = supportedLanguages.includes(detectedLang);

  useEffect(() => {
    if (isLanguagePrefix) {
      // Stocker la langue
      localStorage.setItem('weglot_language', detectedLang);
      sessionStorage.setItem('weglot_language', detectedLang);

      console.log(`🌍 Langue détectée: ${detectedLang}`);
    }
  }, [detectedLang, isLanguagePrefix]);

  // ✅ Retourner les enfants SANS rediriger
  // Weglot va traduire le contenu automatiquement
  return <>{children}</>;
};

const AppContent = () => {
  const { isOpen, closeReportModal } = useReportProblem();

  // 🌍 Initialiser Weglot pour la traduction côté client
  useWeglot();

  // 🎯 Scroll vers le haut à chaque changement de route
  useScrollToTop();

  return (
    <>
      {/* Language Switcher - Bottom right positioning */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* URL Parameter Restoration - Must be inside BrowserRouter */}
      <UrlParamRestoration />

      {/* Route Restoration - Prevents unwanted redirects on refresh */}
      <RouteRestoration />

      <WeglotTranslationWrapper>
        <Routes>
        {/* Routes normales sans préfixe de langue - AVANT les routes avec préfixe */}
        <Route path="/" element={
                <ProtectedRoute>
                  <CheckEasy />
                </ProtectedRoute>
              } />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <CheckOut />
                </ProtectedRoute>
              } />
              <Route path="/checkout-home" element={
                <ProtectedRoute>
                  <CheckoutHome />
                </ProtectedRoute>
              } />
              <Route path="/exit-questions" element={
                <ProtectedRoute>
                  <ExitQuestionsPageWrapper />
                </ProtectedRoute>
              } />
              <Route path="/etat-initial" element={
                <ProtectedRoute>
                  <EtatInitial />
                </ProtectedRoute>
              } />
              <Route path="/checkin" element={
                <ProtectedRoute>
                  <CheckIn />
                </ProtectedRoute>
              } />
              <Route path="/checkin-home" element={
                <ProtectedRoute>
                  <CheckinHome />
                </ProtectedRoute>
              } />
              <Route path="/signalements-a-traiter" element={
                <ProtectedRoute>
                  <SignalementsATraiter />
                </ProtectedRoute>
              } />
              <Route path="/signalements-historique" element={
                <ProtectedRoute>
                  <SignalementsHistorique />
                </ProtectedRoute>
              } />
              <Route path="/camera-test" element={<CameraTest />} />

              {/* 🌍 Routes avec préfixe de langue - Weglot */}
              {/* Pattern: /:lang/* pour capturer toutes les routes avec préfixe de langue */}
              <Route path="/:lang/*" element={<LanguageRouteWrapper lang=""><LanguageRouteMatcher /></LanguageRouteWrapper>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </WeglotTranslationWrapper>
            <ReportProblemModal isOpen={isOpen} onClose={closeReportModal} />
      </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <GlobalParcoursProvider>
        <BrowserRouter>
          <ActiveCheckIdProvider>
            <AppFlowProvider>
              {/* Nouveau contexte unifié qui remplace CheckoutFlowProvider et CheckinFlowProvider */}
              <UnifiedFlowProvider>
                {/* 🎯 Les deux providers restent montés globalement pour éviter les remontages */}
                {/* Ils seront rendus "dormants" via lazy initialization dans leurs useEffect */}
                <CheckoutFlowProvider>
                  <CheckinFlowProvider>
                    <SignalementsProvider>
                      <ReportProblemProvider>
                        <TooltipProvider>
                          <Toaster />
                          <Sonner />
                          <AppContent />
                        </TooltipProvider>
                      </ReportProblemProvider>
                    </SignalementsProvider>
                  </CheckinFlowProvider>
                </CheckoutFlowProvider>
              </UnifiedFlowProvider>
            </AppFlowProvider>
          </ActiveCheckIdProvider>
        </BrowserRouter>
      </GlobalParcoursProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;

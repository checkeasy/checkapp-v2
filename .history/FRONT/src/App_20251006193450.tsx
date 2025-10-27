import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { UnifiedFlowProvider } from "@/contexts/UnifiedFlowContext";
import { ReportProblemProvider } from "@/contexts/ReportProblemContext";
import { SignalementsProvider } from "@/contexts/SignalementsContext";
import { AppFlowProvider } from "@/contexts/AppFlowContext";
import { GlobalParcoursProvider } from "@/contexts/GlobalParcoursContext";
import { ActiveCheckIdProvider } from "@/contexts/ActiveCheckIdContext";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { ConditionalFlowProvider } from "@/components/ConditionalFlowProvider";
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

const AppContent = () => {
  const { isOpen, closeReportModal } = useReportProblem();

  return (
    <>
      {/* URL Parameter Restoration - Must be inside BrowserRouter */}
      <UrlParamRestoration />

      {/* Route Restoration - Prevents unwanted redirects on refresh */}
      <RouteRestoration />

      <Routes>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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
                {/* 🎯 NOUVEAU: Montage conditionnel des Flow Providers selon la route */}
                <ConditionalFlowProvider>
                  <SignalementsProvider>
                    <ReportProblemProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <AppContent />
                      </TooltipProvider>
                    </ReportProblemProvider>
                  </SignalementsProvider>
                </ConditionalFlowProvider>
              </UnifiedFlowProvider>
            </AppFlowProvider>
          </ActiveCheckIdProvider>
        </BrowserRouter>
      </GlobalParcoursProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;

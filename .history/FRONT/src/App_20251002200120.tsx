import React from 'react';
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

const queryClient = new QueryClient();

const AppContent = () => {
  const { isOpen, closeReportModal } = useReportProblem();

  return (
    <>
      {/* URL Parameter Restoration - Must be inside BrowserRouter */}
      <UrlParamRestoration />

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
                {/* Garder les anciens providers pour transition en douceur */}
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

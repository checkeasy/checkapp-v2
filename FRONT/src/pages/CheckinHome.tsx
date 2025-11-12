import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Wifi, Car, Home, Calendar, Clock, MapPin, Brush, Star, Camera, CheckCircle, FileText, ClipboardList, AlertTriangle, ChevronRight, Key, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileSheet } from "@/components/ProfileSheet";
import { PropertyInfo } from "@/components/PropertyInfo";
import { RoomsModal } from "@/components/RoomsModal";
import { CleaningInstructionsModal } from "@/components/CleaningInstructionsModal";
import { SignalementsCard } from "@/components/SignalementsCard";
import { Typography } from "@/components/ui/typography";
import { CTASection } from "@/components/ui/cta-section";
import { RapportButton } from "@/components/RapportButton";
import { ReportProblemButton } from "@/components/ReportProblemButton";
import { useUser } from "@/contexts/UserContext";
import { useCheckoutFlow } from "@/contexts/CheckoutFlowContext";
import { useCheckinFlow } from "@/contexts/CheckinFlowContext";
import { useAppFlow } from "@/contexts/AppFlowContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { LegacyRoom } from "@/types/room";
import { toast } from "sonner";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { extractPropertyDataFromRawData } from "@/utils/propertyDataHelpers";
import { checkSessionManager, CheckSession } from "@/services/checkSessionManager";
import { environment } from "@/config/environment";
import { rapportStatusService } from "@/services/rapportStatusService";
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from "@/hooks/useSessionData";
import { useParcoursDataUnified } from "@/hooks/useParcoursDataUnified";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import { navigationStateManager } from "@/services/navigationStateManager";
// ✅ Utilitaires de comptage des signalements
import { countActiveSignalements } from "@/utils/signalementFilters";

const mockRooms: LegacyRoom[] = [{
  id: "salon",
  name: "Salon",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier l'état du canapé", "Contrôler la télévision", "S'assurer que les télécommandes sont présentes"],
  checkpoints: ["Canapé sans taches", "Télé fonctionne", "Télécommandes présentes"],
  generalInstructions: ["Aspirer le tapis", "Dépoussiérer les meubles", "Nettoyer la table basse"],
  cleaningInfo: "Ne pas passer la serpillère sur le parquet",
  roomInfo: "Ne pas essayer d'ouvrir la fenêtre de gauche car cassée",
  specificTasks: []
}, {
  id: "cuisine", 
  name: "Cuisine",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier le frigo", "Contrôler les plaques", "État de l'évier"],
  checkpoints: ["Frigo propre", "Plaques fonctionnent", "Évier nickel"],
  generalInstructions: ["Nettoyer le plan de travail", "Laver la vaisselle", "Sortir les poubelles"],
  cleaningInfo: "Attention aux produits de nettoyage sous l'évier",
  roomInfo: "Le lave-vaisselle est en panne, laver à la main uniquement",
  specificTasks: []
}, {
  id: "chambre",
  name: "Chambre", 
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier l'état du lit", "Contrôler l'armoire", "S'assurer que tout est rangé"],
  checkpoints: ["Lit fait", "Armoire fermée", "Chambre rangée"],
  generalInstructions: ["Changer les draps", "Aspirer le sol", "Nettoyer les surfaces"],
  cleaningInfo: "Draps de rechange dans l'armoire de l'entrée",
  roomInfo: "L'interrupteur de la lampe de chevet droite ne fonctionne pas",
  specificTasks: []
}, {
  id: "salle_de_bain",
  name: "Salle de bain",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"], 
  instructions: ["Vérifier la propreté", "Contrôler les équipements", "État général"],
  checkpoints: ["Salle de bain propre", "Équipements fonctionnent", "Serviettes propres"],
  generalInstructions: ["Nettoyer les sanitaires", "Laver le sol", "Changer les serviettes"],
  cleaningInfo: "Utiliser uniquement les produits écologiques",
  roomInfo: "Le robinet de la douche fuit légèrement, c'est normal",
  specificTasks: []
}];

export const CheckinHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();
  const { user } = useUser();
  const { rooms, currentParcours, apiSignalements } = useParcoursData();  // ✅ FIX: Ajouter rooms pour le CleaningInstructionsModal
  const { flowState: checkoutFlowState, startCheckout, resetFlow } = useCheckoutFlow();
  const { flowState: checkinFlowState } = useCheckinFlow(); // 🎯 NOUVEAU: Pour vérifier si CheckIn est terminé
  const { flowState: appFlowState } = useAppFlow(); // 🎯 NOUVEAU: Pour vérifier l'état global
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements } = useSignalements();
  const { currentCheckId } = useActiveCheckId(); // 🎯 NOUVEAU: Récupérer le checkId actif
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [checkSession, setCheckSession] = useState<CheckSession | null>(null); // 🏁 État de la session
  const [isRapportReady, setIsRapportReady] = useState(false); // 📋 État du rapport IA
  const [rapportProgress, setRapportProgress] = useState(0); // 🎯 NOUVEAU: Progression du rapport (0-100)

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkin');

  // 🏁 Charger la session au montage et quand la page devient visible
  useEffect(() => {
    const loadSession = async () => {
      if (currentCheckId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        console.log('🏁 CheckinHome: Session chargée:', {
          checkId: currentCheckId,
          status: session?.status,
          rapportID: session?.rapportID,
          isTerminated: session?.status === 'terminated'
        });
        setCheckSession(session);
      }
    };

    loadSession();

    // Recharger la session quand la page devient visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ CheckinHome: Page visible, rechargement session...');
        loadSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentCheckId]);

  // 📋 Polling pour vérifier le statut du rapport IA
  useEffect(() => {
    // Conditions pour démarrer le polling :
    // 1. Le bouton rapport est visible (session terminée + rapportID existe)
    // ✅ FIX: Ne pas attendre que les flows soient complétés car la session peut être terminée avant
    const shouldPoll =
      checkSession?.status === 'terminated' &&
      checkSession?.rapportID;

    console.log('🔍 CheckinHome: Conditions de polling:', {
      checkSessionStatus: checkSession?.status,
      rapportID: checkSession?.rapportID,
      shouldPoll,
      isRapportReady,
      currentCheckId
    });

    if (!shouldPoll || isRapportReady) {
      console.log('⏸️ CheckinHome: Polling non démarré:', {
        reason: !shouldPoll ? 'Conditions non remplies' : 'Rapport déjà prêt'
      });
      return; // Ne pas démarrer le polling si conditions non remplies ou rapport déjà prêt
    }

    console.log('📋 CheckinHome: Démarrage du polling pour vérifier le statut du rapport');

    // 🎯 NOUVEAU: Initialiser la progression à 10% au démarrage
    setRapportProgress(10);
    let pollCount = 0;

    // Fonction de vérification
    const checkRapportStatus = async () => {
      if (!currentCheckId) {
        console.warn('⚠️ CheckinHome: currentCheckId manquant pour la vérification du rapport');
        return;
      }

      pollCount++;
      console.log('🔄 CheckinHome: Vérification du statut du rapport pour checkId:', currentCheckId, `(tentative ${pollCount})`);
      const ready = await rapportStatusService.isRapportReady(currentCheckId);
      console.log('📊 CheckinHome: Résultat de la vérification:', { ready, pollCount });

      if (ready) {
        console.log('✅ CheckinHome: Rapport IA terminé et prêt à être consulté');
        setRapportProgress(100); // 🎯 NOUVEAU: Passer à 100% quand prêt
        setIsRapportReady(true);
      } else {
        // 🎯 NOUVEAU: Augmenter la progression graduellement (10% → 80%)
        // Formule: 10 + (pollCount * 7) avec un max de 80%
        const newProgress = Math.min(10 + (pollCount * 7), 80);
        setRapportProgress(newProgress);
        console.log('📊 CheckinHome: Progression mise à jour:', { newProgress, pollCount });
      }
    };

    // Vérification immédiate
    checkRapportStatus();

    // Polling toutes les 3 secondes
    const intervalId = setInterval(checkRapportStatus, 3000);

    // Cleanup
    return () => {
      console.log('📋 CheckinHome: Arrêt du polling du statut du rapport');
      clearInterval(intervalId);
    };
  }, [checkSession?.status, checkSession?.rapportID, currentCheckId, isRapportReady]);

  // 🏁 Fonction pour ouvrir le rapport dans Bubble
  const handleOpenRapport = () => {
    if (checkSession?.rapportID && isRapportReady) {
      const bubbleEnv = environment.BUBBLE_ENV; // 'version-test' ou 'version-live'
      const rapportUrl = `https://app.checkeasy.co/${bubbleEnv}/rapport/${checkSession.rapportID}`;
      console.log('📋 Ouverture du rapport:', rapportUrl);
      window.open(rapportUrl, '_blank');
    } else if (!isRapportReady) {
      toast.info('Le rapport IA est en cours de génération, veuillez patienter...');
    }
  };

  // 🎯 FIX: Extraire les vraies données du logement depuis l'API au lieu d'utiliser des données mock
  const propertyData = currentParcours?.rawData
    ? extractPropertyDataFromRawData(currentParcours.rawData)
    : extractPropertyDataFromRawData(null);

  // ✅ NOUVEAU: Extraire les données réelles pour l'affichage du header
  const propertyName = currentParcours?.rawData?.logementName || 'Logement';
  const takePicture = currentParcours?.rawData?.takePicture || '';

  // 🎯 Déterminer le titre selon le type d'utilisateur et le type de parcours
  const parcoursName = (() => {
    // Pour les agents/gestionnaires: toujours "Ménage en cours"
    if (user?.type === 'AGENT' || user?.type === 'GESTIONNAIRE') {
      return 'Ménage en cours';
    }
    // Pour les clients
    if (user?.type === 'CLIENT') {
      return takePicture === 'checkOutOnly'
        ? 'État des lieux de sortie'
        : takePicture === 'checkInOnly'
        ? 'Check-in en cours'
        : 'Séjour en cours';
    }
    return 'Parcours en cours';
  })();

  // Déterminer le message de photos selon la configuration
  const getPhotoInstructions = () => {
    // Pour les agents/gestionnaires
    if (user?.type === 'AGENT' || user?.type === 'GESTIONNAIRE') {
      if (takePicture === 'checkOutOnly') {
        return 'Validation du ménage';
      } else if (takePicture === 'checkInOnly') {
        return 'Contrôle de l\'état initial et validation du ménage';
      } else if (takePicture === 'checkInAndCheckOut') {
        return 'Contrôle de l\'état initial et validation du ménage';
      }
    }
    // Pour les clients
    switch (takePicture) {
      case 'checkInOnly':
        return 'Photos à l\'entrée uniquement';
      case 'checkOutOnly':
        return 'Photos à la sortie uniquement';
      case 'both':
        return 'Photos à l\'entrée et à la sortie';
      default:
        return '';
    }
  };

  // 🎯 REMOVED: handleStartCheckin function - The "Faire le check d'entrée" button has been removed
  // to avoid duplication with the main CTA button at the bottom of the page

  const handleSignalerProbleme = () => {
    // ✅ CORRECTION: Ouvrir le modal de signalement sans pièce pré-sélectionnée
    openReportModal();
  };

  // 🎯 NOUVEAU: Déterminer la bonne action CTA selon le contexte du parcours ET l'état des flows
  const getCtaConfig = () => {
    const userType = user?.type;
    const parcoursInfo = currentParcours?.rawData;

    // 🏁 PRIORITÉ 1: Si session terminée, afficher le bouton de rapport
    if (checkSession?.status === 'terminated' && checkSession?.rapportID) {
      console.log('🏁 CheckinHome: Session terminée, affichage bouton rapport');
      return {
        label: isRapportReady ? "📋 Voir mon rapport" : "📋 Rapport en cours...",
        action: handleOpenRapport,
        icon: isRapportReady ? <FileText className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />,
        disabled: !isRapportReady
      };
    }

    // 🎯 NOUVEAU: Vérifier aussi la session pour déterminer si CheckIn est complété
    const isCheckinCompletedFromSession = checkSession?.progress?.checkinCompleted || checkSession?.progress?.etatInitialCompleted;
    const isCheckinCompleted = checkinFlowState?.isCompleted || appFlowState?.checkinCompleted || isCheckinCompletedFromSession;
    const isCheckoutCompleted = checkoutFlowState?.isCompleted || appFlowState?.checkoutCompleted;

    console.log('🎯 CheckinHome: État des flows:', {
      userType,
      takePicture: parcoursInfo?.takePicture,
      isCheckinCompleted,
      isCheckoutCompleted,
      checkinFlowState: checkinFlowState?.isCompleted,
      appFlowState: appFlowState?.checkinCompleted,
      isCheckinCompletedFromSession,
      sessionStatus: checkSession?.status
    });

    // Si pas de données de parcours, fallback vers CheckIn
    if (!parcoursInfo || !userType) {
      return {
        label: "Continuer mon état des lieux",
        action: () => navigateWithParams('/checkin'),
        icon: <Camera className="h-4 w-4" />
      };
    }

    const isAgent = userType === 'AGENT';
    const isGestionnaire = userType === 'GESTIONNAIRE';
    const isClient = userType === 'CLIENT';
    const isCheckInAndOut = parcoursInfo.takePicture === 'checkInAndCheckOut';

    // 🎯 LOGIQUE PRINCIPALE: Si CheckIn terminé ET parcours checkInAndCheckOut → Aller vers CheckOut
    if (isCheckinCompleted && isCheckInAndOut && !isCheckoutCompleted) {
      const label = isClient ? "Commencer mon état des lieux de sortie" : "Commencer le contrôle de sortie";
      return {
        label,
        action: () => {
          console.log('🎯 CheckinHome: CheckIn terminé, navigation vers CheckOut');
          startCheckout();
          navigateWithParams('/checkout');
        }
      };
    }

    // SCÉNARIO 1: Agent/Gestionnaire avec checkInAndCheckOut ET CheckIn pas terminé → Aller vers État Initial
    // 🆕 FIX: Les agents de ménage ne font PAS de contrôle d'entrée (/checkin), ils font un état initial (/etat-initial)
    if ((isAgent || isGestionnaire) && isCheckInAndOut && !isCheckinCompleted) {
      return {
        label: "Commencer mon ménage",
        action: () => navigateWithParams('/etat-initial'),
        icon: <ClipboardList className="h-4 w-4" />
      };
    }

    // SCÉNARIO 2: Agent/Gestionnaire avec checkOutOnly → Aller vers CheckOut
    if ((isAgent || isGestionnaire) && parcoursInfo.takePicture === 'checkOutOnly') {
      return {
        label: "Finaliser mon ménage",
        action: async () => {
          console.log('🎯 CheckinHome: Finaliser mon ménage - Réinitialisation position première pièce');
          startCheckout();

          // 🎯 NOUVEAU: Réinitialiser la position à la première pièce
          if (currentCheckId) {
            try {
              const session = await checkSessionManager.getCheckSession(currentCheckId);
              if (session && rooms.length > 0) {
                // Trier les rooms par ordre pour obtenir la première
                const sortedRooms = [...rooms].sort((a, b) => a.ordre - b.ordre);
                const firstRoom = sortedRooms[0];

                console.log('✅ CheckinHome: Réinitialisation position:', {
                  firstRoomId: firstRoom?.id,
                  firstRoomName: firstRoom?.nom,
                  ordre: firstRoom?.ordre
                });

                await checkSessionManager.saveCheckSession({
                  ...session,
                  progress: {
                    ...session.progress,
                    currentPieceId: firstRoom?.id,
                    currentTaskIndex: 0
                  }
                });
              }
            } catch (error) {
              console.error('❌ CheckinHome: Erreur réinitialisation position:', error);
            }
          }

          navigateWithParams('/checkout');
        },
        icon: <ArrowRight className="h-4 w-4" />
      };
    }

    // SCÉNARIO 3: Client avec checkInAndCheckOut ET CheckIn pas terminé → Continuer CheckIn
    if (isClient && isCheckInAndOut && !isCheckinCompleted) {
      return {
        label: "Continuer mon état des lieux d'entrée",
        action: () => navigateWithParams('/checkin'),
        icon: <Camera className="h-4 w-4" />
      };
    }

    // SCÉNARIO 4: Client avec checkInOnly → Continuer CheckIn
    if (isClient && parcoursInfo.takePicture === 'checkInOnly') {
      return {
        label: "Continuer mon check-in",
        action: () => navigateWithParams('/checkin'),
        icon: <Camera className="h-4 w-4" />
      };
    }

    // SCÉNARIO 5: Client avec checkOutOnly → Aller vers CheckOut
    if (isClient && parcoursInfo.takePicture === 'checkOutOnly') {
      return {
        label: "Faire mon check out",
        action: () => {
          startCheckout();
          navigateWithParams('/checkout');
        },
        icon: <ArrowRight className="h-4 w-4" />
      };
    }

    // Fallback: Continuer CheckIn
    return {
      label: "Continuer mon état des lieux",
      action: () => navigateWithParams('/checkin'),
      icon: <Camera className="h-4 w-4" />
    };
  };

  const ctaConfig = getCtaConfig();

  // ✅ NOUVEAU: Combiner les signalements utilisateur et API
  const userSignalements = getPendingSignalements();
  const apiSignalementsATraiter = apiSignalements.filter(sig => sig.status === 'A_TRAITER');

  // ✅ NOUVEAU - Compter TOUS les signalements (actifs + historiques) avec useMemo pour éviter les re-renders
  const signalementsCount = useMemo(() => {
    return countActiveSignalements([...userSignalements, ...apiSignalementsATraiter]);
  }, [userSignalements, apiSignalements]);

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto">
      {/* Header - Mobile optimized avec design system - ✅ UTILISE LES VRAIES DONNÉES */}
      <div className="bg-background px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex-1 min-w-0">
              <Typography variant="page-title">
                {parcoursName}
              </Typography>
              <Typography variant="page-subtitle" className="truncate">
                {propertyData?.address || propertyName || 'Adresse non disponible'}
              </Typography>
              {getPhotoInstructions() && (
                <Typography variant="caption">
                  {getPhotoInstructions()}
                </Typography>
              )}
            </div>
            <div className="flex-shrink-0 hover:scale-105 transition-transform duration-300">
              <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-3 sm:px-4 space-y-2.5 sm:space-y-3">
        {/* Success banner - 🎯 AFFICHER SEULEMENT SI CHECKIN EST COMPLÉTÉ */}
        {(checkinFlowState?.isCompleted || appFlowState?.checkinCompleted) && (
          <Card variant="glass" className="border-green-200 bg-green-50/80 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <Typography variant="card-title" className="text-green-800">
                    Check d'entrée effectué
                  </Typography>
                  <div className="flex items-center gap-4 mt-1">
                    <Typography variant="caption" className="text-green-600">
                      {/* 🆕 Afficher l'heure réelle si disponible, sinon l'heure prévue */}
                      {checkSession?.createdAt ? (
                        <>Heure d'arrivée: {new Date(checkSession.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</>
                      ) : (
                        <>Heure d'arrivée prévue: {propertyData.checkIn}</>
                      )}
                    </Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information cards with consistent styling */}
        <Dialog>
          <DialogTrigger asChild>
            <Card variant="elevated" className="cursor-pointer group animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Typography variant="card-title" className="flex items-center gap-2 text-sm sm:text-sm">
                    <Home className="h-4 w-4 text-primary" />
                    Informations utiles
                  </Typography>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                
                {/* ✅ Badges conditionnels selon logementContentview */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {propertyData.visibleSections.includes('wifi') && (
                    <Badge variant="outline" className="text-xs">
                      <Wifi className="h-3 w-3 mr-1" />
                      WiFi
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('parking') && (
                    <Badge variant="outline" className="text-xs">
                      <Car className="h-3 w-3 mr-1" />
                      Parking
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('access') && (
                    <Badge variant="outline" className="text-xs">
                      <Key className="h-3 w-3 mr-1" />
                      Accès
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('checkin-checkout') && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Horaires
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Informations utiles</DialogTitle>
            </DialogHeader>
            {/* 🎯 FIX: Utiliser les vraies données du logement au lieu des données mock */}
            <PropertyInfo propertyData={propertyData} />
          </DialogContent>
        </Dialog>

        {/* Voir les pièces */}
        <RoomsModal flowType="checkin">
          <Card className="border border-border/50 rounded-xl overflow-hidden bg-card cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  Voir les pièces
                </h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </RoomsModal>

        {/* Consigne pour le ménage */}
        {/* 🎯 FIX: Utiliser flowType="checkin" pour la page checkin home (cohérence) */}
        <CleaningInstructionsModal flowType="checkin">
          <Card className="border border-border/50 rounded-xl overflow-hidden bg-card cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Consigne pour le ménage
                </h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </CleaningInstructionsModal>

        {/* Signalements à traiter - N'afficher que s'il y a des signalements */}
        {signalementsCount > 0 && (
          <Card
            className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigateWithParams('/signalements-a-traiter')}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Signalements en cours
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {signalementsCount}
                  </Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        )}


        {/* CTA Section with standardized layout */}
        <div className="h-32"></div>
      </div>

      {/* Standardized CTA Section */}
      {checkSession?.status === 'terminated' && checkSession?.rapportID ? (
        // 📋 Bouton rapport avec design personnalisé
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gradient-to-t from-background/95 via-background/90 to-transparent backdrop-blur-xl border-t border-white/20 shadow-floating animate-slide-up p-4 space-y-3 pb-safe">
          <RapportButton
            isReady={isRapportReady}
            onClick={handleOpenRapport}
            progress={rapportProgress}
          />
          <div className="flex justify-center">
            <ReportProblemButton
              onClick={handleSignalerProbleme}
              variant="outline"
              size="md"
            />
          </div>
        </div>
      ) : (
        // 🎯 Bouton CTA standard
        <CTASection
          primaryAction={{
            label: ctaConfig.label,
            onClick: () => {
              console.log('🎯 CheckinHome: Navigation CTA dynamique:', {
                label: ctaConfig.label,
                checkId: currentCheckId,
                userType: user?.type,
                takePicture: currentParcours?.rawData?.takePicture
              });
              ctaConfig.action();
            },
            icon: ctaConfig.icon,
            disabled: ctaConfig.disabled,
          }}
          bottomText={{
            label: "Signaler un problème",
            onClick: handleSignalerProbleme,
          }}
        />
      )}

      {/* Profile Sheet */}
      <ProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        onLogout={() => {
          // Le logout est maintenant géré dans ProfileSheet
          // qui appelle le logout du UserContext
        }}
      />
    </div>
  );
};
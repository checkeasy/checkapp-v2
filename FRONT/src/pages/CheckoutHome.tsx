import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Wifi, Car, Home, Calendar, Clock, MapPin, Brush, Star, Camera, CheckCircle, FileText, ClipboardList, AlertTriangle, ChevronRight, Key, ExternalLink, Sparkles } from "lucide-react";
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
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { Signalement } from "@/types/signalement";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { extractPropertyDataFromRawData } from "@/utils/propertyDataHelpers";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { checkSessionManager, CheckSession } from "@/services/checkSessionManager";
import { environment } from "@/config/environment";
import { rapportStatusService } from "@/services/rapportStatusService";
import { toast } from "sonner";
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from "@/hooks/useSessionData";
import { useParcoursDataUnified } from "@/hooks/useParcoursDataUnified";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import { navigationStateManager } from "@/services/navigationStateManager";
// ✅ Utilitaires de comptage des signalements
import { countActiveSignalements } from "@/utils/signalementFilters";

const mockRooms: any[] = [{
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

// 🎯 FIX: Removed mock signalements data
// Only real user-generated signalements are used from SignalementsContext

export const CheckoutHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();
  const { user } = useUser();
  const { rooms, currentParcours, apiSignalements, info: parcoursInfo } = useParcoursData();  // ✅ NOUVEAU: Ajouter apiSignalements et parcoursInfo
  const { flowState, startCheckout, resetFlow } = useCheckoutFlow();
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements } = useSignalements();
  const { currentCheckId } = useActiveCheckId(); // 🎯 FIX: Récupérer le checkId du contexte
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  // Déterminer le texte du titre basé sur le type de parcours
  const getEtatInitialTitle = (): string => {
    if (parcoursInfo?.type === 'Voyageur') {
      return 'Etat des lieux d\'entrée';
    }
    return 'Contrôle de l\'état initial du logement';
  };

  // Déterminer le texte de validation basé sur le type de parcours
  const getValidationTitle = (): string => {
    if (parcoursInfo?.type === 'Voyageur') {
      return 'État des lieux de sortie';
    }
    return 'Validation du ménage';
  };

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkout');

  // 🏁 État pour gérer la session terminée
  const [checkSession, setCheckSession] = useState<CheckSession | null>(null);
  const [isRapportReady, setIsRapportReady] = useState(false); // 📋 État du rapport IA
  const [rapportProgress, setRapportProgress] = useState(0); // 🎯 NOUVEAU: Progression du rapport (0-100)
  const [isSessionTerminated, setIsSessionTerminated] = useState(false);
  // 🆕 État pour la session de check-in
  const [checkinSession, setCheckinSession] = useState<CheckSession | null>(null);

  // 🏁 Charger la session au montage du composant et quand la page devient visible
  useEffect(() => {
    const loadSession = async () => {
      if (currentCheckId) {
        // ⏱️ Attendre un peu pour laisser le temps à la session d'être mise à jour
        await new Promise(resolve => setTimeout(resolve, 500));

        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session) {
          setCheckSession(session);
          setIsSessionTerminated(session.status === 'terminated');
          console.log('📋 Session chargée:', {
            status: session.status,
            rapportID: session.rapportID,
            isTerminated: session.status === 'terminated',
            etatInitialCompleted: session.progress?.etatInitialCompleted,
            etatInitialCompletedAt: session.progress?.etatInitialCompletedAt
          });

          // 🆕 Pour les parcours checkInAndCheckOut, l'état initial est dans la même session checkout
          // Chercher une session check-in séparée uniquement si l'état initial n'est pas dans la session actuelle
          if (user?.id && session.parcoursId && !session.progress?.etatInitialCompleted) {
            const allSessions = await checkSessionManager.getUserSessions(user.id);
            const checkinSessionFound = allSessions.find(
              s => s.parcoursId === session.parcoursId &&
                   s.flowType === 'checkin' &&
                   s.progress?.etatInitialCompleted === true
            );
            if (checkinSessionFound) {
              setCheckinSession(checkinSessionFound);
              console.log('📋 Session check-in séparée trouvée:', {
                checkId: checkinSessionFound.checkId,
                createdAt: checkinSessionFound.createdAt,
                etatInitialCompletedAt: checkinSessionFound.progress?.etatInitialCompletedAt
              });
            }
          } else if (session.progress?.etatInitialCompleted) {
            // L'état initial est dans la session checkout actuelle (cas des agents)
            setCheckinSession(session);
            console.log('📋 État initial dans la session checkout actuelle:', {
              checkId: session.checkId,
              createdAt: session.createdAt,
              etatInitialCompletedAt: session.progress?.etatInitialCompletedAt
            });
          }
        }
      }
    };

    loadSession();

    // 🔄 Recharger la session quand la page devient visible (retour depuis une autre page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page visible, rechargement de la session...');
        loadSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentCheckId, user?.id]);

  // 📋 Polling pour vérifier le statut du rapport IA
  useEffect(() => {
    // Conditions pour démarrer le polling :
    // 1. Le bouton rapport est visible (session terminée + rapportID existe)
    // ✅ FIX: Ne pas attendre flowState.isCompleted car la session peut être terminée avant
    const shouldPoll =
      checkSession?.status === 'terminated' &&
      checkSession?.rapportID;

    console.log('🔍 CheckoutHome: Conditions de polling:', {
      checkSessionStatus: checkSession?.status,
      rapportID: checkSession?.rapportID,
      flowStateCompleted: flowState?.isCompleted,
      shouldPoll,
      isRapportReady,
      currentCheckId
    });

    if (!shouldPoll || isRapportReady) {
      console.log('⏸️ CheckoutHome: Polling non démarré:', {
        reason: !shouldPoll ? 'Conditions non remplies' : 'Rapport déjà prêt'
      });
      return; // Ne pas démarrer le polling si conditions non remplies ou rapport déjà prêt
    }

    console.log('📋 CheckoutHome: Démarrage du polling pour vérifier le statut du rapport');

    // 🎯 NOUVEAU: Initialiser la progression à 10% au démarrage
    setRapportProgress(10);
    let pollCount = 0;

    // Fonction de vérification
    const checkRapportStatus = async () => {
      if (!currentCheckId) {
        console.warn('⚠️ CheckoutHome: currentCheckId manquant pour la vérification du rapport');
        return;
      }

      pollCount++;
      console.log('🔄 CheckoutHome: Vérification du statut du rapport pour checkId:', currentCheckId, `(tentative ${pollCount})`);
      const ready = await rapportStatusService.isRapportReady(currentCheckId);
      console.log('📊 CheckoutHome: Résultat de la vérification:', { ready, pollCount });

      if (ready) {
        console.log('✅ CheckoutHome: Rapport IA terminé et prêt à être consulté');
        setRapportProgress(100); // 🎯 NOUVEAU: Passer à 100% quand prêt
        setIsRapportReady(true);
      } else {
        // 🎯 NOUVEAU: Augmenter la progression graduellement (10% → 80%)
        // Formule: 10 + (pollCount * 7) avec un max de 80%
        const newProgress = Math.min(10 + (pollCount * 7), 80);
        setRapportProgress(newProgress);
        console.log('📊 CheckoutHome: Progression mise à jour:', { newProgress, pollCount });
      }
    };

    // Vérification immédiate
    checkRapportStatus();

    // Polling toutes les 3 secondes
    const intervalId = setInterval(checkRapportStatus, 3000);

    // Cleanup
    return () => {
      console.log('📋 CheckoutHome: Arrêt du polling du statut du rapport');
      clearInterval(intervalId);
    };
  }, [checkSession?.status, checkSession?.rapportID, currentCheckId, isRapportReady]);

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

  const handleStartCheckout = async () => {
    console.log('🎯 CheckoutHome: Démarrage du checkout avec préservation des paramètres');
    console.log('   → currentCheckId:', currentCheckId);
    console.log('   → URL actuelle:', window.location.href);

    startCheckout();

    // 🎯 NOUVEAU: Réinitialiser la position à la première pièce avant de naviguer
    if (currentCheckId) {
      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (session && rooms.length > 0) {
          // Trier les rooms par ordre pour obtenir la première
          const sortedRooms = [...rooms].sort((a, b) => a.ordre - b.ordre);
          const firstRoom = sortedRooms[0];

          console.log('✅ CheckoutHome: Réinitialisation position à la première pièce:', {
            firstRoomId: firstRoom?.id,
            firstRoomName: firstRoom?.nom,
            ordre: firstRoom?.ordre
          });

          // 🎯 CRITIQUE: Vérifier si le checkout a déjà été commencé
          // Si oui, NE PAS réinitialiser les interactions (pour préserver les tâches complétées)
          const hasExistingInteractions =
            session.progress?.interactions?.checkboxStates && Object.keys(session.progress.interactions.checkboxStates).length > 0 ||
            session.progress?.interactions?.photosTaken && Object.keys(session.progress.interactions.photosTaken).length > 0 ||
            session.progress?.interactions?.buttonClicks && Object.keys(session.progress.interactions.buttonClicks).length > 0;

          console.log('🔍 CheckoutHome: Vérification interactions existantes:', {
            hasExistingInteractions,
            checkboxStates: Object.keys(session.progress?.interactions?.checkboxStates || {}).length,
            photosTaken: Object.keys(session.progress?.interactions?.photosTaken || {}).length,
            buttonClicks: Object.keys(session.progress?.interactions?.buttonClicks || {}).length
          });

          // 🎯 NOUVEAU: Réinitialiser les interactions SEULEMENT si c'est un nouveau checkout
          const newProgress = {
            ...session.progress,
            currentPieceId: firstRoom?.id,
            currentTaskIndex: 0
          };

          // Si c'est un nouveau checkout (pas d'interactions), réinitialiser
          if (!hasExistingInteractions) {
            newProgress.interactions = {
              photosTaken: {},
              checkboxStates: {},
              buttonClicks: {}
            };
            console.log('✅ CheckoutHome: Réinitialisation des interactions (nouveau checkout)');
          } else {
            console.log('✅ CheckoutHome: Préservation des interactions existantes (reprise du checkout)');
          }

          await checkSessionManager.saveCheckSession({
            ...session,
            progress: newProgress
          });
        }
      } catch (error) {
        console.error('❌ CheckoutHome: Erreur réinitialisation position:', error);
      }
    }

    // 🆕 REFACTORISÉ: Utiliser navigateWithParams
    navigateWithParams('/checkout');

    console.log('✅ CheckoutHome: Navigation vers /checkout avec paramètres préservés');
  };

  const handleSignalerProbleme = () => {
    // ✅ CORRECTION: Ouvrir le modal de signalement sans pièce pré-sélectionnée
    openReportModal();
  };

  // ✅ NOUVEAU: Combiner les signalements utilisateur et API
  const userSignalements = getPendingSignalements();
  const apiSignalementsATraiter = apiSignalements.filter(sig => sig.status === 'A_TRAITER');

  // ✅ NOUVEAU - Compter TOUS les signalements (actifs + historiques) avec useMemo pour éviter les re-renders
  const signalementsCount = useMemo(() => {
    return countActiveSignalements([...userSignalements, ...apiSignalementsATraiter]);
  }, [userSignalements, apiSignalements]);

  // 🎯 FIX: Détecter si le checkout est en cours ou pas encore commencé
  const hasCheckoutProgress = () => {
    // 🎯 SIMPLE: Vérifier si le checkout a été démarré
    // flowState.startTime est défini quand on appelle startCheckout()
    // C'est le meilleur indicateur pour savoir si l'utilisateur a vraiment commencé

    const hasStarted = !!flowState.startTime;

    console.log('🔍 CheckoutHome hasCheckoutProgress:', {
      flowStateStartTime: flowState.startTime,
      hasStarted,
      result: hasStarted
    });

    return hasStarted;
  };

  const getCheckoutButtonText = () => {
    // 🎯 FIX: Adapter le texte selon le type d'utilisateur
    const isAgent = user?.type === 'AGENT' || user?.type === 'GESTIONNAIRE';

    if (flowState.isCompleted) {
      if (isAgent) {
        return "✅ Ménage terminé";
      }
      return "✅ État des lieux de sortie terminé";
    }

    // Texte selon progression et type d'utilisateur
    if (isAgent) {
      return "Finaliser mon ménage";
    } else {
      // 🎯 FIX: Afficher "Commencer" si pas encore commencé, "Finaliser" sinon
      const hasProgress = hasCheckoutProgress();
      console.log('🔍 CheckoutHome getCheckoutButtonText:', {
        hasProgress,
        buttonText: hasProgress ? "Faire mon état des lieux de sortie" : "Commencer mon état des lieux de sortie"
      });
      return hasProgress ? "Faire mon état des lieux de sortie" : "Commencer mon état des lieux de sortie";
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header with consistent typography - ✅ UTILISE LES VRAIES DONNÉES */}
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
        {/* Timeline des états des lieux - Design discret */}
        {(takePicture === 'checkInAndCheckOut' || checkSession?.completedAt) && (
          <div className="space-y-2 py-2 animate-fade-in">
            {/* Étape 1: État des lieux d'entrée */}
            {takePicture === 'checkInAndCheckOut' && (
              <div className="flex gap-3">
                {/* Icône et ligne */}
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  {checkSession?.completedAt && (
                    <div className="w-0.5 h-6 bg-green-200 my-1" />
                  )}
                </div>
                {/* Contenu */}
                <div className="pb-2">
                  <p className="text-xs font-medium text-foreground">{getEtatInitialTitle()}</p>
                  <p className="text-xs text-muted-foreground">
                    {checkinSession ? (
                      <>
                        {new Date(
                          checkinSession.progress?.etatInitialCompletedAt || checkinSession.createdAt
                        ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(
                          checkinSession.progress?.etatInitialCompletedAt || checkinSession.createdAt
                        ).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </>
                    ) : (
                      <>Heure prévue: {propertyData.checkIn}</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Étape 2: État des lieux de sortie */}
            {checkSession?.completedAt && (
              <div className="flex gap-3">
                {/* Icône */}
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                </div>
                {/* Contenu */}
                <div className="pb-2">
                  <p className="text-xs font-medium text-foreground">{getValidationTitle()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(checkSession.completedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - {new Date(checkSession.completedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Information cards with consistent styling */}
        <Dialog>
          <DialogTrigger asChild>
            <Card variant="elevated" className="cursor-pointer group animate-fade-in">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Informations utiles
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
                </CardTitle>
                {/* ✅ Badges conditionnels selon logementContentview */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {propertyData.visibleSections.includes('adresse') && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                      <MapPin className="h-3 w-3" />
                      Adresse
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('wifi') && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                      <Wifi className="h-3 w-3" />
                      WiFi
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('parking') && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                      <Car className="h-3 w-3" />
                      Se garer
                    </Badge>
                  )}
                  {propertyData.visibleSections.includes('checkin-checkout') && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                      <Clock className="h-3 w-3" />
                      Check-in/out
                    </Badge>
                  )}
                </div>
              </CardHeader>
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
        <RoomsModal flowType="checkout">
          <Card className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  Voir les pièces
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        </RoomsModal>

        {/* Consigne pour le ménage */}
        <CleaningInstructionsModal flowType="checkout">
          <Card className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Consigne pour le ménage
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
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

        {/* Standardized CTA Section */}
        <div className="h-32"></div>
      </div>

      {/* Consistent CTA Section */}
      {isSessionTerminated && checkSession?.rapportID ? (
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
            label: getCheckoutButtonText(),
            onClick: flowState.isCompleted ? () => {} : handleStartCheckout,
            variant: flowState.isCompleted ? "default" : "cta",
            disabled: flowState.isCompleted && !isSessionTerminated
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

export default CheckoutHome;
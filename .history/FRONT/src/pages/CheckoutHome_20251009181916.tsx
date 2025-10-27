import { useState, useEffect } from "react";
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
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from "@/hooks/useSessionData";
import { useParcoursDataUnified } from "@/hooks/useParcoursDataUnified";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import { navigationStateManager } from "@/services/navigationStateManager";

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
  const { rooms, currentParcours, apiSignalements } = useParcoursData();  // ✅ NOUVEAU: Ajouter apiSignalements
  const { flowState, startCheckout, resetFlow } = useCheckoutFlow();
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements } = useSignalements();
  const { currentCheckId } = useActiveCheckId(); // 🎯 FIX: Récupérer le checkId du contexte
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkout');

  // 🏁 État pour gérer la session terminée
  const [checkSession, setCheckSession] = useState<CheckSession | null>(null);
  const [isSessionTerminated, setIsSessionTerminated] = useState(false);

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
            isTerminated: session.status === 'terminated'
          });
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
  }, [currentCheckId]);

  // 🎯 FIX: Extraire les vraies données du logement depuis l'API au lieu d'utiliser des données mock
  const propertyData = currentParcours?.rawData
    ? extractPropertyDataFromRawData(currentParcours.rawData)
    : extractPropertyDataFromRawData(null);

  // ✅ NOUVEAU: Extraire les données réelles pour l'affichage du header
  const propertyName = currentParcours?.rawData?.logementName || 'Logement';
  const parcoursName = currentParcours?.rawData?.parcoursName || 'Ménage en cours';
  const takePicture = currentParcours?.rawData?.takePicture || '';

  // Déterminer le message de photos selon la configuration
  const getPhotoInstructions = () => {
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

  const handleStartCheckout = () => {
    console.log('🎯 CheckoutHome: Démarrage du checkout avec préservation des paramètres');
    console.log('   → currentCheckId:', currentCheckId);
    console.log('   → URL actuelle:', window.location.href);

    startCheckout();

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
  const signalementsCount = userSignalements.length + apiSignalementsATraiter.length;

  // 🎯 FIX: Détecter si le checkout est en cours ou pas encore commencé
  const hasCheckoutProgress = () => {
    // Vérifier s'il y a des tâches complétées ou si on a commencé le flow
    return Object.keys(flowState.completedTasks).length > 0 || 
           flowState.startTime || 
           flowState.currentStep.pieceId !== '';
  };

  const getCheckoutButtonText = () => {
    // 🏁 Si la session est terminée, afficher le bouton de rapport
    if (isSessionTerminated && checkSession?.rapportID) {
      return "📋 Voir mon rapport";
    }

    // 🎯 FIX: Adapter le texte selon le type d'utilisateur
    const isAgent = user?.type === 'AGENT' || user?.type === 'GESTIONNAIRE';

    if (flowState.isCompleted) {
      if (isAgent) {
        return "✅ Ménage terminé";
      }
      return "✅ Check de sortie terminé";
    }

    // Texte selon progression et type d'utilisateur
    if (isAgent) {
      return hasCheckoutProgress() ? "Continuer mon ménage" : "Finaliser mon ménage";
    } else {
      return hasCheckoutProgress() ? "Continuer mon check de sortie" : "Finaliser mon check de sortie";
    }
  };

  // 🏁 Fonction pour ouvrir le rapport dans Bubble
  const handleOpenRapport = () => {
    if (checkSession?.rapportID) {
      const bubbleEnv = environment.BUBBLE_ENV; // 'version-test' ou 'version-live'
      const rapportUrl = `https://app.checkeasy.co/${bubbleEnv}/rapport/${checkSession.rapportID}`;
      console.log('📋 Ouverture du rapport:', rapportUrl);
      window.open(rapportUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with consistent typography - ✅ UTILISE LES VRAIES DONNÉES */}
      <div className="bg-background px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Typography variant="page-title">
                {parcoursName}
              </Typography>
              <Typography variant="page-subtitle">
                {propertyName}
              </Typography>
              {getPhotoInstructions() && (
                <Typography variant="caption">
                  {getPhotoInstructions()}
                </Typography>
              )}
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-3">
        {/* Success banners with consistent styling */}
        {/* Check d'entrée effectué */}
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
                    Heure d'arrivée prévue: {propertyData.checkIn}
                  </Typography>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check de sortie effectué */}
        <Card variant="glass" className="border-green-200 bg-green-50/80 animate-fade-in">
          <CardHeader className="py-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <CardTitle className="text-base text-green-800">
                  Check de sortie effectué
                </CardTitle>
                <div className="flex items-center gap-4 mt-1">
                  <Typography variant="caption" className="text-green-600">
                    Heure de sortie prévue: {propertyData.checkOut}
                  </Typography>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Information cards with consistent styling */}
        <Dialog>
          <DialogTrigger asChild>
            <Card variant="elevated" className="cursor-pointer group animate-fade-in">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
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
              <CardTitle className="text-base flex items-center justify-between">
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
              <CardTitle className="text-base flex items-center justify-between">
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
            onClick={() => navigatePreservingParams(navigate, '/signalements-a-traiter', currentCheckId, 'resume')}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
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
      <CTASection
        primaryAction={{
          label: getCheckoutButtonText(),
          onClick: isSessionTerminated && checkSession?.rapportID
            ? handleOpenRapport
            : (flowState.isCompleted ? () => {} : handleStartCheckout),
          variant: (isSessionTerminated && checkSession?.rapportID) || flowState.isCompleted ? "default" : "cta",
          disabled: flowState.isCompleted && !isSessionTerminated
        }}
        bottomText={{
          label: "Signaler un problème",
          onClick: handleSignalerProbleme,
        }}
      />

      {/* Profile Sheet */}
      <ProfileSheet 
        isOpen={isProfileSheetOpen} 
        onClose={() => setIsProfileSheetOpen(false)} 
        onLogout={() => {
          // Logique de déconnexion si nécessaire
          setIsProfileSheetOpen(false);
        }}
      />
    </div>
  );
};

export default CheckoutHome;
import { useState } from "react";
import { ArrowLeft, ArrowRight, Wifi, Car, Home, Calendar, Clock, MapPin, Brush, Star, Camera, CheckCircle, FileText, ClipboardList, AlertTriangle, ChevronRight, Key, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useCheckinFlow } from "@/contexts/CheckinFlowContext";
import { useAppFlow } from "@/contexts/AppFlowContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { navigatePreservingParams } from "@/utils/navigationHelpers";
import { LegacyRoom } from "@/types/room";
import { toast } from "sonner";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { extractPropertyDataFromRawData } from "@/utils/propertyDataHelpers";
import { checkSessionManager, CheckSession } from "@/services/checkSessionManager";
import { environment } from "@/config/environment";
import { useEffect } from "react";

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
    
    // Vérifier l'état des flows
    const isCheckinCompleted = checkinFlowState?.isCompleted || appFlowState?.checkinCompleted;
    const isCheckoutCompleted = checkoutFlowState?.isCompleted || appFlowState?.checkoutCompleted;
    
    console.log('🎯 CheckinHome: État des flows:', {
      userType,
      takePicture: parcoursInfo?.takePicture,
      isCheckinCompleted,
      isCheckoutCompleted,
      checkinFlowState: checkinFlowState?.isCompleted,
      appFlowState: appFlowState?.checkinCompleted
    });
    
    // Si pas de données de parcours, fallback vers CheckIn
    if (!parcoursInfo || !userType) {
      return {
        label: "Continuer mon état des lieux",
        action: () => navigatePreservingParams(navigate, '/checkin', currentCheckId),
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
          navigatePreservingParams(navigate, '/checkout', currentCheckId);
        },
        icon: <ArrowRight className="h-4 w-4" />
      };
    }

    // SCÉNARIO 1: Agent/Gestionnaire avec checkInAndCheckOut ET CheckIn pas terminé → Continuer CheckIn
    if ((isAgent || isGestionnaire) && isCheckInAndOut && !isCheckinCompleted) {
      return {
        label: "Continuer le contrôle d'entrée",
        action: () => navigatePreservingParams(navigate, '/checkin', currentCheckId),
        icon: <Camera className="h-4 w-4" />
      };
    }

    // SCÉNARIO 2: Agent/Gestionnaire avec checkOutOnly → Aller vers CheckOut
    if ((isAgent || isGestionnaire) && parcoursInfo.takePicture === 'checkOutOnly') {
      return {
        label: "Finaliser mon ménage",
        action: () => {
          startCheckout();
          navigatePreservingParams(navigate, '/checkout', currentCheckId);
        },
        icon: <ArrowRight className="h-4 w-4" />
      };
    }

    // SCÉNARIO 3: Client avec checkInAndCheckOut ET CheckIn pas terminé → Continuer CheckIn
    if (isClient && isCheckInAndOut && !isCheckinCompleted) {
      return {
        label: "Continuer mon état des lieux d'entrée",
        action: () => navigatePreservingParams(navigate, '/checkin', currentCheckId),
        icon: <Camera className="h-4 w-4" />
      };
    }

    // SCÉNARIO 4: Client avec checkInOnly → Continuer CheckIn
    if (isClient && parcoursInfo.takePicture === 'checkInOnly') {
      return {
        label: "Continuer mon check-in",
        action: () => navigatePreservingParams(navigate, '/checkin', currentCheckId),
        icon: <Camera className="h-4 w-4" />
      };
    }

    // SCÉNARIO 5: Client avec checkOutOnly → Aller vers CheckOut
    if (isClient && parcoursInfo.takePicture === 'checkOutOnly') {
      return {
        label: "Faire mon check out",
        action: () => {
          startCheckout();
          navigatePreservingParams(navigate, '/checkout', currentCheckId);
        },
        icon: <ArrowRight className="h-4 w-4" />
      };
    }

    // Fallback: Continuer CheckIn
    return {
      label: "Continuer mon état des lieux",
      action: () => navigatePreservingParams(navigate, '/checkin', currentCheckId),
      icon: <Camera className="h-4 w-4" />
    };
  };

  const ctaConfig = getCtaConfig();

  // ✅ NOUVEAU: Combiner les signalements utilisateur et API
  const userSignalements = getPendingSignalements();
  const apiSignalementsATraiter = apiSignalements.filter(sig => sig.status === 'A_TRAITER');
  const signalementsCount = userSignalements.length + apiSignalementsATraiter.length;

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto">
      {/* Header - Mobile optimized avec design system - ✅ UTILISE LES VRAIES DONNÉES */}
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
        {/* Success banner */}
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

        {/* Information cards with consistent styling */}
        <Dialog>
          <DialogTrigger asChild>
            <Card variant="elevated" className="cursor-pointer group animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Typography variant="card-title" className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Informations utiles
                  </Typography>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    <Wifi className="h-3 w-3 mr-1" />
                    WiFi
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Car className="h-3 w-3 mr-1" />
                    Parking
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Key className="h-3 w-3 mr-1" />
                    Accès
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Horaires
                  </Badge>
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
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
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
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
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
            className="border border-border/50 rounded-xl overflow-hidden bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/signalements-a-traiter')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Signalements en cours
                  <div className="bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ml-1">
                    {signalementsCount}
                  </div>
                </h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}


        {/* CTA Section with standardized layout */}
        <div className="h-32"></div>
      </div>

      {/* Standardized CTA Section */}
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
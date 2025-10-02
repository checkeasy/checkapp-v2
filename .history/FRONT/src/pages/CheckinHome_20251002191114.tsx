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
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { LegacyRoom } from "@/types/room";
import { toast } from "sonner";

// Mock data
const mockPropertyData = {
  address: "10 Bd de la Corderie, 13007 Marseille, France",
  wifi: {
    network: "SFR_AOF3",
    password: "svytzbgq8aewk69zykfe"
  },
  parking: "Parking gratuit dans la cour, places numérotées 12-15",
  access: "Code d'entrée : 1234A. Clés dans la boîte à clés (code 5678)",
  airbnbLink: "https://airbnb.com/rooms/123456789",
  checkIn: "15:00",
  checkOut: "11:00"
};

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
  const { flowState, startCheckout, resetFlow } = useCheckoutFlow();
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements } = useSignalements();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const handleStartCheckin = () => {
    startCheckout();
    navigate('/checkin');
  };

  const handleSignalerProbleme = () => {
    // ✅ CORRECTION: Ouvrir le modal de signalement sans pièce pré-sélectionnée
    openReportModal();
  };

  // ✅ CORRECTION: Utiliser les vrais signalements du contexte
  const signalementsCount = getPendingSignalements().length;

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto">
      {/* Header - Mobile optimized avec design system */}
      <div className="bg-background px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Typography variant="page-title">
                Ménage en cours
              </Typography>
              <Typography variant="page-subtitle">
                Tiny House Romanée
              </Typography>
              <Typography variant="caption">
                Photos à l'entrée et à la sortie
              </Typography>
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
                    Heure de début: 14:15
                  </Typography>
                  <Typography variant="caption" className="text-green-600">
                    Heure de fin: 14:22
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
            <PropertyInfo propertyData={mockPropertyData} />
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
        <CleaningInstructionsModal flowType="checkout">
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

        {/* Signalements à traiter */}
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


        {/* CTA Section with standardized layout */}
        <div className="h-32"></div>
      </div>

      {/* Standardized CTA Section */}
      <CTASection
        primaryAction={{
          label: user?.type === "CLIENT" ? "Faire mon check out" : "Finaliser mon ménage",
          onClick: () => {
            startCheckout();
            navigate('/checkout');
          },
          icon: <ArrowRight className="h-4 w-4" />,
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
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
import { Signalement } from "@/types/signalement";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";

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

// Mock signalements data
const mockSignalements: Signalement[] = [
  {
    id: "sig-1",
    titre: "Fuite d'eau sous le lavabo, le sol est mouillé",
    piece: "Salle de bain",
    origine: "CLIENT",
    description: "Fuite d'eau importante sous le lavabo",
    status: 'A_TRAITER',
    priorite: true,
    miniatures: [],
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  }
];

export const CheckoutHome = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { rooms } = useParcoursData();
  const { flowState, startCheckout, resetFlow } = useCheckoutFlow();
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements } = useSignalements();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const handleStartCheckout = () => {
    startCheckout();
    navigate('/checkout');
  };

  const handleSignalerProbleme = () => {
    // ✅ CORRECTION: Ouvrir le modal de signalement sans pièce pré-sélectionnée
    openReportModal();
  };

  // ✅ CORRECTION: Utiliser les vrais signalements du contexte
  const signalementsCount = getPendingSignalements().length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with consistent typography */}
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
                    Heure de début: 10:34
                  </Typography>
                  <Typography variant="caption" className="text-green-600">
                    Heure de fin: 10:38
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
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <MapPin className="h-3 w-3" />
                    Adresse
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Wifi className="h-3 w-3" />
                    WiFi
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Car className="h-3 w-3" />
                    Se garer
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Clock className="h-3 w-3" />
                    Check-in/out
                  </Badge>
                </div>
              </CardHeader>
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

        {/* Signalements à traiter */}
        <Card 
          className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/signalements-a-traiter')}
        >
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Signalements en cours
                {signalementsCount > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {signalementsCount}
                  </Badge>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Standardized CTA Section */}
        <div className="h-32"></div>
      </div>

      {/* Consistent CTA Section */}
      <CTASection
        primaryAction={{
          label: "Voir le rapport",
          onClick: () => {
            console.log('Voir le rapport - navigation vers page de rapport à implémenter');
            // TODO: Navigate to report page when it's implemented
          },
          icon: <FileText className="h-4 w-4" />,
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
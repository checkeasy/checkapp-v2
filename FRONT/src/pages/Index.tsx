import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Home, Camera, Briefcase } from "lucide-react";
import { useCheckoutFlow } from "@/contexts/CheckoutFlowContext";
import { useUser } from "@/contexts/UserContext";

const Index = () => {
  const navigate = useNavigate();
  const { flowState, resetFlow } = useCheckoutFlow();
  const { user } = useUser();

  const handleStartCheckout = () => {
    resetFlow();
    navigate('/checkout');
  };

  const handleRestartCheckout = () => {
    resetFlow();
    navigate('/checkout');
  };

  const handleStartCheckin = () => {
    navigate('/checkin');
  };

  const isAgent = user?.type === 'AGENT';
  const isClient = user?.type === 'CLIENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {isAgent ? <Briefcase className="h-8 w-8 text-white" /> : <Home className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isAgent ? 'Ménage Manager' : 'CheckOut Manager'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isAgent ? 'Gérez vos tâches de ménage facilement' : 'Gérez vos contrôles de sortie facilement'}
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {flowState.isCompleted ? (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-green-700 mb-2">
                  Check de sortie : validé
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Tous les contrôles ont été effectués avec succès
                </p>
                <Button 
                  onClick={handleRestartCheckout}
                  variant="outline"
                  className="w-full"
                >
                  Refaire un contrôle
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {isAgent ? 'Ménage à effectuer' : 'Contrôle de sortie'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {isAgent 
                    ? 'Effectuez le nettoyage de toutes les pièces du logement' 
                    : 'Effectuez le contrôle de toutes les pièces avant la sortie du logement'
                  }
                </p>
                
                {/* Progress indicators */}
                <div className="flex justify-center gap-2 mb-6">
                  <Badge variant="outline" className="text-xs">
                    {isAgent ? '5 pièces à nettoyer' : '6 photos à prendre'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isAgent ? 'Checklist incluse' : '1 tâche à valider'}
                  </Badge>
                </div>

                <Button 
                  onClick={isAgent ? handleStartCheckin : handleStartCheckout}
                  className="w-full h-12 font-medium text-base rounded-xl transition-all duration-300 bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] shadow-card"
                >
                  {isAgent ? 'Commencer mon ménage' : 'Aller au check-in'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Parcours : Chambre (4 étapes) → Salon → Cuisine
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

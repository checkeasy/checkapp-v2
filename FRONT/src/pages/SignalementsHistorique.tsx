import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { Signalement } from "@/types/signalement";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { deduplicateSignalements } from "@/utils/signalementFilters";

export default function SignalementsHistorique() {
  const navigate = useNavigate();
  const { signalements } = useSignalements();
  const { apiSignalements } = useParcoursData();
  const { currentCheckId } = useActiveCheckId();

  // ✅ NOUVEAU - Charger tous les signalements (résolus + historiques)
  const allSignalements = useMemo(() => {
    // Combiner les signalements utilisateur et API
    const combined = [...signalements, ...apiSignalements];

    // ✅ Dédupliquer pour éviter les doublons
    return deduplicateSignalements(combined);
  }, [signalements, apiSignalements]);

  // ✅ NOUVEAU - Filtrer pour exclure les signalements du rapport actuel
  const historicalSignalements = useMemo(() => {
    if (!currentCheckId) {
      // Si pas de rapport actif, afficher tous les signalements résolus
      return allSignalements.filter(sig => sig.status === 'RESOLU');
    }

    // Exclure les signalements du rapport actuel (checkId)
    // Logique:
    // 1. Exclure les signalements utilisateur du rapport actuel (checkId === currentCheckId)
    // 2. Afficher les signalements résolus des rapports précédents (checkId !== currentCheckId)
    // 3. Afficher les signalements API (origine === 'HISTORIQUE', pas de checkId)
    return allSignalements.filter(sig => {
      // Si c'est un signalement utilisateur (a un checkId)
      if (sig.checkId) {
        // Exclure s'il appartient au rapport actuel
        if (sig.checkId === currentCheckId) {
          return false;
        }
        // Afficher seulement s'il est résolu
        return sig.status === 'RESOLU';
      }
      // Si c'est un signalement API (pas de checkId), afficher tous
      return true;
    });
  }, [allSignalements, currentCheckId]);

  // Sort by updated_at descending
  const sortedSignalements = [...historicalSignalements].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrigineBadgeColor = (origine: string) => {
    switch (origine.toLowerCase()) {
      case 'voyageur':
        return 'bg-blue-100 text-blue-700';
      case 'agent de ménage':
        return 'bg-green-100 text-green-700';
      case 'gestionnaire':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSignalementTap = (signalement: Signalement) => {
    // Navigate to signalement detail (to be implemented)
    console.log('Navigate to signalement detail:', signalement.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-background px-4 py-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Historique - Signalements résolus</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {sortedSignalements.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun signalement résolu</p>
            </div>
          ) : (
            sortedSignalements.map((signalement) => (
              <Card 
                key={signalement.id} 
                className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSignalementTap(signalement)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <h3 className="text-sm font-medium text-foreground">
                          {signalement.titre}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{signalement.piece}</span>
                        <span>•</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 rounded-full ${getOrigineBadgeColor(signalement.origine)}`}
                        >
                          {signalement.origine}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Résolu le {formatDateTime(signalement.updated_at)}</span>
                      </div>
                    </div>

                    {signalement.imgUrl && (
                      <div className="flex gap-1 ml-3">
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                          <img
                            src={signalement.imgUrl}
                            alt="Signalement"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
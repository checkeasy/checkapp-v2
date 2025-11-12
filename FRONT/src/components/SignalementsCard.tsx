import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, Camera, MessageSquare, CheckCircle2 } from "lucide-react";
import { Signalement } from "@/types/signalement";
import { useNavigate } from "react-router-dom";
import { useSignalements } from "@/contexts/SignalementsContext";

interface SignalementsCardProps {
  onNavigateToAll: () => void;
}

export function SignalementsCard({ onNavigateToAll }: SignalementsCardProps) {
  const navigate = useNavigate();
  const { getPendingSignalements } = useSignalements();
  
  const signalements = getPendingSignalements();
  // Get 1 most recent signalement
  const recentSignalements = signalements.slice(0, 1);
  const totalCount = signalements.length;

  if (totalCount === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
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

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3 cursor-pointer" onClick={onNavigateToAll}>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Signalements en cours
            <div className="bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {totalCount}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
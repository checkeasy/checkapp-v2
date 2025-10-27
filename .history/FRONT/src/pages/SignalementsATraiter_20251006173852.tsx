import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MessageSquare, CheckCircle2, AlertTriangle, Clock, Camera, History } from "lucide-react";
import { Signalement } from "@/types/signalement";
import { useToast } from "@/hooks/use-toast";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";

export default function SignalementsATraiter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openReportModal } = useReportProblem();
  const { getPendingSignalements, resolveSignalement } = useSignalements();
  const { apiSignalements } = useParcoursData();  // ✅ NOUVEAU - Récupérer les signalements API
  const [commentText, setCommentText] = useState("");

  const userSignalements = getPendingSignalements();

  // ✅ NOUVEAU - Combiner les signalements utilisateur et API
  const allSignalements = useMemo(() => {
    // Filtrer les signalements API pour ne garder que ceux à traiter
    const apiSignalementsATraiter = apiSignalements.filter(sig => sig.status === 'A_TRAITER');
    return [...userSignalements, ...apiSignalementsATraiter];
  }, [userSignalements, apiSignalements]);

  // Sort by priority (true first) then by created_at descending
  const sortedSignalements = [...allSignalements].sort((a, b) => {
    if (a.priorite !== b.priorite) {
      return a.priorite ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

  const handleAddComment = (signalementId: string) => {
    if (!commentText.trim()) return;
    
    toast({
      title: "Commentaire ajouté",
      description: "Votre commentaire a été enregistré"
    });
    setCommentText("");
  };

  const handleMarkResolved = (signalementId: string) => {
    resolveSignalement(signalementId);
    toast({
      title: "Signalement résolu",
      description: "Le signalement a été marqué comme résolu"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-background px-4 py-6 border-b border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Signalement en cours</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 pb-32">
          {sortedSignalements.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun signalement à traiter</p>
            </div>
          ) : (
            sortedSignalements.map((signalement) => (
              <Card key={signalement.id} className="border border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {signalement.priorite && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
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
                        <span>{formatDateTime(signalement.created_at)}</span>
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

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Commenter
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Ajouter un commentaire</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Votre commentaire..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows={3}
                          />
                          <Button 
                            onClick={() => handleAddComment(signalement.id)}
                            className="w-full h-12 font-medium text-base rounded-xl transition-all duration-300 bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] shadow-card"
                          >
                            Ajouter le commentaire
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleMarkResolved(signalement.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Résolu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        {/* Fixed bottom button */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/80 backdrop-blur-md border-t border-border/20 p-4 shadow-lg">
          <Button
            onClick={() => openReportModal()}
            variant="outline"
            className="w-full h-10 font-medium text-sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Signaler un problème
          </Button>
        </div>
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Camera, CheckSquare, AlertCircle } from "lucide-react";
import { PieceStatus } from "@/types/room";

interface PieceStepsOverviewProps {
  pieces: PieceStatus[];
  onPieceSelected: (pieceId: string) => void;
  completedTasks: Record<string, boolean>;
}

export const PieceStepsOverview = ({ pieces, onPieceSelected, completedTasks }: PieceStepsOverviewProps) => {
  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'photo_required':
      case 'photo_optional':
      case 'photo_multiple':
        return <Camera className="h-4 w-4" />;
      case 'checkbox':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (piece: PieceStatus) => {
    const completedCount = piece.tasks?.filter(task => completedTasks[task.id])?.length || 0;
    const totalCount = piece.tasks?.length || 0;
    
    if (completedCount === totalCount && totalCount > 0) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Terminée</Badge>;
    } else if (completedCount > 0) {
      return <Badge variant="secondary">En cours</Badge>;
    } else {
      return <Badge variant="outline">À faire</Badge>;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold text-center mb-4">Étapes par pièce</h2>
      
      {pieces.map((piece) => (
        <Card key={piece.id} className="transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">{piece.nom}</CardTitle>
              {getStatusBadge(piece)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Liste des étapes */}
            <div className="space-y-2">
              {piece.tasks?.map((task, index) => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    completedTasks[task.id] 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {completedTasks[task.id] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="text-muted-foreground">
                        {getTaskIcon(task.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      completedTasks[task.id] ? 'text-green-800 line-through' : 'text-foreground'
                    }`}>
                      {task.label}
                    </div>
                    {task.description && (
                      <div className={`text-xs mt-1 ${
                        completedTasks[task.id] ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Progression */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Progression</span>
                <span>{piece.tasks?.filter(task => completedTasks[task.id])?.length || 0}/{piece.tasks?.length || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${piece.tasks?.length ? 
                      ((piece.tasks.filter(task => completedTasks[task.id]).length) / piece.tasks.length) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Bouton d'action */}
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => onPieceSelected(piece.id)}
            >
              {piece.tasks?.every(task => completedTasks[task.id]) ? 
                'Revoir cette pièce' : 
                'Commencer cette pièce'
              }
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
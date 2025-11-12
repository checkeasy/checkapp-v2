import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Camera } from "lucide-react";

interface ProgressTrackerProps {
  currentStep: "entry" | "exit" | "completed";
  entryProgress: {
    photosCompleted: number;
    totalPhotos: number;
  };
  exitProgress: {
    tasksCompleted: number;
    totalTasks: number;
    photosCompleted: number;
    totalPhotos: number;
  };
}

export const ProgressTracker = ({ currentStep, entryProgress, exitProgress }: ProgressTrackerProps) => {
  const getStepStatus = (step: string) => {
    if (currentStep === "completed") return "completed";
    if (currentStep === step) return "current";
    if (currentStep === "exit" && step === "entry") return "completed";
    return "pending";
  };

  const entryProgressPercent = entryProgress.totalPhotos > 0 
    ? (entryProgress.photosCompleted / entryProgress.totalPhotos) * 100 
    : 0;

  const exitTasksPercent = exitProgress.totalTasks > 0 
    ? (exitProgress.tasksCompleted / exitProgress.totalTasks) * 100 
    : 0;

  const exitPhotosPercent = exitProgress.totalPhotos > 0 
    ? (exitProgress.photosCompleted / exitProgress.totalPhotos) * 100 
    : 0;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Progression de l'état des lieux</h3>
          
          {/* Étapes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStepStatus("entry") === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : getStepStatus("entry") === "current" ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <span className={`font-medium ${
                getStepStatus("entry") === "completed" ? "text-success" : 
                getStepStatus("entry") === "current" ? "text-primary" : "text-muted-foreground"
              }`}>
                État d'entrée
              </span>
            </div>
            <Badge variant={getStepStatus("entry") === "completed" ? "default" : "secondary"}>
              {entryProgress.photosCompleted}/{entryProgress.totalPhotos} photos
            </Badge>
          </div>

          {currentStep === "entry" && (
            <div className="ml-7">
              <Progress value={entryProgressPercent} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                Photos de référence prises
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStepStatus("exit") === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : getStepStatus("exit") === "current" ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <span className={`font-medium ${
                getStepStatus("exit") === "completed" ? "text-success" : 
                getStepStatus("exit") === "current" ? "text-primary" : "text-muted-foreground"
              }`}>
                État de sortie
              </span>
            </div>
            <div className="flex gap-2">
              <Badge variant={exitProgress.tasksCompleted === exitProgress.totalTasks ? "default" : "secondary"}>
                {exitProgress.tasksCompleted}/{exitProgress.totalTasks} tâches
              </Badge>
              <Badge variant={exitProgress.photosCompleted === exitProgress.totalPhotos ? "default" : "secondary"}>
                {exitProgress.photosCompleted}/{exitProgress.totalPhotos} photos
              </Badge>
            </div>
          </div>

          {currentStep === "exit" && (
            <div className="ml-7 space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tâches ménage</span>
                  <span>{Math.round(exitTasksPercent)}%</span>
                </div>
                <Progress value={exitTasksPercent} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Photos finales</span>
                  <span>{Math.round(exitPhotosPercent)}%</span>
                </div>
                <Progress value={exitPhotosPercent} className="w-full" />
              </div>
            </div>
          )}

          {currentStep === "completed" && (
            <div className="ml-7 p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">État des lieux terminé</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Le rapport IA est en cours de génération
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
import { CheckCircle2, Circle, Camera, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types/room";
import { cn } from "@/lib/utils";

interface TaskNavigationAccordionProps {
  tasks: Task[];
  currentTaskIndex: number;
  completedTasks: Record<string, boolean>;
  onTaskSelected: (taskIndex: number) => void;
  pieceName: string;
}

export const TaskNavigationAccordion = ({
  tasks,
  currentTaskIndex,
  completedTasks,
  onTaskSelected,
  pieceName
}: TaskNavigationAccordionProps) => {
  // Always show for debugging - will add condition back later  
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-yellow-100 p-4 rounded-xl">
        <p className="text-sm">Aucune tâche trouvée pour cette pièce</p>
      </div>
    );
  }

  const getTaskIcon = (task: Task, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    switch (task.type) {
      case 'photo_required':
      case 'photo_optional':
      case 'photo_multiple':
        return <Camera className="h-4 w-4 text-muted-foreground" />;
      case 'checkbox':
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTaskStatus = (taskIndex: number, isCompleted: boolean) => {
    if (isCompleted) {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">Terminée</Badge>;
    }
    if (taskIndex === currentTaskIndex) {
      return <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/20">En cours</Badge>;
    }
    return <Badge variant="outline" className="text-xs">À faire</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="tasks" className="border-none">
          <AccordionTrigger className="hover:no-underline bg-white/40 backdrop-blur-sm rounded-t-xl px-4 py-3 border border-white/30 data-[state=open]:rounded-b-none transition-all duration-300">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Navigation dans {pieceName} ({tasks.length} tâches)
              </span>
              <Badge variant="outline" className="text-xs">
                {tasks.filter(task => completedTasks[task.id]).length}/{tasks.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="bg-white/70 backdrop-blur-sm rounded-b-xl border-x border-b border-white/30 border-t-0 px-4 pb-4">
            <div className="space-y-2 pt-2">
              {tasks.map((task, index) => {
                const isCompleted = completedTasks[task.id] || false;
                const isCurrent = index === currentTaskIndex;
                
                return (
                  <Button
                    key={task.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start p-3 h-auto hover:bg-white/50 transition-all duration-200",
                      isCurrent && "bg-primary/10 border border-primary/20 hover:bg-primary/15"
                    )}
                    onClick={() => onTaskSelected(index)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0">
                        {getTaskIcon(task, isCompleted)}
                      </div>
                      
                      <div className="flex-1 text-left space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Étape {index + 1}
                          </span>
                          {getTaskStatus(index, isCompleted)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.label}
                        </p>
                        {task.hint && (
                          <p className="text-xs text-muted-foreground/70 italic">
                            {task.hint}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {index + 1}/{tasks.length}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
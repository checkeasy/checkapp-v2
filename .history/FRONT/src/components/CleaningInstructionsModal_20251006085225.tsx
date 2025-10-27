import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, Info, Camera, Square, Sparkles } from 'lucide-react';
import { FlowType } from '@/types/room';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

interface CleaningInstructionsModalProps {
  children: React.ReactNode;
  flowType?: FlowType;
}

export const CleaningInstructionsModal = ({ children, flowType = 'checkout' }: CleaningInstructionsModalProps) => {
  const { rooms } = useParcoursData();

  // Filtrer les tâches de ménage (isTodo=true)
  const getCleaningTasks = (room: any) => {
    if (!room.tasks) return [];

    return room.tasks.filter((task: any) => {
      // Inclure uniquement les tâches de ménage (isTodo=true)
      if (task.isTodo) return true;

      // Exclure les tâches de photos de référence
      if (task.type === 'photo_multiple' || task.type === 'photo_optional') {
        return false;
      }

      // Exclure les tâches de comparaison
      const excludeKeywords = ['similaires', 'état d\'entrée', 'contrôle', 'référence'];
      const taskLabel = task.label?.toLowerCase() || '';

      if (excludeKeywords.some(keyword => taskLabel.includes(keyword))) {
        return false;
      }

      return false;
    });
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'checkbox':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'photo_required':
        return <Camera className="h-4 w-4 text-primary" />;
      default:
        return <Square className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Consignes ménage
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Accordion type="multiple" className="w-full" defaultValue={rooms.length > 0 ? [rooms[0].id] : []}>
            {rooms.map((room) => {
              const allTasks = getRoomTasks(room.id);
              const cleaningTasks = allTasks.filter(isCleaningTask);
              
              return (
                <AccordionItem key={room.id} value={room.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{room.nom}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {/* Instructions spéciales */}
                    {room.cleaningInfo && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Instructions spéciales
                        </h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {room.cleaningInfo}
                        </p>
                      </div>
                    )}
                    
                    {/* Tâches à effectuer */}
                    {cleaningTasks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Tâches à effectuer :</h4>
                        <div className="space-y-2">
                          {cleaningTasks.map((task, index) => (
                            <div key={task.id} className="flex items-start gap-3 p-2 rounded border border-border/50">
                              <div className="flex-shrink-0 mt-0.5">
                                {getTaskIcon(task.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{task.label}</p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {task.description}
                                  </p>
                                )}
                                {task.hint && (
                    <p className="text-xs text-primary/70 mt-1 italic">
                      Astuce : {task.hint}
                    </p>
                                )}
                              </div>
                              {task.total_photos_required && task.total_photos_required > 0 && (
                                <div className="flex-shrink-0 text-xs text-muted-foreground">
                                  {task.total_photos_required} photo{task.total_photos_required > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
};
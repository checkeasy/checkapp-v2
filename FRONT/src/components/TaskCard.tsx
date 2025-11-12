import { useState, useEffect } from "react";
import { Camera, Check, CheckSquare, ScanLine, Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/room";
import { PhotoCarousel } from "@/components/PhotoCarousel";
interface TaskCardProps {
  task: Task;
  taskIndex: number;
  totalTasks: number;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onTakePhoto?: (taskId: string) => void;
}
export function TaskCard({
  task,
  taskIndex,
  totalTasks,
  onTaskComplete,
  onTakePhoto
}: TaskCardProps) {
  // Use the actual task completion state from the flow context
  const [isCompleted, setIsCompleted] = useState(task.completed || false);
  
  // Sync with task.completed prop changes
  useEffect(() => {
    setIsCompleted(task.completed || false);
  }, [task.completed]);

  const handleCheckboxChange = (checked: boolean) => {
    // Valider la tâche et déclencher la progression
    setIsCompleted(checked);
    onTaskComplete(task.id, checked);
  };
  
  // Petits pictogrammes selon le type de tâche
  const getTaskIcon = () => {
    switch (task.type) {
      case 'photo_required':
        return ScanLine;
      case 'checkbox':
        return CheckSquare;
      case 'photo_optional':
        return Camera;
      case 'photo_multiple':
        return Images;
      default:
        return Camera;
    }
  };

  const TaskIcon = getTaskIcon();

  const handleTaskClick = () => {
    if (task.type === 'checkbox' && !isCompleted) {
      // Valider la tâche directement en cliquant sur la carte
      setIsCompleted(true);
      onTaskComplete(task.id, true);
    }
  };

  return (
    <Card className={`transition-all duration-200 cursor-pointer ${
      isCompleted 
        ? 'bg-primary/5 border-primary/20' 
        : 'bg-background border-border hover:shadow-md hover:border-primary/20'
    }`}
    onClick={handleTaskClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Petit pictogramme du type de tâche */}
          <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
            isCompleted 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : (
              <TaskIcon className="w-4 h-4" />
            )}
          </div>
          
          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className={`font-medium text-base leading-tight ${
                isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}>
                {task.label.replace(/🛏️|🧹|📸/, '').trim()}
              </h3>
              
              {task.type === 'checkbox' && (
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={handleCheckboxChange}
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()} // Empêcher la double action
                />
              )}
            </div>
            
            {task.description && (
              <p className={`text-sm leading-relaxed ${
                isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
              }`}>
                {task.description}
              </p>
            )}
            
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
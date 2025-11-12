import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useReportProblem } from "@/contexts/ReportProblemContext";

interface CleaningTask {
  id: string;
  task: string;
  completed: boolean;
}

interface CleaningTasksProps {
  room: {
    id: string;
    name: string;
    generalInstructions: string[];
    specificTasks: CleaningTask[];
  };
  onTaskToggle: (roomId: string, taskId: string) => void;
  onReportIssue: (roomId: string, issue: string) => void;
}

export const CleaningTasks = ({ room, onTaskToggle, onReportIssue }: CleaningTasksProps) => {
  const { openReportModal } = useReportProblem();

  const completedTasks = room.specificTasks.filter(task => task.completed).length;
  const totalTasks = room.specificTasks.length;
  const isRoomComplete = completedTasks === totalTasks;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {room.name}
          </CardTitle>
          <Badge variant={isRoomComplete ? "default" : "secondary"}>
            {completedTasks}/{totalTasks}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions générales */}
        {room.generalInstructions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-muted-foreground">Consignes ménage</h4>
            <ul className="space-y-1">
              {room.generalInstructions.map((instruction, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                  {instruction}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tâches spécifiques */}
        <div>
          <h4 className="font-medium mb-3">Tâches à effectuer</h4>
          <div className="space-y-3">
            {room.specificTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => onTaskToggle(room.id, task.id)}
                />
                <label 
                  htmlFor={`task-${task.id}`}
                  className={`flex-1 text-sm cursor-pointer ${
                    task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {task.task}
                </label>
                {task.completed && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Signaler un problème */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openReportModal()}
            className="w-full"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Signaler un problème
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
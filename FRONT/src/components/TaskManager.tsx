import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Camera, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LegacyRoom, LegacyTask } from "@/types/room";

interface TaskManagerProps {
  rooms: LegacyRoom[];
  onUpdateRooms: (rooms: LegacyRoom[]) => void;
}

export function TaskManager({ rooms, onUpdateRooms }: TaskManagerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTask, setEditingTask] = useState<{ roomId: string; taskId?: string } | null>(null);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    photo: ""
  });
  const { toast } = useToast();

  const handleAddTask = (roomId: string) => {
    if (!newTaskData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre de la tâche est obligatoire",
        variant: "destructive"
      });
      return;
    }

    const newTask: LegacyTask = {
      id: `task_${Date.now()}`,
      task: newTaskData.title,
      completed: false,
      ...(newTaskData.description && { description: newTaskData.description }),
      ...(newTaskData.photo && { photo: newTaskData.photo })
    };

    const updatedRooms = rooms.map(room => 
      room.id === roomId 
        ? { ...room, specificTasks: [...room.specificTasks, newTask] }
        : room
    );

    onUpdateRooms(updatedRooms);
    setNewTaskData({ title: "", description: "", photo: "" });
    setEditingTask(null);
    
    toast({
      title: "Tâche ajoutée",
      description: "La nouvelle tâche a été ajoutée avec succès"
    });
  };

  const handleEditTask = (roomId: string, taskId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const task = room?.specificTasks.find(t => t.id === taskId);
    
    if (task) {
      setNewTaskData({
        title: task.task,
        description: task.description || "",
        photo: task.photo || ""
      });
      setEditingTask({ roomId, taskId });
    }
  };

  const handleUpdateTask = () => {
    if (!editingTask || !newTaskData.title.trim()) return;

    const updatedRooms = rooms.map(room => 
      room.id === editingTask.roomId
        ? {
            ...room,
            specificTasks: room.specificTasks.map(task =>
              task.id === editingTask.taskId
                ? {
                    ...task,
                    task: newTaskData.title,
                    description: newTaskData.description || undefined,
                    photo: newTaskData.photo || undefined
                  }
                : task
            )
          }
        : room
    );

    onUpdateRooms(updatedRooms);
    setNewTaskData({ title: "", description: "", photo: "" });
    setEditingTask(null);
    
    toast({
      title: "Tâche modifiée",
      description: "La tâche a été mise à jour avec succès"
    });
  };

  const handleDeleteTask = (roomId: string, taskId: string) => {
    const updatedRooms = rooms.map(room => 
      room.id === roomId
        ? {
            ...room,
            specificTasks: room.specificTasks.filter(task => task.id !== taskId)
          }
        : room
    );

    onUpdateRooms(updatedRooms);
    
    toast({
      title: "Tâche supprimée",
      description: "La tâche a été supprimée avec succès"
    });
  };

  const handlePhotoUpload = () => {
    // Simuler l'upload d'une photo
    const photoUrl = `/lovable-uploads/${Date.now()}.png`;
    setNewTaskData(prev => ({ ...prev, photo: photoUrl }));
    
    toast({
      title: "Photo ajoutée",
      description: "La photo a été ajoutée à la tâche"
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Edit2 className="h-4 w-4 mr-2" />
          Gérer les consignes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gestion des consignes de ménage</span>
            <Badge variant="secondary" className="text-xs">
              Mode Gestionnaire
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {rooms.map((room) => (
            <Card key={room.id} className="border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{room.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTask({ roomId: room.id })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une tâche
                  </Button>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {room.specificTasks.map((task) => (
                  <div key={task.id} className="bg-muted/30 rounded-lg p-4 border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.task}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(room.id, task.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(room.id, task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    
                    {task.photo && (
                      <div className="mt-3">
                        <img 
                          src={task.photo} 
                          alt="Photo de référence"
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {room.specificTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Aucune tâche définie pour cette pièce</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter une tâche" pour commencer</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal pour ajouter/modifier une tâche */}
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask?.taskId ? "Modifier la tâche" : "Nouvelle tâche"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Titre de la tâche *</Label>
                <Input
                  id="task-title"
                  placeholder="Ex: Nettoyer le plan de travail"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="task-description">Description (optionnelle)</Label>
                <Textarea
                  id="task-description"
                  placeholder="Détails supplémentaires sur la tâche..."
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Photo de référence (optionnelle)</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoUpload}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {newTaskData.photo ? "Changer la photo" : "Ajouter une photo"}
                  </Button>
                  {newTaskData.photo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewTaskData(prev => ({ ...prev, photo: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {newTaskData.photo && (
                  <div className="mt-3">
                    <img 
                      src={newTaskData.photo} 
                      alt="Aperçu"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={editingTask?.taskId ? handleUpdateTask : () => handleAddTask(editingTask!.roomId)}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingTask?.taskId ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
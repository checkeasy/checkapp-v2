import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Info, ZoomIn } from "lucide-react";
import { useState } from "react";

interface RoomReferenceProps {
  room: {
    id: string;
    name: string;
    photos: string[];
    instructions: string[];
    checkpoints: string[];
  };
  onTakePhoto: (roomId: string) => void;
  photosTaken: number;
  totalPhotos: number;
}

export const RoomReference = ({ room, onTakePhoto, photosTaken, totalPhotos }: RoomReferenceProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{room.name}</CardTitle>
            <Badge variant={photosTaken === totalPhotos ? "default" : "secondary"}>
              {photosTaken}/{totalPhotos} photos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photos de référence */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Photos de référence
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {room.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo}
                    alt={`${room.name} référence ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Instructions spécifiques */}
          {room.instructions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                À savoir
              </h4>
              <ul className="space-y-1">
                {room.instructions.map((instruction, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Points de contrôle */}
          {room.checkpoints.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Points de contrôle</h4>
              <div className="space-y-2">
                {room.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 border border-primary rounded-full" />
                    {checkpoint}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={() => onTakePhoto(room.id)}
            className="w-full"
            size="lg"
          >
            <Camera className="h-5 w-5 mr-2" />
            Prendre une photo
          </Button>
        </CardContent>
      </Card>

      {/* Modal photo plein écran */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Photo de référence"
            className="max-w-full max-h-full object-contain"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4"
            onClick={() => setSelectedPhoto(null)}
          >
            Fermer
          </Button>
        </div>
      )}
    </div>
  );
};
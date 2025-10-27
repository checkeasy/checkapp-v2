import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Camera, Info } from "lucide-react";
import { FlowType } from "@/types/room";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { checkSessionManager } from "@/services/checkSessionManager";

interface RoomsModalProps {
  children: React.ReactNode;
  flowType: FlowType;
}

interface CapturedPhoto {
  photoId: string;
  url?: string;
  photoData?: string;
  taskId: string;
  pieceId: string;
  timestamp: string;
}

export const RoomsModal = ({ children, flowType }: RoomsModalProps) => {
  const { rooms } = useParcoursData();
  const { currentCheckId } = useActiveCheckId();
  const [capturedPhotosByPiece, setCapturedPhotosByPiece] = useState<Record<string, CapturedPhoto[]>>({});

  // Charger les photos capturées depuis IndexedDB
  useEffect(() => {
    const loadCapturedPhotos = async () => {
      if (!currentCheckId) return;

      try {
        const session = await checkSessionManager.getCheckSession(currentCheckId);
        if (!session?.progress?.interactions?.photosTaken) return;

        const photosTaken = session.progress.interactions.photosTaken;
        const photosByPiece: Record<string, CapturedPhoto[]> = {};

        // Regrouper les photos par pièce
        Object.values(photosTaken).forEach((photos: any) => {
          if (Array.isArray(photos)) {
            photos.forEach((photo: CapturedPhoto) => {
              if (photo.pieceId) {
                if (!photosByPiece[photo.pieceId]) {
                  photosByPiece[photo.pieceId] = [];
                }
                photosByPiece[photo.pieceId].push(photo);
              }
            });
          }
        });

        console.log('📸 RoomsModal: Photos capturées chargées:', photosByPiece);
        setCapturedPhotosByPiece(photosByPiece);
      } catch (error) {
        console.error('❌ RoomsModal: Erreur chargement photos:', error);
      }
    };

    loadCapturedPhotos();
  }, [currentCheckId]);

  // Déterminer quelle info afficher selon le flowType
  const getRoomInfo = (room: any) => {
    if (flowType === 'checkin') {
      return room.roomInfo || room.travelerNote;
    }
    return room.cleaningInfo || room.cleanerNote;
  };

  // Déterminer quelles photos de référence afficher
  const getReferencePhotos = (room: any) => {
    if (flowType === 'checkin') {
      return room.photoReferences?.checkin || [];
    }
    return room.photoReferences?.checkout || [];
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voir les pièces</DialogTitle>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {rooms.map(room => {
            const roomInfo = getRoomInfo(room);
            const referencePhotos = getReferencePhotos(room);
            const capturedPhotos = capturedPhotosByPiece[room.id] || [];

            return (
              <AccordionItem key={room.id} value={room.id} className="border border-border/50 rounded-xl overflow-hidden bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-semibold text-foreground capitalize">{room.nom}</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Informations importantes pour cette pièce */}
                    {roomInfo && (
                      <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-foreground">
                            {roomInfo}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Photos de référence */}
                    {referencePhotos.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Photos de référence
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {referencePhotos.slice(0, 4).map((photo: any, index: number) => (
                            <div key={index} className="aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md">
                              <img src={photo.url} alt={`${room.nom} - Référence ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos capturées */}
                    {capturedPhotos.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Camera className="h-4 w-4 text-green-600" />
                          Photos capturées ({capturedPhotos.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {capturedPhotos.map((photo, index) => (
                            <div key={photo.photoId} className="aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md border-2 border-green-500">
                              <img
                                src={photo.photoData || photo.url}
                                alt={`${room.nom} - Capturée ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};
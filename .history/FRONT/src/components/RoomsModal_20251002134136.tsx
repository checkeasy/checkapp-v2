import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Camera } from "lucide-react";
import { useRoomsData } from "@/hooks/useRoomsData";
import { FlowType } from "@/types/room";

interface RoomsModalProps {
  children: React.ReactNode;
  flowType: FlowType;
}

export const RoomsModal = ({ children, flowType }: RoomsModalProps) => {
  const { rooms } = useRoomsData(flowType);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voir les pièces</DialogTitle>  
        </DialogHeader>
        
        <Accordion type="single" collapsible defaultValue={rooms[0]?.id} className="w-full space-y-3">
          {rooms.map(room => (
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
                  {room.roomInfo && (
                    <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-3">
                      <p className="text-sm font-medium text-foreground">
                        {room.roomInfo}
                      </p>
                    </div>
                  )}

                  {/* Photos de la pièce */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Photos de référence
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {room.photoReferences.checkin?.slice(0, 4).map((photo, index) => (
                        <div key={index} className="aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md">
                          <img src={photo.url} alt={`${room.nom} - Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};
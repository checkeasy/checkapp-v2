import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface SignalementsWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalementCount: number;
  onViewSignalements: () => void;
  onContinue: () => void;
}

export function SignalementsWarningModal({
  isOpen,
  onClose,
  signalementCount,
  onViewSignalements,
  onContinue
}: SignalementsWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Signalements non traités
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Il reste {signalementCount} signalement{signalementCount > 1 ? 's' : ''} à traiter. 
            Souhaitez-vous les consulter avant de terminer le parcours ?
          </p>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onViewSignalements}
            >
              Voir
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={onContinue}
            >
              Continuer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
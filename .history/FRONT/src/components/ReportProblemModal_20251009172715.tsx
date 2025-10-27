import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { useSignalements } from "@/contexts/SignalementsContext";
import { useUser } from "@/contexts/UserContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useParcoursData } from "@/contexts/GlobalParcoursContext";
import { useLocation } from "react-router-dom";

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportProblemModal = ({ isOpen, onClose }: ReportProblemModalProps) => {
  const [reportText, setReportText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const { addSignalement } = useSignalements();
  const { user } = useUser();
  const { preselectedRoom } = useReportProblem();
  const { rooms: globalRooms } = useParcoursData();
  const location = useLocation();

  // ✅ NOUVEAU: Détecter automatiquement le flowType selon la page
  const flowType: 'checkin' | 'checkout' = location.pathname.includes('checkin') ? 'checkin' : 'checkout';

  // ✅ CORRECTION: Utiliser room.nom au lieu de room.name
  console.log('🏠 ReportProblemModal: Pièces disponibles:', globalRooms?.map(r => ({ id: r.id, nom: r.nom })));
  console.log('🔍 ReportProblemModal: FlowType détecté:', flowType, '(pathname:', location.pathname, ')');

  // ✅ AMÉLIORATION: Pré-remplir la pièce à chaque ouverture du modal
  useEffect(() => {
    if (isOpen && preselectedRoom) {
      // Trouver l'ID de la pièce à partir du nom
      const room = globalRooms?.find(r => r.nom === preselectedRoom);
      if (room) {
        console.log('🏠 ReportProblemModal: Pré-sélection de la pièce:', { nom: preselectedRoom, id: room.id });
        setSelectedRoomId(room.id);
      }
    }
  }, [isOpen, preselectedRoom, globalRooms]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      toast.error("Veuillez décrire le problème rencontré");
      return;
    }

    if (!selectedRoomId) {
      toast.error("Veuillez sélectionner une pièce");
      return;
    }

    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    // ✅ CORRECTION: Récupérer le nom de la pièce à partir de l'ID
    const selectedRoom = globalRooms?.find(r => r.id === selectedRoomId);
    if (!selectedRoom) {
      toast.error("Pièce introuvable");
      return;
    }

    console.log('📝 ReportProblemModal: Création du signalement:', {
      piece: selectedRoom.nom,
      roomId: selectedRoomId,
      commentaire: reportText,
      flowType,
      hasImage: !!selectedImage
    });

    // 🎯 CORRECTION: Convertir l'image en base64 si présente
    let imgBase64: string | undefined = undefined;
    let imgUrl: string | undefined = undefined;

    if (selectedImage) {
      try {
        // Convertir le File en base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Extraire le base64 pur (sans le préfixe data:image/...)
            const base64Pure = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64Pure);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });

        imgBase64 = base64;
        imgUrl = URL.createObjectURL(selectedImage); // Pour affichage local uniquement

        console.log('✅ Image convertie en base64:', {
          size: base64.length,
          preview: base64.substring(0, 50) + '...'
        });
      } catch (error) {
        console.error('❌ Erreur conversion base64:', error);
        toast.error("Erreur lors du traitement de l'image");
        return;
      }
    }

    // ✅ CORRECTION: Utiliser la nouvelle structure de Signalement avec base64
    addSignalement({
      roomId: selectedRoomId,
      piece: selectedRoom.nom,
      etapeId: undefined, // Pas d'étape spécifique pour un signalement général
      titre: reportText.length > 50 ? reportText.substring(0, 50) + "..." : reportText,
      commentaire: reportText,
      imgUrl, // Blob URL pour affichage local
      imgBase64, // ✅ Base64 pur pour sauvegarde et webhook
      flowType,
      origine: user.type,
      status: "A_TRAITER",
      priorite: false,
      typeSignalement: 'Technique', // Type par défaut pour signalements depuis popup
    });

    toast.success("Signalement envoyé avec succès");

    // Réinitialiser et fermer
    setReportText("");
    setSelectedImage(null);
    setSelectedRoomId("");
    onClose();
  };

  const handleClose = () => {
    setReportText("");
    setSelectedImage(null);
    setSelectedRoomId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto bg-white rounded-2xl shadow-xl border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 text-left">
            Signaler un problème
          </DialogTitle>
          <p className="text-sm text-gray-600 text-left mt-2">
            Vous rencontrez un problème sur votre parcours ?
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Sélection de la pièce */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              Dans quelle pièce ?
            </label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="border-2 border-pink-200 focus:border-pink-400 rounded-lg">
                <SelectValue placeholder="Sélectionner une pièce" />
              </SelectTrigger>
              <SelectContent>
                {globalRooms?.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.nom}
                  </SelectItem>
                )) || (
                  <SelectItem value="chambre">Chambre</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Section Racontez-nous */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              Racontez-nous
            </label>
            <Textarea
              placeholder="Décrivez le problème rencontré..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="min-h-[100px] border-2 border-pink-200 focus:border-pink-400 rounded-lg resize-none"
              rows={4}
            />
          </div>

          {/* Bouton Ajouter une image */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Ajouter une image
              {selectedImage && (
                <span className="text-purple-600 font-medium">
                  ({selectedImage.name})
                </span>
              )}
            </label>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Retour
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium"
            >
              Signaler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
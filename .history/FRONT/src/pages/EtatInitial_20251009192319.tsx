import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, AlertTriangle, Camera, X, Upload } from 'lucide-react';
import { useRoomsData } from '@/hooks/useRoomsData';
import { toast } from 'sonner';
import { useSignalements } from '@/contexts/SignalementsContext';
import { useUser } from '@/contexts/UserContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from '@/hooks/useSessionData';
import { useParcoursDataUnified } from '@/hooks/useParcoursDataUnified';
import { useNavigateWithParams } from '@/hooks/useNavigateWithParams';
import { navigationStateManager } from '@/services/navigationStateManager';

interface RoomState {
  id: string;
  state: 'correct' | 'deplorable' | null;
  photos: File[];
  comment: string;
}

export const EtatInitial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();
  const { rooms: localRooms } = useRoomsData('checkin'); // Pour l'affichage
  const { rooms: apiRooms } = useParcoursData(); // Pour les vrais IDs API
  const { addSignalement } = useSignalements();
  const { user } = useUser();

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkout');

  // Utiliser les rooms API si disponibles, sinon fallback sur les rooms locales
  const rooms = apiRooms && apiRooms.length > 0 ? apiRooms : localRooms;

  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [tempPhotos, setTempPhotos] = useState<File[]>([]);
  const [tempComment, setTempComment] = useState('');

  // Refs pour les inputs file (caméra et galerie)
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /**
   * Convertit un File en base64
   */
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extraire le base64 pur (sans le préfixe data:image/...)
        const base64Pure = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Pure);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRoomStateChange = (roomId: string, state: 'correct' | 'deplorable') => {
    if (state === 'deplorable') {
      setSelectedRoomId(roomId);
      setTempPhotos([]);
      setTempComment('');
      return;
    }
    
    setRoomStates(prev => ({
      ...prev,
      [roomId]: { 
        id: roomId, 
        state, 
        photos: [], 
        comment: '' 
      }
    }));
  };

  const handleDeplorableValidation = () => {
    if (!selectedRoomId) return;
    
    setRoomStates(prev => ({
      ...prev,
      [selectedRoomId]: { 
        id: selectedRoomId, 
        state: 'deplorable', 
        photos: tempPhotos, 
        comment: tempComment 
      }
    }));
    
    setSelectedRoomId(null);
    setTempPhotos([]);
    setTempComment('');
  };

  const handleTempPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setTempPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const removeTempPhoto = (index: number) => {
    setTempPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Ouvrir la caméra native du téléphone
  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  // Ouvrir la galerie de photos
  const handleOpenGallery = () => {
    galleryInputRef.current?.click();
  };

  const canValidate = rooms.every(room => {
    const state = roomStates[room.id];
    if (!state?.state) return false;
    if (state.state === 'deplorable' && state.photos.length === 0) return false;
    return true;
  });

  const handleValidation = async () => {
    if (!canValidate) {
      const missingStateRooms = rooms.filter(room => !roomStates[room.id]?.state);
      const missingPhotoRooms = rooms.filter(room =>
        roomStates[room.id]?.state === 'deplorable' &&
        (!roomStates[room.id]?.photos || roomStates[room.id]?.photos.length === 0)
      );

      if (missingStateRooms.length > 0) {
        toast.error('Veuillez indiquer l\'état de toutes les pièces avant de continuer');
        return;
      }

      if (missingPhotoRooms.length > 0) {
        toast.error('Au moins une photo est requise pour chaque pièce en état déplorable');
        return;
      }
    }

    // Sauvegarder les données d'état initial
    const stateData = Object.values(roomStates);
    const deplorableRooms = stateData.filter(room => room.state === 'deplorable');

    // 🚀 NOUVEAU: Envoyer les signalements "déplorable" à Bubble
    if (deplorableRooms.length > 0 && user) {
      console.log('🚀 EtatInitial: Envoi des signalements déplorable à Bubble:', deplorableRooms.length);

      for (const roomState of deplorableRooms) {
        try {
          // Trouver la pièce correspondante pour récupérer son nom
          const room = rooms.find(r => r.id === roomState.id);
          if (!room) continue;

          // Convertir la première photo en base64 (s'il y en a plusieurs, on prend la première)
          let imgBase64: string | undefined = undefined;
          let imgUrl: string | undefined = undefined;

          if (roomState.photos.length > 0) {
            const firstPhoto = roomState.photos[0];
            imgBase64 = await convertFileToBase64(firstPhoto);
            imgUrl = URL.createObjectURL(firstPhoto); // Pour affichage local
          }

          // Créer le signalement
          addSignalement({
            roomId: roomState.id,
            piece: room.nom,
            etapeId: undefined,
            titre: `État initial déplorable - ${room.nom}`,
            commentaire: roomState.comment || 'État déplorable constaté lors du contrôle initial',
            imgUrl,
            imgBase64,
            flowType: 'checkin', // État initial = checkin
            origine: user.type,
            status: 'A_TRAITER',
            priorite: true, // État déplorable = prioritaire
            typeSignalement: 'Check in ménage', // Type spécifique pour État Initial
          });

          console.log('✅ EtatInitial: Signalement créé pour', room.nom);
        } catch (error) {
          console.error('❌ EtatInitial: Erreur création signalement:', error);
        }
      }

      toast.success(`État initial enregistré. ${deplorableRooms.length} pièce(s) signalée(s) en état déplorable.`);
    } else {
      toast.success('État initial enregistré. Toutes les pièces sont en état correct.');
    }

    // 🆕 Marquer l'état initial comme complété dans la session
    const urlParams = navigationStateManager.extractUrlParams(location.search);
    const checkIdFromUrl = urlParams.checkId;

    if (checkIdFromUrl) {
      try {
        const { checkSessionManager } = await import('@/services/checkSessionManager');
        const session = await checkSessionManager.getCheckSession(checkIdFromUrl);

        if (session) {
          await checkSessionManager.saveCheckSession({
            ...session,
            progress: {
              ...session.progress,
              etatInitialCompleted: true,
              etatInitialCompletedAt: new Date().toISOString()
            }
          });
          console.log('✅ EtatInitial: État initial marqué comme complété dans la session');
        }
      } catch (error) {
        console.error('❌ EtatInitial: Erreur sauvegarde état initial:', error);
      }
    }

    // 🆕 REFACTORISÉ: Utiliser navigateWithParams
    // 🎯 FIX: Naviguer vers checkout-home pour les agents de ménage (pas checkin-home)
    // Car après l'état initial, l'agent doit finaliser son ménage
    const targetPath = '/checkout-home';

    console.log('✅ EtatInitial: Navigation vers checkout-home après état initial:', targetPath);
    navigateWithParams(targetPath);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Typography variant="page-title" as="h1" className="mb-2">
            Contrôle de l'état initial de votre logement
          </Typography>
          <Typography variant="page-subtitle">
            Veuillez indiquer l'état dans lequel le logement a été laissé par le voyageur avant de commencer le ménage.
          </Typography>
        </div>

        {/* Liste des pièces */}
        <div className="space-y-4 pb-24">
          {rooms.map((room) => {
            const currentState = roomStates[room.id];
            
            return (
              <Card key={room.id} variant="default" padding="default" className="transition-all duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Typography variant="card-title" className="mb-1">
                        {room.nom}
                      </Typography>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={currentState?.state === 'correct' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleRoomStateChange(room.id, 'correct')}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        État correct
                      </Button>
                      
                      <Button
                        variant={currentState?.state === 'deplorable' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleRoomStateChange(room.id, 'deplorable')}
                        className="flex items-center gap-1"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Déplorable
                      </Button>
                    </div>
                  </div>

                  {/* Affichage des données déplorable validées */}
                  {currentState?.state === 'deplorable' && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex gap-4">
                        {/* Photos */}
                        {currentState.photos.length > 0 && (
                          <div className="flex-shrink-0">
                            <Typography variant="body" className="font-medium mb-2">
                              Photos ({currentState.photos.length})
                            </Typography>
                            <div className="grid grid-cols-2 gap-2 w-24">
                              {currentState.photos.slice(0, 4).map((file, index) => (
                                <img
                                  key={index}
                                  src={URL.createObjectURL(file)}
                                  alt={`Photo ${index + 1}`}
                                  className="w-12 h-12 object-cover rounded border"
                                />
                              ))}
                            </div>
                            {currentState.photos.length > 4 && (
                              <Typography variant="body" className="text-xs text-muted-foreground mt-1">
                                +{currentState.photos.length - 4} autres
                              </Typography>
                            )}
                          </div>
                        )}

                        {/* Commentaire avec possibilité de modification */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Typography variant="body" className="font-medium">
                              Commentaire
                            </Typography>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRoomId(room.id);
                                setTempPhotos(currentState.photos);
                                setTempComment(currentState.comment);
                              }}
                              className="text-xs h-6 px-2"
                            >
                              Modifier
                            </Button>
                          </div>
                          {currentState.comment ? (
                            <div className="p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-sm leading-relaxed">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <span className="text-orange-900 dark:text-orange-100">{currentState.comment}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground italic">
                              Aucun commentaire ajouté
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Popup pour état déplorable */}
      <Dialog open={selectedRoomId !== null} onOpenChange={() => setSelectedRoomId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              État déplorable - {selectedRoomId ? rooms.find(r => r.id === selectedRoomId)?.nom : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload photos */}
            <div>
              <Typography variant="body" className="font-medium mb-2">
                Photos requises *
              </Typography>

              {/* Inputs cachés pour caméra et galerie */}
              <input
                ref={cameraInputRef}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleTempPhotoChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleTempPhotoChange}
                className="hidden"
              />

              {/* Boutons pour caméra et galerie */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenCamera}
                  className="flex items-center justify-center gap-2 h-12"
                >
                  <Camera className="w-5 h-5" />
                  <span>Prendre une photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenGallery}
                  className="flex items-center justify-center gap-2 h-12"
                >
                  <Upload className="w-5 h-5" />
                  <span>Choisir galerie</span>
                </Button>
              </div>

              {/* Aperçu des photos */}
              {tempPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {tempPhotos.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeTempPhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commentaire */}
            <div>
              <Typography variant="body" className="font-medium mb-2">
                Commentaire (recommandé)
              </Typography>
              <Textarea
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                placeholder="Décrivez l'état déplorable constaté..."
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedRoomId(null)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleDeplorableValidation}
                disabled={tempPhotos.length === 0}
                className="flex-1"
              >
                Valider
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bouton fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/90 backdrop-blur-sm border-t border-border/30 shadow-[0_-2px_12px_-2px_rgba(0,0,0,0.08)] px-4 py-3 pb-4">
        <Button
          onClick={handleValidation}
          disabled={!canValidate}
          className="w-full h-12 font-medium text-base rounded-xl transition-all duration-300"
          style={{ backgroundColor: '#9C27B0' }}
        >
          Valider et commencer le ménage
        </Button>
      </div>
    </div>
  );
};
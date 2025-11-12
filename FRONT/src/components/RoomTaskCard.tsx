import { useState } from "react";
import { Camera, Brush, Home, AlertTriangle, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { PhotoZoomModal } from "@/components/PhotoZoomModal";
import { Typography } from "@/components/ui/typography";
import { CTASection } from "@/components/ui/cta-section";
import { Task, PieceStatus } from "@/types/room";
import { Signalement } from "@/types/signalement";
import { CapturedPhoto } from "@/types/photoCapture";
import { useImageUpload } from "@/hooks/useImageUpload";
interface RoomTaskCardProps {
  task: Task;
  taskIndex: number;
  totalTasks: number;
  onValidatePiece?: (taskId: string) => void;
  onRetakePhotos?: (taskId: string) => void;
  onTakePhoto?: (taskId: string) => void; // Legacy - for backward compatibility
  onReportProblem?: () => void;
  cleaningInfo?: string;
  roomInfo?: string;
  // 🎯 AJOUT: Champs originaux de l'API pour affichage séparé
  travelerNote?: string;      // Note pour le voyageur (checkin)
  cleanerNote?: string;        // Note pour l'agent de ménage (checkout)
  infoEntrance?: string;       // Informations d'entrée
  validationMode?: 'validated' | 'photos_retaken' | null;
  signalements?: Signalement[];
  isSignalementsOpen?: boolean;
  onSignalementsOpenChange?: (open: boolean) => void;
  capturedPhotos?: CapturedPhoto[];
  isCheckoutMode?: boolean; // Nouveau: indique si on est en mode checkout
  hideBottomActions?: boolean; // 🎯 NOUVEAU: Cache la CTASection si les boutons sont ailleurs
}
export const RoomTaskCard = ({
  task,
  taskIndex,
  totalTasks,
  onValidatePiece,
  onRetakePhotos,
  onTakePhoto,
  // Legacy
  onReportProblem,
  cleaningInfo = "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.",
  roomInfo = "Contrôlez l'état général de la pièce à l'arrivée du voyageur.",
  // 🎯 AJOUT: Champs originaux de l'API
  travelerNote,
  cleanerNote,
  infoEntrance,
  validationMode,
  signalements = [],
  isSignalementsOpen = false,
  onSignalementsOpenChange = () => {},
  capturedPhotos = [],
  isCheckoutMode = false,
  hideBottomActions = false
}: RoomTaskCardProps) => {
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [selectedPhotoTitle, setSelectedPhotoTitle] = useState<string>('Photo de référence');

  // 🎯 NOUVEAU: Hook pour obtenir les URLs uploadées
  const { getDisplayUrl } = useImageUpload();

  // 🎯 DEBUG: Log des informations de pièce reçues
  console.log('📋 RoomTaskCard: Informations de pièce:', {
    taskId: task?.id,
    taskLabel: task?.label,
    cleaningInfo: cleaningInfo?.substring(0, 50) + '...',
    roomInfo: roomInfo?.substring(0, 50) + '...',
    hasCleaningInfo: !!cleaningInfo && cleaningInfo !== "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.",
    hasRoomInfo: !!roomInfo && roomInfo !== "Contrôlez l'état général de la pièce à l'arrivée du voyageur."
  });

  // 🎯 NOUVEAU: Logs détaillés des photos capturées
  console.log('🎯 RoomTaskCard: Rendu avec photos capturées:', {
    taskId: task?.id,
    taskLabel: task?.label,
    capturedPhotosCount: capturedPhotos?.length || 0,
    capturedPhotos: capturedPhotos?.map(p => ({
      id: p.id,
      dataUrlType: p.dataUrl?.startsWith('data:') ? 'base64' : p.dataUrl?.startsWith('http') ? 'url' : 'invalid',
      dataUrlLength: p.dataUrl?.length || 0,
      dataUrlValue: p.dataUrl?.substring(0, 50) + '...',
      takenAt: p.takenAt
    })) || []
  });
  
  // 🎯 DEBUG SPÉCIAL: Log de la première photo problématique
  if (capturedPhotos && capturedPhotos.length > 0) {
    const firstPhoto = capturedPhotos[0];
    console.log('🔍 RoomTaskCard: PREMIÈRE PHOTO DÉTAILLÉE:', {
      id: firstPhoto.id,
      dataUrl: firstPhoto.dataUrl,
      dataUrlLength: firstPhoto.dataUrl?.length || 0,
      dataUrlStart: firstPhoto.dataUrl?.substring(0, 100),
      takenAt: firstPhoto.takenAt,
      pieceId: firstPhoto.pieceId,
      referencePhotoId: firstPhoto.referencePhotoId
    });
  }
  const handleTabClick = (tabValue: string) => {
    setSelectedTab(current => current === tabValue ? "" : tabValue);
  };

  // 🎯 CORRECTION: Afficher les champs appropriés selon le mode (checkout vs checkin)
  // En mode checkout (agent de ménage): afficher cleanerNote et travelerNote
  // En mode checkin (voyageur): afficher infoEntrance et travelerNote
  const displayCleaningInfo = isCheckoutMode
    ? (travelerNote || cleaningInfo || "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.")
    : (travelerNote || cleaningInfo || "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.");

  const displayRoomInfo = isCheckoutMode
    ? (cleanerNote || roomInfo || task.description || "Contrôlez l'état général de la pièce à l'arrivée du voyageur.")
    : (infoEntrance || roomInfo || task.description || "Contrôlez l'état général de la pièce à l'arrivée du voyageur.");
  return <div className="space-y-6">
      {/* Information tabs - Harmonized styling */}
      <div className="animate-fade-in">
        <Tabs value={selectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/40 backdrop-blur-sm border border-white/20 p-0.5 h-8">
            <TabsTrigger value="cleaning" className="text-xs font-medium transition-all duration-300 data-[state=active]:bg-white/80 data-[state=active]:text-primary hover:bg-white/30 flex items-center gap-1" onClick={() => handleTabClick("cleaning")}>
              <Brush className="h-3 w-3" />
              Info ménage
            </TabsTrigger>
            <TabsTrigger value="room" className="text-xs font-medium transition-all duration-300 data-[state=active]:bg-white/80 data-[state=active]:text-primary hover:bg-white/30 flex items-center gap-1" onClick={() => handleTabClick("room")}>
              <Home className="h-3 w-3" />
              Info pièce
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cleaning" className="mt-3 animate-fade-in">
            <Card variant="glass" className="bg-white/70">
              <CardContent className="p-3">
                <Typography variant="body-secondary" className="leading-relaxed">
                  {displayCleaningInfo}
                </Typography>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="room" className="mt-3 animate-fade-in">
            <Card variant="glass" className="bg-white/70">
              <CardContent className="p-3">
                <Typography variant="body-secondary" className="leading-relaxed">
                  {displayRoomInfo}
                </Typography>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Card - Enhanced styling */}
      <Card variant="glass" className="bg-white/80 animate-fade-in">

        <CardContent className="pt-4 space-y-4">
          {/* 🎯 NOUVEAU: Afficher le titre et la consigne/description de la tâche */}
          {task.label && (
            <div className="space-y-2">
              <Typography variant="body" className="font-semibold text-lg">
                {task.label}
              </Typography>
              {task.description && (
                <Card variant="outline" className="bg-purple-50 border-purple-200">
                  <CardContent className="p-3">
                    <Typography variant="body" className="text-purple-700">
                      {task.description}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {!task.label && task.description && (
            <Card variant="outline" className="bg-purple-50 border-purple-200">
              <CardContent className="p-3">
                <Typography variant="body" className="text-purple-700">
                  {task.description}
                </Typography>
              </CardContent>
            </Card>
          )}

          {task.hint && <Card variant="outline" className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <Typography variant="body" className="text-blue-700">
                  <strong>Astuce :</strong> {task.hint}
                </Typography>
              </CardContent>
            </Card>}

          {/* Photo references section */}
          {task.type === 'photo_multiple' && task.total_photos_required && <Card variant="glass" className="bg-white/50">
              <CardContent className="p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 p-3 bg-gradient-subtle rounded-lg border border-white/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <Typography variant="body" className="font-medium text-foreground">
                        Vérifier l'état de la pièce
                       </Typography>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <PhotoCarousel photos={task.photo_references || []} className="animate-fade-in" />
                </div>
              </CardContent>
            </Card>}

          {/* Photo validation section - for travelers checking photos */}
          {/* 🎯 CORRECTION: Afficher la section même sans photos de référence */}
          {(task.type === 'photo_validation' || task.type === 'reference_photos') && (
            <Card variant="glass" className="bg-blue-50/50 border-blue-200/50">
              <CardContent className="p-4 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-blue-700 font-medium">
                    {isCheckoutMode
                      ? "Prendre des photos similaires à celles ci-dessous"
                      : "La pièce est-elle conforme aux photos ci-dessous ?"}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Photos de référence avec nouvelles photos associées */}
                  <div className="space-y-3">
                    {!task.photo_references || task.photo_references.length === 0 ? (
                      <div className="text-gray-600 text-sm">ℹ️ Aucune photo de référence pour cette tâche</div>
                    ) : (
                      <div className="space-y-4">
                        {task.photo_references.map((referencePhoto, index) => {
                          // Trouver la photo capturée correspondante par referencePhotoId
                          const correspondingCaptured = capturedPhotos?.find(
                            captured => captured.referencePhotoId === referencePhoto.tache_id
                          ) || capturedPhotos?.[index]; // Fallback par index si pas d'ID exact
                          
                          return (
                            <div key={referencePhoto.tache_id || index} className="space-y-2">
                              {/* Photo de référence */}
                              <div 
                                className="relative cursor-pointer hover:opacity-90 transition-opacity group"
                                onClick={() => {
                                  setSelectedPhotoUrl(referencePhoto.url);
                                  setSelectedPhotoTitle(`Photo de référence ${index + 1}`);
                                  setIsPhotoModalOpen(true);
                                }}
                              >
                                <img 
                                  src={referencePhoto.url} 
                                  alt={`Photo de référence ${index + 1}`}
                                  className="w-full aspect-[4/3] object-cover rounded-lg border border-gray-200"
                                />
                                <div className="absolute top-2 left-2 bg-blue-500 text-white text-sm px-2 py-1 rounded">
                                  Référence {index + 1}
                                </div>
                                <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="h-4 w-4" />
                                </div>
                              </div>
                              
                              {/* Photo capturée correspondante */}
                              {correspondingCaptured ? (
                                <div className="relative ml-4 border-l-4 border-green-500 pl-3">
                                  {(() => {
                                    const displayUrl = getDisplayUrl(correspondingCaptured.id, correspondingCaptured.dataUrl);
                                    
                                    // 🎯 Si pas d'URL valide, afficher un placeholder
                                    if (!displayUrl || displayUrl === '') {
                                      return (
                                        <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg border-2 border-green-500 flex items-center justify-center">
                                          <div className="text-center text-gray-500">
                                            <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Photo en cours d'upload...</p>
                                            <p className="text-xs opacity-75">ID: {correspondingCaptured.id.substring(0, 8)}</p>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        className="relative cursor-pointer hover:opacity-90 transition-opacity group"
                                        onClick={() => {
                                          setSelectedPhotoUrl(displayUrl);
                                          setSelectedPhotoTitle(`Photo capturée ${index + 1}`);
                                          setIsPhotoModalOpen(true);
                                        }}
                                      >
                                        <img
                                          src={displayUrl}
                                          alt={`Photo capturée ${index + 1}`}
                                          className="w-full aspect-[4/3] object-cover rounded-lg border-2 border-green-500"
                                          onLoad={() => {
                                            console.log('✅ Photo chargée:', {
                                              id: correspondingCaptured.id.substring(0, 12),
                                              isUploadedUrl: displayUrl !== correspondingCaptured.dataUrl
                                            });
                                          }}
                                          onError={(e) => {
                                            console.error('❌ Erreur chargement photo:', {
                                              id: correspondingCaptured.id.substring(0, 12),
                                              hasOriginalUrl: !!correspondingCaptured.dataUrl,
                                              displayUrl: displayUrl?.substring(0, 30)
                                            });
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white p-2 sm:p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                          <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  <div className="text-xs text-green-600 mt-1">
                                    📸 {new Date(correspondingCaptured.takenAt).toLocaleString()}
                                  </div>
                                </div>
                              ) : capturedPhotos && capturedPhotos.length > 0 ? (
                                <div className="ml-4 border-l-4 border-gray-300 pl-3">
                                  <div className="text-sm text-gray-500 italic">
                                    Aucune nouvelle photo pour cette référence
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Single photo reference */}
          {(task.type === 'photo_optional' || task.type === 'photo_required') && task.photo_reference && <div className="space-y-3">
              {/* 🎯 FIX: Afficher le titre et les instructions de la tâche TODO */}
              {task.label && (
                <div className="space-y-2">
                  <Typography variant="body" className="font-semibold text-lg">
                    {task.label}
                  </Typography>
                  {/* 🎯 FIX: Afficher la description (consigne) inconditionnellement pour les tâches avec photo */}
                  {task.description && (
                    <Typography variant="body-secondary" className="text-muted-foreground leading-relaxed">
                      {task.description}
                    </Typography>
                  )}
                </div>
              )}

              {/* 🎯 NOUVEAU: Afficher la photo de référence seulement si overlay_enabled est true */}
              {task.photo_reference.overlay_enabled !== false && (
                <>
                  <Typography variant="body" className="text-xs text-muted-foreground">
                    Photo de référence :
                  </Typography>

                  <div
                    className="relative cursor-pointer group"
                    onClick={() => {
                      setSelectedPhotoUrl(task.photo_reference.url);
                      setSelectedPhotoTitle(task.label || 'Photo de référence');
                      setIsPhotoModalOpen(true);
                    }}
                  >
                    <img src={task.photo_reference.url} alt="Photo de référence" className="w-full aspect-[4/3] object-cover rounded-xl border border-white/30 shadow-card hover:shadow-floating transition-all duration-300" />
                    {/* Overlay and zoom indicator */}
                    <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none"></div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </>
              )}

              {/* 🎯 NOUVEAU: Afficher la photo capturée sous la photo de référence */}
              {capturedPhotos && capturedPhotos.length > 0 && capturedPhotos[0] && (
                <div className="space-y-2 ml-0 sm:ml-4 border-l-4 border-green-500 pl-0 sm:pl-3 animate-slide-up">
                  <div
                    className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border-2 border-green-500 hover:shadow-glow transition-all duration-500 cursor-pointer"
                    onClick={() => {
                      setSelectedPhotoUrl(capturedPhotos[0].dataUrl);
                      setSelectedPhotoTitle('Photo capturée');
                      setIsPhotoModalOpen(true);
                    }}
                  >
                    <img
                      src={capturedPhotos[0].dataUrl}
                      alt="Photo prise"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        console.error('❌ Erreur chargement photo capturée:', capturedPhotos[0].id);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white p-2 sm:p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="text-xs text-green-600">
                    📸 {new Date(capturedPhotos[0].takenAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>}

          {/* 🎯 NOUVEAU: Afficher les photos capturées pour les tâches SANS photo de référence */}
          {(task.type === 'photo_optional' || task.type === 'photo_required') && !task.photo_reference && capturedPhotos && capturedPhotos.length > 0 && (
            <Card variant="glass" className="bg-green-50/50 border-green-200/50">
              <CardContent className="p-4 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-green-700 font-medium">
                    📸 Photos capturées
                  </p>
                </div>

                <div className="space-y-3">
                  {capturedPhotos.map((photo, index) => {
                    const displayUrl = getDisplayUrl(photo.id, photo.dataUrl);

                    return (
                      <div key={photo.id || index} className="space-y-2">
                        <div
                          className="relative cursor-pointer hover:opacity-90 transition-opacity group"
                          onClick={() => {
                            setSelectedPhotoUrl(displayUrl);
                            setSelectedPhotoTitle(`Photo capturée ${index + 1}`);
                            setIsPhotoModalOpen(true);
                          }}
                        >
                          <img
                            src={displayUrl}
                            alt={`Photo capturée ${index + 1}`}
                            className="w-full aspect-[4/3] object-cover rounded-lg border-2 border-green-500"
                            onLoad={() => {
                              console.log('✅ Photo capturée chargée:', {
                                id: photo.id.substring(0, 12),
                                isUploadedUrl: displayUrl !== photo.dataUrl
                              });
                            }}
                            onError={(e) => {
                              console.error('❌ Erreur chargement photo capturée:', {
                                id: photo.id.substring(0, 12),
                                hasOriginalUrl: !!photo.dataUrl,
                                displayUrl: displayUrl?.substring(0, 30)
                              });
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white p-2 sm:p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                        </div>
                        <div className="text-xs text-green-600">
                          📸 {new Date(photo.takenAt).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Standardized CTA Section */}
      {!hideBottomActions && (
        <div className="bg-background">
          <CTASection 
          className="!bg-background border-t border-border shadow-card !backdrop-blur-0"
          primaryAction={
            isCheckoutMode ? (
              // MODE CHECKOUT: PHOTOS OBLIGATOIRES
              task.completed && capturedPhotos && capturedPhotos.length > 0 ? {
                // 🎯 NOUVEAU: Si la tâche est complétée ET il y a des photos, afficher "✅ Validé"
                label: (() => {
                  let photoCount = 0;
                  if (task.photo_references && task.photo_references.length > 0) {
                    photoCount = task.photo_references.length;
                  } else if (task.photo_reference) {
                    photoCount = 1;
                  }
                  return photoCount > 1 ? "✅ Photos validées" : "✅ Photo validée";
                })(),
                shortLabel: "✅ Validé",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => {},  // Pas d'action, c'est juste un affichage
                variant: "cta",
                disabled: true  // 🎯 NOUVEAU: Désactiver le bouton
              } : capturedPhotos && capturedPhotos.length > 0 ? {
                label: (() => {
                  // Déterminer le nombre de photos
                  let photoCount = 0;
                  if (task.photo_references && task.photo_references.length > 0) {
                    photoCount = task.photo_references.length;
                  } else if (task.photo_reference) {
                    photoCount = 1;
                  }
                  return photoCount > 1 ? "✅ Valider ces photos obligatoires" : "✅ Valider cette photo obligatoire";
                })(),
                shortLabel: "✅ Valider",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => onValidatePiece?.(task.id),
                variant: "cta"
              } : {
                label: (() => {
                  // Déterminer le nombre de photos
                  let photoCount = 0;
                  if (task.photo_references && task.photo_references.length > 0) {
                    photoCount = task.photo_references.length;
                  } else if (task.photo_reference) {
                    photoCount = 1;
                  }
                  return photoCount > 1 ? "📷 Prendre photos obligatoires" : "📷 Prendre photo obligatoire";
                })(),
                shortLabel: "📷 Prendre",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => (onRetakePhotos || onTakePhoto)?.(task.id),
                variant: "cta",
                icon: <Camera className="h-4 w-4" />
              }
            ) : (
              // MODE CHECKIN: FLEXIBLE
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: "✅ Valider ces photos",
                shortLabel: "✅ Valider",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => onValidatePiece?.(task.id),
                variant: "cta"
              } : validationMode === 'validated' || validationMode === 'photos_retaken' ? {
                // 🎯 FIX: Pendant la transition après validation, afficher un état de validation
                label: validationMode === 'validated' ? "✅ Pièce validée" : "✅ Photos validées",
                shortLabel: "✅ Validé",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => {},
                variant: "cta",
                disabled: true
              } : task.completed ? {
                // 🆕 FIX: Quand on retourne voir une étape validée en check-in
                // Afficher "✅ Validé" comme bouton primaire pour repartir dans le parcours
                label: "✅ Validé",
                shortLabel: "✅ Validé",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => {},  // Pas d'action, c'est juste pour repartir
                variant: "cta",
                disabled: true  // Désactiver car c'est juste un affichage d'état
              } : {
                label: "Pièce conforme",
                shortLabel: "✅ Conforme",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => (onValidatePiece || onTakePhoto)?.(task.id),
                variant: "cta"
              }
            )
          }
          secondaryAction={
            isCheckoutMode ? (
              // MODE CHECKOUT: Seulement reprendre si déjà des photos
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: (() => {
                  // Déterminer le nombre de photos
                  let photoCount = 0;
                  if (task.photo_references && task.photo_references.length > 0) {
                    photoCount = task.photo_references.length;
                  } else if (task.photo_reference) {
                    photoCount = 1;
                  }
                  return photoCount > 1 ? "📸 Reprendre les photos" : "📸 Reprendre la photo";
                })(),
                shortLabel: "📸 Reprendre",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => onRetakePhotos?.(task.id),
                variant: "outline"
              } : undefined
            ) : (
              // MODE CHECKIN: OPTIONS FLEXIBLES
              task.completed ? {
                // 🎯 NOUVEAU: Quand on retourne voir une étape validée, afficher "📷 Reprendre"
                label: "📷 Reprendre",
                shortLabel: "📷 Reprendre",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => onRetakePhotos?.(task.id),
                variant: "outline"
              } : capturedPhotos && capturedPhotos.length > 0 ? {
                label: "📸 Reprendre encore",
                shortLabel: "📸 Reprendre",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => onRetakePhotos?.(task.id),
                variant: "outline"
              } : !task.completed && validationMode !== 'validated' && validationMode !== 'photos_retaken' ? {
                label: (() => {
                  // Déterminer le nombre de photos
                  let photoCount = 0;
                  if (task.photo_references && task.photo_references.length > 0) {
                    photoCount = task.photo_references.length;
                  } else if (task.photo_reference) {
                    photoCount = 1;
                  }
                  return photoCount > 1 ? "Prendre photos" : "Prendre photo";
                })(),
                shortLabel: "📸 Reprendre",  // 🎯 NOUVEAU: Texte court pour mobile
                onClick: () => (onRetakePhotos || onTakePhoto)?.(task.id),
                variant: "outline"
              } : undefined
            )
          } bottomText={onReportProblem ? {
        label: "Signaler un problème",
        onClick: onReportProblem,
        badge: signalements.length > 0 && (
          <Popover open={isSignalementsOpen} onOpenChange={onSignalementsOpenChange}>
            <PopoverTrigger asChild>
              <button>
                <Badge
                  variant="destructive"
                  className="h-auto w-auto px-2 py-1 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600 transition-colors animate-pulse rounded-full"
                >
                  ⚠️ : {signalements.length}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Signalements en cours ({signalements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {signalements.map((signalement) => (
                    <div key={signalement.id} className="p-2 bg-red-50 rounded-lg border-l-2 border-red-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-800 truncate">
                            {signalement.titre}
                          </p>
                          <p className="text-xs text-red-600 mt-1 line-clamp-2">
                            {signalement.commentaire}
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            Origine: {signalement.origine}
                          </p>
                        </div>
                        {signalement.priorite && (
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
        )
      } : undefined} />
          </div>
        )
      }

      {/* Photo Zoom Modal */}
      <PhotoZoomModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setSelectedPhotoUrl('');
        }}
        imageUrl={selectedPhotoUrl}
        imageTitle={selectedPhotoTitle}
      />
    </div>;
};
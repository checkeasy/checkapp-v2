import { useState } from "react";
import { Camera, Brush, Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { PhotoCarousel } from "@/components/PhotoCarousel";
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

  // Use task-specific info if available, fallback to props, then to defaults
  const displayCleaningInfo = cleaningInfo || "Vérifiez l'état d'entrée de cette pièce et documentez tout problème existant.";
  const displayRoomInfo = roomInfo || task.description || "Contrôlez l'état général de la pièce à l'arrivée du voyageur.";
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
          {(task.type === 'photo_validation' || task.type === 'reference_photos') && task.photo_references && (
            <Card variant="glass" className="bg-blue-50/50 border-blue-200/50">
              <CardContent className="p-4 space-y-4">
                <div className="text-center space-y-2">
                  <h4 className="font-semibold text-blue-900">
                    🏠 Vérification de l'état de la pièce
                  </h4>
                  <p className="text-sm text-blue-700">
                    Comparez l'état actuel avec les photos de référence ci-dessous
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Photos de référence avec nouvelles photos associées */}
                  <div className="space-y-3">
                    <Typography variant="body" className="font-medium text-blue-900">
                      Photos de référence ({task.photo_references.length})
                      {capturedPhotos && capturedPhotos.length > 0 && (
                        <span className="ml-2 text-green-700 font-normal">
                          - ✅ {capturedPhotos.length} nouvelles photos prises
                        </span>
                      )}
                    </Typography>
                    
                    {task.photo_references.length === 0 ? (
                      <div className="text-red-600 text-sm">⚠️ Aucune photo de référence disponible</div>
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
                              <div className="relative">
                                <img 
                                  src={referencePhoto.url} 
                                  alt={`Photo de référence ${index + 1}`}
                                  className="w-full aspect-[4/3] object-cover rounded-lg border border-gray-200"
                                />
                                <div className="absolute top-2 left-2 bg-blue-500 text-white text-sm px-2 py-1 rounded">
                                  Référence {index + 1}
                                </div>
                              </div>
                              
                              {/* Photo capturée correspondante */}
                              {correspondingCaptured ? (
                                <div className="relative ml-4 border-l-4 border-green-500 pl-3">
                                  <div className="text-sm text-green-700 font-medium mb-1">
                                    ✅ Nouvelle photo prise
                                  </div>
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
              <Typography variant="body" className="font-medium">
                Photo de référence
              </Typography>

              <div className="relative cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
                <img src={task.photo_reference.url} alt="Photo de référence" className="w-full aspect-[4/3] object-cover rounded-xl border border-white/30 shadow-card hover:shadow-floating transition-all duration-300" />
                {/* Overlay and zoom indicator */}
                <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none"></div>
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* 🎯 NOUVEAU: Afficher la photo capturée sous la photo de référence */}
              {capturedPhotos && capturedPhotos.length > 0 && capturedPhotos[0] && (
                <div className="space-y-2 ml-4 border-l-4 border-green-500 pl-3 animate-slide-up">
                  <div className="text-sm text-green-700 font-medium">
                    ✅ Nouvelle photo prise
                  </div>
                  <div className="group relative aspect-[4/3] bg-gradient-subtle rounded-2xl overflow-hidden shadow-floating border-2 border-green-500 hover:shadow-glow transition-all duration-500">
                    <img
                      src={capturedPhotos[0].dataUrl}
                      alt="Photo prise"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        console.error('❌ Erreur chargement photo capturée:', capturedPhotos[0].id);
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium">
                      ✓ Photo prise
                    </div>
                  </div>
                  <div className="text-xs text-green-600">
                    📸 {new Date(capturedPhotos[0].takenAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>}
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
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: "✅ Valider ces photos obligatoires",
                onClick: () => onValidatePiece?.(task.id),
                variant: "cta",
                icon: <Camera className="h-4 w-4" />
              } : {
                label: "📷 Prendre photos obligatoires",
                onClick: () => (onRetakePhotos || onTakePhoto)?.(task.id),
                variant: "cta",
                icon: <Camera className="h-4 w-4" />
              }
            ) : (
              // MODE CHECKIN: FLEXIBLE
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: "✅ Valider ces photos",
                onClick: () => onValidatePiece?.(task.id),
                variant: "cta",
                icon: <Camera className="h-4 w-4" />
              } : task.completed ? {
                label: "Prendre photo",
                onClick: () => (onRetakePhotos || onTakePhoto)?.(task.id),
                icon: <Camera className="h-4 w-4" />,
                variant: "cta-secondary"
              } : {
                label: "Pièce conforme",
                onClick: () => (onValidatePiece || onTakePhoto)?.(task.id),
                variant: "cta"
              }
            )
          } 
          secondaryAction={
            isCheckoutMode ? (
              // MODE CHECKOUT: Seulement reprendre si déjà des photos
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: "📸 Reprendre les photos",
                onClick: () => onRetakePhotos?.(task.id),
                variant: "outline"
              } : undefined
            ) : (
              // MODE CHECKIN: OPTIONS FLEXIBLES
              capturedPhotos && capturedPhotos.length > 0 ? {
                label: "📸 Reprendre encore",
                onClick: () => onRetakePhotos?.(task.id),
                variant: "outline"
              } : !task.completed ? {
                label: "Prendre photo",
                onClick: () => (onRetakePhotos || onTakePhoto)?.(task.id),
                variant: "outline"
              } : undefined
            )
          } bottomText={onReportProblem ? {
        label: "Signaler un problème",
        onClick: onReportProblem,
        badge: signalements.length > 0 ? (
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
        ) : undefined
      } : undefined} />
          </div>
        )
      }

      {/* Photo Reference Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {task.photo_reference && <img src={task.photo_reference.url} alt="Photo de référence en grand" className="max-w-full max-h-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
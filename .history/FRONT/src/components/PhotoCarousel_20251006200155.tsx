import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PhotoReference } from "@/types/room";
import { useImageOrientation } from "@/hooks/useOrientation";

interface PhotoCarouselProps {
  photos: PhotoReference[];
  className?: string;
}

export function PhotoCarousel({ photos, className = "" }: PhotoCarouselProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState(0);

  // Filtrer les photos invalides
  const validPhotos = photos.filter(photo => photo && photo.url);

  // 🆕 Détection de l'orientation de la photo zoomée
  const currentZoomedPhoto = validPhotos[zoomedIndex];
  const zoomedPhotoOrientation = useImageOrientation(currentZoomedPhoto?.url);
  const isZoomedLandscapePhoto = zoomedPhotoOrientation === 'landscape';

  const nextZoomedPhoto = () => {
    setZoomedIndex((prev) => (prev + 1) % validPhotos.length);
  };

  const prevZoomedPhoto = () => {
    setZoomedIndex((prev) => (prev - 1 + validPhotos.length) % validPhotos.length);
  };

  const handleImageClick = (index: number) => {
    setZoomedIndex(index);
    setIsZoomed(true);
  };

  // Swipe handlers for zoomed modal navigation
  const zoomedSwipeHandlers = useSwipeable({
    onSwipedLeft: nextZoomedPhoto,
    onSwipedRight: prevZoomedPhoto,
    trackMouse: true,
    delta: 60,
    preventScrollOnSwipe: true,
    trackTouch: true
  });

  if (validPhotos.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Affichage vertical de toutes les photos */}
      <div className="space-y-4">
        {validPhotos.map((photo, index) => (
          <div key={index} className="w-full">
            <img
              src={photo.url}
              alt={`Photo de référence ${index + 1}`}
              className="w-full aspect-[4/3] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(index)}
              draggable={false}
            />
          </div>
        ))}
      </div>
      
      {/* Modal de zoom */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-0" hideCloseButton>
          <div className="relative" {...zoomedSwipeHandlers}>
            {validPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white border-0 h-10 w-10 p-0"
                  onClick={prevZoomedPhoto}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 text-white border-0 h-10 w-10 p-0"
                  onClick={nextZoomedPhoto}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                  {zoomedIndex + 1} / {validPhotos.length}
                </div>
              </>
            )}
            
            <img
              src={validPhotos[zoomedIndex] ? validPhotos[zoomedIndex].url : validPhotos[0].url}
              alt={`Photo de référence agrandie ${zoomedIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain select-none"
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
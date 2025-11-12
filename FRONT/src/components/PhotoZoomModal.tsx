import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface PhotoZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageTitle?: string;
}

export function PhotoZoomModal({
  isOpen,
  onClose,
  imageUrl,
  imageTitle = 'Photo de référence'
}: PhotoZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 1));
    if (scale <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double tap to zoom
  const handleDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      if (scale > 1) {
        handleResetZoom();
      } else {
        setScale(2.5);
      }
    }
    
    lastTap.current = now;
  };

  // Touch events for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = getTouchDistance(e.touches);
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && scale > 1) {
      // Drag start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scaleChange = distance / lastTouchDistance.current;
      const newScale = Math.max(1, Math.min(5, scale * scaleChange));
      setScale(newScale);
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Drag
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.max(1, Math.min(5, scale + delta));
    setScale(newScale);
    
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Helper function to get distance between two touches
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
        onInteractOutside={(e) => {
          // Allow closing by clicking outside
          onClose();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{imageTitle}</DialogTitle>
          <DialogDescription>
            Utilisez le pinch-to-zoom ou les boutons pour zoomer sur la photo
          </DialogDescription>
        </DialogHeader>

        {/* Controls overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="bg-black/70 hover:bg-black/90 text-white rounded-full"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="bg-black/70 hover:bg-black/90 text-white rounded-full"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          {scale > 1 && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleResetZoom}
              className="bg-black/70 hover:bg-black/90 text-white rounded-full"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Zoom indicator */}
        {scale > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {Math.round(scale * 100)}%
          </div>
        )}

        {/* Image container */}
        <div
          ref={imageRef}
          className="relative w-full h-[95vh] flex items-center justify-center overflow-hidden cursor-move"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleDoubleTap}
        >
          <img
            src={imageUrl}
            alt={imageTitle}
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              touchAction: 'none'
            }}
            draggable={false}
            onLoad={() => console.log('✅ Image chargée dans modal zoom')}
            onError={(e) => {
              console.error('❌ Erreur chargement image modal zoom:', e.currentTarget.src);
            }}
          />
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 z-20 bg-black/70 text-white px-3 py-2 rounded-lg text-xs max-w-[200px]">
          <p>📱 Pincement pour zoomer</p>
          <p>👆 Double-tap pour zoomer</p>
          <p>✋ Glisser pour déplacer</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}


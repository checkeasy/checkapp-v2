import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface OptimizedReferenceImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Composant optimisé pour afficher les images de référence
 * - Lazy loading
 * - Placeholder pendant le chargement
 * - Gestion des erreurs
 */
export const OptimizedReferenceImage = ({
  src,
  alt,
  className = '',
  onClick
}: OptimizedReferenceImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Intersection Observer pour le lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px' // Commencer à charger 50px avant que l'image soit visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error('Erreur chargement image:', src);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-muted overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* Placeholder skeleton pendant le chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Image avec lazy loading */}
      {isVisible && !hasError && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Message d'erreur */}
      {hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Erreur chargement</p>
          </div>
        </div>
      )}
    </div>
  );
};


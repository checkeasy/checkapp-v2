/**
 * 📋 COMPOSANT BOUTON RAPPORT IA
 * 
 * Bouton avec animations pour afficher le statut du rapport IA
 * - État "en cours" : animation de shimmer et pulsation
 * - État "prêt" : bouton cliquable avec effet hover élégant
 */

import { FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RapportButtonProps {
  isReady: boolean;
  onClick: () => void;
  className?: string;
}

export const RapportButton = ({ isReady, onClick, className }: RapportButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={!isReady}
      className={cn(
        // Base styles
        "relative w-full h-12 px-6 rounded-md font-medium text-sm",
        "transition-all duration-500 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "overflow-hidden",
        
        // État prêt
        isReady && [
          "bg-gradient-to-r from-primary via-primary/90 to-primary",
          "text-primary-foreground",
          "hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20",
          "active:scale-[0.98]",
          "cursor-pointer",
        ],
        
        // État en cours
        !isReady && [
          "bg-gradient-to-r from-muted via-muted/80 to-muted",
          "text-muted-foreground",
          "cursor-not-allowed",
        ],
        
        className
      )}
    >
      {/* Effet shimmer pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      
      {/* Effet de pulsation pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
      )}
      
      {/* Contenu du bouton */}
      <div className="relative flex items-center justify-center gap-2">
        {isReady ? (
          <>
            <FileText className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            <span className="font-semibold">Voir mon rapport IA</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            <span>Rapport IA en cours de création...</span>
          </>
        )}
      </div>
      
      {/* Barre de progression pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary/40 animate-progress-bar" />
        </div>
      )}
    </button>
  );
};


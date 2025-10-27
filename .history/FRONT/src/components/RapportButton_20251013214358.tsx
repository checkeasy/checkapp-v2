/**
 * 📋 COMPOSANT BOUTON RAPPORT IA
 *
 * Bouton avec animations pour afficher le statut du rapport IA
 * - État "en cours" : animation de shimmer et pulsation
 * - État "prêt" : bouton cliquable avec effet hover élégant
 */

import { FileText, Sparkles, Zap } from "lucide-react";
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
        "group relative w-full h-14 px-6 rounded-xl font-semibold text-base",
        "transition-all duration-500 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "overflow-hidden",
        "shadow-lg",

        // État prêt - Dégradé moderne et attractif
        isReady && [
          "bg-gradient-to-br from-[#5C6BC0] via-[#7E57C2] to-[#AB47BC]",
          "text-white",
          "hover:shadow-2xl hover:shadow-purple-500/30",
          "hover:scale-[1.03]",
          "active:scale-[0.97]",
          "cursor-pointer",
          "border border-white/20",
        ],

        // État en cours
        !isReady && [
          "bg-gradient-to-r from-muted via-muted/80 to-muted",
          "text-muted-foreground",
          "cursor-not-allowed",
          "border border-border/50",
        ],

        className
      )}
    >
      {/* Effet de brillance animé pour l'état "prêt" */}
      {isReady && (
        <>
          {/* Brillance diagonale */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {/* Glow effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-purple-400/20 blur-xl" />
          </div>

          {/* Particules scintillantes */}
          <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Zap className="h-3 w-3 text-yellow-300 animate-pulse" />
          </div>
          <div className="absolute bottom-2 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <Zap className="h-3 w-3 text-yellow-300 animate-pulse" />
          </div>
        </>
      )}

      {/* Effet shimmer pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}

      {/* Effet de pulsation pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
      )}

      {/* Contenu du bouton */}
      <div className="relative flex items-center justify-center gap-3">
        {isReady ? (
          <>
            <div className="relative">
              <FileText className="h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
              {/* Cercle lumineux derrière l'icône */}
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            </div>
            <span className="font-bold tracking-wide">Voir mon rapport IA</span>
            {/* Flèche animée */}
            <svg
              className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 animate-spin-slow" />
            <span className="font-medium">Rapport IA en cours de création...</span>
          </>
        )}
      </div>

      {/* Barre de progression pour l'état "en cours" */}
      {!isReady && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden rounded-b-xl">
          <div className="h-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 animate-progress-bar" />
        </div>
      )}

      {/* Bordure lumineuse animée pour l'état "prêt" */}
      {isReady && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 opacity-50 blur-sm animate-pulse-slow" />
        </div>
      )}
    </button>
  );
};


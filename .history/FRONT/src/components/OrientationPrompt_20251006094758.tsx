import React from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

interface OrientationPromptProps {
  isLandscapePhoto: boolean;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  isLandscapePhoto
}) => {
  // Afficher uniquement pour les photos paysage
  if (!isLandscapePhoto) {
    return null;
  }

  return (
    <div className="absolute top-20 left-0 right-0 z-30 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm mx-4 rounded-2xl p-4 border-2 border-primary/50">
        <div className="flex items-center gap-4">
          {/* Animation de rotation du téléphone */}
          <div className="relative flex-shrink-0">
            <div
              className="-rotate-90 transition-all duration-1000"
              style={{
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              <Smartphone
                className="w-12 h-12 text-primary"
                strokeWidth={2}
              />
            </div>

            {/* Flèche de rotation */}
            <div
              className="absolute -top-2 -right-2"
              style={{
                animation: 'spin 3s linear infinite'
              }}
            >
              <RotateCw
                className="w-8 h-8 text-primary opacity-70"
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Message */}
          <div className="flex-1 text-left">
            <h3 className="text-white font-bold text-sm mb-1">
              📱 Tournez votre téléphone
            </h3>
            <p className="text-white/80 text-xs">
              Cette photo est en mode paysage. Tournez votre téléphone à 90° pour mieux l'aligner.
            </p>
          </div>
        </div>
      </div>

      {/* Styles pour les animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: rotate(360deg);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
};


import React from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

interface OrientationPromptProps {
  requiredOrientation: 'portrait' | 'landscape';
  currentOrientation: 'portrait' | 'landscape';
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  requiredOrientation,
  currentOrientation
}) => {
  // Ne rien afficher si l'orientation est correcte
  if (requiredOrientation === currentOrientation) {
    return null;
  }

  const isLandscapeRequired = requiredOrientation === 'landscape';

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="text-center px-6 max-w-md">
        {/* Animation de rotation du téléphone */}
        <div className="mb-8 relative h-48 flex items-center justify-center">
          <div 
            className={`
              transition-all duration-1000 ease-in-out
              ${isLandscapeRequired ? 'rotate-90' : 'rotate-0'}
            `}
            style={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            <Smartphone 
              className="w-24 h-24 text-white"
              strokeWidth={1.5}
            />
          </div>
          
          {/* Flèche de rotation */}
          <div 
            className="absolute"
            style={{
              animation: 'spin 3s linear infinite'
            }}
          >
            <RotateCw 
              className="w-32 h-32 text-primary opacity-50"
              strokeWidth={1}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            {isLandscapeRequired ? 'Tournez votre téléphone' : 'Remettez votre téléphone en position verticale'}
          </h2>
          <p className="text-white/70 text-lg">
            {isLandscapeRequired 
              ? 'Cette photo nécessite une orientation paysage (horizontale)'
              : 'Cette photo nécessite une orientation portrait (verticale)'
            }
          </p>
          
          {/* Indicateur visuel de l'orientation requise */}
          <div className="mt-8 flex justify-center">
            <div 
              className={`
                border-4 border-primary rounded-lg bg-primary/10
                transition-all duration-500
                ${isLandscapeRequired ? 'w-32 h-20' : 'w-20 h-32'}
              `}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {isLandscapeRequired ? 'PAYSAGE' : 'PORTRAIT'}
                </span>
              </div>
            </div>
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


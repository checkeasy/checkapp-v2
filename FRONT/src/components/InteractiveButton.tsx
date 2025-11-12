/**
 * 🎯 Bouton interactif avec tracking automatique des clics
 * 
 * Remplace les boutons standards pour capturer automatiquement :
 * - Tous les clics avec métadonnées
 * - État visuel selon les interactions passées
 * - Synchronisation avec CheckID
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import useInteractionTracking from '@/hooks/useInteractionTracking';

interface InteractiveButtonProps {
  // Props standard du bouton
  buttonId: string;
  pieceId: string;
  taskId?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  
  // Props spécifiques au tracking
  actionType?: 'validate' | 'complete' | 'skip' | 'retry' | 'navigate';
  trackingMetadata?: Record<string, unknown>;
  
  // Gestion d'état visuel
  showVisualState?: boolean;
  
  // Callbacks
  onClick?: () => void;
  onTracked?: (tracked: boolean) => void;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  buttonId,
  pieceId,
  taskId,
  children,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  actionType = 'validate',
  trackingMetadata = {},
  showVisualState = false,
  onClick,
  onTracked
}) => {
  
  const { trackButtonClick, isTrackingEnabled, getPieceStateFromCache } = useInteractionTracking();
  const [isClicked, setIsClicked] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  
  // Récupérer l'état de la pièce pour l'affichage visuel
  const pieceState = showVisualState ? getPieceStateFromCache(pieceId) : null;
  
  // Déterminer l'état visuel basé sur les interactions passées
  const getVisualState = () => {
    if (!showVisualState || !pieceState) return null;
    
    // Compter les clics sur ce bouton spécifique
    // (Sera implémenté avec l'historique des interactions)
    
    if (pieceState.status === 'completed' || pieceState.status === 'validated') {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600',
        suffix: ' ✓'
      };
    }
    
    if (pieceState.status === 'in_progress') {
      return {
        icon: <Clock className="h-4 w-4" />,
        color: 'text-blue-600',
        suffix: ' ...'
      };
    }
    
    if (pieceState.status === 'issues_reported') {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-orange-600',
        suffix: ' ⚠️'
      };
    }
    
    return null;
  };
  
  const visualState = getVisualState();
  
  // Gestionnaire de clic avec tracking
  const handleClick = async () => {
    setIsClicked(true);
    setClickCount(prev => prev + 1);
    
    // Tracking de l'interaction
    if (isTrackingEnabled) {
      try {
        // 🎯 CORRECTION: taskId EST DÉJÀ l'etapeID (depuis les corrections du DataAdapter)
        // Plus besoin d'appeler le mapper qui peut retourner un mauvais ID
        const realEtapeId = taskId || buttonId;

        await trackButtonClick(
          buttonId,
          pieceId,
          taskId,
          realEtapeId,  // ✅ taskId contient directement l'etapeID de l'API
          actionType,
          {
            ...trackingMetadata,
            clickCount: clickCount + 1,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            etapeId: realEtapeId
          }
        );
        
        console.log('✅ InteractiveButton: Clic tracké:', {
          buttonId,
          pieceId,
          taskId,
          actionType
        });
        
        onTracked?.(true);
      } catch (error) {
        console.error('❌ InteractiveButton: Erreur tracking:', error);
        onTracked?.(false);
      }
    }
    
    // Callback personnalisé
    onClick?.();
    
    // Reset de l'état visuel après un délai
    setTimeout(() => setIsClicked(false), 200);
  };
  
  // Déterminer la variante selon l'état
  const getButtonVariant = () => {
    if (visualState) {
      switch (pieceState?.status) {
        case 'completed':
        case 'validated':
          return 'default'; // Vert via className
        case 'in_progress':
          return 'secondary';
        case 'issues_reported':
          return 'outline';
        default:
          return variant;
      }
    }
    return variant;
  };
  
  // Classes CSS supplémentaires pour l'état visuel
  const getAdditionalClasses = () => {
    const classes = [];
    
    if (isClicked) {
      classes.push('scale-95 transition-transform duration-200');
    }
    
    if (visualState) {
      switch (pieceState?.status) {
        case 'completed':
        case 'validated':
          classes.push('bg-green-100 border-green-300 text-green-800 hover:bg-green-200');
          break;
        case 'in_progress':
          classes.push('bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200');
          break;
        case 'issues_reported':
          classes.push('bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200');
          break;
      }
    }
    
    return classes.join(' ');
  };
  
  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      disabled={disabled}
      onClick={handleClick}
      className={`
        ${className} 
        ${getAdditionalClasses()}
        ${showVisualState ? 'transition-all duration-200' : ''}
      `}
    >
      <div className="flex items-center space-x-2">
        {visualState?.icon}
        <span>
          {children}
          {visualState?.suffix}
        </span>
      </div>
    </Button>
  );
};

/**
 * 🎯 Checkbox interactive avec tracking
 */
interface InteractiveCheckboxProps {
  checkboxId: string;
  taskId: string;
  pieceId: string;
  label: string;
  defaultChecked?: boolean;
  notes?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onTracked?: (tracked: boolean) => void;
}

export const InteractiveCheckbox: React.FC<InteractiveCheckboxProps> = ({
  checkboxId,
  taskId,
  pieceId,
  label,
  defaultChecked = false,
  notes,
  disabled = false,
  onCheckedChange,
  onTracked
}) => {
  
  const { trackCheckboxChange, isTrackingEnabled } = useInteractionTracking();
  const [isChecked, setIsChecked] = useState(defaultChecked);
  
  const handleChange = async (checked: boolean) => {
    setIsChecked(checked);

    // Tracking de l'interaction
    if (isTrackingEnabled) {
      try {
        // 🎯 CORRECTION: taskId EST DÉJÀ l'etapeID (depuis les corrections du DataAdapter)
        const realEtapeId = taskId || checkboxId;

        await trackCheckboxChange(
          checkboxId,
          taskId,
          pieceId,
          checked,
          notes,
          realEtapeId  // ✅ AJOUTÉ: Passer l'etapeID
        );

        console.log('✅ InteractiveCheckbox: Changement tracké:', {
          checkboxId,
          taskId,
          pieceId,
          etapeId: realEtapeId,
          checked
        });

        onTracked?.(true);
      } catch (error) {
        console.error('❌ InteractiveCheckbox: Erreur tracking:', error);
        onTracked?.(false);
      }
    }

    onCheckedChange?.(checked);
  };
  
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={checkboxId}
        checked={isChecked}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
      />
      <label 
        htmlFor={checkboxId} 
        className={`text-sm font-medium cursor-pointer ${
          isChecked ? 'text-green-800' : 'text-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {label}
        {isChecked && ' ✓'}
      </label>
    </div>
  );
};

export default InteractiveButton;




import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportProblemButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

/**
 * 🎯 Composant réutilisable pour le bouton "Signaler un problème"
 * Design cohérent sur tout le site avec icône AlertTriangle
 */
export const ReportProblemButton: React.FC<ReportProblemButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'outline',
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className={`py-2.5 sm:h-10 h-8 text-xs font-medium transition-all duration-300 px-3 gap-1.5 ${className}`}
    >
      {showIcon && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate">Signaler un problème</span>
    </Button>
  );
};


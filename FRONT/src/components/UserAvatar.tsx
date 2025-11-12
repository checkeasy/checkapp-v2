import React from 'react';
import { User } from '@/contexts/UserContext';

interface UserAvatarProps {
  user: User | null;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'sm', onClick }) => {
  const getInitials = (user: User | null): string => {
    if (!user) return '•••';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    
    // Fallback: • + 2 derniers chiffres du téléphone
    if (user.phone && user.phone.length >= 2) {
      const lastTwoDigits = user.phone.slice(-2);
      return `•${lastTwoDigits}`;
    }
    
    return '•••';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-base'
  };

  const minTouchTarget = size === 'sm' ? 'min-h-[44px] min-w-[44px] p-2' : '';

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses[size]} 
        ${minTouchTarget}
        bg-gradient-primary text-primary-foreground rounded-full 
        flex items-center justify-center font-medium
        hover:shadow-glow active:scale-[0.98] 
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      aria-label={user ? `Profil de ${user.firstName} ${user.lastName}` : 'Profil utilisateur'}
    >
      <span className="select-none">
        {getInitials(user)}
      </span>
    </button>
  );
};
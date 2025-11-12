import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logoutCleanupService } from '@/services/logoutCleanupService';

export interface User {
  firstName: string;
  lastName: string;
  phone: string;
  phoneIndex?: string; // 🌍 NOUVEAU: Indicatif international (ex: "+33", "+41", etc.)
  connectedAt: string;
  type: 'AGENT' | 'GESTIONNAIRE' | 'CLIENT'; // Type d'utilisateur
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userInfo: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement de l'app
    const savedUser = localStorage.getItem('userInfo');
    if (savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        setUser(userInfo);
      } catch (error) {
        console.error('Erreur lors de la récupération des informations utilisateur:', error);
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  const login = (userInfo: User) => {
    setUser(userInfo);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  };

  const logout = async () => {
    // 🧹 Nettoyer TOUTES les données avant de déconnecter
    await logoutCleanupService.cleanupAllData();

    // Puis déconnecter l'utilisateur
    setUser(null);
    localStorage.removeItem('userInfo');

    console.log('✅ Déconnexion complète avec nettoyage des données');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user, isAuthenticated, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};
import React, { useState } from 'react';
import { X, Copy, Phone, Edit, LogOut, HelpCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, useUser } from '@/contexts/UserContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditUserFieldModal } from './EditUserFieldModal';

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenHelp?: () => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  isOpen,
  onClose,
  onLogout,
  onOpenHelp
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateUser, logout } = useUser();
  const { info: parcoursInfo } = useParcoursData();
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    field: 'firstName' | 'lastName' | 'phone';
    label: string;
  }>({ isOpen: false, field: 'firstName', label: '' });

  // Déterminer le texte du badge basé sur le type de parcours
  const getBadgeText = (): string => {
    if (parcoursInfo?.type === 'Voyageur') {
      return 'Voyageur';
    }
    return 'Agent de ménage';
  };

  // Extraire l'indicatif et le numéro du téléphone stocké
  const extractPhoneInfo = (phone: string, phoneIndex?: string): { countryCode: string; number: string } => {
    // 🌍 NOUVEAU: Utiliser le phoneIndex stocké si disponible
    if (phoneIndex) {
      return { countryCode: phoneIndex, number: phone };
    }

    // Si le numéro commence par +, c'est qu'il contient l'indicatif
    if (phone.startsWith('+')) {
      // Extraire l'indicatif (ex: +33, +41, +351, etc.)
      const match = phone.match(/^\+(\d{1,3})/);
      if (match) {
        const countryCode = `+${match[1]}`;
        const number = phone.slice(match[0].length);
        return { countryCode, number };
      }
    }
    // Fallback: si pas d'indicatif, utiliser +33 par défaut
    return { countryCode: '+33', number: phone };
  };

  const formatPhoneNumber = (phone: string, phoneIndex?: string): string => {
    const { countryCode, number } = extractPhoneInfo(phone, phoneIndex);

    // Formater le numéro avec espaces
    if (number.length === 9) {
      return `${countryCode} ${number.charAt(0)} ${number.slice(1, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7, 9)}`;
    }
    return phone;
  };

  const handleCopyPhone = async () => {
    if (user?.phone) {
      try {
        const { countryCode, number } = extractPhoneInfo(user.phone, user.phoneIndex);
        const formattedPhone = `${countryCode}${number}`;
        await navigator.clipboard.writeText(formattedPhone);
        toast({
          title: "Numéro copié",
          description: "Le numéro de téléphone a été copié dans le presse-papiers"
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de copier le numéro",
          variant: "destructive"
        });
      }
    }
  };

  const handleCallPhone = () => {
    if (user?.phone) {
      const { countryCode, number } = extractPhoneInfo(user.phone, user.phoneIndex);
      const phoneUrl = `tel:${countryCode}${number}`;
      window.location.href = phoneUrl;
    }
  };

  const handleEditField = (field: 'firstName' | 'lastName' | 'phone', label: string) => {
    setEditModal({ isOpen: true, field, label });
  };

  const handleSaveField = (field: 'firstName' | 'lastName' | 'phone', value: string) => {
    updateUser({ [field]: value });
    setEditModal({ isOpen: false, field: 'firstName', label: '' });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, field: 'firstName', label: '' });
  };

  const handleViewReports = () => {
    toast({
      title: "Mes rapports",
      description: "Affichage des rapports bientôt disponible"
    });
  };

  const handleLogout = async () => {
    try {
      // 🧹 Appeler le logout du UserContext qui nettoie tout
      await logout();

      onClose();
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });

      // 🎯 Récupérer le parcoursId avant de naviguer (il est conservé par le cleanup)
      const activeParcoursId = localStorage.getItem('activeParcoursId');

      // Naviguer vers la page Welcome après déconnexion
      // Si on a un parcoursId, le passer en paramètre pour rester sur le même parcours
      if (activeParcoursId) {
        navigate(`/welcome?parcours=${activeParcoursId}`, { replace: true });
      } else {
        navigate('/welcome', { replace: true });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive"
      });
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[85vh] bg-white rounded-t-2xl">
        <DrawerHeader className="border-b border-border/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="md" />
              <div className="text-left">
                <DrawerTitle className="text-lg font-semibold text-foreground">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : 'Profil agent'
                  }
                </DrawerTitle>
                <Badge variant="secondary" className="mt-1 bg-muted text-muted-foreground text-xs">
                  {getBadgeText()}
                </Badge>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Fermer</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Informations personnelles
            </h3>
            
            <div className="space-y-3">
              {/* Prénom */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Prénom</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {user?.firstName || '—'}
                  </span>
                  <button
                    onClick={() => handleEditField('firstName', 'Prénom')}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Modifier le prénom"
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              {/* Nom */}
              <div className="flex justify-between items-center py-2 border-t border-border/20">
                <span className="text-sm text-muted-foreground">Nom</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {user?.lastName || '—'}
                  </span>
                  <button
                    onClick={() => handleEditField('lastName', 'Nom')}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Modifier le nom"
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              {/* Téléphone */}
              <div className="flex justify-between items-center py-2 border-t border-border/20">
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCallPhone}
                    className="text-sm font-medium text-[#5C6BC0] hover:text-[#3F51B5] transition-colors"
                    disabled={!user?.phone}
                  >
                    {user?.phone ? formatPhoneNumber(user.phone, user.phoneIndex) : '—'}
                  </button>
                  {user?.phone && (
                    <>
                      <button
                        onClick={handleCopyPhone}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        aria-label="Copier le numéro"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={handleCallPhone}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        aria-label="Appeler"
                      >
                        <Phone className="h-3 w-3 text-[#5C6BC0]" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEditField('phone', 'Téléphone')}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Modifier le téléphone"
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Mes rapports */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Mes rapports
            </h3>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={handleViewReports}
                className="w-full justify-start h-12 px-3 text-sm"
              >
                <FileText className="h-4 w-4 mr-3 text-[#5C6BC0]" />
                Historique de rapport(s)
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </h3>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start h-12 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Se déconnecter
              </Button>
            </div>
          </div>

          {/* Aide */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Aide
            </h3>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => {
                  window.open('https://www.checkeasy.co/tutoriel-check-easy', '_blank');
                }}
                className="w-full justify-start h-12 px-3 text-sm"
              >
                <HelpCircle className="h-4 w-4 mr-3 text-[#5C6BC0]" />
                Tutoriel
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  window.open('https://www.checkeasy.co/faq', '_blank');
                }}
                className="w-full justify-start h-12 px-3 text-sm"
              >
                <HelpCircle className="h-4 w-4 mr-3 text-[#5C6BC0]" />
                FAQ
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Field Modal */}
        <EditUserFieldModal
          isOpen={editModal.isOpen}
          onClose={closeEditModal}
          fieldName={editModal.field}
          fieldLabel={editModal.label}
          currentValue={user?.[editModal.field] || ''}
          onSave={(value) => handleSaveField(editModal.field, value)}
          inputType={editModal.field === 'phone' ? 'tel' : 'text'}
        />
      </DrawerContent>
    </Drawer>
  );
};
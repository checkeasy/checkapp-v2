import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface EditUserFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  fieldLabel: string;
  currentValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  inputType?: string;
}

export const EditUserFieldModal: React.FC<EditUserFieldModalProps> = ({
  isOpen,
  onClose,
  fieldName,
  fieldLabel,
  currentValue,
  onSave,
  placeholder,
  inputType = 'text'
}) => {
  const [value, setValue] = useState(currentValue);
  const { toast } = useToast();

  // Update value when currentValue changes (e.g., when switching between fields)
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const handleSave = () => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
      toast({
        title: "Erreur",
        description: `Le ${fieldLabel.toLowerCase()} ne peut pas être vide`,
        variant: "destructive"
      });
      return;
    }

    // Validation spécifique pour le téléphone
    if (fieldName === 'phone') {
      const phoneRegex = /^[0-9]{9}$/;
      if (!phoneRegex.test(trimmedValue)) {
        toast({
          title: "Erreur",
          description: "Le numéro de téléphone doit contenir 9 chiffres",
          variant: "destructive"
        });
        return;
      }
    }

    onSave(trimmedValue);
    toast({
      title: "Modification enregistrée",
      description: `${fieldLabel} mis à jour avec succès`
    });
    onClose();
  };

  const handleClose = () => {
    setValue(currentValue); // Reset to original value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto bg-white rounded-2xl shadow-xl border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 text-left">
            Modifier {fieldLabel.toLowerCase()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor={fieldName} className="text-sm font-medium text-gray-900">
              {fieldLabel}
            </Label>
            <Input
              id={fieldName}
              type={inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder || `Entrez votre ${fieldLabel.toLowerCase()}`}
              className="mt-2 border-2 border-pink-200 focus:border-pink-400 rounded-lg"
              autoFocus
            />
            {fieldName === 'phone' && (
              <p className="text-xs text-gray-500 mt-1">
                Format: 9 chiffres sans indicatif (ex: 123456789)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
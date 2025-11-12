/**
 * 🐛 Modal de debug pour envoyer le rapport complet
 * Collecte toutes les données et les envoie vers l'endpoint de debug
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { debugService } from '@/services/debugService';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
import { useUser } from '@/contexts/UserContext';
import { checkSessionManager } from '@/services/checkSessionManager';
import { Loader2, Send, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DebugModalProps {
  children: React.ReactNode;
}

export function DebugModal({ children }: DebugModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const { currentCheckId } = useActiveCheckId();
  const { info, rooms } = useParcoursData();
  const { user } = useUser();

  /**
   * Collecte toutes les données de debug
   */
  const collectDebugData = async () => {
    try {
      // Récupérer la session CheckID
      const session = currentCheckId 
        ? await checkSessionManager.getCheckSession(currentCheckId)
        : null;

      // Récupérer les photos du localStorage
      const photoData: Record<string, any> = {};
      const photoKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('uploaded_image_') || key.startsWith('photo_')
      );
      
      photoKeys.forEach(key => {
        try {
          photoData[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          photoData[key] = localStorage.getItem(key);
        }
      });

      const data = {
        checkId: currentCheckId,
        userId: user.id,
        userType: user.type,
        timestamp: new Date().toISOString(),
        parcoursInfo: info,
        rooms: rooms.map(room => ({
          id: room.id,
          nom: room.nom,
          tasks: room.tasks.map(task => ({
            id: task.id,
            label: task.label,
            type: task.type,
            completed: task.completed,
            description: task.description
          })),
          photoReferences: room.photoReferences,
          cleaningInfo: room.cleaningInfo,
          roomInfo: room.roomInfo
        })),
        session: session,
        photos: photoData,
        localStorage: {
          keys: Object.keys(localStorage).length,
          checkSessionKeys: Object.keys(localStorage).filter(k => k.startsWith('check_session_')).length,
          photoKeys: photoKeys.length
        }
      };

      setDebugData(data);
      return data;
    } catch (error) {
      console.error('❌ Erreur collecte données debug:', error);
      toast.error('Erreur lors de la collecte des données');
      return null;
    }
  };

  /**
   * Envoie les données vers l'endpoint de debug
   */
  const handleSendDebugData = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const data = await collectDebugData();
      if (!data) {
        setSendResult({ success: false, message: 'Erreur collecte données' });
        return;
      }

      const result = await debugService.sendDebugPayload(data);
      
      if (result.success) {
        setSendResult({ 
          success: true, 
          message: `✅ Données envoyées avec succès! ID: ${result.debugId}` 
        });
        toast.success('Données de debug envoyées!');
      } else {
        setSendResult({ 
          success: false, 
          message: `❌ Erreur: ${result.error}` 
        });
        toast.error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      setSendResult({ 
        success: false, 
        message: `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      });
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Copie les données dans le presse-papier
   */
  const handleCopyData = () => {
    if (debugData) {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      toast.success('Données copiées dans le presse-papier!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🐛</span>
            Debug - Rapport complet
          </DialogTitle>
          <DialogDescription>
            Collecte et envoie toutes les données collectées vers l'endpoint de debug pour analyse
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Informations de session */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">📋 Informations de session</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">CheckID:</span>
                  <Badge variant="outline" className="ml-2">
                    {currentCheckId || 'Non défini'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Utilisateur:</span>
                  <Badge variant="outline" className="ml-2">
                    {user.type}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Parcours:</span>
                  <Badge variant="outline" className="ml-2">
                    {info?.name || 'Non chargé'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Pièces:</span>
                  <Badge variant="outline" className="ml-2">
                    {rooms.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Aperçu des données */}
            {debugData && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📊 Aperçu des données</h3>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(debugData, null, 2).substring(0, 500)}...
                  </pre>
                </div>
              </div>
            )}

            {/* Résultat de l'envoi */}
            {sendResult && (
              <div className={`p-3 rounded-md ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-sm ${sendResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {sendResult.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCopyData}
            disabled={!debugData || isSending}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copier les données
          </Button>
          <Button
            onClick={handleSendDebugData}
            disabled={isSending}
            className="flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer vers Debug
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


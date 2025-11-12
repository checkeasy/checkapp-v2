/**
 * 🚀 Modal de test des webhooks Checkin & Checkout
 * Permet de tester l'envoi des données vers les endpoints Bubble
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { environment } from '@/config/environment';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
import { useUser } from '@/contexts/UserContext';
import { checkSessionManager } from '@/services/checkSessionManager';
import { Loader2, Send, CheckCircle2, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookTestModalProps {
  children: React.ReactNode;
}

export function WebhookTestModal({ children }: WebhookTestModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [webhookData, setWebhookData] = useState<any>(null);
  const [sendResult, setSendResult] = useState<{ 
    success: boolean; 
    message: string;
    endpoint?: string;
  } | null>(null);

  const { currentCheckId } = useActiveCheckId();
  const { info, rooms } = useParcoursData();
  const { user } = useUser();

  /**
   * Génère les données de webhook
   */
  const generateWebhookData = async (type: 'checkin' | 'checkout' | 'unified') => {
    try {
      const session = currentCheckId 
        ? await checkSessionManager.getCheckSession(currentCheckId)
        : null;

      // Récupérer les photos du localStorage
      const photos: any[] = [];
      const photoKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('uploaded_image_')
      );
      
      photoKeys.forEach(key => {
        try {
          const photoData = JSON.parse(localStorage.getItem(key) || '{}');
          photos.push(photoData);
        } catch (error) {
          console.error('Erreur parsing photo:', error);
        }
      });

      const baseData = {
        checkId: currentCheckId || `test_${Date.now()}`,
        userId: user.id,
        userType: user.type,
        timestamp: new Date().toISOString(),
        parcoursId: info?.id,
        parcoursName: info?.name,
        logement: info?.logement,
        photos: photos,
        rooms: rooms.map(room => ({
          id: room.id,
          nom: room.nom,
          tasks: room.tasks.map(task => ({
            id: task.id,
            label: task.label,
            completed: task.completed
          }))
        })),
        session: session
      };

      let data;
      if (type === 'unified') {
        data = {
          ...baseData,
          flowType: session?.flowType || 'checkin',
          isUnified: true
        };
      } else if (type === 'checkin') {
        data = {
          ...baseData,
          flowType: 'checkin',
          initialState: true
        };
      } else {
        data = {
          ...baseData,
          flowType: 'checkout',
          finalState: true,
          validations: session?.progress?.interactions?.checkboxStates || {}
        };
      }

      setWebhookData(data);
      return data;
    } catch (error) {
      console.error('❌ Erreur génération données webhook:', error);
      toast.error('Erreur lors de la génération des données');
      return null;
    }
  };

  /**
   * Envoie les données vers le webhook
   */
  const handleSendWebhook = async (type: 'checkin' | 'checkout' | 'unified') => {
    setIsSending(true);
    setSendResult(null);

    try {
      const data = await generateWebhookData(type);
      if (!data) {
        setSendResult({ 
          success: false, 
          message: 'Erreur génération données' 
        });
        return;
      }

      // Déterminer l'endpoint
      let endpoint = '';
      if (type === 'unified') {
        endpoint = environment.WEBHOOK_UNIFIED_URL;
      } else if (type === 'checkin') {
        endpoint = environment.WEBHOOK_CHECKIN_URL;
      } else {
        endpoint = environment.WEBHOOK_CHECKOUT_URL;
      }

      // Envoyer vers le webhook
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setSendResult({ 
          success: true, 
          message: `✅ Webhook ${type} envoyé avec succès!`,
          endpoint
        });
        toast.success(`Webhook ${type} envoyé!`);
      } else {
        setSendResult({ 
          success: false, 
          message: `❌ Erreur HTTP ${response.status}: ${response.statusText}`,
          endpoint
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
    if (webhookData) {
      navigator.clipboard.writeText(JSON.stringify(webhookData, null, 2));
      toast.success('Données copiées dans le presse-papier!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Test Webhooks - Checkin & Checkout
          </DialogTitle>
          <DialogDescription>
            Teste l'envoi des données vers les webhooks Bubble (checkin, checkout, ou unifié)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="unified" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unified">🎯 Unifié</TabsTrigger>
            <TabsTrigger value="checkin">📥 Check-in</TabsTrigger>
            <TabsTrigger value="checkout">📤 Check-out</TabsTrigger>
          </TabsList>

          <TabsContent value="unified" className="space-y-4">
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>Endpoint unifié (recommandé):</strong> Envoie les données vers un seul endpoint qui gère à la fois checkin et checkout
                </p>
                <code className="text-xs text-blue-700 block mt-2 break-all">
                  {environment.WEBHOOK_UNIFIED_URL}
                </code>
              </div>
              <Button
                onClick={() => handleSendWebhook('unified')}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer vers webhook unifié
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4">
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-md">
                <p className="text-sm text-purple-900">
                  <strong>Endpoint Check-in:</strong> Envoie les données d'état initial
                </p>
                <code className="text-xs text-purple-700 block mt-2 break-all">
                  {environment.WEBHOOK_CHECKIN_URL}
                </code>
              </div>
              <Button
                onClick={() => handleSendWebhook('checkin')}
                disabled={isSending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer vers webhook check-in
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="checkout" className="space-y-4">
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                <p className="text-sm text-orange-900">
                  <strong>Endpoint Check-out:</strong> Envoie les données d'état final et validations
                </p>
                <code className="text-xs text-orange-700 block mt-2 break-all">
                  {environment.WEBHOOK_CHECKOUT_URL}
                </code>
              </div>
              <Button
                onClick={() => handleSendWebhook('checkout')}
                disabled={isSending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer vers webhook check-out
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <ScrollArea className="max-h-[30vh] pr-4">
          <div className="space-y-4">
            {/* Aperçu des données */}
            {webhookData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">📊 Aperçu des données</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyData}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copier
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(webhookData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Résultat de l'envoi */}
            {sendResult && (
              <div className={`p-3 rounded-md ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${sendResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {sendResult.message}
                    </p>
                    {sendResult.endpoint && (
                      <code className="text-xs text-muted-foreground block mt-1">
                        {sendResult.endpoint}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


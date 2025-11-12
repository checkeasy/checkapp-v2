/**
 * 🗂️ Dialog pour afficher la liste complète des sessions utilisateur
 * Permet de reprendre une session existante ou d'en créer une nouvelle
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckSession, UserSessionsList } from '@/services/checkSessionManager';
import { Clock, CheckCircle2, PlayCircle, PlusCircle, Calendar } from 'lucide-react';

interface UserSessionsListDialogProps {
  isOpen: boolean;
  userSessionsList: UserSessionsList;
  userName: string;
  onResumeSession: (session: CheckSession) => void;
  onCreateNewSession: () => void;
  onClose: () => void;
}

export function UserSessionsListDialog({
  isOpen,
  userSessionsList,
  userName,
  onResumeSession,
  onCreateNewSession,
  onClose
}: UserSessionsListDialogProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (session: CheckSession) => {
    if (session.isFlowCompleted) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Complété</Badge>;
    }
    if (session.status === 'active') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">En cours</Badge>;
    }
    return <Badge variant="outline">Inactif</Badge>;
  };

  const getFlowTypeBadge = (flowType: 'checkin' | 'checkout') => {
    return flowType === 'checkin'
      ? <Badge variant="outline" className="bg-purple-50 text-purple-700">Check-in</Badge>
      : <Badge variant="outline" className="bg-orange-50 text-orange-700">Check-out</Badge>;
  };

  // Déterminer le type de nouvelle session basé sur les sessions existantes
  const getNewSessionLabel = () => {
    if (userSessionsList.activeSessions.length === 0 && userSessionsList.completedSessions.length === 0) {
      return 'Nouveau ménage';
    }

    // Vérifier le type de la dernière session
    const lastSession = userSessionsList.activeSessions[0] || userSessionsList.completedSessions[0];
    if (lastSession?.flowType === 'checkin') {
      return 'Nouveau séjour';
    }
    return 'Nouveau ménage';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-auto p-4 sm:p-6 max-h-[90vh] flex flex-col">
        {/* Header - Compact */}
        <DialogHeader className="space-y-2 mb-4">
          <DialogTitle className="text-lg sm:text-xl">
            Bienvenue 👋
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {userSessionsList.activeSessions.length} session(s) en cours
          </DialogDescription>
        </DialogHeader>

        {/* Sessions List - Scrollable */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-2">
            {/* Active Sessions */}
            {userSessionsList.activeSessions.map((session) => (
              <button
                key={session.checkId}
                onClick={() => onResumeSession(session)}
                className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors active:scale-95"
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  {getFlowTypeBadge(session.flowType)}
                  {getStatusBadge(session)}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    📅 Créée: {formatDate(session.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ⏱️ Dernière activité: {formatDate(session.lastActiveAt)}
                  </p>
                </div>
              </button>
            ))}

            {/* Completed Sessions */}
            {userSessionsList.completedSessions.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                  ✓ Sessions complétées
                </p>
                {userSessionsList.completedSessions.map((session) => (
                  <button
                    key={session.checkId}
                    onClick={() => onResumeSession(session)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors active:scale-95 opacity-75"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getFlowTypeBadge(session.flowType)}
                      {getStatusBadge(session)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        📅 Créée: {formatDate(session.createdAt)}
                      </p>
                      {session.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          ✓ Complétée: {formatDate(session.completedAt)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions - Fixed at bottom */}
        <div className="flex gap-2 pt-3 border-t border-border/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 text-sm"
          >
            Annuler
          </Button>
          <Button
            onClick={onCreateNewSession}
            className="flex-1 h-10 text-sm"
          >
            {getNewSessionLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


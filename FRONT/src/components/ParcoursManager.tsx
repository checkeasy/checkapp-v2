/**
 * 🎯 Composant de gestion du parcours global
 * Affiche les informations du parcours actuel et permet de le recharger
 */

import React from 'react';
import { useGlobalParcours } from '@/contexts/GlobalParcoursContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Home, Users, Camera, CheckCircle2 } from 'lucide-react';

export function ParcoursManager() {
  const { info, rooms, stats, isLoaded, loading, refreshParcours } = useGlobalParcours();

  if (!isLoaded) {
    return null; // Ne rien afficher si pas de parcours chargé
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4" />
            Parcours actuel
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshParcours}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Nom du parcours */}
        <div>
          <p className="text-sm font-medium">{info.name}</p>
          <p className="text-xs text-muted-foreground">{info.logement}</p>
        </div>

        {/* Badges d'information */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {info.type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Camera className="h-3 w-3 mr-1" />
            {info.takePicture}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Home className="h-3 w-3 mr-1" />
            {rooms.length} pièces
          </Badge>
          <Badge variant="outline" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {stats.totalTasks} tâches
          </Badge>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Pièces</p>
            <p className="text-lg font-semibold">{stats.totalRooms}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Tâches</p>
            <p className="text-lg font-semibold">{stats.totalTasks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Photos</p>
            <p className="text-lg font-semibold">{stats.totalPhotos}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


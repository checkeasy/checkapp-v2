/**
 * 🔄 Toggle pour basculer entre données réelles et données de test
 * Affiche également l'état du chargement et les erreurs
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface DataSourceToggleProps {
  useRealData: boolean;
  onToggle: (value: boolean) => void;
  loading?: boolean;
  error?: string | null;
  parcoursInfo?: {
    id: string;
    name: string;
    type: string;
    logement: string;
    takePicture: string;
  } | null;
}

export function DataSourceToggle({
  useRealData,
  onToggle,
  loading = false,
  error = null,
  parcoursInfo = null
}: DataSourceToggleProps) {
  return (
    <div className="space-y-3">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="data-source" className="text-sm font-medium cursor-pointer">
            Source de données
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {useRealData ? 'API' : 'Test'}
          </span>
          <Switch
            id="data-source"
            checked={useRealData}
            onCheckedChange={onToggle}
            disabled={loading}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="ml-2">
            Chargement des données du parcours...
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Success State with Parcours Info */}
      {!loading && !error && parcoursInfo && useRealData && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-1">
              <div className="font-medium text-green-900">
                Parcours chargé: {parcoursInfo.name}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {parcoursInfo.type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {parcoursInfo.logement}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {parcoursInfo.takePicture}
                </Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Data Info */}
      {!useRealData && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-900 text-sm">
            💡 Mode test activé - Utilisation de données fictives pour le développement
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}


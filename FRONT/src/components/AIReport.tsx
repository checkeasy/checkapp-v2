import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";

interface AIReportProps {
  report: {
    id: string;
    status: "generating" | "completed";
    summary: {
      overallStatus: "clean" | "issues" | "damage";
      issuesDetected: number;
      cleaningScore: number;
    };
    roomAnalysis: Array<{
      roomName: string;
      status: "clean" | "issues" | "damage";
      issues: string[];
      cleaningScore: number;
    }>;
    detectedIssues: Array<{
      type: "damage" | "cleanliness" | "missing";
      description: string;
      room: string;
      severity: "low" | "medium" | "high";
      photoEvidence: string;
    }>;
    generatedAt: string;
  };
  onDownloadReport: () => void;
}

export const AIReport = ({ report, onDownloadReport }: AIReportProps) => {
  if (report.status === "generating") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Génération du rapport IA</h3>
              <p className="text-muted-foreground">
                Analyse des photos en cours...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "clean":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "issues":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "damage":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "clean":
        return <Badge className="bg-success hover:bg-success">Conforme</Badge>;
      case "issues":
        return <Badge variant="secondary" className="bg-warning hover:bg-warning text-warning-foreground">Problèmes mineurs</Badge>;
      case "damage":
        return <Badge variant="destructive">Dégâts détectés</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return <Badge variant="outline" className="text-xs">Mineur</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-warning hover:bg-warning text-warning-foreground text-xs">Modéré</Badge>;
      case "high":
        return <Badge variant="destructive" className="text-xs">Sévère</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">-</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête du rapport */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Rapport IA - État des lieux
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Généré le {new Date(report.generatedAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <Button onClick={onDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(report.summary.overallStatus)}
              <span className="font-medium">État général</span>
            </div>
            {getStatusBadge(report.summary.overallStatus)}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{report.summary.cleaningScore}%</div>
              <div className="text-sm text-muted-foreground">Score propreté</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{report.summary.issuesDetected}</div>
              <div className="text-sm text-muted-foreground">Problèmes détectés</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyse par pièce */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analyse par pièce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.roomAnalysis.map((room, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(room.status)}
                  <span className="font-medium">{room.roomName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{room.cleaningScore}%</span>
                  {getStatusBadge(room.status)}
                </div>
              </div>
              {room.issues.length > 0 && (
                <ul className="ml-7 space-y-1">
                  {room.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
              {index < report.roomAnalysis.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Problèmes détectés */}
      {report.detectedIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Problèmes détectés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.detectedIssues.map((issue, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-medium">{issue.room}</span>
                  </div>
                  {getSeverityBadge(issue.severity)}
                </div>
                <p className="text-sm text-foreground mb-2">{issue.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {issue.type === "damage" ? "Dégât" : issue.type === "cleanliness" ? "Propreté" : "Manquant"}
                  </Badge>
                  <span>•</span>
                  <span>Photo de preuve disponible</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
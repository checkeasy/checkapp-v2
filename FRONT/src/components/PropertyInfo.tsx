import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, Car, Key, ExternalLink, Clock, Copy, Check, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PropertyInfoProps {
  propertyData: {
    address: string;
    wifi: { network: string; password: string };
    parking: string;
    access: string;
    airbnbLink: string;
    checkIn: string;
    checkOut: string;
    visibleSections: string[];  // ✅ AJOUTÉ - Sections à afficher
  };
}

export const PropertyInfo = ({ propertyData }: PropertyInfoProps) => {
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // ✅ NOUVEAU - Fonction helper pour vérifier si une section doit être affichée
  const isVisible = (sectionKey: string): boolean => {
    return propertyData.visibleSections.includes(sectionKey);
  };

  const copyWifiPassword = async () => {
    try {
      await navigator.clipboard.writeText(propertyData.wifi.password);
      setCopiedPassword(true);
      toast.success("Mot de passe WiFi copié !");
      
      // Reset icon after 2 seconds
      setTimeout(() => {
        setCopiedPassword(false);
      }, 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(propertyData.address);
      setCopiedAddress(true);
      toast.success("Adresse copiée !");
      
      // Reset icon after 2 seconds
      setTimeout(() => {
        setCopiedAddress(false);
      }, 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  return (
    <div className="space-y-4">
      {/* ✅ Section Adresse - Conditionnelle */}
      {isVisible('adresse') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Adresse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center gap-2">
              <span className="text-foreground text-sm flex-1">{propertyData.address}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
              >
                {copiedAddress ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Section WiFi - Conditionnelle */}
      {isVisible('wifi') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Accès WiFi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Réseau :</span>
              <Badge variant="outline">{propertyData.wifi.network}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mot de passe :</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm">{propertyData.wifi.password}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyWifiPassword}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  {copiedPassword ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Section Parking - Conditionnelle */}
      {isVisible('parking') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Se garer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{propertyData.parking}</p>
          </CardContent>
        </Card>
      )}

      {/* ✅ Section Accès - Conditionnelle */}
      {isVisible('access') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Comment rentrer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{propertyData.access}</p>
          </CardContent>
        </Card>
      )}

      {/* ✅ Section Airbnb - Conditionnelle */}
      {isVisible('airbnb') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              Lien Airbnb
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={propertyData.airbnbLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              Voir l'annonce Airbnb
            </a>
          </CardContent>
        </Card>
      )}

      {/* ✅ Section Horaires Check-in/Check-out - Conditionnelle */}
      {isVisible('checkin-checkout') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Check-in :</span>
              <Badge variant="outline">{propertyData.checkIn}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Check-out :</span>
              <Badge variant="outline">{propertyData.checkOut}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
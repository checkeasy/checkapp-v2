import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PropertyInfo } from "@/components/PropertyInfo";
import { RoomReference } from "@/components/RoomReference";
import { CleaningTasks } from "@/components/CleaningTasks";
import { ProgressTracker } from "@/components/ProgressTracker";
import { AIReport } from "@/components/AIReport";
import { TaskManager } from "@/components/TaskManager";
import { RoomsModal } from "@/components/RoomsModal";
import { CleaningInstructionsModal } from "@/components/CleaningInstructionsModal";
import { ParcoursManager } from "@/components/ParcoursManager";
import { useGlobalParcours, useParcoursData } from "@/contexts/GlobalParcoursContext";
import { useCheckoutFlowManager } from "@/hooks/useCheckoutFlowManager";
import { parcoursCache } from "@/services/parcoursCache";
import { LegacyRoom } from "@/types/room";
import { Home, Camera, Calendar, Sparkles, FileText, User, CheckCircle2, Wifi, Car, Key, ExternalLink, Clock, ChevronRight, AlertTriangle, LogOut, HelpCircle, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useUser } from "@/contexts/UserContext";
import { useReportProblem } from "@/contexts/ReportProblemContext";
import { useAppFlow } from "@/contexts/AppFlowContext";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileSheet } from "@/components/ProfileSheet";
import { HelpSheet } from "@/components/HelpSheet";
import { SignalementsCard } from "@/components/SignalementsCard";
import { Signalement } from "@/types/signalement";
import { environment } from "@/config/environment";
import { extractPropertyDataFromRawData, PropertyData } from "@/utils/propertyDataHelpers";
import { navigatePreservingParams } from "@/utils/navigationHelpers";

// Interface pour la configuration de navigation
interface NavigationConfig {
  buttonText: string;
  navigationAction: () => void;
  shouldShowInitialStateScreen: boolean;
  flowDescription: string;
}

// Fonction de configuration navigationnelle basée sur les données réelles de l'API
const getNavigationConfigFromData = (
  userType: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE' | undefined,
  parcoursInfo: {
    name: string;
    type: string;
    logement: string;
    takePicture: string;
  } | null,
  navigate: any, // 🎯 FIX: Type any pour accepter NavigateFunction
  currentParcoursId?: string,
  hasProgress?: boolean, // 🎯 NOUVEAU: pour adapter le texte selon le progrès
  // 🎯 NOUVEAU: Variables CheckID nécessaires pour navigation
  isCheckIdActive?: boolean,
  currentCheckId?: string
): NavigationConfig => {

  // 🎯 FIX: Utiliser navigatePreservingParams au lieu de la fonction locale
  // Cette fonction est testée et utilisée dans toute l'application
  const navigateWithParcours = (path: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkId = urlParams.get('checkid');

    console.log('🔗 CheckEasy: Navigation avec préservation des paramètres:', {
      path,
      checkId,
      currentParcoursId,
      currentUrl: window.location.href
    });

    // Utiliser la fonction utilitaire qui préserve correctement les paramètres
    navigatePreservingParams(navigate, path, checkId, 'resume');
  };
  
  // Cas par défaut si pas de données
  if (!userType || !parcoursInfo) {
    return {
      buttonText: "Commencer",
      navigationAction: () => navigate('/'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Configuration par défaut"
    };
  }

  const isAgent = userType === 'AGENT';
  const isGestionnaire = userType === 'GESTIONNAIRE';
  const isCheckInAndOut = parcoursInfo.takePicture === 'checkInAndCheckOut';
  
  // SCÉNARIO 1: Agent de ménage ou Gestionnaire - checkOutOnly
  if ((isAgent || isGestionnaire) && parcoursInfo.takePicture === 'checkOutOnly') {
    return {
      buttonText: "Finaliser mon ménage",
      navigationAction: () => navigateWithParcours('/checkout'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Agent de ménage - Photos de sortie uniquement"
    };
  }
  
  // SCÉNARIO 1bis: Agent de ménage ou Gestionnaire - checkInOnly (pour compatibilité)
  if ((isAgent || isGestionnaire) && parcoursInfo.takePicture === 'checkInOnly') {
    return {
      buttonText: "Finaliser mon ménage",
      navigationAction: () => navigateWithParcours('/checkout'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Agent de ménage - Finalisation uniquement (checkInOnly - compatibilité)"
    };
  }
  
  // SCÉNARIO 2: Agent de ménage ou Gestionnaire - checkInAndCheckOut  
  if ((isAgent || isGestionnaire) && isCheckInAndOut) {
    return {
      buttonText: "Commencer le ménage",
      navigationAction: () => navigateWithParcours('/etat-initial'),
      shouldShowInitialStateScreen: true,
      flowDescription: "Agent de ménage - Contrôle d'entrée puis sortie"
    };
  }
  
  // SCÉNARIO 3: Voyageur - checkOutOnly
  if (userType === 'CLIENT' && parcoursInfo.takePicture === 'checkOutOnly') {
    return {
      buttonText: hasProgress ? "Continuer mon état des lieux de sortie" : "Commencer mon état des lieux de sortie",
      navigationAction: () => navigateWithParcours('/checkout'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Voyageur - État des lieux de sortie uniquement"
    };
  }
  
  // SCÉNARIO 3bis: Voyageur - checkInOnly (pour compatibilité)
  if (userType === 'CLIENT' && parcoursInfo.takePicture === 'checkInOnly') {
    return {
      buttonText: "Commencer mon check-in",
      navigationAction: () => navigateWithParcours('/checkin'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Voyageur - Check-in uniquement (checkInOnly - compatibilité)"
    };
  }
  
  // SCÉNARIO 4: Voyageur - checkInAndCheckOut
  if (userType === 'CLIENT' && isCheckInAndOut) {
    return {
      buttonText: hasProgress ? "Continuer mon état des lieux" : "Commencer mon état des lieux",
      navigationAction: () => navigateWithParcours('/checkin'),
      shouldShowInitialStateScreen: false,
      flowDescription: "Voyageur - État des lieux d'entrée et sortie"
    };
  }
  
  // Fallback (ne devrait pas arriver)
  return {
    buttonText: "Commencer le parcours",
    navigationAction: () => navigateWithParcours('/'),
    shouldShowInitialStateScreen: false,
    flowDescription: "Configuration non reconnue"
  };
};

// Fonction de validation des données pour les 4 scénarios
const validateParcoursData = (
  userType: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE' | undefined,
  parcoursInfo: { takePicture: string; type: string } | null
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!userType) {
    errors.push("Type d'utilisateur non défini");
  }
  
  if (!parcoursInfo) {
    errors.push("Informations de parcours non disponibles");
    return { isValid: false, errors };
  }
  
  // Validation takePicture
  if (!['checkOutOnly', 'checkInOnly', 'checkInAndCheckOut'].includes(parcoursInfo.takePicture)) {
    errors.push(`Valeur takePicture invalide: ${parcoursInfo.takePicture}`);
  }
  
  // Validation type de parcours (assouplie)
  const validTypes = ['Ménage', 'Voyageur', 'Voyage', 'Location', 'Cleaning', 'Guest'];
  if (!validTypes.includes(parcoursInfo.type)) {
    // Avertissement au lieu d'erreur pour plus de flexibilité
    // errors.push(`Type de parcours invalide: ${parcoursInfo.type}`);
  }
  
  // Validation cohérence utilisateur/parcours (assouplie)
  // Note: Validation assouplie pour permettre plus de flexibilité
  // Avertissements au lieu d'erreurs bloquantes
  if ((userType === 'AGENT' || userType === 'GESTIONNAIRE') && parcoursInfo.type !== 'Ménage') {
    // errors.push("Incohérence: Utilisateur AGENT/GESTIONNAIRE avec parcours non-Ménage");
  }
  
  if (userType === 'CLIENT' && parcoursInfo.type !== 'Voyageur') {
    // errors.push("Incohérence: Utilisateur CLIENT avec parcours non-Voyageur");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Données mockées conservées pour référence/fallback si nécessaire
const mockRooms: LegacyRoom[] = [{
  id: "salon",
  name: "Salon",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier l'état du canapé", "Contrôler la télévision", "S'assurer que les télécommandes sont présentes"],
  checkpoints: ["Canapé sans taches", "Télé fonctionne", "Télécommandes présentes"],
  generalInstructions: ["Aspirer le tapis", "Dépoussiérer les meubles", "Nettoyer la table basse"],
  cleaningInfo: "Ne pas passer la serpillère sur le parquet",
  roomInfo: "Ne pas essayer d'ouvrir la fenêtre de gauche car cassée",
  specificTasks: [{
    id: "vacuum",
    task: "Aspirer le tapis",
    completed: false,
    description: "Aspirer sous le tapis et le remettre à sa place"
  }, {
    id: "dust",
    task: "Dépoussiérer les meubles",
    completed: false,
    description: "Dépoussiérer toutes les surfaces des meubles avec un chiffon microfibre"
  }, {
    id: "table",
    task: "Nettoyer la table basse",
    completed: false,
    description: "Nettoyer la surface et retirer tous les objets avant de la désinfecter"
  }]
}, {
  id: "cuisine",
  name: "Cuisine",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier le frigo", "Contrôler les plaques", "État de l'évier"],
  checkpoints: ["Frigo propre", "Plaques fonctionnent", "Évier nickel"],
  generalInstructions: ["Nettoyer le plan de travail", "Laver la vaisselle", "Sortir les poubelles"],
  cleaningInfo: "Attention aux produits de nettoyage sous l'évier",
  roomInfo: "Le lave-vaisselle est en panne, laver à la main uniquement",
  specificTasks: [{
    id: "counter",
    task: "Nettoyer le plan de travail",
    completed: false,
    description: "Désinfecter toute la surface et ranger les objets qui traînent"
  }, {
    id: "dishes",
    task: "Laver la vaisselle",
    completed: false,
    description: "Laver et ranger toute la vaisselle dans les placards appropriés"
  }, {
    id: "trash",
    task: "Sortir les poubelles",
    completed: false,
    description: "Vider toutes les poubelles et remettre de nouveaux sacs"
  }]
}, {
  id: "chambre",
  name: "Chambre",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier l'état du lit", "Contrôler l'armoire", "S'assurer que tout est rangé"],
  checkpoints: ["Lit fait", "Armoire fermée", "Chambre rangée"],
  generalInstructions: ["Changer les draps", "Aspirer le sol", "Nettoyer les surfaces"],
  cleaningInfo: "Draps de rechange dans l'armoire de l'entrée",
  roomInfo: "L'interrupteur de la lampe de chevet droite ne fonctionne pas",
  specificTasks: [{
    id: "bedsheets",
    task: "Changer draps & taies",
    completed: false,
    photo: "/lovable-uploads/20e08a26-b269-4181-9b0f-7e52c4e43e9d.png",
    description: "Mettre une parure propre et faire le lit parfaitement tiré au carré"
  }, {
    id: "vacuum_room",
    task: "Aspirer le sol",
    completed: false,
    description: "Aspirer entièrement le sol y compris sous le lit si possible"
  }, {
    id: "dust_room",
    task: "Dépoussiérer",
    completed: false,
    description: "Dépoussiérer toutes les surfaces visibles des meubles et objets"
  }]
}, {
  id: "salle_de_bain",
  name: "Salle de bain",
  photos: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
  instructions: ["Vérifier la propreté", "Contrôler les équipements", "État général"],
  checkpoints: ["Salle de bain propre", "Équipements fonctionnent", "Serviettes propres"],
  generalInstructions: ["Nettoyer les sanitaires", "Laver le sol", "Changer les serviettes"],
  cleaningInfo: "Utiliser uniquement les produits écologiques",
  roomInfo: "Le robinet de la douche fuit légèrement, c'est normal",
  specificTasks: [{
    id: "hair_removal",
    task: "Retirer cheveux/poils (siphon)",
    completed: false,
    description: "Nettoyer complètement le siphon de douche et retirer tous les cheveux"
  }, {
    id: "sanitaires",
    task: "Nettoyer les sanitaires",
    completed: false,
    description: "Désinfecter entièrement les toilettes, lavabo et douche"
  }, {
    id: "mirror",
    task: "Nettoyer le miroir",
    completed: false,
    description: "Nettoyer le miroir sans laisser de traces avec un produit adapté"
  }]
}];
const mockAIReport = {
  id: "report-123",
  status: "completed" as const,
  summary: {
    overallStatus: "clean" as const,
    issuesDetected: 0,
    cleaningScore: 95
  },
  roomAnalysis: [{
    roomName: "Salon",
    status: "clean" as const,
    issues: [],
    cleaningScore: 98
  }, {
    roomName: "Cuisine",
    status: "clean" as const,
    issues: [],
    cleaningScore: 92
  }],
  detectedIssues: [],
  generatedAt: new Date().toISOString()
};
export default function CheckEasy() {
  const navigate = useNavigate();
  const {
    user,
    logout
  } = useUser();
  const {
    currentCheckId,
    isCheckIdActive,
    createNewCheckId,
    setActiveCheckId
  } = useActiveCheckId();
  const { toast } = useToast();
  
  // 🚨 URL MONITORING: Surveiller tous les changements d'URL
  const urlMonitorRef = useRef(window.location.href);
  useEffect(() => {
    const monitorUrl = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== urlMonitorRef.current) {
        console.log('🚨 CHECKEASY URL CHANGED DETECTED:', {
          from: urlMonitorRef.current,
          to: currentUrl,
          hasCheckId: currentUrl.includes('checkid'),
          hasParcoursId: currentUrl.includes('parcours'),
          timestamp: new Date().toISOString()
        });
        urlMonitorRef.current = currentUrl;
      }
    };

    const interval = setInterval(monitorUrl, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, []);
  const [activeTab, setActiveTab] = useState("info");
  const [photosTaken, setPhotosTaken] = useState<Record<string, number>>({});
  const [selectedReferencePhoto, setSelectedReferencePhoto] = useState<string | null>(null);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  
  // Utilise le gestionnaire global de parcours
  const { loading, error, parcoursInfo, rooms: globalRooms, stats, loadParcours, clearParcours, currentParcours } = useGlobalParcours();
  const { isLoaded } = useParcoursData();
  
  // 🎯 Vérifier s'il y a du progrès via localStorage (données de session)
  // Évite le conflit de types avec useCheckoutFlowManager pour l'instant
  
  // 🎯 OPTIMISATION : Refs pour éviter les loops de chargement
  const hasLoadedFromUrl = useRef(false);
  const currentUrlParcoursId = useRef<string | null>(null);
  const lastProcessedUrl = useRef<string>('');
  
  // 🎯 Récupérer l'ID du parcours depuis l'URL une seule fois
  const getParcoursIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('parcours');
  };

  // 🎯 OPTIMISATION : Chargement intelligent basé sur l'URL
  useEffect(() => {
    console.log('🔥 USEEFFECT 1 (loadParcoursFromUrlIfNeeded) TRIGGERED');
    const loadParcoursFromUrlIfNeeded = async () => {
      const currentUrl = window.location.href;
      const parcoursIdFromUrl = getParcoursIdFromUrl();
      
      // 🎯 Éviter les chargements redondants
      if (lastProcessedUrl.current === currentUrl) {
        return;
      }

      if (!parcoursIdFromUrl) {
        lastProcessedUrl.current = currentUrl;
        return;
      }

      // 🎯 Éviter le rechargement du même parcours
      if (hasLoadedFromUrl.current && currentUrlParcoursId.current === parcoursIdFromUrl) {
        lastProcessedUrl.current = currentUrl;
        return;
      }

      try {
        hasLoadedFromUrl.current = true;
        currentUrlParcoursId.current = parcoursIdFromUrl;
        lastProcessedUrl.current = currentUrl;
        
        await loadParcours(parcoursIdFromUrl);
        } catch (error) {
        console.error('❌ CheckEasy: Erreur lors du chargement:', error);
        hasLoadedFromUrl.current = false;
        currentUrlParcoursId.current = null;
      }
    };

    // 🎯 Chargement uniquement si nécessaire
    loadParcoursFromUrlIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides intentionnellement pour éviter les re-runs

  // 🎯 OPTIMISATION : Synchronisation URL sans rechargement
  useEffect(() => {
    console.log('🔥 USEEFFECT 2 (synchronisation URL) TRIGGERED');
    if (parcoursInfo && currentParcours) {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      const parcoursIdFromUrl = urlParams.get('parcours');
      const checkIdFromUrl = urlParams.get('checkid');

      // 🎯 Mise à jour URL SANS rechargement si nécessaire (en préservant checkid)
      // ⚠️ CONDITION RENFORCÉE: Ne pas écraser si l'URL contient déjà les bons paramètres
      const hasCorrectParcours = parcoursIdFromUrl === currentParcours.id;
      const shouldUpdateUrl = !parcoursIdFromUrl && currentParcours.id && !lastProcessedUrl.current.includes(`parcours=${currentParcours.id}`) && !hasCorrectParcours;

      if (shouldUpdateUrl) {
        const urlParams = new URLSearchParams(window.location.search);
        const checkIdFromUrlAgain = urlParams.get('checkid');

        // 🆕 FIX: Utiliser currentCheckId du contexte si pas dans l'URL
        const effectiveCheckId = checkIdFromUrlAgain || currentCheckId;

        // Construire l'URL avec parcours ET checkid
        let correctUrl = `${window.location.pathname}?parcours=${currentParcours.id}`;
        if (effectiveCheckId) {
          correctUrl += `&checkid=${effectiveCheckId}`;
        }

        console.log('🔗 CheckEasy: Mise à jour URL sans rechargement (préservant CheckID):', correctUrl);
        window.history.replaceState({}, '', correctUrl);
        lastProcessedUrl.current = correctUrl;
      }
    }
  }, [parcoursInfo, currentParcours, currentCheckId]);

  // Les données de parcours sont utilisées telles que reçues de l'API
  // Les scénarios s'adaptent automatiquement selon la valeur takePicture de l'API
  const correctedParcoursInfo = useMemo(() => {
    if (!parcoursInfo) return null;

    console.log('📋 CheckEasy: Données parcours utilisées:', {
      takePicture: parcoursInfo.takePicture,
      logement: parcoursInfo.logement,
      type: parcoursInfo.type
    });

    return parcoursInfo; // Utilisation directe des données API sans correction
  }, [parcoursInfo]);

  // Validation des données de parcours (utilise les données corrigées)
  const validation = validateParcoursData(user?.type, correctedParcoursInfo);

  // 🎯 Vérifier s'il y a du progrès dans le checkout via IndexedDB
  const [hasCheckoutProgress, setHasCheckoutProgress] = useState(false);
  
  useEffect(() => {
    const checkProgress = async () => {
      if (!currentParcours?.id) {
        setHasCheckoutProgress(false);
        return;
      }

      try {
        // Méthode principale: Vérifier dans IndexedDB (tous types)
        const hasCheckoutProgress = await parcoursCache.hasFlowProgress(currentParcours.id, 'checkout');
        const hasCheckinProgress = await parcoursCache.hasFlowProgress(currentParcours.id, 'checkin');
        const hasProgress = hasCheckoutProgress || hasCheckinProgress;
        
        if (hasProgress) {
          setHasCheckoutProgress(true);
          return;
        }

        // Méthode fallback: Vérifier dans les stats du GlobalParcours
        if (stats && stats.completedTasks > 0) {
          setHasCheckoutProgress(true);
          return;
        }

        setHasCheckoutProgress(false);
      } catch (error) {
        setHasCheckoutProgress(false);
      }
    };

    checkProgress();
  }, [currentParcours?.id, stats]);
  
  // Configuration de navigation basée sur les données API
  const navigationConfig = getNavigationConfigFromData(
    user?.type,
    correctedParcoursInfo,
    navigate,
    currentParcours?.id,
    hasCheckoutProgress, // 🎯 Passer l'info de progrès
    // 🎯 NOUVEAU: Passer les variables CheckID pour navigation
    isCheckIdActive,
    currentCheckId
  );

  // Log du scénario appliqué basé sur les données API
  useEffect(() => {
    if (correctedParcoursInfo && user?.type) {
      }
  }, [correctedParcoursInfo, user?.type, navigationConfig]);

  // 🎯 NOUVEAU: Auto-création CheckID si inexistant
  useEffect(() => {
    console.log('🔥 USEEFFECT 3 (ensureCheckIdExists) TRIGGERED');
    const ensureCheckIdExists = async () => {
      // Conditions pour créer un CheckID automatiquement
      if (!user || !currentParcours || !correctedParcoursInfo) {
        return;
      }

      // 🚨 PRIORITÉ: Vérifier d'abord l'URL directement
      const urlParams = new URLSearchParams(window.location.search);
      const checkIdFromUrl = urlParams.get('checkid');
      
      if (checkIdFromUrl) {
        return;
      }

      // Si déjà un CheckID actif, ne rien faire
      if (isCheckIdActive && currentCheckId) {
        return;
      }

      try {
        // Déterminer le type de flow selon l'utilisateur
        const flowType = user.type === 'CLIENT' ? 'checkin' : 'checkout';
        
        // Créer le nouveau CheckID
        const newCheckId = await createNewCheckId(
          {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            type: user.type
          },
          {
            id: currentParcours.id,
            name: correctedParcoursInfo.name,
            type: correctedParcoursInfo.type,
            logement: correctedParcoursInfo.logement,
            takePicture: correctedParcoursInfo.takePicture
          },
          flowType
        );

        toast({
          title: "Session initialisée",
          description: `CheckID: ${newCheckId.split('_')[1]}`,
        });

      } catch (error) {
        console.error('❌ CheckEasy: Erreur création auto CheckID:', error);
        // Ne pas bloquer l'utilisateur, continuer en mode Legacy
      }
    };

    ensureCheckIdExists();
  }, [user, currentParcours, correctedParcoursInfo, isCheckIdActive, currentCheckId, createNewCheckId, toast]);

  // 🎯 FIX: Extraire les vraies données du logement depuis rawData au lieu d'utiliser des données génériques
  const propertyData = currentParcours?.rawData
    ? extractPropertyDataFromRawData(currentParcours.rawData)
    : extractPropertyDataFromRawData(null);
  
  // Convertit les pièces vers le format LegacyRoom pour compatibilité
  const rooms = globalRooms.map(piece => ({
    id: piece.id,
    name: piece.nom,
    photos: piece.photoReferences?.checkin?.map(ref => ref.url) || [],
    instructions: piece.tasks?.filter(t => t.type === 'checkbox').map(t => t.label) || [],
    checkpoints: piece.tasks?.filter(t => t.type === 'checkbox').map(t => t.description || t.label) || [],
    generalInstructions: [piece.cleaningInfo],
    cleaningInfo: piece.cleaningInfo,
    roomInfo: piece.roomInfo,
    specificTasks: piece.tasks?.map(task => ({
      id: task.id,
      task: task.label,
      completed: task.completed || false,
      description: task.description
    })) || []
  } as LegacyRoom));
  const [isHelpSheetOpen, setIsHelpSheetOpen] = useState(false);
  const {
    openReportModal
  } = useReportProblem();
  const {
    flowState,
    updateCleaningProgress,
    getStageConfig
  } = useAppFlow();

  // Calculate current cleaning progress
  const totalTasks = rooms.reduce((acc, room) => acc + room.specificTasks.length, 0);
  const completedTasks = rooms.reduce((acc, room) => acc + room.specificTasks.filter(task => task.completed).length, 0);

  // Cleaning progress is now managed by the real data system

  // Validation des données de parcours avec useEffect
  useEffect(() => {
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: "Configuration invalide",
          description: error,
          variant: "destructive"
        });
      });
    }
  }, [validation.isValid, validation.errors, toast]);

  // Mock signalements data
  const [signalements] = useState<Signalement[]>([{
    id: "1",
    titre: "Fuite d'eau sous le lavabo, le sol est mouillé",
    piece: "Salle de bain",
    origine: "Voyageur",
    description: "Il y a une fuite d'eau importante sous le lavabo",
    status: "A_TRAITER",
    priorite: true,
    miniatures: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
    created_at: "2025-01-07T14:30:00Z",
    updated_at: "2025-01-07T14:30:00Z"
  }, {
    id: "2",
    titre: "Réfrigérateur ne fonctionne plus, aliments à risque",
    piece: "Cuisine",
    origine: "Agent Ménage",
    description: "Le réfrigérateur est complètement en panne",
    status: "A_TRAITER",
    priorite: false,
    miniatures: [],
    created_at: "2025-01-07T09:15:00Z",
    updated_at: "2025-01-07T09:15:00Z"
  }]);

  // Mock historique signalements par pièce (résolus)
  const mockHistoriqueSignalements: Record<string, Signalement[]> = {
    'salle_de_bain': [{
      id: "hist-1",
      titre: "Serviettes sales laissées",
      piece: "Salle de bain",
      origine: "Agent Ménage",
      description: "Les serviettes n'ont pas été changées",
      status: "RESOLU",
      priorite: false,
      miniatures: [],
      created_at: "2025-01-05T16:45:00Z",
      updated_at: "2025-01-05T18:00:00Z"
    }],
    'chambre': [{
      id: "hist-2",
      titre: "Ampoule grillée lampe de chevet",
      piece: "Chambre",
      origine: "Voyageur",
      description: "L'ampoule de la lampe de chevet ne fonctionne plus",
      status: "RESOLU",
      priorite: false,
      miniatures: ["/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png"],
      created_at: "2025-01-06T10:20:00Z",
      updated_at: "2025-01-06T15:30:00Z"
    }]
  };
  // handleTaskToggle supprimée car nous utilisons maintenant les données réelles via useRoomsData
  const handleTakePhoto = (roomId: string) => {
    setPhotosTaken(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || 0) + 1
    }));
    toast({
      title: "Photo prise",
      description: "La photo a été enregistrée avec succès"
    });
  };
  const handleReportIssue = (roomId: string, issue: string) => {
    toast({
      title: "Problème signalé",
      description: `Signalement enregistré pour ${roomId}: ${issue}`
    });
  };
  const handleCompleteEntry = () => {
    setActiveTab("tasks");
    toast({
      title: "État d'entrée terminé",
      description: "Vous pouvez maintenant procéder aux tâches de sortie"
    });
  };
  const handleCompleteExit = () => {
    // Utilise la configuration de navigation existante
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursId = urlParams.get('parcours');
    const checkId = urlParams.get('checkid');
    
    let path = "/checkout";
    if (parcoursId) {
      path += `?parcours=${parcoursId}`;
      if (checkId) {
        path += `&checkid=${checkId}`;
      }
    }
    navigate(path);
  };
  const handleNavigateToSignalements = () => {
    // Utilise la configuration de navigation existante
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursId = urlParams.get('parcours');
    const checkId = urlParams.get('checkid');
    
    let path = "/signalements-a-traiter";
    if (parcoursId) {
      path += `?parcours=${parcoursId}`;
      if (checkId) {
        path += `&checkid=${checkId}`;
      }
    }
    navigate(path);
  };
  const totalEntryPhotos = rooms.length * 2;
  const totalExitPhotos = rooms.length * 2;
  const totalPhotosTaken = Object.values(photosTaken).reduce((acc, count) => acc + count, 0);
  
  // Affichage d'erreur si configuration invalide
  if (!validation.isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Configuration Invalide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Les données de parcours ne permettent pas de déterminer le flux approprié :
            </div>
            <ul className="text-sm space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-red-600">• {error}</li>
              ))}
            </ul>
            <Button onClick={() => navigate('/welcome')} className="w-full">
              Retour à la sélection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <div className="min-h-screen bg-background">
      {/* Header épuré */}
    <div className="bg-background px-4 py-3">
        <div className="max-w-md mx-auto">
          {/* Gestionnaire de parcours global */}
          <div className="mb-4">
            <ParcoursManager />
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {(() => {
                  if (user?.type === 'CLIENT') {
                    return correctedParcoursInfo?.takePicture === 'checkOutOnly' 
                      ? 'État des lieux de sortie' 
                      : correctedParcoursInfo?.takePicture === 'checkInOnly'
                      ? 'Check-in en cours'
                      : 'Séjour en cours';
                  } else {
                    return (correctedParcoursInfo?.takePicture === 'checkOutOnly' || correctedParcoursInfo?.takePicture === 'checkInOnly')
                      ? 'Finalisation du ménage'
                      : getStageConfig().title;
                  }
                })()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {correctedParcoursInfo?.logement || 'Logement non défini'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  if (correctedParcoursInfo?.takePicture === 'checkOutOnly') {
                    return user?.type === 'CLIENT' 
                      ? 'Photos à la sortie uniquement'
                      : 'Finalisation et photos de sortie';
                  } else if (correctedParcoursInfo?.takePicture === 'checkInOnly') {
                    return user?.type === 'CLIENT' 
                      ? 'Check-in avec photos d\'entrée'
                      : 'Finalisation du ménage';
                  } else if (correctedParcoursInfo?.takePicture === 'checkInAndCheckOut') {
                    return user?.type === 'CLIENT'
                      ? 'Check-in et check-out complets'
                      : 'Contrôle d\'état initial puis ménage et sortie';
                  }
                  
                  return 'Parcours - Mode de photos non défini';
                })()}
              </p>
              {/* Debug Info */}
              {loading && (
                <div className="text-xs text-blue-600 mt-1">
                  ⏳ Chargement des données...
                </div>
              )}
              {error && (
                <div className="text-xs text-red-600 mt-1">
                  ❌ {error}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                📊 {rooms.length} pièce{rooms.length > 1 ? 's' : ''} chargée{rooms.length > 1 ? 's' : ''}
              </div>
            </div>
            <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
          </div>
          
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-2">
        {/* Informations du logement */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Informations utiles
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <MapPin className="h-3 w-3" />
                    Adresse
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Wifi className="h-3 w-3" />
                    WiFi
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Car className="h-3 w-3" />
                    Se garer
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 justify-start">
                    <Clock className="h-3 w-3" />
                    Check-in/out
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Informations utiles</DialogTitle>
            </DialogHeader>
            <PropertyInfo propertyData={propertyData} />
          </DialogContent>
        </Dialog>

        {/* Photos de référence */}
        <RoomsModal flowType="checkin">
          <Card className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  Fiche du logement
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        </RoomsModal>


        {/* Tâches à effectuer */}
        <CleaningInstructionsModal flowType="checkout">
          <Card className="border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Consigne pour le ménage
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        </CleaningInstructionsModal>

        {/* Signalements à traiter */}
        <SignalementsCard onNavigateToAll={handleNavigateToSignalements} />

        {/* 🎯 REMOVED: "Faire le check d'entrée" button - Duplicate CTA removed to avoid confusion */}
        {/* The main CTA button at the bottom of the page serves the same purpose */}

        {/* Espace pour éviter que le contenu soit masqué par les boutons fixés */}
        
      </div>

      {/* Bandeau d'actions fixe en bas - Mobile optimized */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/90 backdrop-blur-sm border-t border-border/30 shadow-[0_-2px_12px_-2px_rgba(0,0,0,0.08)] px-4 py-3 pb-4 space-y-3 safe-area-inset-bottom">
        {/* Bouton principal - Valider par photo */}
        <Button onClick={() => {
        if (flowState.currentStage === "completed") {
          // Afficher le rapport IA dans un modal
          toast({
            title: "Rapport généré",
            description: "Le rapport IA est maintenant disponible"
          });
        } else {
          // Utiliser la configuration déterminée par les données
          navigationConfig.navigationAction();
          }
      }} className="w-full h-12 font-medium text-base rounded-xl transition-all duration-300 bg-gradient-primary hover:shadow-glow hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] shadow-card flex items-center justify-center gap-2">
          <Camera className="h-5 w-5" />
          {navigationConfig.buttonText}
        </Button>


        {/* Lien secondaire - Signaler un problème */}
        <button onClick={() => openReportModal()} className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground transition-colors py-2">
          Signaler un problème
        </button>
      </div>

      {/* Modal pour le rapport IA */}
      {flowState.currentStage === "completed" && <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Voir le rapport IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rapport IA</DialogTitle>
            </DialogHeader>
            <AIReport report={mockAIReport} onDownloadReport={() => {
          toast({
            title: "Téléchargement",
            description: "Le rapport sera disponible sous peu"
          });
        }} />
          </DialogContent>
        </Dialog>}

      {/* Profile Sheet */}
      <ProfileSheet isOpen={isProfileSheetOpen} onClose={() => setIsProfileSheetOpen(false)} onLogout={logout} />

      {/* Help Sheet */}
      <HelpSheet isOpen={isHelpSheetOpen} onClose={() => setIsHelpSheetOpen(false)} />


      {/* Modal pour afficher les photos en grand */}
      {selectedReferencePhoto && <Dialog open={!!selectedReferencePhoto} onOpenChange={() => setSelectedReferencePhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0 bg-black/90">
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={selectedReferencePhoto} alt="Photo de référence" className="max-w-full max-h-full object-contain" />
              <Button variant="outline" size="icon" className="absolute top-4 right-4 bg-background/80 hover:bg-background" onClick={() => setSelectedReferencePhoto(null)}>
                ✕
              </Button>
            </div>
          </DialogContent>
        </Dialog>}
    </div>;
}
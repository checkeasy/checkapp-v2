import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Phone, User, CheckCircle2, ArrowLeft, Briefcase, UserCheck, Download, Home, MapPin } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { useParcoursActions, useParcoursData } from '@/contexts/GlobalParcoursContext';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { checkSessionManager, CheckSession, UserSessionsList } from '@/services/checkSessionManager';
import { UserSessionsListDialog } from '@/components/UserSessionsListDialog';
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from '@/hooks/useSessionData';
import { useParcoursDataUnified } from '@/hooks/useParcoursDataUnified';
import { useNavigateWithParams } from '@/hooks/useNavigateWithParams';
import { navigationStateManager } from '@/services/navigationStateManager';

interface UserInfo {
  firstName: string;
  lastName: string;
  phone: string;
  acceptTerms: boolean;
}

interface StoredUser {
  firstName: string;
  lastName: string;
  registeredAt: string;
}

const Welcome = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState<'AGENT' | 'CLIENT'>('AGENT');
  const [existingUser, setExistingUser] = useState<StoredUser | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    acceptTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎯 État pour la gestion des sessions CheckID
  const [showUserSessionsList, setShowUserSessionsList] = useState(false);
  const [userSessionsList, setUserSessionsList] = useState<UserSessionsList | null>(null);
  
  // 🎯 État pour l'installation PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();
  const { toast } = useToast();
  const { login } = useUser();
  const { createNewCheckId, setActiveCheckId, currentCheckId } = useActiveCheckId();

  // 🎯 OPTIMISATION : Utilisation uniquement du contexte global
  const { loadParcours, loading: parcoursLoading, error: parcoursError } = useParcoursActions();
  const { info: globalParcoursInfo, rooms: globalRooms, isLoaded } = useParcoursData();

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursId = urlParams.parcoursId;
  const checkId = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkId);
  const { parcours, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursId, undefined);

  // � REFACTORISÉ: Restauration automatique de session depuis l'URL
  useEffect(() => {
    const restoreSessionFromUrl = async () => {
      // Si pas de checkId dans l'URL, rien à restaurer
      if (!checkId) {
        console.log('ℹ️ Welcome: Pas de checkID dans l\'URL, parcours normal');
        return;
      }

      // Si pas de session chargée, attendre
      if (sessionLoading) {
        console.log('⏳ Welcome: Chargement session en cours...');
        return;
      }

      // Si session introuvable
      if (!session) {
        console.error('❌ Welcome: Session introuvable pour checkID:', checkId);
        toast({
          title: "Session introuvable",
          description: "Impossible de reprendre ce parcours. Veuillez recommencer.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Welcome: Session trouvée:', {
        checkId: session.checkId,
        status: session.status,
        flowType: session.flowType,
        parcoursId: session.parcoursId,
      });

      // Vérifier que le parcoursId correspond
      if (parcoursId && session.parcoursId !== parcoursId) {
        console.error('❌ Welcome: ParcoursId mismatch!');
        toast({
          title: "Parcours incompatible",
          description: "Ce checkID appartient à un autre parcours.",
          variant: "destructive"
        });
        localStorage.removeItem('activeCheckId');
        return;
      }

      // Activer le checkID dans le contexte
      await setActiveCheckId(checkId);

      // Récupérer les infos utilisateur
      const userInfo = session.userInfo || {
        firstName: 'Utilisateur',
        lastName: '',
        phone: session.userId,
        type: session.flowType === 'checkin' ? 'CLIENT' : 'AGENT'
      };

      // Authentifier l'utilisateur
      login({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        phone: userInfo.phone,
        connectedAt: new Date().toISOString(),
        type: userInfo.type
      });

      // Charger le parcours si nécessaire
      if (parcoursId && !isLoaded) {
        await loadParcours(parcoursId);
      }

      // 🆕 Utiliser NavigationStateManager pour déterminer la route correcte
      const correctRoute = navigationStateManager.getCorrectRouteForSession(session);

      // Si on est déjà sur /welcome, rediriger vers la route correcte
      if (location.pathname === '/welcome') {
        const targetUrl = navigationStateManager.buildUrl(correctRoute, session.parcoursId, session.checkId);
        console.log('🔄 Welcome: Redirection vers:', targetUrl);
        navigate(targetUrl, { replace: true });
      }
    };

    restoreSessionFromUrl();
  }, [checkId, session, sessionLoading, parcoursId, isLoaded, location.pathname, setActiveCheckId, login, loadParcours, navigate, toast]);

  // � REFACTORISÉ: Chargement du parcours depuis l'URL (simplifié)
  // Le hook useParcoursDataUnified gère automatiquement le chargement
  useEffect(() => {
    if (!checkId && parcoursId && !isLoaded) {
      // Charger le parcours dans le contexte global pour compatibilité
      loadParcours(parcoursId).catch(error => {
        console.error('❌ Welcome: Erreur chargement parcours:', error);
      });
    }
  }, [checkId, parcoursId, isLoaded, loadParcours]);

  // ✅ NOUVEAU : Pré-sélection automatique du type d'utilisateur basé sur le parcours
  useEffect(() => {
    if (globalParcoursInfo?.type) {
      const parcoursType = globalParcoursInfo.type;
      console.log('🎯 Welcome: Type de parcours détecté:', parcoursType);

      // "Ménage" → AGENT, "Voyageur" → CLIENT
      if (parcoursType === 'Ménage') {
        setUserType('AGENT');
        console.log('✅ Welcome: Type utilisateur pré-sélectionné → AGENT (Ménage)');
      } else if (parcoursType === 'Voyageur') {
        setUserType('CLIENT');
        console.log('✅ Welcome: Type utilisateur pré-sélectionné → CLIENT (Voyageur)');
      }
    }
  }, [globalParcoursInfo?.type]);

  // ✅ NOUVEAU : Pré-remplissage du numéro de téléphone du dernier utilisateur
  useEffect(() => {
    const lastPhone = localStorage.getItem('lastUserPhone');
    if (lastPhone) {
      setPhoneNumber(lastPhone);
      console.log('✅ Welcome: Numéro de téléphone pré-rempli:', lastPhone);
    }
  }, []);

  // 🎯 PWA Installation Handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('✅ PWA: Installation disponible');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ PWA: App déjà installée');
      setShowInstallButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation non disponible",
        description: "L'installation PWA n'est pas supportée sur ce navigateur",
        variant: "destructive"
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA: Installation acceptée');
      toast({
        title: "Installation réussie !",
        description: "L'application a été ajoutée à votre écran d'accueil",
      });
      setShowInstallButton(false);
    } else {
      console.log('❌ PWA: Installation refusée');
    }
    
    setDeferredPrompt(null);
  };

  // 🎯 Fonction pour vérifier les sessions CheckID d'un utilisateur pour CE logement uniquement
  const checkForExistingSessions = async (userId: string, parcoursId?: string) => {
    console.log('🔍 Welcome: Vérification sessions pour:', { userId, parcoursId });

    try {
      // 1. Récupérer TOUTES les sessions utilisateur
      const allUserSessions = await checkSessionManager.getUserSessionsList(userId);

      if (!allUserSessions.hasAnySessions) {
        console.log('❌ Welcome: Aucune session trouvée pour cet utilisateur');
        return false;
      }

      console.log('📊 Welcome: Total sessions utilisateur:', allUserSessions.totalCount);

      // 🎯 FIX: Filtrer UNIQUEMENT les sessions de CE logement (parcoursId)
      let filteredSessions = allUserSessions.sessions;

      if (parcoursId) {
        // Filtrer les sessions qui ont le MÊME parcoursId
        filteredSessions = allUserSessions.sessions.filter(session =>
          session.parcoursId === parcoursId
        );

        console.log(`🏠 Welcome: Sessions filtrées pour parcoursId=${parcoursId}:`, filteredSessions.length);
      }

      // Si aucune session pour ce logement, ne rien afficher
      if (filteredSessions.length === 0) {
        console.log('❌ Welcome: Aucune session trouvée pour ce logement');
        return false;
      }

      // Créer une liste filtrée avec les mêmes statistiques
      const filteredUserSessions = {
        userId,
        sessions: filteredSessions,
        activeSessions: filteredSessions.filter(s => s.status === 'active' && !s.isFlowCompleted),
        completedSessions: filteredSessions.filter(s => s.isFlowCompleted),
        hasAnySessions: filteredSessions.length > 0,
        totalCount: filteredSessions.length,
        sessionsByParcours: { [parcoursId || 'unknown']: filteredSessions }
      };

      console.log('📋 Welcome: Affichage sessions de CE logement uniquement:', {
        total: filteredUserSessions.totalCount,
        active: filteredUserSessions.activeSessions.length,
        completed: filteredUserSessions.completedSessions.length
      });

      setUserSessionsList(filteredUserSessions);
      setShowUserSessionsList(true);
      return true;

    } catch (error) {
      console.error('❌ Welcome: Erreur vérification sessions:', error);
      return false;
    }
  };

  // 🎯 OPTIMISATION : Mémoisation des informations du parcours
  const parcoursInfo = globalParcoursInfo ? {
    type: globalParcoursInfo.type,
    logement: globalParcoursInfo.logement,
    totalPieces: globalRooms.length,
    pieces: globalRooms.map(room => room.nom || 'Pièce inconnue')
  } : null;

  // Gestion du stockage des utilisateurs
  const getUsersStorage = (): Record<string, StoredUser> => {
    try {
      const stored = localStorage.getItem('registeredUsers');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveUser = (phone: string, userData: StoredUser) => {
    const users = getUsersStorage();
    users[phone] = userData;
    localStorage.setItem('registeredUsers', JSON.stringify(users));
  };

  const checkUserExists = (phone: string): StoredUser | null => {
    const users = getUsersStorage();
    return users[phone] || null;
  };

  const handleInputChange = (field: keyof UserInfo, value: string | boolean) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Étape 1: Vérification du numéro
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || phoneNumber.length !== 9) {
      toast({
        title: "Téléphone requis",
        description: "Veuillez saisir un numéro à 9 chiffres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = checkUserExists(phoneNumber);
      if (user) {
        setExistingUser(user);
        
        // 🎯 Vérifier si des sessions CheckID existent pour cet utilisateur et ce parcours
        if (parcoursId) {
          const hasExistingSession = await checkForExistingSessions(phoneNumber, parcoursId);
          if (hasExistingSession) {
            // Le dialog sera affiché automatiquement
            setIsLoading(false);
            return;
          }
        }
      } else {
        setUserInfo(prev => ({ ...prev, phone: phoneNumber }));
      }
      
      setStep(2);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue, veuillez réessayer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2a: Connexion utilisateur existant
  const handleExistingUserLogin = async () => {
    if (!existingUser) return;

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 🎯 Vérifier si des sessions existent avant de se connecter
      if (parcoursId) {
        const hasExistingSession = await checkForExistingSessions(phoneNumber, parcoursId);
        if (hasExistingSession) {
          setIsLoading(false);
          return; // Le dialog sera géré séparément
        }
      }
      
      // Créer une nouvelle session si pas d'existante
      await createNewSessionAndLogin();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue, veuillez réessayer",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Étape 2b: Inscription nouvel utilisateur
  const handleNewUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInfo.firstName.trim() || !userInfo.lastName.trim()) {
      toast({
        title: "Informations incomplètes",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sauvegarder dans les utilisateurs enregistrés
      saveUser(phoneNumber, {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        registeredAt: new Date().toISOString()
      });
      
      // 🎯 Créer une nouvelle session CheckID et connecter l'utilisateur
      await createNewSessionAndLogin();
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue, veuillez réessayer",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // 🎯 OPTIMISATION : Création session CheckID avec contexte modulaire
  const createNewSessionAndLogin = async () => {
    const currentUser = existingUser || {
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
    };

    // ✅ Sauvegarder le numéro de téléphone pour la prochaine fois
    localStorage.setItem('lastUserPhone', phoneNumber);
    console.log('✅ Welcome: Numéro de téléphone sauvegardé:', phoneNumber);

    // � REFACTORISÉ: Utiliser directement parcoursId extrait de l'URL
    const effectiveParcoursId = parcoursId;

    console.log('🔍 Welcome: ParcoursId effectif:', {
      fromUrl: parcoursId,
      effective: effectiveParcoursId
    });

    if (!effectiveParcoursId || !globalParcoursInfo) {
      // Si pas de parcours, connexion normale
      login({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: phoneNumber,
        connectedAt: new Date().toISOString(),
        type: userType
      });

      // 🆕 REFACTORISÉ: Utiliser NavigationStateManager pour construire l'URL
      if (effectiveParcoursId && currentCheckId) {
        const targetUrl = navigationStateManager.buildUrl('/', effectiveParcoursId, currentCheckId);
        console.log('🔗 Welcome: Navigation reprise session avec params:', targetUrl);
        navigate(targetUrl);
      } else {
        navigate('/');
      }
      return;
    }

    try {
      // 🎯 Déterminer le flowType selon l'utilisateur et le parcours
      const flowType = userType === 'CLIENT' ? 'checkin' : 'checkout';

      // 🆕 Créer CheckID avec le contexte modulaire
      const newCheckId = await createNewCheckId(
        {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          phone: phoneNumber,
          type: userType
        },
        {
          id: effectiveParcoursId, // 🎯 FIX: Utiliser effectiveParcoursId au lieu de parcoursId
          name: globalParcoursInfo.name,
          type: globalParcoursInfo.type,
          logement: globalParcoursInfo.logement,
          takePicture: globalParcoursInfo.takePicture
        },
        flowType
      );

      console.log('✅ Welcome: Nouvelle session CheckID créée et activée:', newCheckId);

      // Connecter l'utilisateur
      login({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: phoneNumber,
        connectedAt: new Date().toISOString(),
        type: userType
      });

      // ❌ DÉSACTIVÉ: Notification "Nouveau ménage commencé"
      // toast({
      //   title: "Nouveau ménage commencé",
      //   description: `CheckID: ${newCheckId.split('_')[1]}`,
      // });

      // 🆕 REFACTORISÉ: Utiliser NavigationStateManager pour construire l'URL
      const targetUrl = navigationStateManager.buildUrl('/', effectiveParcoursId, newCheckId);
      console.log('🔗 Welcome: Navigation avec checkID dans URL:', targetUrl);
      navigate(targetUrl);
    } catch (error) {
      console.error('❌ Welcome: Erreur création session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 Handler pour reprendre une session CheckID existante

  // 🎯 Handler pour créer une nouvelle session CheckID
  const handleCreateNewSession = async () => {
    setShowUserSessionsList(false);
    setIsLoading(true);
    
    try {
      await createNewSessionAndLogin();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer une nouvelle session",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // 🎯 Handler pour reprendre une session spécifique depuis la liste
  const handleResumeSpecificSession = async (session: CheckSession) => {
    setShowUserSessionsList(false);
    setIsLoading(true);

    console.log('🔄 Welcome: Reprise session spécifique:', {
      checkId: session.checkId,
      parcoursId: session.parcoursId,
      flowType: session.flowType,
      status: session.status,
      hasUserInfo: !!session.userInfo
    });

    try {
      // 🎯 Activer cette session comme CheckID actuel
      await setActiveCheckId(session.checkId);
      console.log('✅ Welcome: CheckID activé:', session.checkId);

      // 🎯 CORRECTION: Récupérer les infos utilisateur depuis localStorage si pas dans la session
      let userInfoToUse = session.userInfo;
      let needsMigration = false;

      if (!userInfoToUse) {
        console.log('⚠️ Welcome: userInfo manquant dans la session, récupération depuis localStorage');
        needsMigration = true;

        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          userInfoToUse = {
            firstName: parsedUserInfo.firstName,
            lastName: parsedUserInfo.lastName,
            phone: parsedUserInfo.phone,
            type: parsedUserInfo.type
          };
          console.log('✅ Welcome: userInfo récupéré depuis localStorage');
        } else {
          // Fallback: utiliser les infos du formulaire actuel
          userInfoToUse = {
            firstName: existingUser?.firstName || userInfo.firstName || 'Utilisateur',
            lastName: existingUser?.lastName || userInfo.lastName || '',
            phone: phoneNumber || session.userId,
            type: userType
          };
          console.log('⚠️ Welcome: userInfo créé depuis le formulaire actuel');
        }
      }

      // 🔄 MIGRATION: Si la session n'avait pas de userInfo, la migrer
      if (needsMigration && userInfoToUse) {
        const parcoursInfo = session.parcoursInfo || {
          name: 'Parcours',
          type: session.flowType === 'checkin' ? 'Voyageur' : 'Ménage'
        };

        await checkSessionManager.migrateSession(session.checkId, userInfoToUse, parcoursInfo);
        console.log('✅ Welcome: Session migrée avec userInfo et parcoursInfo');
      }

      // Connecter l'utilisateur avec les infos de la session
      login({
        firstName: userInfoToUse.firstName,
        lastName: userInfoToUse.lastName,
        phone: userInfoToUse.phone,
        connectedAt: new Date().toISOString(),
        type: userInfoToUse.type
      });
      console.log('✅ Welcome: Utilisateur authentifié');

      // Charger le parcours de cette session
      await loadParcours(session.parcoursId);
      console.log('✅ Welcome: Parcours chargé');

      // Toast avec ou sans nom de parcours
      const parcoursName = session.parcoursInfo?.name || 'Parcours';
      toast({
        title: "Session reprise",
        description: `${parcoursName} - CheckID: ${session.checkId.split('_')[1]}`,
      });

      // � REFACTORISÉ: Utiliser NavigationStateManager pour déterminer la route correcte
      const correctRoute = navigationStateManager.getCorrectRouteForSession(session);
      const targetUrl = navigationStateManager.buildUrl(correctRoute, session.parcoursId, session.checkId);
      console.log('🚀 Welcome: Navigation vers:', targetUrl);

      // 🎯 IMPORTANT: Attendre un peu pour que le contexte UserContext soit mis à jour
      // Sinon ProtectedRoute verra encore isAuthenticated = false
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigation avec replace pour ne pas ajouter à l'historique
      navigate(targetUrl, { replace: true });
    } catch (error) {
      console.error('❌ Erreur reprise session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de reprendre cette session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setExistingUser(null);
    setShowUserSessionsList(false);
    setUserSessionsList(null);
    setUserInfo({
      firstName: '',
      lastName: '',
      phone: '',
      acceptTerms: false
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo CheckEasy en haut à gauche */}
      <div className="absolute top-4 left-4 z-10">
        <img 
          src="/lovable-uploads/8c04ee7e-d5f8-4b65-aed9-e6094b5cc244.png" 
          alt="CheckEasy"
          className="h-10 w-auto"
        />
      </div>

      {/* Bouton d'installation PWA en haut à droite */}
      {showInstallButton && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={handleInstallClick}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all bg-background/90 backdrop-blur-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Installer l'app</span>
          </Button>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-32">
        <div className="w-full max-w-sm mx-auto space-y-6">
          {/* Titre */}
          <div className="text-center space-y-3">
            <div>
              {step === 1 ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground">Bienvenue !</h1>
                  {parcoursLoading ? (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-muted-foreground text-sm">Chargement du parcours...</p>
                    </div>
                  ) : parcoursError ? (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-destructive text-sm">❌ {parcoursError}</p>
                      {!parcoursId && (
                        <p className="text-muted-foreground text-xs mt-1">
                          Aucun paramètre "parcours" dans l'URL
                        </p>
                      )}
                    </div>
                  ) : isLoaded && parcoursInfo ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="text-muted-foreground text-sm">
                          {parcoursInfo.type} · {parcoursInfo.logement}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          <span>{parcoursInfo.totalPieces} pièces</span>
                        </div>
                      </div>
                    </div>
                  ) : parcoursId ? (
                    <p className="text-muted-foreground text-sm mt-1">
                      Parcours ID: {parcoursId}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm mt-1">
                      Parcours par défaut
                    </p>
                  )}
                </>
              ) : existingUser ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground">Bonjour {existingUser.firstName} !</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Nous vous reconnaissons
                  </p>
                  {parcoursInfo && (
                    <div className="mt-2">
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="text-muted-foreground text-sm">
                          {parcoursInfo.type} · {parcoursInfo.logement}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-foreground">Bienvenue 👋</h1>
                  {parcoursInfo ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="text-muted-foreground text-sm">
                          {parcoursInfo.type} · {parcoursInfo.logement}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm mt-1">
                      Finalisons votre profil
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <Card className="p-6 shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            {/* 🎯 MASQUÉ: Affichage des informations du parcours 
            {parcoursInfo && step === 1 && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  Logement: {parcoursInfo.logement}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Type: {parcoursInfo.type}</div>
                  <div>Pièces: {parcoursInfo.totalPieces}</div>
                </div>
                {parcoursInfo.pieces && parcoursInfo.pieces.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-primary hover:underline">
                      Voir les pièces ({parcoursInfo.pieces.length})
                    </summary>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {parcoursInfo.pieces.join(' • ')}
                    </div>
                  </details>
                )}
              </div>
            )}
            */}
            
            {step === 1 ? (
              // Étape 1: Sélection du type et saisie du téléphone
              <div className="space-y-5">
                {/* 🎯 MASQUÉ: Sélecteur de type Voyageur/Ménage 
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Je suis :
                  </Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value: 'AGENT' | 'CLIENT') => setUserType(value)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="AGENT" id="agent" />
                      <label htmlFor="agent" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Ménage</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
                      <RadioGroupItem value="CLIENT" id="client" />
                      <label htmlFor="client" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Voyageur</span>
                      </label>
                    </div>
                  </RadioGroup>
                </div>
                */}
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                    Saisissez votre numéro pour commencer
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 flex items-center space-x-2">
                      <span className="text-lg">🇫🇷</span>
                      <span className="text-sm text-muted-foreground">+33</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="6 12 34 56 78"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 9) {
                          setPhoneNumber(value);
                        }
                      }}
                      maxLength={9}
                      className="pl-20 h-12 bg-background/60 border-border/40 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            ) : existingUser ? (
              // Étape 2a: Utilisateur existant
              <div className="space-y-5">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    Numéro: <span className="font-medium text-foreground">+33 {phoneNumber}</span>
                  </p>
                </div>

                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full h-10 border-secondary text-secondary hover:bg-secondary/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ce n'est pas moi
                </Button>
              </div>
            ) : (
              // Étape 2b: Nouvel utilisateur
              <div className="space-y-5">
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    Numéro: <span className="font-medium text-foreground">+33 {phoneNumber}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      Prénom
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Votre prénom"
                        value={userInfo.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="pl-10 h-12 bg-background/60 border-border/40 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      Nom
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Votre nom de famille"
                        value={userInfo.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="pl-10 h-12 bg-background/60 border-border/40 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full h-10 border-secondary text-secondary hover:bg-secondary/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* CTA collant en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm border-t border-border/20">
        <div className="w-full max-w-sm mx-auto">
          {step === 1 ? (
            <div className="space-y-3">
              <Button
                onClick={handlePhoneSubmit}
                disabled={isLoading || !phoneNumber.trim() || parcoursLoading}
                className="w-full h-14 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 text-primary-foreground font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {parcoursLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Chargement du parcours...</span>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Vérification...</span>
                  </div>
                ) : (
                  "Continuer"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground px-2">
                En continuant, vous acceptez les{" "}
                <span className="text-primary underline">CGU</span> et la{" "}
                <span className="text-primary underline">Politique de confidentialité</span>.
              </p>
            </div>
          ) : existingUser ? (
            <Button
              onClick={handleExistingUserLogin}
              disabled={isLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Connexion...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Me connecter
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleNewUserRegistration}
                disabled={isLoading || !userInfo.firstName.trim() || !userInfo.lastName.trim()}
                className="w-full h-14 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 text-primary-foreground font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Création...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    C'est parti !
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground px-2">
                En continuant, vous acceptez les{" "}
                <span className="text-primary underline">CGU</span> et la{" "}
                <span className="text-primary underline">Politique de confidentialité</span>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 Dialog liste complète des sessions utilisateur */}
      {userSessionsList && (
        <UserSessionsListDialog
          isOpen={showUserSessionsList}
          userSessionsList={userSessionsList}
          userName={existingUser?.firstName || userInfo.firstName || 'Utilisateur'}
          onResumeSession={handleResumeSpecificSession}
          onCreateNewSession={handleCreateNewSession}
          onClose={() => setShowUserSessionsList(false)}
        />
      )}
    </div>
  );
};

export default Welcome;
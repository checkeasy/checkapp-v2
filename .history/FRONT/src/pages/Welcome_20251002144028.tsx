import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const { login } = useUser();
  const { createNewCheckId, setActiveCheckId } = useActiveCheckId();
  
  // 🎯 OPTIMISATION : Utilisation uniquement du contexte global
  const { loadParcours, loading: parcoursLoading, error: parcoursError } = useParcoursActions();
  const { info: globalParcoursInfo, rooms: globalRooms, isLoaded } = useParcoursData();
  const [parcoursId, setParcoursId] = useState<string | null>(null);
  
  // 🎯 OPTIMISATION : Ref pour éviter les chargements multiples
  const hasLoadedParcours = useRef(false);
  const currentParcoursId = useRef<string | null>(null);

  // Fonction pour récupérer les paramètres d'URL
  const getUrlParameter = (name: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  // 🎯 OPTIMISATION : Chargement unique au montage
  useEffect(() => {
    const loadParcoursFromUrl = async () => {
      const urlParcoursId = getUrlParameter('parcours');
      console.log('🔍 Welcome: ID Parcours depuis URL:', urlParcoursId);

      if (!urlParcoursId) {
        console.log('⚠️ Welcome: Aucun parcours dans l\'URL');
        return;
      }

      // 🎯 Éviter les chargements redondants
      if (hasLoadedParcours.current && currentParcoursId.current === urlParcoursId) {
        console.log('⏭️ Welcome: Parcours déjà chargé, skip');
        return;
      }

      setParcoursId(urlParcoursId);
      currentParcoursId.current = urlParcoursId;

      try {
        hasLoadedParcours.current = true;
        await loadParcours(urlParcoursId);
        console.log('✅ Welcome: Parcours chargé dans le gestionnaire global');
      } catch (error) {
        console.error('❌ Welcome: Erreur lors du chargement:', error);
        hasLoadedParcours.current = false; // Reset pour permettre un retry
        currentParcoursId.current = null;
      }
    };

    // 🎯 Chargement unique, pas de dépendances pour éviter les re-runs
    loadParcoursFromUrl();
  }, []); // Dépendances vides intentionnellement

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

  // 🎯 Fonction pour vérifier TOUTES les sessions CheckID d'un utilisateur
  const checkForExistingSessions = async (userId: string, parcoursId?: string) => {
    console.log('🔍 Welcome: Vérification de TOUTES les sessions pour:', { userId, parcoursId });
    
    try {
      // 1. Récupérer la liste complète des sessions utilisateur
      const userSessions = await checkSessionManager.getUserSessionsList(userId);
      
      if (!userSessions.hasAnySessions) {
        console.log('❌ Welcome: Aucune session trouvée pour cet utilisateur');
        return false;
      }

      console.log('📊 Welcome: Sessions trouvées:', {
        total: userSessions.totalCount,
        active: userSessions.activeSessions.length,
        completed: userSessions.completedSessions.length,
        parcours: Object.keys(userSessions.sessionsByParcours).length
      });

      // 🎯 NOUVEAU: Toujours afficher la liste complète des sessions
      console.log('📋 Welcome: Affichage liste complète des sessions pour sélection');
      setUserSessionsList(userSessions);
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

    if (!parcoursId || !globalParcoursInfo) {
      // Si pas de parcours, connexion normale
      login({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: phoneNumber,
        connectedAt: new Date().toISOString(),
        type: userType
      });
      navigate('/');
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
          id: parcoursId,
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

      toast({
        title: "Nouveau ménage commencé",
        description: `CheckID: ${newCheckId.split('_')[1]}`,
      });

      navigate('/');
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
      status: session.status
    });

    try {
      // 🎯 Activer cette session comme CheckID actuel
      await setActiveCheckId(session.checkId);
      
      // Connecter l'utilisateur avec les infos de la session
      login({
        firstName: session.userInfo.firstName,
        lastName: session.userInfo.lastName,
        phone: session.userInfo.phone,
        connectedAt: new Date().toISOString(),
        type: session.userInfo.type
      });

      // Charger le parcours de cette session
      await loadParcours(session.parcoursId);

      toast({
        title: "Session reprise",
        description: `${session.parcoursInfo.name} - CheckID: ${session.checkId.split('_')[1]}`,
      });

      // 🎯 Navigation avec CheckID préservé
      navigate(`/?parcours=${session.parcoursId}&checkid=${session.checkId}`);
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
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-green-500" />
                          <span>Données chargées</span>
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
            {/* Affichage des informations du parcours si chargé */}
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
            
            {step === 1 ? (
              // Étape 1: Sélection du type et saisie du téléphone
              <div className="space-y-5">
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
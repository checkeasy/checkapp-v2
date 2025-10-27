import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExitQuestion, ExitQuestionResponse } from '@/types/exitQuestions';
import { ExitQuestionItem } from '@/components/ExitQuestionItem';
import { interactionTracker } from '@/services/interactionTracker';
import { useActiveCheckId } from '@/contexts/ActiveCheckIdContext';
import { useUser } from '@/contexts/UserContext';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileSheet } from '@/components/ProfileSheet';
// 🆕 Nouveaux hooks unifiés
import { useSessionData } from '@/hooks/useSessionData';
import { useParcoursDataUnified } from '@/hooks/useParcoursDataUnified';
import { useNavigateWithParams } from '@/hooks/useNavigateWithParams';
import { navigationStateManager } from '@/services/navigationStateManager';

interface ExitQuestionsPageProps {
  questions: ExitQuestion[];
}

export const ExitQuestionsPage: React.FC<ExitQuestionsPageProps> = ({ questions }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();
  const { currentCheckId } = useActiveCheckId();
  const { user, logout } = useUser();
  const [responses, setResponses] = useState<Record<string, ExitQuestionResponse>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  // 🆕 Extraction des paramètres URL
  const urlParams = navigationStateManager.extractUrlParams(location.search);
  const parcoursIdFromUrl = urlParams.parcoursId;
  const checkIdFromUrl = urlParams.checkId;

  // 🆕 Utilisation des nouveaux hooks unifiés
  const { session, loading: sessionLoading } = useSessionData(checkIdFromUrl);
  const { parcours: parcoursUnified, loading: parcoursUnifiedLoading } = useParcoursDataUnified(parcoursIdFromUrl, 'checkout');

  // Charger les réponses sauvegardées au montage
  useEffect(() => {
    const loadSavedResponses = async () => {
      try {
        const savedResponses = await interactionTracker.getExitQuestionResponses();
        console.log('📥 ExitQuestionsPage: Réponses chargées:', savedResponses);
        setResponses(savedResponses);
      } catch (error) {
        console.error('❌ ExitQuestionsPage: Erreur chargement réponses:', error);
      }
    };

    loadSavedResponses();
  }, []);

  // Gérer le changement d'une réponse
  const handleResponseChange = async (response: ExitQuestionResponse) => {
    console.log('📝 ExitQuestionsPage: Réponse modifiée:', response);
    
    // Mettre à jour le state local
    setResponses(prev => ({
      ...prev,
      [response.questionID]: response
    }));

    // Sauvegarder dans le localStorage
    try {
      await interactionTracker.trackExitQuestionResponse(response);
      console.log('✅ ExitQuestionsPage: Réponse sauvegardée');
    } catch (error) {
      console.error('❌ ExitQuestionsPage: Erreur sauvegarde réponse:', error);
      toast.error('Erreur lors de la sauvegarde de la réponse');
    }
  };

  // Helper pour vérifier si une photo est requise
  const isPhotoRequired = (imageRequired: string): boolean => {
    const normalized = imageRequired?.toLowerCase().trim();
    return normalized === 'yes' || normalized === 'oui' || normalized === 'true';
  };

  // Vérifier si toutes les questions obligatoires sont répondues
  const areAllQuestionsAnswered = (): boolean => {
    return questions.every(question => {
      const response = responses[question.questionID];

      if (!response) return false;

      // 1. Pour les questions de type "boolean" : réponse OUI/NON OBLIGATOIRE
      if (question.questionType === 'boolean') {
        if (response.checked === undefined) return false;
      }

      // 2. Pour les questions de type "text" : réponse texte OPTIONNELLE
      // (pas de validation sur le texte)

      // 3. Pour les questions de type "image" : photo OBLIGATOIRE
      if (question.questionType === 'image') {
        if (!response.hasImage) return false;
      }

      // 4. Pour les questions avec imageRequired : photo OBLIGATOIRE
      if (isPhotoRequired(question.imageRequired)) {
        if (!response.hasImage) return false;
      }

      return true;
    });
  };

  // Calculer le pourcentage de progression
  const getProgressPercentage = (): number => {
    const answeredCount = questions.filter(question => {
      const response = responses[question.questionID];
      if (!response) return false;

      // Même logique que areAllQuestionsAnswered() pour chaque question
      // 1. Boolean : checked doit être défini
      if (question.questionType === 'boolean') {
        if (response.checked === undefined) return false;
      }

      // 2. Text : toujours considéré comme répondu (optionnel)
      if (question.questionType === 'text') {
        return true; // Pas de validation sur le texte
      }

      // 3. Image : photo obligatoire
      if (question.questionType === 'image') {
        if (!response.hasImage) return false;
      }

      // 4. Photo requise : photo obligatoire
      if (isPhotoRequired(question.imageRequired)) {
        if (!response.hasImage) return false;
      }

      return true;
    }).length;

    return Math.round((answeredCount / questions.length) * 100);
  };

  // Soumettre les réponses et terminer
  const handleSubmit = async () => {
    if (!areAllQuestionsAnswered()) {
      toast.error('Veuillez répondre à toutes les questions avant de continuer');
      return;
    }

    setIsSubmitting(true);

    try {
      // Marquer les questions de sortie comme complétées
      await interactionTracker.markExitQuestionsCompleted();

      console.log('✅ ExitQuestionsPage: Questions de sortie complétées');

      // 🎯 NOUVEAU: Envoyer le webhook avec toutes les données (checkin + checkout + exit questions)
      console.log('📤 ExitQuestionsPage: Envoi du webhook unifié...');

      // Afficher un toast de chargement
      const loadingToast = toast.loading('📤 Envoi du rapport en cours...');

      try {
        const { debugService } = await import('@/services/debugService');
        const webhookResult = await debugService.sendUnifiedWebhook();

        if (webhookResult.success) {
          console.log('✅ ExitQuestionsPage: Webhook envoyé avec succès');

          // 🏁 Marquer la session comme terminée et sauvegarder le rapportID
          if (currentCheckId) {
            const { checkSessionManager } = await import('@/services/checkSessionManager');
            await checkSessionManager.terminateCheckSession(currentCheckId, webhookResult.rapportID);
            console.log('🏁 Session terminée avec rapportID:', webhookResult.rapportID);

            // ⏱️ Attendre un peu pour s'assurer que tout est bien sauvegardé
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          toast.dismiss(loadingToast);
          toast.success('✅ Rapport envoyé avec succès !');

          // ⏱️ Attendre un peu avant de naviguer pour que l'utilisateur voie le message
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('❌ ExitQuestionsPage: Erreur webhook:', webhookResult.error);
          toast.dismiss(loadingToast);
          toast.warning('Questions enregistrées, mais erreur lors de l\'envoi du rapport');
        }
      } catch (webhookError) {
        console.error('❌ ExitQuestionsPage: Erreur envoi webhook:', webhookError);
        toast.dismiss(loadingToast);
        toast.warning('Questions enregistrées, mais erreur lors de l\'envoi du rapport');
      }

      // Retourner à la page d'accueil du checkout
      navigateWithParams('/checkout-home');
    } catch (error) {
      console.error('❌ ExitQuestionsPage: Erreur soumission:', error);
      toast.error('Erreur lors de la soumission des réponses');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retour à la page d'accueil
  const handleGoBack = () => {
    navigateWithParams('/checkout-home');
  };

  const progressPercentage = getProgressPercentage();
  const allAnswered = areAllQuestionsAnswered();

  return (
    <div className="min-h-screen bg-gradient-subtle max-w-md mx-auto relative">
      {/* Header avec fil d'Ariane - Style CheckOut exact */}
      <div className="sticky top-0 z-50 bg-glass-bg/95 backdrop-blur-xl border-b border-white/20 shadow-elegant">
        <div className="flex items-center justify-between py-2 px-4 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <Home className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center justify-center gap-2 px-4">
            <h1 className="text-base font-semibold text-foreground">
              🎯 Questions de sortie
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20 text-primary animate-scale-in">
              {questions.filter(q => responses[q.questionID]).length}/{questions.length}
            </Badge>
            <div className="transition-transform duration-300 hover:scale-105">
              <UserAvatar user={user} size="sm" onClick={() => setIsProfileSheetOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal - Style CheckOut exact */}
      <div className="p-6 space-y-6 py-2 pb-32">
        {/* Message d'introduction */}
        <Card variant="glass" className="bg-white/70">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Dernières vérifications avant de terminer le checkout
            </p>
          </CardContent>
        </Card>

        {/* Liste des questions */}
        {questions.map((question, index) => (
          <Card
            key={question.questionID}
            variant="glass"
            className="bg-white/80 hover:shadow-floating hover:bg-white/90"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <ExitQuestionItem
                    question={question}
                    response={responses[question.questionID]}
                    onChange={handleResponseChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Message de progression */}
        {!allAnswered && (
          <Card variant="outline" className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 text-center">
                ⚠️ Veuillez répondre à toutes les questions pour continuer
              </p>
            </CardContent>
          </Card>
        )}

        {/* Message de succès */}
        {allAnswered && (
          <Card variant="outline" className="bg-green-50 border-green-200 animate-slide-up">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  Toutes les questions sont répondues !
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bouton de validation fixe en bas - Style CheckOut exact */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/95 backdrop-blur-xl border-t border-white/20 shadow-elegant p-4">
        <Button
          variant="cta"
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
          className={`${!allAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Terminer le checkout</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>

      {/* Profile Sheet */}
      <ProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        onLogout={() => {
          logout();
          setIsProfileSheetOpen(false);
        }}
      />
    </div>
  );
};


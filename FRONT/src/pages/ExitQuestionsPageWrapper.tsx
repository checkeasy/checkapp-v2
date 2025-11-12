import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExitQuestionsPage } from './ExitQuestionsPage';
import { ExitQuestion } from '@/types/exitQuestions';
import { useGlobalParcours } from '@/contexts/GlobalParcoursContext';

/**
 * Wrapper pour ExitQuestionsPage qui récupère les questions depuis le parcours
 */
export const ExitQuestionsPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { currentParcours } = useGlobalParcours();

  // Récupérer les questions de sortie depuis le parcours
  const questions: ExitQuestion[] = React.useMemo(() => {
    if (!currentParcours?.rawData?.questionSortie) {
      console.warn('⚠️ ExitQuestionsPageWrapper: Pas de questions de sortie dans le parcours');
      return [];
    }

    const rawQuestions = currentParcours.rawData.questionSortie;
    console.log('📋 ExitQuestionsPageWrapper: Questions de sortie trouvées:', rawQuestions);

    // Mapper les questions de l'API vers le format attendu
    return rawQuestions.map((q: any) => ({
      questionID: q.questionID,
      questionContent: q.questionContent,
      questionType: q.questionType as 'boolean' | 'image' | 'text',
      imageRequired: q.imageRequired as 'yes' | 'no'
    }));
  }, [currentParcours]);

  // Si pas de questions, rediriger vers checkout-home
  React.useEffect(() => {
    if (questions.length === 0) {
      console.warn('⚠️ ExitQuestionsPageWrapper: Aucune question, redirection vers checkout-home');
      navigate('/checkout-home');
    }
  }, [questions, navigate]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chargement des questions...</p>
        </div>
      </div>
    );
  }

  return <ExitQuestionsPage questions={questions} />;
};


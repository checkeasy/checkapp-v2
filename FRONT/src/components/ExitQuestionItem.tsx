import React, { useState } from 'react';
import { Camera, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExitQuestion, ExitQuestionResponse } from '@/types/exitQuestions';
import { interactionTracker } from '@/services/interactionTracker';

interface ExitQuestionItemProps {
  question: ExitQuestion;
  response?: ExitQuestionResponse;
  onChange: (response: ExitQuestionResponse) => void;
}

export const ExitQuestionItem: React.FC<ExitQuestionItemProps> = ({
  question,
  response,
  onChange
}) => {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Debug: Log de la question
  React.useEffect(() => {
    console.log('🔍 ExitQuestionItem: Question reçue:', {
      questionID: question.questionID,
      questionType: question.questionType,
      questionContent: question.questionContent,
      imageRequired: question.imageRequired
    });
  }, [question]);

  // Gérer le changement de checkbox (pour type "boolean")
  const handleCheckboxChange = (checked: boolean) => {
    const newResponse: ExitQuestionResponse = {
      questionID: question.questionID,
      questionContent: question.questionContent,
      questionType: question.questionType,
      checked,
      hasImage: response?.hasImage || false,
      imageBase64: response?.imageBase64,
      imageUrl: response?.imageUrl,
      imagePhotoId: response?.imagePhotoId,
      timestamp: response?.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onChange(newResponse);
  };

  // Gérer le changement de texte (pour type "text")
  const handleTextChange = (text: string) => {
    const newResponse: ExitQuestionResponse = {
      questionID: question.questionID,
      questionContent: question.questionContent,
      questionType: question.questionType,
      textResponse: text,
      hasImage: response?.hasImage || false,
      imageBase64: response?.imageBase64,
      imageUrl: response?.imageUrl,
      imagePhotoId: response?.imagePhotoId,
      timestamp: response?.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onChange(newResponse);
  };

  // Gérer la sélection de fichier (ouvre le sélecteur)
  const handlePhotoCapture = () => {
    console.log('📸 ExitQuestionItem: Ouverture sélecteur fichier pour question:', question.questionID);
    fileInputRef.current?.click();
  };

  // Gérer le fichier sélectionné et le convertir en base64
  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ Aucun fichier sélectionné');
      return;
    }

    console.log('📸 ExitQuestionItem: Fichier sélectionné:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setIsCapturingPhoto(true);

    try {
      // Convertir le File en base64 (même logique que ReportProblemModal)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Extraire le base64 pur (sans le préfixe data:image/...)
          const base64Pure = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Pure);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const photoId = interactionTracker.generatePhotoId();
      const imgUrl = URL.createObjectURL(file); // Pour affichage local

      console.log('✅ Image convertie en base64:', {
        photoId,
        size: base64.length,
        preview: base64.substring(0, 50) + '...'
      });

      const newResponse: ExitQuestionResponse = {
        questionID: question.questionID,
        questionContent: question.questionContent,
        questionType: question.questionType,
        checked: response?.checked,
        textResponse: response?.textResponse,
        hasImage: true,
        imageBase64: base64,
        imageUrl: imgUrl,
        imagePhotoId: photoId,
        timestamp: response?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onChange(newResponse);
    } catch (error) {
      console.error('❌ ExitQuestionItem: Erreur conversion base64:', error);
    } finally {
      setIsCapturingPhoto(false);
      // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper pour vérifier si une photo est requise (supporte "yes", "oui", "true")
  const isPhotoRequired = (imageRequired: string): boolean => {
    const normalized = imageRequired?.toLowerCase().trim();
    return normalized === 'yes' || normalized === 'oui' || normalized === 'true';
  };

  // Rendu selon le type de question
  const renderQuestionInput = () => {
    console.log('🎨 ExitQuestionItem: Rendu question type:', question.questionType);

    switch (question.questionType) {
      case 'boolean':
        return (
          <div className="space-y-2">
            {/* Texte de la question */}
            <p className="text-sm font-medium text-foreground">
              {question.questionContent}
            </p>

            {/* Boutons Oui / Non */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleCheckboxChange(true)}
                variant={response?.checked === true ? 'default' : 'outline'}
                className={`flex-1 h-9 text-sm font-medium transition-all duration-300 ${
                  response?.checked === true
                    ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'hover:bg-green-50 hover:border-green-300 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {response?.checked === true && <Check className="w-3 h-3 mr-1" />}
                Oui
              </Button>
              <Button
                onClick={() => handleCheckboxChange(false)}
                variant={response?.checked === false ? 'default' : 'outline'}
                className={`flex-1 h-9 text-sm font-medium transition-all duration-300 ${
                  response?.checked === false
                    ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'hover:bg-red-50 hover:border-red-300 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {response?.checked === false && <Check className="w-3 h-3 mr-1" />}
                Non
              </Button>
            </div>

            {/* Bouton photo si requis */}
            {isPhotoRequired(question.imageRequired) && (
              <div className="space-y-2">
                <Button
                  onClick={handlePhotoCapture}
                  disabled={isCapturingPhoto}
                  variant={response?.hasImage ? 'outline' : 'default'}
                  className="w-full h-9 gap-2 text-sm font-medium"
                >
                  <Camera className="w-3 h-3" />
                  {isCapturingPhoto ? 'Traitement...' : (response?.hasImage ? '✓ Photo prise - Changer' : 'Prendre une photo')}
                </Button>

                {/* Aperçu de la photo */}
                {response?.hasImage && response.imageUrl && (
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-card">
                    <img
                      src={response.imageUrl}
                      alt="Photo capturée"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <Check className="w-3 h-3" />
                      Photo enregistrée
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            {/* Texte de la question */}
            <p className="text-sm font-medium text-foreground">
              {question.questionContent}
            </p>

            {/* Zone de texte avec bouton image optionnel */}
            <div className="space-y-1">
              <Textarea
                value={response?.textResponse || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Saisissez votre réponse..."
                className="min-h-[80px] resize-none text-sm"
              />

              {/* Bouton image discret et optionnel (si image non requise) */}
              {!isPhotoRequired(question.imageRequired) && (
                <div className="flex justify-end">
                  <Button
                    onClick={handlePhotoCapture}
                    disabled={isCapturingPhoto}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1"
                    title="Ajouter une image (optionnel)"
                  >
                    <ImageIcon className="w-3 h-3" />
                    {isCapturingPhoto ? 'Traitement...' : (response?.hasImage ? '✓ Image' : 'Ajouter image')}
                  </Button>
                </div>
              )}
            </div>

            {/* Aperçu de la photo optionnelle */}
            {!isPhotoRequired(question.imageRequired) && response?.hasImage && response.imageUrl && (
              <div className="relative rounded-lg overflow-hidden border border-muted-foreground/30 shadow-sm">
                <img
                  src={response.imageUrl}
                  alt="Image ajoutée"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-1 right-1 bg-primary/80 text-white rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-md">
                  <Check className="w-2.5 h-2.5" />
                  Image
                </div>
              </div>
            )}

            {/* Bouton photo si requis */}
            {isPhotoRequired(question.imageRequired) && (
              <div className="space-y-2">
                <Button
                  onClick={handlePhotoCapture}
                  disabled={isCapturingPhoto}
                  variant={response?.hasImage ? 'outline' : 'default'}
                  className="w-full h-9 gap-2 text-sm font-medium"
                >
                  <Camera className="w-3 h-3" />
                  {isCapturingPhoto ? 'Traitement...' : (response?.hasImage ? '✓ Photo prise - Changer' : 'Prendre une photo')}
                </Button>

                {/* Aperçu de la photo */}
                {response?.hasImage && response.imageUrl && (
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-card">
                    <img
                      src={response.imageUrl}
                      alt="Photo capturée"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <Check className="w-3 h-3" />
                      Photo enregistrée
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {/* Texte de la question */}
            <p className="text-sm font-medium text-foreground">
              {question.questionContent}
            </p>

            {/* Bouton photo */}
            <div className="space-y-2">
              <Button
                onClick={handlePhotoCapture}
                disabled={isCapturingPhoto}
                variant={response?.hasImage ? 'outline' : 'default'}
                className="w-full h-9 gap-2 text-sm font-medium"
              >
                <Camera className="w-3 h-3" />
                {isCapturingPhoto ? 'Traitement...' : (response?.hasImage ? '✓ Photo prise - Changer' : 'Prendre une photo')}
              </Button>

              {/* Aperçu de la photo */}
              {response?.hasImage && response.imageUrl && (
                <div className="relative rounded-lg overflow-hidden border-2 border-green-500 shadow-card">
                  <img
                    src={response.imageUrl}
                    alt="Photo capturée"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Check className="w-2.5 h-2.5" />
                    Photo enregistrée
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Input file caché pour la sélection d'image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Sur mobile, ouvre la caméra directement
        onChange={handleFileSelected}
        className="hidden"
      />

      {renderQuestionInput()}
    </div>
  );
};


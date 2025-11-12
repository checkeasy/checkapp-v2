/**
 * 🧪 Utilitaires de test pour la détection de flou
 * Permet de tester et calibrer le système de détection
 */

import { environment } from '@/config/environment';

/**
 * Crée un canvas de test avec un motif net
 */
export function createSharpTestCanvas(width: number = 800, height: number = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fond blanc
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Grille nette (haute fréquence = net)
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Texte net
  ctx.fillStyle = 'black';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('SHARP', 50, 100);

  return canvas;
}

/**
 * Crée un canvas de test avec un motif flou
 */
export function createBlurryTestCanvas(width: number = 800, height: number = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fond blanc
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Appliquer un flou gaussien en utilisant filter
  ctx.filter = 'blur(8px)';

  // Grille floue (basse fréquence = flou)
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Texte flou
  ctx.fillStyle = 'black';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('BLURRY', 50, 100);

  ctx.filter = 'none';

  return canvas;
}

/**
 * Crée un canvas avec un dégradé (très flou)
 */
export function createGradientTestCanvas(width: number = 800, height: number = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dégradé lisse (très peu de variations = très flou)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

/**
 * Teste le système de détection de flou
 */
export async function runBlurDetectionTests(): Promise<void> {
  console.log('🧪 Démarrage des tests de détection de flou...\n');

  // Importer la fonction detectBlur
  const { detectBlur } = await import('@/hooks/usePhotoCapture');

  // Test 1: Image nette
  console.log('📊 Test 1: Image nette');
  const sharpCanvas = createSharpTestCanvas();
  const sharpResult = detectBlur(sharpCanvas);
  console.log('Résultat:', sharpResult);
  console.log('✅ Attendu: isBlurry = false\n');

  // Test 2: Image floue
  console.log('📊 Test 2: Image floue');
  const blurryCanvas = createBlurryTestCanvas();
  const blurryResult = detectBlur(blurryCanvas);
  console.log('Résultat:', blurryResult);
  console.log('✅ Attendu: isBlurry = true\n');

  // Test 3: Dégradé (très flou)
  console.log('📊 Test 3: Dégradé (très flou)');
  const gradientCanvas = createGradientTestCanvas();
  const gradientResult = detectBlur(gradientCanvas);
  console.log('Résultat:', gradientResult);
  console.log('✅ Attendu: isBlurry = true\n');

  // Résumé
  console.log('📈 Résumé des tests:');
  console.log(`Configuration actuelle:`);
  console.log(`  - BLUR_THRESHOLD: ${environment.BLUR_THRESHOLD}`);
  console.log(`  - BLUR_MIN_VARIANCE: ${environment.BLUR_MIN_VARIANCE}`);
  console.log(`  - BLUR_ANALYSIS_STEP: ${environment.BLUR_ANALYSIS_STEP}`);
  console.log(`  - BLUR_EDGE_MARGIN: ${environment.BLUR_EDGE_MARGIN}`);
  console.log(`\nScores obtenus:`);
  console.log(`  - Image nette: ${sharpResult.blurScore.toFixed(2)}`);
  console.log(`  - Image floue: ${blurryResult.blurScore.toFixed(2)}`);
  console.log(`  - Dégradé: ${gradientResult.blurScore.toFixed(2)}`);
}

/**
 * Affiche les recommandations de calibrage
 */
export function printCalibrationRecommendations(
  sharpScore: number,
  blurryScore: number
): void {
  console.log('🎯 Recommandations de calibrage:');
  console.log(`\nScores observés:`);
  console.log(`  - Images nettes: ~${sharpScore.toFixed(0)}`);
  console.log(`  - Images floues: ~${blurryScore.toFixed(0)}`);

  const midpoint = (sharpScore + blurryScore) / 2;
  console.log(`\nSeuil recommandé: ${midpoint.toFixed(0)}`);
  console.log(`Définir: VITE_BLUR_THRESHOLD=${Math.round(midpoint)}`);
}


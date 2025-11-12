/**
 * 🧪 Tests de compatibilité cross-browser pour la caméra
 * Vérifie que toutes les API nécessaires sont disponibles
 */

import { 
  detectBrowser, 
  isSecureContext, 
  polyfillMediaDevices, 
  polyfillCanvasToBlob 
} from './cameraPolyfills';

export interface CompatibilityTestResult {
  passed: boolean;
  testName: string;
  message: string;
  critical: boolean;
}

export interface CompatibilityReport {
  allPassed: boolean;
  criticalPassed: boolean;
  browser: ReturnType<typeof detectBrowser>;
  results: CompatibilityTestResult[];
  timestamp: string;
}

/**
 * 🧪 Teste la disponibilité de navigator.mediaDevices
 */
function testMediaDevicesAPI(): CompatibilityTestResult {
  const passed = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  
  return {
    passed,
    testName: 'MediaDevices API',
    message: passed 
      ? '✅ navigator.mediaDevices.getUserMedia disponible'
      : '❌ navigator.mediaDevices.getUserMedia non disponible (polyfill requis)',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de enumerateDevices
 */
function testEnumerateDevices(): CompatibilityTestResult {
  const passed = !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
  
  return {
    passed,
    testName: 'Enumerate Devices',
    message: passed
      ? '✅ navigator.mediaDevices.enumerateDevices disponible'
      : '⚠️ navigator.mediaDevices.enumerateDevices non disponible (changement de caméra limité)',
    critical: false
  };
}

/**
 * 🧪 Teste le contexte sécurisé (HTTPS)
 */
function testSecureContext(): CompatibilityTestResult {
  const passed = isSecureContext();
  
  return {
    passed,
    testName: 'Secure Context (HTTPS)',
    message: passed
      ? '✅ Contexte sécurisé (HTTPS ou localhost)'
      : '❌ Contexte non sécurisé - HTTPS requis pour accéder à la caméra',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de canvas.toBlob
 */
function testCanvasToBlob(): CompatibilityTestResult {
  const canvas = document.createElement('canvas');
  const passed = typeof canvas.toBlob === 'function';
  
  return {
    passed,
    testName: 'Canvas toBlob',
    message: passed
      ? '✅ HTMLCanvasElement.toBlob disponible'
      : '⚠️ HTMLCanvasElement.toBlob non disponible (polyfill appliqué)',
    critical: false
  };
}

/**
 * 🧪 Teste la disponibilité de FileReader
 */
function testFileReader(): CompatibilityTestResult {
  const passed = typeof FileReader !== 'undefined';
  
  return {
    passed,
    testName: 'FileReader API',
    message: passed
      ? '✅ FileReader disponible'
      : '❌ FileReader non disponible',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de Blob
 */
function testBlob(): CompatibilityTestResult {
  const passed = typeof Blob !== 'undefined';
  
  return {
    passed,
    testName: 'Blob API',
    message: passed
      ? '✅ Blob disponible'
      : '❌ Blob non disponible',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de Promise
 */
function testPromise(): CompatibilityTestResult {
  const passed = typeof Promise !== 'undefined';
  
  return {
    passed,
    testName: 'Promise API',
    message: passed
      ? '✅ Promise disponible'
      : '❌ Promise non disponible (navigateur trop ancien)',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de async/await
 */
function testAsyncAwait(): CompatibilityTestResult {
  let passed = false;
  
  try {
    // Tester si async/await est supporté
    eval('(async () => {})');
    passed = true;
  } catch (e) {
    passed = false;
  }
  
  return {
    passed,
    testName: 'Async/Await',
    message: passed
      ? '✅ Async/Await supporté'
      : '❌ Async/Await non supporté (navigateur trop ancien)',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de Map
 */
function testMap(): CompatibilityTestResult {
  const passed = typeof Map !== 'undefined';
  
  return {
    passed,
    testName: 'Map API',
    message: passed
      ? '✅ Map disponible'
      : '❌ Map non disponible',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de Set
 */
function testSet(): CompatibilityTestResult {
  const passed = typeof Set !== 'undefined';
  
  return {
    passed,
    testName: 'Set API',
    message: passed
      ? '✅ Set disponible'
      : '❌ Set non disponible',
    critical: true
  };
}

/**
 * 🧪 Teste la disponibilité de localStorage
 */
function testLocalStorage(): CompatibilityTestResult {
  let passed = false;
  
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    passed = true;
  } catch (e) {
    passed = false;
  }
  
  return {
    passed,
    testName: 'LocalStorage',
    message: passed
      ? '✅ LocalStorage disponible'
      : '⚠️ LocalStorage non disponible (mode privé ou bloqué)',
    critical: false
  };
}

/**
 * 🧪 Teste la disponibilité de IndexedDB
 */
function testIndexedDB(): CompatibilityTestResult {
  const passed = typeof indexedDB !== 'undefined';
  
  return {
    passed,
    testName: 'IndexedDB',
    message: passed
      ? '✅ IndexedDB disponible'
      : '⚠️ IndexedDB non disponible',
    critical: false
  };
}

/**
 * 🧪 Teste les événements tactiles
 */
function testTouchEvents(): CompatibilityTestResult {
  const passed = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return {
    passed,
    testName: 'Touch Events',
    message: passed
      ? '✅ Événements tactiles supportés'
      : 'ℹ️ Événements tactiles non supportés (appareil non tactile)',
    critical: false
  };
}

/**
 * 🧪 Exécute tous les tests de compatibilité
 */
export async function runCompatibilityTests(): Promise<CompatibilityReport> {
  console.log('🧪 Démarrage des tests de compatibilité...');
  
  // Appliquer les polyfills avant les tests
  polyfillMediaDevices();
  polyfillCanvasToBlob();
  
  const browser = detectBrowser();
  
  const results: CompatibilityTestResult[] = [
    testSecureContext(),
    testMediaDevicesAPI(),
    testEnumerateDevices(),
    testCanvasToBlob(),
    testFileReader(),
    testBlob(),
    testPromise(),
    testAsyncAwait(),
    testMap(),
    testSet(),
    testLocalStorage(),
    testIndexedDB(),
    testTouchEvents()
  ];
  
  const allPassed = results.every(r => r.passed);
  const criticalPassed = results.filter(r => r.critical).every(r => r.passed);
  
  const report: CompatibilityReport = {
    allPassed,
    criticalPassed,
    browser,
    results,
    timestamp: new Date().toISOString()
  };
  
  // Afficher le rapport dans la console
  console.log('📊 Rapport de compatibilité:');
  console.log('Navigateur:', browser);
  console.log('Tous les tests:', allPassed ? '✅ PASSÉS' : '❌ ÉCHECS');
  console.log('Tests critiques:', criticalPassed ? '✅ PASSÉS' : '❌ ÉCHECS');
  console.log('\nDétails:');
  results.forEach(r => {
    console.log(r.message);
  });
  
  return report;
}

/**
 * 🧪 Affiche un rapport de compatibilité dans la console
 */
export function displayCompatibilityReport(report: CompatibilityReport): void {
  console.group('📊 Rapport de compatibilité caméra');
  
  console.log('🕐 Timestamp:', report.timestamp);
  console.log('📱 Navigateur:', report.browser);
  console.log('✅ Tous les tests:', report.allPassed ? 'PASSÉS' : 'ÉCHECS');
  console.log('🔴 Tests critiques:', report.criticalPassed ? 'PASSÉS' : 'ÉCHECS');
  
  console.group('📋 Résultats détaillés');
  report.results.forEach(result => {
    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    console.log(`${icon} ${result.testName}: ${result.message}`);
  });
  console.groupEnd();
  
  if (!report.criticalPassed) {
    console.error('❌ ATTENTION: Des tests critiques ont échoué. La caméra pourrait ne pas fonctionner correctement.');
  }
  
  console.groupEnd();
}


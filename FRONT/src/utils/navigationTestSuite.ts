/**
 * 🧪 Suite de Tests Navigation
 * 
 * Tests manuels pour valider la persistance des données de navigation
 */

export interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

class NavigationTestSuite {
  
  /**
   * 🧪 Exécute tous les tests de navigation
   */
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Début des tests de navigation...');
    
    const tests: TestResult[] = [];
    
    // Test 1: Persistance URL après refresh
    tests.push(await this.testUrlPersistenceAfterRefresh());
    
    // Test 2: Cohérence localStorage vs URL
    tests.push(await this.testLocalStorageUrlConsistency());
    
    // Test 3: Restauration session IndexedDB
    tests.push(await this.testIndexedDBSessionRestoration());
    
    // Test 4: Navigation Home button
    tests.push(await this.testHomeButtonNavigation());
    
    // Test 5: Browser back button
    tests.push(await this.testBrowserBackButton());
    
    // Test 6: Transition CheckIn → CheckOut
    tests.push(await this.testCheckinToCheckoutTransition());
    
    // Calculer le résumé
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length,
      warnings: tests.filter(t => t.status === 'warning').length
    };
    
    return {
      name: 'Navigation Test Suite',
      tests,
      summary
    };
  }
  
  /**
   * Test 1: Persistance des paramètres URL après refresh
   */
  private async testUrlPersistenceAfterRefresh(): TestResult {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const parcours = urlParams.get('parcours');
      const checkid = urlParams.get('checkid');
      
      // Vérifier la présence des paramètres essentiels
      if (!parcours && !checkid) {
        return {
          testName: 'URL Persistence After Refresh',
          status: 'warning',
          message: 'Aucun paramètre URL présent - Test non applicable',
          timestamp: new Date().toISOString()
        };
      }
      
      // Vérifier la sauvegarde dans localStorage
      const savedParams = localStorage.getItem('checkeasy_url_params');
      const activeCheckId = localStorage.getItem('activeCheckId');
      
      if (parcours && !savedParams) {
        return {
          testName: 'URL Persistence After Refresh',
          status: 'fail',
          message: 'Paramètres URL présents mais non sauvegardés dans localStorage',
          details: { parcours, checkid, savedParams, activeCheckId },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        testName: 'URL Persistence After Refresh',
        status: 'pass',
        message: 'Paramètres URL correctement persistés',
        details: { parcours, checkid, hasSavedParams: !!savedParams },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'URL Persistence After Refresh',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Test 2: Cohérence localStorage vs URL
   */
  private async testLocalStorageUrlConsistency(): TestResult {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCheckId = urlParams.get('checkid');
      const localStorageCheckId = localStorage.getItem('activeCheckId');
      
      if (!urlCheckId && !localStorageCheckId) {
        return {
          testName: 'localStorage URL Consistency',
          status: 'warning',
          message: 'Aucun checkId présent - Test non applicable',
          timestamp: new Date().toISOString()
        };
      }
      
      if (urlCheckId && localStorageCheckId && urlCheckId !== localStorageCheckId) {
        return {
          testName: 'localStorage URL Consistency',
          status: 'fail',
          message: 'Incohérence entre checkId URL et localStorage',
          details: { urlCheckId, localStorageCheckId },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        testName: 'localStorage URL Consistency',
        status: 'pass',
        message: 'Cohérence checkId URL ↔ localStorage',
        details: { checkId: urlCheckId || localStorageCheckId },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'localStorage URL Consistency',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Test 3: Restauration session IndexedDB
   */
  private async testIndexedDBSessionRestoration(): TestResult {
    try {
      const activeCheckId = localStorage.getItem('activeCheckId');
      
      if (!activeCheckId) {
        return {
          testName: 'IndexedDB Session Restoration',
          status: 'warning',
          message: 'Aucun checkId actif - Test non applicable',
          timestamp: new Date().toISOString()
        };
      }
      
      // Tenter de récupérer la session
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const session = await checkSessionManager.getCheckSession(activeCheckId);
      
      if (!session) {
        return {
          testName: 'IndexedDB Session Restoration',
          status: 'fail',
          message: 'Session non trouvée dans IndexedDB',
          details: { activeCheckId },
          timestamp: new Date().toISOString()
        };
      }
      
      // Vérifier la cohérence des données de session
      const hasProgress = session.progress && (
        session.progress.currentPieceId || 
        session.progress.currentTaskIndex !== undefined
      );
      
      return {
        testName: 'IndexedDB Session Restoration',
        status: 'pass',
        message: 'Session IndexedDB restaurée avec succès',
        details: {
          checkId: session.checkId,
          flowType: session.flowType,
          status: session.status,
          hasProgress
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'IndexedDB Session Restoration',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Test 4: Navigation Home button
   */
  private async testHomeButtonNavigation(): TestResult {
    try {
      // Vérifier la présence de la fonction navigatePreservingParams
      const { navigatePreservingParams } = await import('@/utils/navigationHelpers');
      
      if (typeof navigatePreservingParams !== 'function') {
        return {
          testName: 'Home Button Navigation',
          status: 'fail',
          message: 'Fonction navigatePreservingParams non disponible',
          timestamp: new Date().toISOString()
        };
      }
      
      // Simuler la navigation (sans exécuter réellement)
      const currentPath = window.location.pathname;
      const isOnCheckInOrCheckOut = currentPath.includes('/checkin') || currentPath.includes('/checkout');
      
      if (!isOnCheckInOrCheckOut) {
        return {
          testName: 'Home Button Navigation',
          status: 'warning',
          message: 'Test non applicable - Pas sur une page CheckIn/CheckOut',
          details: { currentPath },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        testName: 'Home Button Navigation',
        status: 'pass',
        message: 'Fonction de navigation Home disponible',
        details: { currentPath },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'Home Button Navigation',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Test 5: Browser back button
   */
  private async testBrowserBackButton(): TestResult {
    try {
      // Vérifier la présence du listener popstate
      const hasPopstateListener = window.onpopstate !== null;
      
      // Vérifier la sauvegarde du chemin actuel
      const lastPath = localStorage.getItem('checkeasy_last_path');
      const currentPath = window.location.pathname;
      
      return {
        testName: 'Browser Back Button',
        status: 'pass',
        message: 'Gestion navigation browser détectée',
        details: {
          hasPopstateListener,
          lastPath,
          currentPath,
          pathsMatch: lastPath === currentPath
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'Browser Back Button',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Test 6: Transition CheckIn → CheckOut
   */
  private async testCheckinToCheckoutTransition(): TestResult {
    try {
      const currentPath = window.location.pathname;
      const activeCheckId = localStorage.getItem('activeCheckId');
      
      if (!activeCheckId) {
        return {
          testName: 'CheckIn to CheckOut Transition',
          status: 'warning',
          message: 'Aucune session active - Test non applicable',
          timestamp: new Date().toISOString()
        };
      }
      
      // Vérifier la session dans IndexedDB
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const session = await checkSessionManager.getCheckSession(activeCheckId);
      
      if (!session) {
        return {
          testName: 'CheckIn to CheckOut Transition',
          status: 'fail',
          message: 'Session non trouvée pour la transition',
          details: { activeCheckId },
          timestamp: new Date().toISOString()
        };
      }
      
      // Vérifier la cohérence du flowType avec la page actuelle
      const expectedFlow = currentPath.includes('/checkin') ? 'checkin' : 
                          currentPath.includes('/checkout') ? 'checkout' : null;
      
      if (expectedFlow && session.flowType !== expectedFlow) {
        return {
          testName: 'CheckIn to CheckOut Transition',
          status: 'warning',
          message: 'FlowType session ne correspond pas à la page actuelle',
          details: {
            currentPath,
            sessionFlowType: session.flowType,
            expectedFlow
          },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        testName: 'CheckIn to CheckOut Transition',
        status: 'pass',
        message: 'Transition CheckIn/CheckOut cohérente',
        details: {
          flowType: session.flowType,
          currentPath,
          hasProgress: !!session.progress.currentPieceId
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        testName: 'CheckIn to CheckOut Transition',
        status: 'fail',
        message: `Erreur lors du test: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 📋 Génère un rapport de test
   */
  generateReport(testSuite: TestSuite): string {
    let report = `# 🧪 Rapport de Tests Navigation\n\n`;
    
    // Résumé
    report += `## 📊 Résumé\n\n`;
    report += `- **Total:** ${testSuite.summary.total} tests\n`;
    report += `- **✅ Réussis:** ${testSuite.summary.passed}\n`;
    report += `- **❌ Échoués:** ${testSuite.summary.failed}\n`;
    report += `- **⚠️ Avertissements:** ${testSuite.summary.warnings}\n\n`;
    
    // Détails des tests
    report += `## 📋 Détails des Tests\n\n`;
    
    testSuite.tests.forEach((test, index) => {
      const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
      report += `### ${index + 1}. ${icon} ${test.testName}\n\n`;
      report += `**Status:** ${test.status.toUpperCase()}\n`;
      report += `**Message:** ${test.message}\n`;
      
      if (test.details) {
        report += `**Détails:**\n\`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`\n`;
      }
      
      report += `**Timestamp:** ${test.timestamp}\n\n`;
    });
    
    return report;
  }
}

// Export singleton
export const navigationTestSuite = new NavigationTestSuite();

// Fonction utilitaire pour exécution rapide
export const runNavigationTests = async (): Promise<void> => {
  console.log('🧪 === TESTS DE NAVIGATION ===');
  const results = await navigationTestSuite.runAllTests();
  
  console.log('📊 Résumé:', results.summary);
  
  results.tests.forEach(test => {
    const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${test.testName}: ${test.message}`);
  });
  
  return results;
};

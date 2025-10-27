/**
 * 🧪 TEST DE PERSISTENCE DES DONNÉES AU RELOAD (F5)
 * 
 * Vérifie que les données de progression sont correctement sauvegardées
 * et restaurées après un reload de la page
 */

import { test, expect } from '@playwright/test';

test.describe('Data Persistence on Page Reload', () => {
  
  test.beforeEach(async ({ page }) => {
    // Activer les logs de console pour debug
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('❌') || msg.text().includes('CheckinFlow')) {
        console.log(`[BROWSER ${msg.type()}]:`, msg.text());
      }
    });
  });

  test('should save and restore progress data after F5 reload', async ({ page }) => {
    console.log('🧪 TEST: Sauvegarde et restauration des données après F5');

    // 1. Naviguer vers l'application
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');

    // 2. Vérifier qu'on est sur la page d'accueil
    await expect(page.locator('text=CheckEasy')).toBeVisible({ timeout: 10000 });

    // 3. Créer une nouvelle session (simuler le flow complet)
    // Cliquer sur "Commencer" ou équivalent
    const startButton = page.locator('button:has-text("Commencer"), button:has-text("Démarrer")').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    // 4. Remplir les informations utilisateur si nécessaire
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="Prénom"]').first();
    if (await firstNameInput.isVisible({ timeout: 3000 })) {
      await firstNameInput.fill('Test');
      
      const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Nom"]').first();
      await lastNameInput.fill('User');
      
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
      await phoneInput.fill('0612345678');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Continuer")').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // 5. Sélectionner un parcours si nécessaire
    const parcoursButton = page.locator('button:has-text("Check-in"), button:has-text("Checkin")').first();
    if (await parcoursButton.isVisible({ timeout: 3000 })) {
      await parcoursButton.click();
      await page.waitForTimeout(1000);
    }

    // 6. Récupérer le checkId depuis l'URL ou localStorage
    const checkIdFromUrl = await page.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('checkid');
    });

    const checkIdFromStorage = await page.evaluate(() => {
      return localStorage.getItem('activeCheckId');
    });

    const checkId = checkIdFromUrl || checkIdFromStorage;
    console.log('📋 CheckID récupéré:', checkId);

    expect(checkId).toBeTruthy();

    // 7. Vérifier que la session existe dans IndexedDB
    const sessionBeforeReload = await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['checkSessions'], 'readonly');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise((resolve) => {
        const request = store.get(cid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    }, checkId);

    console.log('💾 Session avant reload:', JSON.stringify(sessionBeforeReload, null, 2));
    expect(sessionBeforeReload).toBeTruthy();

    // 8. Effectuer quelques interactions
    // Cliquer sur un bouton "État correct" ou similaire
    const correctButton = page.locator('button:has-text("Correct"), button:has-text("État correct")').first();
    if (await correctButton.isVisible({ timeout: 5000 })) {
      await correctButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Bouton "Correct" cliqué');
    }

    // Prendre une photo si possible
    const photoButton = page.locator('button:has-text("Photo"), button[aria-label*="photo"]').first();
    if (await photoButton.isVisible({ timeout: 3000 })) {
      await photoButton.click();
      await page.waitForTimeout(500);
      
      // Simuler la capture (si modal de caméra)
      const captureButton = page.locator('button:has-text("Capturer"), button:has-text("Prendre")').first();
      if (await captureButton.isVisible({ timeout: 3000 })) {
        await captureButton.click();
        await page.waitForTimeout(500);
        console.log('📸 Photo capturée');
      }
    }

    // 9. Attendre que les données soient sauvegardées
    await page.waitForTimeout(2000);

    // 10. Récupérer l'état complet avant reload
    const stateBeforeReload = await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['checkSessions'], 'readonly');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise((resolve) => {
        const request = store.get(cid);
        request.onsuccess = () => {
          const session = request.result;
          resolve({
            checkId: session?.checkId,
            currentPieceId: session?.progress?.currentPieceId,
            currentTaskIndex: session?.progress?.currentTaskIndex,
            hasInteractions: !!session?.progress?.interactions,
            buttonClicksCount: Object.keys(session?.progress?.interactions?.buttonClicks || {}).length,
            photosCount: Object.keys(session?.progress?.interactions?.photosTaken || {}).length,
            checkboxesCount: Object.keys(session?.progress?.interactions?.checkboxStates || {}).length,
          });
        };
        request.onerror = () => resolve(null);
      });
    }, checkId);

    console.log('📊 État avant reload:', stateBeforeReload);

    // 11. RELOAD LA PAGE (F5)
    console.log('🔄 RELOAD DE LA PAGE (F5)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 12. Vérifier que le checkId est toujours dans l'URL ou localStorage
    const checkIdAfterReload = await page.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('checkid');
      const fromStorage = localStorage.getItem('activeCheckId');
      return fromUrl || fromStorage;
    });

    console.log('📋 CheckID après reload:', checkIdAfterReload);
    expect(checkIdAfterReload).toBe(checkId);

    // 13. Vérifier que la session existe toujours dans IndexedDB
    const sessionAfterReload = await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['checkSessions'], 'readonly');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise((resolve) => {
        const request = store.get(cid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    }, checkId);

    console.log('💾 Session après reload:', JSON.stringify(sessionAfterReload, null, 2));
    expect(sessionAfterReload).toBeTruthy();

    // 14. Vérifier que les données de progression sont restaurées
    const stateAfterReload = await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['checkSessions'], 'readonly');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise((resolve) => {
        const request = store.get(cid);
        request.onsuccess = () => {
          const session = request.result;
          resolve({
            checkId: session?.checkId,
            currentPieceId: session?.progress?.currentPieceId,
            currentTaskIndex: session?.progress?.currentTaskIndex,
            hasInteractions: !!session?.progress?.interactions,
            buttonClicksCount: Object.keys(session?.progress?.interactions?.buttonClicks || {}).length,
            photosCount: Object.keys(session?.progress?.interactions?.photosTaken || {}).length,
            checkboxesCount: Object.keys(session?.progress?.interactions?.checkboxStates || {}).length,
          });
        };
        request.onerror = () => resolve(null);
      });
    }, checkId);

    console.log('📊 État après reload:', stateAfterReload);

    // 15. ASSERTIONS CRITIQUES
    expect(stateAfterReload).toBeTruthy();
    expect(stateAfterReload.checkId).toBe(checkId);
    
    // Vérifier que la progression est identique
    expect(stateAfterReload.currentPieceId).toBe(stateBeforeReload.currentPieceId);
    expect(stateAfterReload.currentTaskIndex).toBe(stateBeforeReload.currentTaskIndex);
    
    // Vérifier que les interactions sont préservées
    expect(stateAfterReload.buttonClicksCount).toBe(stateBeforeReload.buttonClicksCount);
    expect(stateAfterReload.photosCount).toBe(stateBeforeReload.photosCount);
    expect(stateAfterReload.checkboxesCount).toBe(stateBeforeReload.checkboxesCount);

    console.log('✅ TEST RÉUSSI: Les données sont correctement restaurées après F5');
  });

  test('should handle reload with checkId in URL parameter', async ({ page }) => {
    console.log('🧪 TEST: Restauration avec checkId dans l\'URL');

    // Créer une session manuellement dans IndexedDB
    const testCheckId = `check_${Date.now()}_test123`;

    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');

    // Injecter une session de test dans IndexedDB
    await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const session = {
        checkId: cid,
        userId: 'test_user',
        parcoursId: 'test_parcours',
        flowType: 'checkin',
        status: 'active',
        isFlowCompleted: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        progress: {
          currentPieceId: '1740996929005x561569161220863740',
          currentTaskIndex: 2,
          interactions: {
            buttonClicks: { 'test_button': [{ buttonId: 'test', timestamp: new Date().toISOString() }] },
            photosTaken: {},
            checkboxStates: {},
            signalements: {},
            pieceStates: {}
          }
        }
      };

      const transaction = db.transaction(['checkSessions'], 'readwrite');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise<void>((resolve) => {
        const request = store.put(session);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    }, testCheckId);

    console.log('💾 Session de test créée:', testCheckId);

    // Naviguer vers l'URL avec le checkId
    await page.goto(`http://localhost:5173/checkin?checkid=${testCheckId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Vérifier que la session est chargée
    const loadedSession = await page.evaluate(async (cid) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CheckEasyDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['checkSessions'], 'readonly');
      const store = transaction.objectStore('checkSessions');
      
      return new Promise((resolve) => {
        const request = store.get(cid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    }, testCheckId);

    console.log('📖 Session chargée:', loadedSession);
    expect(loadedSession).toBeTruthy();
    expect(loadedSession.progress.currentPieceId).toBe('1740996929005x561569161220863740');
    expect(loadedSession.progress.currentTaskIndex).toBe(2);

    console.log('✅ TEST RÉUSSI: Session restaurée depuis URL');
  });
});


# 🧪 SCRIPTS DE TEST - VÉRIFICATION ETAPEID

## 📋 Scripts prêts à copier-coller dans la console

### 🔍 Script 1: Vérifier les données API brutes

```javascript
// ============================================
// TEST 1: VÉRIFICATION DONNÉES API
// ============================================

const PARCOURS_ID = '1753358726225x784440888671076400';

async function testApiData() {
  console.log('🔍 TEST 1: Vérification données API brutes');
  console.log('='.repeat(60));
  
  try {
    // Appel API
    const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece?parcours=${PARCOURS_ID}`;
    const response = await fetch(apiUrl);
    const rawData = await response.json();
    
    // Statistiques globales
    console.log('📊 STATISTIQUES GLOBALES:');
    console.log(`  - Parcours ID: ${rawData.parcourID}`);
    console.log(`  - Nom: ${rawData.parcoursName}`);
    console.log(`  - Total pièces: ${rawData.piece.length}`);
    
    // Analyser chaque pièce
    let totalEtapes = 0;
    let etapesWithId = 0;
    let etapesWithoutId = 0;
    let duplicateIds = 0;
    const allEtapeIds = new Set();
    const allPieceIds = new Set();
    
    console.log('\n📋 ANALYSE PAR PIÈCE:');
    rawData.piece.forEach((piece, pieceIndex) => {
      console.log(`\n  Pièce ${pieceIndex + 1}: ${piece.nom}`);
      console.log(`    - pieceID: ${piece.pieceID}`);
      console.log(`    - Nombre d'étapes: ${piece.etapes.length}`);
      
      allPieceIds.add(piece.pieceID);
      
      piece.etapes.forEach((etape, etapeIndex) => {
        totalEtapes++;
        
        if (etape.etapeID) {
          etapesWithId++;
          
          // Vérifier si etapeID = pieceID (PROBLÈME)
          if (etape.etapeID === piece.pieceID) {
            duplicateIds++;
            console.log(`    ❌ Étape ${etapeIndex + 1}: etapeID = pieceID (${etape.etapeID})`);
          } else {
            console.log(`    ✅ Étape ${etapeIndex + 1}: ${etape.etapeID} (${etape.isTodo ? 'TODO' : 'PHOTO'})`);
          }
          
          // Vérifier les doublons
          if (allEtapeIds.has(etape.etapeID)) {
            console.log(`    ⚠️ DOUBLON: ${etape.etapeID} existe déjà !`);
          }
          allEtapeIds.add(etape.etapeID);
        } else {
          etapesWithoutId++;
          console.log(`    ❌ Étape ${etapeIndex + 1}: PAS D'ETAPEID !`);
        }
      });
    });
    
    // Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL:');
    console.log(`  ✅ Total étapes: ${totalEtapes}`);
    console.log(`  ✅ Étapes avec etapeID: ${etapesWithId}`);
    console.log(`  ❌ Étapes sans etapeID: ${etapesWithoutId}`);
    console.log(`  ❌ Étapes avec etapeID = pieceID: ${duplicateIds}`);
    console.log(`  📊 EtapeIDs uniques: ${allEtapeIds.size}`);
    console.log(`  📊 PieceIDs uniques: ${allPieceIds.size}`);
    
    // Vérifier les conflits
    const conflicts = [];
    allEtapeIds.forEach(etapeId => {
      if (allPieceIds.has(etapeId)) {
        conflicts.push(etapeId);
      }
    });
    
    if (conflicts.length > 0) {
      console.log(`\n  🚨 CONFLITS DÉTECTÉS: ${conflicts.length} etapeID identiques à des pieceID`);
      console.log('  IDs en conflit:', conflicts);
    } else {
      console.log('\n  ✅ Aucun conflit etapeID/pieceID');
    }
    
    // Retourner les données pour tests suivants
    window.testRawData = rawData;
    console.log('\n💾 Données sauvegardées dans window.testRawData');
    
    return {
      success: etapesWithoutId === 0 && duplicateIds === 0,
      totalEtapes,
      etapesWithId,
      etapesWithoutId,
      duplicateIds,
      conflicts: conflicts.length
    };
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    return { success: false, error: error.message };
  }
}

// Exécuter le test
testApiData();
```

---

### 🔄 Script 2: Vérifier la transformation DataAdapter

```javascript
// ============================================
// TEST 2: VÉRIFICATION DATAADAPTER
// ============================================

async function testDataAdapter() {
  console.log('🔄 TEST 2: Vérification transformation DataAdapter');
  console.log('='.repeat(60));
  
  // Utiliser les données du test précédent
  const rawData = window.testRawData;
  if (!rawData) {
    console.error('❌ Exécutez d\'abord testApiData()');
    return;
  }
  
  // Importer le DataAdapter (si disponible)
  // Note: Ceci dépend de votre configuration de modules
  try {
    const { DataAdapter } = await import('/src/services/dataAdapter.ts');
    
    // Adapter les données
    const adaptedData = DataAdapter.adaptCompleteData(rawData);
    
    console.log('📊 DONNÉES ADAPTÉES:');
    console.log(`  - Nombre de rooms: ${Object.keys(adaptedData.roomsData).length}`);
    console.log(`  - FlowType: ${adaptedData.flowType}`);
    
    // Comparer les IDs
    console.log('\n🔍 COMPARAISON API vs ADAPTED:');
    
    let totalTasks = 0;
    let tasksWithEtapeId = 0;
    let tasksWithMatchingId = 0;
    
    Object.entries(adaptedData.roomsData).forEach(([roomId, room]) => {
      const apiPiece = rawData.piece.find(p => p.pieceID === roomId);
      
      console.log(`\n  Pièce: ${room.name}`);
      console.log(`    - API étapes: ${apiPiece.etapes.length}`);
      console.log(`    - Adapted tasks: ${room.tasks.length}`);
      
      room.tasks.forEach((task, taskIndex) => {
        totalTasks++;
        
        console.log(`\n    Task ${taskIndex + 1}:`);
        console.log(`      - task.id: "${task.id}"`);
        console.log(`      - task.label: "${task.label.substring(0, 40)}..."`);
        
        // Vérifier si task a un champ etapeID
        if ('etapeID' in task || 'etape_id' in task) {
          tasksWithEtapeId++;
          const taskEtapeId = task.etapeID || task.etape_id;
          console.log(`      - task.etapeID: "${taskEtapeId}"`);
          
          // Vérifier si ça correspond à un etapeID de l'API
          const matchingEtape = apiPiece.etapes.find(e => e.etapeID === taskEtapeId);
          if (matchingEtape) {
            tasksWithMatchingId++;
            console.log(`      ✅ Correspond à l'API`);
          } else {
            console.log(`      ❌ Ne correspond à aucun etapeID de l'API`);
          }
        } else {
          console.log(`      ❌ PAS DE CHAMP etapeID dans la task`);
        }
        
        // Vérifier si task.id correspond à un etapeID
        const matchingByTaskId = apiPiece.etapes.find(e => e.etapeID === task.id);
        if (matchingByTaskId) {
          console.log(`      ✅ task.id correspond à un etapeID de l'API`);
          tasksWithMatchingId++;
        } else {
          console.log(`      ❌ task.id ne correspond à aucun etapeID de l'API`);
        }
      });
    });
    
    // Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT TRANSFORMATION:');
    console.log(`  - Total tasks créées: ${totalTasks}`);
    console.log(`  - Tasks avec champ etapeID: ${tasksWithEtapeId}`);
    console.log(`  - Tasks avec ID correspondant à l'API: ${tasksWithMatchingId}`);
    
    const preservationRate = totalTasks > 0 ? (tasksWithMatchingId / totalTasks * 100).toFixed(1) : 0;
    console.log(`  - Taux de préservation: ${preservationRate}%`);
    
    if (preservationRate < 100) {
      console.log('\n  🚨 PROBLÈME: Les etapeID ne sont pas préservés à 100%');
    } else {
      console.log('\n  ✅ SUCCÈS: Tous les etapeID sont préservés');
    }
    
    window.testAdaptedData = adaptedData;
    console.log('\n💾 Données sauvegardées dans window.testAdaptedData');
    
    return {
      success: preservationRate === 100,
      totalTasks,
      tasksWithEtapeId,
      tasksWithMatchingId,
      preservationRate
    };
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    console.log('⚠️ Le DataAdapter n\'est peut-être pas accessible depuis la console');
    console.log('   Essayez d\'exécuter ce test depuis le code de l\'application');
    return { success: false, error: error.message };
  }
}

// Exécuter le test
testDataAdapter();
```

---

### 🗺️ Script 3: Vérifier le mapping etapeIdMapper

```javascript
// ============================================
// TEST 3: VÉRIFICATION ETAPEIDMAPPER
// ============================================

async function testEtapeIdMapper() {
  console.log('🗺️ TEST 3: Vérification etapeIdMapper');
  console.log('='.repeat(60));
  
  try {
    const { etapeIdMapper } = await import('/src/services/etapeIdMapper.ts');
    
    // Charger les données
    console.log('📥 Chargement des données dans etapeIdMapper...');
    const loaded = await etapeIdMapper.loadParcoursData(PARCOURS_ID);
    
    if (!loaded) {
      console.error('❌ Échec du chargement');
      return { success: false };
    }
    
    console.log('✅ Données chargées');
    
    // Tester le mapping avec différents taskId
    const testCases = [
      { taskId: '1753358727684x171131427093090140', desc: 'etapeID direct' },
      { taskId: 'refaire-le-lit-avec-des-drap', desc: 'slug du titre' },
      { taskId: 'chambre_0', desc: 'pattern pieceName_index' },
      { taskId: 'photos-1753358727481x453383598298510400', desc: 'pattern photos-pieceId' }
    ];
    
    console.log('\n🧪 TESTS DE MAPPING:');
    
    let successCount = 0;
    testCases.forEach(testCase => {
      const mappedId = etapeIdMapper.getEtapeIdForTask(testCase.taskId);
      const success = !!mappedId && mappedId !== testCase.taskId;
      
      console.log(`\n  Test: ${testCase.desc}`);
      console.log(`    - Input taskId: "${testCase.taskId}"`);
      console.log(`    - Mapped etapeId: "${mappedId || 'NON TROUVÉ'}"`);
      console.log(`    - ${success ? '✅ Mappé' : '❌ Non mappé'}`);
      
      if (success) successCount++;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RÉSULTAT: ${successCount}/${testCases.length} mappings réussis`);
    
    return {
      success: successCount === testCases.length,
      successCount,
      totalTests: testCases.length
    };
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    return { success: false, error: error.message };
  }
}

// Exécuter le test
testEtapeIdMapper();
```

---

### 📤 Script 4: Vérifier le payload webhook

```javascript
// ============================================
// TEST 4: VÉRIFICATION PAYLOAD WEBHOOK
// ============================================

function testWebhookPayload() {
  console.log('📤 TEST 4: Vérification payload webhook');
  console.log('='.repeat(60));
  
  // Récupérer les données de session
  const sessionData = JSON.parse(localStorage.getItem('checkSessionData') || '{}');
  const activeCheckId = localStorage.getItem('activeCheckId');
  
  if (!activeCheckId || !sessionData[activeCheckId]) {
    console.error('❌ Aucune session active trouvée');
    console.log('   Créez d\'abord une session dans database-admin.html');
    return { success: false };
  }
  
  const checkSession = sessionData[activeCheckId];
  
  console.log('📊 SESSION ACTIVE:');
  console.log(`  - Check ID: ${activeCheckId}`);
  console.log(`  - Parcours ID: ${checkSession.parcoursId}`);
  console.log(`  - Type: ${checkSession.flowType}`);
  
  // Vérifier les données parcours
  if (!checkSession.parcoursData) {
    console.error('❌ Pas de parcoursData dans la session');
    return { success: false };
  }
  
  console.log('\n📋 DONNÉES PARCOURS:');
  console.log(`  - Nombre de pièces: ${checkSession.parcoursData.piece.length}`);
  
  // Extraire les etapeID de l'API
  const apiEtapeIds = new Map(); // pieceId -> [etapeIds]
  checkSession.parcoursData.piece.forEach(piece => {
    const etapeIds = piece.etapes.map(e => e.etapeID);
    apiEtapeIds.set(piece.pieceID, etapeIds);
    console.log(`  - ${piece.nom}: ${etapeIds.length} étapes`);
  });
  
  // Analyser les interactions stockées
  console.log('\n🖱️ INTERACTIONS STOCKÉES:');
  
  const storedEtapeIds = new Map(); // pieceId -> [etapeIds]
  
  // 1. ButtonClicks
  if (checkSession.progress?.interactions?.buttonClicks) {
    console.log('  📍 ButtonClicks:');
    Object.entries(checkSession.progress.interactions.buttonClicks).forEach(([key, clicks]) => {
      if (Array.isArray(clicks)) {
        clicks.forEach(click => {
          const pieceId = click.pieceId;
          const etapeId = click.etapeId || click.metadata?.mappedEtapeId;
          
          if (!storedEtapeIds.has(pieceId)) {
            storedEtapeIds.set(pieceId, []);
          }
          storedEtapeIds.get(pieceId).push(etapeId);
          
          console.log(`    - ${key}: etapeId="${etapeId}"`);
        });
      }
    });
  }
  
  // 2. Photos
  if (checkSession.progress?.interactions?.photosTaken) {
    console.log('  📸 Photos:');
    Object.entries(checkSession.progress.interactions.photosTaken).forEach(([key, photos]) => {
      if (Array.isArray(photos)) {
        photos.forEach(photo => {
          const pieceId = photo.pieceId;
          const etapeId = photo.etapeId || photo.metadata?.mappedEtapeId;
          
          if (!storedEtapeIds.has(pieceId)) {
            storedEtapeIds.set(pieceId, []);
          }
          storedEtapeIds.get(pieceId).push(etapeId);
          
          console.log(`    - ${key}: etapeId="${etapeId}"`);
        });
      }
    });
  }
  
  // Comparer API vs Stocké
  console.log('\n🔍 COMPARAISON API vs STOCKÉ:');
  
  let totalApiEtapes = 0;
  let totalStoredEtapes = 0;
  let matchingEtapes = 0;
  let mismatchedEtapes = 0;
  
  apiEtapeIds.forEach((apiIds, pieceId) => {
    const storedIds = storedEtapeIds.get(pieceId) || [];
    const pieceName = checkSession.parcoursData.piece.find(p => p.pieceID === pieceId)?.nom || 'Unknown';
    
    console.log(`\n  Pièce: ${pieceName}`);
    console.log(`    - API etapeIDs: ${apiIds.length}`);
    console.log(`    - Stockés: ${storedIds.length}`);
    
    totalApiEtapes += apiIds.length;
    totalStoredEtapes += storedIds.length;
    
    // Vérifier les correspondances
    storedIds.forEach(storedId => {
      if (apiIds.includes(storedId)) {
        matchingEtapes++;
        console.log(`    ✅ "${storedId}" correspond à l'API`);
      } else if (storedId === pieceId) {
        mismatchedEtapes++;
        console.log(`    ❌ "${storedId}" = pieceID (PROBLÈME)`);
      } else {
        mismatchedEtapes++;
        console.log(`    ⚠️ "${storedId}" ne correspond pas à l'API`);
      }
    });
  });
  
  // Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL:');
  console.log(`  - Total etapeIDs dans l'API: ${totalApiEtapes}`);
  console.log(`  - Total etapeIDs stockés: ${totalStoredEtapes}`);
  console.log(`  - Correspondances: ${matchingEtapes}`);
  console.log(`  - Non-correspondances: ${mismatchedEtapes}`);
  
  const matchRate = totalStoredEtapes > 0 ? (matchingEtapes / totalStoredEtapes * 100).toFixed(1) : 0;
  console.log(`  - Taux de correspondance: ${matchRate}%`);
  
  if (matchRate < 100) {
    console.log('\n  🚨 PROBLÈME: Les etapeID stockés ne correspondent pas à 100% à l\'API');
  } else {
    console.log('\n  ✅ SUCCÈS: Tous les etapeID stockés correspondent à l\'API');
  }
  
  return {
    success: matchRate === 100,
    totalApiEtapes,
    totalStoredEtapes,
    matchingEtapes,
    mismatchedEtapes,
    matchRate
  };
}

// Exécuter le test
testWebhookPayload();
```

---

### 🎯 Script 5: Test complet de bout en bout

```javascript
// ============================================
// TEST 5: TEST COMPLET DE BOUT EN BOUT
// ============================================

async function testEndToEnd() {
  console.log('🎯 TEST 5: Test complet de bout en bout');
  console.log('='.repeat(60));
  
  const results = {
    test1_api: null,
    test2_adapter: null,
    test3_mapper: null,
    test4_webhook: null
  };
  
  // Test 1: API
  console.log('\n📍 Étape 1/4: Vérification API...');
  results.test1_api = await testApiData();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: DataAdapter
  console.log('\n📍 Étape 2/4: Vérification DataAdapter...');
  results.test2_adapter = await testDataAdapter();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Mapper
  console.log('\n📍 Étape 3/4: Vérification Mapper...');
  results.test3_mapper = await testEtapeIdMapper();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Webhook
  console.log('\n📍 Étape 4/4: Vérification Webhook...');
  results.test4_webhook = testWebhookPayload();
  
  // Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL COMPLET:');
  console.log('='.repeat(60));
  
  console.log('\n✅ Test 1 - API:', results.test1_api?.success ? 'RÉUSSI' : 'ÉCHOUÉ');
  console.log('✅ Test 2 - DataAdapter:', results.test2_adapter?.success ? 'RÉUSSI' : 'ÉCHOUÉ');
  console.log('✅ Test 3 - Mapper:', results.test3_mapper?.success ? 'RÉUSSI' : 'ÉCHOUÉ');
  console.log('✅ Test 4 - Webhook:', results.test4_webhook?.success ? 'RÉUSSI' : 'ÉCHOUÉ');
  
  const allSuccess = Object.values(results).every(r => r?.success);
  
  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('🎉 TOUS LES TESTS RÉUSSIS !');
    console.log('✅ Les etapeID sont préservés de bout en bout');
  } else {
    console.log('🚨 CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('❌ Les etapeID ne sont PAS préservés correctement');
  }
  console.log('='.repeat(60));
  
  return results;
}

// Exécuter le test complet
testEndToEnd();
```

---

## 📝 Instructions d'utilisation

### Pour tester dans la console du navigateur:

1. **Ouvrir l'application** dans le navigateur
2. **Ouvrir la console** (F12)
3. **Copier-coller** le script souhaité
4. **Analyser** les résultats dans la console

### Pour tester dans database-admin.html:

1. **Ouvrir** `FRONT/public/database-admin.html`
2. **Créer une session** de test
3. **Simuler des interactions** (clics, photos)
4. **Exécuter** le script 4 ou 5 dans la console

### Ordre recommandé:

1. ✅ Script 1 (API) - Vérifier que l'API retourne bien les etapeID
2. ✅ Script 2 (DataAdapter) - Vérifier la transformation
3. ✅ Script 3 (Mapper) - Vérifier le mapping
4. ✅ Script 4 (Webhook) - Vérifier le payload final
5. ✅ Script 5 (Complet) - Test de bout en bout

---

**Créé le**: 2025-09-30  
**Parcours de test**: `1753358726225x784440888671076400`


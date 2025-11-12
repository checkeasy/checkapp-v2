import React, { useState, useRef, useCallback } from 'react';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

const CameraTest: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status1, setStatus1] = useState({ message: 'Cliquez sur le bouton pour tester la méthode native iOS', type: 'info' as const });
  const [status2, setStatus2] = useState({ message: 'Cliquez sur "Démarrer caméra arrière" pour tester getUserMedia', type: 'info' as const });
  const [showVideo, setShowVideo] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [nativeImage, setNativeImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: LogEntry = { message, type, timestamp };
    setLogs(prev => [...prev, newLog]);
    console.log(`[${timestamp}] ${message}`);
  }, []);

  const detectEnvironment = useCallback(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isInIframe = window !== window.top;
    const isStandalone = (window.navigator as any).standalone === true;
    
    log('🔍 Environnement détecté:');
    log(`  📱 iOS: ${isIOS}`);
    log(`  🤖 Android: ${isAndroid}`);
    log(`  🌐 Safari: ${isSafari}`);
    log(`  🖼️ Dans iFrame: ${isInIframe}`);
    log(`  📱 PWA/Standalone: ${isStandalone}`);
    log(`  🔗 URL: ${window.location.href}`);
    
    return { isIOS, isAndroid, isSafari, isInIframe, isStandalone };
  }, [log]);

  // TEST 1: Méthode native iOS
  const testNativeCapture = useCallback(() => {
    log('\n🎬 === TEST 1: MÉTHODE NATIVE iOS ===');
    setStatus1({ message: 'Test en cours...', type: 'info' });
    
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.style.display = 'none';
      document.body.appendChild(input);
      
      log('📱 Création input[capture="environment"]');
      
      input.onchange = () => {
        const file = input.files?.[0];
        document.body.removeChild(input);
        
        if (file) {
          log('✅ Photo prise avec succès !', 'success');
          log(`📝 Fichier: ${file.name}, Taille: ${(file.size/1024/1024).toFixed(2)}MB`);
          
          const url = URL.createObjectURL(file);
          setNativeImage(url);
          
          setStatus1({ message: '✅ SUCCÈS: La caméra arrière fonctionne via méthode native !', type: 'success' });
        } else {
          log('⚠️ Aucun fichier sélectionné', 'warning');
          setStatus1({ message: '⚠️ Aucune photo prise (annulé par utilisateur)', type: 'warning' });
        }
      };
      
      input.onerror = (e) => {
        log('❌ Erreur input file: ' + e, 'error');
        setStatus1({ message: '❌ Erreur lors de l\'ouverture de la caméra native', type: 'error' });
        document.body.removeChild(input);
      };
      
      log('📱 Ouverture interface caméra iOS...');
      input.click();
      
    } catch (err) {
      const error = err as Error;
      log(`❌ Erreur méthode native: ${error.message}`, 'error');
      setStatus1({ message: `❌ Erreur: ${error.message}`, type: 'error' });
    }
  }, [log]);

  // Vérifier si le stream est de la caméra arrière
  const isEnvironment = useCallback(async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings?.() || {};
    
    log(`📝 Settings du track: ${JSON.stringify(settings)}`);
    
    if (settings.facingMode) {
      const isEnv = /environment|back/i.test(settings.facingMode);
      log(`📝 FacingMode détecté: "${settings.facingMode}" → ${isEnv ? 'ARRIÈRE' : 'AVANT'}`);
      return isEnv;
    }
    
    log('⚠️ Impossible de déterminer le facingMode', 'warning');
    return false;
  }, [log]);

  // Ouvrir la caméra arrière avec stratégie robuste
  const openBackCamera = useCallback(async () => {
    log('\n🔧 === OUVERTURE CAMÉRA ARRIÈRE ROBUSTE ===');
    
    // 1) Essai simple (souple)
    log('📱 ÉTAPE 1: Essai facingMode ideal "environment"');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        },
        audio: false
      });
      
      log('✅ Stream obtenu avec facingMode ideal', 'success');
      
      if (await isEnvironment(s)) {
        log('✅ SUCCÈS: Caméra arrière confirmée !', 'success');
        return s;
      }
      
      log('⚠️ Stream obtenu mais pas la caméra arrière', 'warning');
      s.getTracks().forEach(t => t.stop());
    } catch (err) {
      const error = err as Error;
      log(`⚠️ Étape 1 échouée: ${error.message}`, 'warning');
    }

    // 2) Permission minimale puis énumération
    log('📱 ÉTAPE 2: Permission minimale + énumération');
    let tmp: MediaStream;
    try {
      tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      log('✅ Permission caméra obtenue', 'success');
    } catch (e) {
      const error = e as Error;
      throw new Error('Permission caméra refusée ou indisponible: ' + error.message);
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput');
    
    log(`📝 ${cams.length} caméra(s) détectée(s):`);
    cams.forEach((cam, i) => {
      log(`  ${i+1}. "${cam.label}" (${cam.deviceId.substring(0, 12)}...)`);
    });

    // 3) Priorité aux labels évocateurs
    log('📱 ÉTAPE 3: Test par priorité de labels');
    const prefOrder = [
      { name: 'Back/Rear/Environment', test: (d: MediaDeviceInfo) => /back|rear|environment/i.test(d.label) },
      { name: 'Wide Angle', test: (d: MediaDeviceInfo) => /wide[- ]?angle/i.test(d.label) },
      { name: 'Toutes les autres', test: () => true }
    ];

    for (const { name, test } of prefOrder) {
      const candidates = cams.filter(test);
      if (candidates.length === 0) continue;
      
      log(`📝 Test catégorie "${name}": ${candidates.length} candidat(s)`);
      
      for (const d of candidates) {
        try {
          log(`  🎯 Test "${d.label}"`);
          const s = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: d.deviceId } },
            audio: false
          });
          
          if (await isEnvironment(s)) { 
            tmp.getTracks().forEach(t => t.stop()); 
            log('✅ SUCCÈS: Caméra arrière trouvée !', 'success');
            return s; 
          }
          
          log(`  ⚠️ "${d.label}" n'est pas la caméra arrière`);
          s.getTracks().forEach(t => t.stop());
        } catch (err) {
          const error = err as Error;
          log(`  ❌ Erreur avec "${d.label}": ${error.message}`, 'error');
        }
      }
    }

    // 4) Dernier recours: garder tmp si c'est l'arrière
    log('📱 ÉTAPE 4: Vérification du stream initial');
    if (await isEnvironment(tmp)) {
      log('✅ Le stream initial était déjà la caméra arrière !', 'success');
      return tmp;
    }

    log('⚠️ Aucune caméra arrière trouvée, retour du stream par défaut', 'warning');
    return tmp;
  }, [log, isEnvironment]);

  // TEST 2: getUserMedia robuste
  const testRobustCamera = useCallback(async () => {
    log('\n🎬 === TEST 2: getUserMedia ROBUSTE ===');
    setStatus2({ message: 'Démarrage en cours...', type: 'info' });
    
    try {
      const stream = await openBackCamera();
      currentStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowVideo(true);
        
        try { 
          await videoRef.current.play(); 
          log('✅ Vidéo en lecture', 'success');
        } catch (playErr) {
          const error = playErr as Error;
          log(`⚠️ Erreur video.play(): ${error.message}`, 'warning');
        }
      }
      
      setShowControls(true);
      
      // Vérifier les infos du stream
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings?.() || {};
      
      log('\n📹 === INFORMATIONS FINALES DU STREAM ===');
      log(`📝 Label: ${track.label}`);
      log(`📝 FacingMode: ${settings.facingMode || 'N/A'}`);
      log(`📝 Résolution: ${settings.width}x${settings.height}`);
      log(`📝 DeviceId: ${settings.deviceId?.substring(0, 15)}...`);
      
      const isBack = settings.facingMode && /environment|back/i.test(settings.facingMode);
      if (isBack) {
        setStatus2({ message: '✅ SUCCÈS: Caméra arrière active !', type: 'success' });
      } else {
        setStatus2({ message: '⚠️ Stream actif mais caméra arrière non confirmée', type: 'warning' });
      }
      
    } catch (err) {
      const error = err as Error;
      log(`❌ Erreur getUserMedia robuste: ${error.message}`, 'error');
      setStatus2({ message: `❌ Erreur: ${error.message}`, type: 'error' });
    }
  }, [log, openBackCamera]);

  // Prendre une photo
  const takePhoto = useCallback(() => {
    log('\n📸 === PRISE DE PHOTO ===');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    // S'assurer que la vidéo est prête
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w; 
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    log(`📝 Capture: ${w}x${h}`);
    
    // Pas de miroir pour l'arrière
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (!blob) {
        log('❌ Erreur création blob', 'error');
        return;
      }
      
      log(`✅ Photo capturée: ${(blob.size/1024).toFixed(1)}KB`, 'success');
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
    }, 'image/jpeg', 0.95);
  }, [log]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    log('\n⏹️ === ARRÊT CAMÉRA ===');
    
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => {
        track.stop();
        log(`⏹️ Track arrêté: ${track.label}`);
      });
      currentStreamRef.current = null;
    }
    
    setShowVideo(false);
    setShowControls(false);
    setStatus2({ message: 'Caméra arrêtée', type: 'info' });
  }, [log]);

  // Copier les logs
  const copyLogs = useCallback(() => {
    const logsText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      alert('📋 Logs copiés dans le presse-papiers !');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = logsText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('📋 Logs copiés ! (méthode fallback)');
    });
  }, [logs]);

  // Initialisation
  React.useEffect(() => {
    log('🚀 Page de test chargée');
    detectEnvironment();
    log('\n📋 INSTRUCTIONS:');
    log('1. Testez d\'abord la méthode native iOS');
    log('2. Si elle fonctionne, testez getUserMedia robuste');
    log('3. Copiez tous les logs et envoyez-les moi');
  }, [log, detectEnvironment]);

  const getStatusClass = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-green-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          🎯 Test Caméra Arrière iPhone
        </h1>
        
        {/* TEST 1: Méthode native iOS */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            📱 TEST 1: Méthode Native iOS (input capture)
          </h2>
          <p className="text-gray-600 mb-4">
            <strong>But:</strong> Tester si iOS peut ouvrir la caméra arrière via l'interface native.
          </p>
          
          <button
            onClick={testNativeCapture}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105 mb-4"
          >
            📷 Prendre une photo (caméra arrière)
          </button>
          
          <div className={`p-4 rounded-lg border ${getStatusClass(status1.type)} mb-4`}>
            {status1.message}
          </div>
          
          {nativeImage && (
            <img 
              src={nativeImage} 
              alt="Photo native" 
              className="max-w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* TEST 2: getUserMedia robuste */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            🔧 TEST 2: getUserMedia Robuste (forçage arrière)
          </h2>
          <p className="text-gray-600 mb-4">
            <strong>But:</strong> Forcer l'accès à la caméra arrière via getUserMedia avec énumération.
          </p>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={testRobustCamera}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
            >
              🎥 Démarrer caméra arrière (robuste)
            </button>
            
            {showControls && (
              <>
                <button
                  onClick={takePhoto}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
                >
                  📸 Prendre une photo
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
                >
                  ⏹️ Arrêter
                </button>
              </>
            )}
          </div>
          
          <div className={`p-4 rounded-lg border ${getStatusClass(status2.type)} mb-4`}>
            {status2.message}
          </div>
          
          {showVideo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl rounded-lg shadow-lg bg-black"
            />
          )}
          
          {capturedImage && (
            <img 
              src={capturedImage} 
              alt="Photo capturée" 
              className="max-w-full rounded-lg shadow-lg mt-4"
            />
          )}
        </div>

        {/* Bouton copier logs */}
        <div className="text-center mb-6">
          <button
            onClick={copyLogs}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
          >
            📋 Copier tous les logs
          </button>
        </div>

        {/* Logs */}
        <div className="bg-black rounded-xl p-6 max-h-96 overflow-y-auto">
          <div className="font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraTest;

/**
 * 📤 Service d'upload asynchrone des images vers l'API Bubble (Version Base64)
 * Gère l'envoi des images capturées vers l'endpoint configuré en format base64
 */

import { environment } from '@/config/environment';
import { interactionTracker } from '@/services/interactionTracker';

export interface UploadRequest {
  id: string;
  imageData: string; // Base64 dataURL ou Blob
  originalBlob?: Blob;
  pieceId: string;
  taskId?: string;
  etapeId?: string;  // ✅ AJOUTÉ: ID de l'étape depuis l'API
  flowType?: 'checkin' | 'checkout';  // ✅ AJOUTÉ: Type de flux
  referencePhotoId?: string;
  metadata?: {
    width: number;
    height: number;
    takenAt: string;
    checkId?: string;
    flowType?: 'checkin' | 'checkout';  // ✅ AJOUTÉ
  };
}

export interface UploadResult {
  success: boolean;
  uploadedUrl?: string;
  error?: string;
  requestId: string;
  uploadedAt: string;
}

export interface UploadStatus {
  requestId: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'retrying';
  progress?: number;
  uploadedUrl?: string;
  error?: string;
  attempts: number;
  lastAttemptAt: string;
}

class ImageUploadService {
  private uploadQueue: Map<string, UploadRequest> = new Map();
  private uploadStatus: Map<string, UploadStatus> = new Map();
  private uploadListeners: Set<(status: UploadStatus) => void> = new Set();

  /**
   * 📤 Ajoute une image à la queue d'upload
   */
  async queueUpload(request: UploadRequest): Promise<void> {
    if (!environment.UPLOAD_ENABLED) {
      console.log('📤 Upload désactivé, skip:', request.id);
      return;
    }

    console.log('📤 Ajout à la queue d\'upload:', {
      id: request.id,
      pieceId: request.pieceId,
      taskId: request.taskId,
      size: request.originalBlob?.size || 'unknown'
    });

    // Ajouter à la queue
    this.uploadQueue.set(request.id, request);
    
    // Initialiser le status
    const status: UploadStatus = {
      requestId: request.id,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: new Date().toISOString()
    };
    
    this.uploadStatus.set(request.id, status);
    this.notifyListeners(status);

    // Démarrer l'upload asynchrone
    this.processUpload(request.id);
  }

  /**
   * 🚀 Traite un upload individuel
   */
  private async processUpload(requestId: string): Promise<void> {
    const request = this.uploadQueue.get(requestId);
    const status = this.uploadStatus.get(requestId);
    
    if (!request || !status) {
      console.error('❌ Upload request/status introuvable:', requestId);
      return;
    }

    try {
      status.status = 'uploading';
      status.attempts++;
      status.lastAttemptAt = new Date().toISOString();
      this.notifyListeners(status);

      console.log(`%c📤 UPLOAD EN COURS (tentative ${status.attempts})`, 
        'color: #22c55e; font-weight: bold; font-size: 14px;', {
        photoId: requestId,
        endpoint: environment.IMAGE_UPLOAD_URL,
        pieceId: request.pieceId,
        taskId: request.taskId
      });

      // Préparer les données en base64
      const uploadData = await this.prepareUploadData(request);
      
      // Envoyer la requête
      const response = await this.sendUploadRequest(uploadData);
      
      if (response.success) {
        // Upload réussi
        status.status = 'success';
        status.uploadedUrl = response.uploadedUrl;
        console.log('%c✅ UPLOAD RÉUSSI !', 
          'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px; border-radius: 4px;', {
          photoId: requestId,
          uploadedUrl: response.uploadedUrl,
          pieceId: request.pieceId,
          taskId: request.taskId
        });
        
        // 🚀 SAUVEGARDE IMMÉDIATE - PAS D'ATTENTE !
        console.log('%c⚡ SAUVEGARDE IMMÉDIATE DÉCLENCHÉE', 
          'color: #ef4444; font-weight: bold; font-size: 16px; background: #fef2f2; padding: 4px 8px;', {
          photoId: requestId,
          url: response.uploadedUrl?.substring(0, 50) + '...'
        });
        
        // Sauvegarder en localStorage IMMÉDIATEMENT (synchrone)
        this.saveUploadedUrlImmediate(request, response.uploadedUrl!);
        
        // Sauvegarder en CheckID IMMÉDIATEMENT (asynchrone mais sans attendre)
        this.saveUploadedUrlToCheckIdImmediate(request, response.uploadedUrl!);
        
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }

    } catch (error) {
      console.error(`%c❌ ERREUR UPLOAD (tentative ${status.attempts})`, 
        'color: #ef4444; font-weight: bold; font-size: 14px; background: #fef2f2; padding: 4px 8px; border-radius: 4px;', {
        photoId: requestId,
        error: error.message,
        attempt: status.attempts,
        maxAttempts: environment.UPLOAD_RETRY_ATTEMPTS
      });
      
      // Gestion des tentatives de retry
      if (status.attempts < environment.UPLOAD_RETRY_ATTEMPTS) {
        status.status = 'retrying';
        status.error = error instanceof Error ? error.message : 'Erreur inconnue';
        this.notifyListeners(status);
        
        // Retry avec délai exponentiel
        const delay = Math.pow(2, status.attempts) * 1000;
        console.log(`%c🔄 RETRY dans ${delay}ms...`, 
          'color: #f59e0b; font-weight: bold; font-size: 14px;', {
          photoId: requestId,
          delayMs: delay,
          nextAttempt: status.attempts + 1
        });
        
        setTimeout(() => {
          this.processUpload(requestId);
        }, delay);
        
      } else {
        // Échec définitif
        status.status = 'error';
        status.error = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('❌ Upload définitivement échoué:', requestId);
      }
    }

    this.notifyListeners(status);
  }

  /**
   * 📦 Prépare les données JSON avec base64 pour l'upload
   */
  private async prepareUploadData(request: UploadRequest): Promise<object> {
    let base64Data: string;
    
    // Convertir en base64 selon le format source
    if (request.imageData.startsWith('data:')) {
      // Si c'est déjà un dataURL, extraire juste la partie base64
      base64Data = request.imageData.split(',')[1];
    } else if (request.originalBlob) {
      // Si on a un blob, le convertir en base64
      const dataUrl = await this.blobToDataURL(request.originalBlob);
      base64Data = dataUrl.split(',')[1];
    } else {
      throw new Error('Format d\'image non supporté');
    }

    // Préparer le payload JSON
    const payload = {
      base64: base64Data,
      filename: `photo_${request.id}.jpg`,
      contentType: 'image/jpeg',
      pieceId: request.pieceId,
      taskId: request.taskId,
      referencePhotoId: request.referencePhotoId,
      ...(request.metadata && request.metadata)
    };

    console.log('📦 Payload base64 préparé:', {
      requestId: request.id,
      base64Size: base64Data.length,
      filename: payload.filename,
      hasMetadata: !!request.metadata
    });

    return payload;
  }

  /**
   * 🌐 Envoie la requête d'upload à l'API (JSON avec base64)
   */
  private async sendUploadRequest(uploadData: object): Promise<{ success: boolean; uploadedUrl?: string; error?: string; }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), environment.UPLOAD_TIMEOUT);

    try {
      const response = await fetch(environment.IMAGE_UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Adapter la réponse selon le format attendu par votre API
      return {
        success: true,
        uploadedUrl: result.imgUrl || result.url || result.fileUrl
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout de upload dépassé');
      }
      
      throw error;
    }
  }

  /**
   * ⚡ Sauvegarde IMMÉDIATE en localStorage (synchrone)
   */
  private saveUploadedUrlImmediate(request: UploadRequest, uploadedUrl: string): void {
    try {
      const key = `uploaded_image_${request.id}`;
      const data = {
        id: request.id,
        uploadedUrl,
        pieceId: request.pieceId,
        taskId: request.taskId,
        referencePhotoId: request.referencePhotoId,
        uploadedAt: new Date().toISOString(),
        metadata: request.metadata,
        savedImmediately: true
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      console.log('%c⚡ URL SAUVÉE IMMÉDIATEMENT EN LOCAL', 
        'color: #22c55e; font-weight: bold; font-size: 14px; background: #dcfce7; padding: 4px 8px;', {
        id: request.id,
        url: uploadedUrl.substring(0, 50) + '...'
      });
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde IMMÉDIATE locale:', error);
    }
  }

  /**
   * ⚡ Sauvegarde IMMÉDIATE en CheckID (asynchrone mais fire-and-forget)
   */
  private saveUploadedUrlToCheckIdImmediate(request: UploadRequest, uploadedUrl: string): void {
    // Fire-and-forget : pas d'await, exécution immédiate en arrière-plan
    setTimeout(async () => {
      try {
        console.log('%c⚡ SAUVEGARDE CHECKID IMMÉDIATE DÉMARRÉE', 
          'color: #8b5cf6; font-weight: bold; font-size: 14px; background: #f3e8ff; padding: 4px 8px;', {
          imageId: request.id,
          uploadedUrl: uploadedUrl?.substring(0, 50) + '...'
        });

        // Sauvegarder comme une "photo prise" dans CheckID
        await interactionTracker.trackPhotoTaken({
          photoId: request.id,
          taskId: request.taskId || '',
          pieceId: request.pieceId,
          etapeId: request.etapeId,  // ✅ AJOUTÉ: Passer l'etapeID
          photoData: uploadedUrl,
          timestamp: new Date().toISOString(),
          validated: false,
          retakeCount: 0,
          metadata: {
            url: uploadedUrl,
            pieceId: request.pieceId,
            taskId: request.taskId,
            referencePhotoId: request.referencePhotoId,
            uploadedAt: new Date().toISOString(),
            savedImmediately: true,
            flowType: request.flowType,  // ✅ AJOUTÉ: Stocker le type de flux
            ...request.metadata
          }
        });
        
        console.log('%c⚡ CHECKID SAUVÉ IMMÉDIATEMENT !', 
          'color: #22c55e; font-weight: bold; font-size: 14px; background: #dcfce7; padding: 4px 8px;', {
          photoId: request.id
        });
      } catch (error) {
        console.error('❌ CheckID: Erreur sauvegarde IMMÉDIATE:', error);
      }
    }, 0); // Exécution immédiate dans la prochaine boucle d'événements
  }

  /**
   * 💾 Sauvegarde l'URL uploadée en local (ancienne méthode)
   */
  private async saveUploadedUrl(request: UploadRequest, uploadedUrl: string): Promise<void> {
    try {
      const key = `uploaded_image_${request.id}`;
      const data = {
        id: request.id,
        uploadedUrl,
        pieceId: request.pieceId,
        taskId: request.taskId,
        referencePhotoId: request.referencePhotoId,
        uploadedAt: new Date().toISOString(),
        metadata: request.metadata
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      console.log('💾 URL sauvegardée en local:', { id: request.id, url: uploadedUrl });
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde URL locale:', error);
    }
  }

  /**
   * 💾 Sauvegarde l'URL uploadée dans CheckID
   */
  private async saveUploadedUrlToCheckId(request: UploadRequest, uploadedUrl: string) {
    try {
      console.log('%c🗄️ AJOUT URL AU CHECKID', 
        'color: #8b5cf6; font-weight: bold; font-size: 14px; background: #f3e8ff; padding: 4px 8px; border-radius: 4px;', {
        imageId: request.id,
        pieceId: request.pieceId,
        taskId: request.taskId,
        uploadedUrl: uploadedUrl?.substring(0, 50) + '...'
      });

      // Sauvegarder comme une "photo prise" dans CheckID
      await interactionTracker.trackPhotoTaken({
        photoId: request.id,
        taskId: request.taskId || '',
        pieceId: request.pieceId,
        etapeId: request.etapeId,  // ✅ AJOUTÉ: Passer l'etapeID
        photoData: uploadedUrl,
        timestamp: new Date().toISOString(),
        validated: false,
        retakeCount: 0,
        metadata: {
          url: uploadedUrl,
          pieceId: request.pieceId,
          taskId: request.taskId,
          referencePhotoId: request.referencePhotoId,
          uploadedAt: new Date().toISOString(),
          source: 'imageUploadService',
          flowType: request.flowType,  // ✅ AJOUTÉ: Stocker le type de flux
          ...request.metadata
        }
      });

      console.log('%c✅ CHECKID SAUVEGARDÉ !', 
        'color: #22c55e; font-weight: bold; font-size: 16px; background: #dcfce7; padding: 4px 8px; border-radius: 4px;', {
        photoId: request.id,
        success: true
      });
      
    } catch (error) {
      console.error('❌ CheckID: Erreur sauvegarde URL:', error);
    }
  }

  /**
   * 🔍 Récupère l'URL uploadée pour une image
   */
  getUploadedUrl(imageId: string): string | null {
    try {
      const key = `uploaded_image_${imageId}`;
      const data = localStorage.getItem(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.uploadedUrl;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération URL locale:', error);
      return null;
    }
  }

  /**
   * 🔍 Récupère les URLs uploadées depuis CheckID
   */
  async getUploadedUrlsFromCheckId(checkId: string): Promise<Record<string, string>> {
    try {
      console.log('📥 CheckID: Récupération URLs uploadées:', checkId);
      
      const { checkSessionManager } = await import('@/services/checkSessionManager');
      const session = await checkSessionManager.getCheckSession(checkId);
      
      if (!session?.progress?.interactions?.photosTaken) {
        console.log('📥 CheckID: Pas de photos trouvées');
        return {};
      }

      const urlsMap: Record<string, string> = {};
      const { photosTaken } = session.progress.interactions;

      Object.entries(photosTaken).forEach(([photoId, photoDataArray]) => {
        // photoDataArray est un array, prendre le dernier élément
        const photoData = Array.isArray(photoDataArray) 
          ? photoDataArray[photoDataArray.length - 1] 
          : photoDataArray;
          
        if (photoData?.url) {
          urlsMap[photoId] = photoData.url;
        }
      });

      console.log('📥 CheckID: URLs récupérées:', {
        count: Object.keys(urlsMap).length,
        urls: urlsMap
      });

      return urlsMap;
      
    } catch (error) {
      console.error('❌ CheckID: Erreur récupération URLs:', error);
      return {};
    }
  }

  /**
   * 🔄 Restaure les URLs uploadées depuis CheckID vers localStorage
   */
  async restoreUrlsFromCheckId(checkId: string) {
    try {
      console.log('🔄 CheckID: Restauration URLs vers localStorage');
      
      const urlsMap = await this.getUploadedUrlsFromCheckId(checkId);
      let restoredCount = 0;

      Object.entries(urlsMap).forEach(([photoId, url]) => {
        const key = `uploaded_image_${photoId}`;
        const data = {
          uploadedUrl: url,
          uploadedAt: new Date().toISOString(),
          source: 'CheckID_restore'
        };
        
        localStorage.setItem(key, JSON.stringify(data));
        restoredCount++;
      });

      console.log('✅ CheckID: URLs restaurées:', {
        restoredCount,
        totalAvailable: Object.keys(urlsMap).length
      });
      
    } catch (error) {
      console.error('❌ CheckID: Erreur restauration URLs:', error);
    }
  }

  /**
   * 📊 Obtient le status d'upload
   */
  getUploadStatus(requestId: string): UploadStatus | null {
    return this.uploadStatus.get(requestId) || null;
  }

  /**
   * 👂 S'abonne aux changements de status
   */
  onStatusChange(listener: (status: UploadStatus) => void): () => void {
    this.uploadListeners.add(listener);
    
    // Retourner la fonction de désabonnement
    return () => {
      this.uploadListeners.delete(listener);
    };
  }

  /**
   * 📢 Notifie tous les listeners
   */
  private notifyListeners(status: UploadStatus): void {
    this.uploadListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ Erreur dans listener upload:', error);
      }
    });
  }

  /**
   * 🔄 Convertit un Blob en dataURL
   */
  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 🧹 Nettoie les uploads terminés
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24h
    
    for (const [requestId, status] of this.uploadStatus.entries()) {
      const age = now - new Date(status.lastAttemptAt).getTime();
      
      if (age > maxAge && (status.status === 'success' || status.status === 'error')) {
        this.uploadQueue.delete(requestId);
        this.uploadStatus.delete(requestId);
        console.log('🧹 Cleanup upload ancien:', requestId);
      }
    }
  }
}

// Instance singleton
export const imageUploadService = new ImageUploadService();

// Nettoyage automatique toutes les heures
setInterval(() => {
  imageUploadService.cleanup();
}, 60 * 60 * 1000);
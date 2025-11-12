export interface CapturedPhoto {
  id: string;
  pieceId: string;
  referencePhotoId: string;
  blob: Blob;
  dataUrl: string;
  takenAt: string;
  meta: {
    width: number;
    height: number;
    orientation?: number;
    // 🔍 Blur detection metadata
    isBlurry?: boolean;
    blurScore?: number;
    blurStats?: {
      maxLaplacian: number;
      pixelCount: number;
      threshold: number;
      minVariance: number;
      confidence: number;
    };
  };
}

export interface CameraSettings {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
}

export interface PhotoCaptureState {
  isOpen: boolean;
  currentRefIndex: number;
  capturedPhotos: Map<string, CapturedPhoto>;
  ghostOpacity: number;
  cameraStream: MediaStream | null;
  isCapturing: boolean;
  error: string | null;
}

export interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  referencePhotos: Array<{
    tache_id: string;
    etapeID?: string;  // ✅ AJOUTÉ: ID de l'étape depuis l'API
    url: string;
    expected_orientation: 'portrait' | 'paysage';
    overlay_enabled: boolean;
  }>;
  onPhotosCaptured: (capturedPhotos: CapturedPhoto[]) => void;
  pieceName: string;
  pieceId: string;
  flowType?: 'checkin' | 'checkout';  // ✅ AJOUTÉ: Type de flux
}

export interface UseCameraResult {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export interface UsePhotoCaptureResult {
  capturedPhotos: Map<string, CapturedPhoto>;
  capturePhoto: (video: HTMLVideoElement, referenceId: string) => Promise<CapturedPhoto>;
  removePhoto: (photoId: string) => void;
  clearAllPhotos: () => void;
  getCapturedPhotoForReference: (referenceId: string) => CapturedPhoto | null;
}



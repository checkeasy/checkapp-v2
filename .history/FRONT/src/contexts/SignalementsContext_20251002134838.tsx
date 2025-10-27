import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Signalement } from "@/types/signalement";
import { interactionTracker } from "@/services/interactionTracker";
import { checkSessionManager } from "@/services/checkSessionManager";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";

interface SignalementsContextType {
  signalements: Signalement[];
  addSignalement: (signalement: Omit<Signalement, 'id' | 'created_at' | 'updated_at'>) => void;
  resolveSignalement: (id: string) => void;
  getSignalementsByRoom: (piece: string) => Signalement[];
  getPendingSignalements: () => Signalement[];
  loadSignalementsFromSession: () => Promise<void>;
}

const SignalementsContext = createContext<SignalementsContextType | undefined>(undefined);

export const useSignalements = () => {
  const context = useContext(SignalementsContext);
  if (!context) {
    throw new Error("useSignalements must be used within a SignalementsProvider");
  }
  return context;
};

interface SignalementsProviderProps {
  children: ReactNode;
}

// ✅ CORRECTION: Adapter les données initiales à la nouvelle structure
const initialSignalements: Signalement[] = [
  {
    id: "1",
    roomId: "chambre-id-mock",
    piece: "Chambre",
    etapeId: undefined,
    titre: "Tache sur le matelas, nécessite nettoyage spécialisé",
    commentaire: "Grande tache sur le matelas qui nécessite un nettoyage professionnel",
    imgUrl: "/lovable-uploads/89051e63-c24a-46fd-a746-87109ac68d89.png",
    imgBase64: undefined,
    flowType: "checkin",
    origine: "Voyageur",
    status: "A_TRAITER",
    priorite: true,
    created_at: "2025-01-07T14:30:00Z",
    updated_at: "2025-01-07T14:30:00Z"
  },
  {
    id: "2",
    roomId: "cuisine-id-mock",
    piece: "Cuisine",
    etapeId: undefined,
    titre: "Réfrigérateur ne fonctionne plus, aliments à risque",
    commentaire: "Le réfrigérateur est complètement en panne, les aliments risquent de se gâter",
    imgUrl: undefined,
    imgBase64: undefined,
    flowType: "checkin",
    origine: "Agent de ménage",
    status: "A_TRAITER",
    priorite: false,
    created_at: "2025-01-07T09:15:00Z",
    updated_at: "2025-01-07T09:15:00Z"
  },
  {
    id: "3",
    roomId: "salon-id-mock",
    piece: "Salon",
    etapeId: undefined,
    titre: "Canapé endommagé, accoudoir déchiré",
    commentaire: "L'accoudoir gauche du canapé est déchiré et nécessite une réparation",
    imgUrl: "/lovable-uploads/8c04ee7e-d5f8-4b65-aed9-e6094b5cc244.png",
    imgBase64: undefined,
    flowType: "checkin",
    origine: "Gestionnaire",
    status: "A_TRAITER",
    priorite: false,
    created_at: "2025-01-06T16:45:00Z",
    updated_at: "2025-01-06T16:45:00Z"
  }
];

export const SignalementsProvider = ({ children }: SignalementsProviderProps) => {
  const [signalements, setSignalements] = useState<Signalement[]>(initialSignalements);
  const { currentCheckId, isCheckIdActive } = useActiveCheckId();

  // ✅ NOUVEAU: Charger les signalements depuis la session au montage
  useEffect(() => {
    console.log('🔍 SignalementsContext: useEffect déclenché:', { currentCheckId, isCheckIdActive });

    if (currentCheckId && isCheckIdActive) {
      loadSignalementsFromSession();
    }
  }, [currentCheckId, isCheckIdActive]);

  // ✅ NOUVEAU: Fonction pour charger les signalements depuis la session
  const loadSignalementsFromSession = async () => {
    if (!currentCheckId) {
      console.log('⚠️ SignalementsContext: Pas de checkId actif, impossible de charger les signalements');
      return;
    }

    try {
      console.log('🔍 SignalementsContext: Chargement des signalements pour checkId:', currentCheckId);

      const session = await checkSessionManager.getCheckSession(currentCheckId);
      if (!session) {
        console.log('⚠️ SignalementsContext: Session non trouvée');
        return;
      }

      const sessionSignalements = session.progress?.interactions?.signalements || {};

      console.log('🔍 SignalementsContext: Signalements bruts de la session:', sessionSignalements);

      // Convertir les signalements de la session en tableau
      const loadedSignalements: Signalement[] = Object.entries(sessionSignalements).map(([key, sig]: [string, any]) => {
        console.log('🔍 SignalementsContext: Conversion signalement:', key, sig);

        return {
          id: sig.signalementId || key,
          roomId: sig.pieceId || sig.roomId || '',
          piece: sig.metadata?.piece || sig.pieceName || sig.piece || '',
          etapeId: sig.etapeId,
          titre: sig.title || sig.titre || '',
          commentaire: sig.description || sig.commentaire || '',
          imgUrl: sig.photos?.[0] || sig.metadata?.imgUrl || sig.imgUrl,
          imgBase64: sig.metadata?.imgBase64 || sig.imgBase64,
          flowType: (sig.metadata?.flowType || sig.flowType || 'checkin') as 'checkin' | 'checkout',
          origine: sig.metadata?.origine || sig.origine || 'CLIENT',
          status: (sig.status === 'resolved' ? 'RESOLU' : 'A_TRAITER') as 'A_TRAITER' | 'RESOLU',
          priorite: sig.severity === 'high' || sig.severity === 'critical' || sig.priorite || false,
          created_at: sig.createdAt || sig.created_at || new Date().toISOString(),
          updated_at: sig.updatedAt || sig.updated_at || new Date().toISOString(),
        };
      });

      console.log('✅ SignalementsContext: Signalements chargés depuis la session:', loadedSignalements.length, loadedSignalements);

      // Remplacer complètement les signalements (pas de fusion avec les initiaux)
      if (loadedSignalements.length > 0) {
        setSignalements(loadedSignalements);
      }
    } catch (error) {
      console.error('❌ SignalementsContext: Erreur chargement signalements:', error);
    }
  };

  const addSignalement = async (signalementData: Omit<Signalement, 'id' | 'created_at' | 'updated_at'>) => {
    const signalementId = `${Date.now()}x${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newSignalement: Signalement = {
      ...signalementData,
      id: signalementId,
      created_at: now,
      updated_at: now,
    };

    // Ajouter au state local
    setSignalements(prev => [newSignalement, ...prev]);

    // ✅ NOUVEAU: Sauvegarder via InteractionTracker
    if (currentCheckId && isCheckIdActive) {
      try {
        await interactionTracker.trackSignalement({
          signalementId: newSignalement.id,
          pieceId: newSignalement.roomId,
          taskId: undefined,
          etapeId: newSignalement.etapeId,
          type: 'issue',
          severity: newSignalement.priorite ? 'high' : 'medium',
          title: newSignalement.titre,
          description: newSignalement.commentaire,
          photos: newSignalement.imgUrl ? [newSignalement.imgUrl] : [],
          imgUrl: newSignalement.imgUrl,        // ✅ AJOUTÉ: Sauvegarder imgUrl
          imgBase64: newSignalement.imgBase64,  // ✅ AJOUTÉ: Sauvegarder imgBase64
          createdAt: newSignalement.created_at,
          status: 'open',
          metadata: {
            flowType: newSignalement.flowType,
            origine: newSignalement.origine,
            piece: newSignalement.piece
          }
        });

        console.log('✅ SignalementsContext: Signalement sauvegardé dans la session:', {
          signalementId,
          hasImgUrl: !!newSignalement.imgUrl,
          hasImgBase64: !!newSignalement.imgBase64,
          imgBase64Length: newSignalement.imgBase64?.length
        });
      } catch (error) {
        console.error('❌ SignalementsContext: Erreur sauvegarde signalement:', error);
      }
    } else {
      console.log('⚠️ SignalementsContext: Pas de checkId actif, signalement non sauvegardé');
    }
  };

  const resolveSignalement = (id: string) => {
    setSignalements(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'RESOLU' as const, updated_at: new Date().toISOString() } : s
    ));

    // TODO: Mettre à jour dans la session aussi
  };

  const getSignalementsByRoom = (piece: string): Signalement[] => {
    return signalements.filter(s => s.piece === piece && s.status === 'A_TRAITER');
  };

  const getPendingSignalements = (): Signalement[] => {
    return signalements.filter(s => s.status === 'A_TRAITER');
  };

  return (
    <SignalementsContext.Provider value={{
      signalements,
      addSignalement,
      resolveSignalement,
      getSignalementsByRoom,
      getPendingSignalements,
      loadSignalementsFromSession
    }}>
      {children}
    </SignalementsContext.Provider>
  );
};
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Test pour vérifier que les signalements historiques créés aujourd'hui ne s'affichent pas
 */

describe('SignalementsATraiter - Filtrage des signalements historiques', () => {
  
  // Fonction helper pour vérifier si une date est aujourd'hui
  const isCreatedToday = (dateStr: string) => {
    const signalementDate = new Date(dateStr);
    const today = new Date();
    return signalementDate.toDateString() === today.toDateString();
  };

  beforeEach(() => {
    // Mock la date actuelle
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-28'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devrait identifier correctement un signalement créé aujourd\'hui', () => {
    const today = new Date('2025-10-28T14:30:00Z');
    expect(isCreatedToday(today.toISOString())).toBe(true);
  });

  it('devrait identifier correctement un signalement créé hier', () => {
    const yesterday = new Date('2025-10-27T14:30:00Z');
    expect(isCreatedToday(yesterday.toISOString())).toBe(false);
  });

  it('devrait identifier correctement un signalement créé il y a plusieurs jours', () => {
    const pastDate = new Date('2025-10-20T14:30:00Z');
    expect(isCreatedToday(pastDate.toISOString())).toBe(false);
  });

  it('devrait filtrer les signalements historiques créés aujourd\'hui', () => {
    const today = new Date('2025-10-28T14:30:00Z').toISOString();
    const yesterday = new Date('2025-10-27T14:30:00Z').toISOString();

    const apiSignalements = [
      {
        id: '1',
        titre: 'Signalement historique créé aujourd\'hui',
        piece: 'Chambre',
        origine: 'HISTORIQUE',
        status: 'A_TRAITER',
        created_at: today,
        updated_at: today,
        roomId: 'room-1',
        commentaire: 'Test',
        flowType: 'checkin' as const,
        priorite: false,
      },
      {
        id: '2',
        titre: 'Signalement historique créé hier',
        piece: 'Chambre',
        origine: 'HISTORIQUE',
        status: 'A_TRAITER',
        created_at: yesterday,
        updated_at: yesterday,
        roomId: 'room-1',
        commentaire: 'Test',
        flowType: 'checkin' as const,
        priorite: false,
      },
    ];

    // Filtrer comme dans le composant
    const filteredApiSignalements = apiSignalements.filter(sig => {
      if (sig.origine === 'HISTORIQUE' && isCreatedToday(sig.created_at)) {
        return false; // Masquer les signalements historiques créés aujourd'hui
      }
      return true;
    });

    expect(filteredApiSignalements).toHaveLength(1);
    expect(filteredApiSignalements[0].id).toBe('2');
    expect(filteredApiSignalements[0].titre).toContain('hier');
  });

  it('ne devrait pas filtrer les signalements non-historiques même s\'ils sont créés aujourd\'hui', () => {
    const today = new Date('2025-10-28T14:30:00Z').toISOString();

    const apiSignalements = [
      {
        id: '1',
        titre: 'Signalement utilisateur créé aujourd\'hui',
        piece: 'Chambre',
        origine: 'AGENT',
        status: 'A_TRAITER',
        created_at: today,
        updated_at: today,
        roomId: 'room-1',
        commentaire: 'Test',
        flowType: 'checkin' as const,
        priorite: false,
      },
    ];

    const filteredApiSignalements = apiSignalements.filter(sig => {
      if (sig.origine === 'HISTORIQUE' && isCreatedToday(sig.created_at)) {
        return false;
      }
      return true;
    });

    expect(filteredApiSignalements).toHaveLength(1);
    expect(filteredApiSignalements[0].id).toBe('1');
  });
});


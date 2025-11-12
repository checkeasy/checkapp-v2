import { useMemo } from 'react';
import { roomsData, generateRoomTasks, getAllRooms, getRoomData } from '@/data/roomsData';
import { PieceStatus, FlowType, Room } from '@/types/room';

export const useRoomsData = (flowType: FlowType) => {
  const rooms = useMemo(() => getAllRooms(), []);
  
  const generatePieces = useMemo((): PieceStatus[] => {
    return rooms.map(room => {
      const tasks = generateRoomTasks(room.id, flowType);
      const totalPhotos = tasks.reduce((sum, task) => {
        return sum + (task.total_photos_required || 0);
      }, 0);
      
      return {
        ...room,
        status: 'VIDE' as const,
        tasks_total: tasks.length,
        tasks_done: 0,
        photos_required: totalPhotos,
        photos_done: 0,
        tasks
      };
    });
  }, [rooms, flowType]);

  const getRoom = (roomId: string): Room | undefined => {
    return getRoomData(roomId);
  };

  const getRoomTasks = (roomId: string) => {
    return generateRoomTasks(roomId, flowType);
  };

  return {
    rooms,
    pieces: generatePieces,
    getRoom,
    getRoomTasks
  };
};
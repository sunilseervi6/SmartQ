import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (serverUrl = 'http://localhost:5000') => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [serverUrl]);

  const joinRoom = (roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
    }
  };

  const onQueueUpdate = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('queue-updated', callback);
    }
  };

  const offQueueUpdate = () => {
    if (socketRef.current) {
      socketRef.current.off('queue-updated');
    }
  };

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    onQueueUpdate,
    offQueueUpdate
  };
};

export default useSocket;

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Singleton socket instance - shared across all components
let socketInstance = null;
let socketRefCount = 0;

function getSocket(serverUrl) {
  if (!socketInstance) {
    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socketInstance;
}

const useSocket = (serverUrl = 'http://localhost:5000') => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket(serverUrl);
    socketRefCount++;

    // Join user's personal notification room
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      socketRef.current.emit('join-user-room', user.id);
    }

    return () => {
      socketRefCount--;
      if (socketRefCount <= 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        socketRefCount = 0;
      }
    };
  }, [serverUrl]);

  const joinRoom = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId);
    }
  }, []);

  const leaveRoom = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
    }
  }, []);

  const onQueueUpdate = useCallback((callback) => {
    if (socketRef.current) {
      // Remove previous listeners first to avoid stacking
      socketRef.current.off('queue-updated');
      socketRef.current.on('queue-updated', callback);
    }
  }, []);

  const offQueueUpdate = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('queue-updated');
    }
  }, []);

  const onNotification = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.off('notification-received');
      socketRef.current.on('notification-received', callback);
    }
  }, []);

  const offNotification = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('notification-received');
    }
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    onQueueUpdate,
    offQueueUpdate,
    onNotification,
    offNotification
  };
};

export default useSocket;

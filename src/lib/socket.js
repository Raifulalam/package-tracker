import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function joinSocketPresence(user) {
  if (!user?.id && !user?._id) return;

  const activeSocket = getSocket();
  activeSocket.emit('presence:join', {
    userId: user.id || user._id,
    role: user.role,
  });
}

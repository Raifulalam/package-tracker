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

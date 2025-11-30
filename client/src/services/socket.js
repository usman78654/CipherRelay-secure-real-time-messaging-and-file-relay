/**
 * Socket.io client instance used across the app.
 * Ensures a single connection throughout the app lifecycle.
 */

import { io } from "socket.io-client";
import { AuthService } from "./authService";
import config from "../config";

let socket = null;
export function connectSocket() {
  const token = AuthService.getToken();
  if (socket && socket.connected) return socket;

  const serverUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SERVER_URL) ? process.env.REACT_APP_SERVER_URL : config.SOCKET_URL;
  const opts = { transports: ['websocket'], autoConnect: true, auth: token ? { token } : undefined };

  socket = io(serverUrl, opts);

  socket.on("connect_error", (err) => {
    console.warn("Socket connect_error:", err && err.message ? err.message : err);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  if (!socket) return connectSocket();
  return socket;
}

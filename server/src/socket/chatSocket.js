import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { logEvent } from "../services/logger.js";
import { verifyAndUpdateSeq } from "../services/seqCounterService.js";
import Message from "../models/Message.js";
import FileModel from '../models/File.js';
import { sockets } from '../services/telemetry.js';

/**
 * Initialize Socket.IO chat handlers.
 * Expects a Socket.IO `io` instance.
 */
export default function initChatSocket(io) {
  // Authenticate sockets using handshake auth.token or Authorization header
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token
        ? socket.handshake.auth.token
        : socket.handshake.headers && socket.handshake.headers.authorization
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/, "")
          : null;

      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.user = { id: decoded.sub, username: decoded.username };
      return next();
    } catch (err) {
      // Do not accept invalid tokens
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    sockets.inc();
    let windowStart = Date.now();
    let messagesInWindow = 0;
    const userId = socket.user ? socket.user.id : null;
    const username = socket.user ? socket.user.username : null;
    logEvent("socket-connection", { sid: socket.id, user: userId, username }, userId);

    // Join a username-based room so we can address by username
    if (username) {
      socket.join(`user:${username}`);
    }

    socket.on("send-encrypted-message", async (packet) => {
      // packet: { chatId, sender, receiver, ciphertext, iv, authTag, metadata }
      // OR file message: { chatId, sender, receiver, isFile, fileId, fileName, fileSize, fileType, metadata }
      try {
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); messagesInWindow = 0; }
        if (++messagesInWindow > 120) return socket.emit('error', { error: 'Too many messages.' });
        if (packet?.sender !== username) return socket.emit('error', { error: 'Sender must match authenticated user.' });
        // Validate basic packet structure
        if (!packet || !packet.chatId || !packet.sender || !packet.receiver) {
          await logEvent("socket-message-invalid", { packet }, userId);
          return socket.emit("error", { error: "Invalid message format" });
        }

        // Check if it's a file message
        if (packet.isFile || packet.fileId) {
          const file = await FileModel.findOne({ _id: packet.fileId, owner: username, receiver: packet.receiver });
          if (!file) return socket.emit('error', { error: 'File access denied.' });
          // File message - no ciphertext/iv required
          if (!packet.fileId) {
            await logEvent("socket-file-message-invalid", { packet }, userId);
            return socket.emit("error", { error: "File message missing fileId" });
          }

          // Save file message reference
          const msgDoc = new Message({
            chatId: packet.chatId,
            sender: packet.sender,
            receiver: packet.receiver,
            isFile: true,
            fileId: packet.fileId,
            fileName: packet.fileName,
            fileSize: packet.fileSize,
            fileType: packet.fileType,
            metadata: packet.metadata || {}
          });

          await msgDoc.save();
          await logEvent("socket-file-message-stored", { chatId: packet.chatId, sender: packet.sender, receiver: packet.receiver, fileId: packet.fileId }, userId || packet.sender);

          // Relay to receiver
          const room = `user:${packet.receiver}`;
          io.to(room).emit("receive-encrypted-message", {
            chatId: packet.chatId,
            sender: packet.sender,
            isFile: true,
            fileId: packet.fileId,
            fileName: packet.fileName,
            fileSize: packet.fileSize,
            fileType: packet.fileType,
            metadata: packet.metadata || {}
          });

          socket.emit("message-stored", { id: msgDoc._id.toString(), chatId: packet.chatId });
          return;
        }

        // Regular text message - validate encryption fields
        if (!packet.ciphertext || !packet.iv) {
          await logEvent("socket-message-invalid", { packet }, userId);
          return socket.emit("error", { error: "Invalid message format" });
        }

        // If a sequence number is provided, verify it against DB-backed seq counter
        if (packet.metadata && (typeof packet.metadata.seqNum === 'number' || typeof packet.metadata.seq === 'number')) {
          const incomingSeq = typeof packet.metadata.seqNum === 'number' ? packet.metadata.seqNum : packet.metadata.seq;
          const seqRes = await verifyAndUpdateSeq({ ownerId: packet.receiver, chatId: packet.chatId, incomingSeq });
          if (!seqRes.ok) {
            await logEvent('socket-message-replay', { chatId: packet.chatId, sender: packet.sender, receiver: packet.receiver, incomingSeq, seqRes }, userId || packet.sender);
            return socket.emit('error', { error: 'Replay detected (sequence number too low).' });
          }
        }

        // Save message server-side (ciphertext + metadata only)
        const msgDoc = new Message({
          chatId: packet.chatId,
          sender: packet.sender,
          receiver: packet.receiver,
          ciphertext: packet.ciphertext,
          iv: packet.iv,
          authTag: packet.authTag,
          metadata: packet.metadata || {}
        });

        await msgDoc.save();
        await logEvent("socket-message-stored", { chatId: packet.chatId, sender: packet.sender, receiver: packet.receiver }, userId || packet.sender);

        // Relay to receiver's room if connected
        const room = `user:${packet.receiver}`;
        io.to(room).emit("receive-encrypted-message", {
          chatId: packet.chatId,
          sender: packet.sender,
          ciphertext: packet.ciphertext,
          iv: packet.iv,
          authTag: packet.authTag,
          metadata: packet.metadata || {}
        });

        // Acknowledge sender
        socket.emit("message-stored", { id: msgDoc._id.toString(), chatId: packet.chatId });
      } catch (err) {
        await logEvent("socket-message-error", { error: err.message, packet }, userId);
        socket.emit("error", { error: "Failed to process message" });
      }
    });

    socket.on("disconnect", (reason) => {
      sockets.dec();
      logEvent("socket-disconnect", { sid: socket.id, reason }, userId);
    });
  });
}

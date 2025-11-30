/**
 * Custom hook to manage chat socket connection.
 * No encryption happens here — only communication events.
 */

import { useEffect, useState } from "react";
import { getSocket, connectSocket } from "../services/socket";

const useChatSocket = (currentUser) => {
  const [incomingMessage, setIncomingMessage] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Ensure socket connected with token
    const socket = connectSocket();

    // Listen for incoming encrypted messages
    socket.on("receive-encrypted-message", (msg) => {
      // msg = { chatId, sender, ciphertext, iv, authTag, metadata }
      console.log('📨 Socket received message:', { chatId: msg.chatId, sender: msg.sender, isFile: msg.isFile });
      // Create new object each time to trigger React state update
      setIncomingMessage({ ...msg, _timestamp: Date.now() });
    });

    // Listen for acknowledgements or errors
    socket.on("message-stored", (info) => {
      // Optionally handle local UI ack
      console.debug("message stored ack:", info);
    });

    socket.on("error", (err) => {
      console.error("socket error:", err);
    });

    return () => {
      const s = getSocket();
      s.off("receive-encrypted-message");
      s.off("message-stored");
      s.off("error");
    };
  }, [currentUser]);

  const sendMessage = (payload) => {
    const socket = getSocket();
    socket.emit("send-encrypted-message", payload);
  };

  return { incomingMessage, sendMessage };
};

export default useChatSocket;

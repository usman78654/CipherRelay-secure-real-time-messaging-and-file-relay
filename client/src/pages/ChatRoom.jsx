import { useEffect, useMemo, useState } from 'react';
import ChatWindow from '../components/Chat/ChatWindow';
import useChatSocket from '../hooks/useChatSocket';
import { fetchMessages } from '../api/chatAPI';
import { uploadEncryptedFile } from '../api/fileAPI';
import { encryptMessage } from '../crypto/encryption/encryptMessage';
import { decryptMessage } from '../crypto/encryption/decryptMessage';
import { encryptFile } from '../crypto/encryption/encryptFile';
import { deriveConversationKey } from '../crypto/KeyExchange/conversationKey';

const usernameOf = user => user?.username || user?.user?.username;
const timeOf = msg => new Date(msg.createdAt || msg.timestamp || (msg.metadata?.timestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatRoom({ user, selectedContact }) {
  const { incomingMessage, sendMessage } = useChatSocket(user);
  const localUsername = usernameOf(user);
  const peerUsername = selectedContact?.name;
  const chatId = useMemo(() => localUsername && peerUsername ? `chat_${[localUsername, peerUsername].sort().join('_')}` : null, [localUsername, peerUsername]);
  const [sessionKey, setSessionKey] = useState(null);
  const [fingerprint, setFingerprint] = useState('');
  const [keyError, setKeyError] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setSessionKey(null);
    setKeyError('');
    if (!localUsername || !peerUsername) return undefined;
    deriveConversationKey({ localUsername, peerUsername, peerIdentityKeys: selectedContact.identityKeys })
      .then(result => { if (active) { setSessionKey(result.key); setFingerprint(result.fingerprint); } })
      .catch(error => { if (active) setKeyError(error.message); });
    return () => { active = false; };
  }, [localUsername, peerUsername, selectedContact?.identityKeys]);

  useEffect(() => {
    let active = true;
    if (!chatId || !sessionKey) { setMessages([]); setLoading(false); return undefined; }
    setLoading(true);
    fetchMessages(chatId).then(async response => {
      const decoded = await Promise.all((response.data || []).map(async msg => {
        if (msg.isFile || msg.fileId) return { ...msg, content: `File: ${msg.fileName || 'encrypted file'}`, isSender: msg.sender === localUsername, timestamp: timeOf(msg) };
        try {
          const content = await decryptMessage(msg, sessionKey, { chatId, sender: msg.sender, receiver: msg.receiver });
          return { ...msg, content, isSender: msg.sender === localUsername, timestamp: timeOf(msg) };
        } catch { return { ...msg, content: '[Authentication or decryption failed]', isSender: msg.sender === localUsername, timestamp: timeOf(msg) }; }
      }));
      if (active) setMessages(decoded);
    }).catch(() => { if (active) setMessages([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [chatId, sessionKey, localUsername]);

  useEffect(() => {
    if (!incomingMessage || !sessionKey || incomingMessage.chatId !== chatId) return;
    if (incomingMessage.isFile || incomingMessage.fileId) {
      setMessages(current => [...current, { ...incomingMessage, content: `File: ${incomingMessage.fileName || 'encrypted file'}`, isSender: false, timestamp: timeOf(incomingMessage) }]);
      return;
    }
    decryptMessage(incomingMessage, sessionKey, { chatId, sender: incomingMessage.sender, receiver: localUsername })
      .then(content => setMessages(current => [...current, { ...incomingMessage, content, isSender: false, timestamp: timeOf(incomingMessage) }]))
      .catch(() => setMessages(current => [...current, { ...incomingMessage, content: '[Authentication or decryption failed]', isSender: false, timestamp: timeOf(incomingMessage) }]));
  }, [incomingMessage, sessionKey, chatId, localUsername]);

  const handleSendText = async text => {
    if (!text.trim() || !sessionKey) return;
    const context = { chatId, sender: localUsername, receiver: peerUsername };
    const encrypted = await encryptMessage(text, sessionKey, context);
    sendMessage({ ...context, ...encrypted, metadata: { timestamp: Math.floor(Date.now() / 1000), nonce: crypto.randomUUID() } });
    setMessages(current => [...current, { content: text, isSender: true, timestamp: timeOf({ timestamp: new Date() }) }]);
  };

  const handleSendFile = async file => {
    if (!file || !sessionKey) return;
    const encrypted = await encryptFile(file, sessionKey);
    const response = await uploadEncryptedFile({ owner: localUsername, receiver: peerUsername, fileName: file.name, fileSize: file.size, fileType: file.type, ...encrypted, metadata: { ...encrypted.metadata, timestamp: Math.floor(Date.now() / 1000), nonce: crypto.randomUUID() } });
    const packet = { chatId, sender: localUsername, receiver: peerUsername, fileId: response.data.fileId, fileName: file.name, fileSize: file.size, fileType: file.type, isFile: true, metadata: { timestamp: Math.floor(Date.now() / 1000), nonce: crypto.randomUUID() } };
    sendMessage(packet);
    setMessages(current => [...current, { ...packet, content: `File: ${file.name}`, isSender: true, timestamp: timeOf({ timestamp: new Date() }) }]);
  };

  return <div className="page chatroom-page">
    {keyError && <div role="alert" style={{ padding: 12, background: '#f8d7da', color: '#842029' }}>{keyError}</div>}
    {sessionKey && <div style={{ padding: '6px 16px', background: '#e7f5ec', color: '#075e54', fontSize: 12 }}>Peer key pinned · fingerprint {fingerprint.slice(0, 16)}…</div>}
    <ChatWindow selectedContact={selectedContact} messages={messages} onSendMessage={handleSendText} onSendFile={handleSendFile} loading={loading} sessionKey={sessionKey} />
  </div>;
}

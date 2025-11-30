import { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import FileAttachment from "./FileAttachment";
import "../../styles/chat.css";

const ChatWindow = ({ selectedContact, messages, onSendMessage, onSendFile, loading, sessionKey }) => {
  
  return (
    <div className="chat-window">
      <div className="chat-header">
        {selectedContact && (
          <>
            <div className="contact-avatar">
              {selectedContact.name ? selectedContact.name[0].toUpperCase() : '?'}
            </div>
            <h2>{selectedContact.name || 'Contact'}</h2>
          </>
        )}
        {!selectedContact && <h2>Select a contact to start chatting</h2>}
      </div>

      <div className="messages-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#667781' }}>Loading messages...</div>
        ) : messages?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#667781' }}>No messages yet. Start the conversation!</div>
        ) : (
          messages?.map((msg, index) => (
            <MessageBubble key={msg._id || index} message={msg} sessionKey={sessionKey} />
          ))
        )}
      </div>

      <div className="chat-input-container">
        <FileAttachment onSendFile={onSendFile} />
        <ChatInput onSend={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;

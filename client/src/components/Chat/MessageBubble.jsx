import { useState } from 'react';
import { downloadEncryptedFile } from '../../api/fileAPI';
import { decryptFile } from '../../crypto/encryption/decryptFile';

const MessageBubble = ({ message, sessionKey }) => {
  const isSent = message?.isSender || message?.sent;
  const [downloading, setDownloading] = useState(false);

  const handleDownloadFile = async () => {
    if (!message.fileId || !sessionKey) {
      alert('Cannot download file: missing file ID or session key');
      return;
    }

    try {
      setDownloading(true);
      console.log('📥 Downloading encrypted file:', message.fileName);
      
      // Download encrypted file from server
      const response = await downloadEncryptedFile(message.fileId);
      const encryptedData = response.data;
      
      console.log('🔓 Decrypting file...');
      // Decrypt the file
      const decryptedBlob = await decryptFile(encryptedData, sessionKey);
      
      // Create download link
      const url = URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.fileName || 'downloaded_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✓ File decrypted and downloaded successfully');
    } catch (err) {
      console.error('Failed to download/decrypt file:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`message-bubble ${isSent ? "sent" : "received"}`}>
      <div className="message-text">
        {message?.isFile ? (
          <div className="file-message">
            <div className="file-icon">📎</div>
            <div className="file-info">
              <div className="file-name">{message.fileName || 'File'}</div>
              {message.fileSize && (
                <div className="file-size">{formatFileSize(message.fileSize)}</div>
              )}
            </div>
            {!isSent && message.fileId && (
              <button 
                className="download-btn" 
                onClick={handleDownloadFile}
                disabled={downloading}
              >
                {downloading ? '⏳' : '⬇️'}
              </button>
            )}
          </div>
        ) : (
          message?.content || message?.text || "[Empty Message]"
        )}
      </div>
      <div className="message-time">
        {message?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default MessageBubble;

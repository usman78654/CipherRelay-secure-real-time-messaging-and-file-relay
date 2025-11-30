const FileAttachment = ({ onSendFile }) => {
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Placeholder callback — actual encryption is done elsewhere
    onSendFile(file);
  };

  return (
    <div className="file-attachment">
      <label className="file-label">
        📎
        <input type="file" onChange={handleFileSelect} hidden />
      </label>
    </div>
  );
};

export default FileAttachment;

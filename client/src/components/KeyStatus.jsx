import { useState, useEffect } from 'react';
import { loadKeysSecurely } from '../crypto/keygen/loadKeys';
import { generateUserKeyPair } from '../crypto/keygen/generateKeys';
import { storeKeysSecurely } from '../crypto/keygen/storeKeys';

const KeyStatus = ({ user }) => {
  const [keysExist, setKeysExist] = useState(false);
  const [keyInfo, setKeyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkKeys();
  }, [user]);

  const checkKeys = async () => {
    try {
      setLoading(true);
      const username = user?.username || user?.user?.username;
      const keys = await loadKeysSecurely(username || 'local-user');
      
      if (keys && (keys.signing || keys.ecdh)) {
        setKeysExist(true);
        setKeyInfo({
          signing: keys.signing ? '✓ ECDSA P-256' : '✗ Missing',
          ecdh: keys.ecdh ? '✓ ECDH P-256' : '✗ Missing'
        });
      } else {
        setKeysExist(false);
        setKeyInfo(null);
      }
    } catch (err) {
      console.error('Error checking keys:', err);
      setKeysExist(false);
    } finally {
      setLoading(false);
    }
  };

  const generateKeys = async () => {
    try {
      setGenerating(true);
      const username = user?.username || user?.user?.username;
      
      console.log('Generating new key pairs...');
      const keys = await generateUserKeyPair();
      
      await storeKeysSecurely({ username: username || 'local-user', ...keys }, null);
      console.log('Keys generated and stored successfully');
      
      await checkKeys();
    } catch (err) {
      console.error('Failed to generate keys:', err);
      alert('Failed to generate keys: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Checking cryptographic keys...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🔐 Cryptographic Keys</h3>
      
      {keysExist ? (
        <div style={styles.statusGood}>
          <p style={styles.statusText}>✓ Keys are securely stored</p>
          <div style={styles.keyDetails}>
            <p><strong>Signing Key:</strong> {keyInfo.signing}</p>
            <p><strong>Exchange Key:</strong> {keyInfo.ecdh}</p>
          </div>
          <p style={styles.note}>
            🔒 Private keys stored in IndexedDB (never sent to server)
          </p>
        </div>
      ) : (
        <div style={styles.statusBad}>
          <p style={styles.statusText}>⚠️ No keys found</p>
          <button 
            onClick={generateKeys} 
            disabled={generating}
            style={styles.button}
          >
            {generating ? 'Generating...' : 'Generate Keys Now'}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#111b21'
  },
  loading: {
    color: '#667781',
    fontSize: '14px'
  },
  statusGood: {
    background: '#e7f5ec',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #008069'
  },
  statusBad: {
    background: '#fff3cd',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #856404'
  },
  statusText: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#111b21'
  },
  keyDetails: {
    fontSize: '14px',
    color: '#3b4a54',
    marginBottom: '10px'
  },
  note: {
    fontSize: '13px',
    color: '#667781',
    fontStyle: 'italic',
    marginTop: '10px'
  },
  button: {
    background: '#008069',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px'
  }
};

export default KeyStatus;

import RegisterForm from "../components/Auth/RegisterForm";
import { AuthService } from "../services/authService";

// After registering, generate long-term keys and store them in IndexedDB
const generateAndStoreKeys = async (username) => {
  try {
    const gen = await import('../crypto/keygen/generateKeys.js');
    const store = await import('../crypto/keygen/storeKeys.js');
    const keys = await gen.generateUserKeyPair();
    // Package in the expected shape for storeKeysSecurely
    const obj = { username, signing: keys.signing, ecdh: keys.ecdh };
    await store.storeKeysSecurely(obj, null);
    console.log('Generated and stored long-term keys for', username);
  } catch (err) {
    console.warn('Failed to generate/store keys:', err.message || err);
  }
};

const Register = () => {

  const handleRegister = async (data) => {
    const res = await AuthService.register(data);
    if (res) {
      // Generate and store client keys asynchronously; do not block UX
      generateAndStoreKeys(data.username);
      alert("Registration successful! Keys are being generated in background.");
    } else {
      alert('Registration failed.');
    }
  };

  return (
    <div className="page register-page">
      <RegisterForm onSubmit={handleRegister} />
    </div>
  );
};

export default Register;

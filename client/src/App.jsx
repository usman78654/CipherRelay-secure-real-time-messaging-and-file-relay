import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegisterForm from './components/Auth/RegisterForm.jsx';
import LoginForm from './components/Auth/LoginForm.jsx';
import { AuthService } from './services/authService';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChatRoom from './pages/ChatRoom.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => AuthService.getUser());
  const [selectedContact, setSelectedContact] = useState(null);
  const login = async credentials => setCurrentUser((await AuthService.login(credentials)).user);
  const logout = () => { AuthService.logout(); setCurrentUser(null); setSelectedContact(null); };
  return <Router>
    <div role="note" style={{ padding: '10px 20px', background: '#fff3cd', color: '#543f00' }}>
      Portfolio security demo: new accounts use browser-only ECDH keys with first-contact key pinning. No multi-device recovery or forward secrecy; use test data only.
    </div>
    <Navbar user={currentUser} onLogout={logout} />
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <div className="page login-page"><LoginForm onSubmit={login} /></div>} />
      <Route path="/register" element={<div className="page register-page"><RegisterForm onSubmit={data => AuthService.register(data)} /></div>} />
      <Route path="/dashboard" element={currentUser ? <Dashboard user={currentUser} contacts={[]} onSelectContact={setSelectedContact} /> : <Navigate to="/login" />} />
      <Route path="/chat" element={currentUser && selectedContact ? <ChatRoom user={currentUser} selectedContact={selectedContact} /> : <Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} />} />
    </Routes>
  </Router>;
}

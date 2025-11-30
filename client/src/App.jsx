import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RegisterForm from "./components/Auth/RegisterForm.jsx";
import LoginForm from "./components/Auth/LoginForm.jsx";
import { AuthService } from "./services/authService";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ChatRoom from "./pages/ChatRoom.jsx";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  // Local inline Login component (temporary fallback)
  const LocalLogin = ({ onLogin }) => {
    const handleLogin = async (credentials) => {
      try {
        const user = await AuthService.login(credentials);
        onLogin(user);
      } catch (err) {
        console.warn('Login failed:', err && err.message ? err.message : err);
        alert('Login failed.');
      }
    };

    return (
      <div className="page login-page">
        <LoginForm onSubmit={handleLogin} />
      </div>
    );
  };

  // Local inline Register component (temporary fallback)
  const LocalRegister = () => {
    const handleRegister = async (data) => {
      try {
        const res = await AuthService.register(data);
        if (res) {
          alert('Registration successful — you can now login.');
          window.location.href = '/login';
        }
      } catch (err) {
        console.warn('Register failed:', err && err.message ? err.message : err);
        alert('Registration failed.');
      }
    };

    return (
      <div className="page register-page">
        <RegisterForm onSubmit={handleRegister} />
      </div>
    );
  };

  // Temporary mock contacts (replace with backend API later)
  const mockContacts = [
    { id: "u101", name: "Alice" },
    { id: "u102", name: "Bob" }
  ];

  return (
    <Router>
      <Navbar user={currentUser} />
      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" />
            ) : (
              <LocalLogin onLogin={(u) => setCurrentUser(u)} />
            )
          }
        />

        {/* Register */}
        <Route
          path="/register"
          element={<LocalRegister />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            currentUser ? (
              <Dashboard
                user={currentUser}
                contacts={mockContacts}
                onSelectContact={setSelectedContact}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Chat Room */}
        <Route
          path="/chat"
          element={
            currentUser && selectedContact ? (
              <ChatRoom user={currentUser} selectedContact={selectedContact} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  );
}

export default App;

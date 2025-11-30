import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user }) => {
  return (
    <header className="app-header">
      <div className="brand">
        <Link to="/">InfoSec Chat</Link>
      </div>

      <nav className="nav-links">
        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/chat">Chat</Link>
          </>
        )}
      </nav>

      <div className="user-info">
        {user ? (
          <span>Signed in: {user?.user?.username || user?.username || 'User'}</span>
        ) : (
          <span>Not signed in</span>
        )}
      </div>
    </header>
  );
};

export default Navbar;

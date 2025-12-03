/**
 * Authentication helper service.
 * Manages login, register and token handling.
 */

import { loginUser, registerUser } from "../api/authAPI";
import { cacheSet, cacheGet, cacheRemove } from "../storage/localCache";

const TOKEN_KEY = "auth_token";

export const AuthService = {
  login: async (credentials) => {
    const res = await loginUser(credentials);
    const data = res.data;
    if (data && data.token) {
      cacheSet(TOKEN_KEY, data.token);
      // Also store user data for easy access
      if (data.user) {
        cacheSet('user_data', data.user);
        localStorage.setItem('username', data.user.username);
      }
    }
    return data;
  },

  register: async (data) => {
    const res = await registerUser(data);
    return res.data;
  },

  logout: () => {
    cacheRemove(TOKEN_KEY);
    cacheRemove('user_data');
    localStorage.removeItem('username');
  },

  getToken: () => {
    return cacheGet(TOKEN_KEY);
  },

  getUser: () => {
    return cacheGet('user_data');
  },

  getUsername: () => {
    // Try multiple sources
    const userData = cacheGet('user_data');
    if (userData?.username) return userData.username;
    
    const stored = localStorage.getItem('username');
    if (stored) return stored;
    
    // Try to decode JWT token as last resort
    const token = cacheGet(TOKEN_KEY);
    if (token && typeof token === 'string') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username || null;
      } catch (e) {
        return null;
      }
    }
    
    return null;
  }
};

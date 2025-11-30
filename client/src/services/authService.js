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
    }
    return data;
  },

  register: async (data) => {
    const res = await registerUser(data);
    return res.data;
  },

  logout: () => {
    cacheRemove(TOKEN_KEY);
  },

  getToken: () => {
    return cacheGet(TOKEN_KEY);
  }
};

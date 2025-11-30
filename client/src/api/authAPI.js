import axios from "axios";
import config from "../config";
import { cacheGet } from "../storage/localCache";

const BASE = `${config.API_BASE_URL}/auth`;

// REGISTER REQUEST
export const registerUser = async (userData) => {
  // TODO: implement final API logic
  return axios.post(`${BASE}/register`, userData);
};

// LOGIN REQUEST
export const loginUser = async (credentials) => {
  // TODO: implement final API logic
  return axios.post(`${BASE}/login`, credentials);
};

// LOGOUT REQUEST
export const logoutUser = () => {
  // TODO: optional logout endpoint
  return axios.post(`${BASE}/logout`);
};

// GET ALL USERS (for contact list)
export const getAllUsers = async () => {
  const token = cacheGet('auth_token');
  return axios.get(`${BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

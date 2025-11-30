import axios from "axios";
import config from "../config";
import { cacheGet } from "../storage/localCache";

const BASE = `${config.API_BASE_URL}/chat`;

// SEND ENCRYPTED MESSAGE (ciphertext only)
export const sendEncryptedMessage = async (payload) => {
  /*
    payload should contain:
    {
      receiverId,
      ciphertext,
      iv,
      authTag,
      metadata
    }
  */
  return axios.post(`${BASE}/send`, payload);
};

// FETCH ENCRYPTED MESSAGES
export const fetchMessages = async (chatId) => {
  const token = cacheGet('auth_token');
  
  return axios.get(`${BASE}/${chatId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};

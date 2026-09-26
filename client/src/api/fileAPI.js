import axios from "axios";
import { cacheGet } from "../storage/localCache";
import config from '../config';

const BASE = `${config.API_BASE_URL}/files`;

// UPLOAD ENCRYPTED FILE
export const uploadEncryptedFile = async (payload) => {
  const authData = cacheGet('auth_token');
  const token = authData?.token || authData;
  
  if (!token) {
    console.error('No auth token found in localStorage');
    throw new Error('Authentication required. Please login again.');
  }
  
  
  // payload is JSON: { owner, receiver, fileName, encryptedChunks, metadata }
  return axios.post(`${BASE}/upload`, payload, { 
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    } 
  });
};

// DOWNLOAD ENCRYPTED FILE
export const downloadEncryptedFile = async (fileId) => {
  const authData = cacheGet('auth_token');
  const token = authData?.token || authData;
  
  if (!token) {
    console.error('No auth token found in localStorage');
    throw new Error('Authentication required. Please login again.');
  }
  
  return axios.get(`${BASE}/download/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

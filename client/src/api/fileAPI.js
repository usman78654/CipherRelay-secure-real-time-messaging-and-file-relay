import axios from "axios";
import { cacheGet } from "../storage/localCache";

const BASE = "http://localhost:5000/api/files";

// UPLOAD ENCRYPTED FILE
export const uploadEncryptedFile = async (payload) => {
  const authData = cacheGet('auth_token');
  const token = authData?.token || authData;
  
  if (!token) {
    console.error('No auth token found in localStorage');
    throw new Error('Authentication required. Please login again.');
  }
  
  console.log('Uploading file with auth token:', token.substring(0, 20) + '...');
  
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

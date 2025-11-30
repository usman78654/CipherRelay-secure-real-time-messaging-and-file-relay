import axios from "axios";
const BASE = "/api/key-exchange";

/*
  These endpoints only transfer PUBLIC data:
  - DH/ECDH public component
  - signatures
  - timestamps
  - verification tokens

  No private keys are ever sent.
*/

// STEP 1: Send initial handshake message
export const initiateKeyExchange = async (payload) => {
  return axios.post(`${BASE}/initiate`, payload);
};

// STEP 2: Respond with second handshake message
export const respondToKeyExchange = async (payload) => {
  return axios.post(`${BASE}/respond`, payload);
};

// STEP 3: Key confirmation message
export const confirmSessionKey = async (payload) => {
  return axios.post(`${BASE}/confirm`, payload);
};

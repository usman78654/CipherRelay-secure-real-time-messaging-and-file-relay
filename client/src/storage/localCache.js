/**
 * For storing non-sensitive metadata only.
 * NEVER store private keys or plaintext.
 */

export const cacheSet = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const cacheGet = (key) => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

export const cacheRemove = (key) => {
  localStorage.removeItem(key);
};

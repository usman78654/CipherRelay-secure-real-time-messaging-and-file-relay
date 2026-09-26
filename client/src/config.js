// Same-origin URLs let one build run on localhost or any cloud domain.
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || '/api',
  SOCKET_URL: process.env.REACT_APP_SERVER_URL || window.location.origin,
  APP_NAME: 'Secure Chat App'
};
export default config;

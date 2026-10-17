const { getSecureToken, saveSecureToken } = require("./secureStorage.js");

const API_URL = "https://nts-api-3e8i.onrender.com/api";

function setToken(token) {
  saveSecureToken(token);
}


async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const authToken = getSecureToken();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
module.exports = { setToken, apiRequest };

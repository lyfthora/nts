const API_URL = "https://nts-api-production.up.railway.app/api";
let authToken = null;

function setToken(token) {
  authToken = token;
}


async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
module.exports = { setToken, apiRequest };

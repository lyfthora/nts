const { safeStorage } = require("electron");
const Store = require("electron-store");

const store = new Store();
const TOKEN_KEY = "nts_secure_token";

let cachedToken = null;

/**
 * Carga el token desde el disco y lo descifra si está cifrado.
 * @returns {string|null} El token descifrado o null.
 */
function getSecureToken() {
  if (cachedToken !== null) {
    return cachedToken;
  }

  const encryptedBase64 = store.get(TOKEN_KEY);
  if (!encryptedBase64) {
    return null;
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encryptedBase64, "base64");
      cachedToken = safeStorage.decryptString(buffer);
    } else {
      cachedToken = encryptedBase64;
    }
  } catch (error) {
    console.error("Error al descifrar el token seguro:", error);
    cachedToken = null;
  }

  return cachedToken;
}

/**
 * Cifra y guarda el token en el disco.
 * @param {string|null} token El token a guardar (o null para eliminarlo).
 */
function saveSecureToken(token) {
  cachedToken = token;

  if (!token) {
    store.delete(TOKEN_KEY);
    return;
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(token);
      store.set(TOKEN_KEY, encryptedBuffer.toString("base64"));
    } else {
      store.set(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error al cifrar y guardar el token:", error);
  }
}

module.exports = {
  getSecureToken,
  saveSecureToken,
};

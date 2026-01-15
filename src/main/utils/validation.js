/**
 * Utilidades de validación para parámetros IPC
 */

/**
 * Valida que un ID sea un número válido
 * @param {*} id - ID a validar
 * @returns {boolean}
 */
function isValidId(id) {
  return typeof id === "number" && !isNaN(id) && id > 0;
}

/**
 * Valida estructura básica de un objeto Note
 * @param {*} data - Datos a validar
 * @returns {boolean}
 */
function isValidNote(data) {
  if (!data || typeof data !== "object") return false;
  if (!isValidId(data.id)) return false;
  if (data.content !== undefined && typeof data.content !== "string")
    return false;
  if (data.name !== undefined && typeof data.name !== "string") return false;
  return true;
}

/**
 * Valida estructura básica de un objeto Folder
 * @param {*} data - Datos a validar
 * @returns {boolean}
 */
function isValidFolder(data) {
  if (!data || typeof data !== "object") return false;
  if (data.id !== undefined && !isValidId(data.id)) return false;
  if (data.name !== undefined && typeof data.name !== "string") return false;
  return true;
}

/**
 * Valida datos de asset (imagen/archivo)
 * @param {*} data - Datos a validar
 * @returns {boolean}
 */
function isValidAssetData(data) {
  if (!data || typeof data !== "object") return false;
  if (
    !data.fileBuffer ||
    !(
      data.fileBuffer instanceof ArrayBuffer || Buffer.isBuffer(data.fileBuffer)
    )
  ) {
    return false;
  }
  if (!data.fileName || typeof data.fileName !== "string") return false;
  if (!isValidId(data.noteId)) return false;
  return true;
}

/**
 * Valida que sea un array
 * @param {*} data - Datos a validar
 * @returns {boolean}
 */
function isValidArray(data) {
  return Array.isArray(data);
}

/**
 * Valida datos de recordatorio
 * @param {*} data - Datos a validar
 * @returns {boolean}
 */
function isValidReminderData(data) {
  if (!data || typeof data !== "object") return false;
  if (!isValidId(data.noteId)) return false;
  if (!data.date || typeof data.date !== "string") return false;
  if (!data.time || typeof data.time !== "string") return false;
  return true;
}

module.exports = {
  isValidId,
  isValidNote,
  isValidFolder,
  isValidAssetData,
  isValidArray,
  isValidReminderData,
};

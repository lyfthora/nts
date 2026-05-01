const { registerNoteHandlers } = require("./noteHandlers.js");
const { registerWindowHandlers } = require("./windowHandlers.js");
const { registerUpdateHandlers } = require("./updateHandlers.js");
const { registerExportHandlers } = require("./exportHandlers.js");

function registerAllHandlers() {
  registerNoteHandlers();
  registerWindowHandlers();
  registerUpdateHandlers();
  registerExportHandlers();
}

module.exports = { registerAllHandlers };

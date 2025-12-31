const { registerNoteHandlers } = require("./noteHandlers.js");
const { registerFolderHandlers } = require("./folderHandlers.js");
const { registerWindowHandlers } = require("./windowHandlers.js");
const { registerUpdateHandlers } = require("./updateHandlers.js");

function registerAllHandlers() {
  registerNoteHandlers();
  registerFolderHandlers();
  registerWindowHandlers();
  registerUpdateHandlers();
}

module.exports = { registerAllHandlers };

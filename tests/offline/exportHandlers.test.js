const assert = require("node:assert/strict");
const test = require("node:test");

const PREMIUM_REQUIRED = {
  success: false,
  code: "PREMIUM_REQUIRED",
  error: "Premium subscription required for export and import",
};

const HANDLER_CHANNELS = [
  "export-note-json",
  "export-note-md",
  "import-note",
  "export-all-notes",
];

// Los handlers viven en el main process: se cargan exportHandlers.js con
// `electron` y el apiProxy mockeados para no tocar Electron ni la red.
function loadHandlers(apiRequest, { register = false } = {}) {
  const electronPath = require.resolve("electron");
  const apiProxyPath = require.resolve("../../src/main/apiProxy.js");
  const handlersPath = require.resolve("../../src/main/ipc/exportHandlers.js");
  const previousElectron = require.cache[electronPath];
  const previousApiProxy = require.cache[apiProxyPath];
  const previousHandlers = require.cache[handlersPath];

  const handlers = new Map();
  const dialogCalls = [];
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    on: () => { },
    send: () => { },
  };
  const dialog = {
    showSaveDialog: async (...args) => {
      dialogCalls.push({ kind: "save", args });
      return { canceled: true };
    },
    showOpenDialog: async (...args) => {
      dialogCalls.push({ kind: "open", args });
      return { canceled: true };
    },
  };

  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: { ipcMain, dialog },
  };
  require.cache[apiProxyPath] = {
    id: apiProxyPath,
    filename: apiProxyPath,
    loaded: true,
    exports: { apiRequest },
  };
  delete require.cache[handlersPath];

  try {
    const mod = require(handlersPath);
    if (register) mod.registerExportHandlers();
    return { mod, handlers, dialogCalls };
  } finally {
    delete require.cache[handlersPath];
    if (previousHandlers) require.cache[handlersPath] = previousHandlers;
    if (previousApiProxy) require.cache[apiProxyPath] = previousApiProxy;
    else delete require.cache[apiProxyPath];
    if (previousElectron) require.cache[electronPath] = previousElectron;
    else delete require.cache[electronPath];
  }
}

test("checkPremiumAccess allows active, trial and trialing subscriptions", async () => {
  for (const status of ["active", "trial", "trialing"]) {
    const calls = [];
    const { mod } = loadHandlers(async (path) => {
      calls.push(path);
      return { status };
    });

    assert.equal(await mod.checkPremiumAccess(), null);
    assert.deepEqual(calls, ["/subscription/status"]);
  }
});

test("checkPremiumAccess rejects every status without access", async () => {
  for (const status of ["expired", "past_due", "canceled", "unpaid", "incomplete", "whatever"]) {
    const { mod } = loadHandlers(async () => ({ status }));

    assert.deepEqual(await mod.checkPremiumAccess(), PREMIUM_REQUIRED);
  }
});

test("checkPremiumAccess fails closed when the API cannot be reached", async () => {
  const { mod } = loadHandlers(async () => {
    const error = new Error("API error: 503");
    error.status = 503;
    throw error;
  });

  assert.deepEqual(await mod.checkPremiumAccess(), {
    success: false,
    code: "SUBSCRIPTION_UNVERIFIED",
    error: "Could not verify your subscription. Please try again when you are back online.",
  });
});

test("checkPremiumAccess denies malformed subscription payloads", async () => {
  for (const payload of [null, undefined, {}, { status: "" }, { status: null }]) {
    const { mod } = loadHandlers(async () => payload);

    assert.deepEqual(await mod.checkPremiumAccess(), PREMIUM_REQUIRED);
  }
});

test("registered export and import handlers reject without a premium subscription", async () => {
  const { handlers, dialogCalls } = loadHandlers(async () => ({ status: "expired" }), { register: true });
  const event = { sender: { send: () => { } } };

  for (const channel of HANDLER_CHANNELS) {
    const handler = handlers.get(channel);
    assert.equal(typeof handler, "function", `${channel} must be registered`);

    assert.deepEqual(await handler(event, 7), PREMIUM_REQUIRED, `${channel} must return PREMIUM_REQUIRED`);
  }

  // El gate corre antes de cualquier trabajo: no se abrió ningún diálogo nativo.
  assert.deepEqual(dialogCalls, []);
});

test("registered handlers also reject when the subscription cannot be verified", async () => {
  const { handlers, dialogCalls } = loadHandlers(async () => {
    throw new Error("API error: 503");
  }, { register: true });
  const event = { sender: { send: () => { } } };

  for (const channel of HANDLER_CHANNELS) {
    const result = await handlers.get(channel)(event, 7);
    assert.equal(result.success, false, channel);
    assert.equal(result.code, "SUBSCRIPTION_UNVERIFIED", channel);
  }

  assert.deepEqual(dialogCalls, []);
});

test("a premium subscription lets a registered handler continue past the gate", async () => {
  const { handlers, dialogCalls } = loadHandlers(async () => ({ status: "trialing" }), { register: true });

  const result = await handlers.get("export-all-notes")({ sender: { send: () => { } } });

  // Con suscripción el handler llega al diálogo nativo, que el mock cancela.
  assert.equal(dialogCalls.length, 1);
  assert.equal(dialogCalls[0].kind, "save");
  assert.deepEqual(result, { success: false });
});

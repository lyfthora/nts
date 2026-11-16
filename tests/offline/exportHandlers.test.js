const assert = require("node:assert/strict");
const test = require("node:test");

// checkPremiumAccess vive en el main process: se carga exportHandlers.js con
// `electron` y el apiProxy mockeados para no tocar Electron ni la red.
function loadHandlers(apiRequest) {
  const electronPath = require.resolve("electron");
  const apiProxyPath = require.resolve("../../src/main/apiProxy.js");
  const handlersPath = require.resolve("../../src/main/ipc/exportHandlers.js");
  const previousElectron = require.cache[electronPath];
  const previousApiProxy = require.cache[apiProxyPath];
  const previousHandlers = require.cache[handlersPath];

  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
      ipcMain: { handle: () => { } },
      dialog: {},
    },
  };
  require.cache[apiProxyPath] = {
    id: apiProxyPath,
    filename: apiProxyPath,
    loaded: true,
    exports: { apiRequest },
  };
  delete require.cache[handlersPath];

  try {
    return require(handlersPath);
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
    const { checkPremiumAccess } = loadHandlers(async (path) => {
      calls.push(path);
      return { status };
    });

    assert.equal(await checkPremiumAccess(), null);
    assert.deepEqual(calls, ["/subscription/status"]);
  }
});

test("checkPremiumAccess rejects every status without access", async () => {
  for (const status of ["expired", "past_due", "canceled", "unpaid", "incomplete", "whatever"]) {
    const { checkPremiumAccess } = loadHandlers(async () => ({ status }));

    assert.deepEqual(await checkPremiumAccess(), {
      success: false,
      code: "PREMIUM_REQUIRED",
      error: "Premium subscription required for export and import",
    });
  }
});

test("checkPremiumAccess fails closed when the API cannot be reached", async () => {
  const { checkPremiumAccess } = loadHandlers(async () => {
    const error = new Error("API error: 503");
    error.status = 503;
    throw error;
  });

  assert.deepEqual(await checkPremiumAccess(), {
    success: false,
    code: "SUBSCRIPTION_UNVERIFIED",
    error: "Could not verify your subscription. Please try again when you are back online.",
  });
});

test("checkPremiumAccess denies malformed subscription payloads", async () => {
  for (const payload of [null, undefined, {}, { status: "" }, { status: null }]) {
    const { checkPremiumAccess } = loadHandlers(async () => payload);
    const result = await checkPremiumAccess();

    assert.equal(result.success, false);
    assert.equal(result.code, "PREMIUM_REQUIRED");
  }
});

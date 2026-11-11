const assert = require("node:assert/strict");
const test = require("node:test");

async function withMockedApi({ token = "test-token", fetch, run }) {
  const secureStoragePath = require.resolve("./secureStorage.js");
  const apiProxyPath = require.resolve("./apiProxy.js");
  const previousSecureStorage = require.cache[secureStoragePath];
  const previousApiProxy = require.cache[apiProxyPath];
  const previousFetch = global.fetch;
  require.cache[secureStoragePath] = {
    id: secureStoragePath,
    filename: secureStoragePath,
    loaded: true,
    exports: { getSecureToken: () => token, saveSecureToken: () => { } },
  };
  delete require.cache[apiProxyPath];
  global.fetch = fetch;
  try {
    return await run(require("../../src/main/apiProxy.js"));
  } finally {
    global.fetch = previousFetch;
    delete require.cache[apiProxyPath];
    if (previousApiProxy) require.cache[apiProxyPath] = previousApiProxy;
    if (previousSecureStorage) require.cache[secureStoragePath] = previousSecureStorage;
    else delete require.cache[secureStoragePath];
  }
}

test("api proxy sends the stored bearer token and returns JSON", async () => {
  await withMockedApi({
    token: "session-token",
    fetch: async (_url, options) => {
      assert.equal(options.headers.Authorization, "Bearer session-token");
      assert.equal(options.headers["Content-Type"], "application/json");
      return { ok: true, json: async () => ({ notes: [] }) };
    },
    run: async ({ apiRequest }) => {
      assert.deepEqual(await apiRequest("/notes/all"), { notes: [] });
    },
  });
});

test("api proxy exposes HTTP status for retry and permanent-error classification", async () => {
  await withMockedApi({
    fetch: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    run: async ({ apiRequest }) => {
      await assert.rejects(apiRequest("/notes", { method: "POST" }), (error) => {
        assert.equal(error.status, 429);
        assert.match(error.message, /429/);
        return true;
      });
    },
  });
});

test("api proxy propagates malformed JSON failures rather than converting them to success", async () => {
  await withMockedApi({
    fetch: async () => ({ ok: true, json: async () => { throw new SyntaxError("invalid json"); } }),
    run: async ({ apiRequest }) => {
      await assert.rejects(apiRequest("/notes/all"), /invalid json/);
    },
  });
});

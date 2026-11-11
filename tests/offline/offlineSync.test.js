const assert = require("node:assert/strict");
const test = require("node:test");
const { EventEmitter } = require("node:events");
const { OfflineSync } = require("../../src/main/offlineSync.js");

function createFakeTokenStore(initial = null) {
  const values = initial ? { ["nts_secure_token"]: initial } : {};
  return {
    get(key) { return values[key]; },
    set(key, value) { values[key] = value; },
    delete(key) { delete values[key]; },
  };
}

function createFakeElectronModule() {
  const ipcMain = new EventEmitter();
  const handlers = new Map();
  ipcMain.handle = (channel, handler) => handlers.set(channel, handler);
  ipcMain.invoke = (channel, ...args) => handlers.get(channel)?.({}, ...args);
  const app = new EventEmitter();
  app.requestSingleInstanceLock = () => true;
  app.setAsDefaultProtocolClient = () => { };
  app.whenReady = () => Promise.resolve();
  app.quit = () => { };
  const browserWindow = class extends EventEmitter {
    constructor() { super(); this.webContents = { send() { } }; }
    loadFile() { }
    isDestroyed() { return false; }
    show() { }
    focus() { }
    close() { }
    minimize() { }
  };
  browserWindow.fromWebContents = () => null;
  return {
    app, ipcMain, BrowserWindow: browserWindow,
    shell: { openExternal() { } },
    safeStorage: { isEncryptionAvailable: () => false },
  };
}

function tokenFor(sub) {
  return `header.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.signature`;
}

function tokenForEmail(email) {
  return `header.${Buffer.from(JSON.stringify({ email })).toString("base64url")}.signature`;
}

function createHarness({ online = true, retryBaseMs = 5 } = {}) {
  const data = {};
  const store = {
    get(key, fallback) { return data[key] ?? fallback; },
    set(key, value) { data[key] = structuredClone(value); },
  };
  const calls = [];
  let isOnline = online;
  let nextId = 100;
  const sync = new OfflineSync({
    store,
    getToken: () => tokenFor("user-a"),
    retryBaseMs,
    retryMaxMs: retryBaseMs,
    apiRequest: async (path, options = {}) => {
      calls.push({ path, options: structuredClone(options) });
      if (!isOnline) throw new TypeError("network offline");
      if (path === "/notes/all") return { notes: [], folders: [] };
      if (path === "/notes" || path === "/folders") return { id: nextId++ };
      return { success: true };
    },
  });
  return { sync, store, calls, setOnline(value) { isOnline = value; } };
}

function httpError(status, message = `API error: ${status}`) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function queueNoteOffline(harness) {
  harness.setOnline(false);
  const note = await harness.sync.createNote();
  await harness.sync.flushPendingSync();
  return note;
}

test("reads cached data and content while offline, including after recreating the service", async () => {
  const harness = createHarness();
  await harness.sync.getAllData();
  const created = await harness.sync.createNote("text");
  harness.sync.saveNoteLocally({ ...created, content: "saved offline-first" });
  harness.setOnline(false);
  const reloaded = new OfflineSync({
    store: harness.store,
    getToken: () => tokenFor("user-a"),
    apiRequest: async () => { throw new TypeError("network offline"); },
  });
  assert.equal(await reloaded.getNoteContent(created.id, "text"), "saved offline-first");
  const data = await reloaded.getAllData();
  assert.equal(data.notes.find((note) => note.id === created.id).content, "saved offline-first");
});

test("edits are persisted and remain queued offline, then synchronize once online", async () => {
  const harness = createHarness();
  harness.setOnline(false);
  const created = await harness.sync.createNote();
  await harness.sync.flushPendingSync();
  harness.setOnline(true);
  await harness.sync.flushPendingSync();
  harness.calls.length = 0;
  harness.setOnline(false);
  const result = await harness.sync.updateNote({ ...created, name: "changed offline", content: "new body" });
  assert.equal(result.pendingSync, true);
  assert.equal(harness.sync.getSyncStatus().pending, 1);
  harness.setOnline(true);
  const flushed = await harness.sync.flushPendingSync();
  assert.equal(flushed.pending, 0);
  assert.equal(harness.sync.getSyncStatus().pending, 0);
  const put = harness.calls.find((call) => call.options.method === "PUT");
  assert.ok(put);
  assert.equal(put.path, "/notes/100");
  const sentNote = JSON.parse(put.options.body);
  assert.equal(sentNote.name, "changed offline");
  assert.equal(sentNote.content, "new body");
  assert.equal(sentNote.id, undefined);
});

test("offline note and folder creates resolve server IDs for dependent writes", async () => {
  const harness = createHarness();
  harness.setOnline(false);
  const folder = await harness.sync.createFolder({ name: "Offline folder", parentId: null });
  const note = await harness.sync.createNote("text");
  await harness.sync.updateNote({ ...note, folderId: folder.id, content: "nested" });
  assert.ok(folder.id < 0);
  assert.ok(note.id < 0);
  harness.setOnline(true);
  await harness.sync.flushPendingSync();
  const createdFolder = harness.calls.find((call) => call.path === "/folders");
  const createdNote = harness.calls.find((call) => call.path === "/notes");
  assert.ok(createdFolder);
  assert.ok(createdNote);
  const sentCreateNote = JSON.parse(createdNote.options.body);
  assert.equal(sentCreateNote.folderId, 100);
  assert.equal(sentCreateNote.content, "nested");
  assert.equal(harness.sync.getSyncStatus().pending, 0);
  assert.ok(createdFolder.options.headers["Idempotency-Key"]);
  assert.ok(createdNote.options.headers["Idempotency-Key"]);
});

test("queued records are isolated by account ID", async () => {
  const harness = createHarness();
  const note = await harness.sync.createNote();
  harness.sync.saveNoteLocally({ ...note, content: "private" });
  const otherAccount = new OfflineSync({
    store: harness.store,
    getToken: () => tokenFor("user-b"),
    apiRequest: async () => { throw new TypeError("offline"); },
  });
  assert.deepEqual(otherAccount.getCachedData(), { notes: [], folders: [] });
  assert.equal(otherAccount.getSyncStatus().pending, 0);
});

test("preserves cached content while applying newer remote note metadata", async () => {
  const harness = createHarness();
  harness.setOnline(false);
  const created = await harness.sync.createNote();
  await harness.sync.flushPendingSync();
  harness.setOnline(true);
  await harness.sync.flushPendingSync();
  harness.sync.saveNoteLocally({ ...created, content: "full local content" });
  await harness.sync.flushPendingSync();
  const refreshed = harness.sync.setCachedData({ notes: [{ id: 100, name: "remote metadata" }], folders: [] });
  const note = refreshed.notes.find((item) => item.id === created.id);
  assert.equal(note.content, "full local content");
  assert.equal(note.name, "remote metadata");
});

test("keeps network failures queued for a later explicit retry", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  await queueNoteOffline(harness);
  const callsBefore = harness.calls.length;
  harness.setOnline(true);
  const result = await harness.sync.flushPendingSync();
  assert.ok(harness.calls.length > callsBefore);
  assert.equal(result.pending, 0);
});

test("permanent 400 and 403 errors remain queued and expose the error", async (t) => {
  for (const status of [400, 403]) {
    await t.test(String(status), async () => {
      const harness = createHarness({ retryBaseMs: 10000 });
      await queueNoteOffline(harness);
      harness.sync.apiRequest = async () => { throw httpError(status); };
      const result = await harness.sync.flushPendingSync();
      assert.equal(result.blocked, true);
      assert.equal(result.pending, 1);
      assert.equal(harness.sync.getSyncStatus().lastError, `API error: ${status}`);
    });
  }
});

test("401 remains queued and is not retried until the application retries with a valid session", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  await queueNoteOffline(harness);
  let token = tokenFor("user-a");
  harness.sync.getToken = () => token;
  harness.sync.apiRequest = async () => { throw httpError(401); };
  const unauthorized = await harness.sync.flushPendingSync();
  assert.equal(unauthorized.blocked, true);
  assert.equal(unauthorized.pending, 1);
  token = tokenFor("user-a");
  harness.sync.apiRequest = async () => ({ id: 123 });
  const retried = await harness.sync.flushPendingSync();
  assert.equal(retried.pending, 0);
});

test("408, 429, 500, 503, timeouts and malformed JSON remain queued and retry", async (t) => {
  const scenarios = [
    [408, () => httpError(408)],
    [429, () => httpError(429)],
    [500, () => httpError(500)],
    [503, () => httpError(503)],
    ["timeout", () => new TypeError("fetch failed: timeout")],
    ["invalid-json", () => new SyntaxError("Unexpected end of JSON input")],
  ];
  for (const [label, makeError] of scenarios) {
    await t.test(String(label), async () => {
      const harness = createHarness({ retryBaseMs: 5 });
      await queueNoteOffline(harness);
      let calls = 0;
      harness.sync.apiRequest = async () => {
        calls += 1;
        if (calls === 1) throw makeError();
        return { id: 234 };
      };
      const result = await harness.sync.flushPendingSync();
      assert.equal(result.pending, 1);
      const deadline = Date.now() + 1000;
      while (harness.sync.getSyncStatus().pending && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      assert.equal(calls, 2);
      assert.equal(harness.sync.getSyncStatus().pending, 0);
    });
  }
});

test("blocks create responses without a valid server ID and retains the operation", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  await queueNoteOffline(harness);
  harness.sync.apiRequest = async () => ({});
  const result = await harness.sync.flushPendingSync();
  assert.equal(result.blocked, true);
  assert.equal(result.pending, 1);
  assert.equal(harness.sync.getSyncStatus().lastError, "Create response did not include a valid server ID");
});

test("a JSON parse failure leaves pending operation available for recovery", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  await queueNoteOffline(harness);
  harness.sync.apiRequest = async () => { throw new SyntaxError("invalid JSON"); };
  const result = await harness.sync.flushPendingSync();
  assert.equal(result.pending, 1);
  assert.equal(harness.sync.getSyncStatus().lastError, "invalid JSON");
});

test("coalesces concurrent flushes to one API request", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  await queueNoteOffline(harness);
  let release;
  let requests = 0;
  harness.sync.apiRequest = () => {
    requests += 1;
    return new Promise((resolve) => { release = resolve; });
  };
  const first = harness.sync.flushPendingSync();
  const second = harness.sync.flushPendingSync();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 1);
  release({ id: 321 });
  assert.deepEqual(await first, await second);
  assert.equal(harness.sync.getSyncStatus().pending, 0);
});

test("does not drop an edit made while its previous request is in flight", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  const note = await queueNoteOffline(harness);
  let release;
  const requests = [];
  harness.sync.apiRequest = (path, options) => {
    requests.push({ path, options });
    if (requests.length === 1) return new Promise((resolve) => { release = resolve; });
    return Promise.resolve({ ok: true });
  };
  const flush = harness.sync.flushPendingSync();
  await new Promise((resolve) => setImmediate(resolve));
  await harness.sync.updateNote({ ...note, name: "latest edit", content: "latest body" });
  release({ id: 400 });
  await flush;
  const latestWrite = requests.find((request) => request.options.method === "PUT");
  assert.ok(latestWrite);
  const payload = JSON.parse(latestWrite.options.body);
  assert.equal(payload.name, "latest edit");
  assert.equal(payload.content, "latest body");
  assert.equal(harness.sync.getSyncStatus().pending, 0);
});

test("deleting an uncreated offline note cancels its queued create without a remote delete", async () => {
  const harness = createHarness({ retryBaseMs: 10000 });
  const note = await harness.sync.createNote();
  const result = await harness.sync.deleteNote(note.id);
  assert.equal(result.pendingSync, false);
  assert.equal(harness.sync.getCachedData().notes.some((item) => item.id === note.id), false);
  assert.equal(harness.sync.getSyncStatus().pending, 0);
  assert.equal(harness.calls.some((call) => call.options.method === "DELETE"), false);
});

test("getOfflineSync uses the same stored token and API proxy contract as preload after token changes", async () => {
  const paths = [require.resolve("electron"), require.resolve("electron-store"), require.resolve("./secureStorage.js"), require.resolve("./apiProxy.js"), require.resolve("./offlineSync.js")];
  const apiProxyPath = paths[3];
  const apiProxyFile = require("node:fs").readFileSync(apiProxyPath, "utf8");
  const apiProxyUsesMainToken = apiProxyFile.includes("getSecureToken");
  assert.equal(apiProxyUsesMainToken, true, "main-process API proxy must always read the main-process secure token");
  const previous = new Map(paths.map((path) => [path, require.cache[path]]));
  const fakeElectron = createFakeElectronModule();
  const tokenStore = createFakeTokenStore();
  const records = new Map();
  class FakeStore {
    constructor({ name } = {}) {
      this.name = name || "default";
      if (!records.has(this.name)) records.set(this.name, {});
      this.values = records.get(this.name);
    }
    get(key, fallback) { return this.values[key] ?? fallback; }
    set(key, value) { this.values[key] = structuredClone(value); }
    delete(key) { delete this.values[key]; }
  }
  const requests = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    requests.push({ url, options: structuredClone(options) });
    if (url.endsWith("/notes")) return { ok: true, json: async () => ({ id: 765 }) };
    return { ok: true, json: async () => ({}) };
  };
  require.cache[paths[0]] = { id: paths[0], filename: paths[0], loaded: true, exports: fakeElectron };
  require.cache[paths[1]] = { id: paths[1], filename: paths[1], loaded: true, exports: FakeStore };
  require.cache[paths[2]] = {
    id: paths[2], filename: paths[2], loaded: true,
    exports: {
      getSecureToken: () => tokenStore.get("nts_secure_token") || null,
      saveSecureToken: (token) => token ? tokenStore.set("nts_secure_token", token) : tokenStore.delete("nts_secure_token"),
    },
  };
  try {
    delete require.cache[paths[3]];
    delete require.cache[paths[4]];
    const { getOfflineSync } = require("../../src/main/offlineSync.js");
    const firstToken = tokenFor("same-account");
    tokenStore.set("nts_secure_token", firstToken);
    const sync = getOfflineSync();
    const note = await sync.createNote();
    await sync.flushPendingSync();
    assert.equal(requests[0].url, "https://nts-api-3e8i.onrender.com/api/notes");
    assert.equal(requests[0].options.method, "POST");
    assert.match(requests[0].options.headers["Idempotency-Key"], /^[0-9a-f-]{36}$/i);
    assert.equal(requests[0].options.body, JSON.stringify({ noteType: "text", name: "Untitled", color: "#ffffff", content: "", tags: [], images: [] }));
    const refreshedToken = tokenFor("same-account");
    await sync.updateNote({ ...note, name: "after refresh" });
    await sync.flushPendingSync();
    const updateCall = requests.find((request) => request.options.method === "PUT");
    assert.equal(updateCall.options.headers.Authorization, undefined);
    assert.match(updateCall.options.headers["Idempotency-Key"], /^[0-9a-f-]{36}$/i);
    tokenStore.set("nts_secure_token", refreshedToken);
    await require("../../src/main/apiProxy.js").apiRequest("/session-check");
    assert.equal(requests.at(-1).options.headers.Authorization, `Bearer ${refreshedToken}`);
    const persisted = new FakeStore({ name: "offline-sync" }).get("accounts", {});
    assert.ok(persisted["same-account"]);
  } finally {
    global.fetch = originalFetch;
    for (const path of paths) {
      delete require.cache[path];
      const module = previous.get(path);
      if (module) require.cache[path] = module;
    }
  }
});

test("rejects missing account identity and normalizes legacy email identity", () => {
  const { store } = createHarness();
  const missingIdentity = new OfflineSync({ store, getToken: () => null, apiRequest: async () => ({}) });
  assert.throws(() => missingIdentity.getCachedData(), /valid account is required/i);
  assert.throws(() => missingIdentity.getSyncStatus(), /valid account is required/i);

  const emailIdentity = new OfflineSync({ store, getToken: () => tokenForEmail("Person@Example.com"), apiRequest: async () => ({}) });
  emailIdentity.saveNoteLocally({ id: 1, name: "Legacy", content: "private" });
  assert.deepEqual(Object.keys(store.get("accounts", {})), ["person@example.com"]);
});

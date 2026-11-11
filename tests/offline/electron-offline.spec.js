const { test, expect, _electron } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function tokenFor(sub) {
  const payload = Buffer.from(JSON.stringify({
    sub,
    email: `${sub}@example.invalid`,
    name: "Offline E2E",
    exp: 4102444800,
  })).toString("base64url");
  return `header.${payload}.signature`;
}

class StatefulApiMock {
  constructor() {
    this.online = false;
    this.notes = new Map();
    this.folders = new Map();
    this.requests = [];
    this.idempotentCreates = new Map();
    this.nextId = 1000;
    this.failAfterAcceptCollection = null;
    this.acceptedFailureCount = 0;
  }

  async handle(route) {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();
    const headers = request.headers();
    const body = request.postDataJSON() || undefined;
    const record = { method, path, body, key: headers["idempotency-key"] || null };
    this.requests.push(record);

    if (!this.online) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "offline" }) });
      return;
    }

    if (method === "GET" && path === "/notes/all") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes: [...this.notes.values()], folders: [...this.folders.values()] }) });
      return;
    }

    const collection = path === "/notes" ? "notes" : path === "/folders" ? "folders" : null;
    const records = collection === "notes" ? this.notes : this.folders;
    if (method === "POST" && collection) {
      const idempotencyKey = record.key;
      let entity = idempotencyKey && this.idempotentCreates.get(idempotencyKey);
      if (!entity) {
        entity = { ...(body || {}), id: this.nextId++ };
        records.set(entity.id, entity);
        if (idempotencyKey) this.idempotentCreates.set(idempotencyKey, entity);
      }
      if (this.failAfterAcceptCollection === collection) {
        this.failAfterAcceptCollection = null;
        this.acceptedFailureCount += 1;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "accepted, response lost" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(entity) });
      return;
    }

    const match = path.match(/^\/(notes|folders)\/(\d+)(\/content)?$/);
    if (match && method === "PUT") {
      const target = match[1] === "notes" ? this.notes : this.folders;
      const id = Number(match[2]);
      const existing = target.get(id);
      if (!existing) {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
        return;
      }
      target.set(id, { ...existing, ...(body || {}) });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  }
}

async function installApiMock(page, apiMock) {
  await page.route("https://nts-api-3e8i.onrender.com/api/**", (route) => apiMock.handle(route));
}

async function launchApp(profileDir, apiMock) {
  const app = await _electron.launch({
    args: [".", "--no-sandbox", `--user-data-dir=${profileDir}`],
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await installApiMock(page, apiMock);
  return { app, page };
}

async function ensureTestSession(page, accountId) {
  await page.evaluate((token) => window.api.setAuthToken(token), tokenFor(accountId));
  // Persist the test session through real main-process IPC, then bootstrap as on relaunch.
  await page.reload();
  await expect(page.getByRole("link", { name: /All Notes/ })).toBeVisible();
}

async function createFolder(page, name) {
  await page.locator(".new-folder-btn").click();
  await page.locator(".input-modal-input").fill(name);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.locator(".folder-item").filter({ hasText: name })).toBeVisible();
}

test("offline edits and folder changes survive restart, then reconnect idempotently to a stateful API", async () => {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "nts-offline-playwright-"));
  const apiMock = new StatefulApiMock();
  const pageErrors = [];
  let app;
  try {
    ({ app } = await launchApp(profileDir, apiMock));
    let page = await app.firstWindow();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await ensureTestSession(page, "offline-playwright-user");

    await createFolder(page, "Offline Drafts");
    await page.locator("#addNoteBtn").click();
    await expect(page.locator("#noteTitleInput")).toBeVisible();
    await page.locator("#noteTitleInput").fill("Offline UI note");
    const editor = page.locator('.cm-content[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type("Durable content saved offline");

    await expect.poll(async () => {
      const state = await page.evaluate(() => ({ data: window.api.getCachedData(), status: window.api.getSyncStatus() }));
      return state.data?.notes.some((note) => note.name === "Offline UI note" && note.content?.includes("Durable content saved offline")) && state.status.pending > 0;
    }, { timeout: 10000 }).toBeTruthy();

    const noteRow = page.locator(".note-list-item").filter({ hasText: "Offline UI note" });
    await noteRow.click({ button: "right" });
    await page.locator(".context-menu-item.has-submenu").filter({ hasText: "Move to Folder" }).hover();
    await page.locator(".context-submenu .context-submenu-item").filter({ hasText: "Offline Drafts" }).click();
    await expect.poll(() => page.evaluate(() => {
      const state = window.api.getCachedData();
      const note = state.notes.find((item) => item.name === "Offline UI note");
      const folder = state.folders.find((item) => item.name === "Offline Drafts");
      return !!note && !!folder && note.folderId === folder.id;
    })).toBeTruthy();

    await page.locator(".folder-item").filter({ hasText: "Offline Drafts" }).click({ button: "right" });
    await page.getByText("Rename Folder", { exact: true }).click();
    await page.locator(".input-modal-input").fill("Renamed Drafts");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.locator(".folder-item").filter({ hasText: "Renamed Drafts" })).toBeVisible();

    const beforeRestart = await page.evaluate(() => ({ data: window.api.getCachedData(), status: window.api.getSyncStatus() }));
    expect(beforeRestart.status.pending).toBeGreaterThan(0);
    expect(apiMock.notes.size).toBe(0);
    expect(apiMock.folders.size).toBe(0);

    await app.close();
    app = null;
    ({ app, page } = await launchApp(profileDir, apiMock));
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await expect(page.getByRole("link", { name: /All Notes/ })).toBeVisible();
    await expect(page.locator(".folder-item").filter({ hasText: "Renamed Drafts" })).toBeVisible();

    const afterRestart = await page.evaluate(() => ({ data: window.api.getCachedData(), status: window.api.getSyncStatus() }));
    expect(afterRestart.data.notes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Offline UI note", content: expect.stringContaining("Durable content saved offline") }),
    ]));
    expect(afterRestart.data.folders).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Renamed Drafts" })]));
    expect(afterRestart.status.pending).toBeGreaterThan(0);

    apiMock.online = true;
    apiMock.failAfterAcceptCollection = "notes";
    await page.evaluate(() => window.api.retryPendingSync());
    await expect.poll(() => apiMock.acceptedFailureCount, { timeout: 10000 }).toBe(1);
    await page.evaluate(() => window.api.retryPendingSync());
    await expect.poll(() => page.evaluate(() => window.api.getSyncStatus().pending), { timeout: 15000 }).toBe(0);

    expect(apiMock.folders.size).toBe(1);
    expect(apiMock.notes.size).toBe(1);
    const remoteFolder = [...apiMock.folders.values()][0];
    const remoteNote = [...apiMock.notes.values()][0];
    expect(remoteFolder.name).toBe("Renamed Drafts");
    expect(remoteNote.name).toBe("Offline UI note");
    expect(remoteNote.content).toContain("Durable content saved offline");
    expect(remoteNote.folderId).toBe(remoteFolder.id);

    const noteCreateAttempts = apiMock.requests.filter((request) => request.method === "POST" && request.path === "/notes");
    expect(noteCreateAttempts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(noteCreateAttempts.map((request) => request.key)).size).toBe(1);
    expect(noteCreateAttempts[0].key).toBeTruthy();
    expect(apiMock.acceptedFailureCount).toBe(1);
    expect(pageErrors).toEqual([]);
  } finally {
    if (app) await app.close();
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
});

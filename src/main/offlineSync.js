const { randomUUID } = require("crypto");
const { EventEmitter } = require("events");

const emptyState = () => ({ notes: [], folders: [], pending: [] });
let sharedInstance;

function getAccountId(token) {
  try {
    const encodedPayload = token && token.split(".")[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const id = payload.sub ?? payload.id;
    if (id != null) return String(id);
    return payload.email ? String(payload.email).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

function isPermanentClientError(error) {
  return Number.isFinite(error?.status) && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
}

class OfflineSync {
  constructor({ store, getToken, apiRequest, retryBaseMs = 1500, retryMaxMs = 60000 }) {
    this.store = store;
    this.getToken = getToken;
    this.apiRequest = apiRequest;
    this.retryBaseMs = retryBaseMs;
    this.retryMaxMs = retryMaxMs;
    this.flushes = new Map();
    this.retryTimers = new Map();
    this.retryAttempts = new Map();
    this.events = new EventEmitter();
  }

  _accountId() {
    const id = getAccountId(this.getToken());
    if (!id) throw new Error("A valid account is required for offline data");
    return id;
  }

  _read(accountId) {
    const stored = this.store.get("accounts", {})[accountId] || emptyState();
    return {
      notes: Array.isArray(stored.notes) ? stored.notes : [],
      folders: Array.isArray(stored.folders) ? stored.folders : [],
      pending: Array.isArray(stored.pending) ? stored.pending : [],
    };
  }

  _write(accountId, state) {
    this.store.set("accounts", { ...this.store.get("accounts", {}), [accountId]: state });
  }

  _emit(accountId) {
    const { notes, folders } = this._read(accountId);
    this.events.emit("data", { notes, folders });
  }

  _upsert(records, record) {
    const index = records.findIndex((item) => item.id === record.id);
    if (index === -1) records.push(record);
    else records[index] = { ...records[index], ...record };
  }

  getCachedData() {
    const { notes, folders } = this._read(this._accountId());
    return { notes, folders };
  }

  setCachedData(remote) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const localNotesByRemoteId = new Map(state.notes.map((note) => [note.remoteId ?? note.id, note]));
    const notes = (remote.notes || []).map((remoteNote) => {
      const local = localNotesByRemoteId.get(remoteNote.id);
      if (!local) return remoteNote;
      const hasPending = state.pending.some((operation) => operation.entityId === local.id && operation.path.startsWith("/notes"));
      const merged = hasPending
        ? { ...remoteNote, ...local, id: local.id, remoteId: remoteNote.id }
        : { ...local, ...remoteNote, id: local.id, remoteId: remoteNote.id };
      if (local.content !== undefined && remoteNote.content === undefined) merged.content = local.content;
      if (local.drawingData !== undefined && remoteNote.drawingData === undefined) merged.drawingData = local.drawingData;
      return merged;
    });
    for (const local of state.notes) {
      if (!notes.some((note) => note.id === local.id) && (local.remoteId === undefined || state.pending.some((op) => op.entityId === local.id && op.path.startsWith("/notes")))) notes.push(local);
    }

    const localFoldersByRemoteId = new Map(state.folders.map((folder) => [folder.remoteId ?? folder.id, folder]));
    const folders = (remote.folders || []).map((remoteFolder) => {
      const local = localFoldersByRemoteId.get(remoteFolder.id);
      if (!local) return remoteFolder;
      const hasPending = state.pending.some((operation) => operation.entityId === local.id && operation.path.startsWith("/folders"));
      return hasPending
        ? { ...remoteFolder, ...local, id: local.id, remoteId: remoteFolder.id }
        : { ...local, ...remoteFolder, id: local.id, remoteId: remoteFolder.id };
    });
    for (const local of state.folders) {
      if (!folders.some((folder) => folder.id === local.id) && (local.remoteId === undefined || state.pending.some((op) => op.entityId === local.id && op.path.startsWith("/folders")))) folders.push(local);
    }

    const localFolderIdByRemote = new Map(folders.map((folder) => [folder.remoteId ?? folder.id, folder.id]));
    for (const folder of folders) {
      if (folder.parentId != null) folder.parentId = localFolderIdByRemote.get(folder.parentId) ?? folder.parentId;
    }
    for (const note of notes) {
      if (note.folderId != null) note.folderId = localFolderIdByRemote.get(note.folderId) ?? note.folderId;
    }
    state.notes = notes;
    state.folders = folders;
    this._write(accountId, state);
    this._emit(accountId);
    return { notes, folders };
  }

  saveNoteLocally(note) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    this._upsert(state.notes, note);
    this._write(accountId, state);
    this._enqueue(accountId, "PUT", `/notes/${note.id}`, note, note.id);
    this._emit(accountId);
    this._scheduleRetry(accountId, 250);
    return true;
  }

  clearCachedData() {
    // Keep account-scoped notes and queued changes across logout/re-login.
    return this.getSyncStatus();
  }

  getSyncStatus() {
    const state = this._read(this._accountId());
    return { pending: state.pending.length, lastError: state.pending[0]?.lastError || null };
  }

  onDataChange(callback) {
    this.events.on("data", callback);
    return () => this.events.off("data", callback);
  }

  async getAllData() {
    const accountId = this._accountId();
    const cached = this._read(accountId);
    this.flushPendingSync().catch(() => {});
    try {
      return this.setCachedData(await this.apiRequest("/notes/all"));
    } catch {
      return { notes: cached.notes, folders: cached.folders };
    }
  }

  async getNoteWindowData(noteId) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const note = state.notes.find((item) => item.id === noteId) || null;
    if (!note) return { note: null, folders: state.folders };
    const field = note.noteType === "drawing" ? "drawingData" : "content";
    if (note[field] === undefined) note[field] = await this.getNoteContent(noteId, note.noteType === "drawing" ? "drawing" : "text");
    return { note, folders: state.folders };
  }

  async getNoteContent(noteId, type) {
    const accountId = this._accountId();
    const note = this._read(accountId).notes.find((item) => item.id === noteId);
    const field = type === "drawing" ? "drawingData" : "content";
    if (note && note[field] !== undefined) return note[field];
    try {
      const remoteId = note?.remoteId ?? noteId;
      const result = await this.apiRequest(`/notes/${remoteId}/content`);
      const value = result[field];
      if (note) {
        const latest = this._read(accountId);
        const index = latest.notes.findIndex((item) => item.id === noteId);
        if (index !== -1) latest.notes[index] = { ...latest.notes[index], [field]: value };
        this._write(accountId, latest);
      }
      return value;
    } catch (error) {
      if (note) return note[field] || (type === "drawing" ? undefined : "");
      throw error;
    }
  }

  async createNote(noteType = "text") {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const id = Math.min(0, ...state.notes.map((note) => Number(note.id) || 0)) - 1;
    const now = Date.now();
    const note = { id, name: "Untitled", color: "#ffffff", content: "", noteType, tags: [], images: [], createdAt: now, updatedAt: now };
    state.notes.push(note);
    this._write(accountId, state);
    this._enqueue(accountId, "POST", "/notes", { noteType }, id);
    this._emit(accountId);
    this._scheduleRetry(accountId, 100);
    return note;
  }

  async updateNote(note) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    this._upsert(state.notes, note);
    this._write(accountId, state);
    const operationId = this._enqueue(accountId, "PUT", `/notes/${note.id}`, note, note.id);
    this._emit(accountId);
    this._scheduleRetry(accountId, 100);
    return { ...note, pendingSync: this._read(accountId).pending.some((op) => op.id === operationId) };
  }

  async deleteNote(noteId) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const note = state.notes.find((item) => item.id === noteId);
    if (noteId < 0 && note?.remoteId === undefined) {
      state.notes = state.notes.filter((item) => item.id !== noteId);
      state.pending = state.pending.filter((op) => op.entityId !== noteId || !op.path.startsWith("/notes"));
      this._write(accountId, state);
      this._emit(accountId);
      return { success: true, pendingSync: false };
    }
    if (note) note.deleted = true;
    this._write(accountId, state);
    return this._queueAndFlush(accountId, "DELETE", `/notes/${note?.remoteId ?? noteId}`, undefined, noteId);
  }

  async deleteNotePermanently(noteId) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const note = state.notes.find((item) => item.id === noteId);
    const localOnly = noteId < 0 && note?.remoteId === undefined;
    state.notes = state.notes.filter((item) => item.id !== noteId);
    if (localOnly) {
      state.pending = state.pending.filter((op) => op.entityId !== noteId || !op.path.startsWith("/notes"));
      this._write(accountId, state);
      this._emit(accountId);
      return { success: true, pendingSync: false };
    }
    this._write(accountId, state);
    return this._queueAndFlush(accountId, "DELETE", `/notes/${note?.remoteId ?? noteId}/permanent`, undefined, noteId);
  }

  async restoreNote(noteId) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const note = state.notes.find((item) => item.id === noteId);
    if (noteId < 0 && note?.remoteId === undefined) {
      if (note) delete note.deleted;
      this._write(accountId, state);
      this._emit(accountId);
      return { success: true, pendingSync: false };
    }
    if (note) delete note.deleted;
    this._write(accountId, state);
    return this._queueAndFlush(accountId, "POST", `/notes/${note?.remoteId ?? noteId}/restore`, undefined, noteId);
  }

  async createFolder(data) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const id = Math.min(0, ...state.folders.map((folder) => Number(folder.id) || 0)) - 1;
    const folder = { id, name: data.name, parentId: data.parentId ?? null };
    state.folders.push(folder);
    this._write(accountId, state);
    this._enqueue(accountId, "POST", "/folders", { name: folder.name, parentId: folder.parentId }, id);
    this._emit(accountId);
    this._scheduleRetry(accountId, 100);
    return folder;
  }

  async updateFolder(folder) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    this._upsert(state.folders, folder);
    this._write(accountId, state);
    const operationId = this._enqueue(accountId, "PUT", `/folders/${folder.id}`, folder, folder.id);
    this._emit(accountId);
    this._scheduleRetry(accountId, 100);
    return { success: true, pendingSync: this._read(accountId).pending.some((op) => op.id === operationId) };
  }

  async deleteFolder(folderId) {
    const accountId = this._accountId();
    const state = this._read(accountId);
    const folder = state.folders.find((item) => item.id === folderId);
    state.folders = state.folders.filter((item) => item.id !== folderId);
    if (folderId < 0 && folder?.remoteId === undefined) {
      state.pending = state.pending.filter((op) => op.entityId !== folderId || !op.path.startsWith("/folders"));
      this._write(accountId, state);
      this._emit(accountId);
      return { success: true, pendingSync: false };
    }
    this._write(accountId, state);
    return this._queueAndFlush(accountId, "DELETE", `/folders/${folder?.remoteId ?? folderId}`, undefined, folderId);
  }

  _queueAndFlush(accountId, method, path, body, entityId) {
    const operationId = this._enqueue(accountId, method, path, body, entityId);
    this._emit(accountId);
    this._scheduleRetry(accountId, 100);
    return Promise.resolve({ success: true, pendingSync: this._read(accountId).pending.some((op) => op.id === operationId) });
  }

  _enqueue(accountId, method, path, body, entityId) {
    const state = this._read(accountId);
    if (method === "POST" && path === "/notes") {
      body = { ...body, name: "Untitled", color: "#ffffff", content: "", noteType: body?.noteType || "text", tags: [], images: [] };
    }
    if (method === "POST" && path === "/folders") {
      body = { ...body, name: body?.name || "Untitled", parentId: body?.parentId ?? null };
    }
    if (method === "PUT" && entityId < 0) {
      const createPath = path.startsWith("/notes/") ? "/notes" : path.startsWith("/folders/") ? "/folders" : null;
      const create = state.pending.find((op) => op.method === "POST" && op.entityId === entityId && op.path === createPath);
      if (create && !create.attempted) {
        const isNote = create.path === "/notes";
        const entity = (isNote ? state.notes : state.folders).find((item) => item.id === entityId);
        if (entity) {
          Object.assign(entity, body || {});
          create.body = isNote
            ? { noteType: entity.noteType || "text", name: entity.name, color: entity.color, content: entity.content, drawingData: entity.drawingData, tags: entity.tags, folderId: entity.folderId, status: entity.status, pinned: entity.pinned, images: entity.images }
            : { name: entity.name, parentId: entity.parentId };
          this._write(accountId, state);
          return create.id;
        }
      }
    }
    const existing = method === "POST" ? null : state.pending.find((op) => op.method === method && op.entityId === entityId && op.path === path);
    if (existing) {
      existing.body = body;
      existing.revision += 1;
      existing.lastError = null;
      this._write(accountId, state);
      return existing.id;
    }
    const operation = { id: randomUUID(), method, path, body, entityId, revision: 1, lastError: null };
    state.pending.push(operation);
    this._write(accountId, state);
    return operation.id;
  }

  _remotePath(state, path) {
    const match = path.match(/^\/(notes|folders)\/(-?\d+)(.*)$/);
    if (!match) return path;
    const collection = match[1] === "notes" ? state.notes : state.folders;
    const entity = collection.find((record) => record.id === Number(match[2]));
    const serverId = entity?.remoteId;
    return serverId === undefined ? path : `/${match[1]}/${serverId}${match[3]}`;
  }

  _remoteBody(state, operation) {
    if (!operation.body || typeof operation.body !== "object") return operation.body;
    const body = { ...operation.body };
    delete body.remoteId;
    delete body.pendingSync;
    if (operation.method === "PUT") delete body.id;
    if (body.folderId != null) {
      const folder = state.folders.find((record) => record.id === body.folderId);
      if (folder?.remoteId !== undefined) body.folderId = folder.remoteId;
    }
    if (body.parentId != null) {
      const parent = state.folders.find((record) => record.id === body.parentId);
      if (parent?.remoteId !== undefined) body.parentId = parent.remoteId;
    }
    return body;
  }

  _scheduleRetry(accountId, initialDelay) {
    if (this.retryTimers.has(accountId)) return;
    const attempt = (this.retryAttempts.get(accountId) || 0) + 1;
    this.retryAttempts.set(accountId, attempt);
    const delay = initialDelay ?? Math.min(this.retryBaseMs * 2 ** (attempt - 1), this.retryMaxMs);
    const timer = setTimeout(() => {
      this.retryTimers.delete(accountId);
      if (getAccountId(this.getToken()) === accountId) this.flushPendingSync().catch(() => {});
    }, delay);
    timer.unref?.();
    this.retryTimers.set(accountId, timer);
  }

  async flushPendingSync() {
    const accountId = this._accountId();
    if (this.flushes.has(accountId)) return this.flushes.get(accountId);
    const retryTimer = this.retryTimers.get(accountId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(accountId);
    }
    const flush = (async () => {
      let synced = 0;
      while (true) {
        const state = this._read(accountId);
        const operation = state.pending[0];
        if (!operation) {
          this.retryAttempts.delete(accountId);
          return { synced, pending: 0 };
        }
        if (getAccountId(this.getToken()) !== accountId) {
          return { synced, pending: state.pending.length, blocked: true, accountChanged: true };
        }
        const revision = operation.revision;
        operation.attempted = true;
        this._write(accountId, state);
        const options = { method: operation.method, headers: { "Idempotency-Key": operation.id } };
        const body = this._remoteBody(state, operation);
        if (body !== undefined) options.body = JSON.stringify(body);
        let result;
        try {
          result = await this.apiRequest(this._remotePath(state, operation.path), options);
        } catch (error) {
          const latest = this._read(accountId);
          const pending = latest.pending.find((item) => item.id === operation.id);
          if (pending) pending.lastError = error?.message || "Sync failed";
          this._write(accountId, latest);
          if (!isPermanentClientError(error)) this._scheduleRetry(accountId);
          else this.retryAttempts.delete(accountId);
          return { synced, pending: latest.pending.length, blocked: isPermanentClientError(error) };
        }

        const latest = this._read(accountId);
        const pending = latest.pending.find((item) => item.id === operation.id);
        if (!pending) continue;
        if (pending.revision !== revision) continue;
        if (pending.method === "POST" && ["/notes", "/folders"].includes(pending.path) && pending.entityId !== undefined) {
          const remoteEntity = result?.note || result?.folder || result;
          const remoteId = Number(remoteEntity?.id);
          const list = pending.path === "/notes" ? latest.notes : latest.folders;
          const index = list.findIndex((record) => record.id === pending.entityId);
          if (!Number.isFinite(remoteId) || remoteId < 0) {
            pending.lastError = "Create response did not include a valid server ID";
            this._write(accountId, latest);
            return { synced, pending: latest.pending.length, blocked: true };
          }
          if (index >= 0) list[index] = { ...list[index], remoteId };
        }
        latest.pending = latest.pending.filter((item) => item.id !== operation.id);
        this._write(accountId, latest);
        this._emit(accountId);
        synced += 1;
      }
    })().finally(() => this.flushes.delete(accountId));
    this.flushes.set(accountId, flush);
    return flush;
  }
}

function getOfflineSync({ getToken, apiRequest } = {}) {
  if (!sharedInstance) {
    const Store = require("electron-store");
    const secureStorage = require("./secureStorage.js");
    const proxy = require("./apiProxy.js");
    sharedInstance = new OfflineSync({
      store: new Store({ name: "offline-sync" }),
      getToken: getToken || secureStorage.getSecureToken,
      apiRequest: apiRequest || proxy.apiRequest,
    });
  }
  return sharedInstance;
}

module.exports = { OfflineSync, getAccountId, getOfflineSync };

import { Note, Folder } from "./models";

export interface WindowAPI {
  // Acciones de ventana
  createNote: () => void;
  createNoteDashboard: () => Promise<Note>;
  openNoteWindow: (noteId: number, x: number, y: number) => void;
  showAllNotes: () => void;
  getAllNotes: () => Promise<Note[]>;
  showNoteById: (noteId: number) => void;
  openNotesList: () => void;
  openRemindersList: () => void;
  openDashboard: () => void;

  // Control de ventana
  minimizeWindow: () => void;
  closeWindow: () => void;
  destroyWindow: () => void;
  toggleMaximize: () => void;

  // Operaciones de notas
  updateNote: (note: Note) => void;
  deleteNote: (id: number) => void;
  deleteNotePermanently: (id: number) => void;
  restoreNote: (id: number) => void;
  getNoteContent: (noteId: number) => Promise<string>;
  saveAsset: (data: {
    fileBuffer: ArrayBuffer;
    fileName: string;
    noteId: number;
  }) => Promise<string>;
  cleanUnusedAssets: (data: {
    noteId: number;
    referencedImages: string[];
  }) => Promise<void>;
  getDataPath: () => Promise<string>;

  // Operaciones de carpetas
  getAllFolders: () => Promise<Folder[]>;
  createFolder: (folderData: Partial<Folder>) => Promise<Folder>;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (id: number) => void;
  moveFolder: (folderId: number, newParentId: number | null) => void;

  // Callbacks
  onNoteData: (callback: (data: Note) => void) => () => void;

  // Recordatorios
  setReminder: (
    noteId: number,
    date: string,
    time: string,
    repeat?: boolean
  ) => void;
  getAllReminders: () => Promise<Note[]>;
  cancelReminder: (noteId: number) => void;

  // Utilidades de ventana
  getWindowPosition: () => Promise<[number, number]>;
  getWindowSize: () => Promise<[number, number]>;

  // Auto-Update
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  quitAndInstall: () => void;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    api: WindowAPI;
  }
}

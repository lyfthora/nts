import { Note, Folder } from "./models";

export interface WindowAPI {
  // Auth
  setAuthToken: (token: string) => void;
  getAuthToken: () => string | null;
  openOAuth: (url: string) => Promise<void>;
  getOAuthToken: () => Promise<string | null>;
  clearAuthToken: () => string | null;

  //cache
  getCachedData: () => { notes: Note[]; folders: Folder[]} | null;
  setCachedData: (data: { notes: Note[]; folders: Folder[]}) => void;
  clearCachedData: () => void;

  // Acciones de ventana
  createNoteDashboard: () => Promise<Note>;
  getAllData: () => Promise<{ notes: Note[]; folders: Folder[] }>;

  // Control de ventana
  minimizeWindow: () => void;
  closeWindow: () => void;

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
  getDrawingData: (noteId: number) => Promise<string | undefined>;

  // Import/Export
  exportNote: (
    noteId: number,
    format: string,
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  importNote: () => Promise<{ success: boolean; note?: Note; notes?: Note[]; error?: string }>;
  exportAllNotes: () => Promise<{ success: boolean; path?: string; error?: string }>;

  // Backlinks
  getBacklinks: (noteName: string) => Promise<
    {
      id: number;
      name: string;
      preview: string;
    }[]
  >;

  // Operaciones de carpetas
  createFolder: (folderData: Partial<Folder>) => Promise<Folder>;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (id: number) => void;

  // Callbacks
  onNoteData: (callback: (data: Note) => void) => () => void;

  // Utilidades de ventana
  getWindowPosition: () => Promise<[number, number]>;
  getWindowSize: () => Promise<[number, number]>;
  // Note external window
  openNoteWindow: (noteId: number, x: number, y: number) => Promise<void>;
  sendNoteChange: (note: Note) => void;
  onExternalNoteChanged: (callback: (note: Note) => void) => () => void;
  onNoteWindowClosed: (callback: (noteId: number) => void) => () => void;
  onDashboardNoteChanged: (callback: (note: Note) => void) => () => void;
  onNoteWindowInit: (
    callback: (data: { note: Note; folders: Folder[] }) => void,
  ) => () => void;
  getNoteWindowData: (
    noteId: number,
  ) => Promise<{ note: Note; folders: Folder[] }>;
  // Auto-Update
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  quitAndInstall: () => void;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
  // onInitialData: (
  //   callback: (data: { notes: Note[]; folders: Folder[] }) => void
  // ) => () => void;
}

declare global {
  interface Window {
    api: WindowAPI;
  }
}

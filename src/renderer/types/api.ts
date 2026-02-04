import { Note, Folder } from "./models";

export interface WindowAPI {
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

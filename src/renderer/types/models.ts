//data models
export interface Note {
  id: number;
  name: string;
  content: string;
  color: string;
  x?: number;
  y?: number;
  deleted?: boolean;
  status?: "active" | "onhold" | "completed" | "dropped" | "";
  tags?: string[];
  folderId?: number | null;
  reminder?: {
    date: string;
    time: string;
    repeat?: boolean;
  };
}
export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  expanded?: boolean;
  isSystem?: boolean;
}

export interface StatusCounts {
  active: number;
  onhold: number;
  completed: number;
  dropped: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface FolderCounts {
  [folderId: number]: number;
}

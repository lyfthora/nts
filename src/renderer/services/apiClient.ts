import { SubscriptionStatus } from "../types/models";

const isDev = window.api ? window.api.isDev : false;
const API_URL = isDev
  ? "http://localhost:3001/api"
  : "https://nts-api-production-5769.up.railway.app/api";

async function request<T>(path: string, options?: RequestInit): Promise<T>{
  const token = window.api.getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.api.clearAuthToken();
      window.api.clearCachedData();
      window.location.reload();
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {

   // notes

  // get all (notes + folders)
  getAllData: () =>
    request<{ notes: any[]; folders: any[]}>("/notes/all"),
 // get notes content
 getNoteContent: (noteId: number) =>
  request <{ content: string; drawingData: string | null}> (`/notes/${noteId}/content`),
 //create note
 createNote: (data: Record<string, unknown>) =>
  request<any>("/notes",{
    method: "POST",
    body: JSON.stringify(data),
  }),
  //update note
  updateNote: (id: number, data: Record<string, unknown>) =>
    request<any>(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  //soft delete
  deleteNote: (id: number) =>
    request<any>(`/notes/${id}`, { method: "DELETE" }),
  //restore
  restoreNote: (id: number) =>
    request<any>(`/notes/${id}/restore`, { method: "POST" }),
  //delete permanent
  deleteNotePermanently: (id: number) =>
    request<any>(`/notes/${id}/permanent`, { method: "DELETE" }),
  //backlinks
  getBacklinks: (noteName: string) =>
    request<{ id: number; name: string; preview: string }[]>(
      `/notes/${encodeURIComponent(noteName)}/backlinks`
    ),

  //folders

getAllFolders: () => request<any[]>("/folders"),
createFolder: (data: Record<string, unknown>) =>
request<any>("/folders", {
  method: "POST",
  body: JSON.stringify(data),
}),
updateFolder: (id: number, data: Record<string, unknown>) =>
request<any>(`/folders/${id}`, {
  method: "PUT",
body: JSON.stringify(data),
}),
deleteFolder: (id: number) =>
  request<any>(`/folders/${id}`, { method: "DELETE" }),

  //assets

  uploadAsset: (fileBuffer: ArrayBuffer, fileName: string, noteId: number) =>
    request<{ url: string}>("/assets/upload", {
      method: "POST",
      body: JSON.stringify({
        fileBuffer: Array.from(new Uint8Array(fileBuffer)),
        fileName,
        noteId,
      }),
    }),
     cleanUnusedAssets: (currentImages: string[], referencedImages: string[]) =>
    request<{ success: boolean }>("/assets/clean", {
      method: "POST",
      body: JSON.stringify({ currentImages, referencedImages }),
    }),

    // subscription
  getSubscriptionStatus: () =>
    request<SubscriptionStatus>("/subscription/status"),
  createCheckoutSession: () =>
    request<{ url: string }>("/subscription/checkout", { method: "POST" }),
  createPortalSession: () =>
    request<{ url: string }>("/subscription/portal", { method: "POST" }),
};

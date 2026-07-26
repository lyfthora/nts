const CONTENT_PREFIX = "nts_content_";
const DRAWING_PREFIX = "nts_drawing_";

export function getCachedContent(noteId: number, type: "text" | "drawing" = "text"): string | null {
  try {
    const key = type === "drawing" ? `${DRAWING_PREFIX}${noteId}` : `${CONTENT_PREFIX}${noteId}`;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setCachedContent(noteId: number, content: string, type: "text" | "drawing" = "text"): void {
  try {
    const key = type === "drawing" ? `${DRAWING_PREFIX}${noteId}` : `${CONTENT_PREFIX}${noteId}`;
    localStorage.setItem(key, content);
  } catch (e) {
    console.error("Error setting cached content", e);
  }
}

export function removeCachedContent(noteId: number, type: "text" | "drawing" = "text"): void {
  try {
    const key = type === "drawing" ? `${DRAWING_PREFIX}${noteId}` : `${CONTENT_PREFIX}${noteId}`;
    localStorage.removeItem(key);
  } catch {}
}

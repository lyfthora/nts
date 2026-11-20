import React, { useEffect, useRef, useState, startTransition } from "react";
import { marked } from "marked";
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';

interface MarkdownPreviewProps {
  content: string;
  onContentChange?: (newContent: string) => void;
}

// Antes se pedía la ruta por IPC en cada tecla; ahora se resuelve una sola vez.
let dataPathPromise: Promise<string> | null = null;
function getDataPath(): Promise<string> {
  if (!dataPathPromise) {
    dataPathPromise = window.api.getDataPath();
  }
  return dataPathPromise;
}

// Repintar el preview (marked + innerHTML + resaltado) es lo caro, así que se
// espera a que el usuario deje de teclear: mientras teclea no se genera HTML,
// y al parar se repinta una sola vez con el último texto.
const RENDER_DELAY_MS = 200;

// El resaltado de highlight.js se cachea por bloque: al reemplazar el HTML
// completo, sin caché se volvían a resaltar todos los bloques en cada render.
const highlightCache = new Map<string, string>();
const HIGHLIGHT_CACHE_LIMIT = 400;

function highlightCode(code: string, language: string): string {
  const key = `${language}\u0000${code}`;
  const cached = highlightCache.get(key);
  if (cached !== undefined) return cached;
  const value =
    language && hljs.getLanguage(language)
      ? hljs.highlight(code, { language, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value;
  if (highlightCache.size >= HIGHLIGHT_CACHE_LIMIT) highlightCache.clear();
  highlightCache.set(key, value);
  return value;
}

function buildHtml(content: string, dataPath: string): string {
  const imageWidths = new Map<string, number>();
  const widthRegex = /!\[([^\]]*)\]\(([^)]+)\)\{width=(\d+)\}/g;
  const imgCountForWidth = new Map<string, number>();
  let match;
  while ((match = widthRegex.exec(content)) !== null) {
    const imgPath = match[2];
    const index = imgCountForWidth.get(imgPath) ?? 0;
    imgCountForWidth.set(imgPath, index + 1);
    imageWidths.set(`${imgPath}:${index}`, parseInt(match[3], 10));
  }

  const imageCounters = new Map<string, number>();

  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const language = (lang || "").trim().split(/\s+/)[0];
    const className = language ? `hljs language-${language}` : "hljs";
    return `<pre><code class="${className}">${highlightCode(text, language)}</code></pre>`;
  };
  renderer.image = ({ href, title, text }) => {
    const originalHref = href || '';
    const src = originalHref.startsWith("assets/")
      ? `file:///${dataPath}/${originalHref}`.replace(/\\/g, "/")
      : originalHref;

    const currentIndex = imageCounters.get(originalHref) ?? 0;
    imageCounters.set(originalHref, currentIndex + 1);

    const width = imageWidths.get(`${originalHref}:${currentIndex}`);
    const style = width ? ` style="width:${width}px;max-width:100%"` : '';
    return `<div class="preview-image-wrapper" data-src="${originalHref}" data-index="${currentIndex}"><img src="${src}" alt="${text}" title="${title || ""}"${style}/><div class="preview-image-resize-handle"></div></div>`;
  };

  return marked(content.replace(/\{width=\d+\}/g, ''), {
    breaks: true,
    gfm: true,
    renderer,
  }) as string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, onContentChange }) => {
  const [html, setHtml] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const pendingContentRef = useRef(content);
  const renderSeqRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const renderNow = React.useCallback((source: string) => {
    const seq = ++renderSeqRef.current;
    getDataPath().then((dataPath) => {
      // Descartar renders que quedaron atrás: solo interesa el último texto.
      if (seq !== renderSeqRef.current) return;
      const rendered = buildHtml(source, dataPath);
      // Transición: escribir en el editor no espera a que se repinte el HTML.
      startTransition(() => setHtml(rendered));
    });
  }, []);

  useEffect(() => {
    pendingContentRef.current = content;
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      renderNow(pendingContentRef.current);
    }, RENDER_DELAY_MS);
  }, [content, renderNow]);

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      renderSeqRef.current++;
    },
    [],
  );

  useEffect(() => {
    const container = panelRef.current?.querySelector('.markdown-preview-content');
    if (!container) return;

    let activeWrapper: HTMLElement | null = null;
    let activeImg: HTMLImageElement | null = null;
    let startX = 0, startY = 0, startWidth = 0, aspectRatio = 1;

    const handleMouseMove = (e: MouseEvent) => {
      if (!activeImg) return;
      const delta = (e.clientX - startX + e.clientY - startY) / 2;
      const newWidth = Math.max(50, startWidth + delta);
      activeImg.style.width = `${newWidth}px`;
      activeImg.style.height = `${newWidth / aspectRatio}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!activeWrapper || !activeImg) return;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      activeWrapper.classList.remove('resizing');

      const delta = (e.clientX - startX + e.clientY - startY) / 2;
      const finalWidth = Math.max(50, Math.round(startWidth + delta));
      const imgSrc = activeWrapper.getAttribute('data-src');
      const imgIndex = parseInt(activeWrapper.getAttribute('data-index') || '0', 10);

      if (imgSrc && onContentChange) {
        const scrollTop = panelRef.current?.scrollTop ?? 0;
        const escapedSrc = imgSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imgRegex = new RegExp(
          `(!\\[[^\\]]*\\]\\(${escapedSrc}\\))(\\{width=\\d+\\})?`,
          'g'
        );
        let currentIndex = 0;
        const newContent = contentRef.current.replace(imgRegex, (match, p1) => {
          if (currentIndex === imgIndex) {
            currentIndex++;
            return `${p1}{width=${finalWidth}}`;
          }
          currentIndex++;
          return match;
        });

        if (newContent !== contentRef.current) {
          onContentChange(newContent);
          requestAnimationFrame(() => {
            if (panelRef.current) panelRef.current.scrollTop = scrollTop;
          });
        }
      }

      activeWrapper = null;
      activeImg = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('preview-image-resize-handle')) return;

      e.preventDefault();
      e.stopPropagation();

      const wrapper = target.parentElement as HTMLElement;
      const img = wrapper?.querySelector('img') as HTMLImageElement;
      if (!wrapper || !img) return;

      activeWrapper = wrapper;
      activeImg = img;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = img.offsetWidth;
      aspectRatio = img.offsetWidth / img.offsetHeight;
      document.body.style.cursor = 'nwse-resize';
      wrapper.classList.add('resizing');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    container.addEventListener('mousedown', handleMouseDown as EventListener);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown as EventListener);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [html, onContentChange]);

  return (
    <div className="markdown-preview-panel" ref={panelRef}>
      <div
        className="markdown-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default MarkdownPreview;

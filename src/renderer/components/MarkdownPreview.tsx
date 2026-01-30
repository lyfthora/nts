import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface MarkdownPreviewProps {
  content: string;
  onContentChange?: (newContent: string) => void;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, onContentChange }) => {
  const [html, setHtml] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    const renderMarkdown = async () => {
      const dataPath = await window.api.getDataPath();

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

      const rendered = marked(content.replace(/\{width=\d+\}/g, ''), {
        breaks: true,
        gfm: true,
        renderer,
      });
      setHtml(rendered as string);

      requestAnimationFrame(() => {
        document.querySelectorAll('.markdown-preview-content pre code').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
        });
      });
    };
    renderMarkdown();
  }, [content]);

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

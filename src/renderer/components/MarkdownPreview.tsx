import React, { useEffect, useState } from "react";
import { marked } from "marked";

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const renderMarkdown = async () => {
      const dataPath = await window.api.getDataPath();

      const renderer = new marked.Renderer();
      renderer.image = ({ href, title, text }) => {
        let src = href || '';
        if (src && src.startsWith("assets/")) {
          src = `file:///${dataPath}/${src}`.replace(/\\/g, "/");
        }
        return `<img src="${src}" alt="${text}" title="${title || ""}" />`;
      };

      const rendered = marked(content, {
        breaks: true,
        gfm: true,
        renderer,
      });
      setHtml(rendered as string);
    };
    renderMarkdown();
  }, [content]);
  return (
    <div className="markdown-preview-panel">
      <div
        className="markdown-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default MarkdownPreview;

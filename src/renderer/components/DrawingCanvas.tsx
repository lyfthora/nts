import React, { useEffect, useRef, useState, useCallback } from 'react';
import getStroke from 'perfect-freehand';
import './DrawingCanvas.css';
interface Point {
  x: number;
  y: number;
  pressure: number;
}
interface Stroke {
  points: Point[];
  color: string;
  width: number;
}
interface DrawingData {
  version: string;
  background: 'black' | 'white' | 'grid';
  strokes: Stroke[];
}
interface DrawingCanvasProps {
  drawingData: string | undefined;
  background: 'black' | 'white' | 'grid';
  onChange: (canvasJSON: string) => void;
  color: string;
  lineWidth: number;
  isEraser: boolean;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}
const MIN_DIST = 0.3;
const MAX_DIST = 15;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_FACTOR = 1.1;
// Mejora 6: Curva de presión sigmoid (smoothstep con clamp)
const pressureCurve = (p: number) => {
  const clamped = Math.max(0.15, Math.min(p, 0.95));
  const t = (clamped - 0.15) / 0.8;
  return t * t * (3 - 2 * t);
};
// Mejora 2+3+4+5: drawInkStroke fuera del componente (pura, sin deps)
const drawInkStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (stroke.points.length < 2) return;
  const pts = stroke.points.map(p => [
    p.x,
    p.y,
    pressureCurve(p.pressure),
  ]);
  // Mejora 5: Parámetros ajustados
  const outline = getStroke(pts, {
    size: stroke.width * 2,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    last: true,
    easing: (t) => t,
    start: { taper: 15, cap: true },
    end: { taper: 15, cap: true },
  });
  if (!outline.length) return;
  // Mejora 2: Curvas Bézier + Mejora 4: Sin globalAlpha (opaco 100%)
  ctx.save();
  ctx.fillStyle = stroke.color;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length - 1; i++) {
    const xc = (outline[i][0] + outline[i + 1][0]) / 2;
    const yc = (outline[i][1] + outline[i + 1][1]) / 2;
    ctx.quadraticCurveTo(outline[i][0], outline[i][1], xc, yc);
  }
  const last = outline[outline.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Mejora 3: Eliminada capa de texture overlay (grain)
};
const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  drawingData,
  background,
  onChange,
  color,
  lineWidth,
  isEraser,
  zoomLevel,
  onZoomChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  // Mejora 1: useRef en vez de useState para trazo actual y estado de dibujo
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number>(0);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [ctrlHeld, setCtrlHeld] = useState(false);
  // Refs para valores actuales (evitar closures obsoletas durante rAF)
  const colorRef = useRef(color);
  const lineWidthRef = useRef(lineWidth);
  colorRef.current = color;
  lineWidthRef.current = lineWidth;
  // Load saved data
  useEffect(() => {
    if (drawingData) {
      try {
        const data: DrawingData = JSON.parse(drawingData);
        setStrokes(data.strokes || []);
      } catch (e) {
        console.error('Error loading drawing:', e);
      }
    }
  }, [drawingData]);
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const off = offsetRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background === 'black') ctx.fillStyle = '#000';
    else if (background === 'white') ctx.fillStyle = '#fff';
    else ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (background === 'grid') {
      ctx.save();
      ctx.translate(off.x, off.y);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1 / zoomLevel;
      const g = 24;
      const startX = Math.floor(-off.x / zoomLevel / g) * g;
      const startY = Math.floor(-off.y / zoomLevel / g) * g;
      const endX = startX + canvas.width / zoomLevel + g;
      const endY = startY + canvas.height / zoomLevel + g;
      for (let x = startX; x < endX; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += g) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(off.x, off.y);
    ctx.scale(zoomLevel, zoomLevel);
    strokes.forEach(s => drawInkStroke(ctx, s));
    // Dibujar trazo actual desde ref (Mejora 1)
    const current = currentStrokeRef.current;
    if (current.length > 1) {
      // Mejora 7: Predicción de punto
      let pointsToDraw = current;
      if (current.length >= 3) {
        const l = current[current.length - 1];
        const p = current[current.length - 2];
        const predicted: Point = {
          x: l.x + (l.x - p.x) * 0.4,
          y: l.y + (l.y - p.y) * 0.4,
          pressure: l.pressure,
        };
        pointsToDraw = [...current, predicted];
      }
      drawInkStroke(ctx, {
        points: pointsToDraw,
        color: colorRef.current,
        width: lineWidthRef.current,
      });
    }
    ctx.restore();
  }, [strokes, background, zoomLevel]);
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;
    const observer = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawRef.current();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    redraw();
  }, [redraw]);
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const off = offsetRef.current;
    return {
      x: (e.clientX - rect.left - off.x) / zoomLevel,
      y: (e.clientY - rect.top - off.y) / zoomLevel,
    };
  }, [zoomLevel]);
  const dist = (a: Point, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  // Mejora 1: scheduleFrame con rAF (bypasea React)
  const scheduleFrame = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => redrawRef.current());
  }, []);
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // ctrl + click = pan
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
      return;
    }
    if (isEraser) return;
    const pos = getPos(e);
    const p = e.pressure || 0.5;
    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x: pos.x, y: pos.y, pressure: p }];
  }, [isEraser, getPos]);
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      offsetRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
      scheduleFrame();
      return;
    }
    if (!isDrawingRef.current || isEraser) return;
    const pos = getPos(e);
    const p = e.pressure || 0.5;
    const prev = currentStrokeRef.current;
    const last = prev[prev.length - 1];
    if (!last) {
      currentStrokeRef.current = [{ x: pos.x, y: pos.y, pressure: p }];
    } else {
      const d = dist(last, pos);
      if (d < MIN_DIST) return;
      if (d > MAX_DIST) {
        const steps = Math.ceil(d / MAX_DIST);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          currentStrokeRef.current.push({
            x: last.x + (pos.x - last.x) * t,
            y: last.y + (pos.y - last.y) * t,
            pressure: last.pressure + (p - last.pressure) * t,
          });
        }
      } else {
        currentStrokeRef.current.push({ x: pos.x, y: pos.y, pressure: p });
      }
    }
    scheduleFrame();
  }, [isEraser, getPos, scheduleFrame]);
  const handlePointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
    if (!isDrawingRef.current || currentStrokeRef.current.length === 0) return;
    const newStroke: Stroke = {
      points: currentStrokeRef.current,
      color,
      width: lineWidth,
    };
    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    const data: DrawingData = {
      version: '1.0',
      background,
      strokes: newStrokes,
    };
    onChange(JSON.stringify(data));
  }, [strokes, color, lineWidth, background, onChange]);
  const handleErase = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEraser) return;
    const pos = getPos(e);
    const R = 12 / zoomLevel;
    const filtered = strokes.filter(s =>
      !s.points.some(p => {
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < R;
      })
    );
    if (filtered.length !== strokes.length) {
      setStrokes(filtered);
      const data: DrawingData = {
        version: '1.0',
        background,
        strokes: filtered,
      };
      onChange(JSON.stringify(data));
    }
  }, [isEraser, strokes, background, onChange, getPos, zoomLevel]);
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const off = offsetRef.current;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel * Math.pow(ZOOM_FACTOR, direction)));
    const worldX = (mouseX - off.x) / zoomLevel;
    const worldY = (mouseY - off.y) / zoomLevel;
    offsetRef.current = {
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom,
    };
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      let newZoom = zoomLevel;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        newZoom = Math.min(MAX_ZOOM, zoomLevel * ZOOM_FACTOR);
      } else if (e.key === '-') {
        e.preventDefault();
        newZoom = Math.max(MIN_ZOOM, zoomLevel / ZOOM_FACTOR);
      } else if (e.key === '0') {
        e.preventDefault();
        offsetRef.current = { x: 0, y: 0 };
        onZoomChange(1);
        return;
      } else {
        return;
      }
      const off = offsetRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const worldX = (cx - off.x) / zoomLevel;
      const worldY = (cy - off.y) / zoomLevel;
      offsetRef.current = {
        x: cx - worldX * newZoom,
        y: cy - worldY * newZoom,
      };
      onZoomChange(newZoom);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, onZoomChange]);
  // Cleanup rAF on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);
  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => { handlePointerDown(e); handleErase(e); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          touchAction: 'none',
          cursor: ctrlHeld
            ? (isPanningRef.current ? 'grabbing' : 'grab')
            : (() => {
              const size = Math.max(Math.round(lineWidth * 2), 4);
              const half = size / 2;
              const r = half - 0.5;
              return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${half}" cy="${half}" r="${r}" fill="white"/></svg>') ${half} ${half}, auto`;
            })()
        }}
      />
    </div>
  );
};
export default DrawingCanvas;

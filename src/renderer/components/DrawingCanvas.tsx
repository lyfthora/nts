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

const MIN_DIST = 0.3; // filtro micro jitter
const MAX_DIST = 15;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_FACTOR = 1.1;

const pressureCurve = (p: number) => {
  return Math.pow(p, 0.6); // curva suave tipo lápiz
};

const jitter = (v: number) => v + (Math.random() - 0.5) * 0.15;

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
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [ctrlHeld, setCtrlHeld] = useState(false);
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
    if (currentStroke.length > 0) {
      drawInkStroke(ctx, {
        points: currentStroke,
        color,
        width: lineWidth,
      });
    }
    ctx.restore();
  }, [strokes, currentStroke, background, color, lineWidth, zoomLevel]);
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

  const drawInkStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    const pts = stroke.points.map(p => [
      p.x,
      p.y,
      pressureCurve(p.pressure),
    ]);

    const outline = getStroke(pts, {
      size: stroke.width * 1.8,
      thinning: 0.65,
      smoothing: 0.85,
      streamline: 0.82,
      simulatePressure: false,
      last: true,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    });

    if (!outline.length) return;

    // ---- Base ink layer ----
    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(outline[i][0], outline[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---- Texture overlay (grain) ----
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = stroke.width * 0.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(jitter(outline[0][0]), jitter(outline[0][1]));
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(jitter(outline[i][0]), jitter(outline[i][1]));
    }
    ctx.stroke();
    ctx.restore();
  };

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
    setIsDrawing(true);
    setCurrentStroke([{ x: pos.x, y: pos.y, pressure: p }]);
  }, [isEraser, getPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      offsetRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
      redraw();
      return;
    }
    if (!isDrawing || isEraser) return;
    const pos = getPos(e);
    const p = e.pressure || 0.5;
    setCurrentStroke(prev => {
      const last = prev[prev.length - 1];
      if (!last) return [{ x: pos.x, y: pos.y, pressure: p }];
      const d = dist(last, pos);
      if (d < MIN_DIST) return prev;
      if (d > MAX_DIST) {
        const interpolated: Point[] = [];
        const steps = Math.ceil(d / MAX_DIST);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          interpolated.push({
            x: last.x + (pos.x - last.x) * t,
            y: last.y + (pos.y - last.y) * t,
            pressure: last.pressure + (p - last.pressure) * t,
          });
        }
        return [...prev, ...interpolated];
      }
      return [...prev, { x: pos.x, y: pos.y, pressure: p }];
    });
  }, [isDrawing, isEraser, getPos, redraw]);

  const handlePointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
    if (!isDrawing || currentStroke.length === 0) return;
    const newStroke: Stroke = {
      points: currentStroke,
      color,
      width: lineWidth,
    };
    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    setCurrentStroke([]);
    setIsDrawing(false);
    const data: DrawingData = {
      version: '1.0',
      background,
      strokes: newStrokes,
    };
    onChange(JSON.stringify(data));
  }, [isDrawing, currentStroke, strokes, color, lineWidth, background, onChange]);

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
            : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><circle cx=\"4\" cy=\"4\" r=\"3\" fill=\"white\"/></svg>') 4 4, auto"
        }}
      />
    </div>
  );
};

export default DrawingCanvas;

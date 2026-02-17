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
}

const MIN_DIST = 0.3; // filtro micro jitter
const MAX_DIST = 15;

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [resizeKey, setResizeKey] = useState(0);

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

  // Resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      setResizeKey(k => k + 1);
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (background === 'black') ctx.fillStyle = '#000';
    else if (background === 'white') ctx.fillStyle = '#fff';
    else ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (background === 'grid') {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      const g = 24;
      for (let x = 0; x < canvas.width; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += g) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw saved strokes
    strokes.forEach(s => drawInkStroke(ctx, s));

    // Draw current stroke
    if (currentStroke.length > 0) {
      drawInkStroke(ctx, {
        points: currentStroke,
        color,
        width: lineWidth,
      });
    }
  }, [strokes, currentStroke, background, color, lineWidth, resizeKey]);

  // Draw realistic ink stroke
  const drawInkStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    const pts = stroke.points.map(p => [
      p.x,
      p.y,
      pressureCurve(p.pressure),
    ]);

    const outline = getStroke(pts, {
      size: stroke.width * 1.8,     // Mayor tamaño base
      thinning: 0.65,                // Más variación natural
      smoothing: 0.85,               // Mayor suavizado
      streamline: 0.82,              // Más estabilización
      simulatePressure: false,        // Simular basado en velocidad
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
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const dist = (a: Point, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isEraser) return;
    const pos = getPos(e);
    const p = e.pressure || 0.5;
    setIsDrawing(true);
    setCurrentStroke([{ x: pos.x, y: pos.y, pressure: p }]);
  }, [isEraser, getPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isEraser) return;
    const pos = getPos(e);
    const p = e.pressure || 0.5;
    setCurrentStroke(prev => {
      const last = prev[prev.length - 1];
      if (!last) return [{ x: pos.x, y: pos.y, pressure: p }];

      const d = dist(last, pos);

      // Filtrar micro-jitter
      if (d < MIN_DIST) return prev;

      // Si el movimiento es muy rápido, interpolar puntos
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
  }, [isDrawing, isEraser, getPos]);

  const handlePointerUp = useCallback(() => {
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
    const R = 12;

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
  }, [isEraser, strokes, background, onChange, getPos]);

  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => { handlePointerDown(e); handleErase(e); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none', cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><circle cx=\"4\" cy=\"4\" r=\"3\" fill=\"white\"/></svg>') 4 4, auto" }}
      />
    </div>
  );
};

export default DrawingCanvas;

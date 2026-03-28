import React from 'react';
import './DrawingToolbar.css';
interface DrawingToolbarProps {
  currentColor: string;
  lineWidth: number;
  background: 'black' | 'white' | 'grid';
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onBackgroundChange: (bg: 'black' | 'white' | 'grid') => void;
  onClear: () => void;
  onEraserToggle: () => void;
  isEraser: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  isNoteEmpty: boolean;
  onNoteTypeChange?: (noteType: 'text' | 'drawing') => void;
}
const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  currentColor,
  lineWidth,
  background,
  onColorChange,
  onWidthChange,
  onBackgroundChange,
  onClear,
  onEraserToggle,
  isEraser,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isNoteEmpty,
  onNoteTypeChange,
}) => {
  const colors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const widths = [0.5, 1, 2, 4, 8];
  return (
    <div className="drawing-toolbar">
      {/* herramientas */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${!isEraser ? 'active' : ''}`}
          title="Lápiz"
          onClick={() => onEraserToggle()}
        >
          PEN
        </button>
        <button
          className={`toolbar-btn ${isEraser ? 'active' : ''}`}
          title="Borrador"
          onClick={() => onEraserToggle()}
        >
          ERA
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* cambiar color */}
      {!isEraser && (
        <>
          <div className="toolbar-group">
            {colors.map((color) => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(color)}
                title={color}
              />
            ))}
          </div>
          <div className="toolbar-separator"></div>
        </>
      )}

      {/* cambiar tamaño */}
      <div className="toolbar-group">
        {widths.map((width) => (
          <button
            key={width}
            className={`width-btn ${lineWidth === width ? 'active' : ''}`}
            onClick={() => onWidthChange(width)}
            title={`${width}px`}
          >
            <div
              style={{
                width: `${Math.max(width * 1.5, 4)}px`,
                height: `${Math.max(width * 1.5, 4)}px`,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
          </button>
        ))}
      </div>

      <div className="toolbar-separator"></div>

      {/* select fondo */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${background === 'black' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('black')}
          title="Fondo Negro"
        >
          BLK
        </button>
        <button
          className={`toolbar-btn ${background === 'white' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('white')}
          title="Fondo Blanco"
        >
          WHT
        </button>
        <button
          className={`toolbar-btn ${background === 'grid' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('grid')}
          title="Fondo Cuadriculado"
        >
          GRD
        </button>
      </div>

      <div className="toolbar-separator"></div>
      {/* Zoom */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          title="Zoom Out (Ctrl+-)"
          onClick={onZoomOut}
        >
          −
        </button>
        <button
          className="zoom-indicator"
          title="Reset Zoom (Ctrl+0)"
          onClick={onZoomReset}
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          className="toolbar-btn"
          title="Zoom In (Ctrl+=)"
          onClick={onZoomIn}
        >
          +
        </button>
      </div>
      {/* Limpiar */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onClear} title="Limpiar Todo">
          CLR
        </button>
      </div>
      {isNoteEmpty && onNoteTypeChange && (
        <>
          <div className="toolbar-separator"></div>
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={() => onNoteTypeChange('text')} title="Switch to Text">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default DrawingToolbar;

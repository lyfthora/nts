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
}) => {
  const colors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const widths = [1, 2, 4, 8, 16];
  return (
    <div className="drawing-toolbar">
      {/* Selector de herramienta */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${!isEraser ? 'active' : ''}`}
          title="Lápiz"
          onClick={() => onEraserToggle()}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
        </button>
        <button
          className={`toolbar-btn ${isEraser ? 'active' : ''}`}
          title="Borrador"
          onClick={() => onEraserToggle()}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 20H7L3 16L10 9L18 17L20 15V20Z" />
          </svg>
        </button>
      </div>
      {/* Selector de color */}
      {!isEraser && (
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
      )}
      {/* Selector de grosor */}
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
                width: `${width * 2}px`,
                height: `${width * 2}px`,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
          </button>
        ))}
      </div>
      {/* Selector de fondo */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${background === 'black' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('black')}
          title="Fondo Negro"
        >
          ⬛
        </button>
        <button
          className={`toolbar-btn ${background === 'white' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('white')}
          title="Fondo Blanco"
        >
          ⬜
        </button>
        <button
          className={`toolbar-btn ${background === 'grid' ? 'active' : ''}`}
          onClick={() => onBackgroundChange('grid')}
          title="Fondo Cuadriculado"
        >
          ▦
        </button>
      </div>
      {/* Limpiar */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onClear} title="Limpiar Todo">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
export default DrawingToolbar;

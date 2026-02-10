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

      {/* Limpiar */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onClear} title="Limpiar Todo">
          CLR
        </button>
      </div>
    </div>
  );
}
export default DrawingToolbar;

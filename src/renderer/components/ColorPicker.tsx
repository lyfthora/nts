import React, { useState, useCallback, memo } from "react";

interface ColorPickerProps {
  color: string;
  onChange: (c: string) => void;
}

const ColorPicker = memo(function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const colors = ['#A8D5FF', '#B4E7CE', '#FFF4A3', '#FFB5B5'];
  return (
    <div>
      <button className="editor-action-btn" id="colorPickerBtn" title="Change Color" onClick={toggle}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10} /></svg>
      </button>
      {open ? (
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          {colors.map(c => (
            <div key={c} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid #ddd', cursor: 'pointer' }} onClick={() => { onChange(c); setOpen(false); }} />
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default ColorPicker;

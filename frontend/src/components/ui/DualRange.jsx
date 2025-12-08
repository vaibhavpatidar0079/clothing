import React, { useMemo, useRef, useEffect } from 'react';

// DualRange: custom two-handle range slider implemented with a single interactive track.
// It computes pointer position to decide which handle to move (closest thumb) and
// performs dragging with window-level move/up listeners for smooth interaction.
const DualRange = ({ min = 0, max = 100, step = 1, values = [0, 100], onChange, onChangeEnd }) => {
  const [minVal, maxVal] = values;
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // 'min' | 'max' | null

  const minPercent = useMemo(() => ((minVal - min) / (max - min)) * 100, [minVal, min, max]);
  const maxPercent = useMemo(() => ((maxVal - min) / (max - min)) * 100, [maxVal, min, max]);

  // Inject CSS to hide native thumbs and ensure consistent visuals
  useEffect(() => {
    const id = 'dual-range-thumb-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      .dual-range input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
      .dual-range input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
      .dual-range input[type=range]::-moz-range-thumb { width: 0; height: 0; border: none; }
      .dual-range input[type=range]::-ms-thumb { width: 0; height: 0; }
    `;
    document.head.appendChild(style);
  }, []);

  const clientXToValue = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    // snap to step
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const startDrag = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const value = clientXToValue(clientX);
    // choose nearest handle
    const distToMin = Math.abs(value - minVal);
    const distToMax = Math.abs(value - maxVal);
    draggingRef.current = distToMin <= distToMax ? 'min' : 'max';

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const v = clientXToValue(cx);
      if (draggingRef.current === 'min') {
        const newMin = Math.min(v, maxVal - step);
        if (newMin !== minVal) onChange([newMin, maxVal]);
      } else {
        const newMax = Math.max(v, minVal + step);
        if (newMax !== maxVal) onChange([minVal, newMax]);
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      if (onChangeEnd) onChangeEnd([minVal, maxVal]);
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  return (
    <div className="dual-range w-full" ref={containerRef} onMouseDown={startDrag} onTouchStart={startDrag}>
      <div className="relative h-8">
        {/* Invisible native inputs kept for form semantics but thumbs hidden via CSS */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          readOnly
          aria-hidden
          className="absolute left-0 top-3 w-full"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          readOnly
          aria-hidden
          className="absolute left-0 top-3 w-full"
        />

        {/* Track background */}
        <div className="absolute inset-0 top-4 h-1 rounded bg-gray-200" />

        {/* Highlighted range */}
        <div
          className="absolute top-4 h-1 rounded bg-black"
          style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
        />

        {/* Visual thumbs */}
        <div
          className="absolute top-2 w-4 h-4 -translate-y-1/2 bg-white border border-gray-300 rounded-full shadow"
          style={{ left: `calc(${minPercent}% - 8px)`, zIndex: 9 }}
        />

        <div
          className="absolute top-2 w-4 h-4 -translate-y-1/2 bg-white border border-gray-300 rounded-full shadow"
          style={{ left: `calc(${maxPercent}% - 8px)`, zIndex: 9 }}
        />
      </div>
    </div>
  );
};

export default DualRange;

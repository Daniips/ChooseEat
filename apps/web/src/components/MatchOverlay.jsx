// apps/web/src/components/MatchOverlay.jsx
import React, { useEffect, useMemo } from "react";

export default function MatchOverlay({ visible, onDone }) {
  const pieces = useMemo(() => Array.from({ length: 80 }, (_, i) => i), []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onDone?.(), 1600);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div className="celebrate" role="status" aria-live="polite">
      <div className="celebrate__confetti">
        {pieces.map((i) => (
          <i
            key={i}
            style={{
              "--x": Math.random(),
              "--delay": `${Math.random() * 0.6}s`,
              "--duration": `${1.2 + Math.random() * 1.2}s`,
              "--hue": Math.floor(Math.random() * 360),
            }}
          />
        ))}
      </div>
      <div className="celebrate__card">¡Match!</div>
    </div>
  );
}

import { useMemo } from "react";
import { Leaf } from "lucide-react";

// A gentle shower of yellow leaves for the lock screen. Purely decorative,
// so it's aria-hidden and sits behind the card (pointer-events: none via CSS).
export function FallingLeaves({ count = 16 }: { count?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100; // vw
        const duration = 7 + Math.random() * 8; // s
        const delay = -Math.random() * 12; // s (negative => already mid-fall)
        const size = 16 + Math.random() * 18; // px
        const drift = (Math.random() * 2 - 1) * 60; // px sideways sway
        const spin = Math.random() > 0.5 ? 1 : -1;
        return { i, left, duration, delay, size, drift, spin };
      }),
    [count],
  );

  return (
    <div className="leaves" aria-hidden="true">
      {leaves.map((l) => (
        <span
          key={l.i}
          className="leaf"
          style={
            {
              left: `${l.left}vw`,
              animationDuration: `${l.duration}s`,
              animationDelay: `${l.delay}s`,
              "--drift": `${l.drift}px`,
              "--spin": `${l.spin * 360}deg`,
            } as React.CSSProperties
          }
        >
          <Leaf size={l.size} />
        </span>
      ))}
    </div>
  );
}

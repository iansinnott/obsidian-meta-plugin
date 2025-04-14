import React, { useEffect } from "react";

interface ShimmerTextProps {
  text: string;
  gradient?: string;
  animationDuration?: number;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({
  text,
  gradient = "linear-gradient(90deg, #334155, #cbd5e1, #334155)",
  animationDuration = 2,
  className = "",
}) => {
  useEffect(() => {
    const styleId = "shimmer-animation-style";

    // Only add the style if it doesn't already exist
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // No cleanup needed as we keep the style for reuse
  }, []);

  return (
    <span
      className={className}
      style={{
        background: gradient,
        backgroundSize: "200% auto",
        color: "transparent",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        animation: `shimmer ${animationDuration}s linear infinite`,
      }}
    >
      {text}
    </span>
  );
};
